#!/usr/bin/env python3
"""Regressão operacional: fichas/família e 2FA. Somente dados descartáveis."""
import base64, hashlib, hmac, json, os, shutil, socket, struct, subprocess, sys, tempfile, time
from pathlib import Path
import httpx
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'evidence/0.3.0/access';OUT.mkdir(parents=True,exist_ok=True)
TEMP=Path(tempfile.mkdtemp(prefix='pige-access-'))
with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
URL=f'http://127.0.0.1:{port}';PASSWORD='Synthetic-Access-Password-2026!';BRIDGE=os.getenv('PIGE_UI_BRIDGE')=='1'
env={**os.environ,'PYTHONPATH':str(ROOT/'backend'),'DATABASE_URL':'sqlite:///'+str(TEMP/'test.db'),'ALLOW_SQLITE':'true','APP_ENV':'test','APP_URL':URL,'ALLOWED_HOSTS':'localhost,127.0.0.1','APP_SECRET_KEY':'synthetic-access-only-012345678901234567890123456','SETUP_TOKEN':'synthetic-setup-only-01234567890123456789','STORAGE_PATH':str(TEMP/'files'),'FRONTEND_PATH':str(ROOT/'frontend/dist'),'COOKIE_SECURE':'false','EMBED_ALLOWED_ORIGINS':''}
subprocess.run([sys.executable,'-m','alembic','upgrade','head'],cwd=ROOT/'backend',env=env,check=True)
log=(OUT/'server.log').open('w');proc=subprocess.Popen([sys.executable,'-m','uvicorn','app.main:app','--host','127.0.0.1','--port',str(port)],cwd=ROOT/'backend',env=env,stdout=log,stderr=log)
checks=[];errors=[]
def record(message):checks.append(message);print('PASS:',message,flush=True)
def totp(secret):
    raw=hmac.new(base64.b32decode(secret),struct.pack('>Q',int(time.time())//30),hashlib.sha1).digest();offset=raw[-1]&15
    return str((struct.unpack('>I',raw[offset:offset+4])[0]&0x7fffffff)%1000000).zfill(6)
try:
    client=httpx.Client(base_url=URL,timeout=30)
    for _ in range(80):
        try:
            if client.get('/health/ready').status_code==200:break
        except httpx.HTTPError:pass
        time.sleep(.1)
    r=client.post('/api/v1/setup',headers={'X-Setup-Token':env['SETUP_TOKEN']},json={'admin_name':'Secretaria Exemplo','admin_email':'access@example.com','admin_password':PASSWORD,'company_name':'Mantenedora Exemplo','school_name':'Colégio Exemplo','academic_year':2026});assert r.status_code==201,r.text
    auth=client.post('/api/v1/auth/login',json={'email':'access@example.com','password':PASSWORD}).json();headers={'Authorization':'Bearer '+auth['access_token'],'X-CSRF-Protection':'1'}
    school=client.get('/api/v1/schools',headers=headers).json()[0];base='/api/v1/schools/'+school['id']
    mother=client.post(base+'/persons',headers=headers,json={'name':'Paula Familiar','person_types':['mother'],'phone':'5575999990000'}).json()
    r=client.post('/api/v1/users',headers=headers,json={'name':'Consulta Teste','email':'consulta@example.com','password':PASSWORD,'role':'viewer','school_ids':[school['id']]});assert r.status_code==201,r.text
    assert client.head('/').status_code==200 and client.head('/').content==b''
    record('HEAD público responde 200 e mantém bloqueio de iframe por padrão')
    with sync_playwright() as pw:
        binary=os.getenv('CHROMIUM_PATH') or (None if Path(pw.chromium.executable_path).exists() else shutil.which('chromium'))
        browser=pw.chromium.launch(headless=True,**({'executable_path':binary} if binary else {}),args=['--no-sandbox'])
        ctx=browser.new_context(viewport={'width':1440,'height':960},locale='pt-BR');page=ctx.new_page();page.set_default_timeout(10000);page.on('pageerror',lambda e:errors.append(str(e)))
        if BRIDGE:
            from ui_bridge import install
            install(page,ROOT,URL,OUT)
        else:page.goto(URL)
        def login(email='access@example.com'):
            page.get_by_label('E-mail',exact=True).fill(email);page.get_by_label('Senha',exact=True).fill(PASSWORD);page.get_by_role('button',name='Entrar na aplicação').click()
        def nav(name):
            expect(page.locator('.app-root')).to_have_attribute('aria-busy','false')
            button=page.get_by_role('button',name='Cadastros',exact=True)
            if name in ['Cadastro único','Alunos','Pais e responsáveis'] and button.get_attribute('aria-expanded')=='false':button.click()
            page.locator('aside').get_by_role('link',name=name,exact=True).click()
            expect(page.get_by_role('heading',name=name,exact=True)).to_be_visible()
        def dialog():return page.get_by_role('dialog')
        def field(name):
            el=dialog().get_by_label(name,exact=False);el.wait_for(state='attached')
            el.evaluate("e=>{const d=e.closest('details');if(d)d.open=true;}")
            section=el.evaluate("e=>e.closest('[data-form-section]')?.dataset.formSection||''")
            if section and not el.is_visible():dialog().locator(f'[data-section-target="{section}"]').click()
            return el
        def save():
            dialog().get_by_role('button',name='Salvar',exact=True).click()
            try:expect(dialog()).to_have_count(0)
            except AssertionError:
                print('Form error:',dialog().get_by_role('alert').all_text_contents(),flush=True)
                page.screenshot(path=str(OUT/'form-failure.png'))
                raise
            expect(page.locator('.app-root')).to_have_attribute('aria-busy','false')
        login();expect(page.get_by_role('heading',name='Visão geral',exact=True)).to_be_visible()
        nav('Cadastro único');page.get_by_role('button',name='+ Nova pessoa').click()
        field('Nome completo').fill('João Ficha Unificada');field('Data de nascimento').fill('2015-05-15')
        dialog().locator('.person-type-picker summary').click();dialog().get_by_label('Buscar tipo de pessoa').fill('alun');dialog().get_by_role('button',name='Aluno',exact=True).click()
        expect(dialog().locator('[data-section-target]')).to_have_count(4)
        expect(dialog().locator('select[multiple]')).to_have_count(0)
        expect(dialog().get_by_text('Tipos e vínculos',exact=True)).to_have_count(0)
        dialog().locator('[data-section-target="links"]').click();dialog().get_by_role('button',name='Adicionar vínculo',exact=True).click()
        family=dialog().locator('.family-editor');family.get_by_label('Buscar pessoa existente').fill('Paula')
        family.locator('.family-matches button').first.click();family.get_by_label('Parentesco / relacionamento').select_option('Mãe')
        expect(family.get_by_label('Responsável legal',exact=True)).not_to_be_checked();expect(family.get_by_label('Responsável financeiro',exact=True)).not_to_be_checked()
        family.get_by_label('Responsável financeiro',exact=True).check();family.get_by_role('button',name='Adicionar à ficha',exact=True).click()
        assert client.get(base+'/persons?q=João Ficha',headers=headers).json()['total']==0
        page.screenshot(path=str(OUT/'01-ficha-familia-desktop.png'))
        page.set_viewport_size({'width':390,'height':844});expect(dialog().get_by_role('button',name='Salvar',exact=True)).to_be_in_viewport();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        page.screenshot(path=str(OUT/'02-ficha-familia-mobile.png'));save();page.set_viewport_size({'width':1440,'height':960})
        saved=client.get(base+'/persons?q=João Ficha',headers=headers).json()['items'][0]
        assert saved['student_id']
        inverse=client.get(base+'/persons/'+mother['id']+'/family',headers=headers).json()['items'][0]
        assert inverse['peer']['id']==saved['id'] and inverse['financial'] and not inverse['legal']
        record('Tipos no topo, quatro seções e aluno/familiar salvos juntos; parentesco não concede permissões')
        nav('Pais e responsáveis');page.get_by_role('row').filter(has_text='Paula Familiar').get_by_role('button',name='Editar').click()
        dialog().locator('[data-section-target="links"]').click();expect(dialog().get_by_text('João Ficha Unificada',exact=True)).to_be_visible()
        dialog().get_by_role('button',name='Adicionar vínculo',exact=True).click();family=dialog().locator('.family-editor');family.get_by_label('Cadastrar novo aluno nesta ficha').check()
        family.get_by_label('Nome completo',exact=True).fill('Filha Cadastrada pela Mãe');family.get_by_label('Data de nascimento').fill('2018-02-15');family.get_by_label('Parentesco / relacionamento').select_option('Mãe');family.get_by_label('Responsável legal',exact=True).check();family.get_by_role('button',name='Adicionar à ficha',exact=True).click();save()
        daughter=client.get(base+'/persons?q=Filha Cadastrada',headers=headers).json()['items'][0]
        reverse=client.get(base+'/persons/'+daughter['id']+'/family',headers=headers).json()['items'][0]
        assert reverse['peer']['id']==mother['id'] and reverse['legal'] and not reverse['financial']
        record('Vínculo bidirecional: cadastrar aluno pela ficha da mãe reaproveita a identidade e a mesma relação')
        page.get_by_role('button',name='Meu perfil',exact=True).click();dialog().get_by_role('button',name='Segurança · 2FA',exact=True).click()
        dialog().get_by_label('Senha atual',exact=True).fill(PASSWORD);dialog().get_by_role('button',name='Configurar 2FA',exact=True).click()
        expect(dialog().locator('.mfa-qr')).to_be_visible();dialog().locator('summary').click();secret=dialog().locator('.mfa-secret').inner_text()
        dialog().get_by_label('Código de 6 dígitos').fill(totp(secret));dialog().get_by_role('button',name='Confirmar',exact=True).click()
        expect(dialog().locator('.mfa-codes code')).to_have_count(10);codes=dialog().locator('.mfa-codes code').all_inner_texts();assert len(set(codes))==10
        dialog().get_by_role('button',name='Guardei os códigos · Continuar',exact=True).click();expect(dialog()).to_have_count(0)
        record('2FA opcional: usuário configura QR e confirma TOTP; dez códigos de recuperação exibidos uma única vez')
        page.get_by_role('button',name='Sair',exact=True).click();login();expect(page.get_by_role('heading',name='Confirme seu acesso')).to_be_visible()
        expect(page.locator('.workspace')).to_have_count(0)
        page.get_by_label('Código do autenticador ou de recuperação',exact=True).fill('ABCDEF');page.get_by_role('button',name='Confirmar',exact=True).click();expect(page.get_by_role('alert')).to_contain_text('Código inválido')
        page.get_by_label('Código do autenticador ou de recuperação',exact=True).fill(codes[0]);page.get_by_role('button',name='Confirmar',exact=True).click();expect(page.locator('.workspace')).to_be_visible()
        record('Senha sozinha não libera a aplicação quando o usuário ativou 2FA; recuperação de uso único funciona')
        nav('Instituição');page.get_by_role('button',name='Política de 2FA',exact=True).click()
        dialog().get_by_label('Exigir 2FA',exact=False).check();dialog().get_by_label('Sua senha atual',exact=False).fill(PASSWORD);dialog().get_by_label('Código do seu autenticador',exact=False).fill(codes[1]);save()
        expect(page.get_by_role('heading',name='Acesse sua instituição')).to_be_visible();login('consulta@example.com')
        expect(page.get_by_role('heading',name='Ative a autenticação em duas etapas')).to_be_visible();expect(page.locator('.workspace')).to_have_count(0)
        page.set_viewport_size({'width':390,'height':844});page.screenshot(path=str(OUT/'03-2fa-obrigatorio-mobile.png'),mask=[page.locator('.mfa-qr'),page.locator('.mfa-secret')])
        page.locator('summary').click();secret2=page.locator('.mfa-secret').inner_text();page.get_by_label('Código de 6 dígitos').fill(totp(secret2));page.get_by_role('button',name='Confirmar',exact=True).click();expect(page.locator('.mfa-codes code')).to_have_count(10);page.get_by_role('button',name='Guardei os códigos · Continuar',exact=True).click();expect(page.locator('.workspace')).to_be_visible()
        record('Política institucional obrigatória revoga sessões e força usuário não configurado a ativar 2FA antes de acessar')
        page.set_viewport_size({'width':1440,'height':960})
        nav('Visão geral');expect(page.locator('.app-root')).to_have_attribute('aria-busy','false')
        assert not errors,errors
        browser.close()
    (OUT/'results.json').write_text(json.dumps({'status':'passed','checks':checks,'errors':errors,'mode':'ui_api_bridge' if BRIDGE else 'http_e2e','database':'SQLite descartável','not_validated':['HTTP/cookies/CSP/PWA nativos'] if BRIDGE else []},ensure_ascii=False,indent=2))
except Exception:
    try:page.screenshot(path=str(OUT/'failure.png'),mask=[page.locator('.mfa-qr'),page.locator('.mfa-secret'),page.locator('.mfa-codes')])
    except Exception:pass
    raise
finally:
    proc.terminate();proc.wait(timeout=10);log.close();shutil.rmtree(TEMP,ignore_errors=True)
