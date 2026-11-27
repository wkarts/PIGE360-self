from app import models as m
from app.db import SessionLocal
from test_profiles import create_user, login


def test_versioned_composition_preserves_history_and_print_labels(api):
    defaults = api.get('/diary-entry-fields')
    assert defaults['version'] == 0 and defaults['standard_columns']['standard-plan-objectives'] == 'objectives'
    first = {'id': 'custom-lesson', 'label': 'Experimento', 'scope': 'lesson'}
    second = {'id': 'custom-plan', 'label': 'Sequência', 'scope': 'plan'}
    skills = {'id': 'standard-lesson-skills', 'label': 'Competências', 'scope': 'lesson'}
    settings = api.call('PUT', '/diary-entry-fields', {'version': 0, 'fields': [second, skills, first]})
    assert [item['id'] for item in settings['fields']] == ['custom-plan', 'standard-lesson-skills', 'custom-lesson']
    api.call('PUT', '/diary-entry-fields', {'version': 0, 'fields': []}, 409)
    api.call('PUT', '/diary-entry-fields', {'version': 1, 'fields': [first, first]}, 422)
    api.call('PUT', '/diary-entry-fields', {'version': 1, 'fields': [{**skills, 'scope': 'plan'}]}, 422)
    catalog = api.catalogs()
    component = api.post('/curriculum-components', {'name': 'Ciências'})
    diary_data = {'class_group_id': catalog['group']['id'], 'component_id': component['id']}
    diary = api.post('/diaries', diary_data)
    url = '/diaries/' + diary['id'] + '/lessons'
    lesson_data = {'lesson_date': '2026-09-22', 'content': 'Análise de sementes', 'skills': 'Observar'}
    lesson = api.post(url, {**lesson_data, 'field_values': {first['id']: 'Feijão'}})
    assert {row['label'] for row in lesson['extra_fields']} == {'Experimento', 'Competências'}
    plan_data = {**diary_data, 'objectives': 'Comparar amostras'}
    plan = api.post('/curriculum-plans', {**plan_data, 'field_values': {second['id']: 'Coleta'}})
    api.post(url, {**lesson_data, 'lesson_date': '2026-09-23', 'field_values': {second['id']: 'Inválido'}}, 409)
    renamed = {**second, 'label': 'Etapa do plano'}
    api.call('PUT', '/diary-entry-fields', {'version': 1, 'fields': [renamed]})
    updated = api.patch(url + '/' + lesson['id'], {**lesson_data, 'content': 'Conclusões', 'version': lesson['version']})
    assert updated['extra_fields'] == lesson['extra_fields']
    api.patch(url + '/' + lesson['id'], {**lesson_data, 'version': lesson['version']}, 409)
    api.patch(url + '/' + lesson['id'], {**lesson_data, 'version': updated['version'], 'field_values': {first['id']: 'Regravar'}}, 409)
    api.call('PUT', '/diary-entry-fields', {'version': 2, 'fields': [first]}, 422)
    updated_plan = api.patch('/curriculum-plans/' + plan['id'], {**plan_data, 'version': plan['version'],
        'status': 'published', 'field_values': {second['id']: 'Coleta e análise'}})
    assert {'id': 'custom-plan', 'label': 'Sequência', 'value': 'Coleta e análise'} in updated_plan['extra_fields']
    restored = api.call('PUT', '/diary-entry-fields', {'version': 2, 'fields': [skills, renamed]})
    assert restored['fields'][0] == skills
    from app import diary_report_sections as paper
    sections = paper.lessons({'plan': updated_plan, 'lessons': [updated]})
    assert ('Sequência', 'Coleta e análise') in sections[0]['fields']
    assert 'Experimento: Feijão' in sections[-1]['rows'][0]['3']
    assert 'Competências: Observar' in sections[-1]['rows'][0]['3']


def test_curricular_component_removal_and_attendance_conflicts(api):
    catalog = api.catalogs(capacity=3)
    component = api.post('/curriculum-components', {'name': 'Biologia'})
    path = '/curriculum-components/' + component['id']
    changed = api.patch(path, {'version': component['version'], 'name': 'Biologia aplicada', 'code': 'BIO'})
    api.patch(path, {'version': component['version'], 'name': 'Alteração concorrente'}, 409)
    replacement = api.post('/curriculum-components', {'name': 'Oficina'})
    api.patch(path, {'version': changed['version'], 'name': 'oficina'}, 409)
    assert api.post('/curriculum-components/' + replacement['id'] + '/remove', {
        'version': replacement['version'], 'reason': 'Sem utilização'}, 200)['action'] == 'removed'
    diary = api.post('/diaries', {'class_group_id': catalog['group']['id'], 'component_id': component['id']})
    lesson_path = '/diaries/' + diary['id'] + '/lessons'
    data = {'lesson_date': '2026-09-25', 'content': 'Experimento em sala'}
    lesson = api.post(lesson_path, data)
    enrollment = api.enroll(api.student(), catalog['group'])
    with SessionLocal() as db:
        db.get(m.Enrollment, enrollment['id']).status = 'active'
        db.commit()
    url = lesson_path + '/' + lesson['id'] + '/attendance'
    assert api.get(url)['roster'][0]['attendance'] is None
    mark = {'enrollment_id': enrollment['id'], 'status': 'absent', 'expected_empty': True}
    api.call('PUT', url, {'items': [mark]})
    api.call('PUT', url, {'items': [{**mark, 'status': 'present'}]}, 409)
    assert api.get(url)['roster'][0]['attendance']['status'] == 'absent'
    api.patch(lesson_path + '/' + lesson['id'], {**data, 'lesson_date': '2026-09-26', 'version': lesson['version']}, 409)
    api.patch(lesson_path + '/' + lesson['id'], {**data, 'lesson_date': '2027-01-01', 'version': lesson['version']}, 422)
    result = api.post(path + '/remove', {'version': changed['version'], 'reason': 'Encerramento do componente'}, 200)
    assert result['action'] == 'retired' and result['references']
    assert api.get('/diaries/' + diary['id'])['component_name'] == 'Biologia aplicada'


def test_teacher_reads_composition_and_writes_only_assigned_plan(api, client, admin, school):
    catalog = api.catalogs()
    teacher = create_user(client, admin, name='Professor', email='docente-composicao@example.com',
                          role='teacher', school_id=school['id'], person_id=api.post('/persons', {'name': 'Docente'})['id'])
    headers = login(client, teacher['email'], 'Profile-Test-Password-2026!')
    assignment = api.post('/teacher-assignments', {'teacher_user_id': teacher['id'], 'class_group_id': catalog['group']['id'], 'subject_name': 'História'})
    first, other = (api.post('/curriculum-components', {'name': name}) for name in ('História', 'Geografia'))
    prefix = '/api/v1/teacher/schools/' + school['id']
    owned = {'class_group_id': catalog['group']['id'], 'component_id': first['id'], 'teacher_assignment_id': assignment['id']}
    diary = api.post('/diaries', owned)
    assert client.get(prefix + '/diary-entry-fields', headers=headers).status_code == 200
    assert client.put(prefix + '/diary-entry-fields', headers=headers, json={'version': 0, 'fields': []}).status_code == 403
    result = client.post(prefix + '/curriculum-plans', headers=headers, json=owned)
    assert result.status_code == 201, result.text
    assert client.post(prefix + '/curriculum-plans', headers=headers, json={**owned, 'component_id': other['id']}).status_code == 403
    with SessionLocal() as db:
        db.get(m.SchoolDiary, diary['id']).status = 'submitted'
        db.commit()
    assert client.patch(prefix + '/curriculum-plans/' + result.json()['id'], headers=headers,
                        json={**owned, 'version': result.json()['version']}).status_code == 409
