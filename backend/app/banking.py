"""Cobranças ASAAS por escola. Dinheiro usa Decimal; criação não equivale a recebimento."""
import calendar
from datetime import date
from decimal import Decimal
from urllib.parse import urlsplit
from fastapi import APIRouter, Query, Request
from sqlalchemy import func, select
from . import models as m, online_schemas as s
from .common import audit, output
from .db import uid, now
from .security import Actor, DB, Scope, fail, require, scoped, lock_school
from .integration_core import AsaasProvider, IntegrationFailure, connection, enqueue

router=APIRouter(prefix='/api/v1/schools/{school_id}',tags=['Bancário — ASAAS'])
STATUS={'PENDING':'pending','CONFIRMED':'confirmed','RECEIVED':'received','RECEIVED_IN_CASH':'received_external',
        'OVERDUE':'overdue','REFUNDED':'refunded','REFUND_REQUESTED':'refund_requested','REFUND_IN_PROGRESS':'refund_requested',
        'PARTIALLY_REFUNDED':'partially_refunded','CHARGEBACK_REQUESTED':'disputed','CHARGEBACK_DISPUTE':'disputed','AWAITING_CHARGEBACK_REVERSAL':'disputed'}

def charge_output(obj,public=False):
    data=output(obj,('payer_snapshot', 'customer_attempted','payment_attempted','created_by') if public else ('customer_attempted','payment_attempted'))
    data['amount']=format(obj.amount,'.2f')
    if public:
        for key in ('client_key','external_reference','remote_customer_id','connection_id'):data.pop(key,None)
    return data

def safe_invoice_url(value):
    if not isinstance(value,str):return ''
    url=urlsplit(value)
    host=url.hostname or ''
    return value if url.scheme=='https' and not url.username and (host=='asaas.com' or host.endswith('.asaas.com')) else ''

def apply_remote(db,charge,payment,source):
    """Conciliação só aceita o identificador, pagador, referência e valor esperados."""
    if not isinstance(payment,dict) or not payment.get('id'):raise IntegrationFailure('BANK_INVALID_PAYMENT')
    if charge.remote_payment_id and payment['id']!=charge.remote_payment_id:raise IntegrationFailure('BANK_PAYMENT_MISMATCH')
    if payment.get('externalReference')!=charge.external_reference:raise IntegrationFailure('BANK_REFERENCE_MISMATCH')
    if charge.remote_customer_id and payment.get('customer')!=charge.remote_customer_id:raise IntegrationFailure('BANK_CUSTOMER_MISMATCH')
    try: amount=Decimal(str(payment['value']))
    except Exception:raise IntegrationFailure('BANK_INVALID_AMOUNT')
    if amount!=charge.amount:raise IntegrationFailure('BANK_VALUE_MISMATCH')
    if payment.get('billingType') not in (None,charge.billing_type):raise IntegrationFailure('BANK_TYPE_MISMATCH')
    old=charge.status
    state='cancelled' if payment.get('deleted') else STATUS.get(payment.get('status'),'awaiting_review')
    charge.remote_payment_id=str(payment['id']);charge.remote_customer_id=str(payment.get('customer') or charge.remote_customer_id)
    charge.status=state;charge.last_synced_at=now();charge.version+=1
    charge.invoice_url=safe_invoice_url(payment.get('invoiceUrl',''))
    charge.bank_slip_url=safe_invoice_url(payment.get('bankSlipUrl',''))
    if old!=state:
        db.add(m.BankEvent(school_id=charge.school_id,charge_id=charge.id,source=source,previous_status=old,status=state,details={'payment_id':charge.remote_payment_id,'amount':str(charge.amount),'remote_status':payment.get('status'),'payment_date':payment.get('paymentDate'),'confirmed_date':payment.get('confirmedDate')}))
    if old!=state and charge.admission_id and state in ('received','refunded','disputed'):
        from .integration_core import admission_notification
        admission=db.get(m.Admission,charge.admission_id)
        if admission:admission_notification(db,admission,'Há uma atualização na cobrança vinculada à sua inscrição.','bank-'+charge.id+'-'+state+'-'+str(charge.version))
    return charge

def payer_for(db,school,data):
    if data.admission_id:
        obj=scoped(db,m.Admission,data.admission_id,school.id)
        if obj.status in ('draft','withdrawn','rejected'):fail(409,'Cobrança exige inscrição enviada e não encerrada.')
        payer=obj.guardian_snapshot
        if not payer.get('cpf'):fail(422,'CPF do pagador ausente. Solicite correção cadastral antes da cobrança.')
        return dict(payer),obj.id,obj.enrollment_id,obj.account_id
    enrollment=scoped(db,m.Enrollment,data.enrollment_id,school.id)
    if enrollment.status in ('cancelled','transferred'):fail(409,'Matrícula encerrada para novas cobranças.')
    person_id=enrollment.financial_person_id
    if not person_id:
        ids=list(db.scalars(select(m.GuardianLink.person_id).where(m.GuardianLink.student_id==enrollment.student_id,m.GuardianLink.school_id==school.id,m.GuardianLink.financial.is_(True),m.GuardianLink.active.is_(True))))
        if len(ids)!=1:fail(422,'Defina um responsável financeiro inequívoco na matrícula.')
        person_id=ids[0]
    person=scoped(db,m.Person,person_id,school.id)
    if not person.cpf:fail(422,'CPF do responsável financeiro obrigatório para a cobrança.')
    admission=db.scalar(select(m.Admission).where(m.Admission.enrollment_id==enrollment.id,m.Admission.school_id==school.id))
    # A cobrança é exibida ao portal somente se o pagador corresponder ao responsável da inscrição.
    if admission and admission.guardian_snapshot.get('cpf')!=person.cpf:admission=None
    return {k:getattr(person,k) for k in ('name','cpf','email','phone','address')},admission.id if admission else None,enrollment.id,admission.account_id if admission else None

@router.post('/bank-charges',status_code=201)
def create_charges(data:s.ChargeInput,db:DB,user:Actor,school:Scope,request:Request):
    require(user,'banking.write');lock_school(db,school.id)
    conn=connection(db,school.id,'asaas')
    payer,admission_id,enrollment_id,account_id=payer_for(db,school,data)
    results=[]
    for index in range(data.installment_count):
        month=data.due_on.month-1+index;year=data.due_on.year+month//12;month=month%12+1
        due=date(year,month,min(data.due_on.day,calendar.monthrange(year,month)[1]))
        key=data.client_key if data.installment_count==1 else data.client_key+':'+str(index+1)
        previous=db.scalar(select(m.BankCharge).where(m.BankCharge.school_id==school.id,m.BankCharge.client_key==key))
        if previous:
            if (previous.amount,previous.due_on,previous.billing_type,previous.admission_id,previous.enrollment_id)!=(data.amount,due,data.billing_type,admission_id,enrollment_id):fail(409,'Chave de operação já utilizada com outros dados.')
            results.append(previous);continue
        ident=uid()
        obj=m.BankCharge(id=ident,school_id=school.id,connection_id=conn.id,admission_id=admission_id,enrollment_id=enrollment_id,account_id=account_id,payer_snapshot=payer,
            description=data.description+(f' — {index+1}/{data.installment_count}' if data.installment_count>1 else ''),amount=data.amount,due_on=due,billing_type=data.billing_type,
            required_for_enrollment=data.required_for_enrollment,external_reference=f'pige360:{school.id}:{ident}',client_key=key,created_by=user.id)
        db.add(obj);db.flush();enqueue(db,school.id,'bank_issue',{'charge_id':obj.id},'bank-issue:'+obj.id,conn.id)
        audit(db,request,user,'bank.charge.queued',obj,school.id,{'amount':str(obj.amount),'billing_type':obj.billing_type,'environment':conn.environment})
        results.append(obj)
    return {'items':[charge_output(x) for x in results],'count':len(results),'message':'Cobranças enfileiradas; aguarde emissão pelo worker.'}

@router.get('/bank-charges')
def charges(db:DB,user:Actor,school:Scope,status:str='',q:str=Query('',max_length=160),admission_id:str='',page:int=Query(1,ge=1),page_size:int=Query(30,ge=1,le=100)):
    require(user,'banking.read')
    stmt=select(m.BankCharge).where(m.BankCharge.school_id==school.id)
    if status:stmt=stmt.where(m.BankCharge.status==status)
    if admission_id:stmt=stmt.where(m.BankCharge.admission_id==admission_id)
    if q.strip():stmt=stmt.where(m.BankCharge.description.icontains(q.strip(),autoescape=True)|m.BankCharge.payer_snapshot['name'].as_string().icontains(q.strip(),autoescape=True))
    total=db.scalar(select(func.count()).select_from(stmt.subquery()))
    return {'items':[charge_output(x) for x in db.scalars(stmt.order_by(m.BankCharge.due_on,m.BankCharge.created_at).offset((page-1)*page_size).limit(page_size))],'total':total,'page':page,'page_size':page_size}

@router.get('/bank-summary')
def bank_summary(db:DB,user:Actor,school:Scope):
    require(user,'banking.read')
    rows=db.execute(select(m.BankCharge.status,func.count(),func.sum(m.BankCharge.amount)).where(m.BankCharge.school_id==school.id).group_by(m.BankCharge.status))
    return {'items':[{'status':status,'count':count,'amount':format(amount,'.2f')} for status,count,amount in rows], 'note':'Valores nominais das cobranças; não representam saldo bancário, tarifas ou contabilidade.'}

@router.get('/bank-charges/{id}/events')
def events(id:str,db:DB,user:Actor,school:Scope):
    require(user,'banking.read');obj=scoped(db,m.BankCharge,id,school.id)
    return [output(x) for x in db.scalars(select(m.BankEvent).where(m.BankEvent.charge_id==obj.id,m.BankEvent.school_id==school.id).order_by(m.BankEvent.created_at.desc()))]

@router.post('/bank-charges/{id}/sync')
def sync_charge(id:str,data:s.Reason,db:DB,user:Actor,school:Scope,request:Request):
    require(user,'banking.write');lock_school(db,school.id);obj=scoped(db,m.BankCharge,id,school.id)
    connection(db,school.id,'asaas')
    task=enqueue(db,school.id,'bank_sync',{'charge_id':obj.id},f'bank-sync:{obj.id}:{uid()}',obj.connection_id)
    audit(db,request,user,'bank.sync.queued',obj,school.id,{'reason':data.reason})
    return {'job_id':task.id,'status':task.status}

@router.post('/bank-charges/{id}/cancel')
def cancel(id:str,data:s.Reason,db:DB,user:Actor,school:Scope,request:Request):
    require(user,'banking.write');lock_school(db,school.id);obj=scoped(db,m.BankCharge,id,school.id)
    if obj.status=='cancelled':return charge_output(obj)
    if obj.status not in ('queued','pending','overdue'):fail(409,'Concilie primeiro. Cobranças confirmadas, recebidas ou incertas não são canceladas por este fluxo.')
    if not obj.remote_payment_id:
        if obj.payment_attempted:fail(409,'Emissão inconclusiva. Concilie antes de cancelar.')
        obj.status='cancelled';obj.version+=1
        for job in db.scalars(select(m.IntegrationJob).where(m.IntegrationJob.dedupe_key=='bank-issue:'+obj.id,m.IntegrationJob.status.in_(['pending','retry']))):job.status='cancelled'
    else:
        enqueue(db,school.id,'bank_cancel',{'charge_id':obj.id},'bank-cancel:'+obj.id,obj.connection_id)
    audit(db,request,user,'bank.cancel.requested',obj,school.id,{'reason':data.reason})
    return charge_output(obj)

@router.post('/bank-charges/{id}/authorize-reissue')
def authorize_reissue(id:str,data:s.Reason,db:DB,user:Actor,school:Scope,request:Request):
    """Ação explícita após conferência da conta. Não é uma repetição automática de POST."""
    require(user,'integrations.manage');lock_school(db,school.id);obj=scoped(db,m.BankCharge,id,school.id)
    if obj.remote_payment_id or obj.status not in ('uncertain','failed','queued'):fail(409,'A cobrança não está disponível para reemissão.')
    if db.scalar(select(m.IntegrationJob.id).where(m.IntegrationJob.dedupe_key=='bank-issue:'+obj.id,m.IntegrationJob.status=='processing')):fail(409,'Aguarde a operação em andamento.')
    conn=connection(db,school.id,'asaas');provider=AsaasProvider(conn)
    try:existing=provider.find('payments',obj.external_reference)
    except IntegrationFailure as error:fail(503,'Não foi possível conferir a conta: '+error.code)
    if existing:
        apply_remote(db,obj,existing,'manual_reconciliation');return charge_output(obj)
    obj.payment_attempted=False;obj.customer_attempted=False;obj.status='queued';obj.version+=1
    job=db.scalar(select(m.IntegrationJob).where(m.IntegrationJob.dedupe_key=='bank-issue:'+obj.id))
    if job:job.status='pending';job.error_code='';job.attempts=0;job.available_at=now();job.lease_until=None
    else:enqueue(db,school.id,'bank_issue',{'charge_id':obj.id},'bank-issue:'+obj.id,conn.id)
    audit(db,request,user,'bank.reissue.authorized',obj,school.id,{'reason':data.reason,'operator_confirmed_remote_absence':True})
    return charge_output(obj)
