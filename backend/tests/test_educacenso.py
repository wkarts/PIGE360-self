def test_training_drafts_are_scoped_idempotent_and_never_export(api):
    catalogs = api.catalogs()
    school_id = api.school['id']
    payload = {'year_id': catalogs['year']['id'], 'stage': 'matricula_inicial',
               'environment': 'treinamento', 'reference_date': '2026-09-23'}
    assert not api.post('/educacenso/preview', payload, 200)['official_export_enabled']
    official = api.post('/educacenso/drafts', dict(payload, environment='producao'), 200)
    assert not official['snapshot']['official_export_enabled']
    by_env = api.get('/educacenso/drafts?environment=producao')
    assert [row['id'] for row in by_env] == [official['id']]
    official_path = '/educacenso/drafts/' + official['id']
    api.call('GET', official_path, expect=404)
    assert api.get(official_path + '?environment=producao')['environment'] == 'producao'
    api.call('POST', official_path + '/evidence', files={'file':('teste.txt', b'retorno')}, expect=404)
    api.post('/educacenso/preview', dict(payload, class_group_ids=[]), 422)
    api.post('/educacenso/preview', dict(payload, class_group_ids=['outra-escola']), 422)
    api.post('/educacenso/preview', dict(payload, reference_date='2025-12-31'), 422)
    group = api.post('/class-groups', dict(name='Outra turma', academic_year_id=catalogs['year']['id'],
        unit_id=catalogs['unit']['id'], shift_id=catalogs['shift']['id'], grade_id=catalogs['grade']['id'], capacity=2))
    e = api.enroll(api.student(), catalogs['group'])
    historical = api.post('/educacenso/preview', dict(payload, reference_date='2026-09-20'), 200)
    assert historical['rows'] == []
    partial = api.post('/educacenso/preview', dict(payload, class_group_ids=[group['id']]), 200)
    assert 'selecao_parcial' in partial['blocks'] and not partial['official_export_enabled']
    draft = api.post('/educacenso/drafts', payload, 200)
    assert draft['snapshot']['rows'][0]['enrollment_id'] == e['id']
    assert api.post('/educacenso/drafts', payload, 200)['id'] == draft['id']
    path = '/educacenso/drafts/' + draft['id']
    files = {'file': ('retorno.txt', b'artefato sintetico sem formato homologado')}
    evidence = api.call('POST', path + '/evidence', files=files)
    assert not evidence['interpreted']
    assert api.call('POST', path + '/evidence', files=files)['id'] == evidence['id']
    result = api.get(path)
    assert result['status'] == 'rascunho' and len(result['evidence']) == 1
    assert api.get('/files/' + evidence['file_id'] + '/download').content == files['file'][1]
    assert len(api.get('/educacenso/drafts')) == 1
    assert draft['id'] != official['id']


def test_draft_and_opaque_file_require_the_operator_and_original_school(api, client, admin):
    from test_profiles import create_user, login
    other = client.post('/api/v1/schools', headers=admin, json={
        'company_id': api.school['company_id'], 'name':'Outra escola de treinamento'}).json()
    catalog = api.catalogs()
    draft = api.post('/educacenso/drafts', {'year_id':catalog['year']['id'], 'stage':'situacao_aluno',
        'reference_date':'2026-12-01', 'environment':'treinamento'}, 200)
    path = '/educacenso/drafts/' + draft['id']
    attachment = api.call('POST', path+'/evidence', files={'file':('erro.txt',b'conteudo privado')})
    download = '/files/' + attachment['file_id'] + '/download'
    for route in (path, download):
        assert client.get('/api/v1/schools/'+other['id']+route, headers=admin).status_code == 404
    person = api.post('/persons', {'name':'Secretaria de teste'})
    operator = create_user(client, admin, name='Secretaria', email=person['id']+'@example.com',
                           role='secretary', school_id=api.school['id'], person_id=person['id'])
    headers = login(client, operator['email'], 'Profile-Test-Password-2026!')
    denied = client.patch(api.base, headers=headers, json={'version':api.school['version'],
        'data':{'company_id':api.school['company_id'], 'name':api.school['name'], 'diary_catalog':True}})
    assert denied.status_code == 403
    for route in (path, download):
        assert client.get(api.base+route, headers=headers).status_code == 403
    selection = selection_for(catalog, stage='situacao_aluno')
    assert client.post(api.base+'/educacenso/enrollments/search', headers=headers, json=selection).status_code == 403
    reason = {'version': draft['version'], 'reason': 'Conferência do escopo da escola.'}
    for method, route, payload in [
        ('PATCH', path+'/rows/matricula', dict(reason, status='Aprovado')),
        ('DELETE', path+'/rows/matricula', reason), ('POST', path+'/archive', reason),
    ]:
        assert client.request(method, api.base+route, headers=headers, json=payload).status_code == 403
        assert client.request(method, '/api/v1/schools/'+other['id']+route, headers=admin, json=payload).status_code == 404
    assert api.get(path)['version'] == 1


def test_retorno_documentado_e_diagnostico_exato(api):
    import hashlib
    catalog = api.catalogs(year='2025')
    draft = api.post('/educacenso/drafts', {'year_id':catalog['year']['id'], 'stage':'situacao_aluno',
        'reference_date':'2025-10-01', 'environment':'producao'}, 200)
    snap = draft['snapshot']
    assert snap['replacement_rule'] == 'substitui_declaracao_da_escola'
    path = '/educacenso/drafts/'+draft['id']
    file = api.client.get(api.base+path+'/diagnostico.json?environment=producao', headers=api.headers)
    assert file.status_code == 200 and hashlib.sha256(file.content).hexdigest() == draft['digest']
    assert not file.json()['official_export_enabled']
    url = api.base+path+'/evidence?environment=producao'
    files = {'file':('retorno.txt', b'caso ficticio de retorno parcial')}
    for label, code in [('Aceito definitivamente', 422), ('Importado parcialmente', 200), ('Importado', 409)]:
        result = api.client.post(url, headers=api.headers, files=files, data={'reported_status':label})
        assert result.status_code == code
    result = api.get(path+'?environment=producao')
    assert result['status'] == 'rascunho'
    assert result['evidence'][0]['reported_status'] == 'Importado parcialmente'


def selection_for(catalog, **options):
    return {'year_id': catalog['year']['id'], 'reference_date': '2026-10-04',
            'stage': 'matricula_inicial', 'environment': 'treinamento', **options}


def test_busca_por_identidade_reconstroi_turma_e_situacao_no_dia_civil_da_escola(api):
    from datetime import UTC, datetime
    from sqlalchemy import select
    from app import models as m
    from app.db import SessionLocal

    c = api.catalogs(capacity=4)
    ana = api.student('Júlia Maçã')
    enrollment = api.enroll(ana, c['group'])
    outra = api.enroll(api.student('Júlia Pereira'), c['group'])
    def group(name):
        return api.post('/class-groups', dict(name=name, academic_year_id=c['year']['id'],
            unit_id=c['unit']['id'], shift_id=c['shift']['id'], grade_id=c['grade']['id'], capacity=4))
    b, d = group('Turma B'), group('Turma D')
    with SessionLocal() as db:
        entry = db.get(m.Enrollment, enrollment['id'])
        actor = db.scalar(select(m.User.id).where(m.User.role == 'admin'))
        for hour, before, after in [
            (1, ('draft', c['group']['id']), ('active', b['id'])),
            (4, ('active', b['id']), ('suspended', d['id'])),
        ]:
            when = datetime(2026, 10, 5, hour, tzinfo=UTC)
            db.add(m.EnrollmentEvent(school_id=api.school['id'], enrollment_id=entry.id,
                actor_id=actor, reason='Movimento sintético', action='change_group', created_at=when,
                before=dict(status=before[0], class_group_id=before[1]),
                after=dict(status=after[0], class_group_id=after[1])))
        entry.status, entry.class_group_id = 'suspended', d['id']
        db.commit()
    search = '/educacenso/enrollments/search'
    payload = selection_for(c)
    def lookup(**changes):
        return api.post(search, {**payload, **changes}, 200)
    results = lookup(q='julia', limit=1)
    assert results['total'] == 2
    assert 'birth_date' not in results['items'][0] and 'student_inep_code' not in results['items'][0]
    assert 'birth_date' not in results['items'][0]['declaration']
    pages = [lookup(q='julia', offset=n, limit=1)['items'][0] for n in (0, 1)]
    assert {row['enrollment_id'] for row in pages} == {enrollment['id'], outra['id']}
    assert lookup(q='%%')['total'] == 0
    assert lookup(q='maca')['items'][0]['enrollment_id'] == enrollment['id']
    assert lookup(q=enrollment['number'])['items'][0]['student_number'] == ana['number']
    assert lookup(q=ana['number'])['items'][0]['student_name'] == 'Júlia Maçã'
    for day, target, status in [('2026-10-03', c['group'], 'draft'), ('2026-10-04', b, 'active'), ('2026-10-05', d, 'suspended')]:
        row = lookup(reference_date=day, class_group_ids=[target['id']], q='maca')['items'][0]
        assert (row['class_name'], row['local_status']) == (target['name'], status)
        assert row['grade_name'] == c['grade']['name'] and row['shift_name'] == c['shift']['name']
    assert lookup(reference_date='2026-09-20', q='maca')['total'] == 0
    selected = dict(payload, class_group_ids=[b['id']], enrollment_ids=[enrollment['id']])
    assert api.post('/educacenso/preview', selected, 200)['rows'][0]['declaration']['student_name'] == 'Júlia Maçã'
    for invalid in ([], [enrollment['id'], enrollment['id']], [outra['id']], ['inexistente']):
        api.post('/educacenso/preview', dict(selected, enrollment_ids=invalid), 422)
    api.post(search, dict(payload, class_group_ids=['outra-escola']), 422)
    api.post(search, dict(payload, limit=101), 422)


def test_revisoes_declaratorias_preservam_snapshot_e_evidencia_no_arquivo(api):
    import hashlib
    from sqlalchemy import select
    from app import models as m
    from app.db import SessionLocal

    c = api.catalogs()
    student = api.student('Larissa Teste')
    enrollment = api.enroll(student, c['group'])
    payload = selection_for(c, enrollment_ids=[enrollment['id']])
    draft = api.post('/educacenso/drafts', payload, 200)
    eid = enrollment['id']
    path = '/educacenso/drafts/' + draft['id']
    row_path = path + '/rows/' + eid
    file = api.call('POST', path+'/evidence', files={'file': ('evidencia.txt', b'arquivo de teste')})
    original = api.client.get(api.base+path+'/diagnostico.json?version=1', headers=api.headers)
    assert original.status_code == 200 and hashlib.sha256(original.content).hexdigest() == draft['digest']
    reason = {'version': 1, 'reason': 'Retificação conferida com a secretaria.'}
    api.patch(row_path, dict(reason, student_name='   '), 422)
    api.patch(row_path, dict(reason, status='Aprovado'), 422)
    api.patch(row_path, dict(reason, student_name='Corrigido', reason='  '), 422)
    api.patch(row_path+'?environment=producao', dict(reason, student_name='Corrigido'), 404)
    api.patch(path+'/rows/outro', dict(reason, student_name='Corrigido'), 404)
    api.patch(row_path, dict(reason, birth_date='2027-02-05'), 422)
    api.patch(row_path, dict(reason, student_name='Larissa Teste'), 422)
    api.patch(row_path, dict(reason, student_inep_code='0'*33), 422)
    second = api.patch(row_path, dict(reason, student_name='Larissa Conferida', student_inep_code='COD-LOCAL-9', birth_date=None))
    assert second['version'] == 2 and second['digest'] != draft['digest']
    row = second['snapshot']['rows'][0]
    assert row['student_name'] == 'Larissa Teste'
    assert row['birth_date'] == '2018-05-15' and row['declaration']['birth_date'] is None
    assert row['student_inep_code'] == '' and row['declaration']['student_inep_code'] == 'COD-LOCAL-9'
    assert row['declaration']['student_name'] == 'Larissa Conferida'
    assert api.get('/students/'+student['id'])['person']['name'] == 'Larissa Teste'
    api.call('DELETE', row_path, reason, expect=409)
    third = api.call('DELETE', row_path, dict(reason, version=2))
    assert third['version'] == 3 and not third['snapshot']['rows']
    assert {'selecao_parcial','selecao_sem_matriculas'} <= set(third['snapshot']['blocks'])
    assert not third['snapshot']['official_export_enabled']
    assert api.get('/enrollments/'+eid)['id'] == eid
    api.post(path+'/archive', reason, 409)
    archived = api.post(path+'/archive', dict(reason, version=3), 200)
    assert archived['version'] == 4 and archived['status'] == 'arquivado'
    assert api.get('/educacenso/drafts') == []
    assert api.get('/educacenso/drafts?archived=true')[0]['id'] == draft['id']
    assert api.get(path)['evidence'][0]['id'] == file['id']
    assert api.get('/files/'+file['file_id']+'/download').content == b'arquivo de teste'
    api.call('POST', path+'/evidence', files={'file': ('novo.txt', b'nao alterar')}, expect=409)
    api.patch(row_path, dict(reason, version=4, student_name='Outro'), 409)
    assert [r['version'] for r in api.get(path+'/revisions')['items']] == [1,2,3,4]
    assert api.client.get(api.base+path+'/diagnostico.json?version=1',headers=api.headers).content == original.content
    assert api.get(path+'/diagnostico.json?version=2')['rows'][0]['declaration']['student_name'] == 'Larissa Conferida'
    api.call('GET', path+'/diagnostico.json?version=5', expect=404)
    next_draft = api.post('/educacenso/drafts', payload, 200)
    assert next_draft['id'] != draft['id'] and next_draft['snapshot']['based_on_draft_id'] == draft['id']
    assert api.post('/educacenso/drafts', payload, 200)['id'] == next_draft['id']
    assert next_draft['snapshot']['rows'][0]['declaration']['student_name'] == 'Larissa Teste'
    situation = api.post('/educacenso/drafts', dict(payload, stage='situacao_aluno'), 200)
    target = '/educacenso/drafts/'+situation['id']+'/rows/'+eid
    api.patch(target, dict(reason, student_name='Outro nome'), 422)
    api.patch(target, dict(reason, status='active'), 422)
    outcome = api.patch(target, dict(reason, status='Aprovada'))
    assert outcome['snapshot']['rows'][0]['declaration']['status'] == 'Aprovada'
    assert api.get('/enrollments/'+eid)['status'] == enrollment['status']
    with SessionLocal() as db:
        events = db.scalars(select(m.AuditEvent).where(m.AuditEvent.entity_id == draft['id'])).all()
        assert {r.action for r in events} >= {'educacenso.draft.row_changed','educacenso.draft.row_removed','educacenso.draft.archived'}


def test_legado_exibe_identificacao_atual_sem_reescrever_o_diagnostico_assinado(api):
    import hashlib
    from sqlalchemy import select
    from app import models as m
    from app.db import SessionLocal
    from app.educacenso import Draft, canonical
    from datetime import date

    c=api.catalogs()
    enrollment=api.enroll(api.student('Joana de Teste'), c['group'])
    old={'stage':'matricula_inicial','official_export_enabled':False,'blocks':['leiaute_e_dominios_sem_homologacao'],
         'rows':[dict(enrollment_id=enrollment['id'],class_group_id=c['group']['id'],local_status='draft')]}
    raw=canonical(old)
    with SessionLocal() as db:
        draft=Draft(school_id=api.school['id'],year_id=c['year']['id'],stage='matricula_inicial',environment='treinamento',
                    reference_date=date(2026,10,1),snapshot=old,digest=hashlib.sha256(raw).hexdigest(),
                    author_id=db.scalar(select(m.User.id).where(m.User.role=='admin')))
        db.add(draft);db.commit();path='/educacenso/drafts/'+draft.id
    assert 'student_name' not in api.get(path)['snapshot']['rows'][0]
    assert api.get(path)['rows_display'][0]['student_name']=='Joana de Teste'
    assert api.client.get(api.base+path+'/diagnostico.json',headers=api.headers).content == raw


def test_duas_gravacoes_com_a_mesma_versao_salvam_uma_unica_revisao(api):
    from concurrent.futures import ThreadPoolExecutor
    from threading import Barrier

    c = api.catalogs()
    enrollment = api.enroll(api.student('Aluno de concorrência'), c['group'])
    creation = Barrier(2)
    def create(_):
        creation.wait(timeout=10)
        return api.post('/educacenso/drafts', selection_for(c), 200)
    with ThreadPoolExecutor(max_workers=2) as pool:
        first, second = pool.map(create, (0,1))
    assert first['id'] == second['id']
    draft = first
    path = '/educacenso/drafts/'+draft['id']
    row = api.base+path+'/rows/'+enrollment['id']
    gate = Barrier(2)
    def adjust(name):
        gate.wait(timeout=10)
        return api.client.patch(row, headers=api.headers,
            json={'version': 1, 'reason': 'Revisão do nome declaratório.', 'student_name': name}).status_code
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(adjust, ['Aluno Revisão A', 'Aluno Revisão B'])) == [200, 409]
    assert api.get(path)['version'] == 2
    assert [r['version'] for r in api.get(path+'/revisions')['items']] == [1, 2]
