"""Atendimento em três portais com encaminhamento e anexos exclusivamente sintéticos."""
import re
import sqlite3
import subprocess
import sys
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

from playwright.sync_api import expect


def contact_view(page, area):
    navigation = page.locator('#teacher-navigation' if area == 'teacher' else '#family-navigation')
    menu = navigation.get_by_role('button', name='Atendimento', exact=True)
    if not menu.is_visible():
        page.get_by_role('button', name='Abrir menu', exact=True).click()
    menu.click()
    panel = page.get_by_role('region', name='Atendimento do colégio')
    expect(panel.get_by_role('heading', name='Fale com o colégio')).to_be_visible()
    return panel


def open_and_reply(page, area, school, title, *, category='secretaria', channel='portal', attachment=None):
    panel = contact_view(page, area)
    panel.get_by_role('button', name='Novo protocolo').click()
    panel.get_by_label('Categoria').select_option(category)
    panel.get_by_label('Assunto').fill(title)
    panel.get_by_label('Mensagem', exact=True).fill('Mensagem inicial de homologação.')
    if channel != 'portal':
        panel.get_by_label('Preferência de avisos').select_option(channel)
    if attachment:
        panel.locator('input[type=file]').set_input_files(attachment)
    endpoint = f'/api/v1/{area}/schools/{school}/protocols'
    with page.expect_response(lambda r: urlsplit(r.url).path == endpoint and r.request.method == 'POST') as opened:
        panel.get_by_role('button', name='Abrir protocolo').click()
    assert opened.value.status == 201, opened.value.text()
    protocol = opened.value.json()
    expect(panel.get_by_role('heading', name=title, exact=True)).to_be_visible()
    expect(panel).to_contain_text(protocol['number'])
    expect(panel).to_contain_text('Aberto')
    panel.get_by_label('Sua resposta').fill('Complemento publicado pelo solicitante.')
    panel.get_by_role('button', name='Enviar resposta').click()
    expect(panel.locator('ol')).to_contain_text('Complemento publicado pelo solicitante.')
    return panel,protocol


def configure_contact_fixture(client, base, admin, root, env, school):
    response=client.put(base+'/notification-email',headers=admin,json={'mode':'school','host':'smtp.example.com',
        'port':587,'username':'avisos@example.com','from_address':'avisos@example.com','password':'Somente-Massa-Sintetica!'})
    assert response.is_success,response.text
    # Modela a linha já sincronizada pelo provedor. O E2E não executa worker nem conecta ao WhatsApp ou ao SMTP.
    seed = '''
import sys
from app.db import SessionLocal
from app import models as m
with SessionLocal.begin() as db:
    school=db.get(m.School,sys.argv[1]);db.add(m.ConnectInstance(school_id=school.id,company_id=school.company_id,
        name='linha-sintetica',display_name='Secretaria de teste',primary=True,enabled=True,status='open',phone='5511999990011'))
'''
    subprocess.run([sys.executable,'-c',seed,school['id']],cwd=root/'backend',env=env,check=True)


def queued_email_notices(database, protocol_id):
    with sqlite3.connect(database) as db:
        return db.execute("SELECT status FROM integration_jobs WHERE kind='protocol_notice' AND dedupe_key IN ("
            "SELECT 'protocol-notice:' || id || ':email' FROM protocol_events WHERE protocol_id=?)", (protocol_id,)).fetchall()


def check_portal_protocols(*, browser, clerk, student_page, guardian_page, manager_url, family_url, teacher_url,
                           school, student_id, sibling_id, teacher, password, client, admin, base, root, env,
                           database, sample, output, record):
    configure_contact_fixture(client,base,admin,root,env,school)
    teacher_page=browser.new_page(viewport={'width':1200,'height':900},locale='pt-BR')
    try:
        teacher_page.goto(teacher_url)
        teacher_page.get_by_label('E-mail',exact=True).fill(teacher['email'])
        teacher_page.get_by_label('Senha',exact=True).fill(password)
        teacher_page.get_by_role('button', name='Entrar como professor').click()
        student_view,student_ticket=open_and_reply(student_page,'family',school['id'],'Orientação do aluno',channel='email',attachment=sample)
        guardian_page.get_by_label('Você está acompanhando',exact=True).select_option(student_id)
        expect(guardian_page.locator('.family-root')).to_have_attribute('aria-busy','false')
        _,guardian_ticket=open_and_reply(guardian_page,'family',school['id'],'Requerimento do responsável',category='financeiro')
        teacher_view,teacher_ticket=open_and_reply(teacher_page,'teacher',school['id'],'Solicitação do professor',category='pedagogico')
        assert len({ticket['number'] for ticket in (student_ticket,guardian_ticket,teacher_ticket)})==3
        link=teacher_view.get_by_role('link',name='Continuar pelo WhatsApp')
        href=urlsplit(link.get_attribute('href'))
        assert (href.scheme,href.netloc,href.path)==('https','wa.me','/5511999990011')
        assert parse_qs(href.query)=={'text':['Olá, quero falar sobre o protocolo '+teacher_ticket['number']]}
        record('Aluno, responsável e professor abrem protocolos na própria superfície, respondem e recebem números distintos; o link de WhatsApp inclui apenas a referência.')

        teacher_view.get_by_role('button',name='Voltar aos protocolos').click()
        preference=teacher_view.get_by_label('Quando a Secretaria abrir um atendimento para mim')
        expect(preference).to_have_value('portal')
        preference.select_option('email')
        with teacher_page.expect_response(lambda r:'/protocols/opening-channel' in r.url and r.request.method=='PUT') as consent:
            teacher_view.get_by_role('button',name='Salvar preferência de abertura').click()
        assert consent.value.ok and consent.value.json()['opening_channel']=='email'
        teacher_view.get_by_role('listitem').filter(has_text=teacher_ticket['number']).get_by_role('button').click()

        clerk.goto(manager_url+'/#/protocols')
        clerk.get_by_role('row').filter(has_text=student_ticket['number']).get_by_role('button',name='Ver atendimento').click()
        clerk.get_by_role('button',name='Adicionar nota interna').click()
        clerk.get_by_label('Registro do atendimento').fill('Observação exclusiva da equipe de secretaria.')
        clerk.locator('.modal-form').get_by_role('button',name='Salvar',exact=True).click()
        detail=clerk.get_by_role('button',name='Responder ao solicitante')
        expect(clerk.locator('.modal')).to_contain_text('Observação exclusiva da equipe de secretaria.')
        detail.click()
        clerk.get_by_label('Mensagem para o solicitante').fill('Resposta pública registrada pela secretaria.')
        clerk.locator('.modal-form input[type=file]').set_input_files(sample)
        clerk.get_by_role('button',name='Publicar resposta').click()
        expect(clerk.locator('.modal')).to_contain_text('Resposta pública registrada pela secretaria.')
        clerk.get_by_role('button',name='Atualizar protocolo').click()
        clerk.locator('.modal-form').get_by_label('Situação').select_option('waiting')
        clerk.locator('.modal-form').get_by_role('button',name='Salvar',exact=True).click()
        student_view.get_by_role('button',name='Atualizar histórico').click()
        expect(student_view).to_contain_text('Aguardando')
        expect(student_view.locator('ol')).to_contain_text('Resposta pública registrada pela secretaria.')
        expect(student_view).not_to_contain_text('Observação exclusiva da equipe')
        with student_page.expect_download() as receipt:
            student_view.get_by_role('button',name=re.compile('^Baixar anexo')).last.click()
        assert Path(receipt.value.path()).read_bytes()==Path(sample).read_bytes()
        student_view.screenshot(path=str(output/'atendimento-aluno.png'))
        jobs=queued_email_notices(database, student_ticket['id'])
        assert len(jobs)==2 and all(status in ('pending','queued') for status, in jobs),jobs
        record('A secretaria responde com anexo e altera a situação; o aluno baixa os bytes originais, vê a resposta e o novo status. A nota interna fica na equipe e apenas os dois avisos públicos entram na fila.')

        clerk.goto(manager_url+'/#/protocols')
        clerk.get_by_role('button',name='Iniciar atendimento no portal').click()
        form=clerk.locator('.modal-form')
        form.get_by_label('Buscar conta no portal').fill(teacher['name'])
        form.get_by_role('button',name='Buscar solicitante').click()
        form.get_by_role('combobox',name=re.compile('^Solicitante')).select_option(teacher['id'])
        form.get_by_label('Assunto').fill('Contato iniciado pela coordenação')
        form.get_by_label('Mensagem para o solicitante').fill('Conferir o planejamento da próxima semana.')
        with clerk.expect_response(lambda r:urlsplit(r.url).path==base+'/protocols' and r.request.method=='POST') as initial:
            form.get_by_role('button',name='Iniciar atendimento',exact=True).click()
        assert initial.value.status==201,initial.value.text()
        from_team=initial.value.json()
        teacher_view.get_by_role('button',name='Voltar aos protocolos').click()
        teacher_view.get_by_role('listitem').filter(has_text=from_team['number']).get_by_role('button').click()
        expect(teacher_view.locator('ol')).to_contain_text('Conferir o planejamento da próxima semana.')
        assert queued_email_notices(database, from_team['id'])==[('pending',)]
        teacher_view.screenshot(path=str(output/'atendimento-professor.png'))
        record('O gestor inicia um atendimento para o docente na mesma fila; o professor consulta o histórico e apenas um aviso de abertura entra na fila pelo canal que ele autorizou.')

        def api_headers(email):
            auth=client.post('/api/v1/auth/login',json={'email':email,'password':password});assert auth.is_success,auth.text
            return {'Authorization':'Bearer '+auth.json()['access_token']}
        guardian=api_headers('responsavel-escolar@example.com');student=api_headers('aluno@example.com')
        family=f'{family_url}/api/v1/family/schools/{school["id"]}/protocols'
        other=client.post('/api/v1/schools',headers=admin,json={'company_id':school['company_id'],'name':'Escola de homologação isolada'});assert other.is_success,other.text
        for headers,ticket in ((guardian,student_ticket),(student,guardian_ticket),(student,teacher_ticket)):
            assert client.get(family+'/'+ticket['id'],headers=headers).status_code==404
        attachment=next(event['attachment']['id'] for event in student_ticket['history'] if event.get('attachment'))
        assert client.get(family+'/'+student_ticket['id']+'/attachments/'+attachment,headers=guardian).status_code==404
        first=client.get(family,params={'student_id':student_id},headers=guardian);assert first.is_success,first.text
        assert guardian_ticket['number'] in {item['number'] for item in first.json()['items']}
        second_list=client.get(family,params={'student_id':sibling_id},headers=guardian);assert second_list.is_success,second_list.text
        assert second_list.json()['total']==0
        wrong_school=family.replace(school['id'],other.json()['id'])
        assert client.get(wrong_school+'/'+guardian_ticket['id'],headers=guardian).status_code in (403,404)
        record('O histórico, o anexo e a fila respeitam o solicitante, o dependente selecionado e a escola; pessoas da mesma família não herdam os protocolos umas das outras.')
    finally:
        teacher_page.close()
