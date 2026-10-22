"""Publicação institucional: somente conteúdo público aprovado, sem dados acadêmicos."""
from typing import Literal
from copy import deepcopy
import ipaddress
import re
from urllib.parse import urlsplit
from fastapi import APIRouter, Request, UploadFile, File
from fastapi.responses import Response
from pydantic import Field, field_validator
from sqlalchemy import Boolean, ForeignKey, String, Text, JSON, Integer, LargeBinary, UniqueConstraint, func, select
from sqlalchemy.orm import Mapped, mapped_column
from . import models as m
from .common import audit, output
from .db import Base, Record
from .institution import public_identity
from .schemas import Input
from .website_models import catalog, ASSET_NAMES, ASSET_ROOT, ASSET_PREFIX
from .website_design import WebsiteDesign, RESERVED_PAGES, validate_page_links, public_design
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


def website_for_host(db,host:str,page:str=''):
    requested=normalized_authority(host)
    if not requested:fail(400,'Domínio público inválido.')
    rows=list(db.scalars(select(SchoolWebsite).join(m.School).where(
        SchoolWebsite.enabled.is_(True),m.School.active.is_(True))))
    matches=[row for row in rows if public_origin(row.public_url)==requested]
    if not matches:fail(404,'Nenhum site publicado está associado a este domínio.')
    if len(matches)>1:fail(409,'O domínio está associado a mais de uma escola.')
    return site_data(db,matches[0],page=page)


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
    admission_url:Mapped[str]=mapped_column(String(500),default='')
    brand:Mapped[dict]=mapped_column(JSON,default=dict)
    design:Mapped[dict]=mapped_column(JSON,default=dict)
    draft:Mapped[dict|None]=mapped_column(JSON,nullable=True)
    model_checkpoint:Mapped[dict|None]=mapped_column(JSON,nullable=True)
    published_version:Mapped[int]=mapped_column(Integer,default=0)


class SchoolWebsiteAsset(Record,Base):
    __tablename__='school_website_assets'
    __table_args__=(UniqueConstraint('school_id','sha256'),)
    school_id:Mapped[str]=mapped_column(ForeignKey('schools.id'))
    sha256:Mapped[str]=mapped_column(String(64))
    content:Mapped[bytes]=mapped_column(LargeBinary)


def image_urls(value):
    if isinstance(value,dict):
        if 'url' in value and 'focal_x' in value:yield value['url']
        for child in value.values():yield from image_urls(child)
    elif isinstance(value,list):
        for child in value:yield from image_urls(child)


def check_asset_ownership(db,school_id,design):
    for url in image_urls(design):
        if url.startswith(ASSET_PREFIX) and url not in {ASSET_PREFIX+name+'.jpg' for name in ASSET_NAMES}:
            fail(422,'Imagem demonstrativa desconhecida. Escolha um arquivo do catálogo.')
        if '/website-assets/' not in url:continue
        match=re.fullmatch(r'/api/v1/public/schools/([0-9a-f-]{36})/website-assets/([0-9a-f-]{36})',url)
        if not match or match[1]!=school_id:fail(422,'A imagem pertence a outra escola ou tem endereço inválido.')
        obj=db.get(SchoolWebsiteAsset,match[2])
        if not obj or obj.school_id!=school_id:fail(422,'Imagem do site não encontrada nesta escola.')


@router.post('/schools/{school_id}/website/assets',status_code=201)
def upload_website_asset(db:DB,user:Actor,school:Scope,request:Request,image:UploadFile=File(...)):
    """Uploaded photos remain private until referenced by the published design."""
    import hashlib
    import io
    from PIL import Image, ImageOps, UnidentifiedImageError
    require(user,'schools.manage');lock_school(db,school.id)
    raw=image.file.read(4*1024*1024+1)
    if not raw or len(raw)>4*1024*1024:fail(422,'Envie uma imagem de até 4 MB.')
    try:
        with Image.open(io.BytesIO(raw)) as source:
            if source.format not in {'PNG','JPEG','WEBP'} or source.width*source.height>16_000_000:
                fail(422,'Use PNG, JPEG ou WebP de até 16 megapixels.')
            source.load()
            normal=ImageOps.exif_transpose(source).convert('RGB')
            normal.thumbnail((2400,2400),Image.Resampling.LANCZOS)
            target=io.BytesIO();normal.save(target,format='PNG',optimize=True)
        content=target.getvalue()
    except (UnidentifiedImageError,OSError,ValueError,Image.DecompressionBombError):
        fail(422,'Imagem inválida. Use PNG, JPEG ou WebP.')
    if len(content)>3*1024*1024:fail(422,'A imagem normalizada supera 3 MB. Reduza as dimensões.')
    digest=hashlib.sha256(content).hexdigest()
    obj=db.scalar(select(SchoolWebsiteAsset).where(SchoolWebsiteAsset.school_id==school.id,SchoolWebsiteAsset.sha256==digest))
    if not obj:
        count=db.scalar(select(func.count()).select_from(SchoolWebsiteAsset).where(SchoolWebsiteAsset.school_id==school.id))
        if count>=100:fail(422,'Limite de 100 imagens do site atingido. Reutilize uma imagem já enviada.')
        obj=SchoolWebsiteAsset(school_id=school.id,sha256=digest,content=content);db.add(obj);db.flush()
        audit(db,request,user,'website.asset_uploaded',obj,school.id)
    return {'id':obj.id,'url':f'/api/v1/public/schools/{school.id}/website-assets/{obj.id}','alt':'','caption':'','focal_x':50,'focal_y':50}


@router.get('/schools/{school_id}/website/assets')
def list_website_assets(db:DB,user:Actor,school:Scope):
    require(user,'schools.manage')
    import base64
    import io
    from PIL import Image
    rows=db.scalars(select(SchoolWebsiteAsset).where(SchoolWebsiteAsset.school_id==school.id).order_by(SchoolWebsiteAsset.created_at.desc()).limit(100).execution_options(yield_per=5))
    items=[]
    for obj in rows:
        with Image.open(io.BytesIO(obj.content)) as source:
            source.thumbnail((120,90),Image.Resampling.LANCZOS)
            target=io.BytesIO();source.convert('P',palette=Image.Palette.ADAPTIVE,colors=64).save(target,format='PNG',optimize=True)
        thumb=target.getvalue()
        thumbnail='data:image/png;base64,'+base64.b64encode(thumb).decode('ascii') if len(thumb)<=20*1024 else ''
        items.append({'id':obj.id,'sha256':obj.sha256,'created_at':obj.created_at,'url':f'/api/v1/public/schools/{school.id}/website-assets/{obj.id}','thumbnail':thumbnail})
    return {'items':items}


@router.delete('/schools/{school_id}/website/assets/{asset_id}')
def delete_website_asset(asset_id:str,db:DB,user:Actor,school:Scope,request:Request):
    require(user,'schools.manage');lock_school(db,school.id)
    obj=db.get(SchoolWebsiteAsset,asset_id)
    if not obj or obj.school_id!=school.id:fail(404,'Imagem não encontrada nesta escola.')
    url=f'/api/v1/public/schools/{school.id}/website-assets/{asset_id}'
    row=db.scalar(select(SchoolWebsite).where(SchoolWebsite.school_id==school.id))
    references=set(image_urls(row.design or {})) | set(image_urls(row.draft or {})) | set(image_urls(row.model_checkpoint or {})) if row else set()
    for post in db.scalars(select(SchoolCommunityPost).where(SchoolCommunityPost.school_id==school.id)):
        references.update(image_urls(post.image or {}))
    if url in references:fail(409,'A imagem está em uso no site, rascunho, checkpoint ou publicação. Remova a referência antes de excluir.')
    audit(db,request,user,'website.asset_deleted',obj,school.id)
    db.delete(obj)
    return {'deleted':True}


@router.get('/public/schools/{school_id}/website-assets/{asset_id}')
def public_website_asset(school_id:str,asset_id:str,db:DB):
    school=db.get(m.School,school_id)
    row=db.scalar(select(SchoolWebsite).where(SchoolWebsite.school_id==school_id,SchoolWebsite.enabled.is_(True)))
    url=f'/api/v1/public/schools/{school_id}/website-assets/{asset_id}'
    if not school or not school.active:fail(404,'Imagem não publicada.')
    visible_design=public_design(row.design) if row else {}
    referenced=url in set(image_urls(visible_design))
    if not referenced:
        referenced=any(url in set(image_urls(post.image or {})) for post in db.scalars(visible_query(school_id,['public'])))
    if not referenced:fail(404,'Imagem não publicada.')
    obj=db.get(SchoolWebsiteAsset,asset_id)
    if not obj or obj.school_id!=school_id:fail(404,'Imagem não encontrada.')
    return Response(obj.content,media_type='image/png',headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'})


def inline_preview_assets(db,school_id,payload):
    import base64
    import html
    import io
    from PIL import Image
    result=payload['html']
    budget=0
    urls=set(image_urls(payload['website'].get('design') or {}))
    urls.update(image_urls(payload.get('posts',[])))
    for url in urls:
        demo=re.fullmatch(re.escape(ASSET_PREFIX)+r'([a-z]+)\.jpg',url)
        if demo and demo[1] in ASSET_NAMES:
            encoded=base64.b64encode((ASSET_ROOT/(demo[1]+'.jpg')).read_bytes()).decode('ascii');budget+=len(encoded)
            if budget>16*1024*1024:fail(422,'A prévia excede 16 MB de imagens.')
            result=result.replace('src="'+html.escape(url,quote=True)+'"','src="data:image/jpeg;base64,'+encoded+'"')
            continue
        match=re.fullmatch(r'/api/v1/public/schools/([0-9a-f-]{36})/website-assets/([0-9a-f-]{36})',url)
        if not match or match[1]!=school_id:continue
        obj=db.get(SchoolWebsiteAsset,match[2])
        if obj and obj.school_id==school_id:
            with Image.open(io.BytesIO(obj.content)) as source:
                source.thumbnail((1200,1200),Image.Resampling.LANCZOS)
                target=io.BytesIO();source.save(target,format='PNG',optimize=True)
            encoded=base64.b64encode(target.getvalue()).decode('ascii');budget+=len(encoded)
            if budget>16*1024*1024:fail(422,'A prévia excede 16 MB de imagens. Reduza as dimensões das fotos.')
            value='data:image/png;base64,'+encoded
            result=result.replace('src="'+html.escape(url,quote=True)+'"','src="'+value+'"')
    return result


class WebsiteBrand(Input):
    display_name:str=Field(default='',max_length=180)
    primary_color:str=Field(default='',pattern=r'^(#[0-9a-fA-F]{6})?$')
    secondary_color:str=Field(default='',pattern=r'^(#[0-9a-fA-F]{6})?$')
    font_family:Literal['','system','serif','sans']=''


class WebsiteInput(Input):
    confirm_demonstration:bool=False
    version:int|None=Field(default=None,ge=1)
    enabled:bool=False
    theme:Literal['horizon','editorial','campus','culture']='horizon'
    headline:str=Field(default='',max_length=180)
    introduction:str=Field(default='',max_length=500)
    about:str=Field(default='',max_length=10000)
    public_url:str=Field(default='',max_length=500)
    portal_url:str=Field(default='',max_length=500)
    notice:str=Field(default='',max_length=1000)
    admission_url:str=Field(default='',max_length=500)
    brand:WebsiteBrand=Field(default_factory=WebsiteBrand)
    design:WebsiteDesign=Field(default_factory=WebsiteDesign)

    @field_validator('public_url')
    @classmethod
    def public_url_origin(cls,value):
        if not value:return ''
        if not public_origin(value):
            raise ValueError('Informe somente a origem HTTPS do domínio público, sem caminho ou parâmetros.')
        return value.rstrip('/')

    @field_validator('portal_url','admission_url')
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


def website_values(data, row=None, *, prefer_draft=False, exclude_enabled=False):
    """Older clients must not erase richer designs they cannot edit."""
    values=data.model_dump(exclude={'version','enabled','confirm_demonstration'} if exclude_enabled else {'version','confirm_demonstration'})
    if 'design' not in data.model_fields_set:
        prior=(row.draft or {}) if row is not None and prefer_draft else {}
        values['design']=prior.get('design', (row.design or {}) if row is not None else {})
    # Bundled fictional photos must never silently lose their demonstration label.
    if any(url.startswith(ASSET_PREFIX) for url in image_urls(values['design'])):
        values['design']={**values['design'],'demonstration':True}
    return values


@router.get('/schools/{school_id}/website')
def read_settings(db:DB,user:Actor,school:Scope):
    require(user,'schools.manage')
    row=db.scalar(select(SchoolWebsite).where(SchoolWebsite.school_id==school.id))
    return {'configuration':website_output(row) if row else None,'themes':['horizon','editorial','campus','culture']}


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
    if data.enabled and re.match(r'^(?:https?://|www\.)',data.headline.strip(),re.I):fail(422,'A chamada principal deve ser um título. Informe o endereço no campo de destino do botão.')
    if data.enabled and (not data.headline.strip() or not data.public_url):fail(422,'Informe chamada principal e domínio público antes de publicar o site.')
    target=public_origin(data.public_url) if data.enabled else None
    if target:
        candidates=db.scalars(select(SchoolWebsite).join(m.School).where(
            SchoolWebsite.school_id!=school.id,SchoolWebsite.enabled.is_(True),m.School.active.is_(True)))
        if any(public_origin(item.public_url)==target for item in candidates):
            fail(409,'Este domínio já está associado a outra escola ativa.')
    values=website_values(data,row,prefer_draft=False)
    check_asset_ownership(db,school.id,values['design'])
    if data.enabled:
        if values['design'].get('demonstration') and not data.confirm_demonstration:
            fail(422,'Este site contém conteúdo demonstrativo. Revise os exemplos e confirme explicitamente a publicação demonstrativa.')
        try:validate_page_links(values['design'])
        except ValueError as error:fail(422,str(error))
    for key,value in values.items():setattr(row,key,value)
    if row.id:row.version+=1
    db.flush()
    row.published_version=row.version if row.enabled else 0
    row.draft=None
    db.flush();audit(db,request,user,'website.configured',row,school.id,{'enabled':row.enabled,'theme':row.theme})
    return website_output(row)


def site_data(db,row,preview=False,page=''):
    school=db.get(m.School,row.school_id)
    if (not preview and not row.enabled) or not school or not school.active:fail(404,'Site não publicado.')
    posts=list(db.scalars(visible_query(school.id,['public']).order_by(SchoolCommunityPost.pinned.desc(),SchoolCommunityPost.publish_at.desc()).limit(100)))
    identity=public_identity(db)
    identity.update({key:value for key,value in (row.brand or {}).items() if value})
    payload={'school':{'id':school.id,'name':school.name,'address':school.address,'phone':school.phone,'email':school.email},
        'identity':identity,'website':{key:getattr(row,key) for key in ('theme','headline','introduction','about','public_url','portal_url','notice','admission_url','design')},
        'posts':[post_output(post) for post in sorted(posts,key=lambda p:(p.pinned,p.publish_at),reverse=True)]}
    if not preview:payload['website']['design']=public_design(payload['website']['design'])
    payload['page']=None
    if page:
        if not re.fullmatch(r'[a-z][a-z0-9-]{0,59}',page) or page in RESERVED_PAGES:fail(404,'Página não encontrada.')
        payload['page']=next((item for item in (payload['website']['design'] or {}).get('pages',[]) if item.get('slug')==page),None)
        if payload['page'] is None:fail(404,'Página não publicada.')
    from .website_render import render
    payload['html']=render(payload)
    return payload


@router.get('/public/schools/{school_id}/website')
def published(school_id:str,db:DB,page:str=''):
    row=db.scalar(select(SchoolWebsite).where(SchoolWebsite.school_id==school_id))
    if not row:fail(404,'Site não publicado.')
    return site_data(db,row,page=page)


@router.get('/public/website')
def default_site(db:DB,page:str=''):
    rows=list(db.scalars(select(SchoolWebsite).join(m.School).where(SchoolWebsite.enabled.is_(True),m.School.active.is_(True)).limit(2)))
    if len(rows)!=1:fail(404,'Selecione a escola no serviço de site institucional.')
    return site_data(db,rows[0],page=page)


@router.get('/public/website/by-host')
def public_site_by_host(db:DB,request:Request,page:str=''):
    return website_for_host(db,website_host_header(request),page=page)


@router.get('/internal/website/by-host')
def internal_site_by_host(db:DB,request:Request,page:str=''):
    authorize_website_service(request)
    return website_for_host(db,website_host_header(request),page=page)


@router.get('/internal/website')
def internal_site(db:DB,request:Request,school_id:str='',page:str=''):
    authorize_website_service(request)
    return published(school_id,db,page=page) if school_id else default_site(db,page=page)


@router.put('/schools/{school_id}/website/draft')
def save_draft(data:WebsiteInput,db:DB,user:Actor,school:Scope,request:Request):
    require(user,'schools.manage');lock_school(db,school.id)
    row=db.scalar(select(SchoolWebsite).where(SchoolWebsite.school_id==school.id))
    if row:
        if data.version is None:fail(409,'Recarregue o rascunho antes de salvar.')
        check_version(row,data.version)
        row.version+=1
    else:
        if data.version is not None:fail(409,'Rascunho inexistente. Recarregue a página.')
        row=SchoolWebsite(school_id=school.id);db.add(row)
    values=website_values(data,row,prefer_draft=True,exclude_enabled=True)
    check_asset_ownership(db,school.id,values['design'])
    row.draft=values
    db.flush();audit(db,request,user,'website.draft_saved',row,school.id)
    return website_output(row)


class PublicationInput(Input):
    confirm_demonstration:bool=False
    version:int=Field(ge=1)


@router.post('/schools/{school_id}/website/publish')
def publish_draft(data:PublicationInput,db:DB,user:Actor,school:Scope,request:Request):
    require(user,'schools.manage');lock_school(db,school.id)
    row=db.scalar(select(SchoolWebsite).where(SchoolWebsite.school_id==school.id))
    if not row or not row.draft:fail(409,'Salve um rascunho antes de publicar.')
    check_version(row,data.version)
    return configure(WebsiteInput(**row.draft,enabled=True,version=row.version,confirm_demonstration=data.confirm_demonstration),db,user,school,request)


@router.post('/schools/{school_id}/website/preview')
def preview_draft(data:WebsiteInput,db:DB,user:Actor,school:Scope,page:str=''):
    require(user,'schools.manage')
    existing=db.scalar(select(SchoolWebsite).where(SchoolWebsite.school_id==school.id))
    row=SchoolWebsite(school_id=school.id,**website_values(data,existing,prefer_draft=True))
    check_asset_ownership(db,school.id,row.design or {})
    payload=site_data(db,row,preview=True,page=page)
    return {'html':inline_preview_assets(db,school.id,payload)}


@router.post('/schools/{school_id}/website/unpublish')
def unpublish(data:WebsiteInput,db:DB,user:Actor,school:Scope,request:Request):
    require(user,'schools.manage');lock_school(db,school.id)
    row=db.scalar(select(SchoolWebsite).where(SchoolWebsite.school_id==school.id))
    if not row or data.version is None:fail(409,'Recarregue a configuração antes de retirar a publicação.')
    check_version(row,data.version)
    values=website_values(data,row,prefer_draft=True,exclude_enabled=True)
    check_asset_ownership(db,school.id,values['design'])
    row.draft=values
    row.enabled=False;row.version+=1
    db.flush();audit(db,request,user,'website.unpublished',row,school.id)
    return website_output(row)


@router.get('/schools/{school_id}/website/models')
def website_models(user:Actor,school:Scope):
    require(user,'schools.manage')
    return catalog()


@router.get('/public/website-model-assets/{filename}')
def website_model_asset(filename:str):
    if filename not in {name+'.jpg' for name in ASSET_NAMES}:fail(404,'Imagem demonstrativa não encontrada.')
    return Response((ASSET_ROOT/filename).read_bytes(),media_type='image/jpeg',headers={'Cache-Control':'public, max-age=86400','X-Content-Type-Options':'nosniff'})


def website_output(row):
    return {**output(row,exclude=('model_checkpoint',)), 'has_checkpoint': bool(row.model_checkpoint)}


class ApplyModelInput(Input):
    model_id:Literal['horizon','editorial','culture','campus']
    website:WebsiteInput


class RestoreModelInput(Input):
    version:int=Field(ge=1)


@router.post('/schools/{school_id}/website/apply-model')
def apply_website_model(data:ApplyModelInput,db:DB,user:Actor,school:Scope,request:Request):
    require(user,'schools.manage');lock_school(db,school.id)
    row=db.scalar(select(SchoolWebsite).where(SchoolWebsite.school_id==school.id))
    if row:
        if data.website.version is None:fail(409,'Recarregue o editor antes de aplicar o modelo.')
        check_version(row,data.website.version)
    elif data.website.version is not None:fail(409,'Configuração inexistente. Recarregue o editor.')
    values=website_values(data.website,row,prefer_draft=True,exclude_enabled=True)
    check_asset_ownership(db,school.id,values['design'])
    preset=next(item['website'] for item in catalog()['items'] if item['id']==data.model_id)
    draft={**deepcopy(values),**deepcopy(preset)}
    # Keep independent configuration and institutional pages; the chosen composition
    # replaces only home content in a private draft. Nothing publishes here.
    for key in ('pages','header_sticky','mobile_actions'):
        if key in values['design']:draft['design'][key]=deepcopy(values['design'][key])
    checked=WebsiteInput(**draft)
    draft=website_values(checked,exclude_enabled=True)
    if row is None:
        row=SchoolWebsite(school_id=school.id);db.add(row)
    else:row.version+=1
    if not row.model_checkpoint:row.model_checkpoint=deepcopy(values)
    row.draft=draft
    db.flush();audit(db,request,user,'website.model_applied',row,school.id,{'model_id':data.model_id})
    return website_output(row)


@router.post('/schools/{school_id}/website/restore-model')
def restore_website_model(data:RestoreModelInput,db:DB,user:Actor,school:Scope,request:Request):
    require(user,'schools.manage');lock_school(db,school.id)
    row=db.scalar(select(SchoolWebsite).where(SchoolWebsite.school_id==school.id))
    if not row or not row.model_checkpoint:fail(409,'Nenhum checkpoint de modelo disponível.')
    check_version(row,data.version)
    values=website_values(WebsiteInput(**row.model_checkpoint),exclude_enabled=True)
    check_asset_ownership(db,school.id,values['design'])
    row.draft=values;row.model_checkpoint=None;row.version+=1
    db.flush();audit(db,request,user,'website.model_restored',row,school.id)
    return website_output(row)
