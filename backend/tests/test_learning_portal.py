"""Isolamento do boletim e publicação somente por fechamento ativo."""
from datetime import datetime, UTC
from sqlalchemy import select
from app import models as m
from app.db import SessionLocal
from app.diary import _snapshot
from test_diary_portal import active_student_and_guardian, portal_session, portal_call
from test_profiles import create_user, login


def published_learning(api):
    catalog, student, guardian, enrollment = active_student_and_guardian(api)
    other = api.student('Estudante que não pertence ao responsável')
    period = api.post('/academic-periods', {
        'academic_year_id': catalog['year']['id'], 'name': '3º Bimestre',
        'starts_on': '2026-09-01', 'ends_on': '2026-11-30', 'order_index': 3,
    })
    component = api.post('/curriculum-components', {'name': 'Matemática'})
    diary = api.post('/diaries', {'class_group_id': catalog['group']['id'], 'component_id': component['id']})
    for day, count, status in [('2026-09-22', 2, 'present'), ('2026-09-23', 1, 'justified_absence')]:
        lesson = api.post('/diaries/' + diary['id'] + '/lessons', {
            'academic_period_id': period['id'], 'lesson_date': day,
            'lesson_count': count, 'content': 'Conteúdo publicado de teste',
        })
        api.call('PUT', '/diaries/' + diary['id'] + '/lessons/' + lesson['id'] + '/attendance', {
            'items': [{'enrollment_id': enrollment['id'], 'status': status, 'note': 'NOTA_INTERNA_NAO_PUBLICAR'}],
        })
    with SessionLocal.begin() as db:
        snapshot = _snapshot(db, db.get(m.SchoolDiary, diary['id']), period['id'])
        snapshot['period_results'] = [
            {'academic_period_id': period['id'], 'enrollment_id': enrollment['id'], 'student_id': student['id'],
             'numeric_value': '8.5000', 'concept_value': '', 'status': 'calculated'},
            {'academic_period_id': period['id'], 'enrollment_id': 'other-enrollment', 'student_id': other['id'],
             'numeric_value': '99.9999', 'concept_value': '', 'status': 'calculated'},
        ]
        snapshot['assessment_rules'] = [{'academic_period_id': period['id'], 'justified_absence_counts_as_present': False}]
        user = db.scalar(select(m.User).where(m.User.email == 'admin@example.com'))
        closure = m.DiaryClosure(school_id=api.school['id'], diary_id=diary['id'], academic_period_id=period['id'],
            snapshot=snapshot, snapshot_hash='1' * 64, reason='Fechamento sintético', closed_by=user.id,
            closed_at=datetime.now(UTC), active=True)
        db.add(closure)
        db.flush()
        closure_id = closure.id
    return student, guardian, enrollment, other, closure_id


def activate(client, cookies, student):
    terms = portal_call(client, cookies, 'GET', '/diary/access-consent')
    portal_call(client, cookies, 'POST', '/diary/access', {
        'accepted': True, 'consent_version': terms['version'], 'student_ids': [student['id']],
    })


def test_portal_learning_needs_consent_and_rejects_other_students(api, client):
    student, guardian, enrollment, other, closure_id = published_learning(api)
    cookies, _ = portal_session(api)
    assert portal_call(client, cookies, 'GET', '/learning')['students'] == []
    portal_call(client, cookies, 'GET', '/learning/' + student['id'] + '/report.pdf', expected=404)
    activate(client, cookies, student)
    data = portal_call(client, cookies, 'GET', '/learning')
    assert len(data['students']) == 1
    item = data['students'][0]
    assert item['student_id'] == student['id']
    assert item['school_id'] == api.school['id']
    result = item['enrollments'][0]['subjects'][0]['periods'][0]
    assert result['grade_display'] == '8,5'
    assert result['attendance'] == {'present': 2, 'absent': 0, 'justified_absence': 1, 'unrecorded': 0, 'total': 3, 'percentage': 66.67}
    assert '99.9999' not in str(data)
    assert 'NOTA_INTERNA_NAO_PUBLICAR' not in str(data)
    portal_call(client, cookies, 'GET', '/learning/' + other['id'] + '/report.pdf', expected=404)
    portal_call(client, cookies, 'GET', '/learning/' + student['id'] + '/report.pdf?enrollment_id=other-enrollment', expected=404)
    response = portal_call(client, cookies, 'GET', '/learning/' + student['id'] + '/report.pdf?enrollment_id=' + enrollment['id'])
    assert response.content.startswith(b'%PDF')
    assert response.headers['cache-control'] == 'no-store'
    with SessionLocal.begin() as db:
        db.get(m.DiaryClosure, closure_id).active = False
    assert portal_call(client, cookies, 'GET', '/learning')['students'][0]['enrollments'][0]['subjects'] == []
    portal_call(client, cookies, 'GET', '/learning/' + student['id'] + '/report.pdf', expected=409)


def test_portal_learning_access_is_removed_when_consent_revoked(api, client):
    student, *_ = published_learning(api)
    cookies, _ = portal_session(api)
    activate(client, cookies, student)
    portal_call(client, cookies, 'POST', '/diary/access/' + student['id'] + '/revoke', {})
    assert portal_call(client, cookies, 'GET', '/learning')['students'] == []


def test_profile_learning_uses_explicit_identity_and_school_access(api, client, admin):
    import uuid
    student, guardian, enrollment, other, _ = published_learning(api)
    email = uuid.uuid4().hex + '@example.com'
    create_user(client, admin, name='Aluno do boletim', email=email, role='student',
                school_id=api.school['id'], person_id=student['person']['id'])
    headers = login(client, email, 'Profile-Test-Password-2026!')
    response = client.get('/api/v1/profile/learning?school_id=' + api.school['id'], headers=headers)
    assert response.status_code == 200, response.text
    assert response.json()['students'][0]['student_id'] == student['id']
    assert client.get('/api/v1/profile/learning?school_id=other-school', headers=headers).status_code == 404
    assert client.get('/api/v1/profile/learning/' + other['id'] + '/report.pdf', headers=headers).status_code == 404
    report = client.get('/api/v1/profile/learning/' + student['id'] + '/report.pdf', headers=headers)
    assert report.status_code == 200 and report.content.startswith(b'%PDF')
    with SessionLocal.begin() as db:
        user = db.scalar(select(m.User).where(m.User.email == email))
        user.person_id = None
        db.get(m.Person, student['person']['id']).email = email
    assert client.get('/api/v1/profile/learning', headers=headers).json()['students'] == []


def test_financial_only_guardian_has_no_learning_access(api, client, admin):
    import uuid
    student, guardian, *_ = published_learning(api)
    with SessionLocal.begin() as db:
        link = db.scalar(select(m.GuardianLink).where(m.GuardianLink.student_id == student['id'], m.GuardianLink.person_id == guardian['id']))
        link.legal = False
    email = uuid.uuid4().hex + '@example.com'
    create_user(client, admin, name='Responsável apenas financeiro', email=email, role='guardian',
                school_id=api.school['id'], person_id=guardian['id'])
    headers = login(client, email, 'Profile-Test-Password-2026!')
    response = client.get('/api/v1/profile/learning', headers=headers)
    assert response.status_code == 200 and response.json()['students'] == []
