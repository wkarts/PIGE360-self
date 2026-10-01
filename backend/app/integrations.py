"""Configurações segregadas, testes explícitos, filas e webhooks autenticados."""
import hashlib
import json
import secrets
from datetime import timedelta
from urllib.parse import urlsplit, quote
from pydantic import EmailStr
from fastapi import APIRouter, Request, Query
from sqlalchemy import select, func
from . import models as m, online_schemas as s
from .security import DB, Actor, Scope, fail, require, scoped, lock_school, check_version
from .common import output, audit
from .db import now, uid
from .config import settings
from .schemas import Input
from .banking import queue_charge_sync
from .integration_core import (seal,unseal,connection,connection_output,
    AsaasProvider,IntegrationFailure,enqueue)

router=APIRouter(prefix='/api/v1/schools/{school_id}',tags=['Integrações e filas'])
hooks=APIRouter(prefix='/api/v1/hooks',tags=['Webhooks autenticados'])

BANK_WEBHOOK_EVENTS = ['PAYMENT_CREATED','PAYMENT_UPDATED','PAYMENT_CONFIRMED','PAYMENT_RECEIVED',
    'PAYMENT_OVERDUE','PAYMENT_DELETED','PAYMENT_RESTORED','PAYMENT_REFUNDED',
    'PAYMENT_REFUND_IN_PROGRESS','PAYMENT_PARTIALLY_REFUNDED','PAYMENT_REFUND_DENIED','PAYMENT_RECEIVED_IN_CASH_UNDONE',
    'PAYMENT_CHARGEBACK_REQUESTED','PAYMENT_CHARGEBACK_DISPUTE','PAYMENT_AWAITING_CHARGEBACK_REVERSAL']

class WebhookSetup(Input):
    email: EmailStr


def webhook_url(conn):
    base=settings().app_url.rstrip('/')
    parsed=urlsplit(base)
    if parsed.scheme!='https' or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment:
        fail(409,'O endereço público da aplicação precisa usar HTTPS para receber atualizações do banco. Confira APP_URL na instalação.')
    return base+f'/api/v1/hooks/asaas/{conn.id}'


@router.get('/banking-status')
def banking_status(db:DB,user:Actor,school:Scope):
    require(user,'banking.read')
    conn=connection(db,school.id,'asaas',False)
    result={'provider':'asaas','configured':bool(conn),'enabled':bool(conn and conn.enabled),
        'environment':conn.environment if conn else 'sandbox','last_test_ok':conn.last_test_ok if conn else None,
        'last_test_at':conn.last_test_at if conn else None,'webhook_registered':bool(conn and conn.config.get('webhook_id')),
        'last_webhook_at':None,'pending_jobs':0,'failed_jobs':0,'queue_delayed':False}
    if not conn:return result
    result['last_webhook_at']=db.scalar(select(func.max(m.IntegrationWebhook.created_at)).where(m.IntegrationWebhook.connection_id==conn.id))
    counts=dict(db.execute(select(m.IntegrationJob.status,func.count()).where(m.IntegrationJob.connection_id==conn.id).group_by(m.IntegrationJob.status)).all())
    result['pending_jobs']=sum(counts.get(state,0) for state in ('pending','retry','processing'))
    result['failed_jobs']=sum(counts.get(state,0) for state in ('failed','uncertain'))
    result['queue_delayed']=bool(db.scalar(select(m.IntegrationJob.id).where(m.IntegrationJob.connection_id==conn.id,m.IntegrationJob.status=='pending',m.IntegrationJob.available_at<now()-timedelta(minutes=5)).limit(1)))
    return result


@router.get('/integrations')
def list_connections(db:DB,user:Actor,school:Scope):
    require(user,'integrations.manage')
    return [connection_output(x) for x in db.scalars(select(m.IntegrationConnection).where(m.IntegrationConnection.school_id==school.id,m.IntegrationConnection.provider=='asaas'))]

@router.post('/integrations/{provider}')
def save_connection(provider:str,data:s.ConnectionInput,db:DB,user:Actor,school:Scope,request:Request):
    require(user,'integrations.manage');lock_school(db,school.id)
    if provider != 'asaas':fail(404,'Provider não disponível neste módulo financeiro.')
    if data.config:fail(422,'A conexão ASAAS utiliza endpoints oficiais fixos; não recebe URLs arbitrárias.')
    obj=connection(db,school.id,provider,False)
    config=dict(obj.config or {}) if obj else {}
    secret_data=unseal(obj.encrypted_secrets) if obj else {}
    if data.api_key:secret_data['api_key']=data.api_key
    if data.webhook_token:
        if not 32<=len(data.webhook_token)<=255 or any(c.isspace() for c in data.webhook_token):fail(422,'Use token exclusivo de webhook entre 32 e 255 caracteres, sem espaços.')
        secret_data['webhook_token']=data.webhook_token
    if secret_data.get('api_key') and not secret_data.get('webhook_token'):
        secret_data['webhook_token']=secrets.token_urlsafe(48)
    if data.enabled and (not secret_data.get('api_key') or not secret_data.get('webhook_token')):fail(422,'Configure API key e token de webhook antes de habilitar.')
    if secret_data.get('api_key') and secret_data.get('api_key')==secret_data.get('webhook_token'):fail(422,'O token do webhook deve ser diferente da API key.')
    if obj:
        if data.version is None:fail(422,'Informe a versão atual da configuração.')
        check_version(obj,data.version)
        if provider=='asaas' and obj.environment!=data.environment and db.scalar(select(m.BankCharge.id).where(m.BankCharge.connection_id==obj.id).limit(1)):
            fail(409,'Não troque sandbox/produção de uma conexão que possui cobranças. Use outra escola/instalação de homologação.')
        if obj.environment!=data.environment:
            config={}
        if data.webhook_token or data.api_key:
            config.pop('webhook_id',None)
        credentials_changed=bool(data.api_key) or obj.environment!=data.environment
        obj.version+=1;obj.config=config;obj.environment=data.environment;obj.enabled=data.enabled
        if credentials_changed:obj.last_test_ok=None;obj.last_test_at=None
    else:
        obj=m.IntegrationConnection(school_id=school.id,provider=provider,config=config,environment=data.environment,enabled=data.enabled);db.add(obj)
    obj.encrypted_secrets=seal(secret_data);db.flush();audit(db,request,user,'integration.configured',obj,school.id,{'provider':provider,'enabled':obj.enabled,'environment':obj.environment})
    return connection_output(obj)

@router.post('/integrations/{provider}/test')
def test_connection(provider:str,db:DB,user:Actor,school:Scope,request:Request):
    require(user,'integrations.manage')
    if provider!='asaas':fail(404,'Provedor bancário não disponível.')
    lock_school(db,school.id)
    obj=connection(db,school.id,provider,False)
    if not obj:fail(409,'Salve a configuração antes de testar a conexão.')
    try:
        response=AsaasProvider(obj).request('/customers',params={'limit':1})
        if not isinstance(response.get('data'),list):raise IntegrationFailure('PROVIDER_INVALID_RESPONSE')
        ok=True;code='HTTP_CONTRACT_REACHED'
    except IntegrationFailure as error:ok=False;code=error.code
    obj.last_test_ok=ok;obj.last_test_at=now();audit(db,request,user,'integration.tested',obj,school.id,{'ok':ok,'code':code})
    return {'ok':ok,'code':code,'message':'Conexão com a conta bancária validada.' if ok else 'Não foi possível acessar a conta. Confira a chave da API e o ambiente selecionado.'}

@router.post('/integrations/asaas/webhook')
def setup_bank_webhook(data:WebhookSetup,db:DB,user:Actor,school:Scope,request:Request):
    """Configura apenas o retorno desta conexão, sem alterar outros webhooks da conta."""
    require(user,'integrations.manage');lock_school(db,school.id)
    conn=connection(db,school.id,'asaas')
    url=webhook_url(conn)
    key=unseal(conn.encrypted_secrets).get('webhook_token','')
    if not key:fail(409,'Salve a configuração bancária para gerar o token de retorno.')
    try:
        provider=AsaasProvider(conn)
        listing=provider.request('/webhooks',params={'limit':100})
        if not isinstance(listing.get('data'),list) or listing.get('hasMore'):
            raise IntegrationFailure('WEBHOOK_LIST_INCOMPLETE')
        matches=[item for item in listing['data'] if isinstance(item,dict) and item.get('url')==url]
        if len(matches)>1:raise IntegrationFailure('DUPLICATE_BANK_WEBHOOK')
        payload={'name':'PIGE360 - '+school.name[:100],'url':url,'email':str(data.email),
            'enabled':True,'interrupted':False,'apiVersion':3,'authToken':key,
            'sendType':'SEQUENTIALLY','events':BANK_WEBHOOK_EVENTS}
        existing=matches[0] if matches else None
        if existing and not existing.get('id'):raise IntegrationFailure('WEBHOOK_ID_MISSING')
        result=provider.request('/webhooks/'+quote(str(existing['id']),safe=''),'PUT',payload) if existing else provider.request('/webhooks','POST',payload)
        if not isinstance(result.get('id'),str) or not result['id']:
            raise IntegrationFailure('WEBHOOK_ID_MISSING',uncertain=True)
        conn.config={**conn.config,'webhook_id':result['id'],'webhook_configured_at':now().isoformat()}
        conn.version+=1
        audit(db,request,user,'integration.webhook.configured',conn,school.id,{'provider':'asaas','updated':bool(existing)})
        return {'ok':True,'message':'Atualizações automáticas de pagamento ativadas.','connection':connection_output(conn)}
    except IntegrationFailure as error:
        audit(db,request,user,'integration.webhook.configuration_failed',conn,school.id,{'code':error.code})
        return {'ok':False,'code':error.code,'message':'Não foi possível confirmar a configuração do retorno bancário. Confira a conta e tente novamente; a aplicação procura um retorno existente antes de cadastrar.'}

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
        if not charge and body.get('externalReference'):
            charge=db.scalar(select(m.BankCharge).where(m.BankCharge.connection_id==conn.id,m.BankCharge.school_id==conn.school_id,
                m.BankCharge.external_reference==str(body['externalReference']),m.BankCharge.remote_payment_id.is_(None)))
        if charge:
            queue_charge_sync(db,charge,f'bank-webhook:{charge.id}:{record.id}');record.status='reconciliation_queued'
        else:record.status='unmatched'
    audit(db,request,None,'integration.webhook.accepted',record,conn.school_id,{'provider':provider,'status':record.status})
    return {'accepted':True,'duplicate':False,'status':record.status}
