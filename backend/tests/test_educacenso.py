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
