from sqlalchemy import select


def configure(client, admin, school, **overrides):
    base = '/api/v1/schools/' + school['id'] + '/support-hub'
    current = client.get(base, headers=admin)
    assert current.status_code == 200, current.text
    payload = {
        'enabled': True, 'base_url': 'https://support.example.test',
        'token': 'website-token-for-test-123456', 'position': 'left',
        'widget_type': 'expanded_bubble', 'launcher_title': 'Atendimento',
        'enabled_areas': ['online_enrollment'],
    }
    if current.json()['id']:
        payload['version'] = current.json()['version']
    return client.put(base, headers=admin, json={**payload, **overrides})


def public(client, school, area):
    response = client.get('/api/v1/schools/' + school['id'] + '/support-widget', params={'area': area})
    assert response.status_code == 200, response.text
    return response.json()


def test_support_defaults_and_explicit_area(client, admin, school):
    initial = client.get('/api/v1/schools/' + school['id'] + '/support-hub', headers=admin).json()
    assert initial['enabled'] is False
    assert initial['enabled_areas'] == ['online_enrollment']
    assert initial['school_id'] == school['id']
    assert not initial['token_configured']
    saved = configure(client, admin, school)
    assert saved.status_code == 200, saved.text
    assert saved.json()['token_configured']
    assert not {'token', 'website_token', 'encrypted_token'} & saved.json().keys()
    assert public(client, school, 'online_enrollment')['website_token'] == 'website-token-for-test-123456'
    for area in ('login', 'internal', 'student_portal', 'teacher_portal', 'guardian_portal', 'news'):
        assert public(client, school, area)['website_token'] == ''
        assert public(client, school, area)['enabled'] is False
    assert client.get('/api/v1/support-widget').json()['website_token'] == ''


def test_support_same_company_schools_do_not_share_configuration(client, admin, school):
    sibling = client.post('/api/v1/schools', headers=admin, json={
        'company_id': school['company_id'], 'name': 'Outra escola atendimento',
    }).json()
    assert configure(client, admin, school).status_code == 200
    assert not public(client, sibling, 'online_enrollment')['enabled']
    assert configure(client, admin, sibling, token='independent-school-public-token', enabled_areas=['guardian_portal']).status_code == 200
    assert public(client, school, 'online_enrollment')['website_token'] == 'website-token-for-test-123456'
    assert not public(client, school, 'guardian_portal')['enabled']
    assert public(client, sibling, 'guardian_portal')['website_token'] == 'independent-school-public-token'
    assert not public(client, sibling, 'online_enrollment')['enabled']
    response = client.get('/api/v1/companies/' + school['company_id'] + '/support-hub', headers=admin)
    assert response.status_code == 409


def test_support_preserves_ciphertext_token_and_validates_configuration(client, admin, school):
    from app import models as m
    from app.db import SessionLocal
    first = configure(client, admin, school)
    assert first.status_code == 200, first.text
    with SessionLocal() as db:
        encrypted = db.scalar(select(m.SchoolSupportSettings).where(m.SchoolSupportSettings.school_id == school['id'])).encrypted_token
    assert 'website-token-for-test' not in encrypted
    updated = configure(client, admin, school, token='', enabled_areas=['news', 'news', 'student_portal'])
    assert updated.status_code == 200, updated.text
    assert updated.json()['enabled_areas'] == ['news', 'student_portal']
    assert public(client, school, 'news')['website_token'] == 'website-token-for-test-123456'
    assert not public(client, school, 'online_enrollment')['enabled']
    with SessionLocal() as db:
        assert db.scalar(select(m.SchoolSupportSettings).where(m.SchoolSupportSettings.school_id == school['id'])).encrypted_token == encrypted
    for extra in ({'enabled_areas': ['unknown']}, {'enabled_areas': []}, {'base_url': 'javascript:alert(1)'}, {'base_url': 'https://user:pass@example.com'}):
        assert configure(client, admin, school, **extra).status_code == 422
    assert configure(client, admin, school, version=first.json()['version']).status_code == 409
    assert configure(client, admin, school, enabled=False, enabled_areas=[]).status_code == 200
    assert not public(client, school, 'news')['enabled']


def test_support_configuration_requires_school_access(client, admin, school):
    from uuid import uuid4
    from conftest import PASSWORD
    other = client.post('/api/v1/schools', headers=admin, json={
        'company_id': school['company_id'], 'name': 'Outra escola acesso',
    }).json()
    email = 'support-direction-' + uuid4().hex[:8] + '@example.com'
    response = client.post('/api/v1/users', headers=admin, json={
        'name': 'Direção de uma escola', 'email': email, 'password': PASSWORD,
        'role': 'direction', 'school_ids': [school['id']],
    })
    assert response.status_code == 201, response.text
    token = client.post('/api/v1/auth/login', json={'email': email, 'password': PASSWORD}).json()['access_token']
    headers = {'Authorization': 'Bearer ' + token}
    assert client.get('/api/v1/schools/' + school['id'] + '/support-hub', headers=headers).status_code == 200
    assert client.get('/api/v1/schools/' + other['id'] + '/support-hub', headers=headers).status_code == 403
    assert configure(client, headers, school).status_code == 200
    assert client.put('/api/v1/schools/' + other['id'] + '/support-hub', headers=headers, json={}).status_code == 403
    assert client.get('/api/v1/schools/' + school['id'] + '/support-hub').status_code == 401


def test_legacy_support_migration_copies_only_matching_school_without_decryption():
    import importlib.util
    from datetime import UTC, datetime
    from pathlib import Path
    import sqlalchemy as sa
    from alembic.migration import MigrationContext
    from alembic.operations import Operations
    from app.db import Base

    source = Path(__file__).resolve().parents[1] / 'migrations/versions/0032_support_areas.py'
    spec = importlib.util.spec_from_file_location('support_areas_migration_test', source)
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    engine = sa.create_engine('sqlite://')
    metadata = sa.MetaData(naming_convention=Base.metadata.naming_convention)
    companies = sa.Table('companies', metadata, sa.Column('id', sa.String(36), primary_key=True))
    schools = sa.Table('schools', metadata, sa.Column('id', sa.String(36), primary_key=True), sa.Column('company_id', sa.String(36)))
    legacy = sa.Table('company_support_settings', metadata,
                      sa.Column('company_id', sa.String(36)), sa.Column('enabled', sa.Boolean),
                      sa.Column('base_url', sa.String), sa.Column('position', sa.String),
                      sa.Column('widget_type', sa.String), sa.Column('launcher_title', sa.String),
                      sa.Column('encrypted_token', sa.Text), sa.Column('created_at', sa.DateTime),
                      sa.Column('updated_at', sa.DateTime), sa.Column('version', sa.Integer))
    metadata.create_all(engine)
    with engine.begin() as connection:
        connection.execute(companies.insert(), [{'id': 'company-a'}, {'id': 'company-b'}])
        connection.execute(schools.insert(), [
            {'id': 'school-a1', 'company_id': 'company-a'},
            {'id': 'school-a2', 'company_id': 'company-a'},
            {'id': 'school-b', 'company_id': 'company-b'},
        ])
        connection.execute(legacy.insert().values(
            company_id='company-a', enabled=True, base_url='https://support.example.test',
            position='left', widget_type='standard', launcher_title='Atendimento',
            encrypted_token='unchanged-ciphertext-only', created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC), version=4,
        ))
        migration.op = Operations(MigrationContext.configure(connection, opts={'target_metadata': metadata}))
        migration.upgrade()
        target = sa.Table('school_support_settings', sa.MetaData(), autoload_with=connection)
        rows = list(connection.execute(sa.select(target)).mappings())
        assert {row['school_id'] for row in rows} == {'school-a1', 'school-a2'}
        assert len({row['id'] for row in rows}) == 2
        assert all(row['encrypted_token'] == 'unchanged-ciphertext-only' for row in rows)
        assert all(row['enabled_areas'] == ['online_enrollment'] for row in rows)
        assert all(row['version'] == 4 for row in rows)
    engine.dispose()


def test_login_support_requires_one_active_school_and_explicit_opt_in():
    import sqlalchemy as sa
    from sqlalchemy.orm import Session
    from app import models as m
    from app.integration_core import seal
    from app.support import public_support_widget
    engine = sa.create_engine('sqlite://')
    m.Company.__table__.create(engine)
    m.School.__table__.create(engine)
    m.SchoolSupportSettings.__table__.create(engine)
    with Session(engine) as db:
        assert not public_support_widget(db)['enabled']
        company = m.Company(name='Mantenedora sintética');db.add(company);db.flush()
        first = m.School(company_id=company.id, name='Instituição única');db.add(first);db.flush()
        config = m.SchoolSupportSettings(school_id=first.id, enabled=True,
                                        enabled_areas=['online_enrollment'], base_url='https://support.example.test',
                                        encrypted_token=seal({'website_token': 'public-login-token'}))
        db.add(config);db.flush()
        assert not public_support_widget(db)['enabled']
        config.enabled_areas = ['login'];db.flush()
        assert public_support_widget(db)['website_token'] == 'public-login-token'
        second = m.School(company_id=company.id, name='Outra instituição');db.add(second);db.flush()
        assert not public_support_widget(db)['enabled']
        second.active = False;db.flush()
        assert public_support_widget(db)['enabled']
    engine.dispose()


def test_support_private_endpoint_rejects_stale_entity_header(client, admin, school):
    other = client.post('/api/v1/schools', headers=admin, json={
        'company_id': school['company_id'], 'name': 'Entidade de outro cabeçalho',
    }).json()
    headers = {**admin, 'X-School-ID': other['id']}
    base = '/api/v1/schools/' + school['id'] + '/support-hub'
    assert client.get(base, headers=headers).status_code == 409
    assert client.put(base, headers=headers, json={'enabled': False}).status_code == 409
    assert client.get(base, headers={**admin, 'X-School-ID': school['id']}).status_code == 200


def test_support_requires_https_in_production(monkeypatch):
    from types import SimpleNamespace
    import pytest
    from fastapi import HTTPException
    from app import support
    monkeypatch.setattr(support, 'settings', lambda: SimpleNamespace(app_env='production'))
    with pytest.raises(HTTPException) as error:
        support._validate_base_url('http://support.example.test', True)
    assert error.value.status_code == 422
    assert support._validate_base_url('https://support.example.test', True) == 'https://support.example.test'
