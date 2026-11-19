from conftest import API
from test_user_access_profiles import create, login


def secretary_session(provisioner):
    operator = create(provisioner, 'secretary')
    return API(provisioner.client, login(provisioner, operator), provisioner.school)


def test_counter_activation_is_atomic_and_keeps_history(api):
    api = secretary_session(api)
    group = api.catalogs(capacity=1)['group']
    first = api.student('Primeiro aluno sintético')
    body = {'student_id': first['id'], 'class_group_id': group['id'], 'enrolled_on': '2026-11-01'}
    api.post('/enrollments?activate=true', body, 422)
    assert api.get('/enrollments')['total'] == 0
    api.guardian(first)
    active = api.post('/enrollments?activate=true', body)
    assert active['status'] == 'active'
    actions = {e['action'] for e in api.get('/enrollments/' + active['id'])['history']}
    assert actions == {'created', 'activate'}
    api.post('/enrollments?activate=true', body, 409)
    second = api.student('Segundo aluno sintético', adult=True)
    body['student_id'] = second['id']
    api.post('/enrollments?activate=true', body, 409)
    assert api.get('/enrollments')['total'] == 1
    assert api.post('/enrollments', body)['status'] == 'draft'


def test_secretary_can_reenroll_transfer_and_cancel(api):
    secretary = secretary_session(api)
    catalog = secretary.catalogs()
    student = secretary.student(adult=True)
    first = secretary.move(secretary.enroll(student, catalog['group']), 'activate')
    year = secretary.post('/academic-years', {
        'name': '2027', 'starts_on': '2027-01-01', 'ends_on': '2027-12-31'})
    destination = secretary.post('/class-groups', {
        'name': 'Turma de destino', 'unit_id': catalog['unit']['id'],
        'academic_year_id': year['id'], 'grade_id': catalog['grade']['id'],
        'shift_id': catalog['shift']['id'], 'capacity': 2})
    renewed = secretary.post('/enrollments/' + first['id'] + '/reenroll', {
        'class_group_id': destination['id'], 'enrolled_on': '2027-01-10'})
    assert renewed['previous_enrollment_id'] == first['id']
    assert secretary.move(first, 'transfer')['status'] == 'transferred'
    assert secretary.move(secretary.move(renewed, 'activate'), 'cancel')['status'] == 'cancelled'
    assert {row['action'] for row in secretary.get('/students/' + student['id'] + '/history')} >= {
        'transfer', 'activate', 'cancel'}
