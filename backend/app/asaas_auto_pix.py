"""Pix Automático em modo MANUAL. Consentimento do responsável e pagamento são atos distintos."""
import base64
import hashlib
import hmac
import json
import re
from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation
from typing import Literal
from uuid import uuid4
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Query, Request, Response
from pydantic import Field
from sqlalchemy import or_, select
from . import models as m
from .asaas_auto_pix_models import PixAuthorization, PixCycle
from .asaas_native import router, asaas_connection, asaas_request, run_asaas_operation, lock_issuance_channel, release_issuance
from .asaas_pix_calendar import business_days, cycle_number
from .common import audit
from .db import now
from .family_portal import own_finance_student
from .integration_core import IntegrationFailure, enqueue, seal, unseal
from .schemas import Input
from .security import Actor, DB, Scope, check_version, fail, lock_school, require, scoped, utc

family_router = APIRouter(prefix='/api/v1/family/students/{student_id}/charges/{charge_id}/pix-automatic', tags=['Pix Automático da família'])
TERM_VERSION = 'pige360-pix-2026-11-v1'
TERMS = ('Autorizo pagar esta cobrança pelo valor exibido e debitar novas cobranças Pix da mesma matrícula, '
         'em reais, na frequência escolhida. O Pix atual será substituído por um QR válido por dez minutos. '
         'Confirmarei a autorização no aplicativo do meu banco. Posso solicitar cancelamento. Débitos já '
         'enviados dependem da confirmação bancária.')
ZONE = ZoneInfo('America/Sao_Paulo')
TERMINAL = {'CANCELLED', 'EXPIRED', 'REFUSED'}
AUTH_STATES = TERMINAL | {'CREATED', 'ACTIVE'}
AUTH = '/pix/automatic/authorizations'
INST = '/pix/automatic/paymentInstructions'
PREFIX = 'PIX_AUTOMATIC_RECURRING_'
PIX_WEBHOOK_EVENTS = [PREFIX+'AUTHORIZATION_'+event for event in ('CREATED','ACTIVATED','CANCELLED','EXPIRED','REFUSED')] + [
    PREFIX+'PAYMENT_INSTRUCTION_'+event for event in ('CREATED','SCHEDULED','REFUSED','CANCELLED')] + [PREFIX+'ELIGIBILITY_UPDATED']
Frequency = Literal['WEEKLY','MONTHLY','QUARTERLY','SEMIANNUALLY','ANNUALLY']


class Consent(Input):
    quote: str = Field(pattern=r'^[a-f0-9]{64}$')
    terms_version: str = Field(max_length=40)
    accepted: Literal[True]
    frequency: Frequency


class Version(Input):
    version: int = Field(ge=1)


class Schedule(Version):
    charge_id: str = Field(min_length=1,max_length=36)


class PixSettings(Version):
    enabled: bool
    additional_holidays: list[date] = Field(default_factory=list, max_length=120)


def today():
    return now().astimezone(ZONE).date()


def identity(conn):
    key = unseal(conn.encrypted_secrets).get('api_key') or ''
    return hashlib.sha256(f'{conn.school_id}|{conn.id}|{conn.environment}|{key}'.encode()).hexdigest()


def token(value, prefix=''):
    if not isinstance(value, str) or not re.fullmatch(re.escape(prefix)+r'[A-Za-z0-9_-]{1,128}',value):
        raise IntegrationFailure('PIX_AUTO_INVALID_IDENTIFIER', uncertain=True)
    return value


def remote(method,conn,path,**kw):
    return asaas_request(conn,method,path,**kw)


def money(value):
    try:
        number = Decimal(str(value))
        if number.is_finite():
            return number
    except (InvalidOperation, ValueError, TypeError):
        pass
    raise IntegrationFailure('PIX_AUTO_INVALID_VALUE', uncertain=True)


def settings_view(conn):
    cfg = conn.config or {}
    return {'enabled':bool(cfg.get('pix_auto_enabled')), 'additional_holidays':cfg.get('pix_auto_holidays',[]),
            'version':conn.version}


@router.get('/pix-automatic/settings')
def get_settings(db: DB, user: Actor, school: Scope):
    require(user, 'integrations.manage')
    return settings_view(asaas_connection(db,school))


@router.put('/pix-automatic/settings')
def set_settings(data: PixSettings, db: DB, user: Actor, school: Scope, request: Request):
    require(user,'integrations.manage')
    lock_school(db,school.id)
    conn = asaas_connection(db,school)
    check_version(conn,data.version)
    if data.enabled and not unseal(conn.encrypted_secrets).get('webhook_token'):
        fail(409,'Configure o token do webhook antes de habilitar o Pix Automático.')
    conn.config = {**(conn.config or {}),'pix_auto_enabled':data.enabled,
                   'pix_auto_holidays':sorted({x.isoformat() for x in data.additional_holidays})}
    conn.version += 1
    audit(db,request,user,'pix_auto.settings',conn,school.id,{'enabled':data.enabled})
    return settings_view(conn)


def available(conn):
    return bool(conn and conn.enabled and (conn.config or {}).get('pix_auto_enabled')
                and (conn.config or {}).get('pix_auto_eligibility') != 'INELIGIBLE')


def local_cycle(db,charge_id):
    return db.scalar(select(PixCycle).where(PixCycle.charge_id==charge_id))


def holds_charge(db, charge_id):
    row = local_cycle(db,charge_id)
    return bool(row and row.status not in {'SKIPPED', 'RELEASED'})


def cycles(db,auth):
    return list(db.scalars(select(PixCycle).where(PixCycle.authorization_id==auth.id).order_by(PixCycle.cycle.desc())))


def describe(db,auth,*,qr=False):
    charge = db.get(m.BankCharge,auth.charge_id)
    result = {'id':auth.id,'charge_id':auth.charge_id,'frequency':auth.frequency,'status':auth.status,
              'start_date':auth.start_date,'amount':format(auth.amount,'.2f'),'version':auth.version,
              'payer_name':(charge.payer_snapshot or {}).get('name',''), 'description':charge.description,
              'cycles':[{'id':c.id,'charge_id':c.charge_id,'due_on':c.due_on,'status':c.status,'amount':format(c.amount,'.2f'),
                         'instruction_status':c.instruction_status} for c in cycles(db,auth)]}
    if qr:
        valid = auth.status=='CREATED' and auth.encrypted_qr and auth.expires_at and utc(auth.expires_at)>now()
        result.update(unseal(auth.encrypted_qr) if valid else {'payload':'','encoded_image':''})
        result['expires_at'] = utc(auth.expires_at).isoformat() if auth.expires_at else ''
    return result


def quote_for(charge,payer,conn):
    basis = [charge.id,charge.enrollment_id,charge.version,charge.status,str(charge.amount),
             str(charge.due_on),charge.remote_customer_id,charge.remote_payment_id,payer.id,identity(conn),TERM_VERSION]
    return hashlib.sha256(json.dumps(basis,separators=(',',':')).encode()).hexdigest()


def family_charge(db,user,student_id,charge_id):
    student = own_finance_student(db,user,student_id)
    enrollment = m.Enrollment
    charge = db.scalar(select(m.BankCharge).join(enrollment,m.BankCharge.enrollment_id==enrollment.id).where(
        m.BankCharge.id==charge_id,m.BankCharge.school_id==student.school_id,
        enrollment.school_id==student.school_id,enrollment.student_id==student.id))
    payer = db.get(m.Person,user.person_id)
    if (not charge or not payer or payer.school_id!=student.school_id or not payer.cpf or
            payer.cpf != (charge.payer_snapshot or {}).get('cpf') or
            (charge.payer_snapshot.get('person_id') and charge.payer_snapshot['person_id']!=payer.id)):
        fail(404,'Cobrança indisponível para este pagador.')
    conn = db.get(m.IntegrationConnection,charge.connection_id) if charge.connection_id else None
    return charge,payer,conn


def auth_for(db,charge,payer,conn):
    if not conn: return None
    return db.scalar(select(PixAuthorization).where(PixAuthorization.school_id==charge.school_id,
        PixAuthorization.connection_id==conn.id,PixAuthorization.enrollment_id==charge.enrollment_id,
        PixAuthorization.payer_id==payer.id).order_by(PixAuthorization.created_at.desc(),PixAuthorization.id.desc()).limit(1))


def payable(charge,conn,db):
    enrollment=db.get(m.Enrollment,charge.enrollment_id) if charge.enrollment_id else None
    return bool(enrollment and enrollment.status=='active' and available(conn) and charge.collection_mode=='provider' and charge.billing_type=='PIX'
                and charge.status=='pending' and charge.remote_customer_id and charge.remote_payment_id)


def family_view(db,charge,payer,conn):
    auth = auth_for(db,charge,payer,conn)
    return {'can_enroll':payable(charge,conn,db) and not local_cycle(db,charge.id)
                         and (auth is None or auth.status in TERMINAL),
            'quote':quote_for(charge,payer,conn) if conn else '', 'amount':format(charge.amount,'.2f'),
            'terms_version':TERM_VERSION,'terms':TERMS,
            'authorization':describe(db,auth,qr=auth.charge_id==charge.id) if auth else None}


@family_router.get('')
def family_status(student_id:str,charge_id:str,db:DB,user:Actor,response:Response):
    response.headers['Cache-Control']='no-store'
    return family_view(db,*family_charge(db,user,student_id,charge_id))


def checked_payment(charge,payment,customer):
    if (payment.get('externalReference')!=charge.external_reference or payment.get('customer')!=customer or
            payment.get('billingType')!='PIX' or payment.get('installment') or payment.get('subscription') or
            money(payment.get('value'))!=charge.amount):
        raise IntegrationFailure('PIX_AUTO_PAYMENT_MISMATCH',uncertain=True)


def remove_previous(db,conn,charge,cycle,customer):
    if not cycle.previous_payment_id: return
    path='/payments/'+token(cycle.previous_payment_id,'pay_')
    before=remote('GET',conn,path)
    if before.get('id')!=cycle.previous_payment_id: raise IntegrationFailure('PIX_AUTO_PAYMENT_MISMATCH',uncertain=True)
    checked_payment(charge,before,customer)
    if not before.get('deleted'):
        if before.get('status')!='PENDING': raise IntegrationFailure('PIX_AUTO_PREVIOUS_NOT_PENDING',uncertain=True)
        remote('DELETE',conn,path)
        proof=remote('GET',conn,path)
        if proof.get('id')!=cycle.previous_payment_id or proof.get('deleted') is not True:
            raise IntegrationFailure('PIX_AUTO_PREVIOUS_DELETE_UNCONFIRMED',uncertain=True)
        checked_payment(charge,proof,customer)
    charge.remote_payment_id=None
    charge.invoice_url=charge.bank_slip_url=charge.pix_copy_paste=charge.pix_image=charge.pix_expires_at=''
    charge.status='awaiting_review'
    charge.version+=1
    db.commit()


def accept(auth,data):
    ident=token(data.get('id'))
    if (auth.remote_id and auth.remote_id!=ident or data.get('customerId')!=auth.customer_id or
        data.get('contractId')!=auth.contract_id or data.get('frequency')!=auth.frequency or
        data.get('startDate')!=auth.start_date.isoformat() or data.get('paymentCreationMode','MANUAL')!='MANUAL' or data.get('subscriptionId')):
        raise IntegrationFailure('PIX_AUTO_AUTH_MISMATCH',uncertain=True)
    status=data.get('status')
    if (status not in AUTH_STATES or auth.status in TERMINAL and status!=auth.status or
            auth.status=='ACTIVE' and status=='CREATED'):
        raise IntegrationFailure('PIX_AUTO_AUTH_STATE_DIVERGENCE',uncertain=True)
    immediate=data.get('immediateQrCode') or {}
    correlation=token(immediate.get('conciliationIdentifier') or auth.conciliation)
    if auth.conciliation and auth.conciliation!=correlation:
        raise IntegrationFailure('PIX_AUTO_QR_MISMATCH',uncertain=True)
    auth.remote_id,auth.conciliation=ident,correlation
    if immediate.get('expirationDate'):
        try:
            stamp=datetime.fromisoformat(immediate['expirationDate'].replace('Z','+00:00'))
            auth.expires_at=stamp if stamp.tzinfo else stamp.replace(tzinfo=ZONE)
        except (AttributeError,TypeError,ValueError):
            raise IntegrationFailure('PIX_AUTO_QR_EXPIRY',uncertain=True)
    if auth.status=='CANCELLING' and status not in TERMINAL: status='CANCELLING'
    auth.status=status
    if status=='CREATED' and auth.expires_at and utc(auth.expires_at)>now():
        payload,image=data.get('payload'),data.get('encodedImage') or ''
        if payload:
            if not isinstance(payload,str) or not 20<=len(payload)<=8192 or any(ord(c)<32 for c in payload):
                raise IntegrationFailure('PIX_AUTO_QR_INVALID',uncertain=True)
            if not isinstance(image,str) or len(image)>262144: raise IntegrationFailure('PIX_AUTO_QR_INVALID',uncertain=True)
            try: base64.b64decode(image,validate=True)
            except ValueError:raise IntegrationFailure('PIX_AUTO_QR_INVALID',uncertain=True)
            auth.encrypted_qr=seal({'payload':payload,'encoded_image':image})
    else: auth.encrypted_qr=''
    auth.verified_at=now()
    auth.version+=1


def list_data(page):
    if not isinstance(page,dict) or not isinstance(page.get('data'),list) or not isinstance(page.get('hasMore'),bool):
        raise IntegrationFailure('PIX_AUTO_INVALID_PAGE',uncertain=True)
    return page['data']


def refresh_auth(conn,auth):
    if auth.credential_scope != identity(conn):
        raise IntegrationFailure('PIX_AUTO_ACCOUNT_CHANGED',uncertain=True)
    if auth.remote_id:
        accept(auth,remote('GET',conn,AUTH+'/'+token(auth.remote_id)))
    else:
        page=remote('GET',conn,AUTH,params={'customerId':auth.customer_id,'offset':auth.scan_offset,'limit':100})
        matches=[r for r in list_data(page) if r.get('contractId')==auth.contract_id]
        if len(matches)>1 or page.get('offset',auth.scan_offset)!=auth.scan_offset:
            raise IntegrationFailure('PIX_AUTO_AUTH_REQUIRES_REVIEW',uncertain=True)
        if not matches:
            rows=list_data(page)
            auth.scan_offset=auth.scan_offset+len(rows) if page['hasMore'] else 0
            return
        accept(auth,remote('GET',conn,AUTH+'/'+token(matches[0].get('id'))))
        auth.scan_offset=0


def prepared_error(error):
    fail(409 if isinstance(error,IntegrationFailure) and error.uncertain else 502,
         'O Asaas ainda não confirmou a operação. Atualize a situação antes de tentar outra ação.')


@family_router.post('/enroll')
def enroll(student_id:str,charge_id:str,data:Consent,db:DB,user:Actor,response:Response):
    response.headers['Cache-Control']='no-store'
    initial,_,_=family_charge(db,user,student_id,charge_id)
    lock_school(db,initial.school_id)
    db.refresh(initial)
    charge,payer,conn=family_charge(db,user,student_id,charge_id)
    existing=auth_for(db,charge,payer,conn)
    if (existing and existing.charge_id==charge.id and existing.consent_user_id==user.id and
            existing.quote==data.quote and existing.frequency==data.frequency and data.terms_version==TERM_VERSION):
        return family_view(db,charge,payer,conn)
    if (data.terms_version!=TERM_VERSION or not payable(charge,conn,db) or
            not hmac.compare_digest(quote_for(charge,payer,conn),data.quote) or local_cycle(db,charge.id)
            or existing and existing.status not in TERMINAL):
        fail(409,'Atualize a cobrança e confira o valor e a autorização antes de prosseguir.')
    school=db.get(m.School,charge.school_id)
    lock_issuance_channel(db,school.id,charge.id,'pix_auto')
    auth=PixAuthorization(school_id=school.id,connection_id=conn.id,credential_scope=identity(conn),charge_id=charge.id,
        enrollment_id=charge.enrollment_id,payer_id=payer.id,consent_user_id=user.id,terms_version=TERM_VERSION,
        quote=data.quote,customer_id=token(charge.remote_customer_id,'cus_'),contract_id='PG'+uuid4().hex,
        frequency=data.frequency,start_date=today(),amount=charge.amount,status='PREPARING')
    db.add(auth);db.flush()
    cycle=PixCycle(school_id=school.id,authorization_id=auth.id,charge_id=charge.id,cycle=0,due_on=charge.due_on,
                   amount=charge.amount,status='PREPARING',previous_payment_id=charge.remote_payment_id)
    db.add(cycle)
    def issue():
        remove_previous(db,conn,charge,cycle,auth.customer_id)
        try:
            result=remote('POST',conn,AUTH,payload={'customerId':auth.customer_id,'contractId':auth.contract_id,
                'startDate':auth.start_date.isoformat(),'frequency':auth.frequency,'description':'Mensalidades escolares',
                'paymentCreationMode':'MANUAL','retryPolicy':'NOT_ALLOWED',
                'immediateQrCode':{'expirationSeconds':600,'originalValue':float(auth.amount)}})
            accept(auth,result)
            cycle.status='WAITING'
            return result
        except IntegrationFailure as exc:
            raise IntegrationFailure(exc.code,uncertain=True) from exc
    run_asaas_operation(db,school,user,conn,client_key='pix-auth-'+auth.id,kind='pix_auto_authorize',
                       charge_id=charge.id,fingerprint_data={'approval':data.quote,'frequency':data.frequency},
                       execute=issue,issuance_channel='pix_auto')
    return family_view(db,charge,payer,conn)


def with_scope(db,auth):
    conn=db.get(m.IntegrationConnection,auth.connection_id)
    if not conn or not conn.enabled or conn.school_id!=auth.school_id or identity(conn)!=auth.credential_scope:
        fail(409,'A integração ou a conta da autorização mudou. Confira o vínculo antes de continuar.')
    return conn


def receipt(db,auth,cycle,charge,payment,transaction=None):
    from .banking import apply_remote
    ident=token(payment.get('id'),'pay_')
    conn=with_scope(db,auth)
    if (charge.school_id!=auth.school_id or charge.enrollment_id!=auth.enrollment_id or charge.connection_id!=conn.id
            or charge.amount!=cycle.amount or payment.get('billingType')!='PIX' or payment.get('customer')!=auth.customer_id
            or payment.get('installment') or payment.get('subscription') or money(payment.get('value'))!=charge.amount
            or (cycle.payment_id and cycle.payment_id!=ident)):
        raise IntegrationFailure('PIX_AUTO_PAYMENT_MISMATCH',uncertain=True)
    instruction_failure=''
    if cycle.cycle==0:
        if not auth.conciliation or payment.get('externalReference') not in (None,'',charge.external_reference):
            return False
        if not payment.get('pixTransaction'): return False
        tx=transaction or remote('GET',conn,'/pix/transactions/'+token(payment['pixTransaction']))
        if tx.get('conciliationIdentifier')!=auth.conciliation: return False
        if tx.get('payment')!=ident or tx.get('id')!=payment['pixTransaction'] or tx.get('type')!='CREDIT':
            raise IntegrationFailure('PIX_AUTO_TRANSACTION_MISMATCH',uncertain=True)
    else:
        checked_payment(charge,payment,auth.customer_id)
        page=remote('GET',conn,INST,params={'paymentId':ident,'limit':100})
        instructions=list_data(page)
        for instruction in instructions:
            if (instruction.get('paymentId')!=ident or (instruction.get('authorization') or {}).get('id')!=auth.remote_id):
                raise IntegrationFailure('PIX_AUTO_INSTRUCTION_MISMATCH',uncertain=True)
        if page['hasMore'] or payment.get('pixAutomaticAuthorizationId') not in (None,auth.remote_id):
            raise IntegrationFailure('PIX_AUTO_INSTRUCTION_MISMATCH',uncertain=True)
        if not instructions and payment.get('pixAutomaticAuthorizationId')!=auth.remote_id:
            raise IntegrationFailure('PIX_AUTO_INSTRUCTION_UNCONFIRMED',retryable=True)
        if instructions:
            states={i.get('status') for i in instructions}
            if not states <= {'AWAITING_REQUEST','SCHEDULED','DONE','REFUSED','CANCELLED'}:
                raise IntegrationFailure('PIX_AUTO_INSTRUCTION_UNKNOWN',uncertain=True)
            cycle.instruction_status=next(s for s in ('DONE','SCHEDULED','AWAITING_REQUEST','REFUSED','CANCELLED') if s in states)
            if states <= {'REFUSED','CANCELLED'}:
                instruction_failure='INSTRUCTION_'+cycle.instruction_status
    if charge.remote_payment_id and charge.remote_payment_id!=ident:
        raise IntegrationFailure('PIX_AUTO_PAYMENT_ALREADY_LINKED',uncertain=True)
    # A autorização inicial não informa externalReference. Somente após comprovar a transação
    # de crédito e o identificador do QR pode-se aplicar a referência escolar ao conciliador.
    apply_remote(db,charge,{**payment,'externalReference':charge.external_reference},'pix_auto')
    cycle.payment_id=ident
    cycle.status='RECEIVED' if charge.status in {'confirmed','received'} else 'WAITING'
    if instruction_failure and charge.status in {'pending','overdue'}:
        cycle.status=instruction_failure
    if charge.status in {'cancelled','refunded','disputed','partially_refunded','refund_requested'}:
        cycle.status=charge.status.upper()
    return True


def scan_initial(db,conn,auth,cycle,charge):
    terminal_ready = auth.status in TERMINAL and auth.expires_at and utc(auth.expires_at)+timedelta(minutes=5)<=now()
    if terminal_ready and not auth.terminal_scan_at:
        auth.terminal_scan_at=now()
        auth.scan_offset=0
    page=remote('GET',conn,'/payments',params={'customer':auth.customer_id,'billingType':'PIX',
        'dateCreated[ge]':(auth.start_date-timedelta(days=1)).isoformat(),'offset':auth.scan_offset,'limit':10})
    rows=list_data(page)
    if page.get('offset',auth.scan_offset)!=auth.scan_offset or (page['hasMore'] and not rows):
        raise IntegrationFailure('PIX_AUTO_PAGE_MISMATCH',uncertain=True)
    for p in rows:
        if not isinstance(p,dict):
            raise IntegrationFailure('PIX_AUTO_INVALID_PAGE',uncertain=True)
        if not p.get('pixTransaction') or p.get('deleted'):continue
        txn=remote('GET',conn,'/pix/transactions/'+token(p['pixTransaction']))
        if txn.get('conciliationIdentifier')!=auth.conciliation:continue
        full=remote('GET',conn,'/payments/'+token(p.get('id'),'pay_'))
        if full.get('id')!=p.get('id') or full.get('deleted') or not receipt(db,auth,cycle,charge,full,txn):
            raise IntegrationFailure('PIX_AUTO_RECEIPT_REQUIRES_REVIEW',uncertain=True)
        return
    auth.scan_offset=auth.scan_offset+len(rows) if page['hasMore'] else 0
    if terminal_ready and not auth.scan_offset and cycle.previous_payment_id:
        # O QR expirou e uma varredura inteira posterior não encontrou crédito. Devolva o
        # vínculo da via anterior à Secretaria, que poderá reativá-la pela ação bancária normal.
        old=remote('GET',conn,'/payments/'+token(cycle.previous_payment_id,'pay_'))
        if old.get('id')!=cycle.previous_payment_id:
            raise IntegrationFailure('PIX_AUTO_PREVIOUS_MISMATCH',uncertain=True)
        checked_payment(charge,old,auth.customer_id)
        if old.get('deleted') is True and old.get('status') in ('PENDING','OVERDUE'):
            from .banking import apply_remote
            if release_issuance(db,charge.school_id,charge.id,'pix_auto',auth.remote_id):
                apply_remote(db,charge,old,'pix_auto_fallback')
                cycle.status='RELEASED'



def reconcile(db,auth,*,payment_id='',cycle_id=''):
    conn=with_scope(db,auth)
    refresh_auth(conn,auth)
    if not auth.remote_id:return
    for cycle in cycles(db,auth):
        if cycle_id and cycle.id!=cycle_id: continue
        charge=db.get(m.BankCharge,cycle.charge_id)
        if cycle.status in {'SKIPPED','RELEASED'}:
            continue
        if payment_id and cycle.previous_payment_id==payment_id:
            previous=remote('GET',conn,'/payments/'+token(payment_id,'pay_'))
            if previous.get('id')!=payment_id:
                raise IntegrationFailure('PIX_AUTO_PREVIOUS_MISMATCH',uncertain=True)
            checked_payment(charge,previous,auth.customer_id)
            if not previous.get('deleted') and previous.get('status') in {'CONFIRMED','RECEIVED'}:
                from .banking import apply_remote
                if charge.remote_payment_id not in (None,payment_id):
                    raise IntegrationFailure('PIX_AUTO_PREVIOUS_ALSO_PAID',uncertain=True)
                apply_remote(db,charge,previous,'pix_auto_previous')
                cycle.status='PREVIOUS_RECEIVED'
            return
        if cycle.status=='PREVIOUS_RECEIVED':
            continue
        if not payment_id and not cycle_id and cycle.status in {'RECEIVED','REFUNDED','CANCELLED'}:
            continue
        if payment_id:
            if cycle.payment_id and cycle.payment_id!=payment_id: continue
            if cycle.cycle and not cycle.payment_id: continue
            payment=remote('GET',conn,'/payments/'+token(payment_id,'pay_'))
            if payment.get('id')!=payment_id: raise IntegrationFailure('PIX_AUTO_PAYMENT_MISMATCH',uncertain=True)
            if money(payment.get('value'))!=charge.amount or payment.get('customer')!=auth.customer_id: continue
            if receipt(db,auth,cycle,charge,payment): break
        elif cycle.payment_id:
            payment=remote('GET',conn,'/payments/'+token(cycle.payment_id,'pay_'))
            receipt(db,auth,cycle,charge,payment)
        elif cycle.cycle==0:
            scan_initial(db,conn,auth,cycle,charge)
        elif cycle.status in {'CREATING','UNCERTAIN'}:
            page=remote('GET',conn,'/payments',params={'externalReference':charge.external_reference,'limit':100})
            matches=[p for p in list_data(page) if p.get('externalReference')==charge.external_reference and not p.get('deleted')]
            if not page['hasMore'] and len(matches)==1:
                receipt(db,auth,cycle,charge,remote('GET',conn,'/payments/'+token(matches[0]['id'],'pay_')))


def refresh(db,auth):
    try:
        lock_school(db,auth.school_id)
        db.refresh(auth)
        reconcile(db,auth)
    except IntegrationFailure as error:
        prepared_error(error)


def cancel(db,auth,data,user):
    conn=with_scope(db,auth)
    lock_school(db,auth.school_id)
    db.refresh(auth)
    if auth.status in TERMINAL: return
    check_version(auth,data.version)
    if not auth.remote_id or auth.status not in {'CREATED','ACTIVE','CANCELLING'}:
        fail(409,'Atualize a situação antes de solicitar cancelamento.')
    auth.status='CANCELLING'
    auth.encrypted_qr=''
    auth.version+=1
    def send():
        remote('DELETE',conn,AUTH+'/'+token(auth.remote_id))
        refresh_auth(conn,auth)
        return {'id':auth.remote_id,'status':auth.status}
    run_asaas_operation(db,db.get(m.School,auth.school_id),user,conn,client_key='pix-cancel-'+auth.id,
        kind='pix_auto_cancel',fingerprint_data={'authorization':auth.id},execute=send)


def family_action(student_id,charge_id,db,user,data=None):
    charge,payer,conn=family_charge(db,user,student_id,charge_id)
    auth=auth_for(db,charge,payer,conn)
    if not auth:fail(404,'Autorização não encontrada.')
    if data is None:refresh(db,auth)
    else:cancel(db,auth,data,user)
    return family_view(db,charge,payer,conn)


@family_router.post('/refresh')
def family_refresh(student_id:str,charge_id:str,db:DB,user:Actor,response:Response):
    response.headers['Cache-Control']='no-store'
    return family_action(student_id,charge_id,db,user)


@family_router.post('/cancel')
def family_cancel(student_id:str,charge_id:str,data:Version,db:DB,user:Actor,response:Response):
    response.headers['Cache-Control']='no-store'
    return family_action(student_id,charge_id,db,user,data)


@router.get('/pix-automatic/authorizations')
def authorizations(db:DB,user:Actor,school:Scope,charge_id:str='',page:int=Query(1,ge=1)):
    require(user,'banking.read')
    query=select(PixAuthorization).where(PixAuthorization.school_id==school.id)
    if charge_id:
        charge=scoped(db,m.BankCharge,charge_id,school.id)
        payer=(charge.payer_snapshot or {}).get('person_id')
        if not payer or charge.billing_type!='PIX' or charge.status not in ('pending','queued') or local_cycle(db,charge.id):
            return {'items':[], 'has_more':False}
        query=query.where(PixAuthorization.status=='ACTIVE',PixAuthorization.enrollment_id==charge.enrollment_id,
            PixAuthorization.connection_id==charge.connection_id,PixAuthorization.payer_id==payer)
    items=list(db.scalars(query.order_by(PixAuthorization.created_at.desc(),PixAuthorization.id).offset((page-1)*40).limit(41)))
    return {'items':[describe(db,a) for a in items[:40]],'has_more':len(items)>40}


@router.post('/pix-automatic/authorizations/{ident}/refresh')
def admin_refresh(ident:str,db:DB,user:Actor,school:Scope):
    require(user,'banking.write')
    auth=scoped(db,PixAuthorization,ident,school.id)
    refresh(db,auth)
    return describe(db,auth)


@router.post('/pix-automatic/authorizations/{ident}/cancel')
def admin_cancel(ident:str,data:Version,db:DB,user:Actor,school:Scope):
    require(user,'banking.write')
    auth=scoped(db,PixAuthorization,ident,school.id)
    cancel(db,auth,data,user)
    return describe(db,auth)


def eligible_cycle(db,auth,charge,conn):
    if not available(conn) or auth.status!='ACTIVE' or auth.credential_scope!=identity(conn): return False
    payer=charge.payer_snapshot or {}
    if (charge.school_id!=auth.school_id or charge.connection_id!=auth.connection_id or
            charge.enrollment_id!=auth.enrollment_id or charge.billing_type!='PIX' or
            charge.collection_mode!='provider' or charge.status not in {'queued','pending'} or
            utc(charge.created_at)<=utc(auth.created_at) or charge.due_on<auth.start_date or
            payer.get('person_id')!=auth.payer_id or charge.remote_customer_id and charge.remote_customer_id!=auth.customer_id):
        return False
    enrollment=db.get(m.Enrollment,auth.enrollment_id)
    person=db.get(m.Person,auth.payer_id)
    return bool(enrollment and enrollment.status=='active' and person and person.cpf and payer.get('cpf')==person.cpf
                and db.scalar(select(m.GuardianLink.id).where(m.GuardianLink.school_id==auth.school_id,
                    m.GuardianLink.person_id==auth.payer_id,m.GuardianLink.student_id==enrollment.student_id,
                    m.GuardianLink.active.is_(True),m.GuardianLink.financial.is_(True)).limit(1)))


def add_cycle(db,auth,charge,conn):
    if not eligible_cycle(db,auth,charge,conn):return False
    number=cycle_number(auth.start_date,charge.due_on,auth.frequency)
    exists=db.scalar(select(PixCycle.id).where(PixCycle.authorization_id==auth.id,PixCycle.cycle==number))
    holidays=(conn.config or {}).get('pix_auto_holidays',[])
    if number<1 or exists or business_days(today(),charge.due_on,holidays)<2: return False
    cycle=PixCycle(school_id=auth.school_id,authorization_id=auth.id,charge_id=charge.id,cycle=number,
                   due_on=charge.due_on,amount=charge.amount,status='QUEUED',previous_payment_id=charge.remote_payment_id)
    db.add(cycle);db.flush()
    enqueue(db,auth.school_id,'pix_auto_cycle',{'cycle_id':cycle.id},'pix-cycle:'+cycle.id,conn.id)
    return True


def queue_new_charge(db,charge):
    if charge.billing_type!='PIX' or not charge.connection_id:return False
    conn=db.get(m.IntegrationConnection,charge.connection_id)
    if not available(conn):return False
    auth=db.scalar(select(PixAuthorization).where(PixAuthorization.school_id==charge.school_id,
        PixAuthorization.connection_id==charge.connection_id,PixAuthorization.enrollment_id==charge.enrollment_id,
        PixAuthorization.payer_id==(charge.payer_snapshot or {}).get('person_id'),PixAuthorization.status=='ACTIVE'))
    return bool(auth and add_cycle(db,auth,charge,conn))


@router.post('/pix-automatic/authorizations/{ident}/cycles')
def schedule_cycle(ident:str,data:Schedule,db:DB,user:Actor,school:Scope):
    require(user,'banking.write')
    lock_school(db,school.id)
    auth=scoped(db,PixAuthorization,ident,school.id)
    charge=scoped(db,m.BankCharge,data.charge_id,school.id)
    existing=local_cycle(db,charge.id)
    if existing and existing.authorization_id==auth.id:
        return describe(db,auth)
    check_version(auth,data.version)
    if existing or charge.status!='pending' or not charge.remote_payment_id:
        fail(409,'A cobrança precisa estar emitida e disponível.')
    lock_issuance_channel(db,school.id,charge.id,'pix_auto')
    if not add_cycle(db,auth,charge,with_scope(db,auth)):
        fail(409,'Cobrança fora da matrícula, pagador, janela ou ciclo disponível.')
    return describe(db,auth)


def enqueue_sync(db,auth,key,payment_id='',cycle_id=''):
    return enqueue(db,auth.school_id,'pix_auto_sync',{'auth_id':auth.id,'payment_id':payment_id,'cycle_id':cycle_id},
                   key,auth.connection_id)


def release_cycle(db,cycle,charge):
    cycle.status='SKIPPED'
    if not cycle.previous_payment_id and not charge.remote_payment_id:
        enqueue(db,charge.school_id,'bank_issue',{'charge_id':charge.id},'bank-issue:'+charge.id,charge.connection_id)


def issue_cycle(db,conn,auth,cycle,charge):
    lock_school(db,auth.school_id)
    db.refresh(auth);db.refresh(cycle);db.refresh(charge)
    if cycle.status!='QUEUED':
        reconcile(db,auth,cycle_id=cycle.id)
        return
    if not eligible_cycle(db,auth,charge,conn):
        release_cycle(db,cycle,charge)
        return
    due=business_days(today(),charge.due_on,(conn.config or {}).get('pix_auto_holidays',[]))
    if due<2:
        release_cycle(db,cycle,charge)
        return
    if due>10:return
    refresh_auth(conn,auth)
    if auth.status!='ACTIVE':
        release_cycle(db,cycle,charge)
        return
    first=local_cycle(db,auth.charge_id)
    if not first or first.status!='RECEIVED':return
    if (charge.amount!=cycle.amount or charge.due_on!=cycle.due_on or charge.remote_payment_id!=cycle.previous_payment_id):
        raise IntegrationFailure('PIX_AUTO_CHARGE_CHANGED',uncertain=True)
    # Antes de cada efeito, reserva durável da cobrança e do ciclo. Após crash, apenas conciliação.
    cycle.status='CREATING'
    charge.remote_customer_id=auth.customer_id
    charge.payment_attempted=True
    db.commit()
    try:
        remove_previous(db,conn,charge,cycle,auth.customer_id)
        terms=(charge.payer_snapshot or {}).get('asaas_terms',{})
        payment=remote('POST',conn,'/payments',payload={**terms,'customer':auth.customer_id,
            'billingType':'PIX','value':float(charge.amount),'dueDate':charge.due_on.isoformat(),
            'externalReference':charge.external_reference,'description':charge.description,
            'pixAutomaticAuthorizationId':auth.remote_id})
        cycle.payment_id=token(payment.get('id'),'pay_')
        db.commit()  # A instrução pode levar alguns instantes para aparecer na consulta.
        receipt(db,auth,cycle,charge,payment)
    except IntegrationFailure as exc:
        raise IntegrationFailure(exc.code,uncertain=True) from exc


def process_job(db,job,payload,conn):
    if not conn or conn.provider!='asaas' or conn.school_id!=job.school_id:
        raise IntegrationFailure('PIX_AUTO_SCOPE_MISMATCH')
    if job.kind=='pix_auto_cycle':
        cycle=db.get(PixCycle,payload['cycle_id'])
        if not cycle or cycle.school_id!=conn.school_id:raise IntegrationFailure('PIX_AUTO_SCOPE_MISMATCH')
        auth=db.get(PixAuthorization,cycle.authorization_id)
        if not auth or auth.connection_id!=conn.id:raise IntegrationFailure('PIX_AUTO_SCOPE_MISMATCH')
        issue_cycle(db,conn,auth,cycle,db.get(m.BankCharge,cycle.charge_id))
        return cycle.payment_id or ''
    auth=db.get(PixAuthorization,payload['auth_id'])
    if not auth or auth.connection_id!=conn.id or auth.school_id!=conn.school_id:raise IntegrationFailure('PIX_AUTO_SCOPE_MISMATCH')
    lock_school(db,auth.school_id)
    db.refresh(auth)
    reconcile(db,auth,payment_id=payload.get('payment_id',''),cycle_id=payload.get('cycle_id',''))
    return auth.remote_id or ''


def schedule_periodic(db,cutoff,interval):
    bucket=str(int(now().timestamp())//interval)
    # Ordenar o polling das autorizações para que uma conta grande não monopolize a fila.
    rows=db.scalars(select(PixAuthorization).join(m.IntegrationConnection).where(m.IntegrationConnection.enabled.is_(True),
        or_(PixAuthorization.status.not_in(TERMINAL),PixAuthorization.id.in_(select(PixCycle.authorization_id).where(
            PixCycle.status.in_(['PREPARING','WAITING','CREATING','UNCERTAIN'])))),
        or_(PixAuthorization.verified_at.is_(None),PixAuthorization.verified_at<cutoff))
        .order_by(PixAuthorization.verified_at.asc().nulls_first(),PixAuthorization.created_at,PixAuthorization.id).limit(12))
    for auth in rows:
        enqueue_sync(db,auth,'pix-auto-periodic:'+auth.id+':'+bucket)
        auth.verified_at=now()
    candidates=db.scalars(select(PixCycle).where(PixCycle.status=='QUEUED',PixCycle.due_on<=today()+timedelta(days=30))
        .order_by(PixCycle.updated_at,PixCycle.id).limit(20))
    for cycle in candidates:
        auth=db.get(PixAuthorization,cycle.authorization_id)
        enqueue(db,auth.school_id,'pix_auto_cycle',{'cycle_id':cycle.id},'pix-cycle:'+cycle.id+':'+bucket,auth.connection_id)
        cycle.updated_at=now()


def handle_webhook(db,conn,event,data):
    if event==PREFIX+'ELIGIBILITY_UPDATED':
        status=(data.get('eligibility') or {}).get('status')
        if status not in {'ELIGIBLE','INELIGIBLE'}:return False
        conn.config={**(conn.config or {}),'pix_auto_eligibility':status}
        return True
    auth_id=''
    payment_id=''
    if event in PIX_WEBHOOK_EVENTS:
        if event.startswith(PREFIX+'AUTHORIZATION_'):
            auth_id=(data.get('authorization') or {}).get('id')
        else:
            instruction=data.get('paymentInstruction') or {}
            auth_id=(instruction.get('authorization') or {}).get('id')
        if not auth_id:return False
        query=select(PixAuthorization).where(PixAuthorization.remote_id==auth_id)
    elif event.startswith('PAYMENT_'):
        payment=data.get('payment') or {}
        payment_id=payment.get('id')
        if not payment_id:return False
        # O ID antigo removido não pode cancelar o novo QR. O status vem de nova leitura vinculada.
        previous=db.scalar(select(PixCycle).join(PixAuthorization).where(PixCycle.previous_payment_id==payment_id,
            PixAuthorization.connection_id==conn.id,PixCycle.school_id==conn.school_id))
        if previous:
            if previous.status in {'RELEASED','SKIPPED'}:return False
            auth=db.get(PixAuthorization,previous.authorization_id)
            enqueue_sync(db,auth,'pix-auto-hook:'+str(data['id'])[:115],payment_id,previous.id)
            return True
        cycle=db.scalar(select(PixCycle).join(PixAuthorization).where(PixCycle.payment_id==payment_id,
            PixAuthorization.connection_id==conn.id,PixCycle.school_id==conn.school_id))
        if cycle:
            auth=db.get(PixAuthorization,cycle.authorization_id)
            enqueue_sync(db,auth,'pix-auto-hook:'+str(data['id'])[:115],payment_id,cycle.id)
            return True
        if payment.get('externalReference'):
            charge=db.scalar(select(m.BankCharge).where(m.BankCharge.school_id==conn.school_id,
                m.BankCharge.connection_id==conn.id,m.BankCharge.external_reference==payment['externalReference']))
            if charge and holds_charge(db,charge.id):
                cycle=local_cycle(db,charge.id)
                auth=db.get(PixAuthorization,cycle.authorization_id)
                enqueue_sync(db,auth,'pix-auto-hook:'+str(data['id'])[:115],cycle_id=cycle.id)
                return True
            return False
        if not payment.get('pixTransaction') or not payment.get('customer'):return False
        query=select(PixAuthorization).where(PixAuthorization.customer_id==payment['customer'])
    else:return False
    found=False
    for auth in db.scalars(query.where(PixAuthorization.school_id==conn.school_id,PixAuthorization.connection_id==conn.id)):
        key='pix-auto-hook:'+hashlib.sha256((str(data['id'])+':'+auth.id).encode()).hexdigest()
        enqueue_sync(db,auth,key,payment_id=payment_id)
        found=True
    return found
