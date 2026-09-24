"""Segredos e transportes. Sem publicação remota ou envio fora dos jobs explícitos."""
import base64
import hashlib
import ipaddress
import json
import re
import socket
from urllib.parse import urlsplit, quote
import httpx
from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy import select
from . import models as m
from .config import settings
from .db import now
from .security import fail

class IntegrationFailure(Exception):
    def __init__(self, code, *, uncertain=False, retryable=False):
        self.code, self.uncertain, self.retryable = code, uncertain, retryable
        super().__init__(code)

def cipher():
    key = settings().integration_encryption_key
    if not key:
        fail(409, 'Configure INTEGRATION_ENCRYPTION_KEY antes de habilitar integrações ou envio de códigos.')
    try: return Fernet(key.encode())
    except (ValueError, TypeError): fail(503, 'Chave de integração inválida. Consulte o administrador.')

def seal(value): return cipher().encrypt(json.dumps(value,ensure_ascii=False,separators=(',',':')).encode()).decode()

def unseal(value):
    if not value: return {}
    try: return json.loads(cipher().decrypt(value.encode()))
    except (InvalidToken, ValueError): raise IntegrationFailure('CREDENTIAL_DECRYPT_FAILED')

def connection(db, school_id, provider, required=True):
    obj = db.scalar(select(m.IntegrationConnection).where(m.IntegrationConnection.school_id==school_id,m.IntegrationConnection.provider==provider))
    if required and (not obj or not obj.enabled): fail(409, f'Integração {provider} desabilitada nesta escola.')
    return obj

def connection_output(obj):
    from .common import output
    result = output(obj, ('encrypted_secrets',))
    secrets = unseal(obj.encrypted_secrets) if obj.encrypted_secrets else {}
    result['api_key_configured'] = bool(secrets.get('api_key'))
    result['webhook_token_configured'] = bool(secrets.get('webhook_token'))
    result['webhook_path'] = f'/api/v1/hooks/{obj.provider}/{obj.id}'
    return result

def validate_connect_config(data):
    allowed={'base_url','instance','send_text_path','connection_state_path','api_key_header','auth_scheme','number_field','text_field','message_id_path','contract_confirmed'}
    if set(data)-allowed: fail(422, 'Configuração Connect API contém campos não reconhecidos.')
    base = str(data.get('base_url','')).rstrip('/')
    parsed = urlsplit(base)
    if parsed.scheme!='https' or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment:
        fail(422, 'Connect API exige URL HTTPS, sem credenciais, query ou fragmento.')
    hosts = {s.strip().lower() for s in settings().connect_allowed_hosts.split(',') if s.strip()}
    if parsed.hostname.lower() not in hosts: fail(422, 'Inclua o hostname exato da Connect API em CONNECT_ALLOWED_HOSTS no .env.')
    if any(x in parsed.path for x in ('..','\\','%')): fail(422,'Caminho base inválido.')
    instance = str(data.get('instance',''))
    if not re.fullmatch(r'[A-Za-z0-9_.-]{1,100}',instance): fail(422,'Identificador de instância inválido.')
    result={'base_url':base,'instance':instance}
    for key in ('send_text_path','connection_state_path'):
        value=str(data.get(key,''))
        if not value.startswith('/') or value.startswith('//') or any(x in value for x in ('..','\\','?','#','%')) or value.count('{instance}')!=1 or re.search(r'[{}]',value.replace('{instance}','')):
            fail(422, f'{key}: informe um caminho relativo contendo {{instance}} uma vez, conforme sua documentação Connect API.')
        result[key]=value
    for key,default in [('api_key_header','apikey'),('number_field','number'),('text_field','text')]:
        value=str(data.get(key,default))
        if not re.fullmatch(r'[A-Za-z][A-Za-z0-9_-]{0,60}',value): fail(422,'Nome de campo/header inválido.')
        result[key]=value
    if result['api_key_header'].lower() in ('host','content-type','content-length','connection','cookie','forwarded','x-forwarded-host','x-forwarded-for'):
        fail(422,'Header reservado não permitido.')
    scheme=str(data.get('auth_scheme',''))
    if scheme not in ('','Bearer'): fail(422,'Esquema permitido: vazio ou Bearer.')
    result['auth_scheme']=scheme
    path=str(data.get('message_id_path','key.id'))
    if not re.fullmatch(r'[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+){0,5}',path): fail(422,'Caminho de identificação da mensagem inválido.')
    result['message_id_path']=path
    result['contract_confirmed']=data.get('contract_confirmed') is True
    return result

def validate_target(url, provider):
    host=urlsplit(url).hostname
    if provider=='asaas':
        if host not in ('api.asaas.com','api-sandbox.asaas.com'): raise IntegrationFailure('UNTRUSTED_BANK_HOST')
        return
    if host not in {s.strip().lower() for s in settings().connect_allowed_hosts.split(',') if s.strip()}:
        raise IntegrationFailure('CONNECT_HOST_NOT_ALLOWED')
    try: addresses=socket.getaddrinfo(host,443,type=socket.SOCK_STREAM)
    except OSError: raise IntegrationFailure('DNS_UNAVAILABLE',retryable=True)
    for address in addresses:
        ip=ipaddress.ip_address(address[4][0])
        if not ip.is_global and not settings().connect_allow_private:
            raise IntegrationFailure('CONNECT_PRIVATE_ADDRESS_BLOCKED')
        if ip.is_unspecified or ip.is_multicast: raise IntegrationFailure('CONNECT_ADDRESS_BLOCKED')

def call_json(provider, base, path, *, method='GET', api_key='', header='access_token', auth_scheme='', data=None, params=None, request_key=''):
    if not path.startswith('/') or path.startswith('//'): raise IntegrationFailure('INVALID_PROVIDER_PATH')
    validate_target(base,provider)
    headers={header:(auth_scheme+' ' if auth_scheme else '')+api_key,'User-Agent':'PIGE360-Self/0.3.0','Accept':'application/json'}
    if request_key: headers['Idempotency-Key']=request_key  # Correlação; não presumir garantia do servidor.
    try:
        with httpx.Client(timeout=httpx.Timeout(settings().integration_timeout_seconds),follow_redirects=False,trust_env=False) as client:
            with client.stream(method,base+path,headers=headers,json=data,params=params) as response:
                status=response.status_code
                if status>=500 or status==429:
                    raise IntegrationFailure(f'PROVIDER_HTTP_{status}',uncertain=method!='GET' and status>=500,retryable=method=='GET' or status==429)
                if not 200<=status<300: raise IntegrationFailure(f'PROVIDER_HTTP_{status}')
                content=bytearray()
                for part in response.iter_bytes():
                    content.extend(part)
                    if len(content)>2_000_000: raise IntegrationFailure('PROVIDER_RESPONSE_TOO_LARGE',uncertain=method!='GET')
                if not content: return {}
                result=json.loads(content)
                if not isinstance(result,dict): raise IntegrationFailure('PROVIDER_INVALID_RESPONSE',uncertain=method!='GET')
                return result
    except httpx.HTTPError:
        raise IntegrationFailure('PROVIDER_NETWORK_ERROR',uncertain=method!='GET',retryable=method=='GET')
    except (json.JSONDecodeError,UnicodeDecodeError):
        raise IntegrationFailure('PROVIDER_INVALID_JSON',uncertain=method!='GET',retryable=method=='GET')

class AsaasProvider:
    def __init__(self,obj):
        self.base = 'https://api.asaas.com/v3' if obj.environment=='production' else 'https://api-sandbox.asaas.com/v3'
        self.key = unseal(obj.encrypted_secrets).get('api_key','')
        if not self.key: raise IntegrationFailure('API_KEY_MISSING')
    def request(self,path,method='GET',data=None,params=None):
        return call_json('asaas',self.base,path,method=method,api_key=self.key,data=data,params=params)
    def find(self,resource,reference):
        result=self.request('/'+resource,params={'externalReference':reference,'limit':100})
        items=result.get('data')
        if not isinstance(items,list): raise IntegrationFailure('INVALID_SEARCH_RESPONSE')
        matches=[i for i in items if isinstance(i,dict) and i.get('externalReference')==reference]
        if len(matches)>1 or result.get('hasMore'): raise IntegrationFailure('DUPLICATE_REMOTE_REFERENCE')
        return matches[0] if matches else None
    def customer(self,payer,reference):
        return self.request('/customers','POST',{'name':payer['name'],'cpfCnpj':payer['cpf'],
            'email':payer.get('email',''),'mobilePhone':payer.get('phone','').removeprefix('55'),
            'externalReference':reference,'notificationDisabled':True})
    def create_payment(self,charge):
        return self.request('/payments','POST',{'customer':charge.remote_customer_id,'billingType':charge.billing_type,
            'value':float(charge.amount),'dueDate':charge.due_on.isoformat(),'description':charge.description,
            'externalReference':charge.external_reference})
    def get_payment(self,id): return self.request('/payments/'+quote(id,safe=''))
    def cancel(self,id): return self.request('/payments/'+quote(id,safe=''),'DELETE')
    def pix(self,id): return self.request('/payments/'+quote(id,safe='')+'/pixQrCode')

class ConnectProvider:
    """Contrato JSON parametrizável. Não lista nem altera instâncias de outras aplicações."""
    def __init__(self,obj):
        self.config=obj.config
        self.key=unseal(obj.encrypted_secrets).get('api_key','')
        if not self.key or not self.config.get('contract_confirmed'): raise IntegrationFailure('CONNECT_CONTRACT_NOT_CONFIGURED')
    def request(self,path,method='GET',data=None,key=''):
        c=self.config
        return call_json('connect_api',c['base_url'],path.format(instance=quote(c['instance'],safe='')),
            method=method,data=data,api_key=self.key,header=c['api_key_header'],auth_scheme=c['auth_scheme'],request_key=key)
    def state(self): return self.request(self.config['connection_state_path'])
    def send(self,number,text,key):
        c=self.config
        response=self.request(c['send_text_path'],'POST',{c['number_field']:number,c['text_field']:text},key)
        value=response
        for part in c['message_id_path'].split('.'):
            value=value.get(part) if isinstance(value,dict) else None
        if not isinstance(value,(str,int)) or not str(value): raise IntegrationFailure('CONNECT_MESSAGE_ID_MISSING',uncertain=True)
        return str(value)[:160]

def enqueue(db,school_id,kind,payload,key,connection_id=None):
    existing=db.scalar(select(m.IntegrationJob).where(m.IntegrationJob.dedupe_key==key))
    if existing:
        if existing.school_id!=school_id or existing.kind!=kind or existing.connection_id!=connection_id or unseal(existing.encrypted_payload)!=payload:
            fail(409,'Chave de idempotência reutilizada para outra operação ou conteúdo.')
        return existing
    task=m.IntegrationJob(school_id=school_id,connection_id=connection_id,kind=kind,dedupe_key=key,encrypted_payload=seal(payload),available_at=now())
    db.add(task);db.flush();return task

def admission_notification(db,admission,text,code):
    account=db.get(m.PortalAccount,admission.account_id)
    if not account.whatsapp_opt_in or not account.phone_verified:
        return None
    from .connect_core import connect_instance_for_school, enqueue_connect_message
    instance = connect_instance_for_school(db, admission.school_id, False)
    if not instance:
        return None
    return enqueue_connect_message(
        db,
        admission.school_id,
        instance.id,
        {'number': account.phone, 'text': text + ' Acompanhe no portal: ' + settings().app_url + '/online.html'},
        f'admission:{admission.id}:{code}:{admission.version}',
    )
