"""O resumo pode ser consultado sem permissão para acessar matrículas nominais."""
from conftest import API
from test_user_access_profiles import create, login


def test_dashboard_respects_the_readers_permissions_in_each_school(api, client, admin):
    restricted = api.post('/access-profiles', {
        'name': 'Indicadores da escola', 'base_role': 'viewer', 'permissions': ['read', 'dashboard.read']
    })
    reader = create(api, role='viewer', access_profile_id=restricted['id'])
    student = api.student('Aluno do painel restrito')
    enrollment = api.enroll(student, api.catalogs()['group'])

    response = client.post('/api/v1/schools', headers=admin,
                           json={'company_id': api.school['company_id'], 'name': 'Escola de consulta nominal'})
    assert response.status_code == 201
    other = API(client, admin, response.json())
    other.post('/users', {'name': reader['name'], 'email': reader['email'], 'role': 'viewer'})
    other_student = other.student('Aluno autorizado no painel')
    other_enrollment = other.enroll(other_student, other.catalogs()['group'])

    session = login(api, reader)
    stats = client.get(api.base + '/dashboard', headers=session)
    assert stats.status_code == 200
    assert stats.json() == {**api.get('/dashboard'), 'recent_enrollments': []}
    for value in (student['person']['name'], student['id'], enrollment['number'], enrollment['id']):
        assert value not in stats.text
    assert client.get(api.base + '/enrollments/' + enrollment['id'], headers=session).status_code == 403

    allowed = client.get(other.base + '/dashboard', headers={**session, 'X-School-Id': other.school['id']})
    assert allowed.status_code == 200
    assert allowed.json() == other.get('/dashboard')
    assert [row['id'] for row in allowed.json()['recent_enrollments']] == [other_enrollment['id']]
