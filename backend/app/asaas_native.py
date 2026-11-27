"""Transporte e registro de efeitos remotos do Asaas no contexto da escola."""
from datetime import date, datetime, timedelta
from decimal import Decimal
import hashlib
import hmac
import json
import re

from fastapi import APIRouter, Query, Request
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from . import models as m
from .common import audit
from .config import settings
from .crm_bridge_models import CRMBridgeExternalRequest
from .db import now
from .integration_core import AsaasProvider, IntegrationFailure
from .security import Actor, DB, Scope, fail, lock_school, require, scoped, utc

router = APIRouter(prefix='/api/v1/schools/{school_id}/banking/asaas', tags=['Asaas nativo'])
ACTIVE_ISSUANCE = ('processing', 'completed', 'uncertain')
REMOTE_ID = re.compile(r'[A-Za-z0-9_-]{1,160}', re.ASCII)
SAFE_ERROR = re.compile(r'[A-Z][A-Z0-9_]{0,79}', re.ASCII)


def asaas_connection(db, school, connection_id=None):
    school_id = school if isinstance(school, str) else school.id
    query = select(m.IntegrationConnection).where(
        m.IntegrationConnection.school_id == school_id,
        m.IntegrationConnection.provider == 'asaas',
        m.IntegrationConnection.enabled.is_(True))
    if connection_id is not None:
        query = query.where(m.IntegrationConnection.id == connection_id)
    rows = list(db.scalars(query.limit(2).execution_options(populate_existing=True)))
    if not rows:
        fail(409, 'Habilite a conexão Asaas desta escola para usar esta operação.')
    if len(rows) > 1:
        fail(409, 'Selecione a conexão Asaas da operação.')
    return rows[0]


def asaas_request(connection, method, path, *, params=None, payload=None):
    if method not in ('GET', 'POST', 'PUT', 'DELETE', 'PATCH'):
        raise IntegrationFailure('INVALID_PROVIDER_METHOD')
    if (not isinstance(path, str) or not re.fullmatch(r'/[A-Za-z0-9_-]+(?:/[A-Za-z0-9_-]+)*/?', path)
            or path.startswith('/v3/')):
        raise IntegrationFailure('INVALID_PROVIDER_PATH')
    if connection.provider != 'asaas' or not connection.enabled or connection.environment not in ('sandbox', 'production'):
        raise IntegrationFailure('BANK_NOT_CONFIGURED')
    return AsaasProvider(connection).request(path, method=method, params=params, data=payload)


def asaas_read(connection, path, *, params=None):
    try:
        return asaas_request(connection, 'GET', path, params=params)
    except IntegrationFailure as exc:
        if exc.code == 'PROVIDER_HTTP_429':
            fail(429, 'O Asaas atingiu o limite de consultas. Aguarde antes de tentar novamente.')
        if exc.code == 'PROVIDER_HTTP_404':
            fail(404, 'O Asaas não encontrou o registro solicitado.')
        fail(502, 'O Asaas não concluiu a consulta. Confira a conexão da escola.')


def lock_issuance_channel(db, school_id, charge_id, channel):
    """Confere o canal sob trava. Asaas reserva no ledger; CRM e baixa usam seus próprios registros."""
    if channel not in ('manual', 'crm', 'native', 'card', 'pix_auto'):
        raise ValueError('Canal financeiro desconhecido.')
    lock_school(db, school_id)
    charge = db.scalar(select(m.BankCharge).where(m.BankCharge.id == charge_id,
                       m.BankCharge.school_id == school_id).with_for_update().execution_options(populate_existing=True))
    if charge is None:
        fail(404, 'Cobrança não encontrada nesta escola.')
    if channel != 'pix_auto':
        from .asaas_auto_pix import holds_charge
        if holds_charge(db, charge.id):
            fail(409, 'Esta cobrança possui um ciclo Pix Automático em andamento.')
    reserved = db.scalar(select(m.AsaasNativeOperation.id).where(
        m.AsaasNativeOperation.school_id == school_id, m.AsaasNativeOperation.charge_id == charge_id,
        m.AsaasNativeOperation.issuance_channel.is_not(None),
        m.AsaasNativeOperation.released_at.is_(None),
        m.AsaasNativeOperation.status.in_(ACTIVE_ISSUANCE)).limit(1))
    if reserved:
        fail(409, 'Esta cobrança já está vinculada a uma operação Asaas. Concilie o registro existente.')
    if channel in ('card', 'pix_auto'):
        legacy_pix = (channel == 'pix_auto' and charge.collection_mode == 'provider' and charge.billing_type == 'PIX'
                      and charge.status == 'pending' and charge.connection_id and charge.remote_payment_id)
        internal = (charge.collection_mode == 'manual' and not charge.connection_id and not charge.remote_payment_id
                    and not charge.payment_attempted)
        if charge.status not in ('pending', 'overdue') or charge.manual_receipt_key or not (internal or legacy_pix):
            fail(409, 'Selecione um título interno em aberto, sem emissão ou baixa anterior.')
        crm = db.scalar(select(CRMBridgeExternalRequest.id).where(
            CRMBridgeExternalRequest.school_id == school_id, CRMBridgeExternalRequest.charge_id == charge_id,
            CRMBridgeExternalRequest.status.in_(('queued', 'sending', 'observed', 'uncertain'))).limit(1))
        if crm:
            fail(409, 'Esta cobrança já possui emissão externa pelo CRM.')
    return charge


def release_issuance(db, school_id, charge_id, channel, remote_id):
    """Após comprovação de encerramento pelo domínio, libera apenas o vínculo remoto exato."""
    if not remote_id or channel not in ('card', 'pix_auto'):
        return False
    lock_school(db, school_id)
    model = m.AsaasNativeOperation
    row = db.scalar(select(model).where(model.school_id == school_id, model.charge_id == charge_id,
                    model.issuance_channel == channel, model.status == 'completed', model.remote_id == remote_id,
                    model.released_at.is_(None)).with_for_update())
    if row is None:
        return False
    row.released_at = now()
    row.version += 1
    return True


def assert_no_lifecycle_operation(db, school_id, charge_id):
    lock_school(db, school_id)
    model = m.AsaasNativeOperation
    blocked = db.scalar(select(model.id).where(
        model.school_id == school_id, model.charge_id == charge_id,
        model.kind.in_(('adjust', 'cash_receipt', 'reactivate', 'refund')),
        model.status.in_(('processing', 'uncertain'))).limit(1))
    if blocked:
        fail(409, 'Esta cobrança possui uma alteração financeira aguardando confirmação.')


def _json_value(value):
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return str(value)
    raise TypeError('O pedido contém um tipo de campo não suportado.')


def _fingerprint(connection, kind, charge_id, issuance_channel, data):
    body = json.dumps([connection.id, kind, charge_id, issuance_channel, data], ensure_ascii=False,
                      separators=(',', ':'), sort_keys=True, default=_json_value, allow_nan=False)
    return hmac.new(settings().app_secret_key.encode(), b'asaas-native-v1\0' + body.encode(), hashlib.sha256).hexdigest()


def _safe_receipt(result, ident):
    receipt = {'id': ident} if ident else {}
    status = result.get('status')
    if isinstance(status, str) and re.fullmatch(r'[A-Z][A-Z_]{0,39}', status):
        receipt['status'] = status
    if isinstance(result.get('deleted'), bool):
        receipt['deleted'] = result['deleted']
    return receipt


def _replay(row, fingerprint):
    if not hmac.compare_digest(row.fingerprint, fingerprint):
        fail(409, 'Esta chave de operação já foi usada com outros dados.')
    if row.status == 'completed':
        return row
    if row.status == 'failed':
        fail(409, 'Esta tentativa foi recusada. Confira o histórico antes de iniciar outra.')
    fail(409, 'A operação já foi registrada. Consulte o histórico e concilie seu resultado antes de emitir.')


def run_asaas_operation(db, school, user, connection, *, client_key, kind, fingerprint_data, execute,
                        charge_id=None, remote_id=None, issuance_channel=None, preflight=None):
    """Reserva e confirma antes do HTTP. execute() devolve o objeto de resposta do provedor."""
    key = str(client_key) if client_key is not None else ''
    if not re.fullmatch(r'[A-Za-z0-9_.:-]{1,128}', key) or not re.fullmatch(r'[a-zA-Z0-9_.-]{1,64}', kind):
        fail(422, 'Chave ou tipo de operação inválido.')
    if issuance_channel is not None and (issuance_channel not in ('pix_auto', 'card') or not charge_id):
        raise ValueError('A emissão deve identificar a cobrança e seu canal.')
    lock_school(db, school.id)
    connection = asaas_connection(db, school, connection.id)
    fingerprint = _fingerprint(connection, kind, charge_id, issuance_channel, fingerprint_data)
    query = select(m.AsaasNativeOperation).where(m.AsaasNativeOperation.school_id == school.id,
                                                 m.AsaasNativeOperation.client_key == key)
    prior = db.scalar(query)
    if prior is not None:
        return _replay(prior, fingerprint)
    if issuance_channel:
        charge = lock_issuance_channel(db, school.id, charge_id, issuance_channel)
        if charge.connection_id and charge.connection_id != connection.id:
            fail(409, 'A conexão de origem da cobrança diverge desta operação.')
    elif charge_id:
        scoped(db, m.BankCharge, charge_id, school.id)
    if charge_id and kind in ('refund', 'adjust', 'cash_receipt', 'reactivate'):
        assert_no_lifecycle_operation(db, school.id, charge_id)
    if preflight is not None:
        preflight()
    row = m.AsaasNativeOperation(school_id=school.id, connection_id=connection.id, charge_id=charge_id,
            issuance_channel=issuance_channel, kind=kind, client_key=key, created_by=user.id, fingerprint=fingerprint)
    db.add(row)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        prior = db.scalar(query)
        if prior:
            return _replay(prior, fingerprint)
        fail(409, 'Outra operação já reservou esta cobrança. Recarregue o histórico.')
    try:
        result = execute()
        if not isinstance(result, dict):
            raise IntegrationFailure('PROVIDER_INVALID_RESPONSE', uncertain=True)
        ident = remote_id(result) if remote_id else result.get('id')
        if not isinstance(ident, str) or not REMOTE_ID.fullmatch(ident):
            raise IntegrationFailure('REMOTE_ID_UNCONFIRMED', uncertain=True)
        row.remote_id = ident
        row.response = _safe_receipt(result, ident)
        row.status = 'completed'
        row.version += 1
        db.commit()
    except Exception as exc:
        # Desfaz escritas do callback, preservando a reserva anterior ao HTTP.
        db.rollback()
        row = db.scalar(query.with_for_update())
        if row is None:
            raise
        if row.status == 'completed':
            return row
        code = exc.code if isinstance(exc, IntegrationFailure) and SAFE_ERROR.fullmatch(exc.code) else 'REMOTE_RESULT_UNCONFIRMED'
        # Apenas falha local conhecida ou rejeição inequívoca libera o canal para uma nova tentativa.
        rejected = isinstance(exc, IntegrationFailure) and not exc.uncertain and (code in {
            'API_KEY_MISSING', 'CREDENTIAL_DECRYPT_FAILED', 'INVALID_PROVIDER_METHOD', 'INVALID_PROVIDER_PATH',
            'BANK_NOT_CONFIGURED', 'UNTRUSTED_BANK_HOST'} or re.fullmatch(r'PROVIDER_HTTP_(400|401|402|403|404|405|410|422|429)', code))
        row.status = 'failed' if rejected else 'uncertain'
        row.error_code = code
        row.version += 1
        db.commit()
        fail(502 if rejected else 409, 'O Asaas recusou a operação.' if rejected else
             'O resultado da operação está incerto. Concilie a tentativa registrada antes de emitir.')
    return row


def operation_output(row):
    stale = row.status == 'processing' and utc(row.created_at) < now() - timedelta(minutes=10)
    return {'id': row.id, 'connection_id': row.connection_id, 'charge_id': row.charge_id,
            'issuance_channel': row.issuance_channel, 'released_at': row.released_at,
            'kind': row.kind, 'status': 'uncertain' if stale else row.status,
            'remote_id': row.remote_id, 'response': row.response,
            'error_code': 'REMOTE_RESULT_UNCONFIRMED' if stale else row.error_code,
            'created_at': row.created_at, 'updated_at': row.updated_at}


@router.get('/operations')
def operations(db: DB, user: Actor, school: Scope, offset: int = Query(0, ge=0),
               limit: int = Query(50, ge=1, le=100), charge_id: str = Query('', max_length=36),
               kind: str = Query('', max_length=64)):
    require(user, 'asaas.monitor.read')
    model = m.AsaasNativeOperation
    query = select(model).where(model.school_id == school.id)
    if charge_id:
        query = query.where(model.charge_id == charge_id)
    if kind:
        query = query.where(model.kind == kind)
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    rows = db.scalars(query.order_by(model.created_at.desc(), model.id.desc()).offset(offset).limit(limit))
    return {'items': [operation_output(row) for row in rows], 'total': total, 'offset': offset, 'limit': limit}


@router.get('/operations/{operation_id}')
def operation(operation_id: str, db: DB, user: Actor, school: Scope):
    require(user, 'asaas.monitor.read')
    return operation_output(scoped(db, m.AsaasNativeOperation, operation_id, school.id))


def reconcile_asaas_operation(db, school, user, operation_id, *, verify):
    """Registra uma confirmação identificada por consulta, sem reenviar o comando original."""
    require(user, 'asaas.reconcile')
    lock_school(db, school.id)
    model = m.AsaasNativeOperation
    row = db.scalar(select(model).where(model.school_id == school.id, model.id == operation_id)
                    .with_for_update().execution_options(populate_existing=True))
    if row is None:
        fail(404, 'Operação não encontrada nesta escola.')
    if row.status == 'completed':
        return row
    if operation_output(row)['status'] != 'uncertain':
        fail(409, 'A tentativa não está disponível para conciliação.')
    try:
        proof = verify(row)
    except IntegrationFailure:
        fail(409, 'O Asaas ainda não confirmou a referência original da operação.')
    ident = proof.get('id') if isinstance(proof, dict) else None
    if not isinstance(ident, str) or not REMOTE_ID.fullmatch(ident) or (row.remote_id and row.remote_id != ident):
        fail(409, 'A consulta não trouxe uma confirmação inequívoca. A tentativa continua pendente de conferência.')
    row.status = 'completed'
    row.remote_id = ident
    row.response = _safe_receipt(proof, ident)
    row.error_code = ''
    row.version += 1
    return row


@router.post('/operations/{operation_id}/reconcile')
def reconcile_operation(operation_id: str, db: DB, user: Actor, school: Scope, request: Request):
    require(user, 'asaas.monitor.read')

    def read_proof(row):
        if row.kind not in ('pix_auto_authorize', 'pix_auto_cancel'):
            return None
        from .asaas_auto_pix import PixAuthorization, refresh_auth, with_scope
        prefix = 'pix-auth-' if row.kind == 'pix_auto_authorize' else 'pix-cancel-'
        if not row.client_key.startswith(prefix):
            return None
        auth = db.scalar(select(PixAuthorization).where(PixAuthorization.id == row.client_key[len(prefix):],
                        PixAuthorization.school_id == row.school_id, PixAuthorization.connection_id == row.connection_id))
        if auth is None or (row.charge_id and row.charge_id != auth.charge_id):
            return None
        refresh_auth(with_scope(db, auth), auth)
        if row.kind == 'pix_auto_cancel' and auth.status != 'CANCELLED':
            return None
        return {'id': auth.remote_id, 'status': auth.status}

    row = reconcile_asaas_operation(db, school, user, operation_id, verify=read_proof)
    audit(db, request, user, 'asaas.operation_checked', row, school.id)
    return operation_output(row)
