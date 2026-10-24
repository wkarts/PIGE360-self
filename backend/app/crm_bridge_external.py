"""Explicit CRM provider commands. No PIGE BankCharge/payment/admission mutations."""
import hashlib
from fastapi import APIRouter,Request
from pydantic import BaseModel,ConfigDict,Field
from sqlalchemy import select
from sqlalchemy.orm import Session
from . import models as m,crm_bridge as bridge
from .common import audit
from .crm_bridge_contract import ContractError,decode,encode
from .crm_bridge_charge_contract import envelope,validate_receipt,PATHS,provider_for,bb_title
from .crm_bridge_models import CRMBridgeRequest,CRMBridgeExternalRequest
from .db import engine,uid
from .security import Actor,DB,Scope,require,lock_school,scoped,fail
router=APIRouter(prefix='/api/v1/schools/{school_id}/crm-bridge',tags=['CRM opcional'])


def output(row):
    return {'id':row.id,'charge_id':row.charge_id,'invoice_request_id':row.invoice_request_id,'connection_id':row.connection_id,'scope':row.scope,
        'status':row.status,'attempts':row.attempts,'error_code':row.error_code,'receipt':row.receipt,'last_command':row.last_command,
        'provider':provider_for(decode(row.raw_body.encode())['data']),'native_payment_effect_applied':False,'academic_effect_applied':False}


class IssueInput(BaseModel):
    model_config=ConfigDict(extra='forbid',strict=True)
    invoice_request_id:str=Field(min_length=36,max_length=36)
    payer_id:int=Field(ge=1,le=2147483647)
    billing_type:str=Field(pattern=r'^(PIX|BOLETO)$')
    provider:str=Field(default='asaas',pattern=r'^(asaas|banco_brasil)$')
    bb_title:dict[str,str]|None=None


@router.post('/charges',status_code=202)
def queue(data:IssueInput,db:DB,user:Actor,school:Scope,request:Request):
    require(user,'banking.write');lock_school(db,school.id)
    invoice=scoped(db,CRMBridgeRequest,data.invoice_request_id,school.id)
    cfg=bridge.configured(invoice.connection_id,school.id,db)
    original=decode(invoice.raw_body.encode())
    if original['schema_version']!=2 or invoice.scope!=cfg['scope'] or invoice.receipt.get('status')!='invoice_created':fail(409,'Confirme a fatura local v2 no escopo original antes de emitir.')
    native=scoped(db,m.BankCharge,invoice.charge_id,school.id)
    if native.status not in ('pending','overdue','queued'):fail(409,'Cobrança nativa não está pendente.')
    fields={'charge_id':invoice.charge_id,'payer_id':data.payer_id,'billing_type':data.billing_type}
    if data.provider=='banco_brasil':
        try:bb_title(data.bb_title)
        except ContractError:fail(422,'Informe todos os dados do título BB, espécie e aceite explicitamente; juros e descontos não são aceitos.')
        if data.billing_type!='BOLETO' or data.payer_id!=original['data']['client_id']:fail(422,'BB exige boleto e o mesmo ID de cliente da fatura local.')
        fields['bb_title']=data.bb_title
    elif data.bb_title is not None:fail(422,'Dados de título BB não são aceitos para Asaas.')
    old=db.scalar(select(CRMBridgeExternalRequest).where(CRMBridgeExternalRequest.school_id==school.id,CRMBridgeExternalRequest.charge_id==invoice.charge_id))
    if old:
        prior=decode(old.raw_body.encode())['data']
        if old.invoice_request_id!=invoice.id or prior!=fields:fail(409,'Origem externa já fixada. Não altere pagador ou modalidade para reemitir.')
        return output(old)
    event=envelope(invoice.scope,uid(),'issue',fields);raw=encode(event)
    row=CRMBridgeExternalRequest(id=event['event_id'],school_id=school.id,charge_id=invoice.charge_id,invoice_request_id=invoice.id,connection_id=invoice.connection_id,scope=invoice.scope,raw_body=raw.decode(),payload_hash=hashlib.sha256(raw).hexdigest(),status='queued')
    db.add(row);db.flush();audit(db,request,user,'crm.charge.queued',row,school.id)
    return output(row)


@router.get('/charges')
def listing(db:DB,user:Actor,school:Scope):
    require(user,'banking.read')
    return {'items':[output(row) for row in db.scalars(select(CRMBridgeExternalRequest).where(CRMBridgeExternalRequest.school_id==school.id).order_by(CRMBridgeExternalRequest.created_at.desc()).limit(100))]}


@router.get('/charges/{external_id}')
def read(external_id:str,db:DB,user:Actor,school:Scope):
    require(user,'banking.read');return output(scoped(db,CRMBridgeExternalRequest,external_id,school.id))


def accept(row,receipt,event,action):
    validate_receipt(receipt,event,action)
    if receipt['provider']!=provider_for(decode(row.raw_body.encode())['data']):raise ContractError('CHARGE_PROVIDER_MISMATCH')
    if row.request_id and row.request_id!=receipt['request_id']:raise ContractError('CHARGE_MAPPING_CHANGED')
    for key in ('origin_id','remote_id','payment_id'):
        if row.receipt.get(key) is not None and row.receipt[key]!=receipt[key]:raise ContractError('CHARGE_MAPPING_CHANGED')
    if receipt['instrument'] is not None and receipt['instrument']['billing_type']!=decode(row.raw_body.encode())['data']['billing_type']:raise ContractError('INSTRUMENT_TYPE_CHANGED')
    row.request_id=receipt['request_id'];row.receipt=receipt;row.status='observed';row.error_code=''


class CommandInput(BaseModel):
    model_config=ConfigDict(extra='forbid',strict=True)
    recovery_id:str|None=Field(default=None,pattern=r'^[A-Za-z0-9_-]{0,64}$')
    proof_id:int|None=Field(default=None,ge=1,le=2147483647)


@router.post('/charges/{external_id}/{action}')
def command(external_id:str,action:str,data:CommandInput,db:DB,user:Actor,school:Scope,request:Request):
    require(user,'banking.write')
    if action not in ('status','sync','instruments','reconcile'):fail(404,'Comando externo não disponível.')
    expected={'sync':{'recovery_id'},'reconcile':{'proof_id'}}.get(action,set())
    if data.model_fields_set!=expected:fail(422,'Informe somente os campos explícitos deste comando.')
    lock_school(db,school.id)
    row=db.scalar(select(CRMBridgeExternalRequest).where(CRMBridgeExternalRequest.id==external_id,CRMBridgeExternalRequest.school_id==school.id).with_for_update())
    if not row:fail(404,'Origem externa não encontrada nesta escola.')
    if row.status=='queued':fail(409,'Aguarde o primeiro envio; este comando não emite cobranças.')
    cfg=bridge.configured(row.connection_id,school.id,db)
    if cfg['scope']!=row.scope:fail(409,'Escopo alterado; preserve a origem histórica.')
    fields={'charge_id':row.charge_id}
    if action=='sync':
        if provider_for(decode(row.raw_body.encode())['data'])=='banco_brasil' and data.recovery_id!='':fail(422,'BB usa o nosso número imutável; não aceita ID remoto alternativo.')
        fields['recovery_id']=data.recovery_id
    if action=='reconcile':
        if data.proof_id is None or data.proof_id!=row.receipt.get('proof_id'):fail(409,'Selecione a prova canônica observada antes de conciliar.')
        fields['proof_id']=data.proof_id
    event=envelope(row.scope,uid(),action,fields)
    # Bounded call under the row lock. No retry/queue branch exists for these commands.
    try:
        receipt=bridge.send_request(cfg,event['event_id'],encode(event),path=PATHS[action],validator=lambda value:validate_receipt(value,event,action))
        accept(row,receipt,event,action)
        row.last_command={'event_id':event['event_id'],'action':action,'status':'confirmed'}
    except (bridge.DeliveryError,ContractError):
        row.last_command={'event_id':event['event_id'],'action':action,'status':'unconfirmed'}
        row.error_code='CRM_COMMAND_UNCONFIRMED'
    audit(db,request,user,'crm.charge.command',row,school.id,{'action':action,'event_id':event['event_id'],'data':fields,'command_status':row.last_command['status'],'native_payment_effect_applied':False})
    return output(row)


def process_one():
    available=bridge.connections()
    if not available:return False
    with Session(engine,expire_on_commit=False) as db:
        row=db.scalar(select(CRMBridgeExternalRequest).where(CRMBridgeExternalRequest.status=='queued').order_by(CRMBridgeExternalRequest.created_at).with_for_update(skip_locked=True).limit(1))
        if row is None:return False
        cfg=available.get(row.connection_id);raw=row.raw_body.encode();event=decode(raw)
        invoice=db.get(CRMBridgeRequest,row.invoice_request_id);native=db.scalar(select(m.BankCharge).where(m.BankCharge.id==row.charge_id,m.BankCharge.school_id==row.school_id).with_for_update())
        try:
            if not cfg or cfg['scope']!=row.scope or hashlib.sha256(raw).hexdigest()!=row.payload_hash or not invoice or invoice.scope!=row.scope:raise ContractError('CRM_EXTERNAL_SCOPE_CHANGED')
            original=decode(invoice.raw_body.encode())['data']
            if not native or native.status not in ('pending','overdue','queued') or int(native.amount*100)!=original['amount_cents'] or native.due_on.isoformat()!=original['due_date']:raise ContractError('CRM_NATIVE_CHARGE_CHANGED')
            if envelope(row.scope,row.id,'issue',event['data'])!=event:raise ContractError('CRM_EXTERNAL_BODY_CHANGED')
        except ContractError:
            row.status='failed';row.error_code='CRM_EXTERNAL_PREFLIGHT_DENIED';db.commit();return True
        row.status='sending';row.attempts+=1;db.commit()
        # Durable sending checkpoint precedes network. Crash/timeout NEVER auto-resends.
        try:
            receipt=bridge.send_request(cfg,row.id,raw,path=PATHS['issue'],validator=lambda value:validate_receipt(value,event,'issue'))
            row=db.scalar(select(CRMBridgeExternalRequest).where(CRMBridgeExternalRequest.id==row.id).with_for_update())
            accept(row,receipt,event,'issue')
        except (bridge.DeliveryError,ContractError):
            row=db.get(CRMBridgeExternalRequest,row.id);row.status='uncertain';row.error_code='CRM_EXTERNAL_UNCONFIRMED'
        except Exception:
            row=db.get(CRMBridgeExternalRequest,row.id);row.status='uncertain';row.error_code='CRM_EXTERNAL_UNCONFIRMED'
        db.commit();return True
