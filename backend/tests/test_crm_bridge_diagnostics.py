"""Fresh diagnostics and master-switch regression evidence; synthetic transport only."""
import copy
import json
import uuid
import httpx
import pytest
from sqlalchemy import select,func
from app import crm_bridge as bridge
from app.config import settings
from app.crm_bridge_contract import (DIAGNOSTIC_PATH,REQUEST_PATH,ContractError,diagnostic_envelope,validate_diagnostic,encode,signature)
from app.crm_bridge_models import CRMBridgeRequest
from app.db import SessionLocal

SECRET='synthetic-diagnostic-secret-not-production-000001'

def scope(school):
 return {'school_id':school,'issuer_id':'7','account_id':'synthetic-wallet','environment':'sandbox'}
def response(event):
 return {'schema_version':1,'event_id':event['event_id'],'nonce':event['data']['nonce'],'scope':event['scope'],'status':'authenticated','capabilities':{'create_invoice':False,'issue_charge':False},'payment_effect_applied':False,'academic_effect_applied':False}

def test_master_switch_stops_before_database_and_key_access(monkeypatch):
 monkeypatch.setattr(settings(),'crm_bridge_enabled',False)
 monkeypatch.setattr(settings(),'crm_bridge_connections','{broken')
 class Forbidden:
  def scalars(self,*a,**kw):raise AssertionError('master off read database')
 assert bridge.connections(Forbidden())=={}

def test_diagnostic_contract_rejects_mismatches_and_financial_effects():
 event=diagnostic_envelope(scope(str(uuid.uuid4())),str(uuid.uuid4()),str(uuid.uuid4()))
 assert validate_diagnostic(response(event),event)['status']=='authenticated'
 for field,value in [('nonce',str(uuid.uuid4())),('event_id',str(uuid.uuid4())),('payment_effect_applied',True),('academic_effect_applied',True),('schema_version',True)]:
  bad=response(event);bad[field]=value
  with pytest.raises(ContractError):validate_diagnostic(bad,event)
 bad=response(event);bad['scope']=dict(event['scope'],issuer_id='8')
 with pytest.raises(ContractError):validate_diagnostic(bad,event)
 bad=response(event);bad['secret']='never-output'
 with pytest.raises(ContractError):validate_diagnostic(bad,event)

def test_diagnostic_transport_is_pinned_post_path_signed(monkeypatch):
 cfg={'scope':scope(str(uuid.uuid4())),'secret':SECRET,'base_url':'https://crm.example.test'}
 event=diagnostic_envelope(cfg['scope'],str(uuid.uuid4()),str(uuid.uuid4()));raw=encode(event)
 original=httpx.Client;calls=[]
 def handler(request):
  calls.append(request)
  assert request.method=='POST' and request.url.path==DIAGNOSTIC_PATH
  assert request.url.host=='8.8.8.8' and request.headers['Host']=='crm.example.test'
  assert request.extensions['sni_hostname']=='crm.example.test'
  assert request.headers['X-Pige-Signature']==signature(SECRET,request.headers['X-Pige-Timestamp'],event['event_id'],DIAGNOSTIC_PATH,raw)
  assert request.headers['X-Pige-Signature']!=signature(SECRET,request.headers['X-Pige-Timestamp'],event['event_id'],REQUEST_PATH,raw)
  return httpx.Response(200,json=response(event))
 monkeypatch.setattr(bridge.socket,'getaddrinfo',lambda *a,**k:[(2,1,6,'',('8.8.8.8',443))])
 monkeypatch.setattr(bridge.httpx,'Client',lambda **kw:original(transport=httpx.MockTransport(handler),**kw))
 assert bridge.send_request(cfg,event['event_id'],raw,path=DIAGNOSTIC_PATH,validator=lambda v:validate_diagnostic(v,event))['status']=='authenticated'
 assert len(calls)==1

def test_configuration_diagnostic_never_enqueues_finance(api,monkeypatch):
 monkeypatch.setattr(settings(),'crm_bridge_enabled',True);monkeypatch.setattr(settings(),'crm_bridge_connections','{}')
 api.call('PUT','/crm-bridge/configuration',{'enabled':True,'base_url':'https://crm.example.test','issuer_id':'7','account_id':'synthetic-wallet','environment':'sandbox','secret':SECRET})
 def fake(config,event_id,raw,**kwargs):
  assert kwargs['path']==DIAGNOSTIC_PATH
  event=json.loads(raw);assert event['scope']['school_id']==api.school['id']
  return kwargs['validator'](response(event))
 monkeypatch.setattr(bridge,'send_request',fake)
 with SessionLocal() as db:before=db.scalar(select(func.count()).select_from(CRMBridgeRequest))
 answer=api.call('POST','/crm-bridge/connection-test')
 assert answer['authenticated'] is True and answer['charge_created'] is False
 with SessionLocal() as db:assert db.scalar(select(func.count()).select_from(CRMBridgeRequest))==before
 monkeypatch.setattr(settings(),'crm_bridge_enabled',False)
 api.call('POST','/crm-bridge/connection-test',expect=409)
