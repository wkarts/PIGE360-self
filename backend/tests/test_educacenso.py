def test_training_drafts_are_scoped_idempotent_and_never_export(api):
    catalogs = api.catalogs()
    school_id = api.school['id']
    payload = {'year_id': catalogs['year']['id'], 'stage': 'matricula_inicial',
               'environment': 'treinamento', 'reference_date': '2026-09-23'}
    api.post('/educacenso/preview', payload, 404)
    api.update_school(educacenso_training=True)
    assert api.update_school(name='Escola renomeada')['educacenso_training']
    api.post('/educacenso/preview', dict(payload, environment='producao'), 422)
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
    api.update_school(educacenso_training=False)
    api.call('GET', '/files/' + evidence['file_id'] + '/download', expect=404)


def test_draft_and_opaque_file_require_the_operator_and_original_school(api, client, admin):
    from test_profiles import create_user, login
    other = client.post('/api/v1/schools', headers=admin, json={
        'company_id': api.school['company_id'], 'name':'Outra escola de treinamento'}).json()
    api.update_school(educacenso_training=True)
    from conftest import API
    API(client, admin, other).update_school(educacenso_training=True)
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
        'data':{'company_id':api.school['company_id'], 'name':api.school['name'], 'educacenso_training':False}})
    assert denied.status_code == 403
    for route in (path, download):
        assert client.get(api.base+route, headers=headers).status_code == 403
