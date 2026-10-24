"""PIGE BB bridge contracts: actual local API/DB, synthetic CRM transport only."""
import json
import pytest
from app import crm_bridge as bridge,crm_bridge_external as external,models as m
from app.crm_bridge_charge_contract import envelope,validate_receipt
from app.crm_bridge_contract import ContractError
from app.crm_bridge_models import CRMBridgeRequest,CRMBridgeExternalRequest
from app.db import SessionLocal
from test_crm_bridge import configured,charge
from test_crm_bridge_external import clean_external,receipt
from test_crm_bridge_invoices import queue as queue_invoice,receipt as invoice_receipt

TITLE={'payer_address':'Synthetic street 1','payer_district':'Synthetic district','payer_zip':'00000000','payer_city':'Synthetic city','payer_state':'SP','species':'02','acceptance':'N'}


def prepared(api,monkeypatch):
    configured(api,monkeypatch);native=charge(api);invoice=queue_invoice(api,native)
    with SessionLocal() as db:
        row=db.get(CRMBridgeRequest,invoice['id']);row.receipt=invoice_receipt(json.loads(row.raw_body));row.status='invoice_created';db.commit()
    payload={'invoice_request_id':invoice['id'],'payer_id':71,'billing_type':'BOLETO','provider':'banco_brasil','bb_title':dict(TITLE)}
    return native,invoice,payload


def bb_receipt(event,action='issue'):
    value=receipt(event,action);value.update(provider='banco_brasil',status='api_settlement_observed' if action=='reconcile' else 'api_registered',remote_id='000123456700000000001')
    return value


def test_bb_issue_title_is_immutable_and_provider_not_transmitted(api,monkeypatch):
    native,invoice,payload=prepared(api,monkeypatch);row=api.post('/crm-bridge/charges',payload,202);calls=[]
    def transport(cfg,event_id,raw,**kw):
        event=json.loads(raw);calls.append(event);assert 'provider' not in event['data'];assert event['data']['bb_title']==TITLE
        return bb_receipt(event)
    monkeypatch.setattr(bridge,'send_request',transport)
    assert external.process_one() and not external.process_one()
    result=api.call('GET','/crm-bridge/charges/'+row['id']);assert result['provider']=='banco_brasil' and result['receipt']['status']=='api_registered'
    duplicate=api.post('/crm-bridge/charges',payload,202);assert duplicate['id']==row['id'] and len(calls)==1
    payload['bb_title']['payer_address']='Different address';api.post('/crm-bridge/charges',payload,409)
    with SessionLocal() as db:assert db.get(m.BankCharge,native['id']).status==native['status']


@pytest.mark.parametrize('change',[
    {'bb_title':None},{'billing_type':'PIX'},{'payer_id':72},{'provider':'asaas'},
    {'bb_title':{**TITLE,'species':''}},{'bb_title':{**TITLE,'acceptance':''}},
    {'bb_title':{**TITLE,'interest':'1.00'}},{'bb_title':{**TITLE,'payer_zip':'123'}},
])
def test_bb_missing_or_unapproved_parameters_never_queue(api,monkeypatch,change):
    native,invoice,payload=prepared(api,monkeypatch);payload.update(change)
    api.post('/crm-bridge/charges',payload,422)
    assert api.call('GET','/crm-bridge/charges')['items']==[]


def test_bb_sync_uses_only_original_number_and_no_pige_settlement(api,monkeypatch):
    native,invoice,payload=prepared(api,monkeypatch);row=api.post('/crm-bridge/charges',payload,202);calls=[]
    def transport(cfg,event_id,raw,**kw):
        event=json.loads(raw);action=event['event_type'].split('.')[1];calls.append(action)
        if action=='sync':assert event['data']['recovery_id']==''
        return bb_receipt(event,action)
    monkeypatch.setattr(bridge,'send_request',transport);external.process_one()
    api.post('/crm-bridge/charges/'+row['id']+'/sync',{'recovery_id':'alternate_number'},422)
    assert calls==['issue']
    result=api.post('/crm-bridge/charges/'+row['id']+'/sync',{'recovery_id':''},200);assert result['last_command']['status']=='confirmed'
    result=api.post('/crm-bridge/charges/'+row['id']+'/reconcile',{'proof_id':9},200)
    assert result['receipt']['payment_id']==31 and not result['native_payment_effect_applied'] and not result['academic_effect_applied']
    with SessionLocal() as db:assert db.get(m.BankCharge,native['id']).status==native['status']


def test_bb_wrong_provider_or_unrecognized_state_is_unconfirmed(api,monkeypatch):
    native,invoice,payload=prepared(api,monkeypatch);row=api.post('/crm-bridge/charges',payload,202)
    monkeypatch.setattr(bridge,'send_request',lambda cfg,event_id,raw,**kw:receipt(json.loads(raw)))
    external.process_one();assert api.call('GET','/crm-bridge/charges/'+row['id'])['status']=='uncertain'
    def wrong(cfg,event_id,raw,**kw):
        result=bb_receipt(json.loads(raw));result['status']='automatic_payment_done';return result
    monkeypatch.setattr(bridge,'send_request',wrong)
    result=api.post('/crm-bridge/charges/'+row['id']+'/status',{},200);assert result['last_command']['status']=='unconfirmed'
    assert not external.process_one()


def test_confirmed_bb_origin_cannot_change_provider_on_later_status(api,monkeypatch):
    native,invoice,payload=prepared(api,monkeypatch);row=api.post('/crm-bridge/charges',payload,202)
    monkeypatch.setattr(bridge,'send_request',lambda cfg,event_id,raw,**kw:bb_receipt(json.loads(raw)));external.process_one()
    monkeypatch.setattr(bridge,'send_request',lambda cfg,event_id,raw,**kw:receipt(json.loads(raw)))
    result=api.post('/crm-bridge/charges/'+row['id']+'/status',{},200)
    assert result['last_command']['status']=='unconfirmed' and result['receipt']['provider']=='banco_brasil'
    assert not external.process_one()
