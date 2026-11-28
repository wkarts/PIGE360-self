#!/usr/bin/env python3
"""Exercita a combinação de Diário, catálogo e Educacenso em serviços descartáveis."""
import json
import os
import re
from contextlib import contextmanager
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import tempfile
import time

import httpx
from pypdf import PdfReader
from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]


@contextmanager
def server(env, port):
    proc = subprocess.Popen([sys.executable, '-m', 'uvicorn', 'app.main:app', '--port', str(port)],
                            cwd=ROOT/'backend', env=env)
    url = f'http://127.0.0.1:{port}'
    try:
        with httpx.Client(base_url=url, trust_env=False) as http:
            for _ in range(100):
                try:
                    if http.get('/health/ready').is_success:
                        break
                except httpx.ConnectError:
                    pass
                if proc.poll() is not None:
                    raise RuntimeError('O serviço de teste encerrou durante o início.')
                time.sleep(.1)
            else:
                raise RuntimeError('O serviço de teste não ficou pronto.')
            yield http
    finally:
        proc.terminate()
        proc.wait(timeout=10)


def individual_census(page, census, http, token, school_id, other_school_id):
    """Confere a declaração local de um aluno e o histórico sem contatar o INEP."""
    headers = {'Authorization': 'Bearer '+token, 'X-School-ID': school_id}
    path = '/api/v1/schools/'+school_id
    def read(route):
        result=http.get(path+route, headers=headers)
        result.raise_for_status()
        return result.json()
    def create(route, data):
        result=http.post(path+route, headers=headers, json=data)
        result.raise_for_status()
        return result.json()
    year=read('/academic-years')[0]
    unit=read('/units')[0]
    grade=create('/grades', {'name':'8º ano de treinamento'})
    shift=create('/shifts', {'name':'Manhã de treinamento'})
    group=create('/class-groups', {'name':'Turma de demonstração', 'unit_id':unit['id'], 'grade_id':grade['id'],
                                   'shift_id':shift['id'], 'academic_year_id':year['id'], 'capacity':10})
    pupils=[]
    for first in ('Clara','Lucas'):
        name=first+' Almeida de Teste'
        pupil=create('/students', {'person':{'name':name, 'birth_date':'2013-04-25'}})
        enrollment=create('/enrollments', {'student_id':pupil['id'], 'class_group_id':group['id'], 'enrolled_on':'2026-02-02'})
        pupils.append((name,pupil,enrollment))
    name, pupil, enrollment = pupils[0]
    alternate=pupils[1][0]
    screen_dir=os.getenv('PIGE_CENSUS_SCREENSHOTS')
    if screen_dir:
        Path(screen_dir).mkdir(parents=True,exist_ok=True)

    census.get_by_role('button', name='Dados a declarar').click()
    census.get_by_label('Data de referência').fill('2026-06-01')
    census.get_by_label('Abrangência').select_option(label='Um aluno')
    census.get_by_label('Buscar aluno ou matrícula').fill('Almeida')
    census.get_by_role('button', name='Buscar aluno',exact=True).click()
    expect(census.get_by_role('button', name=re.compile('Selecionar '+alternate))).to_be_visible()
    census.get_by_role('button', name=re.compile('Selecionar '+name)).click()
    census.get_by_role('button', name='Validar prévia').click()
    with page.expect_response(lambda response: response.url.split('?')[0].endswith('/educacenso/drafts') and response.request.method=='POST') as created:
        census.get_by_role('button', name='Guardar rascunho').click()
    assert created.value.ok, created.value.text()
    saved=created.value.json()
    current='/educacenso/drafts/'+saved['id']
    assert [row['enrollment_id'] for row in saved['snapshot']['rows']]==[enrollment['id']]
    assert not saved['snapshot']['official_export_enabled']
    edit=census.get_by_role('button', name=re.compile('Editar dados de '+name))
    expect(edit).to_be_visible()
    for width in (1440,390,320):
        page.set_viewport_size({'width':width,'height':900})
        expect(edit).to_be_visible()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'), width
        if screen_dir:
            edit.scroll_into_view_if_needed()
            page.screenshot(path=str(Path(screen_dir)/f'educacenso-individual-{width}.png'))
            if width==1440:
                card=census.locator('section.panel').filter(has=page.get_by_role('heading',name='Rascunho do lote',exact=True))
                card.screenshot(path=str(Path(screen_dir)/'educacenso-guia.png'))
    edit.click()
    corrected='Clara Almeida de Teste Escolar'
    census.get_by_label('Nome na declaração').fill(corrected)
    census.get_by_label('Código Inep na declaração').fill('000000000123')
    census.get_by_label('Data de nascimento na declaração').fill('2013-04-26')
    census.get_by_label('Motivo do ajuste').fill('Conferência do nome na declaração local de treinamento.')
    with page.expect_response(lambda response: '/rows/' in response.url and response.request.method=='PATCH') as edited:
        census.get_by_role('button',name='Salvar ajuste').click()
    assert edited.value.ok,edited.value.text()
    detail=read(current)
    declaration=detail['snapshot']['rows'][0]['declaration']
    assert (declaration['student_name'],declaration['student_inep_code'],declaration['birth_date'])==(corrected,'000000000123','2013-04-26')
    original=read('/students/'+pupil['id'])
    assert original['person']['name']==name and original['person']['birth_date']=='2013-04-25' and not original.get('inep_code')
    with page.expect_download() as form_pdf:
        census.get_by_role('button',name='Baixar ficha do aluno').click()
    pages=PdfReader(form_pdf.value.path()).pages
    pdf_text=' '.join(page.extract_text() or '' for page in pages)
    assert corrected in pdf_text and enrollment['number'] in pdf_text and alternate not in pdf_text
    remove=census.get_by_role('button', name=re.compile('Retirar .* do rascunho'))
    remove.click()
    prompt=page.get_by_role('dialog')
    expect(prompt).to_be_visible()
    prompt.get_by_role('button', name=re.compile('Voltar|Cancelar')).click()
    assert len(read(current)['snapshot']['rows'])==1
    remove.click()
    prompt.get_by_label('Motivo',exact=False).fill('Matrícula retirada para revisão pela secretaria.')
    with page.expect_response(lambda response: '/rows/' in response.url and response.request.method=='DELETE') as removed:
        prompt.get_by_role('button',name=re.compile('Retirar')).click()
    assert removed.value.ok,removed.value.text()
    expect(remove).to_have_count(0)
    assert not read(current)['snapshot']['rows']
    with page.expect_download() as revision_json:
        census.get_by_role('button',name='Baixar JSON da revisão 1').click()
    previous=json.loads(Path(revision_json.value.path()).read_bytes())
    assert previous['rows'][0]['enrollment_id']==enrollment['id']
    other=http.get('/api/v1/schools/'+other_school_id+current,headers={**headers,'X-School-ID':other_school_id})
    assert other.status_code==404
    assert http.get(path+current,headers=headers,params={'environment':'producao'}).status_code==404
    census.get_by_role('button',name='Arquivar rascunho',exact=True).click()
    prompt.get_by_label('Motivo',exact=False).fill('Treinamento encerrado pelo operador.')
    with page.expect_response(lambda response: '/archive' in response.url and response.request.method=='POST') as archive:
        prompt.get_by_role('button',name=re.compile('Arquivar')).click()
    assert archive.value.ok,archive.value.text()
    census.get_by_role('button',name='Histórico',exact=True).click()
    census.get_by_role('button',name='Arquivados',exact=True).click()
    census.get_by_role('button',name=re.compile('Matrícula Inicial')).click()
    expect(census.get_by_text('Treinamento encerrado pelo operador.',exact=False).first).to_be_visible()
    assert not read(current)['snapshot']['rows']

    census.get_by_role('button',name='Dados a declarar').click()
    census.get_by_role('combobox',name=re.compile('^Etapa')).select_option(label='Situação do Aluno')
    census.get_by_label('Abrangência').select_option(label='Um aluno')
    census.get_by_label('Buscar aluno ou matrícula').fill(pupils[1][2]['number'])
    census.get_by_role('button',name='Buscar aluno',exact=True).click()
    census.get_by_role('button',name=re.compile('Selecionar '+alternate)).click()
    census.get_by_role('button',name='Validar prévia').click()
    with page.expect_response(lambda response: response.url.split('?')[0].endswith('/educacenso/drafts') and response.request.method=='POST') as second:
        census.get_by_role('button',name='Guardar rascunho').click()
    assert second.value.ok,second.value.text()
    second_id=second.value.json()['id']
    census.get_by_role('button',name=re.compile('Editar dados de '+alternate)).click()
    census.get_by_label('Situação na declaração').fill('Transferência em conferência')
    census.get_by_label('Motivo do ajuste').fill('Correspondência com o retorno escolar em treinamento.')
    with page.expect_response(lambda response: '/rows/' in response.url and response.request.method=='PATCH') as edited:
        census.get_by_role('button',name='Salvar ajuste').click()
    assert edited.value.ok,edited.value.text()
    row=read('/educacenso/drafts/'+second_id)['snapshot']['rows'][0]
    assert row['enrollment_id']==pupils[1][2]['id'] and row['declaration']['status']=='Transferência em conferência'
    assert read('/enrollments/'+pupils[1][2]['id'])['status']==pupils[1][2]['status']
    page.set_viewport_size({'width':1280,'height':900})


def main():
    with tempfile.TemporaryDirectory(prefix='pige-pilotos-') as folder:
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            port = sock.getsockname()[1]
        url = f'http://127.0.0.1:{port}'
        password = 'Synthetic-Pilots-Password-2026!'
        env = {**os.environ, 'APP_ENV':'test', 'ALLOW_SQLITE':'true', 'DATABASE_URL':'sqlite:///'+folder+'/test.db',
               'APP_URL':url, 'ALLOWED_HOSTS':'127.0.0.1', 'COOKIE_SECURE':'false', 'STORAGE_PATH':folder+'/documents',
               'FRONTEND_PATH':str(ROOT/'frontend/dist'), 'APP_SECRET_KEY':'synthetic-pilots-key-000000000000000001',
               'SETUP_TOKEN':'synthetic-pilot-setup-000000000001',
               'CRM_BRIDGE_ENABLED':'false'}
        subprocess.run([sys.executable, '-m', 'alembic', 'upgrade', 'head'], cwd=ROOT/'backend', env=env, check=True)
        with server(env, port) as http:
            setup = {'admin_name':'Operadora de teste', 'admin_email':'operadora@example.com',
                     'admin_password':password, 'company_name':'Mantenedora fictícia',
                     'school_name':'Escola de treinamento', 'academic_year':2026}
            http.post('/api/v1/setup', headers={'X-Setup-Token':env['SETUP_TOKEN']}, json=setup).raise_for_status()
            token = http.post('/api/v1/auth/login', json={'email':setup['admin_email'], 'password':password}).json()['access_token']
            school = http.get('/api/v1/schools', headers={'Authorization':'Bearer '+token}).json()[0]
            assert not school['diary_catalog']
            sid = school['id']
            other = http.post('/api/v1/schools', headers={'Authorization':'Bearer '+token},
                              json={'company_id':school['company_id'],'name':'Z Escola fictícia'}).json()

            with sync_playwright() as pw:
                executable = os.getenv('CHROMIUM_PATH') or shutil.which('chromium') or pw.chromium.executable_path
                browser = pw.chromium.launch(executable_path=executable, args=['--no-sandbox'])
                page = browser.new_page(viewport={'width':1280,'height':900},locale='pt-BR')
                errors = []
                page.on('pageerror', lambda exc: errors.append(str(exc)))
                def unexpected_prompt(dialog):
                    errors.append('Diálogo nativo inesperado: '+dialog.type)
                    dialog.dismiss()
                page.on('dialog',unexpected_prompt)
                page.goto(url+'/#/settings')
                page.get_by_label('E-mail', exact=True).fill(setup['admin_email'])
                page.get_by_label('Senha', exact=True).fill(password)
                page.get_by_role('button', name='Entrar na aplicação').click()
                for width, height in [(1360, 620), (390, 660)]:
                    page.set_viewport_size({'width':width, 'height':height})
                    def drawer():
                        button = page.get_by_role('button', name='Abrir menu')
                        if button.is_visible() and button.get_attribute('aria-expanded') == 'false':
                            button.click()
                    drawer()
                    cadastros = page.get_by_role('button', name='Cadastros', exact=True)
                    if cadastros.get_attribute('aria-expanded') == 'true':
                        cadastros.click()
                    menu = page.locator('#app .sidebar-scroll[role="region"]')
                    link = menu.get_by_role('link', name='Inscrições online', exact=True)
                    link.scroll_into_view_if_needed()
                    y = menu.evaluate('(el)=>{el.scrollTop=45;return el.scrollTop}')
                    assert y > 0
                    link.evaluate('el=>el.click()')
                    expect(page.get_by_role('heading', name='Inscrições online', exact=True)).to_be_visible()
                    drawer()
                    expect(cadastros).to_have_attribute('aria-expanded','false')
                    expect(link).to_have_attribute('aria-current','page')
                    assert menu.evaluate('el=>el.scrollTop') == y
                    for school_id in (other['id'], sid):
                        if width < 600:
                            page.get_by_role('button', name='Fechar menu').click()
                        page.get_by_label('Selecionar escola').select_option(school_id)
                        expect(page.get_by_role('heading', name='Inscrições online', exact=True)).to_be_visible()
                        drawer()
                        expect(cadastros).to_have_attribute('aria-expanded','false')
                        expect(link).to_have_attribute('aria-current','page')
                        assert menu.evaluate('el=>el.scrollTop') == y
                    if width < 600:
                        page.get_by_role('button', name='Fechar menu').click()
                    page.get_by_role('tab', name='Visão geral', exact=True).click()
                    drawer()
                    expect(cadastros).to_have_attribute('aria-expanded','false')
                    assert menu.evaluate('el=>el.scrollTop') == y
                    if width < 600:
                        page.get_by_role('button', name='Fechar menu').click()
                page.set_viewport_size({'width':1280,'height':900})
                page.get_by_role('link', name='Instituição', exact=True).click()
                page.get_by_role('button', name='Editar dados').click()
                diary_option = page.get_by_label('Habilitar catálogo curricular do Diário')
                census_option = page.get_by_label('Habilitar treinamento do Educacenso')
                expect(diary_option).not_to_be_checked()
                expect(census_option).to_have_count(0)
                diary_option.check()
                page.get_by_role('button', name='Salvar', exact=True).click()
                expect(diary_option).to_have_count(0)
                expect(page.get_by_label('Selecionar escola')).to_be_enabled()
                page.locator('aside').get_by_role('link', name='Diário Escolar', exact=True).click()
                page.get_by_role('link', name='Configuração', exact=True).click()
                page.get_by_role('link', name='Catálogo e vigência', exact=True).click()
                catalog = page.locator('.diary-workspace')
                catalog.get_by_label('Nome sugerido').fill('Oficina sintética')
                catalog.get_by_role('button', name='Guardar sugestão').click()
                expect(catalog.get_by_text('Rascunho aguardando decisão.')).to_be_visible()
                catalog.get_by_label('Justificativa da decisão').fill('Aprovada para a turma de teste')
                catalog.get_by_role('button', name='Publicar componente').click()
                page.get_by_role('dialog',name='Componente curricular').get_by_role('button',name='Publicar componente',exact=True).click()
                expect(catalog.get_by_role('status')).to_have_text('Decisão registrada no histórico do componente.')
                catalog.get_by_label('Componente para conferência').select_option(label='Oficina sintética')
                catalog.get_by_label('Justificativa da decisão').fill('Retirada ao encerrar o piloto')
                catalog.get_by_role('button', name='Desativar componente').click()
                page.get_by_role('dialog',name='Componente curricular').get_by_role('button',name='Desativar componente',exact=True).click()
                expect(catalog.get_by_label('Componente para conferência')).to_have_value('')
                page.get_by_role('link', name='Educacenso', exact=True).click()
                census = page.get_by_role('region', name='Preparação do Educacenso', exact=True)
                census.get_by_label('Data de referência').fill('2026-06-01')
                census.get_by_role('button', name='Validar prévia').click()
                expect(census.get_by_text('Nenhuma matrícula nesta seleção.')).to_be_visible()
                census.get_by_role('button', name='Guardar rascunho').click()
                census.locator('input[type=file]').set_input_files(
                    {'name':'retorno.txt','mimeType':'text/plain','buffer':b'retorno sintetico sem parser'})
                census.get_by_role('button', name='Anexar evidência').click()
                with page.expect_download() as download:
                    census.get_by_role('button', name='Baixar evidência').click()
                assert Path(download.value.path()).read_bytes() == b'retorno sintetico sem parser'
                census.get_by_role('button', name='Histórico').click()
                census.get_by_role('button', name='Matrícula Inicial', exact=False).click()
                expect(census.get_by_role('heading', name='Rascunho do lote')).to_be_visible()
                individual_census(page, census, http, token, sid, other['id'])
                page.get_by_role('link', name='Instituição', exact=True).click()
                page.get_by_role('button', name='Editar dados').click()
                expect(diary_option).to_be_checked()
                diary_option.uncheck()
                page.get_by_role('button', name='Salvar', exact=True).click()
                expect(census_option).to_have_count(0)
                expect(page.get_by_role('link', name='Educacenso', exact=True)).to_be_visible()
                schools = http.get('/api/v1/schools', headers={'Authorization':'Bearer '+token}).json()
                assert not next(s for s in schools if s['id']==sid)['diary_catalog']
                assert not errors, errors
                browser.close()
        print('PASS: catálogo, prévia por arquivo, rascunho persistido, histórico e download íntegro em Chromium.')


if __name__ == '__main__':
    main()
