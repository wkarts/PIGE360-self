"""Modelos por período, preenchimento íntegro e emissão idempotente."""
import io
import zipfile

from PIL import Image
from pypdf import PdfReader


def _docx(text):
    document = ('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
                '<w:body><w:p><w:r><w:t>' + text + '</w:t></w:r></w:p></w:body></w:document>')
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, 'w') as archive:
        archive.writestr('word/document.xml', document)
    return stream.getvalue()


def test_docx_import_is_editable_and_does_not_save_private_document(api):
    response = api.client.post(api.base + '/document-templates/import-docx', headers=api.headers,
                               files={'file': ('Contrato.docx', _docx('Contrato de teste XXXXXX'),
                                               'application/vnd.openxmlformats-officedocument.wordprocessingml.document')})
    assert response.status_code == 200, response.text
    assert response.json()['body'] == 'Contrato de teste XXXXXX'
    assert response.json()['warnings']
    assert api.get('/document-templates')['items'] == []
    bad = api.client.post(api.base + '/document-templates/import-docx', headers=api.headers,
                          files={'file': ('quebrado.docx', b'not-a-zip')})
    assert bad.status_code == 422


def test_template_period_prefill_snapshot_idempotence_and_letterhead(api):
    catalog = api.catalogs(year='2027')
    student = api.student('Aluno do Contrato')
    guardian = api.guardian(student, 'Responsável da Matrícula')
    enrollment = api.enroll(student, catalog['group'])
    body = ('CONTRATO ESCOLAR {{matricula.ano_letivo}}\n'
            'Aluno {{aluno.nome}}, responsável {{contratante1.nome}}.\n'
            'Escola {{escola.nome}}, mensalidade {{financeiro.valor_parcela}}.\n'
            'Data {{assinatura.data_extenso}}.')
    template = api.post('/document-templates', {
        'name': 'Contrato escolar', 'kind': 'declaration', 'body': body,
        'academic_year_id': catalog['year']['id'], 'header': 'ESCOLA {{escola.nome}}',
        'footer': 'Documento por matrícula {{matricula.numero}}',
    })
    assert len(api.get('/document-templates?enrollment_id=' + enrollment['id'])['items']) == 1
    assert api.get('/document-templates/fields')['fields']
    fields = {'financeiro.valor_parcela': 'R$ 840,00', 'assinatura.data_extenso': '10 de janeiro de 2027'}
    preview = api.call('POST', f"/document-templates/{template['id']}/preview",
                       {'enrollment_id': enrollment['id'], 'values': fields}, expect=200)
    assert preview['missing_fields'] == []
    assert 'Responsável da Matrícula' in preview['content']
    assert 'R$ 840,00' in preview['content']
    assert api.get('/students/' + student['id'] + '/documents')['issued'] == []
    api.call('POST', f"/document-templates/{template['id']}/preview", {
        'enrollment_id': enrollment['id'], 'values': {**fields, 'aluno.nome': 'Nome substituído'},
    }, expect=409)
    api.post(f"/document-templates/{template['id']}/issue", {'enrollment_id': enrollment['id']}, 422)
    png = io.BytesIO()
    Image.new('RGB', (595, 842), 'white').save(png, 'PNG')
    sent = api.client.post(api.base+f"/document-templates/{template['id']}/letterhead", headers=api.headers,
                           files={'file': ('timbrado.png', png.getvalue(), 'image/png')})
    assert sent.status_code == 200, sent.text
    assert sent.json()['letterhead_file_id']
    proof = api.client.post(api.base+f"/document-templates/{template['id']}/preview.pdf",
                            headers=api.headers, json={'enrollment_id': enrollment['id'], 'values': fields})
    assert proof.status_code == 200 and proof.content.startswith(b'%PDF')
    assert api.get('/students/'+student['id']+'/documents')['issued'] == []
    generated = api.post(f"/document-templates/{template['id']}/issue", {
        'enrollment_id': enrollment['id'], 'values': fields, 'idempotency_key': 'matricula-contrato-teste',
    })
    assert generated['signature_status'] == 'unsigned'
    again = api.post(f"/document-templates/{template['id']}/issue", {
        'enrollment_id': enrollment['id'], 'values': fields, 'idempotency_key': 'matricula-contrato-teste',
    })
    assert again['id'] == generated['id'] and again['replayed'] is True
    same_without_key = api.post(f"/document-templates/{template['id']}/issue", {
        'enrollment_id': enrollment['id'], 'values': fields,
    })
    assert same_without_key['id'] == generated['id']
    assert api.post(f"/document-templates/{template['id']}/issue", {
        'enrollment_id': enrollment['id'], 'values': {**fields, 'financeiro.valor_parcela': 'R$ 900,00'},
        'idempotency_key': 'matricula-contrato-teste',
    }, 409) is not None
    api.post(f"/document-templates/{template['id']}/issue", {
        'enrollment_id': enrollment['id'],
        'values': {**fields, 'financeiro.valor_parcela': 'R$ 900,00'},
    }, 409)
    issued = api.get('/students/' + student['id'] + '/documents')['issued']
    assert len(issued) == 1 and issued[0]['template_name'] == 'Contrato escolar'
    downloaded = api.client.get(api.base+'/files/'+generated['file_id']+'/download', headers=api.headers)
    assert downloaded.status_code == 200
    pdf = PdfReader(io.BytesIO(downloaded.content))
    assert 'R$ 840,00' in pdf.pages[0].extract_text()
    verified = api.get('/issued-documents/'+generated['id']+'/verification')
    assert verified['integrity_valid'] is True and verified['signature_valid'] is False
    changed = api.patch('/document-templates/'+template['id'], {
        'version': sent.json()['version'], 'name': 'Contrato escolar corrigido',
        'kind': 'declaration', 'body': body.replace('mensalidade', 'parcela'),
        'academic_year_id': catalog['year']['id'], 'header': '', 'footer': '',
    })
    assert changed['version'] == sent.json()['version'] + 1
    revisions = api.get('/document-templates/'+template['id']+'/revisions')['items']
    assert [row['version_number'] for row in revisions] == [3, 2, 1]
    frozen = api.get('/document-templates/'+template['id']+'/revisions/2')
    assert frozen['sha256'] == revisions[1]['sha256']
    assert frozen['content']['body'] == body
    next_issue = api.post(f"/document-templates/{template['id']}/issue", {
        'enrollment_id': enrollment['id'], 'template_version': 3, 'values': fields,
    })
    assert next_issue['id'] != generated['id']
    replay_prior = api.post(f"/document-templates/{template['id']}/issue", {
        'enrollment_id': enrollment['id'], 'template_version': 2, 'values': fields,
    })
    assert replay_prior['id'] == generated['id']
    assert api.get('/students/' + student['id'] + '/documents')['issued'][1]['snapshot']['template_revision_sha256'] == frozen['sha256']
    assert api.get('/students/' + student['id'] + '/documents')['issued'][1]['template_name'] == 'Contrato escolar'
    assert guardian['id']


def test_template_scope_and_validity(api, client, admin):
    catalog = api.catalogs(year='2028')
    student = api.student()
    enrollment = api.enroll(student, catalog['group'])
    template = api.post('/document-templates', {
        'name': 'Declaração futura', 'kind': 'declaration',
        'body': 'Documento de {{aluno.nome}} na escola {{escola.nome}}.',
        'academic_year_id': catalog['year']['id'], 'valid_from': '2040-01-01',
    })
    assert api.get('/document-templates?enrollment_id=' + enrollment['id'])['items'] == []
    api.post(f"/document-templates/{template['id']}/issue", {'enrollment_id': enrollment['id']}, 409)
    other = client.post('/api/v1/schools', headers=admin, json={
        'company_id': api.school['company_id'], 'name': 'Outra escola para isolamento',
    }).json()
    assert client.get('/api/v1/schools/'+other['id']+'/document-templates/'+template['id'], headers=admin).status_code == 404


def test_contract_category_requires_a1_even_when_template_is_draft(api):
    for kind in ('contract', 'educational_contract', 'contract_amendment', 'contrato_escolar'):
        api.post('/document-templates', {'name': 'Contrato de teste',
                 'kind': kind, 'body': 'Contrato de exemplo para {{aluno.nome}}.',
                 'active': False, 'require_signature': False}, 422)
    signed = api.post('/document-templates', {'name': 'Contrato para revisão',
                'kind': 'educational_contract', 'body': 'Contrato de exemplo para {{aluno.nome}}.',
                'active': False, 'require_signature': True})
    assert signed['require_signature'] is True
    api.patch('/document-templates/'+signed['id'], {
        'version': signed['version'], 'require_signature': False,
    }, 422)
