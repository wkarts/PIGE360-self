from decimal import Decimal
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.asaas_policy import Policy, card_quote, terms_payload
from app.portal_access import today
from test_online import online, bank, charge, draft, submit, run_issue, provider_mock


@pytest.mark.parametrize('mode,count,expected', [
    ('none', 1, 10359), ('manual', 1, 10490), ('automatic', 1, 10479),
    ('manual', 3, 10778), ('automatic', 3, 10755),
])
def test_quotes_match_reference(mode, count, expected):
    policy = Policy(card_enabled=True, max_installments=6, card_fee_mode='customer', card_anticipation_mode=mode)
    quote = card_quote(policy, Decimal('100.00'), count)
    assert quote['charged_cents'] == expected
    assert quote['surcharge_cents'] + quote['principal_cents'] == quote['charged_cents']


def test_minimum_discount_fee_absorption_and_brand():
    policy = Policy(card_enabled=True, max_installments=21, card_fee_mode='customer', card_free_installments=3,
                    discount_type='FIXED', discount_value='1,50', interest_percent='1', fine_percent='2')
    assert card_quote(policy, Decimal('24.00'), 3)['surcharge_cents'] == 0
    assert terms_payload(policy)['discount'] == {'type': 'FIXED', 'value': 1.5, 'dueDateLimitDays': 0}
    with pytest.raises(HTTPException):
        card_quote(policy, Decimal('15.00'), 3)
    with pytest.raises(HTTPException):
        card_quote(policy, Decimal('300'), 13, 'Elo')
    with pytest.raises(ValueError):
        Policy(card_anticipation_mode='manual', card_anticipation_manual_rate_1='99', card_anticipation_first_days=365)


def test_lifecycle_partial_then_total_and_replay(online, monkeypatch):
    o = online
    conn = bank(o)
    api = o['api']
    root = '/banking/asaas'
    initial = api.get(root + '/settings')
    selected = {**initial['settings'], 'card_enabled': True, 'fine_percent': '2.00'}
    saved = api.call('PUT', root + '/settings', {'version': initial['version'], 'settings': selected})
    assert saved['version'] != initial['version']
    api.post('/integrations/asaas', {'version': saved['version'], 'environment': conn['environment'], 'enabled': True,
             'api_key': 'replacement-example-for-test-only'}, 200)
    assert api.get(root + '/settings')['settings']['fine_percent'] == '2.00'
    entry = charge(o, submit(o, draft(o)))
    calls, store = provider_mock(monkeypatch)
    remote, job = run_issue(entry)
    assert job.status == 'completed'
    payment = store['payments'][remote.remote_payment_id]
    assert next(item[3]['fine'] for item in calls if item[1] == '/payments' and item[2] == 'POST')['value'] == 2
    def provider(conn, method, path, *, params=None, payload=None):
        if path == '/payments':
            return {'data': [dict(payment)], 'hasMore': False}
        if method == 'GET':
            return dict(payment)
        if path.endswith('/receiveInCash'):
            calls.append(('cash', payload))
            payment['status'] = 'RECEIVED_IN_CASH'
            return dict(payment)
        raise AssertionError(path)
    from app import asaas_native
    monkeypatch.setattr(asaas_native, 'asaas_request', provider)
    url = root + '/charges/' + entry['id'] + '/cash-receipt'
    base = {'version': remote.version, 'client_key': str(uuid4()), 'amount': '1.00', 'reference': 'Recibo de teste',
            'paid_on': str(today()), 'reason': 'Recebimento externo confirmado.'}
    partial = api.post(url, base, 200)['charge']
    assert partial['status'] == 'pending' and partial['manual_paid_amount'] == '1.00'
    assert api.post(url, base, 200)['charge']['manual_paid_amount'] == '1.00'
    final = api.post(url, {**base, 'version': partial['version'], 'client_key': str(uuid4()),
                          'amount': str(Decimal(entry['amount']) - Decimal('1.00'))}, 200)['charge']
    assert final['status'] == 'received_external'
    assert api.get('/bank-charges/' + entry['id'] + '/receipt.pdf').content.startswith(b'%PDF')
    assert [call[1]['value'] for call in calls if call[0] == 'cash'] == [float(entry['amount'])]
    api.post(root + '/charges/' + entry['id'] + '/reactivate', {'version': final['version'],
             'client_key': str(uuid4()), 'reason': 'Verificar estado final.'}, 409)


def test_adjust_and_restore_reuse_original_provider_id(online, monkeypatch):
    from app import asaas_native, models as m
    from app.db import SessionLocal
    from datetime import date, timedelta
    o = online
    bank(o)
    entry = charge(o, submit(o, draft(o)))
    _, store = provider_mock(monkeypatch)
    remote, job = run_issue(entry)
    assert job.status == 'completed'
    payment = store['payments'][remote.remote_payment_id]
    edits = []
    duplicates = []
    def provider(conn, method, path, *, params=None, payload=None):
        if path == '/payments':
            assert method == 'GET'
            return {'data': [dict(payment), *duplicates], 'hasMore': False}
        if method == 'PUT':
            assert path == '/payments/' + payment['id']
            payment.update(payload)
            edits.append(method)
        if method == 'POST':
            assert path == '/payments/' + payment['id'] + '/restore'
            payment['deleted'] = False
            edits.append('restore')
        return dict(payment)

    monkeypatch.setattr(asaas_native, 'asaas_request', provider)
    url = '/banking/asaas/charges/' + entry['id']
    base = {'version': remote.version, 'client_key': str(uuid4()), 'reason': 'Revisão contratual conferida.'}
    change = {**base, 'amount': '125.49', 'description': 'Parcela revisada',
              'due_on': (date.today()+timedelta(days=15)).isoformat()}
    duplicates.append({**payment, 'id': 'pay_other'})
    o['api'].post(url + '/adjust', change, 409)
    assert not edits
    duplicates.clear()
    updated = o['api'].post(url + '/adjust', change, 200)['charge']
    assert (updated['remote_payment_id'], updated['amount'], updated['due_on']) == (remote.remote_payment_id, '125.49', change['due_on'])
    assert o['api'].post(url + '/adjust', change, 200)['charge']['amount'] == '125.49'
    with SessionLocal.begin() as db:
        stored = db.get(m.BankCharge, entry['id'])
        stored.status = 'cancelled'
        stored.version += 1
        version = stored.version
    payment['deleted'] = True
    restore = {**base, 'version': version, 'client_key': str(uuid4())}
    restored = o['api'].post(url + '/reactivate', restore, 200)['charge']
    assert (restored['remote_payment_id'], restored['status']) == (remote.remote_payment_id, 'pending')
    assert len(edits) == 2 and edits == ['PUT', 'restore']
