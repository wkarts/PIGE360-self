#!/usr/bin/env python3
"""Arquivar, restaurar e excluir pela UI real; somente dados locais sintéticos."""
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
OUT = ROOT / 'evidence/0.10.0/record-lifecycle'
OUT.mkdir(parents=True, exist_ok=True)
TEMP = Path(tempfile.mkdtemp(prefix='pige-lifecycle-'))
with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0))
    port = sock.getsockname()[1]
URL = f'http://127.0.0.1:{port}'
EMAIL = 'lifecycle@example.com'
PASSWORD = 'Synthetic-Lifecycle-Password-2026!'
env = {**os.environ, 'PYTHONPATH': str(ROOT / 'backend'), 'DATABASE_URL': 'sqlite:///' + str(TEMP / 'e2e.db'),
       'ALLOW_SQLITE': 'true', 'APP_ENV': 'test', 'APP_URL': URL, 'ALLOWED_HOSTS': '127.0.0.1,localhost',
       'APP_SECRET_KEY': 'test-only-lifecycle-secret-01234567890123456789',
       'SETUP_TOKEN': 'test-only-lifecycle-setup-01234567890123456789', 'STORAGE_PATH': str(TEMP / 'files'),
       'FRONTEND_PATH': str(ROOT / 'frontend/dist'), 'COOKIE_SECURE': 'false'}
subprocess.run([sys.executable, '-m', 'alembic', 'upgrade', 'head'], cwd=ROOT / 'backend', env=env, check=True)
log = (OUT / 'server.log').open('w')
proc = subprocess.Popen([sys.executable, '-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', str(port)],
                        cwd=ROOT / 'backend', env=env, stdout=log, stderr=log)
checks = []
errors = []


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
    else:
        raise RuntimeError('Servidor de teste não iniciou')
    response = client.post('/api/v1/setup', headers={'X-Setup-Token': env['SETUP_TOKEN']}, json={
        'admin_name': 'Secretaria Exemplo', 'admin_email': EMAIL, 'admin_password': PASSWORD,
        'company_name': 'Mantenedora Exemplo', 'school_name': 'Escola Exemplo', 'academic_year': 2026})
    assert response.status_code == 201, response.text
    school_id = response.json()['school_id']
    auth = client.post('/api/v1/auth/login', json={'email': EMAIL, 'password': PASSWORD}).json()
    headers = {'Authorization': 'Bearer ' + auth['access_token']}
    base = '/api/v1/schools/' + school_id

    def create(path, payload):
        response = client.post(base + path, headers=headers, json=payload)
        assert response.status_code == 201, response.text
        return response.json()

    person = create('/persons', {'name': 'Pessoa Sintética para Arquivar', 'person_types': ['supplier']})
    student = create('/students', {'person': {'name': 'Aluno com Histórico Preservado', 'birth_date': '2000-01-01'}})
    unit = create('/units', {'name': 'Unidade Teste'})
    year = create('/academic-years', {'name': '2027', 'starts_on': '2027-01-01', 'ends_on': '2027-12-31'})
    grade = create('/grades', {'name': 'Série Teste'})
    shift = create('/shifts', {'name': 'Turno Teste'})
    group = create('/class-groups', {'name': 'Turma Teste', 'unit_id': unit['id'], 'academic_year_id': year['id'],
                    'grade_id': grade['id'], 'shift_id': shift['id'], 'capacity': 20})
    enrollment = create('/enrollments', {'student_id': student['id'], 'class_group_id': group['id'], 'enrolled_on': '2027-01-10'})

    with sync_playwright() as pw:
        binary = os.getenv('CHROMIUM_PATH') or (None if Path(pw.chromium.executable_path).exists() else shutil.which('chromium'))
        browser = pw.chromium.launch(headless=True, **({'executable_path': binary} if binary else {}), args=['--no-sandbox'])
        context = browser.new_context(viewport={'width': 390, 'height': 844}, locale='pt-BR', is_mobile=True, has_touch=True)
        page = context.new_page()
        page.set_default_timeout(12000)
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(URL)
        page.get_by_label('E-mail', exact=True).fill(EMAIL)
        page.get_by_label('Senha', exact=True).fill(PASSWORD)
        page.get_by_role('button', name='Entrar na aplicação').click()
        expect(page.get_by_role('heading', name='Visão geral', exact=True)).to_be_visible()

        def navigate(name):
            page.get_by_role('button', name='Abrir menu', exact=True).click()
            page.locator('aside').get_by_role('link', name=name, exact=True).click()
            expect(page.get_by_role('heading', name=name, exact=True)).to_be_visible()

        def row(name):
            return page.locator('.record-list tbody tr').filter(has_text=name)

        def open_manage(name):
            row(name).locator('.record-manage').click()
            dialog = page.get_by_role('dialog')
            expect(dialog).to_be_visible()
            expect(dialog.locator('.lifecycle-record h3')).to_have_text(name)
            expect(dialog).to_have_attribute('aria-busy', 'false')
            return dialog

        def confirm(dialog, text='Conferência realizada pela secretaria'):
            dialog.get_by_label('Motivo', exact=False).fill(text)
            dialog.locator('input[type=checkbox]').check()

        navigate('Cadastro único')
        dialog = open_manage(person['name'])
        expect(dialog.get_by_role('heading', name='Arquivar ou excluir', exact=True)).to_be_focused()
        assert page.locator('#app').evaluate('el => el.inert'), 'Fundo do modal deve ficar inerte'
        close = dialog.get_by_role('button', name='Fechar gerenciamento do cadastro', exact=True)
        close.focus()
        page.keyboard.press('Shift+Tab')
        expect(dialog.get_by_role('button', name='Cancelar', exact=True)).to_be_focused()
        page.keyboard.press('Escape')
        expect(page.get_by_role('dialog')).to_have_count(0)
        expect(row(person['name']).locator('.record-manage')).to_be_focused()
        record('Diálogo contém o foco, bloqueia o fundo e fecha por Escape devolvendo foco à ação')

        dialog = open_manage(person['name'])
        confirm(dialog)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
        page.screenshot(path=str(OUT / '01-arquivar-mobile.png'))
        dialog.get_by_role('button', name='Arquivar cadastro', exact=True).click()
        expect(page.get_by_role('dialog')).to_have_count(0)
        expect(row(person['name'])).to_have_count(0)
        response = client.get(base + '/persons?archived=archived', headers=headers)
        assert response.status_code == 200 and response.json()['items'][0]['archived']
        record('Arquivamento pela UI persiste e retira a pessoa das listas disponíveis')

        page.get_by_label('Exibir registros', exact=True).select_option('archived')
        expect(row(person['name'])).to_have_count(1)
        dialog = open_manage(person['name'])
        expect(dialog.locator('input[value=restore]')).to_be_checked()
        expect(dialog).to_contain_text('Motivo do arquivamento:')
        confirm(dialog, 'Restauração solicitada pela secretaria')
        dialog.get_by_role('button', name='Restaurar cadastro', exact=True).click()
        expect(page.get_by_role('dialog')).to_have_count(0)
        expect(row(person['name'])).to_have_count(0)
        page.get_by_label('Exibir registros', exact=True).select_option('active')
        expect(row(person['name'])).to_have_count(1)
        record('Filtro Arquivados permite restaurar o cadastro e o devolve à lista disponível')

        dialog = open_manage(person['name'])
        dialog.locator('input[value=delete]').check()
        expect(dialog).to_contain_text('Classificações da própria pessoa')
        confirm(dialog)
        confirmation = dialog.get_by_label('Para confirmar, digite:', exact=False)
        confirmation.fill('nome incorreto')
        button = dialog.get_by_role('button', name='Excluir definitivamente', exact=True)
        expect(button).to_be_disabled()
        confirmation.fill(person['name'])
        expect(button).to_be_enabled()
        page.screenshot(path=str(OUT / '02-confirmacao-exclusao-mobile.png'))
        button.click()
        expect(page.get_by_role('dialog')).to_have_count(0)
        expect(row(person['name'])).to_have_count(0)
        response = client.get(base + '/persons?archived=all&q=' + person['name'], headers=headers)
        assert response.status_code == 200 and response.json()['total'] == 0
        record('Exclusão definitiva exige nome exato, confirmação e motivo; cadastro sem vínculos é removido')

        navigate('Alunos')
        dialog = open_manage(student['person']['name'])
        expect(dialog).to_contain_text('Matrículas em aberto')
        expect(dialog.get_by_role('button', name='Arquivar cadastro', exact=True)).to_be_disabled()
        dialog.locator('input[value=delete]').check()
        expect(dialog.locator('.lifecycle-impact')).to_contain_text('Matrículas')
        expect(dialog.get_by_role('button', name='Excluir definitivamente', exact=True)).to_be_disabled()
        page.screenshot(path=str(OUT / '03-historico-protegido-mobile.png'))
        dialog.get_by_role('button', name='Cancelar', exact=True).click()
        response = client.get(base + '/enrollments/' + enrollment['id'], headers=headers)
        assert response.status_code == 200 and response.json()['id'] == enrollment['id']
        record('Prévia identifica matrícula em aberto, bloqueia exclusão/arquivamento e preserva o histórico')
        assert not errors, errors
        browser.close()
    (OUT / 'results.json').write_text(json.dumps({'status': 'passed', 'checks': checks, 'errors': errors,
        'mode': 'http_e2e', 'database': 'SQLite descartável', 'remote_providers': False}, ensure_ascii=False, indent=2))
except Exception:
    (OUT / 'results.json').write_text(json.dumps({'status': 'failed', 'checks': checks, 'errors': errors}, ensure_ascii=False, indent=2))
    try:
        page.screenshot(path=str(OUT / 'failure.png'), full_page=True)
    except Exception:
        pass
    raise
finally:
    proc.terminate()
    proc.wait(timeout=10)
    log.close()
    shutil.rmtree(TEMP, ignore_errors=True)
