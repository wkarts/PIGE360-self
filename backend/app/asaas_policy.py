"""Política comercial da escola e cotação nominal sem transmissão de dados financeiros."""
from datetime import date
from decimal import Decimal
from typing import Annotated, Literal

from sqlalchemy import select
from fastapi import Request
from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, model_validator

from . import models as m
from .asaas_native import router, asaas_read
from .common import audit
from .integration_core import connection
from .security import DB, Actor, Scope, check_version, fail, lock_school, require, scoped


def decimal_input(value):
    return value.replace(',', '.') if isinstance(value, str) else value


Money = Annotated[Decimal, BeforeValidator(decimal_input), Field(ge=0, max_digits=12, decimal_places=2)]
Rate = Annotated[Decimal, BeforeValidator(decimal_input), Field(ge=0, le=99, decimal_places=2)]


class Policy(BaseModel):
    model_config = ConfigDict(extra='forbid')
    pix_enabled: bool = True
    boleto_enabled: bool = True
    card_enabled: bool = False
    card_recurring_enabled: bool = False
    interest_percent: Rate = Decimal('0')
    fine_percent: Rate = Decimal('0')
    discount_type: Literal['FIXED', 'PERCENTAGE'] = 'PERCENTAGE'
    discount_value: Money = Decimal('0')
    discount_days: int = Field(default=0, ge=0, le=365)
    single_minimum_after_discount: Money = Decimal('0.00')
    max_installments: int = Field(default=1, ge=1, le=21)
    card_free_installments: int = Field(default=0, ge=0, le=21)
    card_min_installment: Money = Field(default=Decimal('5.00'), ge=5)
    card_fee_mode: Literal['absorb', 'customer'] = 'absorb'
    card_fee_percent_1: Rate = Decimal('2.99')
    card_fee_percent_2_6: Rate = Decimal('3.49')
    card_fee_percent_7_12: Rate = Decimal('3.99')
    card_fee_percent_13_21: Rate = Decimal('4.29')
    card_fee_fixed: Money = Field(default=Decimal('0.49'), le=100000)
    card_fee_fixed_mode: Literal['charge', 'installment'] = 'charge'
    card_anticipation_mode: Literal['none', 'manual', 'automatic'] = 'none'
    card_anticipation_manual_rate_1: Rate = Decimal('1.25')
    card_anticipation_manual_rate_installments: Rate = Decimal('1.70')
    card_anticipation_automatic_rate_1: Rate = Decimal('1.15')
    card_anticipation_automatic_rate_installments: Rate = Decimal('1.60')
    card_anticipation_first_days: int = Field(default=30, ge=0, le=365)
    sync_lifecycle: bool = True
    sync_manual_settlement: bool = True
    cash_settlement_method: Literal['receive_in_cash', 'cancel'] = 'receive_in_cash'

    @model_validator(mode='after')
    def valid_rates(self):
        if self.discount_type == 'PERCENTAGE' and self.discount_value > 100:
            raise ValueError('O desconto percentual deve estar entre zero e 100%.')
        if self.card_free_installments > self.max_installments:
            raise ValueError('O limite sem repasse excede o máximo de parcelas.')
        if self.card_anticipation_mode != 'none':
            for count in {1, self.max_installments}:
                rate, _factor = anticipation(self, count)
                if rate * (self.card_anticipation_first_days + 30 * (count - 1)) >= 300000:
                    raise ValueError('A antecipação consumiria todo o valor de uma parcela.')
        return self


class SettingsInput(BaseModel):
    model_config = ConfigDict(extra='forbid')
    version: int = Field(ge=1)
    settings: Policy


class QuoteInput(BaseModel):
    model_config = ConfigDict(extra='forbid')
    amount: Money = Field(gt=0)
    installments: int = Field(default=1, ge=1, le=21)
    brand: str | None = Field(default=None, max_length=40)
    recurring: bool = False


def policy_for(conn):
    return Policy.model_validate(((conn.config or {}).get('payment_policy') or {}) if conn else {})


def terms_payload(policy):
    terms = {}
    if policy.interest_percent:
        terms['interest'] = {'value': float(policy.interest_percent)}
    if policy.fine_percent:
        terms['fine'] = {'value': float(policy.fine_percent), 'type': 'PERCENTAGE'}
    if policy.discount_value:
        terms['discount'] = {'type': policy.discount_type, 'value': float(policy.discount_value),
                             'dueDateLimitDays': policy.discount_days}
    return terms


def cents(value):
    return int(Decimal(str(value)) * 100)


def anticipation(policy, count):
    mode = policy.card_anticipation_mode
    if mode == 'none':
        return 0, 0
    band = '1' if count == 1 else 'installments'
    rate = cents(getattr(policy, f'card_anticipation_{mode}_rate_{band}'))
    return rate, rate * (2 * policy.card_anticipation_first_days + 30 * (count - 1))


def check_discounted_minimum(policy, gross, count, minimum):
    if policy.discount_type == 'FIXED':
        valid = gross >= (minimum + cents(policy.discount_value)) * count
    else:
        valid = gross * (10000 - cents(policy.discount_value)) >= minimum * count * 10000
    if not valid:
        fail(422, f'O valor por parcela após o desconto deve ser de pelo menos R$ {minimum // 100},{minimum % 100:02d}.')


def check_single_charge(policy, amount):
    gross = cents(amount)
    if gross < 500:
        fail(422, 'O valor nominal de uma cobrança Asaas deve ser de pelo menos R$ 5,00.')
    if policy.single_minimum_after_discount:
        check_discounted_minimum(policy, gross, 1, cents(policy.single_minimum_after_discount))


def single_terms_snapshot(policy):
    return {'asaas_terms': terms_payload(policy),
            'asaas_single_minimum_after_discount': str(policy.single_minimum_after_discount)}


def card_quote(policy, amount, installments, brand=None, *, recurring=False):
    enabled = policy.card_recurring_enabled if recurring else policy.card_enabled
    if not enabled:
        fail(409, 'O cartão está desabilitado na configuração Asaas da escola.')
    if not 1 <= installments <= policy.max_installments:
        fail(422, 'Número de parcelas fora do limite configurado.')
    if installments > 12 and brand and brand.strip().upper().replace(' ', '') not in {'VISA', 'MASTERCARD'}:
        fail(422, 'Acima de 12 parcelas, selecione Visa ou Mastercard.')
    principal = cents(amount)
    if principal <= 0:
        fail(422, 'Informe um saldo positivo.')
    band = '1' if installments == 1 else '2_6' if installments <= 6 else '7_12' if installments <= 12 else '13_21'
    rate = cents(getattr(policy, f'card_fee_percent_{band}'))
    fixed = cents(policy.card_fee_fixed) * (installments if policy.card_fee_fixed_mode == 'installment' else 1)
    monthly, factor = anticipation(policy, installments)
    mode = policy.card_fee_mode if installments > policy.card_free_installments else 'absorb'
    gross = principal
    if mode == 'customer':
        retained = 600000 - factor
        numerator = (principal * 600000 + fixed * retained) * 10000
        denominator = retained * (10000 - rate)
        gross = (numerator + denominator - 1) // denominator
    fee = (gross * rate + 5000) // 10000 + fixed
    advance = (max(0, gross - fee) * factor + 300000) // 600000
    minimum = 500 if installments == 1 else cents(policy.card_min_installment)
    check_discounted_minimum(policy, gross, installments, minimum)
    result = {'version': 1, 'principal_cents': principal, 'charged_cents': gross, 'surcharge_cents': gross - principal,
              'installment_count': installments, 'rate_bps': rate, 'fixed_total_cents': fixed,
              'estimated_fee_cents': fee + advance, 'fee_mode': mode, 'minimum_cents': minimum}
    if policy.card_anticipation_mode != 'none':
        result['anticipation'] = {'mode': policy.card_anticipation_mode, 'monthly_rate_bps': monthly,
                                  'first_days': policy.card_anticipation_first_days, 'estimated_fee_cents': advance}
    return result


def enabled_for(policy, method):
    return {'PIX': policy.pix_enabled, 'BOLETO': policy.boleto_enabled, 'CREDIT_CARD': policy.card_enabled}.get(method, False)


@router.get('/settings')
def get_settings(db: DB, user: Actor, school: Scope):
    require(user, 'integrations.manage')
    conn = connection(db, school.id, 'asaas', False)
    return {'connection_id': conn.id if conn else None, 'version': conn.version if conn else None,
            'settings': policy_for(conn).model_dump(mode='json')}


@router.put('/settings')
def save_settings(data: SettingsInput, db: DB, user: Actor, school: Scope, request: Request):
    require(user, 'integrations.manage')
    lock_school(db, school.id)
    conn = connection(db, school.id, 'asaas', False)
    if not conn:
        fail(409, 'Cadastre a conexão Asaas desta escola antes de salvar a política.')
    check_version(conn, data.version)
    settings = data.settings.model_dump(mode='json')
    conn.config = {**(conn.config or {}), 'payment_policy': settings}
    conn.version += 1
    audit(db, request, user, 'asaas.payment_policy.updated', conn, school.id, {'version': conn.version})
    return {'connection_id': conn.id, 'version': conn.version, 'settings': settings}


@router.post('/quote')
def simulate_charge(data: QuoteInput, db: DB, user: Actor, school: Scope):
    require(user, 'banking.read')
    return card_quote(policy_for(connection(db, school.id, 'asaas', False)), data.amount, data.installments, data.brand, recurring=data.recurring)


class LifecycleInput(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    version: int = Field(ge=1)
    client_key: str = Field(min_length=12, max_length=100, pattern=r'^[A-Za-z0-9_.:-]+$')
    reason: str = Field(min_length=5, max_length=500)


class Adjustment(LifecycleInput):
    amount: Money = Field(gt=0)
    due_on: date
    description: str = Field(min_length=3, max_length=500)


class CashReceipt(LifecycleInput):
    amount: Money = Field(gt=0)
    paid_on: date
    reference: str = Field(min_length=3, max_length=200)


def active_cancel(db, charge):
    key = 'bank-cancel:' + charge.id
    return db.scalar(select(m.IntegrationJob.id).where(
        m.IntegrationJob.school_id == charge.school_id, m.IntegrationJob.kind == 'bank_cancel',
        ((m.IntegrationJob.dedupe_key == key) | m.IntegrationJob.dedupe_key.startswith(key + ':', autoescape=True)),
        m.IntegrationJob.status.in_(['pending', 'retry', 'processing', 'uncertain'])).limit(1))


def check_identity(payment, charge, *, expected_amount):
    try:
        valid = (payment['id'] == charge.remote_payment_id and payment['customer'] == charge.remote_customer_id
                 and payment['externalReference'] == charge.external_reference and
                 payment['billingType'] in (charge.billing_type, 'RECEIVED_IN_CASH') and
                 Decimal(str(payment['value'])) == expected_amount)
    except (KeyError, TypeError, ArithmeticError, ValueError):
        valid = False
    return valid


def financial_action(db, school, user, request, charge_id, data, kind):
    from .asaas_native import asaas_connection, asaas_request, run_asaas_operation, REMOTE_ID
    from .admission_reservations import payment_changed
    from .banking import charge_output
    from .portal_access import today
    from .integration_core import IntegrationFailure
    require(user, 'banking.write')
    charge = scoped(db, m.BankCharge, charge_id, school.id)
    if charge.collection_mode != 'provider' or not charge.connection_id:
        fail(409, 'Esta operação exige uma cobrança bancária vinculada ao Asaas.')
    conn = asaas_connection(db, school, charge.connection_id)
    if not REMOTE_ID.fullmatch(charge.remote_payment_id or '') or not charge.remote_customer_id:
        fail(409, 'Concilie a identificação da cobrança e do cliente no Asaas antes de prosseguir.')
    path = '/payments/' + charge.remote_payment_id
    policy = policy_for(conn)
    balance_before = charge.amount

    def preflight():
        db.refresh(charge)
        check_version(charge, data.version)
        if active_cancel(db, charge):
            fail(409, 'Existe um cancelamento em andamento ou inconclusivo para esta cobrança.')
        if kind == 'reactivate':
            if charge.status != 'cancelled' or charge.manual_paid_amount or not policy.sync_lifecycle:
                fail(409, 'A reativação exige um cancelamento bancário sem recebimentos e sincronização de ciclo habilitada.')
        elif charge.status not in ('pending', 'overdue'):
            fail(409, 'Somente cobranças pendentes ou vencidas permitem esta operação.')
        if kind == 'adjust':
            if charge.manual_paid_amount:
                fail(409, 'Há recebimentos externos registrados. Concilie a cobrança antes de alterar seus dados.')
            # O desconto da via já emitida permanece inalterado.
            frozen = (charge.payer_snapshot or {}).get('asaas_terms', {}).get('discount') or {}
            existing_terms = Policy(discount_type=frozen.get('type', 'PERCENTAGE'), discount_value=frozen.get('value', 0),
                                    single_minimum_after_discount=(charge.payer_snapshot or {}).get('asaas_single_minimum_after_discount', 0))
            check_single_charge(existing_terms, data.amount)
        if kind == 'cash_receipt':
            if data.paid_on > today():
                fail(422, 'A data do recebimento não pode estar no futuro.')
            if data.amount + (charge.manual_paid_amount or Decimal('0')) > charge.amount:
                fail(422, 'O recebimento ultrapassa o saldo pendente.')

        # Lê a referência exata inclusive na reativação; duplicidade legada exige conciliação.
        result = asaas_read(conn, '/payments', params={'externalReference': charge.external_reference, 'limit': 100})
        if not isinstance(result.get('data'), list) or result.get('hasMore'):
            fail(409, 'A consulta não identificou inequivocamente a cobrança no Asaas.')
        for item in result['data']:
            if not isinstance(item, dict) or item.get('externalReference') != charge.external_reference:
                fail(409, 'A consulta retornou referência externa divergente.')
            if not item.get('deleted') and item.get('id') != charge.remote_payment_id:
                fail(409, 'Existe outra cobrança ativa para a mesma referência externa.')
        current = asaas_read(conn, path)
        if not check_identity(current, charge, expected_amount=charge.amount):
            fail(409, 'A identidade, o pagador ou o principal da cobrança divergem no Asaas.')
        if kind == 'reactivate':
            if current.get('deleted') is not True or current.get('status') not in ('PENDING', 'OVERDUE'):
                fail(409, 'A via consultada não é uma cobrança pendente removida.')
        elif current.get('deleted') or current.get('status') not in ('PENDING', 'OVERDUE'):
            fail(409, 'O Asaas não apresenta uma cobrança pendente ou vencida para esta operação.')

    def execute():
        from .banking import apply_remote
        lock_school(db, school.id)
        db.refresh(charge)
        prior = charge.status
        if charge.version != data.version or charge.amount != balance_before:
            raise IntegrationFailure('LOCAL_CHARGE_CHANGED_BEFORE_WRITE')
        expected_amount = charge.amount
        current_amount = charge.manual_paid_amount or Decimal('0')
        event = {'reason': data.reason, 'operator_id': user.id}
        if kind == 'adjust':
            result = asaas_request(conn, 'PUT', path, payload={'value': float(data.amount),
                'dueDate': data.due_on.isoformat(), 'description': data.description})
            expected_amount = data.amount
            if (not check_identity(result, charge, expected_amount=expected_amount) or result.get('deleted')
                    or result.get('status') not in ('PENDING', 'OVERDUE') or result.get('dueDate') != data.due_on.isoformat()
                    or result.get('description') != data.description):
                raise IntegrationFailure('BANK_ADJUSTMENT_UNCONFIRMED', uncertain=True)
            event.update(previous_amount=str(charge.amount), previous_due_on=charge.due_on.isoformat(),
                         amount=str(data.amount), due_on=data.due_on.isoformat())
            charge.amount, charge.due_on, charge.description = data.amount, data.due_on, data.description
            apply_remote(db, charge, result, 'asaas_adjust')
            # QR anterior pode referir-se ao valor anterior. A fila recupera a via atual.
            if charge.billing_type == 'PIX':
                from .banking import queue_charge_sync
                charge.pix_copy_paste = charge.pix_image = charge.pix_expires_at = ''
                queue_charge_sync(db, charge)
        elif kind == 'reactivate':
            result = asaas_request(conn, 'POST', path + '/restore')
            if (not check_identity(result, charge, expected_amount=expected_amount) or result.get('deleted') is not False
                    or result.get('status') not in ('PENDING', 'OVERDUE')):
                raise IntegrationFailure('BANK_RESTORATION_UNCONFIRMED', uncertain=True)
            apply_remote(db, charge, result, 'asaas_restore')
            if charge.billing_type == 'PIX':
                from .banking import queue_charge_sync
                queue_charge_sync(db, charge)
        else:
            total = current_amount + data.amount
            completed = total == charge.amount
            result = {'id': charge.remote_payment_id}
            action = 'partial_local' if not completed else 'settled_local'
            if completed and policy.sync_manual_settlement:
                if policy.cash_settlement_method == 'receive_in_cash':
                    result = asaas_request(conn, 'POST', path + '/receiveInCash', payload={
                        'paymentDate': data.paid_on.isoformat(), 'value': float(total), 'notifyCustomer': False})
                    if not check_identity(result, charge, expected_amount=expected_amount) or result.get('status') != 'RECEIVED_IN_CASH':
                        raise IntegrationFailure('BANK_CASH_RECEIPT_UNCONFIRMED', uncertain=True)
                    action = 'received_in_cash'
                else:
                    result = asaas_request(conn, 'DELETE', path)
                    if result.get('id') != charge.remote_payment_id or result.get('deleted') is not True:
                        raise IntegrationFailure('BANK_CASH_CANCELLATION_UNCONFIRMED', uncertain=True)
                    action = 'deleted_after_cash'
            charge.manual_paid_amount, charge.manual_paid_on = total, data.paid_on
            charge.manual_received_by, charge.manual_reference = user.id, data.reference
            charge.manual_payment_method = 'cash'
            charge.version += 1
            if completed:
                charge.status = 'received_external'
                charge.pix_copy_paste = charge.pix_image = charge.pix_expires_at = ''
                charge.invoice_url = charge.bank_slip_url = ''
            event.update(amount=str(data.amount), total=str(total), paid_on=data.paid_on.isoformat(),
                         reference=data.reference, synchronization=action)
            payment_changed(db, charge)
        db.add(m.BankEvent(school_id=school.id, charge_id=charge.id, source='asaas_' + kind,
                           previous_status=prior, status=charge.status, details=event))
        audit(db, request, user, 'asaas.charge.' + kind, charge, school.id, event)
        return result

    row = run_asaas_operation(db, school, user, conn, client_key=data.client_key, kind=kind, charge_id=charge.id,
                              fingerprint_data=data.model_dump(mode='json'), preflight=preflight, execute=execute)
    return {'operation_id': row.id, 'status': row.status, 'remote_id': row.remote_id,
            'charge': charge_output(charge)}


@router.post('/charges/{charge_id}/adjust')
def adjust_charge(charge_id: str, data: Adjustment, db: DB, user: Actor, school: Scope, request: Request):
    return financial_action(db, school, user, request, charge_id, data, 'adjust')


@router.post('/charges/{charge_id}/cash-receipt')
def record_cash_receipt(charge_id: str, data: CashReceipt, db: DB, user: Actor, school: Scope, request: Request):
    return financial_action(db, school, user, request, charge_id, data, 'cash_receipt')


@router.post('/charges/{charge_id}/reactivate')
def reactivate_charge(charge_id: str, data: LifecycleInput, db: DB, user: Actor, school: Scope, request: Request):
    return financial_action(db, school, user, request, charge_id, data, 'reactivate')
