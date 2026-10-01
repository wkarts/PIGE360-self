"""Mailcow usa apenas transportes simulados; nenhum e-mail ou conta real é criado."""
import json
import uuid

import httpx
import pytest
from sqlalchemy import select

from app import mailcow, models as m
from app.db import SessionLocal, now
from app.integration_core import IntegrationFailure, unseal
from app.integration_worker import process_one

API_KEY = 'test-only-mailcow-api-key-0123456789'


def configure(client, admin, school):
    base = f"/api/v1/schools/{school['id']}/mailcow"
    response = client.put(base + '/config', headers=admin, json={
        'enabled': True, 'base_url': 'https://mail.escola.example.test', 'domain': 'escola.example.test',
        'api_key': API_KEY, 'default_quota_mb': 2048})
    assert response.status_code == 200, response.text
    assert API_KEY not in response.text
    assert response.json()['api_key_configured'] is True
    return base, response.json()


def new_user(client, admin, school, **kwargs):
    response = client.post('/api/v1/users', headers=admin, json={
        'name': 'Usuário institucional de teste', 'email': f'user-{uuid.uuid4().hex}@example.com',
        'password': 'Example-only-app-password-2026!', 'role': 'secretary', 'school_ids': [school['id']], **kwargs})
    assert response.status_code == 201, response.text
    return response.json()


def fake_mailcow(monkeypatch, *, timeout_after_post=False, existing_other=False):
    calls, remote = [], {}
    def request(self, path, method='GET', data=None):
        calls.append((method, path, data))
        if '/get/domain/' in path:
            return {'domain_name': self.config.domain, 'active': 1}
        if '/get/mailbox/' in path:
            if existing_other:
                from urllib.parse import unquote
                address = unquote(path.rsplit('/', 1)[1])
                return {'username': address, 'active': 1, 'tags': ['other-system']}
            return list(remote.values())
        if path == '/api/v1/add/mailbox' and method == 'POST':
            address = data['local_part'] + '@' + data['domain']
            remote[address] = {'username': address, 'active': 1, 'quota_used': 5_000_000_000, 'tags': data['tags']}
            if timeout_after_post:
                raise IntegrationFailure('MAILCOW_NETWORK_ERROR', retryable=True)
            return [{'type': 'success', 'msg': ['mailbox_added', address]}]
        raise AssertionError(path)
    monkeypatch.setattr(mailcow.MailcowClient, 'request', request)
    return calls, remote


def test_new_user_opt_in_queues_without_network_and_worker_provisions_once(client, admin, school, monkeypatch):
    base, config = configure(client, admin, school)
    calls, remote = fake_mailcow(monkeypatch)
    user = new_user(client, admin, school, create_mailbox=True, mailbox_school_id=school['id'], mailbox_local_part='professor.teste')
    mailbox = user['mailbox']
    assert mailbox['status'] == 'pending'
    assert calls == []
    with SessionLocal() as db:
        obj = db.get(mailcow.SchoolMailbox, mailbox['id'])
        password = unseal(obj.encrypted_password)['password']
        assert len(password) > 32
        assert password != 'Example-only-app-password-2026!'
        assert password not in obj.encrypted_password
        assert API_KEY not in db.get(mailcow.MailcowConfig, obj.config_id).encrypted_secret
    assert process_one(mailbox['job_id']) is True
    assert len([call for call in calls if call[0] == 'POST']) == 1
    payload = next(call[2] for call in calls if call[0] == 'POST')
    assert payload['password'] == payload['password2'] == password
    assert payload['quota'] == '2048'
    assert payload['force_pw_update'] == '1'
    listed = client.get(base + '/mailboxes', headers=admin)
    assert listed.status_code == 200
    assert listed.json()[0]['status'] == 'active'
    assert listed.json()[0]['quota_used_bytes'] == 5_000_000_000
    assert password not in listed.text and API_KEY not in listed.text
    again = client.post(base + '/mailboxes', headers=admin, json={'user_id': user['id'], 'local_part': 'professor.teste'})
    assert again.status_code == 201 and again.json()['id'] == mailbox['id']
    assert process_one(mailbox['job_id']) is False


def test_remote_timeout_does_not_rollback_user_or_duplicate_mailbox(client, admin, school, monkeypatch, caplog):
    base, _ = configure(client, admin, school)
    calls, remote = fake_mailcow(monkeypatch, timeout_after_post=True)
    user = new_user(client, admin, school, create_mailbox=True, mailbox_school_id=school['id'], mailbox_local_part='aluno.timeout')
    job_id = user['mailbox']['job_id']
    assert process_one(job_id)
    with SessionLocal() as db:
        job = db.get(m.IntegrationJob, job_id)
        assert job.status == 'retry'
        assert db.get(m.User, user['id']) is not None
        job.available_at = now(); db.commit()
    assert process_one(job_id)
    assert len([call for call in calls if call[0] == 'POST']) == 1
    assert client.get(base + '/mailboxes', headers=admin).json()[0]['status'] == 'active'
    password = next(call[2]['password'] for call in calls if call[0] == 'POST')
    assert password not in caplog.text and API_KEY not in caplog.text


def test_existing_remote_mailbox_is_not_adopted_or_reset(client, admin, school, monkeypatch):
    base, _ = configure(client, admin, school)
    calls, _ = fake_mailcow(monkeypatch, existing_other=True)
    user = new_user(client, admin, school)
    response = client.post(base + '/mailboxes', headers=admin, json={'user_id': user['id'], 'local_part': 'ocupado'})
    assert response.status_code == 201
    assert process_one(response.json()['job_id'])
    listed = client.get(base + '/mailboxes', headers=admin).json()[0]
    assert listed['status'] == 'failed'
    assert listed['error_code'] == 'MAILCOW_ADDRESS_CONFLICT'
    assert not any(call[0] == 'POST' for call in calls)
    assert not listed['credentials_available']


def test_password_can_be_viewed_once_and_is_erased_from_storage(client, admin, school, monkeypatch):
    base, _ = configure(client, admin, school)
    fake_mailcow(monkeypatch)
    user = new_user(client, admin, school, create_mailbox=True, mailbox_school_id=school['id'], mailbox_local_part='senha.unica')
    mailbox = user['mailbox']
    unavailable = client.post(base + '/mailboxes/' + mailbox['id'] + '/credentials', headers=admin)
    assert unavailable.status_code == 409
    assert process_one(mailbox['job_id'])
    response = client.post(base + '/mailboxes/' + mailbox['id'] + '/credentials', headers=admin)
    assert response.status_code == 200
    assert len(response.json()['password']) > 32
    assert response.headers['cache-control'] == 'no-store'
    assert client.post(base + '/mailboxes/' + mailbox['id'] + '/credentials', headers=admin).status_code == 409
    with SessionLocal() as db:
        obj = db.get(mailcow.SchoolMailbox, mailbox['id'])
        assert obj.encrypted_password == ''
        events = db.scalars(select(m.AuditEvent).where(m.AuditEvent.school_id == school['id'])).all()
        assert response.json()['password'] not in json.dumps([event.details for event in events])


def test_mailbox_access_is_scoped_and_default_user_creation_does_not_provision(client, admin, school):
    base, _ = configure(client, admin, school)
    user = new_user(client, admin, school)
    assert 'mailbox' not in user
    assert client.get(base + '/mailboxes', headers=admin).json() == []
    unauthorized = client.post('/api/v1/auth/login', json={'email': user['email'], 'password': 'Example-only-app-password-2026!'}).json()
    headers = {'Authorization': 'Bearer ' + unauthorized['access_token']}
    assert client.get(base + '/config', headers=headers).status_code == 403
    assert client.post(base + '/mailboxes', headers=headers, json={'user_id': user['id']}).status_code == 403
    other = client.post('/api/v1/schools', headers=admin, json={'company_id': school['company_id'], 'name': 'Escola sem vínculo'}).json()
    other_base, _ = configure(client, admin, other)
    assert client.post(other_base + '/mailboxes', headers=admin, json={'user_id': user['id']}).status_code == 422


def test_mailcow_blocks_ssrf_and_pins_tcp_destination_with_original_tls_name(monkeypatch):
    config = mailcow.MailcowConfig(base_url='https://mail.escola.example.test', domain='escola.example.test',
                                   allow_private_network=False, encrypted_secret=mailcow.seal({'api_key': API_KEY}))
    monkeypatch.setattr(mailcow.socket, 'getaddrinfo', lambda *args, **kwargs: [(2, 1, 6, '', ('127.0.0.1', 443))])
    with pytest.raises(IntegrationFailure, match='MAILCOW_ADDRESS_BLOCKED'):
        mailcow._pinned_target(config)
    config.allow_private_network = True
    with pytest.raises(IntegrationFailure, match='MAILCOW_ADDRESS_BLOCKED'):
        mailcow._pinned_target(config)
    monkeypatch.setattr(mailcow.socket, 'getaddrinfo', lambda *args, **kwargs: [(2, 1, 6, '', ('10.20.30.40', 443))])
    assert mailcow._pinned_target(config)[0] == 'https://10.20.30.40:443'
    config.allow_private_network = False
    with pytest.raises(IntegrationFailure, match='MAILCOW_ADDRESS_BLOCKED'):
        mailcow._pinned_target(config)
    monkeypatch.setattr(mailcow.socket, 'getaddrinfo', lambda *args, **kwargs: [(2, 1, 6, '', ('8.8.8.8', 443))])
    seen = []
    def handler(request):
        seen.append(request)
        return httpx.Response(200, json=[])
    real_client = httpx.Client
    monkeypatch.setattr(mailcow.httpx, 'Client', lambda **kwargs: real_client(transport=httpx.MockTransport(handler), **kwargs))
    assert mailcow.MailcowClient(config).mailbox('nome@escola.example.test') is None
    assert seen[0].url.host == '8.8.8.8'
    assert seen[0].headers['Host'] == 'mail.escola.example.test'
    assert seen[0].extensions['sni_hostname'] == 'mail.escola.example.test'


def test_mailcow_http_200_error_is_not_success(monkeypatch):
    config = mailcow.MailcowConfig(base_url='https://mail.escola.example.test', domain='escola.example.test',
                                   allow_private_network=False, encrypted_secret=mailcow.seal({'api_key': API_KEY}))
    box = mailcow.SchoolMailbox(id='test-id', address='aluno@escola.example.test', display_name='Aluno', quota_mb=1024)
    monkeypatch.setattr(mailcow.MailcowClient, 'request', lambda *args, **kwargs: [{'type': 'danger', 'log': ['password must never escape'], 'msg': 'quota_exceeded'}])
    with pytest.raises(IntegrationFailure, match='MAILCOW_CREATE_REJECTED'):
        mailcow.MailcowClient(config).create(box, 'Example-only-strong-password!')


@pytest.mark.parametrize('revocation', ['user', 'school', 'access'])
def test_worker_rechecks_access_before_creating_mailbox(client, admin, school, monkeypatch, revocation):
    from sqlalchemy import delete
    configure(client, admin, school)
    calls, _ = fake_mailcow(monkeypatch)
    user = new_user(client, admin, school, create_mailbox=True, mailbox_school_id=school['id'], mailbox_local_part='revogacao')
    with SessionLocal() as db:
        if revocation == 'user':
            db.get(m.User, user['id']).active = False
        elif revocation == 'school':
            db.get(m.School, school['id']).active = False
        else:
            db.execute(delete(m.SchoolAccess).where(m.SchoolAccess.user_id == user['id']))
        db.commit()
    assert process_one(user['mailbox']['job_id'])
    assert calls == []
    with SessionLocal() as db:
        job = db.get(m.IntegrationJob, user['mailbox']['job_id'])
        assert job.status == 'failed'
        assert job.error_code in {'MAILCOW_USER_INACTIVE', 'MAILCOW_SCHOOL_INACTIVE', 'MAILCOW_USER_ACCESS_REMOVED'}


def test_invalid_server_url_returns_validation_error(client, admin, school):
    base = f"/api/v1/schools/{school['id']}/mailcow/config"
    for url in ('https://[broken', 'http://mail.example.com', 'https://127.0.0.1',
                'https://169.254.169.254', 'https://mail.example.com/api', 'https://user:password@mail.example.com'):
        response = client.put(base, headers=admin, json={'base_url': url, 'domain': 'example.com'})
        assert response.status_code == 422, response.text


def test_provider_redirect_is_not_followed(monkeypatch):
    config = mailcow.MailcowConfig(base_url='https://mail.example.com', domain='example.com',
                                   allow_private_network=False, encrypted_secret=mailcow.seal({'api_key': API_KEY}))
    monkeypatch.setattr(mailcow.socket, 'getaddrinfo', lambda *args, **kwargs: [(2, 1, 6, '', ('8.8.8.8', 443))])
    requests = []
    def handler(request):
        requests.append(request)
        return httpx.Response(302, headers={'Location': 'http://169.254.169.254/latest/meta-data/'})
    real_client = httpx.Client
    monkeypatch.setattr(mailcow.httpx, 'Client', lambda **kwargs: real_client(transport=httpx.MockTransport(handler), **kwargs))
    with pytest.raises(IntegrationFailure, match='MAILCOW_HTTP_REJECTED'):
        mailcow.MailcowClient(config).mailbox('aluno@example.com')
    assert len(requests) == 1
