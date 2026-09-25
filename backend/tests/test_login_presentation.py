"""Atalho de pré-matrícula: persistência, compatibilidade e autorização."""
import json
import re
import uuid

import pytest

from app.db import SessionLocal
from app.institution import InstitutionIdentity
from conftest import PASSWORD
from test_institution import data, save

KEY = 'show_preenrollment_button'


def current(client):
    return client.get('/api/v1/institution/identity').json()


@pytest.fixture
def restore_button(client, admin):
    before = current(client)[KEY]
    yield
    assert save(client, admin, {KEY: before}).status_code == 200


def test_legacy_identity_defaults_to_visible(client):
    # Nenhuma migração necessária: o JSON legado continua válido.
    assert current(client)[KEY] is True


def test_button_setting_persists_and_is_available_before_login(client, admin, restore_button):
    for visible in (False, True):
        result = save(client, admin, {KEY: visible})
        assert result.status_code == 200, result.text
        assert result.json()[KEY] is visible
        assert current(client)[KEY] is visible
        with SessionLocal() as db:
            assert db.get(InstitutionIdentity, 1).identity[KEY] is visible
        for path in ('/', '/index.html', '/online.html'):
            response = client.get(path)
            assert response.status_code == 200
            bootstrap = json.loads(re.search(r'id="institution-bootstrap">(.*?)</script>', response.text).group(1))
            assert bootstrap[KEY] is visible
            assert response.headers['cache-control'] == 'no-store'
    # O seletor controla apenas o botão; o portal segue atendendo diretamente.
    assert save(client, admin, {KEY: False}).status_code == 200
    assert client.get('/online.html').status_code == 200


def test_older_client_does_not_reenable_hidden_button(client, admin, restore_button):
    assert save(client, admin, {KEY: False}).status_code == 200
    payload = data(client)  # Cliente anterior que desconhece a opção.
    assert KEY not in payload
    result = client.put('/api/v1/institution/identity', headers=admin,
                        data={'payload': json.dumps(payload)})
    assert result.status_code == 200, result.text
    assert result.json()[KEY] is False


def test_button_option_requires_admin(client, admin, school):
    before = current(client)
    assert save(client, {}, {KEY: False}).status_code == 401
    email = uuid.uuid4().hex + '@example.com'
    result = client.post('/api/v1/users', headers=admin, json={
        'name': 'Consulta de Teste', 'email': email, 'password': PASSWORD,
        'role': 'viewer', 'school_ids': [school['id']],
    })
    assert result.status_code == 201, result.text
    session = client.post('/api/v1/auth/login', json={'email': email, 'password': PASSWORD})
    token = {'Authorization': 'Bearer ' + session.json()['access_token']}
    assert save(client, token, {KEY: False}).status_code == 403
    assert current(client) == before


@pytest.mark.parametrize('invalid', ['false', 'true', '', None, [], {}, 0, 1])
def test_button_rejects_non_boolean_without_modifying_identity(client, admin, invalid):
    before = current(client)
    assert save(client, admin, {KEY: invalid}).status_code == 422
    assert current(client) == before


def test_stale_edit_cannot_override_the_button(client, admin, restore_button):
    old = data(client, **{KEY: True})
    assert save(client, admin, {KEY: False}).status_code == 200
    result = client.put('/api/v1/institution/identity', headers=admin,
                        data={'payload': json.dumps(old)})
    assert result.status_code == 409
    assert current(client)[KEY] is False
