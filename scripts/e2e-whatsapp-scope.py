#!/usr/bin/env python3
"""WhatsApp por instituição: HTTP real, provedor simulado e dados descartáveis."""
import json
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import httpx
from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.getenv('PIGE_E2E_EVIDENCE_DIR', str(ROOT/'evidence/0.10.0/whatsapp-scope')))
OUT.mkdir(parents=True, exist_ok=True)
TEMP = Path(tempfile.mkdtemp(prefix='pige-whatsapp-scope-'))
with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0))
    port = sock.getsockname()[1]
URL = f'http://127.0.0.1:{port}'
PASSWORD = 'Synthetic-WhatsApp-Password-2026!'
env = {**os.environ, 'PYTHONPATH': str(ROOT/'backend'), 'DATABASE_URL': 'sqlite:///'+str(TEMP/'app.db'),
       'ALLOW_SQLITE': 'true', 'APP_ENV': 'test', 'APP_URL': URL, 'ALLOWED_HOSTS': '127.0.0.1,localhost',
       'APP_SECRET_KEY': 'synthetic-whatsapp-scope-only-01234567890123456789',
       'SETUP_TOKEN': 'synthetic-whatsapp-setup-01234567890123456789',
       'STORAGE_PATH': str(TEMP/'files'), 'FRONTEND_PATH': str(ROOT/'frontend/dist'), 'COOKIE_SECURE': 'false',
       'CONNECT_API_BASE_URL': 'https://connect.example.test', 'CONNECT_API_KEY': 'synthetic-provider-key'}
subprocess.run([sys.executable, '-m', 'alembic', 'upgrade', 'head'], cwd=ROOT/'backend', env=env, check=True)
server = '''
import os
import uvicorn
from app.main import app
from app import connect
class FakeProvider:
    def fetch_instances(self):
        return [{'name': name, 'state': 'open'} for name in ('SINTETICA-A', 'SINTETICA-B', 'NOVA-SINTETICA-A', 'LEGADA-SINTETICA')]
    def fetch_instance(self, name):
        return {'name': name, 'state': 'open'}
connect.ConnectApiClient = FakeProvider
uvicorn.run(app, host='127.0.0.1', port=int(os.environ['PIGE_SCOPE_PORT']))
'''
log = (OUT/'server.log').open('w')
proc = subprocess.Popen([sys.executable, '-c', server], cwd=ROOT/'backend', env={**env, 'PIGE_SCOPE_PORT': str(port)}, stdout=log, stderr=log)
checks, errors = [], []
def record(message):
    checks.append(message)
    print('PASS:', message, flush=True)
try:
    with httpx.Client(base_url=URL, timeout=30) as client:
        for _ in range(100):
            try:
                if client.get('/health/ready').status_code == 200:
                    break
            except httpx.HTTPError:
                pass
            time.sleep(.1)
        response = client.post('/api/v1/setup', headers={'X-Setup-Token': env['SETUP_TOKEN']}, json={
            'admin_name': 'Administrador Sintético', 'admin_email': 'scope@example.com', 'admin_password': PASSWORD,
            'company_name': 'Mantenedora Sintética', 'school_name': 'Escola Alfa', 'academic_year': 2026})
        assert response.status_code == 201, response.text
        auth = client.post('/api/v1/auth/login', json={'email': 'scope@example.com', 'password': PASSWORD}).json()
        headers = {'Authorization': 'Bearer '+auth['access_token']}
        a = client.get('/api/v1/schools', headers=headers).json()[0]
        response = client.post('/api/v1/schools', headers=headers, json={'name': 'Escola Beta', 'company_id': a['company_id']})
        assert response.status_code == 201, response.text
        b = response.json()
        seed = '''
import json,os
from app import models as m
from app.db import SessionLocal,now
with SessionLocal.begin() as db:
    schools=json.loads(os.environ['PIGE_SCOPE_SCHOOLS'])
    for sid,name in zip(schools,('SINTETICA-A','SINTETICA-B')):
        school=db.get(m.School,sid)
        db.add(m.ConnectInstance(school_id=sid,company_id=school.company_id,name=name,display_name=name,source='adopted',status='open'))
    legacy=m.ConnectInstance(company_id=school.company_id,name='LEGADA-SINTETICA',source='adopted',status='open')
    db.add(legacy);db.flush()
    for sid in schools:db.add(m.ConnectSchoolBinding(school_id=sid,instance_id=legacy.id,updated_at=now()))
'''
        subprocess.run([sys.executable, '-c', seed], cwd=ROOT/'backend', env={**env, 'PIGE_SCOPE_SCHOOLS': json.dumps([a['id'], b['id']])}, check=True)
        with sync_playwright() as pw:
            binary = os.getenv('CHROMIUM_PATH') or (None if Path(pw.chromium.executable_path).exists() else shutil.which('chromium'))
            browser = pw.chromium.launch(headless=True, **({'executable_path': binary} if binary else {}), args=['--no-sandbox'])
            page = browser.new_page(viewport={'width': 1440, 'height': 1000}, locale='pt-BR')
            page.set_default_timeout(15000)
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(URL)
            page.get_by_label('E-mail', exact=True).fill('scope@example.com')
            page.get_by_label('Senha', exact=True).fill(PASSWORD)
            page.get_by_role('button', name='Entrar na aplicação').click()
            expect(page.get_by_role('heading', name='Visão geral', exact=True)).to_be_visible()
            def whatsapp():
                expect(page.get_by_label('Selecionar escola')).to_be_enabled()
                expect(page.locator('.app-root')).to_have_attribute('aria-busy', 'false')
                group = page.locator('aside').get_by_role('button', name='Integrações', exact=True)
                if group.get_attribute('aria-expanded') == 'false':
                    group.click()
                page.locator('aside').get_by_role('link', name='WhatsApp', exact=True).click()
                expect(page.get_by_role('heading', name='Instâncias da instituição', exact=True)).to_be_visible()
            whatsapp()
            expect(page.locator('.x-charge code').filter(has_text='SINTETICA-A')).to_have_count(1)
            expect(page.locator('.x-charge code').filter(has_text='SINTETICA-B')).to_have_count(0)
            page.get_by_role('button', name='Revisar vínculo anterior', exact=True).click()
            page.get_by_label('Motivo da desvinculação', exact=True).fill('A instância anterior pertence à Escola Beta.')
            page.get_by_role('button', name='Confirmar desvinculação', exact=True).click()
            expect(page.get_by_role('heading', name='Vínculo anterior precisa de revisão')).to_have_count(0)
            assert client.get('/api/v1/schools/'+b['id']+'/connect', headers=headers).json()['legacy_binding_requires_review']
            record('Revisão remove apenas os vínculos antigos da instituição ativa')
            page.get_by_label('Nome da instância existente', exact=True).fill('NOVA-SINTETICA-A')
            page.get_by_role('button', name='Vincular a esta instituição', exact=True).click()
            expect(page.locator('.x-charge code').filter(has_text='NOVA-SINTETICA-A')).to_have_count(1)
            expect(page.get_by_role('heading', name='Instâncias desta instituição no serviço')).to_be_visible()
            expect(page.locator('main').get_by_text('SINTETICA-B', exact=True)).to_have_count(0)
            record('Adoção por nome e inventário preservam o recorte da instituição')
            page.screenshot(path=str(OUT/'whatsapp-instituicao-desktop.png'), full_page=True)
            page.get_by_label('Selecionar escola').select_option(b['id'])
            whatsapp()
            expect(page.locator('.x-charge code').filter(has_text='SINTETICA-B')).to_have_count(1)
            expect(page.locator('.x-charge code').filter(has_text='SINTETICA-A')).to_have_count(0)
            page.get_by_label('Nome da instância existente', exact=True).fill('NOVA-SINTETICA-A')
            page.get_by_role('button', name='Vincular a esta instituição', exact=True).click()
            expect(page.get_by_text('Esta instância já pertence a outra instituição.', exact=False)).to_be_visible()
            record('Troca de instituição limpa a lista e impede adoção de instância alheia')
            page.get_by_label('Nome da instância existente', exact=True).fill('LEGADA-SINTETICA')
            page.get_by_role('button', name='Vincular a esta instituição', exact=True).click()
            expect(page.locator('.x-charge code').filter(has_text='LEGADA-SINTETICA')).to_have_count(1)
            expect(page.get_by_role('heading', name='Vínculo anterior precisa de revisão')).to_have_count(0)
            record('A instituição responsável conclui a vinculação do legado após a revisão')
            page.set_viewport_size({'width': 390, 'height': 844})
            page.get_by_label('Nome da instância existente', exact=True).scroll_into_view_if_needed()
            expect(page.get_by_label('Nome da instância existente', exact=True)).to_be_visible()
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
            page.screenshot(path=str(OUT/'whatsapp-instituicao-mobile.png'), full_page=True)
            assert not errors, errors
            record('Formulário funciona em 390 px sem rolagem horizontal ou erros JavaScript')
            browser.close()
    (OUT/'result.json').write_text(json.dumps({'ok': True, 'checks': checks, 'page_errors': errors}, ensure_ascii=False, indent=2))
finally:
    proc.terminate()
    try:
        proc.wait(timeout=10)
    except subprocess.TimeoutExpired:
        proc.kill()
    log.close()
    shutil.rmtree(TEMP, ignore_errors=True)
