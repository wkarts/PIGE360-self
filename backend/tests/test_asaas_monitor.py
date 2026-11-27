"""Conciliação, eventos e estornos através das rotas nativas da escola."""
from uuid import uuid4

from app import asaas_monitor
from app.db import SessionLocal
from app import models as m
from test_online import online, bank, charge, draft, submit, provider_mock, run_issue

BASE = '/banking/asaas/monitor'


def test_monitor_compares_identity_and_schedules_one_read(online, monkeypatch):
    api = online['api']
    bank(online)
    ticket = charge(online, submit(online, draft(online)), billing_type='PIX')
    _, data = provider_mock(monkeypatch)
    row, _ = run_issue(ticket)
    assert api.get(BASE + '?section=charges&q=' + ticket['id'])['items'][0]['charge_id'] == ticket['id']
    path = BASE + '/charges/' + ticket['id'] + '/compare'
    assert api.get(path)['match']
    data['payments'][row.remote_payment_id]['customer'] = 'outro_pagador'
    assert not api.get(path)['match']
    selection = {'charge_ids': [ticket['id'], ticket['id']]}
    assert api.post(BASE + '/reconcile', selection, 200)['queued'] == 1
    api.call('GET', BASE + '?start=2026-01-01', expect=422)
    api.call('GET', BASE + '?start=2026-12-31&end=2026-01-01', expect=422)


def test_refund_accounts_for_pending_and_replays_confirmed_command(online, monkeypatch):
    api = online['api']
    bank(online)
    ticket = charge(online, submit(online, draft(online)), billing_type='PIX')
    _, store = provider_mock(monkeypatch, status='RECEIVED')
    issued, _ = run_issue(ticket)
    payment = store['payments'][issued.remote_payment_id]
    sent = []
    def read(conn, path, **options):
        if path.endswith('/refunds'):
            return {'data':[{'status':'PENDING','value':'90.00'}], 'hasMore':False, 'totalCount':1}
        return payment
    def send(conn, method, path, *, payload):
        assert method == 'POST' and path == '/payments/'+issued.remote_payment_id+'/refund'
        sent.append(payload)
        return payment
    monkeypatch.setattr(asaas_monitor, 'asaas_read', read)
    monkeypatch.setattr(asaas_monitor, 'asaas_request', send)
    endpoint = BASE + '/charges/' + ticket['id'] + '/refund'
    task = {'client_key':str(uuid4()), 'amount':'75.00', 'description':'Ajuste solicitado pelo responsável'}
    api.post(endpoint, task, 409)
    assert not sent
    task['amount'] = '25.00'
    first = api.post(endpoint, task, 200)
    assert api.post(endpoint, {**task, 'amount':'25.0'}, 200)['id'] == first['id']
    assert len(sent) == 1
    api.post(endpoint, {**task, 'amount':'10.00'}, 409)


def test_native_webhook_validates_and_deduplicates(online):
    api = online['api']
    conn = bank(online)
    endpoint = '/api/v1/hooks/asaas/' + conn['id']
    headers = {'asaas-access-token':'test-only-webhook-token-000000000000000'}
    event = {'event':'PIX_AUTOMATIC_RECURRING_ELIGIBILITY_UPDATED','id':'evt-pix-demo','eligibility':{'status':'ELIGIBLE'}}
    assert api.client.post(endpoint,json=event).status_code == 401
    assert api.client.post(endpoint,headers=headers,json=event).json()['status'] == 'native_observed'
    assert api.client.post(endpoint,headers=headers,json=event).json()['duplicate']
    assert api.client.post(endpoint,headers=headers,json={**event,'eligibility':{'status':'INELIGIBLE'}}).status_code == 409
    assert api.client.post(endpoint,headers=headers,json={'event':'CHECKOUT_PAID','id':'evt-other','checkout':[]}).status_code == 400
    with SessionLocal() as db:
        assert db.get(m.IntegrationConnection,conn['id']).config['pix_auto_eligibility'] == 'ELIGIBLE'
    result = api.get(BASE + '?section=webhooks')
    assert result['total'] == 1 and result['items'][0]['label'] == event['event']


def test_recovery_needs_both_customer_reference_and_document():
    from types import SimpleNamespace
    import pytest
    from app.integration_core import IntegrationFailure
    from app.integration_worker import customer_reference, verify_recovered_customer
    charge = SimpleNamespace(remote_customer_id=None, school_id='school-1', payer_snapshot={'cpf':'52998224725'})
    customer = {'id':'cus_test','cpfCnpj':'11111111111','externalReference':customer_reference(charge)}
    provider = SimpleNamespace(find=lambda resource,reference:customer)
    with pytest.raises(IntegrationFailure):
        verify_recovered_customer(provider,charge,{'customer':'cus_test'})
    assert charge.remote_customer_id is None
    customer['cpfCnpj'] = '529.982.247-25'
    verify_recovered_customer(provider,charge,{'customer':'cus_test'})
    assert charge.remote_customer_id == 'cus_test'
