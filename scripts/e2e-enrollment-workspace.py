#!/usr/bin/env python3
"""Matrícula, PDF e administração em HTTP real, com SQLite e pessoas sintéticas."""
import io
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
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.getenv('PIGE_EVIDENCE_DIR', str(ROOT/'evidence/0.10.0/enrollment-workspace')))
OUT.mkdir(parents=True, exist_ok=True)
TEMP = Path(tempfile.mkdtemp(prefix='pige-enrollment-workspace-'))
with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0))
    port = sock.getsockname()[1]
URL = f'http://127.0.0.1:{port}'
PASSWORD = 'Synthetic-Enrollment-Password-2026!'
env = {**os.environ, 'PYTHONPATH': str(ROOT/'backend'),
       'DATABASE_URL': 'sqlite:///'+str(TEMP/'app.db'), 'ALLOW_SQLITE': 'true',
       'APP_ENV': 'test', 'APP_URL': URL, 'ALLOWED_HOSTS': '127.0.0.1,localhost',
       'APP_SECRET_KEY': 'test-only-enrollment-01234567890123456789',
       'SETUP_TOKEN': 'test-only-setup-01234567890123456789',
       'STORAGE_PATH': str(TEMP/'files'), 'FRONTEND_PATH': str(TEMP/'frontend'),
       'COOKIE_SECURE': 'false'}
shutil.copytree(ROOT/'frontend/dist', TEMP/'frontend')
build_info = json.loads((TEMP/'frontend/build-info.json').read_text())
subprocess.run([sys.executable, '-m', 'alembic', 'upgrade', 'head'],
               cwd=ROOT/'backend', env=env, check=True)
log = (OUT/'server.log').open('w')
proc = subprocess.Popen([sys.executable, '-m', 'uvicorn', 'app.main:app',
                         '--host', '127.0.0.1', '--port', str(port)],
                        cwd=ROOT/'backend', env=env, stdout=log, stderr=log)
checks, errors, failures = [], [], []
try:
    with httpx.Client(base_url=URL, timeout=30) as client:
        for _ in range(80):
            try:
                if client.get('/health/ready').status_code == 200:
                    break
            except httpx.HTTPError:
                pass
            time.sleep(.1)
        setup = client.post('/api/v1/setup', headers={'X-Setup-Token': env['SETUP_TOKEN']}, json={
            'admin_name': 'Secretaria Sintética', 'admin_email': 'enrollment@example.com',
            'admin_password': PASSWORD, 'company_name': 'Mantenedora Sintética',
            'school_name': 'Escola Horizonte', 'academic_year': 2026})
        assert setup.status_code == 201, setup.text
        token = client.post('/api/v1/auth/login', json={
            'email': 'enrollment@example.com', 'password': PASSWORD}).json()['access_token']
        headers = {'Authorization': 'Bearer '+token}
        school = client.get('/api/v1/schools', headers=headers).json()[0]
        base = '/api/v1/schools/'+school['id']

        def post(path, data):
            response = client.post(base+path, headers=headers, json=data)
            assert response.status_code == 201, response.text
            return response.json()

        year = client.get(base+'/academic-years', headers=headers).json()[0]
        next_year = post('/academic-years', {'name': '2027', 'starts_on': '2027-01-01', 'ends_on': '2027-12-31'})
        unit = post('/units', {'name': 'Unidade Centro'})
        other_unit = post('/units', {'name': 'Unidade Jardim'})
        grade = post('/grades', {'name': '5º ano — Ensino Fundamental'})
        other_grade = post('/grades', {'name': '6º ano — Ensino Fundamental'})
        shift = post('/shifts', {'name': 'Matutino'})
        other_shift = post('/shifts', {'name': 'Vespertino'})
        group = post('/class-groups', {'name': '5º A — Centro 2026', 'academic_year_id': year['id'],
            'unit_id': unit['id'], 'grade_id': grade['id'], 'shift_id': shift['id'], 'capacity': 28})
        post('/class-groups', {'name': '6º B — Jardim 2026', 'academic_year_id': year['id'],
            'unit_id': other_unit['id'], 'grade_id': other_grade['id'], 'shift_id': other_shift['id'], 'capacity': 25})
        post('/class-groups', {'name': '5º C — Centro 2027', 'academic_year_id': next_year['id'],
            'unit_id': unit['id'], 'grade_id': grade['id'], 'shift_id': shift['id'], 'capacity': 26})
        post('/class-groups', {'name': '6º D — Jardim 2027', 'academic_year_id': next_year['id'],
            'unit_id': other_unit['id'], 'grade_id': other_grade['id'], 'shift_id': other_shift['id'], 'capacity': 24})
        student = post('/students', {'person': {'name': 'Marina Alves — Aluna Sintética', 'birth_date': '2015-04-01'}})
        post('/students', {'person': {'name': 'Gabriel Ferreira — Aluno Sintético', 'birth_date': '2014-08-15'}})
        guardian = post('/persons', {'name': 'Helena Alves — Responsável Sintética', 'is_guardian': True})
        post('/students/'+student['id']+'/guardians', {'person_id': guardian['id'], 'legal': True, 'financial': True})

        with sync_playwright() as pw:
            binary = os.getenv('CHROMIUM_PATH') or (None if Path(pw.chromium.executable_path).exists() else shutil.which('chromium'))
            browser = pw.chromium.launch(headless=True, **({'executable_path': binary} if binary else {}), args=['--no-sandbox'])
            context = browser.new_context(viewport={'width': 1440, 'height': 1000}, locale='pt-BR', accept_downloads=True)
            page = context.new_page()
            page.set_default_timeout(10000)
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.on('response', lambda response: failures.append({'url': response.url, 'status': response.status})
                    if '/api/v1/' in response.url and response.status >= 500 else None)

            def nav(name):
                opener = page.get_by_role('button', name='Abrir menu', exact=True)
                if opener.is_visible():
                    opener.click()
                page.locator('.sidebar').get_by_role('link', name=name, exact=True).click()
                expect(page.locator('h1')).to_have_text(name)

            def no_overflow():
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')

            def safe_modal():
                # VisualViewport geometry is synchronized on resize/animation frames.
                page.wait_for_function('''() => {
                    const r=document.querySelector('#main-dialog').getBoundingClientRect();
                    return r.top>=-1 && r.bottom<=innerHeight+1 && r.left>=-1 && r.right<=innerWidth+1;
                }''', timeout=3000)
                no_overflow()
                bounds = page.locator('#main-dialog').evaluate('''el => {
                    const r=el.getBoundingClientRect();
                    return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:innerWidth,height:innerHeight};
                }''')
                assert bounds['top'] >= -1 and bounds['bottom'] <= bounds['height']+1, bounds
                assert bounds['left'] >= -1 and bounds['right'] <= bounds['width']+1, bounds
                footer = page.locator('#main-dialog .modal-footer')
                expect(footer.get_by_role('button', name='Salvar', exact=True)).to_be_in_viewport(ratio=1)
                expect(page.get_by_role('button', name='Fechar janela')).to_be_in_viewport(ratio=1)

            try:
                page.goto(URL)
                page.get_by_label('E-mail', exact=True).fill('enrollment@example.com')
                page.get_by_label('Senha', exact=True).fill(PASSWORD)
                page.get_by_role('button', name='Entrar na aplicação').click()
                expect(page.locator('h1')).to_have_text('Visão geral')
                nav('Matrículas')
                page.get_by_role('button', name='+ Nova matrícula', exact=True).click()
                dialog = page.locator('#main-dialog')
                expect(dialog).to_have_class('modal modal-enrollment')
                expect(dialog.get_by_label('Turma de destino').locator('option')).to_have_count(5)
                assert dialog.bounding_box()['width'] >= 1100
                expect(dialog.locator('.form-section')).to_have_count(3)
                expect(dialog.get_by_role('navigation', name='Seções do cadastro')).to_have_count(0)
                dialog.get_by_role('button', name='Salvar', exact=True).click()
                expect(dialog.get_by_role('alert')).to_contain_text('Revise o campo: Aluno')
                expect(dialog.get_by_label('Aluno', exact=True)).to_be_focused()
                checks.append('Modal amplo no desktop com três seções visíveis e validação do aluno antes de enviar.')
                dialog.get_by_role('button', name='Fechar janela').click()
                expect(dialog).to_have_count(0)
                page.get_by_role('button', name='+ Nova matrícula', exact=True).click()

                dialog.get_by_label('Filtrar alunos', exact=True).fill('Marina')
                expect(dialog.get_by_label('Aluno', exact=True).locator('option')).to_have_count(2)
                dialog.get_by_label('Aluno', exact=True).select_option(student['id'])
                dialog.get_by_label('Filtrar pessoas', exact=True).fill('Helena')
                expect(dialog.get_by_label('Responsável financeiro', exact=True).locator('option')).to_have_count(2)
                dialog.get_by_label('Responsável financeiro', exact=True).select_option(guardian['id'])
                dialog.get_by_label('Turma de destino').select_option(group['id'])
                dialog.get_by_label('Data da matrícula').fill('2026-09-15')
                dialog.get_by_label('Escola de origem', exact=True).fill('Escola de origem sintética')
                dialog.get_by_label('Cidade de origem', exact=True).fill('Salvador')
                dialog.get_by_label('Observações', exact=True).fill('Dados sintéticos para conferir o fluxo de matrícula.')
                review = dialog.get_by_role('complementary', name='Resumo da matrícula')
                expect(review).to_contain_text(student['person']['name'])
                expect(review).to_contain_text(guardian['name'])
                expect(review).to_contain_text(group['name'])
                expect(review).to_contain_text('28')
                expect(review).to_contain_text('O rascunho não reserva vaga.')
                dialog.locator('.modal-body').evaluate('el => el.scrollTop=0')
                safe_modal()
                page.screenshot(path=str(OUT/'01-matricula-desktop-1440.png'))
                checks.append('Busca real de aluno e responsável; resumo mostra turma, ano, unidade e capacidade sem reservar vaga.')

                for width, height in [(390, 844), (320, 640), (390, 400)]:
                    page.set_viewport_size({'width': width, 'height': height})
                    dialog.locator('.enrollment-workspace').evaluate('el => el.scrollTop=0')
                    safe_modal()
                    flow = dialog.evaluate('''el => ({
                        fieldsBottom:el.querySelector('.form-section:last-child').getBoundingClientRect().bottom,
                        reviewTop:el.querySelector('.enrollment-review').getBoundingClientRect().top
                    })''')
                    assert flow['reviewTop'] >= flow['fieldsBottom']-1, flow
                    controls = dialog.locator('input:not([type=checkbox]),select,textarea').evaluate_all('''items => items.map(el => ({
                        id:el.id, height:el.getBoundingClientRect().height, font:parseFloat(getComputedStyle(el).fontSize)
                    }))''')
                    assert all(item['height'] >= 44 and item['font'] >= 16 for item in controls), controls
                    page.screenshot(path=str(OUT/f'02-matricula-{width}x{height}.png'))
                    dialog.get_by_label('Filtrar alunos', exact=True).focus()
                    dialog.get_by_label('Observações', exact=True).focus()
                    expect(dialog.get_by_label('Observações', exact=True)).to_be_in_viewport(ratio=1)
                    safe_modal()
                    review.get_by_text('28', exact=True).scroll_into_view_if_needed()
                    expect(review.get_by_text('28', exact=True)).to_be_in_viewport(ratio=1)
                    safe_modal()
                checks.append('320px, 390px e janela de 400px: sem overflow, campos de 16px/44px, rodapé acessível e resumo alcançável por rolagem.')

                # Missing required class must focus the visible field even in a short viewport.
                dialog.get_by_label('Turma de destino').select_option('')
                dialog.get_by_role('button', name='Salvar', exact=True).click()
                expect(dialog.get_by_label('Turma de destino')).to_be_focused()
                expect(dialog.get_by_label('Turma de destino')).to_be_in_viewport(ratio=1)
                expect(dialog.get_by_role('alert')).to_contain_text('Turma de destino')
                safe_modal()
                page.screenshot(path=str(OUT/'03-validacao-390x400.png'))
                dialog.get_by_label('Turma de destino').select_option(group['id'])
                dialog.get_by_role('button', name='Salvar', exact=True).click()
                expect(dialog).to_have_count(0)
                rows = client.get(base+'/enrollments', headers=headers).json()['items']
                assert len(rows) == 1 and rows[0]['status'] == 'draft', rows
                record = client.get(base+'/enrollments/'+rows[0]['id'], headers=headers).json()
                assert record['student_id'] == student['id'] and record['class_group_id'] == group['id']
                assert record['financial_person_id'] == guardian['id'] and record['enrolled_on'] == '2026-09-15'
                groups = client.get(base+'/class-groups', headers=headers).json()
                assert next(row for row in groups if row['id'] == group['id'])['occupied'] == 0
                checks.append('Erro de turma foca campo em janela baixa; salvar persiste rascunho com aluno/responsável/data e não consome vaga.')

                page.set_viewport_size({'width': 1440, 'height': 1000})
                page.get_by_role('button', name='Detalhes →', exact=True).click()
                page.get_by_role('button', name='Ficha de matrícula PDF', exact=True).click()
                expect(page.get_by_role('combobox', name='Documento', exact=False)).to_have_value('enrollment_form')
                with page.expect_download() as download:
                    page.get_by_role('button', name='Gerar e baixar PDF', exact=True).click()
                pdf = Path(download.value.path()).read_bytes()
                text = '\n'.join(item.extract_text() for item in PdfReader(io.BytesIO(pdf)).pages)
                assert 'Ficha de matrícula' in text and student['person']['name'] in text, text
                assert guardian['name'] in text and group['name'] in text, text
                (OUT/'ficha-matricula-sintetica.pdf').write_bytes(pdf)
                expect(page.locator('#main-dialog')).to_have_count(0)
                expect(page.locator('.app-root')).to_have_attribute('aria-busy', 'false')
                checks.append('Ficha de matrícula PDF gerada pelo fluxo real contém aluno, responsável e turma do rascunho salvo.')

                nav('Instituição')
                tabs = page.get_by_role('navigation', name='Configurações da instituição')
                for tab, heading in [('Dados da escola', 'Dados da escola'),
                                     ('Identidade visual', 'A identidade da sua escola'),
                                     ('Segurança', 'Proteção das contas'), ('Atendimento', 'Atendimento pelo site')]:
                    tabs.get_by_role('button', name=tab, exact=True).click()
                    expect(tabs.get_by_role('button', name=tab, exact=True)).to_have_attribute('aria-pressed', 'true')
                    expect(page.get_by_role('heading', name=heading, exact=True)).to_be_visible()
                tabs.get_by_role('button', name='Dados da escola', exact=True).click()
                page.screenshot(path=str(OUT/'04-instituicao-desktop.png'), full_page=True)
                for width in [390, 320]:
                    page.set_viewport_size({'width': width, 'height': 844})
                    no_overflow()
                    page.screenshot(path=str(OUT/f'05-instituicao-{width}.png'), full_page=True)
                    for button in tabs.get_by_role('button').all():
                        assert button.bounding_box()['height'] >= 44
                checks.append('Abas Dados, Identidade, Segurança e Atendimento alternam conteúdo; instituição responsiva em 1440/390/320px.')

                page.set_viewport_size({'width': 1440, 'height': 1000})
                nav('Estrutura acadêmica')
                page.get_by_role('navigation', name='Organização acadêmica').get_by_role('button', name='Turmas', exact=True).click()
                filters = page.locator('.academic-filters')
                rows_ui = page.locator('.record-list tbody tr')
                expect(rows_ui).to_have_count(4)
                filters.get_by_role('combobox', name='Ano letivo', exact=False).select_option(year['id'])
                expect(rows_ui).to_have_count(2)
                filters.get_by_role('combobox', name='Unidade', exact=False).select_option(unit['id'])
                expect(rows_ui).to_have_count(1)
                expect(rows_ui).to_contain_text(group['name'])
                filters.get_by_label('Buscar turmas', exact=True).fill('inexistente')
                expect(rows_ui).to_have_count(0)
                expect(page.get_by_role('heading', name='Nenhum registro encontrado')).to_be_visible()
                filters.get_by_label('Buscar turmas', exact=True).fill('5º')
                expect(rows_ui).to_have_count(1)
                filters.get_by_role('combobox', name='Ano letivo', exact=False).select_option(next_year['id'])
                expect(rows_ui).to_have_count(1)
                expect(rows_ui).to_contain_text('5º C — Centro 2027')
                filters.get_by_label('Buscar turmas', exact=True).fill('')
                filters.get_by_role('combobox', name='Unidade', exact=False).select_option(other_unit['id'])
                expect(rows_ui).to_have_count(1)
                expect(rows_ui).to_contain_text('6º D — Jardim 2027')
                filters.get_by_role('combobox', name='Série', exact=False).select_option(grade['id'])
                expect(rows_ui).to_have_count(0)
                filters.get_by_role('combobox', name='Série', exact=False).select_option(other_grade['id'])
                filters.get_by_role('combobox', name='Turno', exact=False).select_option(shift['id'])
                expect(rows_ui).to_have_count(0)
                filters.get_by_role('combobox', name='Turno', exact=False).select_option(other_shift['id'])
                expect(rows_ui).to_have_count(1)
                page.screenshot(path=str(OUT/'06-estrutura-desktop.png'), full_page=True)
                for width in [390, 320]:
                    page.set_viewport_size({'width': width, 'height': 844})
                    no_overflow()
                    assert filters.locator('input,select').evaluate_all('items=>items.every(el=>parseFloat(getComputedStyle(el).fontSize)>=16 && el.getBoundingClientRect().height>=44)')
                    page.screenshot(path=str(OUT/f'07-estrutura-{width}.png'), full_page=True)
                checks.append('Filtros de turmas combinam ano/unidade/série/turno/busca, incluindo vazio, e mantêm controles móveis de 44px/16px.')
                assert not errors, errors
                assert not failures, failures
            except Exception:
                page.screenshot(path=str(OUT/'failure.png'), full_page=True)
                raise
            finally:
                browser.close()
    result = {'status': 'passed', 'checks': checks, 'page_errors': errors, 'http_failures': failures, 'build_info': build_info,
              'mode': 'http_e2e', 'database': 'disposable_sqlite', 'remote_requests_executed': False,
              'viewport_note': 'Dimensões de janela verificadas; teclado físico de iOS não foi testado.'}
    (OUT/'result.json').write_text(json.dumps(result, ensure_ascii=False, indent=2))
    (OUT/'failure.png').unlink(missing_ok=True)
    print(json.dumps(result, ensure_ascii=False))
except Exception:
    (OUT/'result.json').write_text(json.dumps({'status': 'failed', 'checks': checks, 'build_info': build_info,
                                             'page_errors': errors, 'http_failures': failures}, ensure_ascii=False, indent=2))
    raise
finally:
    proc.terminate()
    try:
        proc.wait(timeout=10)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.wait()
    log.close()
    shutil.rmtree(TEMP, ignore_errors=True)
