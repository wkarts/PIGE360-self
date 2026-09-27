#!/usr/bin/env python3
"""OCR real em worker separado; APIs públicas substituídas somente por cache sintético."""
import io, json, os, shutil, socket, subprocess, sys, tempfile, time
from pathlib import Path
from datetime import date, timedelta
import httpx
from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'evidence/0.3.0/assisted';OUT.mkdir(parents=True,exist_ok=True)
TEMP=Path(tempfile.mkdtemp(prefix='school-assisted-'))
with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
URL=f'http://127.0.0.1:{port}';PASSWORD='Synthetic-Assisted-2026!';BRIDGE=os.getenv('PIGE_UI_BRIDGE')=='1'
env={**os.environ,'PYTHONPATH':str(ROOT/'backend'),'DATABASE_URL':'sqlite:///'+str(TEMP/'db.sqlite'),'ALLOW_SQLITE':'true','APP_ENV':'test','APP_URL':URL,'ALLOWED_HOSTS':'localhost,127.0.0.1','APP_SECRET_KEY':'synthetic-assisted-only-012345678901234567890123456','SETUP_TOKEN':'synthetic-setup-only-01234567890123456789','STORAGE_PATH':str(TEMP/'files'),'FRONTEND_PATH':str(ROOT/'frontend/dist'),'COOKIE_SECURE':'false','EMBED_ALLOWED_ORIGINS':''}
subprocess.run([sys.executable,'-m','alembic','upgrade','head'],cwd=ROOT/'backend',env=env,check=True)
log=(OUT/'server.log').open('w');processes=[];checks=[];errors=[]
processes.append(subprocess.Popen([sys.executable,'-m','uvicorn','app.main:app','--host','127.0.0.1','--port',str(port)],cwd=ROOT/'backend',env=env,stdout=log,stderr=log))
processes.append(subprocess.Popen([sys.executable,'-m','app.ocr_worker'],cwd=ROOT/'backend',env=env,stdout=log,stderr=log))
image=Image.new('RGB',(1400,800),'white');draw=ImageDraw.Draw(image)
try:font=ImageFont.truetype('DejaVuSans.ttf',40)
except OSError:font=ImageFont.load_default(size=40)
for i,text in enumerate(['DOCUMENTO FICTICIO PARA TESTES','NOME: PESSOA EXEMPLO','CPF: 529.982.247-25','DATA DE NASCIMENTO: 15/05/2000','CEP: 40020-000']):draw.text((70,70+i*110),text,font=font,fill='black')
buf=io.BytesIO();image.save(buf,format='PNG');raw=buf.getvalue()
def record(msg):checks.append(msg);print('PASS:',msg,flush=True)
page=None
try:
    client=httpx.Client(base_url=URL,timeout=30)
    for _ in range(80):
        try:
            if client.get('/health/ready').status_code==200:break
        except httpx.HTTPError:pass
        time.sleep(.1)
    r=client.post('/api/v1/setup',headers={'X-Setup-Token':env['SETUP_TOKEN']},json={'admin_name':'Secretaria Exemplo','admin_email':'assist@example.com','admin_password':PASSWORD,'company_name':'Mantenedora Exemplo','school_name':'Colégio Exemplo','academic_year':2026});assert r.status_code==201,r.text
    auth=client.post('/api/v1/auth/login',json={'email':'assist@example.com','password':PASSWORD}).json();headers={'Authorization':'Bearer '+auth['access_token'],'X-CSRF-Protection':'1'}
    school=client.get('/api/v1/schools',headers=headers).json()[0];base='/api/v1/schools/'+school['id']
    # Fixtures conhecidas no cache: nenhuma chamada pública ou alteração de clientes reais.
    subprocess.run([sys.executable,'-c',"""
from app.db import SessionLocal,now
from app.assisted_models import LookupCache
from datetime import timedelta
with SessionLocal.begin() as db:
 for key,data in [('cnpj:11222333000181',{'cnpj':'11222333000181','name':'Papelaria Exemplo','trade_name':'Papelaria Teste','street':'Rua Teste','city':'Salvador','state':'BA','postal_code':'40020000','address':'Rua Teste, Salvador, BA','registration_status':'ATIVA','main_activity':'Papelaria'}),('cep:40020000',{'postal_code':'40020000','street':'Rua Teste','city':'Salvador','state':'BA','address':'Rua Teste, Salvador, BA'})]:
  db.add(LookupCache(key=key,data=data,provider='fixture-local',fetched_at=now(),expires_at=now()+timedelta(hours=1)))
"""],cwd=ROOT/'backend',env=env,check=True)
    with sync_playwright() as pw:
        binary=os.getenv('CHROMIUM_PATH') or (None if Path(pw.chromium.executable_path).exists() else shutil.which('chromium'))
        browser=pw.chromium.launch(headless=True,**({'executable_path':binary} if binary else {}),args=['--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'])
        ctx=browser.new_context(viewport={'width':1440,'height':1000},locale='pt-BR');page=ctx.new_page();page.set_default_timeout(12000);page.on('pageerror',lambda e:errors.append(str(e)))
        if BRIDGE:
            from ui_bridge import install
            install(page,ROOT,URL,OUT)
        else:page.goto(URL)
        page.get_by_label('E-mail',exact=True).fill('assist@example.com');page.get_by_label('Senha',exact=True).fill(PASSWORD);page.get_by_role('button',name='Entrar na aplicação').click()
        expect(page.locator('.workspace')).to_be_visible()
        def nav(name):
            expect(page.locator('.app-root')).to_have_attribute('aria-busy','false')
            b=page.get_by_role('button',name='Cadastros',exact=True)
            if name in ['Cadastro único','Alunos'] and b.get_attribute('aria-expanded')=='false':b.click()
            page.locator('aside').get_by_role('link',name=name,exact=True).click()
        def dialog():return page.get_by_role('dialog')
        def apply(panel):
            panel.get_by_label('Conferi os dados',exact=False).check();panel.get_by_role('button',name='Aplicar campos selecionados',exact=True).click()
        nav('Cadastro único');page.get_by_role('button',name='+ Nova pessoa',exact=True).click()
        dialog().locator('#modal-field-entity_kind').select_option('organization');assist=dialog().locator('.assist').first
        assist.get_by_role('button',name='Consultar CNPJ',exact=True).click();assist.get_by_label('CNPJ',exact=True).fill('11222333000181');assist.get_by_role('button',name='Consultar',exact=True).click()
        expect(assist.locator('.assist-review')).to_be_visible();assert client.get(base+'/persons?q=Papelaria',headers=headers).json()['total']==0
        apply(assist);assert dialog().locator('#modal-field-name').input_value()=='Papelaria Exemplo'
        page.screenshot(path=str(OUT/'01-consulta-cnpj.png'))
        dialog().get_by_role('button',name='Salvar',exact=True).click();expect(dialog()).to_have_count(0)
        assert client.get(base+'/persons?q=Papelaria',headers=headers).json()['items'][0]['registration_status']=='ATIVA'
        record('Consulta CNPJ via cache só preenche após conferência e persiste no cadastro PJ completo')
        nav('Alunos');page.get_by_role('button',name='+ Novo aluno',exact=True).click()
        dialog().locator('#modal-field-name').fill('Nome Mantido Manualmente');assist=dialog().locator('.assist').first
        assist.get_by_role('button',name='Ler documento',exact=True).click()
        assist.locator('input[type=file]').set_input_files({'name':'documento.png','mimeType':'image/png','buffer':raw})
        expect(assist.locator('.assist-review')).to_be_visible(timeout=90000)
        expect(assist.get_by_label('Nome / razão social',exact=False)).not_to_be_checked()
        page.screenshot(path=str(OUT/'02a-ocr-leitura.png'))
        apply(assist);assert dialog().locator('#modal-field-name').input_value()=='Nome Mantido Manualmente'
        assert dialog().locator('#modal-field-cpf').input_value()=='52998224725'
        assert dialog().locator('#modal-field-birth_date').input_value()=='2000-05-15'
        record('Imagem sintética reconhecida por Tesseract/português no worker real sem sobrescrever o nome digitado')
        assist.get_by_role('button',name='Consultar CEP',exact=True).click();assist.get_by_role('button',name='Consultar',exact=True).click();expect(assist.locator('.assist-review')).to_be_visible();apply(assist)
        assert dialog().locator('#modal-field-city').input_value()=='Salvador'
        page.screenshot(path=str(OUT/'02-ocr-cadastro-desktop.png'));page.set_viewport_size({'width':390,'height':844})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1');page.screenshot(path=str(OUT/'03-ocr-mobile.png'))
        dialog().get_by_role('button',name='Salvar',exact=True).click();expect(dialog()).to_have_count(0)
        assert client.get(base+'/persons?q=Nome Mantido',headers=headers).json()['items'][0]['city']=='Salvador'
        record('CEP complementa endereço sem inventar número e ficha responsiva salva dados conferidos')
        page.set_viewport_size({'width':1440,'height':1000});nav('Instituição');page.get_by_role('button',name='Dados da mantenedora',exact=True).click()
        assist=dialog().locator('.assist');assist.get_by_role('button',name='Consultar CNPJ',exact=True).click();assist.get_by_label('CNPJ',exact=True).fill('11222333000181');assist.get_by_role('button',name='Consultar',exact=True).click();expect(assist.locator('.assist-review')).to_be_visible();apply(assist)
        assert dialog().locator('#modal-field-document').input_value()=='11222333000181';dialog().get_by_role('button',name='Salvar',exact=True).click();expect(dialog()).to_have_count(0)
        record('Mantenedora também consulta CNPJ e mantém os dados sem criar outra empresa')
        nav('Cadastro único');page.get_by_role('button',name='+ Nova pessoa',exact=True).click();assist=dialog().locator('.assist').first
        assist.get_by_role('button',name='Ler documento',exact=True).click()
        if not BRIDGE:
            assist.get_by_role('button',name='Abrir câmera com guia',exact=True).click();expect(assist.locator('video')).to_be_visible()
            page.evaluate("window.testTrack=document.querySelector('.assist video').srcObject.getTracks()[0]")
            assist.get_by_role('button',name='Cancelar câmera',exact=True).click();assert page.evaluate("window.testTrack.readyState==='ended'")
            record('Captura com câmera sintética nativa respeita a política e encerra a trilha ao cancelar')
        assist.get_by_role('button',name='Fechar / descartar leitura',exact=True).click();dialog().get_by_role('button',name='Cancelar',exact=True).click();expect(dialog()).to_have_count(0)
        # Portal: o mesmo documento já anexado é lido para a conta certa, sem novo upload.
        def post(path,data):
            r=client.post(base+path,headers=headers,json=data);assert r.is_success,r.text;return r.json()
        unit=client.get(base+'/units',headers=headers).json()[0];year=client.get(base+'/academic-years',headers=headers).json()[0]
        grade=post('/grades',{'name':'Etapa Teste'});shift=post('/shifts',{'name':'Matutino'})
        group=post('/class-groups',{'name':'Turma Exemplo','unit_id':unit['id'],'academic_year_id':year['id'],'grade_id':grade['id'],'shift_id':shift['id'],'capacity':30})
        dt=post('/document-types',{'name':'Identidade do responsável'})
        campaign=post('/admission-campaigns',{'slug':'ocr-matriculas-teste','title':'Matrícula assistida de teste','class_group_ids':[group['id']],'opens_on':str(date.today()-timedelta(days=1)),'closes_on':str(date.today()+timedelta(days=30)),'active':True,'require_verified_contact':False,'privacy_notice':'Ambiente de teste com dados inteiramente fictícios. Documentos e campos serão conferidos pela Secretaria antes da aprovação.'})
        parent_http=httpx.Client(base_url=URL,headers={'X-CSRF-Protection':'1'})
        r=parent_http.post('/api/v1/portal/register',json={'campaign_slug':campaign['slug'],'name':'Responsável Portal Exemplo','email':'portal-ocr@example.com','password':PASSWORD,'phone':'75999990000','accept_privacy':True,'terms_version':'1'});assert r.status_code==201,r.text
        r=parent_http.post('/api/v1/portal/admissions',json={'campaign_id':campaign['id'],'class_group_id':group['id'],'client_key':'synthetic-enrollment-ocr','student':{'name':'Aluna Exemplo','birth_date':'2017-04-10'},'relationship':'Mãe'});assert r.status_code==201,r.text
        admission=r.json()
        r=parent_http.post('/api/v1/portal/admissions/'+admission['id']+'/attachments',data={'version':admission['version'],'document_type_id':dt['id']},files={'file':('identidade-responsavel.png',raw,'image/png')});assert r.status_code==201,r.text
        parent_context=browser.new_context(viewport={'width':1366,'height':1000},locale='pt-BR');page=parent_context.new_page();page.set_default_timeout(12000);page.on('pageerror',lambda e:errors.append(str(e)))
        if BRIDGE:
            from ui_bridge import install
            install(page,ROOT,URL,OUT,entry='portal',campaign=campaign['slug'])
        else:page.goto(URL+'/online.html?campaign='+campaign['slug'])
        page.get_by_label('E-mail',exact=True).fill('portal-ocr@example.com');page.get_by_label('Senha',exact=True).fill(PASSWORD);page.get_by_role('button',name='Entrar no portal',exact=True).click()
        page.get_by_role('button').filter(has_text='Aluna Exemplo').click();page.get_by_role('button',name='Ler para responsável',exact=True).click()
        profile=page.locator('#portal-profile');assist=profile.locator('.assist');expect(assist.locator('.assist-review')).to_be_visible(timeout=90000)
        expect(assist.locator('.assist-heading')).to_contain_text('responsável desta conta')
        apply(assist);profile.get_by_role('button',name='Salvar meus dados',exact=True).click()
        expect(page.locator('.portal-working')).to_have_count(0)
        data=parent_http.get('/api/v1/portal/me').json();assert data['birth_date']=='2000-05-15' and data['cpf']=='52998224725'
        child=parent_http.get('/api/v1/portal/admissions/'+admission['id']).json()['student_data'];assert child['birth_date']=='2017-04-10' and child['name']=='Aluna Exemplo'
        page.screenshot(path=str(OUT/'04-portal-documento-responsavel.png'))
        record('Portal reaproveita anexo privado e preenche a identidade do responsável sem modificar o aluno')
        page.get_by_role('button',name='Editar dados',exact=True).click();assist=page.locator('section').filter(has=page.get_by_role('heading',name='Dados do aluno',exact=True)).last.locator('.assist')
        assist.get_by_role('button',name='Consultar CEP',exact=True).click();assist.get_by_label('CEP',exact=True).fill('40020000');assist.get_by_role('button',name='Consultar',exact=True).click();expect(assist.locator('.assist-review')).to_be_visible();apply(assist)
        page.get_by_role('button',name='Salvar dados do aluno',exact=True).click();expect(page.get_by_role('heading',name='Documentação',exact=True)).to_be_visible()
        child=parent_http.get('/api/v1/portal/admissions/'+admission['id']).json()['student_data'];assert child['city']=='Salvador' and child['birth_date']=='2017-04-10'
        record('Consulta de CEP também funciona no rascunho da matrícula do portal')
        parent_http.close()
        assert not errors,errors
        browser.close()
    record('Nenhum erro JavaScript nos fluxos exercitados')
    (OUT/'result.json').write_text(json.dumps({'status':'passed','checks':checks,'mode':'explicit_ui_bridge' if BRIDGE else 'http_e2e','ocr':'Tesseract real em subprocesso de worker separado','external_apis':'fixtures em cache, sem consultas reais','camera':'não validada' if BRIDGE else 'dispositivo sintético Chromium','real_documents_tested':False,'errors':errors},ensure_ascii=False,indent=2))
except Exception:
    if page:
        try:page.screenshot(path=str(OUT/'failure.png'))
        except Exception:pass
    raise
finally:
    for proc in reversed(processes):
        proc.terminate()
        try:proc.wait(timeout=15)
        except subprocess.TimeoutExpired:proc.kill();proc.wait()
    log.close();shutil.rmtree(TEMP,ignore_errors=True)
