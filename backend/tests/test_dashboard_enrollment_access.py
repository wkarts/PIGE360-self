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
    summary = api.get('/dashboard')
    assert {k: v for k, v in stats.json().items() if k != 'operations'} == {
        **{k: v for k, v in summary.items() if k != 'operations'}, 'recent_enrollments': []}
    assert not stats.json()['operations']['activity'] and not stats.json()['operations']['counts']
    assert summary['operations']['activity'][0]['detail'] == enrollment['number']
    for value in (student['person']['name'], student['id'], enrollment['number'], enrollment['id']):
        assert value not in stats.text
    assert client.get(api.base + '/enrollments/' + enrollment['id'], headers=session).status_code == 403

    allowed = client.get(other.base + '/dashboard', headers={**session, 'X-School-Id': other.school['id']})
    assert allowed.status_code == 200
    assert allowed.json()['operations']['activity'] == other.get('/dashboard')['operations']['activity']
    assert allowed.json()['operations']['counts'] == {}
    assert not any(e['id'] == enrollment['id'] for e in allowed.json()['operations']['activity'])
    assert [row['id'] for row in allowed.json()['recent_enrollments']] == [other_enrollment['id']]

def test_overview_distinguishes_period_week_and_deadline_and_publication_scope(api):
    from datetime import datetime, time, timedelta
    from app.dashboard import SCHOOL_ZONE
    from app.db import now, SessionLocal
    from app import models as m
    from test_school_community import post

    instant = now()
    day = instant.astimezone(SCHOOL_ZONE).date()
    def deadline(title, date):
        return api.post('/protocols', {'kind':title, 'due_on':date.isoformat()})
    opening = deadline('Analisar declaração escolar', day)
    later = deadline('Prazo após a semana', day + timedelta(days=7))
    late = deadline('Solicitação atrasada', day - timedelta(days=1))
    with SessionLocal.begin() as db:
        db.get(m.Protocol, late['id']).created_at = instant - timedelta(days=12)
    event = post(api, title='Reunião geral de famílias', kind='event',
                 event_start=datetime.combine(day + timedelta(days=6), time(22,30), SCHOOL_ZONE).isoformat())
    draft = post(api, title='Rascunho da direção', status='draft')
    old = post(api, title='Recado do mês', publish_at=(instant-timedelta(days=20)).isoformat())
    report = api.get('/dashboard')
    ops = report['operations']
    assert opening['id'] in {e['id'] for e in ops['agenda']}
    agenda_event = next(e for e in ops['agenda'] if e['id'] == event['id'])
    assert (agenda_event['day'], agenda_event['hour']) == ((day+timedelta(days=6)).isoformat(),'22:30')
    assert not any(e['id'] in (later['id'], late['id']) for e in ops['agenda'])
    assert report['overdue_protocols'] == 1
    assert not any(e['id'] in (old['id'], draft['id'],late['id']) for e in ops['activity'])
    month = api.get('/dashboard?days=30')['operations']
    assert month['agenda'] == ops['agenda'] and month['counts'] == ops['counts']
    assert old['id'] in {e['id'] for e in month['activity']} and late['id'] in {e['id'] for e in month['activity']}
    assert draft['id'] not in {e['id'] for e in month['activity']}
    api.call('GET','/dashboard?days=366',expect=422)
