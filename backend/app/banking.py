"""Cobranças internas e ASAAS por escola. Criação não equivale a recebimento."""
import calendar
from datetime import date
from decimal import Decimal
from urllib.parse import urlsplit
from fastapi import APIRouter, Query, Request
from fastapi.responses import Response
from sqlalchemy import func, select, or_, and_, case
from . import models as m, online_schemas as s
from .common import audit, output
from .db import uid, now
from .schemas import PersonInput
from .security import Actor, DB, Scope, fail, require, scoped, lock_school, check_version
from .integration_core import AsaasProvider, IntegrationFailure, connection, enqueue
from .portal_access import today as school_today

router=APIRouter(prefix='/api/v1/schools/{school_id}',tags=['Cobranças e recebimentos'])
STATUS={'PENDING':'pending','CONFIRMED':'confirmed','RECEIVED':'received','RECEIVED_IN_CASH':'received_external',
        'OVERDUE':'overdue','REFUNDED':'refunded','REFUND_REQUESTED':'refund_requested','REFUND_IN_PROGRESS':'refund_requested',
        'PARTIALLY_REFUNDED':'partially_refunded','CHARGEBACK_REQUESTED':'disputed','CHARGEBACK_DISPUTE':'disputed','AWAITING_CHARGEBACK_REVERSAL':'disputed'}

def charge_output(obj,public=False):
    data=output(obj,('payer_snapshot', 'customer_attempted','payment_attempted','created_by') if public else ('customer_attempted','payment_attempted'))
    data['amount']=format(obj.amount,'.2f')
    data['status']=effective_status(obj)
    data['manual_paid_amount']=format(obj.manual_paid_amount,'.2f') if obj.manual_paid_amount is not None else None
    if public:
        for key in ('client_key','external_reference','remote_customer_id','connection_id','manual_receipt_key','manual_received_by'):data.pop(key,None)
    return data

def effective_status(obj):
    return 'overdue' if obj.collection_mode=='manual' and obj.status=='pending' and obj.due_on<school_today() else obj.status

def effective_status_expression():
    return case((and_(m.BankCharge.collection_mode=='manual',m.BankCharge.status=='pending',m.BankCharge.due_on<school_today()),'overdue'),else_=m.BankCharge.status)

def safe_invoice_url(value):
    if not isinstance(value,str):return ''
    try:
        url=urlsplit(value)
        host=url.hostname or ''
        return value if url.scheme=='https' and not url.username and not url.password and url.port in (None,443) and (host=='asaas.com' or host.endswith('.asaas.com')) else ''
    except ValueError:
        return ''


def charge_query(school_id, status='', q='', admission_id='', due_from=None, due_to=None):
    if due_from and due_to and due_from > due_to:
        fail(422,'O vencimento inicial deve ser anterior ou igual ao final.')
    stmt=select(m.BankCharge).where(m.BankCharge.school_id==school_id)
    if status:stmt=stmt.where(effective_status_expression()==status)
    if admission_id:stmt=stmt.where(m.BankCharge.admission_id==admission_id)
    if due_from:stmt=stmt.where(m.BankCharge.due_on>=due_from)
    if due_to:stmt=stmt.where(m.BankCharge.due_on<=due_to)
    if q.strip():stmt=stmt.where(m.BankCharge.description.icontains(q.strip(),autoescape=True)|m.BankCharge.payer_snapshot['name'].as_string().icontains(q.strip(),autoescape=True))
    return stmt


def queue_charge_sync(db, charge, key=None):
    if charge.collection_mode=='manual' or not charge.connection_id:
        fail(409,'Cobrança interna: registre o recebimento manualmente. Não existe emissão bancária para conciliar.')
    # Todos os gatilhos convergem para uma consulta em andamento por cobrança.
    prefixes = [f'bank-sync:{charge.id}:', f'bank-periodic:{charge.id}:', f'bank-batch:{charge.id}:', f'bank-webhook:{charge.id}:']
    task=db.scalar(select(m.IntegrationJob).where(
        m.IntegrationJob.school_id==charge.school_id,
        m.IntegrationJob.connection_id==charge.connection_id,
        m.IntegrationJob.kind=='bank_sync',
        m.IntegrationJob.status.in_(['pending','retry','processing']),
        or_(*(m.IntegrationJob.dedupe_key.startswith(prefix,autoescape=True) for prefix in prefixes)),
    ).order_by(m.IntegrationJob.created_at).limit(1))
    return task or enqueue(db,charge.school_id,'bank_sync',{'charge_id':charge.id},key or f'bank-sync:{charge.id}:{uid()}',charge.connection_id)


def apply_remote(db,charge,payment,source):
    """Conciliação só aceita o identificador, pagador, referência e valor esperados."""
    if charge.collection_mode=='manual' or not charge.connection_id:raise IntegrationFailure('BANK_MANUAL_CHARGE')
    if not isinstance(payment,dict) or not payment.get('id'):raise IntegrationFailure('BANK_INVALID_PAYMENT')
    if charge.remote_payment_id and payment['id']!=charge.remote_payment_id:raise IntegrationFailure('BANK_PAYMENT_MISMATCH')
    if payment.get('externalReference')!=charge.external_reference:raise IntegrationFailure('BANK_REFERENCE_MISMATCH')
    if charge.remote_customer_id and payment.get('customer')!=charge.remote_customer_id:raise IntegrationFailure('BANK_CUSTOMER_MISMATCH')
    try: amount=Decimal(str(payment['value']))
    except Exception:raise IntegrationFailure('BANK_INVALID_AMOUNT')
    if amount!=charge.amount:raise IntegrationFailure('BANK_VALUE_MISMATCH')
    if payment.get('billingType') not in (None,charge.billing_type,'RECEIVED_IN_CASH'):raise IntegrationFailure('BANK_TYPE_MISMATCH')
    old=charge.status
    state='cancelled' if payment.get('deleted') else STATUS.get(payment.get('status'),'awaiting_review')
    if payment.get('billingType')=='RECEIVED_IN_CASH' and state=='received':state='received_external'
    charge.remote_payment_id=str(payment['id']);charge.remote_customer_id=str(payment.get('customer') or charge.remote_customer_id)
    charge.status=state;charge.last_synced_at=now();charge.version+=1
    charge.invoice_url=safe_invoice_url(payment.get('invoiceUrl',''))
    charge.bank_slip_url=safe_invoice_url(payment.get('bankSlipUrl',''))
    if state not in ('pending','overdue'):
        charge.pix_copy_paste='';charge.pix_image='';charge.pix_expires_at=''
    if old!=state:
        db.add(m.BankEvent(school_id=charge.school_id,charge_id=charge.id,source=source,previous_status=old,status=state,details={'payment_id':charge.remote_payment_id,'amount':str(charge.amount),'remote_status':payment.get('status'),'payment_date':payment.get('paymentDate'),'confirmed_date':payment.get('confirmedDate')}))
    if old!=state and charge.admission_id and state in ('received','refunded','disputed'):
        from .integration_core import admission_notification
        admission=db.get(m.Admission,charge.admission_id)
        if admission:admission_notification(db,admission,'Há uma atualização na cobrança vinculada à sua inscrição.','bank-'+charge.id+'-'+state+'-'+str(charge.version))
    return charge

def payer_for(db,school,data):
    bank_required=data.collection_mode=='provider'
    if data.admission_id:
        obj=scoped(db,m.Admission,data.admission_id,school.id)
        if obj.status in ('draft','withdrawn','rejected'):fail(409,'Cobrança exige inscrição enviada e não encerrada.')
        payer=obj.guardian_snapshot
        if bank_required and not payer.get('cpf'):fail(422,'CPF do pagador ausente. Solicite correção cadastral antes da cobrança bancária.')
        return dict(payer),obj.id,obj.enrollment_id,obj.account_id
    enrollment=scoped(db,m.Enrollment,data.enrollment_id,school.id)
    if enrollment.status in ('cancelled','transferred'):fail(409,'Matrícula encerrada para novas cobranças.')
    person_id=enrollment.financial_person_id
    if not person_id:
        ids=list(db.scalars(select(m.GuardianLink.person_id).where(m.GuardianLink.student_id==enrollment.student_id,m.GuardianLink.school_id==school.id,m.GuardianLink.financial.is_(True),m.GuardianLink.active.is_(True))))
        if len(ids)!=1:fail(422,'Defina um responsável financeiro inequívoco na matrícula.')
        person_id=ids[0]
    person=scoped(db,m.Person,person_id,school.id)
    if bank_required and not person.cpf:fail(422,'CPF do responsável financeiro obrigatório para a cobrança bancária.')
    admission=db.scalar(select(m.Admission).where(m.Admission.enrollment_id==enrollment.id,m.Admission.school_id==school.id))
    # A cobrança é exibida ao portal somente se o pagador corresponder ao responsável da inscrição.
    if admission and (not person.cpf or admission.guardian_snapshot.get('cpf')!=person.cpf):admission=None
    return {**{k:getattr(person,k) for k in ('name','cpf','email','phone','address')},'person_id':person.id},admission.id if admission else None,enrollment.id,admission.account_id if admission else None

@router.post('/bank-charges',status_code=201)
def create_charges(data:s.ChargeInput,db:DB,user:Actor,school:Scope,request:Request):
    require(user,'banking.write');lock_school(db,school.id)
    conn=connection(db,school.id,'asaas') if data.collection_mode=='provider' else None
    payer,admission_id,enrollment_id,account_id=payer_for(db,school,data)
    if conn:
        try:payer['cpf']=PersonInput.cpf_valid(payer.get('cpf'))
        except (ValueError,TypeError):fail(422,'Corrija o CPF do responsável financeiro antes de emitir a cobrança.')
        if not payer['cpf']:fail(422,'CPF do responsável financeiro obrigatório para emissão.')
    results=[]
    expected_keys={data.client_key if data.installment_count==1 else data.client_key+':'+str(i+1) for i in range(data.installment_count)}
    previous_keys=set(db.scalars(select(m.BankCharge.client_key).where(m.BankCharge.school_id==school.id,
        (m.BankCharge.client_key==data.client_key)|m.BankCharge.client_key.startswith(data.client_key+':',autoescape=True))))
    if previous_keys and previous_keys!=expected_keys:
        fail(409,'Esta operação já possui outra quantidade de parcelas. Inicie uma nova cobrança.')
    for index in range(data.installment_count):
        month=data.due_on.month-1+index;year=data.due_on.year+month//12;month=month%12+1
        due=date(year,month,min(data.due_on.day,calendar.monthrange(year,month)[1]))
        key=data.client_key if data.installment_count==1 else data.client_key+':'+str(index+1)
        description=data.description+(f' — {index+1}/{data.installment_count}' if data.installment_count>1 else '')
        if len(description)>500:fail(422,'Reduza a descrição para comportar a identificação das parcelas.')
        previous=db.scalar(select(m.BankCharge).where(m.BankCharge.school_id==school.id,m.BankCharge.client_key==key))
        if previous:
            if (previous.amount,previous.due_on,previous.billing_type,previous.admission_id,previous.enrollment_id,previous.description,previous.required_for_enrollment,previous.collection_mode)!=(data.amount,due,data.billing_type,admission_id,enrollment_id,description,data.required_for_enrollment,data.collection_mode):fail(409,'Chave de operação já utilizada com outros dados.')
            results.append(previous);continue
        ident=uid()
        obj=m.BankCharge(id=ident,school_id=school.id,connection_id=conn.id if conn else None,collection_mode=data.collection_mode,admission_id=admission_id,enrollment_id=enrollment_id,account_id=account_id,payer_snapshot=payer,
            description=description,amount=data.amount,due_on=due,billing_type=data.billing_type,
            required_for_enrollment=data.required_for_enrollment,external_reference=f'pige360:{school.id}:{ident}',client_key=key,created_by=user.id,status='queued' if conn else 'pending')
        db.add(obj);db.flush()
        if conn:
            enqueue(db,school.id,'bank_issue',{'charge_id':obj.id},'bank-issue:'+obj.id,conn.id)
        else:
            db.add(m.BankEvent(school_id=school.id,charge_id=obj.id,source='manual_created',previous_status='',status='pending',details={'amount':format(obj.amount,'.2f'),'due_on':due.isoformat(),'actor_id':user.id}))
        audit(db,request,user,'bank.charge.queued' if conn else 'bank.charge.manual_created',obj,school.id,{'amount':str(obj.amount),'billing_type':obj.billing_type,'collection_mode':obj.collection_mode,'environment':conn.environment if conn else 'internal'})
        results.append(obj)
    return {'items':[charge_output(x) for x in results],'count':len(results),'message':'Cobranças enfileiradas; aguarde emissão pelo worker.' if conn else 'Cobranças internas registradas. Nenhuma emissão foi enviada ao banco.'}

@router.get('/bank-charges')
def charges(db:DB,user:Actor,school:Scope,status:str='',q:str=Query('',max_length=160),admission_id:str='',due_from:date|None=None,due_to:date|None=None,page:int=Query(1,ge=1),page_size:int=Query(30,ge=1,le=100)):
    require(user,'banking.read')
    stmt=charge_query(school.id,status,q,admission_id,due_from,due_to)
    total=db.scalar(select(func.count()).select_from(stmt.subquery()))
    return {'items':[charge_output(x) for x in db.scalars(stmt.order_by(m.BankCharge.due_on,m.BankCharge.created_at).offset((page-1)*page_size).limit(page_size))],'total':total,'page':page,'page_size':page_size}

@router.get('/bank-summary')
def bank_summary(db:DB,user:Actor,school:Scope,status:str='',q:str=Query('',max_length=160),due_from:date|None=None,due_to:date|None=None):
    require(user,'banking.read')
    ids=charge_query(school.id,status,q,due_from=due_from,due_to=due_to).with_only_columns(m.BankCharge.id)
    status_group=effective_status_expression()
    rows=db.execute(select(status_group,func.count(),func.sum(m.BankCharge.amount)).where(m.BankCharge.id.in_(ids)).group_by(status_group))
    return {'items':[{'status':status,'count':count,'amount':format(amount,'.2f')} for status,count,amount in rows], 'note':'Valores nominais das cobranças no filtro selecionado.'}

@router.post('/bank-charges/reconcile')
def reconcile_charges(data:s.Reason,db:DB,user:Actor,school:Scope,request:Request,status:str='',q:str=Query('',max_length=160),due_from:date|None=None,due_to:date|None=None):
    require(user,'banking.write');lock_school(db,school.id)
    conn=connection(db,school.id,'asaas')
    stmt=charge_query(school.id,status,q,due_from=due_from,due_to=due_to).where(
        m.BankCharge.connection_id==conn.id,
        m.BankCharge.status.in_(['pending','overdue','confirmed','uncertain','failed','refund_requested','partially_refunded','disputed','awaiting_review']),
        (m.BankCharge.remote_payment_id.is_not(None))|m.BankCharge.payment_attempted.is_(True),
    )
    count=db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    if count>250:fail(422,'O filtro possui mais de 250 cobranças para conciliar. Reduza o período ou selecione uma situação.')
    tasks=[queue_charge_sync(db,charge) for charge in db.scalars(stmt.order_by(m.BankCharge.due_on,m.BankCharge.id))]
    audit(db,request,user,'bank.reconciliation.queued',conn,school.id,{'reason':data.reason,'count':len(tasks)})
    return {'count':len(tasks),'job_ids':[task.id for task in tasks],'message':f'{len(tasks)} cobrança(s) enviada(s) para conciliação.'}

@router.get('/bank-charges/{id}')
def charge_details(id:str,db:DB,user:Actor,school:Scope):
    require(user,'banking.read');obj=scoped(db,m.BankCharge,id,school.id)
    result=charge_output(obj)
    issue=db.scalar(select(m.IntegrationJob).where(m.IntegrationJob.school_id==school.id,m.IntegrationJob.dedupe_key=='bank-issue:'+obj.id))
    result['issuance']={'status':issue.status,'error_code':issue.error_code,'attempts':issue.attempts} if issue else None
    return result

@router.get('/bank-charges/{id}/events')
def events(id:str,db:DB,user:Actor,school:Scope):
    require(user,'banking.read');obj=scoped(db,m.BankCharge,id,school.id)
    return [output(x) for x in db.scalars(select(m.BankEvent).where(m.BankEvent.charge_id==obj.id,m.BankEvent.school_id==school.id).order_by(m.BankEvent.created_at.desc()))]

@router.post('/bank-charges/{id}/sync')
def sync_charge(id:str,data:s.Reason,db:DB,user:Actor,school:Scope,request:Request):
    require(user,'banking.write');lock_school(db,school.id);obj=scoped(db,m.BankCharge,id,school.id)
    if obj.collection_mode=='manual':fail(409,'Esta cobrança é interna e não possui pagamento bancário para consultar.')
    connection(db,school.id,'asaas')
    task=queue_charge_sync(db,obj)
    audit(db,request,user,'bank.sync.queued',obj,school.id,{'reason':data.reason})
    return {'job_id':task.id,'status':task.status}

@router.post('/bank-charges/{id}/cancel')
def cancel(id:str,data:s.Reason,db:DB,user:Actor,school:Scope,request:Request):
    require(user,'banking.write');lock_school(db,school.id);obj=scoped(db,m.BankCharge,id,school.id)
    if obj.status=='cancelled':return charge_output(obj)
    if obj.collection_mode=='manual' and obj.status not in ('pending','overdue'):
        fail(409,'Cobranças internas já quitadas preservam o histórico e não podem ser canceladas por este fluxo.')
    if obj.status not in ('queued','pending','overdue'):fail(409,'Concilie primeiro. Cobranças confirmadas, recebidas ou incertas não são canceladas por este fluxo.')
    if not obj.remote_payment_id:
        if obj.payment_attempted:fail(409,'Emissão inconclusiva. Concilie antes de cancelar.')
        previous_status=obj.status
        obj.status='cancelled';obj.version+=1
        db.add(m.BankEvent(school_id=school.id,charge_id=obj.id,source='local_cancel',previous_status=previous_status,status='cancelled',details={'reason':data.reason}))
        for job in db.scalars(select(m.IntegrationJob).where(m.IntegrationJob.dedupe_key=='bank-issue:'+obj.id,m.IntegrationJob.status.in_(['pending','retry']))):job.status='cancelled'
    else:
        enqueue(db,school.id,'bank_cancel',{'charge_id':obj.id},'bank-cancel:'+obj.id,obj.connection_id)
    audit(db,request,user,'bank.cancel.requested',obj,school.id,{'reason':data.reason})
    return charge_output(obj)

@router.post('/bank-charges/{id}/authorize-reissue')
def authorize_reissue(id:str,data:s.Reason,db:DB,user:Actor,school:Scope,request:Request):
    """Ação explícita após conferência da conta. Não é uma repetição automática de POST."""
    require(user,'integrations.manage');lock_school(db,school.id);obj=scoped(db,m.BankCharge,id,school.id)
    if obj.collection_mode=='manual':fail(409,'Cobrança interna não é enviada ao banco por reemissão. Crie uma cobrança bancária separada somente após cancelar a interna.')
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

@router.post('/bank-charges/{id}/manual-receipt')
def manual_receipt(id:str,data:s.ManualReceipt,db:DB,user:Actor,school:Scope,request:Request):
    require(user,'banking.write');lock_school(db,school.id);obj=scoped(db,m.BankCharge,id,school.id)
    if obj.collection_mode!='manual' or obj.connection_id or obj.remote_payment_id:
        fail(409,'Esta cobrança foi enviada ao banco. Use a conciliação bancária para confirmar o recebimento.')
    if obj.manual_receipt_key==data.client_key:
        if (obj.manual_paid_amount,obj.manual_paid_on,obj.manual_payment_method,obj.manual_reference)!=(data.amount,data.paid_on,data.payment_method,data.reference):
            fail(409,'Chave de recebimento já utilizada com outros dados.')
        return charge_output(obj)
    check_version(obj,data.version)
    if obj.status not in ('pending','overdue'):fail(409,'Somente cobranças internas em aberto podem receber baixa manual.')
    if data.amount!=obj.amount:fail(422,'Informe o valor integral da cobrança. Baixa parcial, desconto e acréscimo ainda não são suportados; nenhuma quitação foi registrada.')
    if db.scalar(select(m.BankCharge.id).where(m.BankCharge.school_id==school.id,m.BankCharge.manual_receipt_key==data.client_key)):
        fail(409,'Esta chave de recebimento pertence a outra cobrança.')
    old=effective_status(obj)
    obj.manual_paid_amount=data.amount;obj.manual_paid_on=data.paid_on;obj.manual_payment_method=data.payment_method
    obj.manual_reference=data.reference;obj.manual_receipt_key=data.client_key;obj.manual_received_by=user.id
    obj.status='received_external';obj.version+=1
    details={'amount':format(data.amount,'.2f'),'paid_on':data.paid_on.isoformat(),'payment_method':data.payment_method,'reference':data.reference,'actor_id':user.id}
    db.add(m.BankEvent(school_id=school.id,charge_id=obj.id,source='manual_receipt',previous_status=old,status=obj.status,details=details))
    audit(db,request,user,'bank.charge.manual_received',obj,school.id,details)
    return charge_output(obj)

@router.get('/bank-charges/{id}/receipt.pdf')
def manual_receipt_pdf(id:str,db:DB,user:Actor,school:Scope):
    require(user,'banking.read');obj=scoped(db,m.BankCharge,id,school.id)
    if obj.collection_mode!='manual' or obj.status!='received_external' or not obj.manual_paid_on or obj.manual_paid_amount!=obj.amount:
        fail(409,'O comprovante fica disponível após registrar o recebimento integral da cobrança interna.')
    from .documents import render_pdf
    from .school_reports import format_value
    rows=[('Referência da cobrança',obj.id),('Pagador',obj.payer_snapshot.get('name','')),('Descrição',obj.description),
          ('Valor recebido',format_value(obj.manual_paid_amount,'currency')),('Data do recebimento',format_value(obj.manual_paid_on.isoformat(),'date')),
          ('Vencimento',format_value(obj.due_on.isoformat(),'date')),('Meio de recebimento',{'cash':'Dinheiro','pix':'Pix recebido diretamente','transfer':'Transferência','card':'Cartão','other':'Outro'}[obj.manual_payment_method]),
          ('Referência informada',obj.manual_reference)]
    if obj.enrollment_id:
        enrollment=scoped(db,m.Enrollment,obj.enrollment_id,school.id);student=scoped(db,m.Student,enrollment.student_id,school.id)
        person=scoped(db,m.Person,student.person_id,school.id)
        rows.extend([('Aluno',person.name),('Matrícula',enrollment.number)])
    issuer=db.get(m.User,obj.manual_received_by)
    content=render_pdf(school.name,'Comprovante de recebimento',rows,
        note='Recebimento integral registrado pela instituição. Este comprovante não representa conciliação bancária nem substitui documento fiscal.',issuer=issuer.name if issuer else '',db=db)
    return Response(content,media_type='application/pdf',headers={'Content-Disposition':f'attachment; filename="recebimento-{obj.id}.pdf"','Cache-Control':'no-store'})
