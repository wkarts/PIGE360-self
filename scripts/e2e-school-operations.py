#!/usr/bin/env python3
"""HTTP/Chromium com banco e transportes sintéticos; nenhuma conta real é tocada."""
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import uuid
from datetime import date, timedelta
import httpx
from cryptography.fernet import Fernet
from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT/'evidence/0.10.0/school-operations'; OUT.mkdir(parents=True, exist_ok=True)
TEMP = Path(tempfile.mkdtemp(prefix='pige-school-operations-'))
with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0)); port = sock.getsockname()[1]
URL = f'http://127.0.0.1:{port}'
PASSWORD = 'Synthetic-school-operations-2026!'
MAIL_PASSWORD = 'Synthetic-mail-operations-2026!'
env = {**os.environ, 'PYTHONPATH': os.pathsep.join([str(ROOT/'backend'), str(ROOT/'backend/tests')]),
    'DATABASE_URL': 'sqlite:///' + str(TEMP/'app.db'), 'ALLOW_SQLITE': 'true', 'APP_ENV': 'test',
    'APP_URL': URL, 'ALLOWED_HOSTS': '127.0.0.1,localhost', 'APP_SECRET_KEY': 'synthetic-school-operations-secret-2026-0123456789',
    'SETUP_TOKEN': 'synthetic-school-operations-setup-2026', 'COOKIE_SECURE': 'false',
    'STORAGE_PATH': str(TEMP/'files'), 'FRONTEND_PATH': str(TEMP/'frontend'),
    'INTEGRATION_ENCRYPTION_KEY': Fernet.generate_key().decode(), 'SMTP_HOST': '', 'SMTP_FROM': ''}
shutil.copytree(ROOT/'frontend/dist', TEMP/'frontend')
subprocess.run([sys.executable, '-m', 'alembic', 'upgrade', 'head'], cwd=ROOT/'backend', env=env, check=True)
# Este launcher temporário injeta somente os provedores. API, fila, SQL e UI são reais.
launcher = TEMP/'synthetic_app.py'
launcher.write_text('''import threading, time
import uvicorn
from app.main import app
from app import email_client as e, mailcow
from app.integration_worker import process_one
from test_email_client import FakeIMAP, FakeSMTP, mime
state={'password': 'Synthetic-mail-operations-2026!', 'folders':{name:{} for name in ('INBOX','Sent','Drafts','Junk','Trash')},'instances':[],'logins':[],'sent':[],'commands':[]}
state['folders']['INBOX'][1]={'raw':mime('Mensagem sintética preservada'),'seen':False,'flagged':False,'deleted':False}
calls=[]
def request(self,path,method='GET',data=None):
    assert method=='GET', 'Este teste não pode criar, excluir ou alterar contas no provedor.'
    calls.append(method)
    if '/domain/' in path:return {'domain_name':self.config.domain,'active':1}
    from urllib.parse import unquote
    return {'username':unquote(path.rsplit('/',1)[-1]),'active':1,'tags':[],'quota':2147483648,'quota_used':1048576}
mailcow.MailcowClient.request=request
e._target=lambda *args:'8.8.8.8'
e.PinnedIMAP=lambda *args:FakeIMAP(state,*args)
class SMTP(FakeSMTP):
    def send_message(self,message):return self.sendmail(str(message['From']),[str(message['To'])],message.as_bytes())
e.PinnedSMTPSSL=lambda *args:SMTP(state,*args)
e.PinnedSMTPStartTLS=lambda *args:SMTP(state,*args)
@app.get('/__synthetic_state')
def synthetic_state():
    return {'remote_methods':calls,'inbox_count':len(state['folders']['INBOX']),'sent_count':len(state['sent'])}
app.router.routes.insert(0,app.router.routes.pop())  # Antes do fallback HTML do gestor.
def worker():
    while True:
        process_one();time.sleep(.15)
threading.Thread(target=worker,daemon=True).start()
uvicorn.run(app,host='127.0.0.1',port=PORT)
'''.replace('port=PORT', f'port={port}'))
log = (OUT/'server.log').open('w')
proc = subprocess.Popen([sys.executable, str(launcher)], env=env, stdout=log, stderr=subprocess.STDOUT)
checks = []
try:
    with httpx.Client(base_url=URL, trust_env=False, timeout=30) as client:
        for attempt in range(120):
            try:
                if client.get('/api/v1/setup/status').status_code == 200: break
            except httpx.HTTPError: pass
            if proc.poll() is not None: raise RuntimeError('Servidor sintético encerrou; confira server.log')
            time.sleep(.2)
        r = client.post('/api/v1/setup', headers={'X-Setup-Token': env['SETUP_TOKEN']}, json={
            'admin_name': 'Administração sintética', 'admin_email': 'admin@escola.example.com', 'admin_password': PASSWORD,
            'company_name': 'Mantenedora sintética', 'school_name': 'Escola sintética', 'academic_year': 2026})
        assert r.status_code == 201, r.text
        auth = client.post('/api/v1/auth/login', json={'email': 'admin@escola.example.com', 'password': PASSWORD}).json()
        headers = {'Authorization': 'Bearer ' + auth['access_token']}
        school = client.get('/api/v1/schools', headers=headers).json()[0]; base = '/api/v1/schools/' + school['id']
        def call(method, path, data=None):
            response = client.request(method, base + path, headers=headers, json=data)
            assert response.is_success, (path, response.text)
            return response.json()
        year = call('GET', '/academic-years')[0]
        unit = call('POST', '/units', {'name': 'Unidade sintética'})
        grade = call('POST', '/grades', {'name': '3º Ano'})
        shift = call('POST', '/shifts', {'name': 'Matutino'})
        groups = [call('POST', '/class-groups', {'name': '3º Ano ' + suffix, 'unit_id': unit['id'], 'academic_year_id': year['id'], 'grade_id': grade['id'], 'shift_id': shift['id'], 'capacity': 25}) for suffix in ('A','B')]
        call('PUT', '/mailcow/config', {'enabled': True, 'base_url': 'https://mail.escola.example.com', 'domain': 'escola.example.com', 'api_key': 'synthetic-mailcow-key-0123456789'})
        box = call('POST', '/mailcow/mailboxes/reconcile', {'user_id': auth['user']['id']})
        campaign = call('POST', '/admission-campaigns', {'slug': 'operacoes-sinteticas', 'title': 'Inscrições sintéticas',
            'class_group_ids': [groups[0]['id']], 'opens_on': str(date.today()-timedelta(days=1)), 'closes_on': str(date.today()+timedelta(days=20)),
            'active': True, 'require_verified_contact': False, 'privacy_notice': 'Aviso de privacidade exclusivamente sintético para validação funcional do processo de matrícula.'})
        student = call('POST', '/students', {'person': {'name': 'Aluno sintético', 'birth_date': '2017-03-10'}})
        guardian = call('POST', '/persons', {'name': 'Responsável sintético', 'cpf': '52998224725'})
        parent = httpx.Client(base_url=URL, trust_env=False, headers={'X-CSRF-Protection': '1'})
        def pc(path, data):
            response = parent.post('/api/v1/portal' + path, json=data); assert response.is_success, response.text; return response.json()
        pc('/register', {'campaign_slug': campaign['slug'], 'name': 'Responsável sintético', 'email': 'familia@example.com', 'password': PASSWORD, 'cpf': '52998224725', 'accept_privacy': True, 'terms_version': '1'})
        admission = pc('/admissions', {'campaign_id': campaign['id'], 'class_group_id': groups[0]['id'], 'client_key': str(uuid.uuid4()), 'student': {'name': 'Aluno sintético', 'birth_date': '2017-03-10'}})
        admission = pc('/admissions/' + admission['id'] + '/submit', {'version': admission['version'], 'accept_terms': True, 'legal_responsibility': True, 'terms_version': '1'})
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH') or None, headless=True, args=['--no-sandbox'])
            page = browser.new_page(viewport={'width': 1440, 'height': 1000}, locale='pt-BR'); errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(URL); page.get_by_label('E-mail', exact=True).fill('admin@escola.example.com'); page.get_by_label('Senha', exact=True).fill(PASSWORD)
            page.get_by_role('button', name='Entrar na aplicação').click()
            expect(page.locator('#school-navigation')).to_be_visible()
            expect(page.locator('.school-switch select')).to_be_enabled()
            def navigate(route):
                expect(page.locator('.school-switch select')).to_be_enabled()
                page.goto(URL+'/#/'+route)
                headings={'settings':'Instituição','academic':'Estrutura acadêmica','online':'Inscrições online','email':'E-mail'}
                if route in headings: expect(page.locator('.page-header h1')).to_have_text(headings[route])
                expect(page.locator('.school-switch select')).to_be_enabled()
                expect(page.locator('.loading-strip')).to_have_count(0)
            # O formulário real mantém seleção independente e persiste o subconjunto.
            navigate('settings')
            page.get_by_role('button', name='Atendimento', exact=True).click()
            page.get_by_role('button', name='Configurar atendimento', exact=False).click()
            modal = page.get_by_role('dialog')
            modal.get_by_label('Portal do aluno', exact=True).check()
            modal.get_by_label('Notícias e eventos', exact=True).check()
            modal.get_by_label('Matrícula online', exact=True).uncheck()
            expect(modal.get_by_label('Portal do aluno', exact=True)).to_be_checked()
            expect(modal.get_by_label('Portal dos responsáveis', exact=True)).not_to_be_checked()
            expect(modal.get_by_label('Aplicação interna', exact=True)).not_to_be_checked()
            page.screenshot(path=str(OUT/'01-atendimento-individual.png'), full_page=True)
            modal.get_by_role('button', name='Salvar', exact=True).click()
            expect(modal).not_to_be_visible()
            saved = call('GET', '/support-hub')
            assert set(saved['enabled_areas']) == {'student_portal','news'} and not saved['enabled']
            checks.append('Áreas individuais do atendimento selecionadas e persistidas sem ativar as demais.')
            navigate('academic')
            page.get_by_role('button', name='Preparar a partir de outro ano').click()
            page.get_by_label('Copiar turmas do ano').select_option(year['id'])
            page.get_by_label('Nome do ano', exact=True).fill('2027')
            page.get_by_label('Início', exact=True).fill('2027-01-01'); page.get_by_label('Término', exact=True).fill('2027-12-31')
            page.get_by_role('button', name='Conferir prévia', exact=True).click()
            expect(page.get_by_role('button', name='Confirmar preparação do ano letivo')).to_be_enabled()
            expect(page.get_by_label('Prévia da preparação')).to_contain_text('2 turma(s) para criar')
            page.get_by_role('button', name='Confirmar preparação do ano letivo').scroll_into_view_if_needed()
            page.screenshot(path=str(OUT/'02-previa-ano-letivo.png'), full_page=True)
            page.get_by_role('button', name='Confirmar preparação do ano letivo').click()
            expect(page.get_by_text('Ano letivo preparado:', exact=False)).to_be_visible()
            assert len(call('GET', '/class-groups')) == 4
            checks.append('Prévia e preparação das duas turmas pelo formulário; origem e fluxo manual preservados.')
            navigate('online')
            page.get_by_role('button', name='Aluno sintético', exact=False).click()
            expect(page.get_by_label('Aluno existente (opcional)').locator('option')).to_have_count(2)
            expect(page.get_by_label('Responsável existente (opcional)').locator('option')).to_have_count(2)
            page.get_by_label('Aluno existente (opcional)').select_option(student['id'])
            page.get_by_label('Responsável existente (opcional)').select_option(guardian['id'])
            page.get_by_label('Justificativa pronta').select_option(label='Aprovação após conferência')
            page.get_by_role('button', name='Usar justificativa', exact=True).click()
            expect(page.get_by_label('Justificativa / parecer para a próxima ação')).to_have_value('Identidade, documentos e legitimidade dos vínculos conferidos pela Secretaria. Inscrição aprovada para preparação da matrícula.')
            page.screenshot(path=str(OUT/'03-conciliacao-automatica.png'), full_page=True)
            page.get_by_label('Conferi a identidade, os documentos e a legitimidade do vínculo do responsável com este aluno.').check()
            page.get_by_role('button', name='Aprovar e criar matrícula em preparação').click()
            expect(page.get_by_text('Inscrição aprovada;', exact=False)).to_be_visible()
            assert call('GET', '/admissions/'+admission['id'])['student_id'] == student['id']
            assert call('GET', '/students')['total'] == 1
            checks.append('Busca automática separada, justificativa editável e aprovação explícita reutilizam aluno e responsável.')
            navigate('email')
            page.get_by_role('button', name='Configurar envio', exact=True).click()
            page.get_by_label('Configuração').select_option('school')
            page.get_by_label('Servidor SMTP', exact=True).fill('mail.escola.example.com')
            page.get_by_label('Usuário SMTP', exact=True).fill('admin@escola.example.com')
            page.get_by_label('Remetente', exact=True).fill('admin@escola.example.com')
            page.get_by_label('Senha SMTP', exact=True).fill(MAIL_PASSWORD)
            page.get_by_role('button', name='Salvar envio', exact=True).click()
            expect(page.get_by_text('Configuração de envio salva.', exact=False)).to_be_visible()
            page.get_by_role('button', name='Validar autenticação', exact=True).click()
            expect(page.get_by_text('Autenticação SMTP validada.', exact=False)).to_be_visible()
            page.get_by_role('button', name='Enviar teste para meu e-mail').click()
            expect(page.get_by_text('Teste enfileirado para', exact=False)).to_be_visible()
            for _ in range(40):
                if any(j['status']=='completed' for j in call('GET', '/notification-email')['jobs']): break
                time.sleep(.1)
            page.get_by_role('button', name='Atualizar fila de e-mail').click()
            expect(page.get_by_role('cell', name='Aceito pelo servidor SMTP', exact=True)).to_be_visible()
            page.get_by_role('cell', name='Aceito pelo servidor SMTP', exact=True).scroll_into_view_if_needed()
            page.screenshot(path=str(OUT/'04-notificacoes-smtp.png'), full_page=True)
            checks.append('Configuração SMTP da escola, autenticação e fila com aceitação pelo servidor sintético; sem alegar entrega externa.')
            page.get_by_role('button', name='Reparar vínculo local', exact=True).click()
            expect(page.get_by_text('Vínculo local reparado.', exact=False)).to_be_visible()
            navigate('webmail')
            expect(page.get_by_role('button', name='Reparar conexão da caixa existente')).to_be_visible()
            page.get_by_role('button', name='Reparar conexão da caixa existente').click()
            page.get_by_label('Senha da caixa', exact=True).fill(MAIL_PASSWORD)
            page.get_by_role('button', name='Conectar e-mail', exact=True).click()
            expect(page.get_by_text('Mensagem sintética preservada', exact=False)).to_be_visible()
            call('POST', '/mailcow/mailboxes/'+box['id']+'/repair', {})
            page.get_by_role('button', name='Reparar conexão', exact=True).click()
            expect(page.get_by_text('Conexão reparada e autenticada.', exact=False)).to_be_visible()
            page.screenshot(path=str(OUT/'05-caixa-existente-preservada.png'), full_page=True)
            state = client.get('/__synthetic_state').json()
            assert state['inbox_count'] == 1 and state['remote_methods'] and set(state['remote_methods']) == {'GET'}
            checks.append('Reparo do vínculo e reconexão com senha atual preservam mensagem e usam somente GET no provedor de contas.')
            assert not errors, errors
            browser.close()
        parent.close()
    (OUT/'result.json').write_text(json.dumps({'status':'passed','checks':checks,'page_errors':errors,'external_homologation':False},ensure_ascii=False,indent=2))
    print(json.dumps({'status':'passed','checks':checks,'evidence':str(OUT)},ensure_ascii=False))
finally:
    proc.terminate()
    try: proc.wait(timeout=10)
    except subprocess.TimeoutExpired: proc.kill(); proc.wait()
    log.close(); shutil.rmtree(TEMP, ignore_errors=True)
