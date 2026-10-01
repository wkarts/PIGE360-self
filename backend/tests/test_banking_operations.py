"""Banco e API locais reais; apenas o transporte externo é simulado."""
from types import SimpleNamespace
import uuid
import pytest
from sqlalchemy import select
from app import models as m
from app.config import settings
from app.db import SessionLocal
from app.integration_core import AsaasProvider, unseal, seal
from app.integration_worker import process_one
from test_online import online, bank, charge, draft, submit, provider_mock, run_issue


def test_disabled_account_can_be_tested_and_token_is_generated(online,monkeypatch):
    api=online['api'];conn=api.post('/integrations/asaas',{'enabled':False,'api_key':'test-only-disabled-key'},200)
    assert conn['api_key_configured'] and conn['webhook_token_configured']
    assert 'encrypted_secrets' not in conn and 'test-only-disabled-key' not in str(conn)
    calls,_=provider_mock(monkeypatch)
    assert api.post('/integrations/asaas/test',{},200)['ok']
    assert calls[0][1:3]==('/customers','GET')
    status=api.get('/banking-status');assert status['last_test_ok'] and not status['enabled']
    with SessionLocal() as db:
        secret=unseal(db.get(m.IntegrationConnection,conn['id']).encrypted_secrets)
        assert len(secret['webhook_token'])>=32 and secret['api_key']!=secret['webhook_token']


@pytest.mark.parametrize('token',['x'*256,'a'*32+' space'])
def test_webhook_token_obeys_provider_contract(online,token):
    online['api'].post('/integrations/asaas',{'enabled':False,'webhook_token':token},422)


def test_webhook_setup_creates_once_then_updates_own_callback(online,monkeypatch):
    conn=bank(online);api=online['api'];calls=[];hooks=[]
    monkeypatch.setattr('app.integrations.settings',lambda:SimpleNamespace(app_url='https://escola.example.com'))
    def request(self,path,method='GET',data=None,params=None):
        calls.append((path,method,data))
        if method=='GET':return {'data':hooks,'hasMore':False}
        assert data['url']=='https://escola.example.com/api/v1/hooks/asaas/'+conn['id']
        assert data['authToken']=='test-only-webhook-token-000000000000000'
        assert data['sendType']=='SEQUENTIALLY'
        if method=='POST':hooks.append({'id':'whk_school','url':data['url']})
        return {'id':'whk_school','authToken':'must-not-leak-in-response'}
    monkeypatch.setattr(AsaasProvider,'request',request)
    first=api.post('/integrations/asaas/webhook',{'email':'financeiro@example.com'},200)
    second=api.post('/integrations/asaas/webhook',{'email':'financeiro@example.com'},200)
    assert first['ok'] and second['ok'] and [c[1] for c in calls]==['GET','POST','GET','PUT']
    assert 'must-not-leak' not in str(first) and 'test-only-webhook-token' not in str(first)
    assert api.get('/banking-status')['webhook_registered']
    saved=api.post('/integrations/asaas',{'version':second['connection']['version'],'enabled':True},200)
    assert saved['config']['webhook_id']=='whk_school'


def test_webhook_setup_refuses_duplicates_without_remote_mutation(online,monkeypatch):
    conn=bank(online);monkeypatch.setattr('app.integrations.settings',lambda:SimpleNamespace(app_url='https://escola.example.com'))
    url='https://escola.example.com/api/v1/hooks/asaas/'+conn['id'];calls=[]
    def request(self,path,method='GET',data=None,params=None):
        calls.append(method);return {'data':[{'id':'one','url':url},{'id':'two','url':url}],'hasMore':False}
    monkeypatch.setattr(AsaasProvider,'request',request)
    result=online['api'].post('/integrations/asaas/webhook',{'email':'financeiro@example.com'},200)
    assert not result['ok'] and result['code']=='DUPLICATE_BANK_WEBHOOK' and calls==['GET']


def test_webhook_requires_public_https_installation(online,monkeypatch):
    bank(online);monkeypatch.setattr(settings(),'app_url','http://testserver')
    online['api'].post('/integrations/asaas/webhook',{'email':'financeiro@example.com'},409)


def test_bank_filters_summary_and_fresh_charge_detail(online,monkeypatch):
    bank(online);a=submit(online,draft(online));api=online['api']
    first=charge(online,a,description='Mensalidade selecionada',amount='120.00',due_on='2029-01-10')
    charge(online,a,amount='80.00',due_on='2029-02-10')
    filters='?due_from=2029-01-01&due_to=2029-01-31'
    listing=api.get('/bank-charges'+filters);summary=api.get('/bank-summary'+filters)
    assert listing['total']==1 and listing['items'][0]['id']==first['id']
    assert summary['items']==[{'status':'queued','count':1,'amount':'120.00'}]
    provider_mock(monkeypatch);row,_=run_issue(first);details=api.get('/bank-charges/'+first['id'])
    assert details['remote_payment_id']==row.remote_payment_id and details['status']=='pending'
    assert details['issuance']['status']=='completed'
    api.call('GET','/bank-charges?due_from=2029-02-01&due_to=2029-01-01',expect=422)


def test_reconciliation_batch_deduplicates_and_only_reads_bank(online,monkeypatch):
    bank(online);a=submit(online,draft(online));c=charge(online,a);calls,store=provider_mock(monkeypatch)
    row,_=run_issue(c);api=online['api'];calls.clear()
    first=api.post('/bank-charges/reconcile',{'reason':'Conferência dos recebimentos.'},200)
    again=api.post('/bank-charges/reconcile',{'reason':'Conferência repetida.'},200)
    one=api.post('/bank-charges/'+c['id']+'/sync',{'reason':'Consulta individual.'},200)
    assert first['count']==1 and first['job_ids']==again['job_ids']==[one['job_id']]
    store['payments'][row.remote_payment_id]['status']='RECEIVED';process_one(one['job_id'])
    assert api.get('/bank-charges/'+c['id'])['status']=='received'
    assert all(method=='GET' for _,_,method,_,_ in calls)
    assert api.post('/bank-charges/reconcile',{'reason':'Conferência final.'},200)['count']==0


def test_duplicate_charge_key_rejects_changed_business_data(online):
    bank(online);a=submit(online,draft(online));api=online['api']
    payload={'admission_id':a['id'],'amount':'90.00','due_on':'2029-01-10','description':'Mensalidade','billing_type':'PIX','client_key':str(uuid.uuid4()),'installment_count':2}
    first=api.post('/bank-charges',payload)['items'];assert len(first)==2
    for change in ({'installment_count':3},{'description':'Outro lançamento'},{'installment_count':1}):api.post('/bank-charges',{**payload,**change},409)
    assert [r['id'] for r in api.post('/bank-charges',payload)['items']]==[r['id'] for r in first]
    single={**payload,'client_key':str(uuid.uuid4()),'installment_count':1};api.post('/bank-charges',single)
    api.post('/bank-charges',{**single,'required_for_enrollment':True},409)


def test_early_webhook_recovers_by_reference_without_trusting_payload(online):
    conn=bank(online);c=charge(online,submit(online,draft(online)))
    with SessionLocal() as db:reference=db.get(m.BankCharge,c['id']).external_reference
    response=online['parent'].post('/api/v1/hooks/asaas/'+conn['id'],headers={'asaas-access-token':'test-only-webhook-token-000000000000000'},json={'id':'evt-early','event':'PAYMENT_RECEIVED','payment':{'id':'pay-early','externalReference':reference,'status':'RECEIVED','value':0}})
    assert response.status_code==200 and response.json()['status']=='reconciliation_queued'
    with SessionLocal() as db:
        assert db.get(m.BankCharge,c['id']).status=='queued'
        sync=db.scalar(select(m.IntegrationJob).where(m.IntegrationJob.connection_id==conn['id'],m.IntegrationJob.kind=='bank_sync'))
        assert unseal(sync.encrypted_payload)=={'charge_id':c['id']}


def test_pix_removed_after_receipt_and_cash_is_not_bank_receipt(online,monkeypatch):
    bank(online);c=charge(online,submit(online,draft(online)),billing_type='PIX');_,store=provider_mock(monkeypatch)
    row,_=run_issue(c);assert row.pix_copy_paste
    store['payments'][row.remote_payment_id].update(status='RECEIVED',billingType='RECEIVED_IN_CASH')
    job=online['api'].post('/bank-charges/'+c['id']+'/sync',{'reason':'Conferência de baixa externa.'},200);process_one(job['job_id'])
    details=online['api'].get('/bank-charges/'+c['id'])
    assert details['status']=='received_external' and not details['pix_copy_paste'] and not details['pix_image']


def test_ddd_55_phone_is_preserved(monkeypatch):
    provider=AsaasProvider(SimpleNamespace(environment='sandbox',encrypted_secrets=seal({'api_key':'test-only'})));payloads=[]
    monkeypatch.setattr(provider,'request',lambda path,method='GET',data=None,params=None:payloads.append(data) or {'id':'customer'})
    for phone in ('55999990000','5555999990000','+55 (55) 99999-0000'):provider.customer({'name':'Responsável','cpf':'52998224725','phone':phone},'reference')
    assert [p['mobilePhone'] for p in payloads]==['55999990000']*3


def test_local_cancel_is_audited_in_charge_history(online):
    bank(online);c=charge(online,submit(online,draft(online)))
    online['api'].post('/bank-charges/'+c['id']+'/cancel',{'reason':'Lançamento indevido.'},200)
    events=online['api'].get('/bank-charges/'+c['id']+'/events')
    assert len(events)==1 and events[0]['source']=='local_cancel' and events[0]['status']=='cancelled'
