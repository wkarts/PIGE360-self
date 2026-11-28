from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app import models as m
from app.db import SessionLocal, engine
from app.main import app
from test_admission_optional_fee import update_fee
from test_online import CSRF, bank, draft, online, pc, submit  # noqa: F401


@pytest.mark.skipif(engine.dialect.name != 'postgresql', reason='O bloqueio transacional por escola usa PostgreSQL.')
def test_concurrent_fee_requests_share_one_charge_job_and_consent(online):
    connection = bank(online)
    update_fee(online, fee_enabled=True, fee_amount='27.50', fee_billing_type='PIX', fee_connection_id=connection['id'])
    admission = submit(online, draft(online))
    path = f"/admissions/{admission['id']}/fee"
    quote = pc(online, 'GET', path)['quote']
    url = '/api/v1/portal' + path
    assert online['parent'].post(url, json={'quote': quote}).status_code == 403
    assert pc(online, 'GET', path)['charge'] is None
    cookies = dict(online['parent'].cookies)
    ready = Barrier(2)

    def confirm():
        client = TestClient(app, cookies=cookies)
        try:
            ready.wait(timeout=10)
            response = client.post(url, json={'quote': quote}, headers=CSRF)
            assert response.status_code == 200, response.text
            return response.json()['charge']['id']
        finally:
            client.close()

    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = [pool.submit(confirm) for _ in range(2)]
        first, second = [future.result(timeout=30) for future in futures]
    assert first == second
    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(m.BankCharge).where(m.BankCharge.admission_id == admission['id'])) == 1
        assert db.scalar(select(func.count()).select_from(m.IntegrationJob).where(m.IntegrationJob.dedupe_key == 'bank-issue:' + first)) == 1
        event = db.scalars(select(m.AuditEvent).where(m.AuditEvent.action == 'portal.admission.fee_requested', m.AuditEvent.entity_id == first)).one()
        assert event.details['portal_account_id'] == online['account']['id']
