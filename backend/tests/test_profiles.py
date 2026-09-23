def login(client, email, password):
    response = client.post('/api/v1/auth/login', json={'email': email, 'password': password})
    assert response.status_code == 200, response.text
    return {'Authorization': 'Bearer ' + response.json()['access_token']}


def create_user(client, admin, *, name, email, role, school_id, person_id):
    response = client.post('/api/v1/users', headers=admin, json={
        'name': name,
        'email': email,
        'password': 'Profile-Test-Password-2026!',
        'role': role,
        'school_ids': [school_id],
        'person_id': person_id,
    })
    assert response.status_code == 201, response.text
    return response.json()


def test_teacher_context_is_limited_to_assigned_class(client, admin, api, school):
    catalog = api.catalogs()
    teacher_person = api.post('/persons', {'name': 'Professor de Teste', 'email': 'professor@example.com'})
    teacher_user = create_user(
        client, admin, name='Professor de Teste', email='professor@example.com',
        role='teacher', school_id=school['id'], person_id=teacher_person['id'],
    )
    assignment = client.post(
        '/api/v1/schools/' + school['id'] + '/teacher-assignments',
        headers=admin,
        json={'teacher_user_id': teacher_user['id'],
              'class_group_id': catalog['group']['id'], 'subject_name': 'Matemática'},
    )
    assert assignment.status_code == 201, assignment.text

    student = api.student()
    api.guardian(student)
    enrollment = api.enroll(student, catalog['group'])
    assert enrollment['status'] == 'draft'
    api.move(enrollment, 'activate')
    teacher = login(client, 'professor@example.com', 'Profile-Test-Password-2026!')
    context = client.get('/api/v1/profile/context', headers=teacher)
    assert context.status_code == 200, context.text
    body = context.json()
    assert body['role'] == 'teacher'
    assert len(body['assignments']) == 1
    assert body['assignments'][0]['class_group_id'] == catalog['group']['id']
    assert body['assignments'][0]['students'][0]['number'] == student['number']


def test_teacher_assignment_can_target_person_without_login(client, admin, api, school):
    catalog = api.catalogs()
    teacher = api.post('/teachers', {
        'person': {'name': 'Docente sem acesso', 'birth_date': '1980-01-01'},
        'registration_number': 'DOC-SEM-LOGIN',
        'employment_type': 'temporary',
    })
    assignment = client.post(
        '/api/v1/schools/' + school['id'] + '/teacher-assignments',
        headers=admin,
        json={'teacher_person_id': teacher['person']['id'],
              'class_group_id': catalog['group']['id'], 'subject_name': 'Artes'},
    )
    assert assignment.status_code == 201, assignment.text
    assert assignment.json()['teacher_person_id'] == teacher['person']['id']
    assert assignment.json()['teacher_user_id'] is None


def test_student_and_guardian_context_do_not_expose_admin_dashboard(client, admin, api, school):
    catalog = api.catalogs()
    student = api.student(name='Aluno do Portal')
    api.enroll(student, catalog['group'])
    guardian = api.guardian(student, name='Responsável do Portal')

    create_user(
        client, admin, name='Aluno do Portal', email='aluno@example.com',
        role='student', school_id=school['id'], person_id=student['person']['id'],
    )
    create_user(
        client, admin, name='Responsável do Portal', email='responsavel@example.com',
        role='guardian', school_id=school['id'], person_id=guardian['id'],
    )

    student_headers = login(client, 'aluno@example.com', 'Profile-Test-Password-2026!')
    student_context = client.get('/api/v1/profile/context', headers=student_headers)
    assert student_context.status_code == 200, student_context.text
    assert student_context.json()['students'][0]['number'] == student['number']
    assert client.get('/api/v1/schools/' + school['id'] + '/dashboard', headers=student_headers).status_code == 403

    guardian_headers = login(client, 'responsavel@example.com', 'Profile-Test-Password-2026!')
    guardian_context = client.get('/api/v1/profile/context', headers=guardian_headers)
    assert guardian_context.status_code == 200, guardian_context.text
    assert guardian_context.json()['students'][0]['id'] == student['id']
    assert guardian_context.json()['students'][0]['relationship'] == 'Responsável'
