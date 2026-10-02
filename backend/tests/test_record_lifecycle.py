"""Exclusão de cadastros sem perder histórico ou atravessar escolas."""
import uuid
import pytest
from sqlalchemy import select
from conftest import API, PASSWORD


def endpoint(resource, row):
    return '/record-lifecycle/' + resource + '/' + row['id']


def act(api, resource, row, action, expect=200, **extra):
    return api.post(endpoint(resource, row), {'action': action, 'version': row['version'],
                    'reason': 'Cadastro conferido em teste', **extra}, expect)


def role_api(api, role):
    email = role + '-' + uuid.uuid4().hex[:10] + '@example.com'
    response = api.client.post('/api/v1/users', headers=api.headers, json={
        'name': 'Operador de teste', 'email': email, 'password': PASSWORD,
        'role': role, 'school_ids': [api.school['id']]})
    assert response.status_code == 201, response.text
    login = api.client.post('/api/v1/auth/login', json={'email': email, 'password': PASSWORD})
    assert login.status_code == 200, login.text
    return API(api.client, {'Authorization': 'Bearer ' + login.json()['access_token']}, api.school)


def test_person_archive_default_filter_restore_and_guard(api):
    person = api.post('/persons', {'name': 'Fornecedor sem movimentos', 'person_types': ['supplier']})
    preview = api.get(endpoint('persons', person))
    assert preview['archive_allowed'] and preview['delete_allowed']
    assert preview['owned_records'][0]['count'] == 1
    archived = act(api, 'persons', person, 'archive')
    assert api.get('/persons')['total'] == 0
    rows = api.get('/persons?archived=archived')['items']
    assert rows[0]['id'] == person['id'] and rows[0]['archived'] and rows[0]['active'] is False
    assert api.get('/persons?archived=all')['total'] == 1
    api.patch('/persons/' + person['id'], {'version': archived['version'], 'data': {'name': 'Não editar arquivado'}}, 409)
    api.post('/students', {'person_id': person['id']}, 409)
    restored = act(api, 'persons', {**person, 'version': archived['version']}, 'restore')
    rows = api.get('/persons')['items']
    assert rows[0]['active'] is True and rows[0]['archived'] is False
    assert rows[0]['version'] == restored['version']
    assert api.get('/persons?archived=archived')['total'] == 0


def test_permanent_delete_requires_exact_confirmation_and_keeps_audit(api):
    from app.db import SessionLocal
    from app import models as m
    person = api.post('/persons', {'name': 'Pessoa removível', 'person_types': ['supplier', 'customer']})
    act(api, 'persons', person, 'delete', 422, confirmation='EXCLUIR')
    assert api.get('/persons')['total'] == 1
    act(api, 'persons', person, 'delete', confirmation=person['name'])
    assert api.get('/persons?archived=all')['total'] == 0
    with SessionLocal() as db:
        assert db.get(m.Person, person['id']) is None
        assert not db.scalar(select(m.PersonTypeLink.id).where(m.PersonTypeLink.person_id == person['id']))
        audit = db.scalar(select(m.AuditEvent).where(m.AuditEvent.entity_id == person['id'], m.AuditEvent.action == 'record.delete'))
        assert audit and audit.details['reason'] == 'Cadastro conferido em teste'


def test_history_blocks_permanent_even_after_cancellation(api):
    catalog = api.catalogs()
    student = api.student(adult=True)
    enrollment = api.enroll(student, catalog['group'])
    preview = api.get(endpoint('students', student))
    assert not preview['archive_allowed'] and not preview['delete_allowed']
    act(api, 'students', student, 'archive', 409)
    act(api, 'students', student, 'delete', 409, confirmation=student['person']['name'])
    api.move(enrollment, 'cancel')
    preview = api.get(endpoint('students', student))
    assert preview['archive_allowed'] and not preview['delete_allowed']
    assert any(item['key'] == 'enrollments' for item in preview['dependencies'])
    archived = act(api, 'students', student, 'archive')
    assert api.get('/students')['total'] == 0
    assert api.get('/students/' + student['id'])['enrollments'][0]['status'] == 'cancelled'
    api.post('/enrollments', {'student_id': student['id'], 'class_group_id': catalog['group']['id'], 'enrolled_on': '2026-09-22'}, 409)
    act(api, 'students', {**student, 'version': archived['version']}, 'restore')
    assert api.get('/students')['total'] == 1


def test_delete_student_without_dependencies_preserves_person(api):
    student = api.student()
    act(api, 'students', student, 'delete', confirmation=student['person']['name'])
    assert api.get('/students?archived=all')['total'] == 0
    assert api.get('/persons')['items'][0]['id'] == student['person']['id']
    api.call('GET', '/students/' + student['id'], expect=404)


def test_preview_rechecks_new_references_before_deleting(api):
    person = api.post('/persons', {'name': 'Pessoa com vínculo posterior', 'birth_date': '2000-01-01'})
    assert api.get(endpoint('persons', person))['delete_allowed']
    api.post('/students', {'person_id': person['id']})
    act(api, 'persons', person, 'delete', 409, confirmation=person['name'])
    assert api.get('/persons')['total'] == 1


def test_scope_permissions_and_permanent_role(api):
    person = api.post('/persons', {'name': 'Pessoa da escola'})
    viewer = role_api(api, 'viewer')
    viewer.call('GET', endpoint('persons', person), expect=403)
    act(viewer, 'persons', person, 'archive', 403)
    secretary = role_api(api, 'secretary')
    assert secretary.get(endpoint('persons', person))['delete_permission'] is False
    act(secretary, 'persons', person, 'delete', 403, confirmation=person['name'])
    archived = act(secretary, 'persons', person, 'archive')
    other = api.client.post('/api/v1/schools', headers=api.headers, json={'name': 'Outra ' + uuid.uuid4().hex[:8], 'company_id': api.school['company_id']}).json()
    wrong_school = API(api.client, api.headers, other)
    wrong_school.call('GET', endpoint('persons', person), expect=404)
    act(wrong_school, 'persons', {**person, 'version': archived['version']}, 'restore', 404)
    assert api.client.get('/api/v1/schools/' + other['id'] + endpoint('persons', person), headers=secretary.headers).status_code == 403


@pytest.mark.parametrize('resource,payload', [
    ('units', {'name': 'Unidade removível'}), ('grades', {'name': 'Série removível'}),
    ('shifts', {'name': 'Turno removível'}), ('document-types', {'name': 'Documento removível'}),
    ('academic-years', {'name': '2030', 'starts_on': '2030-01-01', 'ends_on': '2030-12-31'}),
])
def test_catalog_archive_restore_delete(api, resource, payload):
    row = api.post('/' + resource, payload)
    result = act(api, resource, row, 'archive')
    assert api.get('/' + resource) == []
    listed = api.get('/' + resource + '?archived=archived')
    assert listed[0]['id'] == row['id'] and listed[0]['archived']
    result = act(api, resource, {**row, 'version': result['version']}, 'restore')
    assert api.get('/' + resource)[0]['archived'] is False
    act(api, resource, {**row, 'version': result['version']}, 'delete', confirmation=row['name'])
    assert api.get('/' + resource + '?archived=all') == []


def test_structure_archive_order_and_new_class_guard(api):
    catalog = api.catalogs()
    assert not api.get(endpoint('units', catalog['unit']))['archive_allowed']
    act(api, 'units', catalog['unit'], 'archive', 409)
    group_result = act(api, 'class-groups', catalog['group'], 'archive')
    unit_result = act(api, 'units', catalog['unit'], 'archive')
    historical = api.get('/class-groups?archived=archived')[0]
    assert historical['unit_name'] == catalog['unit']['name']
    assert historical['year_name'] == catalog['year']['name']
    payload = {key: catalog['group'][key] for key in ['name', 'unit_id', 'academic_year_id', 'grade_id', 'shift_id', 'capacity']}
    payload['name'] = 'Outra turma'
    api.post('/class-groups', payload, 409)
    assert not api.get(endpoint('class-groups', catalog['group']))['restore_allowed']
    act(api, 'class-groups', {**catalog['group'], 'version': group_result['version']}, 'restore', 409)
    act(api, 'units', {**catalog['unit'], 'version': unit_result['version']}, 'restore')
    act(api, 'class-groups', {**catalog['group'], 'version': group_result['version']}, 'restore')


@pytest.mark.parametrize('resource', ['teachers', 'employees'])
def test_staff_archive_hides_and_restores_previous_employment_status(api, resource):
    row = api.post('/' + resource, {'person': {'name': 'Profissional em licença'}, 'employment_status': 'leave'})
    result = act(api, resource, row, 'archive')
    assert api.get('/' + resource)['total'] == 0
    rows = api.get('/' + resource + '?archived=archived')['items']
    assert rows[0]['employment_status'] == 'inactive'
    api.patch('/' + resource + '/' + row['id'], {'version': result['version'], 'data': {'employment_status': 'active'}}, 409)
    restored = act(api, resource, {**row, 'version': result['version']}, 'restore')
    assert api.get('/' + resource)['items'][0]['employment_status'] == 'leave'
    act(api, resource, {**row, 'version': restored['version']}, 'delete', confirmation=row['person']['name'])
    assert api.get('/persons')['total'] == 1


def test_teacher_archive_blocks_new_assignment_and_active_assignment_blocks_archive(api):
    catalog = api.catalogs()
    teacher = api.post('/teachers', {'person': {'name': 'Docente para arquivamento'}})
    result = act(api, 'teachers', teacher, 'archive')
    payload = {'teacher_person_id': teacher['person']['id'], 'class_group_id': catalog['group']['id'], 'subject_name': 'Artes'}
    api.post('/teacher-assignments', payload, 409)
    restored = act(api, 'teachers', {**teacher, 'version': result['version']}, 'restore')
    api.post('/teacher-assignments', payload)
    current = {**teacher, 'version': restored['version']}
    assert not api.get(endpoint('teachers', current))['archive_allowed']
    assert not api.get(endpoint('teachers', current))['delete_allowed']
    act(api, 'teachers', current, 'archive', 409)


def test_stale_version_and_invalid_filter_leave_record_unchanged(api):
    person = api.post('/persons', {'name': 'Cadastro com versão'})
    act(api, 'persons', {**person, 'version': person['version'] + 1}, 'archive', 409)
    assert api.get('/persons')['items'][0]['active']
    api.call('GET', '/persons?archived=unknown', expect=422)
    api.call('GET', '/record-lifecycle/charges/' + person['id'], expect=404)


def test_legacy_archive_endpoint_supports_restore(api):
    student = api.student()
    result = api.post('/students/' + student['id'] + '/archive', {'version': student['version'], 'data': {'reason': 'Aluno arquivado pelo fluxo anterior'}}, 200)
    assert api.get('/students')['total'] == 0
    assert api.get('/students?status=archived')['total'] == 1
    act(api, 'students', result, 'restore')
    assert api.get('/students')['total'] == 1


def test_inactive_person_restores_as_inactive(api):
    person = api.post('/persons', {'name': 'Cadastro originalmente inativo', 'active': False})
    result = act(api, 'persons', person, 'archive')
    act(api, 'persons', {**person, 'version': result['version']}, 'restore')
    assert api.get('/persons')['items'][0]['active'] is False


def test_archived_structure_cannot_receive_diary_plan_or_period(api):
    catalog = api.catalogs()
    component = api.post('/curriculum-components', {'name': 'Componente de teste', 'code': 'TEST'})
    act(api, 'class-groups', catalog['group'], 'archive')
    api.post('/diaries', {'class_group_id': catalog['group']['id'], 'component_id': component['id']}, 409)
    api.post('/curriculum-plans', {'class_group_id': catalog['group']['id'], 'component_id': component['id']}, 409)
    act(api, 'academic-years', catalog['year'], 'archive')
    api.post('/academic-periods', {'academic_year_id': catalog['year']['id'], 'name': 'Período futuro',
                                 'starts_on': '2026-01-01', 'ends_on': '2026-05-31'}, 409)


@pytest.mark.parametrize('resource,role', [('students', 'student'), ('teachers', 'teacher')])
def test_archived_profile_cannot_be_linked_to_new_user(api, resource, role):
    row = api.post('/' + resource, {'person': {'name': 'Perfil arquivado para acesso', 'birth_date': '2000-01-01'}})
    act(api, resource, row, 'archive')
    response = api.client.post('/api/v1/users', headers=api.headers, json={
        'name': 'Acesso indevido', 'email': uuid.uuid4().hex + '@example.com', 'password': PASSWORD,
        'role': role, 'person_id': row['person']['id'], 'school_ids': [api.school['id']]})
    assert response.status_code == 409, response.text


def test_archived_person_cannot_receive_responsible_or_business_profile(api):
    person = api.post('/persons', {'name': 'Pessoa arquivada sem novos vínculos'})
    result = act(api, 'persons', person, 'archive')
    api.post('/persons/' + person['id'] + '/responsible', {'version': result['version'], 'data': {}}, 409)
    api.post('/business-persons/supplier', {'person_id': person['id'], 'version': result['version'], 'details': {}}, 409)
    student = api.student()
    api.post('/students/' + student['id'] + '/guardians', {'person_id': person['id']}, 409)


def test_archived_document_type_cannot_receive_new_waiver(api):
    student = api.student()
    kind = api.post('/document-types', {'name': 'Tipo arquivado'})
    act(api, 'document-types', kind, 'archive')
    api.post('/students/' + student['id'] + '/document-waivers', {'document_type_id': kind['id'], 'reason': 'Teste de bloqueio'}, 409)


def test_campaign_json_reference_prevents_permanent_class_deletion(api):
    from app.db import SessionLocal
    from app.online_models import AdmissionCampaign
    from datetime import date
    catalog = api.catalogs()
    with SessionLocal() as db:
        db.add(AdmissionCampaign(school_id=api.school['id'], slug='lifecycle-' + uuid.uuid4().hex,
            title='Processo histórico', instructions='', privacy_notice='Uso de teste',
            class_group_ids=[catalog['group']['id']], opens_on=date(2026, 1, 1), closes_on=date(2026, 12, 31), active=False))
        db.commit()
    preview = api.get(endpoint('class-groups', catalog['group']))
    assert preview['archive_allowed'] and not preview['delete_allowed']
    assert any(item['key'] == 'admission_campaigns' for item in preview['dependencies'])
    act(api, 'class-groups', catalog['group'], 'delete', 409, confirmation=catalog['group']['name'])


def test_issued_document_prevents_delete_and_remains_readable_after_archive(api):
    student = api.student()
    issued = api.post('/students/' + student['id'] + '/issued-documents', {'kind': 'student_record'})
    original = api.client.get(api.base + '/files/' + issued['file_id'] + '/download', headers=api.headers)
    assert original.status_code == 200 and original.content.startswith(b'%PDF')
    preview = api.get(endpoint('students', student))
    assert not preview['delete_allowed'] and preview['archive_allowed']
    assert any(item['key'] == 'issued_documents' for item in preview['dependencies'])
    act(api, 'students', student, 'delete', 409, confirmation=student['person']['name'])
    act(api, 'students', student, 'archive')
    preserved = api.client.get(api.base + '/files/' + issued['file_id'] + '/download', headers=api.headers)
    assert preserved.status_code == 200 and preserved.content == original.content


def test_legacy_assignment_by_user_still_blocks_teacher_archive(api):
    from app.db import SessionLocal
    from app import models as m
    catalog = api.catalogs()
    teacher = api.post('/teachers', {'person': {'name': 'Docente com atribuição legada'}})
    response = api.client.post('/api/v1/users', headers=api.headers, json={
        'name': 'Professor legado', 'email': uuid.uuid4().hex + '@example.com', 'password': PASSWORD,
        'role': 'teacher', 'person_id': teacher['person']['id'], 'school_ids': [api.school['id']]})
    assert response.status_code == 201, response.text
    with SessionLocal() as db:
        db.add(m.TeacherAssignment(school_id=api.school['id'], teacher_user_id=response.json()['id'],
            teacher_person_id=None, class_group_id=catalog['group']['id'], academic_year_id=catalog['year']['id'], active=True))
        db.commit()
    preview = api.get(endpoint('teachers', teacher))
    assert not preview['archive_allowed']
    assert any(item['label'] == 'Atribuições docentes ativas' for item in preview['archive_blocks'])
    act(api, 'teachers', teacher, 'archive', 409)
