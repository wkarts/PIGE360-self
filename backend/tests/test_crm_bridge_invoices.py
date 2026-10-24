"""Invoice v2 proofs using real PIGE API/DB and synthetic CRM transport only."""
import copy
import json
import pytest
from sqlalchemy import select
from app import crm_bridge as bridge, models as m
from app.crm_bridge_contract import ContractError
from app.crm_bridge_invoice_contract import INVOICE_PATH, INVOICE_STATUS_PATH, validate_invoice_receipt
from app.crm_bridge_models import CRMBridgeRequest
from app.db import SessionLocal
from test_crm_bridge import configured, charge, isolated_bridge_journal


def receipt(event, invoice=31):
    return {'schema_version':2,'event_id':event['event_id'],'charge_id':event['data']['charge_id'],
        'request_id':'req_'+'a'*32,'scope':event['scope'],'status':'invoice_created' if invoice else 'pending',
        'invoice_id':invoice,'capabilities':{'issue_charge':False},'payment_effect_applied':False,'academic_effect_applied':False}


def queue(api, native, client=71):
    return api.post('/crm-bridge/invoices', {'connection_id':'test','charge_id':native['id'],'client_id':client},202)


def test_invoice_queue_client_immutable_retry_and_native_unchanged(api,monkeypatch):
    configured(api,monkeypatch); native=charge(api); row=queue(api,native)
    assert queue(api,native)['id']==row['id']
    api.post('/crm-bridge/invoices',{'connection_id':'test','charge_id':native['id'],'client_id':72},409)
    calls=[]
    def fake(config,event_id,raw,**kw):
        calls.append((raw,kw['path'])); event=json.loads(raw)
        assert event['data']['client_id']==71
        if len(calls)==1:raise bridge.DeliveryError('CRM_NETWORK_ERROR',True)
        return receipt(event)
    monkeypatch.setattr(bridge,'send_request',fake)
    assert bridge.process_one()
    api.post('/crm-bridge/requests/'+row['id']+'/reconcile',{},202)
    assert bridge.process_one() and calls[0]==calls[1] and calls[0][1]==INVOICE_PATH
    output=api.call('GET','/crm-bridge/requests/'+row['id'])
    assert output['status']=='invoice_created' and output['receipt']['invoice_id']==31
    assert output['financial_effect_applied'] is False
    with SessionLocal() as db:
        assert db.get(m.BankCharge,native['id']).status==native['status']


def test_status_explicit_get_no_transport_and_timeout_no_retry(api,monkeypatch):
    configured(api,monkeypatch); native=charge(api); row=queue(api,native); calls=[]
    def fake(config,event_id,raw,**kw):
        calls.append(kw['path']); event=json.loads(raw)
        assert set(event['data'])=={'charge_id'} and kw['path']==INVOICE_STATUS_PATH
        return receipt(event)
    monkeypatch.setattr(bridge,'send_request',fake)
    api.call('GET','/crm-bridge/requests/'+row['id']); assert calls==[]
    output=api.post('/crm-bridge/requests/'+row['id']+'/invoice-status',{},200)
    assert output['status']=='invoice_created' and calls==[INVOICE_STATUS_PATH]
    def timeout(*a,**k):raise bridge.DeliveryError('CRM_NETWORK_ERROR',True)
    monkeypatch.setattr(bridge,'send_request',timeout)
    api.post('/crm-bridge/requests/'+row['id']+'/invoice-status',{},502)
    output=api.call('GET','/crm-bridge/requests/'+row['id'])
    assert output['status']=='invoice_created' and output['attempts']==0
    with SessionLocal() as db: assert db.get(m.BankCharge,native['id']).status==native['status']


@pytest.mark.parametrize('field,value',[('payment_effect_applied',True),('academic_effect_applied',True),('invoice_id',True),('status','paid'),('schema_version',True),('request_id','anything')])
def test_receipt_does_not_claim_external_or_academic_effect(field,value):
    event={'event_id':'fake','scope':{},'data':{'charge_id':'fake'}}
    result=receipt(event);result[field]=value
    with pytest.raises(ContractError):validate_invoice_receipt(result,event)


def test_invalid_client_master_off_and_foreign_receipt(api,monkeypatch):
    configured(api,monkeypatch); native=charge(api)
    for client in [True,0,-1,'71',2147483648]:
        api.post('/crm-bridge/invoices',{'connection_id':'test','charge_id':native['id'],'client_id':client},422)
    row=queue(api,native)
    def fake(config,event_id,raw,**kw):
        event=json.loads(raw); result=receipt(event);result['scope']=dict(event['scope'],issuer_id='9');return result
    monkeypatch.setattr(bridge,'send_request',fake)
    assert bridge.process_one()
    assert api.call('GET','/crm-bridge/requests/'+row['id'])['status']=='failed'


@pytest.mark.parametrize('path',[INVOICE_PATH,INVOICE_STATUS_PATH])
def test_invoice_transport_hmac_path_pinning(path,monkeypatch):
    import httpx,uuid
    from app.crm_bridge_contract import encode,signature
    event={'schema_version':2,'event_id':str(uuid.uuid4()),'scope':{'school_id':str(uuid.uuid4()),'issuer_id':'7','account_id':'fixture','environment':'sandbox'},'data':{'charge_id':str(uuid.uuid4())}}
    config={'base_url':'https://crm.example.test','scope':event['scope'],'secret':'synthetic-invoice-secret-only-000000000000'}
    raw=encode(event);original=httpx.Client
    def handler(request):
        assert request.url.host=='8.8.8.8' and request.url.path==path and request.method=='POST'
        assert request.extensions['sni_hostname']=='crm.example.test'
        assert request.headers['X-Pige-Signature']==signature(config['secret'],request.headers['X-Pige-Timestamp'],event['event_id'],path,raw)
        return httpx.Response(200,json=receipt(event))
    monkeypatch.setattr(bridge.socket,'getaddrinfo',lambda *a,**kw:[(2,1,6,'',('8.8.8.8',443))])
    monkeypatch.setattr(bridge.httpx,'Client',lambda **kw:original(transport=httpx.MockTransport(handler),**kw))
    assert bridge.send_request(config,event['event_id'],raw,path=path,validator=lambda value:validate_invoice_receipt(value,event))['invoice_id']==31


def test_master_gate_blocks_invoice_commands_without_transport(api,monkeypatch):
    from app.config import settings
    configured(api,monkeypatch); native=charge(api); row=queue(api,native)
    monkeypatch.setattr(settings(),'crm_bridge_enabled',False)
    def forbidden(*args,**kwargs):raise AssertionError('transport invoked with master disabled')
    monkeypatch.setattr(bridge,'send_request',forbidden)
    api.post('/crm-bridge/requests/'+row['id']+'/invoice-status',{},409)
    api.post('/crm-bridge/invoices',{'connection_id':'test','charge_id':native['id'],'client_id':71},409)
    assert bridge.process_one() is False
