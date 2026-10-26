import io
from pypdf import PdfReader

from app.contract_fields import render_text
from test_online import online


def test_empty_fields_remove_labels_and_blocks_without_inventing_values():
    text = ('CONTRATADO: Escola de teste. CONTRATANTE I: {{contratante1.nome}}\n'
            'Nome: {{contratante1.nome}} · CPF: {{contratante1.cpf}} · E-mail: {{contratante1.email}}\n'
            'CONTRATANTE II\nNome: {{contratante2.nome}}\nCPF: {{contratante2.cpf}}\n'
            'Anuidade: R$ {{financeiro.anuidade}}.\n'
            'TESTEMUNHAS\nNome I: {{testemunha1.nome}} · CPF: {{testemunha1.cpf}}\n'
            '{{assinatura.cidade}} - {{assinatura.uf}}, {{assinatura.data}}.')
    values = {'contratante1.nome': 'Pessoa sintética', 'contratante1.email': 'pessoa@example.com'}
    result = render_text(text, values)
    assert 'Pessoa sintética' in result and 'pessoa@example.com' in result
    for absent in ('{{', '}}', 'CPF:', 'CONTRATANTE II', 'TESTEMUNHAS', 'Anuidade:', 'R$'):
        assert absent not in result
    assert 'Escola de teste' in result


def test_parameters_control_requirements_and_pdf_guard_on_frozen_revision(api):
    catalog = api.catalogs(); student = api.student('Aluno variável opcional')
    enrollment = api.enroll(student, catalog['group'])
    template = api.post('/document-templates', {'name': 'Modelo parametrizado', 'kind': 'declaration',
        'body': 'Aluno: {{aluno.nome}}\nCPF testemunha: {{testemunha1.cpf}}\nData: {{assinatura.data}}',
        'field_options': {'assinatura.data': {'required': True, 'input_type': 'date'}}})
    endpoint = '/document-templates/' + template['id']
    preview = api.post(endpoint + '/preview', {'enrollment_id': enrollment['id']}, 200)
    assert preview['missing_fields'] == ['assinatura.data']
    assert 'testemunha1.cpf' in preview['omitted_fields']
    assert '{{' not in preview['content'] and 'CPF testemunha:' not in preview['content']
    api.post(endpoint + '/preview.pdf', {'enrollment_id': enrollment['id']}, 422)
    api.post(endpoint + '/issue', {'enrollment_id': enrollment['id']}, 422)
    api.post(endpoint + '/preview', {'enrollment_id': enrollment['id'], 'values': {'assinatura.data': '31022027'}}, 422)
    request = {'enrollment_id': enrollment['id'], 'values': {'assinatura.data': '2027-02-10'}}
    result = api.post(endpoint + '/preview', request, 200)
    assert result['variables']['assinatura.data'] == '10/02/2027'
    assert result['field_meta']['assinatura.data']['input_value'] == '2027-02-10'
    pdf = api.client.post(api.base + endpoint + '/preview.pdf', headers=api.headers, json=request)
    assert pdf.status_code == 200, pdf.text
    text = '\n'.join(page.extract_text() for page in PdfReader(io.BytesIO(pdf.content)).pages)
    assert '{{' not in text and '}}' not in text and 'testemunha' not in text
    changed = api.patch(endpoint, {'version': template['version'], 'field_options': {'assinatura.data': {'required': False}}})
    assert changed['version'] == template['version'] + 1
    api.post(endpoint + '/preview.pdf', {'enrollment_id': enrollment['id'], 'template_version': 1}, 422)
    current = api.client.post(api.base + endpoint + '/preview.pdf', headers=api.headers, json={'enrollment_id': enrollment['id']})
    assert current.status_code == 200


def test_unmarked_fields_are_optional_and_drafts_are_scoped_versioned(api):
    catalog = api.catalogs(); student = api.student('Aluno do rascunho')
    enrollment = api.enroll(student, catalog['group'])
    template = api.post('/document-templates', {'name': 'Sem obrigatoriedade implícita', 'kind': 'declaration',
        'body': 'Nome: {{aluno.nome}}\nValor: R$ {{financeiro.valor_parcela}}'})
    path = '/document-templates/' + template['id']
    assert api.post(path + '/preview', {'enrollment_id': enrollment['id']}, 200)['missing_fields'] == []
    issued = api.post(path + '/issue', {'enrollment_id': enrollment['id']})
    data = api.client.get(api.base + '/files/' + issued['file_id'] + '/download', headers=api.headers).content
    assert 'Valor:' not in ''.join(p.extract_text() for p in PdfReader(io.BytesIO(data)).pages)
    first = api.call('PUT', path + '/preparation', {'enrollment_id': enrollment['id'], 'values': {'financeiro.valor_parcela': '920,00'}, 'version': 0}, expect=200)
    saved = api.get(path + '/preparation?enrollment_id=' + enrollment['id'])
    assert saved['values'] == first['values'] and saved['version'] == first['version']
    api.call('PUT', path + '/preparation', {'enrollment_id': enrollment['id'], 'values': {}, 'version': 0}, expect=409)
    api.call('PUT', path + '/preparation', {'enrollment_id': enrollment['id'], 'values': {'fora.modelo': 'teste'}, 'version': first['version']}, expect=422)
    other = api.client.post('/api/v1/schools', headers=api.headers, json={'company_id': api.school['company_id'], 'name': 'Outra escola de rascunho'}).json()
    assert api.client.get('/api/v1/schools/' + other['id'] + path + '/preparation?enrollment_id=' + enrollment['id'], headers=api.headers).status_code == 404


def test_admission_snapshot_only_fills_registry_gaps_and_readiness_explains_next_action(online):
    from test_online import draft, submit, approve
    from app import models as m
    from app.db import SessionLocal
    from app.online_models import Admission
    o = online; api = o['api']; admission = approve(o, submit(o, draft(o)))
    template = api.post('/document-templates', {'name': 'Contrato com dados da inscrição', 'kind': 'educational_contract', 'require_signature': True,
        'body': 'Contratante: {{contratante1.nome}}\nNascimento: {{contratante1.nascimento}}\nCEP: {{contratante1.cep}} · Cidade: {{contratante1.cidade}}'})
    admission = api.post('/admissions/' + admission['id'] + '/contract-revision', {'version': admission['version'], 'template_id': template['id'], 'template_version': 1, 'reason': 'Conferência do preenchimento cadastral.'}, 200)
    with SessionLocal() as db:
        row = db.get(Admission, admission['id'])
        row.guardian_snapshot = {**row.guardian_snapshot, 'birth_date': '1980-04-12', 'postal_code': '40000-001', 'city': 'Município informado'}
        enrollment = db.get(m.Enrollment, admission['enrollment_id'])
        guardian = db.get(m.Person, enrollment.financial_person_id)
        guardian.birth_date = None; guardian.postal_code = ''; guardian.city = ''
        db.commit(); guardian_id = guardian.id
    data = {'enrollment_id': admission['enrollment_id']}
    preview = api.post('/document-templates/' + template['id'] + '/preview', data, 200)
    assert preview['variables']['contratante1.cep'] == '40000-001'
    assert preview['variables']['contratante1.nascimento'] == '12/04/1980'
    assert preview['field_meta']['contratante1.cidade']['source'] == 'inscrição conferida'
    with SessionLocal() as db:
        db.get(m.Person, guardian_id).city = 'Município cadastrado'; db.commit()
    assert api.post('/document-templates/' + template['id'] + '/preview', data, 200)['variables']['contratante1.cidade'] == 'Município cadastrado'
    with SessionLocal() as db:
        db.get(m.Person, guardian_id).city = ''
        row = db.get(Admission, admission['id'])
        row.guardian_snapshot = {**row.guardian_snapshot, 'name': 'Outra pessoa confirmada'}
        db.commit()
    assert not api.post('/document-templates/' + template['id'] + '/preview', data, 200)['variables']['contratante1.cidade']
    readiness = api.get('/admissions/' + admission['id'] + '/readiness')
    assert not readiness['ready']
    contract = next(item for item in readiness['checks'] if item['code'] == 'contract')
    assert not contract['ready'] and 'Emita o contrato' in contract['message']
    assert next(item for item in readiness['checks'] if item['code'] == 'authority')['ready']
