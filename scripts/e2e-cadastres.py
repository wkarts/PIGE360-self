#!/usr/bin/env python3
"""Cadastros PF/PJ, vínculos, seções e diálogos. Dados sintéticos; sem provedores externos."""
import json, os, shutil, socket, subprocess, sys, tempfile, time
from pathlib import Path
import httpx
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'evidence/0.3.0/cadastres';OUT.mkdir(parents=True,exist_ok=True)
TEMP=Path(tempfile.mkdtemp(prefix='pige-cadastres-'))
with socket.socket() as sock:
    sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
URL=f'http://127.0.0.1:{port}'
PASSWORD='Synthetic-Cadastres-Password-2026!'
BRIDGE=os.getenv('PIGE_UI_BRIDGE')=='1'
env={**os.environ,'PYTHONPATH':str(ROOT/'backend'),'DATABASE_URL':'sqlite:///'+str(TEMP/'e2e.db'),
     'ALLOW_SQLITE':'true','APP_ENV':'test','APP_URL':URL,'ALLOWED_HOSTS':'127.0.0.1,localhost',
     'APP_SECRET_KEY':'test-only-cadastres-secret-01234567890123456789','SETUP_TOKEN':'test-only-setup-01234567890123456789',
     'STORAGE_PATH':str(TEMP/'files'),'FRONTEND_PATH':str(ROOT/'frontend/dist'),'COOKIE_SECURE':'false'}
subprocess.run([sys.executable,'-m','alembic','upgrade','head'],cwd=ROOT/'backend',env=env,check=True)
log=(OUT/'server.log').open('w')
proc=subprocess.Popen([sys.executable,'-m','uvicorn','app.main:app','--host','127.0.0.1','--port',str(port)],cwd=ROOT/'backend',env=env,stdout=log,stderr=log)
checks=[];errors=[]
def record(message):checks.append(message);print('PASS:',message,flush=True)
try:
    client=httpx.Client(base_url=URL,timeout=30)
    for _ in range(70):
        try:
            if client.get('/health/ready').status_code==200:break
        except httpx.HTTPError:pass
        time.sleep(.1)
    response=client.post('/api/v1/setup',headers={'X-Setup-Token':env['SETUP_TOKEN']},json={
        'admin_name':'Secretaria de Teste','admin_email':'cadastres@example.com','admin_password':PASSWORD,
        'company_name':'Mantenedora Exemplo','school_name':'Colégio Exemplo','academic_year':2026})
    assert response.status_code==201,response.text
    login=client.post('/api/v1/auth/login',json={'email':'cadastres@example.com','password':PASSWORD}).json()
    headers={'Authorization':'Bearer '+login['access_token']}
    school=client.get('/api/v1/schools',headers=headers).json()[0];base='/api/v1/schools/'+school['id']
    with sync_playwright() as pw:
        binary=os.getenv('CHROMIUM_PATH') or (None if Path(pw.chromium.executable_path).exists() else shutil.which('chromium'))
        browser=pw.chromium.launch(headless=True,**({'executable_path':binary} if binary else {}),args=['--no-sandbox'])
        context=browser.new_context(viewport={'width':1440,'height':960},locale='pt-BR')
        page=context.new_page();page.set_default_timeout(8000)
        page.on('pageerror',lambda error:errors.append(str(error)))
        if BRIDGE:
            from ui_bridge import install
            install(page,ROOT,URL,OUT)
        else:page.goto(URL)
        page.get_by_label('E-mail',exact=True).fill('cadastres@example.com')
        page.get_by_label('Senha',exact=True).fill(PASSWORD)
        page.get_by_role('button',name='Entrar na aplicação').click()
        expect(page.get_by_role('heading',name='Visão geral',exact=True)).to_be_visible()
        def nav(label):
            expect(page.locator('.app-root')).to_have_attribute('aria-busy','false')
            menu=page.get_by_role('button',name='Cadastros',exact=True)
            if label in ['Cadastro único','Alunos','Professores','Funcionários','Pais e responsáveis','Fornecedores','Prestadores de serviços','Clientes','Sócios'] and menu.get_attribute('aria-expanded')=='false':menu.click()
            page.locator('aside').get_by_role('link',name=label,exact=False).click()
            expect(page.get_by_role('heading',name=label,exact=True)).to_be_visible()
        def dialog():return page.get_by_role('dialog')
        def field(label):
            element=dialog().get_by_label(label,exact=False)
            element.wait_for(state='attached')
            element.evaluate("e=>{const d=e.closest('details');if(d)d.open=true;}")
            section=element.evaluate("el=>el.closest('[data-form-section]')?.dataset.formSection||''")
            if section and not element.is_visible():dialog().locator(f'[data-section-target="{section}"]').click()
            return element
        def save():
            dialog().get_by_role('button',name='Salvar',exact=True).click()
            expect(dialog()).to_have_count(0)
            expect(page.locator('.app-root')).to_have_attribute('aria-busy','false')
        menu=page.get_by_role('button',name='Cadastros',exact=True)
        expect(page.locator('#cadastres-menu a')).to_have_count(9)
        menu.click();expect(page.get_by_role('link',name='Fornecedores',exact=True)).not_to_be_visible()
        menu.click();record('Nove cadastros agrupados em menu expansível acessível')
        nav('Fornecedores');page.get_by_role('button',name='+ Cadastrar fornecedor',exact=True).click()
        expect(dialog()).to_have_class('modal modal-wide')
        field('Natureza da pessoa').select_option('organization')
        field('Razão social').fill('Papelaria Exemplo Ltda')
        field('CNPJ').fill('12.ABC.345/01DE-35')
        field('Nome fantasia').fill('Papelaria Exemplo')
        expect(dialog().get_by_label('Data de nascimento')).to_have_count(0)
        expect(dialog().get_by_label('CPF',exact=True)).to_have_count(0)
        field('Categoria de fornecimento').fill('Material escolar')
        field('Pessoa de contato').fill('Contato de Teste')
        field('Telefone / WhatsApp').fill('5575999990000')
        field('Logradouro').fill('Rua Sintética, Centro')
        dialog().locator('[data-section-target="general"]').click()
        expect(field('Razão social')).to_have_value('Papelaria Exemplo Ltda')
        expect(dialog().get_by_role('button',name='Salvar',exact=True)).to_be_in_viewport()
        page.screenshot(path=str(OUT/'01-fornecedor-desktop.png'),full_page=True)
        save();record('Fornecedor PJ salvo com CNPJ alfanumérico, sem dados acadêmicos e sem perder seções')
        supplier=client.get(base+'/persons?type_code=supplier',headers=headers).json()['items'][0]
        assert supplier['cnpj']=='12ABC34501DE35' and supplier['street']=='Rua Sintética, Centro'
        nav('Clientes');expect(page.get_by_text('Papelaria Exemplo',exact=True)).to_have_count(0)
        page.get_by_role('button',name='Vincular pessoa existente',exact=True).click()
        field('Pessoa cadastrada').select_option(supplier['id']);dialog().get_by_role('button',name='Salvar',exact=True).click()
        # Reuse leads to a role-specific editor, not a new identity.
        expect(dialog().get_by_role('heading',name='Adicionar vínculo de cliente',exact=True)).to_be_visible()
        field('Categoria do cliente').fill('Venda eventual');save()
        expect(page.get_by_text('Papelaria Exemplo',exact=True)).to_be_visible()
        customer=client.get(base+'/persons?type_code=customer',headers=headers).json()['items'][0]
        assert customer['id']==supplier['id']
        assert client.get(base+'/persons',headers=headers).json()['total']==1
        assert customer['business_profiles']['supplier']['category']=='Material escolar'
        record('Mesma identidade vinculada como cliente sem duplicação ou perda do fornecedor')
        page.get_by_role('button',name='Editar →',exact=True).click()
        field('Telefone / WhatsApp').fill('5575999991111');save()
        supplier2=client.get(base+'/persons?type_code=supplier',headers=headers).json()['items'][0]
        assert supplier2['phone']=='5575999991111' and supplier2['business_profiles']['supplier']['category']=='Material escolar'
        record('Edição contextual compartilha contatos e preserva detalhes dos outros vínculos')
        for label,singular,category in [('Prestadores de serviços','prestador de serviços','Especialidade / serviço'),('Sócios','sócio','Vínculo societário')]:
            nav(label);page.get_by_role('button',name='+ Cadastrar '+singular,exact=True).click()
            field('Nome completo').fill('Pessoa teste '+singular)
            field(category).fill('Categoria de teste');save()
        record('Prestadores e sócios possuem cadastro, campos e listagens próprios')
        nav('Cadastro único')
        page.get_by_label('Tipo de pessoa',exact=True).select_option('supplier')
        expect(page.get_by_text('Papelaria Exemplo Ltda',exact=True)).to_be_visible()
        expect(page.get_by_text('Pessoa teste sócio',exact=True)).to_have_count(0)
        page.get_by_label('Tipo de pessoa',exact=True).select_option('')
        record('Filtro por tipo processado no servidor sem misturar cadastros')
        page.get_by_role('button',name='+ Nova pessoa',exact=True).click()
        field('Nome completo').fill('Pessoa com alterações pendentes')
        field('Telefone / WhatsApp').fill('5575999992222')
        page.keyboard.press('Escape')
        expect(dialog().get_by_text('Existem alterações não salvas. Deseja descartá-las?',exact=True)).to_be_visible()
        dialog().get_by_role('button',name='Continuar editando',exact=True).click()
        expect(field('Nome completo')).to_have_value('Pessoa com alterações pendentes')
        dialog().locator('.person-type-picker summary').click()
        dialog().get_by_role('button',name='Responsável',exact=True).click()
        dialog().locator('.person-type-picker summary').click()
        dialog().get_by_role('button',name='Fornecedor',exact=True).click()
        record('Escape pede confirmação interna e mantém o formulário preenchido')
        # Focus never leaves the dialog; background is inert while it is open.
        dialog().get_by_role('button',name='Salvar',exact=True).focus()
        page.keyboard.press('Tab')
        assert page.evaluate("!!document.activeElement.closest('[role=dialog]')")
        assert page.locator('.workspace').evaluate('el=>el.inert')
        record('Foco contido no modal com Tab, fundo inerte e cabeçalho fixo')
        page.set_viewport_size({'width':390,'height':844})
        expect(dialog().get_by_role('button',name='Salvar',exact=True)).to_be_in_viewport()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path=str(OUT/'02-cadastro-mobile.png'),full_page=True)
        page.keyboard.press('Escape');dialog().get_by_role('button',name='Descartar alterações',exact=True).click()
        expect(dialog()).to_have_count(0)
        assert client.get(base+'/persons?q=Pessoa com alterações',headers=headers).json()['total']==0
        record('Cadastro responsivo em 390px, descarte explícito não persiste dados')
        page.set_viewport_size({'width':1440,'height':960})
        nav('Alunos');page.get_by_role('button',name='+ Novo aluno',exact=True).click()
        field('Nome completo').fill('Aluno com validação')
        field('Logradouro').fill('Rua de Teste')
        dialog().get_by_role('button',name='Salvar',exact=True).click()
        expect(dialog().get_by_label('Data de nascimento')).to_be_visible()
        expect(dialog().get_by_role('alert')).to_contain_text('Data de nascimento')
        record('Campo obrigatório oculto direciona para a seção correta antes de enviar')
        page.keyboard.press('Escape');dialog().get_by_role('button',name='Descartar alterações',exact=True).click()
        nav('Cobranças');page.get_by_role('button',name='+ Nova cobrança',exact=True).click()
        expect(dialog().get_by_role('heading',name='Nova cobrança ASAAS',exact=True)).to_be_visible()
        dialog().get_by_label('Valor de cada parcela (R$)').fill('450.00')
        dialog().get_by_label('Quantidade mensal (1 = avulsa)').fill('3')
        expect(dialog().locator('.charge-summary')).to_contain_text('1.350,00')
        page.screenshot(path=str(OUT/'03-lancamento-desktop.png'),full_page=True)
        page.keyboard.press('Escape');expect(dialog().get_by_role('button',name='Descartar alterações',exact=True)).to_be_visible()
        dialog().get_by_role('button',name='Continuar editando',exact=True).click()
        page.set_viewport_size({'width':390,'height':844})
        expect(dialog().get_by_role('button',name='Confirmar criação da(s) cobrança(s)',exact=True)).to_be_in_viewport()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path=str(OUT/'04-lancamento-mobile.png'),full_page=True)
        page.keyboard.press('Escape');dialog().get_by_role('button',name='Descartar alterações',exact=True).click()
        expect(dialog()).to_have_count(0)
        record('Lançamento em modal responsivo com resumo nominal e confirmação de descarte; sem alterar emissão')
        assert not errors,errors
        result={'status':'passed','checks':checks,'errors':errors,'mode':'ui_api_bridge' if BRIDGE else 'http_e2e',
                'database':'SQLite descartável','not_validated':['HTTP/cookies/CSP/PWA nativos'] if BRIDGE else [],'remote_providers':False}
        (OUT/'results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
        print(json.dumps({'status':'passed','checks':len(checks)}));browser.close()
except Exception:
    (OUT/'results.json').write_text(json.dumps({'status':'failed','checks':checks,'errors':errors},ensure_ascii=False,indent=2))
    try:page.screenshot(path=str(OUT/'failure.png'),full_page=True)
    except Exception:pass
    raise
finally:
    proc.terminate();proc.wait(timeout=10);log.close();shutil.rmtree(TEMP,ignore_errors=True)
