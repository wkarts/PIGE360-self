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
import ssl
from datetime import datetime, timedelta
from urllib.parse import quote, urlsplit

import httpx
from fastapi import APIRouter, Query, Request
from fastapi.responses import JSONResponse
from pydantic import Field
from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func, select
from sqlalchemy.orm import Mapped, mapped_column

from . import models as m
from .common import audit, output
from .config import settings
from .db import Base, Record, now
from .integration_core import IntegrationFailure, enqueue, seal, unseal
from .schemas import Input
from .security import Actor, DB, Scope, check_version, fail, lock_school, utc
from .telemetry import emit

router = APIRouter(prefix='/api/v1/schools/{school_id}/mailcow', tags=['E-mail institucional'])
MAX_QUOTA_MB = 1_048_576
LOCAL_PART = re.compile(r'[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?')
DOMAIN = re.compile(r'(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,62}')
ERROR_MESSAGES = {
    'MAILCOW_KEY_REJECTED': 'A chave da API foi recusada pelo servidor de e-mail. Confira se a API está habilitada e substitua a chave salva pela chave de leitura e escrita do servidor.',
    'MAILCOW_IP_NOT_ALLOWED': 'O servidor de e-mail bloqueou o IP de origem da conexão. Autorize os IPs de saída da aplicação e do serviço de processamento na lista de acesso da API do servidor de e-mail.',
    'MAILCOW_READ_ONLY_KEY': 'A chave salva permite apenas leitura. Substitua-a pela chave de leitura e escrita do servidor de e-mail para criar caixas de e-mail.',
    'MAILCOW_ACCESS_DENIED': 'O servidor de e-mail recusou o acesso à API. Confira a chave de leitura e escrita e autorize os IPs de saída da aplicação e do serviço de processamento na lista de acesso do servidor de e-mail.',
    'MAILCOW_WRITE_DENIED': 'O servidor de e-mail recusou a criação pela API. Use a chave de leitura e escrita, confirme que essa API está habilitada e autorize o IP de saída do serviço de processamento no servidor de e-mail.',
    'MAILCOW_KEY_MISSING': 'Salve uma chave da API de leitura e escrita do servidor de e-mail antes de testar a conexão.',
    'MAILCOW_DOMAIN_UNAVAILABLE': 'O domínio informado não foi encontrado ativo no servidor de e-mail. Confira o domínio de e-mail e sua ativação no servidor.',
    'MAILCOW_DNS_UNAVAILABLE': 'O servidor da aplicação não conseguiu resolver o endereço do servidor de e-mail. Confira o hostname e o DNS da instalação.',
    'MAILCOW_ADDRESS_BLOCKED': 'O endereço do servidor de e-mail foi bloqueado pela configuração de rede. Se o servidor está em uma rede privada, habilite essa opção e mantenha um hostname HTTPS válido.',
    'MAILCOW_TLS_ERROR': 'O certificado HTTPS do servidor de e-mail não pôde ser validado. Confira o hostname, a validade e a cadeia de certificados do servidor.',
    'MAILCOW_NETWORK_ERROR': 'Não foi possível conectar ao servidor de e-mail. Confira a disponibilidade do servidor, a porta HTTPS e o firewall de saída da instalação.',
    'MAILCOW_UNAVAILABLE': 'O servidor de e-mail está temporariamente indisponível ou limitou as requisições. Aguarde antes de tentar novamente.',
    'MAILCOW_INVALID_RESPONSE': 'O endereço configurado não retornou uma resposta válida da API do servidor de e-mail. Confira o servidor e as regras do proxy.',
    'MAILCOW_HTTP_REJECTED': 'O servidor recusou a requisição à API do servidor de e-mail. Confira o endereço HTTPS e as regras do proxy ou firewall.',
    'MAILCOW_ADDRESS_CONFLICT': 'Este endereço já existe no servidor de e-mail sem o vínculo deste cadastro. Escolha outro endereço; a caixa existente não será alterada.',
    'MAILCOW_DISABLED': 'A criação de contas está desativada. Habilite a integração antes de tentar novamente.',
    'MAILCOW_CREATE_REJECTED': 'O servidor de e-mail recusou a criação. Confira a disponibilidade do endereço, as cotas do domínio e as permissões de escrita da API.',
    'MAILCOW_CONFIRMATION_PENDING': 'O pedido foi enviado, mas a caixa ainda não foi confirmada. A próxima tentativa consultará o servidor antes de criar novamente.',
    'MAILCOW_REMOTE_MAILBOX_MISSING': 'A caixa anteriormente criada não foi encontrada no servidor de e-mail. Confira o endereço no servidor antes de tentar novamente.',
    'MAILCOW_USER_INACTIVE': 'O usuário está desativado. Reative o cadastro antes de tentar criar sua caixa.',
    'MAILCOW_SCHOOL_INACTIVE': 'A escola está desativada. Reative a escola antes de tentar criar a caixa.',
    'MAILCOW_REMOTE_MAILBOX_INACTIVE': 'Esta caixa está desativada no servidor de e-mail. Solicite sua ativação antes de vincular.',
    'MAILCOW_RECONCILE_MISSING': 'Não existe uma caixa ativa com o e-mail deste usuário no servidor da escola. Confira o cadastro ou crie a caixa.',
    'MAILCOW_USER_ACCESS_REMOVED': 'O usuário não tem mais acesso à escola. Confira seu vínculo antes de tentar criar a caixa.',
}


def error_message(code: str) -> str:
    # Messages are application-owned: provider bodies can echo credentials.
    return ERROR_MESSAGES.get(code, 'Não foi possível concluir a operação no servidor de e-mail. Confira a configuração e tente novamente.')


def _access_error(status: int, content: bytes, method: str) -> str:
    """Recognize only Mailcow's fixed authentication messages; never echo a body."""
    fallback = 'MAILCOW_ACCESS_DENIED' if method == 'GET' else 'MAILCOW_WRITE_DENIED'
    try:
        raw = json.loads(content)
    except (ValueError, UnicodeDecodeError):
        return fallback
    if not isinstance(raw, dict) or raw.get('type') != 'error':
        return fallback
    message = raw.get('msg')
    if status == 403 and message == 'API read/write access denied':
        return 'MAILCOW_READ_ONLY_KEY'
    if status == 401 and message == 'authentication failed':
        return 'MAILCOW_KEY_REJECTED'
    prefix = 'api access denied for ip '
    if status == 401 and isinstance(message, str) and message.startswith(prefix):
        try:
            ipaddress.ip_address(message[len(prefix):])
        except ValueError:
            return fallback
        return 'MAILCOW_IP_NOT_ALLOWED'
    return fallback


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


class ReconcileInput(Input):
    user_id: str


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
        fail(422, 'Use o endereço HTTPS do servidor de e-mail, sem caminho ou credenciais, nas portas 443 ou 8443.')
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
                    content = bytearray()
                    for part in response.iter_bytes():
                        content.extend(part)
                        if len(content) > 1_000_000:
                            raise IntegrationFailure('MAILCOW_RESPONSE_TOO_LARGE')
                    if response.status_code in (401, 403):
                        raise IntegrationFailure(_access_error(response.status_code, content, method))
                    if not 200 <= response.status_code < 300:
                        raise IntegrationFailure('MAILCOW_HTTP_REJECTED')
                    result = json.loads(content) if content else None
        except (httpx.HTTPError, OSError) as error:
            cause = error
            seen = set()
            while cause is not None and id(cause) not in seen:
                seen.add(id(cause))
                if isinstance(cause, ssl.SSLCertVerificationError):
                    raise IntegrationFailure('MAILCOW_TLS_ERROR') from None
                cause = cause.__cause__ or cause.__context__
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
        if not match or str(match.get('active', 0)).lower() not in ('1', 'true'):
            raise IntegrationFailure('MAILCOW_DOMAIN_UNAVAILABLE')
        return match

    def create(self, mailbox: SchoolMailbox, password: str):
        result = self.request('/api/v1/add/mailbox', 'POST', {
            'active': '1', 'domain': self.config.domain, 'local_part': mailbox.address.split('@')[0],
            'name': mailbox.display_name, 'password': password, 'password2': password,
            'quota': str(mailbox.quota_mb), 'force_pw_update': '0', 'authsource': 'mailcow',
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
            'error_message': error_message(job.error_code) if job and job.error_code else '',
            'origin': 'existing' if job and job.kind == 'mailbox_reconcile' else 'created',
            'credentials_available': bool(mailbox.provisioned_at and utc(mailbox.provisioned_at) >= now() - timedelta(days=7)
                                          and mailbox.encrypted_password and not mailbox.password_revealed_at)}


def queue_mailbox(db, school_id: str, target: m.User, local_part: str = '', quota_mb: int | None = None):
    lock_school(db, school_id)
    config = _config(db, school_id)
    if not db.scalar(select(m.SchoolAccess.user_id).where(
            m.SchoolAccess.school_id == school_id, m.SchoolAccess.user_id == target.id, m.SchoolAccess.active.is_(True))):
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


def _apply_remote(mailbox: SchoolMailbox, remote: dict, *, reconciled=False):
    tags = remote.get('tags') or []
    if not reconciled and (not isinstance(tags, list) or 'pige360-' + mailbox.id not in tags):
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


def reconciliation_candidate(db, school_id: str, target: m.User) -> str:
    """Local eligibility only; an address is never proof of mailbox ownership."""
    config = _config(db, school_id, False)
    if not config or not config.enabled or not target or not target.active:
        return ''
    membership = db.get(m.SchoolAccess, (target.id, school_id))
    if not membership or not membership.active:
        return ''
    address = target.email.strip().casefold()
    parts = address.split('@')
    if (len(parts) != 2 or parts[1] != config.domain or not 1 <= len(parts[0]) <= 64
            or len(address) > 254 or any(ord(char) < 33 or ord(char) > 126 for char in parts[0]) or '..' in parts[0]):
        return ''
    return address


def reconcile_mailbox(db, school_id: str, target: m.User):
    """Link a verified existing address without creating/resetting a remote account.

    The account still requires its owner's IMAP/SMTP password. No remote secret
    can be obtained from the administrative API, and no password is fabricated.
    School locking serializes this operation with creation and worker processing.
    """
    school = lock_school(db, school_id)
    if not school or not school.active:
        fail(404, 'Escola não encontrada.')
    target = db.scalar(select(m.User).where(m.User.id == target.id).with_for_update())
    address = reconciliation_candidate(db, school_id, target)
    if not address:
        fail(422, 'Selecione um usuário ativo desta escola com e-mail no domínio institucional configurado.')
    config = _config(db, school_id)
    mailbox = db.scalar(select(SchoolMailbox).where(SchoolMailbox.school_id == school_id, SchoolMailbox.user_id == target.id))
    if mailbox and (mailbox.address != address or mailbox.config_id != config.id):
        fail(409, 'Este usuário já possui outra caixa vinculada nesta escola. Confira o cadastro antes de continuar.')
    conflict = db.scalar(select(SchoolMailbox).where(SchoolMailbox.config_id == config.id, SchoolMailbox.address == address))
    if conflict and conflict.user_id != target.id:
        fail(409, 'Este endereço já está vinculado a outro usuário da escola.')
    job = db.get(m.IntegrationJob, mailbox.job_id) if mailbox else None
    if mailbox and not job:
        fail(409, 'O registro desta caixa precisa ser conferido pelo administrador antes de vincular.')
    if job and job.status in ('pending', 'processing', 'retry', 'uncertain'):
        fail(409, 'A criação desta caixa ainda está em andamento. Aguarde sua conclusão antes de vincular.')
    try:
        client = MailcowClient(config)
        client.domain()
        remote = client.mailbox(address)
        if not remote:
            raise IntegrationFailure('MAILCOW_RECONCILE_MISSING')
        if str(remote.get('active', '0')).lower() not in ('1', 'true'):
            raise IntegrationFailure('MAILCOW_REMOTE_MAILBOX_INACTIVE')
    except IntegrationFailure as error:
        emit('mailcow.mailbox_reconcile', level='WARNING', state='failed', code=error.code)
        fail(409 if error.code in ('MAILCOW_RECONCILE_MISSING', 'MAILCOW_REMOTE_MAILBOX_INACTIVE') else 502, error_message(error.code))
    if not mailbox:
        from .db import uid
        mailbox_id = uid()
        # Never publish a pending job: this transaction only records verification.
        job = m.IntegrationJob(school_id=school_id, kind='mailbox_reconcile',
                              dedupe_key='mailbox-reconcile:' + mailbox_id,
                              encrypted_payload=seal({'mailbox_id': mailbox_id}),
                              available_at=now(), status='completed', completed_at=now(), remote_id=address)
        db.add(job); db.flush()
        try:
            quota_mb = min(MAX_QUOTA_MB, max(1, int(remote.get('quota') or 0) // 1_048_576))
        except (TypeError, ValueError):
            quota_mb = config.default_quota_mb
        mailbox = SchoolMailbox(id=mailbox_id, school_id=school_id, config_id=config.id, user_id=target.id,
                                job_id=job.id, address=address, display_name=target.name,
                                quota_mb=quota_mb if remote.get('quota') else config.default_quota_mb,
                                encrypted_password='')
        db.add(mailbox); db.flush()
    elif not mailbox.provisioned_at:
        # Failed creation can be recovered only by this explicit exact-email check.
        job.kind, job.status, job.error_code = 'mailbox_reconcile', 'completed', ''
        job.completed_at, job.remote_id, job.lease_until = now(), address, None
        mailbox.encrypted_password = ''
    _apply_remote(mailbox, remote, reconciled=True)
    mailbox.version += 1
    db.flush()
    return mailbox


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
    if not db.scalar(select(m.SchoolAccess.user_id).where(
            m.SchoolAccess.user_id == target.id, m.SchoolAccess.school_id == job.school_id, m.SchoolAccess.active.is_(True))):
        raise IntegrationFailure('MAILCOW_USER_ACCESS_REMOVED')
    config = db.get(MailcowConfig, mailbox.config_id)
    if not config or not config.enabled or config.school_id != job.school_id:
        raise IntegrationFailure('MAILCOW_DISABLED')
    client = MailcowClient(config)
    remote = client.mailbox(mailbox.address)
    if remote:
        _apply_remote(mailbox, remote)
        if mailbox.encrypted_password:
            from .email_client import provision_connection
            provision_connection(db, mailbox, unseal(mailbox.encrypted_password).get('password'))
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
    from .email_client import provision_connection
    provision_connection(db, mailbox, password)
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
    api_key = data.api_key.strip()
    if api_key:
        if len(api_key) < 16 or any(ord(char) < 33 or ord(char) > 126 for char in api_key):
            fail(422, 'Informe uma chave da API válida, sem espaços.')
        obj.encrypted_secret = seal({'api_key': api_key})
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
    config = _config(db, school.id, False)
    if not config:
        fail(409, 'Salve o servidor, o domínio e a chave antes de testar a conexão.')
    try:
        MailcowClient(config).domain()
        ok, code = True, ''
    except IntegrationFailure as error:
        ok, code = False, error.code
    config.last_test_at, config.last_test_ok = now(), ok
    audit(db, request, user, 'mailcow.tested', config, school.id, {'ok': ok, 'code': code})
    emit('mailcow.connection_test', level='INFO' if ok else 'WARNING', state='read_validated' if ok else 'failed', code=code)
    return {'ok': ok, 'code': code, 'read_authenticated': ok, 'write_verified': False,
            'message': 'Consulta ao domínio validada. A permissão de criação será confirmada ao provisionar uma caixa.' if ok else error_message(code)}


@router.get('/mailboxes')
def list_mailboxes(db: DB, user: Actor, school: Scope):
    _admin(user)
    rows = db.scalars(select(SchoolMailbox).where(SchoolMailbox.school_id == school.id).order_by(SchoolMailbox.created_at.desc()).limit(1000)).all()
    return [mailbox_output(db, row) for row in rows]


@router.get('/mailboxes/candidates')
def reconciliation_candidates(db: DB, user: Actor, school: Scope,
                              offset: int = Query(default=0, ge=0), limit: int = Query(default=20, ge=1, le=50)):
    _admin(user)
    config = _config(db, school.id)
    access = select(m.SchoolAccess.user_id).where(m.SchoolAccess.school_id == school.id, m.SchoolAccess.active.is_(True))
    existing = select(SchoolMailbox.user_id).where(SchoolMailbox.school_id == school.id, SchoolMailbox.provisioned_at.is_not(None))
    filters = (m.User.active.is_(True), m.User.id.in_(access),
               func.lower(m.User.email).endswith('@' + config.domain, autoescape=True), m.User.id.not_in(existing))
    total = db.scalar(select(func.count()).select_from(m.User).where(*filters))
    users = db.scalars(select(m.User).where(*filters).order_by(m.User.name, m.User.id).offset(offset).limit(limit)).all()
    return {'items': [{'user_id': target.id, 'name': target.name, 'address': address}
                      for target in users if (address := reconciliation_candidate(db, school.id, target))],
            'total': total, 'offset': offset, 'limit': limit}


@router.post('/mailboxes/reconcile')
def link_existing_mailbox(data: ReconcileInput, db: DB, user: Actor, school: Scope, request: Request):
    _admin(user)
    target = db.get(m.User, data.user_id)
    if not target or not target.active:
        fail(422, 'Selecione um usuário ativo da escola.')
    mailbox = reconcile_mailbox(db, school.id, target)
    audit(db, request, user, 'mailcow.mailbox_reconciled', mailbox, school.id, {'user_id': target.id})
    return mailbox_output(db, mailbox)


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
        job = db.get(m.IntegrationJob, obj.job_id)
        _apply_remote(obj, remote, reconciled=bool(job and job.kind == 'mailbox_reconcile'))
    except IntegrationFailure as error:
        emit('mailcow.mailbox_sync', level='WARNING', state='failed', code=error.code)
        fail(502, error_message(error.code))
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
