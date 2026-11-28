"""Leitura dos instrumentos já confirmados. A consulta do portal não emite nem baixa títulos."""
import json
import re
from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy import and_, case, func, or_, select
from sqlalchemy.orm import load_only

from . import models as m
from .asaas_card_models import CardCheckout
from .banking import charge_for_payer, effective_status_expression, safe_invoice_url
from .crm_bridge_charge_contract import OPEN_PAYMENT_STATES, SETTLED_PAYMENT_STATES, CANCELLED_PAYMENT_STATES, crm_receipt_payable
from .crm_bridge_models import CRMBridgeExternalRequest as External
from .crm_bridge_models import CRMBridgeRequest as Invoice
from .db import now
from .security import fail

BANK_ZONE = ZoneInfo('America/Sao_Paulo')
PAYMENT_FIELDS = {'invoice_url', 'bank_slip_url', 'pix_copy_paste', 'identification_field'}


def _external_status():
    status = External.receipt['status'].as_string()
    return case(
        (External.id.is_(None), None),
        (or_(External.receipt['reconciliation_status'].as_string() == 'reconciled', status.in_(SETTLED_PAYMENT_STATES)), 'settled'),
        (status.in_(CANCELLED_PAYMENT_STATES), 'cancelled'),
        (and_(External.status == 'observed', status.in_(OPEN_PAYMENT_STATES),
              func.coalesce(External.last_command['status'].as_string(), '') != 'unconfirmed'), 'open'),
        else_='unavailable',
    )


def _family_scope(db, user, student):
    from .learning_portal import own_profile_students
    ids = select(m.Enrollment.id).where(m.Enrollment.student_id == student.id, m.Enrollment.school_id == student.school_id)
    charge = m.BankCharge
    owner = charge_for_payer(db.get(m.Person, user.person_id))
    scope = [charge.school_id == student.school_id, charge.enrollment_id.in_(ids),
             or_(charge.payer_snapshot['private_payer'].as_boolean().is_not(True),
                 charge.payer_snapshot['person_id'].as_string() == user.person_id)]
    if not any(row.id == student.id for row in own_profile_students(db,user)):
        scope.append(owner)
    return scope, owner


def _pix(payload, expiry):
    if not isinstance(payload,str) or not 20 <= len(payload.encode()) <= 15000 or re.search(r'[\x00-\x1f\x7f]',payload):
        return {}
    try:
        end=datetime.fromisoformat(expiry)
        if not end.tzinfo:
            end=end.replace(tzinfo=BANK_ZONE)
        if end <= now():
            return {}
    except (TypeError,ValueError,OverflowError):
        return {}
    return {'pix_copy_paste':payload, 'pix_expires_at':end.isoformat()}


def _public_crm_instrument(row, billing):
    # O recibo v3 e o pedido v2 precisam pertencer ao mesmo título e ao valor atual.
    charge, external = row.BankCharge, row.CRMBridgeExternalRequest
    try:
        data = json.loads(row.invoice_body)['data']
        if (data['charge_id'] != charge.id or data['amount_cents'] != int(charge.amount * 100)
                or data['due_date'] != charge.due_on.isoformat()):
            return {}
    except (KeyError,TypeError,ValueError):
        return {}
    receipt = external.receipt or {}
    if receipt.get('charge_id') != charge.id or not crm_receipt_payable(receipt):
        return {}
    instrument = external.payment_instrument or receipt.get('instrument') or {}
    if not isinstance(instrument, dict) or instrument.get('billing_type') != billing:
        return {}
    if instrument.get('billing_type') == 'PIX':
        return _pix(instrument.get('payload'),instrument.get('expiration_date'))
    if instrument.get('billing_type') == 'BOLETO':
        line, barcode = instrument.get('identification_field'), instrument.get('bar_code')
        if isinstance(line,str) and re.fullmatch(r'[0-9]{47}',line) and isinstance(barcode,str) and re.fullmatch(r'[0-9]{44}',barcode):
            return {'identification_field':line, 'bar_code':barcode}
    return {}


def _documents(row):
    charge = row.BankCharge
    source = 'asaas' if charge.collection_mode == 'provider' or row.has_card_checkout else 'manual'
    billing = charge.billing_type
    if row.CRMBridgeExternalRequest:
        source = 'crm'
        try:
            billing = json.loads(row.CRMBridgeExternalRequest.raw_body)['data']['billing_type']
        except (TypeError,ValueError,KeyError):
            billing = 'MANUAL'
    public = {'source':source, 'billing_type':billing}
    if not row.is_payer or row.status not in ('pending','overdue'):
        return public
    if row.CRMBridgeExternalRequest:
        if row.external_payment_status == 'open':
            public.update(_public_crm_instrument(row, billing))
    elif source == 'asaas' and charge.collection_mode == 'provider' and charge.remote_payment_id:
        if link := safe_invoice_url(charge.invoice_url):
            public['invoice_url'] = link
        if billing == 'PIX':
            public.update(_pix(charge.pix_copy_paste, charge.pix_expires_at))
        elif billing == 'BOLETO' and (link := safe_invoice_url(charge.bank_slip_url)):
            public['bank_slip_url'] = link
    return public


def _rows(user, scope, owner):
    charge = m.BankCharge
    has_checkout = select(CardCheckout.id).where(CardCheckout.school_id == charge.school_id, CardCheckout.charge_id == charge.id,
                                                  CardCheckout.payer_id == user.person_id).exists()
    return (select(charge, External, Invoice.raw_body.label('invoice_body'), has_checkout.label('has_card_checkout'),
                   owner.label('is_payer'), effective_status_expression().label('status'), _external_status().label('external_payment_status'))
            .outerjoin(External, and_(External.school_id == charge.school_id, External.charge_id == charge.id))
            .outerjoin(Invoice, and_(Invoice.id == External.invoice_request_id, Invoice.school_id == charge.school_id, Invoice.charge_id == charge.id))
            .options(load_only(charge.id,charge.billing_type,charge.collection_mode,charge.remote_payment_id,charge.amount,
                               charge.due_on,charge.description,charge.invoice_url,charge.bank_slip_url,charge.pix_expires_at,charge.pix_copy_paste),
                     load_only(External.id,External.raw_body,External.receipt,External.payment_instrument))
            .where(*scope))


def charge_page(db,user,student,page,page_size):
    scope, owner = _family_scope(db,user,student)
    charge = m.BankCharge
    net_overdue = and_(effective_status_expression() == 'overdue', or_(External.id.is_(None), _external_status() == 'open'))
    total, overdue = db.execute(select(func.count(charge.id), func.count(charge.id).filter(net_overdue))
                                .outerjoin(External,and_(External.charge_id == charge.id, External.school_id == charge.school_id)).where(*scope)).one()
    rows=db.execute(_rows(user,scope,owner).order_by(charge.due_on.desc(),charge.id.desc()).offset((page-1)*page_size).limit(page_size))
    result=[]
    for row in rows:
        documents=_documents(row)
        result.append({'id':row.BankCharge.id, 'description':row.BankCharge.description, 'amount':format(row.BankCharge.amount,'.2f'),
                       'due_on':row.BankCharge.due_on, 'status':row.status, 'billing_type':documents['billing_type'],
                       'collection_mode':row.BankCharge.collection_mode, 'has_card_checkout':row.has_card_checkout,
                       'payment_source':documents['source'], 'external_payment_status':row.external_payment_status,
                       'has_payment_documents':bool(PAYMENT_FIELDS.intersection(documents))})
    return {'items':result,'total':total,'overdue_count':overdue,'page':page,'page_size':page_size,
            'note':'A situação da escola e a confirmação recebida do banco são apresentadas separadamente.'}


def charge_documents(db,user,student,charge_id):
    scope, owner = _family_scope(db,user,student)
    row = db.execute(_rows(user,[*scope, owner, m.BankCharge.id == charge_id],owner)).one_or_none()
    if not row:
        fail(404,'Cobrança indisponível para este pagador.')
    return _documents(row)
