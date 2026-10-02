"""Cobranças internas reais, sem configurar ou chamar serviços bancários."""
import io
import uuid
from datetime import date, timedelta
from decimal import Decimal
from pypdf import PdfReader
from sqlalchemy import select, func
from app import models as m
from app.db import SessionLocal
from app.portal_access import today as school_today
from conftest import API, PASSWORD
from test_online import online, bank, charge, draft, submit, approve


def context(api):
    catalogs=api.catalogs(capacity=5)
    student=api.student('Aluno do financeiro manual')
    guardian=api.guardian(student,'Responsável sem CPF')
    enrollment=api.enroll(student,catalogs['group'])
    return enrollment,guardian


def payload(enrollment,**values):
    return {'enrollment_id':enrollment['id'],'collection_mode':'manual','amount':'120.15',
            'due_on':school_today().isoformat(),'description':'Mensalidade interna',
            'client_key':str(uuid.uuid4()),**values}


def receipt(row,**values):
    return {'version':row['version'],'client_key':str(uuid.uuid4()),'amount':row['amount'],
            'paid_on':school_today().isoformat(),'payment_method':'cash','reference':'Recibo interno 001',**values}


def test_manual_installments_without_bank_or_cpf_are_idempotent(api,monkeypatch):
    monkeypatch.setattr('app.integration_core.call_json',lambda *a,**kw: (_ for _ in ()).throw(AssertionError('Banco não pode ser chamado')))
    enrollment,guardian=context(api)
    data=payload(enrollment,due_on='2028-01-31',installment_count=3)
    result=api.post('/bank-charges',data)
    assert result['count']==3
    assert [row['due_on'] for row in result['items']]==['2028-01-31','2028-02-29','2028-03-31']
    assert all(row['collection_mode']=='manual' and row['billing_type']=='MANUAL' and row['connection_id'] is None for row in result['items'])
    assert result['items'][0]['payer_snapshot']['person_id']==guardian['id']
    assert [row['id'] for row in api.post('/bank-charges',data)['items']]==[row['id'] for row in result['items']]
    for changed in ({'amount':'121.15'},{'installment_count':2}):api.post('/bank-charges',{**data,**changed},409)
    with SessionLocal() as db:
        assert not db.scalar(select(m.IntegrationConnection.id).where(m.IntegrationConnection.school_id==api.school['id']))
        assert not db.scalar(select(m.IntegrationJob.id).where(m.IntegrationJob.school_id==api.school['id']))


def test_integral_receipt_is_audited_idempotent_and_printable(api):
    enrollment,_=context(api);row=api.post('/bank-charges',payload(enrollment))['items'][0]
    path='/bank-charges/'+row['id'];data=receipt(row)
    api.call('GET',path+'/receipt.pdf',expect=409)
    api.post(path+'/manual-receipt',{**data,'amount':'80.00'},422)
    api.post(path+'/manual-receipt',{**data,'paid_on':(date.today()+timedelta(days=1)).isoformat()},422)
    api.post(path+'/manual-receipt',{**data,'version':row['version']+1},409)
    paid=api.post(path+'/manual-receipt',data,200)
    assert paid['status']=='received_external' and paid['manual_paid_amount']=='120.15'
    assert paid['manual_paid_on']==data['paid_on'] and paid['manual_reference']==data['reference']
    assert api.post(path+'/manual-receipt',data,200)['version']==paid['version']
    api.post(path+'/manual-receipt',{**data,'reference':'Outra referência'},409)
    api.post(path+'/cancel',{'reason':'Não deve cancelar cobrança já recebida.'},409)
    events=api.get(path+'/events')
    assert [event['source'] for event in events].count('manual_receipt')==1
    assert events[0]['details']['amount']=='120.15'
    pdf=api.get(path+'/receipt.pdf')
    text='\n'.join(page.extract_text() for page in PdfReader(io.BytesIO(pdf.content)).pages)
    assert 'Comprovante de recebimento' in text and 'R$ 120,15' in text and 'Recibo interno 001' in text
    assert 'Aluno do financeiro manual' in text and enrollment['number'] in text
    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(m.AuditEvent).where(m.AuditEvent.entity_id==row['id'],m.AuditEvent.action=='bank.charge.manual_received'))==1


def test_receipt_key_cannot_quit_another_charge(api):
    enrollment,_=context(api)
    first=api.post('/bank-charges',payload(enrollment))['items'][0]
    second=api.post('/bank-charges',payload(enrollment))['items'][0]
    data=receipt(first);api.post('/bank-charges/'+first['id']+'/manual-receipt',data,200)
    api.post('/bank-charges/'+second['id']+'/manual-receipt',{**data,'version':second['version']},409)
    assert api.get('/bank-charges/'+second['id'])['status']=='pending'


def test_manual_cancel_and_bank_actions_are_separated(api):
    enrollment,_=context(api);row=api.post('/bank-charges',payload(enrollment))['items'][0]
    path='/bank-charges/'+row['id']
    api.post(path+'/sync',{'reason':'Cobrança interna sem emissão.'},409)
    api.post(path+'/authorize-reissue',{'reason':'Não converter cobrança interna em bancária.'},409)
    assert api.post(path+'/cancel',{'reason':'Lançamento interno indevido.'},200)['status']=='cancelled'
    api.post(path+'/manual-receipt',receipt(api.get(path)),409)
    with SessionLocal() as db:
        assert not db.scalar(select(m.IntegrationJob.id).where(m.IntegrationJob.school_id==api.school['id']))


def test_manual_overdue_filter_summary_and_report_are_consistent(api):
    enrollment,_=context(api);due=(school_today()-timedelta(days=8)).isoformat()
    row=api.post('/bank-charges',payload(enrollment,due_on=due))['items'][0]
    assert row['status']=='overdue'
    assert api.get('/bank-charges?status=overdue')['total']==1
    assert api.get('/bank-charges?status=pending')['total']==0
    assert api.get('/bank-summary')['items']==[{'status':'overdue','count':1,'amount':'120.15'}]
    query='?date_from='+due+'&date_to='+school_today().isoformat()
    report=api.get('/reports/management/financial'+query+'&status=overdue')
    assert report['items'][0]['billing_type']=='Cobrança interna' and report['items'][0]['status']=='Vencido'
    api.post('/bank-charges/'+row['id']+'/manual-receipt',receipt(row),200)
    assert api.get('/bank-summary')['items']==[{'status':'received_external','count':1,'amount':'120.15'}]
    assert api.get('/reports/management/financial'+query)['items'][0]['status']=='Recebido manualmente'


def test_scope_and_read_only_financial_role(api):
    enrollment,_=context(api);row=api.post('/bank-charges',payload(enrollment))['items'][0]
    email='manual-read-'+uuid.uuid4().hex+'@example.com'
    response=api.client.post('/api/v1/users',headers=api.headers,json={'name':'Secretaria consulta','email':email,'password':PASSWORD,'role':'secretary','school_ids':[api.school['id']]})
    assert response.status_code==201,response.text
    login=api.client.post('/api/v1/auth/login',json={'email':email,'password':PASSWORD}).json()
    reader=API(api.client,{'Authorization':'Bearer '+login['access_token']},api.school)
    assert reader.get('/bank-charges')['total']==1
    reader.post('/bank-charges',payload(enrollment),403)
    reader.post('/bank-charges/'+row['id']+'/manual-receipt',receipt(row),403)
    reader.post('/bank-charges/'+row['id']+'/cancel',{'reason':'Somente consulta financeira.'},403)
    other=api.client.post('/api/v1/schools',headers=api.headers,json={'company_id':api.school['company_id'],'name':'Outra escola financeira'}).json()
    foreign=API(api.client,api.headers,other)
    foreign.post('/bank-charges',payload(enrollment),404)
    foreign.call('GET','/bank-charges/'+row['id'],expect=404)
    foreign.post('/bank-charges/'+row['id']+'/manual-receipt',receipt(row),404)


def test_provider_contract_remains_required_and_cannot_receive_manual(online):
    admission=submit(online,draft(online));api=online['api']
    data={'admission_id':admission['id'],'amount':'100.00','due_on':date.today().isoformat(),'description':'Taxa bancária','client_key':str(uuid.uuid4())}
    api.post('/bank-charges',data,409)
    bank(online)
    provider=api.post('/bank-charges',data)['items'][0]
    assert provider['collection_mode']=='provider' and provider['status']=='queued' and provider['connection_id']
    api.post('/bank-charges/'+provider['id']+'/manual-receipt',receipt(provider),409)
    manual=api.post('/bank-charges',{**data,'client_key':str(uuid.uuid4()),'collection_mode':'manual'})['items'][0]
    assert manual['connection_id'] is None
    with SessionLocal() as db:
        assert not db.scalar(select(m.IntegrationJob.id).where(m.IntegrationJob.dedupe_key=='bank-issue:'+manual['id']))


def test_required_manual_receipt_unlocks_enrollment_without_bank(online):
    admission=approve(online,submit(online,draft(online)));api=online['api']
    row=charge(online,admission,collection_mode='manual',required_for_enrollment=True)
    path='/admissions/'+admission['id']+'/finalize'
    finalize={'version':admission['version'],'reason':'Conferência final do recebimento interno.'}
    api.post(path,finalize,409)
    api.post('/bank-charges/'+row['id']+'/manual-receipt',receipt(row),200)
    completed=api.post(path,finalize,200)
    assert completed['status']=='enrolled' and completed['enrollment']['status']=='active'
    public=online['parent'].get('/api/v1/portal/admissions/'+admission['id']+'/charges').json()[0]
    assert public['status']=='received_external' and 'manual_received_by' not in public and 'manual_receipt_key' not in public
