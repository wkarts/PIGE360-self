from io import BytesIO

from pypdf import PdfReader

from test_profiles import create_user, login


def sheet_path(draft, enrollment):
    return f"/educacenso/drafts/{draft['id']}/enrollments/{enrollment['id']}/ficha.pdf"


def pdf_text(response):
    assert response.headers['content-type'] == 'application/pdf'
    assert response.headers['cache-control'] == 'no-store'
    assert response.headers['content-disposition'].startswith('attachment; filename="ficha-educacenso-')
    assert response.content.startswith(b'%PDF-')
    reader = PdfReader(BytesIO(response.content))
    assert len(reader.pages) == 1
    return ' '.join(reader.pages[0].extract_text().split())


def test_ficha_por_matricula_preserva_revisao_e_filtro_de_turma(api, client, admin):
    catalog = api.catalogs(capacity=3)
    group = catalog['group']
    other_group = api.post('/class-groups', dict(name='Turma fora do filtro', academic_year_id=catalog['year']['id'],
        unit_id=catalog['unit']['id'], shift_id=catalog['shift']['id'], grade_id=catalog['grade']['id'], capacity=2))
    ana_student = api.post('/students', {'person': {'name': 'Ana de Conferência', 'birth_date': '2015-05-18'},
                                         'inep_code': '123456789012'})
    ana = api.enroll(ana_student, group)
    bruno = api.enroll(api.student('Bruno de Conferência'), group)
    carla = api.enroll(api.student('Carla Fora do Filtro'), other_group)
    selection = dict(year_id=catalog['year']['id'], stage='matricula_inicial', environment='treinamento',
                     reference_date='2026-10-01', class_group_ids=[group['id']])
    draft = api.post('/educacenso/drafts', selection, 200)
    ana_path, bruno_path = sheet_path(draft, ana), sheet_path(draft, bruno)
    for path, own, other, number in [(ana_path, 'Ana de Conferência', 'Bruno de Conferência', ana['number']),
                                     (bruno_path, 'Bruno de Conferência', 'Ana de Conferência', bruno['number'])]:
        text = pdf_text(api.get(path))
        for required in (own, number, api.school['name'], group['name'], 'Matrícula inicial', 'Treinamento',
                         'Ficha individual de conferência', '01/10/2026', 'PRÉVIA', 'conferência interna'):
            assert required in text
        assert other not in text and 'Carla Fora do Filtro' not in text

    api.call('GET', sheet_path(draft, carla), expect=404)
    api.call('GET', ana_path+'?environment=producao', expect=404)
    api.call('GET', ana_path+'?version=0', expect=422)
    api.call('GET', ana_path+'?version=42', expect=404)
    second = client.post('/api/v1/schools', headers=admin,
                         json={'company_id': api.school['company_id'], 'name': 'Unidade de conferência B'}).json()
    assert client.get('/api/v1/schools/'+second['id']+ana_path, headers=admin).status_code == 404
    person = api.post('/persons', {'name': 'Operadora sem acesso'})
    operator = create_user(client, admin, name='Operadora', email=person['id']+'@example.com',
                           role='secretary', school_id=api.school['id'], person_id=person['id'])
    assert client.get(api.base+ana_path, headers=login(client, operator['email'], 'Profile-Test-Password-2026!')).status_code == 403

    edit_path = f"/educacenso/drafts/{draft['id']}/rows/{ana['id']}"
    api.patch(edit_path, {'version': draft['version'], 'reason': 'Identificação conferida pela secretaria.',
                          'student_name': 'Ana Nome Revisado', 'student_inep_code': '987654321098', 'birth_date': '2015-05-28'})
    r2 = pdf_text(api.get(ana_path))
    declared, origins = r2.split('Origem dos campos ajustados')
    assert all(value in declared for value in ('Ana Nome Revisado', '987654321098', '28/05/2015'))
    assert all(value in origins for value in ('Ana de Conferência', '123456789012', '18/05/2015'))
    first = pdf_text(api.get(ana_path+'?version=1'))
    assert 'Ana Nome Revisado' not in first and '987654321098' not in first and '28/05/2015' not in first
    assert 'Ana Nome Revisado' not in pdf_text(api.get(bruno_path))

    api.patch(edit_path, {'version': 2, 'reason': 'Remoção dos valores declaratórios.', 'student_inep_code': '', 'birth_date': None})
    cleared, origins = pdf_text(api.get(ana_path)).split('Origem dos campos ajustados')
    assert cleared.count('Não informado na declaração') == 2
    assert '123456789012' not in cleared and '18/05/2015' not in cleared
    assert '123456789012' in origins and '18/05/2015' in origins


def test_ficha_da_segunda_etapa_mantem_situacao_declaratoria_independente(api):
    catalog = api.catalogs()
    enrollment = api.enroll(api.student('Dora Teste de Situação'), catalog['group'])
    draft = api.post('/educacenso/drafts', dict(year_id=catalog['year']['id'], stage='situacao_aluno',
        environment='producao', reference_date='2026-12-01'), 200)
    api.patch(f"/educacenso/drafts/{draft['id']}/rows/{enrollment['id']}?environment=producao", {
        'version': draft['version'], 'reason': 'Situação conferida nos registros da escola.', 'status': 'Aprovado'})
    path = sheet_path(draft, enrollment)+'?environment=producao'
    current = pdf_text(api.get(path))
    assert all(label in current for label in ('Situação do aluno', 'Produção', 'Rascunho', 'Aprovado'))
    assert 'Aprovado' not in pdf_text(api.get(path+'&version=1'))


def test_ficha_legada_nao_reconstroi_dados_nominais_com_cadastro_atual(api):
    from app.db import SessionLocal
    from app.educacenso import Draft

    catalog = api.catalogs()
    enrollment = api.enroll(api.student('Nome Presente Apenas no Cadastro'), catalog['group'])
    draft = api.post('/educacenso/drafts', dict(year_id=catalog['year']['id'], stage='situacao_aluno',
        environment='treinamento', reference_date='2026-12-01'), 200)
    # Formato efetivamente persistido antes das revisões nominais.
    with SessionLocal.begin() as db:
        original = db.get(Draft, draft['id'])
        original.snapshot = {**original.snapshot, 'rows': [{'enrollment_id': enrollment['id'],
            'class_group_id': catalog['group']['id'], 'local_status': 'draft'}]}
    text = pdf_text(api.get(sheet_path(draft, enrollment)))
    assert 'Não registrado nesta revisão' in text and enrollment['id'] in text
    assert 'Nome Presente Apenas no Cadastro' not in text and catalog['group']['name'] not in text
