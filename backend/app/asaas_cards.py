"""Checkout hospedado e cobrança de títulos com autorização expressa do pagador."""
from datetime import date
from decimal import Decimal
import hashlib
import ipaddress
import re
from typing import Literal
from urllib.parse import urlsplit

from fastapi import APIRouter, HTTPException, Query, Request, Response
from pydantic import Field, model_validator
from sqlalchemy import func, select
from . import models as m
from .admission_reservations import payment_changed
from .asaas_card_models import CardCheckout, CardMandate
from .asaas_native import router, asaas_connection, asaas_read, asaas_request, run_asaas_operation
from .asaas_policy import card_quote, policy_for
from .common import audit
from .config import settings
from .db import now, uid
from .integration_core import IntegrationFailure, enqueue, seal, unseal
from .portal_access import today
from .schemas import Input
from .security import Actor, DB, Scope, fail, lock_school, require, scoped

family_router = APIRouter(prefix='/api/v1/family/students/{student_id}/charges/{charge_id}/cards',tags=['Cartões da família'])
TERMS = 'cartao-fatura-v1'
TERMS_TEXT = 'Autorizo a escola a debitar mensalidades expressamente vinculadas a esta matrícula até o valor e a data que escolhi. Posso revogar a autorização para títulos futuros.'
REMOTE = re.compile(r'[A-Za-z0-9_-]{1,160}')
TERMINAL = {'paid','expired','cancelled','subscription_cancelled'}
CYCLES = Literal['WEEKLY','BIWEEKLY','MONTHLY','BIMONTHLY','QUARTERLY','SEMIANNUALLY','YEARLY']


class Command(Input):
    client_key: str = Field(min_length=12,max_length=80,pattern=r'^[A-Za-z0-9_.:-]+$')


class CreateCheckout(Command):
    charge_id: str = Field(min_length=1,max_length=36)
    mode: Literal['detached','installment','recurrent']
    max_installments: int = Field(default=1,ge=1,le=21)
    cycle: CYCLES | None = None
    ends_on: date | None = None

    @model_validator(mode='after')
    def terms(self):
        if (self.mode=='installment') != (self.max_installments>1):
            raise ValueError('Informe de 2 a 21 parcelas somente no checkout parcelado.')
        if (self.mode=='recurrent') != bool(self.cycle and self.ends_on) or (self.mode!='recurrent' and (self.cycle or self.ends_on)):
            raise ValueError('A assinatura hospedada exige periodicidade e data final.')
        return self


class Authorize(Input):
    terms_version: str = Field(max_length=32)
    accepted: Literal[True]
    ends_on: date
    limit_cents: int = Field(ge=1,le=999999999999)


def payment_id(value):
    return value if isinstance(value,str) and REMOTE.fullmatch(value) else None


def family_context(db,user,student_id,charge_id):
    from .asaas_auto_pix import family_charge
    charge,payer,conn=family_charge(db,user,student_id,charge_id)
    return charge,payer,conn


def payer_for(db,school,charge):
    if not charge.enrollment_id:
        fail(409,'Vincule o título à matrícula antes de oferecer cartão.')
    enrollment=scoped(db,m.Enrollment,charge.enrollment_id,school.id)
    ident=(charge.payer_snapshot or {}).get('person_id') or enrollment.financial_person_id
    payer=scoped(db,m.Person,ident,school.id) if ident else None
    if (not payer or not payer.active or not payer.cpf or payer.cpf != charge.payer_snapshot.get('cpf')
            or not db.scalar(select(m.GuardianLink.id).where(m.GuardianLink.school_id==school.id,
                m.GuardianLink.student_id==enrollment.student_id,m.GuardianLink.person_id==payer.id,
                m.GuardianLink.financial.is_(True),m.GuardianLink.active.is_(True)))):
        fail(409,'Confira o CPF e o vínculo do pagador do título na matrícula.')
    return payer


def summary(row):
    remote=payment_id(row.remote_id)
    base='https://sandbox.asaas.com' if row.environment=='sandbox' else 'https://asaas.com'
    return {'id':row.id,'charge_id':row.charge_id,'mode':row.mode,'status':row.status,'cycle':row.cycle,
        'ends_on':row.ends_on,'first_due':row.first_due,'max_installments':row.max_installments,'quote':{k:v for k,v in row.quote.items() if not k.startswith('mandate_')},
        'checkout_url':base+'/checkoutSession/show?id='+remote if remote and row.status=='open' and row.mode!='invoice' else '',
        'can_cancel':bool(row.status=='open' or (row.mode=='recurrent' and row.subscription_id and row.status=='paid')),
        'payments':row.transactions}


def customer_scope(db,row,customer,conn):
    if not payment_id(customer):
        return False
    payer=db.get(m.Person,row.payer_id)
    if not payer or not payer.cpf:return False
    remote=asaas_read(conn,'/customers/'+customer)
    return remote.get('id')==customer and re.sub(r'\D','',str(remote.get('cpfCnpj','')))==payer.cpf


def open_payload(row,charge,payer,conn):
    root=(settings().portal_public_url or settings().app_url).rstrip('/')
    url=urlsplit(root)
    if url.scheme!='https' or not url.hostname or url.username or url.password:
        fail(409,'Configure a origem pública HTTPS do portal antes de oferecer checkout.')
    gross=Decimal(row.quote['charged_cents'])/100
    callback=root+'/family?view=finance'
    data={'billingTypes':['CREDIT_CARD'],'chargeTypes':[row.mode.upper()],'externalReference':'pige-card:'+row.id,
        'minutesToExpire':60,'callback':{'cancelUrl':callback,'successUrl':callback,'expiredUrl':callback},
        'items':[{'name':charge.description[:100], 'description':charge.description[:500],'quantity':1,'value':float(gross)}]}
    if row.mode=='installment':data['installment']={'maxInstallmentCount':row.max_installments}
    if row.mode=='recurrent':data['subscription']={'cycle':row.cycle,'nextDueDate':row.first_due.isoformat(),'endDate':row.ends_on.isoformat()}
    if row.mode=='detached':data['chargeTypes']=['DETACHED']
    clients=asaas_read(conn,'/customers',params={'cpfCnpj':payer.cpf,'limit':2})
    found=[item for item in clients.get('data',[]) if re.sub(r'\D','',str(item.get('cpfCnpj','')))==payer.cpf and payment_id(item.get('id'))]
    if len(found)==1 and not clients.get('hasMore'):
        data['customer']=found[0]['id']
    elif found or clients.get('hasMore'):
        fail(409,'Existem cadastros de cliente conflitantes no Asaas. Concilie o pagador.')
    else:
        values={'name':payer.name,'cpfCnpj':payer.cpf,'email':payer.email,'phone':payer.phone,
            'postalCode':payer.postal_code,'addressNumber':payer.address_number,'address':payer.street or payer.address,'province':payer.district}
        if not all(values.values()):fail(422,'Complete nome, CPF, e-mail, telefone, CEP, endereço, bairro e número do pagador ou vincule o cadastro no Asaas.')
        data['customerData']=values
    return data


def quote_for(conn,amount,count):
    policy=policy_for(conn)
    quote=card_quote(policy,amount,count)
    if any(card_quote(policy,amount,i)['charged_cents']!=quote['charged_cents'] for i in range(1,count)):
        fail(422,'O checkout hospedado permite escolher a quantidade de parcelas. Configure preço único para todas as opções oferecidas.')
    return quote


@router.post('/cards/checkouts',status_code=201)
def create(data:CreateCheckout,db:DB,user:Actor,school:Scope,request:Request):
    require(user,'banking.write');lock_school(db,school.id)
    charge=scoped(db,m.BankCharge,data.charge_id,school.id)
    conn=asaas_connection(db,school)
    row=db.scalar(select(CardCheckout).where(CardCheckout.school_id==school.id,CardCheckout.client_key==data.client_key))
    if row:
        if (row.charge_id,row.mode,row.max_installments,row.cycle,row.ends_on)!=(charge.id,data.mode,data.max_installments,data.cycle or '',data.ends_on):
            fail(409,'Esta chave já identifica outro checkout.')
        recover(db,row)
        return summary(row)
    if charge.collection_mode!='manual' or charge.status not in ('pending','overdue'):
        fail(409,'Selecione um título interno em aberto.')
    payer=payer_for(db,school,charge)
    quote=quote_for(conn,charge.amount,data.max_installments)
    first=max(today(),charge.due_on)
    if data.ends_on and data.ends_on<=first:fail(422,'A assinatura deve terminar após a primeira cobrança.')
    row=CardCheckout(id=uid(),school_id=school.id,connection_id=conn.id,environment=conn.environment,charge_id=charge.id,
        enrollment_id=charge.enrollment_id,payer_id=payer.id,mode=data.mode,max_installments=data.max_installments,cycle=data.cycle or '',
        first_due=first,ends_on=data.ends_on,quote=quote,client_key=data.client_key,status='creating')
    payload=open_payload(row,charge,payer,conn)
    db.add(row);db.flush()
    op=run_asaas_operation(db,school,user,conn,client_key=data.client_key,kind='card_checkout',issuance_channel='card',charge_id=charge.id,
        fingerprint_data={'checkout_id':row.id,'charged_cents':quote['charged_cents'],'mode':data.mode},
        execute=lambda:asaas_request(conn,'POST','/checkouts',payload=payload))
    db.refresh(row)
    if not row.remote_id:row.remote_id=op.remote_id
    if row.status=='creating':row.status='open'
    audit(db,request,user,'asaas.card.checkout',row,school.id,{'charge_id':charge.id,'mode':data.mode})
    return summary(row)


@router.get('/cards/checkouts')
def listing(db:DB,user:Actor,school:Scope,charge_id:str='',page:int=Query(1,ge=1),page_size:int=Query(30,ge=1,le=100)):
    require(user,'banking.read')
    stmt=select(CardCheckout).where(CardCheckout.school_id==school.id)
    if charge_id:stmt=stmt.where(CardCheckout.charge_id==charge_id)
    total=db.scalar(select(func.count()).select_from(stmt.subquery()))
    return {'items':[summary(row) for row in db.scalars(stmt.order_by(CardCheckout.created_at.desc(),CardCheckout.id.desc()).offset((page-1)*page_size).limit(page_size))],
            'total':total,'page':page,'page_size':page_size}


def read_page(conn,path,params):
    rows=[];offset=0
    while True:
        body=asaas_read(conn,path,params={**params,'offset':offset,'limit':100})
        batch=body.get('data')
        if not isinstance(batch,list) or len(batch)>100 or (body.get('hasMore') and not batch):
            fail(502,'O Asaas devolveu uma lista de pagamentos incompleta.')
        rows.extend(batch)
        if not body.get('hasMore'):return rows
        offset+=len(batch)
        if offset>=2000:fail(422,'Este contrato ultrapassou o limite de pagamentos por consulta.')


def base_payments(conn,row):
    if row.mode=='invoice':
        return [asaas_read(conn,'/payments/'+row.remote_id)]
    return read_page(conn,'/payments',{'checkoutSession':row.remote_id})


def sync_row(db,conn,row):
    recover(db,row)
    if not payment_id(row.remote_id):return summary(row)
    base=base_payments(conn,row)
    if not base:
        row.transactions=[]
        if row.status in ('expired','cancelled') and row.mode!='invoice':
            from .asaas_native import release_issuance
            release_issuance(db,row.school_id,row.charge_id,'card',row.remote_id)
        return summary(row)
    expected='pige-card:'+row.id
    if any(not payment_id(p.get('id')) or p.get('billingType')!='CREDIT_CARD' or
           (p.get('externalReference')!=expected if row.mode=='invoice' else p.get('checkoutSession')!=row.remote_id) for p in base):
        fail(409,'O retorno não corresponde ao checkout ou título escolar.')
    customers={p.get('customer') for p in base}
    if len(customers)!=1 or not customer_scope(db,row,next(iter(customers)),conn):
        fail(409,'O cliente das cobranças diverge do pagador da matrícula.')
    sub={p.get('subscription') for p in base if p.get('subscription')}
    if row.mode=='recurrent' and sub:
        if len(sub)!=1:fail(409,'O checkout está associado a mais de uma assinatura.')
        remote=next(iter(sub))
        if not payment_id(remote) or row.subscription_id not in (None,remote):fail(409,'Assinatura divergente.')
        extra=read_page(conn,'/subscriptions/'+remote+'/payments',{})
        if any(p.get('subscription')!=remote or p.get('customer') not in customers or p.get('billingType')!='CREDIT_CARD' or not payment_id(p.get('id')) for p in extra):
            fail(409,'As parcelas divergem da assinatura ou do cliente.')
        row.subscription_id=remote
        base=list({p['id']:p for p in base+extra}.values())
    if row.mode=='installment':
        ids={p.get('installment') for p in base}
        if len(ids)!=1:
            fail(409,'As cobranças retornadas pertencem a parcelamentos diferentes.')
        group=next(iter(ids))
        if group and not payment_id(group) or row.installment_id and group!=row.installment_id:
            fail(409,'O identificador do parcelamento diverge da conciliação anterior.')
        row.installment_id=group
    transactions=[{k:p.get(k) for k in ('id','status','dueDate','value','paymentDate','installmentNumber')} for p in base]
    if any(not isinstance(p['value'],(str,float,int)) or not p['dueDate'] for p in transactions):
        fail(502,'Cobrança sem valor ou vencimento confirmado.')
    row.transactions=sorted(transactions,key=lambda p:(p['dueDate'],p['id']))
    applied=row.transactions
    if row.mode=='recurrent':applied=[p for p in applied if p['dueDate']==row.first_due.isoformat()]
    if not applied:return summary(row)
    amounts=sum((Decimal(str(p['value'])) for p in applied),Decimal(0))
    if amounts*100!=row.quote['charged_cents']:return summary(row)
    charge=db.get(m.BankCharge,row.charge_id)
    states={p['status'] for p in applied}
    next_status=None
    if states=={'RECEIVED'}:next_status='received'
    elif states<={'CONFIRMED','RECEIVED'}:next_status='confirmed'
    elif states=={'REFUNDED'}:next_status='refunded'
    elif states & {'REFUNDED','PARTIALLY_REFUNDED'}:next_status='partially_refunded'
    elif states & {'CHARGEBACK_REQUESTED','CHARGEBACK_DISPUTE'}:next_status='disputed'
    if next_status and charge.status!=next_status and not (charge.status in ('received','refunded','partially_refunded','disputed') and next_status=='confirmed'):
        if charge.status not in ('cancelled','received_external'):
            old=charge.status;charge.status=next_status;charge.version+=1
            db.add(m.BankEvent(school_id=row.school_id,charge_id=charge.id,source='asaas_card',previous_status=old,
                status=next_status,details={'checkout_id':row.id,'gross_cents':row.quote['charged_cents']}))
            payment_changed(db,charge)
    if states<={'CONFIRMED','RECEIVED'} and row.status not in ('subscription_cancelled','cancellation_requested'):row.status='paid'
    return summary(row)


@router.post('/cards/checkouts/{id}/sync')
def sync(id:str,db:DB,user:Actor,school:Scope):
    require(user,'asaas.reconcile');lock_school(db,school.id)
    row=scoped(db,CardCheckout,id,school.id)
    return sync_row(db,asaas_connection(db,school,row.connection_id),row)


@router.post('/cards/checkouts/{id}/cancel')
def cancel(id:str,data:Command,db:DB,user:Actor,school:Scope,request:Request):
    require(user,'banking.write');lock_school(db,school.id)
    row=scoped(db,CardCheckout,id,school.id)
    if row.status in ('cancelled','expired','subscription_cancelled','cancellation_requested'):return summary(row)
    if not summary(row)['can_cancel']:fail(409,'Consulte o estado do checkout ou da assinatura antes de cancelar.')
    conn=asaas_connection(db,school,row.connection_id)
    subscription=row.subscription_id if row.mode=='recurrent' else None
    target=subscription or row.remote_id
    def dispatch():
        response=asaas_request(conn,'DELETE' if subscription else 'POST','/subscriptions/'+target if subscription else '/checkouts/'+target+'/cancel')
        if subscription and (response.get('id')!=target or response.get('deleted') is not True):
            raise IntegrationFailure('CARD_CANCEL_UNCONFIRMED',uncertain=True)
        if not subscription and response.get('id') not in (None,target):
            raise IntegrationFailure('CARD_CANCEL_UNCONFIRMED',uncertain=True)
        return {'id':target}
    run_asaas_operation(db,school,user,conn,client_key=data.client_key,kind='card_cancel',charge_id=row.charge_id,
        fingerprint_data={'checkout_id':row.id,'target':target},execute=dispatch)
    db.refresh(row)
    if subscription:row.status='subscription_cancelled'
    elif row.status=='open':row.status='cancellation_requested'
    audit(db,request,user,'asaas.card.cancelled',row,school.id,{'subscription':bool(subscription)})
    return summary(row)


def observe_webhook(db,conn,payload):
    event=payload.get('event','')
    if event in ('CHECKOUT_CREATED','CHECKOUT_PAID','CHECKOUT_CANCELED','CHECKOUT_EXPIRED'):
        item=payload.get('checkout') or {}
        identifier=payment_id(item.get('id'))
        ref=item.get('externalReference') or ''
        if not identifier or not isinstance(ref,str):return False
        stmt=select(CardCheckout).where(CardCheckout.school_id==conn.school_id,CardCheckout.connection_id==conn.id,CardCheckout.remote_id==identifier)
        row=db.scalar(stmt.with_for_update())
        if not row and ref.startswith('pige-card:'):
            row=db.scalar(select(CardCheckout).where(CardCheckout.school_id==conn.school_id,CardCheckout.connection_id==conn.id,
                CardCheckout.id==ref[10:],CardCheckout.remote_id.is_(None)).with_for_update())
        if not row or (ref and ref!='pige-card:'+row.id):return False
        row.remote_id=identifier
        new={'CHECKOUT_CREATED':'open','CHECKOUT_PAID':'paid','CHECKOUT_CANCELED':'cancelled','CHECKOUT_EXPIRED':'expired'}[event]
        if row.status not in TERMINAL and not (row.status=='cancellation_requested' and new=='open'):row.status=new
    elif event.startswith('PAYMENT_'):
        item=payload.get('payment') or {}
        criteria=[]
        if payment_id(item.get('checkoutSession')):criteria.append(CardCheckout.remote_id==item['checkoutSession'])
        if payment_id(item.get('subscription')):criteria.append(CardCheckout.subscription_id==item['subscription'])
        ref=item.get('externalReference') or ''
        if isinstance(ref,str) and ref.startswith('pige-card:'):criteria.append(CardCheckout.id==ref[10:])
        if not criteria:return False
        from sqlalchemy import or_
        row=db.scalar(select(CardCheckout).where(CardCheckout.school_id==conn.school_id,CardCheckout.connection_id==conn.id,or_(*criteria)))
        if not row:return False
        if row.mode=='invoice' and not row.remote_id and ref=='pige-card:'+row.id and payment_id(item.get('id')):
            row.remote_id=item['id'];row.status='processing'
    else:return False
    if event=='CHECKOUT_PAID' or event.startswith('PAYMENT_'):
        enqueue(db,conn.school_id,'asaas_card_sync',{'checkout_id':row.id},'card-sync:'+hashlib.sha256(str(payload['id']).encode()).hexdigest()+':'+conn.id,conn.id)
    return True


def origin_operation(db,row):
    return db.scalar(select(m.AsaasNativeOperation).where(m.AsaasNativeOperation.school_id==row.school_id,
        m.AsaasNativeOperation.charge_id==row.charge_id,m.AsaasNativeOperation.connection_id==row.connection_id,
        m.AsaasNativeOperation.client_key==row.client_key))


def recover(db,row):
    if row.status not in ('creating','uncertain') or row.remote_id:return
    op=origin_operation(db,row)
    if op and op.status=='completed' and payment_id(op.remote_id):
        row.remote_id=op.remote_id;row.status='processing' if row.mode=='invoice' else 'open'
    elif op and op.status in ('failed','uncertain'):row.status=op.status


def mandate_view(auth):
    return {'active':auth.status=='active' and auth.ends_on>=today(),'status':auth.status,'ends_on':auth.ends_on,
            'limit_cents':auth.limit_cents,'version':auth.version} if auth else None


def family_checkout(db,user,student_id,charge_id):
    charge,payer,_=family_context(db,user,student_id,charge_id)
    row=db.scalar(select(CardCheckout).where(CardCheckout.school_id==charge.school_id,CardCheckout.charge_id==charge.id,
        CardCheckout.payer_id==payer.id).order_by(CardCheckout.created_at.desc(),CardCheckout.id.desc()).limit(1))
    return charge,payer,row


def receipt(db,school,row,remote,user,request):
    from .documents import render_pdf
    from .school_reports import format_value
    if not row or not payment_id(remote):
        fail(404,'Pagamento indisponível.')
    lock_school(db,school.id)
    db.refresh(row)
    conn=asaas_connection(db,school,row.connection_id)
    sync_row(db,conn,row)
    transaction=next((item for item in row.transactions if item['id']==remote),None)
    if not transaction:
        fail(404,'Pagamento indisponível.')
    if transaction['status']!='RECEIVED':
        fail(409,'O comprovante exige recebimento confirmado pelo Asaas.')
    if refund_history(conn,remote)>0:
        fail(409,'Existe estorno vinculado ao pagamento. Consulte o histórico financeiro.')
    charge=scoped(db,m.BankCharge,row.charge_id,school.id)
    fields=[('Pagador',charge.payer_snapshot.get('name','')),('Cobrança',charge.description),
            ('Referência do pagamento',remote),('Valor recebido',format_value(transaction['value'],'currency')),
            ('Vencimento',format_value(transaction['dueDate'],'date'))]
    if transaction.get('paymentDate'):
        fields.append(('Data do pagamento',format_value(transaction['paymentDate'],'date')))
    pdf=render_pdf(school,'Comprovante de pagamento com cartão',fields,
                   note='Recebimento conciliado no Asaas para a transação indicada.',db=db,module='Financeiro')
    audit(db,request,user,'asaas.card.receipt',row,school.id,{'payment':remote})
    return Response(pdf,media_type='application/pdf',headers={'Cache-Control':'no-store',
        'X-Content-Type-Options':'nosniff','Content-Disposition':'attachment; filename="comprovante-cartao.pdf"'})


@router.get('/cards/checkouts/{id}/payments/{payment_id}/receipt.pdf')
def management_receipt(id:str,payment_id:str,db:DB,user:Actor,school:Scope,request:Request):
    require(user,'banking.read')
    return receipt(db,school,scoped(db,CardCheckout,id,school.id),payment_id,user,request)


@family_router.get('/receipts/{payment_id}.pdf')
def family_receipt(student_id:str,charge_id:str,payment_id:str,db:DB,user:Actor,request:Request):
    charge,_,row=family_checkout(db,user,student_id,charge_id)
    return receipt(db,db.get(m.School,charge.school_id),row,payment_id,user,request)


@family_router.get('')
def family_cards(student_id:str,charge_id:str,db:DB,user:Actor,response:Response):
    response.headers['Cache-Control']='no-store'
    charge,payer,row=family_checkout(db,user,student_id,charge_id)
    auth=db.scalar(select(CardMandate).where(CardMandate.checkout_id==row.id)) if row else None
    conn=db.get(m.IntegrationConnection,row.connection_id) if row else None
    available=bool(row and conn and conn.enabled and policy_for(conn).card_recurring_enabled and row.mode=='detached' and row.status=='paid')
    return {'checkout':summary(row) if row else None,'authorization':mandate_view(auth),'terms':TERMS_TEXT,
            'terms_version':TERMS,'can_authorize':available and (not auth or auth.status!='active' or auth.ends_on<today())}


@family_router.post('/authorize')
def authorize(student_id:str,charge_id:str,data:Authorize,db:DB,user:Actor,request:Request):
    charge,payer,row=family_checkout(db,user,student_id,charge_id)
    lock_school(db,charge.school_id)
    if not row or row.mode!='detached' or row.status!='paid' or not row.remote_id:fail(409,'A primeira compra avulsa com cartão ainda não foi confirmada.')
    conn=asaas_connection(db,charge.school_id,row.connection_id)
    if not policy_for(conn).card_recurring_enabled:fail(409,'A escola ainda não habilitou cartão recorrente por fatura.')
    if data.terms_version!=TERMS or data.ends_on<today():
        fail(422,'Confira os termos e informe uma data de validade atual ou futura.')
    auth=db.scalar(select(CardMandate).where(CardMandate.checkout_id==row.id).with_for_update())
    if auth and auth.status=='active' and auth.ends_on>=today():
        if auth.limit_cents==data.limit_cents and auth.ends_on==data.ends_on:return mandate_view(auth)
        fail(409,'Revogue a autorização vigente antes de alterar limite ou validade.')
    others=db.scalars(select(CardMandate).join(CardCheckout,CardCheckout.id==CardMandate.checkout_id).where(
        CardCheckout.school_id==charge.school_id,CardCheckout.enrollment_id==row.enrollment_id,
        CardCheckout.payer_id==payer.id,CardMandate.status=='active',CardMandate.ends_on>=today())).first()
    if others:fail(409,'Esta matrícula já possui autorização recorrente vigente.')
    payments=base_payments(conn,row)
    if len(payments)!=1 or not payment_id(payments[0].get('id')):
        fail(409,'A primeira compra ainda não tem uma cobrança única confirmada.')
    p=asaas_read(conn,'/payments/'+payments[0]['id'])
    if (p.get('id')!=payments[0]['id'] or p.get('checkoutSession')!=row.remote_id or p.get('billingType')!='CREDIT_CARD'
        or p.get('status') not in ('CONFIRMED','RECEIVED') or Decimal(str(p.get('value',0)))*100!=row.quote['charged_cents']
        or not customer_scope(db,row,p.get('customer'),conn)):
        fail(409,'A primeira compra não corresponde ao cartão, pagador e valor da autorização.')
    card=p.get('creditCard') or {}
    token=card.get('creditCardToken') if isinstance(card,dict) else None
    token=token or p.get('creditCardToken')
    if not isinstance(token,str) or not re.fullmatch(r'[A-Za-z0-9._~-]{16,512}',token) or token.isdigit():
        fail(409,'O Asaas não disponibilizou um token reutilizável desta compra. Confira a habilitação de tokenização na conta; nenhuma autorização foi criada.')
    try:address=ipaddress.ip_address(request.client.host)
    except (ValueError,AttributeError):fail(422,'Não foi possível identificar o IP do titular.')
    if not address.is_global and settings().app_env!='test':fail(422,'Confira o encaminhamento do IP real no proxy do portal.')
    from .asaas_auto_pix import identity
    secret=seal({'token':token,'ip':str(address),'scope':identity(conn)})
    if not auth:
        auth=CardMandate(checkout_id=row.id,school_id=row.school_id);db.add(auth)
    else:auth.version+=1
    auth.user_id=user.id;auth.customer_id=p['customer'];auth.sealed_token=secret
    auth.terms_version=TERMS;auth.limit_cents=data.limit_cents;auth.ends_on=data.ends_on;auth.status='active'
    db.flush();audit(db,request,user,'asaas.card.consent',auth,row.school_id,
        {'terms':TERMS,'limit_cents':data.limit_cents,'ends_on':str(data.ends_on),'enrollment_id':row.enrollment_id})
    return mandate_view(auth)


@family_router.post('/revoke')
def revoke(student_id:str,charge_id:str,db:DB,user:Actor,request:Request):
    charge,payer,row=family_checkout(db,user,student_id,charge_id);lock_school(db,charge.school_id)
    auth=db.scalar(select(CardMandate).where(CardMandate.checkout_id==row.id).with_for_update()) if row else None
    if not auth:fail(404,'Autorização não encontrada.')
    if auth.status=='active':
        auth.status='revoked';auth.sealed_token='';auth.version+=1
        audit(db,request,user,'asaas.card.consent_revoked',auth,charge.school_id,{'enrollment_id':row.enrollment_id})
    return mandate_view(auth)


def queue_invoice(db,school,user,charge):
    conn=asaas_connection(db,school);payer=payer_for(db,school,charge)
    auth=db.scalar(select(CardMandate).join(CardCheckout,CardCheckout.id==CardMandate.checkout_id).where(
        CardCheckout.school_id==school.id,CardCheckout.connection_id==conn.id,CardCheckout.enrollment_id==charge.enrollment_id,
        CardCheckout.payer_id==payer.id,CardMandate.status=='active',CardMandate.ends_on>=max(today(),charge.due_on)))
    if not auth:fail(409,'Não há autorização vigente do pagador para este título e vencimento.')
    q=card_quote(policy_for(conn),charge.amount,1,recurring=True)
    if q['charged_cents']>auth.limit_cents:fail(422,'Valor com encargos acima do teto autorizado pelo pagador.')
    row=CardCheckout(id=uid(),school_id=school.id,connection_id=conn.id,environment=conn.environment,charge_id=charge.id,
        enrollment_id=charge.enrollment_id,payer_id=payer.id,mode='invoice',max_installments=1,first_due=charge.due_on,
        client_key='card-invoice:'+charge.id,quote={**q,'mandate_id':auth.id,'mandate_version':auth.version},status='scheduled',cycle='')
    db.add(row);db.flush()
    job=enqueue(db,school.id,'asaas_card_invoice',{'checkout_id':row.id,'actor_id':user.id},row.client_key,conn.id)
    from datetime import datetime, time
    from zoneinfo import ZoneInfo
    job.available_at=max(now(),datetime.combine(charge.due_on,time(8),ZoneInfo('America/Bahia')))
    return row


def execute_job(db,job,payload):
    row=db.get(CardCheckout,payload['checkout_id'])
    if not row or row.school_id!=job.school_id or row.connection_id!=job.connection_id:raise IntegrationFailure('CARD_SCOPE_MISMATCH')
    school=db.get(m.School,row.school_id);conn=asaas_connection(db,school,row.connection_id)
    lock_school(db,school.id);recover(db,row)
    if job.kind=='asaas_card_sync':
        sync_row(db,conn,row)
        return row.remote_id or ''
    if row.mode!='invoice':raise IntegrationFailure('CARD_INVOICE_MISMATCH')
    user=db.get(m.User,payload['actor_id'])
    charge=scoped(db,m.BankCharge,row.charge_id,school.id)
    def invoice_payload():
        from .asaas_auto_pix import identity
        auth=db.scalar(select(CardMandate).where(CardMandate.id==row.quote['mandate_id'],CardMandate.school_id==school.id).with_for_update().execution_options(populate_existing=True))
        if (not auth or auth.status!='active' or auth.ends_on<today() or auth.version!=row.quote['mandate_version']
            or row.quote['charged_cents']>auth.limit_cents):
            raise IntegrationFailure('CARD_CONSENT_UNAVAILABLE')
        source=db.get(CardCheckout,auth.checkout_id)
        if not source or (source.payer_id,source.enrollment_id,source.connection_id)!=(row.payer_id,row.enrollment_id,row.connection_id):
            raise IntegrationFailure('CARD_CONSENT_SCOPE_CHANGED')
        db.refresh(charge)
        if charge.status not in ('pending','overdue') or charge.collection_mode!='manual':
            raise IntegrationFailure('CARD_INVOICE_INELIGIBLE')
        try:
            payer=payer_for(db,school,charge)
            quote=card_quote(policy_for(conn),charge.amount,1,recurring=True)
        except HTTPException:
            raise IntegrationFailure('CARD_INVOICE_INELIGIBLE') from None
        if payer.id!=row.payer_id or charge.due_on!=row.first_due or quote['charged_cents']!=row.quote['charged_cents']:
            raise IntegrationFailure('CARD_INVOICE_CHANGED')
        info=unseal(auth.sealed_token)
        if info.get('scope')!=identity(conn):raise IntegrationFailure('CARD_ACCOUNT_CHANGED')
        return {'billingType':'CREDIT_CARD','customer':auth.customer_id,'dueDate':max(today(),charge.due_on).isoformat(),
              'description':charge.description[:500],'externalReference':'pige-card:'+row.id,
              'value':float(Decimal(quote['charged_cents'])/100),'creditCardToken':info['token'],'remoteIp':info['ip']}
    def dispatch():
        body=invoice_payload()
        response=asaas_request(conn,'POST','/payments',payload=body)
        if response.get('externalReference')!=body['externalReference'] or response.get('customer')!=body['customer'] or not payment_id(response.get('id')):
            raise IntegrationFailure('CARD_PAYMENT_UNCONFIRMED',uncertain=True)
        return {'id':response['id']}
    op=run_asaas_operation(db,school,user,conn,client_key=row.client_key,kind='card_invoice',charge_id=charge.id,
        issuance_channel='card',fingerprint_data={'checkout_id':row.id,'quote':row.quote},preflight=invoice_payload,execute=dispatch)
    row.remote_id=op.remote_id;row.status='processing';db.flush();sync_row(db,conn,row)
    return row.remote_id


class CardRefund(Command):
    payment_id: str = Field(pattern=r'^[A-Za-z0-9_-]{1,160}$')
    amount: Decimal = Field(gt=0,decimal_places=2,max_digits=12)
    description: str = Field(min_length=3,max_length=255)


@router.post('/cards/checkouts/{id}/refund')
def refund_card(id:str,data:CardRefund,db:DB,user:Actor,school:Scope,request:Request):
    require(user,'asaas.monitor.read');require(user,'asaas.refund')
    row=scoped(db,CardCheckout,id,school.id);conn=asaas_connection(db,school,row.connection_id)
    plan=row.mode=='installment'
    def preflight():
        db.refresh(row)
        sync_row(db,conn,row)
        selected=next((p for p in row.transactions if p['id']==data.payment_id),None)
        if not selected:fail(409,'Selecione um pagamento correlacionado a este checkout.')
        selected_rows=row.transactions if plan else [selected]
        if any(p['status'] not in ('CONFIRMED','RECEIVED','PARTIALLY_REFUNDED') for p in selected_rows):
            fail(409,'Confira o recebimento antes de solicitar este estorno.')
        if plan and not payment_id(row.installment_id):fail(409,'O parcelamento não foi confirmado pelo Asaas.')
        total=sum((Decimal(str(p['value'])) for p in selected_rows),Decimal(0))
        from .asaas_native import refund_totals
        histories=[refund_totals(asaas_read(conn,'/payments/'+p['id']+'/refunds')) for p in selected_rows]
        reserved=sum(held for held, _ in histories)
        historical=sum(seen for _, seen in histories)
        if data.amount>total-reserved or (plan and (reserved!=0 or data.amount!=total or total*100!=row.quote['charged_cents'])):
            fail(409,'Valor indisponível para estorno. O parcelamento exige o total integral confirmado.')
        target=row.installment_id if plan else data.payment_id
        previous=(row.refunds or {}).get(target)
        if previous:
            op=db.scalar(select(m.AsaasNativeOperation).where(m.AsaasNativeOperation.school_id==row.school_id,m.AsaasNativeOperation.client_key==previous['key']))
            if op and op.status!='failed' and int(historical*100)<previous['expected_cents']:
                fail(409,'O estorno anterior ainda não foi conciliado no Asaas.')
        row.refunds={**(row.refunds or {}),target:{'key':data.client_key,'expected_cents':int((historical+data.amount)*100)}}
    def dispatch():
        target=row.installment_id if plan else data.payment_id
        path=('/installments/' if plan else '/payments/')+target+'/refund'
        response=asaas_request(conn,'POST',path,payload=({} if plan else {'value':float(data.amount),'description':data.description}))
        if response.get('id')!=target:raise IntegrationFailure('CARD_REFUND_UNCONFIRMED',uncertain=True)
        return {'id':target}
    from .asaas_native import operation_output
    op=run_asaas_operation(db,school,user,conn,client_key=data.client_key,kind='card_refund',charge_id=row.charge_id,
        fingerprint_data={'checkout':row.id,'payment':data.payment_id,'amount':format(data.amount,'.2f'),'description':data.description.strip()},preflight=preflight,execute=dispatch)
    enqueue(db,row.school_id,'asaas_card_sync',{'checkout_id':row.id},'card-refund-sync:'+op.id,conn.id)
    audit(db,request,user,'asaas.card.refund',row,row.school_id,{'payment':data.payment_id,'amount':str(data.amount),'reason':data.description})
    return operation_output(op)
