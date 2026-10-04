"""A seleção de instituição delimita dados e ações, inclusive para administradores."""
import json
import uuid
from io import BytesIO
from zipfile import ZipFile

from sqlalchemy import select

from app import models as m, telemetry
from app.db import SessionLocal, now
from conftest import API, PASSWORD


def school_api(client, admin, company_id, name):
    response = client.post('/api/v1/schools', headers=admin, json={'company_id': company_id, 'name': name})
    assert response.status_code == 201, response.text
    return API(client, admin, response.json())


def test_school_selection_blocks_stale_requests_and_foreign_ids(client, admin, api):
    same = school_api(client, admin, api.school['company_id'], 'Outra unidade mesma mantenedora')
    company = client.post('/api/v1/companies', headers=admin, json={'name': 'Outra mantenedora'}).json()
    other = school_api(client, admin, company['id'], 'Outra instituição independente')
    own_student = api.student('Aluno apenas entidade ativa')
    same_student = same.student('Aluno privado unidade irmã')
    other_student = other.student('Aluno privado outra mantenedora')
    own_catalog = api.catalogs(capacity=10)
    same_catalog = same.catalogs(capacity=10)
    api.enroll(own_student, own_catalog['group'])
    same.enroll(same_student, same_catalog['group'])
    active = {**admin, 'X-School-Id': api.school['id']}
    for path in ('/students', '/dashboard', '/class-groups', '/issued-documents/signatures/unsigned',
                 '/reports/management/enrollments?date_from=2026-01-01&date_to=2026-12-31'):
        response = client.get(api.base + path, headers=active)
        assert response.status_code == 200, response.text
        assert 'Aluno privado' not in response.text
        assert same.school['id'] not in response.text and other.school['id'] not in response.text
    response = client.get('/api/v1/companies', headers=active)
    assert [row['id'] for row in response.json()] == [api.school['company_id']]
    for target in (same, other):
        assert client.get(target.base + '/students', headers=active).status_code == 409
        # Sem cabeçalho, a própria rota delimita o recorte: o ID externo não serve.
        foreign_student = same_student if target is same else other_student
        assert client.get(api.base + '/students/' + foreign_student['id'], headers=admin).status_code == 404
        denied = client.post(api.base + '/enrollments', headers=active, json={
            'student_id': foreign_student['id'], 'class_group_id': own_catalog['group']['id'], 'enrolled_on': '2026-10-02'})
        assert denied.status_code == 404, denied.text
    assert client.patch('/api/v1/companies/' + company['id'], headers=active,
                        json={'version': 1, 'data': {'name': 'Alteração indevida'}}).status_code == 404


def test_diagnostics_logs_queues_and_export_are_active_school_only(client, admin, api, tmp_path, monkeypatch):
    other = school_api(client, admin, api.school['company_id'], 'Diagnóstico unidade irmã')
    monkeypatch.setattr(telemetry, 'directory', lambda: tmp_path)
    own_job, other_job = str(uuid.uuid4()), str(uuid.uuid4())
    with SessionLocal.begin() as db:
        for school, job, status in ((api.school, own_job, 'failed'), (other.school, other_job, 'pending')):
            db.add(m.IntegrationJob(id=job, school_id=school['id'], kind='synthetic', status=status,
                                    dedupe_key=job, encrypted_payload='', available_at=now()))
    telemetry.emit('scope.synthetic', school_id=api.school['id'], job_id=own_job, level='ERROR')
    telemetry.emit('scope.synthetic', school_id=other.school['id'], job_id=other_job, level='ERROR')
    telemetry.emit('scope.synthetic', level='ERROR')
    active = {**admin, 'X-School-Id': api.school['id']}
    response = client.get('/api/v1/diagnostics/summary', headers=active)
    assert response.status_code == 200, response.text
    summary = response.json()
    assert summary['queues']['integrations'] == {'failed': 1}
    assert [row['school_name'] for row in summary['portal']] == [api.school['name']]
    response = client.get('/api/v1/diagnostics/events?event=scope.synthetic', headers=active)
    assert [row['job_id'] for row in response.json()['items']] == [own_job]
    response = client.get('/api/v1/diagnostics/export?event=scope.synthetic', headers=active)
    assert response.status_code == 200, response.text
    bundle = ZipFile(BytesIO(response.content))
    text = '\n'.join(bundle.read(name).decode() for name in bundle.namelist())
    assert own_job in text and other_job not in text and other.school['name'] not in text
    assert json.loads(bundle.read('manifest.json'))['filters']['school_id'] == api.school['id']
    global_summary = client.get('/api/v1/diagnostics/summary', headers=admin).json()
    assert global_summary['queues'] == {} and global_summary['portal'] == []
    # O marcador de entidade também acompanha o evento HTTP, sem dados pessoais.
    client.get(api.base + '/students', headers=active)
    events = telemetry.recent_events(school_id=api.school['id'])['items']
    assert any(row.get('route') == '/api/v1/schools/{school_id}/students' for row in events)


def test_profile_context_requires_active_school_and_hides_other_rosters(client, admin, api):
    other = school_api(client, admin, api.school['company_id'], 'Outra escola do professor')
    email = uuid.uuid4().hex + '@example.com'
    from app.security import hash_password
    # Conta legada docente em duas escolas: cada acesso tem seu próprio recorte.
    with SessionLocal.begin() as db:
        teacher = m.User(name='Docente em duas escolas', email=email, password_hash=hash_password(PASSWORD), role='teacher')
        db.add(teacher)
        db.flush()
        teacher_id = teacher.id
        for school in (api, other):
            db.add(m.SchoolAccess(user_id=teacher_id, school_id=school.school['id']))
    for school in (api, other):
        catalogs = school.catalogs(capacity=10)
        school.post('/teacher-assignments', {'teacher_user_id': teacher_id, 'class_group_id': catalogs['group']['id'], 'subject_name': 'Artes'})
    response = client.post('/api/v1/auth/login', json={'email': email, 'password': PASSWORD})
    headers = {'Authorization': 'Bearer ' + response.json()['access_token']}
    assert client.get('/api/v1/profile/context', headers=headers).status_code == 422
    for school, foreign in ((api, other), (other, api)):
        response = client.get('/api/v1/profile/context', headers={**headers, 'X-School-Id': school.school['id']})
        assert response.status_code == 200, response.text
        assert [row['school_id'] for row in response.json()['assignments']] == [school.school['id']]
        assert foreign.school['id'] not in response.text
    with SessionLocal.begin() as db:
        access = db.get(m.SchoolAccess, (teacher_id, other.school['id']))
        access.active = False
    assert client.get('/api/v1/profile/context', headers={**headers, 'X-School-Id': other.school['id']}).status_code == 403
    assert client.get(other.base + '/diary', headers={**headers, 'X-School-Id': other.school['id']}).status_code in (403, 404)


def test_admin_requires_membership_even_with_known_school_id(client, admin, api):
    with SessionLocal.begin() as db:
        isolated = m.School(company_id=api.school['company_id'], name='Sem vínculo administrativo')
        db.add(isolated)
        db.flush()
        sid = isolated.id
    assert client.get('/api/v1/schools/' + sid + '/dashboard', headers=admin).status_code == 403
    assert sid not in {row['id'] for row in client.get('/api/v1/schools', headers=admin).json()}


def test_whatsapp_instances_and_provider_inventory_do_not_cross_schools(client, admin, api, monkeypatch):
    from app import connect, connect_core
    other = school_api(client, admin, api.school['company_id'], 'WhatsApp mesma mantenedora')
    company = client.post('/api/v1/companies', headers=admin, json={'name': 'Z Mantenedora WhatsApp separada'}).json()
    external = school_api(client, admin, company['id'], 'WhatsApp outra mantenedora')
    with SessionLocal.begin() as db:
        for sid, cid in ((api.school['id'], api.school['company_id']), (other.school['id'], other.school['company_id']), (external.school['id'], external.school['company_id'])):
            obj = m.ConnectInstance(school_id=sid, company_id=cid, name='instance-' + sid, enabled=True, status='open')
            db.add(obj)
        db.flush()
    class Provider:
        calls = []
        def fetch_instances(self):
            return [{'name': 'instance-' + school.school['id'], 'state': 'open', 'number': '5575999990000'} for school in (api, other, external)] + [{'name': 'unknown-provider-instance'}]
        def fetch_instance(self, name):
            self.calls.append(name)
            return {'name': name, 'state': 'open'}
    monkeypatch.setattr(connect, 'ConnectApiClient', Provider)
    own = api.get('/connect')['items']
    assert len(own) == 1 and own[0]['school_id'] == api.school['id']
    inventory = api.get('/connect/remote-instances')['items']
    assert [row['name'] for row in inventory] == [own[0]['name'], 'unknown-provider-instance']
    assert inventory[0]['registered'] and not inventory[1]['registered']
    for foreign in (other, external):
        obj = foreign.get('/connect')['items'][0]
        assert client.post(api.base + '/connect/instances/' + obj['id'] + '/prefer', headers=admin).status_code == 404
        assert client.post(api.base + '/connect/instances/adopt', headers=admin,
                           json={'instance_name': obj['name'], 'primary': True}).status_code == 409
    assert Provider.calls == []  # Rejeição antes de consultar ou alterar o provedor.
    # Um vínculo antigo inconsistente não vence a propriedade explícita.
    with SessionLocal.begin() as db:
        foreign_id = db.scalar(select(m.ConnectInstance.id).where(m.ConnectInstance.school_id == other.school['id']))
        db.add(m.ConnectSchoolBinding(school_id=api.school['id'], instance_id=foreign_id, updated_at=now()))
    with SessionLocal() as db:
        assert connect_core.connect_instance_for_school(db, api.school['id']).id == own[0]['id']
        from fastapi import HTTPException
        import pytest
        with pytest.raises(HTTPException) as exc:
            connect_core.enqueue_connect_message(db, api.school['id'], foreign_id, {'number': '5575999990000', 'text': 'teste'}, str(uuid.uuid4()))
        assert exc.value.status_code == 409
    assert api.get('/connect')['preferred_instance_id'] == ''


def test_unassigned_legacy_whatsapp_is_not_inherited(client, admin, api, monkeypatch):
    from app import connect, connect_core
    other = school_api(client, admin, api.school['company_id'], 'Legado WhatsApp outra escola')
    with SessionLocal.begin() as db:
        obj = m.ConnectInstance(company_id=api.school['company_id'], name='legacy-' + uuid.uuid4().hex, enabled=True, status='open')
        db.add(obj)
        db.flush()
        instance_id, name = obj.id, obj.name
        for school in (api, other):
            db.add(m.ConnectSchoolBinding(school_id=school.school['id'], instance_id=obj.id, updated_at=now()))
    assert api.get('/connect')['items'] == []
    assert api.get('/connect')['legacy_binding_requires_review']
    with SessionLocal() as db:
        assert connect_core.connect_instance_for_school(db, api.school['id'], required=False) is None
    response = client.post(api.base + '/connect/instances/adopt', headers=admin, json={'instance_name': name, 'primary': True})
    assert response.status_code == 409
    with SessionLocal() as db:
        assert db.get(m.ConnectInstance, instance_id).school_id is None
    released = api.post('/connect/legacy-bindings/release', {'reason': 'Instância passará à outra escola'}, expect=200)
    assert released['released'] == 1
    with SessionLocal() as db:
        assert db.get(m.ConnectSchoolBinding, api.school['id']) is None
        assert db.get(m.ConnectSchoolBinding, other.school['id']).instance_id == instance_id
        assert db.get(m.ConnectInstance, instance_id).enabled
    class Provider:
        def fetch_instances(self):
            return [{'name': name, 'state': 'open'}]
    monkeypatch.setattr(connect, 'ConnectApiClient', Provider)
    adopted = other.post('/connect/instances/adopt', {'instance_name': name, 'primary': True})
    assert adopted['instance']['school_id'] == other.school['id']
    assert not other.get('/connect')['legacy_binding_requires_review']
    assert api.get('/connect')['items'] == []


def test_external_provider_instance_can_be_adopted(client, admin, api, monkeypatch):
    from app import connect
    name = 'external-' + uuid.uuid4().hex

    class Provider:
        def fetch_instances(self):
            return [{'instanceName': name, 'connectionStatus': 'open', 'number': '5575999990000'}]

    monkeypatch.setattr(connect, 'ConnectApiClient', Provider)
    available = api.get('/connect/remote-instances')['items']
    assert len(available) == 1 and available[0]['name'] == name and not available[0]['registered']
    adopted = api.post('/connect/instances/adopt', {'instance_name': name, 'primary': True})['instance']
    assert adopted['source'] == 'adopted' and adopted['school_id'] == api.school['id']
    assert api.get('/connect/remote-instances')['items'][0]['registered']


def test_whatsapp_migration_preserves_ambiguous_legacy_links():
    import importlib.util
    from pathlib import Path
    import sqlalchemy as sa
    path = Path(__file__).resolve().parents[1] / 'migrations/versions/0033_connect_school_ownership.py'
    spec = importlib.util.spec_from_file_location('school_ownership_migration', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    engine = sa.create_engine('sqlite:///:memory:')
    with engine.begin() as db:
        for statement in (
            'CREATE TABLE schools(id TEXT,company_id TEXT)',
            'CREATE TABLE connect_instances(id TEXT,company_id TEXT,name TEXT,school_id TEXT)',
            'CREATE TABLE connect_school_bindings(school_id TEXT,instance_id TEXT)',
            'CREATE TABLE units(id TEXT,school_id TEXT)',
            'CREATE TABLE connect_unit_bindings(unit_id TEXT,instance_id TEXT)',
            'CREATE TABLE audit_events(entity_type TEXT,entity_id TEXT,action TEXT,school_id TEXT)',
        ):
            db.execute(sa.text(statement))
        db.execute(sa.text("INSERT INTO schools VALUES ('a','company1'),('b','company1'),('c','company2')"))
        db.execute(sa.text("INSERT INTO connect_instances VALUES ('own','company1','own',NULL),('ambiguous','company1','ambiguous',NULL),('single','company2','single',NULL),('unknown','company1','unknown',NULL),('duplicate1','company1','duplicate',NULL),('duplicate2','company2','duplicate',NULL)"))
        db.execute(sa.text("INSERT INTO connect_school_bindings VALUES ('a','own'),('a','ambiguous'),('b','ambiguous'),('a','duplicate1')"))
        db.execute(sa.text("INSERT INTO audit_events VALUES ('connect_instances','own','connect.instance.created','a')"))
        module.backfill_ownership(db)
        owners = dict(db.execute(sa.text('SELECT id,school_id FROM connect_instances')).all())
        assert owners == {'own': 'a', 'ambiguous': None, 'single': 'c', 'unknown': None, 'duplicate1': None, 'duplicate2': None}
        assert db.scalar(sa.text("SELECT COUNT(*) FROM connect_school_bindings WHERE instance_id='ambiguous'")) == 2
    engine.dispose()
