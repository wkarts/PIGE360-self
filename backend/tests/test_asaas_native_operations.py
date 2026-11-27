"""Idempotência financeira e isolamento. Nenhuma requisição é enviada a um banco."""
from datetime import date
from decimal import Decimal
import json
from unittest.mock import Mock

import pytest
from fastapi import HTTPException
from sqlalchemy import select

from app import models as m
from app import asaas_native as native
from app.db import SessionLocal, uid
from app.integration_core import IntegrationFailure


def connection(api):
    return api.post('/integrations/asaas', {'enabled': True, 'api_key': 'synthetic-key',
                    'webhook_token': 'synthetic-webhook-test-key-00000000000', 'config': {}}, 200)


def context(db, api):
    school = db.get(m.School, api.school['id'])
    user = db.scalar(select(m.User).where(m.User.email == 'admin@example.com'))
    return school, user, native.asaas_connection(db, school)


def test_journal_replay_different_payload_and_school_scope(api, client, admin):
    cfg = connection(api)
    key = uid()
    secret = 'synthetic-sensitive-not-in-journal'
    execute = Mock(return_value={'id':'check_test', 'status':'ACTIVE', 'customer':secret,
                                'encodedImage':secret, 'creditCard':{'creditCardToken':secret}})
    with SessionLocal() as db:
        school, user, conn = context(db, api)
        args = dict(client_key=key, kind='checkout', fingerprint_data={'name':secret, 'amount':Decimal('1.00')},
                    execute=execute)
        row = native.run_asaas_operation(db, school, user, conn, **args)
        assert native.run_asaas_operation(db, school, user, conn, **args).id == row.id
        assert row.response == {'id':'check_test','status':'ACTIVE'}
        assert secret not in json.dumps(native.operation_output(row), default=str)
        assert secret not in row.fingerprint and len(row.fingerprint)==64
        with pytest.raises(HTTPException) as duplicate:
            native.run_asaas_operation(db,school,user,conn,**{**args,'fingerprint_data':{'amount':'2.00'}})
        assert duplicate.value.status_code == 409 and execute.call_count == 1
        ident = row.id
    assert api.get('/banking/asaas/operations/'+ident)['remote_id']=='check_test'
    other = client.post('/api/v1/schools',headers=admin,
                        json={'company_id':api.school['company_id'],'name':'Outra escola '+uid()}).json()
    assert client.get('/api/v1/schools/'+other['id']+'/banking/asaas/operations/'+ident,headers=admin).status_code==404
    with SessionLocal() as db, pytest.raises(HTTPException):
        native.asaas_connection(db,other['id'],cfg['id'])
    updated = api.client.post(api.base+'/integrations/asaas',headers=admin,
                              json={'enabled':True,'environment':'production','version':cfg['version']})
    assert updated.status_code==409


def test_timeout_conflicting_channel_and_proven_recovery(api):
    connection(api)
    with SessionLocal() as db:
        school, user, conn = context(db, api)
        charge = m.BankCharge(school_id=school.id, collection_mode='manual', payer_snapshot={},
                              description='Mensalidade de teste', amount=Decimal('10.00'), due_on=date.today(),
                              billing_type='BOLETO', external_reference=uid(), client_key=uid(),
                              status='pending', created_by=user.id)
        db.add(charge);db.commit()
        send = Mock(side_effect=IntegrationFailure('PROVIDER_TIMEOUT', uncertain=True))
        data = dict(client_key=uid(),kind='card_checkout',charge_id=charge.id,issuance_channel='card',
                    execute=send,fingerprint_data={'amount':'10.00'})
        for attempt in range(2):
            with pytest.raises(HTTPException):
                native.run_asaas_operation(db,school,user,conn,**data)
        op = db.scalar(select(m.AsaasNativeOperation).where(m.AsaasNativeOperation.client_key==data['client_key']))
        assert op.status=='uncertain' and op.error_code=='PROVIDER_TIMEOUT' and send.call_count==1
        for channel in ('card','pix_auto','manual','crm'):
            with pytest.raises(HTTPException):
                native.lock_issuance_channel(db,school.id,charge.id,channel)
        with pytest.raises(HTTPException):
            native.reconcile_asaas_operation(db,school,user,op.id,verify=lambda row: None)
        proof = Mock(return_value={'id':'check_proven','status':'ACTIVE','phone':'discard'})
        native.reconcile_asaas_operation(db,school,user,op.id,verify=proof)
        assert native.reconcile_asaas_operation(db,school,user,op.id,verify=proof).status=='completed'
        assert proof.call_count==1 and op.response=={'id':'check_proven','status':'ACTIVE'} and send.call_count==1


def test_local_validation_and_uncertain_mutations_do_not_emit(api):
    connection(api)
    with SessionLocal() as db:
        school, user, conn = context(db, api)
        charge = m.BankCharge(school_id=school.id,collection_mode='manual',payer_snapshot={},status='pending',
                 description='Teste',amount=Decimal('20'),due_on=date.today(),billing_type='PIX',
                 external_reference=uid(),client_key=uid(),created_by=user.id)
        db.add(charge);db.commit()
        execute = Mock(side_effect=IntegrationFailure('PROVIDER_HTTP_503',uncertain=True))
        args = dict(charge_id=charge.id,client_key=uid(),kind='adjust',fingerprint_data={'value':4},execute=execute)
        with pytest.raises(HTTPException):
            native.run_asaas_operation(db,school,user,conn,preflight=Mock(side_effect=HTTPException(422)),**args)
        assert db.scalar(select(m.AsaasNativeOperation.id).where(m.AsaasNativeOperation.charge_id==charge.id)) is None
        with pytest.raises(HTTPException):
            native.run_asaas_operation(db,school,user,conn,**args)
        for kind in ('adjust','cash_receipt','reactivate','refund'):
            with pytest.raises(HTTPException):
                native.run_asaas_operation(db,school,user,conn,**{**args,'kind':kind,'client_key':uid()})
        assert execute.call_count==1


def test_native_transport_reuses_bound_connection_and_safe_error_codes(api, monkeypatch):
    connection(api)
    with SessionLocal() as db:
        _, _, conn = context(db, api)
        target = Mock(return_value={'data':[], 'hasMore':False, 'totalCount':0})
        monkeypatch.setattr('app.integration_core.call_json', target)
        assert native.asaas_read(conn, '/chargebacks/', params={'limit':20})['hasMore'] is False
        target.assert_called_once_with('asaas','https://api-sandbox.asaas.com/v3','/chargebacks/',
                                       method='GET',api_key='synthetic-key',data=None,params={'limit':20})
        for path in ('https://example.com/', '//example.com', '/v3/payments','/payments?id=1'):
            with pytest.raises(IntegrationFailure):
                native.asaas_request(conn, 'GET', path)
        assert target.call_count==1
