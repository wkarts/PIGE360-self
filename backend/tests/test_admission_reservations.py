"""Política confirmada: reserva na aprovação e revisão de pagamentos tardios."""
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
import uuid
import pytest
from sqlalchemy import select
from test_online import online, draft, submit, approve, pc
from app import models as m
from app.db import SessionLocal, now, engine
from app.admission_reservations import payment_changed


def policy(o, capacity=1):
    with SessionLocal.begin() as db:
        campaign=db.get(m.AdmissionCampaign,o['campaign']['id'])
        campaign.require_payment_before_enrollment=True
        campaign.payment_reservation_hours=48  # parâmetro exclusivo da fixture
        db.get(m.ClassGroup,o['cat']['group']['id']).capacity=capacity


def bill(o,a):
    return o['api'].post('/bank-charges',{'admission_id':a['id'],'collection_mode':'manual',
        'billing_type':'MANUAL','amount':'150.00','due_on':'2027-10-20',
        'description':'Taxa sintética','required_for_enrollment':True,'client_key':str(uuid.uuid4())})['items'][0]


def receive(o,c):
    from app.portal_access import today
    return o['api'].post('/bank-charges/'+c['id']+'/manual-receipt',{
        'version':c['version'],'amount':'150.00','paid_on':str(today()),
        'payment_method':'cash','reference':'Recibo de teste','client_key':str(uuid.uuid4())},200)


def approve_sibling(o,a,first):
    guardian=o['api'].get('/enrollments/'+first['enrollment_id'])['financial_person_id']
    return o['api'].post('/admissions/'+a['id']+'/approve',{'version':a['version'],
        'identity_confirmed':True,'existing_guardian_id':guardian,'reason':'Identidade conciliada no cadastro único.'},200)


def expire(a):
    with SessionLocal.begin() as db:
        db.get(m.Admission,a['id']).reserved_until=now()-timedelta(seconds=1)


def test_approval_reserves_and_expiration_releases_without_worker(online):
    o=online;policy(o)
    a=approve(o,submit(o,draft(o)))
    assert a['reservation']['status']=='held'
    assert o['api'].get('/class-groups')[0]['available']==0
    b=submit(o,draft(o))
    o['api'].post('/admissions/'+b['id']+'/approve',{'version':b['version'],
        'identity_confirmed':True,'reason':'Conferência da capacidade.'},409)
    expire(a)
    assert pc(o,'GET','/admissions/'+a['id'])['reservation']['status']=='expired'
    assert o['api'].get('/class-groups')[0]['available']==1
    assert approve_sibling(o,b,a)['reservation']['status']=='held'


def test_timely_payment_survives_document_pending_and_is_not_counted_twice(online):
    o=online;policy(o)
    a=approve(o,submit(o,draft(o)));c=bill(o,a);receive(o,c)
    a=o['api'].get('/admissions/'+a['id'])
    assert a['reservation']['status']=='paid'
    expire(a)
    assert o['api'].get('/class-groups')[0]['available']==0
    a=o['api'].post('/admissions/'+a['id']+'/finalize',{'version':a['version'],'reason':'Conferência final.'},200)
    assert a['status']=='enrolled' and a['reservation']['status']=='consumed'
    assert o['api'].get('/class-groups')[0]['occupied']==1


def test_late_payment_needs_explicit_capacity_review(online):
    o=online;policy(o)
    a=approve(o,submit(o,draft(o)));c=bill(o,a);expire(a);receive(o,c)
    a=o['api'].get('/admissions/'+a['id'])
    assert a['reservation']['status']=='review'
    o['api'].post('/admissions/'+a['id']+'/finalize',{'version':a['version'],'reason':'Não deve efetivar.'},409)
    b=approve_sibling(o,submit(o,draft(o)),a)
    o['api'].post('/admissions/'+a['id']+'/reservation',{'version':a['version'],'reason':'Turma lotada.'},409)
    expire(b)
    renewed=o['api'].post('/admissions/'+a['id']+'/reservation',{'version':a['version'],'reason':'Pagamento tardio conferido e vaga disponível.'},200)
    assert renewed['reservation']['status']=='paid'
    o['api'].post('/admissions/'+a['id']+'/reservation',{'version':a['version'],'reason':'Pedido obsoleto.'},409)


def test_refund_reopens_review_instead_of_holding_paid_vacancy(online):
    o=online;policy(o)
    a=approve(o,submit(o,draft(o)));c=bill(o,a);receive(o,c)
    with SessionLocal.begin() as db:
        charge=db.get(m.BankCharge,c['id']);charge.status='refunded';payment_changed(db,charge)
    assert o['api'].get('/admissions/'+a['id'])['reservation']['status']=='review'


def test_policy_has_no_institutional_default_duration(online):
    o=online
    with SessionLocal.begin() as db:db.get(m.AdmissionCampaign,o['campaign']['id']).require_payment_before_enrollment=True
    a=submit(o,draft(o))
    o['api'].post('/admissions/'+a['id']+'/approve',{'version':a['version'],
        'identity_confirmed':True,'reason':'Sem prazo institucional definido.'},409)
    assert not o['api'].get('/admissions/'+a['id'])['enrollment_id']


def test_concurrent_approvals_cannot_reserve_same_last_seat(online):
    if engine.dialect.name!='postgresql':pytest.skip('Concorrência de vagas exige PostgreSQL real.')
    o=online;policy(o)
    admissions=[submit(o,draft(o)) for _ in range(2)]
    def approve_one(a):
        return o['api'].client.post(o['api'].base+'/admissions/'+a['id']+'/approve',
            headers=o['api'].headers,json={'version':a['version'],'identity_confirmed':True,
            'reason':'Aprovação concorrente na última vaga.'}).status_code
    with ThreadPoolExecutor(max_workers=2) as pool:codes=list(pool.map(approve_one,admissions))
    assert sorted(codes)==[200,409]
    assert o['api'].get('/class-groups')[0]['occupied']==1
