"""Contrato da campanha congela revisão e impede efetivação sem assinatura."""
import uuid
import re
import pytest
from cryptography.hazmat.primitives import serialization
from test_online import online, draft, submit, approve, pc, CSRF, CPF
from test_contract_signatures import certificate, blank_pdf


@pytest.mark.parametrize('guardian_trusted', [True, False])
def test_campaign_contract_revision_and_activation_gate(online, tmp_path, monkeypatch, guardian_trusted):
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
    # Conferência externa continua válida mesmo sem confiar localmente na CA do responsável.
    trusted_certificates=(school_cert,guardian_cert) if guardian_trusted else (school_cert,)
    for index,cert in enumerate(trusted_certificates):
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
    assert verification['signatures'][0]['chain_trusted'] is guardian_trusted
    assert verification['signatures'][1]['chain_trusted'] is True
    assert verification['trust_status']==('chain_trusted_offline' if guardian_trusted else 'pending_authoritative_validation')
    assert [x['source'] for x in verification['revisions']]==['external_portal','company_a1']
    repeated=api.post('/admissions/'+a['id']+'/finalize',{'version':a['version'],'reason':'Repetição idempotente.'},200)
    assert repeated['status']=='enrolled'
    assert pc(o,'GET',f"/admissions/{a['id']}/issued/{issued['id']}").content==final
    api.call('PUT','/contract-history/policy',{'allow_removal':True})
    reason={'reason':'Tentativa de remover uma via efetivada.'}
    api.post(f"/admissions/{a['id']}/issued/{issued['id']}/remove-history",reason,409)
    receipt=next(d for d in completed['issued_documents'] if d['kind']=='enrollment_receipt')
    api.post(f"/admissions/{a['id']}/issued/{receipt['id']}/remove-history",reason,409)
    assert pc(o,'GET',f"/admissions/{a['id']}/issued/{receipt['id']}").content.startswith(b'%PDF-')


@pytest.mark.parametrize('switch_model',[False,True])
def test_contract_correction_requires_new_revision_and_keeps_signed_history(online,tmp_path,monkeypatch,switch_model):
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
    if switch_model:
        updated=api.post('/document-templates',{'name':'Outro contrato revisado','kind':'educational_contract',
            'academic_year_id':o['cat']['year']['id'],'require_signature':True,
            'body':'Outro contrato de {{aluno.nome}} com {{escola.nome}}.'})
    request={'version':a['version'],'template_id':updated['id'],'template_version':updated['version'],'reason':'Correção de conteúdo contratual conferida pela Direção.'}
    revised=api.post('/admissions/'+a['id']+'/contract-revision',request,200)
    assert revised['contract_template_version']==updated['version']
    assert revised['contract_template_id']==updated['id']
    assert revised['contract']['issued_document_id'] is None
    assert api.post('/admissions/'+a['id']+'/contract-revision',request,200)['version']==revised['version']
    assert issued['id'] not in [x['document_id'] for x in api.get('/issued-documents/signatures/pending')['items']]
    assert pc(o,'GET',f"/admissions/{a['id']}/issued/{issued['id']}").content==signed
    assert [row['id'] for row in pc(o,'GET',f"/admissions/{a['id']}")['preserved_contracts']]==[issued['id']]
    api.call('PUT','/contract-history/policy',{'allow_removal':True})
    api.post(f"/admissions/{a['id']}/issued/{issued['id']}/remove-history",
        {'reason':'Tentativa de remover uma versão assinada.'},409)
    response=api.client.post(api.base+'/issued-documents/'+issued['id']+'/signed-external',headers=api.headers,files={'file':('antigo.pdf',signed,'application/pdf')})
    assert response.status_code==409,response.text
    pc(o,'POST',f"/admissions/{a['id']}/issued/{issued['id']}/external-signature",
        files={'file':('contrato.pdf',signed,'application/pdf')},status=404)
    next_document=api.post('/document-templates/'+updated['id']+'/issue',{'enrollment_id':a['enrollment_id'],
        'template_version':updated['version']})
    assert next_document['id']!=issued['id'] and next_document['signature_status']=='unsigned'
    pc(o,'POST',f"/admissions/{a['id']}/issued/{next_document['id']}/external-signature",
        files={'file':('contrato-antigo.pdf',signed,'application/pdf')},status=422)
    api.post('/admissions/'+a['id']+'/finalize',{'version':revised['version'],'reason':'A via nova ainda não recebeu assinatura.'},409)
    assert len(api.get('/admissions/'+a['id'])['issued_documents'])==2


def unsigned_supersession(online):
    o=online; api=o['api']
    attrs={'name':'Contrato para histórico','kind':'educational_contract',
           'academic_year_id':o['cat']['year']['id'],'require_signature':True}
    template=api.post('/document-templates',{**attrs,'body':'Via inicial de {{aluno.nome}}.'})
    campaign=o['campaign']
    keys=('slug','title','instructions','privacy_notice','terms_version','class_group_ids','opens_on','closes_on',
          'active','require_verified_contact','require_documents','require_payment_before_enrollment')
    api.patch('/admission-campaigns/'+campaign['id'],{**{k:campaign[k] for k in keys},
        'version':campaign['version'],'contract_template_id':template['id']})
    admission=approve(o,submit(o,draft(o)))
    issued=api.post('/document-templates/'+template['id']+'/issue',{'enrollment_id':admission['enrollment_id'],
        'template_version':template['version']})
    updated=api.patch('/document-templates/'+template['id'],{**attrs,'version':template['version'],
        'body':'Via substituta de {{aluno.nome}}.'})
    payload={'version':admission['version'],'template_id':template['id'],'template_version':updated['version'],
             'reason':'Correção contratual justificada para o teste.'}
    return admission, issued, template, payload


def test_unsigned_history_direct_routes_policy_owner_and_removal(online):
    from app import models as m
    from app.db import SessionLocal
    from app.storage import read_bytes
    from sqlalchemy import select
    from conftest import PASSWORD
    o=online; api=o['api']
    a, old, template, payload=unsigned_supersession(o)
    aid=f"/admissions/{a['id']}"
    doc=f"/issued-documents/{old['id']}"
    file=f"/files/{old['file_id']}/download"
    remove=f"{aid}/issued/{old['id']}/remove-history"
    reason={'reason':'Via incorreta sem assinatura, revisada pela escola.'}
    assert api.call('GET',file).content.startswith(b'%PDF-')
    revised=api.post(aid+'/contract-revision',payload,200)
    assert revised['issued_documents'][0]['superseded']
    assert 'file_id' not in revised['issued_documents'][0]
    assert not pc(o,'GET',aid)['issued_documents']
    pc(o,'GET',f"{aid}/issued/{old['id']}",status=409)
    api.call('GET',file,expect=409)
    api.call('GET',doc+'/verification',expect=409)
    assert api.get(doc+'/signatures')['file_id'] is None
    api.post(doc+'/sign/a1',{},409)
    invalid={'enrollment_id':a['enrollment_id'],'template_version':template['version']}
    api.post('/document-templates/'+template['id']+'/issue',invalid,409)
    api.post('/document-templates/'+template['id']+'/preview.pdf',invalid,409)
    api.post(remove,reason,409)
    current=api.post('/document-templates/'+template['id']+'/issue',{**invalid,'template_version':payload['template_version']})
    assert pc(o,'GET',f"{aid}/issued/{current['id']}").content.startswith(b'%PDF-')
    mistaken={
        **payload,'version':revised['version'],'template_version':template['version'],
    }
    api.post(aid+'/contract-revision',mistaken,409)
    email='historico-'+uuid.uuid4().hex[:8]+'@example.com'
    api.client.post('/api/v1/users',headers=api.headers,json={'name':'Outro administrador','email':email,
        'password':PASSWORD,'role':'admin','school_ids':[api.school['id']]}).raise_for_status()
    login=api.client.post('/api/v1/auth/login',json={'email':email,'password':PASSWORD}).json()
    other={'Authorization':'Bearer '+login['access_token']}
    policy={'allow_removal':True}
    assert api.client.put(api.base+'/contract-history/policy',headers=other,json=policy).status_code==403
    assert api.client.post(api.base+remove,headers=other,json=reason).status_code==403
    api.call('PUT','/contract-history/policy',policy)
    other_school=api.client.post('/api/v1/schools',headers=api.headers,json={
        'company_id':api.school['company_id'],'name':'Escola segregada '+uuid.uuid4().hex[:8]}).json()
    other_base=f"/api/v1/schools/{other_school['id']}"
    assert api.client.get(other_base+'/contract-history/policy',headers=api.headers).json()['allow_removal'] is False
    assert api.client.put(other_base+'/contract-history/policy',headers=api.headers,json=policy).status_code==200
    assert api.client.post(other_base+remove,headers=api.headers,json=reason).status_code==404
    with SessionLocal() as db:
        row=db.get(m.IssuedDocument,old['id'])
        assert row.superseded_at is not None and row.history_removed_at is None
        stored=db.get(m.FileRecord,old['file_id'])
        frozen=read_bytes(stored)
        # Um vínculo de arquivo conhecido é impeditivo mesmo sem assinatura.
        person=db.get(m.Person,db.get(m.Student,a['student_id']).person_id)
        person.photo_file_id=stored.id
        db.commit()
    api.post(remove,reason,409)
    with SessionLocal() as db:
        db.get(m.Person,person.id).photo_file_id=None
        db.commit()
    assert api.post(remove,reason,200)=={'removed':True}
    assert api.post(remove,reason,200)=={'removed':True}
    assert [x['id'] for x in api.get(aid)['issued_documents']]==[current['id']]
    assert [x['id'] for x in api.get(f"/students/{a['student_id']}/documents")['issued']]==[current['id']]
    api.call('GET',file,expect=404)
    api.call('GET',doc+'/signatures',expect=404)
    pc(o,'GET',f"{aid}/issued/{old['id']}",status=404)
    with SessionLocal() as db:
        assert read_bytes(db.get(m.FileRecord,old['file_id']))==frozen
        events=db.scalars(select(m.AuditEvent).where(m.AuditEvent.entity_id==old['id'],
            m.AuditEvent.action=='contract_history.removed')).all()
        assert len(events)==1 and events[0].details['reason']==reason['reason']


def test_installation_owner_missing_audit_fails_closed():
    from app.contract_history import is_installation_owner
    from unittest.mock import Mock
    db=Mock()
    db.get.return_value=Mock(configured=True)
    user=Mock(role='admin',id='u1')
    for events in ([],[None],['u2'],['u1','u2']):
        db.scalars.return_value.all.return_value=events
        assert not is_installation_owner(db,user)
    db.scalars.return_value.all.return_value=['u1']
    assert is_installation_owner(db,user)
    user.role='direction'
    assert not is_installation_owner(db,user)


def test_two_competing_revision_requests_allow_only_one_change(online):
    from concurrent.futures import ThreadPoolExecutor
    from threading import Barrier
    from app import models as m
    from app.db import SessionLocal, engine
    o=online; api=o['api']
    a, old, _, payload=unsigned_supersession(o)
    other=api.post('/document-templates',{'name':'Outra revisão candidata','kind':'educational_contract',
        'academic_year_id':o['cat']['year']['id'],'require_signature':True,'body':'Contrato alternativo.'})
    alt={**payload,'template_id':other['id'],'template_version':other['version']}
    url=api.base+f"/admissions/{a['id']}/contract-revision"

    def change(body, barrier=None):
        if barrier:
            barrier.wait(timeout=10)
        return api.client.post(url,headers=api.headers,json=body)

    if engine.dialect.name == 'postgresql':
        barrier=Barrier(2)
        with ThreadPoolExecutor(max_workers=2) as pool:
            tasks=[pool.submit(change, body, barrier) for body in (payload,alt)]
            results=[task.result(timeout=20) for task in tasks]
    else:
        # SQLite ignora FOR UPDATE; somente o cenário de versão antiga é portátil.
        results=[change(payload),change(alt)]
    assert sorted(r.status_code for r in results)==[200,409],[r.text for r in results]
    with SessionLocal() as db:
        stored=db.get(m.Admission,a['id'])
        assert stored.version==a['version']+1
        assert db.get(m.IssuedDocument,old['id']).superseded_at is not None
