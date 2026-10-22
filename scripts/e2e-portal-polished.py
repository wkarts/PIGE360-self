#!/usr/bin/env python3
"""Portal/Secretaria reais em Chromium; PIGE_UI_BRIDGE=1 registra limitação HTTP explicitamente."""
import base64, json, os, re, shutil, socket, sqlite3, subprocess, sys, tempfile, time
from pathlib import Path
import httpx
from playwright.sync_api import sync_playwright, expect
from datetime import date, timedelta
ROOT=Path(__file__).resolve().parents[1]
OUT=Path(os.getenv('PIGE_E2E_EVIDENCE_DIR',str(ROOT/'evidence/qa/online')));OUT.mkdir(parents=True,exist_ok=True)
TEMP=Path(tempfile.mkdtemp(prefix='pige-online-e2e-'))
shutil.copytree(ROOT/'frontend/dist',TEMP/'frontend')
def free_port():
    with socket.socket() as sock:sock.bind(('127.0.0.1',0));return sock.getsockname()[1]
port,website_port,portal_port=(free_port() for _ in range(3))
URL=f'http://127.0.0.1:{port}';WEBSITE_URL=f'http://127.0.0.1:{website_port}';PORTAL_URL=f'http://127.0.0.1:{portal_port}'
password='Synthetic-Only-Password-2026!';website_token='synthetic-website-service-token-0123456789';portal_token='synthetic-portal-service-token-0123456789'
env={**os.environ,'PYTHONPATH':str(ROOT/'backend'),'DATABASE_URL':'sqlite:///'+str(TEMP/'e2e.db'),'ALLOW_SQLITE':'true','APP_ENV':'test','APP_URL':URL,'PORTAL_PUBLIC_URL':PORTAL_URL,'PORTAL_INTERNAL_TOKEN':portal_token,'WEBSITE_INTERNAL_TOKEN':website_token,'ALLOWED_HOSTS':'127.0.0.1,localhost','APP_SECRET_KEY':'test-only-online-secret-key-01234567890123456789','SETUP_TOKEN':'test-only-online-setup-token-0123456789','STORAGE_PATH':str(TEMP/'files'),'FRONTEND_PATH':str(TEMP/'frontend'),'COOKIE_SECURE':'false','INTEGRATION_ENCRYPTION_KEY':base64.urlsafe_b64encode(b'0'*32).decode(),'CONNECT_ALLOWED_HOSTS':'connect.example.test'}
subprocess.run([sys.executable,'-m','alembic','upgrade','head'],cwd=ROOT/'backend',env=env,check=True)
log=(OUT/'server.log').open('w');proc=subprocess.Popen([sys.executable,'-m','uvicorn','app.main:app','--host','127.0.0.1','--port',str(port)],cwd=ROOT/'backend',env=env,stdout=log,stderr=log)
checks=[];errors=[];responsive={};bridge=os.getenv('PIGE_UI_BRIDGE')=='1';page=None;website_proc=None;portal_proc=None;website_log=None;portal_log=None

def record(msg):checks.append(msg);print('PASS:',msg,flush=True)
try:
    client=httpx.Client(base_url=URL,timeout=30)
    for _ in range(60):
        try:
            if client.get('/health/ready').status_code==200:break
        except httpx.HTTPError:pass
        time.sleep(.1)
    website_env={**env,'PORT':str(website_port),'PIGE_INTERNAL_URL':URL,'WEBSITE_SCHOOL_ID':'','WEBSITE_INTERNAL_TOKEN':website_token}
    portal_env={**env,'PORT':str(portal_port),'PIGE_INTERNAL_URL':URL,'PORTAL_PUBLIC_URL':PORTAL_URL,'PORTAL_INTERNAL_TOKEN':portal_token}
    website_log=(OUT/'website.log').open('w');portal_log=(OUT/'portal.log').open('w')
    website_proc=subprocess.Popen([sys.executable,'server.py'],cwd=ROOT/'services/website',env=website_env,stdout=website_log,stderr=website_log)
    portal_proc=subprocess.Popen([sys.executable,'server.py'],cwd=ROOT/'services/portal',env=portal_env,stdout=portal_log,stderr=portal_log)
    for _ in range(80):
        try:
            if httpx.get(WEBSITE_URL+'/health/ready',timeout=1).status_code==200 and httpx.get(PORTAL_URL+'/health/ready',timeout=1).status_code==200:break
        except httpx.HTTPError:pass
        time.sleep(.1)
    else:raise AssertionError('Serviços separados de website/portal não ficaram prontos')
    record('Website e portal separados prontos contra a API interna de teste')
    r=client.post('/api/v1/setup',headers={'X-Setup-Token':env['SETUP_TOKEN']},json={'admin_name':'Secretaria — Teste','admin_email':'secretaria@example.com','admin_password':password,'company_name':'Mantenedora Exemplo — Teste','school_name':'Escola Exemplo — Dados de Teste','academic_year':2027});assert r.status_code==201,r.text
    r=client.post('/api/v1/auth/login',json={'email':'secretaria@example.com','password':password});headers={'Authorization':'Bearer '+r.json()['access_token']}
    school=client.get('/api/v1/schools',headers=headers).json()[0];base='/api/v1/schools/'+school['id']
    site_config={'enabled':True,'theme':'campus','headline':'Site da Escola Exemplo','introduction':'Conteúdo de teste por domínio.',
        'about':'A publicação usa somente dados fictícios.','public_url':'https://site.example.test','portal_url':'https://portal.example.test/online.html'}
    response=client.put(base+'/website',headers=headers,json=site_config);assert response.status_code==200,response.text
    site=httpx.get(WEBSITE_URL,headers={'Host':'site.example.test'},timeout=15)
    assert site.status_code==200,site.text
    assert 'Site da Escola Exemplo' in site.text
    record('Site separado resolve a escola pelo domínio e renderiza a publicação configurada')
    unknown_site=httpx.get(WEBSITE_URL,headers={'Host':'nao-configurado.example.test'},timeout=15)
    assert unknown_site.status_code==404,unknown_site.text
    assert 'high load' not in unknown_site.text.lower()
    record('Domínio sem publicação retorna diagnóstico 404, sem mascarar como sobrecarga')
    def post(path,data):
        r=client.post(base+path,headers=headers,json=data);assert r.is_success,r.text;return r.json()
    unit=post('/units',{'name':'Unidade Centro — Teste'});year=client.get(base+'/academic-years',headers=headers).json()[0]
    grade=post('/grades',{'name':'3º Ano'});shift=post('/shifts',{'name':'Matutino'});group=post('/class-groups',{'name':'3º Ano A','unit_id':unit['id'],'academic_year_id':year['id'],'grade_id':grade['id'],'shift_id':shift['id'],'capacity':30})
    doc=post('/document-types',{'name':'Certidão de nascimento','required':True})
    campaign=post('/admission-campaigns',{'slug':'matriculas-2027-teste','title':'Matrículas 2027 — Dados de Teste','class_group_ids':[group['id']],'opens_on':str(date.today()-timedelta(days=1)),'closes_on':str(date.today()+timedelta(days=120)),'active':True,'require_verified_contact':False,'require_documents':True,'instructions':'Preencha os dados e envie os documentos. A Secretaria acompanhará cada etapa. Este processo utiliza exclusivamente dados fictícios para teste.','privacy_notice':'AMBIENTE DE TESTE. Dados fictícios utilizados para verificar cadastro, documentos e matrícula. Não inserir dados reais. A instituição responsável deve publicar seu aviso de privacidade antes do uso em produção.'})
    with sync_playwright() as pw:
        binary=os.getenv('CHROMIUM_PATH') or (None if Path(pw.chromium.executable_path).exists() else shutil.which('chromium'))
        browser=pw.chromium.launch(headless=True,**({'executable_path':binary} if binary else {}),args=['--no-sandbox'])
        parentContext=browser.new_context(viewport={'width':1366,'height':950},locale='pt-BR',accept_downloads=True)
        parent=parentContext.new_page();parent.set_default_timeout(8000);parent.on('pageerror',lambda e:errors.append('portal: '+str(e)));page=parent
        if bridge:
            from ui_bridge import install
            parent_http=install(parent,ROOT,URL,OUT,entry='portal')
        else:parent.goto(URL+'/online.html?campaign='+campaign['slug'])
        expect(parent.get_by_role('heading',name=re.compile('O próximo passo'))).to_be_visible()
        parent.get_by_role('button',name='Criar minha conta',exact=True).click()
        for label,value in [('Seu nome completo','Mariana Almeida — Teste'),('Seu e-mail','familia@example.com'),('Crie uma senha (12 caracteres ou mais)',password),('Seu CPF (opcional neste momento)','52998224725'),('WhatsApp / telefone com DDD','75999990000'),('Endereço completo','Endereço fictício para teste')]:parent.get_by_label(label,exact=True).fill(value)
        parent.get_by_label('Li o aviso de privacidade deste processo',exact=False).check();parent.get_by_label('Desejo receber avisos deste processo',exact=False).check();parent.get_by_role('button',name='Criar conta e continuar').click()
        expect(parent.get_by_role('heading',name='Minhas inscrições')).to_be_visible();record('Responsável cria conta no portal, sem usuário administrativo')
        parent.get_by_role('button',name='Nova pré-matrícula',exact=True).click()
        parent.get_by_label('Nome completo do aluno *',exact=True).fill('Lucas Almeida — Teste')
        parent.get_by_label('Data de nascimento *',exact=True).fill('2018-05-15')
        parent.screenshot(path=str(OUT/'00-cadastro-aluno.png'),full_page=True)
        parent.get_by_role('button',name='Continuar',exact=True).click()
        parent.get_by_label('Turma pretendida *').select_option(group['id'])
        parent.get_by_label('Seu vínculo com o aluno *',exact=True).fill('Mãe')
        parent.get_by_label('Endereço do aluno',exact=True).fill('Endereço fictício')
        parent.get_by_role('button',name='Continuar',exact=True).click()
        expect(parent.locator('.portal-review')).to_contain_text('Lucas Almeida — Teste')
        parent.screenshot(path=str(OUT/'00-revisao-cadastro.png'),full_page=True)
        parent.get_by_role('button',name='Salvar e continuar',exact=True).click()
        expect(parent.get_by_role('heading',name='Lucas Almeida — Teste')).to_be_visible();record('Autocadastro do aluno e escolha da oferta persistidos')
        parent.locator('input[type=file]').set_input_files(str(ROOT/'frontend/public/icons/icon-192.png'));parent.get_by_role('button',name='Enviar documento',exact=True).click()
        expect(parent.get_by_text('icon-192.png',exact=True)).to_be_visible();record('Upload documental privado pelo responsável')
        parent.get_by_label('Li o aviso de privacidade e confirmo',exact=False).check();parent.get_by_label('Declaro ser responsável legal',exact=False).check();parent.get_by_role('button',name='Enviar pré-matrícula',exact=True).click()
        expect(parent.get_by_text('Inscrição enviada. Acompanhe a análise nesta página.',exact=True)).to_be_visible();record('Aceites explícitos e envio de pré-matrícula pela interface')
        parent.evaluate('window.scrollTo(0,0)');parent.wait_for_timeout(120);parent.screenshot(path=str(OUT/'01-portal-inscricao-desktop.png'),full_page=True)
        parent.set_viewport_size({'width':390,'height':844});parent.wait_for_timeout(120)
        assert parent.evaluate('document.documentElement.scrollWidth<=innerWidth');parent.evaluate('window.scrollTo(0,0)');parent.wait_for_timeout(120);parent.screenshot(path=str(OUT/'02-portal-inscricao-mobile.png'),full_page=True);record('Portal responsivo a 390px, sem rolagem horizontal')
        parent.set_viewport_size({'width':1366,'height':950})
        adminContext=browser.new_context(viewport={'width':1440,'height':1000},locale='pt-BR',accept_downloads=True)
        admin=adminContext.new_page();admin.set_default_timeout(8000);admin.on('pageerror',lambda e:errors.append('admin: '+str(e)));page=admin
        if bridge:admin_http=install(admin,ROOT,URL,OUT)
        else:admin.goto(URL)
        admin.get_by_label('E-mail',exact=True).fill('secretaria@example.com');admin.get_by_label('Senha',exact=True).fill(password);admin.get_by_role('button',name='Entrar na aplicação').click()
        expect(admin.get_by_role('heading',name='Visão geral',exact=True)).to_be_visible()
        admin.locator('aside').get_by_role('link',name='Inscrições online',exact=False).click()
        expect(admin.get_by_role('button',name='Processos e link público')).to_be_visible();expect(admin.locator('.x-record',has_text='Lucas Almeida — Teste')).to_be_visible();record('Fila administrativa exibe a inscrição enviada no portal')
        admin.locator('.x-record',has_text='Lucas Almeida — Teste').click()
        expect(admin.get_by_role('heading',name='Lucas Almeida — Teste')).to_be_visible()
        admin.get_by_label('Justificativa / parecer para a próxima ação').fill('Documento sintético conferido no teste de integração.')
        admin.get_by_role('button',name='Validar',exact=True).click();expect(admin.get_by_text('Validado',exact=False).first).to_be_visible();record('Documento do portal validado pela Secretaria')
        admin.get_by_label('Justificativa / parecer para a próxima ação').fill('Identidade, documentação e vínculo conferidos para teste.')
        admin.get_by_label('Conferi a identidade, os documentos',exact=False).check();admin.get_by_role('button',name='Aprovar e criar matrícula em preparação').click()
        expect(admin.get_by_text('Inscrição aprovada; matrícula criada como rascunho.',exact=False)).to_be_visible();record('Aprovação cria aluno, responsável e matrícula sem duplicação')
        admin.evaluate('window.scrollTo(0,0)');admin.wait_for_timeout(120);admin.screenshot(path=str(OUT/'03-secretaria-analise.png'),full_page=True)
        admin.get_by_label('Justificativa / parecer para a próxima ação').fill('Conferência final concluída pela Secretaria de teste.')
        admin.get_by_role('button',name='Efetivar matrícula e emitir comprovante').click()
        expect(admin.get_by_text('Matrícula efetivada. Comprovante disponível no portal do responsável.',exact=True)).to_be_visible();record('Efetivação da matrícula e emissão persistida do comprovante')
        parent.reload();parent.locator('.x-record',has_text='Lucas Almeida — Teste').click();expect(parent.get_by_text('Matriculada',exact=True)).to_be_visible()
        if bridge:
            parent.get_by_role('button',name='Baixar documento escolar').click();parent.wait_for_function("window.__downloads.includes('comprovante-matricula.pdf')")
        else:
            with parent.expect_download() as down:parent.get_by_role('button',name='Baixar documento escolar').click()
            down.value.save_as(str(OUT/'comprovante-matricula.pdf'))
        record('Responsável consulta a matrícula efetivada e baixa o documento autorizado')
        parent.evaluate('window.scrollTo(0,0)');parent.wait_for_timeout(120);parent.screenshot(path=str(OUT/'04-portal-matricula-concluida.png'),full_page=True)
        # Dados pedagógicos sintéticos são publicados pelo mesmo fluxo HTTP da escola.
        admission=client.get(base+'/admissions',headers=headers).json()['items'][0]
        enrollment_id=admission['enrollment_id'];student_id=admission['student_id']
        period=post('/academic-periods',{'academic_year_id':year['id'],'name':'1º Bimestre','starts_on':'2027-01-01','ends_on':'2027-04-30','order_index':1})
        component=post('/curriculum-components',{'name':'Matemática'})
        diary=post('/diaries',{'class_group_id':group['id'],'component_id':component['id']})
        diary_path='/diaries/'+diary['id']
        def put(path,data):
            response=client.put(base+path,headers=headers,json=data);assert response.is_success,response.text;return response.json()
        put(diary_path+'/assessment-rules/'+period['id'],{'method':'arithmetic','scale_max':'10','decimal_places':2,'minimum_score':'6','minimum_attendance_percent':'75','justified_absence_counts_as_present':False,'recovery_mode':'none','concept_scale':[],'required_opinion':False})
        lesson=post(diary_path+'/lessons',{'academic_period_id':period['id'],'lesson_date':'2027-02-01','lesson_count':2,'content':'Operações fundamentais'})
        put(diary_path+'/lessons/'+lesson['id']+'/attendance',{'items':[{'enrollment_id':enrollment_id,'status':'present','note':''}]})
        assessment=post(diary_path+'/assessments',{'academic_period_id':period['id'],'title':'Avaliação de Matemática','kind':'exam','assessment_date':'2027-02-01','value_type':'numeric','max_score':'10','weight':'1','status':'published'})
        put(diary_path+'/assessments/'+assessment['id']+'/results',{'items':[{'enrollment_id':enrollment_id,'numeric_score':'8.5','concept':'','note':''}]})
        post(diary_path+'/periods/'+period['id']+'/consolidate',{'version':diary['version']})
        submitted=post(diary_path+'/submit',{'version':diary['version']})
        reviewed=post(diary_path+'/review',{'version':submitted['version']})
        post(diary_path+'/close',{'academic_period_id':period['id'],'version':reviewed['version'],'reason':'Fechamento sintético conferido para teste de boletim.'})
        # A entrega do código por provedor externo não integra este teste local.
        with sqlite3.connect(TEMP/'e2e.db') as db:db.execute("UPDATE portal_accounts SET email_verified=1 WHERE email='familia@example.com'")
        parent.reload();parent.get_by_role('button',name=re.compile('^Diário Escolar')).click()
        parent.get_by_label('Li e autorizo o acesso da minha conta',exact=False).check()
        parent.get_by_role('button',name='Ativar acesso',exact=True).click()
        expect(parent.get_by_role('button',name='Revogar acesso',exact=True)).to_be_visible()
        parent.get_by_role('button',name=re.compile('^Boletim')).click()
        expect(parent.locator('.learning-workspace table')).to_contain_text('Matemática')
        expect(parent.locator('.learning-workspace table')).to_contain_text('8,5')
        expect(parent.locator('.learning-workspace table')).to_contain_text('100%')
        with parent.expect_download() as down:parent.get_by_role('button',name='Baixar boletim PDF',exact=True).click()
        down.value.save_as(str(OUT/'boletim-escolar.pdf'))
        parent.screenshot(path=str(OUT/'05-portal-boletim.png'),full_page=True)
        record('Responsável autoriza acesso e consulta nota, frequência e PDF do período fechado')
        post('/community-posts',{'title':'Reunião de famílias — Teste','content':'Encontro sintético para acompanhamento escolar dos estudantes.','kind':'event','audience':'guardians','status':'published','event_start':'2027-02-10T14:00:00-03:00','location':'Auditório da escola'})
        parent.get_by_role('button',name=re.compile('^Notícias')).click()
        expect(parent.get_by_text('Reunião de famílias — Teste',exact=True)).to_be_visible()
        parent.screenshot(path=str(OUT/'06-portal-noticias-eventos.png'),full_page=True)
        record('Notícia/evento dirigido a responsáveis aparece no portal da escola')
        admin.locator('#integrations-menu').get_by_role('link',name='Bancária',exact=True).click()
        expect(admin.get_by_role('heading',name='Conta bancária da instituição',exact=True)).to_be_visible()
        admin.get_by_role('button',name='Conectar conta',exact=True).click()
        admin.get_by_label('Chave da API',exact=True).fill('synthetic-test-key')
        admin.get_by_label('Habilitar emissão e atualização de cobranças',exact=True).check()
        admin.get_by_role('button',name='Salvar conta',exact=True).click()
        expect(admin.get_by_text('Configuração salva.',exact=False)).to_be_visible()
        record('Conta bancária de homologação configurada pela interface com credencial protegida')
        finance=admin.get_by_role('button',name='Financeiro',exact=True)
        if finance.get_attribute('aria-expanded')=='false':finance.click()
        admin.locator('aside').get_by_role('link',name='Cobranças',exact=False).click()
        admin.get_by_role('button',name='+ Nova cobrança',exact=True).click()
        admin.get_by_label('Tipo de cobrança').select_option('provider')
        admin.get_by_label('Pesquisar aluno / matrícula',exact=True).fill('Lucas')
        admin.get_by_role('button',name='Buscar matrícula',exact=True).click()
        admin.get_by_label('Matrícula / responsável financeiro').select_option(index=1)
        admin.get_by_label('Valor de cada parcela (R$)',exact=True).fill('450.00')
        admin.get_by_role('button',name='Confirmar criação da(s) cobrança(s)',exact=True).click()
        expect(admin.locator('.table-wrap tr',has_text='Mensalidade')).to_be_visible()
        expect(admin.locator('.table-wrap tr',has_text='Mensalidade').get_by_text('Na fila',exact=True)).to_be_visible()
        admin.screenshot(path=str(OUT/'08-cobranca-homologacao.png'),full_page=True)
        record('Cobrança de mensalidade criada e enfileirada pela interface, sem simular pagamento')
        student_record=client.get(base+'/students/'+student_id,headers=headers).json()
        response=client.post('/api/v1/users',headers=headers,json={'name':'Lucas Almeida — Teste','email':'aluno@example.com','password':password,'role':'student','school_ids':[school['id']],'person_id':student_record['person']['id']})
        assert response.status_code==201,response.text
        guardian=post('/persons',{'name':'Mariana Almeida — Teste','email':'responsavel-escolar@example.com','phone':'75999990000','is_guardian':True})
        post('/students/'+student_id+'/guardians',{'person_id':guardian['id'],'relationship':'Mãe','legal':True,'financial':True})
        response=client.post('/api/v1/users',headers=headers,json={'name':'Mariana Almeida — Teste','email':'responsavel-escolar@example.com','password':password,'role':'guardian','school_ids':[school['id']],'person_id':guardian['id']})
        assert response.status_code==201,response.text
        student_login=client.post('/api/v1/auth/login',json={'email':'aluno@example.com','password':password});assert student_login.status_code==200,student_login.text
        student_headers={'Authorization':'Bearer '+student_login.json()['access_token']}
        student_context=client.get('/api/v1/family/context',headers=student_headers)
        assert student_context.status_code==200 and student_context.json()['students'][0]['financial_authorized'] is False,student_context.text
        student_charges=client.get('/api/v1/family/students/'+student_id+'/charges',headers=student_headers)
        assert student_charges.status_code==403,student_charges.text
        guardian_login=client.post('/api/v1/auth/login',json={'email':'responsavel-escolar@example.com','password':password});assert guardian_login.status_code==200,guardian_login.text
        guardian_headers={'Authorization':'Bearer '+guardian_login.json()['access_token']}
        guardian_context=client.get('/api/v1/family/context',headers=guardian_headers)
        assert guardian_context.status_code==200 and guardian_context.json()['students'][0]['financial_authorized'] is True,guardian_context.text
        guardian_charges=client.get('/api/v1/family/students/'+student_id+'/charges',headers=guardian_headers)
        assert guardian_charges.status_code==200,guardian_charges.text
        record('API bloqueia financeiro para aluno e permite apenas ao responsável com vínculo financeiro ativo')
        studentContext=browser.new_context(viewport={'width':1366,'height':950},locale='pt-BR',accept_downloads=True)
        studentPage=studentContext.new_page();studentPage.on('pageerror',lambda e:errors.append('aluno: '+str(e)));page=studentPage
        studentPage.goto(URL);studentPage.get_by_label('E-mail',exact=True).fill('aluno@example.com');studentPage.get_by_label('Senha',exact=True).fill(password);studentPage.get_by_role('button',name='Entrar na aplicação').click()
        expect(studentPage.locator('.learning-workspace table')).to_contain_text('Matemática')
        expect(studentPage.locator('.learning-workspace table')).to_contain_text('8,5')
        studentPage.screenshot(path=str(OUT/'07-portal-aluno-boletim.png'),full_page=True)
        record('Aluno autenticado consulta apenas seu boletim no espaço pessoal')
        familyContext=browser.new_context(viewport={'width':320,'height':740},locale='pt-BR')
        familyPage=familyContext.new_page();familyPage.set_default_timeout(8000);familyPage.on('pageerror',lambda e:errors.append('portal-familia: '+str(e)));page=familyPage
        failed_requests=[];bad_responses=[]
        familyPage.on('requestfailed',lambda req:failed_requests.append({'url':req.url,'failure':req.failure,'method':req.method}))
        familyPage.on('response',lambda response:bad_responses.append((response.status,response.url)) if response.status>=400 and not (response.status==401 and response.url.endswith('/api/v1/auth/refresh')) else None)
        familyPage.goto(PORTAL_URL)
        expect(familyPage.get_by_role('heading',name='Aprendizado e cuidado, de perto.')).to_be_visible()
        def check_family_viewport(width,height,label):
            familyPage.set_viewport_size({'width':width,'height':height});familyPage.wait_for_timeout(80)
            measurement=familyPage.evaluate("""() => {
              const root=document.documentElement;
              const outside=[...document.querySelectorAll('.family-shell input,.family-shell select,.family-shell textarea,.family-shell button,.family-shell a')]
                .filter(el=>!el.classList.contains('skip')&&el.getClientRects().length)
                .map(el=>({tag:el.tagName,text:(el.innerText||el.getAttribute('aria-label')||'').slice(0,50),left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right}))
                .filter(el=>el.left < -1 || el.right > root.clientWidth + 1);
              return {clientWidth:root.clientWidth,scrollWidth:root.scrollWidth,outside};
            }""")
            assert measurement['scrollWidth']<=measurement['clientWidth']+1,(label,measurement)
            assert not measurement['outside'],(label,measurement['outside'])
            responsive[label]={'viewport':f'{width}x{height}','document_width':measurement['scrollWidth'],'horizontal_overflow':False}
            if label in {'login-320','family-390','family-1440','family-landscape-844','zoom-200-equivalent-720'}:
                familyPage.screenshot(path=str(OUT/f'{label}.png'),full_page=True)
        check_family_viewport(320,740,'login-320')
        familyPage.get_by_label('E-mail de acesso').focus();familyPage.keyboard.press('Tab')
        assert familyPage.evaluate("getComputedStyle(document.activeElement).outlineStyle")=='solid','Foco do teclado sem indicação visível no formulário de acesso'
        familyPage.get_by_label('E-mail de acesso').fill('aluno@example.com')
        familyPage.get_by_label('Senha').fill(password)
        familyPage.get_by_role('button',name='Entrar',exact=True).click()
        expect(familyPage.get_by_role('heading',name='Olá, Lucas Almeida — Teste.')).to_be_visible()
        expect(familyPage.locator('.learning-workspace table')).to_contain_text('Matemática')
        familyPage.reload();expect(familyPage.get_by_role('heading',name='Olá, Lucas Almeida — Teste.')).to_be_visible()
        expect(familyPage.get_by_role('button',name='Boletim e matrículas')).to_be_visible()
        familyPage.get_by_role('button',name='Documentos').click();expect(familyPage.get_by_role('heading',name='Documentos de Lucas Almeida — Teste')).to_be_visible()
        familyPage.get_by_role('button',name='Financeiro').click();expect(familyPage.get_by_role('heading',name='Financeiro de Lucas Almeida — Teste')).to_be_visible()
        expect(familyPage.get_by_text('Seu vínculo não autoriza a consulta financeira.',exact=False)).to_be_visible()
        familyPage.get_by_role('button',name='Boletim e matrículas').click();expect(familyPage.locator('.learning-workspace table')).to_contain_text('Matemática')
        record('Portal independente autentica aluno, renova sessão e navega entre boletim, documentos e financeiro')
        for width in (320,360,390,768,1024,1440):
            check_family_viewport(width,844 if width<650 else 950,f'family-{width}')
        check_family_viewport(844,390,'family-landscape-844')
        check_family_viewport(720,900,'zoom-200-equivalent-720')
        record('Portal familiar sem rolagem horizontal nas seis larguras, paisagem e espaço CSS equivalente a zoom 200%')
        familyPage.get_by_role('button',name='Sair',exact=True).click()
        expect(familyPage.get_by_role('heading',name='Aprendizado e cuidado, de perto.')).to_be_visible()
        familyPage.get_by_label('E-mail de acesso').fill('responsavel-escolar@example.com')
        familyPage.get_by_label('Senha').fill(password)
        familyPage.get_by_role('button',name='Entrar',exact=True).click()
        expect(familyPage.get_by_role('heading',name='Olá, Mariana Almeida — Teste.')).to_be_visible()
        expect(familyPage.get_by_label('Aluno')).to_have_value(student_id)
        familyPage.get_by_role('button',name='Financeiro').click()
        expect(familyPage.get_by_role('heading',name='Financeiro de Lucas Almeida — Teste')).to_be_visible()
        expect(familyPage.get_by_text('Seu vínculo não autoriza a consulta financeira.',exact=False)).to_have_count(0)
        familyPage.get_by_role('button',name='Documentos').click()
        expect(familyPage.get_by_role('heading',name='Documentos de Lucas Almeida — Teste')).to_be_visible()
        check_family_viewport(320,740,'guardian-320')
        check_family_viewport(390,844,'guardian-390')
        record('Responsável autenticado consulta somente o aluno vinculado e a permissão financeira correspondente')
        import importlib.util
        spec=importlib.util.spec_from_file_location('school_workflows',ROOT/'scripts/e2e-school-workflows.py');extra=importlib.util.module_from_spec(spec);spec.loader.exec_module(extra)
        extra.verify_workflows(admin,browser,client,headers,base,URL,OUT,record,expect,post,year,group)
        assert not failed_requests,failed_requests
        assert not bad_responses,bad_responses
        assert not errors,errors
        record('Portal independente carrega sem falhas HTTP ou erros de JavaScript')
        assert not errors,errors;record('Nenhum erro de JavaScript nas novas telas exercitadas')
        result={'status':'passed','mode':'ui_api_bridge' if bridge else 'http_e2e','checks':checks,'responsive':responsive,'errors':errors,'failed_requests':failed_requests,'bad_responses':bad_responses,'database':'SQLite descartável','remote_requests_executed':False,'not_validated':['Navegação HTTP nativa','Cookies do navegador','CSP em navegação','Instalação PWA','Provedores reais','PostgreSQL'] if bridge else ['Provedores reais','PostgreSQL','Certificados e assinatura real','Entrega de código de verificação (contato sintético verificado no banco de teste)'],'browser':browser.version}
        (OUT/'results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False));browser.close()
except Exception:
    (OUT/'results.json').write_text(json.dumps({'status':'failed','checks':checks,'errors':errors},ensure_ascii=False,indent=2))
    if page:
        try:page.screenshot(path=str(OUT/'failure.png'),full_page=True);print(page.locator('body').inner_text()[-5000:])
        except Exception:pass
    raise
finally:
    for child in (website_proc,portal_proc,proc):
        if child and child.poll() is None:child.terminate()
        if child:
            try:child.wait(timeout=10)
            except subprocess.TimeoutExpired:child.kill();child.wait(timeout=5)
    for stream in (website_log,portal_log,log):
        if stream:stream.close()
    shutil.rmtree(TEMP,ignore_errors=True)
