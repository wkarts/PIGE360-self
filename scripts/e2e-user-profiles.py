#!/usr/bin/env python3
"""Usuários/perfis e ciclo de acesso entre duas escolas, com dados sintéticos HTTP."""
import json
import os
import re
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
OUT = ROOT / 'evidence/0.10.0/user-profiles'
OUT.mkdir(parents=True, exist_ok=True)
TEMP = Path(tempfile.mkdtemp(prefix='pige-user-profiles-'))
shutil.copytree(ROOT / 'frontend/dist', TEMP / 'frontend')
with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0))
    PORT = sock.getsockname()[1]
URL = f'http://127.0.0.1:{PORT}'
EMAIL, PASSWORD = 'access-admin@example.com', 'Synthetic-Access-Password-2026!'
USER_EMAIL, SHARED_EMAIL = 'access-operator@example.com', 'access-shared@example.com'
env = {**os.environ, 'PYTHONPATH': str(ROOT/'backend'), 'DATABASE_URL': 'sqlite:///'+str(TEMP/'app.db'),
       'ALLOW_SQLITE': 'true', 'APP_ENV': 'test', 'APP_URL': URL, 'ALLOWED_HOSTS': '127.0.0.1,localhost',
       'APP_SECRET_KEY': 'synthetic-user-profiles-01234567890123456789',
       'SETUP_TOKEN': 'synthetic-user-profiles-setup-01234567890123456789',
       'STORAGE_PATH': str(TEMP/'files'), 'FRONTEND_PATH': str(TEMP/'frontend'), 'COOKIE_SECURE': 'false'}
subprocess.run([sys.executable, '-m', 'alembic', 'upgrade', 'head'], cwd=ROOT/'backend', env=env, check=True)
log = (OUT/'server.log').open('w')
proc = subprocess.Popen([sys.executable, '-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', str(PORT)],
                        cwd=ROOT/'backend', env=env, stdout=log, stderr=log)
checks, errors = [], []


def record(message):
    checks.append(message)
    print('PASS:', message, flush=True)


try:
    client = httpx.Client(base_url=URL, timeout=30, trust_env=False)
    for _ in range(100):
        try:
            if client.get('/health/ready').status_code == 200:
                break
        except httpx.HTTPError:
            pass
        time.sleep(.1)
    setup = client.post('/api/v1/setup', headers={'X-Setup-Token': env['SETUP_TOKEN']}, json={
        'admin_name': 'Administrador Exemplo', 'admin_email': EMAIL, 'admin_password': PASSWORD,
        'company_name': 'Mantenedora Exemplo', 'school_name': 'Escola Alfa', 'academic_year': 2026})
    assert setup.status_code == 201, setup.text
    school_a = setup.json()['school_id']
    login = client.post('/api/v1/auth/login', json={'email': EMAIL, 'password': PASSWORD}).json()
    headers = {'Authorization': 'Bearer '+login['access_token']}
    school = client.get('/api/v1/schools', headers=headers).json()[0]
    second = client.post('/api/v1/schools', headers=headers, json={'company_id': school['company_id'], 'name': 'Escola Beta'})
    assert second.status_code == 201, second.text
    school_b = second.json()['id']
    base_a, base_b = '/api/v1/schools/'+school_a, '/api/v1/schools/'+school_b
    shared = client.post(base_a+'/users', headers=headers, json={
        'name': 'Usuário Compartilhado', 'email': SHARED_EMAIL, 'password': PASSWORD, 'role': 'viewer'})
    assert shared.status_code == 201, shared.text
    shared_id = shared.json()['id']
    # Fixture de vínculo pré-existente entre escolas. Nenhuma conta real é usada.
    subprocess.run([sys.executable, '-c',
                    'from app.db import SessionLocal; from app.models import SchoolAccess; '
                    'import sys; db=SessionLocal(); db.add(SchoolAccess(user_id=sys.argv[1],school_id=sys.argv[2])); db.commit()',
                    shared_id, school_b], cwd=ROOT/'backend', env=env, check=True)
    with sync_playwright() as playwright:
        binary = os.getenv('CHROMIUM_PATH') or None
        browser = playwright.chromium.launch(headless=True, executable_path=binary, args=['--no-sandbox'])
        page = browser.new_page(viewport={'width': 1440, 'height': 960}, locale='pt-BR')
        page.set_default_timeout(12000)
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(URL)
        page.get_by_label('E-mail', exact=True).fill(EMAIL)
        page.get_by_label('Senha', exact=True).fill(PASSWORD)
        page.get_by_role('button', name='Entrar na aplicação').click()
        expect(page.locator('.app-root')).to_have_attribute('aria-busy', 'false')
        page.get_by_label('Selecionar escola', exact=True).select_option(school_a)
        expect(page.locator('.app-root')).to_have_attribute('aria-busy', 'false')
        page.locator('aside a[href="#/users"]').click()
        workspace = page.locator('.users-workspace')
        expect(workspace).to_have_attribute('aria-busy', 'false')
        expect(workspace.locator('.access-user-card').filter(has_text=EMAIL).get_by_role('button', name='Gerenciar acesso', exact=True)).to_be_disabled()
        self_preview = client.get(base_a+'/users/'+login['user']['id']+'/lifecycle', headers=headers).json()
        self_deactivate = client.post(base_a+'/users/'+login['user']['id']+'/lifecycle', headers=headers,
                                     json={'version': self_preview['version'], 'action': 'deactivate', 'reason': 'Teste sintético'})
        assert self_deactivate.status_code == 422
        record('A interface e a API impedem remover o próprio administrador')

        workspace.get_by_role('tab', name=re.compile('Perfis de acesso')).click()
        standard_card = workspace.locator('.access-standard-card').filter(has_text='Professor').first
        expect(standard_card).to_be_visible()
        standard_card.get_by_role('button', name='Duplicar e editar', exact=True).click()
        expect(workspace.get_by_label('Nome do perfil', exact=True)).to_have_value('Professor personalizado')
        expect(workspace.locator('form.access-editor .access-fields select').first).to_have_value('teacher')
        workspace.get_by_role('button', name='Salvar perfil', exact=True).click()
        teacher_copy = workspace.locator('.access-profile-card').filter(has_text='Professor personalizado')
        expect(teacher_copy).to_be_visible()
        teacher_copy.get_by_role('button', name='Excluir', exact=True).click()
        workspace.get_by_label('Motivo', exact=True).fill('Remover cópia sintética do modelo')
        workspace.get_by_label('Digite Professor personalizado para confirmar', exact=True).fill('Professor personalizado')
        workspace.get_by_role('button', name='Excluir perfil', exact=True).click()
        expect(teacher_copy).to_have_count(0)
        record('Modelos padrão podem ser duplicados e personalizados sem alterar o perfil global')
        workspace.get_by_role('button', name='+ Criar perfil', exact=True).click()
        workspace.get_by_label('Nome do perfil', exact=True).fill('Secretaria — consulta')
        for button in workspace.locator('.access-group-actions').get_by_role('button', name='Limpar', exact=True).all():
            button.click()
        for permission in ('read', 'dashboard.read', 'people.read'):
            workspace.locator('input[type="checkbox"][value="'+permission+'"]').check()
        workspace.get_by_role('button', name='Salvar perfil', exact=True).click()
        profile_card = workspace.locator('.access-profile-card').filter(has_text='Secretaria — consulta')
        expect(profile_card).to_be_visible()
        profile = next(item for item in client.get(base_a+'/access-profiles', headers=headers).json() if item['name']=='Secretaria — consulta')
        assert set(profile['permissions']) == {'read', 'dashboard.read', 'people.read'}
        assert not client.get(base_b+'/access-profiles', headers=headers).json()
        record('Perfil de consulta criado pela UI pertence somente à escola Alfa')
        profile_card.get_by_role('button', name='Duplicar', exact=True).click()
        workspace.get_by_label('Nome do perfil', exact=True).fill('Secretaria — consulta 2')
        workspace.get_by_role('button', name='Salvar perfil', exact=True).click()
        duplicate_card=workspace.locator('.access-profile-card').filter(has_text='Secretaria — consulta 2')
        expect(duplicate_card).to_be_visible()
        duplicate_card.get_by_role('button', name='Excluir', exact=True).click()
        workspace.get_by_label('Motivo', exact=True).fill('Remover cópia sintética do teste')
        workspace.get_by_label('Digite Secretaria — consulta 2 para confirmar', exact=True).fill('Secretaria — consulta 2')
        workspace.get_by_role('button', name='Excluir perfil', exact=True).click()
        expect(duplicate_card).to_have_count(0)
        record('Perfis personalizados também podem ser duplicados antes da edição')

        workspace.get_by_role('tab', name=re.compile('^Usuários')).click()
        workspace.get_by_role('button', name='+ Criar usuário', exact=True).click()
        workspace.get_by_label('Nome', exact=True).fill('Operador Exemplo')
        workspace.get_by_label('E-mail', exact=True).fill(USER_EMAIL)
        workspace.get_by_label(re.compile('^Senha inicial')).fill(PASSWORD)
        workspace.get_by_label(re.compile('^Permissões')).select_option(profile['id'])
        workspace.get_by_role('button', name='Salvar acesso', exact=True).click()
        user_card = workspace.locator('.access-user-card').filter(has_text=USER_EMAIL)
        expect(user_card).to_be_visible()
        user = next(item for item in client.get(base_a+'/users', headers=headers).json() if item['email']==USER_EMAIL)
        user_id = user['id']
        assert user['access_profile_id'] == profile['id'] and user['school_ids'] == [school_a]
        assert USER_EMAIL not in [item['email'] for item in client.get(base_b+'/users', headers=headers).json()]
        record('Usuário criado na UI recebe o perfil e vínculo exclusivo com a escola ativa')

        user_card.get_by_role('button', name='Editar', exact=True).click()
        workspace.get_by_label('Nome', exact=True).fill('Operador Exemplo Atualizado')
        workspace.get_by_label('Motivo da alteração', exact=True).fill('Atualização cadastral sintética')
        workspace.get_by_role('button', name='Salvar acesso', exact=True).click()
        expect(user_card.get_by_text('Operador Exemplo Atualizado', exact=True)).to_be_visible()
        workspace.get_by_role('tab', name=re.compile('Perfis de acesso')).click()
        expect(profile_card.get_by_role('button', name='Excluir', exact=True)).to_be_disabled()
        profile_card.get_by_role('button', name='Editar permissões', exact=True).click()
        workspace.locator('input[type="checkbox"][value="students.read"]').check()
        workspace.get_by_label('Motivo da alteração', exact=True).fill('Liberar consulta de alunos')
        workspace.get_by_role('button', name='Salvar perfil', exact=True).click()
        expect(profile_card).to_be_visible()
        def operator_access(sid):
            response = client.post('/api/v1/auth/login', json={'email': USER_EMAIL, 'password': PASSWORD})
            assert response.status_code == 200, response.text
            return client.get('/api/v1/auth/me', headers={'Authorization':'Bearer '+response.json()['access_token'],'X-School-ID':sid})
        permissions = operator_access(school_a).json()['permissions']
        assert 'students.read' in permissions and 'students.write' not in permissions
        assert operator_access(school_b).status_code == 403
        record('Edição de usuário/permissões persiste e a outra instituição permanece inacessível')

        profile_card.get_by_role('button', name='Editar permissões', exact=True).click()
        workspace.get_by_label(re.compile('^Situação')).select_option('false')
        workspace.get_by_label('Motivo da alteração', exact=True).fill('Suspender perfil sintético')
        workspace.get_by_role('button', name='Salvar perfil', exact=True).click()
        expect(profile_card.locator('.badge')).to_have_text('Inativo')
        assert operator_access(school_a).status_code == 403
        profile_card.get_by_role('button', name='Editar permissões', exact=True).click()
        workspace.get_by_label(re.compile('^Situação')).select_option('true')
        workspace.get_by_label('Motivo da alteração', exact=True).fill('Reativar perfil sintético')
        workspace.get_by_role('button', name='Salvar perfil', exact=True).click()
        expect(profile_card.locator('.badge')).to_have_text('Ativo')
        assert operator_access(school_a).status_code == 200
        record('Inativar e reativar o perfil efetivamente suspende e recupera as permissões')

        workspace.get_by_role('tab', name=re.compile('^Usuários')).click()
        def lifecycle(email, action, state=None):
            card = workspace.locator('.access-user-card').filter(has_text=email)
            card.get_by_role('button', name='Gerenciar acesso', exact=True).click()
            expect(workspace.get_by_label(re.compile('^Operação'))).to_be_visible()
            workspace.get_by_label(re.compile('^Operação')).select_option(action)
            workspace.get_by_label('Motivo', exact=True).fill('Validação sintética do ciclo de acesso')
            if action.startswith('delete_'):
                workspace.get_by_label('Digite '+email+' para confirmar', exact=True).fill(email)
            workspace.get_by_role('button', name='Confirmar alteração', exact=True).click()
            expect(workspace.get_by_role('heading', name='Gerenciar acesso', exact=True)).to_have_count(0)
            if state:
                expect(card.locator('.badge')).to_have_text(state)
        lifecycle(USER_EMAIL, 'deactivate', 'Inativo')
        assert operator_access(school_a).status_code == 403
        lifecycle(USER_EMAIL, 'activate', 'Ativo')
        assert operator_access(school_a).status_code == 200
        lifecycle(USER_EMAIL, 'archive', 'Arquivado')
        expect(user_card.get_by_role('button', name='Editar', exact=True)).to_be_disabled()
        lifecycle(USER_EMAIL, 'restore', 'Ativo')
        record('Inativação, reativação, exclusão lógica e restauração funcionam pela interface')

        for width, height in ((390,844),(320,640)):
            page.set_viewport_size({'width':width,'height':height})
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
            for button in workspace.locator('.access-user-actions button:visible').all():
                box=button.bounding_box();assert box and box['width']>=43.5 and box['height']>=43.5
            page.screenshot(path=str(OUT/f'users-{width}.png'),full_page=True)
            workspace.get_by_role('tab', name=re.compile('Perfis de acesso')).click()
            profile_card.get_by_role('button', name='Editar permissões', exact=True).click()
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
            assert workspace.get_by_label('Nome do perfil',exact=True).evaluate('el=>parseFloat(getComputedStyle(el).fontSize)>=16')
            page.screenshot(path=str(OUT/f'profile-editor-{width}.png'),full_page=True)
            workspace.get_by_role('button',name='Cancelar',exact=True).click()
            workspace.get_by_role('tab', name=re.compile('^Usuários')).click()
        record('Listas, ações e editor de permissões sem transbordamento em 390/320 px')
        page.set_viewport_size({'width':1440,'height':960})
        page.get_by_label('Selecionar escola',exact=True).select_option(school_b)
        expect(workspace).to_have_attribute('aria-busy','false')
        expect(workspace.locator('.access-user-card').filter(has_text=USER_EMAIL)).to_have_count(0)
        expect(workspace.locator('.access-user-card').filter(has_text=SHARED_EMAIL)).to_be_visible()
        workspace.get_by_role('tab',name=re.compile('Perfis de acesso')).click()
        expect(workspace.locator('.access-profile-card')).to_have_count(0)
        page.get_by_label('Selecionar escola',exact=True).select_option(school_a)
        expect(workspace.locator('.access-user-card').filter(has_text=USER_EMAIL)).to_be_visible()
        record('Troca real de instituição remove usuários e perfis exclusivos da tela anterior')

        shared_card=workspace.locator('.access-user-card').filter(has_text=SHARED_EMAIL)
        shared_card.get_by_role('button',name='Gerenciar acesso',exact=True).click()
        expect(workspace.get_by_label(re.compile('^Operação'))).to_be_visible()
        expect(workspace.locator('option[value="delete_account"]')).to_have_count(0)
        workspace.get_by_role('button',name='Cancelar',exact=True).click()
        preview=client.get(base_a+'/users/'+shared_id+'/lifecycle',headers=headers).json()
        assert not preview['can_delete_account']
        denied=client.post(base_a+'/users/'+shared_id+'/lifecycle',headers=headers,json={
            'action':'delete_account','version':preview['version'],'reason':'Teste sintético','confirmation':SHARED_EMAIL})
        assert denied.status_code==409,denied.text
        lifecycle(SHARED_EMAIL,'delete_access')
        expect(shared_card).to_have_count(0)
        assert shared_id in [item['id'] for item in client.get(base_b+'/users',headers=headers).json()]
        shared_login=client.post('/api/v1/auth/login',json={'email':SHARED_EMAIL,'password':PASSWORD})
        assert shared_login.status_code==200
        shared_headers={'Authorization':'Bearer '+shared_login.json()['access_token'],'X-School-ID':school_b}
        assert client.get('/api/v1/auth/me',headers=shared_headers).status_code==200
        record('Exclusão definitiva remove somente vínculo Alfa; conta compartilhada e acesso Beta permanecem')
        lifecycle(USER_EMAIL,'delete_access')
        workspace.get_by_role('tab',name=re.compile('Perfis de acesso')).click()
        profile_card.get_by_role('button',name='Excluir',exact=True).click()
        workspace.get_by_label('Motivo',exact=True).fill('Perfil sintético sem vínculos')
        workspace.get_by_label('Digite Secretaria — consulta para confirmar',exact=True).fill('Secretaria — consulta')
        workspace.get_by_role('button',name='Excluir perfil',exact=True).click()
        expect(profile_card).to_have_count(0)
        record('Perfil sem vínculos pode ser excluído após confirmação explícita')
        assert not errors,errors
        browser.close()
    (OUT/'results.json').write_text(json.dumps({'status':'passed','checks':checks,'errors':errors,
        'frontend':json.loads((TEMP/'frontend/build-info.json').read_text()),'remote_providers':False},ensure_ascii=False,indent=2))
except Exception:
    try:
        page.screenshot(path=str(OUT/'failure.png'),full_page=True)
    except Exception:
        pass
    (OUT/'results.json').write_text(json.dumps({'status':'failed','checks':checks,'errors':errors},ensure_ascii=False,indent=2))
    raise
finally:
    proc.terminate();proc.wait(timeout=10);log.close();shutil.rmtree(TEMP,ignore_errors=True)
