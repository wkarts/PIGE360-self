"""E-mail pessoal usa servidores de protocolo simulados, nunca envia e-mail real."""
import base64
import hashlib
import imaplib
import socket
import ssl
import uuid
from email import policy
from email.message import EmailMessage
from email.parser import BytesParser

import pytest
from sqlalchemy import select

from app import email_client as e, mailcow, models as m
from app.db import SessionLocal, now
from app.integration_core import IntegrationFailure, seal, unseal
from app.integration_worker import process_one
from test_mailcow import configure, fake_mailcow, new_user


def mime(subject='Mensagem de teste', text='Conteúdo institucional.', html=None, attachment=False):
    message = EmailMessage(policy=policy.SMTP)
    message['From'] = 'Pessoa Exemplo <pessoa@example.test>'
    message['To'] = 'destino@example.test'
    message['Subject'] = subject
    message['Message-ID'] = '<example@example.test>'
    message['Date'] = 'Fri, 02 Oct 2026 10:00:00 +0000'
    if html:
        message.set_content(html, subtype='html')
    else:
        message.set_content(text)
    if attachment:
        message.add_attachment(b'test-only-file', maintype='text', subtype='plain', filename='arquivo.txt')
    return message.as_bytes()


class FakeIMAP:
    capabilities = ('IMAP4REV1', 'UIDPLUS', 'MOVE')

    def __init__(self, state, *args):
        self.state = state
        self.selected = None
        self.literal = None
        self.validity = 901
        self.appended = None
        state['instances'].append(self)

    def login(self, address, password):
        self.state['logins'].append((address, password))
        if password != self.state['password'].encode('utf-8'):
            raise imaplib.IMAP4.error(b'Credentials secret-that-must-not-leak rejected')
        return 'OK', []

    def logout(self):
        return 'BYE', []

    def shutdown(self):
        pass

    @staticmethod
    def raw(value):
        return value.strip('"').replace('\\"', '"').replace('\\\\', '\\')

    def list(self):
        roles = {'INBOX': '', 'Sent': '\\Sent', 'Drafts': '\\Drafts', 'Junk': '\\Junk', 'Trash': '\\Trash'}
        return 'OK', [f'(\\HasNoChildren {roles.get(name, "")}) "/" "{name}"'.encode()
                      for name in self.state['folders']]

    def status(self, folder, names):
        items = self.state['folders'][self.raw(folder)]
        return 'OK', [f'{folder} (MESSAGES {len(items)} UNSEEN {sum(not x["seen"] for x in items.values())})'.encode()]

    def select(self, folder, readonly=True):
        self.selected = self.raw(folder)
        self.state['commands'].append(('select', self.selected, readonly))
        return 'OK', [str(len(self.state['folders'][self.selected])).encode()]

    def unselect(self):
        self.selected = None
        return 'OK', []

    def response(self, name):
        if name == 'UIDVALIDITY':
            return name, [str(self.validity).encode()]
        if name == 'APPENDUID':
            return name, [f'{self.validity} {self.appended}'.encode()]
        raise AssertionError(name)

    def create(self, folder):
        self.state['folders'][self.raw(folder)] = {}
        return 'OK', []

    def rename(self, source, target):
        self.state['folders'][self.raw(target)] = self.state['folders'].pop(self.raw(source))
        return 'OK', []

    def delete(self, folder):
        self.state['folders'].pop(self.raw(folder))
        return 'OK', []

    def append(self, folder, flags, date, raw):
        if self.state.get('append_error'):
            raise imaplib.IMAP4.abort('server disconnected with secret')
        rows = self.state['folders'][self.raw(folder)]
        self.appended = max([1000, *rows]) + 1
        rows[self.appended] = {'raw': raw, 'seen': '\\Seen' in flags, 'flagged': False, 'deleted': False}
        return 'OK', []

    def uid(self, command, *args):
        self.state['commands'].append((command, *args))
        rows = self.state['folders'][self.selected]
        if command == 'SEARCH':
            ids = [uid for uid, value in rows.items() if not value['deleted'] or 'ALL' in args]
            if 'UID' in args:
                last = int(args[args.index('UID') + 1].split(':')[1])
                ids = [uid for uid in ids if uid <= last]
            if 'TEXT' in args:
                query = self.literal.decode('utf-8')
                ids = [uid for uid in ids if query.casefold() in rows[uid]['raw'].decode(errors='replace').casefold()]
                self.literal = None
            return 'OK', [' '.join(map(str, sorted(ids))).encode()]
        ids = [int(value) for value in args[0].split(',')]
        if command == 'FETCH':
            out = []
            for uid in ids:
                row = rows.get(uid)
                if not row:
                    continue
                flags = ('\\Seen ' if row['seen'] else '') + ('\\Flagged' if row['flagged'] else '')
                meta = f'1 (UID {uid} FLAGS ({flags.strip()}) RFC822.SIZE {len(row["raw"])}'.encode()
                if 'HEADER.FIELDS' in args[1]:
                    out.append((meta + b' BODY[HEADER] {100}', row['raw'].split(b'\r\n\r\n')[0] + b'\r\n\r\n'))
                elif 'BODY.PEEK[]' in args[1]:
                    out.append((meta + b' BODY[] {100}', row['raw']))
                else:
                    out.append(meta + b')')
            return 'OK', out
        uid = ids[0]
        if command == 'STORE':
            flag = {'(\\Seen)': 'seen', '(\\Flagged)': 'flagged', '(\\Deleted)': 'deleted'}[args[2]]
            rows[uid][flag] = args[1].startswith('+')
        elif command == 'MOVE':
            self.state['folders'][self.raw(args[1])][uid] = rows.pop(uid)
        elif command == 'EXPUNGE':
            rows.pop(uid)
        else:
            raise AssertionError((command, args))
        return 'OK', []


class FakeSMTP:
    def __init__(self, state, *args):
        self.state = state

    def login(self, address, password):
        assert password == self.state['password']
        self.state.setdefault('smtp_logins', []).append(address)

    def sendmail(self, sender, recipients, content):
        self.state['sent'].append((sender, recipients, content))
        if self.state.get('send_error'):
            raise self.state['send_error']
        return self.state.get('refused', {})

    def quit(self):
        if self.state.get('quit_error'):
            raise OSError('simulated QUIT failure')

    def close(self):
        if self.state.get('quit_error'):
            raise OSError('simulated close failure')


@pytest.fixture
def mailbox_api(client, admin, school, monkeypatch):
    configure(client, admin, school)
    fake_mailcow(monkeypatch)
    user = new_user(client, admin, school, create_mailbox=True, mailbox_school_id=school['id'],
                    mailbox_local_part='titular.' + uuid.uuid4().hex[:8])
    assert process_one(user['mailbox']['job_id'])
    login = client.post('/api/v1/auth/login', json={'email': user['email'], 'password': 'Example-only-app-password-2026!'})
    headers = {'Authorization': 'Bearer ' + login.json()['access_token']}
    with SessionLocal() as db:
        row = db.get(mailcow.SchoolMailbox, user['mailbox']['id'])
        password = unseal(row.encrypted_password)['password']
    state = {'password': password, 'folders': {name: {} for name in ('INBOX', 'Sent', 'Drafts', 'Junk', 'Trash')},
             'instances': [], 'logins': [], 'sent': [], 'commands': []}
    for uid in range(1, 5):
        state['folders']['INBOX'][uid] = {'raw': mime(f'Mensagem {uid}', attachment=uid == 4),
                                        'seen': False, 'flagged': False, 'deleted': False}
    monkeypatch.setattr(e, '_target', lambda *args: '8.8.8.8')
    monkeypatch.setattr(e, 'PinnedIMAP', lambda *args: FakeIMAP(state, *args))
    monkeypatch.setattr(e, 'PinnedSMTPSSL', lambda *args: FakeSMTP(state, *args))
    automatic = client.post(f'/api/v1/schools/{school["id"]}/email/connection/automatic', headers=headers, json={})
    assert automatic.status_code == 200 and automatic.json()['connected'], automatic.text
    return {'client': client, 'admin': admin, 'school': school, 'user': user, 'headers': headers,
            'base': f'/api/v1/schools/{school["id"]}/email', 'state': state}


def test_provisioned_connection_is_separate_from_ephemeral_initial_password(mailbox_api):
    a = mailbox_api
    account = a['client'].get(a['base'] + '/account', headers=a['headers'])
    assert account.status_code == 200 and account.json()['connected'] is True
    with SessionLocal() as db:
        connection = db.scalar(select(e.EmailConnection).where(e.EmailConnection.user_id == a['user']['id']))
        assert unseal(connection.encrypted_secret)['password'] == a['state']['password']
        assert a['state']['password'] not in connection.encrypted_secret
    initial = a['client'].post(a['base'].replace('/email', '/mailcow') + '/mailboxes/' + a['user']['mailbox']['id'] + '/credentials', headers=a['admin'])
    assert initial.status_code == 200
    with SessionLocal() as db:
        assert db.get(mailcow.SchoolMailbox, a['user']['mailbox']['id']).encrypted_password == ''
        connection = db.scalar(select(e.EmailConnection).where(e.EmailConnection.user_id == a['user']['id']))
        assert unseal(connection.encrypted_secret)['password'] == a['state']['password']
    assert a['client'].get(a['base'] + '/folders', headers=a['headers']).status_code == 200
    assert a['state']['password'] not in account.text


def test_personal_access_supports_teacher_and_never_exposes_others_mailbox(mailbox_api):
    a = mailbox_api
    with SessionLocal() as db:
        db.get(m.User, a['user']['id']).role = 'teacher'; db.commit()
    assert a['client'].get(a['base'] + '/folders', headers=a['headers']).status_code == 200
    admin_account = a['client'].get(a['base'] + '/account', headers=a['admin']).json()
    assert admin_account['available'] is False and admin_account['address'] == ''
    assert a['client'].get(a['base'] + '/messages?folder=SU5CT1g', headers=a['admin']).status_code == 409
    with SessionLocal() as db:
        db.delete(db.get(m.SchoolAccess, (a['user']['id'], a['school']['id']))); db.commit()
    assert a['client'].get(a['base'] + '/account', headers=a['headers']).status_code == 403


def test_credentials_validate_both_protocols_disconnect_and_do_not_leak(mailbox_api):
    a = mailbox_api
    assert a['client'].delete(a['base'] + '/connection', headers=a['headers']).status_code == 200
    assert a['client'].get(a['base'] + '/account', headers=a['headers']).json()['needs_password']
    assert a['client'].get(a['base'] + '/folders', headers=a['headers']).status_code == 409
    bad = a['client'].post(a['base'] + '/connection', headers=a['headers'], json={'password': 'wrong-secret'})
    assert bad.status_code == 502 and 'senha' in bad.text and 'secret' not in bad.text
    good = a['client'].post(a['base'] + '/connection', headers=a['headers'], json={'password': a['state']['password']})
    assert good.status_code == 200 and good.json()['connected'] and a['state']['sent'] == []
    with SessionLocal() as db:
        event = db.scalars(select(m.AuditEvent).where(m.AuditEvent.school_id == a['school']['id'])).all()
        assert a['state']['password'] not in str([x.details for x in event])


def test_uid_pagination_read_mime_attachment_and_stale_uid_guard(mailbox_api):
    a = mailbox_api
    first = a['client'].get(a['base'] + '/messages?folder=SU5CT1g&limit=2', headers=a['headers']).json()
    assert [x['uid'] for x in first['items']] == [4, 3] and first['next_before_uid'] == 3
    second = a['client'].get(a['base'] + '/messages?folder=SU5CT1g&limit=2&before_uid=3', headers=a['headers']).json()
    assert [x['uid'] for x in second['items']] == [2, 1] and second['next_before_uid'] is None
    read = a['client'].get(a['base'] + '/messages/4?folder=SU5CT1g&uidvalidity=901', headers=a['headers'])
    assert read.status_code == 200 and 'Conteúdo' in read.json()['text']
    attachment = read.json()['attachments'][0]
    downloaded = a['client'].get(a['base'] + '/messages/4/attachments/' + attachment['part'] + '?folder=SU5CT1g&uidvalidity=901', headers=a['headers'])
    assert downloaded.content == b'test-only-file'
    assert downloaded.headers['content-type'] == 'application/octet-stream'
    assert downloaded.headers['content-security-policy'] == "default-src 'none'; sandbox"
    stale = a['client'].patch(a['base'] + '/messages/4/flags', headers=a['headers'], json={'folder': 'SU5CT1g', 'uidvalidity': 902, 'seen': True})
    assert stale.status_code == 409 and not a['state']['folders']['INBOX'][4]['seen']
    assert a['client'].get(a['base'] + '/messages/4?folder=SU5CT1g&uidvalidity=902', headers=a['headers']).status_code == 409
    assert a['client'].get(a['base'] + '/messages/999?folder=SU5CT1g&uidvalidity=901', headers=a['headers']).status_code == 404


def test_html_is_never_returned_as_active_content(mailbox_api):
    a = mailbox_api
    a['state']['folders']['INBOX'][1]['raw'] = mime(html='<html><head><script>secret_script()</script></head><body><p>Olá família</p><img src="https://tracker.example.test/x"><svg onload="evil()">hidden</svg></body></html>')
    response = a['client'].get(a['base'] + '/messages/1?folder=SU5CT1g&uidvalidity=901', headers=a['headers'])
    assert response.status_code == 200
    assert 'Olá família' in response.json()['text']
    assert not any(x in response.json()['text'] for x in ('script', 'tracker', 'evil', 'hidden', '<'))
    assert 'html' not in response.json()


def test_move_and_permanent_delete_are_single_uid_and_safe(mailbox_api):
    a = mailbox_api
    denied = a['client'].delete(a['base'] + '/messages/1?folder=SU5CT1g&uidvalidity=901&confirm=true', headers=a['headers'])
    assert denied.status_code == 409
    flagged = a['client'].patch(a['base'] + '/messages/1/flags', headers=a['headers'], json={'folder': 'SU5CT1g', 'uidvalidity': 901, 'seen': True, 'flagged': True})
    assert flagged.status_code == 200 and a['state']['folders']['INBOX'][1]['seen']
    moved = a['client'].post(a['base'] + '/messages/1/move', headers=a['headers'], json={'folder': 'SU5CT1g', 'uidvalidity': 901, 'destination': e._folder_id('Trash')})
    assert moved.status_code == 200 and 1 not in a['state']['folders']['INBOX']
    a['state']['folders']['Trash'][2] = {'raw': mime(), 'seen': True, 'flagged': False, 'deleted': True}
    path = a['base'] + '/messages/1?folder=' + e._folder_id('Trash') + '&uidvalidity=901'
    assert a['client'].delete(path, headers=a['headers']).status_code == 422
    assert a['client'].delete(path + '&confirm=true', headers=a['headers']).status_code == 200
    assert 2 in a['state']['folders']['Trash']
    assert not any(x[0] == 'EXPUNGE' and len(x) != 2 for x in a['state']['commands'])


def test_folder_create_unicode_rename_delete_only_empty_custom(mailbox_api):
    a = mailbox_api
    create = a['client'].post(a['base'] + '/folders', headers=a['headers'], json={'name': 'Reuniões & avisos'})
    assert create.status_code == 201 and create.json()['name'] == 'Reuniões & avisos'
    folder = create.json()['id']
    renamed = a['client'].patch(a['base'] + '/folders/' + folder, headers=a['headers'], json={'name': 'Arquivo pessoal'})
    assert renamed.status_code == 200
    folder = renamed.json()['id']
    assert a['client'].delete(a['base'] + '/folders/' + folder + '?confirm=true', headers=a['headers']).status_code == 200
    assert a['client'].delete(a['base'] + '/folders/SU5CT1g?confirm=true', headers=a['headers']).status_code == 409
    assert a['client'].patch(a['base'] + '/folders/' + e._folder_id('Sent'), headers=a['headers'], json={'name': 'Outro'}).status_code == 409
    assert a['client'].post(a['base'] + '/folders', headers=a['headers'], json={'name': 'bad\r\nDELETE INBOX'}).status_code == 422


def test_draft_save_replace_and_send_once_preserves_bcc_privacy(mailbox_api):
    a = mailbox_api
    compose = {'to': ['familia@example.com'], 'bcc': ['direcao@example.com'], 'subject': 'Aviso', 'text': 'Boa tarde.',
               'attachments': [{'filename': 'aviso.txt', 'content_type': 'text/plain', 'content_base64': base64.b64encode(b'anexo').decode()}]}
    saved = a['client'].post(a['base'] + '/drafts', headers=a['headers'], json=compose)
    assert saved.status_code == 201 and saved.json()['saved']
    assert a['state']['sent'] == []
    draft = {key: saved.json()[key] for key in ('folder', 'uid', 'uidvalidity')}
    compose['draft'] = draft
    updated = a['client'].post(a['base'] + '/drafts', headers=a['headers'], json={**compose, 'text': 'Boa tarde a todos.'})
    assert updated.status_code == 201 and updated.json()['previous_removed']
    compose['draft'] = {key: updated.json()[key] for key in ('folder', 'uid', 'uidvalidity')}
    compose['request_id'] = str(uuid.uuid4())
    sent = a['client'].post(a['base'] + '/send', headers=a['headers'], json=compose)
    assert sent.status_code == 200 and sent.json()['status'] == 'sent' and sent.json()['sent_saved']
    assert len(a['state']['sent']) == 1 and len(a['state']['folders']['Sent']) == 1
    sender, recipients, raw = a['state']['sent'][0]
    assert sender == a['user']['mailbox']['address'] and recipients == ['familia@example.com', 'direcao@example.com']
    assert b'Bcc:' not in raw and b'direcao@example.com' not in raw
    assert a['state']['folders']['Drafts'] == {}
    again = a['client'].post(a['base'] + '/send', headers=a['headers'], json=compose)
    assert again.status_code == 200 and again.json()['status'] == 'sent' and len(a['state']['sent']) == 1
    conflict = a['client'].post(a['base'] + '/send', headers=a['headers'], json={**compose, 'subject': 'Outro'})
    assert conflict.status_code == 409 and len(a['state']['sent']) == 1


def test_sent_is_not_repeated_when_sent_copy_fails(mailbox_api):
    a = mailbox_api
    a['state']['append_error'] = True
    payload = {'to': ['familia@example.com'], 'subject': 'Aviso', 'text': 'Mensagem', 'request_id': str(uuid.uuid4())}
    first = a['client'].post(a['base'] + '/send', headers=a['headers'], json=payload)
    assert first.status_code == 200 and first.json()['status'] == 'sent' and not first.json()['sent_saved']
    assert 'não reenvie' in first.json()['message']
    again = a['client'].post(a['base'] + '/send', headers=a['headers'], json=payload)
    assert again.json()['status'] == 'sent' and len(a['state']['sent']) == 1


def test_smtp_uncertainty_and_partial_delivery_do_not_auto_retry(mailbox_api):
    a = mailbox_api
    a['state']['send_error'] = TimeoutError('sensitive provider output')
    payload = {'to': ['familia@example.com'], 'text': 'Mensagem', 'request_id': str(uuid.uuid4())}
    first = a['client'].post(a['base'] + '/send', headers=a['headers'], json=payload)
    assert first.status_code == 200 and first.json()['status'] == 'uncertain' and 'sensitive' not in first.text
    assert a['client'].post(a['base'] + '/send', headers=a['headers'], json=payload).json()['status'] == 'uncertain'
    assert len(a['state']['sent']) == 1
    a['state']['send_error'] = None
    a['state']['refused'] = {'direcao@example.com': (550, b'sensitive refusal')}
    partial = a['client'].post(a['base'] + '/send', headers=a['headers'], json={**payload, 'request_id': str(uuid.uuid4()), 'cc': ['direcao@example.com']})
    assert partial.json()['status'] == 'partial' and partial.json()['refused'] == ['direcao@example.com']
    assert 'sensitive' not in partial.text


def test_compose_rejects_header_injection_bad_mime_and_wrong_draft(mailbox_api):
    a = mailbox_api
    base = {'to': ['familia@example.com'], 'request_id': str(uuid.uuid4())}
    for field in ({'subject': 'subject\r\nBcc: evil@example.com'},
                  {'to': ['family@example.com\r\nDATA']},
                  {'attachments': [{'filename': 'x', 'content_type': 'invalid', 'content_base64': 'AA=='}]},
                  {'attachments': [{'filename': 'x', 'content_base64': 'not base64'}]},
                  {'draft': {'folder': 'SU5CT1g', 'uid': 1, 'uidvalidity': 901}}):
        response = a['client'].post(a['base'] + '/send', headers=a['headers'], json={**base, **field})
        assert response.status_code == 422, response.text
    assert not a['state']['sent']


def test_settings_admin_only_and_enforces_safe_protocols(mailbox_api):
    a = mailbox_api
    assert a['client'].get(a['base'] + '/settings', headers=a['headers']).status_code == 403
    saved = a['client'].put(a['base'] + '/settings', headers=a['admin'], json={'imap_host': 'mail.example.com', 'smtp_host': 'submit.example.com', 'smtp_port': 587})
    assert saved.status_code == 200 and saved.json()['smtp_port'] == 587
    for value in ({'smtp_port': 25}, {'smtp_host': '127.0.0.1'}, {'imap_host': 'localhost'}, {'smtp_host': 'https://evil.example.com'}):
        assert a['client'].put(a['base'] + '/settings', headers=a['admin'], json=value).status_code == 422


def test_network_validation_rejects_loopback_private_and_mixed_rebinding(monkeypatch):
    def answers(values):
        monkeypatch.setattr(e.socket, 'getaddrinfo', lambda *args, **kwargs: [(socket.AF_INET, socket.SOCK_STREAM, 6, '', (value, 993)) for value in values])
    for value in ('127.0.0.1', '169.254.169.254', '0.0.0.0', '224.0.0.1', '10.20.30.40'):
        answers([value])
        with pytest.raises(IntegrationFailure, match='EMAIL_ADDRESS'):
            e._target('mail.example.com', 993, False)
    answers(['8.8.8.8', '127.0.0.1'])
    with pytest.raises(IntegrationFailure, match='EMAIL_ADDRESS'):
        e._target('mail.example.com', 993, True)
    answers(['10.20.30.40'])
    assert e._target('mail.example.com', 993, True) == '10.20.30.40'
    answers(['8.8.8.8'])
    assert e._target('mail.example.com', 993, False) == '8.8.8.8'


def test_pinned_tls_sockets_keep_hostname_verification(monkeypatch):
    calls = []
    class Socket:
        def close(self): pass
    class Context:
        def wrap_socket(self, sock, server_hostname):
            calls.append(('tls', server_hostname)); return sock
    monkeypatch.setattr(e, '_tcp', lambda ip, port, timeout: (calls.append(('tcp', ip, port)) or Socket()))
    imap = object.__new__(e.PinnedIMAP)
    imap.pinned_ip, imap.host, imap.ssl_context = '8.8.8.8', 'mail.example.com', Context()
    imap._create_socket(5)
    smtp = object.__new__(e.PinnedSMTPSSL)
    smtp.pinned_ip, smtp.context = '8.8.8.8', Context()
    smtp._get_socket('mail.example.com', 465, 5)
    assert calls == [('tcp', '8.8.8.8', 993), ('tls', 'mail.example.com'), ('tcp', '8.8.8.8', 465), ('tls', 'mail.example.com')]
    default = ssl.create_default_context()
    assert default.check_hostname and default.verify_mode == ssl.CERT_REQUIRED


def test_mime_limits_and_filename_safety():
    assert e._filename('../../file\r\n.txt') == '_.._file__.txt'
    mailbox = mailcow.SchoolMailbox(address='own@example.com', display_name='Titular')
    data = e.ComposeInput(to=['family@example.com'], attachments=[e.AttachmentInput(filename='big', content_base64=base64.b64encode(b'x' * (e.MAX_ATTACHMENTS + 1)).decode())])
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as error:
        e._compose(data, mailbox, '<test@example.com>')
    assert error.value.status_code == 413


def test_imap_refuses_unsafe_delete_without_uidplus(mailbox_api, monkeypatch):
    a = mailbox_api
    a['state']['folders']['Trash'][1] = a['state']['folders']['INBOX'][1]
    monkeypatch.setattr(FakeIMAP, 'capabilities', ('IMAP4REV1', 'MOVE'))
    response = a['client'].delete(a['base'] + '/messages/1?folder=' + e._folder_id('Trash') + '&uidvalidity=901&confirm=true', headers=a['headers'])
    assert response.status_code == 502
    assert not a['state']['folders']['Trash'][1]['deleted']
    assert not any(command[0] == 'STORE' for command in a['state']['commands'])


def test_actual_stdlib_clients_over_local_tls_protocol_servers(tmp_path, monkeypatch):
    """Exercita wire-format e TLS real contra servidores locais descartáveis."""
    import threading
    from contextlib import contextmanager
    from datetime import datetime, timedelta, UTC
    from cryptography import x509
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.x509.oid import NameOID

    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, 'mail.example.test')])
    cert = (x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(key.public_key())
            .serial_number(x509.random_serial_number()).not_valid_before(datetime.now(UTC) - timedelta(minutes=1))
            .not_valid_after(datetime.now(UTC) + timedelta(hours=1))
            .add_extension(x509.SubjectAlternativeName([x509.DNSName('mail.example.test')]), critical=False)
            .sign(key, hashes.SHA256()))
    cert_path, key_path = tmp_path / 'test.pem', tmp_path / 'test.key'
    cert_path.write_bytes(cert.public_bytes(serialization.Encoding.PEM))
    key_path.write_bytes(key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()))
    server_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    server_context.load_cert_chain(cert_path, key_path)
    original_context = ssl.create_default_context
    monkeypatch.setattr(e.ssl, 'create_default_context', lambda: original_context(cafile=cert_path))
    captured, errors = [], []

    @contextmanager
    def server(mode):
        listener = socket.socket(); listener.bind(('127.0.0.1', 0)); listener.listen(1)
        listener.settimeout(5)
        port = listener.getsockname()[1]
        def run():
            try:
                raw, _ = listener.accept()
                with server_context.wrap_socket(raw, server_side=True) as conn:
                    conn.settimeout(5)
                    stream = conn.makefile('rb')
                    conn.sendall(b'* OK test server\r\n' if mode == 'imap' else b'220 mail.example.test ESMTP\r\n')
                    data_mode = False
                    while line := stream.readline():
                        captured.append((mode, line))
                        if data_mode:
                            if line == b'.\r\n':
                                conn.sendall(b'250 accepted\r\n'); data_mode = False
                            continue
                        if mode == 'imap':
                            tag, command, *_ = line.split()
                            if command == b'CAPABILITY':
                                conn.sendall(b'* CAPABILITY IMAP4rev1 UIDPLUS MOVE\r\n' + tag + b' OK capability\r\n')
                            elif command == b'LOGIN':
                                conn.sendall(tag + b' OK authenticated\r\n')
                            elif command == b'LOGOUT':
                                conn.sendall(b'* BYE goodbye\r\n' + tag + b' OK logout\r\n'); break
                            else:
                                raise AssertionError(line)
                        else:
                            command = line.split()[0].upper()
                            if command == b'EHLO':
                                conn.sendall(b'250-mail.example.test\r\n250 AUTH PLAIN\r\n')
                            elif command == b'AUTH': conn.sendall(b'235 authenticated\r\n')
                            elif command in (b'MAIL', b'RCPT'): conn.sendall(b'250 accepted\r\n')
                            elif command == b'DATA': conn.sendall(b'354 send data\r\n'); data_mode = True
                            elif command == b'QUIT': conn.sendall(b'221 goodbye\r\n'); break
                            else: raise AssertionError(line)
            except BaseException as error:
                errors.append(type(error).__name__)
            finally:
                listener.close()
        thread = threading.Thread(target=run, daemon=True); thread.start()
        try: yield port
        finally: thread.join(timeout=6)

    original_tcp = e._tcp
    with server('imap') as port:
        monkeypatch.setattr(e, '_tcp', lambda ip, requested_port, timeout: original_tcp('127.0.0.1', port, timeout))
        with e.PinnedIMAP('mail.example.test', '8.8.8.8', 3) as client:
            assert client.login('teacher@example.test', b'test-password')[0] == 'OK'
    with server('smtp') as port:
        monkeypatch.setattr(e, '_tcp', lambda ip, requested_port, timeout: original_tcp('127.0.0.1', port, timeout))
        with e.PinnedSMTPSSL('mail.example.test', '8.8.8.8', 3) as client:
            client.login('teacher@example.test', 'test-password')
            assert client.sendmail('teacher@example.test', ['parent@example.test'], b'Subject: Test\r\n\r\nSynthetic local message.') == {}
    assert errors == []
    assert any(mode == 'imap' and b'LOGIN' in line for mode, line in captured)
    assert any(mode == 'smtp' and b'Synthetic local message.' in line for mode, line in captured)


def test_starttls_is_required_before_authentication(monkeypatch):
    import smtplib
    events = []
    monkeypatch.setattr(smtplib.SMTP, '__init__', lambda self, *args, **kwargs: events.append('connect'))
    monkeypatch.setattr(smtplib.SMTP, 'ehlo', lambda self: events.append('ehlo'))
    def missing_tls(self, **kwargs):
        events.append('starttls')
        assert kwargs['context'].check_hostname and kwargs['context'].verify_mode == ssl.CERT_REQUIRED
        raise smtplib.SMTPNotSupportedError('STARTTLS absent')
    monkeypatch.setattr(smtplib.SMTP, 'starttls', missing_tls)
    monkeypatch.setattr(smtplib.SMTP, 'close', lambda self: events.append('close'))
    with pytest.raises(smtplib.SMTPNotSupportedError):
        e.PinnedSMTPStartTLS('mail.example.test', '8.8.8.8', 5)
    assert events == ['connect', 'ehlo', 'starttls', 'close']


def test_smtp_acceptance_survives_quit_and_close_failure(mailbox_api):
    a = mailbox_api
    a['state']['quit_error'] = True
    payload = {'to': ['family@example.com'], 'text': 'Message', 'request_id': str(uuid.uuid4())}
    result = a['client'].post(a['base'] + '/send', headers=a['headers'], json=payload)
    assert result.status_code == 200 and result.json()['status'] == 'sent' and result.json()['sent_saved']
    assert a['client'].post(a['base'] + '/send', headers=a['headers'], json=payload).json()['status'] == 'sent'
    assert len(a['state']['sent']) == 1


def test_automatic_connection_waits_for_both_protocols_and_exposes_no_password(mailbox_api, monkeypatch):
    a=mailbox_api
    with SessionLocal() as db:
        connection=db.scalar(select(e.EmailConnection).where(e.EmailConnection.user_id==a['user']['id']))
        connection.validated_at=None;connection.checked_at=None;db.commit()
    count=len(a['state']['logins'])
    pending=a['client'].get(a['base']+'/account',headers=a['headers']).json()
    assert not pending['connected'] and pending['can_auto_connect'] and not pending['needs_password']
    assert len(a['state']['logins'])==count  # A tela/painel não realiza rede em GET.
    assert pending['connection_parameters']=={'imap_host':'mail.escola.example.test','imap_port':993,'imap_security':'TLS','smtp_host':'mail.escola.example.test','smtp_port':465,'smtp_security':'TLS','username':a['user']['mailbox']['address']}
    smtp=[]
    class CheckedSMTP(FakeSMTP):
        def login(self,address,password):
            super().login(address,password);smtp.append(address)
    monkeypatch.setattr(e,'PinnedSMTPSSL',lambda *args:CheckedSMTP(a['state'],*args))
    result=a['client'].post(a['base']+'/connection/automatic',headers=a['headers'],json={})
    assert result.status_code==200 and result.json()['connected'] and result.json()['validated_at']
    assert smtp==[a['user']['mailbox']['address']] and a['state']['sent']==[]
    assert a['state']['password'] not in result.text


def test_automatic_recovery_uses_known_secret_and_never_undoes_disconnect(mailbox_api):
    a=mailbox_api
    with SessionLocal() as db:
        connection=db.scalar(select(e.EmailConnection).where(e.EmailConnection.user_id==a['user']['id']))
        db.delete(connection);db.commit()
    assert a['client'].get(a['base']+'/account',headers=a['headers']).json()['can_auto_connect']
    restored=a['client'].post(a['base']+'/connection/automatic',headers=a['headers'],json={})
    assert restored.status_code==200 and restored.json()['connected']
    a['client'].delete(a['base']+'/connection',headers=a['headers']).raise_for_status()
    count=len(a['state']['logins'])
    stopped=a['client'].post(a['base']+'/connection/automatic',headers=a['headers'],json={}).json()
    assert not stopped['connected'] and not stopped['can_auto_connect'] and stopped['needs_password']
    assert len(a['state']['logins'])==count


def test_automatic_validation_does_not_mark_ready_on_smtp_failure(mailbox_api, monkeypatch):
    a=mailbox_api
    with SessionLocal() as db:
        connection=db.scalar(select(e.EmailConnection).where(e.EmailConnection.user_id==a['user']['id']))
        connection.validated_at=None;connection.checked_at=None;db.commit()
    def unavailable(*args):
        raise OSError('temporary failure with secret-that-must-not-leak')
    monkeypatch.setattr(e,'PinnedSMTPSSL',unavailable)
    failed=a['client'].post(a['base']+'/connection/automatic',headers=a['headers'],json={})
    state=failed.json()
    assert failed.status_code==200 and not state['connected'] and state['can_auto_connect'] and not state['needs_password']
    assert state['connection_error_code']=='EMAIL_NETWORK' and 'secret-that' not in failed.text
    assert a['state']['sent']==[]
    with SessionLocal() as db:
        connection=db.scalar(select(e.EmailConnection).where(e.EmailConnection.user_id==a['user']['id']))
        assert connection.validated_at is None and connection.last_error=='EMAIL_NETWORK'
        connection.checked_at=None;db.commit()
    monkeypatch.setattr(e,'PinnedSMTPSSL',lambda *args:FakeSMTP(a['state'],*args))
    ready=a['client'].post(a['base']+'/connection/automatic',headers=a['headers'],json={}).json()
    assert ready['connected'] and not ready['connection_error']


def test_automatic_auth_rejection_requests_current_password_without_reset(mailbox_api):
    a=mailbox_api
    with SessionLocal() as db:
        connection=db.scalar(select(e.EmailConnection).where(e.EmailConnection.user_id==a['user']['id']))
        connection.validated_at=None;connection.checked_at=None
        connection.encrypted_secret=seal({'password':'obsolete-password-never-printed'});db.commit()
    failed=a['client'].post(a['base']+'/connection/automatic',headers=a['headers'],json={})
    assert not failed.json()['connected'] and not failed.json()['can_auto_connect'] and failed.json()['needs_password']
    assert failed.json()['connection_error_code']=='EMAIL_AUTH' and 'obsolete-password' not in failed.text
    count=len(a['state']['logins'])
    a['client'].post(a['base']+'/connection/automatic',headers=a['headers'],json={})
    assert len(a['state']['logins'])==count  # Sem repetição automática de senha recusada.
    result=a['client'].post(a['base']+'/connection',headers=a['headers'],json={'password':a['state']['password']})
    assert result.status_code==200 and result.json()['connected']


def test_owner_can_reconnect_an_existing_same_domain_mailbox(mailbox_api):
    a=mailbox_api
    alternate='secretaria@escola.example.test'
    result=a['client'].post(a['base']+'/connection',headers=a['headers'],json={'address':alternate,'password':a['state']['password']})
    assert result.status_code==200,result.text
    assert result.json()['connected'] and result.json()['address']==alternate
    assert a['state']['logins'][-1][0]==alternate
    assert a['state']['smtp_logins'][-1]==alternate
    assert a['client'].get(a['base']+'/folders',headers=a['headers']).status_code==200
    assert a['state']['logins'][-1][0]==alternate
    sent=a['client'].post(a['base']+'/send',headers=a['headers'],json={'to':['family@example.com'],'text':'Teste','request_id':str(uuid.uuid4())})
    assert sent.status_code==200 and sent.json()['status']=='sent'
    assert a['state']['sent'][-1][0]==alternate
    assert BytesParser(policy=policy.default).parsebytes(a['state']['sent'][-1][2])['From'].addresses[0].addr_spec==alternate
    with SessionLocal() as db:
        connection=db.scalar(select(e.EmailConnection).where(e.EmailConnection.user_id==a['user']['id']))
        assert connection.address_override==alternate
        assert unseal(connection.encrypted_secret)['password']==a['state']['password']


def test_alternate_mailbox_must_belong_to_active_school_domain(mailbox_api):
    a=mailbox_api
    response=a['client'].post(a['base']+'/connection',headers=a['headers'],json={'address':'outsider@example.net','password':a['state']['password']})
    assert response.status_code==422
    assert 'domínio' in response.json()['detail']
    assert a['client'].get(a['base']+'/account',headers=a['headers']).json()['address']==a['user']['mailbox']['address']


def test_changed_server_configuration_requires_revalidation(mailbox_api):
    a=mailbox_api
    result=a['client'].put(a['base']+'/settings',headers=a['admin'],json={'imap_host':'imap.escola.example.test','smtp_host':'smtp.escola.example.test','smtp_port':587})
    assert result.status_code==200,result.text
    account=a['client'].get(a['base']+'/account',headers=a['headers']).json()
    assert not account['connected'] and account['can_auto_connect'] and not account['needs_password']
    assert account['connection_parameters']['imap_host']=='imap.escola.example.test'
    assert account['connection_parameters']['smtp_port']==587 and account['connection_parameters']['smtp_security']=='STARTTLS'


def test_webmail_default_and_personal_override_preserve_mailbox_connection(mailbox_api):
    a=mailbox_api
    path=a['base']+'/webmail-preference'
    initial=a['client'].get(path,headers=a['headers'])
    assert initial.status_code==200 and initial.json()=={
        'default':'sogo','override':'inherit','effective':'sogo'}
    denied=a['client'].put(a['base']+'/webmail-default',headers=a['headers'],json={'mode':'alternative'})
    assert denied.status_code==403
    updated=a['client'].put(a['base']+'/webmail-default',headers=a['admin'],json={'mode':'alternative'})
    assert updated.status_code==200,updated.text
    assert a['client'].get(path,headers=a['headers']).json()['effective']=='alternative'
    selected=a['client'].put(path,headers=a['headers'],json={'mode':'sogo'})
    assert selected.status_code==200 and selected.json()['effective']=='sogo'
    assert a['client'].get(path,headers=a['admin']).json()['override']=='inherit'
    reset=a['client'].put(path,headers=a['headers'],json={'mode':'inherit'})
    assert reset.status_code==200 and reset.json()=={
        'default':'alternative','override':'inherit','effective':'alternative'}
    assert a['client'].get(a['base']+'/account',headers=a['headers']).json()['connected']


def test_sogo_ticket_is_one_use_cookie_bound_to_school_and_user(mailbox_api, monkeypatch):
    from types import SimpleNamespace
    a=mailbox_api
    monkeypatch.setattr(e,'settings',lambda:SimpleNamespace(sogo_upstream_url='http://sogo:20000',app_url='https://pige360.example.org',cookie_secure=False))
    response=a['client'].post(a['base']+'/webmail-ticket',headers={**a['headers'],'X-CSRF-Protection':'1'},json={})
    assert response.status_code==200,response.text
    ticket=response.json()['ticket']
    launch=a['client'].post(f"/webmail/{a['school']['id']}/launch",data={'ticket':ticket},follow_redirects=False)
    assert launch.status_code==303 and launch.headers['location']==f"/webmail/{a['school']['id']}/SOGo/"
    cookie=next(item for item in launch.headers.get_list('set-cookie') if item.startswith('pige_webmail_'))
    assert 'HttpOnly' in cookie and 'SameSite=lax' in cookie and 'Path=/webmail/' in cookie
    replay=a['client'].post(f"/webmail/{a['school']['id']}/launch",data={'ticket':ticket},follow_redirects=False)
    assert replay.status_code==401
    with SessionLocal() as db:
        session=db.scalar(select(e.WebmailSession).where(e.WebmailSession.school_id==a['school']['id']))
        assert session.user_id==a['user']['id'] and session.mailbox_id==a['user']['mailbox']['id']
        assert session.redeemed_at and len(session.token_hash)==64 and session.token_hash != hashlib.sha256(ticket.encode()).hexdigest()


def test_sogo_proxy_injects_credentials_server_side_and_rewrites_same_origin_paths(mailbox_api, monkeypatch):
    from types import SimpleNamespace
    import httpx
    a=mailbox_api
    monkeypatch.setattr(e,'settings',lambda:SimpleNamespace(sogo_upstream_url='http://sogo:20000',app_url='https://pige360.example.org',cookie_secure=False))
    sent=[]
    class FakeAsyncClient:
        def __init__(self,**kwargs): pass
        async def __aenter__(self): return self
        async def __aexit__(self,*args): return None
        def build_request(self,method,url,headers,content=None):
            return httpx.Request(method,url,headers=headers,content=content)
        async def send(self,request,stream=False):
            sent.append((request.method,str(request.url),dict(request.headers),request.content))
            if '/SOGo.woa/WebServerResources/css/' in str(request.url):
                return httpx.Response(200, content=b'body{color:#123}', headers={'content-type':'text/css'})
            if '/SOGo.woa/WebServerResources/js/' in str(request.url):
                return httpx.Response(200, content=b'window.mailReady=true;', headers={'content-type':'application/javascript'})
            return httpx.Response(200,content=b'<html><head><link rel="stylesheet" href="/SOGo.woa/WebServerResources/css/styles.css?lm=1"><script src="/SOGo.woa/WebServerResources/js/Mailer.js?lm=1"></script></head><body><a href="/SOGo/Mail">Inbox</a></body></html>',headers={'content-type':'text/html; charset=utf-8','set-cookie':'SOGo=sample; Path=/; HttpOnly'})
    monkeypatch.setattr(e.httpx,'AsyncClient',FakeAsyncClient)
    response=a['client'].post(a['base']+'/webmail-ticket',headers={**a['headers'],'X-CSRF-Protection':'1'},json={})
    launch=a['client'].post(f"/webmail/{a['school']['id']}/launch",data={'ticket':response.json()['ticket']},follow_redirects=False)
    cookie=launch.headers['set-cookie'].split(';',1)[0]
    value=cookie.split('=',1)[1]
    name=cookie.split('=',1)[0]
    result=a['client'].get(f"/webmail/{a['school']['id']}/SOGo/",cookies={name:value})
    assert result.status_code==200
    assert sent[0][1]=='http://sogo:20000/SOGo/'
    assert sent[0][2]['x-webobjects-remote-user']==a['user']['id']+'@'+a['school']['id']
    assert sent[0][2]['x-webobjects-server-url']=='https://pige360.example.org/webmail/'+a['school']['id']
    assert base64.b64decode(sent[0][2]['authorization'].split()[1]).decode().endswith(':'+a['state']['password'])
    assert f"/webmail/{a['school']['id']}/SOGo/Mail" in result.text
    assert f"/webmail/{a['school']['id']}/SOGo.woa/WebServerResources/css/styles.css?lm=1" in result.text
    assert 'href="/api/v1/institution/theme.css"' in result.text
    assert 'var(--institution-font' in result.text
    css=a['client'].get(f"/webmail/{a['school']['id']}/SOGo.woa/WebServerResources/css/styles.css?lm=1", cookies={name:value})
    script=a['client'].get(f"/webmail/{a['school']['id']}/SOGo.woa/WebServerResources/js/Mailer.js?lm=1", cookies={name:value})
    assert css.status_code==200 and css.headers['content-type'].startswith('text/css')
    assert script.status_code==200 and script.headers['content-type'].startswith('application/javascript')
    assert sent[1][1]=='http://sogo:20000/SOGo.woa/WebServerResources/css/styles.css?lm=1'
    assert 'SAMEORIGIN' in result.headers['x-frame-options'] and 'frame-ancestors \'self\'' in result.headers['content-security-policy']
    assert 'Path=/webmail/'+a['school']['id']+'/' in result.headers['set-cookie']


@pytest.mark.parametrize('read_fails', [False, True])
def test_sogo_mail_view_keeps_upstream_open_while_reading(mailbox_api, monkeypatch, read_fails):
    from types import SimpleNamespace
    import httpx
    a = mailbox_api
    monkeypatch.setattr(e, 'settings', lambda: SimpleNamespace(
        sogo_upstream_url='http://sogo:20000', app_url='https://pige360.example.org', cookie_secure=False))

    class LiveStream(httpx.AsyncByteStream):
        async def __aiter__(self):
            assert upstream.open, 'The upstream connection closed before the SOGo response was read'
            if read_fails:
                raise httpx.ReadError('simulated upstream disconnect')
            yield b'<html><head></head><body>SOGo Mail</body></html>'

    class LiveClient:
        open = False

        def __init__(self, **kwargs):
            pass

        async def __aenter__(self):
            self.open = True
            return self

        async def __aexit__(self, *args):
            self.open = False

        def build_request(self, method, url, headers, content=None):
            return httpx.Request(method, url, headers=headers, content=content)

        async def send(self, request, stream=False):
            assert stream and request.url.path.endswith('/Mail/view')
            return httpx.Response(200, headers={'content-type': 'text/html'},
                                  stream=LiveStream(), request=request)

    upstream = LiveClient()
    monkeypatch.setattr(e.httpx, 'AsyncClient', lambda **kwargs: upstream)
    ticket = a['client'].post(a['base']+'/webmail-ticket',
                              headers={**a['headers'], 'X-CSRF-Protection': '1'}, json={}).json()['ticket']
    launch = a['client'].post(f"/webmail/{a['school']['id']}/launch", data={'ticket': ticket},
                              follow_redirects=False)
    cookie = launch.headers['set-cookie'].split(';', 1)[0]
    principal = a['user']['id'] + '@' + a['school']['id']
    result = a['client'].get(f"/webmail/{a['school']['id']}/SOGo/so/{principal}/Mail/view",
                             headers={'cookie': cookie})
    assert result.status_code == (502 if read_fails else 200), result.text
    if read_fails:
        assert 'simulated upstream disconnect' not in result.text
    else:
        assert 'SOGo Mail' in result.text
    assert not upstream.open


def test_sogo_proxy_rejects_path_traversal_and_non_webmail_resources():
    from fastapi import HTTPException
    for resource in ('../admin', 'SOGo/../../admin', 'SOGo/%252e%252e/admin', 'SOGo/%5cadmin', 'private/file',
                     'SOGo.woa/private', 'SOGo.woa/WebServerResources/../../private'):
        with pytest.raises(HTTPException) as error:
            e._validated_webmail_resource(resource)
        assert error.value.status_code == 404


def test_sogo_static_resources_accept_exact_public_directory():
    assert e._validated_webmail_resource('SOGo.woa/WebServerResources/css/styles.css') == 'SOGo.woa/WebServerResources/css/styles.css'
    assert e._validated_webmail_resource('SOGo.woa/WebServerResources/js/vendor/angular.min.js') == 'SOGo.woa/WebServerResources/js/vendor/angular.min.js'


def test_sogo_proxy_rejects_cookie_replayed_for_another_school(mailbox_api, monkeypatch):
    from types import SimpleNamespace
    a=mailbox_api
    monkeypatch.setattr(e,'settings',lambda:SimpleNamespace(sogo_upstream_url='http://sogo:20000',app_url='https://pige360.example.org',cookie_secure=False))
    response=a['client'].post(a['base']+'/webmail-ticket',headers={**a['headers'],'X-CSRF-Protection':'1'},json={})
    launch=a['client'].post(f"/webmail/{a['school']['id']}/launch",data={'ticket':response.json()['ticket']},follow_redirects=False)
    cookie=launch.headers['set-cookie'].split(';',1)[0]
    name,value=cookie.split('=',1)
    wrong=a['client'].get('/webmail/another-school/SOGo/',cookies={name:value})
    assert wrong.status_code==401
