"""Contrato da campanha congela revisão e impede efetivação sem assinatura."""
import uuid
import re
from cryptography.hazmat.primitives import serialization
from test_online import online, draft, submit, approve, pc, CSRF, CPF
from test_contract_signatures import certificate, blank_pdf


def test_campaign_contract_revision_and_activation_gate(online, tmp_path, monkeypatch):
    o=online
    api=o['api']
    template=api.post('/document-templates',{
        'name':'Contrato de prestação educacional',
        'kind':'educational_contract',
        'academic_year_id':o['cat']['year']['id'],
        'body':'Contrato escolar para {{aluno.nome}} e {{contratante1.nome}} no período {{matricula.ano_letivo}}.',
        'require_signature':True,
    })
    campaign=o['campaign']
    data={key:campaign[key] for key in ('slug','title','instructions','privacy_notice','terms_version',
          'class_group_ids','opens_on','closes_on','active','require_verified_contact',
          'require_documents','require_payment_before_enrollment')}
    campaign=api.patch('/admission-campaigns/'+campaign['id'],{
        **data,'version':campaign['version'],'contract_template_id':template['id']})
    a=approve(o,submit(o,draft(o)))
    assert a['contract']['required'] is True
    assert a['contract_template_id']==template['id']
    assert a['contract_template_version']==template['version']
    assert a['contract_template_revision_sha256']==api.get(
        '/document-templates/'+template['id']+'/revisions')['items'][0]['sha256']

    # A edição posterior do modelo não altera o documento vinculado à matrícula.
    edited=api.patch('/document-templates/'+template['id'],{
        'version':template['version'],'name':template['name'],'kind':template['kind'],
        'academic_year_id':template['academic_year_id'], 'require_signature':True,
        'body':'Nova redação para {{aluno.nome}} e {{contratante1.nome}}.'})
    assert edited['version']>a['contract_template_version']
    old=api.get('/document-templates/'+template['id']+'/revisions/'+str(a['contract_template_version']))
    assert 'Contrato escolar para' in old['content']['body']
    assert old['sha256']==a['contract_template_revision_sha256']
    # Sem certificado A1 configurado a emissão falha fechada e não cria PDF inseguro.
    api.post('/document-templates/'+template['id']+'/issue',{
        'enrollment_id':a['enrollment_id'],'template_version':a['contract_template_version']},409)
    assert api.get('/students/'+a['student_id']+'/documents')['issued']==[]
    assert api.post('/admissions/'+a['id']+'/finalize',{'version':a['version'],'reason':'Verificação final.'},409)
    enrollment=api.get('/enrollments/'+a['enrollment_id'])
    api.move(enrollment,'activate',409)
    unknown=str(uuid.uuid4())
    assert pc(o,'GET',f"/admissions/{a['id']}/issued/{unknown}",status=404)
    response=o['parent'].post('/api/v1/portal/admissions/'+a['id']+'/issued/'+unknown+'/external-signature',
                              headers=CSRF,files={'file':('contrato.pdf',b'%PDF-1.4\n','application/pdf')})
    assert response.status_code==404
    assert pc(o,'GET','/admissions/'+a['id'])['contract']['issued_document_id'] is None

    from app.config import settings
    from app.db import SessionLocal
    from app import models as m
    from app.pdf_signing import sign_pdf_pfx
    with SessionLocal() as db:
        company=db.get(m.Company,api.school['company_id'])
        cnpj=re.sub(r'\D','',company.document or '') or '12345678000190'
    school_cert, school_pfx=certificate('Escola Teste','2.16.76.1.3.3',cnpj)
    guardian_cert, guardian_pfx=certificate('Responsável Teste','2.16.76.1.3.1','01011990'+CPF)
    roots=tmp_path/'roots';roots.mkdir()
    for index,cert in enumerate((school_cert,guardian_cert)):
        (roots/f'root-{index}.pem').write_bytes(cert.public_bytes(serialization.Encoding.PEM))
    monkeypatch.setattr(settings(),'signature_trust_roots_dir',roots)
    configured=api.client.put(api.base+'/signing-certificate/a1',headers=api.headers,
        files={'file':('escola.p12',school_pfx)},data={'password':'senha-teste'})
    assert configured.status_code==200,configured.text
    issued=api.post('/document-templates/'+template['id']+'/issue',{
        'enrollment_id':a['enrollment_id'],'template_version':a['contract_template_version']})
    assert issued['signature_status']=='company_signed'
    signed_by_school=pc(o,'GET',f"/admissions/{a['id']}/issued/{issued['id']}").content
    assert signed_by_school.startswith(b'%PDF-')
    assert pc(o,'GET','/admissions/'+a['id'])['contract']['issued_document_id']==issued['id']
    signed_by_guardian=sign_pdf_pfx(signed_by_school,guardian_pfx,'senha-teste','Responsavel')
    received=pc(o,'POST',f"/admissions/{a['id']}/issued/{issued['id']}/external-signature",
        files={'file':('contrato-assinado.pdf',signed_by_guardian,'application/pdf')})
    assert received['signature_status']=='pending_validation'
    assert api.post('/admissions/'+a['id']+'/finalize',{'version':a['version'],'reason':'Conferência final.'},409)
    reviewed=api.client.post(api.base+f"/issued-documents/{issued['id']}/validate-signature",
        headers=api.headers,data={'signer_cpf':CPF,'validation_reference':'ITI-TEST-PORTAL-001'},
        files={'report':('relatorio-validar.pdf',blank_pdf(),'application/pdf')})
    assert reviewed.status_code==200,reviewed.text
    completed=api.post('/admissions/'+a['id']+'/finalize',{'version':a['version'],'reason':'Assinaturas conferidas.'},200)
    assert completed['status']=='enrolled' and completed['enrollment']['status']=='active'
    assert pc(o,'GET',f"/admissions/{a['id']}/issued/{issued['id']}").content==signed_by_guardian
