#!/usr/bin/env python3
"""Verifica isolamento/descarte do atendimento em Chromium com SDK sintético HTTP."""
import json
import os
import subprocess
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
TMP = Path(tempfile.mkdtemp(prefix='pige-support-browser-'))
subprocess.run(['node', str(ROOT/'frontend/node_modules/typescript/lib/tsc.js'),
                '--target', 'ES2022', '--module', 'none', '--lib', 'ES2022,DOM', '--strict',
                '--skipLibCheck', '--outFile', str(TMP/'widget.js'),
                str(ROOT/'frontend/src/vue-globals.d.ts'), str(ROOT/'frontend/src/support-widget.ts')], check=True)
WIDGET = (TMP/'widget.js').read_bytes()
SDK = b'''window.hubSDK={run({websiteToken}){
  parent.supportTicks??={};parent.supportTicks[websiteToken]??=0;
  setInterval(()=>parent.supportTicks[websiteToken]++,25);
  const bubble=document.createElement('button');bubble.textContent='Atendimento '+websiteToken;
  bubble.style.cssText='position:fixed;bottom:20px;left:20px;width:150px;height:48px;';
  bubble.onclick=()=>{const panel=document.createElement('iframe');panel.src='/panel';panel.title='Conversa';
    panel.style.cssText='position:fixed;bottom:80px;left:20px;width:300px;height:300px;';document.body.append(panel);};
  document.body.append(bubble);
}};'''


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_GET(self):
        parsed = urlsplit(self.path)
        content_type = 'text/html'
        if parsed.path == '/widget.js':
            body, content_type = WIDGET, 'application/javascript'
        elif parsed.path == '/packs/js/sdk.js':
            body, content_type = SDK, 'application/javascript'
        elif parsed.path.endswith('/support-widget'):
            school = parsed.path.split('/')[4] if '/schools/' in parsed.path else ''
            area = parse_qs(parsed.query).get('area', [''])[0]
            body = json.dumps({'enabled': bool(school) and area == 'online_enrollment', 'base_url': URL,
                               'website_token': school, 'position': 'left', 'type': 'standard',
                               'launcherTitle': 'Atendimento'}).encode()
            content_type = 'application/json'
        elif parsed.path == '/panel':
            body = b'<html lang="pt-BR"><body><label>Mensagem <input></label></body></html>'
        else:
            body = b'''<!doctype html><html lang="pt-BR"><head><title>Teste atendimento</title></head><body>
<button id="school-action" style="position:absolute;top:100px;left:100px" onclick="window.clicked=true">Formulario</button>
<script src="/vue-stub.js"></script><script src="/widget.js"></script></body></html>'''
            if parsed.path == '/vue-stub.js':
                body, content_type = b'window.Vue={reactive:x=>x};', 'application/javascript'
        self.send_response(200)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; frame-src 'self'")
        self.end_headers()
        self.wfile.write(body)


server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
URL = f'http://127.0.0.1:{server.server_port}'
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
checks = []
try:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH') or None,
                                             headless=True, args=['--no-sandbox'])
        page = browser.new_page(viewport={'width': 390, 'height': 844})
        page.goto(URL)
        page.evaluate("PigeSupport.load('', 'login')")
        expect(page.locator('iframe[data-pige-support-frame]')).to_have_count(0)
        page.evaluate("PigeSupport.load('a', 'online_enrollment')")
        frame = page.frame_locator('iframe[data-pige-support-frame]')
        expect(frame.get_by_role('button', name='Atendimento a')).to_be_visible()
        page.wait_for_function("document.querySelector('[data-pige-support-frame]').style.visibility==='visible'")
        page.locator('#school-action').click()
        assert page.evaluate('window.clicked') is True
        checks.append('Bolha isolada não bloqueia cliques no formulário mobile')
        frame.get_by_role('button', name='Atendimento a').click()
        expect(frame.frame_locator('iframe').get_by_role('textbox')).to_be_visible()
        frame.frame_locator('iframe').get_by_role('textbox').fill('Teste sintético')
        checks.append('Painel do atendimento abre e recebe digitação')
        page.evaluate("PigeSupport.load('b', 'online_enrollment')")
        expect(frame.get_by_role('button', name='Atendimento b')).to_be_visible()
        previous_ticks = page.evaluate('window.supportTicks.a')
        page.wait_for_timeout(150)
        assert page.evaluate('window.supportTicks.a') == previous_ticks
        assert page.evaluate('window.supportTicks.b') > 0
        checks.append('Troca de instituição encerra DOM, painel e timers anteriores')
        page.evaluate("PigeSupport.load('b', 'internal')")
        expect(page.locator('iframe[data-pige-support-frame]')).to_have_count(0)
        checks.append('Área interna desabilitada remove o widget imediatamente')
        page.evaluate("PigeSupport.load('b', 'online_enrollment', 'account-one')")
        expect(frame.get_by_role('button', name='Atendimento b')).to_be_visible()
        page.evaluate('window.oldSupportFrame=document.querySelector("[data-pige-support-frame]")')
        page.evaluate("PigeSupport.load('b', 'online_enrollment', 'account-two')")
        assert page.evaluate('!window.oldSupportFrame.isConnected')
        page.evaluate('PigeSupport.dispose()')
        expect(page.locator('iframe[data-pige-support-frame]')).to_have_count(0)
        checks.append('Troca de conta e saída descartam o contexto de atendimento')
        browser.close()
finally:
    server.shutdown()
    server.server_close()
print(json.dumps({'ok': True, 'checks': checks}, ensure_ascii=False))
