"""Offline real API/DB tests: signed transport, durable receipts, no financial effect."""
import copy
import hashlib
import json
import time
import uuid
from pathlib import Path

import pytest
from sqlalchemy import delete, func, select

from app import crm_bridge as bridge, models as m
from app.config import settings
from app.crm_bridge_contract import (ContractError, decode, encode, signature, validate_envelope,
    validate_receipt, verify_signature)
from app.crm_bridge_models import CRMBridgeRequest, CRMBridgeObservation
from app.db import SessionLocal, now
from conftest import API
from test_manual_banking import context, payload

SECRET = 'synthetic-bridge-secret-not-a-real-credential-0001'


@pytest.fixture(autouse=True)
def isolated_bridge_journal(client):
    # The application test database is session-scoped; bridge queues are isolated per test.
    with SessionLocal() as db:
        db.execute(delete(CRMBridgeObservation)); db.execute(delete(CRMBridgeRequest)); db.commit()
    yield


def configured(api, monkeypatch):
    scope = {'school_id': api.school['id'], 'issuer_id': '1', 'account_id': 'sandbox-main', 'environment': 'sandbox'}
    item = {'scope': scope, 'secret': SECRET, 'base_url': 'https://crm.example.test'}
    monkeypatch.setattr(settings(), 'crm_bridge_enabled', True)
    monkeypatch.setattr(settings(), 'crm_bridge_connections', json.dumps({'test': item}))
    return item


def charge(api):
    enrollment, _ = context(api)
    return api.post('/bank-charges', payload(enrollment))['items'][0]


def enqueue(api, charge_id):
    return api.post('/crm-bridge/requests', {'connection_id': 'test', 'charge_id': charge_id}, 202)


def receipt(event_id, request_id='req_test'):
    return {'schema_version': 1, 'event_id': event_id, 'request_id': request_id, 'status': 'blocked',
            'reason': 'issuer_finance_not_isolated', 'capabilities': {'issue_charge': False}}


def callback(api, cfg, row, status='confirmed', event_id=None, timestamp=None, mutate=None, secret=SECRET, path=None):
    event = {'schema_version': 1, 'event_id': event_id or str(uuid.uuid4()), 'event_type': 'charge.status',
             'scope': copy.deepcopy(cfg['scope']), 'data': {'charge_id': row['charge_id'], 'request_id': 'req_test',
             'status': status, 'amount_cents': 12015, 'currency': 'BRL'}}
    if mutate:
        mutate(event)
    raw = encode(event)
    path = path or '/api/crm-bridge/webhooks/test'
    timestamp = str(int(time.time()) if timestamp is None else timestamp)
    headers = {'X-Pige-Timestamp': timestamp, 'X-Pige-Event-Id': event['event_id'],
               'X-Pige-Signature': signature(secret, timestamp, event['event_id'], path, raw),
               'Content-Type': 'application/json'}
    return api.client.post(path, content=raw, headers=headers), event


def test_cross_language_fixture():
    fixture = json.loads((Path(__file__).resolve().parents[2] / 'docs/contracts/pige-crm-v1.json').read_text())
    raw = fixture['raw_body'].encode()
    assert signature(fixture['secret'], fixture['timestamp'], fixture['event_id'], fixture['path'], raw) == fixture['signature']
    assert verify_signature(fixture['secret'], fixture['timestamp'], fixture['event_id'], fixture['path'], raw, int(fixture['timestamp'])) == fixture['signature']
    assert validate_envelope(decode(raw), 'charge.requested')['data']['amount_cents'] == 12015


@pytest.mark.parametrize('change', [
    lambda d: d.update(schema_version=True), lambda d: d.update(extra=True),
    lambda d: d['scope'].update(issuer_id=1), lambda d: d['scope'].update(school_id='1'),
    lambda d: d['scope'].update(environment='live'), lambda d: d['data'].update(charge_id='other'),
    lambda d: d['data'].update(amount_cents=True), lambda d: d['data'].update(amount_cents=0),
    lambda d: d['data'].update(amount_cents=1.0), lambda d: d['data'].update(amount_cents=1000000000000),
    lambda d: d['data'].update(currency='USD'), lambda d: d['data'].update(due_date='2026-02-30'),
    lambda d: d['data'].update(due_date='20261120'), lambda d: d['data'].update(description=' '*10),
    lambda d: d['data'].update(description='a'*501), lambda d: d['data'].update(description='a\x00b'),
])
def test_invalid_contract(change):
    fixture = json.loads((Path(__file__).resolve().parents[2] / 'docs/contracts/pige-crm-v1.json').read_text())
    data = json.loads(fixture['raw_body']); change(data)
    with pytest.raises(ContractError): validate_envelope(data, 'charge.requested')


@pytest.mark.parametrize('raw', [b'{"a":1,"a":2}', b'NaN', b'\xff', b'x'*16385])
def test_decoder_rejects_ambiguous_or_oversize_json(raw):
    with pytest.raises(ContractError): decode(raw)


def test_disabled_by_default_preserves_native_finance(api, monkeypatch):
    monkeypatch.setattr(settings(), 'crm_bridge_enabled', False)
    native = charge(api)
    assert api.get('/crm-bridge/status')['capabilities'] == {'issue_charge': False}
    api.post('/crm-bridge/requests', {'connection_id': 'test', 'charge_id': native['id']}, 409)
    assert bridge.process_one() is False
    assert api.get('/bank-charges/' + native['id'])['status'] == 'pending'


def test_request_worker_reconcile_and_observations_have_no_financial_effect(api, monkeypatch):
    cfg = configured(api, monkeypatch); native = charge(api)
    queued = enqueue(api, native['id']); assert queued['status'] == 'queued'
    assert enqueue(api, native['id'])['id'] == queued['id']
    calls = []
    def fake(config, event_id, raw):
        calls.append((event_id, raw))
        body = decode(raw)
        assert set(body['data']) == {'charge_id', 'amount_cents', 'currency', 'due_date', 'description'}
        assert body['data']['description'] == 'Cobrança escolar'
        return receipt(event_id)
    monkeypatch.setattr(bridge, 'send_request', fake)
    assert bridge.process_one()
    row = api.get('/crm-bridge/requests/' + queued['id'])
    assert row['status'] == 'blocked' and row['request_id'] == 'req_test'
    assert row['financial_effect_applied'] is False
    api.post('/crm-bridge/requests/' + row['id'] + '/reconcile', {}, 202)
    assert bridge.process_one()
    assert calls[0] == calls[1]
    first, event = callback(api, cfg, row, 'confirmed')
    assert first.status_code == 200, first.text
    duplicate, _ = callback(api, cfg, row, 'confirmed', event_id=event['event_id'])
    assert duplicate.json()['duplicate'] is True
    changed, _ = callback(api, cfg, row, 'received', event_id=event['event_id'])
    assert changed.status_code == 409
    received, _ = callback(api, cfg, row, 'received')
    assert received.status_code == 200
    final = api.get('/crm-bridge/requests/' + row['id'])
    assert [x['status'] for x in final['observations']] == ['confirmed', 'received']
    assert api.get('/bank-charges/' + native['id'])['status'] == 'pending'
    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(CRMBridgeRequest).where(CRMBridgeRequest.charge_id == native['id'])) == 1
        assert db.scalar(select(func.count()).select_from(CRMBridgeObservation).where(CRMBridgeObservation.bridge_request_id == row['id'])) == 2


@pytest.mark.parametrize('mutation,expected', [
    (lambda d: d['scope'].update(issuer_id='2'), 403),
    (lambda d: d['scope'].update(account_id='other'), 403),
    (lambda d: d['scope'].update(environment='production'), 403),
    (lambda d: d['scope'].update(school_id=str(uuid.uuid4())), 403),
    (lambda d: d['data'].update(amount_cents=12016), 409),
    (lambda d: d['data'].update(request_id='req_other'), 409),
    (lambda d: d['data'].update(charge_id=str(uuid.uuid4())), 409),
    (lambda d: d['data'].update(status='paid'), 422),
])
def test_callback_rejects_wrong_scope_or_mapping(api, monkeypatch, mutation, expected):
    cfg = configured(api, monkeypatch); row = enqueue(api, charge(api)['id'])
    monkeypatch.setattr(bridge, 'send_request', lambda c,e,r: receipt(e)); bridge.process_one()
    response, _ = callback(api, cfg, row, mutate=mutation)
    assert response.status_code == expected, response.text


def test_authentication_replay_window_and_unmapped_event(api, monkeypatch):
    cfg = configured(api, monkeypatch); row = enqueue(api, charge(api)['id'])
    for stamp in (int(time.time())-301, int(time.time())+301):
        assert callback(api, cfg, row, timestamp=stamp)[0].status_code == 401
    assert callback(api, cfg, row, secret='wrong')[0].status_code == 401
    # Authentic events before the durable request mapping are not applied or dropped.
    assert callback(api, cfg, row)[0].status_code == 409


def test_scope_change_and_cross_school_are_blocked(api, monkeypatch):
    cfg = configured(api, monkeypatch); row = enqueue(api, charge(api)['id'])
    cfg['scope']['issuer_id'] = '2'
    monkeypatch.setattr(settings(), 'crm_bridge_connections', json.dumps({'test': cfg}))
    api.post('/crm-bridge/requests/' + row['id'] + '/reconcile', {}, 409)
    assert bridge.process_one()
    assert api.get('/crm-bridge/requests/' + row['id'])['error_code'] == 'CRM_SCOPE_CHANGED'
    companies = api.client.get('/api/v1/companies', headers=api.headers).json()
    other = api.client.post('/api/v1/schools', headers=api.headers, json={'company_id': companies[0]['id'], 'name':'Outra escola CRM'}).json()
    other_api = API(api.client, api.headers, other)
    other_api.call('GET', '/crm-bridge/requests/' + row['id'], expect=404)
    other_api.post('/crm-bridge/requests', {'connection_id':'test','charge_id':row['charge_id']}, 409)


def test_timeout_retry_reuses_event_and_invalid_receipt_fails_closed(api, monkeypatch):
    configured(api, monkeypatch); row = enqueue(api, charge(api)['id']); calls = []
    def timeout(c,e,r):
        calls.append((e,r)); raise bridge.DeliveryError('CRM_NETWORK_ERROR', True)
    monkeypatch.setattr(bridge, 'send_request', timeout)
    for attempt in range(5):
        with SessionLocal() as db:
            db.get(CRMBridgeRequest, row['id']).available_at = now(); db.commit()
        assert bridge.process_one()
    assert len(calls) == 5 and len(set(calls)) == 1
    assert api.get('/crm-bridge/requests/' + row['id'])['status'] == 'failed'
    api.post('/crm-bridge/requests/' + row['id'] + '/reconcile', {}, 202)
    monkeypatch.setattr(bridge, 'send_request', lambda c,e,r: {**receipt(e), 'status':'received'})
    assert bridge.process_one()
    assert api.get('/crm-bridge/requests/' + row['id'])['error_code'] == 'CRM_INVALID_RECEIPT'


def test_request_http_transport_checks_signature_and_rejects_private_dns(api, monkeypatch):
    cfg = configured(api, monkeypatch)
    fixture = json.loads((Path(__file__).resolve().parents[2] / 'docs/contracts/pige-crm-v1.json').read_text())
    raw = fixture['raw_body'].encode(); event_id = fixture['event_id']
    import httpx
    original_client = httpx.Client
    def handler(request):
        assert request.url == 'https://8.8.8.8/pige_bridge/api/v1/requests'
        assert request.headers['Host'] == 'crm.example.test'
        assert request.extensions['sni_hostname'] == 'crm.example.test'
        assert request.content == raw
        assert request.headers['X-Pige-Signature'] == signature(SECRET, request.headers['X-Pige-Timestamp'], event_id, request.url.path, raw)
        return httpx.Response(202, json=receipt(event_id))
    monkeypatch.setattr(bridge.socket, 'getaddrinfo', lambda *a,**kw: [(2,1,6,'',('8.8.8.8',443))])
    monkeypatch.setattr(bridge.httpx, 'Client', lambda **kw: original_client(transport=httpx.MockTransport(handler), **kw))
    assert bridge.send_request(cfg,event_id,raw)['status'] == 'blocked'
    monkeypatch.setattr(bridge.socket, 'getaddrinfo', lambda *a,**kw: [(2,1,6,'',('127.0.0.1',443))])
    with pytest.raises(bridge.DeliveryError, match='CRM_PRIVATE_ADDRESS_BLOCKED'): bridge.send_request(cfg,event_id,raw)


def test_configuration_rejects_reused_secrets_and_http(api, monkeypatch):
    cfg = configured(api, monkeypatch)
    for changes in ({'base_url':'http://crm.example.test'}, {'secret':'short'}, {'base_url':'https://crm.example.test/extra'}):
        monkeypatch.setattr(settings(), 'crm_bridge_connections', json.dumps({'test':{**cfg, **changes}}))
        api.call('GET', '/crm-bridge/status', expect=503)
    cfg2 = copy.deepcopy(cfg); cfg2['scope']['issuer_id'] = '2'
    monkeypatch.setattr(settings(), 'crm_bridge_connections', json.dumps({'test':cfg, 'other':cfg2}))
    api.call('GET', '/crm-bridge/status', expect=503)


def test_receipt_refuses_false_like_values():
    for value in (0, None, '', [], True):
        invalid = receipt(str(uuid.uuid4())); invalid['capabilities']['issue_charge'] = value
        with pytest.raises(ContractError): validate_receipt(invalid, invalid['event_id'])


def test_payload_tampering_and_mapping_conflict_stop_delivery(api, monkeypatch):
    configured(api, monkeypatch)
    native = charge(api)
    first = enqueue(api, native['id'])
    monkeypatch.setattr(bridge, 'send_request', lambda c,e,r: receipt(e))
    assert bridge.process_one()
    second_native = api.post('/bank-charges', payload({'id':native['enrollment_id']}))['items'][0]
    second = enqueue(api, second_native['id'])
    assert bridge.process_one()
    assert api.get('/crm-bridge/requests/' + second['id'])['error_code'] == 'CRM_MAPPING_CONFLICT'
    assert api.get('/crm-bridge/requests/' + first['id'])['request_id'] == 'req_test'
    api.post('/crm-bridge/requests/' + second['id'] + '/reconcile', {}, 202)
    with SessionLocal() as db:
        db.get(CRMBridgeRequest, second['id']).raw_body += ' '; db.commit()
    monkeypatch.setattr(bridge, 'send_request', lambda *a: pytest.fail('Tampered event must not be sent'))
    assert bridge.process_one()
    assert api.get('/crm-bridge/requests/' + second['id'])['error_code'] == 'CRM_PAYLOAD_CHANGED'


def test_callback_size_raw_canonical_and_path_bound_signature(api, monkeypatch):
    cfg = configured(api, monkeypatch); row = enqueue(api, charge(api)['id'])
    monkeypatch.setattr(bridge, 'send_request', lambda c,e,r: receipt(e)); bridge.process_one()
    _, event = callback(api, cfg, row)
    path = '/api/crm-bridge/webhooks/test'; timestamp = str(int(time.time()))
    raw = json.dumps(event, ensure_ascii=False).encode()
    headers = {'X-Pige-Timestamp':timestamp, 'X-Pige-Event-Id':event['event_id'],
        'X-Pige-Signature':signature(SECRET,timestamp,event['event_id'],path,raw)}
    assert api.client.post(path, content=raw, headers=headers).status_code == 422
    raw = encode(event)
    headers['X-Pige-Signature'] = signature(SECRET,timestamp,event['event_id'],'/other',raw)
    assert api.client.post(path, content=raw, headers=headers).status_code == 401
    assert api.client.post(path, content=b'x'*16385, headers=headers).status_code == 413
    headers['X-Pige-Signature'] = signature(SECRET,timestamp,event['event_id'],path,raw)
    pairs = list(headers.items()) + [('X-Pige-Event-Id', event['event_id'])]
    assert api.client.post(path, content=raw, headers=pairs).status_code == 401


def test_invalid_optional_config_does_not_stop_native_worker(api, monkeypatch):
    from app import integration_worker, certificate_alerts
    monkeypatch.setattr(settings(), 'crm_bridge_enabled', True)
    monkeypatch.setattr(settings(), 'crm_bridge_connections', '{invalid')
    calls = []
    monkeypatch.setattr(integration_worker, 'process_one', lambda: calls.append('native') or True)
    monkeypatch.setattr(integration_worker, 'schedule_reconciliations', lambda: None)
    monkeypatch.setattr(certificate_alerts, 'schedule_certificate_alerts', lambda db: None)
    monkeypatch.setattr('sys.argv', ['worker', '--once', '--limit', '1'])
    integration_worker.main()
    assert calls == ['native']


@pytest.mark.parametrize('field,value,error', [
    ('status','received','CRM_NATIVE_CHARGE_SETTLED_OR_UNAVAILABLE'),
    ('status','cancelled','CRM_NATIVE_CHARGE_SETTLED_OR_UNAVAILABLE'),
    ('amount','121.00','CRM_NATIVE_CHARGE_CHANGED'),
    ('due_on','2028-01-01','CRM_NATIVE_CHARGE_CHANGED'),
])
def test_native_changes_after_queue_block_post(api, monkeypatch, field, value, error):
    from datetime import date
    from decimal import Decimal
    configured(api, monkeypatch); native = charge(api); row = enqueue(api, native['id'])
    with SessionLocal() as db:
        updated = db.get(m.BankCharge, native['id'])
        setattr(updated, field, Decimal(value) if field == 'amount' else date.fromisoformat(value) if field == 'due_on' else value)
        db.commit()
    monkeypatch.setattr(bridge, 'send_request', lambda *a: pytest.fail('Changed/settled native charge must not be sent'))
    assert bridge.process_one()
    assert api.get('/crm-bridge/requests/' + row['id'])['error_code'] == error


def test_pinned_transport_preserves_tls_verification_hostname(api, monkeypatch):
    """Exercise HTTPX→httpcore→network backend, rather than only MockTransport."""
    import httpcore
    import httpx
    import ssl
    cfg = configured(api, monkeypatch)
    event_id = str(uuid.uuid4()); raw = b'{}'; body = encode(receipt(event_id))
    response = b'HTTP/1.1 202 Accepted\r\nContent-Length: ' + str(len(body)).encode() + b'\r\n\r\n' + body
    seen = []
    class Stream(httpcore.MockStream):
        def start_tls(self, ssl_context, server_hostname=None, timeout=None):
            seen.append(('tls', server_hostname, ssl_context.check_hostname, ssl_context.verify_mode))
            return self
    class Network(httpcore.MockBackend):
        def connect_tcp(self, host, port, **kw):
            seen.append(('tcp', host, port))
            return Stream([response])
    transport = httpx.HTTPTransport(trust_env=False)
    transport._pool = httpcore.ConnectionPool(network_backend=Network([]))
    original = httpx.Client
    monkeypatch.setattr(bridge.httpx, 'Client', lambda **kw: original(transport=transport, **kw))
    monkeypatch.setattr(bridge.socket, 'getaddrinfo', lambda *a,**kw: [(2,1,6,'',('8.8.8.8',443))])
    assert bridge.send_request(cfg, event_id, raw)['status'] == 'blocked'
    assert seen == [('tcp', '8.8.8.8', 443), ('tls', 'crm.example.test', True, ssl.CERT_REQUIRED)]
