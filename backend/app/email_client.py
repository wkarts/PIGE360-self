"""Cliente institucional IMAP/SMTP. Nenhuma mensagem é enviada por tarefas de fundo.

TLS com hostname verificado, endereço fixado após validar DNS, credenciais por
usuário/escola e conteúdo recebido convertido em texto. Não registra MIME/senhas.
"""
from __future__ import annotations

import base64
import binascii
import hashlib
import imaplib
import ipaddress
import secrets
import re
import smtplib
import socket
import ssl
import time
from contextlib import asynccontextmanager, contextmanager
from datetime import datetime, timedelta
from email import policy
from email.message import EmailMessage
from email.parser import BytesParser
from email.utils import format_datetime, formataddr, make_msgid
from html.parser import HTMLParser
from typing import Annotated, Literal
from urllib.parse import quote, unquote, urlsplit
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Form
from fastapi.responses import Response, RedirectResponse
import httpx
from pydantic import ConfigDict, EmailStr, Field, field_validator
from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Mapped, mapped_column

from . import models as m
from .common import audit
from .config import settings
from .db import Base, Record, SessionLocal, now
from .integration_core import IntegrationFailure, seal, unseal
from .mailcow import MailcowConfig, SchoolMailbox, _base_url, reconciliation_candidate, reconcile_mailbox
from .schemas import Input
from .security import Actor, DB, fail, lock_school, request_csrf, utc

router = APIRouter(prefix='/api/v1/schools/{school_id}/email', tags=['Meu e-mail'])
webmail_router = APIRouter()
MAX_MESSAGE = 10 * 1024 * 1024
MAX_ATTACHMENTS = 5 * 1024 * 1024
MAX_RECIPIENTS = 50
MAX_FOLDERS = 100
MAX_WEBMAIL_RESPONSE = 50 * 1024 * 1024
ERRORS = {
    'EMAIL_AUTH': 'A senha da caixa de e-mail foi recusada. Conecte novamente com a senha atual.',
    'EMAIL_TLS': 'Não foi possível validar a segurança do servidor de e-mail. Solicite ao administrador a conferência do certificado.',
    'EMAIL_DNS': 'Não foi possível localizar o servidor de e-mail. Tente novamente mais tarde.',
    'EMAIL_ADDRESS': 'O endereço do servidor de e-mail não é permitido. Solicite a revisão da configuração ao administrador.',
    'EMAIL_NETWORK': 'Não foi possível conectar ao servidor de e-mail. Tente novamente mais tarde.',
    'EMAIL_PROTOCOL': 'O servidor não concluiu a operação. Atualize a caixa e tente novamente.',
    'EMAIL_TOO_LARGE': 'A mensagem ultrapassa o limite de leitura de 10 MB.',
    'EMAIL_UNSUPPORTED': 'O servidor não oferece a operação segura necessária para esta ação.',
}


class EmailServerSettings(Record, m.Scoped, Base):
    __tablename__ = 'email_server_settings'
    imap_host: Mapped[str] = mapped_column(String(253), default='')
    smtp_host: Mapped[str] = mapped_column(String(253), default='')
    smtp_port: Mapped[int] = mapped_column(Integer, default=465)
    webmail_default: Mapped[str] = mapped_column(String(16), default='sogo', server_default='sogo')
    __table_args__ = (UniqueConstraint('school_id'),)


class EmailConnection(Record, m.Scoped, Base):
    __tablename__ = 'email_connections'
    mailbox_id: Mapped[str] = mapped_column(ForeignKey('school_mailboxes.id'), unique=True)
    user_id: Mapped[str] = mapped_column(ForeignKey('users.id'), index=True)
    address_override: Mapped[str] = mapped_column(String(254), default='', server_default='')
    encrypted_secret: Mapped[str] = mapped_column(Text, default='')
    validated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_error: Mapped[str] = mapped_column(String(40), default='')
    __table_args__ = (UniqueConstraint('school_id', 'user_id'),)


class EmailSubmission(Record, m.Scoped, Base):
    """Recibo sem corpo: intenção durável impede repetição após timeout SMTP."""
    __tablename__ = 'email_submissions'
    mailbox_id: Mapped[str] = mapped_column(ForeignKey('school_mailboxes.id'), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey('users.id'))
    request_id: Mapped[str] = mapped_column(String(36))
    payload_hash: Mapped[str] = mapped_column(String(64))
    message_id: Mapped[str] = mapped_column(String(254))
    status: Mapped[str] = mapped_column(String(16), default='sending')
    result: Mapped[dict] = mapped_column(JSON, default=dict)
    __table_args__ = (UniqueConstraint('mailbox_id', 'request_id'),)


class WebmailSession(Record, m.Scoped, Base):
    """Ticket de uso único e sessão webmail, vinculados a uma caixa e escola."""
    __tablename__ = 'email_webmail_sessions'
    user_id: Mapped[str] = mapped_column(ForeignKey('users.id'), index=True)
    mailbox_id: Mapped[str] = mapped_column(ForeignKey('school_mailboxes.id'), index=True)
    token_hash: Mapped[str] = mapped_column(String(64))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    redeemed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    __table_args__ = (UniqueConstraint('token_hash'),)


class WebmailPreference(Record, m.Scoped, Base):
    """User selection independent of the mailbox connection and its password."""
    __tablename__ = 'email_webmail_preferences'
    user_id: Mapped[str] = mapped_column(ForeignKey('users.id'), index=True)
    mode: Mapped[str] = mapped_column(String(16))
    __table_args__ = (UniqueConstraint('school_id', 'user_id'),)


class ConnectionInput(Input):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=False)
    password: str = Field(min_length=1, max_length=512)
    # The configured school domain is authoritative; accept internal/test TLDs too.
    address: str | None = Field(default=None, min_length=3, max_length=254)

    @field_validator('password')
    @classmethod
    def valid_password(cls, value):
        if any(ord(c) < 32 or ord(c) == 127 for c in value):
            raise ValueError('A senha contém caracteres não permitidos.')
        return value

    @field_validator('address')
    @classmethod
    def valid_address(cls, value):
        if value is None:
            return value
        value = value.strip()
        if not re.fullmatch(r'[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+', value):
            raise ValueError('Informe um e-mail válido.')
        return value


class SettingsInput(Input):
    imap_host: str = Field(default='', max_length=253)
    smtp_host: str = Field(default='', max_length=253)
    smtp_port: Literal[465, 587] = 465

    @field_validator('imap_host', 'smtp_host')
    @classmethod
    def valid_host(cls, value):
        if not value:
            return ''
        if any(char in value for char in '/:@?#'):
            raise ValueError('Informe somente o hostname do servidor de e-mail.')
        return urlsplit(_base_url('https://' + value)).hostname


class WebmailModeInput(Input):
    mode: Literal['inherit', 'sogo', 'alternative']


class WebmailDefaultInput(Input):
    mode: Literal['sogo', 'alternative']


class MessageRef(Input):
    folder: str = Field(min_length=1, max_length=1400)
    uid: int = Field(ge=1, le=4294967295)
    uidvalidity: int = Field(ge=1, le=4294967295)


class FlagsInput(Input):
    folder: str = Field(min_length=1, max_length=1400)
    uidvalidity: int = Field(ge=1, le=4294967295)
    seen: bool | None = None
    flagged: bool | None = None


class MoveInput(Input):
    folder: str = Field(min_length=1, max_length=1400)
    uidvalidity: int = Field(ge=1, le=4294967295)
    destination: str = Field(min_length=1, max_length=1400)


class FolderInput(Input):
    name: str = Field(min_length=1, max_length=120)


class AttachmentInput(Input):
    filename: str = Field(min_length=1, max_length=180)
    content_type: str = Field(default='application/octet-stream', max_length=100)
    content_base64: str = Field(max_length=(MAX_ATTACHMENTS * 4 // 3 + 8))


class ComposeInput(Input):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=False)
    to: list[EmailStr] = Field(default_factory=list, max_length=MAX_RECIPIENTS)
    cc: list[EmailStr] = Field(default_factory=list, max_length=MAX_RECIPIENTS)
    bcc: list[EmailStr] = Field(default_factory=list, max_length=MAX_RECIPIENTS)
    subject: str = Field(default='', max_length=300)
    text: str = Field(default='', max_length=500_000)
    attachments: list[AttachmentInput] = Field(default_factory=list, max_length=10)
    in_reply_to: str = Field(default='', max_length=254)
    draft: MessageRef | None = None
    request_id: UUID | None = None

    @field_validator('subject', 'in_reply_to')
    @classmethod
    def valid_header(cls, value):
        if any(ord(c) < 32 or ord(c) == 127 for c in value):
            raise ValueError('O cabeçalho contém caracteres não permitidos.')
        return value


def _school(school_id: str, db: DB, user: Actor):
    # Meu e-mail é pessoal inclusive para professores, alunos e responsáveis.
    school = db.get(m.School, school_id)
    if not school or not school.active:
        fail(404, 'Escola não encontrada.')
    membership = db.get(m.SchoolAccess, (user.id, school_id))
    if not membership or not membership.active:
        fail(403, 'Acesso não autorizado a esta escola.')
    return school


EmailScope = Annotated[m.School, Depends(_school)]


def _owned(db, user, school, required=True):
    mailbox = db.scalar(select(SchoolMailbox).where(SchoolMailbox.school_id == school.id,
                                                  SchoolMailbox.user_id == user.id))
    if required and (not mailbox or not mailbox.provisioned_at or not mailbox.remote_active):
        fail(409, 'Sua caixa de e-mail institucional ainda não está disponível. Consulte o administrador.')
    return mailbox


def _connection(db, mailbox):
    return db.scalar(select(EmailConnection).where(EmailConnection.mailbox_id == mailbox.id,
                    EmailConnection.school_id == mailbox.school_id, EmailConnection.user_id == mailbox.user_id))


def _mailbox_address(db, mailbox):
    connection = _connection(db, mailbox)
    return (connection.address_override or mailbox.address) if connection else mailbox.address


def provision_connection(db, mailbox, password):
    """Cópia separada para o titular; nunca reativa uma conexão desconectada."""
    if password and not _connection(db, mailbox):
        connection = EmailConnection(mailbox_id=mailbox.id, user_id=mailbox.user_id,
               school_id=mailbox.school_id, encrypted_secret=seal({'password': password}))
        db.add(connection)
        return connection
    return _connection(db, mailbox)


def _server(db, school_id):
    return db.scalar(select(EmailServerSettings).where(EmailServerSettings.school_id == school_id))


def _settings_output(server, config=None):
    host = urlsplit(config.base_url).hostname if config else ''
    return {'imap_host': server.imap_host if server and server.imap_host else host,
            'smtp_host': server.smtp_host if server and server.smtp_host else host,
            'smtp_port': server.smtp_port if server else 465}


def _recoverable(db, mailbox, connection):
    if connection:
        return bool(connection.encrypted_secret and connection.last_error != 'EMAIL_AUTH')
    if not mailbox or not mailbox.encrypted_password:
        return False
    job = db.get(m.IntegrationJob, mailbox.job_id)
    return bool(job and job.kind == 'mailbox_provision')


def _account_output(db, mailbox):
    config = db.get(MailcowConfig, mailbox.config_id) if mailbox else None
    available = bool(mailbox and mailbox.provisioned_at and mailbox.remote_active and config and config.enabled)
    connection = _connection(db, mailbox) if mailbox else None
    address = ((connection.address_override or mailbox.address) if connection else mailbox.address) if mailbox else ''
    connected = bool(available and connection and connection.encrypted_secret and connection.validated_at and not connection.last_error)
    automatic = bool(available and not connected and _recoverable(db, mailbox, connection))
    parameters = _settings_output(_server(db, mailbox.school_id), config) if mailbox else {}
    return {'available': available, 'connected': connected, 'needs_password': available and not connected and not automatic,
            'can_auto_connect': automatic,
            'connection_state': 'ready' if connected else 'preparing' if automatic else 'password_required' if available else 'unavailable',
            'connection_error': ERRORS.get(connection.last_error, '') if connection else '',
            'connection_error_code': connection.last_error if connection else '',
            'validated_at': connection.validated_at.isoformat() if connection and connection.validated_at else None,
            'connection_parameters': {**parameters, 'username': address, 'imap_port': 993, 'imap_security': 'TLS', 'smtp_security': 'TLS' if parameters.get('smtp_port') == 465 else 'STARTTLS'} if mailbox else {},
            'address': address, 'display_name': mailbox.display_name if mailbox else '',
            'limits': {'message_bytes': MAX_MESSAGE, 'attachment_bytes': MAX_ATTACHMENTS,
                       'recipients': MAX_RECIPIENTS, 'attachment_count': 10}}


def _safe_fail(error):
    code = error.code if isinstance(error, IntegrationFailure) else 'EMAIL_PROTOCOL'
    fail(502, ERRORS.get(code, ERRORS['EMAIL_PROTOCOL']))


def _target(host, port, allow_private):
    try:
        addresses = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    except OSError:
        raise IntegrationFailure('EMAIL_DNS') from None
    candidates = []
    lans = [ipaddress.ip_network(x) for x in ('10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', 'fc00::/7')]
    for entry in addresses:
        address = ipaddress.ip_address(entry[4][0])
        lan = any(address.version == subnet.version and address in subnet for subnet in lans)
        if ((not address.is_global and not (allow_private and lan)) or address.is_loopback
                or address.is_link_local or address.is_multicast or address.is_unspecified or address.is_reserved):
            raise IntegrationFailure('EMAIL_ADDRESS')
        candidates.append(address)
    if not candidates:
        raise IntegrationFailure('EMAIL_DNS')
    return str(sorted(candidates, key=lambda address: (address.version, int(address)))[0])


def _tcp(ip, port, timeout):
    # Numeric socket.connect avoids even a second DNS resolution of the pinned IP.
    family = socket.AF_INET6 if ':' in ip else socket.AF_INET
    sock = socket.socket(family, socket.SOCK_STREAM)
    try:
        sock.settimeout(timeout)
        sock.connect((ip, port))
        return sock
    except BaseException:
        sock.close()
        raise


class PinnedIMAP(imaplib.IMAP4_SSL):
    def __init__(self, host, ip, timeout):
        self.pinned_ip, self.remaining_bytes = ip, MAX_MESSAGE * 5
        self.deadline = time.monotonic() + 60
        super().__init__(host, 993, ssl_context=ssl.create_default_context(), timeout=timeout)

    def _create_socket(self, timeout):
        sock = _tcp(self.pinned_ip, 993, timeout)
        try:
            return self.ssl_context.wrap_socket(sock, server_hostname=self.host)
        except BaseException:
            sock.close()
            raise

    def login(self, user, password):
        # imaplib.login expects str (not bytes). Use SASL PLAIN for UTF-8
        # mailbox passwords; the socket is already protected by verified TLS.
        raw = password.encode('utf-8') if isinstance(password, str) else password
        try:
            decoded = raw.decode('ascii')
        except UnicodeDecodeError:
            payload = base64.b64encode(b'\0' + user.encode('utf-8') + b'\0' + raw).decode('ascii')
            return self.authenticate('PLAIN', lambda _: payload)
        return super().login(user, decoded)

    def _budget(self):
        remaining = self.deadline - time.monotonic()
        if remaining <= 0:
            raise IntegrationFailure('EMAIL_NETWORK')
        self.sock.settimeout(min(30, remaining))

    def read(self, size):
        self._budget()
        if size > MAX_MESSAGE or size > self.remaining_bytes:
            raise IntegrationFailure('EMAIL_TOO_LARGE')
        value = super().read(size)
        self.remaining_bytes -= len(value)
        return value

    def readline(self):
        self._budget()
        value = super().readline()
        self.remaining_bytes -= len(value)
        if self.remaining_bytes < 0:
            raise IntegrationFailure('EMAIL_TOO_LARGE')
        return value


class PinnedSMTPSSL(smtplib.SMTP_SSL):
    def __init__(self, host, ip, timeout):
        self.pinned_ip = ip
        super().__init__(host, 465, local_hostname='institutional-mail', timeout=timeout,
                         context=ssl.create_default_context())

    def _get_socket(self, host, port, timeout):
        sock = _tcp(self.pinned_ip, 465, timeout)
        try:
            return self.context.wrap_socket(sock, server_hostname=host)
        except BaseException:
            sock.close()
            raise


class PinnedSMTPStartTLS(smtplib.SMTP):
    def __init__(self, host, ip, timeout):
        self.pinned_ip = ip
        super().__init__(host, 587, local_hostname='institutional-mail', timeout=timeout)
        try:
            self.ehlo()
            self.starttls(context=ssl.create_default_context())
            self.ehlo()
        except BaseException:
            self.close()
            raise

    def _get_socket(self, host, port, timeout):
        return _tcp(self.pinned_ip, 587, timeout)


def _mapped_error(error):
    if isinstance(error, IntegrationFailure):
        return error
    if isinstance(error, ssl.SSLCertVerificationError):
        return IntegrationFailure('EMAIL_TLS')
    if isinstance(error, smtplib.SMTPAuthenticationError):
        return IntegrationFailure('EMAIL_AUTH')
    if isinstance(error, (OSError, imaplib.IMAP4.abort)):
        return IntegrationFailure('EMAIL_NETWORK')
    return IntegrationFailure('EMAIL_PROTOCOL')


def _quote(value):
    if any(ord(char) < 32 or ord(char) > 126 for char in value):
        raise IntegrationFailure('EMAIL_PROTOCOL')
    return '"' + value.replace('\\', '\\\\').replace('"', '\\"') + '"'


def _encode_folder(name):
    chunks, pending = [], []
    def flush():
        if pending:
            encoded = base64.b64encode(''.join(pending).encode('utf-16-be')).decode().rstrip('=').replace('/', ',')
            chunks.append('&' + encoded + '-')
            pending.clear()
    for char in name:
        if 32 <= ord(char) <= 126:
            flush(); chunks.append('&-' if char == '&' else char)
        else:
            pending.append(char)
    flush()
    return ''.join(chunks)


def _decode_folder(value):
    def decode(match):
        if not match[1]:
            return '&'
        try:
            raw = match[1].replace(',', '/')
            return base64.b64decode(raw + '=' * (-len(raw) % 4), validate=True).decode('utf-16-be')
        except (ValueError, UnicodeError):
            return '?'
    return re.sub(r'&([A-Za-z0-9+,]*)-', decode, value)


def _folder_id(raw):
    return base64.urlsafe_b64encode(raw.encode('ascii')).decode().rstrip('=')


def _raw_folder(folder_id):
    try:
        if not re.fullmatch(r'[A-Za-z0-9_-]{1,1400}', folder_id):
            raise ValueError()
        raw = base64.b64decode(folder_id + '=' * (-len(folder_id) % 4), altchars=b'-_', validate=True).decode('ascii')
        if not raw or len(raw) > 1024 or any(ord(c) < 32 or ord(c) == 127 for c in raw):
            raise ValueError()
        return raw
    except (ValueError, UnicodeError):
        fail(422, 'Pasta inválida.')


def _ok(response):
    status, data = response
    if status != 'OK':
        raise IntegrationFailure('EMAIL_PROTOCOL')
    return data


class MailClient:
    def __init__(self, config, server, mailbox, password, username=None):
        base_host = urlsplit(config.base_url).hostname
        self.imap_host = server.imap_host if server and server.imap_host else base_host
        self.smtp_host = server.smtp_host if server and server.smtp_host else base_host
        self.smtp_port = server.smtp_port if server else 465
        self.allow_private = config.allow_private_network
        self.address, self.password = username or mailbox.address, password
        self.timeout = min(30, settings().integration_timeout_seconds)
        self.imap = None
        self._folders = None

    def __enter__(self):
        try:
            ip = _target(self.imap_host, 993, self.allow_private)
            self.imap = PinnedIMAP(self.imap_host, ip, self.timeout)
            try:
                self.imap.login(self.address, self.password.encode('utf-8'))
            except imaplib.IMAP4.error:
                raise IntegrationFailure('EMAIL_AUTH') from None
            return self
        except (OSError, imaplib.IMAP4.error, IntegrationFailure) as error:
            self.__exit__(None, None, None)
            raise _mapped_error(error) from None

    def __exit__(self, *_):
        if self.imap:
            try:
                # LOGOUT never expunges other messages marked deleted.
                self.imap.logout()
            except Exception:
                try: self.imap.shutdown()
                except Exception: pass

    @contextmanager
    def smtp(self):
        client = None
        try:
            ip = _target(self.smtp_host, self.smtp_port, self.allow_private)
            cls = PinnedSMTPSSL if self.smtp_port == 465 else PinnedSMTPStartTLS
            client = cls(self.smtp_host, ip, self.timeout)
            if self.password.isascii():
                client.login(self.address, self.password)
            else:
                client.ehlo_or_helo_if_needed()
                if 'PLAIN' not in client.esmtp_features.get('auth', '').split():
                    raise IntegrationFailure('EMAIL_UNSUPPORTED')
                token = base64.b64encode(('\0' + self.address + '\0' + self.password).encode('utf-8')).decode()
                code, _ = client.docmd('AUTH', 'PLAIN ' + token)
                if code != 235:
                    raise IntegrationFailure('EMAIL_AUTH')
            yield client
        finally:
            if client:
                try: client.quit()
                except Exception:
                    try: client.close()
                    except Exception: pass

    def folders(self, counts=False):
        if self._folders is None:
            data = _ok(self.imap.list())
            rows = []
            for entry in data:
                raw = entry[0] if isinstance(entry, tuple) else entry
                if not isinstance(raw, bytes):
                    continue
                match = re.fullmatch(rb'\(([^)]*)\) (?:NIL|"(?:[^"\\]|\\.)*") (.+)', raw)
                if not match:
                    continue
                flags, name = match.groups()
                if b'\\noselect' in flags.lower() or b'\\nonexistent' in flags.lower():
                    continue
                if isinstance(entry, tuple):
                    name = entry[1]
                elif name.startswith(b'"') and name.endswith(b'"'):
                    name = re.sub(rb'\\(.)', rb'\1', name[1:-1])
                try:
                    name = name.decode('ascii')
                except UnicodeError:
                    continue
                if not name or len(name) > 1024 or any(ord(c) < 32 for c in name):
                    continue
                flags = flags.lower().split()
                role = 'inbox' if name.upper() == 'INBOX' else next((role for flag, role in (
                    (b'\\sent', 'sent'), (b'\\drafts', 'drafts'), (b'\\junk', 'spam'),
                    (b'\\trash', 'trash'), (b'\\archive', 'archive')) if flag in flags), 'custom')
                if role == 'custom':
                    role = {'sent': 'sent', 'sent messages': 'sent', 'drafts': 'drafts', 'junk': 'spam',
                            'spam': 'spam', 'trash': 'trash', 'archive': 'archive'}.get(name.lower(), 'custom')
                rows.append({'id': _folder_id(name), 'name': _decode_folder(name), 'role': role,
                             'total': None, 'unread': None})
                if len(rows) >= MAX_FOLDERS:
                    break
            self._folders = rows
        if counts:
            for row in self._folders:
                data = _ok(self.imap.status(_quote(_raw_folder(row['id'])), '(MESSAGES UNSEEN)'))
                raw = b' '.join(part for part in data if isinstance(part, bytes))
                values = {key.decode(): int(value) for key, value in re.findall(rb'(MESSAGES|UNSEEN) (\d+)', raw)}
                row['total'], row['unread'] = values.get('MESSAGES', 0), values.get('UNSEEN', 0)
        return self._folders

    def folder(self, folder_id):
        _raw_folder(folder_id)
        row = next((row for row in self.folders() if row['id'] == folder_id), None)
        if not row:
            fail(404, 'Pasta não encontrada. Atualize sua caixa de e-mail.')
        return row

    def role_folder(self, role):
        folder = next((row for row in self.folders() if row['role'] == role), None)
        if not folder:
            raw = {'sent': 'Sent', 'drafts': 'Drafts', 'spam': 'Junk', 'trash': 'Trash', 'archive': 'Archive'}[role]
            _ok(self.imap.create(_quote(raw)))
            self._folders = None
            folder = self.folder(_folder_id(raw))
        return folder

    def select(self, folder_id, uidvalidity=None, readonly=True):
        self.folder(folder_id)
        _ok(self.imap.select(_quote(_raw_folder(folder_id)), readonly=readonly))
        _, validity = self.imap.response('UIDVALIDITY')
        try:
            current = int(validity[0])
        except (ValueError, TypeError, IndexError):
            raise IntegrationFailure('EMAIL_PROTOCOL')
        if uidvalidity is not None and current != uidvalidity:
            fail(409, 'A pasta foi reorganizada no servidor. Atualize a lista antes de continuar.')
        return current

    def list_messages(self, folder, before_uid, limit, query):
        validity = self.select(folder)
        criteria = ['UNDELETED']
        if before_uid:
            if before_uid <= 1:
                return {'items': [], 'folder': folder, 'uidvalidity': validity, 'next_before_uid': None}
            criteria += ['UID', f'1:{before_uid - 1}']
        if query:
            self.imap.literal = query.encode('utf-8')
            data = _ok(self.imap.uid('SEARCH', 'CHARSET', 'UTF-8', *criteria, 'TEXT'))
        else:
            data = _ok(self.imap.uid('SEARCH', None, *criteria))
        raw = b' '.join(part for part in data if isinstance(part, bytes))
        if len(raw) > 1_000_000:
            raise IntegrationFailure('EMAIL_TOO_LARGE')
        try:
            uids = sorted({int(uid) for uid in raw.split() if 0 < int(uid) <= 4294967295}, reverse=True)
        except ValueError:
            raise IntegrationFailure('EMAIL_PROTOCOL')
        chosen = uids[:limit]
        items = []
        if chosen:
            response = _ok(self.imap.uid('FETCH', ','.join(map(str, chosen)),
                           '(UID FLAGS RFC822.SIZE BODY.PEEK[HEADER.FIELDS (SUBJECT FROM TO DATE MESSAGE-ID)])'))
            for item in response:
                if isinstance(item, tuple) and len(item) == 2:
                    meta, content = item
                    if len(content) > 65536:
                        raise IntegrationFailure('EMAIL_TOO_LARGE')
                    parsed = BytesParser(policy=policy.default).parsebytes(content, headersonly=True)
                    row = _message_headers(parsed, meta, validity)
                    if row['uid'] in chosen:
                        items.append(row)
        return {'items': sorted(items, key=lambda row: row['uid'], reverse=True), 'folder': folder,
                'uidvalidity': validity, 'next_before_uid': chosen[-1] if len(uids) > limit else None}

    def message(self, folder, uid, validity):
        self.select(folder, validity)
        metadata = _ok(self.imap.uid('FETCH', str(uid), '(UID FLAGS RFC822.SIZE)'))
        meta = b' '.join(item for item in metadata if isinstance(item, bytes))
        if not re.search(rb'UID ' + str(uid).encode() + rb'\b', meta):
            fail(404, 'Mensagem não encontrada nesta pasta.')
        size = re.search(rb'RFC822.SIZE (\d+)', meta)
        if not size or int(size[1]) > MAX_MESSAGE:
            raise IntegrationFailure('EMAIL_TOO_LARGE')
        data = _ok(self.imap.uid('FETCH', str(uid), '(UID BODY.PEEK[])'))
        content = next((item[1] for item in data if isinstance(item, tuple)
                       and re.search(rb'UID ' + str(uid).encode() + rb'\b', item[0])), None)
        if content is None:
            fail(404, 'Mensagem não encontrada nesta pasta.')
        if len(content) > MAX_MESSAGE:
            raise IntegrationFailure('EMAIL_TOO_LARGE')
        parsed = BytesParser(policy=policy.default).parsebytes(content)
        return parsed, _message_headers(parsed, meta, validity)

    def flags(self, folder, uid, validity, seen=None, flagged=None):
        self.select(folder, validity, readonly=False)
        self.require_uid(uid)
        for value, flag in ((seen, '\\Seen'), (flagged, '\\Flagged')):
            if value is not None:
                _ok(self.imap.uid('STORE', str(uid), '+FLAGS.SILENT' if value else '-FLAGS.SILENT', f'({flag})'))

    def require_uid(self, uid):
        data = _ok(self.imap.uid('FETCH', str(uid), '(UID)'))
        raw = b' '.join(item for item in data if isinstance(item, bytes))
        if not re.search(rb'UID ' + str(uid).encode() + rb'\b', raw):
            fail(404, 'Mensagem não encontrada nesta pasta.')

    def delete(self, folder, uid, validity):
        if b'UIDPLUS' not in self.imap.capabilities and 'UIDPLUS' not in self.imap.capabilities:
            raise IntegrationFailure('EMAIL_UNSUPPORTED')
        self.select(folder, validity, readonly=False)
        self.require_uid(uid)
        _ok(self.imap.uid('STORE', str(uid), '+FLAGS.SILENT', '(\\Deleted)'))
        # Nunca EXPUNGE global: apagaria mensagens selecionadas por outro cliente.
        _ok(self.imap.uid('EXPUNGE', str(uid)))

    def move(self, source, uid, validity, destination):
        self.folder(destination)
        if source == destination:
            fail(422, 'Selecione uma pasta de destino diferente.')
        self.select(source, validity, readonly=False)
        self.require_uid(uid)
        if b'MOVE' in self.imap.capabilities or 'MOVE' in self.imap.capabilities:
            _ok(self.imap.uid('MOVE', str(uid), _quote(_raw_folder(destination))))
        else:
            # O fallback pode duplicar em erro parcial: prefira rejeitar a operação
            # a copiar/apagar em etapas sem atomicidade.
            raise IntegrationFailure('EMAIL_UNSUPPORTED')

    def append(self, role, raw, flags):
        folder = self.role_folder(role)
        _ok(self.imap.append(_quote(_raw_folder(folder['id'])), flags, imaplib.Time2Internaldate(now()), raw))
        _, values = self.imap.response('APPENDUID')
        match = re.fullmatch(rb'(\d+) (\d+)', values[0]) if values and isinstance(values[0], bytes) else None
        return {'folder': folder['id'], 'uidvalidity': int(match[1]) if match else None,
                'uid': int(match[2]) if match else None}


@contextmanager
def _client(db, user, school, password=None):
    connection = None
    mailbox = _owned(db, user, school)
    config = db.get(MailcowConfig, mailbox.config_id)
    if not config or not config.enabled or config.school_id != school.id:
        fail(409, 'O e-mail institucional precisa ser configurado pelo administrador.')
    if password is None:
        connection = _connection(db, mailbox)
        if not connection or not connection.encrypted_secret:
            fail(409, 'Conecte sua caixa de e-mail com a senha atual para continuar.')
        if not connection.validated_at or connection.last_error:
            fail(409, 'A conexão do seu e-mail precisa ser validada antes de acessar as mensagens.')
        try:
            password = unseal(connection.encrypted_secret).get('password')
        except IntegrationFailure:
            fail(409, 'Conecte novamente sua caixa de e-mail.')
    if not isinstance(password, str) or not password:
        fail(409, 'Conecte novamente sua caixa de e-mail.')
    username = (connection.address_override or mailbox.address) if connection else mailbox.address
    try:
        with MailClient(config, _server(db, school.id), mailbox, password, username=username) as client:
            yield client, mailbox
    except (OSError, imaplib.IMAP4.error, IntegrationFailure) as error:
        mapped = _mapped_error(error)
        if mapped.code == 'EMAIL_AUTH' and connection:
            # A recusa de uma credencial antes validada precisa sobreviver ao
            # retorno de erro para o titular poder informar a senha atual.
            connection.validated_at, connection.checked_at, connection.last_error = None, now(), 'EMAIL_AUTH'
            db.commit()
        _safe_fail(mapped)


def _header(message, name, limit=1000):
    return re.sub(r'[\x00-\x1f\x7f]', ' ', str(message.get(name, '')))[:limit]


def _message_headers(message, meta, validity):
    uid = re.search(rb'\bUID (\d+)', meta)
    size = re.search(rb'RFC822.SIZE (\d+)', meta)
    flags = imaplib.ParseFlags(meta)
    return {'uid': int(uid[1]) if uid else 0, 'uidvalidity': validity,
            'subject': _header(message, 'Subject', 1000), 'from': _header(message, 'From'),
            'to': _header(message, 'To', 8000), 'date': _header(message, 'Date', 120),
            'seen': b'\\Seen' in flags, 'flagged': b'\\Flagged' in flags,
            'size': int(size[1]) if size else 0}


class _TextOnly(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts, self.hidden = [], []

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style', 'head', 'iframe', 'object', 'svg', 'math', 'template'):
            self.hidden.append(tag)
        elif not self.hidden and tag in ('br', 'p', 'div', 'li', 'tr', 'h1', 'h2', 'h3'):
            self.parts.append('\n')

    def handle_endtag(self, tag):
        if tag in self.hidden:
            self.hidden = self.hidden[:self.hidden.index(tag)]
        elif not self.hidden and tag in ('p', 'div', 'li', 'tr'):
            self.parts.append('\n')

    def handle_data(self, data):
        if not self.hidden:
            self.parts.append(data)


def _mime_parts(message):
    stack, result = [(message, 0)], []
    while stack:
        item, depth = stack.pop()
        if len(result) > 200 or depth > 20:
            raise IntegrationFailure('EMAIL_TOO_LARGE')
        result.append(item)
        if item.is_multipart() and item.get_content_type() != 'message/rfc822':
            stack.extend((part, depth + 1) for part in reversed(item.get_payload()))
    return result


def _part_bytes(part):
    if part.get_content_type() == 'message/rfc822' and isinstance(part.get_payload(), list):
        return b'\r\n'.join(item.as_bytes(policy=policy.SMTP) for item in part.get_payload())
    return part.get_payload(decode=True) or b''


def _body(message):
    parts, attachments, plains, htmls = _mime_parts(message), [], [], []
    for index, part in enumerate(parts):
        if part.is_multipart() and part.get_content_type() != 'message/rfc822':
            continue
        raw = _part_bytes(part)
        filename = part.get_filename()
        if filename or part.get_content_disposition() == 'attachment' or part.get_content_maintype() != 'text':
            attachments.append({'part': str(index), 'filename': _filename(filename or 'anexo'),
                                'content_type': part.get_content_type(), 'size': len(raw)})
            continue
        try:
            text = raw.decode(part.get_content_charset() or 'utf-8', errors='replace')
        except LookupError:
            text = raw.decode('utf-8', errors='replace')
        if part.get_content_type() == 'text/plain':
            plains.append(text)
        elif part.get_content_type() == 'text/html':
            parser = _TextOnly(); parser.feed(text)
            htmls.append(''.join(parser.parts))
    text = '\n\n'.join(plains if plains else htmls)[:1_000_000]
    return text.replace('\x00', ''), attachments


def _filename(value):
    return re.sub(r'[\x00-\x1f\x7f/\\]', '_', value).strip(' .')[:180] or 'anexo'


def _compose(data, mailbox, message_id, draft=False, sender_address=None):
    recipients = list(dict.fromkeys(str(item) for item in [*data.to, *data.cc, *data.bcc]))
    if len(recipients) > MAX_RECIPIENTS:
        fail(422, 'Use no máximo 50 destinatários por mensagem.')
    if not draft and not recipients:
        fail(422, 'Informe pelo menos um destinatário.')
    if any(not address.isascii() for address in recipients):
        fail(422, 'Use endereços de e-mail sem caracteres especiais no nome da caixa.')
    message = EmailMessage(policy=policy.SMTP)
    address = sender_address or mailbox.address
    message['From'] = formataddr((_header({'name': mailbox.display_name}, 'name', 160), address))
    for field, addresses in (('To', data.to), ('Cc', data.cc), ('Bcc', data.bcc if draft else [])):
        if addresses:
            message[field] = ', '.join(map(str, addresses))
    message['Subject'], message['Date'], message['Message-ID'] = data.subject, format_datetime(now()), message_id
    if data.in_reply_to:
        if not re.fullmatch(r'<[^<>\s]{1,250}>', data.in_reply_to):
            fail(422, 'Identificador da mensagem respondida inválido.')
        message['In-Reply-To'] = data.in_reply_to
        message['References'] = data.in_reply_to
    message.set_content(data.text)
    total = 0
    for attachment in data.attachments:
        try:
            raw = base64.b64decode(attachment.content_base64, validate=True)
        except (ValueError, binascii.Error):
            fail(422, 'Um anexo contém dados inválidos. Selecione o arquivo novamente.')
        total += len(raw)
        if total > MAX_ATTACHMENTS:
            fail(413, 'Os anexos devem somar no máximo 5 MB.')
        content_type = attachment.content_type.lower()
        if not re.fullmatch(r'[a-z0-9!#$&^_.+-]+/[a-z0-9!#$&^_.+-]+', content_type):
            fail(422, 'Tipo de anexo inválido.')
        maintype, subtype = content_type.split('/')
        message.add_attachment(raw, maintype=maintype, subtype=subtype, filename=_filename(attachment.filename))
    raw = message.as_bytes()
    if len(raw) > MAX_MESSAGE:
        fail(413, 'A mensagem ultrapassa o limite de 10 MB.')
    return raw, recipients


@router.get('/account')
def account(db: DB, user: Actor, school: EmailScope):
    mailbox = _owned(db, user, school, False)
    candidate = reconciliation_candidate(db, school.id, user) if not mailbox else ''
    return {**_account_output(db, mailbox), 'can_reconcile': bool(candidate), 'candidate_address': candidate}


def _webmail_identity(db):
    from .institution import public_identity
    return public_identity(db)


def _webmail_preference(db, school_id, user_id):
    server = _server(db, school_id)
    default = server.webmail_default if server and server.webmail_default in ('sogo', 'alternative') else 'sogo'
    preference = db.scalar(select(WebmailPreference).where(WebmailPreference.school_id == school_id,
                           WebmailPreference.user_id == user_id))
    override = preference.mode if preference and preference.mode in ('sogo', 'alternative') else 'inherit'
    return {'default': default, 'override': override, 'effective': default if override == 'inherit' else override}


@router.get('/webmail-preference')
def webmail_preference(db: DB, user: Actor, school: EmailScope):
    return _webmail_preference(db, school.id, user.id)


@router.put('/webmail-preference')
def save_webmail_preference(data: WebmailModeInput, db: DB, user: Actor, school: EmailScope, request: Request):
    preference = db.scalar(select(WebmailPreference).where(WebmailPreference.school_id == school.id,
                           WebmailPreference.user_id == user.id))
    if data.mode == 'inherit':
        if preference:
            db.delete(preference)
    elif preference:
        preference.mode = data.mode
        preference.version = (preference.version or 0) + 1
    else:
        preference = WebmailPreference(school_id=school.id, user_id=user.id, mode=data.mode)
        db.add(preference)
    db.flush()
    audit(db, request, user, 'email.webmail_preference_updated', preference or school, school.id)
    return _webmail_preference(db, school.id, user.id)


@router.put('/webmail-default')
def save_webmail_default(data: WebmailDefaultInput, db: DB, user: Actor, school: EmailScope, request: Request):
    if user.role != 'admin':
        fail(403, 'Somente o administrador pode alterar o webmail padrão.')
    lock_school(db, school.id)
    server = _server(db, school.id)
    if not server:
        server = EmailServerSettings(school_id=school.id)
        db.add(server)
    server.webmail_default = data.mode
    server.version = (server.version or 0) + 1
    db.flush()
    audit(db, request, user, 'email.webmail_default_updated', server, school.id)
    return _webmail_preference(db, school.id, user.id)


@router.post('/webmail-ticket')
def create_webmail_ticket(db: DB, user: Actor, school: EmailScope, request: Request):
    """Gera um ticket curto para abrir o webmail sem expor a senha da caixa."""
    request_csrf(request)
    if not settings().sogo_upstream_url:
        fail(503, 'O webmail integrado ainda não está habilitado nesta instalação.')
    mailbox = _owned(db, user, school)
    connection = _connection(db, mailbox)
    if not connection or not connection.encrypted_secret or not connection.validated_at or connection.last_error:
        fail(409, 'Conecte e valide sua caixa antes de abrir o webmail.')
    raw = secrets.token_urlsafe(32)
    db.add(WebmailSession(school_id=school.id, user_id=user.id, mailbox_id=mailbox.id,
                          token_hash=hashlib.sha256(raw.encode()).hexdigest(),
                          expires_at=now() + timedelta(seconds=90)))
    db.flush()
    return {'ticket': raw, 'action': f'/webmail/{quote(school.id, safe="")}/launch',
            'identity': _webmail_identity(db)}


def _school_cookie_name(school_id: str) -> str:
    return 'pige_webmail_' + hashlib.sha256(school_id.encode()).hexdigest()[:12]


def _webmail_cookie_hash(request: Request, school_id: str) -> str:
    raw = request.cookies.get(_school_cookie_name(school_id), '')
    return hashlib.sha256(raw.encode()).hexdigest() if raw else ''


def _validated_webmail_resource(resource: str) -> str:
    decoded = unquote(unquote(resource))
    segments = decoded.split('/')
    if (not decoded.startswith(('SOGo/', 'principals/', 'SOGo.woa/WebServerResources/')) or
            any(part in {'.', '..'} for part in segments) or
            any(ord(char) < 32 or ord(char) == 127 or char == '\\' for char in decoded) or
            len(decoded) > 4096):
        fail(404, 'Caminho do webmail inválido.')
    return decoded


@asynccontextmanager
async def _webmail_http_client(request: Request):
    """Reuse the lifespan-owned HTTP pool, with a fallback for isolated tests."""
    client = getattr(request.app.state, 'webmail_http', None)
    if client is not None:
        yield client
        return
    async with httpx.AsyncClient(timeout=httpx.Timeout(60, connect=8, pool=10),
                                 follow_redirects=False, trust_env=False) as client:
        yield client


@webmail_router.post('/webmail/{school_id}/launch', include_in_schema=False)
def redeem_webmail_ticket(school_id: str, ticket: str = Form(...)):
    """Consome o ticket POST e cria cookie HttpOnly vinculado a uma escola."""
    ticket_hash = hashlib.sha256(ticket.encode()).hexdigest()
    with SessionLocal() as db:
        row = db.scalar(select(WebmailSession).where(WebmailSession.token_hash == ticket_hash,
                         WebmailSession.school_id == school_id, WebmailSession.redeemed_at.is_(None)))
        if not row or utc(row.expires_at) <= now():
            fail(401, 'A sessão do e-mail expirou. Abra o E-mail novamente.')
        cookie_token = secrets.token_urlsafe(48)
        row.token_hash = hashlib.sha256(cookie_token.encode()).hexdigest()
        row.redeemed_at = now()
        row.expires_at = now() + timedelta(hours=8)
        db.commit()
    response = RedirectResponse(f'/webmail/{quote(school_id, safe="")}/SOGo/', status_code=303)
    response.set_cookie(_school_cookie_name(school_id), cookie_token, max_age=8*60*60,
                        httponly=True, secure=settings().cookie_secure, samesite='lax',
                        path=f'/webmail/{quote(school_id, safe="")}')
    response.headers['Cache-Control'] = 'no-store'
    response.headers['Referrer-Policy'] = 'no-referrer'
    return response


WEBMAIL_METHODS = {'GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PROPFIND', 'REPORT', 'MKCOL', 'MOVE', 'COPY'}
WEBMAIL_HOP_HEADERS = {'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te',
                       'trailers', 'transfer-encoding', 'upgrade', 'host', 'content-length',
                       'authorization', 'cookie'}


@webmail_router.api_route('/webmail/{school_id}/{resource:path}', methods=sorted(WEBMAIL_METHODS), include_in_schema=False)
async def proxy_webmail(school_id: str, resource: str, request: Request):
    """Proxy same-origin e valida usuário, vínculo, caixa e instituição em cada requisição."""
    cfg = settings()
    upstream = cfg.sogo_upstream_url
    if not upstream:
        fail(503, 'O webmail integrado ainda não está habilitado nesta instalação.')
    decoded_resource = _validated_webmail_resource(resource)
    token_hash = _webmail_cookie_hash(request, school_id)
    if not token_hash:
        fail(401, 'Sua sessão do e-mail expirou. Abra o E-mail novamente.')
    with SessionLocal() as db:
        session = db.scalar(select(WebmailSession).where(WebmailSession.token_hash == token_hash,
                            WebmailSession.school_id == school_id, WebmailSession.redeemed_at.is_not(None)))
        if not session or utc(session.expires_at) <= now():
            fail(401, 'Sua sessão do e-mail expirou. Abra o E-mail novamente.')
        school = db.get(m.School, school_id)
        membership = db.get(m.SchoolAccess, (session.user_id, school_id))
        user = db.get(m.User, session.user_id)
        mailbox = db.scalar(select(SchoolMailbox).where(SchoolMailbox.id == session.mailbox_id,
                              SchoolMailbox.school_id == school_id, SchoolMailbox.user_id == session.user_id,
                              SchoolMailbox.provisioned_at.is_not(None), SchoolMailbox.remote_active.is_(True)))
        connection = _connection(db, mailbox) if mailbox else None
        if (not school or not school.active or not membership or not membership.active or not user or not user.active
                or not connection or not connection.encrypted_secret or not connection.validated_at or connection.last_error):
            fail(403, 'A caixa não está mais autorizada para esta instituição.')
        try:
            password = unseal(connection.encrypted_secret).get('password')
        except IntegrationFailure:
            fail(409, 'Conecte novamente sua caixa de e-mail.')
        if not isinstance(password, str) or not password:
            fail(409, 'Conecte novamente sua caixa de e-mail.')
        address = connection.address_override or mailbox.address
        principal = session.user_id + '@' + school_id
        identity = _webmail_identity(db)
    try:
        parsed = urlsplit(upstream)
        if parsed.scheme not in {'http', 'https'} or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment:
            fail(503, 'O destino interno do webmail está inválido.')
        target = upstream.rstrip('/') + '/' + decoded_resource
        if request.url.query:
            target += '?' + request.url.query
        headers = {key: value for key, value in request.headers.items()
                   if key.lower() not in WEBMAIL_HOP_HEADERS and not key.lower().startswith('x-webobjects-')}
        cookie_pairs = []
        for item in request.headers.get('cookie', '').split(';'):
            key, sep, value = item.strip().partition('=')
            if sep and not key.startswith('pige_'):
                cookie_pairs.append(f'{key}={value}')
        if cookie_pairs:
            headers['cookie'] = '; '.join(cookie_pairs)
        from .webmail_proxy import auth_headers
        public_url = urlsplit(cfg.app_url)
        proxy_base = cfg.app_url.rstrip('/') + '/webmail/' + quote(school_id, safe='')
        headers.update({**auth_headers(principal, password), 'x-webobjects-server-url': proxy_base,
                        'x-webobjects-server-name': public_url.hostname or '',
                        'x-webobjects-server-port': str(public_url.port or (443 if public_url.scheme == 'https' else 80)),
                        'x-webobjects-server-protocol': 'HTTP/1.1'})
        body = await request.body()
        if len(body) > 20 * 1024 * 1024:
            fail(413, 'O conteúdo enviado ao webmail excede 20 MB.')
        async with _webmail_http_client(request) as client:
            upstream_request = client.build_request(request.method, target, headers=headers, content=body or None)
            upstream_response = await client.send(upstream_request, stream=True)
            try:
                chunks, size = [], 0
                async for chunk in upstream_response.aiter_bytes():
                    size += len(chunk)
                    if size > MAX_WEBMAIL_RESPONSE:
                        fail(502, 'A resposta do webmail excede o limite permitido.')
                    chunks.append(chunk)
                content = b''.join(chunks)
            finally:
                await upstream_response.aclose()
    except HTTPException:
        raise
    except (httpx.HTTPError, OSError, ValueError):
        fail(502, 'O webmail não respondeu. Tente novamente em instantes.')
    content_type = upstream_response.headers.get('content-type', '')
    prefix = f'/webmail/{quote(school_id, safe="")}'
    if 'text/html' in content_type:
        rendered = content.decode('utf-8', errors='replace')
        rendered = rendered.replace('"/SOGo', '"' + prefix + '/SOGo').replace("'/SOGo", "'" + prefix + '/SOGo')
        rendered = rendered.replace('"/principals', '"' + prefix + '/principals').replace("'/principals", "'" + prefix + '/principals')
        title = identity['display_name'].replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        theme = (f'<title>{title} · E-mail</title>'
                 '<link rel="stylesheet" href="/api/v1/institution/theme.css">'
                 f'<style>:root{{--pige-mail-primary:{identity["primary_color"]};'
                 f'--pige-mail-secondary:{identity["secondary_color"]}}}'
                 'body,md-content,md-toolbar,button,input,select,textarea,.md-button,.md-headline,.md-title,.md-subhead'
                 '{font-family:var(--institution-font,system-ui,sans-serif)!important}'
                 'a,.toolbarButton,.button{color:var(--pige-mail-primary)}'
                 '.toolbar,.menu{border-color:var(--pige-mail-primary)}</style>')
        rendered = rendered.replace('</head>', theme + '</head>', 1)
        content = rendered.encode('utf-8')
    response_headers = {}
    for name in ('content-type', 'content-language', 'cache-control', 'etag', 'last-modified', 'content-disposition'):
        if name in upstream_response.headers:
            response_headers[name] = upstream_response.headers[name]
    location = upstream_response.headers.get('location')
    if location:
        from .webmail_proxy import rewrite_location
        try:
            response_headers['location'] = rewrite_location(location, target, upstream, cfg.app_url, prefix)
        except ValueError:
            fail(502, 'O webmail retornou um redirecionamento inválido.')
        if response_headers['location'] == request.url.path and upstream_response.status_code in (301, 302, 303, 307, 308):
            fail(502, 'O webmail retornou um redirecionamento circular.')
    from .webmail_proxy import cache_control
    response_headers['cache-control'] = cache_control(decoded_resource, request.url.query,
                                                       upstream_response.status_code, request.method)
    response_headers['X-Frame-Options'] = 'SAMEORIGIN'
    response_headers['Content-Security-Policy'] = ("default-src 'self' data: blob:; img-src 'self' data: blob:; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' data: https://fonts.gstatic.com; "
        "script-src 'self' 'unsafe-inline'; frame-ancestors 'self'; object-src 'none'; base-uri 'self'")
    response = Response(content=content, status_code=upstream_response.status_code, headers=response_headers)
    for cookie in upstream_response.headers.get_list('set-cookie'):
        from .webmail_proxy import rewrite_cookie_path
        response.headers.append('set-cookie', rewrite_cookie_path(cookie, prefix))
    return response


@router.post('/reconcile')
def reconcile_own_account(db: DB, user: Actor, school: EmailScope, request: Request):
    mailbox = reconcile_mailbox(db, school.id, user)
    audit(db, request, user, 'email.mailbox_reconciled', mailbox, school.id)
    return {**_account_output(db, mailbox), 'can_reconcile': False, 'candidate_address': ''}


@router.get('/settings')
def server_settings(db: DB, user: Actor, school: EmailScope):
    if user.role != 'admin':
        fail(403, 'Somente o administrador pode configurar o servidor de e-mail.')
    config = db.scalar(select(MailcowConfig).where(MailcowConfig.school_id == school.id))
    return _settings_output(_server(db, school.id), config)


@router.put('/settings')
def save_server_settings(data: SettingsInput, db: DB, user: Actor, school: EmailScope, request: Request):
    if user.role != 'admin':
        fail(403, 'Somente o administrador pode configurar o servidor de e-mail.')
    lock_school(db, school.id)
    server = _server(db, school.id)
    if not server:
        server = EmailServerSettings(school_id=school.id); db.add(server)
    for key, value in data.model_dump().items():
        setattr(server, key, value)
    server.version = (server.version or 0) + 1
    db.execute(update(EmailConnection).where(EmailConnection.school_id == school.id).values(validated_at=None, checked_at=None, last_error=''))
    db.flush(); audit(db, request, user, 'email.settings_updated', server, school.id)
    config = db.scalar(select(MailcowConfig).where(MailcowConfig.school_id == school.id))
    return _settings_output(server, config)


@router.post('/connection/automatic')
def automatic_connection(db: DB, user: Actor, school: EmailScope, request: Request):
    """Valida apenas credenciais já conhecidas; nunca cria ou troca senha remota."""
    lock_school(db, school.id)
    mailbox = _owned(db, user, school)
    connection = _connection(db, mailbox)
    if not _recoverable(db, mailbox, connection):
        return _account_output(db, mailbox)
    if connection and connection.validated_at and not connection.last_error:
        return _account_output(db, mailbox)
    if connection and connection.checked_at and utc(connection.checked_at) + timedelta(seconds=10) > now():
        return _account_output(db, mailbox)
    if not connection:
        try:
            password = unseal(mailbox.encrypted_password).get('password')
        except IntegrationFailure:
            fail(409, 'A credencial salva não está disponível. Conecte com a senha atual da caixa.')
        connection = provision_connection(db, mailbox, password)
        if not connection:
            fail(409, 'Conecte com a senha atual da caixa.')
        db.flush()
    try:
        password = unseal(connection.encrypted_secret).get('password')
        if not isinstance(password, str) or not password:
            raise IntegrationFailure('EMAIL_AUTH')
        config = db.get(MailcowConfig, mailbox.config_id)
        if not config or not config.enabled or config.school_id != school.id:
            fail(409, 'O e-mail institucional precisa ser habilitado pelo administrador.')
        username = (connection.address_override or mailbox.address) if connection else mailbox.address
        with MailClient(config, _server(db, school.id), mailbox, password, username=username) as client:
            with client.smtp():
                pass
        connection.validated_at, connection.last_error = now(), ''
        audit(db, request, user, 'email.connected_automatically', connection, school.id)
    except (OSError, imaplib.IMAP4.error, IntegrationFailure) as error:
        mapped = _mapped_error(error)
        connection.validated_at = None
        connection.last_error = mapped.code if mapped.code in ERRORS else 'EMAIL_PROTOCOL'
        audit(db, request, user, 'email.connection_validation_failed', connection, school.id, details={'code': connection.last_error})
    connection.checked_at = now()
    db.flush()
    return _account_output(db, mailbox)


@router.post('/connection')
def connect(data: ConnectionInput, db: DB, user: Actor, school: EmailScope, request: Request):
    mailbox = _owned(db, user, school)
    config = db.get(MailcowConfig, mailbox.config_id)
    if not config or not config.enabled or config.school_id != school.id:
        fail(409, 'O e-mail institucional precisa ser configurado pelo administrador.')
    address = str(data.address or mailbox.address).strip().casefold()
    configured_domain = config.domain.strip().casefold()
    if not address or address.rsplit('@', 1)[-1] != configured_domain:
        fail(422, 'Use uma caixa ativa do domínio de e-mail desta instituição.')
    try:
        with MailClient(config, _server(db, school.id), mailbox, data.password, username=address) as client:
            with client.smtp():
                pass
    except (OSError, imaplib.IMAP4.error, IntegrationFailure) as error:
        _safe_fail(_mapped_error(error))
    else:
        # Ambas as autenticações são validadas sem enviar qualquer mensagem.
        lock_school(db, school.id)
        connection = _connection(db, mailbox)
        if not connection:
            connection = EmailConnection(school_id=school.id, mailbox_id=mailbox.id, user_id=user.id)
            db.add(connection)
        connection.address_override = '' if address == mailbox.address.casefold() else address
        connection.encrypted_secret, connection.validated_at = seal({'password': data.password}), now()
        connection.checked_at, connection.last_error = now(), ''
        db.flush(); audit(db, request, user, 'email.connected', connection, school.id, details={'mailbox_changed': address != mailbox.address.casefold()})
        return _account_output(db, mailbox)


@router.delete('/connection')
def disconnect(db: DB, user: Actor, school: EmailScope, request: Request):
    mailbox = _owned(db, user, school)
    connection = _connection(db, mailbox)
    if not connection:
        connection = EmailConnection(school_id=school.id, mailbox_id=mailbox.id, user_id=user.id)
        db.add(connection); db.flush()
    # Mantém linha vazia como escolha persistente; uma reconciliação não reativa.
    connection.encrypted_secret, connection.validated_at = '', None
    connection.checked_at, connection.last_error = None, ''
    audit(db, request, user, 'email.disconnected', connection, school.id)
    return {'connected': False}


@router.get('/folders')
def folders(db: DB, user: Actor, school: EmailScope):
    with _client(db, user, school) as (client, _):
        return {'items': client.folders(counts=True)}


@router.post('/folders', status_code=201)
def create_folder(data: FolderInput, db: DB, user: Actor, school: EmailScope):
    if any(ord(c) < 32 or ord(c) == 127 or c in '/\\' for c in data.name) or data.name in ('.', '..'):
        fail(422, 'Use um nome de pasta sem barras ou caracteres de controle.')
    raw = _encode_folder(data.name)
    with _client(db, user, school) as (client, _):
        if len(client.folders()) >= MAX_FOLDERS:
            fail(409, 'O limite de pastas exibidas foi atingido.')
        _ok(client.imap.create(_quote(raw)))
        client._folders = None
        return client.folder(_folder_id(raw))


@router.patch('/folders/{folder_id}')
def rename_folder(folder_id: str, data: FolderInput, db: DB, user: Actor, school: EmailScope):
    if any(ord(c) < 32 or ord(c) == 127 or c in '/\\' for c in data.name) or data.name in ('.', '..'):
        fail(422, 'Use um nome de pasta sem barras ou caracteres de controle.')
    with _client(db, user, school) as (client, _):
        if client.folder(folder_id)['role'] != 'custom':
            fail(409, 'As pastas principais não podem ser renomeadas.')
        raw = _encode_folder(data.name)
        _ok(client.imap.rename(_quote(_raw_folder(folder_id)), _quote(raw)))
        client._folders = None
        return client.folder(_folder_id(raw))


@router.delete('/folders/{folder_id}')
def delete_folder(folder_id: str, db: DB, user: Actor, school: EmailScope, confirm: bool = False):
    if not confirm:
        fail(422, 'Confirme a exclusão da pasta vazia.')
    with _client(db, user, school) as (client, _):
        if client.folder(folder_id)['role'] != 'custom':
            fail(409, 'As pastas principais não podem ser excluídas.')
        client.select(folder_id)
        data = _ok(client.imap.uid('SEARCH', None, 'ALL'))
        if any(item and item.strip() for item in data if isinstance(item, bytes)):
            fail(409, 'Esvazie a pasta antes de excluí-la.')
        # UNSELECT não expurga mensagens marcadas por outro cliente.
        _ok(client.imap.unselect())
        _ok(client.imap.delete(_quote(_raw_folder(folder_id))))
        return {'deleted': True}


@router.get('/messages')
def messages(db: DB, user: Actor, school: EmailScope, folder: str = Query(min_length=1, max_length=1400),
             before_uid: int | None = Query(default=None, ge=1, le=4294967295),
             limit: int = Query(default=25, ge=1, le=50), q: str = Query(default='', max_length=120)):
    if any(ord(c) < 32 for c in q):
        fail(422, 'Pesquisa inválida.')
    with _client(db, user, school) as (client, _):
        return client.list_messages(folder, before_uid, limit, q.strip())


@router.get('/messages/{uid}')
def message(uid: int, db: DB, user: Actor, school: EmailScope, folder: str = Query(min_length=1, max_length=1400),
            uidvalidity: int = Query(ge=1, le=4294967295)):
    if not 1 <= uid <= 4294967295:
        fail(422, 'Mensagem inválida.')
    with _client(db, user, school) as (client, _):
        parsed, result = client.message(folder, uid, uidvalidity)
        result['text'], result['attachments'] = _body(parsed)
        result.update({'cc': _header(parsed, 'Cc', 8000), 'bcc': _header(parsed, 'Bcc', 8000),
                       'message_id': _header(parsed, 'Message-ID', 254),
                       'in_reply_to': _header(parsed, 'In-Reply-To', 254)})
        return result


@router.get('/messages/{uid}/attachments/{part}')
def attachment(uid: int, part: int, db: DB, user: Actor, school: EmailScope,
               folder: str = Query(min_length=1, max_length=1400), uidvalidity: int = Query(ge=1, le=4294967295)):
    if not 1 <= uid <= 4294967295 or not 0 <= part <= 200:
        fail(422, 'Anexo inválido.')
    with _client(db, user, school) as (client, _):
        parsed, _ = client.message(folder, uid, uidvalidity)
        _, attachments = _body(parsed)
        item = next((row for row in attachments if row['part'] == str(part)), None)
        if not item:
            fail(404, 'Anexo não encontrado.')
        content = _part_bytes(_mime_parts(parsed)[part])
        return Response(content, media_type='application/octet-stream', headers={
            'Content-Disposition': "attachment; filename*=UTF-8''" + quote(item['filename'], safe=''),
            'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
            'Content-Security-Policy': "default-src 'none'; sandbox"})


@router.patch('/messages/{uid}/flags')
def flags(uid: int, data: FlagsInput, db: DB, user: Actor, school: EmailScope):
    if not 1 <= uid <= 4294967295:
        fail(422, 'Mensagem inválida.')
    with _client(db, user, school) as (client, _):
        client.flags(data.folder, uid, data.uidvalidity, data.seen, data.flagged)
        return {'updated': True}


@router.post('/messages/{uid}/move')
def move(uid: int, data: MoveInput, db: DB, user: Actor, school: EmailScope):
    if not 1 <= uid <= 4294967295:
        fail(422, 'Mensagem inválida.')
    with _client(db, user, school) as (client, _):
        client.move(data.folder, uid, data.uidvalidity, data.destination)
        return {'moved': True}


@router.delete('/messages/{uid}')
def delete_message(uid: int, db: DB, user: Actor, school: EmailScope,
                   folder: str = Query(min_length=1, max_length=1400),
                   uidvalidity: int = Query(ge=1, le=4294967295), confirm: bool = False):
    if not confirm:
        fail(422, 'Confirme a exclusão definitiva desta mensagem.')
    if not 1 <= uid <= 4294967295:
        fail(422, 'Mensagem inválida.')
    with _client(db, user, school) as (client, _):
        if client.folder(folder)['role'] not in ('trash', 'spam'):
            fail(409, 'Mova a mensagem para a lixeira antes de excluí-la definitivamente.')
        client.delete(folder, uid, uidvalidity)
        return {'deleted': True}


def _remove_draft(client, draft):
    if not draft:
        return True
    if client.folder(draft.folder)['role'] != 'drafts':
        fail(422, 'A mensagem original não pertence aos rascunhos.')
    client.delete(draft.folder, draft.uid, draft.uidvalidity)
    return True


@router.post('/drafts', status_code=201)
def save_draft(data: ComposeInput, db: DB, user: Actor, school: EmailScope):
    mailbox = _owned(db, user, school)
    address = _mailbox_address(db, mailbox)
    raw, _ = _compose(data, mailbox, make_msgid(domain=address.split('@')[1]), draft=True, sender_address=address)
    with _client(db, user, school) as (client, _):
        if data.draft:
            if client.folder(data.draft.folder)['role'] != 'drafts':
                fail(422, 'A mensagem original não pertence aos rascunhos.')
            client.select(data.draft.folder, data.draft.uidvalidity)
            client.require_uid(data.draft.uid)
        result = client.append('drafts', raw, '(\\Draft \\Seen)')
        previous_removed = not data.draft
        if data.draft:
            try:
                previous_removed = _remove_draft(client, data.draft)
            except (OSError, imaplib.IMAP4.error, IntegrationFailure, HTTPException):
                previous_removed = False
        return {**result, 'saved': True, 'previous_removed': previous_removed}


def _submission_output(row):
    return {'status': row.status, 'message_id': row.message_id,
            'sent_saved': False, 'refused': [], 'message': 'Envio em processamento. Atualize antes de tentar novamente.',
            **(row.result or {})}


@router.post('/send')
def send(data: ComposeInput, db: DB, user: Actor, school: EmailScope, request: Request):
    if not data.request_id:
        fail(422, 'Identifique a tentativa de envio antes de continuar.')
    mailbox = _owned(db, user, school)
    address = _mailbox_address(db, mailbox)
    request_id = str(data.request_id)
    message_id = '<' + request_id + '@' + address.split('@')[1] + '>'
    raw, recipients = _compose(data, mailbox, message_id, sender_address=address)
    # Hash can be compared across retries; Date/MIME boundary vary in raw MIME.
    digest = hashlib.sha256(data.model_dump_json(exclude={'request_id'}).encode()).hexdigest()
    row = db.scalar(select(EmailSubmission).where(EmailSubmission.mailbox_id == mailbox.id,
                                                 EmailSubmission.request_id == request_id))
    if row:
        if row.payload_hash != digest:
            fail(409, 'Esta tentativa já identifica outra mensagem. Inicie uma nova tentativa para a edição.')
        return _submission_output(row)
    # Authenticate and validate draft before recording the durable send intention.
    with _client(db, user, school) as (client, _):
        if data.draft:
            if client.folder(data.draft.folder)['role'] != 'drafts':
                fail(422, 'A mensagem original não pertence aos rascunhos.')
            client.select(data.draft.folder, data.draft.uidvalidity)
            client.require_uid(data.draft.uid)
        row = EmailSubmission(school_id=school.id, mailbox_id=mailbox.id, user_id=user.id,
                              request_id=request_id, payload_hash=digest, message_id=message_id,
                              status='sending', result={})
        db.add(row)
        try:
            db.flush(); audit(db, request, user, 'email.send_requested', row, school.id)
            db.commit()  # Never contact SMTP before the idempotency receipt is durable.
        except IntegrityError:
            db.rollback()
            existing = db.scalar(select(EmailSubmission).where(EmailSubmission.mailbox_id == mailbox.id,
                                                                EmailSubmission.request_id == request_id))
            if existing and existing.payload_hash == digest:
                return _submission_output(existing)
            fail(409, 'A tentativa de envio já foi registrada. Atualize antes de continuar.')
        phase, accepted, refused = 'connecting', False, []
        try:
            with client.smtp() as smtp:
                phase = 'submitting'
                rejected = smtp.sendmail(client.address, recipients, raw)
                refused = [address for address in recipients if address in rejected]
                accepted = True
        except (OSError, smtplib.SMTPException, IntegrationFailure) as error:
            definite = isinstance(error, (smtplib.SMTPAuthenticationError, smtplib.SMTPSenderRefused,
                                          smtplib.SMTPRecipientsRefused, smtplib.SMTPDataError))
            row.status = 'failed' if phase == 'connecting' or definite else 'uncertain'
            row.result = {'sent_saved': False, 'refused': recipients if isinstance(error, smtplib.SMTPRecipientsRefused) else [],
                          'message': ('O servidor recusou o envio. Confira a conexão e os destinatários.' if row.status == 'failed'
                                      else 'O servidor não confirmou o resultado. Confira Enviados e os destinatários antes de enviar novamente.')}
        # Acceptance of DATA is authoritative even if the connection teardown
        # fails after sendmail returned. Never downgrade it to an uncertain send.
        if accepted:
            row.status = 'partial' if refused else 'sent'
            row.result = {'sent_saved': False, 'refused': refused,
                          'message': 'Mensagem enviada.' if not refused else 'Mensagem enviada parcialmente. Confira os destinatários recusados.'}
        db.flush(); db.commit()  # Preserve acceptance even if saving Sent later fails.
        if accepted:
            try:
                sent_copy = raw
                if data.bcc:
                    archived = BytesParser(policy=policy.SMTP).parsebytes(raw)
                    archived['Bcc'] = ', '.join(map(str, data.bcc))
                    sent_copy = archived.as_bytes()
                client.append('sent', sent_copy, '(\\Seen)')
                row.result = {**row.result, 'sent_saved': True}
            except (OSError, imaplib.IMAP4.error, IntegrationFailure, HTTPException):
                row.result = {**row.result, 'message': row.result['message'] + ' A cópia em Enviados não pôde ser salva; não reenvie a mensagem.'}
            if not refused and data.draft:
                try:
                    _remove_draft(client, data.draft)
                    row.result = {**row.result, 'draft_removed': True}
                except (OSError, imaplib.IMAP4.error, IntegrationFailure, HTTPException):
                    row.result = {**row.result, 'draft_removed': False}
            db.flush()
        audit(db, request, user, 'email.send_result', row, school.id, {'status': row.status})
        return _submission_output(row)
