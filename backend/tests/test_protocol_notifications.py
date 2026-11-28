import uuid
from unittest.mock import Mock

import pytest
from sqlalchemy import select

from app import models as m, protocol_notifications as notices
from app.config import settings
from app.db import SessionLocal
from app.integration_core import IntegrationFailure, unseal


@pytest.fixture
def public_reply(api, monkeypatch):
    student = api.student('Aluno de demonstração do atendimento')
    guardian = api.guardian(student)
    school_id = api.school['id']
    monkeypatch.setattr(settings(), 'smtp_host', 'smtp.example.test')
    monkeypatch.setattr(settings(), 'smtp_from', 'escola@example.test')
    with SessionLocal() as db:
        manager = db.scalar(select(m.User).where(m.User.email == 'admin@example.com'))
        user = m.User(email=f'{uuid.uuid4()}@example.test',role='guardian',person_id=guardian['id'],
                      name='Titular de teste',password_hash='unusable')
        db.add(user)
        db.flush()
        db.add(m.SchoolAccess(user_id=user.id,school_id=school_id))
        protocol = m.Protocol(school_id=school_id,number='PRO-000001',kind='Solicitação',
                              requester_user_id=user.id,source='family',category='secretaria',student_id=student['id'],
                              preferred_channel='email',description='Conteúdo privado da solicitação')
        db.add(protocol)
        db.flush()
        reply = m.ProtocolEvent(school_id=school_id,protocol_id=protocol.id,actor_id=manager.id,
                                visibility='public',action='public_message',message='Conteúdo privado da resposta')
        db.add(reply)
        db.flush()
        yield db, protocol, reply, user


def test_public_notice_keeps_details_in_portal_and_is_idempotent(public_reply):
    db, protocol, event, user = public_reply
    assert notices.available_channels(db,protocol.school_id,user) == ['portal','email']
    job = notices.queue_protocol_notice(db,protocol,event)
    assert notices.queue_protocol_notice(db,protocol,event).id == job.id
    assert notices.delivery_by_event(db,protocol.school_id,[event]) == {
        event.id: {'channel': 'email', 'status': 'pending'}}
    assert not notices.delivery_by_event(db,str(uuid.uuid4()),[event])
    payload = unseal(job.encrypted_payload)
    send = Mock(return_value='accepted')
    assert notices.execute_protocol_notice(db,job,payload,send) == 'accepted'
    message = send.call_args.args[0]
    assert message['to'] == user.email
    assert protocol.number in message['text'] and '/family' in message['text']
    assert event.message not in str(message) and protocol.description not in str(message)
    assert user.email not in str(payload)
    event.visibility = 'internal'
    assert notices.queue_protocol_notice(db,protocol,event) is None
    assert not notices.delivery_by_event(db,protocol.school_id,[event])
    event.visibility = 'public'
    event.actor_id = user.id
    assert notices.queue_protocol_notice(db,protocol,event) is None


@pytest.mark.parametrize('change,code', [
    ('preference','PROTOCOL_NOTICE_NO_LONGER_AUTHORIZED'),
    ('school_access','PROTOCOL_NOTICE_NO_LONGER_AUTHORIZED'),
    ('student_link','PROTOCOL_NOTICE_NO_LONGER_AUTHORIZED'),
    ('email','PROTOCOL_NOTICE_CONTACT_CHANGED'),
    ('visibility','PROTOCOL_NOTICE_NO_LONGER_AUTHORIZED'),
])
def test_delayed_delivery_revalidates_access_and_destination(public_reply,change,code):
    db, protocol, event, user = public_reply
    job = notices.queue_protocol_notice(db,protocol,event)
    if change == 'preference': protocol.preferred_channel = 'portal'
    if change == 'school_access': db.get(m.SchoolAccess,(user.id,protocol.school_id)).active = False
    if change == 'student_link':
        link = db.scalar(select(m.GuardianLink).where(m.GuardianLink.student_id == protocol.student_id,
                                                       m.GuardianLink.person_id == user.person_id))
        link.active = False
    if change == 'email': user.email = 'alterado@example.test'
    if change == 'visibility': event.visibility = 'internal'
    db.flush()
    with pytest.raises(IntegrationFailure, match=code):
        notices.execute_protocol_notice(db,job,unseal(job.encrypted_payload),Mock(side_effect=AssertionError('Envio indevido')))


def test_whatsapp_uses_school_line_and_requester_phone(public_reply,monkeypatch):
    db, protocol, event, user = public_reply
    school = db.get(m.School,protocol.school_id)
    company_line = m.ConnectInstance(name='instancia-de-teste',status='open',enabled=True,primary=True,
                                     phone='+55 (71) 98765-1234',school_id=school.id,company_id=school.company_id)
    db.add(company_line)
    db.flush()
    assert notices.school_whatsapp_contact(db,school.id) == '5571987651234'
    assert 'whatsapp' in notices.available_channels(db,school.id,user)
    protocol.preferred_channel = 'whatsapp'
    job = notices.queue_protocol_notice(db,protocol,event)
    transport = Mock()
    transport.send_text.return_value = 'mensagem-de-teste'
    monkeypatch.setattr(notices,'ConnectApiClient',lambda:transport)
    payload = unseal(job.encrypted_payload)
    assert notices.execute_protocol_notice(db,job,payload,Mock()) == 'mensagem-de-teste'
    name,number,body,key = transport.send_text.call_args.args
    assert (name,number,key) == ('instancia-de-teste','5575999990000',job.dedupe_key)
    assert protocol.number in body and event.message not in body
    company_line.status = 'close'
    assert notices.school_whatsapp_contact(db,school.id) is None
    with pytest.raises(IntegrationFailure,match='PROTOCOL_NOTICE_WHATSAPP_OFFLINE'):
        notices.execute_protocol_notice(db,job,payload,Mock())
    assert transport.send_text.call_count == 1


def test_school_opening_honors_opt_out_before_dispatch(public_reply):
    db, protocol, event, user = public_reply
    access = db.get(m.SchoolAccess, (user.id, protocol.school_id))
    access.protocol_opening_channel = 'email'
    event.action = 'public_opened'
    job = notices.queue_protocol_notice(db,protocol,event)
    payload = unseal(job.encrypted_payload)
    send = Mock()
    notices.execute_protocol_notice(db,job,payload,send)
    assert 'abriu o protocolo' in send.call_args.args[0]['text']
    access.protocol_opening_channel = 'portal'
    with pytest.raises(IntegrationFailure,match='PROTOCOL_NOTICE_NO_LONGER_AUTHORIZED'):
        notices.execute_protocol_notice(db,job,payload,send)
    assert send.call_count == 1
