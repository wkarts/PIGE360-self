#!/usr/bin/env python3
"""Importação seletiva e relatórios em navegador real, somente dados sintéticos."""
import io
import json
import os
import shutil
import socket
import sqlite3
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import httpx
from playwright.sync_api import sync_playwright, expect
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.getenv('PIGE_EVIDENCE_DIR', str(ROOT/'evidence/0.10.0/management')))
OUT.mkdir(parents=True, exist_ok=True)
TEMP = Path(tempfile.mkdtemp(prefix='pige-management-'))
with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0))
    port = sock.getsockname()[1]
URL = f'http://127.0.0.1:{port}'
PASSWORD = 'Synthetic-Management-Password-2026!'
env = {**os.environ, 'PYTHONPATH':str(ROOT/'backend'), 'DATABASE_URL':'sqlite:///'+str(TEMP/'app.db'),
       'ALLOW_SQLITE':'true', 'APP_ENV':'test', 'APP_URL':URL, 'ALLOWED_HOSTS':'127.0.0.1,localhost',
       'APP_SECRET_KEY':'test-only-management-key-01234567890123456789',
       'SETUP_TOKEN':'test-only-setup-01234567890123456789', 'STORAGE_PATH':str(TEMP/'files'),
       'FRONTEND_PATH':str(TEMP/'frontend'), 'COOKIE_SECURE':'false'}
shutil.copytree(ROOT/'frontend/dist', TEMP/'frontend')
subprocess.run([sys.executable,'-m','alembic','upgrade','head'],cwd=ROOT/'backend',env=env,check=True)
legacy = TEMP/'legacy.sqlite'
with sqlite3.connect(legacy) as db:
    db.executescript('''CREATE TABLE alunos(id TEXT,nome TEXT,data_nascimento TEXT,ativo INTEGER);
        INSERT INTO alunos VALUES('1','Aluno Selecionado','2015-02-10',1),('2','Aluno Excluído','2016-01-01',1);
        CREATE TABLE responsaveis(id TEXT,nome TEXT,ativo INTEGER);
        INSERT INTO responsaveis VALUES('1','Responsável Não Selecionado',1);
        CREATE TABLE unidades_escolares(id TEXT,nome TEXT,ativo INTEGER);
        INSERT INTO unidades_escolares VALUES('1','Unidade Legada Não Selecionada',1);''')
log=(OUT/'server.log').open('w')
proc=subprocess.Popen([sys.executable,'-m','uvicorn','app.main:app','--host','127.0.0.1','--port',str(port)],cwd=ROOT/'backend',env=env,stdout=log,stderr=log)
checks=[]
try:
    with httpx.Client(base_url=URL,timeout=30) as client:
        for _ in range(80):
            try:
                if client.get('/health/ready').status_code==200:break
            except httpx.HTTPError:pass
            time.sleep(.1)
        response=client.post('/api/v1/setup',headers={'X-Setup-Token':env['SETUP_TOKEN']},json={
            'admin_name':'Secretaria Sintética','admin_email':'management@example.com','admin_password':PASSWORD,
            'company_name':'Mantenedora Sintética','school_name':'Escola Horizonte','academic_year':2026})
        assert response.status_code==201,response.text
        login=client.post('/api/v1/auth/login',json={'email':'management@example.com','password':PASSWORD}).json()
        headers={'Authorization':'Bearer '+login['access_token']}
        schools=client.get('/api/v1/schools',headers=headers).json()
        school=schools[0];base='/api/v1/schools/'+school['id']
        units=client.get(base+'/units',headers=headers).json()
        with sync_playwright() as pw:
            binary=os.getenv('CHROMIUM_PATH') or shutil.which('chromium')
            browser=pw.chromium.launch(headless=True,**({'executable_path':binary} if binary else {}),args=['--no-sandbox'])
            context=browser.new_context(viewport={'width':1440,'height':1000},locale='pt-BR',accept_downloads=True)
            page=context.new_page();page.set_default_timeout(10000)
            errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
            page.goto(URL)
            page.get_by_label('E-mail',exact=True).fill('management@example.com')
            page.get_by_label('Senha',exact=True).fill(PASSWORD)
            page.get_by_role('button',name='Entrar na aplicação').click()
            expect(page.locator('h1')).to_have_text('Visão geral')
            page.locator('aside').get_by_role('link',name='Portabilidade de dados',exact=True).click()
            page.locator('.import-workspace input[type=file]').first.set_input_files(legacy)
            page.get_by_role('button',name='Analisar arquivo',exact=True).click()
            expect(page.get_by_role('heading',name='O que deseja importar?')).to_be_visible()
            category=page.locator('.import-category').filter(has=page.get_by_text('Alunos',exact=True))
            category.locator('input[type=checkbox]').check()
            category.get_by_role('button',name='Escolher registros').click()
            page.locator('.import-record-list label').filter(has_text='Aluno Selecionado').locator('input').check()
            page.get_by_role('button',name='Concluir seleção').click()
            page.get_by_role('button',name='Conferir seleção').click()
            expect(page.get_by_role('heading',name='Confira antes de importar')).to_be_visible()
            expect(page.locator('.import-workspace').get_by_text('1 registro(s)',exact=True)).to_be_visible()
            page.screenshot(path=str(OUT/'01-importacao-seletiva.png'),full_page=True)
            page.get_by_label('Digite IMPORTAR para confirmar').fill('IMPORTAR')
            page.get_by_role('button',name='Confirmar importação',exact=True).click()
            expect(page.get_by_text('Importação concluída em Escola Horizonte.',exact=False)).to_be_visible()
            assert len(client.get('/api/v1/schools',headers=headers).json())==len(schools)
            assert len(client.get(base+'/units',headers=headers).json())==len(units)
            students=client.get(base+'/students',headers=headers).json()
            assert students['total']==1 and students['items'][0]['person']['name']=='Aluno Selecionado'
            assert client.get(base+'/persons?guardians_only=true',headers=headers).json()['total']==0
            checks.append('Importa somente o aluno escolhido, sem responsáveis, instituição ou unidade extra.')
            page.locator('aside').get_by_role('link',name='Relatórios',exact=True).click()
            page.get_by_label('Relatório',exact=True).select_option('students')
            page.get_by_label('Período',exact=True).select_option('month')
            page.get_by_role('button',name='Gerar relatório',exact=True).click()
            expect(page.locator('.report-result').get_by_text('Aluno Selecionado',exact=True)).to_be_visible()
            page.screenshot(path=str(OUT/'02-relatorios-desktop.png'),full_page=True)
            with page.expect_download() as download:
                page.get_by_role('button',name='Baixar PDF',exact=True).click()
            pdf=Path(download.value.path()).read_bytes()
            text='\n'.join(p.extract_text() for p in PdfReader(io.BytesIO(pdf)).pages)
            assert 'Escola Horizonte' in text and 'Aluno Selecionado' in text
            assert 'Aluno Excluído' not in text
            (OUT/'relatorio-alunos-sintetico.pdf').write_bytes(pdf)
            with page.expect_download() as download:
                page.get_by_role('button',name='Exportar CSV',exact=True).click()
            csv=Path(download.value.path()).read_text(encoding='utf-8-sig')
            assert 'Aluno Selecionado' in csv and 'Aluno Excluído' not in csv
            checks.append('Relatório mensal consultado e exportado em PDF/CSV, com a escola e o recorte corretos.')
            page.set_viewport_size({'width':390,'height':844})
            page.screenshot(path=str(OUT/'03-relatorios-mobile.png'),full_page=True)
            assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1')
            checks.append('Central de relatórios utilizável em 390px, sem transbordamento horizontal da página.')
            assert not errors,errors
            browser.close()
    (OUT/'result.json').write_text(json.dumps({'status':'passed','checks':checks,'page_errors':errors},ensure_ascii=False,indent=2))
    print(json.dumps({'status':'passed','checks':checks,'evidence':str(OUT)},ensure_ascii=False))
finally:
    proc.terminate()
    try:proc.wait(timeout=10)
    except subprocess.TimeoutExpired:proc.kill();proc.wait()
    log.close()
    shutil.rmtree(TEMP,ignore_errors=True)
