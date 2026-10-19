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
    # A família recebe o contrato antes de existir A1 institucional configurado.
    issued=api.post('/document-templates/'+template['id']+'/issue',{
        'enrollment_id':a['enrollment_id'],'template_version':a['contract_template_version']})
    assert issued['signature_status']=='unsigned'
    unsigned=pc(o,'GET',f"/admissions/{a['id']}/issued/{issued['id']}").content
    assert unsigned.startswith(b'%PDF-')
    assert api.post('/admissions/'+a['id']+'/finalize',{'version':a['version'],'reason':'Verificação final.'},409)
    enrollment=api.get('/enrollments/'+a['enrollment_id'])
    api.move(enrollment,'activate',409)
    api.post(f"/issued-documents/{issued['id']}/sign/a1",{},409)
    unknown=str(uuid.uuid4())
    assert pc(o,'GET',f"/admissions/{a['id']}/issued/{unknown}",status=404)
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
    # A primeira assinatura é externa, aplicada sobre os bytes originais.
    signed_by_guardian=sign_pdf_pfx(unsigned,guardian_pfx,'senha-teste','Responsavel')
    received=pc(o,'POST',f"/admissions/{a['id']}/issued/{issued['id']}/external-signature",
        files={'file':('contrato-assinado.pdf',signed_by_guardian,'application/pdf')})
    assert received['signature_status']=='pending_validation'
    assert api.post('/admissions/'+a['id']+'/finalize',{'version':a['version'],'reason':'Conferência final.'},409)
    reviewed=api.client.post(api.base+f"/issued-documents/{issued['id']}/validate-signature",
        headers=api.headers,data={'signer_cpf':CPF,'validation_reference':'ITI-TEST-PORTAL-001'},
        files={'report':('relatorio-validar.pdf',blank_pdf(),'application/pdf')})
    assert reviewed.status_code==200,reviewed.text
    # Nem a matrícula nem o contrato ficam concluídos se o A1 estiver ausente.
    api.move(api.get('/enrollments/'+a['enrollment_id']),'activate',409)
    api.post('/admissions/'+a['id']+'/finalize',{'version':a['version'],'reason':'A1 ainda ausente.'},409)
    assert api.get('/admissions/'+a['id'])['enrollment']['status']=='draft'
    configured=api.client.put(api.base+'/signing-certificate/a1',headers=api.headers,
        files={'file':('escola.p12',school_pfx)},data={'password':'senha-teste'})
    assert configured.status_code==200,configured.text
    completed=api.post('/admissions/'+a['id']+'/finalize',{'version':a['version'],'reason':'Assinaturas conferidas.'},200)
    assert completed['status']=='enrolled' and completed['enrollment']['status']=='active'
    final=pc(o,'GET',f"/admissions/{a['id']}/issued/{issued['id']}").content
    assert final.startswith(signed_by_guardian) and len(final)>len(signed_by_guardian)
    verification=api.get(f"/issued-documents/{issued['id']}/signatures")
    assert verification['cryptographic_valid'] and len(verification['signatures'])==2
    assert [x['source'] for x in verification['revisions']]==['external_portal','company_a1']
    repeated=api.post('/admissions/'+a['id']+'/finalize',{'version':a['version'],'reason':'Repetição idempotente.'},200)
    assert repeated['status']=='enrolled'
    assert pc(o,'GET',f"/admissions/{a['id']}/issued/{issued['id']}").content==final


def test_contract_correction_requires_new_revision_and_keeps_signed_history(online,tmp_path,monkeypatch):
    from app.config import settings
    from app.pdf_signing import sign_pdf_pfx
    o=online;api=o['api']
    template=api.post('/document-templates',{'name':'Contrato para correção','kind':'educational_contract',
        'academic_year_id':o['cat']['year']['id'],'body':'Primeira via de {{aluno.nome}} com {{escola.nome}}.','require_signature':True})
    campaign=o['campaign'];keys=('slug','title','instructions','privacy_notice','terms_version','class_group_ids',
        'opens_on','closes_on','active','require_verified_contact','require_documents','require_payment_before_enrollment')
    api.patch('/admission-campaigns/'+campaign['id'],{**{k:campaign[k] for k in keys},
        'version':campaign['version'],'contract_template_id':template['id']})
    a=approve(o,submit(o,draft(o)))
    issued=api.post('/document-templates/'+template['id']+'/issue',{'enrollment_id':a['enrollment_id'],
        'template_version':a['contract_template_version']})
    cert,pfx=certificate('Responsável sintético','2.16.76.1.3.1','01011990'+CPF)
    roots=tmp_path/'roots';roots.mkdir();(roots/'root.pem').write_bytes(cert.public_bytes(serialization.Encoding.PEM))
    monkeypatch.setattr(settings(),'signature_trust_roots_dir',roots)
    original=pc(o,'GET',f"/admissions/{a['id']}/issued/{issued['id']}").content
    signed=sign_pdf_pfx(original,pfx,'senha-teste','Responsavel')
    pc(o,'POST',f"/admissions/{a['id']}/issued/{issued['id']}/external-signature",
        files={'file':('contrato.pdf',signed,'application/pdf')})
    assert issued['id'] in [x['document_id'] for x in api.get('/issued-documents/signatures/pending')['items']]
    updated=api.patch('/document-templates/'+template['id'],{'version':template['version'],
        'name':template['name'],'kind':template['kind'],'academic_year_id':template['academic_year_id'],
        'require_signature':True,'body':'Redação corrigida de {{aluno.nome}} com {{escola.nome}}.'})
    request={'version':a['version'],'template_version':updated['version'],'reason':'Correção de conteúdo contratual conferida pela Direção.'}
    revised=api.post('/admissions/'+a['id']+'/contract-revision',request,200)
    assert revised['contract_template_version']==updated['version']
    assert revised['contract']['issued_document_id'] is None
    assert api.post('/admissions/'+a['id']+'/contract-revision',request,200)['version']==revised['version']
    assert issued['id'] not in [x['document_id'] for x in api.get('/issued-documents/signatures/pending')['items']]
    assert pc(o,'GET',f"/admissions/{a['id']}/issued/{issued['id']}").content==signed
    pc(o,'POST',f"/admissions/{a['id']}/issued/{issued['id']}/external-signature",
        files={'file':('contrato.pdf',signed,'application/pdf')},status=404)
    next_document=api.post('/document-templates/'+template['id']+'/issue',{'enrollment_id':a['enrollment_id'],
        'template_version':updated['version']})
    assert next_document['id']!=issued['id'] and next_document['signature_status']=='unsigned'
    pc(o,'POST',f"/admissions/{a['id']}/issued/{next_document['id']}/external-signature",
        files={'file':('contrato-antigo.pdf',signed,'application/pdf')},status=422)
    api.post('/admissions/'+a['id']+'/finalize',{'version':revised['version'],'reason':'A via nova ainda não recebeu assinatura.'},409)
    assert len(api.get('/admissions/'+a['id'])['issued_documents'])==2
