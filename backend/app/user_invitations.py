"""Primeiro acesso de User; separado de PortalAccount e da caixa Mailcow."""
import secrets
from datetime import timedelta
from urllib.parse import urlsplit
from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import Field
from sqlalchemy import DateTime, ForeignKey, String, select, update
from sqlalchemy.orm import Mapped, mapped_column
from . import models as m
from .common import audit
from .config import settings
from .db import Base, Record, now
from .schemas import Input
from .security import DB, Actor, Scope, digest, fail, hash_password, lock_school, request_csrf, utc
from .integration_core import enqueue, IntegrationFailure

router=APIRouter(prefix='/api/v1',tags=['Convites de primeiro acesso'])


class UserInvitation(Record,Base):
    __tablename__='user_invitations'
    user_id:Mapped[str]=mapped_column(ForeignKey('users.id'),index=True)
    school_id:Mapped[str]=mapped_column(ForeignKey('schools.id'),index=True)
    token_hash:Mapped[str]=mapped_column(String(64),unique=True)
    email:Mapped[str]=mapped_column(String(254))
    job_id:Mapped[str|None]=mapped_column(ForeignKey('integration_jobs.id'))
    expires_at:Mapped[object]=mapped_column(DateTime(timezone=True))
    used_at:Mapped[object|None]=mapped_column(DateTime(timezone=True))
    revoked_at:Mapped[object|None]=mapped_column(DateTime(timezone=True))


def eligible(db,row):
    user=db.get(m.User,row.user_id);school=db.get(m.School,row.school_id)
    access=db.get(m.SchoolAccess,(row.user_id,row.school_id))
    if not user or not user.active or user.email!=row.email or not school or not school.active or not access or not access.active or access.archived_at:return False
    if access.access_profile_id:
        from .access_models import SchoolAccessProfile
        profile=db.get(SchoolAccessProfile,access.access_profile_id)
        if not profile or not profile.active:return False
    return True


def state(row):
    return 'used' if row.used_at else 'revoked' if row.revoked_at else 'expired' if utc(row.expires_at)<=now() else 'pending'


def latest(db,user_id,school_id):
    return db.scalar(select(UserInvitation).where(UserInvitation.user_id==user_id,UserInvitation.school_id==school_id).order_by(UserInvitation.created_at.desc()).limit(1))


def info(db,user_id,school_id):
    row=latest(db,user_id,school_id)
    if not row:return None
    job=db.get(m.IntegrationJob,row.job_id)
    labels={'pending':'Enfileirado','retry':'Aguardando nova tentativa','processing':'Processando','completed':'Aceito pelo servidor SMTP','failed':'Falha de envio','uncertain':'Resultado SMTP desconhecido; reenvio revoga o link anterior'}
    return {'id':row.id,'state':state(row),'expires_at':row.expires_at,'used_at':row.used_at,'revoked_at':row.revoked_at,
        'delivery_status':job.status if job else 'failed','delivery_label':labels.get(job.status,'Indisponível') if job else 'Indisponível',
        'attempts':job.attempts if job else 0,'error_code':job.error_code if job else '',
        'updated_at':job.updated_at if job else row.updated_at,'can_resend':state(row)!='used' and eligible(db,row)}


def revoke(db,row):
    row.revoked_at=now()
    job=db.get(m.IntegrationJob,row.job_id)
    if job and job.status in {'pending','retry'}:job.status='failed';job.error_code='INVITATION_REVOKED';job.encrypted_payload=''


def issue(db,user,school):
    previous=latest(db,user.id,school.id)
    if previous:
        if previous.used_at:fail(409,'Primeiro acesso já concluído. Use o procedimento de alteração de senha.')
        if utc(previous.created_at)>now()-timedelta(seconds=60):fail(429,'Aguarde 60 segundos para reenviar o convite.')
        revoke(db,previous)
    token=secrets.token_urlsafe(48)
    row=UserInvitation(user_id=user.id,school_id=school.id,email=user.email,token_hash=digest(token),expires_at=now()+timedelta(hours=settings().invitation_hours))
    db.add(row);db.flush()
    origin=(settings().portal_public_url if user.role in {'student','guardian'} and settings().portal_public_url else settings().app_url).rstrip('/')
    url=urlsplit(origin)
    if not url.hostname or url.username or url.password or url.query or url.fragment or url.path not in ('','/') or url.scheme not in ({'https'} if settings().app_env=='production' else {'http','https'}):
        fail(409,'Configure a URL pública segura do gestor antes de enviar convites.')
    # Fragmento não participa do request HTTP nem do Referer. A página o remove.
    link=origin+'/first-access.html#'+token
    from .institution import public_identity
    institution_name=public_identity(db)['display_name']
    job=enqueue(db,school.id,'smtp_email',{'to':user.email,'subject':institution_name+' · Primeiro acesso',
        'text':f'Olá, {user.name}.\n\nConvite de {institution_name}. Você recebeu acesso a {school.name}.\nDefina sua senha: {link}\n\nO link expira em {settings().invitation_hours} horas e só pode ser utilizado uma vez. Se não reconhece este convite, procure a escola.',
        'invitation_id':row.id,'expires_at':row.expires_at.isoformat()},'user-invitation:'+row.id)
    row.job_id=job.id
    return row


class TokenInput(Input):
    token:str|None=Field(default=None,min_length=32,max_length=128)
    invitation_id:str|None=Field(default=None,pattern=r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
class AcceptInput(TokenInput):password:str=Field(min_length=12,max_length=128)


INVITATION_COOKIE='pige_invitation'
INVITATION_COOKIE_PATH='/api/v1/invitations'


def request_token(data,request):
    if data.token:return data.token
    # Cookie é restrito à mesma origem. O contrato anterior com token no corpo permanece.
    request_csrf(request)
    if not data.invitation_id:fail(400,'Convite indisponível. Reabra o link enviado pela escola.')
    token=request.cookies.get(INVITATION_COOKIE+'_'+data.invitation_id,'')
    if not 32<=len(token)<=128:fail(400,'Convite indisponível. Reabra o link enviado pela escola.')
    return token


def invitation_cookie(response,invitation_id,token='',max_age=0):
    response.set_cookie(INVITATION_COOKIE+'_'+invitation_id,token,path=INVITATION_COOKIE_PATH,max_age=max_age,
        secure=settings().cookie_secure or settings().app_env=='production',httponly=True,samesite='strict')


def resolve(db,token):
    row=db.scalar(select(UserInvitation).where(UserInvitation.token_hash==digest(token)))
    if not row or state(row)!='pending' or not eligible(db,row):fail(400,'Convite indisponível. Solicite um novo convite à escola.')
    return row


def resolve_session(db,token,data):
    try:return resolve(db,token)
    except HTTPException as error:
        if error.status_code==400 and not data.token and data.invitation_id:
            # Revogação/consumo em outra aba também encerra o cookie no próximo acesso.
            cleanup=Response();invitation_cookie(cleanup,data.invitation_id)
            error.headers={**(error.headers or {}),'Set-Cookie':cleanup.headers['set-cookie']}
        raise


@router.post('/invitations/inspect')
def inspect(data:TokenInput,db:DB,request:Request,response:Response):
    from .portal import rate_limit
    token=request_token(data,request)
    rate_limit(db,request,'invitation-inspect',digest(token),20)
    row=resolve_session(db,token,data);school=db.get(m.School,row.school_id)
    if data.invitation_id and data.invitation_id!=row.id:fail(400,'Convite indisponível. Reabra o link enviado pela escola.')
    invitation_cookie(response,row.id,token,max_age=max(1,int((utc(row.expires_at)-now()).total_seconds())))
    return {'invitation_id':row.id,'school_name':school.name,'expires_at':row.expires_at,'min_password_length':12}


@router.post('/invitations/accept')
def accept(data:AcceptInput,db:DB,request:Request,response:Response):
    from .portal import rate_limit
    token=request_token(data,request)
    rate_limit(db,request,'invitation-accept',digest(token),10)
    row=resolve_session(db,token,data)
    if data.invitation_id and data.invitation_id!=row.id:fail(400,'Convite indisponível. Reabra o link enviado pela escola.')
    lock_school(db,row.school_id)
    user=db.scalar(select(m.User).where(m.User.id==row.user_id).with_for_update())
    # Revalida depois dos locks e consome por compare-and-set também no SQLite.
    row=db.scalar(select(UserInvitation).where(UserInvitation.id==row.id).with_for_update().execution_options(populate_existing=True))
    if state(row)!='pending' or not eligible(db,row):fail(400,'Convite indisponível. Solicite um novo convite à escola.')
    changed=db.execute(update(UserInvitation).where(UserInvitation.id==row.id,UserInvitation.used_at.is_(None),UserInvitation.revoked_at.is_(None),UserInvitation.expires_at>now()).values(used_at=now()).execution_options(synchronize_session=False)).rowcount
    if changed!=1:fail(400,'Convite indisponível. Solicite um novo convite à escola.')
    user.password_hash=hash_password(data.password);user.version+=1
    db.execute(update(m.AuthSession).where(m.AuthSession.user_id==user.id).values(revoked=True))
    # Qualquer link ainda pendente para esta identidade é invalidado na mesma transação.
    for other in db.scalars(select(UserInvitation).where(UserInvitation.user_id==user.id,UserInvitation.id!=row.id,UserInvitation.used_at.is_(None),UserInvitation.revoked_at.is_(None))):revoke(db,other)
    job=db.get(m.IntegrationJob,row.job_id)
    if job:job.encrypted_payload=''
    audit(db,request,user,'users.invitation_used',row,row.school_id)
    invitation_cookie(response,row.id)
    return {'message':'Senha definida. Entre com seu e-mail e sua nova senha.','login_path':'/'}


@router.post('/schools/{school_id}/users/{user_id}/invitation/{action}')
def administer(user_id:str,action:str,db:DB,user:Actor,school:Scope,request:Request):
    from .user_access import manage,account_access,manageable_role
    manage(user);lock_school(db,school.id)
    target,access=account_access(db,school.id,user_id,True);manageable_role(user,target.role)
    db.scalar(select(m.User).where(m.User.id==target.id).with_for_update())
    row=latest(db,target.id,school.id)
    if not row:fail(409,'Esta conta não tem convite de primeiro acesso nesta instituição.')
    if action=='revoke':revoke(db,row)
    elif action=='resend':
        if not eligible(db,row):fail(409,'Conta ou vínculo inativo. Revise o acesso antes de reenviar.')
        issue(db,target,school)
    else:fail(404,'Ação não encontrada.')
    audit(db,request,user,'users.invitation_'+action,target,school.id)
    return info(db,target.id,school.id)


def validate_email_job(db,payload):
    if not payload.get('invitation_id'):return
    row=db.get(UserInvitation,payload['invitation_id'])
    if not row or state(row)!='pending' or not eligible(db,row):raise IntegrationFailure('INVITATION_UNAVAILABLE')


def revoke_access(db,user_id,school_id):
    for row in db.scalars(select(UserInvitation).where(UserInvitation.user_id==user_id,UserInvitation.school_id==school_id,UserInvitation.used_at.is_(None),UserInvitation.revoked_at.is_(None))):revoke(db,row)
