from datetime import timedelta
from decimal import Decimal
from uuid import uuid4

import pytest
from sqlalchemy import func, select

from app import models as m
from app.db import SessionLocal
from app.portal_access import today
from test_online import online, bank, draft, submit, pc, provider_mock, run_issue  # noqa: F401


def update_fee(o,**fields):
    campaign=o['campaign']
    payload={k:campaign[k] for k in ('slug','title','privacy_notice','class_group_ids','opens_on','closes_on',
                                      'active','version','require_verified_contact')}
    current=o['api'].patch('/admission-campaigns/'+campaign['id'],{**payload,**fields})
    o['campaign']=current
    return current


@pytest.mark.parametrize('kind',['PIX','BOLETO'])
def test_optional_fee_is_explicit_scoped_and_idempotent(online,monkeypatch,kind):
    o=online
    conn=bank(o)
    configured=update_fee(o,fee_enabled=True,fee_amount='27.50',fee_billing_type=kind,fee_connection_id=conn['id'],fee_due_days=3)
    assert configured['fee_connection_id']==conn['id']
    public=pc(o,'GET','/campaigns/'+configured['slug'])
    assert public['fee_amount']=='27.50' and public['fee_enabled'] and 'fee_connection_id' not in public
    pending=draft(o)
    path='/admissions/'+pending['id']+'/fee'
    assert not pc(o,'GET',path)['can_issue']
    sent=submit(o,pending)
    assert sent['status']=='submitted' and pc(o,'GET',path[:-4]+'/charges')==[]
    quote=pc(o,'GET',path)
    assert quote['can_issue'] and not quote['charge']
    update_fee(o,fee_enabled=True,fee_amount='30.00',fee_billing_type=kind,fee_connection_id=conn['id'])
    pc(o,'POST',path,{'quote':quote['quote']},409)
    quote=pc(o,'GET',path)
    charge=pc(o,'POST',path,{'quote':quote['quote']})['charge']
    duplicate=pc(o,'POST',path,{'quote':quote['quote']})['charge']
    assert duplicate['id']==charge['id'] and charge['required_for_enrollment'] is False
    assert charge['amount']=='30.00' and charge['billing_type']==kind and 'remote_customer_id' not in charge
    assert charge['due_on']==(today()+timedelta(days=3)).isoformat()
    with SessionLocal() as db:
        row=db.get(m.BankCharge,charge['id'])
        assert row.admission_id==pending['id'] and row.enrollment_id is None and row.account_id==o['account']['id']
        assert db.scalar(select(func.count()).select_from(m.IntegrationJob).where(
            m.IntegrationJob.dedupe_key=='bank-issue:'+row.id))==1
    provider_mock(monkeypatch)
    run_issue(charge)
    visible=pc(o,'GET',path)['charge']
    assert visible['status']=='pending' and (visible['pix_copy_paste'] if kind=='PIX' else visible['bank_slip_url'])
    assert pc(o,'GET','/admissions/'+pending['id'])['status']=='submitted'
    assert pc(o,'GET',path[:-4]+'/charges')[0]['id']==charge['id']


def test_campaign_legacy_update_keeps_fee_and_disabled_does_not_queue(online):
    o=online
    sent=submit(o,draft(o))
    path='/admissions/'+sent['id']+'/fee'
    view=pc(o,'GET',path)
    assert not view['enabled'] and not view['can_issue']
    pc(o,'POST',path,{'quote':view['quote']},409)
    conn=bank(o)
    update_fee(o,fee_enabled=True,fee_amount='24.20',fee_billing_type='PIX',fee_connection_id=conn['id'])
    after=update_fee(o,title='Campanha revisada')
    assert after['fee_enabled'] and Decimal(after['fee_amount'])==Decimal('24.20') and after['fee_connection_id']==conn['id']
    update_fee(o,fee_enabled=False)
    assert pc(o,'GET',path)['charge'] is None


def test_missing_cpf_allows_submission_and_another_account_cannot_request_fee(online):
    from conftest import PASSWORD
    o=online
    conn=bank(o)
    update_fee(o,fee_enabled=True,fee_amount='20.00',fee_billing_type='BOLETO',fee_connection_id=conn['id'])
    with SessionLocal.begin() as db:
        db.get(m.PortalAccount,o['account']['id']).cpf=None
    sent=submit(o,draft(o))
    path='/admissions/'+sent['id']+'/fee'
    own=pc(o,'GET',path)
    assert own['enabled'] and not own['can_issue'] and not own['required_for_enrollment']
    assert 'CPF' in own['message']
    pc(o,'POST',path,{'quote':own['quote']},409)
    pc(o,'POST','/register',{'campaign_slug':o['campaign']['slug'],'name':'Outro responsável',
       'email':uuid4().hex+'@example.com','password':PASSWORD,'accept_privacy':True,'terms_version':'1'},201)
    pc(o,'GET',path,status=404)
    pc(o,'POST',path,{'quote':own['quote']},404)
