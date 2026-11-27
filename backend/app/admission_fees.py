"""Taxa opcional da inscrição. Somente a solicitação explícita do titular gera título."""
import hashlib
import hmac
import json
from datetime import timedelta
from sqlalchemy import select
from . import models as m
from .banking import charge_output
from .db import uid
from .integration_core import enqueue
from .portal_access import today
from .schemas import PersonInput
from .security import fail

ELIGIBLE = {'submitted','under_review','changes_requested','waitlisted','approved','enrolled'}


def configure(db,school,campaign,user):
    if not campaign.fee_enabled:
        campaign.fee_amount=None
        campaign.fee_connection_id=None
        campaign.fee_authorized_by=None
        return
    if not campaign.fee_amount or not campaign.fee_connection_id:
        fail(422,'Informe o valor e a conta Asaas da taxa de inscrição.')
    conn=db.get(m.IntegrationConnection,campaign.fee_connection_id)
    if not conn or conn.school_id!=school.id or conn.provider!='asaas' or not conn.enabled:
        fail(422,'Selecione uma conexão Asaas habilitada desta instituição.')
    from .asaas_policy import enabled_for,policy_for
    if not enabled_for(policy_for(conn),campaign.fee_billing_type):
        fail(422,'A forma de pagamento da taxa está desabilitada na conta da escola.')
    # A escola autoriza a emissão. O solicitante da taxa é auditado separadamente com a conta do portal.
    campaign.fee_authorized_by=user.id


def context(db,obj,account):
    campaign=db.get(m.AdmissionCampaign,obj.campaign_id)
    if not campaign or campaign.school_id!=obj.school_id or account.id!=obj.account_id or account.school_id!=obj.school_id:
        fail(404,'Inscrição não encontrada.')
    key='admission-fee:'+obj.id
    charge=db.scalar(select(m.BankCharge).where(m.BankCharge.school_id==obj.school_id,m.BankCharge.client_key==key))
    if charge and (charge.account_id!=account.id or charge.admission_id!=obj.id):
        fail(409,'O vínculo desta taxa requer conferência da Secretaria.')
    guardian = obj.guardian_snapshot or {}
    payer={key:guardian.get(key) for key in ('name','cpf','email','phone','address')}
    # Após a submissão, o CPF ausente pode ser complementado no cadastro autenticado do mesmo titular.
    cpf=payer.get('cpf') or account.cpf
    try: cpf=PersonInput.cpf_valid(cpf)
    except (TypeError,ValueError):cpf=None
    payer['cpf']=cpf
    conn=db.get(m.IntegrationConnection,campaign.fee_connection_id) if campaign.fee_connection_id else None
    from .asaas_policy import enabled_for,policy_for
    valid=bool(conn and conn.school_id==obj.school_id and conn.provider=='asaas' and conn.enabled and
               enabled_for(policy_for(conn),campaign.fee_billing_type))
    message=''
    if not campaign.fee_enabled:message='Este processo não oferece taxa de inscrição.'
    elif obj.status not in ELIGIBLE:message='A taxa está disponível para solicitação após o envio da inscrição, enquanto o protocolo estiver em andamento.'
    elif not cpf:message='Para solicitar a cobrança opcional, complete o CPF do responsável no cadastro.'
    elif not valid or not campaign.fee_authorized_by:message='A conta bancária deste processo está indisponível. Consulte a Secretaria.'
    basis=[obj.id,account.id,obj.number,fmt(campaign.fee_amount),campaign.fee_billing_type,campaign.fee_due_days,
           campaign.fee_connection_id,conn.environment if conn else '',payer.get('cpf'),TERM]
    quote=hashlib.sha256(json.dumps(basis,separators=(',',':')).encode()).hexdigest()
    return campaign,charge,payer,quote,message


TERM='pige360-inscricao-v1'


def fmt(amount):
    return format(amount,'.2f') if amount is not None else None


def fee_view(db,obj,account):
    campaign,charge,_,quote,message=context(db,obj,account)
    return {'enabled':campaign.fee_enabled,'can_issue':not charge and not message,'amount':fmt(charge.amount if charge else campaign.fee_amount),
            'billing_type':charge.billing_type if charge else campaign.fee_billing_type,'due_days':campaign.fee_due_days,
            'required_for_enrollment':False,
            'quote':quote,'charge':charge_output(charge,public=True) if charge else None,
            'message':'Acompanhe a emissão e a confirmação do pagamento.' if charge else message}


def request_fee(db,obj,account,expected):
    campaign,charge,payer,quote,message=context(db,obj,account)
    if charge:
        return fee_view(db,obj,account),charge,False
    if message:fail(409,message)
    if not hmac.compare_digest(quote,expected):fail(409,'O valor ou as condições da taxa mudaram. Atualize a inscrição antes de emitir.')
    ident=uid()
    charge=m.BankCharge(id=ident,school_id=obj.school_id,connection_id=campaign.fee_connection_id,
        collection_mode='provider',admission_id=obj.id,enrollment_id=obj.enrollment_id,account_id=account.id,
        payer_snapshot=payer,description='Taxa de inscrição · '+obj.number,amount=campaign.fee_amount,
        due_on=today()+timedelta(days=campaign.fee_due_days),billing_type=campaign.fee_billing_type,
        required_for_enrollment=False,external_reference=f'pige360:{obj.school_id}:{ident}',
        client_key='admission-fee:'+obj.id,status='queued',created_by=campaign.fee_authorized_by)
    db.add(charge);db.flush()
    enqueue(db,obj.school_id,'bank_issue',{'charge_id':charge.id},'bank-issue:'+charge.id,charge.connection_id)
    return fee_view(db,obj,account),charge,True
