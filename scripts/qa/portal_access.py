"""Regressões dos portais com contas e serviços exclusivamente de teste."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from urllib.parse import urlsplit
import sqlite3
import subprocess
import sys

from playwright.sync_api import expect


class SogoFixture(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path != '/SOGo/':
            self.send_error(404)
            return
        principal = self.headers.get('x-webobjects-remote-user', '')
        self.server.principals.append(principal)
        payload = b'<html><body><h1>Caixa de teste do titular</h1></body></html>'
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, *_):
        pass


def start_sogo_fixture():
    service = ThreadingHTTPServer(('127.0.0.1', 0), SogoFixture)
    service.principals = []
    Thread(target=service.serve_forever, daemon=True).start()
    return service


def link_test_mailbox(client, base, admin, user_id, local_part, database):
    """Queue through the management API, then stand in for external provisioning and IMAP validation."""
    result = client.post(base + '/mailcow/mailboxes', headers=admin,
                         json={'user_id': user_id, 'local_part': local_part})
    assert result.status_code == 201, result.text
    mailbox = result.json()
    with sqlite3.connect(database) as db:
        updated = db.execute(
            "UPDATE school_mailboxes SET provisioned_at=CURRENT_TIMESTAMP, remote_active=1 WHERE id=?",
            (mailbox['id'],),
        )
        assert updated.rowcount == 1
        db.execute(
            """INSERT INTO email_connections
                 (id, school_id, user_id, mailbox_id, encrypted_secret, validated_at, checked_at,
                  address_override, last_error, version, created_at, updated_at)
               SELECT id, school_id, user_id, id, encrypted_password, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
                      '', '', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                 FROM school_mailboxes WHERE id=?""", (mailbox['id'],),
        )


def check_sogo_frame(page, nav, origin, school_id, user_id, upstream):
    events = []
    def response_seen(response):
        if '/webmail/' in response.url:
            events.append((response.status, response.request.method, response.url, response.request.headers.get('origin')))
    page.on('response', response_seen)
    nav.get_by_role('button', name='E-mail', exact=True).click()
    frame = page.frame_locator('iframe[title="Caixa de e-mail institucional"]')
    try:
        expect(frame.get_by_role('heading', name='Caixa de teste do titular')).to_be_visible()
    except AssertionError:
        print('Navegação do webmail fictício:', events, 'frames:', [frame.url for frame in page.frames], flush=True)
        raise
    finally:
        page.remove_listener('response', response_seen)
    assert any(frame.url == f'{origin}/webmail/{school_id}/SOGo/' for frame in page.frames)
    assert upstream.principals[-1] == f'{user_id}@{school_id}'


def check_teacher_layout(page, output, responsive):
    navigation = page.locator('#teacher-navigation')
    header = page.locator('.family-main > header')
    title = page.get_by_role('heading', name='Visão geral', exact=True)
    overview = page.locator('.teacher-overview')
    tabs = page.get_by_role('tablist', name='Tarefas abertas')
    for width, height in [(1440, 950), (390, 844), (320, 740)]:
        page.set_viewport_size({'width': width, 'height': height})
        expect(title).to_be_visible()
        sizes = page.evaluate("""async () => {
          await document.fonts.ready;
          const sidebar = document.getElementById('teacher-navigation');
          const header = document.querySelector('.family-main > header');
          await new Promise(requestAnimationFrame);
          await Promise.allSettled(sidebar.getAnimations().map(animation => animation.finished));
          const rect = element => {
            const {top, left, right, width, height} = element.getBoundingClientRect();
            return {top, left, right, width, height};
          };
          const viewport = document.documentElement.clientWidth;
          const pageWidth = document.documentElement.scrollWidth;
          return {
            viewport, pageWidth,
            overflowing: pageWidth <= viewport + 1 ? [] : [...document.body.querySelectorAll('*')]
              .filter(element => element.getBoundingClientRect().right > viewport + 1)
              .slice(0, 12).map(element => ({tag: element.localName, id: element.id,
                classes: element.getAttribute('class'), label: element.getAttribute('aria-label'), right: rect(element).right})),
            header: rect(header),
            headerPaddingRight: parseFloat(getComputedStyle(header).paddingRight),
            logout: rect(header.querySelector('button[aria-label="Sair"]')),
            sidebar: rect(sidebar),
            title: rect(document.getElementById('teacher-title')),
            overview: rect(document.querySelector('.teacher-overview'))
          };
        }""")
        assert sizes['pageWidth'] <= sizes['viewport'] + 1, sizes
        assert sizes['logout']['right'] <= sizes['header']['right'] - sizes['headerPaddingRight'] + 1, sizes
        assert -1 <= sizes['header']['top'] <= 2, sizes
        assert sizes['header']['height'] <= sizes['title']['top'] <= 230, sizes
        assert abs(sizes['header']['right'] - sizes['viewport']) <= 2, sizes
        available = sizes['viewport'] - sizes['header']['left']
        assert sizes['overview']['width'] >= available * 0.80, sizes
        if width >= 1000:
            assert sizes['header']['left'] >= 100, sizes
            assert abs(sizes['sidebar']['right'] - sizes['header']['left']) <= 2, sizes
        else:
            assert sizes['header']['left'] <= 2, sizes
        responsive[f'teacher-{width}'] = sizes
        page.screenshot(path=str(output / f'professor-painel-{width}.png'))
    page.set_viewport_size({'width': 390, 'height': 844})
    toggle = page.get_by_role('button', name='Abrir menu', exact=True)
    toggle.click()
    expect(page.get_by_role('button', name='Fechar menu', exact=True)).to_be_focused()
    expect(page.locator('.family-main')).to_have_attribute('inert', '')
    page.keyboard.press('Escape')
    expect(toggle).to_be_focused()
    page.set_viewport_size({'width': 1440, 'height': 950})
    expanded = navigation.bounding_box()['width']
    page.get_by_role('button', name='Recolher menu lateral', exact=True).click()
    expand = page.get_by_role('button', name='Expandir menu lateral', exact=True)
    expect(expand).to_be_visible()
    page.wait_for_function('limit => document.getElementById("teacher-navigation").getBoundingClientRect().width < limit', arg=expanded * 0.75)
    page.reload()
    expect(page.get_by_role('heading', name='Minhas turmas')).to_be_visible()
    expect(expand).to_be_visible()
    expand.click()
    navigation.get_by_role('button', name='Minha programação', exact=True).click()
    expect(tabs.get_by_role('tab', name='Minha programação', exact=True)).to_be_visible()
    page.once('dialog', lambda dialog: dialog.dismiss())
    tabs.get_by_role('tab', name='Visão geral', exact=True).dblclick()
    expect(tabs.get_by_role('tab')).to_have_count(2)
    page.once('dialog', lambda dialog: dialog.accept())
    tabs.get_by_role('tab', name='Visão geral', exact=True).dblclick()
    expect(tabs.get_by_role('tab')).to_have_count(1)
    expect(title).to_be_visible()
    expect(overview).to_be_visible()
    expect(header).to_be_visible()


def accept_local_access_link(page, *, root, env, user_id, purpose, origin, password):
    """Read just this synthetic user's outbox; the SMTP provider is outside this browser test."""
    read_message = r"""
import re, sys
from sqlalchemy import select
from app import models
from app.db import SessionLocal
from app.integration_core import unseal
from app.user_invitations import UserInvitation
with SessionLocal() as db:
    invitation=db.scalars(select(UserInvitation).where(UserInvitation.user_id==sys.argv[1],
        UserInvitation.purpose==sys.argv[2]).order_by(UserInvitation.created_at.desc())).first()
    assert invitation, 'Mensagem de acesso não foi enfileirada'
    body=unseal(db.get(models.IntegrationJob,invitation.job_id).encrypted_payload)['text']
    print(re.search(r'https?://\S+/first-access#[A-Za-z0-9_-]+',body).group())
"""
    link = subprocess.check_output([sys.executable, '-c', read_message, user_id, purpose],
                                   cwd=root/'backend', env=env, text=True).strip()
    parsed = urlsplit(link)
    assert f'{parsed.scheme}://{parsed.netloc}' == origin
    page.goto(link)
    page.get_by_label('Nova senha', exact=True).fill(password)
    page.get_by_label('Confirme a senha', exact=True).fill(password)
    page.get_by_role('button', name='Definir senha', exact=True).click()
    expect(page.locator('#invite-form')).to_be_hidden()
    page.get_by_role('link', name='Ir para o Portal do Professor', exact=True).click()
    expect(page.get_by_role('heading', name='Acesso do professor')).to_be_visible()
    assert urlsplit(page.url).netloc == parsed.netloc
