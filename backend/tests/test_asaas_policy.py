from decimal import Decimal
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.asaas_policy import Policy, card_quote, check_single_charge, single_terms_snapshot, terms_payload
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


def test_single_charge_nominal_and_optional_discounted_minimum():
    regular = Policy(discount_type='FIXED', discount_value='2.00')
    check_single_charge(regular, Decimal('5.00'))
    with pytest.raises(HTTPException):
        check_single_charge(regular, Decimal('4.99'))
    selected = regular.model_copy(update={'single_minimum_after_discount': Decimal('5.00')})
    with pytest.raises(HTTPException):
        check_single_charge(selected, Decimal('6.99'))
    check_single_charge(selected, Decimal('7.00'))
    assert single_terms_snapshot(selected)['asaas_single_minimum_after_discount'] == '5.00'
    assert 'single_minimum_after_discount' not in single_terms_snapshot(selected)['asaas_terms']


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
    application = submit(o, draft(o))
    api.post('/bank-charges', {'admission_id': application['id'], 'amount': '4.99', 'due_on': str(today()),
             'description': 'Taxa abaixo do mínimo', 'billing_type': 'PIX', 'client_key': str(uuid4())}, 422)
    entry = charge(o, application)
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


def test_reconcile_recent_receipts_with_school_settings(online, monkeypatch):
    from datetime import timedelta
    from sqlalchemy import select
    from app import models as m
    from app.db import SessionLocal, now
    from app.integration_worker import process_one, schedule_reconciliations

    o = online
    bank(o)
    api = o['api']
    url = '/banking/asaas/settings'
    application = submit(o, draft(o))
    calls, store = provider_mock(monkeypatch, status='RECEIVED')
    receipts = [run_issue(charge(o, application))[0] for _ in range(3)]
    current_time = now()
    with SessionLocal.begin() as db:
        for receipt, age, last_sync in zip(receipts, [40, 3, 2], [40, 4, 3], strict=True):
            db.get(m.BankCharge, receipt.id).last_synced_at = current_time - timedelta(days=last_sync)
            event = db.scalars(select(m.BankEvent).where(
                m.BankEvent.charge_id == receipt.id, m.BankEvent.status == 'received'
            )).one()
            event.created_at = current_time - timedelta(days=age)

    def periodic_jobs():
        with SessionLocal() as db:
            return list(db.scalars(select(m.IntegrationJob).where(
                m.IntegrationJob.school_id == o['account']['school_id'],
                m.IntegrationJob.dedupe_key.like('bank-periodic:%')
            ).order_by(m.IntegrationJob.created_at)))

    calls.clear()
    schedule_reconciliations()
    assert periodic_jobs() == []
    initial = api.get(url)
    assert initial['settings']['periodic_reconciliation_enabled'] is True
    assert initial['settings']['settled_review_days'] == 0
    assert initial['settings']['reconciliation_batch_size'] == 25
    saved = api.call('PUT', url, {'version': initial['version'], 'settings': {
        **initial['settings'], 'settled_review_days': 7, 'reconciliation_batch_size': 1
    }})
    legacy = {key: value for key, value in saved['settings'].items() if key in {
        'card_enabled', 'pix_enabled', 'boleto_enabled'
    }}
    saved = api.call('PUT', url, {'version': saved['version'], 'settings': legacy})
    assert saved['settings']['settled_review_days'] == 7
    assert saved['settings']['reconciliation_batch_size'] == 1
    schedule_reconciliations()
    schedule_reconciliations()
    first, = periodic_jobs()
    assert first.kind == 'bank_sync' and first.dedupe_key.startswith('bank-periodic:' + receipts[1].id + ':')
    # Uma pendência defasada do banco conserva a baixa e libera o próximo título do lote.
    store['payments'][receipts[1].remote_payment_id]['status'] = 'PENDING'
    assert process_one(first.id)
    with SessionLocal() as db:
        assert db.get(m.BankCharge, receipts[1].id).status == 'received'
        assert db.get(m.IntegrationJob, first.id).status == 'completed'
    assert [(path, method) for _, path, method, _, _ in calls] == [('/payments/' + receipts[1].remote_payment_id, 'GET')]
    paused = api.call('PUT', url, {'version': saved['version'], 'settings': {
        **saved['settings'], 'periodic_reconciliation_enabled': False
    }})
    schedule_reconciliations()
    assert len(periodic_jobs()) == 1
    api.call('PUT', url, {'version': paused['version'], 'settings': {
        **paused['settings'], 'periodic_reconciliation_enabled': True
    }})
    schedule_reconciliations()
    assert periodic_jobs()[1].dedupe_key.startswith('bank-periodic:' + receipts[2].id + ':')


@pytest.mark.parametrize('field, value', [
    ('settled_review_days', -1), ('settled_review_days', 366),
    ('reconciliation_batch_size', 0), ('reconciliation_batch_size', 101)
])
def test_reconciliation_policy_bounds(field, value):
    with pytest.raises(ValueError):
        Policy(**{field: value})
