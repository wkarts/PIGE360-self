"""Regras entre campanha, inscrição encerrada e vínculo acadêmico atual."""
from datetime import date, timedelta

import pytest

from app import models as m
from app.db import SessionLocal
from test_admission_reservations import bill, expire, policy, receive
from test_online import CPF, approve, draft, online, pc, submit


def test_expired_reservation_after_campaign_change_preserves_outstanding_charge(online):
    o = online
    policy(o)
    admission = approve(o, submit(o, draft(o)))
    charge = bill(o, admission)
    expire(admission)
    with SessionLocal.begin() as db:
        db.get(m.AdmissionCampaign, o['campaign']['id']).require_payment_before_enrollment = False
    path = '/admissions/' + admission['id']
    reason = {'version': admission['version'], 'reason': 'Revisão pela Secretaria.'}
    o['api'].post(path + '/finalize', reason, 409)
    current = o['api'].post(path + '/reservation', reason, 200)
    assert current['reservation'] == {'status': 'none', 'payment_deadline': None, 'paid_at': None}
    reason['version'] = current['version']
    o['api'].post(path + '/reservation', reason, 409)
    o['api'].post(path + '/finalize', reason, 409)
    receive(o, charge)
    assert o['api'].post(path + '/finalize', reason, 200)['status'] == 'enrolled'


@pytest.mark.parametrize('action,status,label', [
    ('cancel', 'cancelled', 'Cancelada'), ('transfer', 'transferred', 'Transferida'),
])
def test_original_receipt_survives_later_academic_movement(online, action, status, label):
    o = online
    approved = approve(o, submit(o, draft(o)))
    path = '/admissions/' + approved['id']
    effective = o['api'].post(path + '/finalize', {'version': approved['version'], 'reason': 'Documentos conferidos.'}, 200)
    receipt = next(doc for doc in effective['issued_documents'] if doc['kind'] == 'enrollment_receipt')
    download = path + '/issued/' + receipt['id']
    before = pc(o, 'GET', download).content
    o['api'].move(o['api'].get('/enrollments/' + effective['enrollment_id']), action)
    current = pc(o, 'GET', path)
    assert current['status'] == 'enrolled'
    assert current['enrollment']['status'] == status
    assert current['enrollment']['status_label'] == label
    assert pc(o, 'GET', download).content == before
    assert o['api'].get(path + '/readiness') == {
        'ready': False, 'enrolled': True, 'enrollment_status': status, 'checks': [],
    }


@pytest.mark.parametrize('active,legal,financial', [
    (True, True, False), (True, False, True), (False, True, True),
])
def test_approval_does_not_expand_existing_guardian_roles(online, active, legal, financial):
    o = online
    api = o['api']
    admission = submit(o, draft(o))
    student = api.post('/students', {'person': {'name': 'Aluno Online', 'birth_date': '2017-03-10'}})
    parent = api.post('/persons', {'name': 'Responsável Teste', 'cpf': CPF})
    link = api.post('/students/' + student['id'] + '/guardians', {
        'person_id': parent['id'], 'active': active, 'legal': legal, 'financial': financial, 'pickup': True,
    })
    api.post('/admissions/' + admission['id'] + '/approve', {
        'version': admission['version'], 'identity_confirmed': True, 'reason': 'Conferência do cadastro familiar.',
        'existing_student_id': student['id'], 'existing_guardian_id': parent['id'],
    }, 409)
    with SessionLocal() as db:
        current = db.get(m.GuardianLink, link['id'])
        assert (current.active, current.legal, current.financial, current.pickup) == (active, legal, financial, True)
        assert db.get(m.Admission, admission['id']).enrollment_id is None


def test_campaign_accepts_future_contract_only_for_compatible_window_and_kind(online):
    o = online
    api = o['api']
    campaign = o['campaign']
    start = date.today() + timedelta(days=12)
    data = {key: campaign[key] for key in (
        'slug', 'title', 'instructions', 'privacy_notice', 'terms_version', 'class_group_ids',
        'opens_on', 'closes_on', 'active', 'require_verified_contact', 'require_documents',
        'require_payment_before_enrollment', 'version',
    )}
    path = '/admission-campaigns/' + campaign['id']
    def template(kind, **values):
        return api.post('/document-templates', {'name': 'Documento do processo', 'kind': kind,
                         'body': 'Documento de matrícula escolar.', 'require_signature': True, **values})['id']
    api.call('PATCH', path, {**data, 'contract_template_id': template('declaration')}, 422)
    api.call('PATCH', path, {**data, 'contract_template_id': template('educational_contract',
             valid_until=str(date.today() - timedelta(days=7)))}, 422)
    saved = api.call('PATCH', path, {**data, 'contract_template_id': template('educational_contract', valid_from=str(start))})
    assert saved['contract_template_id']
    admission = submit(o, draft(o))
    api.post('/admissions/' + admission['id'] + '/approve', {'version': admission['version'],
             'identity_confirmed': True, 'reason': 'Conferência do modelo da campanha.'}, 409)
    assert not api.get('/admissions/' + admission['id'])['enrollment_id']
