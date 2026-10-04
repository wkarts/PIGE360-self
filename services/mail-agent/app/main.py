from __future__ import annotations

import hmac
import imaplib
import ipaddress
import json
import os
import re
import smtplib
import socket
import ssl
from typing import Literal
from urllib.parse import quote, urlsplit

import httpx
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator

TOKEN = os.environ.get('MAIL_AGENT_API_KEY', '')
TIMEOUT = max(3, min(30, int(os.environ.get('MAIL_AGENT_TIMEOUT_SECONDS', '12'))))
DOMAIN = re.compile(r'(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,62}')
LOCAL_PART = re.compile(r'[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?')
_PRIVATE = tuple(map(ipaddress.ip_network, ('10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', 'fc00::/7')))

app = FastAPI(title='PIGE360 Mail Integration Agent', docs_url=None, redoc_url=None, openapi_url=None)


class ProviderRequest(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    provider: Literal['mailcow', 'generic']
    host: str = Field(min_length=1, max_length=253)
    domain: str = Field(min_length=3, max_length=253)
    allow_private_network: bool = False
    base_url: str = ''
    password: str = ''
    imap_host: str = ''
    smtp_host: str = ''
    imap_port: int = Field(default=993, ge=1, le=65535)
    smtp_port: int = Field(default=465, ge=1, le=65535)
    smtp_security: Literal['tls', 'starttls'] = 'tls'

    @field_validator('domain')
    @classmethod
    def valid_domain(cls, value):
        value = value.lower().rstrip('.')
        if not DOMAIN.fullmatch(value):
            raise ValueError('Domínio inválido')
        return value


class MailcowCall(ProviderRequest):
    provider: Literal['mailcow'] = 'mailcow'
    base_url: str = Field(min_length=8, max_length=300)
    api_key: str = Field(min_length=16, max_length=512)
    path: str = Field(min_length=1, max_length=512)
    method: Literal['GET', 'POST', 'PUT', 'DELETE'] = 'GET'
    payload: dict | list | None = None

    @field_validator('path')
    @classmethod
    def allowed_path(cls, value):
        if '?' in value or '#' in value or '..' in value or not value.startswith('/api/v1/'):
            raise ValueError('Operação não permitida')
        if not re.fullmatch(r'/api/v1/(?:get/(?:domain|mailbox)/[A-Za-z0-9@._%+-]+|add/mailbox|edit/mailbox|delete/mailbox)', value):
            raise ValueError('Operação não permitida')
        return value


def authorized(value: str | None) -> None:
    if not TOKEN or not value or not hmac.compare_digest(value, TOKEN):
        raise HTTPException(401, 'Autenticação interna inválida.')


def _host_allowed(host: str, port: int, allow_private: bool) -> list[str]:
    host = host.strip().rstrip('.').lower()
    if not host or host in {'localhost', 'metadata.google.internal'} or host.endswith(('.localhost', '.local', '.internal')):
        raise HTTPException(422, 'O servidor configurado não é permitido.')
    try:
        literal = ipaddress.ip_address(host.strip('[]'))
        candidates = [literal]
    except ValueError:
        if not DOMAIN.fullmatch(host):
            raise HTTPException(422, 'Hostname inválido.')
        try:
            candidates = [ipaddress.ip_address(item[4][0]) for item in socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)]
        except OSError:
            raise HTTPException(502, 'Não foi possível localizar o servidor configurado.') from None
    if not candidates:
        raise HTTPException(502, 'Não foi possível localizar o servidor configurado.')
    for address in candidates:
        private_lan = allow_private and any(address.version == n.version and address in n for n in _PRIVATE)
        if address.is_loopback or address.is_link_local or address.is_multicast or address.is_unspecified or address.is_reserved or (not address.is_global and not private_lan):
            raise HTTPException(422, 'O servidor configurado não pode ser acessado por esta rede.')
    return [str(address) for address in candidates]


def _api_target(data: MailcowCall) -> tuple[str, str, str]:
    try:
        parsed = urlsplit(data.base_url)
        port = parsed.port or 443
    except ValueError:
        raise HTTPException(422, 'Endereço do servidor inválido.') from None
    if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment or parsed.path not in ('', '/') or port not in (443, 8443):
        raise HTTPException(422, 'Use o endereço HTTPS do servidor, sem credenciais nem caminho.')
    host = parsed.hostname.rstrip('.').lower()
    addresses = _host_allowed(host, port, data.allow_private_network)
    address = sorted((ipaddress.ip_address(item) for item in addresses), key=lambda item: (item.version, int(item)))[0]
    pinned = f'[{address}]' if address.version == 6 else str(address)
    authority = host + (f':{port}' if port != 443 else '')
    return f'https://{pinned}:{port}', authority, host


@app.get('/health/ready')
def ready():
    return {'status': 'ok', 'service': 'mail-agent'}


@app.get('/v1/capabilities')
def capabilities(authorization: str | None = Header(default=None)):
    authorized(authorization.removeprefix('Bearer ') if authorization else None)
    return {
        'providers': {
            'mailcow': {'connectivity_test': True, 'provisioning': True, 'aliases': False, 'quota': True, 'sieve': True, 'sso': False},
            'generic': {'connectivity_test': True, 'provisioning': False, 'aliases': False, 'quota': False, 'sieve': False, 'sso': False},
        },
        'sso': {'enabled': False, 'reason': 'O provedor de correio precisa oferecer autenticação delegada IMAP/SMTP.'},
    }


@app.post('/v1/providers/mailcow/request')
def mailcow_request(data: MailcowCall, authorization: str | None = Header(default=None)):
    authorized(authorization.removeprefix('Bearer ') if authorization else None)
    base, authority, host = _api_target(data)
    headers = {'X-API-Key': data.api_key, 'Host': authority, 'Accept': 'application/json'}
    try:
        with httpx.Client(timeout=httpx.Timeout(TIMEOUT), trust_env=False, follow_redirects=False) as client:
            with client.stream(data.method, base + data.path, headers=headers, json=data.payload,
                               extensions={'sni_hostname': host}) as response:
                if response.status_code == 404 and data.method == 'GET':
                    return {'result': None}
                if response.status_code in (401, 403):
                    raise HTTPException(502, 'O servidor recusou as credenciais ou as permissões da integração.')
                if response.status_code == 429 or response.status_code >= 500:
                    raise HTTPException(503, 'O servidor de correio está temporariamente indisponível.')
                if not 200 <= response.status_code < 300:
                    raise HTTPException(502, 'O servidor recusou a operação solicitada.')
                raw = bytearray()
                for part in response.iter_bytes():
                    raw.extend(part)
                    if len(raw) > 1_000_000:
                        raise HTTPException(502, 'A resposta do servidor excedeu o limite permitido.')
                try:
                    result = json.loads(raw) if raw else None
                except (ValueError, UnicodeDecodeError):
                    raise HTTPException(502, 'O servidor retornou uma resposta inválida.') from None
                return {'result': result}
    except HTTPException:
        raise
    except (httpx.HTTPError, OSError, ssl.SSLError):
        raise HTTPException(502, 'Não foi possível concluir a conexão com o servidor configurado.') from None


@app.post('/v1/providers/test')
def test_provider(data: ProviderRequest, authorization: str | None = Header(default=None)):
    authorized(authorization.removeprefix('Bearer ') if authorization else None)
    if data.provider == 'mailcow':
        raise HTTPException(422, 'Use a consulta de domínio para validar a integração administrativa.')
    address = data.host.strip().lower()
    pieces = address.rsplit('@', 1)
    if len(pieces) != 2 or pieces[1] != data.domain or not LOCAL_PART.fullmatch(pieces[0]) or '..' in pieces[0]:
        raise HTTPException(422, 'O usuário precisa pertencer ao domínio da instituição.')
    if not data.imap_host or not data.smtp_host:
        raise HTTPException(422, 'Informe os servidores de entrada e saída.')
    _host_allowed(data.imap_host, data.imap_port, data.allow_private_network)
    _host_allowed(data.smtp_host, data.smtp_port, data.allow_private_network)
    # This endpoint deliberately accepts credentials only for the duration of the check.
    password = data.password
    if not password:
        raise HTTPException(422, 'Informe a senha da caixa para validar a conexão.')
    try:
        context = ssl.create_default_context()
        with imaplib.IMAP4_SSL(data.imap_host, data.imap_port, ssl_context=context, timeout=TIMEOUT) as imap:
            imap.login(address, password)
            imap.logout()
        if data.smtp_security == 'tls':
            with smtplib.SMTP_SSL(data.smtp_host, data.smtp_port, timeout=TIMEOUT, context=context) as smtp:
                smtp.login(address, password)
        else:
            with smtplib.SMTP(data.smtp_host, data.smtp_port, timeout=TIMEOUT) as smtp:
                smtp.ehlo(); smtp.starttls(context=context); smtp.ehlo(); smtp.login(address, password)
    except (OSError, imaplib.IMAP4.error, smtplib.SMTPException, ssl.SSLError):
        raise HTTPException(502, 'Não foi possível autenticar nos dois serviços. Confira os dados e tente novamente.') from None
    return {'imap': True, 'smtp': True, 'provisioning': False, 'sso': False}
