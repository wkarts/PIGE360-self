#!/usr/bin/env python3
"""Jornadas novas em HTTP real, pessoas/certificados sintéticos e serviços locais."""
import io
from concurrent.futures import ThreadPoolExecutor
import json
import os
from pathlib import Path
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import uuid
from datetime import date,datetime,timedelta
from zoneinfo import ZoneInfo
import httpx
from playwright.sync_api import sync_playwright,expect
from cryptography.hazmat.primitives import serialization

ROOT=Path(__file__).resolve().parents[1]
sys.path[:0]=[str(ROOT/'backend'),str(ROOT/'backend/tests')]
from test_contract_signatures import certificate,blank_pdf
from app.pdf_signing import sign_pdf_pfx

OUT=ROOT/'evidence/0.10.0/completion';OUT.mkdir(parents=True,exist_ok=True)
TEMP=Path(tempfile.mkdtemp(prefix='pige-completion-'))
def port():
    with socket.socket() as s:s.bind(('127.0.0.1',0));return s.getsockname()[1]
PORT,SITE_PORT=port(),port();URL=f'http://127.0.0.1:{PORT}';SITE=f'http://127.0.0.1:{SITE_PORT}'
PASSWORD='Synthetic-Completion-2026!';CPF='52998224725'
roots=TEMP/'roots';roots.mkdir()
school_cert,school_pfx=certificate('Escola sintética','2.16.76.1.3.3','12345678000190')
parent_cert,parent_pfx=certificate('Responsável sintético','2.16.76.1.3.1','01011990'+CPF)
for n,cert in enumerate((school_cert,parent_cert)):(roots/f'root-{n}.pem').write_bytes(cert.public_bytes(serialization.Encoding.PEM))
env={**os.environ,'PYTHONPATH':str(ROOT/'backend'),'APP_ENV':'test','ALLOW_SQLITE':'true',
    'DATABASE_URL':'sqlite:///'+str(TEMP/'db.sqlite'),'STORAGE_PATH':str(TEMP/'documents'),
    'FRONTEND_PATH':str(ROOT/'frontend/dist'),'APP_URL':URL,'ALLOWED_HOSTS':'localhost,127.0.0.1',
    'COOKIE_SECURE':'false','APP_SECRET_KEY':'synthetic-completion-secret-0000000000000000000',
    'INTEGRATION_ENCRYPTION_KEY':'MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA=',
    'SETUP_TOKEN':'synthetic-completion-setup-00000000000000000','SIGNATURE_TRUST_ROOTS_DIR':str(roots),
    'PORTABILITY_ENABLED':'false'}
subprocess.run([sys.executable,'-m','alembic','upgrade','head'],cwd=ROOT/'backend',env=env,check=True)
log=(OUT/'server.log').open('w');processes=[];checks=[];errors=[]
processes.append(subprocess.Popen([sys.executable,'-m','uvicorn','app.main:app','--host','127.0.0.1','--port',str(PORT)],cwd=ROOT/'backend',env=env,stdout=log,stderr=log))
def record(message):checks.append(message);print('PASS:',message,flush=True)
try:
    client=httpx.Client(base_url=URL,timeout=30,trust_env=False)
    for _ in range(80):
        try:
            if client.get('/health/ready').is_success:break
        except httpx.HTTPError:pass
        time.sleep(.1)
    r=client.post('/api/v1/setup',headers={'X-Setup-Token':env['SETUP_TOKEN']},json={
        'admin_name':'Administração sintética','admin_email':'admin@example.com','admin_password':PASSWORD,
        'company_name':'Mantenedora sintética','school_name':'Escola de possibilidades','academic_year':2027})
    assert r.status_code==201,r.text
    auth=client.post('/api/v1/auth/login',json={'email':'admin@example.com','password':PASSWORD}).json()
    headers={'Authorization':'Bearer '+auth['access_token']};school=client.get('/api/v1/schools',headers=headers).json()[0];base='/api/v1/schools/'+school['id']
    def call(method,path,data=None,**kwargs):
        r=client.request(method,base+path,headers=headers,json=data,**kwargs);assert r.is_success,(path,r.text);return r.json()
    unit=call('POST','/units',{'name':'Unidade sintética'});year=call('GET','/academic-years')[0]
    grade=call('POST','/grades',{'name':'3º Ano'});shift=call('POST','/shifts',{'name':'Matutino'})
    group=call('POST','/class-groups',{'name':'3º Ano A','unit_id':unit['id'],'academic_year_id':year['id'],'grade_id':grade['id'],'shift_id':shift['id'],'capacity':1})
    template=call('POST','/document-templates',{'name':'Contrato sintético','kind':'educational_contract',
        'academic_year_id':year['id'],'body':'Contrato de {{aluno.nome}} com {{escola.nome}}.','require_signature':True})
    campaign=call('POST','/admission-campaigns',{'slug':'processo-conclusao-teste','title':'Matrículas sintéticas 2027',
        'class_group_ids':[group['id']],'opens_on':str(date.today()-timedelta(days=1)),'closes_on':str(date.today()+timedelta(days=30)),
        'active':True,'require_verified_contact':False,'require_payment_before_enrollment':True,
        'payment_reservation_hours':48,'contract_template_id':template['id']})
    parent=httpx.Client(base_url=URL,headers={'X-CSRF-Protection':'1'},trust_env=False)
    def pc(method,path,data=None,**kwargs):
        r=parent.request(method,'/api/v1/portal'+path,json=data,**kwargs);assert r.is_success,(path,r.text)
        return r.json() if 'application/json' in r.headers.get('content-type','') else r.content
    pc('POST','/register',{'campaign_slug':campaign['slug'],'name':'Responsável sintético','email':'familia@example.com',
        'password':PASSWORD,'cpf':CPF,'accept_privacy':True,'terms_version':'1'})
    a=pc('POST','/admissions',{'campaign_id':campaign['id'],'class_group_id':group['id'],'client_key':str(uuid.uuid4()),
        'student':{'name':'Aluno de possibilidades','birth_date':'2017-03-10'}})
    a=pc('POST','/admissions/'+a['id']+'/submit',{'version':a['version'],'accept_terms':True,'legal_responsibility':True,'terms_version':'1'})
    a=call('POST','/admissions/'+a['id']+'/approve',{'version':a['version'],'identity_confirmed':True,'reason':'Conferência sintética de identidade e oferta.'})
    issued=call('POST','/document-templates/'+template['id']+'/issue',{'enrollment_id':a['enrollment_id'],'template_version':a['contract_template_version']})
    original=pc('GET',f"/admissions/{a['id']}/issued/{issued['id']}")
    signed=sign_pdf_pfx(original,parent_pfx,'senha-teste','Responsavel')
    signed_path=TEMP/'contrato-responsavel.pdf';signed_path.write_bytes(signed)
    # Usuário delegado e conteúdo públicos são exclusivamente fixtures.
    r=client.post('/api/v1/users',headers=headers,json={'name':'Secretaria delegada','email':'delegada@example.com',
        'password':PASSWORD,'role':'secretary','school_ids':[school['id']]});assert r.status_code==201,r.text
    call('POST','/community-posts',{'title':'Uma escola aberta a descobertas','content':'Esta publicação pública usa somente conteúdo sintético para teste.',
        'audience':'public','status':'published'})
    call('POST','/community-posts',{'title':'Conteúdo privado não deve aparecer','content':'Mensagem sintética reservada aos responsáveis.',
        'audience':'guardians','status':'published'})
    site_env={**env,'PIGE_INTERNAL_URL':URL,'WEBSITE_SCHOOL_ID':school['id']}
    processes.append(subprocess.Popen([sys.executable,'-c',f"import server;server.ThreadingHTTPServer(('127.0.0.1',{SITE_PORT}),server.Handler).serve_forever()"],cwd=ROOT/'services/website',env=site_env,stdout=log,stderr=log))
    with sync_playwright() as pw:
        binary=os.getenv('CHROMIUM_PATH') or (None if Path(pw.chromium.executable_path).exists() else shutil.which('chromium'))
        browser=pw.chromium.launch(headless=True,args=['--no-sandbox'],**({'executable_path':binary} if binary else {}))
        context=browser.new_context(viewport={'width':1440,'height':1000},locale='pt-BR',accept_downloads=True)
        admin=context.new_page();admin.set_default_timeout(12000);admin.on('pageerror',lambda e:errors.append(str(e)))
        admin.goto(URL);admin.get_by_label('E-mail',exact=True).fill('admin@example.com');admin.get_by_label('Senha',exact=True).fill(PASSWORD);admin.get_by_role('button',name='Entrar na aplicação').click()
        expect(admin.get_by_role('heading',name='Visão geral',exact=True)).to_be_visible()
        admin.goto(URL+'/#/legacy-import');expect(admin.get_by_role('heading',name='Acesso à portabilidade')).to_be_visible()
        admin.get_by_role('button',name='Habilitar portabilidade',exact=True).click();expect(admin.get_by_role('button',name='Desabilitar portabilidade',exact=True)).to_be_visible()
        admin.get_by_text('Delegar acesso nesta escola',exact=True).click()
        admin.locator('p',has_text='Secretaria delegada').get_by_role('button',name='Permitir importação').click()
        expect(admin.locator('p',has_text='Secretaria delegada').get_by_role('button',name='Revogar')).to_be_visible()
        expect(admin.get_by_text('A geração completa exige PostgreSQL.',exact=False)).to_be_visible()
        admin.screenshot(path=str(OUT/'portabilidade-backup.png'),full_page=True)
        record('Habilitação em produção e delegação pela interface, com backup SQLite explicitamente indisponível')
        # A legacy transfer without an outbox job remains recoverable through UI.
        # No worker/provider runs here: only the explicitly confirmed local queue.
        legacy_id=str(uuid.uuid4())
        seed="from app.db import SessionLocal,now;from app import models as m;from app.backups import BackupRun,BackupTarget;from app.integration_core import seal;from sqlalchemy import select;from datetime import timedelta;db=SessionLocal();user=db.scalar(select(m.User).where(m.User.email=='admin@example.com'));db.add(BackupTarget(provider='dropbox',folder='/synthetic',encrypted_token=seal({'access_token':'synthetic-never-sent'})));db.add(BackupRun(id="+repr(legacy_id)+",created_by=user.id,status='completed',stage='completed',remote_status='sending',updated_at=now()-timedelta(minutes=31)));db.commit()"
        subprocess.run([sys.executable,'-c',seed],cwd=ROOT/'backend',env=env,check=True)
        admin.get_by_role('button',name='Atualizar histórico',exact=True).click()
        recovery=admin.get_by_role('button',name='Conciliar e retomar',exact=True)
        expect(recovery).to_be_visible()
        admin.once('dialog',lambda dialog:dialog.dismiss());recovery.click()
        assert next(b for b in client.get('/api/v1/backups',headers=headers).json()['items'] if b['id']==legacy_id)['remote_status']=='sending'
        admin.once('dialog',lambda dialog:dialog.accept());recovery.click()
        expect(recovery).to_have_count(0)
        assert next(b for b in client.get('/api/v1/backups',headers=headers).json()['items'] if b['id']==legacy_id)['remote_status']=='queued'
        record('Envio legado parado reaparece na UI, cancelar preserva estado e confirmar enfileira uma única recuperação')

        staff=browser.new_context(viewport={'width':1280,'height':900}).new_page();staff.goto(URL)
        staff.get_by_label('E-mail',exact=True).fill('delegada@example.com');staff.get_by_label('Senha',exact=True).fill(PASSWORD);staff.get_by_role('button',name='Entrar na aplicação').click()
        expect(staff.get_by_role('heading',name='Visão geral',exact=True)).to_be_visible()
        expect(staff.locator('.app-root')).to_have_attribute('aria-busy','false')
        staff.get_by_role('button',name='Administração do sistema',exact=True).click();staff.get_by_role('link',name='Portabilidade de dados',exact=True).click()
        expect(staff.get_by_role('heading',name='Backup completo da instalação')).to_have_count(0)
        staff.screenshot(path=str(OUT/'delegation-navigation.png'),full_page=True)
        expect(staff.locator('.import-steps')).to_be_visible();record('Usuário delegado alcança a importação pela navegação, sem acesso ao backup global')
        admin.goto(URL+'/#/integrations');expect(admin.get_by_role('heading',name='Ponte financeira opcional')).to_be_visible()
        for label,value in [('Origem HTTPS do destino','https://financeiro.example.test'),('Emitente no destino','12'),('Conta no destino','conta-teste'),('Segredo compartilhado','synthetic-bridge-secret-0000000000000000000000')]:admin.get_by_label(label,exact=True).fill(value)
        admin.get_by_label('Habilitar ponte opcional',exact=True).check();admin.get_by_role('button',name='Salvar ponte',exact=True).click()
        expect(admin.get_by_text('Configuração da ponte salva.',exact=False)).to_be_visible();assert admin.get_by_label('Segredo compartilhado',exact=True).input_value()==''
        record('Configuração visual da ponte salva com segredo omitido na resposta e capacidade financeira indisponível informada')
        admin.goto(URL+'/#/community');admin.get_by_role('button',name='Configurar site',exact=True).click()
        admin.get_by_label('Domínio público do site',exact=True).fill('https://escola.example.test')
        admin.get_by_label('Endereço da matrícula e portal',exact=True).fill('https://gestor.example.test/online.html')
        admin.get_by_label('Chamada principal',exact=True).fill('Aprender muda o nosso horizonte.')
        admin.get_by_label('Apresentação curta',exact=True).fill('Um espaço para conviver, descobrir e construir caminhos.')
        admin.get_by_label('Sobre a escola',exact=True).fill('Nossa história é feita de encontros e possibilidades.\n\nAqui cada descoberta importa.')
        admin.get_by_label('Publicar site institucional',exact=True).check()
        site=browser.new_context(viewport={'width':1440,'height':1000}).new_page()
        admin.screenshot(path=str(OUT/'site-configuration.png'),full_page=True)
        for theme in ('horizon','editorial','campus'):
            admin.get_by_label('Modelo visual').select_option(theme);admin.get_by_role('button',name='Salvar site',exact=True).click()
            expect(admin.get_by_text('Configuração do site salva.',exact=False)).to_be_visible()
            site.goto(SITE);expect(site.get_by_role('heading',name='Aprender muda o nosso horizonte.',exact=True)).to_be_visible()
            assert 'Conteúdo privado não deve aparecer' not in site.content()
            site.screenshot(path=str(OUT/('site-'+theme+'.png')),full_page=True)
            site.set_viewport_size({'width':390,'height':844});site.reload()
            assert site.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
            site.set_viewport_size({'width':1440,'height':1000})
        record('Três modelos do serviço separado configurados pela UI, conteúdo privado ausente e layout móvel sem overflow')
        family=browser.new_context(viewport={'width':1280,'height':950},accept_downloads=True).new_page();family.on('pageerror',lambda e:errors.append(str(e)))
        family.goto(URL+'/online.html?campaign='+campaign['slug']);family.get_by_label('E-mail',exact=True).fill('familia@example.com');family.get_by_label('Senha',exact=True).fill(PASSWORD);family.get_by_role('button',name='Entrar no portal',exact=True).click()
        family.locator('.x-record',has_text='Aluno de possibilidades').click()
        expect(family.get_by_role('heading',name='Reserva de vaga',exact=True)).to_be_visible()
        reserve=family.locator('section.panel').filter(has=family.get_by_role('heading',name='Reserva de vaga',exact=True))
        expect(reserve).to_contain_text(re.compile(r'\b\d{2}:\d{2}\b'))
        expect(reserve).to_contain_text('horário da Bahia')
        expect(family.get_by_label('PDF assinado pelo responsável',exact=True)).to_be_visible()
        assert family.get_by_label('Seu certificado A1 (.pfx ou .p12)',exact=True).count()==0
        with family.expect_download() as event:family.get_by_role('button',name='Conferir contrato em PDF',exact=True).click()
        assert Path(event.value.path()).read_bytes()==original
        family.get_by_label('PDF assinado pelo responsável',exact=True).set_input_files(str(signed_path));family.get_by_role('button',name='Enviar contrato assinado',exact=True).click()
        expect(family.get_by_text('Contrato recebido.',exact=False).first).to_be_visible();family.screenshot(path=str(OUT/'contrato-familia-primeiro.png'),full_page=True)
        record('Família baixa o contrato sem A1 exigido, devolve PDF assinado e acompanha a reserva pela interface')
        # Uma correção escolhe outra revisão explicitamente; não troca os bytes da via anterior.
        old_id,old_signed=issued['id'],signed
        call('PATCH','/document-templates/'+template['id'],{'version':template['version'],
            'name':template['name'],'kind':template['kind'],'academic_year_id':year['id'],
            'require_signature':True,'body':'Contrato corrigido de {{aluno.nome}} com {{escola.nome}}.'})
        admin.goto(URL+'/#/online');admin.reload();admin.locator('.x-record',has_text='Aluno de possibilidades').click()
        admin.get_by_label('Justificativa / parecer para a próxima ação',exact=True).fill('Correção sintética de conteúdo contratual aprovada pela Direção.')
        admin.get_by_role('button',name='Vincular nova revisão do contrato',exact=True).click()
        expect(admin.get_by_text('Nova revisão vinculada.',exact=False)).to_be_visible()
        admin.get_by_role('button',name='Preparar contrato',exact=True).click()
        admin.get_by_role('button',name='Emitir contrato da revisão aprovada',exact=True).click()
        expect(admin.get_by_text('Contrato emitido da revisão aprovada.',exact=False)).to_be_visible()
        current=call('GET','/admissions/'+a['id']);issued={'id':current['contract']['issued_document_id']}
        assert issued['id']!=old_id and pc('GET',f"/admissions/{a['id']}/issued/{old_id}")==old_signed
        family.reload();family.locator('.x-record',has_text='Aluno de possibilidades').click()
        original=pc('GET',f"/admissions/{a['id']}/issued/{issued['id']}")
        with ThreadPoolExecutor(max_workers=1) as executor:
            signed=executor.submit(sign_pdf_pfx,original,parent_pfx,'senha-teste','ResponsavelCorrigido').result()
        signed_path.write_bytes(signed)
        family.get_by_label('PDF assinado pelo responsável',exact=True).set_input_files(str(signed_path))
        family.get_by_role('button',name='Enviar contrato assinado',exact=True).click()
        expect(family.get_by_text('Contrato recebido.',exact=False).first).to_be_visible()
        family.screenshot(path=str(OUT/'contrato-familia-primeiro.png'),full_page=True)
        record('Correção contratual vincula nova revisão pela UI, preserva a via anterior e exige novo envio pela família')
        charge=call('POST','/bank-charges',{'admission_id':a['id'],'collection_mode':'manual','billing_type':'MANUAL',
            'amount':'150.00','due_on':str(date.today()),'description':'Taxa sintética','required_for_enrollment':True,'client_key':str(uuid.uuid4())})['items'][0]
        call('POST','/bank-charges/'+charge['id']+'/manual-receipt',{'version':charge['version'],'amount':'150.00',
            'paid_on':str(datetime.now(ZoneInfo('America/Bahia')).date()),'payment_method':'cash','reference':'Conferência sintética','client_key':str(uuid.uuid4())})
        r=client.post(base+f"/issued-documents/{issued['id']}/validate-signature",headers=headers,
            data={'signer_cpf':CPF,'validation_reference':'SYNTHETIC-E2E-001'},files={'report':('relatorio.pdf',blank_pdf(),'application/pdf')});assert r.is_success,r.text
        r=client.put(base+'/signing-certificate/a1',headers=headers,data={'password':'senha-teste'},files={'file':('escola.p12',school_pfx)});assert r.is_success,r.text
        admin.goto(URL+'/#/online');admin.reload();admin.locator('.x-record',has_text='Aluno de possibilidades').click()
        admin.get_by_label('Justificativa / parecer para a próxima ação',exact=True).fill('Conferência sintética final com pagamento e assinatura do responsável.')
        admin.get_by_role('button',name='Efetivar matrícula e emitir comprovante',exact=True).click()
        expect(admin.get_by_text('Matrícula efetivada. Comprovante disponível no portal do responsável.',exact=True)).to_be_visible()
        final=pc('GET',f"/admissions/{a['id']}/issued/{issued['id']}")
        assert final.startswith(signed) and len(final)>len(signed)
        assert len(call('GET',f"/issued-documents/{issued['id']}/signatures")['signatures'])==2
        record('Efetivação pela Secretaria aplica o A1 institucional por último e preserva as duas assinaturas sintéticas')
        assert not errors,errors
        result={'status':'passed','checks':checks,'page_errors':errors,'data':'synthetic-only',
            'real_external_accounts_used':False,'real_icp_brasil_homologation':False,'database':'disposable SQLite'}
        (OUT/'results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False))
        browser.close()
finally:
    for process in reversed(processes):
        process.terminate()
        try:process.wait(timeout=8)
        except subprocess.TimeoutExpired:process.kill();process.wait()
    log.close();shutil.rmtree(TEMP,ignore_errors=True)
