#!/usr/bin/env python3
"""HTTPS real: white-label inicial, perfil privado e iframe autorizado entre sites.

Usa localhost (escola) e 127.0.0.1 (HUB sintético). Sem bypass CSP, sem dados reais.
Certificado descartável existe apenas no diretório temporário do teste.
"""
import io
import base64, hashlib, hmac, struct
import ipaddress
import json
import os
import shutil
import socket
import ssl
import subprocess
import sys
import tempfile
import threading
import time
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import httpx
import reportlab
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID
from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright, expect
from pypdf import PdfReader

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'evidence/0.3.0/whitelabel';OUT.mkdir(parents=True,exist_ok=True)
TEMP=Path(tempfile.mkdtemp(prefix='school-branding-'))
with socket.socket() as sock:
    sock.bind(('127.0.0.1',0));PORT=sock.getsockname()[1]
URL=f'https://localhost:{PORT}'
PASSWORD='Synthetic-Branding-Test-2026!'
key=rsa.generate_private_key(public_exponent=65537,key_size=2048)
subject=x509.Name([x509.NameAttribute(NameOID.COMMON_NAME,'localhost')])
cert=(x509.CertificateBuilder().subject_name(subject).issuer_name(subject).public_key(key.public_key())
      .serial_number(x509.random_serial_number()).not_valid_before(datetime.now(timezone.utc)-timedelta(minutes=1))
      .not_valid_after(datetime.now(timezone.utc)+timedelta(days=1))
      .add_extension(x509.SubjectAlternativeName([x509.DNSName('localhost'),x509.IPAddress(ipaddress.ip_address('127.0.0.1'))]),critical=False).sign(key,hashes.SHA256()))
(TEMP/'key.pem').write_bytes(key.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.PKCS8,serialization.NoEncryption()))
(TEMP/'cert.pem').write_bytes(cert.public_bytes(serialization.Encoding.PEM))
class Hub(BaseHTTPRequestHandler):
    def do_GET(self):
        content=('<!doctype html><html lang="pt-BR"><title>HUB sintético</title><body style="margin:0">'
                 '<iframe title="Escola" src="'+URL+'" style="border:0;width:100%;height:100vh" '
                 'sandbox="allow-scripts allow-forms allow-same-origin allow-downloads allow-popups allow-popups-to-escape-sandbox"></iframe></body></html>').encode()
        self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Length',str(len(content)));self.end_headers();self.wfile.write(content)
    def log_message(self,*args):pass
hub=ThreadingHTTPServer(('127.0.0.1',0),Hub)
ssl_context=ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER);ssl_context.load_cert_chain(TEMP/'cert.pem',TEMP/'key.pem')
hub.socket=ssl_context.wrap_socket(hub.socket,server_side=True)
threading.Thread(target=hub.serve_forever,daemon=True).start()
HUB=f'https://127.0.0.1:{hub.server_port}'
DENIED=f'https://localhost:{hub.server_port}'
env={**os.environ,'PYTHONPATH':str(ROOT/'backend'),'DATABASE_URL':'sqlite:///'+str(TEMP/'db.sqlite'),
     'ALLOW_SQLITE':'true','APP_ENV':'test','APP_URL':URL,'ALLOWED_HOSTS':'localhost,127.0.0.1',
     'APP_SECRET_KEY':'test-only-branding-secret-01234567890123456789','SETUP_TOKEN':'test-only-branding-setup-01234567890123456789',
     'STORAGE_PATH':str(TEMP/'files'),'FRONTEND_PATH':str(ROOT/'frontend/dist'),'COOKIE_SECURE':'true','EMBED_ALLOWED_ORIGINS':''}
subprocess.run([sys.executable,'-m','alembic','upgrade','head'],cwd=ROOT/'backend',env=env,check=True)
log=(OUT/'server.log').open('w')
proc=subprocess.Popen([sys.executable,'-m','uvicorn','app.main:app','--host','127.0.0.1','--port',str(PORT),'--ssl-keyfile',str(TEMP/'key.pem'),'--ssl-certfile',str(TEMP/'cert.pem')],cwd=ROOT/'backend',env=env,stdout=log,stderr=log)
checks=[];errors=[]
def record(text):checks.append(text);print('PASS:',text,flush=True)
try:
    client=httpx.Client(base_url=URL,verify=False,timeout=20,trust_env=False)
    for _ in range(80):
        try:
            if client.get('/health/ready').status_code==200:break
        except httpx.HTTPError:pass
        time.sleep(.1)
    else:raise RuntimeError('Servidor TLS não iniciou')
    r=client.post('/api/v1/setup',headers={'X-Setup-Token':env['SETUP_TOKEN']},json={'admin_name':'Secretaria Exemplo','admin_email':'branding@example.com','admin_password':PASSWORD,'company_name':'Mantenedora Exemplo','school_name':'Colégio Horizonte','academic_year':2026})
    assert r.status_code==201,r.text
    school_id=r.json()['school_id']
    auth=client.post('/api/v1/auth/login',json={'email':'branding@example.com','password':PASSWORD}).json()
    headers={'Authorization':'Bearer '+auth['access_token'],'X-CSRF-Protection':'1','Origin':URL}
    logo=Image.new('RGB',(180,150),'white');d=ImageDraw.Draw(logo);d.rectangle((25,20,155,112),outline='#254739',width=5);d.text((42,65),'HORIZONTE',fill='#254739');buf=io.BytesIO();logo.save(buf,'PNG');image=buf.getvalue()
    font=(Path(reportlab.__file__).parent/'fonts/Vera.ttf').read_bytes()  # Nunca distribuído no artefato.
    identity=client.get('/api/v1/institution/identity').json()
    data={key:identity[key] for key in ('version','display_name','short_name','primary_color','secondary_color','font_family')}
    data.update(primary_color='#254739',secondary_color='#172B26',font_family='custom',font_license_confirmed=True)
    r=client.put('/api/v1/institution/identity',headers=headers,data={'payload':json.dumps(data)},files={'logo':('school.png',image,'image/png'),'font':('school.ttf',font,'font/ttf')})
    assert r.status_code==200,r.text
    html=client.get('/').text
    assert '<title>Colégio Horizonte' in html and 'PIGE360' not in html
    assert 'institution-bootstrap' in html and 'institution-splash' in html
    assert client.get('/').headers['x-frame-options']=='DENY'
    record('HTML inicial já usa nome e logotipo da escola, com bootstrap público e iframe bloqueado por padrão')
    r=client.post('/api/v1/schools/'+school_id+'/students',headers=headers,json={'person':{'name':'João de Teste','birth_date':'2015-05-15'}});assert r.status_code==201,r.text
    student=r.json();r=client.post('/api/v1/schools/'+school_id+'/students/'+student['id']+'/issued-documents',headers=headers,json={'kind':'student_record'});assert r.status_code==201,r.text
    doc=r.json();pdf=client.get('/api/v1/schools/'+school_id+'/files/'+doc['file_id']+'/download',headers=headers).content
    (OUT/'relatorio-escola.pdf').write_bytes(pdf)
    reader=PdfReader(io.BytesIO(pdf));text=''.join(p.extract_text() for p in reader.pages)
    assert 'PIGE360' not in text and 'Colégio Horizonte' in text and 'João de Teste' in text
    assert reader.metadata.author=='Colégio Horizonte' and reader.metadata.producer=='Colégio Horizonte'
    assert reader.pages[0]['/Resources'].get('/XObject')
    record('PDF emitido pela API usa logo, nome e fonte fornecida pela escola; sem marca do fornecedor')
    with sync_playwright() as pw:
        binary=os.getenv('CHROMIUM_PATH') or (None if Path(pw.chromium.executable_path).exists() else shutil.which('chromium'))
        browser=pw.chromium.launch(headless=True,**({'executable_path':binary} if binary else {}),args=['--no-sandbox','--test-third-party-cookie-phaseout'])
        ctx=browser.new_context(ignore_https_errors=True,viewport={'width':1440,'height':980},locale='pt-BR')
        page=ctx.new_page();page.set_default_timeout(15000);page.on('pageerror',lambda e:errors.append(str(e)))
        requests=[];page.on('request',lambda r:requests.append(r.url))
        page.goto(URL)
        expect(page.get_by_role('heading',name='Acesse sua instituição')).to_be_visible()
        assert not any('/branding/' in v or '/fonts/' in v or '/setup/status' in v or '/institution/identity' in v for v in requests)
        page.screenshot(path=str(OUT/'01-login-escola.png'))
        record('Primeiro carregamento sem logotipo/fonte do fornecedor e sem buscas sequenciais de identidade e setup')
        def login(scope):
            scope.get_by_label('E-mail',exact=True).fill('branding@example.com');scope.get_by_label('Senha',exact=True).fill(PASSWORD);scope.get_by_role('button',name='Entrar na aplicação').click();expect(scope.get_by_role('heading',name='Visão geral',exact=True)).to_be_visible()
        login(page)
        # Preferência real da escola, alterada pela interface e vista sem sessão.
        page.locator('aside').get_by_role('link',name='Instituição',exact=True).click()
        page.get_by_role('button',name='Personalizar identidade visual',exact=True).click()
        setting=page.get_by_role('dialog').get_by_label('Exibir botão de pré-matrícula na tela de login',exact=False)
        expect(setting).to_be_checked();setting.uncheck()
        page.get_by_role('dialog').get_by_role('button',name='Salvar',exact=True).click()
        expect(page.get_by_role('dialog')).to_have_count(0)
        guest=browser.new_context(ignore_https_errors=True,viewport={'width':1440,'height':980},locale='pt-BR')
        public=guest.new_page();public.on('pageerror',lambda e:errors.append(str(e)))
        public.goto(URL);expect(public.get_by_role('heading',name='Acesse sua instituição')).to_be_visible()
        expect(public.locator('a[href="/online.html"]')).to_have_count(0)
        assert public.locator('#institution-bootstrap').text_content().find('"show_preenrollment_button": false')>=0
        expect(public.locator('.auth-intro h1')).to_contain_text('A gestão educacional.')
        expect(public.locator('.auth-intro h1')).to_contain_text('Organizada, de verdade.')
        expect(public.locator('.auth-intro .eyebrow')).to_have_text('GESTÃO EDUCACIONAL')
        expect(public.locator('.auth-features,.auth-intro .self-label')).to_have_count(0)
        public.screenshot(path=str(OUT/'06-login-sem-atalho.png'))
        public.set_viewport_size({'width':390,'height':844})
        assert public.locator('body').evaluate('e=>e.scrollWidth<=innerWidth+1')
        public.screenshot(path=str(OUT/'07-login-mobile.png'))
        page.get_by_role('button',name='Personalizar identidade visual',exact=True).click()
        setting=page.get_by_role('dialog').get_by_label('Exibir botão de pré-matrícula na tela de login',exact=False)
        expect(setting).not_to_be_checked();setting.check()
        page.get_by_role('dialog').get_by_role('button',name='Salvar',exact=True).click()
        expect(page.get_by_role('dialog')).to_have_count(0)
        public.set_viewport_size({'width':1440,'height':980});public.reload()
        expect(public.get_by_role('link',name='Sou responsável · Pré-matrícula online')).to_be_visible()
        public.screenshot(path=str(OUT/'08-login-com-atalho.png'));guest.close()
        record('Login preservado, somente textos marcados removidos; botão de pré-matrícula liga/desliga pela interface e persiste para visitas sem sessão')
        expect(page.locator('.sidebar-footer')).to_have_text('PIGE360 · '+json.loads((ROOT/'frontend/dist/build-info.json').read_text())['version'])
        page.get_by_role('button',name='Meu perfil',exact=True).click()
        dialog=page.get_by_role('dialog');expect(dialog.get_by_role('heading',name='Meu perfil',exact=True)).to_be_visible()
        dialog.get_by_label('Nome de exibição').fill('Secretaria Atualizada')
        dialog.get_by_label('Telefone / WhatsApp').fill('5575999990000')
        dialog.get_by_label('Cargo / função').fill('Atendimento escolar')
        dialog.get_by_role('button',name='Salvar',exact=True).click();expect(dialog).to_have_count(0)
        expect(page.locator('.user-caption strong')).to_have_text('Secretaria Atualizada')
        record('Perfil salvo sem enviar foto: campos opcionais preservam o contrato booleano')
        page.get_by_role('button',name='Meu perfil',exact=True).click();dialog=page.get_by_role('dialog')
        dialog.get_by_label('Foto do usuário',exact=False).set_input_files({'name':'perfil.png','mimeType':'image/png','buffer':image})
        expect(dialog.locator('.account-photo img')).to_be_visible();page.screenshot(path=str(OUT/'02-meu-perfil.png'))
        dialog.get_by_role('button',name='Salvar',exact=True).click();expect(dialog).to_have_count(0)
        expect(page.locator('.user-avatar img')).to_be_visible();page.reload();expect(page.locator('.user-avatar img')).to_be_visible()
        expect(page.locator('.user-caption strong')).to_have_text('Secretaria Atualizada')
        record('Perfil próprio salvo com foto privada, contatos e cargo; avatar persiste ao recarregar')
        page.get_by_role('button',name='Meu perfil',exact=True).click();expect(page.get_by_role('dialog')).to_be_visible();page.set_viewport_size({'width':390,'height':844})
        assert page.get_by_role('dialog').evaluate('e=>e.scrollWidth<=e.clientWidth+1')
        page.screenshot(path=str(OUT/'03-perfil-mobile.png'));page.get_by_role('dialog').get_by_role('button',name='Fechar janela').click();page.set_viewport_size({'width':1440,'height':980})
        page.locator('aside').get_by_role('link',name='Instituição',exact=True).click()
        page.get_by_role('button',name='Autorizar origens de iframe').click();dialog=page.get_by_role('dialog')
        dialog.get_by_label('Permitir abertura',exact=False).check();dialog.get_by_label('Origens autorizadas',exact=False).fill(HUB);dialog.get_by_label('Sua senha atual',exact=False).fill(PASSWORD)
        page.screenshot(path=str(OUT/'04-origens-autorizadas.png'))
        dialog.get_by_role('button',name='Salvar',exact=True).click();expect(page.get_by_role('heading',name='Acesse sua instituição')).to_be_visible()
        response=client.get('/');assert 'x-frame-options' not in response.headers and HUB in response.headers['content-security-policy']
        head=client.head('/');assert head.status_code==200 and head.content==b'' and head.headers['content-security-policy']==response.headers['content-security-policy']
        assert 'x-frame-options' not in head.headers
        record('Probe anônimo HEAD 200 usa a mesma autorização de iframe do GET, sem depender de Origin ou Referer')
        assert client.get('/api/v1/auth/me',headers=headers).status_code==401
        record('Administrador autoriza origem pela interface sem reiniciar Docker; alteração revoga sessões existentes')
        host_page=ctx.new_page();host_page.set_default_timeout(15000);host_page.on('pageerror',lambda e:errors.append(str(e)));host_page.goto(HUB)
        frame=host_page.frame_locator('iframe');expect(frame.get_by_role('heading',name='Acesse sua instituição')).to_be_visible();login(frame)
        host_page.reload();expect(frame.get_by_role('heading',name='Visão geral',exact=True)).to_be_visible();expect(frame.locator('.user-avatar img')).to_be_visible()
        cookies=ctx.cookies()
        assert any(c['name']=='pige_refresh' and c.get('partitionKey')=='https://127.0.0.1' and c['secure'] and c['httpOnly'] and c['sameSite']=='None' for c in cookies),[(c['name'],c.get('partitionKey')) for c in cookies]
        host_page.screenshot(path=str(OUT/'05-escola-no-iframe.png'))
        record('Iframe cross-site HTTPS autorizado: login, cookie CHIPS, foto e sessão persistida após recarregar')
        frame.get_by_role('button',name='Meu perfil',exact=True).click();frame.get_by_role('button',name='Segurança · 2FA',exact=True).click()
        frame.get_by_label('Senha atual',exact=True).fill(PASSWORD);frame.get_by_role('button',name='Configurar 2FA',exact=True).click()
        expect(frame.locator('.mfa-qr')).to_be_visible();frame.locator('summary').click()
        seed=frame.locator('.mfa-secret').inner_text()
        raw=hmac.new(base64.b32decode(seed),struct.pack('>Q',int(time.time())//30),hashlib.sha1).digest();offset=raw[-1]&15
        code=str((struct.unpack('>I',raw[offset:offset+4])[0]&0x7fffffff)%1000000).zfill(6)
        frame.get_by_label('Código de 6 dígitos').fill(code);frame.get_by_role('button',name='Confirmar',exact=True).click()
        expect(frame.locator('.mfa-codes code')).to_have_count(10);recovery=frame.locator('.mfa-codes code').first.inner_text()
        frame.get_by_role('button',name='Guardei os códigos · Continuar',exact=True).click();expect(frame.locator('.workspace')).to_be_visible()
        frame.get_by_role('button',name='Sair',exact=True).click()
        frame.get_by_label('E-mail',exact=True).fill('branding@example.com');frame.get_by_label('Senha',exact=True).fill(PASSWORD);frame.get_by_role('button',name='Entrar na aplicação').click()
        expect(frame.get_by_role('heading',name='Confirme seu acesso')).to_be_visible();expect(frame.locator('.workspace')).to_have_count(0)
        frame.get_by_label('Código do autenticador ou de recuperação').fill(recovery);frame.get_by_role('button',name='Confirmar',exact=True).click()
        expect(frame.locator('.workspace')).to_be_visible();host_page.reload();expect(frame.locator('.workspace')).to_be_visible()
        record('2FA configurado e validado dentro do iframe HTTPS: sessão com segundo fator persiste na partição do HUB')

        denied=ctx.new_page();violations=[];denied.on('console',lambda msg:violations.append(msg.text));denied.goto(DENIED)
        for _ in range(100):
            if any('frame-ancestors' in x for x in violations):break
            denied.wait_for_timeout(50)
        assert any('frame-ancestors' in x for x in violations),violations
        record('Origem não cadastrada bloqueada pelo navegador via frame-ancestors, sem liberar CORS')
        frame.get_by_role('button',name='Sair',exact=True).click();expect(frame.get_by_role('heading',name='Acesse sua instituição')).to_be_visible()
        host_page.reload();expect(frame.get_by_role('heading',name='Acesse sua instituição')).to_be_visible()
        record('Logout no iframe elimina a sessão da partição; recarregar não restaura autenticação')
        assert not errors,errors
        browser.close()
    (OUT/'result.json').write_text(json.dumps({'status':'passed','mode':'https_native_cross_site','checks':checks,'errors':errors,'database':'SQLite descartável','real_external_hub_tested':False},ensure_ascii=False,indent=2))
    print(json.dumps({'status':'passed','checks':len(checks)}))
finally:
    proc.terminate()
    try:proc.wait(timeout=8)
    except subprocess.TimeoutExpired:proc.kill();proc.wait()
    hub.shutdown();hub.server_close();log.close();shutil.rmtree(TEMP,ignore_errors=True)
