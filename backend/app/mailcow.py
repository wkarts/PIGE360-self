"""Contas institucionais: Mailcow, provisionamento transacional e credenciais de uso único.

Contrato: mailcow/mailcow-dockerized/data/web/api/openapi.yaml.
A fila não envia mensagens e não reutiliza a senha de acesso à aplicação.
"""
from __future__ import annotations

import ipaddress
import json
import re
import secrets
import socket
from datetime import datetime, timedelta
from urllib.parse import quote, urlsplit

import httpx
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import Field
from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, select
from sqlalchemy.orm import Mapped, mapped_column

from . import models as m
from .common import audit, output
from .config import settings
from .db import Base, Record, now
from .integration_core import IntegrationFailure, enqueue, seal, unseal
from .schemas import Input
from .security import Actor, DB, Scope, check_version, fail, lock_school, utc

router = APIRouter(prefix='/api/v1/schools/{school_id}/mailcow', tags=['E-mail institucional'])
MAX_QUOTA_MB = 1_048_576
LOCAL_PART = re.compile(r'[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?')
DOMAIN = re.compile(r'(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,62}')


class MailcowConfig(Record, m.Scoped, Base):
    __tablename__ = 'mailcow_configs'
    enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    base_url: Mapped[str] = mapped_column(String(300))
    domain: Mapped[str] = mapped_column(String(253))
    default_quota_mb: Mapped[int] = mapped_column(Integer, default=1024)
    allow_private_network: Mapped[bool] = mapped_column(Boolean, default=False)
    encrypted_secret: Mapped[str] = mapped_column(Text, default='')
    last_test_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_test_ok: Mapped[bool | None] = mapped_column(Boolean)
    __table_args__ = (UniqueConstraint('school_id'),)


class SchoolMailbox(Record, m.Scoped, Base):
    __tablename__ = 'school_mailboxes'
    config_id: Mapped[str] = mapped_column(ForeignKey('mailcow_configs.id'))
    user_id: Mapped[str] = mapped_column(ForeignKey('users.id'), index=True)
    job_id: Mapped[str] = mapped_column(ForeignKey('integration_jobs.id'))
    address: Mapped[str] = mapped_column(String(254))
    display_name: Mapped[str] = mapped_column(String(160))
    quota_mb: Mapped[int] = mapped_column(Integer)
    encrypted_password: Mapped[str] = mapped_column(Text, default='')
    provisioned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    password_revealed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    remote_active: Mapped[bool | None] = mapped_column(Boolean)
    quota_used_bytes: Mapped[int] = mapped_column(BigInteger, default=0)
    __table_args__ = (UniqueConstraint('school_id', 'user_id'), UniqueConstraint('config_id', 'address'))


class ConfigInput(Input):
    enabled: bool = False
    base_url: str = Field(min_length=8, max_length=300)
    domain: str = Field(min_length=3, max_length=253)
    api_key: str = Field(default='', max_length=512)
    default_quota_mb: int = Field(default=1024, ge=1, le=MAX_QUOTA_MB)
    allow_private_network: bool = False
    version: int | None = Field(default=None, ge=1)


class MailboxInput(Input):
    user_id: str
    local_part: str = Field(default='', max_length=64)
    quota_mb: int | None = Field(default=None, ge=1, le=MAX_QUOTA_MB)


def _admin(user):
    if user.role != 'admin':
        fail(403, 'Somente o administrador pode gerenciar contas de e-mail institucional.')


def _domain(value: str) -> str:
    try:
        normalized = value.strip().rstrip('.').encode('idna').decode().lower()
    except UnicodeError:
        fail(422, 'Domínio de e-mail inválido.')
    if not DOMAIN.fullmatch(normalized):
        fail(422, 'Informe somente o domínio de e-mail, por exemplo escola.edu.br.')
    return normalized


def _base_url(value: str) -> str:
    try:
        parsed = urlsplit(value.strip())
        port = parsed.port or 443
    except ValueError:
        fail(422, 'Porta inválida no endereço do servidor de e-mail.')
    if (parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password
            or parsed.query or parsed.fragment or parsed.path not in ('', '/') or port not in (443, 8443)):
        fail(422, 'Use o endereço HTTPS do Mailcow, sem caminho ou credenciais, nas portas 443 ou 8443.')
    host = parsed.hostname.rstrip('.').lower()
    if host in ('localhost', 'localhost.localdomain') or host.endswith(('.localhost', '.internal', '.local')):
        fail(422, 'Use o hostname completo do servidor de e-mail.')
    try:
        address = ipaddress.ip_address(host)
    except ValueError:
        host = _domain(host)
    else:
        if address.is_loopback or address.is_link_local or address.is_unspecified or address.is_multicast or address.is_reserved:
            fail(422, 'Este endereço não pode ser usado como servidor de e-mail.')
    literal = f'[{host}]' if ':' in host else host
    return f'https://{literal}' + (f':{port}' if port != 443 else '')


def _pinned_target(config: MailcowConfig) -> tuple[str, str, str]:
    parsed = urlsplit(config.base_url)
    host, port = parsed.hostname, parsed.port or 443
    try:
        addresses = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    except OSError:
        raise IntegrationFailure('MAILCOW_DNS_UNAVAILABLE', retryable=True)
    public_or_lan = []
    for entry in addresses:
        address = ipaddress.ip_address(entry[4][0])
        private_lan = any(address in subnet for subnet in (
            ipaddress.ip_network('10.0.0.0/8'), ipaddress.ip_network('172.16.0.0/12'),
            ipaddress.ip_network('192.168.0.0/16'), ipaddress.ip_network('fc00::/7'))
                          if address.version == subnet.version)
        if not address.is_global and not (config.allow_private_network and private_lan):
            raise IntegrationFailure('MAILCOW_ADDRESS_BLOCKED')
        if address.is_multicast or address.is_unspecified or address.is_loopback or address.is_link_local or address.is_reserved:
            raise IntegrationFailure('MAILCOW_ADDRESS_BLOCKED')
        public_or_lan.append(address)
    if not public_or_lan:
        raise IntegrationFailure('MAILCOW_DNS_UNAVAILABLE', retryable=True)
    address = sorted(public_or_lan, key=lambda item: (item.version, int(item)))[0]
    ip = f'[{address}]' if address.version == 6 else str(address)
    authority = host + (f':{port}' if port != 443 else '')
    return f'https://{ip}:{port}', authority, host


class MailcowClient:
    def __init__(self, config: MailcowConfig):
        self.config = config
        self.key = unseal(config.encrypted_secret).get('api_key')
        if not self.key:
            raise IntegrationFailure('MAILCOW_KEY_MISSING')

    def request(self, path: str, method: str = 'GET', data=None):
        if not path.startswith('/api/v1/') or '?' in path or '#' in path or '..' in path:
            raise IntegrationFailure('MAILCOW_INVALID_PATH')
        target, authority, hostname = _pinned_target(self.config)
        headers = {'X-API-Key': self.key, 'Host': authority, 'Accept': 'application/json'}
        try:
            # DNS is resolved once; TCP uses the validated IP and TLS checks the
            # original hostname via SNI. Redirects and environment proxies stay off.
            with httpx.Client(timeout=httpx.Timeout(settings().integration_timeout_seconds),
                              trust_env=False, follow_redirects=False) as client:
                with client.stream(method, target + path, headers=headers, json=data,
                                   extensions={'sni_hostname': hostname}) as response:
                    if response.status_code == 404 and method == 'GET':
                        return None
                    if response.status_code >= 500 or response.status_code == 429:
                        raise IntegrationFailure('MAILCOW_UNAVAILABLE', retryable=True)
                    if not 200 <= response.status_code < 300:
                        raise IntegrationFailure('MAILCOW_ACCESS_DENIED' if response.status_code in (401, 403) else 'MAILCOW_HTTP_REJECTED')
                    content = bytearray()
                    for part in response.iter_bytes():
                        content.extend(part)
                        if len(content) > 1_000_000:
                            raise IntegrationFailure('MAILCOW_RESPONSE_TOO_LARGE')
                    result = json.loads(content) if content else None
        except (httpx.HTTPError, OSError):
            raise IntegrationFailure('MAILCOW_NETWORK_ERROR', retryable=True)
        except (ValueError, UnicodeDecodeError):
            raise IntegrationFailure('MAILCOW_INVALID_RESPONSE', retryable=True)
        return result

    def mailbox(self, address: str):
        raw = self.request('/api/v1/get/mailbox/' + quote(address, safe=''))
        values = raw if isinstance(raw, list) else [raw] if isinstance(raw, dict) else []
        matches = [item for item in values if isinstance(item, dict) and str(item.get('username', '')).casefold() == address]
        if len(matches) > 1:
            raise IntegrationFailure('MAILCOW_AMBIGUOUS_MAILBOX')
        if not matches and raw not in (None, [], {}):
            raise IntegrationFailure('MAILCOW_INVALID_RESPONSE')
        return matches[0] if matches else None

    def domain(self):
        raw = self.request('/api/v1/get/domain/' + quote(self.config.domain, safe=''))
        values = raw if isinstance(raw, list) else [raw] if isinstance(raw, dict) else []
        match = next((item for item in values if isinstance(item, dict) and str(item.get('domain_name') or item.get('domain') or '').casefold() == self.config.domain), None)
        if not match or str(match.get('active', 1)).lower() not in ('1', 'true'):
            raise IntegrationFailure('MAILCOW_DOMAIN_UNAVAILABLE')
        return match

    def create(self, mailbox: SchoolMailbox, password: str):
        result = self.request('/api/v1/add/mailbox', 'POST', {
            'active': '1', 'domain': self.config.domain, 'local_part': mailbox.address.split('@')[0],
            'name': mailbox.display_name, 'password': password, 'password2': password,
            'quota': str(mailbox.quota_mb), 'force_pw_update': '1', 'authsource': 'mailcow',
            'tags': ['pige360-' + mailbox.id],
        })
        messages = result if isinstance(result, list) else [result]
        if not messages or any(not isinstance(item, dict) or item.get('type') != 'success' for item in messages):
            # Provider responses can echo password/API inputs; never persist them.
            raise IntegrationFailure('MAILCOW_CREATE_REJECTED')


def _config(db, school_id, required=True):
    config = db.scalar(select(MailcowConfig).where(MailcowConfig.school_id == school_id))
    if required and (not config or not config.enabled):
        fail(409, 'Configure e habilite o e-mail institucional antes de criar uma caixa.')
    return config


def _config_output(config):
    if not config:
        return {'configured': False, 'enabled': False, 'base_url': '', 'domain': '',
                'default_quota_mb': 1024, 'allow_private_network': False, 'api_key_configured': False, 'version': None}
    return {**output(config, ('encrypted_secret',)), 'configured': True,
            'api_key_configured': bool(config.encrypted_secret), 'webmail_url': config.base_url + '/SOGo/'}


def mailbox_output(db, mailbox):
    job = db.get(m.IntegrationJob, mailbox.job_id)
    user = db.get(m.User, mailbox.user_id)
    return {**output(mailbox, ('encrypted_password',)), 'user_name': user.name if user else mailbox.display_name,
            'status': ('active' if mailbox.remote_active else 'disabled') if mailbox.provisioned_at else job.status if job else 'failed',
            'job_status': job.status if job else 'failed', 'attempts': job.attempts if job else 0,
            'error_code': job.error_code if job else '',
            'credentials_available': bool(mailbox.provisioned_at and utc(mailbox.provisioned_at) >= now() - timedelta(days=7)
                                          and mailbox.encrypted_password and not mailbox.password_revealed_at)}


def queue_mailbox(db, school_id: str, target: m.User, local_part: str = '', quota_mb: int | None = None):
    lock_school(db, school_id)
    config = _config(db, school_id)
    if target.role != 'admin' and not db.scalar(select(m.SchoolAccess.user_id).where(
            m.SchoolAccess.school_id == school_id, m.SchoolAccess.user_id == target.id)):
        fail(422, 'O usuário precisa ter acesso à escola que fornecerá a caixa de e-mail.')
    local = (local_part or target.email.split('@')[0]).strip().lower()
    if not LOCAL_PART.fullmatch(local) or '..' in local:
        fail(422, 'Use letras sem acentos, números, ponto, traço ou sublinhado no nome da caixa.')
    address = local + '@' + config.domain
    if len(address) > 254:
        fail(422, 'O endereço de e-mail ultrapassa o tamanho permitido.')
    existing = db.scalar(select(SchoolMailbox).where(SchoolMailbox.school_id == school_id, SchoolMailbox.user_id == target.id))
    if existing:
        if existing.address != address:
            fail(409, 'Este usuário já possui uma caixa institucional nesta escola.')
        return existing
    if db.scalar(select(SchoolMailbox.id).where(SchoolMailbox.config_id == config.id, SchoolMailbox.address == address)):
        fail(409, 'Este endereço já foi reservado para outro usuário.')
    # Job references a preassigned UUID; both rows commit with the application user.
    from .db import uid
    mailbox_id = uid()
    job = enqueue(db, school_id, 'mailbox_provision', {'mailbox_id': mailbox_id}, 'mailcow:' + mailbox_id)
    password = 'Aa1!' + secrets.token_urlsafe(32)
    obj = SchoolMailbox(id=mailbox_id, school_id=school_id, config_id=config.id, user_id=target.id,
                        job_id=job.id, address=address, display_name=target.name,
                        quota_mb=quota_mb or config.default_quota_mb, encrypted_password=seal({'password': password}))
    db.add(obj); db.flush()
    return obj


def _apply_remote(mailbox: SchoolMailbox, remote: dict):
    tags = remote.get('tags') or []
    if not isinstance(tags, list) or 'pige360-' + mailbox.id not in tags:
        raise IntegrationFailure('MAILCOW_ADDRESS_CONFLICT')
    if str(remote.get('username', '')).casefold() != mailbox.address:
        raise IntegrationFailure('MAILCOW_ADDRESS_CONFLICT')
    mailbox.provisioned_at = mailbox.provisioned_at or now()
    mailbox.last_synced_at = now()
    mailbox.remote_active = str(remote.get('active', '0')).lower() in ('1', 'true')
    try:
        mailbox.quota_used_bytes = min(2**63 - 1, max(0, int(remote.get('quota_used') or 0)))
    except (TypeError, ValueError):
        mailbox.quota_used_bytes = 0


def provision_job(db, job, payload):
    school = lock_school(db, job.school_id)
    if not school or not school.active:
        raise IntegrationFailure('MAILCOW_SCHOOL_INACTIVE')
    mailbox = db.get(SchoolMailbox, payload.get('mailbox_id'))
    if not mailbox or mailbox.school_id != job.school_id or mailbox.job_id != job.id:
        raise IntegrationFailure('MAILCOW_SCOPE_MISMATCH')
    target = db.scalar(select(m.User).where(m.User.id == mailbox.user_id).with_for_update())
    if not target or not target.active:
        raise IntegrationFailure('MAILCOW_USER_INACTIVE')
    if target.role != 'admin' and not db.scalar(select(m.SchoolAccess.user_id).where(
            m.SchoolAccess.user_id == target.id, m.SchoolAccess.school_id == job.school_id)):
        raise IntegrationFailure('MAILCOW_USER_ACCESS_REMOVED')
    config = db.get(MailcowConfig, mailbox.config_id)
    if not config or not config.enabled or config.school_id != job.school_id:
        raise IntegrationFailure('MAILCOW_DISABLED')
    client = MailcowClient(config)
    remote = client.mailbox(mailbox.address)
    if remote:
        _apply_remote(mailbox, remote)
        return mailbox.address
    if mailbox.provisioned_at:
        raise IntegrationFailure('MAILCOW_REMOTE_MAILBOX_MISSING')
    client.domain()
    password = unseal(mailbox.encrypted_password).get('password')
    if not password:
        raise IntegrationFailure('MAILCOW_PASSWORD_UNAVAILABLE')
    client.create(mailbox, password)
    remote = client.mailbox(mailbox.address)
    if not remote:
        raise IntegrationFailure('MAILCOW_CONFIRMATION_PENDING', retryable=True)
    _apply_remote(mailbox, remote)
    return mailbox.address


@router.get('/config')
def get_config(db: DB, user: Actor, school: Scope):
    _admin(user)
    return _config_output(_config(db, school.id, False))


@router.put('/config')
def save_config(data: ConfigInput, db: DB, user: Actor, school: Scope, request: Request):
    _admin(user); lock_school(db, school.id)
    base_url, domain = _base_url(data.base_url), _domain(data.domain)
    obj = _config(db, school.id, False)
    if obj:
        if data.version is None:
            fail(422, 'Recarregue a configuração antes de salvar.')
        check_version(obj, data.version)
        if (obj.base_url != base_url or obj.domain != domain) and db.scalar(select(SchoolMailbox.id).where(SchoolMailbox.config_id == obj.id).limit(1)):
            fail(409, 'O servidor e o domínio não podem mudar enquanto houver caixas vinculadas.')
    else:
        obj = MailcowConfig(school_id=school.id, base_url=base_url, domain=domain)
        db.add(obj)
    if data.api_key:
        if len(data.api_key) < 16 or any(ord(char) < 33 or ord(char) > 126 for char in data.api_key):
            fail(422, 'Informe uma chave da API válida, sem espaços.')
        obj.encrypted_secret = seal({'api_key': data.api_key})
    if data.enabled and not obj.encrypted_secret:
        fail(422, 'Informe a chave da API para habilitar o e-mail institucional.')
    obj.base_url, obj.domain, obj.enabled = base_url, domain, data.enabled
    obj.default_quota_mb, obj.allow_private_network = data.default_quota_mb, data.allow_private_network
    obj.last_test_at, obj.last_test_ok = None, None
    if data.version:
        obj.version += 1
    db.flush(); audit(db, request, user, 'mailcow.configured', obj, school.id, {'enabled': obj.enabled})
    return _config_output(obj)


@router.post('/test')
def test_config(db: DB, user: Actor, school: Scope, request: Request):
    _admin(user); lock_school(db, school.id)
    config = _config(db, school.id)
    try:
        MailcowClient(config).domain()
        ok, code = True, ''
    except IntegrationFailure as error:
        ok, code = False, error.code
    config.last_test_at, config.last_test_ok = now(), ok
    audit(db, request, user, 'mailcow.tested', config, school.id, {'ok': ok, 'code': code})
    return {'ok': ok, 'code': code, 'message': 'Servidor e domínio validados.' if ok else 'Não foi possível validar o domínio. Confira o servidor, a chave e as permissões da API.'}


@router.get('/mailboxes')
def list_mailboxes(db: DB, user: Actor, school: Scope):
    _admin(user)
    rows = db.scalars(select(SchoolMailbox).where(SchoolMailbox.school_id == school.id).order_by(SchoolMailbox.created_at.desc()).limit(1000)).all()
    return [mailbox_output(db, row) for row in rows]


@router.post('/mailboxes', status_code=201)
def create_mailbox(data: MailboxInput, db: DB, user: Actor, school: Scope, request: Request):
    _admin(user)
    target = db.get(m.User, data.user_id)
    if not target or not target.active:
        fail(422, 'Selecione um usuário ativo da escola.')
    mailbox = queue_mailbox(db, school.id, target, data.local_part, data.quota_mb)
    audit(db, request, user, 'mailcow.mailbox_queued', mailbox, school.id)
    return mailbox_output(db, mailbox)


def _mailbox(db, school_id, mailbox_id):
    obj = db.scalar(select(SchoolMailbox).where(SchoolMailbox.id == mailbox_id, SchoolMailbox.school_id == school_id).with_for_update())
    if not obj:
        fail(404, 'Caixa de e-mail não encontrada nesta escola.')
    return obj


@router.post('/mailboxes/{mailbox_id}/retry')
def retry_mailbox(mailbox_id: str, db: DB, user: Actor, school: Scope, request: Request):
    _admin(user); lock_school(db, school.id)
    obj = _mailbox(db, school.id, mailbox_id)
    _config(db, school.id)
    job = db.get(m.IntegrationJob, obj.job_id)
    if job.status not in ('failed', 'uncertain', 'retry'):
        fail(409, 'A caixa já foi criada ou está sendo processada.')
    job.status, job.attempts, job.error_code, job.available_at = 'retry', 0, '', now()
    audit(db, request, user, 'mailcow.mailbox_retried', obj, school.id)
    return mailbox_output(db, obj)


@router.post('/mailboxes/{mailbox_id}/sync')
def sync_mailbox(mailbox_id: str, db: DB, user: Actor, school: Scope, request: Request):
    _admin(user); lock_school(db, school.id)
    obj = _mailbox(db, school.id, mailbox_id)
    try:
        remote = MailcowClient(_config(db, school.id)).mailbox(obj.address)
        if not remote:
            fail(409, 'A caixa ainda não foi encontrada no servidor.')
        _apply_remote(obj, remote)
    except IntegrationFailure:
        fail(502, 'Não foi possível consultar a caixa com segurança. Confira a integração e tente novamente.')
    audit(db, request, user, 'mailcow.mailbox_synced', obj, school.id)
    return mailbox_output(db, obj)


@router.post('/mailboxes/{mailbox_id}/credentials')
def reveal_credentials(mailbox_id: str, db: DB, user: Actor, school: Scope, request: Request):
    _admin(user); lock_school(db, school.id)
    obj = _mailbox(db, school.id, mailbox_id)
    if not obj.provisioned_at or not obj.encrypted_password or obj.password_revealed_at:
        fail(409, 'A senha inicial não está disponível. Se já foi consultada, use a redefinição de senha do servidor de e-mail.')
    if utc(obj.provisioned_at) < now() - timedelta(days=7):
        fail(410, 'O prazo de consulta da senha inicial terminou. Redefina a senha no servidor de e-mail.')
    password = unseal(obj.encrypted_password).get('password')
    obj.encrypted_password = ''
    obj.password_revealed_at = now()
    obj.version += 1
    audit(db, request, user, 'mailcow.credentials_revealed', obj, school.id)
    return JSONResponse({'address': obj.address, 'password': password,
                         'webmail_url': db.get(MailcowConfig, obj.config_id).base_url + '/SOGo/'},
                        headers={'Cache-Control': 'no-store', 'Pragma': 'no-cache'})
