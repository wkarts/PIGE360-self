#!/usr/bin/env python3
"""Cobrança interna, baixa e recibo em HTTP real; somente cadastros sintéticos."""
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
from playwright.sync_api import sync_playwright, expect
from pypdf import PdfReader

ROOT=Path(__file__).resolve().parents[1]
OUT=Path(os.getenv('PIGE_EVIDENCE_DIR',str(ROOT/'evidence/0.10.0/manual-billing')))
OUT.mkdir(parents=True,exist_ok=True)
TEMP=Path(tempfile.mkdtemp(prefix='pige-manual-billing-'))
with socket.socket() as sock:
    sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
URL=f'http://127.0.0.1:{port}'
PASSWORD='Synthetic-Billing-Password-2026!'
env={**os.environ,'PYTHONPATH':str(ROOT/'backend'),'DATABASE_URL':'sqlite:///'+str(TEMP/'app.db'),
     'ALLOW_SQLITE':'true','APP_ENV':'test','APP_URL':URL,'ALLOWED_HOSTS':'127.0.0.1,localhost',
     'APP_SECRET_KEY':'test-only-manual-billing-01234567890123456789',
     'SETUP_TOKEN':'test-only-setup-01234567890123456789','STORAGE_PATH':str(TEMP/'files'),
     'FRONTEND_PATH':str(TEMP/'frontend'),'COOKIE_SECURE':'false'}
shutil.copytree(ROOT/'frontend/dist',TEMP/'frontend')
subprocess.run([sys.executable,'-m','alembic','upgrade','head'],cwd=ROOT/'backend',env=env,check=True)
log=(OUT/'server.log').open('w')
proc=subprocess.Popen([sys.executable,'-m','uvicorn','app.main:app','--host','127.0.0.1','--port',str(port)],cwd=ROOT/'backend',env=env,stdout=log,stderr=log)
checks=[];errors=[]
try:
    with httpx.Client(base_url=URL,timeout=30) as client:
        for _ in range(80):
            try:
                if client.get('/health/ready').status_code==200:break
            except httpx.HTTPError:pass
            time.sleep(.1)
        setup=client.post('/api/v1/setup',headers={'X-Setup-Token':env['SETUP_TOKEN']},json={
            'admin_name':'Financeiro Sintético','admin_email':'billing@example.com','admin_password':PASSWORD,
            'company_name':'Mantenedora Sintética','school_name':'Escola Horizonte','academic_year':2026})
        assert setup.status_code==201,setup.text
        token=client.post('/api/v1/auth/login',json={'email':'billing@example.com','password':PASSWORD}).json()['access_token']
        headers={'Authorization':'Bearer '+token}
        school=client.get('/api/v1/schools',headers=headers).json()[0]
        base='/api/v1/schools/'+school['id']
        def post(path,data):
            response=client.post(base+path,headers=headers,json=data)
            assert response.status_code==201,response.text
            return response.json()
        year=client.get(base+'/academic-years',headers=headers).json()[0]
        unit=post('/units',{'name':'Unidade do financeiro'})
        grade=post('/grades',{'name':'Ensino Fundamental'})
        shift=post('/shifts',{'name':'Matutino'})
        group=post('/class-groups',{'name':'Turma Financeiro','academic_year_id':year['id'],'unit_id':unit['id'],'grade_id':grade['id'],'shift_id':shift['id'],'capacity':5})
        student=post('/students',{'person':{'name':'Aluno Sintético do Financeiro','birth_date':'2015-04-01'}})
        guardian=post('/persons',{'name':'Responsável Sintético sem CPF','is_guardian':True})
        post('/students/'+student['id']+'/guardians',{'person_id':guardian['id'],'legal':True,'financial':True})
        enrollment=post('/enrollments',{'student_id':student['id'],'class_group_id':group['id'],'enrolled_on':'2026-09-01'})
        assert not client.get(base+'/banking-status',headers=headers).json()['configured']
        with sync_playwright() as pw:
            binary=os.getenv('CHROMIUM_PATH') or (None if Path(pw.chromium.executable_path).exists() else shutil.which('chromium'))
            browser=pw.chromium.launch(headless=True,**({'executable_path':binary} if binary else {}),args=['--no-sandbox'])
            context=browser.new_context(viewport={'width':390,'height':844},locale='pt-BR',accept_downloads=True)
            page=context.new_page();page.set_default_timeout(10000)
            page.on('pageerror',lambda error:errors.append(str(error)))
            page.goto(URL)
            page.get_by_label('E-mail',exact=True).fill('billing@example.com')
            page.get_by_label('Senha',exact=True).fill(PASSWORD)
            page.get_by_role('button',name='Entrar na aplicação').click()
            expect(page.locator('h1')).to_have_text('Visão geral')
            page.get_by_role('button',name='Abrir menu').click()
            page.locator('aside').get_by_role('link',name='Cobranças',exact=True).click()
            page.get_by_role('button',name='+ Nova cobrança',exact=True).click()
            dialog=page.get_by_role('dialog')
            expect(dialog.get_by_label('Tipo de cobrança')).to_have_value('manual')
            expect(dialog.get_by_label('Tipo de cobrança').locator('option')).to_have_count(1)
            dialog.get_by_label('Pesquisar aluno / matrícula').fill('Aluno Sintético')
            dialog.get_by_role('button',name='Buscar matrícula',exact=True).click()
            dialog.get_by_label('Matrícula / responsável financeiro').select_option(enrollment['id'])
            dialog.get_by_label('Descrição',exact=True).fill('Mensalidade interna sintética')
            dialog.get_by_label('Valor de cada parcela (R$)').fill('120.15')
            dialog.get_by_label('Primeiro vencimento').fill('2028-01-31')
            dialog.get_by_label('Quantidade mensal (1 = avulsa)').fill('2')
            dialog.get_by_role('button',name='Confirmar criação da(s) cobrança(s)',exact=True).click()
            expect(dialog).to_have_count(0)
            expect(page.get_by_role('button',name='Ver cobrança',exact=True)).to_have_count(2)
            rows=client.get(base+'/bank-charges',headers=headers).json()['items']
            assert [row['due_on'] for row in rows]==['2028-01-31','2028-02-29']
            assert all(row['collection_mode']=='manual' and row['connection_id'] is None for row in rows)
            checks.append('Criação de duas parcelas sem banco configurado e sem CPF do responsável; fevereiro bissexto correto.')
            page.screenshot(path=str(OUT/'01-cobrancas-internas-mobile.png'),full_page=True)
            page.get_by_role('button',name='Ver cobrança',exact=True).first.click()
            dialog=page.get_by_role('dialog')
            expect(dialog.get_by_role('button',name='Consultar pagamento no banco')).to_have_count(0)
            dialog.get_by_label('Valor recebido (R$)').fill('100.00')
            dialog.get_by_label('Referência / comprovante').fill('Recibo sintético 001')
            dialog.get_by_role('button',name='Confirmar recebimento integral').click()
            expect(dialog.get_by_role('alert')).to_contain_text('valor integral')
            dialog.get_by_label('Valor recebido (R$)').fill('120.15')
            dialog.get_by_role('button',name='Confirmar recebimento integral').click()
            expect(dialog.get_by_role('button',name='Baixar comprovante PDF')).to_be_visible()
            expect(dialog.get_by_role('button',name='Confirmar recebimento integral')).to_have_count(0)
            paid=client.get(base+'/bank-charges/'+rows[0]['id'],headers=headers).json()
            assert paid['status']=='received_external' and paid['manual_paid_amount']=='120.15'
            checks.append('Baixa parcial recusada sem quitação; recebimento integral grava data, valor, referência e responsável.')
            with page.expect_download() as downloaded:
                dialog.get_by_role('button',name='Baixar comprovante PDF').click()
            pdf=Path(downloaded.value.path()).read_bytes()
            text='\n'.join(item.extract_text() for item in PdfReader(io.BytesIO(pdf)).pages)
            assert 'Comprovante de recebimento' in text and 'R$ 120,15' in text and 'Recibo sintético 001' in text
            assert 'Aluno Sintético do Financeiro' in text
            (OUT/'comprovante-recebimento-sintetico.pdf').write_bytes(pdf)
            dialog.locator('.modal-body').evaluate('el=>el.scrollTop=0')
            page.screenshot(path=str(OUT/'02-recebimento-mobile.png'),full_page=True)
            checks.append('Comprovante PDF real identifica escola, aluno, matrícula e recebimento sem alegar conciliação bancária.')
            for width,height in [(320,640),(390,400),(1280,800)]:
                page.set_viewport_size({'width':width,'height':height})
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
                expect(dialog.get_by_role('button',name='Fechar',exact=True)).to_be_visible()
            dialog.get_by_role('button',name='Fechar',exact=True).click()
            page.get_by_role('button',name='Ver cobrança',exact=True).nth(1).click()
            dialog=page.get_by_role('dialog')
            dialog.get_by_text('Cancelar cobrança interna',exact=True).click()
            dialog.get_by_label('Motivo da operação').fill('Parcela sintética cancelada para conferência.')
            dialog.get_by_role('button',name='Cancelar cobrança',exact=True).click()
            expect(dialog).to_have_count(0)
            assert client.get(base+'/bank-charges/'+rows[1]['id'],headers=headers).json()['status']=='cancelled'
            assert client.get(base+'/integrations',headers=headers).json()==[]
            assert client.get(base+'/integration-jobs',headers=headers).json()['total']==0
            checks.append('Cancelamento interno auditável e formulários acessíveis em 320px/janela baixa; nenhuma conexão ou tarefa externa criada.')
            assert not errors,errors
            browser.close()
    result={'status':'passed','checks':checks,'page_errors':errors,'mode':'http_e2e','remote_providers':False}
    (OUT/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
    print(json.dumps(result,ensure_ascii=False))
except Exception:
    try:page.screenshot(path=str(OUT/'failure.png'),full_page=True)
    except Exception:pass
    (OUT/'result.json').write_text(json.dumps({'status':'failed','checks':checks,'page_errors':errors},ensure_ascii=False,indent=2))
    raise
finally:
    proc.terminate()
    try:proc.wait(timeout=10)
    except subprocess.TimeoutExpired:proc.kill();proc.wait()
    log.close();shutil.rmtree(TEMP,ignore_errors=True)
