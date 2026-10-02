"""Preferências pessoais e avisos deduplicados de vencimento do certificado."""
import hashlib
import math
import re
from datetime import timedelta

from fastapi import APIRouter, Request
from pydantic import BaseModel
from sqlalchemy import Boolean, ForeignKey, UniqueConstraint, select
from sqlalchemy.orm import Mapped, mapped_column

from . import models as m
from .common import audit
from .config import settings
from .contract_signatures import SchoolSigningCertificate, _certificate
from .db import Base, Record, now
from .integration_core import IntegrationFailure, enqueue
from .security import Actor, DB, Scope, fail, lock_school, utc
from .fiscal_signing import authorize_fiscal

router = APIRouter(prefix='/api/v1/schools/{school_id}', tags=['Alertas de certificado'])


class CertificateAlertPreference(Record, m.Scoped, Base):
    __tablename__ = 'certificate_alert_preferences'
    user_id: Mapped[str] = mapped_column(ForeignKey('users.id'), index=True)
    email_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    whatsapp_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    __table_args__ = (UniqueConstraint('school_id', 'user_id', name='uq_certificate_alert_preference'),)


class AlertPreferenceInput(BaseModel):
    email_enabled: bool = False
    whatsapp_enabled: bool = False


def _access(db, user, school_id):
    access = db.get(m.SchoolAccess, (user.id, school_id)) if user else None
    return bool(user and user.active and user.role in {'admin', 'direction'}
                and access and access.active and not access.archived_at)


def expiry_notice(certificate):
    remaining = (utc(certificate.expires_at) - now()).total_seconds()
    days = max(0, math.ceil(remaining / 86400))
    if remaining > 30 * 86400:
        return None
    bucket = 'expired' if remaining <= 0 else str(next(x for x in (1, 7, 15, 30) if days <= x))
    message = ('O certificado A1 venceu. Atualize-o para continuar assinando.' if remaining <= 0
               else f'O certificado A1 vence em {days} dia(s). Programe a renovação.')
    return {'id': 'certificate:' + certificate.certificate_sha256[:16] + ':' + bucket,
            'kind': 'certificate_expiry', 'severity': 'error' if remaining <= 0 else 'warning',
            'title': 'Certificado vencido' if remaining <= 0 else 'Renovação do certificado',
            'message': message, 'expires_at': utc(certificate.expires_at).isoformat(),
            'days_remaining': days, 'route': 'certificate', 'bucket': bucket}


@router.get('/signing-certificate/alerts')
def alerts(db: DB, user: Actor, school: Scope):
    authorize_fiscal(user)
    certificate = _certificate(db, school.id)
    notice = expiry_notice(certificate) if certificate else None
    return {'items': [notice] if notice else []}


def preference_output(db, user, school_id):
    pref = db.scalar(select(CertificateAlertPreference).where(
        CertificateAlertPreference.school_id == school_id, CertificateAlertPreference.user_id == user.id))
    profile = db.get(m.UserProfile, user.id)
    phone = re.sub(r'\D', '', profile.phone if profile else '')
    return {'email_enabled': bool(pref and pref.email_enabled), 'whatsapp_enabled': bool(pref and pref.whatsapp_enabled),
            'email': user.email, 'phone_available': bool(re.fullmatch(r'55\d{10,11}', phone)),
            'thresholds_days': [30, 15, 7, 1, 0]}


@router.get('/signing-certificate/alert-preferences')
def get_preferences(db: DB, user: Actor, school: Scope):
    authorize_fiscal(user)
    return preference_output(db, user, school.id)


@router.put('/signing-certificate/alert-preferences')
def save_preferences(data: AlertPreferenceInput, db: DB, user: Actor, school: Scope, request: Request):
    authorize_fiscal(user)
    lock_school(db, school.id)
    if data.whatsapp_enabled and not preference_output(db, user, school.id)['phone_available']:
        fail(422, 'Cadastre seu WhatsApp no perfil com DDI 55 e DDD antes de ativar avisos.')
    row = db.scalar(select(CertificateAlertPreference).where(
        CertificateAlertPreference.school_id == school.id, CertificateAlertPreference.user_id == user.id))
    if row is None:
        row = CertificateAlertPreference(school_id=school.id, user_id=user.id)
        db.add(row)
    row.email_enabled, row.whatsapp_enabled = data.email_enabled, data.whatsapp_enabled
    db.flush()
    audit(db, request, user, 'certificate_alert.preferences_changed', row, school.id,
          {'email_enabled': row.email_enabled, 'whatsapp_enabled': row.whatsapp_enabled})
    return preference_output(db, user, school.id)


def schedule_certificate_alerts(db):
    """Somente enfileira; nenhuma mensagem sai no processo HTTP ou nos testes."""
    candidates = db.execute(select(CertificateAlertPreference, SchoolSigningCertificate).join(
        SchoolSigningCertificate, SchoolSigningCertificate.school_id == CertificateAlertPreference.school_id
    ).join(m.School, m.School.id == CertificateAlertPreference.school_id).where(
        m.School.active.is_(True), SchoolSigningCertificate.expires_at <= now() + timedelta(days=30),
        CertificateAlertPreference.email_enabled | CertificateAlertPreference.whatsapp_enabled
    ).order_by(CertificateAlertPreference.id)).all()
    queued = 0
    for pref, certificate in candidates:
        user = db.get(m.User, pref.user_id)
        if not _access(db, user, pref.school_id):
            continue
        lock_school(db, pref.school_id)
        notice = expiry_notice(certificate)
        for channel in ('email', 'whatsapp'):
            if not getattr(pref, channel + '_enabled'):
                continue
            token = hashlib.sha256(f'{pref.id}:{certificate.certificate_sha256}:{notice["bucket"]}:{channel}'.encode()).hexdigest()
            key = 'certificate-expiry:' + token
            if db.scalar(select(m.IntegrationJob.id).where(m.IntegrationJob.dedupe_key == key)):
                continue
            enqueue(db, pref.school_id, 'certificate_expiry_alert',
                    {'preference_id': pref.id, 'fingerprint': certificate.certificate_sha256,
                     'bucket': notice['bucket'], 'channel': channel}, key)
            queued += 1
    return queued


def execute_certificate_alert(db, job, payload, send_email):
    """Reconfere consentimento, acesso e certificado antes de cada envio."""
    from .connect_core import ConnectApiClient, connect_instance_for_school
    pref = db.get(CertificateAlertPreference, payload.get('preference_id'))
    user = db.get(m.User, pref.user_id) if pref else None
    school = db.get(m.School, job.school_id)
    certificate = _certificate(db, job.school_id)
    channel = payload.get('channel')
    if (not pref or pref.school_id != job.school_id or not school or not school.active
            or channel not in {'email', 'whatsapp'} or not _access(db, user, job.school_id)
            or not getattr(pref, channel + '_enabled') or not certificate
            or certificate.certificate_sha256 != payload.get('fingerprint')):
        return 'cancelled-precondition'
    notice = expiry_notice(certificate)
    if not notice or notice['bucket'] != payload.get('bucket'):
        return 'cancelled-stale'
    text = (school.name + ': ' + notice['message'] + ' Validade: ' +
            utc(certificate.expires_at).strftime('%d/%m/%Y') +
            '. Acesse Configurações > Certificados A1 na aplicação: ' + settings().app_url)
    if channel == 'email':
        return send_email({'to': user.email, 'subject': 'Renovação do certificado — ' + school.name,
                           'text': text})
    profile = db.get(m.UserProfile, user.id)
    phone = re.sub(r'\D', '', profile.phone if profile else '')
    if not re.fullmatch(r'55\d{10,11}', phone):
        raise IntegrationFailure('CERTIFICATE_ALERT_PHONE_MISSING')
    instance = connect_instance_for_school(db, school.id, required=False)
    if not instance:
        raise IntegrationFailure('CERTIFICATE_ALERT_WHATSAPP_UNAVAILABLE')
    return ConnectApiClient().send_text(instance.name, phone, text, job.dedupe_key)
