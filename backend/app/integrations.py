"""Configurações segregadas, testes explícitos, filas e webhooks autenticados."""
import hashlib
import json
import secrets
from fastapi import APIRouter, Request, Query
from sqlalchemy import select, func
from . import models as m, online_schemas as s
from .security import DB, Actor, Scope, fail, require, scoped, lock_school, check_version
from .common import output, audit
from .db import now, uid
from .integration_core import (seal,unseal,connection,connection_output,
    AsaasProvider,IntegrationFailure,enqueue)

router=APIRouter(prefix='/api/v1/schools/{school_id}',tags=['Integrações e filas'])
hooks=APIRouter(prefix='/api/v1/hooks',tags=['Webhooks autenticados'])

@router.get('/integrations')
def list_connections(db:DB,user:Actor,school:Scope):
    require(user,'integrations.manage')
    return [connection_output(x) for x in db.scalars(select(m.IntegrationConnection).where(m.IntegrationConnection.school_id==school.id,m.IntegrationConnection.provider=='asaas'))]

@router.post('/integrations/{provider}')
def save_connection(provider:str,data:s.ConnectionInput,db:DB,user:Actor,school:Scope,request:Request):
    require(user,'integrations.manage');lock_school(db,school.id)
    if provider != 'asaas':fail(404,'Provider não disponível neste módulo financeiro.')
    if data.config:fail(422,'A conexão ASAAS utiliza endpoints oficiais fixos; não recebe URLs arbitrárias.')
    config={}
    obj=connection(db,school.id,provider,False)
    secret_data=unseal(obj.encrypted_secrets) if obj else {}
    if data.api_key:secret_data['api_key']=data.api_key
    if data.webhook_token:
        if len(data.webhook_token)<32:fail(422,'Use token exclusivo de webhook com ao menos 32 caracteres.')
        secret_data['webhook_token']=data.webhook_token
    if data.enabled and (not secret_data.get('api_key') or not secret_data.get('webhook_token')):fail(422,'Configure API key e token de webhook antes de habilitar.')
    if secret_data.get('api_key') and secret_data.get('api_key')==secret_data.get('webhook_token'):fail(422,'O token do webhook deve ser diferente da API key.')
    if obj:
        if data.version is None:fail(422,'Informe a versão atual da configuração.')
        check_version(obj,data.version)
        if provider=='asaas' and obj.environment!=data.environment and db.scalar(select(m.BankCharge.id).where(m.BankCharge.connection_id==obj.id).limit(1)):
            fail(409,'Não troque sandbox/produção de uma conexão que possui cobranças. Use outra escola/instalação de homologação.')
        obj.version+=1;obj.config=config;obj.environment=data.environment;obj.enabled=data.enabled;obj.last_test_ok=None
    else:
        obj=m.IntegrationConnection(school_id=school.id,provider=provider,config=config,environment=data.environment,enabled=data.enabled);db.add(obj)
    obj.encrypted_secrets=seal(secret_data);db.flush();audit(db,request,user,'integration.configured',obj,school.id,{'provider':provider,'enabled':obj.enabled,'environment':obj.environment})
    return connection_output(obj)

@router.post('/integrations/{provider}/test')
def test_connection(provider:str,db:DB,user:Actor,school:Scope,request:Request):
    require(user,'integrations.manage');obj=connection(db,school.id,provider)
    try:
        if provider=='asaas':AsaasProvider(obj).request('/customers',params={'limit':1})
        else:fail(404,'Provider não disponível neste módulo financeiro.')
        ok=True;code='HTTP_CONTRACT_REACHED'
    except IntegrationFailure as error:ok=False;code=error.code
    obj.last_test_ok=ok;obj.last_test_at=now();audit(db,request,user,'integration.tested',obj,school.id,{'ok':ok,'code':code})
    return {'ok':ok,'code':code,'message':'Endpoint acessível. Isso não substitui a homologação do fluxo completo.' if ok else 'Falha na comunicação. Verifique configuração, chave e logs da integração.'}

@router.get('/integration-jobs')
def jobs(db:DB,user:Actor,school:Scope,status:str='',page:int=Query(1,ge=1),page_size:int=Query(30,ge=1,le=100)):
    require(user,'integrations.manage')
    stmt=select(m.IntegrationJob).where(m.IntegrationJob.school_id==school.id)
    if status:stmt=stmt.where(m.IntegrationJob.status==status)
    return {'items':[output(x,('encrypted_payload',)) for x in db.scalars(stmt.order_by(m.IntegrationJob.created_at.desc()).offset((page-1)*page_size).limit(page_size))],
            'total':db.scalar(select(func.count()).select_from(stmt.subquery())),'page':page,'page_size':page_size}

@router.post('/integration-jobs/{id}/retry')
def retry(id:str,data:s.Reason,db:DB,user:Actor,school:Scope,request:Request):
    require(user,'integrations.manage');lock_school(db,school.id);obj=scoped(db,m.IntegrationJob,id,school.id)
    if obj.status not in ('failed','retry'):fail(409,'Operação incerta não é reenviada automaticamente. Confira o resultado remoto antes de criar novo envio; cobranças têm conciliação própria.')
    if obj.kind=='bank_issue':fail(409,'Utilize Conciliar ou Autorizar reemissão na cobrança para evitar duplicidade.')
    obj.status='pending';obj.attempts=0;obj.available_at=now();obj.error_code='';obj.lease_until=None
    audit(db,request,user,'integration.job.retry',obj,school.id,{'reason':data.reason})
    return output(obj,('encrypted_payload',))

@hooks.post('/{provider}/{connection_id}')
async def webhook(provider:str,connection_id:str,request:Request,db:DB):
    if provider != 'asaas':fail(404,'Webhook não encontrado neste módulo financeiro.')
    conn=db.get(m.IntegrationConnection,connection_id)
    if not conn or not conn.enabled or conn.provider!=provider:fail(404,'Webhook não encontrado.')
    header='asaas-access-token'
    expected=unseal(conn.encrypted_secrets).get('webhook_token','')
    supplied=request.headers.get(header,'')
    if not expected or not secrets.compare_digest(expected,supplied):fail(401,'Autenticação de webhook inválida.')
    raw=await request.body()
    if len(raw)>256_000:fail(413,'Webhook acima do limite permitido.')
    try:payload=json.loads(raw)
    except (ValueError,UnicodeDecodeError):fail(400,'JSON inválido.')
    if not isinstance(payload,dict):fail(400,'Objeto JSON obrigatório.')
    lock_school(db,conn.school_id)
    event=str(payload.get('event') or payload.get('type') or '')[:80]
    if provider=='asaas':
        body=payload.get('payment',{})
        if not isinstance(body,dict):fail(400,'Objeto payment inválido.')
        remote=str(body.get('id') or '')[:160]
        event_id=str(payload.get('id') or '')[:200]
        if not event_id or not event.startswith('PAYMENT_') or not remote:fail(400,'Evento de cobrança inválido.')
    hash=hashlib.sha256(raw).hexdigest()
    existing=db.scalar(select(m.IntegrationWebhook).where(m.IntegrationWebhook.connection_id==conn.id,m.IntegrationWebhook.event_id==event_id))
    if existing:
        if existing.payload_hash!=hash:fail(409,'ID de evento repetido com conteúdo divergente.')
        return {'accepted':True,'duplicate':True}
    record=m.IntegrationWebhook(school_id=conn.school_id,connection_id=conn.id,event_id=event_id,event_type=event,payload_hash=hash,remote_id=remote)
    db.add(record);db.flush()
    if provider=='asaas':
        charge=db.scalar(select(m.BankCharge).where(m.BankCharge.connection_id==conn.id,m.BankCharge.remote_payment_id==remote,m.BankCharge.school_id==conn.school_id))
        if charge:
            enqueue(db,conn.school_id,'bank_sync',{'charge_id':charge.id},'bank-webhook:'+record.id,conn.id);record.status='reconciliation_queued'
        else:record.status='unmatched'
    audit(db,request,None,'integration.webhook.accepted',record,conn.school_id,{'provider':provider,'status':record.status})
    return {'accepted':True,'duplicate':False,'status':record.status}
