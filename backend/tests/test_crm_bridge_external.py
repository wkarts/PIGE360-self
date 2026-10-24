"""Real local API/DB, mocked CRM transport, no financial-provider calls."""
import json
import pytest
from sqlalchemy import select,delete
from app import crm_bridge as bridge,crm_bridge_external as external,models as m
from app.crm_bridge_charge_contract import PATHS,validate_receipt
from app.crm_bridge_contract import ContractError
from app.crm_bridge_models import CRMBridgeExternalRequest,CRMBridgeRequest
from app.db import SessionLocal
from test_crm_bridge import configured,charge
from test_crm_bridge_invoices import queue as queue_invoice,receipt as invoice_receipt

@pytest.fixture(autouse=True)
def clean_external(client):
    with SessionLocal() as db:db.execute(delete(CRMBridgeExternalRequest));db.commit()
    yield
    with SessionLocal() as db:db.execute(delete(CRMBridgeExternalRequest));db.commit()


def receipt(event,action='issue'):
    return {'schema_version':3,'event_id':event['event_id'],'charge_id':event['data']['charge_id'],'request_id':'req_'+'c'*32,'scope':event['scope'],'provider':'asaas','status':'issued','origin_id':7,'remote_id':'pay_fixture','proof_id':9,'reconciliation_status':'reconciled' if action=='reconcile' else 'not_reconciled','payment_id':31 if action=='reconcile' else None,'instrument':None,'payment_effect_applied':action=='reconcile','academic_effect_applied':False}


def setup(api,monkeypatch):
    configured(api,monkeypatch);native=charge(api);invoice=queue_invoice(api,native)
    with SessionLocal() as db:
        row=db.get(CRMBridgeRequest,invoice['id']);row.receipt=invoice_receipt(json.loads(row.raw_body));row.status='invoice_created';db.commit()
    result=api.post('/crm-bridge/charges',{'invoice_request_id':invoice['id'],'payer_id':81,'billing_type':'PIX'},202)
    return native,invoice,result


def test_external_issue_separate_journal_once_and_no_native_effect(api,monkeypatch):
    native,invoice,row=setup(api,monkeypatch);calls=[]
    def transport(cfg,event_id,raw,**kw):
        calls.append(kw['path']);return receipt(json.loads(raw))
    monkeypatch.setattr(bridge,'send_request',transport)
    assert external.process_one() and not external.process_one()
    assert calls==[PATHS['issue']]
    duplicate=api.post('/crm-bridge/charges',{'invoice_request_id':invoice['id'],'payer_id':81,'billing_type':'PIX'},202)
    assert duplicate['id']==row['id'] and not external.process_one()
    api.post('/crm-bridge/charges',{'invoice_request_id':invoice['id'],'payer_id':82,'billing_type':'PIX'},409)
    with SessionLocal() as db:assert db.get(m.BankCharge,native['id']).status==native['status']


def test_uncertain_issue_never_retried_gets_never_call_http(api,monkeypatch):
    native,invoice,row=setup(api,monkeypatch);calls=[]
    def timeout(*a,**kw):calls.append(kw['path']);raise bridge.DeliveryError('CRM_NETWORK_ERROR',True)
    monkeypatch.setattr(bridge,'send_request',timeout)
    assert external.process_one() and not external.process_one()
    assert api.call('GET','/crm-bridge/charges/'+row['id'])['status']=='uncertain'
    api.call('GET','/crm-bridge/charges');assert calls==[PATHS['issue']]
    for action,data in [('status',{}),('sync',{'recovery_id':''}),('instruments',{})]:
        response=api.post('/crm-bridge/charges/'+row['id']+'/'+action,data,200)
        assert response['last_command']['status']=='unconfirmed'
        assert not external.process_one()
    assert calls==[PATHS['issue'],PATHS['status'],PATHS['sync'],PATHS['instruments']]


def test_explicit_reconcile_only_crm_payment_no_pige_or_academic(api,monkeypatch):
    native,invoice,row=setup(api,monkeypatch);calls=[]
    def transport(cfg,event_id,raw,**kw):
        event=json.loads(raw);action=event['event_type'].split('.')[1];calls.append(action);return receipt(event,action)
    monkeypatch.setattr(bridge,'send_request',transport);external.process_one()
    api.post('/crm-bridge/charges/'+row['id']+'/reconcile',{'proof_id':8},409)
    result=api.post('/crm-bridge/charges/'+row['id']+'/reconcile',{'proof_id':9},200)
    assert result['receipt']['payment_effect_applied'] is True and result['receipt']['payment_id']==31
    assert result['native_payment_effect_applied'] is False and result['academic_effect_applied'] is False
    assert calls==['issue','reconcile'] and not external.process_one()
    with SessionLocal() as db:assert db.get(m.BankCharge,native['id']).status==native['status']


def test_command_fields_and_payment_effect_fail_closed(api,monkeypatch):
    native,invoice,row=setup(api,monkeypatch)
    def wrong(cfg,event_id,raw,**kw):return receipt(json.loads(raw),'reconcile')
    monkeypatch.setattr(bridge,'send_request',wrong);external.process_one()
    assert api.call('GET','/crm-bridge/charges/'+row['id'])['status']=='uncertain'
    api.post('/crm-bridge/charges/'+row['id']+'/issue',{},404)
    api.post('/crm-bridge/charges/'+row['id']+'/sync',{},422)
    api.post('/crm-bridge/charges/'+row['id']+'/status',{'proof_id':9},422)
    api.post('/crm-bridge/charges/'+row['id']+'/reconcile',{'proof_id':True},422)


def test_master_scope_and_cross_school_deny_without_http(api,monkeypatch):
    from app.config import settings
    from conftest import API
    native,invoice,row=setup(api,monkeypatch)
    def forbidden(*a,**kw):raise AssertionError('unexpected HTTP')
    monkeypatch.setattr(bridge,'send_request',forbidden)
    monkeypatch.setattr(settings(),'crm_bridge_enabled',False)
    assert external.process_one() is False
    api.post('/crm-bridge/charges',{'invoice_request_id':invoice['id'],'payer_id':81,'billing_type':'PIX'},409)
    companies=api.client.get('/api/v1/companies',headers=api.headers).json()
    other=api.client.post('/api/v1/schools',headers=api.headers,json={'company_id':companies[0]['id'],'name':'Outra externa'}).json()
    other_api=API(api.client,api.headers,other)
    other_api.call('GET','/crm-bridge/charges/'+row['id'],expect=404)
    other_api.post('/crm-bridge/charges/'+row['id']+'/status',{},404)


def test_durable_sending_checkpoint_survives_crash_without_retry(api,monkeypatch):
    native,invoice,row=setup(api,monkeypatch)
    class Crash(BaseException):pass
    def crash(*a,**kw):raise Crash()
    monkeypatch.setattr(bridge,'send_request',crash)
    with pytest.raises(Crash):external.process_one()
    assert api.call('GET','/crm-bridge/charges/'+row['id'])['status']=='sending'
    assert external.process_one() is False


def test_actual_migration56_preserves_invoice_journal(tmp_path):
    import importlib.util
    from pathlib import Path
    from sqlalchemy import create_engine,text,inspect
    from alembic.migration import MigrationContext
    from alembic.operations import Operations
    path=Path(__file__).parents[1]/'migrations/versions/0056_crm_bridge_external.py'
    spec=importlib.util.spec_from_file_location('bridge_migration56',path);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    engine=create_engine('sqlite:///'+str(tmp_path/'migration.db'))
    with engine.begin() as connection:
        for table in ('schools','bank_charges','crm_bridge_requests'):connection.execute(text('CREATE TABLE '+table+' (id varchar(36) PRIMARY KEY)'))
        connection.execute(text("INSERT INTO crm_bridge_requests(id) VALUES('synthetic-prior-v2')"))
        with Operations.context(MigrationContext.configure(connection)):module.upgrade()
        assert connection.execute(text('SELECT id FROM crm_bridge_requests')).scalars().all()==['synthetic-prior-v2']
        assert inspect(connection).has_table('crm_bridge_external_requests')
        assert len(inspect(connection).get_unique_constraints('crm_bridge_external_requests'))==2
        with pytest.raises(RuntimeError):module.downgrade()


@pytest.mark.parametrize('action',['issue','status','sync','instruments','reconcile'])
def test_v3_transport_is_signed_to_exact_explicit_path(action,monkeypatch):
    import uuid,httpx
    from app.crm_bridge_contract import encode,signature
    from app.crm_bridge_charge_contract import envelope
    scope={'school_id':str(uuid.uuid4()),'issuer_id':'7','account_id':'fixture-wallet','environment':'sandbox'}
    data={'charge_id':str(uuid.uuid4())}
    if action=='issue':data.update(payer_id=81,billing_type='PIX')
    if action=='sync':data['recovery_id']=''
    if action=='reconcile':data['proof_id']=9
    event=envelope(scope,str(uuid.uuid4()),action,data);raw=encode(event)
    cfg={'scope':scope,'secret':'synthetic-external-token-no-production-0001','base_url':'https://crm.example.test'};original=httpx.Client
    def handler(request):
        assert request.method=='POST' and request.url.path==PATHS[action] and request.url.host=='8.8.8.8'
        assert request.headers['X-Pige-Signature']==signature(cfg['secret'],request.headers['X-Pige-Timestamp'],event['event_id'],PATHS[action],raw)
        return httpx.Response(200,json=receipt(event,action))
    monkeypatch.setattr(bridge.socket,'getaddrinfo',lambda *a,**kw:[(2,1,6,'',('8.8.8.8',443))])
    monkeypatch.setattr(bridge.httpx,'Client',lambda **kw:original(transport=httpx.MockTransport(handler),**kw))
    assert bridge.send_request(cfg,event['event_id'],raw,path=PATHS[action],validator=lambda value:validate_receipt(value,event,action))['provider']=='asaas'
