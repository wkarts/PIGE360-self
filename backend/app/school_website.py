"""Publicação institucional: somente conteúdo público aprovado, sem dados acadêmicos."""
from typing import Literal
import ipaddress
import re
from urllib.parse import urlsplit
from fastapi import APIRouter, Request
from pydantic import Field, field_validator
from sqlalchemy import Boolean, ForeignKey, String, Text, select
from sqlalchemy.orm import Mapped, mapped_column
from . import models as m
from .common import audit, output
from .db import Base, Record
from .institution import public_identity
from .schemas import Input
from .security import Actor, DB, Scope, check_version, fail, lock_school, require
from .school_community import SchoolCommunityPost, visible_query, post_output

router=APIRouter(prefix='/api/v1',tags=['Site institucional'])


def normalized_authority(value:str,default_port:int=443):
    """Normalize a Host header or HTTPS origin without accepting URL paths."""
    if not isinstance(value,str) or not value or len(value)>255 or value!=value.strip() or value.endswith(':'):return None
    try:
        parsed=urlsplit('//'+value)
        if parsed.path or parsed.query or parsed.fragment or parsed.username or parsed.password:return None
        host=parsed.hostname
        if not host:return None
        host=host.rstrip('.').encode('idna').decode('ascii').lower()
        port=parsed.port
        if port is None:port=default_port
        if not 1<=port<=65535:return None
        try:host=ipaddress.ip_address(host).compressed
        except ValueError:
            labels=host.split('.')
            if not labels or any(not re.fullmatch(r'[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?',label) for label in labels):return None
        return host,port
    except (UnicodeError,ValueError):return None


def public_origin(value:str):
    try:
        url=urlsplit(value)
        if (url.scheme.lower()!='https' or not url.netloc or url.path not in ('','/')
            or url.query or url.fragment or url.username or url.password):return None
        return normalized_authority(url.netloc)
    except ValueError:return None


def website_for_host(db,host:str):
    requested=normalized_authority(host)
    if not requested:fail(400,'Domínio público inválido.')
    rows=list(db.scalars(select(SchoolWebsite).join(m.School).where(
        SchoolWebsite.enabled.is_(True),m.School.active.is_(True))))
    matches=[row for row in rows if public_origin(row.public_url)==requested]
    if not matches:fail(404,'Nenhum site publicado está associado a este domínio.')
    if len(matches)>1:fail(409,'O domínio está associado a mais de uma escola.')
    return site_data(db,matches[0])


def website_host_header(request:Request):
    values=request.headers.getlist('x-website-host')
    if len(values)!=1:fail(400,'Informe um único domínio de site.')
    return values[0]


def authorize_website_service(request:Request):
    import secrets
    from .config import settings
    token=settings().website_internal_token
    if not token or not secrets.compare_digest(request.headers.get('X-Website-Key',''),token):
        fail(403,'Serviço não autorizado.')


class SchoolWebsite(Record,Base):
    __tablename__='school_websites'
    school_id:Mapped[str]=mapped_column(ForeignKey('schools.id'),unique=True)
    enabled:Mapped[bool]=mapped_column(Boolean,default=False)
    theme:Mapped[str]=mapped_column(String(16),default='horizon')
    headline:Mapped[str]=mapped_column(String(180),default='')
    introduction:Mapped[str]=mapped_column(String(500),default='')
    about:Mapped[str]=mapped_column(Text,default='')
    public_url:Mapped[str]=mapped_column(String(500),default='')
    portal_url:Mapped[str]=mapped_column(String(500),default='')
    notice:Mapped[str]=mapped_column(String(1000),default='')


class WebsiteInput(Input):
    version:int|None=Field(default=None,ge=1)
    enabled:bool=False
    theme:Literal['horizon','editorial','campus']='horizon'
    headline:str=Field(default='',max_length=180)
    introduction:str=Field(default='',max_length=500)
    about:str=Field(default='',max_length=10000)
    public_url:str=Field(default='',max_length=500)
    portal_url:str=Field(default='',max_length=500)
    notice:str=Field(default='',max_length=1000)

    @field_validator('public_url')
    @classmethod
    def public_url_origin(cls,value):
        if not value:return ''
        if not public_origin(value):
            raise ValueError('Informe somente a origem HTTPS do domínio público, sem caminho ou parâmetros.')
        return value.rstrip('/')

    @field_validator('portal_url')
    @classmethod
    def safe_portal_url(cls,value):
        if not value:return ''
        try:
            url=urlsplit(value)
            port=url.port
        except ValueError:
            raise ValueError('Informe uma URL HTTPS pública, sem credenciais ou fragmentos.') from None
        if url.scheme!='https' or not url.hostname or url.username or url.password or url.fragment or (port is not None and not 1<=port<=65535):
            raise ValueError('Informe uma URL HTTPS pública, sem credenciais ou fragmentos.')
        return value.rstrip('/')


@router.get('/schools/{school_id}/website')
def read_settings(db:DB,user:Actor,school:Scope):
    require(user,'schools.manage')
    row=db.scalar(select(SchoolWebsite).where(SchoolWebsite.school_id==school.id))
    return {'configuration':output(row) if row else None,'themes':['horizon','editorial','campus']}


@router.put('/schools/{school_id}/website')
def configure(data:WebsiteInput,db:DB,user:Actor,school:Scope,request:Request):
    require(user,'schools.manage');lock_school(db,school.id)
    row=db.scalar(select(SchoolWebsite).where(SchoolWebsite.school_id==school.id))
    if row:
        if data.version is None:fail(409,'Recarregue a configuração do site.')
        check_version(row,data.version)
    else:
        if data.version is not None:fail(409,'A configuração do site não existe.')
        row=SchoolWebsite(school_id=school.id);db.add(row)
    if data.enabled and (not data.headline or not data.public_url):fail(422,'Informe chamada principal e domínio público antes de publicar o site.')
    target=public_origin(data.public_url) if data.enabled else None
    if target:
        candidates=db.scalars(select(SchoolWebsite).join(m.School).where(
            SchoolWebsite.school_id!=school.id,SchoolWebsite.enabled.is_(True),m.School.active.is_(True)))
        if any(public_origin(item.public_url)==target for item in candidates):
            fail(409,'Este domínio já está associado a outra escola ativa.')
    for key,value in data.model_dump(exclude={'version'}).items():setattr(row,key,value)
    if row.id:row.version+=1
    db.flush();audit(db,request,user,'website.configured',row,school.id,{'enabled':row.enabled,'theme':row.theme})
    return output(row)


def site_data(db,row):
    school=db.get(m.School,row.school_id)
    if not row.enabled or not school or not school.active:fail(404,'Site não publicado.')
    posts=list(db.scalars(visible_query(school.id,['public']).order_by(SchoolCommunityPost.pinned.desc(),SchoolCommunityPost.publish_at.desc()).limit(100)))
    return {'school':{'id':school.id,'name':school.name,'address':school.address,'phone':school.phone,'email':school.email},
        'identity':public_identity(db),'website':{key:getattr(row,key) for key in ('theme','headline','introduction','about','public_url','portal_url','notice')},
        'posts':[post_output(post) for post in sorted(posts,key=lambda p:(p.pinned,p.publish_at),reverse=True)]}


@router.get('/public/schools/{school_id}/website')
def published(school_id:str,db:DB):
    row=db.scalar(select(SchoolWebsite).where(SchoolWebsite.school_id==school_id))
    if not row:fail(404,'Site não publicado.')
    return site_data(db,row)


@router.get('/public/website')
def default_site(db:DB):
    rows=list(db.scalars(select(SchoolWebsite).join(m.School).where(SchoolWebsite.enabled.is_(True),m.School.active.is_(True)).limit(2)))
    if len(rows)!=1:fail(404,'Selecione a escola no serviço de site institucional.')
    return site_data(db,rows[0])


@router.get('/public/website/by-host')
def public_site_by_host(db:DB,request:Request):
    return website_for_host(db,website_host_header(request))


@router.get('/internal/website/by-host')
def internal_site_by_host(db:DB,request:Request):
    authorize_website_service(request)
    return website_for_host(db,website_host_header(request))


@router.get('/internal/website')
def internal_site(db:DB,request:Request,school_id:str=''):
    authorize_website_service(request)
    return published(school_id,db) if school_id else default_site(db)
