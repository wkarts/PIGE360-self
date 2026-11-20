#!/usr/bin/env python3
"""Exercita a combinação de Diário, catálogo e Educacenso em serviços descartáveis."""
import json
import os
from contextlib import contextmanager
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import tempfile
import time

import httpx
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
               'CRM_BRIDGE_ENABLED':'false','EDUCACENSO_TRAINING_SCHOOLS':'[]','DIARY_CATALOG_SCHOOLS':'[]'}
        subprocess.run([sys.executable, '-m', 'alembic', 'upgrade', 'head'], cwd=ROOT/'backend', env=env, check=True)
        with server(env, port) as http:
            setup = {'admin_name':'Operadora de teste', 'admin_email':'operadora@example.com',
                     'admin_password':password, 'company_name':'Mantenedora fictícia',
                     'school_name':'Escola de treinamento', 'academic_year':2026}
            http.post('/api/v1/setup', headers={'X-Setup-Token':env['SETUP_TOKEN']}, json=setup).raise_for_status()
            token = http.post('/api/v1/auth/login', json={'email':setup['admin_email'], 'password':password}).json()['access_token']
            school = http.get('/api/v1/schools', headers={'Authorization':'Bearer '+token}).json()[0]
            assert not school['educacenso_training'] and not school['diary_catalog']
            sid = school['id']
        env.update(EDUCACENSO_TRAINING_SCHOOLS=json.dumps([sid]), DIARY_CATALOG_SCHOOLS=json.dumps([sid]))
        with server(env, port), sync_playwright() as pw:
            executable = os.getenv('CHROMIUM_PATH') or shutil.which('chromium') or pw.chromium.executable_path
            browser = pw.chromium.launch(executable_path=executable, args=['--no-sandbox'])
            page = browser.new_page(viewport={'width':1280,'height':900})
            errors = []
            page.on('pageerror', lambda exc: errors.append(str(exc)))
            page.on('dialog', lambda dialog: dialog.accept())
            page.goto(f'{url}/?diarioPiloto={sid}&guia=catalog#/diary')
            page.get_by_label('E-mail', exact=True).fill(setup['admin_email'])
            page.get_by_label('Senha', exact=True).fill(password)
            page.get_by_role('button', name='Entrar na aplicação').click()
            catalog = page.locator('.diary-workspace')
            catalog.get_by_label('Nome sugerido').fill('Oficina sintética')
            catalog.get_by_role('button', name='Guardar sugestão').click()
            expect(catalog.get_by_text('Rascunho aguardando decisão.')).to_be_visible()
            catalog.get_by_label('Justificativa da decisão').fill('Aprovada para a turma de teste')
            catalog.get_by_role('button', name='Publicar componente').click()
            expect(catalog.get_by_role('status')).to_have_text('Decisão registrada no histórico do componente.')
            catalog.get_by_label('Componente para conferência').select_option(label='Oficina sintética')
            catalog.get_by_label('Justificativa da decisão').fill('Retirada ao encerrar o piloto')
            catalog.get_by_role('button', name='Desativar componente').click()
            expect(catalog.get_by_label('Componente para conferência')).to_have_value('')
            page.get_by_role('link', name='Educacenso', exact=True).click()
            census = page.get_by_role('region', name='Educacenso em treinamento')
            census.get_by_label('Data de referência').fill('2026-06-01')
            census.get_by_role('button', name='Validar prévia').click()
            expect(census.get_by_text('Nenhuma matrícula na seleção.')).to_be_visible()
            census.get_by_role('button', name='Guardar rascunho').click()
            census.locator('input[type=file]').set_input_files(
                {'name':'retorno.txt','mimeType':'text/plain','buffer':b'retorno sintetico sem parser'})
            census.get_by_role('button', name='Anexar evidência').click()
            with page.expect_download() as download:
                census.get_by_role('button', name='Baixar evidência').click()
            assert Path(download.value.path()).read_bytes() == b'retorno sintetico sem parser'
            census.get_by_role('button', name='Histórico').click()
            census.get_by_role('button', name='Matrícula Inicial', exact=False).click()
            expect(census.get_by_role('heading', name='Rascunho de treinamento')).to_be_visible()
            assert not errors, errors
            browser.close()
        print('PASS: catálogo, prévia por arquivo, rascunho persistido, histórico e download íntegro em Chromium.')


if __name__ == '__main__':
    main()
