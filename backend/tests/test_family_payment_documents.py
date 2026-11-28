"""Leitura familiar de cobranças existentes, com transportes bancários locais simulados."""
import json
from datetime import timedelta
from uuid import uuid4

import pytest

from app import crm_bridge as bridge, crm_bridge_external as external, models as m
from app.crm_bridge_models import CRMBridgeRequest, CRMBridgeExternalRequest
from app.db import SessionLocal, now
from app.portal_access import today
from conftest import PASSWORD
from test_crm_bridge import configured
from test_crm_bridge_external import clean_external, receipt
from test_crm_bridge_bb import TITLE, bb_receipt
from test_crm_bridge_invoices import queue as queue_invoice, receipt as invoice_receipt
from test_family_access_profiles import account
from test_manual_banking import payload
from test_online import bank, provider_mock, run_issue


def family(api):
    _, headers, student, guardian = account(api,'guardian')
    enrollment = api.enroll(student,api.catalogs()['group'])
    base='/api/v1/family/students/'+student['id']+'/charges'
    return headers,student,guardian,enrollment,base


@pytest.mark.parametrize('kind',['PIX','BOLETO'])
def test_native_documents_are_read_only_and_visible_only_to_own_payer(api,monkeypatch,kind):
    headers,student,guardian,enrollment,base=family(api)
    with SessionLocal.begin() as db:
        db.get(m.Person,guardian['id']).cpf='52998224725'
    bank({'api':api})
    calls,_=provider_mock(monkeypatch)
    charge=api.post('/bank-charges',payload(enrollment,collection_mode='provider',billing_type=kind))['items'][0]
    built,_=run_issue(charge)
    assert built.remote_payment_id
    with SessionLocal.begin() as db:
        db.get(m.BankCharge,charge['id']).pix_expires_at=(now()+timedelta(hours=1)).isoformat()
    count=len(calls)
    path=base+'/'+charge['id']+'/documents'
    item=api.client.get(base,headers=headers).json()['items'][0]
    assert item['payment_source']=='asaas' and item['billing_type']==kind and item['has_payment_documents']
    assert set(item).isdisjoint({'remote_payment_id','payer_snapshot','invoice_url','pix_copy_paste','bank_slip_url'})
    response=api.client.get(path,headers=headers)
    documents=response.json()
    assert response.status_code==200 and documents['source']=='asaas' and documents['invoice_url'].startswith('https://www.asaas.com/')
    if kind=='PIX':
        assert documents['pix_copy_paste']=='PIX-PAYLOAD-TEST-ONLY'
    else:
        assert documents['bank_slip_url'].startswith('https://www.asaas.com/')
    with SessionLocal.begin() as db:
        row=db.get(m.BankCharge,charge['id'])
        row.pix_expires_at=(now()-timedelta(hours=1)).isoformat()
        row.invoice_url='https://www.asaas.com.other.test/private'
        row.bank_slip_url='https://other.test/private'
    assert api.client.get(path,headers=headers).json()=={'source':'asaas','billing_type':kind}
    with SessionLocal.begin() as db:
        row=db.get(m.BankCharge,charge['id'])
        row.invoice_url='https://asaas.com/i/test';row.status='received'
    assert not api.client.get(base,headers=headers).json()['items'][0]['has_payment_documents']

    other=api.guardian(student,'Outro responsável com acesso financeiro')
    data={'name':other['name'],'email':uuid4().hex+'@example.com','role':'guardian','password':PASSWORD,
          'person_id':other['id'],'school_ids':[api.school['id']]}
    api.post('/users',data)
    auth=api.client.post('/api/v1/auth/login',json={'email':data['email'],'password':PASSWORD}).json()
    other_headers={'Authorization':'Bearer '+auth['access_token']}
    # Resumo da matrícula autorizado, instrumento nominal de outro pagador indisponível.
    assert api.client.get(base,headers=other_headers).json()['total']==1
    assert api.client.get(path,headers=other_headers).status_code==404
    assert len(calls)==count


@pytest.mark.parametrize(('kind','provider'),[('BOLETO','asaas'),('PIX','asaas'),('BOLETO','banco_brasil')])
def test_crm_payment_instruments_and_local_status_remain_distinct(api,monkeypatch,kind,provider):
    headers,_,_,enrollment,base=family(api)
    configured(api,monkeypatch)
    native=api.post('/bank-charges',payload(enrollment,due_on=str(today()-timedelta(days=1))))['items'][0]
    path=base+'/'+native['id']+'/documents'
    invoice=queue_invoice(api,native)
    with SessionLocal.begin() as db:
        row=db.get(CRMBridgeRequest,invoice['id'])
        row.receipt=invoice_receipt(json.loads(row.raw_body));row.status='invoice_created'
    issue={'invoice_request_id':invoice['id'],'payer_id':71,'billing_type':kind,'provider':provider}
    if provider == 'banco_brasil':
        issue['bb_title']=TITLE
    issued=api.post('/crm-bridge/charges',issue,202)
    command='/crm-bridge/charges/'+issued['id']+'/'
    calls=[]
    def transport(cfg,event_id,raw,**kwargs):
        event=json.loads(raw);action=event['event_type'].split('.')[1];calls.append(action)
        proof=bb_receipt(event,action) if provider == 'banco_brasil' else receipt(event,action)
        if action=='instruments':
            proof['instrument']=({'billing_type':kind,'payload':'PIX-TEST-CODE-EXISTING-TITLE',
                                  'expiration_date':(now()+timedelta(days=2)).strftime('%Y-%m-%d %H:%M:%S')}
                                 if kind=='PIX' else {'billing_type':kind,'identification_field':'1'*47,
                                                      'bar_code':'2'*44,'nosso_numero':'12345'})
        return proof
    monkeypatch.setattr(bridge,'send_request',transport)
    assert external.process_one()
    assert not api.client.get(base,headers=headers).json()['items'][0]['has_payment_documents']
    api.post(command+'instruments',{},200)
    with SessionLocal.begin() as db:
        # Simula o recibo de uma instalação anterior, que ainda não possuía essa coluna.
        db.get(CRMBridgeExternalRequest,issued['id']).payment_instrument = None
    api.post(command+'status',{},200) # consulta seguinte não deve apagar o instrumento já validado
    page=api.client.get(base,headers=headers).json()
    item=page['items'][0]
    assert page['total']==1 and page['overdue_count']==1
    assert item['collection_mode']=='manual' and item['payment_source']=='crm' and item['external_payment_status']=='open'
    assert item['billing_type']==kind and item['has_payment_documents']
    documents=api.client.get(path,headers=headers).json()
    expected={'pix_copy_paste','pix_expires_at'} if kind=='PIX' else {'identification_field','bar_code'}
    assert set(documents)==expected|{'source','billing_type'}
    assert documents['source']=='crm' and documents['billing_type']==kind
    assert calls==['issue','instruments','status']
    def unavailable(*args,**kwargs):
        raise bridge.DeliveryError('CRM_NETWORK_ERROR',True)
    monkeypatch.setattr(bridge,'send_request',unavailable)
    api.post(command+'status',{},200)
    unconfirmed=api.client.get(base,headers=headers).json()
    assert not unconfirmed['items'][0]['has_payment_documents'] and unconfirmed['overdue_count']==0
    assert unconfirmed['items'][0]['external_payment_status']=='unavailable'
    monkeypatch.setattr(bridge,'send_request',transport)
    api.post(command+'reconcile',{'proof_id':9},200)
    after=api.client.get(base,headers=headers).json()
    assert after['overdue_count']==0 and after['items'][0]['external_payment_status']=='settled'
    assert after['items'][0]['status']=='overdue' and not after['items'][0]['has_payment_documents']
    assert api.client.get(path,headers=headers).json()=={'source':'crm','billing_type':kind}
    assert calls==['issue','instruments','status','reconcile']
