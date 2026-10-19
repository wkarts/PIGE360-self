"""Optional CRM request journal. Receipt persisted is never a bank payment or activation."""
import hashlib
import hmac
import ipaddress
import re
import socket
import time
from datetime import timedelta
from urllib.parse import urlsplit

import httpx
from fastapi import APIRouter, Request
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from . import models as m
from .common import audit
from .config import settings
from .crm_bridge_contract import (ContractError, MAX_BODY, REQUEST_PATH, decode, encode,
    exact, signature, validate_envelope, validate_receipt, validate_scope, verify_signature)
from .crm_bridge_models import CRMBridgeObservation, CRMBridgeRequest, CRMBridgeConnection
from .db import engine, now, uid
from .security import Actor, DB, Scope, fail, lock_school, require, scoped

router = APIRouter(prefix='/api/v1/schools/{school_id}/crm-bridge', tags=['CRM opcional'])
hooks = APIRouter(tags=['CRM opcional'])
BLOCKED_MESSAGE = 'Solicitação registrada. Emissão no CRM indisponível: isolamento financeiro por emitente pendente.'


def connections(db=None):
    """Configuration is deployment-only; no credential UI/API or secret in DB/output."""
    cfg = settings()
    try:
        values = decode(cfg.crm_bridge_connections.encode()) if cfg.crm_bridge_enabled else {}
        if db is None:
            with Session(engine) as session:
                stored=list(session.scalars(select(CRMBridgeConnection).where(CRMBridgeConnection.enabled.is_(True))))
        else:
            stored=list(db.scalars(select(CRMBridgeConnection).where(CRMBridgeConnection.enabled.is_(True))))
        from .integration_core import unseal
        for item in stored:
            values[item.id]={'base_url':item.base_url,'scope':{'school_id':item.school_id,'issuer_id':item.issuer_id,
                'account_id':item.account_id,'environment':item.environment},'secret':unseal(item.encrypted_secret)['secret']}
        if not values:return {}
        if not isinstance(values, dict) or not values or len(values) > 100:
            raise ContractError('INVALID_CONNECTIONS')
        scopes, secrets = set(), set()
        for key, item in values.items():
            if not re.fullmatch(r'[A-Za-z0-9_-]{1,64}', key):
                raise ContractError('INVALID_CONNECTION_ID')
            exact(item, ('base_url', 'scope', 'secret'))
            validate_scope(item['scope'])
            url = urlsplit(item['base_url'])
            if url.scheme != 'https' or not url.hostname or url.username or url.password or url.port not in (None, 443) or url.path not in ('', '/') or url.query or url.fragment:
                raise ContractError('INVALID_ORIGIN')
            if not isinstance(item['secret'], str) or not 32 <= len(item['secret'].encode()) <= 512:
                raise ContractError('INVALID_SECRET')
            scope_key = tuple(item['scope'][k] for k in ('school_id', 'issuer_id', 'account_id', 'environment'))
            if scope_key in scopes or item['secret'] in secrets:
                raise ContractError('DUPLICATE_SCOPE_OR_SECRET')
            scopes.add(scope_key)
            secrets.add(item['secret'])
        return values
    except (ValueError, TypeError, KeyError, AttributeError):
        fail(503, 'Configuração CRM inválida. Consulte o administrador.')


def configured(connection_id, school_id=None, db=None):
    item = connections(db).get(connection_id)
    if not item or (school_id and item['scope']['school_id'] != school_id):
        fail(409, 'Integração CRM desabilitada ou fora do escopo desta escola.')
    return item


def request_output(row):
    return {'id': row.id, 'charge_id': row.charge_id, 'connection_id': row.connection_id,
            'scope': row.scope, 'status': row.status, 'request_id': row.request_id,
            'attempts': row.attempts, 'error_code': row.error_code,'receipt':row.receipt,
            'capabilities': {'issue_charge': False}, 'message': BLOCKED_MESSAGE,
            'financial_effect_applied': False}


class QueueInput(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)
    connection_id: str = Field(pattern=r'^[A-Za-z0-9_-]{1,64}$')
    charge_id: str = Field(min_length=36, max_length=36)


@router.get('/status')
def status(db: DB, user: Actor, school: Scope):
    require(user, 'banking.read')
    available = connections(db)
    return {'enabled': any(item['scope']['school_id']==school.id for item in available.values()), 'capabilities': {'issue_charge': False},
            'message': BLOCKED_MESSAGE,
            'connections': [{'id': key, 'scope': value['scope']} for key, value in available.items()
                            if value['scope']['school_id'] == school.id]}


@router.post('/requests', status_code=202)
def queue_request(data: QueueInput, db: DB, user: Actor, school: Scope, request: Request):
    require(user, 'banking.write')
    config = configured(data.connection_id, school.id, db)
    lock_school(db, school.id)
    charge = scoped(db, m.BankCharge, data.charge_id, school.id)
    existing = db.scalar(select(CRMBridgeRequest).where(CRMBridgeRequest.school_id == school.id,
                                                       CRMBridgeRequest.charge_id == charge.id))
    if existing:
        if existing.connection_id != data.connection_id or existing.scope != config['scope']:
            fail(409, 'Cobrança já mapeada para outro escopo CRM.')
        return request_output(existing)
    if charge.status not in ('pending', 'overdue', 'queued'):
        fail(409, 'Somente cobranças pendentes podem originar uma solicitação CRM.')
    event_id = uid()
    body = {'schema_version': 1, 'event_id': event_id, 'event_type': 'charge.requested',
            'scope': config['scope'], 'data': {'charge_id': charge.id, 'amount_cents': int(charge.amount * 100),
            'currency': 'BRL', 'due_date': charge.due_on.isoformat(), 'description': 'Cobrança escolar'}}
    try:
        validate_envelope(body, 'charge.requested')
    except ContractError:
        fail(422, 'Cobrança incompatível com o contrato CRM.')
    raw = encode(body)
    row = CRMBridgeRequest(id=event_id, school_id=school.id, charge_id=charge.id,
        connection_id=data.connection_id, scope=config['scope'], raw_body=raw.decode(),
        payload_hash=hashlib.sha256(raw).hexdigest(), status='queued')
    db.add(row)
    db.flush()
    audit(db, request, user, 'crm.request.queued', row, school.id)
    return request_output(row)


@router.get('/requests/{request_id}')
def read_request(request_id: str, db: DB, user: Actor, school: Scope):
    require(user, 'banking.read')
    row = scoped(db, CRMBridgeRequest, request_id, school.id)
    result = request_output(row)
    result['observations'] = [{'event_id': item.event_id, 'status': item.status,
        'received_at': item.created_at.isoformat(), 'financial_effect_applied': False}
        for item in db.scalars(select(CRMBridgeObservation).where(
            CRMBridgeObservation.bridge_request_id == row.id,
            CRMBridgeObservation.school_id == school.id).order_by(CRMBridgeObservation.created_at).limit(100))]
    return result


@router.post('/requests/{request_id}/reconcile', status_code=202)
def reconcile(request_id: str, db: DB, user: Actor, school: Scope, request: Request):
    require(user, 'banking.write')
    lock_school(db, school.id)
    row = db.scalar(select(CRMBridgeRequest).where(CRMBridgeRequest.id == request_id,
        CRMBridgeRequest.school_id == school.id).with_for_update())
    if not row:
        fail(404, 'Solicitação não encontrada nesta escola.')
    cfg = configured(row.connection_id, school.id, db)
    if row.scope != cfg['scope']:
        fail(409, 'Escopo CRM alterado; reconciliação bloqueada.')
    # Reconciliation resends the SAME immutable event/body. Never issue a new charge.
    row.status, row.attempts, row.available_at, row.error_code = 'queued', 0, now(), ''
    audit(db, request, user, 'crm.request.reconcile', row, school.id)
    return request_output(row)


@hooks.post('/api/crm-bridge/webhooks/{connection_id}')
async def webhook(connection_id: str, request: Request, db: DB):
    cfg = configured(connection_id, db=db)
    raw = bytearray()
    async for part in request.stream():
        raw.extend(part)
        if len(raw) > MAX_BODY:
            fail(413, 'Webhook CRM acima do limite.')
    raw = bytes(raw)
    try:
        for name in ('x-pige-timestamp', 'x-pige-event-id', 'x-pige-signature'):
            if len(request.headers.getlist(name)) != 1:
                raise ContractError('INVALID_HEADERS')
        timestamp = request.headers['x-pige-timestamp']
        event_id = request.headers['x-pige-event-id']
        provided = request.headers['x-pige-signature']
        expected = verify_signature(cfg['secret'], timestamp, event_id, request.url.path, raw, int(time.time()))
        if not re.fullmatch(r'sha256=[0-9a-f]{64}', provided) or not hmac.compare_digest(expected, provided):
            raise ContractError('SIGNATURE_MISMATCH')
    except ContractError:
        fail(401, 'Autenticação do webhook CRM inválida ou expirada.')
    try:
        body = validate_envelope(decode(raw), 'charge.status')
        if encode(body) != raw:
            raise ContractError('NON_CANONICAL_JSON')
    except (ContractError, UnicodeError):
        fail(422, 'Evento CRM inválido.')
    if body['event_id'] != event_id or body['scope'] != cfg['scope']:
        fail(403, 'Evento CRM fora do escopo autorizado.')
    lock_school(db, cfg['scope']['school_id'])
    digest = hashlib.sha256(raw).hexdigest()
    old = db.scalar(select(CRMBridgeObservation).where(CRMBridgeObservation.connection_id == connection_id,
                                                       CRMBridgeObservation.event_id == event_id))
    if old:
        if old.payload_hash != digest:
            fail(409, 'Identificador de evento CRM reutilizado com outro conteúdo.')
        return {'status': 'observation_persisted', 'duplicate': True, 'financial_effect_applied': False}
    data = body['data']
    row = db.scalar(select(CRMBridgeRequest).where(CRMBridgeRequest.school_id == cfg['scope']['school_id'],
        CRMBridgeRequest.connection_id == connection_id, CRMBridgeRequest.charge_id == data['charge_id'],
        CRMBridgeRequest.request_id == data['request_id']).with_for_update())
    if not row or row.scope != body['scope']:
        fail(409, 'Solicitação CRM ainda não reconciliada ou sem mapeamento exato.')
    original = decode(row.raw_body.encode())['data']
    if (data['amount_cents'], data['currency']) != (original['amount_cents'], original['currency']):
        fail(409, 'Valor ou moeda diverge da solicitação CRM.')
    observation = CRMBridgeObservation(school_id=row.school_id, bridge_request_id=row.id,
        connection_id=connection_id, event_id=event_id, payload_hash=digest, status=data['status'])
    db.add(observation)
    db.flush()
    audit(db, request, None, 'crm.observation.persisted', observation, row.school_id,
          {'financial_effect_applied': False})
    return {'status': 'observation_persisted', 'duplicate': False, 'financial_effect_applied': False}


class DeliveryError(Exception):
    def __init__(self, code, retryable=False):
        self.code, self.retryable = code, retryable
        super().__init__(code)


def send_request(config, event_id, raw):
    """TLS, no proxy/redirects, bounded body/time, admin-pinned origin, public addresses."""
    base = config['base_url'].rstrip('/')
    host = urlsplit(base).hostname.encode('idna').decode('ascii')
    try:
        addresses = socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
    except OSError:
        raise DeliveryError('CRM_DNS_UNAVAILABLE', True) from None
    if not addresses or any(not ipaddress.ip_address(address[4][0]).is_global for address in addresses):
        raise DeliveryError('CRM_PRIVATE_ADDRESS_BLOCKED')
    # Connect to the validated numeric address. TLS uses the original hostname
    # (httpcore's sni_hostname extension), preventing a second DNS resolution.
    pinned_url = httpx.URL(base + REQUEST_PATH).copy_with(host=addresses[0][4][0])
    timestamp = str(int(time.time()))
    headers = {'Content-Type': 'application/json', 'Accept': 'application/json', 'Host': host,
               'X-Pige-Timestamp': timestamp, 'X-Pige-Event-Id': event_id,
               'X-Pige-Signature': signature(config['secret'], timestamp, event_id, REQUEST_PATH, raw)}
    try:
        with httpx.Client(timeout=httpx.Timeout(settings().integration_timeout_seconds), follow_redirects=False, trust_env=False) as client:
            with client.stream('POST', pinned_url, content=raw, headers=headers, extensions={'sni_hostname': host}) as response:
                if response.status_code not in (200, 202):
                    raise DeliveryError('CRM_HTTP_' + str(response.status_code), response.status_code >= 500 or response.status_code == 429)
                received = bytearray()
                for part in response.iter_bytes():
                    received.extend(part)
                    if len(received) > MAX_BODY:
                        raise DeliveryError('CRM_RESPONSE_TOO_LARGE')
                return validate_receipt(decode(bytes(received)), event_id)
    except httpx.HTTPError:
        # The receiver contract guarantees event+raw-body idempotency, including after timeout.
        raise DeliveryError('CRM_NETWORK_ERROR', True) from None
    except ContractError:
        raise DeliveryError('CRM_INVALID_RECEIPT') from None


def process_one():
    available = connections()
    if not available:return False
    # A short bounded HTTP call stays under the row lock. A crash rolls back and the
    # SAME event/body is retried; PostgreSQL SKIP LOCKED supports multiple workers.
    with Session(engine, expire_on_commit=False) as db:
        row = db.scalar(select(CRMBridgeRequest).where(CRMBridgeRequest.status.in_(('queued', 'retry')),
            CRMBridgeRequest.available_at <= now()).order_by(CRMBridgeRequest.created_at).with_for_update(skip_locked=True).limit(1))
        if not row:
            return False
        config = available.get(row.connection_id)
        row.attempts += 1
        try:
            if not config or config['scope'] != row.scope:
                raise DeliveryError('CRM_SCOPE_CHANGED')
            raw = row.raw_body.encode()
            if hashlib.sha256(raw).hexdigest() != row.payload_hash:
                raise DeliveryError('CRM_PAYLOAD_CHANGED')
            native = db.scalar(select(m.BankCharge).where(m.BankCharge.id == row.charge_id,
                m.BankCharge.school_id == row.school_id).with_for_update())
            snapshot = decode(raw)['data']
            if not native or native.status not in ('pending', 'overdue', 'queued'):
                raise DeliveryError('CRM_NATIVE_CHARGE_SETTLED_OR_UNAVAILABLE')
            if int(native.amount * 100) != snapshot['amount_cents'] or native.due_on.isoformat() != snapshot['due_date']:
                raise DeliveryError('CRM_NATIVE_CHARGE_CHANGED')
            receipt = send_request(config, row.id, raw)
            # Validate also injected transports; never trust a create/paid response.
            validate_receipt(receipt, row.id)
            if row.request_id and row.request_id != receipt['request_id']:
                raise DeliveryError('CRM_MAPPING_CHANGED')
            row.request_id, row.receipt, row.status, row.error_code = receipt['request_id'], receipt, 'blocked', ''
        except (DeliveryError, ContractError) as error:
            row.error_code = error.code if isinstance(error, DeliveryError) else 'CRM_INVALID_RECEIPT'
            row.status = 'retry' if isinstance(error, DeliveryError) and error.retryable and row.attempts < 5 else 'failed'
            row.available_at = now() + timedelta(seconds=min(900, 15 * 2 ** row.attempts))
        except Exception:
            row.status, row.error_code = 'failed', 'CRM_UNEXPECTED_DELIVERY_ERROR'
        row_id, attempts = row.id, row.attempts
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            failed = db.get(CRMBridgeRequest, row_id)
            failed.status, failed.error_code, failed.attempts = 'failed', 'CRM_MAPPING_CONFLICT', attempts
            db.commit()
        return True


class ConnectionInput(BaseModel):
    model_config=ConfigDict(extra='forbid',str_strip_whitespace=True)
    version:int|None=Field(default=None,ge=1)
    enabled:bool=False
    base_url:str=Field(max_length=500)
    issuer_id:str=Field(pattern=r'^[1-9][0-9]{0,18}$')
    account_id:str=Field(pattern=r'^[A-Za-z0-9_.:-]{1,128}$')
    environment:str=Field(default='sandbox',pattern=r'^(sandbox|production)$')
    secret:str=Field(default='',max_length=512)


def connection_output(row):
    return {'id':row.id,'version':row.version,'enabled':row.enabled,'base_url':row.base_url,
        'issuer_id':row.issuer_id,'account_id':row.account_id,'environment':row.environment,
        'secret_configured':bool(row.encrypted_secret)} if row else None


@router.get('/configuration')
def get_configuration(db:DB,user:Actor,school:Scope):
    require(user,'integrations.manage')
    return {'configuration':connection_output(db.scalar(select(CRMBridgeConnection).where(CRMBridgeConnection.school_id==school.id))),
        'capabilities':{'issue_charge':False},'message':BLOCKED_MESSAGE}


@router.put('/configuration')
def save_configuration(data:ConnectionInput,db:DB,user:Actor,school:Scope,request:Request):
    require(user,'integrations.manage');lock_school(db,school.id)
    url=urlsplit(data.base_url)
    try:valid=url.scheme=='https' and url.hostname and not url.username and not url.password and url.port in (None,443) and url.path in ('','/') and not url.query and not url.fragment
    except ValueError:valid=False
    if not valid:fail(422,'Informe a origem HTTPS do serviço, sem caminho, credenciais ou porta alternativa.')
    row=db.scalar(select(CRMBridgeConnection).where(CRMBridgeConnection.school_id==school.id))
    if row:
        from .security import check_version
        if data.version is None:fail(409,'Recarregue a configuração antes de alterar.')
        check_version(row,data.version)
        if db.scalar(select(CRMBridgeRequest.id).where(CRMBridgeRequest.connection_id==row.id).limit(1)) and (row.base_url,row.issuer_id,row.account_id,row.environment)!=(data.base_url.rstrip('/'),data.issuer_id,data.account_id,data.environment):
            fail(409,'Esta conexão já possui solicitações. Preserve seu destino e mapeamento para conciliação.')
    elif data.version is not None:fail(409,'A conexão não existe. Recarregue antes de salvar.')
    else:row=CRMBridgeConnection(school_id=school.id,encrypted_secret='');db.add(row)
    from .integration_core import seal
    if data.secret:
        if len(data.secret.encode())<32:fail(422,'O segredo compartilhado deve possuir pelo menos 32 bytes.')
        row.encrypted_secret=seal({'secret':data.secret})
    if not row.encrypted_secret:fail(422,'Informe o segredo compartilhado da integração.')
    row.enabled=data.enabled;row.base_url=data.base_url.rstrip('/');row.issuer_id=data.issuer_id
    row.account_id=data.account_id;row.environment=data.environment
    if row.id:row.version+=1
    db.flush();connections(db)  # valida duplicidade de escopos e segredos sem expô-los
    audit(db,request,user,'crm.configuration_changed',row,school.id,{'enabled':row.enabled,'environment':row.environment})
    return connection_output(row)


@router.get('/requests')
def list_requests(db:DB,user:Actor,school:Scope):
    require(user,'banking.read')
    return {'items':[request_output(row) for row in db.scalars(select(CRMBridgeRequest).where(
        CRMBridgeRequest.school_id==school.id).order_by(CRMBridgeRequest.created_at.desc()).limit(100))]}


@router.post('/connection-test')
def test_connection(db:DB,user:Actor,school:Scope,request:Request):
    require(user,'integrations.manage')
    row=db.scalar(select(CRMBridgeConnection).where(CRMBridgeConnection.school_id==school.id))
    if not row or not row.enabled:fail(409,'Salve e habilite a conexão antes do teste.')
    # HEAD apenas verifica transporte; não envia evento financeiro nem cria cobrança.
    host=urlsplit(row.base_url).hostname
    try:
        addresses=socket.getaddrinfo(host,443,type=socket.SOCK_STREAM)
        if not addresses or any(not ipaddress.ip_address(x[4][0]).is_global for x in addresses):
            fail(422,'O destino deve resolver somente para endereços públicos.')
        url=httpx.URL(row.base_url+REQUEST_PATH).copy_with(host=addresses[0][4][0])
        with httpx.Client(timeout=settings().integration_timeout_seconds,follow_redirects=False,trust_env=False) as client:
            response=client.head(url,headers={'Host':host},extensions={'sni_hostname':host})
        ok=response.status_code in (200,202,204,401,403,405)
        result={'reachable':ok,'http_status':response.status_code,'charge_created':False,
            'message':'Transporte HTTPS acessível. Este teste não homologa autenticação nem emissão.' if ok else 'O destino respondeu, mas a rota da ponte não foi confirmada.'}
    except (httpx.HTTPError,OSError):
        result={'reachable':False,'charge_created':False,'message':'Não foi possível alcançar o destino por HTTPS.'}
    audit(db,request,user,'crm.connection_tested',row,school.id,{'reachable':result['reachable']})
    return result
