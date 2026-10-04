#!/usr/bin/env python3
"""Notícias e eventos em Chromium real, com banco e publicações exclusivamente sintéticos."""
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

ROOT=Path(__file__).resolve().parents[1]
OUT=Path(os.getenv('PIGE_COMMUNITY_EVIDENCE_DIR',str(ROOT/'evidence/0.10.0/community')));OUT.mkdir(parents=True,exist_ok=True)
TEMP=Path(tempfile.mkdtemp(prefix='pige-community-e2e-'))
with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
URL=f'http://127.0.0.1:{port}';PASSWORD='Synthetic-Community-Password-2026!'
env={**os.environ,'PYTHONPATH':str(ROOT/'backend'),'DATABASE_URL':'sqlite:///'+str(TEMP/'test.db'),'ALLOW_SQLITE':'true','APP_ENV':'test','APP_URL':URL,'ALLOWED_HOSTS':'127.0.0.1,localhost','APP_SECRET_KEY':'test-only-community-secret-01234567890123456789','SETUP_TOKEN':'test-only-community-setup-01234567890123456789','STORAGE_PATH':str(TEMP/'files'),'FRONTEND_PATH':str(TEMP/'frontend'),'COOKIE_SECURE':'false'}
shutil.copytree(ROOT/'frontend/dist',TEMP/'frontend')
subprocess.run([sys.executable,'-m','alembic','upgrade','head'],cwd=ROOT/'backend',env=env,check=True)
log=(OUT/'server.log').open('w');proc=subprocess.Popen([sys.executable,'-m','uvicorn','app.main:app','--host','127.0.0.1','--port',str(port)],cwd=ROOT/'backend',env=env,stdout=log,stderr=log)
checks=[];errors=[]
try:
    with httpx.Client(base_url=URL,timeout=30) as api:
        for _ in range(80):
            try:
                if api.get('/health/ready').status_code==200:break
            except httpx.HTTPError:pass
            time.sleep(.1)
        result=api.post('/api/v1/setup',headers={'X-Setup-Token':env['SETUP_TOKEN']},json={'admin_name':'Direção Sintética','admin_email':'community@example.com','admin_password':PASSWORD,'company_name':'Mantenedora Exemplo','school_name':'Escola Horizonte — Teste','academic_year':2026});assert result.status_code==201,result.text
        login=api.post('/api/v1/auth/login',json={'email':'community@example.com','password':PASSWORD}).json();headers={'Authorization':'Bearer '+login['access_token']}
        school=api.get('/api/v1/schools',headers=headers).json()[0];base='/api/v1/schools/'+school['id']
        for title,audience,status in [('Rascunho interno sintético','public','draft'),('Comunicado dos professores','teachers','published'),('Projeto de leitura da escola','public','published')]:
            result=api.post(base+'/community-posts',headers=headers,json={'title':title,'summary':'Publicação sintética para validação da aplicação.','content':'A escola apresenta as atividades de leitura e integração da comunidade.\n\nEste conteúdo foi criado apenas no banco temporário de testes.','audience':audience,'status':status});assert result.status_code==201,result.text
        with sync_playwright() as pw:
            binary=os.getenv('CHROMIUM_PATH') or (None if Path(pw.chromium.executable_path).exists() else shutil.which('chromium'))
            browser=pw.chromium.launch(headless=True,**({'executable_path':binary} if binary else {}),args=['--no-sandbox'])
            admin=browser.new_page(viewport={'width':1440,'height':1050},locale='pt-BR');admin.set_default_timeout(12000);admin.on('pageerror',lambda error:errors.append(str(error)))
            admin.goto(URL);admin.get_by_label('E-mail',exact=True).fill('community@example.com');admin.get_by_label('Senha',exact=True).fill(PASSWORD);admin.get_by_role('button',name='Entrar na aplicação').click()
            expect(admin.locator('h1')).to_have_text('Visão geral')
            admin.get_by_role('button',name='Publicidade',exact=True).click()
            admin.locator('aside').get_by_role('link',name='Notícias e eventos',exact=True).click()
            expect(admin.get_by_role('heading',name='Notícias e agenda',exact=True)).to_be_visible()
            admin.get_by_role('button',name='+ Nova publicação',exact=True).click();dialog=admin.get_by_role('dialog')
            dialog.get_by_label('Tipo',exact=True).select_option('event');dialog.get_by_label('Público',exact=True).select_option('public')
            dialog.get_by_label('Título',exact=True).fill('Encontro das famílias — Teste');dialog.get_by_label('Resumo',exact=True).fill('Um momento para trocar experiências e conhecer os projetos da escola.')
            dialog.get_by_label('Conteúdo',exact=True).fill('Convidamos as famílias para uma tarde de encontro e apresentação dos projetos pedagógicos.\n\nEvento sintético usado exclusivamente para testar a interface.')
            dialog.get_by_label('Início',exact=True).fill('2027-02-10T14:00');dialog.get_by_label('Encerramento',exact=True).fill('2027-02-10T16:00');dialog.get_by_label('Local',exact=True).fill('Auditório da escola')
            dialog.get_by_label('Situação',exact=True).select_option('published');dialog.get_by_role('button',name='Salvar e publicar',exact=True).click()
            expect(admin.get_by_role('heading',name='Encontro das famílias — Teste',exact=True)).to_be_visible()
            admin.screenshot(path=str(OUT/'01-comunidade-admin.png'),full_page=True);checks.append('Direção cria e publica evento pela interface, com público, local e horários.')
            feed=api.get(base+'/community-posts',headers=headers).json();event=next(item for item in feed['items'] if item['title']=='Encontro das famílias — Teste');assert event['kind']=='event' and event['audience']=='public' and event['event_start'].startswith('2027-02-10T17:00')
            public=browser.new_page(viewport={'width':1440,'height':1000},locale='pt-BR');public.set_default_timeout(12000);public.on('pageerror',lambda error:errors.append(str(error)))
            public.goto(URL+'/news.html?school='+school['id'])
            expect(public.get_by_role('heading',name='Encontro das famílias — Teste',exact=True)).to_be_visible();expect(public.get_by_role('heading',name='Projeto de leitura da escola',exact=True)).to_be_visible()
            expect(public.get_by_text('Rascunho interno sintético',exact=True)).to_have_count(0);expect(public.get_by_text('Comunicado dos professores',exact=True)).to_have_count(0)
            assert public.locator('script[src*="/app.js"]').count()==0
            public.screenshot(path=str(OUT/'02-noticias-publicas-desktop.png'),full_page=True);checks.append('Página pública apresenta notícias/eventos e não revela rascunho nem mensagem de professores.')
            card=public.locator('.community-card').filter(has=public.get_by_role('heading',name='Encontro das famílias — Teste',exact=True));card.get_by_role('button',name='Ler publicação',exact=True).click()
            expect(public.get_by_role('dialog')).to_contain_text('Convidamos as famílias');public.keyboard.press('Escape');expect(public.get_by_role('dialog')).to_have_count(0)
            public.get_by_label('Conteúdo',exact=True).select_option('event');public.get_by_role('button',name='Pesquisar',exact=True).click();expect(public.locator('.community-card')).to_have_count(1);checks.append('Leitura acessível com Escape e filtro de eventos funcionam sem autenticação.')
            public.set_viewport_size({'width':390,'height':844});assert public.locator('.x-filter > label').evaluate_all('(labels)=>labels.every(label=>label.getBoundingClientRect().width>250)');public.screenshot(path=str(OUT/'03-noticias-publicas-mobile.png'),full_page=True);assert public.evaluate('document.documentElement.scrollWidth<=innerWidth+1');checks.append('Página de notícias responsiva a 390px sem rolagem horizontal.')
            assert not errors,errors;browser.close()
    (OUT/'result.json').write_text(json.dumps({'status':'passed','checks':checks,'page_errors':errors},ensure_ascii=False,indent=2))
    print(json.dumps({'status':'passed','checks':checks,'evidence':str(OUT)},ensure_ascii=False))
except Exception:
    (OUT/'result.json').write_text(json.dumps({'status':'failed','checks':checks,'page_errors':errors},ensure_ascii=False,indent=2))
    raise
finally:
    proc.terminate()
    try:proc.wait(timeout=10)
    except subprocess.TimeoutExpired:proc.kill();proc.wait()
    log.close();shutil.rmtree(TEMP,ignore_errors=True)
