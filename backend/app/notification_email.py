"""SMTP transacional da escola, independente da senha pessoal e do webmail."""
import imaplib
import smtplib
from datetime import datetime, timedelta
from email.message import EmailMessage
from email.utils import make_msgid
from types import SimpleNamespace
from typing import Literal
from fastapi import APIRouter, Request
from pydantic import ConfigDict, EmailStr, Field, field_validator
from sqlalchemy import Boolean, DateTime, Integer, String, Text, UniqueConstraint, select
from sqlalchemy.orm import Mapped, mapped_column
from . import models as m
from .config import settings
from .db import Base, Record, now
from .schemas import Input
from .security import Actor, DB, Scope, check_version, fail, lock_school, require, utc
from .common import audit
from .integration_core import IntegrationFailure, enqueue, seal, unseal
from .email_client import MailClient, SettingsInput, _mapped_error

router = APIRouter(prefix='/api/v1/schools/{school_id}/notification-email', tags=['Envio de notificações por e-mail'])


class NotificationEmailSettings(Record, m.Scoped, Base):
    __tablename__ = 'notification_email_settings'
    mode: Mapped[str] = mapped_column(String(16), default='inherit')
    host: Mapped[str] = mapped_column(String(253), default='')
    port: Mapped[int] = mapped_column(Integer, default=587)
    username: Mapped[str] = mapped_column(String(254), default='')
    from_address: Mapped[str] = mapped_column(String(254), default='')
    encrypted_secret: Mapped[str] = mapped_column(Text, default='')
    allow_private_network: Mapped[bool] = mapped_column(Boolean, default=False)
    checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_error: Mapped[str] = mapped_column(String(40), default='')
    __table_args__ = (UniqueConstraint('school_id'),)


class Configuration(Input):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=False)
    mode: Literal['inherit', 'school', 'disabled']
    host: str = Field(default='', max_length=253)
    port: Literal[465, 587] = 587
    username: str = Field(default='', max_length=254)
    from_address: EmailStr | None = None
    password: str = Field(default='', max_length=512)
    allow_private_network: bool = False
    version: int | None = Field(default=None, ge=1)

    @field_validator('host')
    @classmethod
    def hostname(cls, value):
        return SettingsInput.valid_host(value.strip())

    @field_validator('username', 'password')
    @classmethod
    def no_controls(cls, value):
        if any(ord(c) < 32 or ord(c) == 127 for c in value): raise ValueError('Caracteres de controle não são permitidos.')
        return value


def configuration(db, school_id):
    return db.scalar(select(NotificationEmailSettings).where(NotificationEmailSettings.school_id == school_id))


def available(db, school_id):
    row = configuration(db, school_id)
    if row and row.mode != 'inherit': return row.mode == 'school' and bool(row.host and row.from_address and row.encrypted_secret)
    return bool(settings().smtp_host and settings().smtp_from)


def result(db, school_id):
    row = configuration(db, school_id)
    return {'mode': row.mode if row else 'inherit', 'host': row.host if row else '',
        'port': row.port if row else 587, 'username': row.username if row else '',
        'from_address': row.from_address if row else '', 'password_configured': bool(row and row.encrypted_secret),
        'allow_private_network': bool(row and row.allow_private_network), 'version': row.version if row else None,
        'available': available(db, school_id), 'installation_configured': bool(settings().smtp_host and settings().smtp_from),
        'checked_at': row.checked_at if row else None, 'last_error': row.last_error if row else ''}


def smtp_client(row):
    password = unseal(row.encrypted_secret).get('password')
    if not row.host or not row.username or not row.from_address or not password:
        raise IntegrationFailure('SMTP_NOT_CONFIGURED')
    return MailClient(SimpleNamespace(base_url='https://' + row.host, allow_private_network=row.allow_private_network),
        SimpleNamespace(imap_host='', smtp_host=row.host, smtp_port=row.port),
        SimpleNamespace(address=row.username), password)


def send(db, school_id, payload, fallback):
    row = configuration(db, school_id)
    if not row or row.mode == 'inherit': return fallback(payload)
    if row.mode == 'disabled': raise IntegrationFailure('SMTP_DISABLED')
    message = EmailMessage()
    message['From'] = row.from_address; message['To'] = payload['to']
    message['Subject'] = payload.get('subject', 'Notificação da escola')
    message['Message-ID'] = make_msgid(domain=row.from_address.partition('@')[2])
    message.set_content(payload['text'])
    sending = False
    try:
        with smtp_client(row).smtp() as client:
            sending = True
            refused = client.send_message(message)
            if refused: raise IntegrationFailure('SMTP_RECIPIENT_REFUSED', uncertain=True)
    except (OSError, smtplib.SMTPException, IntegrationFailure) as error:
        if isinstance(error, IntegrationFailure) and error.uncertain: raise
        # Depois de DATA, não repetir automaticamente: pode ter sido aceito.
        code = _mapped_error(error).code
        raise IntegrationFailure(code if code.startswith('EMAIL_') else 'SMTP_SEND_FAILED', uncertain=sending) from None
    # Message-ID é gerado pelo cliente, não é recibo do provedor SMTP.
    # Mantém o contrato do transporte da instalação e não grava um cabeçalho
    # potencialmente longo na coluna de IDs remotos da fila.
    return ''


@router.get('')
def read(db: DB, user: Actor, school: Scope):
    require(user, 'integrations.manage')
    jobs = list(db.scalars(select(m.IntegrationJob).where(m.IntegrationJob.school_id == school.id,
        m.IntegrationJob.kind == 'smtp_email').order_by(m.IntegrationJob.created_at.desc()).limit(30)))
    labels = {'pending': 'Enfileirado', 'processing': 'Processando', 'retry': 'Aguardando nova tentativa',
        'completed': 'Aceito pelo servidor SMTP', 'failed': 'Falha de envio', 'uncertain': 'Resultado desconhecido; conferir antes de reenviar'}
    return {**result(db, school.id), 'queue_delayed': any(j.status in {'pending', 'retry'} and utc(j.created_at) < now() - timedelta(minutes=5) for j in jobs),
        'jobs': [{'id': j.id, 'status': j.status, 'label': labels.get(j.status, j.status), 'attempts': j.attempts,
            'error_code': j.error_code, 'created_at': j.created_at} for j in jobs]}


@router.put('')
def save(data: Configuration, db: DB, user: Actor, school: Scope, request: Request):
    require(user, 'integrations.manage'); lock_school(db, school.id)
    row = configuration(db, school.id)
    if row: check_version(row, data.version)
    elif data.version is not None: fail(409, 'A configuração mudou. Atualize a página.')
    if data.mode == 'school' and not (data.host and data.username and data.from_address and (data.password or row and row.encrypted_secret)):
        fail(422, 'Informe servidor, usuário, remetente e senha para o SMTP da escola.')
    if not row: row = NotificationEmailSettings(school_id=school.id); db.add(row)
    for key in ('mode', 'host', 'port', 'username', 'allow_private_network'): setattr(row, key, getattr(data, key))
    row.from_address = str(data.from_address or '')
    if data.password: row.encrypted_secret = seal({'password': data.password})
    row.checked_at = None; row.last_error = ''; row.version = (row.version or 0) + 1
    db.flush(); audit(db, request, user, 'notification_email.configured', row, school.id, {'mode': row.mode})
    return result(db, school.id)


@router.post('/validate')
def validate(db: DB, user: Actor, school: Scope, request: Request):
    require(user, 'integrations.manage'); lock_school(db, school.id)
    row = configuration(db, school.id)
    if not row or row.mode != 'school': fail(409, 'Selecione e salve o SMTP da escola antes de validar.')
    if row.checked_at and utc(row.checked_at) > now() - timedelta(seconds=10):
        fail(429, 'Aguarde 10 segundos antes de validar novamente.')
    try:
        with smtp_client(row).smtp(): pass
        row.last_error = ''
    except (OSError, smtplib.SMTPException, imaplib.IMAP4.error, IntegrationFailure) as error:
        row.last_error = _mapped_error(error).code
    row.checked_at = now(); db.flush()
    audit(db, request, user, 'notification_email.validated', row, school.id, {'code': row.last_error})
    return {**result(db, school.id), 'ok': not bool(row.last_error)}


class TestMessage(Input):
    client_key: str = Field(pattern=r'^[0-9a-f-]{36}$')


@router.post('/test', status_code=202)
def test(data: TestMessage, db: DB, user: Actor, school: Scope, request: Request):
    require(user, 'integrations.manage'); lock_school(db, school.id)
    if not available(db, school.id): fail(409, 'Configure e habilite o envio SMTP antes do teste.')
    # Destinatário fixado no usuário autenticado; este endpoint não é um relay.
    key = f'smtp-test:{school.id}:{user.id}:{data.client_key}'
    job = db.scalar(select(m.IntegrationJob).where(m.IntegrationJob.dedupe_key == key))
    if not job:
        recent = db.scalar(select(m.IntegrationJob.id).where(m.IntegrationJob.school_id == school.id,
            m.IntegrationJob.dedupe_key.startswith(f'smtp-test:{school.id}:{user.id}:'),
            m.IntegrationJob.created_at > now() - timedelta(seconds=60)))
        if recent: fail(429, 'Aguarde 60 segundos antes de solicitar outro e-mail de teste.')
        job = enqueue(db, school.id, 'smtp_email', {'to': user.email, 'subject': school.name + ' · Teste de envio',
            'text': 'Mensagem de teste solicitada na configuração da escola. Confira a caixa de entrada e o spam. Aceitação SMTP não comprova entrega.'}, key)
    audit(db, request, user, 'notification_email.test_queued', job, school.id)
    return {'job_id': job.id, 'status': job.status, 'recipient': user.email}
