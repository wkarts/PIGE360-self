"""CNPJ/CEP normalizados, cache e fallback controlado; nunca salva a ficha."""
from datetime import timedelta
from email.utils import parsedate_to_datetime
import re
import secrets
import time
from typing import Literal

import httpx
from fastapi import APIRouter, Request
from pydantic import Field
from sqlalchemy import update
from . import models as m
from .assisted_models import LookupCache, LookupProvider
from .assisted_common import ensure, quota, enabled
from .db import now
from .schemas import Input, PersonInput
from .security import Actor, DB, Scope, require, fail, utc, PERMISSIONS
from .portal import Parent
from .config import settings

router = APIRouter(tags=['Preenchimento assistido'])
# URLs fixas. Não recebe host, URL arbitrária ou credenciais do navegador.
PROVIDERS = {
    'brasilapi_cnpj': ('https://brasilapi.com.br/api/cnpj/v1/{}', 1),
    'cnpjws': ('https://publica.cnpj.ws/cnpj/{}', 21),
    'receitaws': ('https://www.receitaws.com.br/v1/cnpj/{}', 21),
    'viacep': ('https://viacep.com.br/ws/{}/json/', 1),
    'brasilapi_cep': ('https://brasilapi.com.br/api/cep/v2/{}', 1),
}


class LookupInput(Input):
    value: str = Field(min_length=1, max_length=30)


def normalize_key(kind: str, value: str) -> str:
    if kind == 'cnpj':
        try:
            value = PersonInput.cnpj_valid(value)
        except ValueError:
            fail(422, 'Confira os 14 caracteres e os dígitos verificadores do CNPJ.')
        if not value:
            fail(422, 'Informe o CNPJ.')
        return value
    value = re.sub(r'[\s.\-]', '', value)
    if not re.fullmatch(r'[0-9]{8}', value):
        fail(422, 'Informe um CEP com oito dígitos.')
    return value


def clean(value, maximum=180):
    if value is None or isinstance(value, (dict, list, bool)):
        return ''
    return re.sub(r'[\x00-\x1f\x7f]', ' ', str(value)).strip()[:maximum]


def normalized(provider: str, key: str, raw: dict) -> dict:
    data = {}
    if provider in ('viacep', 'brasilapi_cep'):
        if raw.get('erro') or raw.get('error'):
            return {}
        got = re.sub(r'\D', '', clean(raw.get('cep')))
        if got != key:
            return {}
        data = dict(postal_code=key, street=clean(raw.get('logradouro', raw.get('street'))),
            district=clean(raw.get('bairro', raw.get('neighborhood')),120),
            city=clean(raw.get('localidade', raw.get('city')),120), state=clean(raw.get('uf',raw.get('state')),2),
            country='Brasil', ibge_code=clean(raw.get('ibge'),12))
        # Complemento de CEP é uma referência postal, não o apartamento da pessoa.
    elif provider == 'cnpjws':
        est = raw.get('estabelecimento') or {}
        if not isinstance(est, dict) or clean(est.get('cnpj')).upper() != key:
            return {}
        city, state = est.get('cidade') or {}, est.get('estado') or {}
        data = dict(cnpj=key, name=clean(raw.get('razao_social')),trade_name=clean(est.get('nome_fantasia')),
            street=clean(' '.join(filter(None,[clean(est.get('tipo_logradouro')),clean(est.get('logradouro'))]))),
            address_number=clean(est.get('numero'),24), address_complement=clean(est.get('complemento'),120),
            postal_code=re.sub(r'\D','',clean(est.get('cep'))), district=clean(est.get('bairro'),120),
            city=clean(city.get('nome'),120),state=clean(state.get('sigla'),2),country='Brasil',
            phone=clean(clean(est.get('ddd1'))+clean(est.get('telefone1')),32),email=clean(est.get('email'),254),
            registration_status=clean(est.get('situacao_cadastral'),60), opened_on=clean(est.get('data_inicio_atividade'),30),
            legal_nature=clean((raw.get('natureza_juridica') or {}).get('descricao')),
            main_activity=clean((est.get('atividade_principal') or {}).get('descricao')))
    else:
        if raw.get('status') == 'ERROR' or re.sub(r'[.\s/\-]','',clean(raw.get('cnpj'))).upper() != key:
            return {}
        receita = provider == 'receitaws'
        activities = raw.get('atividade_principal') or []
        data = dict(cnpj=key,name=clean(raw.get('nome' if receita else 'razao_social')),
            trade_name=clean(raw.get('fantasia' if receita else 'nome_fantasia')),
            street=clean(raw.get('logradouro')),address_number=clean(raw.get('numero'),24),
            address_complement=clean(raw.get('complemento'),120),district=clean(raw.get('bairro'),120),
            city=clean(raw.get('municipio'),120),state=clean(raw.get('uf'),2),country='Brasil',
            postal_code=re.sub(r'\D','',clean(raw.get('cep'))),email=clean(raw.get('email'),254),
            phone=clean(raw.get('telefone' if receita else 'ddd_telefone_1'),32),
            registration_status=clean(raw.get('situacao' if receita else 'descricao_situacao_cadastral'),60),
            opened_on=clean(raw.get('abertura' if receita else 'data_inicio_atividade'),30),
            legal_nature=clean(raw.get('natureza_juridica')),
            main_activity=clean(activities[0].get('text') if receita and activities and isinstance(activities[0],dict) else raw.get('cnae_fiscal_descricao')))
    if not data.get('name') and 'cnpj' in data:
        return {}
    if not data.get('city') or not data.get('state'):
        if 'cnpj' not in data:
            return {}
    parts = [data.get(k,'') for k in ('street','address_number','address_complement','district','city','state','postal_code')]
    data['address'] = ', '.join(p for p in parts if p)[:400]
    return {k:v for k,v in data.items() if v}


def response(cache, kind: str, stale=False):
    return {'kind':kind,'data':cache.data,'provider':cache.provider,'cached':True,'stale':stale,
        'fetched_at':utc(cache.fetched_at).isoformat() if cache.fetched_at else None,
        'warning':('Dados de cache vencido: confira antes de utilizar.' if stale else 'Confira os dados antes de aplicar à ficha.') + (' A base do provedor pode estar defasada. A data indica nossa consulta, não uma atualização na Receita Federal.' if kind=='cnpj' else '')}


def cooldown(db, provider: str, seconds: int):
    db.execute(update(LookupProvider).execution_options(synchronize_session=False).where(LookupProvider.id==provider).values(available_at=now()+timedelta(seconds=seconds)))
    db.commit()


def fetch_public(url: str):
    # O cliente não segue redirects nem herda proxy do ambiente; host é fixo.
    started=time.monotonic()
    with httpx.Client(timeout=httpx.Timeout(4.0),follow_redirects=False,trust_env=False) as client:
        with client.stream('GET',url,headers={'Accept':'application/json','Accept-Encoding':'identity','User-Agent':'School-Registry-Lookup/1.0'}) as res:
            if res.status_code != 200:
                return res.status_code, res.headers, {}
            body = bytearray()
            for part in res.iter_bytes(chunk_size=16384):
                if time.monotonic()-started>6:raise ValueError('response_timeout')
                body.extend(part)
                if len(body)>512_000:
                    raise ValueError('response_too_large')
            import json
            data=json.loads(body)
            if not isinstance(data,dict):
                raise ValueError('invalid_response')
            return 200,res.headers,data


def lookup(db, kind: str, value: str):
    enabled(db,'lookups_enabled')
    value=normalize_key(kind,value)
    key=kind+':'+value
    cache=ensure(db,LookupCache,key,key=key,data={},provider='',lease_token='')
    if cache.expires_at and utc(cache.expires_at)>now():
        if not cache.data:
            fail(404,'Cadastro não encontrado nos provedores disponíveis. Continue manualmente.')
        return response(cache,kind)
    token=secrets.token_hex(16)
    claim=db.execute(update(LookupCache).execution_options(synchronize_session=False).where(LookupCache.key==key,
        (LookupCache.lease_until.is_(None))|(LookupCache.lease_until<now())).values(lease_token=token,lease_until=now()+timedelta(seconds=30))).rowcount
    db.commit()
    if not claim:
        fail(409,'Esta consulta já está em andamento. Aguarde alguns segundos e consulte novamente.')
    order=['brasilapi_cnpj','cnpjws','receitaws'] if kind=='cnpj' else ['viacep','brasilapi_cep']
    if kind=='cnpj' and not value.isdigit():
        order=['brasilapi_cnpj']  # não mutilar CNPJ alfanumérico em provedores numéricos
    found=False;not_found=0;attempted=0;started=time.monotonic()
    try:
        for provider in order:
            if time.monotonic()-started>13:
                break
            url,interval=PROVIDERS[provider]
            if not db.execute(update(LookupProvider).execution_options(synchronize_session=False).where(LookupProvider.id==provider,
                LookupProvider.available_at<=now()).values(available_at=now()+timedelta(seconds=interval))).rowcount:
                db.commit();continue
            db.commit();attempted+=1
            try:
                status,headers,raw=fetch_public(url.format(value))
                if status==429:
                    delay=60
                    try:
                        v=headers.get('Retry-After','60');delay=int(v) if v.isdigit() else int((parsedate_to_datetime(v)-now()).total_seconds())
                    except (ValueError,TypeError,OverflowError):pass
                    cooldown(db,provider,min(3600,max(60,delay)));continue
                if status==404 or (status==200 and (raw.get('erro') or raw.get('status')=='ERROR')):
                    not_found+=1;continue
                if status!=200:
                    cooldown(db,provider,60);continue
                data=normalized(provider,value,raw)
                if not data:
                    cooldown(db,provider,60);continue
                stamp=now()
                db.execute(update(LookupCache).execution_options(synchronize_session=False).where(LookupCache.key==key,LookupCache.lease_token==token).values(
                    data=data,provider=provider,fetched_at=stamp,expires_at=stamp+timedelta(days=1 if kind=='cnpj' else 30)))
                db.commit();found=True;break
            except (httpx.HTTPError,ValueError,TypeError,KeyError,AttributeError):
                cooldown(db,provider,60)
        cache=db.get(LookupCache,key,populate_existing=True)
        if found:
            result=response(cache,kind);result['cached']=False;return result
        if cache.data and cache.fetched_at and utc(cache.fetched_at)>now()-timedelta(days=7 if kind=='cnpj' else 90):
            return response(cache,kind,True)
        if attempted==len(order) and not_found==attempted:
            db.execute(update(LookupCache).execution_options(synchronize_session=False).where(LookupCache.key==key,LookupCache.lease_token==token).values(data={},expires_at=now()+timedelta(minutes=2)))
            db.commit();fail(404,'Cadastro não encontrado nas bases consultadas. O preenchimento manual continua disponível.')
        fail(503,'Consultas temporariamente indisponíveis ou em limite de uso. Aguarde ou preencha manualmente.')
    finally:
        db.execute(update(LookupCache).execution_options(synchronize_session=False).where(LookupCache.key==key,LookupCache.lease_token==token).values(lease_until=None,lease_token=''))
        db.commit()


@router.post('/api/v1/schools/{school_id}/lookups/{kind}')
def school_lookup(kind:Literal['cnpj','cep'],data:LookupInput,db:DB,user:Actor,school:Scope):
    if not {'people.write','schools.manage'}.intersection(PERMISSIONS.get(user.role,set())):
        fail(403,'Seu perfil não pode preencher cadastros.')
    normalize_key(kind,data.value);quota(db,'lookup:user:'+user.id,60)
    return lookup(db,kind,data.value)


@router.post('/api/v1/institution/lookups/{kind}')
def institution_lookup(kind:Literal['cnpj','cep'],data:LookupInput,db:DB,user:Actor):
    require(user,'schools.manage');normalize_key(kind,data.value);quota(db,'lookup:user:'+user.id,60)
    return lookup(db,kind,data.value)


@router.post('/api/v1/setup/lookups/cnpj')
def setup_lookup(data:LookupInput,db:DB,request:Request):
    install=db.get(m.Installation,1)
    if not install or install.configured:
        fail(404,'Configuração inicial indisponível.')
    if not secrets.compare_digest(request.headers.get('X-Setup-Token',''),settings().setup_token):
        fail(403,'Informe a chave de instalação antes de consultar.')
    normalize_key('cnpj',data.value);quota(db,'lookup:setup',10)
    return lookup(db,'cnpj',data.value)


@router.post('/api/v1/portal/lookups/cep')
def portal_lookup(data:LookupInput,db:DB,account:Parent):
    normalize_key('cep',data.value);quota(db,'lookup:portal:'+account.id,30)
    return lookup(db,'cep',data.value)
