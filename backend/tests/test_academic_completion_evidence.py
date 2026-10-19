"""End-to-end API evidence for persisted drafts and a paid/document-pending seat."""
from datetime import timedelta
import uuid

from fastapi.testclient import TestClient

from app import models as m
from app.db import SessionLocal, now
from app.documents import render_pdf
from app.main import app
from test_admission_reservations import policy, bill, receive
from test_online import online, draft, submit, approve, pc  # noqa: F401
from conftest import PASSWORD


def test_paid_reservation_keeps_last_seat_while_required_document_is_pending(online):
    o = online
    api = o['api']
    policy(o)
    document_type = api.post('/document-types', {'name': 'Certidão obrigatória', 'required': True})
    school = api.school
    api.client.patch('/api/v1/schools/'+school['id'], headers=api.headers, json={
        'version': school['version'], 'data': {'name': school['name'],
        'company_id': school['company_id'], 'document_policy': 'block'}}).raise_for_status()
    admission = approve(o, submit(o, draft(o)))
    receive(o, bill(o, admission))
    with SessionLocal.begin() as db:
        db.get(m.Admission, admission['id']).reserved_until = now()-timedelta(days=2)
    paid = api.get('/admissions/'+admission['id'])
    assert paid['reservation']['status'] == 'paid'
    checklist = api.get('/enrollments/'+paid['enrollment_id'])['checklist']
    assert any(row['required'] and not row['complete'] for row in checklist)
    api.post('/admissions/'+paid['id']+'/finalize', {
        'version': paid['version'], 'reason': 'Documento obrigatório ainda pendente.'}, 409)
    assert api.get('/class-groups')[0]['available'] == 0
    competitor = submit(o, draft(o))
    api.post('/admissions/'+competitor['id']+'/approve', {'version': competitor['version'],
        'identity_confirmed': True, 'reason': 'A última vaga continua com a reserva paga.'}, 409)
    raw = render_pdf('Escola sintética', 'Certidão sintética', [('Aluno', 'Aluno Online')])
    document = api.call('POST', '/students/'+paid['student_id']+'/documents', expect=201,
        data={'document_type_id': document_type['id']}, files={'file': ('certidao.pdf', raw, 'application/pdf')})
    api.post('/admissions/'+paid['id']+'/finalize', {
        'version': paid['version'], 'reason': 'Documento enviado ainda não foi conferido.'}, 409)
    api.patch('/student-documents/'+document['id'], {
        'version': document['version'], 'status': 'validated', 'notes': 'Conferência sintética concluída.'})
    completed = api.post('/admissions/'+paid['id']+'/finalize', {
        'version': paid['version'], 'reason': 'Pagamento e documento obrigatórios conferidos.'}, 200)
    assert completed['status'] == 'enrolled' and completed['reservation']['status'] == 'consumed'
    assert api.get('/class-groups')[0]['occupied'] == 1
    assert len(api.get('/enrollments/'+paid['enrollment_id'])['history']) == 2


def test_saved_draft_survives_new_session_and_repeated_creation_after_lost_response(online):
    o = online
    payload = {'campaign_id': o['campaign']['id'], 'class_group_id': o['cat']['group']['id'],
        'client_key': str(uuid.uuid4()), 'student': {'name': 'Aluno Retomado', 'birth_date': '2017-03-10'},
        'relationship': 'Responsável legal', 'notes': 'Preenchimento preservado após reconexão.'}
    saved = pc(o, 'POST', '/admissions', payload, 201)
    # A committed request whose response is lost can be repeated with the same key.
    assert pc(o, 'POST', '/admissions', payload, 201)['id'] == saved['id']
    pc(o, 'POST', '/logout', {})
    with TestClient(app, base_url='http://testserver') as browser:
        resumed = {**o, 'parent': browser}
        pc(resumed, 'POST', '/login', {'email': o['account']['email'], 'password': PASSWORD,
            'campaign_slug': o['campaign']['slug']})
        listing = pc(resumed, 'GET', '/admissions')
        assert listing['total'] == 1 and listing['items'][0]['id'] == saved['id']
        current = pc(resumed, 'GET', '/admissions/'+saved['id'])
        assert current['status'] == 'draft' and current['notes'] == payload['notes']
        edited = pc(resumed, 'PATCH', '/admissions/'+saved['id'], {
            **{key: value for key, value in payload.items() if key not in {'campaign_id', 'client_key'}},
            'version': current['version'], 'student': {**payload['student'], 'name': 'Aluno Retomado Corrigido'}})
        assert submit(resumed, edited)['status'] == 'submitted'
        assert pc(resumed, 'GET', '/admissions')['total'] == 1
