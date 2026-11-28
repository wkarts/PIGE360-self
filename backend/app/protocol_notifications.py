"""Avisos opcionais para o titular de um protocolo. As mensagens públicas ficam no portal."""
import hashlib
import re

from sqlalchemy import select

from . import models as m, notification_email
from .config import settings
from .connect_core import ConnectApiClient, connect_instance_for_school
from .integration_core import IntegrationFailure, enqueue
from .user_invitations import access_link_base

NOTICE_ACTIONS = {'public_opened', 'public_message', 'public_status'}


def _phone(value):
    """Aceita um único telefone cadastrado, com DDI ou no formato nacional."""
    if not value or not re.fullmatch(r'[+()\d\s.\-]+', value):
        return ''
    digits = re.sub(r'\D', '', value)
    if len(digits) in (10, 11) and not value.strip().startswith('+'):
        digits = '55' + digits
    return digits if re.fullmatch(r'[1-9][0-9]{10,14}', digits) else ''


def _user_phone(db, school_id, user):
    profile = db.get(m.UserProfile, user.id)
    if profile and profile.phone:
        return _phone(profile.phone)
    person = db.get(m.Person, user.person_id) if user.person_id else None
    return _phone(person.phone) if person and person.active and person.school_id == school_id else ''


def _open_instance(db, school_id):
    instance = connect_instance_for_school(db, school_id, required=False)
    return instance if instance and instance.status == 'open' else None


def school_whatsapp_contact(db, school_id):
    instance = _open_instance(db, school_id)
    return (_phone(instance.phone) or None) if instance else None


def available_channels(db, school_id, user):
    channels = ['portal']
    if user.email and notification_email.available(db, school_id):
        channels.append('email')
    cfg = settings()
    if cfg.connect_api_key and cfg.connect_api_base_url and _user_phone(db, school_id, user) and _open_instance(db, school_id):
        channels.append('whatsapp')
    return channels


def _destination(db, school_id, user, channel):
    return user.email.strip().lower() if channel == 'email' else _user_phone(db, school_id, user)


def _fingerprint(destination):
    return hashlib.sha256(destination.encode()).hexdigest()


def queue_protocol_notice(db, protocol, event):
    channel = protocol.preferred_channel
    if (channel not in ('email', 'whatsapp') or event.visibility != 'public'
            or event.action not in NOTICE_ACTIONS or event.actor_id == protocol.requester_user_id):
        return None
    user = db.get(m.User, protocol.requester_user_id) if protocol.requester_user_id else None
    if not user or not user.active:
        return None
    destination = _destination(db, protocol.school_id, user, channel)
    if not destination:
        return None
    return enqueue(db, protocol.school_id, 'protocol_notice',
                   {'protocol_id': protocol.id, 'event_id': event.id, 'channel': channel,
                    'requester_id': user.id, 'destination_hash': _fingerprint(destination)},
                   f'protocol-notice:{event.id}:{channel}')


def delivery_by_event(db, school_id, events):
    """Retorna à secretaria apenas a situação de transporte dos avisos públicos."""
    keys = {f'protocol-notice:{event.id}:{channel}': (event.id, channel)
            for event in events if event.visibility == 'public' for channel in ('email', 'whatsapp')}
    result = {}
    identifiers = list(keys)
    for start in range(0, len(identifiers), 500):
        query = select(m.IntegrationJob.dedupe_key, m.IntegrationJob.status).where(
            m.IntegrationJob.school_id == school_id, m.IntegrationJob.kind == 'protocol_notice',
            m.IntegrationJob.dedupe_key.in_(identifiers[start:start + 500]))
        for key, status in db.execute(query):
            event_id, channel = keys[key]
            result[event_id] = {'channel': channel, 'status': status}
    return result


def execute_protocol_notice(db, job, payload, send_email):
    from .protocol_portal import requester_has_access
    protocol = db.get(m.Protocol, payload['protocol_id'])
    event = db.get(m.ProtocolEvent, payload['event_id'])
    user = db.get(m.User, payload['requester_id'])
    channel = payload['channel']
    if (not protocol or not event or not user or not user.active or protocol.school_id != job.school_id
            or event.protocol_id != protocol.id or event.school_id != job.school_id
            or event.visibility != 'public' or event.action not in NOTICE_ACTIONS
            or event.actor_id == user.id or user.id != protocol.requester_user_id
            or channel not in ('email', 'whatsapp') or channel != protocol.preferred_channel
            or not requester_has_access(db, protocol, user)):
        raise IntegrationFailure('PROTOCOL_NOTICE_NO_LONGER_AUTHORIZED')
    if event.action == 'public_opened':
        access = db.get(m.SchoolAccess, (user.id, job.school_id))
        if not access or access.protocol_opening_channel != channel:
            raise IntegrationFailure('PROTOCOL_NOTICE_NO_LONGER_AUTHORIZED')
    destination = _destination(db, protocol.school_id, user, channel)
    if not destination or _fingerprint(destination) != payload['destination_hash']:
        raise IntegrationFailure('PROTOCOL_NOTICE_CONTACT_CHANGED')
    school = db.get(m.School, job.school_id)
    portal = access_link_base(user.role)
    action = 'abriu' if event.action == 'public_opened' else 'atualizou'
    message = (f'{school.name} {action} o protocolo {protocol.number}. '
               f'Para ler e responder, acesse Fale com o colégio no seu portal: {portal}')
    if channel == 'email':
        return send_email({'to': destination, 'subject': f'{school.name} · Protocolo {protocol.number}', 'text': message})
    instance = _open_instance(db, job.school_id)
    if not instance:
        raise IntegrationFailure('PROTOCOL_NOTICE_WHATSAPP_OFFLINE', retryable=True)
    return ConnectApiClient().send_text(instance.name, destination, message, job.dedupe_key)
