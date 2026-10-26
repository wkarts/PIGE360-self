"""Changing a contract is explicit, scoped and preserves academic preparation."""
from datetime import date,timedelta
import pytest
from test_online import online,draft,submit,approve


def model(o,**changes):
    return o['api'].post('/document-templates',{'name':'Contrato alternativo','kind':'educational_contract',
        'body':'Contrato da matrícula de {{aluno.nome}} com {{escola.nome}}.','require_signature':True,**changes})


def change(o,a,t,**changes):
    return o['api'].post('/admissions/'+a['id']+'/contract-revision',{'version':a['version'],
        'template_id':t['id'],'template_version':t['version'],'reason':'Modelo e condições conferidos pela Direção.',**changes},200)


def test_add_contract_to_approved_admission_and_preserve_campaign(online):
    o=online;a=approve(o,submit(o,draft(o)));t=model(o)
    revised=change(o,a,t)
    assert revised['contract_template_id']==t['id'] and revised['contract']['signature_status']=='awaiting_school'
    assert revised['contract']['academic_year_id']==o['cat']['year']['id']
    assert revised['enrollment_id']==a['enrollment_id'] and revised['enrollment']['status']=='draft'
    assert o['api'].get('/admission-campaigns')[0]['contract_template_id'] is None
    assert change(o,a,t)['version']==revised['version']
    o['api'].post('/admissions/'+a['id']+'/finalize',{'version':revised['version'],'reason':'Exige novo contrato.'},409)


@pytest.mark.parametrize('invalid',['inactive','expired','future','other_year','not_contract'])
def test_invalid_target_cannot_replace_contract(online,invalid):
    o=online;a=approve(o,submit(o,draft(o)));options={}
    if invalid=='inactive':options['active']=False
    if invalid=='expired':options['valid_until']=str(date.today()-timedelta(days=1))
    if invalid=='future':options['valid_from']=str(date.today()+timedelta(days=1))
    if invalid=='other_year':options['academic_year_id']=o['api'].post('/academic-years',{'name':'2098','starts_on':'2098-01-01','ends_on':'2098-12-31'})['id']
    if invalid=='not_contract':options['kind']='declaration'
    t=model(o,**options)
    o['api'].post('/admissions/'+a['id']+'/contract-revision',{'version':a['version'],'template_id':t['id'],
        'template_version':t['version'],'reason':'Troca solicitada para conferência.'},409)
    assert o['api'].get('/admissions/'+a['id'])['contract_template_id'] is None


def test_stale_version_and_short_reason_do_not_change_admission(online):
    o=online;a=approve(o,submit(o,draft(o)));t=model(o)
    request={'version':a['version']-1,'template_id':t['id'],'template_version':t['version'],'reason':'Troca solicitada para conferência.'}
    o['api'].post('/admissions/'+a['id']+'/contract-revision',request,409)
    request.update(version=a['version'],reason='Curta')
    o['api'].post('/admissions/'+a['id']+'/contract-revision',request,422)
    assert o['api'].get('/admissions/'+a['id'])['contract_template_id'] is None


def test_contract_change_cannot_reopen_effective_enrollment(online):
    o=online;a=approve(o,submit(o,draft(o)));t=model(o)
    a=o['api'].post('/admissions/'+a['id']+'/finalize',{'version':a['version'],'reason':'Conferência concluída.'},200)
    o['api'].post('/admissions/'+a['id']+'/contract-revision',{'version':a['version'],'template_id':t['id'],
        'template_version':t['version'],'reason':'Troca solicitada após efetivação.'},409)
    assert o['api'].get('/admissions/'+a['id'])['status']=='enrolled'


def test_other_school_template_is_not_accepted(online):
    from app import models as m
    from app.db import SessionLocal
    o=online;a=approve(o,submit(o,draft(o)))
    response=o['api'].client.post('/api/v1/schools',headers=o['api'].headers,
        json={'company_id':o['api'].school['company_id'],'name':'Escola isolada de teste'})
    assert response.status_code==201,response.text
    with SessionLocal() as db:
        t=m.DocumentTemplate(school_id=response.json()['id'],name='Contrato de outra escola',
            body='Contrato isolado sem dados da escola solicitante.',kind='educational_contract',require_signature=True)
        db.add(t);db.commit();ident=t.id
    o['api'].post('/admissions/'+a['id']+'/contract-revision',{'version':a['version'],'template_id':ident,
        'template_version':1,'reason':'Tentativa de vincular outro contrato.'},404)
    assert o['api'].get('/admissions/'+a['id'])['contract_template_id'] is None
