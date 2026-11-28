from uuid import uuid4

from app import models as m
from app.db import SessionLocal
from test_family_access_profiles import account


def test_active_class_and_individual_material_visibility(api):
    catalog = api.catalogs(capacity=4)
    component = api.post('/curriculum-components', {'name':'Artes'})
    diary = api.post('/diaries', {'class_group_id':catalog['group']['id'], 'component_id':component['id']})
    path = '/diaries/'+diary['id']+'/materials'
    _, first, student, _ = account(api, 'guardian')
    _, second, peer, _ = account(api, 'student')
    registrations = [api.enroll(person, catalog['group']) for person in (student, peer)]
    with SessionLocal.begin() as db:
        for r in registrations:
            db.get(m.Enrollment, r['id']).status = 'active'
    ids = []
    for enrollment in (None, registrations[0]['id']):
        body = {'title':'Estudos de desenho', 'body':'Escolha uma cor e faça um desenho.',
                'kind':'Atividade','client_key':str(uuid4()),'enrollment_id':enrollment}
        result = api.post(path, body)
        ids.append(result['id'])
        assert api.post(path, body) == result
        api.post(path, dict(body, title='Outro título'), 409)
    first_path = '/api/v1/family/students/'+student['id']+'/materials'
    peer_path = '/api/v1/family/students/'+peer['id']+'/materials'
    assert {r['id'] for r in api.client.get(first_path, headers=first).json()} == set(ids)
    assert [r['id'] for r in api.client.get(peer_path, headers=second).json()] == ids[:1]
    assert api.client.get(peer_path+'/'+ids[1]+'/print.pdf', headers=second).status_code == 404
    assert api.client.get(first_path+'/'+ids[1]+'/print.pdf', headers=second).status_code == 404
    with SessionLocal.begin() as db:
        db.get(m.Enrollment, registrations[0]['id']).status = 'transferred'
    assert api.client.get(first_path, headers=first).json() == []
    assert api.client.get(first_path+'/'+ids[0]+'/print.pdf', headers=first).status_code == 404


def test_recent_materials_are_scoped_ordered_limited_and_lightweight(api):
    from datetime import UTC, datetime, timedelta

    group = api.catalogs(capacity=4)['group']
    component = api.post('/curriculum-components', {'name':'Ciências'})
    diary = api.post('/diaries', {'class_group_id':group['id'], 'component_id':component['id']})
    _, guardian, first, person = account(api, 'guardian')
    _, pupil, peer, _ = account(api, 'student')
    enrollments = [api.enroll(row, group) for row in (first, peer)]
    with SessionLocal.begin() as db:
        for enrollment in enrollments:
            db.get(m.Enrollment, enrollment['id']).status = 'active'
    today = datetime(2026, 11, 27, tzinfo=UTC)
    added = []
    for i, enrollment in enumerate([None, None, enrollments[0]['id'], None, enrollments[1]['id']]):
        material = api.post('/diaries/'+diary['id']+'/materials', {
            'title':'Atividade '+str(i), 'body':'Conteúdo integral da atividade '+str(i),
            'kind':'Atividade', 'client_key':str(uuid4()), 'enrollment_id':enrollment})
        added.append(material['id'])
        with SessionLocal.begin() as db:
            db.get(m.ClassMaterial, material['id']).created_at = today + timedelta(minutes=i)
    def endpoint(student):
        return '/api/v1/family/students/'+student['id']+'/materials?view=recent'
    response = api.client.get(endpoint(first), headers=guardian)
    assert response.status_code == 200, response.text
    assert [row['id'] for row in response.json()] == [added[3], added[2], added[1]]
    assert all(set(row) == {'id', 'kind', 'title', 'created_at'} for row in response.json())
    assert [row['id'] for row in api.client.get(endpoint(peer), headers=pupil).json()] == [added[4], added[3], added[1]]
    assert api.client.get(endpoint(peer), headers=guardian).status_code == 404
    with SessionLocal.begin() as db:
        link = db.query(m.GuardianLink).filter_by(student_id=first['id'], person_id=person['id']).one()
        link.legal, link.financial = False, True
        db.get(m.Enrollment, enrollments[1]['id']).status = 'transferred'
    assert api.client.get(endpoint(first), headers=guardian).status_code == 404
    assert api.client.get(endpoint(peer), headers=pupil).json() == []


def test_absence_optional_document_and_retries(api):
    _, guardian, student, _ = account(api, 'guardian')
    _, pupil, peer, _ = account(api, 'student')
    path = '/api/v1/family/students/'+student['id']+'/absences'
    data = {'absence_date':'2026-11-10','reason':'Atendimento familiar','client_key':str(uuid4())}
    def send(data, **extra):
        return api.client.post(path, data=data, headers=guardian, **extra)
    assert send(data, files={'evidence':('arquivo.pdf',b'invalido')}).status_code == 422
    created = send(data)
    assert created.status_code == 201, created.text
    assert send(data).json() == created.json()
    assert send(dict(data, reason='Outro motivo')).status_code == 409
    records = api.client.get(path,headers=guardian).json()
    assert len(records) == 1 and records[0]['number'] == created.json()['number']
    assert api.client.post(path.replace(student['id'],peer['id']), data=data,headers=pupil).status_code == 403
    records = api.get('/protocols?student_id='+student['id'])['items']
    assert len(records) == 1 and records[0]['status']=='open'
    assert api.get('/protocols/'+records[0]['id'])['evidence_file_id'] is None
