"""API local e transporte Asaas sintético para checkout, consentimento e estorno."""
from datetime import timedelta
from uuid import uuid4
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from app import asaas_cards as cards, models as m
from app.asaas_card_models import CardCheckout, CardMandate
from app.config import settings
from app.db import SessionLocal
from app.main import app
from app.portal_access import today
from conftest import PASSWORD
from test_online import online, approve, bank, charge, draft, submit, CPF
from test_manual_banking import payload


@pytest.fixture
def offered(online,monkeypatch):
    api=online['api']
    admission=approve(online,submit(online,draft(online)))
    conn=bank(online)
    with SessionLocal.begin() as db:
        c=db.get(m.IntegrationConnection,conn['id'])
        c.config={**c.config,'payment_policy':{'card_enabled':True,'card_recurring_enabled':True,'max_installments':8}}
    title=charge(online,admission,collection_mode='manual')
    enrollment=api.get('/enrollments/'+admission['enrollment_id'])
    payee=enrollment['financial_person_id'];email=uuid4().hex+'@example.com'
    api.post('/users',{'name':'Pessoa pagadora','role':'guardian','person_id':payee,'school_ids':[api.school['id']],
                      'email':email,'password':PASSWORD})
    family=TestClient(app,client=('203.0.113.25',1357))
    response=family.post('/api/v1/auth/login',json={'email':email,'password':PASSWORD});assert response.status_code==200
    family.headers.update({'Authorization':'Bearer '+response.json()['access_token']})
    root='/api/v1/family/students/'+enrollment['student_id']+'/charges/'+title['id']+'/cards'
    monkeypatch.setattr(settings(),'portal_public_url','https://familia.example.test')
    state={'posts':[],'payments':[],'history':[]}
    def read(conn,path,params=None):
        if path=='/customers':return {'data':[{'id':'cus_1','cpfCnpj':CPF}]}
        if path=='/customers/cus_1':return {'id':'cus_1','cpfCnpj':CPF}
        if path=='/payments':return {'data':state['payments'],'hasMore':False}
        if path.endswith('/refunds'):return {'data':state['history'],'hasMore':False}
        if path=='/payments/pay_1':return state['payments'][0]
        if path=='/payments/pay_token':return state['token_payment']
        raise AssertionError(path)
    def send(conn,method,path,params=None,payload=None):
        state['posts'].append((method,path,payload))
        if path=='/checkouts':return {'id':'ch_'+str(len(state['posts']))}
        if path=='/payments':
            state['token_payment']={key:payload[key] for key in ('customer','dueDate','externalReference','value','billingType')}
            state['token_payment'].update(id='pay_token',status='RECEIVED')
            return state['token_payment']
        if path.endswith('/refund'):return {'id':'pay_1'}
        raise AssertionError(path)
    monkeypatch.setattr(cards,'asaas_read',read);monkeypatch.setattr(cards,'asaas_request',send)
    args={'charge_id':title['id'],'mode':'detached','client_key':uuid4().hex}
    row=api.post('/banking/asaas/cards/checkouts',args)
    state['payment']={'id':'pay_1','customer':'cus_1','checkoutSession':'ch_1','billingType':'CREDIT_CARD',
                      'value':150.0,'dueDate':title['due_on'],'status':'RECEIVED'}
    return api,admission,enrollment,title,conn,row,args,state,family,root


def test_checkout_has_an_exclusive_channel_and_settles_only_after_readback(offered):
    api,_,_,title,conn,row,args,state,family,root=offered
    base='/banking/asaas/cards/checkouts'
    assert row['status']=='open' and row['quote']['charged_cents']==15000
    assert api.post(base,args)['id']==row['id']
    assert len(state['posts'])==1
    assert state['posts'][0][2]['chargeTypes']==['DETACHED']
    api.post(base,{**args,'client_key':uuid4().hex},409)
    api.post('/bank-charges/'+title['id']+'/cancel',{'reason':'Conferir cobrança em cartão'},409)
    with SessionLocal.begin() as db:
        connection=db.get(m.IntegrationConnection,conn['id'])
        assert cards.observe_webhook(db,connection,{'event':'CHECKOUT_PAID','id':'evt_1','checkout':{'id':'ch_1','externalReference':'pige-card:'+row['id']}})
    assert api.get('/bank-charges/'+title['id'])['status']=='pending'
    state['payments']=[{**state['payment'],'status':'CONFIRMED'}]
    api.post(base+'/'+row['id']+'/sync',{},200)
    assert api.get('/bank-charges/'+title['id'])['status']=='confirmed'
    state['payments']=[state['payment']]
    synced=api.post(base+'/'+row['id']+'/sync',{},200)
    assert synced['status']=='paid' and synced['payments'][0]['id']=='pay_1'
    assert api.get('/bank-charges/'+title['id'])['status']=='received'
    assert family.get(root).json()['authorization'] is None
    assert family.get(root+'/receipts/pay_unknown.pdf').status_code==404
    pdf=family.get(root+'/receipts/pay_1.pdf')
    assert pdf.status_code==200 and pdf.content.startswith(b'%PDF') and pdf.headers['Cache-Control']=='no-store'


def test_refund_prevents_duplicates_pending_and_respects_confirmed_balance(offered):
    api,_,_,title,conn,row,args,state,_,_=offered
    state['payments']=[state['payment']]
    path='/banking/asaas/cards/checkouts/'+row['id']+'/refund'
    command={'payment_id':'pay_1','amount':'15.00','client_key':uuid4().hex,'description':'Ajuste da mensalidade.'}
    api.post(path,{**command,'payment_id':'pay_other'},409)
    api.post(path,{**command,'amount':'151.00'},409)
    assert api.post(path,command,200)['status']=='completed'
    assert api.post(path,command,200)['status']=='completed'
    api.post(path,{**command,'client_key':uuid4().hex},409)
    state['history']=[{'status':'DONE','value':15.0}]
    api.post(path,{**command,'amount':'140.00','client_key':uuid4().hex},409)
    assert [path for _,path,_ in state['posts']].count('/payments/pay_1/refund')==1


def test_invoice_token_requires_consent_and_scoped_supported_token(offered):
    api,_,enrollment,title,conn,row,args,state,family,root=offered
    state['payments']=[state['payment']]
    api.post('/banking/asaas/cards/checkouts/'+row['id']+'/sync',{},200)
    data={'accepted':True,'terms_version':cards.TERMS,'ends_on':str(today()+timedelta(days=30)),'limit_cents':16000}
    assert family.post(root+'/authorize',json={**data,'accepted':False}).status_code==422
    assert family.post(root+'/authorize',json=data).status_code==409
    state['payment']['creditCard']={'creditCardToken':'tok_synthetic_existing_customer_123'}
    response=family.post(root+'/authorize',json=data)
    assert response.status_code==200,response.text
    assert 'tok_synthetic' not in response.text
    with SessionLocal() as db:
        auth=db.scalar(select(CardMandate).where(CardMandate.checkout_id==row['id']))
        assert auth.status=='active' and 'tok_synthetic' not in auth.sealed_token
    new=api.post('/bank-charges',payload(enrollment,use_recurring_card=True,due_on=str(today()+timedelta(days=2))))['items'][0]
    assert len(state['posts'])==1
    current=api.post('/bank-charges',payload(enrollment,use_recurring_card=True))['items'][0]
    with SessionLocal() as db:
        from app.integration_core import unseal
        job=db.scalar(select(m.IntegrationJob).where(m.IntegrationJob.dedupe_key=='card-invoice:'+current['id']))
        body=unseal(job.encrypted_payload)
        assert cards.execute_job(db,job,body)=='pay_token'
        db.commit()
        assert cards.execute_job(db,job,body)=='pay_token'
        db.commit()
        assert db.get(m.BankCharge,current['id']).status=='received'
    assert sum(path=='/payments' for _,path,_ in state['posts'])==1
    assert family.post(root+'/revoke',json={}).status_code==200
    with SessionLocal() as db:
        auth=db.scalar(select(CardMandate).where(CardMandate.checkout_id==row['id']))
        assert auth.status=='revoked' and not auth.sealed_token
        assert db.scalar(select(CardCheckout).where(CardCheckout.charge_id==new['id'])).status=='scheduled'
    api.post('/bank-charges',payload(enrollment,use_recurring_card=True),409)


def test_hosted_installments_and_subscription_follow_checkout_contract(offered):
    api,admission,_,_,connection,_,_,state,_,_=offered
    with SessionLocal.begin() as db:
        conn=db.get(m.IntegrationConnection,connection['id'])
        conn.config={**conn.config,'payment_policy':{**conn.config['payment_policy'],'max_installments':21}}
    base='/banking/asaas/cards/checkouts'
    fees=charge({'api':api},admission,collection_mode='manual')
    args={'charge_id':fees['id'],'mode':'installment','client_key':uuid4().hex,'max_installments':21}
    api.post(base,{**args,'max_installments':22},422)
    api.post(base,args)
    assert state['posts'][-1][2]['installment']=={'maxInstallmentCount':21}
    subscription=charge({'api':api},admission,collection_mode='manual')
    until=str(today()+timedelta(days=120))
    api.post(base,{'charge_id':subscription['id'],'mode':'recurrent','client_key':uuid4().hex,'cycle':'MONTHLY','ends_on':until})
    data=state['posts'][-1][2]
    assert data['chargeTypes']==['RECURRENT']
    assert data['subscription']=={'cycle':'MONTHLY','nextDueDate':subscription['due_on'],'endDate':until}


def test_invoice_worker_uses_durable_outcome_after_provider_or_readback_failure(offered,monkeypatch):
    from fastapi import HTTPException
    from app.db import now
    from app.integration_core import IntegrationFailure
    from app.integration_worker import process_one
    api,_,enrollment,_,_,checkout,_,state,family,root=offered
    state['payments']=[{**state['payment'],'creditCard':{'creditCardToken':'tok_synthetic_worker_example_123'}}]
    api.post('/banking/asaas/cards/checkouts/'+checkout['id']+'/sync',{},200)
    consent=family.post(root+'/authorize',json={'accepted':True,'terms_version':cards.TERMS,
                       'ends_on':str(today()+timedelta(days=30)),'limit_cents':16000})
    assert consent.status_code==200,consent.text
    normal_send,normal_read=cards.asaas_request,cards.asaas_read
    sends=[]
    for scenario,expected,code in [('declined','failed','PROVIDER_HTTP_422'),
                                   ('timeout','uncertain','PROVIDER_TIMEOUT'),
                                   ('readback','completed','')]:
        title=api.post('/bank-charges',payload(enrollment,use_recurring_card=True))['items'][0]
        def send(conn,method,path,params=None,payload=None):
            assert (method,path)==('POST','/payments')
            sends.append(scenario)
            if scenario=='declined':
                raise IntegrationFailure('PROVIDER_HTTP_422')
            if scenario=='timeout':
                raise IntegrationFailure('PROVIDER_TIMEOUT',uncertain=True)
            return normal_send(conn,method,path,params=params,payload=payload)
        def read(conn,path,params=None):
            if scenario=='readback' and path=='/payments/pay_token':
                raise HTTPException(502,'Consulta temporariamente indisponível.')
            return normal_read(conn,path,params=params)
        monkeypatch.setattr(cards,'asaas_request',send)
        monkeypatch.setattr(cards,'asaas_read',read)
        with SessionLocal.begin() as db:
            job=db.scalar(select(m.IntegrationJob).where(m.IntegrationJob.dedupe_key=='card-invoice:'+title['id']))
            job.available_at=now()-timedelta(seconds=1)
            job_id=job.id
        assert process_one(job_id) is True
        assert process_one(job_id) is False
        with SessionLocal() as db:
            job=db.get(m.IntegrationJob,job_id)
            row=db.scalar(select(CardCheckout).where(CardCheckout.charge_id==title['id']))
            operation=cards.origin_operation(db,row)
            assert operation.status==expected
            assert (job.status,job.error_code)==(expected,code)
            if scenario=='readback':
                assert (job.remote_id,row.remote_id,row.status)==('pay_token','pay_token','processing')
                assert db.scalar(select(m.IntegrationJob.id).where(
                    m.IntegrationJob.dedupe_key=='card-invoice-sync:'+operation.id,
                    m.IntegrationJob.kind=='asaas_card_sync'))
            else:
                assert row.remote_id is None and row.status==expected
    assert sends==['declined','timeout','readback']
