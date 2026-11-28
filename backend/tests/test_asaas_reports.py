"""Consultas e exportação Asaas pela API da escola, com transporte de ensaio."""
import csv
from io import BytesIO, StringIO
from uuid import uuid4

import pytest
from fastapi import HTTPException
from pypdf import PdfReader

from app import asaas_reports as reports
from conftest import API, PASSWORD

BASE = '/banking/asaas/reports'


@pytest.fixture
def connected(api):
    result = api.post('/integrations/asaas', {'enabled': True, 'api_key': 'test-only-asaas-key',
        'webhook_token': 'test-only-webhook-token-000000000000000', 'config': {}}, 200)
    return result['id']


def test_catalog_and_school_permissions(api, connected, monkeypatch):
    def read(connection, path, *, params):
        assert connection.id == connected and connection.school_id == api.school['id']
        assert path == '/finance/balance' and params == {}
        return {'balance': 12.05, 'apiKey': 'SENSITIVE'}
    monkeypatch.setattr(reports, 'asaas_read', read)
    catalog = api.get(BASE + '/catalog')
    assert len(catalog['items']) == 20 and catalog['can_export']
    assert all('endpoint' not in entry for entry in catalog['items'])
    assert api.get(BASE + '/balance')['items'] == [{'balance': '12.05'}]
    api.call('GET', BASE + '/balance?date_from=2026-01-01', expect=422)
    api.call('GET', BASE + '/balance?per_page=101', expect=422)
    email = 'secretaria-' + uuid4().hex + '@example.com'
    api.client.post('/api/v1/users', headers=api.headers, json={'name': 'Secretaria de teste',
        'role': 'secretary', 'school_ids': [api.school['id']], 'email': email, 'password': PASSWORD}).raise_for_status()
    session = api.client.post('/api/v1/auth/login', json={'email': email, 'password': PASSWORD}).json()
    restricted = API(api.client, {'Authorization': 'Bearer ' + session['access_token']}, api.school)
    for route in ('catalog', 'balance', 'statement.csv', 'statement.pdf'):
        restricted.call('GET', BASE + '/' + route, expect=403)


def test_statement_paging_csv_pdf_and_safe_fields(api, connected, monkeypatch):
    entries = [{'id': 'txn_1', 'value': 75.50, 'balance': 100.50, 'date': '2026-08-01', 'type': 'PAYMENT_RECEIVED'},
               {'id': 'txn_2', 'value': '-2.49', 'balance': 98.01, 'date': '2026-08-02', 'type': 'NEW_FEE',
                'description': '=SUM(1,2)', 'cardNumber': 'SENSITIVE', 'creditCardToken': 'SENSITIVE'}]
    def read(connection, path, *, params):
        assert path == '/financialTransactions' and connection.id == connected
        assert params['startDate'] == '2026-08-01' and params['finishDate'] == '2026-08-31' and params['order'] == 'asc'
        offset = params['offset']
        return {'data': entries[offset:offset + 1], 'hasMore': offset == 0, 'offset': offset, 'totalCount': 2}
    monkeypatch.setattr(reports, 'asaas_read', read)
    query = '?date_from=2026-08-01&date_to=2026-08-31&offset=1&per_page=1'
    result = api.get(BASE + '/statement' + query)
    assert result['offset'] == 1 and result['total'] == 2 and not result['has_more']
    row = result['items'][0]
    assert row['value'] == '-2.49' and row['balance'] == '98.01' and row['type'] == 'NEW_FEE'
    assert 'SENSITIVE' not in str(result)
    csvfile = api.get(BASE + '/statement.csv' + query)
    assert csvfile.headers['cache-control'] == 'no-store' and csvfile.content.startswith(b'\xef\xbb\xbf')
    table = list(csv.reader(StringIO(csvfile.content.decode('utf-8-sig')), delimiter=';'))
    assert len(table) == 3 and '75,50' in table[1] and '-2,49' in table[2] and "'=SUM(1,2)" in table[2]
    document = api.get(BASE + '/statement.pdf' + query)
    text = '\n'.join(p.extract_text() for p in PdfReader(BytesIO(document.content)).pages)
    assert 'txn_2' in text and 'txn_1' not in text and 'SENSITIVE' not in text


def test_resource_filters_and_refunds_collection(api, connected, monkeypatch):
    q = reports._query(reports.CATALOG['service_invoices'], {'date_from': '2026-02-28', 'date_to': '2026-03-28'})
    assert q.params == {'effectiveDate[Ge]': '2026-02-28', 'effectiveDate[Le]': '2026-03-28'}
    assert reports._query(reports.CATALOG['payments'], {'anticipated': 'false'}).params == {'anticipated': False}
    assert reports._query(reports.CATALOG['pix_transactions'], {'type': 'DEBIT'}).params == {'type': 'DEBIT'}
    for invalid in ({'date_to': '2026-02-30'}, {'order': 'random'}, {'transactionType': 'TRANSFER'}):
        with pytest.raises(HTTPException) as exc:
            reports._query(reports.CATALOG['statement'], invalid)
        assert exc.value.status_code == 422
    def read(conn, path, *, params):
        assert path == '/payments/pay_x/refunds' and not params
        return {'data': [{'value': 5, 'status': 'DONE'}, {'value': 6, 'status': 'PENDING'}], 'hasMore': False, 'totalCount': 2}
    monkeypatch.setattr(reports, 'asaas_read', read)
    result = api.get(BASE + '/refunds?payment_id=pay_x&offset=1&per_page=1')
    assert len(result['items']) == 1 and result['items'][0]['value'] == '6.00'
    api.call('GET', BASE + '/refunds?payment_id=..%2Fbalance', expect=422)


@pytest.mark.parametrize('duplicate', [True, False])
def test_inconsistent_export_is_discarded(api, connected, monkeypatch, duplicate):
    def read(conn, path, *, params):
        offset = params['offset']
        return {'data': [{'id': 't1' if duplicate or offset == 0 else 't2', 'value': '1.00'}],
                'offset': offset, 'hasMore': offset == 0 or not duplicate, 'totalCount': 2 if duplicate or not offset else 3}
    monkeypatch.setattr(reports, 'asaas_read', read)
    reply = api.client.get(api.base + BASE + '/statement.csv', headers=api.headers)
    assert reply.status_code == 409 and reply.headers['content-type'].startswith('application/json')


@pytest.mark.parametrize('report_id', list(reports.CATALOG))
def test_catalog_routes_only_project_approved_columns(report_id, monkeypatch):
    from types import SimpleNamespace
    definition = reports.CATALOG[report_id]
    query = reports._query(definition, {'payment_id':'pay_1'} if report_id == 'refunds' else {})
    assert query.path.startswith('/') and '//' not in query.path and '{' not in query.path
    raw = {'id': 'object_1', 'creditCard': {'number': 'SENSITIVE'}, 'apiKey': 'SENSITIVE'}
    if definition['kind'] == 'summary':
        raw.update({c['key']: 2 for c in definition['columns']})
    def provider(connection, path, *, params):
        assert path == query.path
        if definition['kind'] == 'list':
            assert params['offset'] == 0 and params['limit'] == 25
        else:
            assert 'offset' not in params and 'limit' not in params
        return raw if definition['kind'] == 'summary' else {'data':[raw], 'hasMore': False, 'totalCount':1}
    monkeypatch.setattr(reports, 'asaas_read', provider)
    rows, total, more = reports._page(SimpleNamespace(), definition, query, 0, 25)
    assert total == 1 and not more and len(rows) == 1
    assert set(rows[0]) == {col['key'] for col in definition['columns']}
    assert 'SENSITIVE' not in str(rows)
