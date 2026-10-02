#!/usr/bin/env python3
"""Portal sem campanha, autenticação e diagnóstico no Chromium HTTP real."""
import io,json,os,re,socket,subprocess,sys,tempfile,time,zipfile,shutil
from pathlib import Path
from datetime import date,timedelta
import httpx
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
OUT=Path(os.getenv('PIGE_E2E_OUT', str(ROOT/'evidence/0.3.0/diagnostics')));OUT.mkdir(parents=True,exist_ok=True)
TEMP=Path(tempfile.mkdtemp(prefix='school-diagnostics-'))
with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
URL=f'http://127.0.0.1:{port}';password='Synthetic-Diagnostics-Password-2026!'
env={**os.environ,'PYTHONPATH':str(ROOT/'backend'),'DATABASE_URL':'sqlite:///'+str(TEMP/'test.db'),'ALLOW_SQLITE':'true',
     'APP_ENV':'test','APP_URL':URL,'ALLOWED_HOSTS':'localhost,127.0.0.1','APP_SECRET_KEY':'synthetic-only-diagnostics-secret-key-0123456789',
     'SETUP_TOKEN':'synthetic-only-setup-token-0123456789','STORAGE_PATH':str(TEMP/'documents'),'FRONTEND_PATH':str(ROOT/'frontend/dist'),'COOKIE_SECURE':'false'}
subprocess.run([sys.executable,'-m','alembic','upgrade','head'],cwd=ROOT/'backend',env=env,check=True)
log=(OUT/'server.log').open('w');proc=subprocess.Popen([sys.executable,'-m','uvicorn','app.main:app','--host','127.0.0.1','--port',str(port),'--no-access-log'],cwd=ROOT/'backend',env=env,stdout=log,stderr=log)
checks=[];errors=[];page=None

def record(value):checks.append(value);print('PASS:',value,flush=True)
try:
    client=httpx.Client(base_url=URL,timeout=30)
    for _ in range(80):
        try:
            if client.get('/health/ready').status_code==200:break
        except httpx.HTTPError:pass
        time.sleep(.1)
    r=client.post('/api/v1/setup',headers={'X-Setup-Token':env['SETUP_TOKEN']},json={
        'admin_name':'Administrador Teste','admin_email':'admin@example.com','admin_password':password,
        'company_name':'Mantenedora Exemplo','school_name':'Colégio Exemplo','academic_year':date.today().year})
    assert r.status_code==201,r.text
    token=client.post('/api/v1/auth/login',json={'email':'admin@example.com','password':password}).json()['access_token']
    admin={'Authorization':'Bearer '+token};school=client.get('/api/v1/schools',headers=admin).json()[0];sid=school['id'];base='/api/v1/schools/'+sid
    with sync_playwright() as pw:
        binary=os.getenv('CHROMIUM_PATH') or (None if Path(pw.chromium.executable_path).exists() else shutil.which('chromium'))
        browser=pw.chromium.launch(headless=True,**({'executable_path':binary} if binary else {}),args=['--no-sandbox']);context=browser.new_context(viewport={'width':1440,'height':1000},accept_downloads=True,locale='pt-BR',timezone_id='America/Bahia')
        page=context.new_page();page.set_default_timeout(12000);page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(URL+'/online.html',wait_until='networkidle')
        expect(page.get_by_text('Não há processo de matrícula aberto neste momento.',exact=False)).to_be_visible()
        expect(page.get_by_role('button',name='Entrar no portal',exact=True)).to_be_enabled()
        expect(page.get_by_role('button',name='Criar minha conta',exact=True)).to_be_enabled()
        assert page.locator('select').count()==0
        page.get_by_role('button',name='Criar minha conta',exact=True).click()
        expect(page.get_by_role('heading',name='Criar acesso para uma família já matriculada',exact=True)).to_be_visible()
        expect(page.get_by_text('Aviso de privacidade',exact=False).last).to_be_visible()
        expect(page.get_by_role('button',name='Criar conta do responsável',exact=True)).to_be_enabled()
        page.screenshot(path=str(OUT/'01-portal-sem-processo.png'),full_page=True)
        record('Sem campanha, responsável pode iniciar cadastro familiar com aviso vigente e sem criar pré-matrícula.')
        page.get_by_role('button',name='Entrar',exact=True).click()
        # Criar oferta por API administrativa; publicar requer decisão explícita, não bootstrap oculto.
        def post(path,data):
            r=client.post(base+path,headers=admin,json=data);assert r.status_code==201,r.text;return r.json()
        units=client.get(base+'/units',headers=admin).json();years=client.get(base+'/academic-years',headers=admin).json()
        grade=post('/grades',{'name':'1º Ano'});shift=post('/shifts',{'name':'Matutino'})
        group=post('/class-groups',{'name':'Turma Exemplo','unit_id':units[0]['id'],'academic_year_id':years[0]['id'],'grade_id':grade['id'],'shift_id':shift['id'],'capacity':30})
        payload={'title':'Matrícula de Teste','slug':'matricula-de-teste','opens_on':str(date.today()-timedelta(days=2)),'closes_on':str(date.today()+timedelta(days=2)),
                 'class_group_ids':[group['id']],'privacy_notice':'Aviso de privacidade sintético para testes automatizados da matrícula online.','terms_version':'1','active':True,'require_verified_contact':False}
        campaign=post('/admission-campaigns',payload)
        r=client.post('/api/v1/portal/register',headers={'X-CSRF-Protection':'1'},json={'campaign_slug':campaign['slug'],'email':'parent@example.com','password':password,'name':'Responsável Teste','accept_privacy':True,'terms_version':'1'});assert r.status_code==201,r.text
        r=client.patch(base+'/admission-campaigns/'+campaign['id'],headers=admin,json={**payload,'active':False,'version':campaign['version']});assert r.status_code==200,r.text
        page.get_by_label('E-mail',exact=True).fill('parent@example.com');page.get_by_label('Senha',exact=True).fill(password);page.get_by_role('button',name='Entrar no portal',exact=True).click()
        expect(page.get_by_role('heading',name='Minhas inscrições',exact=True)).to_be_visible()
        record('Conta existente entra sem processo aberto e mantém o acesso a suas inscrições.')
        page.get_by_role('button',name='Minha conta',exact=False).click();page.get_by_role('button',name='Sair',exact=True).click()
        page.goto(URL+'/',wait_until='networkidle')
        page.get_by_label('E-mail',exact=True).fill('admin@example.com');page.get_by_label('Senha',exact=True).fill(password);page.get_by_role('button',name='Entrar na aplicação',exact=False).click()
        expect(page.get_by_label('Selecionar escola')).to_be_enabled()
        expect(page.locator('.app-root')).to_have_attribute('aria-busy','false')
        page.get_by_role('link',name='Inscrições online',exact=True).click()
        expect(page.get_by_role('heading',name='Matrícula online · Configuração pendente')).to_be_visible()
        expect(page.get_by_text('Nenhum processo está disponível hoje.',exact=False)).to_be_visible()
        page.get_by_text('Conferir publicação e disponibilidade por processo',exact=True).click()
        expect(page.get_by_text('Não publicado',exact=False)).to_be_visible()
        page.screenshot(path=str(OUT/'02-configuracao-da-matricula.png'),full_page=True)
        record('Secretaria recebe diagnóstico do processo não publicado e acesso à configuração existente.')
        administration=page.get_by_role('button',name='Administração do sistema',exact=True)
        if administration.get_attribute('aria-expanded')!='true':administration.click()
        page.get_by_role('link',name='Diagnóstico',exact=True).click()
        expect(page.get_by_role('heading',name='Investigar eventos',exact=True)).to_be_visible()
        expect(page.get_by_role('heading',name='Serviços',exact=True)).to_be_visible()
        page.screenshot(path=str(OUT/'03-diagnostico.png'),full_page=True)
        with page.expect_download() as download:page.get_by_role('button',name='Baixar diagnóstico',exact=True).click()
        assert re.fullmatch(r'diagnostico-colegio-exemplo-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}-UTC-[a-f0-9]{6}\.zip',download.value.suggested_filename),download.value.suggested_filename
        path=OUT/'diagnostico-sintetico.zip';download.value.save_as(str(path))
        with zipfile.ZipFile(path) as z:
            assert 'events.jsonl' in z.namelist() and 'SHA256SUMS' in z.namelist()
            assert password.encode() not in b''.join(z.read(n) for n in z.namelist())
        record('Administrador consulta e exporta diagnóstico sem a senha sintética.')
        page.set_viewport_size({'width':390,'height':844});page.reload(wait_until='networkidle')
        expect(page.get_by_role('heading',name='Investigar eventos',exact=True)).to_be_visible()
        assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1')
        page.screenshot(path=str(OUT/'04-diagnostico-mobile.png'),full_page=True)
        record('Diagnóstico acessível em tela móvel sem transbordamento da janela.')
        page.set_viewport_size({'width':1440,'height':1000})
        if administration.get_attribute('aria-expanded')!='true':administration.click()
        page.get_by_role('link',name='Auditoria',exact=True).click()
        expect(page.get_by_role('heading',name='Histórico de operações',exact=True)).to_be_visible()
        page.get_by_role('combobox',name=re.compile(r'^Operação')).select_option('grades.created')
        page.get_by_role('button',name='Aplicar filtros',exact=True).click()
        expect(page.get_by_role('heading',name='1 operação encontrada',exact=True)).to_be_visible()
        page.get_by_role('button',name='Detalhes',exact=True).click()
        expect(page.get_by_text('Endereço de origem',exact=True)).to_be_visible()
        page.screenshot(path=str(OUT/'05-auditoria-desktop.png'),full_page=True)
        with page.expect_download() as audit_download:page.get_by_role('button',name='Exportar auditoria',exact=True).click()
        assert audit_download.value.suggested_filename.startswith('auditoria-colegio-exemplo-')
        path=OUT/'auditoria-sintetica.csv';audit_download.value.save_as(str(path))
        assert 'grades.created' in path.read_text(encoding='utf-8-sig')
        for width in (320,390,768):
            page.set_viewport_size({'width':width,'height':844})
            page.reload(wait_until='networkidle')
            expect(page.get_by_role('heading',name='Histórico de operações',exact=True)).to_be_visible()
            if width<=600:assert not page.locator('.admin-filter-panel').evaluate('(el)=>el.open')
            assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1')
            page.screenshot(path=str(OUT/f'06-auditoria-{width}.png'),full_page=True)
        record('Auditoria filtra a operação, mostra detalhes e exporta o recorte, responsiva de 320 a 1440 pixels.')
        # Falha HTTP não pode ser anunciada como ausência de processo.
        page.goto(URL+'/online.html',wait_until='networkidle')
        page.route('**/api/v1/portal/context',lambda route:route.fulfill(status=503,content_type='application/json',body='{"detail":"Indisponibilidade sintética"}'))
        page.reload(wait_until='networkidle')
        expect(page.get_by_role('button',name='Tentar novamente',exact=True)).to_be_visible()
        assert page.get_by_text('Não há processo de matrícula aberto neste momento.',exact=False).count()==0
        record('Falha de carregamento é diferenciada de inscrições encerradas, com nova tentativa.')
        assert not errors,errors
        browser.close()
    (OUT/'result.json').write_text(json.dumps({'status':'passed','checks':checks,'errors':errors,'mode':'chromium-http'},ensure_ascii=False,indent=2))
except BaseException:
    if page:
        try:page.screenshot(path=str(OUT/'failure.png'),full_page=True)
        except Exception:pass
    (OUT/'result.json').write_text(json.dumps({'status':'failed','checks':checks,'errors':errors,'mode':'chromium-http'},ensure_ascii=False,indent=2))
    raise
finally:
    proc.terminate()
    try:proc.wait(timeout=10)
    except subprocess.TimeoutExpired:proc.kill();proc.wait()
    log.close()
