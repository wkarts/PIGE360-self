#!/usr/bin/env python3
"""Browser HTTP: cliente real com transporte de e-mail sintético, sem envio externo.

A suíte backend verifica separadamente IMAP/SMTP e a autorização por usuário/escola.
Este teste exercita templates, eventos, composição, leitura segura e layout no Chromium.
"""
import json
import os
import shutil
import subprocess
import tempfile
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'evidence/0.10.0/email-client'
OUT.mkdir(parents=True, exist_ok=True)
checks = []


def record(message):
    checks.append(message)
    print('PASS:', message, flush=True)


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def no_overflow(page):
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')


with tempfile.TemporaryDirectory(prefix='pige-email-client-') as temporary:
    subprocess.run(['node', str(ROOT / 'frontend/tests/email-preview.mjs'), temporary], check=True)
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=temporary))
    Thread(target=server.serve_forever, daemon=True).start()
    try:
        with sync_playwright() as pw:
            binary = os.getenv('CHROMIUM_PATH') or (None if Path(pw.chromium.executable_path).exists() else shutil.which('chromium'))
            browser = pw.chromium.launch(headless=True, **({'executable_path': binary} if binary else {}), args=['--no-sandbox'])
            page = browser.new_page(viewport={'width': 1440, 'height': 1000})
            errors, external = [], []
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.on('request', lambda r: external.append(r.url) if 'unsafe.invalid' in r.url else None)
            page.goto(f'http://127.0.0.1:{server.server_port}/')
            page.get_by_role('button', name='Secretaria Escolar', exact=False).click()
            expect(page.locator('.email-message-text')).to_contain_text('<img src=')
            assert page.locator('.email-message-text img').count() == 0
            assert not external
            page.screenshot(path=str(OUT / '01-desktop.png'), full_page=True)
            record('Leitura preserva texto hostil sem executar HTML ou carregar rastreador externo')
            with page.expect_download() as downloaded:
                page.get_by_role('button', name='Pauta da reunião.txt', exact=False).click()
            assert downloaded.value.suggested_filename == 'Pauta da reunião.txt'
            assert page.evaluate("calls.some(x=>x.method==='DOWNLOAD'&&x.url.includes('uidvalidity=7'))")
            record('Anexo baixado mantém UIDVALIDITY e nome original')
            for width, height in [(390, 844), (320, 568)]:
                page.set_viewport_size({'width': width, 'height': height})
                no_overflow(page)
                page.screenshot(path=str(OUT / f'02-reading-{width}.png'), full_page=True)
            page.get_by_role('button', name='Responder a todos', exact=True).click()
            dialog = page.get_by_role('dialog')
            expect(dialog).to_be_visible()
            expect(page.get_by_label('Para', exact=True)).to_have_value('secretaria@escola.example')
            expect(page.get_by_label('Cc', exact=True)).to_have_value('coordenacao@escola.example')
            page.get_by_label('Mensagem', exact=True).fill('Resposta preparada no celular.')
            page.locator('.email-upload input').set_input_files({'name': 'contribuicoes.txt', 'mimeType': 'text/plain', 'buffer': b'contribuicao sintetica'})
            expect(page.locator('.email-upload-list')).to_contain_text('contribuicoes.txt')
            page.get_by_role('button', name='Salvar rascunho', exact=True).click()
            expect(dialog.get_by_role('status')).to_contain_text('Rascunho salvo')
            assert page.evaluate("calls.filter(x=>x.url.endsWith('/drafts')).at(-1).body.attachments[0].content_base64==='Y29udHJpYnVpY2FvIHNpbnRldGljYQ=='")
            for width, height in [(390, 844), (320, 568)]:
                page.set_viewport_size({'width': width, 'height': height})
                no_overflow(page)
                button = page.get_by_role('button', name='Enviar mensagem', exact=True)
                expect(button).to_be_in_viewport()
                box = button.bounding_box()
                assert box['height'] >= 44 and box['y'] + box['height'] <= height + 1, box
                page.screenshot(path=str(OUT / f'03-compose-{width}.png'), full_page=True)
            record('Resposta a todos exclui endereço próprio; composição e anexos cabem em 320/390px com envio acessível')
            page.evaluate("sendStatus='uncertain'")
            page.get_by_role('button', name='Enviar mensagem', exact=True).click()
            expect(page.locator('.email-send-result')).to_contain_text('Confirmação pendente')
            expect(page.get_by_label('Para', exact=True)).to_be_disabled()
            page.evaluate("sendStatus='sent'")
            page.get_by_role('button', name='Consultar envio', exact=True).click()
            expect(page.locator('.email-send-result')).to_contain_text('Mensagem enviada')
            assert page.evaluate("JSON.stringify(calls.filter(x=>x.url.endsWith('/send'))[0].body)===JSON.stringify(calls.filter(x=>x.url.endsWith('/send'))[1].body)")
            record('Confirmação pendente congela conteúdo e reutiliza o mesmo UUID, sem nova tentativa independente')
            dialog.get_by_role('button', name='Fechar', exact=True).click()
            page.set_viewport_size({'width': 1440, 'height': 1000})
            page.get_by_role('button', name='Secretaria Escolar', exact=False).click()
            page.get_by_role('button', name='Encaminhar', exact=True).click()
            expect(page.locator('.email-upload-list')).to_contain_text('Pauta da reunião.txt')
            page.get_by_label('Para', exact=True).fill('direcao@escola.example')
            page.get_by_role('button', name='Salvar rascunho', exact=True).click()
            expect(page.get_by_role('dialog').get_by_role('status')).to_contain_text('Rascunho salvo')
            assert page.evaluate("calls.filter(x=>x.url.endsWith('/drafts')).at(-1).body.attachments[0].content_base64==='c3ludGhldGljIGZpbGU='")
            page.get_by_role('button', name='Fechar mensagem', exact=True).click()
            record('Encaminhar conserva os anexos originais no rascunho sem acesso externo')
            page.get_by_role('button', name='Lixeira', exact=True).last.click()
            assert page.evaluate("calls.some(x=>x.url.endsWith('/move')&&x.body.destination==='trash'&&x.body.uidvalidity===7)")
            record('Mover mensagem envia identidade completa da pasta e UIDVALIDITY')
            page.get_by_role('button', name='Nova pasta', exact=False).click()
            page.get_by_label('Nome da pasta', exact=True).fill('Projetos')
            page.get_by_role('button', name='Criar pasta', exact=True).click()
            page.get_by_role('button', name='Projetos', exact=True).click()
            page.get_by_role('button', name='Gerenciar pasta', exact=True).click()
            page.get_by_label('Nome da pasta', exact=True).last.fill('Projetos concluídos')
            page.get_by_role('button', name='Renomear pasta', exact=True).click()
            expect(page.get_by_role('button', name='Projetos concluídos', exact=True)).to_be_visible()
            page.get_by_role('button', name='Gerenciar pasta', exact=True).click()
            page.get_by_role('button', name='Excluir pasta…', exact=True).click()
            page.get_by_role('button', name='Excluir pasta vazia', exact=True).click()
            expect(page.get_by_role('button', name='Projetos concluídos', exact=True)).to_have_count(0)
            assert page.evaluate("calls.some(x=>x.method==='DELETE'&&x.url.includes('/folders/custom-renamed?confirm=true'))")
            record('Pastas pessoais podem ser criadas, renomeadas e excluídas com confirmação')
            page.get_by_role('button', name='Desconectar', exact=True).click()
            page.get_by_role('dialog').get_by_role('button', name='Desconectar', exact=True).click()
            expect(page.get_by_role('heading', name='Conecte sua caixa', exact=True)).to_be_visible()
            expect(page.get_by_label('Endereço de e-mail', exact=True)).to_have_value('ana@escola.example')
            page.get_by_label('Senha da caixa', exact=True).fill('Synthetic-email-password')
            page.get_by_role('button', name='Conectar e-mail', exact=True).click()
            expect(page.get_by_role('button', name='Escrever', exact=True)).to_be_visible()
            record('Desconexão e reconexão utilizam a senha própria da caixa institucional')
            assert not errors, errors
            record('Nenhum erro de JavaScript durante leitura, composição e gerenciamento de pastas')
            result = {'status': 'passed', 'checks': len(checks), 'details': checks, 'provider': 'synthetic; no external delivery'}
            (OUT / 'result.json').write_text(json.dumps(result, ensure_ascii=False, indent=2))
            print(json.dumps(result, ensure_ascii=False))
            browser.close()
    finally:
        server.shutdown()
