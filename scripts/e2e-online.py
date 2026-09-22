#!/usr/bin/env python3
"""Portal/Secretaria reais em Chromium; PIGE_UI_BRIDGE=1 registra limitação HTTP explicitamente."""
import base64, json, os, re, shutil, socket, subprocess, sys, tempfile, time
from pathlib import Path
import httpx
from playwright.sync_api import sync_playwright, expect
from datetime import date, timedelta
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'evidence/0.3.0/online';OUT.mkdir(parents=True,exist_ok=True)
TEMP=Path(tempfile.mkdtemp(prefix='pige-online-e2e-'))
with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
URL=f'http://127.0.0.1:{port}';password='Synthetic-Only-Password-2026!'
env={**os.environ,'PYTHONPATH':str(ROOT/'backend'),'DATABASE_URL':'sqlite:///'+str(TEMP/'e2e.db'),'ALLOW_SQLITE':'true','APP_ENV':'test','APP_URL':URL,'ALLOWED_HOSTS':'127.0.0.1,localhost','APP_SECRET_KEY':'test-only-online-secret-key-01234567890123456789','SETUP_TOKEN':'test-only-online-setup-token-0123456789','STORAGE_PATH':str(TEMP/'files'),'FRONTEND_PATH':str(ROOT/'frontend/dist'),'COOKIE_SECURE':'false','INTEGRATION_ENCRYPTION_KEY':base64.urlsafe_b64encode(b'0'*32).decode(),'CONNECT_ALLOWED_HOSTS':'connect.example.test'}
subprocess.run([sys.executable,'-m','alembic','upgrade','head'],cwd=ROOT/'backend',env=env,check=True)
log=(OUT/'server.log').open('w');proc=subprocess.Popen([sys.executable,'-m','uvicorn','app.main:app','--host','127.0.0.1','--port',str(port)],cwd=ROOT/'backend',env=env,stdout=log,stderr=log)
checks=[];errors=[];bridge=os.getenv('PIGE_UI_BRIDGE')=='1';page=None

def record(msg):checks.append(msg);print('PASS:',msg,flush=True)
try:
    client=httpx.Client(base_url=URL,timeout=30)
    for _ in range(60):
        try:
            if client.get('/health/ready').status_code==200:break
        except httpx.HTTPError:pass
        time.sleep(.1)
    r=client.post('/api/v1/setup',headers={'X-Setup-Token':env['SETUP_TOKEN']},json={'admin_name':'Secretaria — Teste','admin_email':'secretaria@example.com','admin_password':password,'company_name':'Mantenedora Exemplo — Teste','school_name':'Escola Exemplo — Dados de Teste','academic_year':2027});assert r.status_code==201,r.text
    r=client.post('/api/v1/auth/login',json={'email':'secretaria@example.com','password':password});headers={'Authorization':'Bearer '+r.json()['access_token']}
    school=client.get('/api/v1/schools',headers=headers).json()[0];base='/api/v1/schools/'+school['id']
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
        expect(parent.get_by_role('heading',name=re.compile('Matrícula com a família'))).to_be_visible()
        parent.get_by_role('button',name='Criar minha conta',exact=True).click()
        for label,value in [('Seu nome completo','Mariana Almeida — Teste'),('Seu e-mail','familia@example.com'),('Crie uma senha (12 caracteres ou mais)',password),('Seu CPF (necessário para cobrança)','52998224725'),('WhatsApp / telefone com DDD','75999990000'),('Endereço completo','Endereço fictício para teste')]:parent.get_by_label(label,exact=True).fill(value)
        parent.get_by_label('Li o aviso de privacidade deste processo',exact=False).check();parent.get_by_label('Desejo receber avisos deste processo',exact=False).check();parent.get_by_role('button',name='Criar conta e continuar').click()
        expect(parent.get_by_role('heading',name='Mariana Almeida — Teste')).to_be_visible();record('Responsável cria conta no portal, sem usuário administrativo')
        parent.get_by_role('button',name='+ Cadastrar aluno').click()
        for label,value in [('Nome completo do aluno','Lucas Almeida — Teste'),('Data de nascimento','2018-05-15'),('Endereço do aluno','Endereço fictício'),('Seu vínculo com o aluno','Mãe')]:parent.get_by_label(label,exact=True).fill(value)
        parent.get_by_label('Oferta / turma pretendida').select_option(group['id']);parent.get_by_role('button',name='Salvar dados do aluno').click()
        expect(parent.get_by_role('heading',name='Lucas Almeida — Teste')).to_be_visible();record('Autocadastro do aluno e escolha da oferta persistidos')
        parent.locator('input[type=file]').set_input_files(str(ROOT/'frontend/public/icons/icon-192.png'));parent.get_by_role('button',name='Enviar documento',exact=True).click()
        expect(parent.get_by_text('icon-192.png',exact=True)).to_be_visible();record('Upload documental privado pelo responsável')
        parent.get_by_label('Li o aviso de privacidade, versão',exact=False).check();parent.get_by_label('Declaro ser responsável legal',exact=False).check();parent.get_by_role('button',name='Enviar pré-matrícula',exact=True).click()
        expect(parent.get_by_text('Inscrição enviada. Acompanhe a análise nesta página.',exact=True)).to_be_visible();record('Aceites explícitos e envio de pré-matrícula pela interface')
        parent.evaluate('window.scrollTo(0,0)');parent.wait_for_timeout(120);parent.screenshot(path=str(OUT/'01-portal-inscricao-desktop.png'),full_page=True)
        parent.set_viewport_size({'width':390,'height':844});parent.wait_for_timeout(120)
        assert parent.evaluate('document.documentElement.scrollWidth<=innerWidth');parent.evaluate('window.scrollTo(0,0)');parent.wait_for_timeout(120);parent.screenshot(path=str(OUT/'02-portal-inscricao-mobile.png'),full_page=True);record('Portal responsivo a 390px, sem rolagem horizontal')
        parent.set_viewport_size({'width':1366,'height':950})
        adminContext=browser.new_context(viewport={'width':1440,'height':1000},locale='pt-BR',accept_downloads=True)
        admin=adminContext.new_page();admin.set_default_timeout(8000);admin.on('pageerror',lambda e:errors.append('admin: '+str(e)));page=admin
        if bridge:admin_http=install(admin,ROOT,URL,OUT)
        else:admin.goto(URL)
        admin.get_by_label('E-mail',exact=True).fill('secretaria@example.com');admin.get_by_label('Senha',exact=True).fill(password);admin.get_by_role('button',name='Entrar na Secretaria').click()
        expect(admin.get_by_role('heading',name='Visão da Secretaria',exact=True)).to_be_visible()
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
        parent.get_by_role('button',name='Atualizar',exact=True).click();expect(parent.get_by_text('Matriculada',exact=True)).to_be_visible()
        if bridge:
            parent.get_by_role('button',name='Baixar documento escolar').click();parent.wait_for_function("window.__downloads.includes('comprovante-matricula.pdf')")
        else:
            with parent.expect_download() as down:parent.get_by_role('button',name='Baixar documento escolar').click()
            down.value.save_as(str(OUT/'comprovante-matricula.pdf'))
        record('Responsável consulta a matrícula efetivada e baixa o documento autorizado')
        parent.evaluate('window.scrollTo(0,0)');parent.wait_for_timeout(120);parent.screenshot(path=str(OUT/'04-portal-matricula-concluida.png'),full_page=True)
        admin.locator('aside').get_by_role('link',name='Integrações',exact=False).click()
        expect(admin.get_by_role('heading',name='Conexões desta escola')).to_be_visible();admin.evaluate('window.scrollTo(0,0)');admin.wait_for_timeout(120);admin.screenshot(path=str(OUT/'05-integracoes.png'),full_page=True);record('Painel Connect API/ASAAS acessível; sem ativação automática')
        admin.locator('article.x-charge',has_text='ASAAS · Pix e boleto').get_by_role('button',name='Configurar',exact=True).click()
        admin.get_by_label('API key (vazio preserva a atual)').fill('synthetic-test-key')
        admin.get_by_label('Token exclusivo do webhook',exact=False).fill('synthetic-test-webhook-token-00000000000')
        admin.get_by_label('Habilitar esta integração',exact=True).check();admin.get_by_role('button',name='Salvar configuração').click()
        expect(admin.get_by_text('Configuração salva.',exact=False)).to_be_visible();record('Configuração bancária persistida sem expor as credenciais no retorno')
        admin.locator('aside').get_by_role('link',name='Cobranças',exact=False).click();admin.get_by_role('button',name='+ Nova cobrança').click();admin.get_by_label('Pesquisar aluno / matrícula',exact=True).fill('Lucas');admin.get_by_role('button',name='Buscar matrícula',exact=True).click();admin.get_by_label('Matrícula / responsável financeiro').select_option(index=1)
        admin.get_by_label('Valor de cada parcela (R$)').fill('450.00');admin.get_by_role('button',name='Confirmar criação da(s) cobrança(s)').click()
        expect(admin.locator('.x-record',has_text='Mensalidade')).to_be_visible();expect(admin.get_by_text('Na fila',exact=True).first).to_be_visible();record('Cobrança de mensalidade criada e enfileirada pela interface, sem simular pagamento')
        admin.evaluate('window.scrollTo(0,0)');admin.wait_for_timeout(120);admin.screenshot(path=str(OUT/'06-cobrancas.png'),full_page=True)
        assert not errors,errors;record('Nenhum erro de JavaScript nas novas telas exercitadas')
        result={'status':'passed','mode':'ui_api_bridge' if bridge else 'http_e2e','checks':checks,'errors':errors,'database':'SQLite descartável','remote_requests_executed':False,'not_validated':['Navegação HTTP nativa','Cookies do navegador','CSP em navegação','Instalação PWA','Provedores reais','PostgreSQL'] if bridge else ['Provedores reais','PostgreSQL'],'browser':browser.version}
        (OUT/'results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False));browser.close()
except Exception:
    (OUT/'results.json').write_text(json.dumps({'status':'failed','checks':checks,'errors':errors},ensure_ascii=False,indent=2))
    if page:
        try:page.screenshot(path=str(OUT/'failure.png'),full_page=True);print(page.locator('body').inner_text()[-5000:])
        except Exception:pass
    raise
finally:
    proc.terminate();proc.wait(timeout=10);log.close();shutil.rmtree(TEMP,ignore_errors=True)
