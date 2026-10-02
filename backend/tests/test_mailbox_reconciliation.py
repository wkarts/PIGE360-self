"""Existing institutional mailboxes: read-only remote checks, scoped local links."""
import uuid

import pytest
from sqlalchemy import func, select

from app import email_client, mailcow, models as m
from app.db import SessionLocal
from app.integration_core import unseal
from test_mailcow import configure as configure_original, new_user


def configure(client, admin, school):
    base, config = configure_original(client, admin, school)
    response = client.put(base + '/config', headers=admin, json={
        'enabled':True, 'base_url':config['base_url'], 'domain':'escola.example.com',
        'default_quota_mb':2048, 'version':config['version']})
    assert response.status_code == 200, response.text
    return base, response.json()


def candidate(client, admin, school, **kwargs):
    return new_user(client, admin, school, email=f'usuario-{uuid.uuid4().hex}@escola.example.com', **kwargs)


def provider(monkeypatch, *, active=1, missing=False, domain_active=1, mismatch=False):
    calls = []
    def request(self, path, method='GET', data=None):
        assert method == 'GET', 'Reconciliation must never create, reset or edit a remote mailbox.'
        calls.append(path)
        if '/domain/' in path:
            return {'domain_name': self.config.domain, 'active': domain_active}
        from urllib.parse import unquote
        address = unquote(path.rsplit('/', 1)[1])
        return {} if missing else {'username': 'other@escola.example.com' if mismatch else address,
                                   'active': active, 'tags': [], 'quota': 2_147_483_648, 'quota_used': 1_048_576}
    monkeypatch.setattr(mailcow.MailcowClient, 'request', request)
    return calls


def login(client, user):
    response = client.post('/api/v1/auth/login', json={'email': user['email'], 'password': 'Example-only-app-password-2026!'})
    assert response.status_code == 200, response.text
    return {'Authorization': 'Bearer ' + response.json()['access_token']}


def test_link_existing_is_idempotent_and_requires_owner_password(client, admin, school, monkeypatch):
    base, _ = configure(client, admin, school)
    user = candidate(client, admin, school)
    calls = provider(monkeypatch)
    candidates = client.get(base + '/mailboxes/candidates', headers=admin)
    assert candidates.status_code == 200, candidates.text
    assert candidates.json()['items'] == [{'user_id': user['id'], 'name': user['name'], 'address': user['email']}]
    assert calls == []
    response = client.post(base + '/mailboxes/reconcile', headers=admin, json={'user_id': user['id']})
    assert response.status_code == 200, response.text
    box = response.json()
    assert box['status'] == 'active' and box['job_status'] == 'completed' and box['origin'] == 'existing'
    assert box['quota_mb'] == 2048 and box['quota_used_bytes'] == 1_048_576
    assert not box['credentials_available']
    again = client.post(base + '/mailboxes/reconcile', headers=admin, json={'user_id': user['id']})
    assert again.status_code == 200 and again.json()['id'] == box['id']
    assert client.get(base + '/mailboxes/candidates', headers=admin).json()['items'] == []
    assert client.post(base + '/mailboxes/' + box['id'] + '/sync', headers=admin).status_code == 200
    assert client.post(base + '/mailboxes/' + box['id'] + '/credentials', headers=admin).status_code == 409
    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(mailcow.SchoolMailbox).where(mailcow.SchoolMailbox.school_id == school['id'])) == 1
        stored = db.get(mailcow.SchoolMailbox, box['id'])
        job = db.get(m.IntegrationJob, stored.job_id)
        assert stored.encrypted_password == '' and job.kind == 'mailbox_reconcile'
        assert unseal(job.encrypted_payload) == {'mailbox_id': box['id']}
        assert db.scalar(select(email_client.EmailConnection).where(email_client.EmailConnection.mailbox_id == box['id'])) is None
    own = login(client, user)
    account = client.get(f"/api/v1/schools/{school['id']}/email/account", headers=own).json()
    assert account['available'] and account['needs_password'] and not account['connected']


def test_own_check_uses_only_authenticated_address_and_no_network_on_account(client, admin, school, monkeypatch):
    base, _ = configure(client, admin, school)
    person = client.post(f"/api/v1/schools/{school['id']}/persons", headers=admin, json={'name':'Professor de teste'}).json()
    user = candidate(client, admin, school, role='teacher', person_id=person['id'])
    other = candidate(client, admin, school)
    own = login(client, user)
    calls = provider(monkeypatch)
    endpoint = f"/api/v1/schools/{school['id']}/email"
    account = client.get(endpoint + '/account', headers=own)
    assert account.status_code == 200, account.text
    assert account.json()['can_reconcile'] and account.json()['candidate_address'] == user['email']
    assert calls == []
    # Even a forged extra target cannot switch the authenticated mailbox owner.
    response = client.post(endpoint + '/reconcile', headers=own, json={'user_id': other['id']})
    assert response.status_code == 200, response.text
    assert response.json()['address'] == user['email']
    assert not response.json()['connected']
    assert client.post(base + '/mailboxes/reconcile', headers=own, json={'user_id': other['id']}).status_code == 403
    assert client.get(base + '/mailboxes/candidates', headers=own).status_code == 403
    assert client.get(base + '/mailboxes', headers=admin).json()[0]['user_id'] == user['id']


@pytest.mark.parametrize('options,status', [({'missing': True},409), ({'active':0},409), ({'domain_active':0},502), ({'mismatch':True},502)])
def test_no_link_when_remote_identity_or_activation_is_not_confirmed(client, admin, school, monkeypatch, options, status):
    base, _ = configure(client, admin, school)
    user = candidate(client, admin, school)
    provider(monkeypatch, **options)
    response = client.post(base + '/mailboxes/reconcile', headers=admin, json={'user_id': user['id']})
    assert response.status_code == status, response.text
    assert client.get(base + '/mailboxes', headers=admin).json() == []


def test_candidates_and_link_never_include_wrong_domain_or_other_school(client, admin, school, monkeypatch):
    base, _ = configure(client, admin, school)
    matching = candidate(client, admin, school)
    external = new_user(client, admin, school)
    other = client.post('/api/v1/schools', headers=admin, json={'company_id':school['company_id'], 'name':'Outra escola isolada'}).json()
    foreign = candidate(client, admin, other)
    calls = provider(monkeypatch)
    page = client.get(base + '/mailboxes/candidates', headers=admin).json()
    assert {item['user_id'] for item in page['items']} == {matching['id']}
    for target in (external, foreign):
        result = client.post(base + '/mailboxes/reconcile', headers=admin, json={'user_id':target['id']})
        assert result.status_code == 422, result.text
    assert calls == []
    own = login(client, foreign)
    assert client.post(f"/api/v1/schools/{school['id']}/email/reconcile", headers=own).status_code == 403


def test_inactive_membership_cannot_be_reconciled(client, admin, school, monkeypatch):
    base, _ = configure(client, admin, school)
    user = candidate(client, admin, school)
    with SessionLocal() as db:
        db.get(m.SchoolAccess,(user['id'],school['id'])).active = False
        db.commit()
    calls = provider(monkeypatch)
    assert client.get(base + '/mailboxes/candidates',headers=admin).json()['items'] == []
    assert client.post(base + '/mailboxes/reconcile',headers=admin,json={'user_id':user['id']}).status_code == 422
    assert not calls


def test_failed_creation_can_link_only_exact_registered_address(client, admin, school, monkeypatch):
    from app.integration_worker import process_one
    base, _ = configure(client, admin, school)
    user = candidate(client, admin, school)
    calls = provider(monkeypatch)
    queued = client.post(base + '/mailboxes',headers=admin,json={'user_id':user['id']})
    assert queued.status_code == 201, queued.text
    assert client.post(base + '/mailboxes/reconcile',headers=admin,json={'user_id':user['id']}).status_code == 409
    assert process_one(queued.json()['job_id'])
    result = client.post(base + '/mailboxes/reconcile',headers=admin,json={'user_id':user['id']})
    assert result.status_code == 200 and result.json()['id'] == queued.json()['id']
    assert not result.json()['credentials_available'] and result.json()['origin'] == 'existing'
    assert result.json()['error_code'] == ''


def test_existing_link_cannot_transfer_another_users_address(client, admin, school, monkeypatch):
    base, _ = configure(client, admin, school)
    owner = new_user(client, admin, school)
    target = candidate(client, admin, school)
    queued = client.post(base + '/mailboxes',headers=admin,json={'user_id':owner['id'],'local_part':target['email'].split('@')[0]})
    assert queued.status_code == 201
    calls = provider(monkeypatch)
    result = client.post(base + '/mailboxes/reconcile',headers=admin,json={'user_id':target['id']})
    assert result.status_code == 409
    assert not calls
