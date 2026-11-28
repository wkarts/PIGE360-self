from datetime import date, timedelta
from decimal import Decimal
from types import SimpleNamespace

import pytest

from app import asaas_auto_pix as pix
from app.asaas_pix_calendar import business_days, cycle_number
from app.integration_core import IntegrationFailure


def test_calendar_constrains_scheduling_and_preserves_first_cycle():
    assert business_days(date(2026,11,19),date(2026,11,23)) == 1
    assert business_days(date(2026,11,19),date(2026,11,24)) == 2
    assert business_days(date(2026,11,19),date(2026,11,24),['2026-11-23']) == 1
    assert business_days(date(2026,2,13),date(2026,2,18)) == 1
    assert cycle_number(date(2026,1,31),date(2026,2,28),'MONTHLY') == 1
    assert cycle_number(date(2026,3,1),date(2026,3,7),'WEEKLY') == 0
    assert cycle_number(date(2026,3,1),date(2026,3,8),'WEEKLY') == 1
    assert cycle_number(date(2026,3,1),date(2026,5,31),'QUARTERLY') == 0


def authorization():
    return SimpleNamespace(remote_id=None,customer_id='cus_1',contract_id='PG1',frequency='MONTHLY',
                           start_date=date(2026,11,27),conciliation=None,status='PREPARING',
                           expires_at=None,encrypted_qr='',verified_at=None,version=1)


def test_bank_authorization_does_not_reactivate_and_qr_is_encrypted():
    auth=authorization()
    response={'id':'auth_1','customerId':'cus_1','contractId':'PG1','frequency':'MONTHLY',
        'startDate':'2026-11-27','paymentCreationMode':'MANUAL','status':'CREATED',
        'immediateQrCode':{'conciliationIdentifier':'TXID001','expirationDate':(pix.now()+timedelta(minutes=10)).isoformat()},
        'payload':'000201'+('1234567890'*4)}
    pix.accept(auth,response)
    assert auth.status=='CREATED' and response['payload'] not in auth.encrypted_qr
    assert pix.unseal(auth.encrypted_qr)['payload']==response['payload']
    pix.accept(auth,{**response,'status':'ACTIVE'})
    assert auth.status=='ACTIVE' and not auth.encrypted_qr
    pix.accept(auth,{**response,'status':'REFUSED'})
    with pytest.raises(IntegrationFailure): pix.accept(auth,{**response,'status':'ACTIVE'})
    with pytest.raises(IntegrationFailure): pix.accept(authorization(),{**response,'customerId':'cus_other'})


def test_cycle_status_is_not_proof_of_payment(monkeypatch):
    auth=SimpleNamespace(school_id='s',enrollment_id='e',remote_id='auth_1',customer_id='cus_1')
    charge=SimpleNamespace(school_id='s',enrollment_id='e',connection_id='conn',amount=Decimal('10'),
                           external_reference='pige:charge',remote_payment_id=None,status='pending')
    cycle=SimpleNamespace(cycle=1,payment_id=None,amount=Decimal('10'))
    payment={'id':'pay_1','value':10,'billingType':'PIX','customer':'cus_1','externalReference':'pige:charge','status':'PENDING'}
    monkeypatch.setattr(pix,'with_scope',lambda *a: SimpleNamespace(id='conn'))
    called=[]
    monkeypatch.setattr('app.banking.apply_remote',lambda *a:called.append(a[2]['status']))
    def instruction(authorization):
        return {'hasMore':False,'data':[{'status':'DONE','paymentId':'pay_1','authorization':{'id':authorization}}]}
    monkeypatch.setattr(pix,'remote',lambda *a,**kw:instruction('wrong'))
    with pytest.raises(IntegrationFailure):pix.receipt(None,auth,cycle,charge,payment)
    assert not called
    monkeypatch.setattr(pix,'remote',lambda *a,**kw:instruction('auth_1'))
    assert pix.receipt(None,auth,cycle,charge,payment)
    assert called==['PENDING'] and cycle.status=='WAITING' and cycle.instruction_status=='DONE'


def test_initial_payment_requires_exact_credit_transaction(monkeypatch):
    auth=SimpleNamespace(school_id='s',enrollment_id='e',customer_id='cus_1',conciliation='match')
    charge=SimpleNamespace(school_id='s',enrollment_id='e',connection_id='conn',amount=Decimal('10'),
        external_reference='pige:charge',remote_payment_id=None,status='received')
    cycle=SimpleNamespace(cycle=0,payment_id=None,amount=Decimal('10'))
    payment={'id':'pay_1','value':'10','billingType':'PIX','customer':'cus_1','pixTransaction':'tx_1','status':'RECEIVED'}
    called=[]
    monkeypatch.setattr('app.banking.apply_remote',lambda *a:called.append(a[2]['externalReference']))
    monkeypatch.setattr(pix,'with_scope',lambda *a:SimpleNamespace(id='conn'))
    tx={'id':'tx_1','payment':'pay_1','type':'CREDIT','conciliationIdentifier':'other'}
    monkeypatch.setattr(pix,'remote',lambda *a,**kw:tx)
    assert not pix.receipt(None,auth,cycle,charge,payment) and not called
    tx['conciliationIdentifier']='match'
    assert pix.receipt(None,auth,cycle,charge,payment) and called==['pige:charge']


def test_family_enrollment_replays_consent_and_releases_expired_qr(api,client,admin,monkeypatch):
    from uuid import uuid4
    from app import models as m
    from app.db import SessionLocal
    from test_diary_portal import active_student_and_guardian
    from test_online import bank,provider_mock,run_issue
    from test_profiles import create_user,login

    _,student,guardian,enrollment=active_student_and_guardian(api)
    user=create_user(client,admin,name=guardian['name'],role='guardian',school_id=api.school['id'],
                     person_id=guardian['id'],email=uuid4().hex+'@example.com')
    headers=login(client,user['email'],'Profile-Test-Password-2026!')
    headers['X-School-ID']=api.school['id']
    connection=bank({'api':api})
    api.call('PUT','/banking/asaas/pix-automatic/settings',{'enabled':True,'version':connection['version']})
    charge=api.post('/bank-charges',{'enrollment_id':enrollment['id'],'amount':'30.00','description':'Mensalidade',
        'due_on':(pix.today()+timedelta(days=25)).isoformat(),'billing_type':'PIX','client_key':str(uuid4())})['items'][0]
    _,store=provider_mock(monkeypatch)
    emitted,_=run_issue(charge)
    old=store['payments'][emitted.remote_payment_id]
    state={}
    posts=[]
    def transport(method,conn,path,*,payload=None,params=None):
        assert conn.id==connection['id']
        if path=='/payments/'+old['id']:
            if method=='DELETE':old['deleted']=True
            return dict(old)
        if path==pix.AUTH and method=='POST':
            posts.append(payload)
            state.update(**payload,id='auth_1',status='CREATED')
            state['immediateQrCode']={'conciliationIdentifier':'txref001',
                                      'expirationDate':(pix.now()+timedelta(minutes=10)).isoformat()}
            state['payload']='000201'+('1234567890'*4)
            return dict(state)
        if path==pix.AUTH+'/auth_1' and method=='GET':return dict(state)
        if path=='/payments' and method=='GET':return {'data':[],'hasMore':False}
        raise AssertionError((method,path))
    monkeypatch.setattr(pix,'remote',transport)
    path=f"/api/v1/family/students/{student['id']}/charges/{charge['id']}/pix-automatic"
    def request(method,action='',body=None,status=200):
        r=client.request(method,path+action,json=body,headers=headers)
        assert r.status_code==status,r.text
        return r.json()
    initial=request('GET')
    assert initial['can_enroll'] and not initial['authorization']
    consent={'accepted':True,'terms_version':initial['terms_version'],'frequency':'MONTHLY','quote':initial['quote']}
    request('POST','/enroll',{**consent,'accepted':False},422)
    view=request('POST','/enroll',consent)
    assert view['authorization']['payload']==state['payload'] and old['deleted']
    assert request('POST','/enroll',consent)['authorization']['id']==view['authorization']['id']
    assert len(posts)==1
    with SessionLocal() as db:
        assert db.get(m.BankCharge,charge['id']).status=='awaiting_review'
    state.update(status='EXPIRED',immediateQrCode={'conciliationIdentifier':'txref001',
                        'expirationDate':(pix.now()-timedelta(minutes=8)).isoformat()})
    after=request('POST','/refresh',{})['authorization']
    assert after['status']=='EXPIRED' and after['payload']=='' and after['cycles'][0]['status']=='RELEASED'
    with SessionLocal() as db:
        final=db.get(m.BankCharge,charge['id'])
        assert final.status=='cancelled' and final.remote_payment_id==old['id']
