#!/usr/bin/env python3
"""Layout fixo, scroll independente e navegação. Somente dados sintéticos locais."""
import io, json, os, shutil, socket, subprocess, sys, tempfile, time
from pathlib import Path
from collections.abc import Callable
import httpx
from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'evidence/0.3.0/workspace';OUT.mkdir(parents=True,exist_ok=True)
TEMP=Path(tempfile.mkdtemp(prefix='pige-workspace-'))
with socket.socket() as sock:
    sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
URL=f'http://127.0.0.1:{port}'
PASSWORD='Synthetic-Workspace-Password-2026!'
BRIDGE=os.getenv('PIGE_UI_BRIDGE')=='1'
env={**os.environ,'PYTHONPATH':str(ROOT/'backend'),'DATABASE_URL':'sqlite:///'+str(TEMP/'e2e.db'),
     'ALLOW_SQLITE':'true','APP_ENV':'test','APP_URL':URL,'ALLOWED_HOSTS':'127.0.0.1,localhost',
     'APP_SECRET_KEY':'test-only-workspace-secret-01234567890123456789','SETUP_TOKEN':'test-only-setup-01234567890123456789',
     'STORAGE_PATH':str(TEMP/'files'),'FRONTEND_PATH':str(ROOT/'frontend/dist'),'COOKIE_SECURE':'false'}
subprocess.run([sys.executable,'-m','alembic','upgrade','head'],cwd=ROOT/'backend',env=env,check=True)
log=(OUT/'server.log').open('w')
proc=subprocess.Popen([sys.executable,'-m','uvicorn','app.main:app','--host','127.0.0.1','--port',str(port)],cwd=ROOT/'backend',env=env,stdout=log,stderr=log)
checks=[];errors=[]
def record(message):checks.append(message);print('PASS:',message,flush=True)
def wait_until(predicate: Callable[[], bool], message: str, timeout: float = 10) -> None:
    # Polling pelo cliente: não utiliza o eval do wait_for_function na página.
    # A CSP da aplicação permanece ativa, sem unsafe-eval ou bypass_csp.
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if predicate():
            return
        page.wait_for_timeout(50)
    raise AssertionError(message)
try:
    client=httpx.Client(base_url=URL,timeout=30)
    for _ in range(70):
        try:
            if client.get('/health/ready').status_code==200:break
        except httpx.HTTPError:pass
        time.sleep(.1)
    response=client.post('/api/v1/setup',headers={'X-Setup-Token':env['SETUP_TOKEN']},json={
        'admin_name':'Secretaria de Teste','admin_email':'workspace@example.com','admin_password':PASSWORD,
        'company_name':'Mantenedora Exemplo','school_name':'Colégio Exemplo','academic_year':2026})
    assert response.status_code==201,response.text
    login=client.post('/api/v1/auth/login',json={'email':'workspace@example.com','password':PASSWORD}).json()
    headers={'Authorization':'Bearer '+login['access_token']}
    # Ativo sintético para verificar contenção de uma marca vertical, sem logo real.
    logo=Image.new('RGBA',(220,260),'white');draw=ImageDraw.Draw(logo)
    draw.rounded_rectangle((35,15,185,200),radius=16,outline='#84754f',width=6)
    draw.line([(55,110),(110,55),(165,110),(165,180),(55,180),(55,110)],fill='#182a45',width=6)
    draw.rectangle((95,125,125,180),outline='#182a45',width=5)
    draw.text((63,218),'ESCOLA EXEMPLO',fill='#182a45')
    stream=io.BytesIO();logo.save(stream,format='PNG');logo_bytes=stream.getvalue()
    identity=client.get('/api/v1/institution/identity').json()
    data={key:identity[key] for key in ['version','display_name','short_name','primary_color','secondary_color','font_family']}
    data.update(primary_color='#84754f',secondary_color='#182a45',font_family='system')
    response=client.put('/api/v1/institution/identity',headers=headers,data={'payload':json.dumps(data)},files={'logo':('example.png',logo_bytes,'image/png')})
    assert response.status_code==200,response.text
    with sync_playwright() as pw:
        binary=os.getenv('CHROMIUM_PATH') or (None if Path(pw.chromium.executable_path).exists() else shutil.which('chromium'))
        browser=pw.chromium.launch(headless=True,**({'executable_path':binary} if binary else {}),args=['--no-sandbox'])
        context=browser.new_context(viewport={'width':1666,'height':896},locale='pt-BR')
        page=context.new_page();page.set_default_timeout(10000)
        page.on('pageerror',lambda error:errors.append(str(error)))
        if BRIDGE:
            from ui_bridge import install
            install(page,ROOT,URL,OUT)
            page.add_style_tag(content=client.get('/api/v1/institution/theme.css').text)
            # Somente no harness sem HTTP: raster da fixture local, sem redes externas.
            import base64
            data_uri='data:image/png;base64,'+base64.b64encode(logo_bytes).decode()
            page.evaluate("src=>new MutationObserver(()=>{for(const img of document.querySelectorAll('.sidebar-logo')){if(img.src!==src)img.src=src;}}).observe(document.body,{childList:true,subtree:true})",data_uri)
        else:page.goto(URL)
        page.get_by_label('E-mail',exact=True).fill('workspace@example.com')
        page.get_by_label('Senha',exact=True).fill(PASSWORD)
        page.get_by_role('button',name='Entrar na aplicação').click()
        expect(page.get_by_role('heading',name='Visão geral',exact=True)).to_be_visible()
        expect(page.locator('.app-root')).to_have_attribute('aria-busy','false')
        wait_until(lambda: page.locator('.sidebar-logo').evaluate('el=>el.complete && el.naturalWidth>0'), 'Logotipo institucional não carregou')
        nav=page.locator('.sidebar-scroll');main=page.locator('#main-content')
        def top(el):return el.evaluate('el=>el.scrollTop')
        def fixed():return page.evaluate("JSON.stringify(['.sidebar-brand','.topbar'].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return [r.x,r.y,r.width,r.height]}))")
        def width_ok():assert page.evaluate('document.documentElement.scrollWidth<=innerWidth && document.documentElement.scrollHeight<=innerHeight+1')
        button=page.get_by_role('button',name='Cadastros',exact=True)
        if button.get_attribute('aria-expanded')=='true':button.click()
        page.screenshot(path=str(OUT/'01-desktop.png'),full_page=True)
        button.click();expect(page.locator('#cadastres-menu a')).to_have_count(9)
        before=fixed();main_before=top(main)
        nav.hover();page.mouse.wheel(0,900)
        wait_until(lambda: top(nav)>0, 'O menu deve rolar independentemente')
        assert fixed()==before and top(main)==main_before
        record('Logo fixa: rolar menu não desloca marca, cabeçalho ou conteúdo')
        nav_before=top(nav)
        main.hover();page.mouse.wheel(0,1200)
        wait_until(lambda: top(main)>0, 'O conteúdo principal deve rolar independentemente')
        assert fixed()==before and top(nav)==nav_before
        width_ok();page.screenshot(path=str(OUT/'02-rolagem-independente.png'),full_page=True)
        record('Cabeçalho fixo: conteúdo tem scroll próprio sem rolagem global ou dupla')
        nav.focus();page.keyboard.press('Home')
        wait_until(lambda: top(nav)==0, 'Home deve levar o menu ao início')
        page.keyboard.press('End')
        wait_until(lambda: top(nav)>0, 'O menu deve rolar independentemente')
        record('Menu pode ser percorrido e rolado pelo teclado até o último item')
        page.locator('aside').get_by_role('link',name='Cadastro único',exact=True).click()
        expect(page.get_by_role('heading',name='Cadastro único',exact=True)).to_be_visible()
        expect(page.locator('aside a[aria-current=page]')).to_have_count(1)
        assert top(main)==0
        hrefs=page.locator('aside use').evaluate_all("els=>els.map(el=>el.getAttribute('href').split('#')[1])")
        import xml.etree.ElementTree as ET
        symbols={el.attrib['id'] for el in ET.parse(ROOT/'frontend/public/ui-icons.svg').getroot() if 'id' in el.attrib}
        assert set(hrefs)<=symbols, set(hrefs)-symbols
        record('Página ativa identificada; rotas preservadas e ícones vetoriais locais resolvidos')
        page.get_by_role('button',name='+ Nova pessoa',exact=True).click()
        expect(page.get_by_role('dialog')).to_be_visible()
        assert page.locator('.workspace').evaluate('el=>el.inert')
        page.keyboard.press('Escape');expect(page.get_by_role('dialog')).to_have_count(0)
        record('Modais de cadastro preservados: fundo inerte e fechamento continuam funcionando')
        page.locator('aside').get_by_role('link',name='Visão geral',exact=True).click()
        for width,height in [(1024,768),(768,600),(390,844),(320,640),(640,360)]:
            page.set_viewport_size({'width':width,'height':height})
            width_ok()
            assert page.locator('.topbar').bounding_box()['y']==0
            if width<=800:expect(page.locator('#school-navigation')).not_to_be_visible()
        record('Reflow em 1024, 768, 390 e 320px; janela baixa sem cortar áreas de navegação')
        page.set_viewport_size({'width':390,'height':844})
        main.evaluate('el=>el.scrollTop=0')
        page.screenshot(path=str(OUT/'03-mobile.png'),full_page=True)
        opener=page.get_by_role('button',name='Abrir menu',exact=True);opener.click()
        expect(opener).to_have_attribute('aria-expanded','true')
        expect(page.get_by_role('button',name='Fechar menu',exact=True)).to_be_focused()
        assert page.locator('.main-column').evaluate('el=>el.inert')
        page.locator('aside').get_by_role('link',name='Auditoria',exact=True).focus()
        page.keyboard.press('Tab');expect(page.get_by_role('button',name='Fechar menu',exact=True)).to_be_focused()
        nav.evaluate('el=>el.scrollTop=0')
        wait_until(lambda: page.locator('#school-navigation').evaluate('el=>Math.abs(el.getBoundingClientRect().x)<.5'), 'O menu móvel deve concluir sua abertura')
        page.screenshot(path=str(OUT/'04-menu-mobile.png'),full_page=True)
        page.keyboard.press('Escape')
        expect(opener).to_have_attribute('aria-expanded','false');expect(opener).to_be_focused()
        assert not page.locator('.main-column').evaluate('el=>el.inert')
        record('Drawer mobile contém foco, protege fundo e fecha com Escape devolvendo o foco')
        opener.click();page.locator('aside').get_by_role('link',name='Cadastro único',exact=True).click()
        expect(page.get_by_role('heading',name='Cadastro único',exact=True)).to_be_visible()
        expect(opener).to_have_attribute('aria-expanded','false')
        assert not page.locator('.main-column').evaluate('el=>el.inert')
        opener.click();page.set_viewport_size({'width':1280,'height':720})
        expect(page.locator('.menu-button')).to_have_attribute('aria-expanded','false')
        assert not page.locator('.main-column').evaluate('el=>el.inert')
        record('Navegação mobile e redimensionamento não deixam overlay ou bloqueio residual')
        page.locator('.skip-content').focus();page.keyboard.press('Enter')
        assert page.locator('main').evaluate('el=>el.contains(document.activeElement)')
        page.emulate_media(forced_colors='active',reduced_motion='reduce')
        assert nav.evaluate("el=>getComputedStyle(el).scrollbarWidth")=='auto'
        record('Atalho de conteúdo, alto contraste e movimento reduzido respeitados')
        assert not errors,errors
        (OUT/'results.json').write_text(json.dumps({'status':'passed','checks':checks,'errors':errors,'mode':'ui_api_bridge' if BRIDGE else 'http_e2e','database':'SQLite descartável','not_validated':['HTTP/cookies/CSP/PWA nativos'] if BRIDGE else [],'remote_providers':False},ensure_ascii=False,indent=2))
        browser.close()
except Exception:
    (OUT/'results.json').write_text(json.dumps({'status':'failed','checks':checks,'errors':errors},ensure_ascii=False,indent=2))
    try:page.screenshot(path=str(OUT/'failure.png'),full_page=True)
    except Exception:pass
    raise
finally:
    proc.terminate();proc.wait(timeout=10);log.close();shutil.rmtree(TEMP,ignore_errors=True)
