#!/usr/bin/env python3
"""HTTP/Chromium, portal/site separados e SMTP TLS local. Nenhum destinatário real."""
import datetime
from email import policy
from email.parser import BytesParser
import io
import ipaddress
import json
import os
from pathlib import Path
import queue
import re
import shutil
import socket
import socketserver
import ssl
import subprocess
import sys
import tempfile
import threading
import time
import httpx
from PIL import Image
from cryptography import x509
from cryptography.hazmat.primitives import hashes,serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID
from playwright.sync_api import sync_playwright,expect

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'evidence/0.10.0/continuity';OUT.mkdir(parents=True,exist_ok=True)
TEMP=Path(tempfile.mkdtemp(prefix='pige-continuity-'))
def port():
    with socket.socket() as s:s.bind(('127.0.0.1',0));return s.getsockname()[1]
API_PORT,PORTAL_PORT,SITE_PORT=port(),port(),port()
API=f'http://127.0.0.1:{API_PORT}';PORTAL=f'http://127.0.0.1:{PORTAL_PORT}';SITE=f'http://127.0.0.1:{SITE_PORT}'
PASSWORD='Synthetic-Continuity-2026!';messages=queue.Queue();processes=[];checks=[];errors=[]
key=rsa.generate_private_key(public_exponent=65537,key_size=2048)
subject=x509.Name([x509.NameAttribute(NameOID.COMMON_NAME,'SMTP local sintético')])
cert=(x509.CertificateBuilder().subject_name(subject).issuer_name(subject).public_key(key.public_key()).serial_number(x509.random_serial_number())
    .not_valid_before(datetime.datetime.now(datetime.UTC)-datetime.timedelta(days=1)).not_valid_after(datetime.datetime.now(datetime.UTC)+datetime.timedelta(days=1))
    .add_extension(x509.SubjectAlternativeName([x509.IPAddress(ipaddress.ip_address('127.0.0.1'))]),critical=False)
    .add_extension(x509.BasicConstraints(ca=True,path_length=None),critical=True).sign(key,hashes.SHA256()))
(TEMP/'smtp.crt').write_bytes(cert.public_bytes(serialization.Encoding.PEM));(TEMP/'smtp.key').write_bytes(key.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.PKCS8,serialization.NoEncryption()))
context=ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER);context.load_cert_chain(TEMP/'smtp.crt',TEMP/'smtp.key')
class SMTP(socketserver.StreamRequestHandler):
    def handle(self):
        self.wfile.write(b'220 Local synthetic SMTP\r\n')
        while line:=self.rfile.readline():
            command=line.split(b' ',1)[0].strip().upper()
            if command in {b'EHLO',b'HELO'}:self.wfile.write(b'250 localhost\r\n')
            elif command==b'DATA':
                self.wfile.write(b'354 End with dot\r\n');parts=[]
                while (part:=self.rfile.readline())!=b'.\r\n':
                    if not part:return
                    parts.append(part)
                messages.put(b''.join(parts));self.wfile.write(b'250 Accepted locally\r\n')
            elif command==b'QUIT':self.wfile.write(b'221 Goodbye\r\n');return
            else:self.wfile.write(b'250 OK\r\n')
class SMTPServer(socketserver.ThreadingTCPServer):
    allow_reuse_address=True;daemon_threads=True
    def get_request(self):
        conn,addr=super().get_request();return context.wrap_socket(conn,server_side=True),addr
smtp=SMTPServer(('127.0.0.1',0),SMTP);threading.Thread(target=smtp.serve_forever,daemon=True).start()
env={**os.environ,'PYTHONPATH':str(ROOT/'backend'),'DATABASE_URL':'sqlite:///'+str(TEMP/'app.db'),
    'ALLOW_SQLITE':'true','APP_ENV':'test','APP_URL':API,'PORTAL_PUBLIC_URL':PORTAL,'COOKIE_SECURE':'false',
    'ALLOWED_HOSTS':'localhost,127.0.0.1','STORAGE_PATH':str(TEMP/'documents'),'FRONTEND_PATH':str(ROOT/'frontend/dist'),
    'APP_SECRET_KEY':'synthetic-continuity-secret-000000000000000000000','SETUP_TOKEN':'synthetic-continuity-setup-00000000000000000',
    'INTEGRATION_ENCRYPTION_KEY':'MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA=',
    'SMTP_HOST':'127.0.0.1','SMTP_PORT':str(smtp.server_address[1]),'SMTP_SECURITY':'ssl','SMTP_FROM':'school@example.test',
    'PORTAL_INTERNAL_TOKEN':'synthetic-portal-service-key-00000000000000000',
    'PORTAL_TRUSTED_PROXY_IPS':'127.0.0.1/32',
    'SSL_CERT_FILE':str(TEMP/'smtp.crt'),'WEBSITE_INTERNAL_TOKEN':'synthetic-website-service-key-00000000000000000'}
log=(OUT/'services.log').open('w')
def spawn(command,extra=None):
    process=subprocess.Popen(command,env={**env,**(extra or {})},cwd=ROOT,stdout=log,stderr=log);processes.append(process);return process
def record(message):checks.append(message);print('PASS:',message,flush=True)
def wait(url):
    for _ in range(100):
        try:
            if httpx.get(url,trust_env=False).status_code==200:return
        except httpx.HTTPError:pass
        time.sleep(.1)
    raise AssertionError('Service did not become ready: '+url)
try:
    subprocess.run([sys.executable,'-m','alembic','upgrade','head'],cwd=ROOT/'backend',env=env,check=True,stdout=log,stderr=log)
    spawn([sys.executable,'-m','uvicorn','app.main:app','--host','127.0.0.1','--port',str(API_PORT)])
    portal=spawn([sys.executable,str(ROOT/'services/portal/server.py')],{'PIGE_INTERNAL_URL':API,'FRONTEND_PATH':str(ROOT/'frontend/dist'),'PORT':str(PORTAL_PORT)})
    wait(API+'/health/ready');wait(PORTAL+'/health/ready')
    client=httpx.Client(base_url=API,trust_env=False,timeout=30)
    result=client.post('/api/v1/setup',headers={'X-Setup-Token':env['SETUP_TOKEN']},json={'admin_name':'Administração sintética','admin_email':'admin@example.com','admin_password':PASSWORD,'company_name':'Mantenedora sintética','school_name':'Escola dos encontros','academic_year':2026});assert result.status_code==201,result.text
    auth=client.post('/api/v1/auth/login',json={'email':'admin@example.com','password':PASSWORD}).json()
    headers={'Authorization':'Bearer '+auth['access_token']};school=client.get('/api/v1/schools',headers=headers).json()[0];base='/api/v1/schools/'+school['id']
    def call(method,path,data=None):
        r=client.request(method,base+path,headers=headers,json=data);assert r.is_success,(path,r.text);return r.json()
    identity=client.get('/api/v1/institution/identity').json()
    brand='Colégio Horizonte Vivo';primary='#A12255'
    payload={key:identity[key] for key in ('version','display_name','short_name','primary_color','secondary_color','font_family')}
    payload.update(display_name=brand,short_name='Horizonte',primary_color=primary,secondary_color='#223344',font_family='georgia')
    logo=io.BytesIO();Image.new('RGBA',(80,40),(161,34,85,255)).save(logo,'PNG')
    result=client.put('/api/v1/institution/identity',headers=headers,data={'payload':json.dumps(payload)},files={'logo':('logo.png',logo.getvalue(),'image/png')});assert result.status_code==200,result.text
    identity=result.json()
    subprocess.run([sys.executable,'-c',"from app.db import SessionLocal,now;from app.models import LoginAttempt;from app.security import digest\nwith SessionLocal.begin() as db:db.add(LoginAttempt(key=digest('ip:198.51.100.73'),count=80,window_started=now()))"],cwd=ROOT/'backend',env=env,check=True,stdout=log,stderr=log)
    bad_login={'email':'synthetic-rate@example.com','password':PASSWORD}
    rate_headers={'Origin':PORTAL,'X-CSRF-Protection':'1','X-Forwarded-For':'198.51.100.73'}
    assert httpx.post(PORTAL+'/api/v1/auth/login',json=bad_login,headers=rate_headers,trust_env=False).status_code==429
    rate_headers.update({'X-Forwarded-For':'198.51.100.74','X-Pige-Portal-IP':'198.51.100.73','X-Pige-Portal-Signature':'f'*64})
    assert httpx.post(PORTAL+'/api/v1/auth/login',json=bad_login,headers=rate_headers,trust_env=False).status_code==401
    record('Proxy assina IP do salto confiável: bloqueio de um cliente não atinge outro e headers internos forjados são descartados')
    students=[call('POST','/students',{'person':{'name':name,'birth_date':'2016-05-15'}}) for name in ['Aluno Horizonte','Aluna Aurora']]
    guardian=call('POST','/persons',{'name':'Responsável dos encontros','is_guardian':True,'phone':'5575999990000'})
    links=[call('POST','/students/'+student['id']+'/guardians',{'person_id':guardian['id'],'legal':True,'financial':True}) for student in students]
    with sync_playwright() as p:
        executable=os.environ.get('PIGE_CHROMIUM_EXECUTABLE')
        browser=p.chromium.launch(headless=True,**({'executable_path':executable} if executable else {}))
        admin=browser.new_page(viewport={'width':1365,'height':1000});admin.on('pageerror',lambda e:errors.append(str(e)))
        admin.goto(API);admin.get_by_label('E-mail',exact=True).fill('admin@example.com');admin.get_by_label('Senha',exact=True).fill(PASSWORD);admin.get_by_role('button',name='Entrar na aplicação').click()
        expect(admin.locator('.app-root')).to_have_attribute('aria-busy','false')
        admin.get_by_label('Selecionar escola',exact=True).select_option(school['id'])
        expect(admin.locator('.app-root')).to_have_attribute('aria-busy','false')
        admin.locator('aside a[href="#/users"]').click();workspace=admin.locator('.users-workspace');expect(workspace).to_be_visible()
        workspace.get_by_role('button',name='+ Criar usuário',exact=True).click()
        workspace.get_by_label('Nome',exact=True).fill('Responsável dos encontros');workspace.get_by_label('E-mail',exact=True).fill('family-access@example.com')
        workspace.get_by_label(re.compile('^Perfil base')).select_option('guardian')
        workspace.get_by_label('Buscar pessoa',exact=True).fill('Responsável dos encontros');workspace.get_by_role('button',name='Pesquisar',exact=True).click()
        workspace.get_by_label(re.compile('^Selecionar pessoa')).select_option(guardian['id']);workspace.get_by_role('button',name='Salvar acesso',exact=True).click()
        card=workspace.locator('.access-user-card').filter(has_text='family-access@example.com');expect(card).to_be_visible();expect(card.get_by_text('Enfileirado',exact=False)).to_be_visible()
        record('Cadastro pela UI cria usuário, vínculo, convite e outbox sem senha inicial')
        subprocess.run([sys.executable,'-m','app.integration_worker','--once','--limit','10'],cwd=ROOT/'backend',env=env,check=True,stdout=log,stderr=log,timeout=40)
        message=BytesParser(policy=policy.default).parsebytes(messages.get(timeout=10));assert message['To']=='family-access@example.com'
        assert str(message['Subject'])==brand+' · Primeiro acesso'
        text=message.get_body(preferencelist=('plain',)).get_content();link=re.search(r'http://[^\s]+/first-access.html#[A-Za-z0-9_-]+',text).group(0);assert link.startswith(PORTAL+'/')
        assert 'Senha temporária' not in text and PASSWORD not in text
        record('SMTP TLS capturador aceita convite em User.email e preserva o domínio público configurado')
        family=browser.new_page(viewport={'width':1365,'height':1000});family.on('pageerror',lambda e:errors.append(str(e)))
        family.goto(link);expect(family.locator('#invite-form')).to_be_visible();assert '#' not in family.url
        expect(family.locator('#institution-name')).to_have_text(brand)
        expect(family).to_have_title(brand+' · Primeiro acesso')
        family.wait_for_function('document.querySelector("#institution-logo").naturalWidth>0')
        cookies=[cookie for cookie in family.context.cookies(PORTAL+'/api/v1/invitations/inspect') if cookie['name'].startswith('pige_invitation_')]
        assert len(cookies)==1 and cookies[0]['httpOnly'] and cookies[0]['sameSite']=='Strict' and cookies[0]['path']=='/api/v1/invitations'
        assert family.evaluate('localStorage.length===0&&sessionStorage.length===0')
        family.reload();expect(family.locator('#invite-form')).to_be_visible();assert '#' not in family.url
        expect(family.locator('#institution-name')).to_have_text(brand)
        record('Primeiro acesso mantém identidade e convite após refresh sem token em URL ou armazenamento JavaScript')
        family.get_by_label('Nova senha',exact=True).fill(PASSWORD);family.get_by_label('Confirme a senha',exact=True).fill(PASSWORD);family.get_by_role('button',name='Definir senha',exact=True).click();expect(family.get_by_text('Senha definida.',exact=False)).to_be_visible()
        def family_nav(name):
            target=family.locator('#family-navigation').get_by_role('button',name=name,exact=True)
            if not target.is_visible():
                family.get_by_role('button',name='Abrir menu',exact=True).click()
                expect(family.locator('#family-menu-toggle')).to_have_attribute('aria-expanded','true')
                expect(family.locator('.family-main')).to_have_attribute('inert','')
                expect(family.get_by_role('button',name='Fechar menu',exact=True)).to_be_focused()
            target.click()
            expect(family.locator('#family-title')).to_have_text(name)
            expect(family.locator('.family-main')).not_to_have_attribute('inert','')
        family.get_by_role('link',name='Ir para o login',exact=True).click();family.get_by_label('E-mail',exact=True).fill('family-access@example.com');family.get_by_label('Senha',exact=True).fill(PASSWORD);family.get_by_role('button',name='Entrar no portal',exact=True).click();expect(family.get_by_role('heading',name='Olá, Responsável.',exact=True)).to_be_visible()
        expect(family.locator('.family-header-school')).to_contain_text(brand)
        expect(family).to_have_title(brand+' · Portal do aluno e responsável')
        family.wait_for_function('document.querySelector(".family-sidebar-brand img").naturalWidth>0')
        active_nav=family.locator('#family-navigation [aria-current=page]')
        assert active_nav.evaluate('(el)=>getComputedStyle(el).color')=='rgb(161, 34, 85)'
        assert active_nav.evaluate('''(el, primary) => {
            const expected=document.createElement('span');expected.style.backgroundColor=`color-mix(in srgb,${primary} 10%,var(--surface,#fff))`;
            el.append(expected);const matches=getComputedStyle(el).backgroundColor===getComputedStyle(expected).backgroundColor;
            expected.remove();return matches;
        }''',primary),'Menu ativo deve herdar a cor canônica com o tratamento tonal do shell'
        assert 'Georgia' in family.locator('h1').evaluate('(el)=>getComputedStyle(el).fontFamily')
        assert httpx.get(PORTAL+identity['logo_url'],trust_env=False).status_code==200
        assert httpx.get(PORTAL+'/api/v1/institution/icon.png?size=32',trust_env=False).content.startswith(b'\x89PNG')
        manifest=httpx.get(PORTAL+'/manifest.webmanifest',trust_env=False).json()
        assert manifest['name']==brand and manifest['theme_color']==primary and all('/#/' not in item['url'] for item in manifest['shortcuts'])
        expect(family.get_by_label('Você está acompanhando',exact=True).locator('option')).to_have_count(2)
        family_nav('Vida acadêmica')
        learning=family.locator('.learning-workspace');expect(learning).to_have_attribute('aria-busy','false')
        expect(learning.get_by_label('Aluno',exact=False)).to_have_count(0)
        family.get_by_label('Você está acompanhando',exact=True).select_option(students[0]['id'])
        expect(learning.locator('.learning-student-name')).to_have_text('Aluno Horizonte')
        family.get_by_label('Você está acompanhando',exact=True).select_option(students[1]['id'])
        expect(learning.locator('.learning-student-name')).to_have_text('Aluna Aurora')
        family.get_by_label('Você está acompanhando',exact=True).select_option(students[1]['id']);family_nav('Documentos');family.reload();expect(family.get_by_role('heading',name='Documentos de Aluna Aurora',exact=True)).to_be_visible()
        expect(family.get_by_label('Você está acompanhando',exact=True)).to_have_value(students[1]['id'])
        family.screenshot(path=str(OUT/'portal-desktop.png'),full_page=True)
        family.set_viewport_size({'width':390,'height':844});family.screenshot(path=str(OUT/'portal-mobile.png'),full_page=True)
        assert family.evaluate('document.documentElement.scrollWidth<=innerWidth')
        record('Convite consumido pela UI, login correto, dois dependentes, deep link e refresh em portal próprio responsivo')
        assert httpx.get(PORTAL+'/api/v1/backups',trust_env=False).status_code==404
        assert httpx.post(PORTAL+'/api/v1/auth/login',headers={'Origin':'https://evil.example','X-CSRF-Protection':'1'},json={},trust_env=False).status_code==403
        record('Proxy bloqueia API administrativa, origem estranha e dados fora da superfície privada')
        family.get_by_role('button',name='Sair do portal',exact=True).click();expect(family.get_by_role('button',name='Entrar no portal',exact=True)).to_be_visible();family.reload();expect(family.get_by_role('button',name='Entrar no portal',exact=True)).to_be_visible()
        record('Logout revoga sessão e refresh não restaura acesso encerrado')
        student_user=call('POST','/users',{'name':'Aluno Horizonte','email':'student-access@example.com','password':PASSWORD,'role':'student','person_id':students[0]['person_id']})
        family.get_by_label('E-mail',exact=True).fill('student-access@example.com');family.get_by_label('Senha',exact=True).fill(PASSWORD);family.get_by_role('button',name='Entrar no portal',exact=True).click()
        expect(family.get_by_label('Você está acompanhando',exact=True).locator('option')).to_have_count(1)
        family_nav('Financeiro');expect(family.get_by_text('Seu vínculo não autoriza',exact=False)).to_be_visible()
        family.get_by_role('button',name='Sair do portal',exact=True).click()
        family.get_by_label('E-mail',exact=True).fill('family-access@example.com');family.get_by_label('Senha',exact=True).fill(PASSWORD);family.get_by_role('button',name='Entrar no portal',exact=True).click()
        for index in [1,0]:
            call('PATCH','/students/'+students[index]['id']+'/guardians/'+links[index]['id'],{'version':links[index]['version'],'data':{'person_id':guardian['id'],'legal':True,'financial':True,'active':False}})
            family.get_by_role('button',name='Atualizar',exact=True).click()
            if index==1:expect(family.get_by_label('Você está acompanhando',exact=True).locator('option')).to_have_count(1)
            else:expect(family.get_by_role('heading',name='Nenhum aluno disponível')).to_be_visible()
        record('Aluno acessa somente seu perfil; responsável passa de dois dependentes para um e nenhum após revogações ativas')

        call('PUT','/website',{'enabled':True,'theme':'horizon','headline':'Educação que aproxima','introduction':'Um futuro de descobertas.','about':'Comunidade escolar sintética.','public_url':'https://school.example.test','portal_url':'https://portal.example.test'})
        call('POST','/community-posts',{'title':'Notícia aberta sintética','content':'Somente publicação aprovada.','audience':'public','status':'published'})
        call('POST','/community-posts',{'title':'Mensagem privada invisível','content':'Não publicar no site.','audience':'guardians','status':'published'})
        # O servidor do site usa porta 8080 por padrão; módulo importado preserva o código real.
        site_script="import sys;sys.path.insert(0,'services/website');from server import Handler,ThreadingHTTPServer;ThreadingHTTPServer(('127.0.0.1',int(sys.argv[1])),Handler).serve_forever()"
        spawn([sys.executable,'-c',site_script,str(SITE_PORT)],{'PIGE_INTERNAL_URL':API,'WEBSITE_SCHOOL_ID':school['id']})
        wait(SITE+'/health/ready');site=browser.new_page(viewport={'width':1280,'height':900});site.on('pageerror',lambda e:errors.append(str(e)))
        for theme in ['horizon','editorial','campus','culture']:
            cfg=call('GET','/website')['configuration'];call('PUT','/website',{**{k:cfg[k] for k in ['enabled','headline','introduction','about','public_url','portal_url','notice']},'version':cfg['version'],'theme':theme})
            site.goto(SITE);expect(site.get_by_role('heading',name='Educação que aproxima')).to_be_visible();expect(site.get_by_role('heading',name='Notícia aberta sintética')).to_be_visible();expect(site.get_by_text('Mensagem privada invisível')).to_have_count(0)
            expect(site).to_have_title(brand);expect(site.locator('footer strong')).to_have_text(brand)
            assert site.locator('header img.logo').evaluate('(img)=>img.complete&&img.naturalWidth>0')
            assert 'Georgia' in site.locator('h1').evaluate('(el)=>getComputedStyle(el).fontFamily')
            assert site.locator('html').evaluate('(el)=>getComputedStyle(el).getPropertyValue("--primary").trim()')==primary
            assert httpx.get(SITE+identity['logo_url'],trust_env=False).status_code==200
            assert httpx.get(SITE+'/api/v1/institution/icon.png?size=32',trust_env=False).content.startswith(b'\x89PNG')
            manifest=httpx.get(SITE+'/manifest.webmanifest',trust_env=False).json()
            assert manifest['name']==brand and manifest['theme_color']==primary and manifest['display']=='browser'
            site.screenshot(path=str(OUT/('site-'+theme+'.png')),full_page=True)
        record('Quatro modelos preservam layout e usam nome, logo, cores, fonte, favicon e manifest canônicos; conteúdo privado continua ausente')
        # Sem o núcleo, superfícies falham de forma isolada e sem sucesso fictício.
        processes[0].terminate();processes[0].wait(timeout=10)
        assert httpx.get(PORTAL+'/health/ready',trust_env=False).status_code==503
        assert httpx.get(SITE,trust_env=False).status_code==503
        record('Indisponibilidade da API produz falha explícita nos serviços independentes')
        assert not errors,errors
        browser.close()
finally:
    for process in reversed(processes):
        if process.poll() is None:process.terminate()
        try:process.wait(timeout=10)
        except subprocess.TimeoutExpired:process.kill()
    smtp.shutdown();smtp.server_close();log.close()
    (OUT/'results.json').write_text(json.dumps({'checks':checks,'page_errors':errors,'external_email_sent':False,'data':'synthetic','api':API,'portal':PORTAL,'website':SITE},ensure_ascii=False,indent=2)+'\n')
    shutil.rmtree(TEMP,ignore_errors=True)
