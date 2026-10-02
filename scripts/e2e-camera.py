#!/usr/bin/env python3
"""Componente real de câmera; HTTP local, Chromium e mídia sintética, sem dados pessoais."""
import functools
import http.server
import json
import os
from pathlib import Path
import shutil
import socketserver
import subprocess
import tempfile
import threading

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.getenv('PIGE_E2E_OUT', str(ROOT / 'evidence/camera')))
OUT.mkdir(parents=True, exist_ok=True)
checks = []
errors = []

def passed(text):
    checks.append(text)
    print('PASS:', text, flush=True)

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

with tempfile.TemporaryDirectory(prefix='pige-camera-e2e-') as temp:
    target = Path(temp)
    subprocess.run([str(ROOT/'frontend/node_modules/typescript/bin/tsc'), '--target','ES2022','--module','none','--lib','ES2022,DOM','--strict','--skipLibCheck','--outFile',str(target/'camera.js'),str(ROOT/'frontend/src/vue-globals.d.ts'),str(ROOT/'frontend/src/camera.ts')],check=True)
    shutil.copy(ROOT/'frontend/vendor/vue-3.5.13.global.prod.js', target/'vue.js')
    shutil.copy(ROOT/'frontend/public/camera.css', target/'camera.css')
    shutil.copy(ROOT/'frontend/src/app.css', target/'app.css')
    template=(ROOT/'frontend/templates/camera.html').read_text()
    (target/'index.html').write_text('''<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><link rel="stylesheet" href="/app.css"><link rel="stylesheet" href="/camera.css"></head><body><main id="test-camera"></main><script src="/vue.js"></script><script>const PigeRenders={camera:Vue.compile('''+json.dumps(template)+''')};</script><script src="/camera.js"></script><script>
window.cameraState=Vue.reactive({open:false,mode:'document',context:'escola-a',file:null});
const host=Vue.compile('<div><button id="open-camera" @click="s.open=true">Abrir câmera</button><camera-capture v-if="s.open" :mode="s.mode" :context-key="s.context" :max-bytes="2097152" @close="s.open=false" @captured="captured"></camera-capture><p id="result">{{s.file?s.file.name:""}}</p></div>');
Vue.createApp({components:{'camera-capture':PigeCamera.component},render:host,setup(){return {s:window.cameraState,captured(file){window.cameraState.file=file}}}}).mount('#test-camera');
</script></body></html>''')
    handler=functools.partial(QuietHandler,directory=str(target))
    with socketserver.TCPServer(('127.0.0.1',0),handler) as server:
        thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        url=f'http://127.0.0.1:{server.server_address[1]}'
        with sync_playwright() as pw:
            binary=os.getenv('CHROMIUM_PATH') or (None if Path(pw.chromium.executable_path).exists() else shutil.which('chromium'))
            browser=pw.chromium.launch(headless=True,**({'executable_path':binary} if binary else {}),args=['--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'])
            ctx=browser.new_context(viewport={'width':1366,'height':900},locale='pt-BR')
            page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(url)
            def open_camera(mode='document'):
                page.evaluate('(mode)=>cameraState.mode=mode',mode)
                page.get_by_role('button',name='Abrir câmera',exact=True).click()
                expect(page.get_by_role('button',name='Fotografar',exact=True)).to_be_enabled()
                page.evaluate("window.activeTestTrack=document.querySelector('.camera-dialog video').srcObject.getVideoTracks()[0]")
            def fits():
                assert page.evaluate("""()=>{const d=document.querySelector('.camera-dialog').getBoundingClientRect();return d.left>=0&&d.top>=0&&d.right<=innerWidth+1&&d.bottom<=innerHeight+1&&document.documentElement.scrollWidth<=innerWidth+1} """), 'Camera overflow'
                assert page.evaluate("""()=>{const v=document.querySelector('.camera-dialog video'),g=document.querySelector('.camera-guide');if(!v||!g)return true;const r=v.getBoundingClientRect(),f=g.getBoundingClientRect(),scale=Math.min(r.width/v.videoWidth,r.height/v.videoHeight);return getComputedStyle(v).objectFit==='contain'&&f.width<=v.videoWidth*scale+2&&f.height<=v.videoHeight*scale+2} """), 'Guide outside camera image'
            open_camera();fits();page.screenshot(path=str(OUT/'camera-documento-desktop.png'))
            native=page.locator('.camera-dialog video').evaluate('(v)=>({width:v.videoWidth,height:v.videoHeight})')
            assert native['width']>=640 and native['height']>=480
            page.get_by_role('button',name='Fotografar',exact=True).click();expect(page.locator('.camera-stage img')).to_be_visible()
            assert page.evaluate("activeTestTrack.readyState==='ended'")
            original=page.locator('.camera-stage img').evaluate('(img)=>({width:img.naturalWidth,height:img.naturalHeight})')
            assert original==native
            page.get_by_role('button',name='Girar 90°',exact=True).click()
            page.wait_for_function("""old=>{const i=document.querySelector('.camera-stage img');return i&&i.naturalWidth===old.height&&i.naturalHeight===old.width} """,arg=original)
            page.get_by_role('button',name='Usar foto',exact=True).click();expect(page.locator('.camera-dialog')).to_have_count(0)
            assert page.evaluate("cameraState.file instanceof File && cameraState.file.type==='image/jpeg' && cameraState.file.size<=2097152")
            assert page.evaluate("document.body.style.overflow===''")
            passed('Captura mantém resolução real, preserva quadro inteiro, permite giro e entrega JPEG confirmado; trilha encerrada')
            page.set_viewport_size({'width':390,'height':844});open_camera('portrait');fits()
            page.screenshot(path=str(OUT/'camera-pessoa-mobile.png'))
            page.set_viewport_size({'width':844,'height':390});page.wait_for_timeout(100);fits()
            assert page.evaluate("document.querySelector('.camera-dialog video').srcObject.getVideoTracks()[0]===activeTestTrack && activeTestTrack.readyState==='live'")
            page.screenshot(path=str(OUT/'camera-pessoa-paisagem.png'))
            page.get_by_role('button',name='Fotografar',exact=True).click();expect(page.get_by_role('button',name='Usar foto',exact=True)).to_be_enabled()
            page.get_by_role('button',name='Refazer foto',exact=True).click();expect(page.get_by_role('button',name='Fotografar',exact=True)).to_be_enabled()
            assert page.evaluate("activeTestTrack.readyState==='ended'")
            page.evaluate("window.activeTestTrack=document.querySelector('.camera-dialog video').srcObject.getVideoTracks()[0]")
            page.keyboard.press('Escape');expect(page.locator('.camera-dialog')).to_have_count(0)
            assert page.evaluate("activeTestTrack.readyState==='ended'")
            expect(page.locator('#open-camera')).to_be_focused()
            passed('Mobile retrato/paisagem sem cortes nem overflow; rotação mantém uma única stream; refazer e Escape liberam câmera')
            page.set_viewport_size({'width':320,'height':568});open_camera();fits()
            page.evaluate("cameraState.context='escola-b'");expect(page.locator('.camera-dialog')).to_have_count(0)
            assert page.evaluate("activeTestTrack.readyState==='ended'")
            passed('Troca de entidade encerra a captura e descarta imagem temporária')
            denied=ctx.new_page();denied.on('pageerror',lambda e:errors.append(str(e)))
            denied.add_init_script("navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('permission test','NotAllowedError')}")
            denied.goto(url);denied.get_by_role('button',name='Abrir câmera',exact=True).click()
            expect(denied.get_by_role('alert')).to_contain_text('A câmera não foi autorizada')
            expect(denied.get_by_role('button',name='Tentar novamente',exact=True)).to_be_enabled()
            expect(denied.locator('.camera-file input')).to_be_enabled()
            denied.get_by_role('button',name='Fechar câmera',exact=True).click()
            passed('Permissão recusada apresenta orientação e mantém escolha de arquivo e fechamento disponíveis')
            assert not errors, errors
            browser.close()
        server.shutdown();thread.join(timeout=5)
(OUT/'result.json').write_text(json.dumps({'status':'passed','checks':checks,'errors':errors,'media':'Chromium synthetic camera only'},ensure_ascii=False,indent=2))
