"""Regressões do fluxo público: correções, anexos e idempotência."""
from datetime import timedelta
from io import BytesIO
from PIL import Image
import pytest
from pydantic import ValidationError
from app import models as m, online_schemas as s
from app.config import settings
from app.db import SessionLocal
from app.portal_access import today
from test_online import online, draft, submit, pc, CSRF


def request_correction(o):
    admission = submit(o, draft(o))
    return o['api'].post('/admissions/' + admission['id'] + '/actions', {
        'version': admission['version'], 'action': 'request_changes',
        'reason': 'Confira o endereço do aluno antes de concluir.',
    }, 200)


def edit_payload(admission):
    return {'version': admission['version'], 'class_group_id': admission['class_group_id'],
            'student': {'name': 'Aluno com dados corrigidos', 'birth_date': '2017-03-10'},
            'relationship': 'Mãe'}


def test_requested_correction_can_be_finished_after_campaign_closes(online):
    o = online
    admission = request_correction(o)
    with SessionLocal() as db:
        campaign = db.get(m.AdmissionCampaign, o['campaign']['id'])
        campaign.closes_on = today() - timedelta(days=1)
        db.commit()
    updated = pc(o, 'PATCH', '/admissions/' + admission['id'], edit_payload(admission))
    assert updated['student_data']['name'] == 'Aluno com dados corrigidos'
    assert submit(o, updated)['status'] == 'submitted'


def test_unpublished_campaign_cannot_receive_corrections(online):
    o = online
    admission = request_correction(o)
    with SessionLocal() as db:
        db.get(m.AdmissionCampaign, o['campaign']['id']).active = False
        db.commit()
    pc(o, 'PATCH', '/admissions/' + admission['id'], edit_payload(admission), 409)
    pc(o, 'POST', '/admissions/' + admission['id'] + '/submit', {
        'version': admission['version'], 'accept_terms': True,
        'legal_responsibility': True, 'terms_version': '1',
    }, 409)


def test_draft_cannot_be_edited_after_campaign_closes(online):
    o = online
    admission = draft(o)
    with SessionLocal() as db:
        db.get(m.AdmissionCampaign, o['campaign']['id']).closes_on = today() - timedelta(days=1)
        db.commit()
    pc(o, 'PATCH', '/admissions/' + admission['id'], edit_payload(admission), 409)


def test_replacing_attachment_at_file_limit_is_allowed(online, monkeypatch):
    o = online
    admission = draft(o)
    dtype = o['api'].post('/document-types', {'name': 'Certidão de nascimento', 'required': True})
    buffer = BytesIO()
    Image.new('RGB', (2, 2), (255, 255, 255)).save(buffer, format='PNG')
    monkeypatch.setattr(settings(), 'portal_max_files', 1)
    def upload(version, name):
        response = o['parent'].post('/api/v1/portal/admissions/' + admission['id'] + '/attachments',
            headers=CSRF, data={'version': version, 'document_type_id': dtype['id']},
            files={'file': (name, buffer.getvalue(), 'image/png')})
        assert response.status_code == 201, response.text
        return response.json()
    first = upload(admission['version'], 'primeira.png')
    second = upload(first['version'], 'corrigida.png')
    assert len(second['attachments']) == 1
    assert second['attachments'][0]['original_name'] == 'corrigida.png'
    assert first['attachments'][0]['id'] != second['attachments'][0]['id']


def test_retry_key_cannot_silently_ignore_changed_relationship(online):
    o = online
    admission = draft(o)
    payload = {'campaign_id': admission['campaign_id'], 'class_group_id': admission['class_group_id'],
               'client_key': admission['client_key'], 'student': {'name': 'Aluno Online', 'birth_date': '2017-03-10'},
               'relationship': 'Pai'}
    pc(o, 'POST', '/admissions', payload, 409)


@pytest.mark.parametrize('schema,payload', [
    (s.Registration, {'campaign_slug': 'matriculas', 'name': 'Responsável', 'email': 'teste@example.com',
        'password': 'test-password-2026', 'accept_privacy': True, 'terms_version': '1'}),
    (s.PortalProfile, {'version': 1, 'name': 'Responsável'}),
    (s.PortalAccountRegistration, {'school_id': 'school', 'name': 'Responsável', 'email': 'teste@example.com',
        'password': 'test-password-2026', 'cpf': '52998224725', 'accept_privacy': True, 'terms_version': '1'}),
])
def test_whatsapp_opt_in_requires_phone(schema, payload):
    with pytest.raises(ValidationError, match='Informe um telefone'):
        schema(**payload, whatsapp_opt_in=True)
    result = schema(**payload, whatsapp_opt_in=True, phone='(75) 99999-0000')
    assert result.phone == '5575999990000'
