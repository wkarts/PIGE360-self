"""Monitor nativo da conta bancária da escola e conciliação dos títulos PIGE."""
from datetime import date
from decimal import Decimal, InvalidOperation
from typing import Literal
from urllib.parse import quote
from uuid import UUID

from fastapi import Query, Request
from pydantic import Field
from sqlalchemy import func, or_, select

from . import models as m
from .asaas_native import (asaas_connection, asaas_read, asaas_request, operation_output,
                           router, run_asaas_operation)
from .banking import STATUS, effective_status, queue_charge_sync
from .common import audit
from .db import now
from .integration_core import IntegrationFailure, connection
from .schemas import Input
from .security import Actor, DB, Scope, fail, lock_school, require, scoped


class Reconciliation(Input):
    charge_ids: list[UUID] = Field(min_length=1, max_length=100)


class Refund(Input):
    client_key: UUID
    amount: Decimal = Field(gt=0, decimal_places=2, max_digits=12)
    description: str = Field(min_length=3, max_length=255)


def local_query(db, school_id, conn, section, q, status, start, end, page, page_size):
    if section == 'charges':
        model = m.BankCharge
        label_column, ref, status_col, date_col = model.description, model.external_reference, model.status, model.due_on
        search = [model.description, model.external_reference, model.remote_payment_id, model.id,
                  model.payer_snapshot['name'].as_string()]
    elif section == 'operations':
        model = m.AsaasNativeOperation
        label_column, ref, status_col, date_col = model.kind, model.remote_id, model.status, model.created_at
        search = [model.kind, model.remote_id, model.id, model.charge_id]
    else:
        model = m.IntegrationWebhook
        label_column, ref, status_col, date_col = model.event_type, model.remote_id, model.status, model.created_at
        search = [model.event_id, model.event_type, model.remote_id]
    stmt = select(model).where(model.school_id == school_id, model.connection_id == conn.id)
    if status:
        stmt = stmt.where(status_col == status)
    if q:
        stmt = stmt.where(or_(*(column.icontains(q, autoescape=True) for column in search)))
    if start or end:
        from .management_reports import in_period
        # Datas de eventos usam os limites locais da Bahia e mantêm a última data inclusiva.
        if start and end:
            stmt = stmt.where(in_period(date_col, {'date_from': start, 'date_to': end}, section != 'charges'))
        else:
            fail(422, 'Informe as duas datas do intervalo.')
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    records = db.scalars(stmt.order_by(date_col.desc(), model.id).offset((page-1)*page_size).limit(page_size)).all()
    items = []
    for row in records:
        items.append({'id': row.id, 'label': getattr(row, label_column.key), 'reference': getattr(row, ref.key) or '',
                      'status': effective_status(row) if section == 'charges' else row.status,
                      'charge_id': row.id if section == 'charges' else getattr(row, 'charge_id', None),
                      'remote_id': getattr(row, 'remote_payment_id', None) if section == 'charges' else getattr(row, 'remote_id', None),
                      'billing_type': getattr(row, 'billing_type', None), 'amount': str(row.amount) if section == 'charges' else None,
                      'date': getattr(row, date_col.key), 'error_code': getattr(row, 'error_code', None)})
    return {'section': section, 'items': items, 'total': total, 'page': page, 'has_more': page*page_size < total}


@router.get('/monitor')
def monitor(db: DB, user: Actor, school: Scope, section: Literal['charges','webhooks','operations','remote']='charges',
            page: int=Query(1, ge=1), page_size: int=Query(30, ge=1, le=100), q: str=Query('', max_length=160),
            status: str=Query('', max_length=65), start: date|None=None, end: date|None=None,
            date_basis: Literal['paymentDate','dueDate','dateCreated']='paymentDate'):
    require(user,'asaas.monitor.read')
    conn = asaas_connection(db, school) if section == 'remote' else connection(db, school.id, 'asaas', False)
    if not conn:
        return {'section':section,'items':[],'total':0,'page':page,'has_more':False}
    if (start is None) != (end is None) or (start and start > end):
        fail(422,'Informe um intervalo de datas válido.')
    q=q.strip()
    if section != 'remote':
        return local_query(db, school.id, conn, section, q, status, start, end, page, page_size)
    params={'limit':page_size, 'offset':(page-1)*page_size}
    if status: params['status']=status.upper()
    if start: params.update({date_basis+'[ge]':start.isoformat(), date_basis+'[le]':end.isoformat()})
    if q:
        # Uma seleção local envia somente a referência exata desse título ao provedor.
        local=db.scalar(select(m.BankCharge).where(m.BankCharge.school_id==school.id,m.BankCharge.connection_id==conn.id,
                        or_(m.BankCharge.id==q,m.BankCharge.external_reference==q)))
        params['externalReference']=local.external_reference if local else q
    data=asaas_read(conn,'/payments',params=params)
    records=data.get('data')
    if not isinstance(records,list) or any(not isinstance(row,dict) or not row.get('id') for row in records):
        fail(502,'Resposta de cobranças inválida na conta Asaas.')
    remote_ids=[str(row['id']) for row in records]
    linked=dict(db.execute(select(m.BankCharge.remote_payment_id,m.BankCharge.id).where(
        m.BankCharge.school_id==school.id,m.BankCharge.connection_id==conn.id,m.BankCharge.remote_payment_id.in_(remote_ids))).all())
    items=[{'id':row['id'],'label':row.get('description') or 'Cobrança Asaas','status':row.get('status'),
            'amount':row.get('value'),'date':row.get(date_basis) or row.get('dueDate'),
            'reference':row.get('externalReference'),'billing_type':row.get('billingType'),'charge_id':linked.get(row['id'])}
           for row in records]
    return {'section':section,'items':items,'total':data.get('totalCount'),'has_more':bool(data.get('hasMore')),'page':page}


def charge_and_connection(db,school,charge_id):
    charge=scoped(db,m.BankCharge,str(charge_id),school.id)
    if charge.collection_mode!='provider' or not charge.connection_id:
        fail(409,'Selecione uma cobrança emitida pelo Asaas.')
    return charge, asaas_connection(db,school,charge.connection_id)


def remote_payment(conn, charge):
    if charge.remote_payment_id:
        return asaas_read(conn,'/payments/'+quote(charge.remote_payment_id,safe=''))
    data=asaas_read(conn,'/payments',params={'externalReference':charge.external_reference,'limit':2})
    rows=data.get('data')
    if not isinstance(rows,list) or any(not isinstance(row,dict) for row in rows):fail(502,'Consulta de cobrança inválida.')
    hits=[r for r in rows if r.get('externalReference')==charge.external_reference]
    if data.get('hasMore') or len(hits)>1:fail(409,'Há mais de uma cobrança para esta referência. Verifique o extrato.')
    return hits[0] if hits else None


def payment_matches(charge,remote):
    if not remote or not remote.get('id') or (charge.remote_payment_id and remote['id']!=charge.remote_payment_id):return False
    try: amount=Decimal(str(remote['value']))
    except (KeyError, InvalidOperation, ValueError):return False
    return bool(charge.remote_customer_id and remote.get('customer')==charge.remote_customer_id
                and remote.get('externalReference')==charge.external_reference and amount==charge.amount
                and remote.get('billingType')==charge.billing_type)


@router.get('/monitor/charges/{charge_id}/compare')
def compare(charge_id: UUID,db: DB,user: Actor,school: Scope):
    require(user,'asaas.monitor.read');charge,conn=charge_and_connection(db,school,charge_id)
    payment=remote_payment(conn,charge)
    same=payment_matches(charge,payment);remote_status=(payment or {}).get('status')
    status='cancelled' if (payment or {}).get('deleted') else STATUS.get(remote_status,'awaiting_review')
    return {'local_status':effective_status(charge),'remote_status':remote_status,'local_amount':str(charge.amount),
            'remote_amount':(payment or {}).get('value'),'match':same and charge.status==status,'remote_id':(payment or {}).get('id'),
            'reason':('Cobrança ainda não localizada.' if not payment else 'Confira referência, pagador, meio e valor.' if not same
                      else 'Situações equivalentes.' if charge.status==status else 'Situações divergentes; solicite conciliação.')}


@router.post('/monitor/reconcile')
def reconcile(data: Reconciliation,db: DB,user: Actor,school: Scope,request: Request):
    require(user,'asaas.monitor.read');require(user,'asaas.reconcile');lock_school(db,school.id)
    charges=[charge_and_connection(db,school,key)[0] for key in dict.fromkeys(data.charge_ids)]
    items=[{'charge_id':charge.id,'status':queue_charge_sync(db,charge).status} for charge in charges]
    audit(db,request,user,'asaas.reconcile.requested',school,school.id,{'count':len(items)})
    return {'queued':len(items),'items':items}


@router.get('/monitor/diagnostics')
def diagnostics(db: DB,user: Actor,school: Scope):
    require(user,'asaas.monitor.read')
    conn=connection(db,school.id,'asaas',False)
    if not conn:
        return {'enabled':False,'environment':None,'webhook_registered':False,'counts':{},'checked_at':now(),
                'last_test_at':None,'last_test_ok':None}
    counts=dict(db.execute(select(m.IntegrationJob.status,func.count()).where(m.IntegrationJob.school_id==school.id,
        m.IntegrationJob.connection_id==conn.id).group_by(m.IntegrationJob.status)).all())
    return {'enabled':conn.enabled,'environment':conn.environment,'webhook_registered':bool((conn.config or {}).get('webhook_id')),
            'counts':counts,'checked_at':now(),'last_test_at':conn.last_test_at,'last_test_ok':conn.last_test_ok}


@router.post('/monitor/charges/{charge_id}/refund')
def refund(charge_id: UUID,data: Refund,db: DB,user: Actor,school: Scope):
    require(user,'asaas.monitor.read');require(user,'asaas.refund');charge,conn=charge_and_connection(db,school,charge_id)
    def preflight():
        payment=remote_payment(conn,charge)
        if not payment_matches(charge,payment) or not charge.remote_payment_id:
            fail(409,'Confira a referência, o pagador, o meio e o valor antes de estornar.')
        allowed = {'RECEIVED','PARTIALLY_REFUNDED'}
        if charge.billing_type == 'CREDIT_CARD':
            allowed.add('CONFIRMED')
        if charge.billing_type not in {'PIX','CREDIT_CARD'} or payment.get('deleted') or payment.get('status') not in allowed:
            fail(409,'Este pagamento não admite estorno nesta situação.')
        history = asaas_read(conn, '/payments/'+quote(charge.remote_payment_id,safe='')+'/refunds')
        rows = history.get('data')
        if (not isinstance(rows,list) or history.get('hasMore') is not False
                or history.get('totalCount',len(rows)) != len(rows)):
            fail(409,'O Asaas ainda não confirmou o histórico completo de estornos.')
        reserved = Decimal('0')
        for row in rows:
            if not isinstance(row,dict) or row.get('status') not in {
                    'DONE','PENDING','CANCELLED','AWAITING_CRITICAL_ACTION_AUTHORIZATION','AWAITING_CUSTOMER_EXTERNAL_AUTHORIZATION'}:
                fail(409,'O histórico de estornos contém uma situação pendente de conferência.')
            if row['status'] != 'CANCELLED':
                try:
                    value = Decimal(str(row['value']))
                    if not value.is_finite() or value <= 0: raise ValueError
                except (KeyError,ValueError,InvalidOperation):
                    fail(409,'O Asaas não confirmou o valor dos estornos anteriores.')
                reserved += value
        if data.amount > charge.amount - reserved:
            fail(409,'O valor excede o saldo disponível para estorno desta cobrança.')

    def execute():
        result=asaas_request(conn,'POST','/payments/'+quote(charge.remote_payment_id,safe='')+'/refund',
                             payload={'value':float(data.amount),'description':data.description.strip()})
        if not payment_matches(charge,result):
            raise IntegrationFailure('BANK_REFUND_RESULT_MISMATCH',uncertain=True)
        return result

    entry=run_asaas_operation(db,school,user,conn,client_key=str(data.client_key),kind='refund',charge_id=charge.id,
        fingerprint_data={'amount':format(data.amount,'.2f'),'description':data.description.strip()},
        preflight=preflight,execute=execute)
    queue_charge_sync(db,charge)
    return operation_output(entry)
