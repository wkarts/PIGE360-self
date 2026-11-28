"""Primeiro acesso de User; separado de PortalAccount e da caixa Mailcow."""
import secrets
from datetime import timedelta
from urllib.parse import urlsplit
from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import EmailStr, Field
from typing import Literal
from sqlalchemy import DateTime, ForeignKey, String, or_, select, update
from sqlalchemy.orm import Mapped, mapped_column
from . import models as m
from .common import audit
from .config import settings
from .db import Base, Record, now
from .schemas import Input
from .security import PORTAL_LOGIN_PATHS, portal_origin, require_portal_role, DB, Actor, Scope, digest, fail, hash_password, lock_school, request_csrf, utc
from .integration_core import cipher, enqueue, IntegrationFailure

router=APIRouter(prefix='/api/v1',tags=['Convites de primeiro acesso'])


class UserInvitation(Record,Base):
    __tablename__='user_invitations'
    purpose:Mapped[str]=mapped_column(String(20),default='first_access',server_default='first_access')
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
    return bool(user and user.email==row.email and active_access(db,user,school))


def active_access(db,user,school):
    if not school or not school.active or not user.active:return False
    access=db.get(m.SchoolAccess,(user.id,school.id))
    if not access or not access.active or access.archived_at:return False
    if access.access_profile_id:
        from .access_models import SchoolAccessProfile
        profile=db.get(SchoolAccessProfile,access.access_profile_id)
        if not profile or not profile.active or profile.school_id!=school.id or profile.base_role!=user.role:return False
    return True


def state(row):
    return 'used' if row.used_at else 'revoked' if row.revoked_at else 'expired' if utc(row.expires_at)<=now() else 'pending'


def latest(db,user_id,school_id,purpose='first_access'):
    return db.scalar(select(UserInvitation).where(UserInvitation.user_id==user_id,UserInvitation.school_id==school_id,UserInvitation.purpose==purpose).order_by(UserInvitation.created_at.desc()).limit(1))


def info(db,user_id,school_id):
    row=latest(db,user_id,school_id)
    if not row:return None
    job=db.get(m.IntegrationJob,row.job_id)
    labels={'pending':'Enfileirado','retry':'Aguardando nova tentativa','processing':'Processando','completed':'Aceito pelo servidor SMTP','failed':'Falha de envio','uncertain':'Resultado SMTP desconhecido; reenvio revoga o link anterior'}
    if job and job.status == 'failed' and job.error_code == 'SMTP_RECIPIENT_REFUSED':
        labels['failed'] = 'Destinatário recusado pelo servidor SMTP'
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
    return enqueue_access_link(db,user,school,'first_access')


def access_link_base(role):
    dedicated = portal_origin(role)
    origin = dedicated or settings().app_url.rstrip('/')
    url = urlsplit(origin)
    schemes = {'https'} if settings().app_env=='production' else {'http','https'}
    if (not url.hostname or url.username or url.password or url.query or url.fragment
            or url.path not in ('','/') or url.scheme not in schemes):
        fail(409,'Configure a origem pública HTTPS da instituição antes de enviar o link de acesso.')
    return origin if dedicated else origin + PORTAL_LOGIN_PATHS.get(role,'')


def enqueue_access_link(db,user,school,purpose):
    reset = purpose == 'password_reset'
    lifetime = timedelta(minutes=30) if reset else timedelta(hours=settings().invitation_hours)
    token = secrets.token_urlsafe(48)
    row = UserInvitation(user_id=user.id,school_id=school.id,email=user.email,token_hash=digest(token),
                         purpose=purpose,expires_at=now()+lifetime)
    db.add(row);db.flush()
    # O segredo fica somente no fragmento e nunca participa da requisição HTTP.
    link = access_link_base(user.role) + '/first-access#' + token
    from .institution import public_identity
    institution_name = public_identity(db)['display_name']
    if reset:
        subject = institution_name+' · Recuperação de senha'
        message = f'Redefina sua senha de acesso a {school.name}: {link}\n\nEste link é válido por 30 minutos e só pode ser utilizado uma vez. Se você não solicitou a mudança, ignore esta mensagem.'
    else:
        subject = institution_name+' · Primeiro acesso'
        message = f'Convite de {institution_name}. Você recebeu acesso a {school.name}.\nDefina sua senha: {link}\n\nO link expira em {settings().invitation_hours} horas e só pode ser utilizado uma vez. Se não reconhece este convite, procure a escola.'
    job=enqueue(db,school.id,'smtp_email',{'to':user.email,'subject':subject,
        'text':f'Olá, {user.name}.\n\n'+message,'invitation_id':row.id,'expires_at':row.expires_at.isoformat()},'user-invitation:'+row.id)
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


class RecoveryRequest(Input):
    email: EmailStr
    portal: Literal['teacher', 'family']


@router.post('/invitations/password-recovery')
def request_recovery(data:RecoveryRequest, db:DB, request:Request):
    from .portal import rate_limit
    request_csrf(request)
    email = str(data.email).lower()
    rate_limit(db,request,'school-password-recovery',email,4,600)
    # A indisponibilidade global é igual para qualquer endereço informado.
    try:
        cipher()
        access_link_base('teacher' if data.portal=='teacher' else 'student')
    except HTTPException:
        fail(503,'Recuperação indisponível. Entre em contato com a secretaria da escola.')
    receipt = {'message':'Se houver uma conta habilitada neste portal, as instruções chegarão ao e-mail cadastrado.'}
    roles = {'teacher'} if data.portal == 'teacher' else {'student','guardian'}
    other_origin = portal_origin('student' if data.portal=='teacher' else 'teacher')
    if other_origin and request.headers.get('origin','').rstrip('/')==other_origin:
        return receipt
    target = db.scalar(select(m.User).where(m.User.email==email,m.User.active.is_(True),m.User.role.in_(roles)))
    if not target:
        return receipt
    school_id = recovery_school_id(db,target)
    if school_id is None:
        return receipt
    school = lock_school(db,school_id)
    target = db.scalar(select(m.User).where(m.User.id==target.id).with_for_update().execution_options(populate_existing=True))
    if not target or not target.active or target.email!=email or target.role not in roles:
        return receipt
    if active_access(db,target,school) and can_recover(db,target,school):
        recovery_link(db,target,school)
    return receipt


def recovery_school_id(db,user):
    """A senha é da identidade. Uma única escola habilitada envia o e-mail."""
    from .access_models import SchoolAccessProfile
    first = select(UserInvitation.id).where(UserInvitation.user_id==user.id,
        UserInvitation.school_id==m.School.id,UserInvitation.purpose=='first_access')
    logged_in = select(m.AuthSession.id).where(m.AuthSession.user_id==user.id).exists()
    return db.scalar(select(m.School.id).join(m.SchoolAccess).outerjoin(SchoolAccessProfile,
        (SchoolAccessProfile.id==m.SchoolAccess.access_profile_id) & (SchoolAccessProfile.school_id==m.School.id)
        & (SchoolAccessProfile.base_role==user.role)).where(
            m.SchoolAccess.user_id==user.id,m.School.active.is_(True),m.SchoolAccess.active.is_(True),
            m.SchoolAccess.archived_at.is_(None),or_(m.SchoolAccess.access_profile_id.is_(None),
                                                   SchoolAccessProfile.active.is_(True)),
            or_(logged_in,~first.exists(),first.where(UserInvitation.used_at.is_not(None)).exists())
        ).order_by(m.School.id).limit(1))


def can_recover(db,user,school):
    first = latest(db,user.id,school.id)
    return not first or first.used_at or db.scalar(select(m.AuthSession.id).where(m.AuthSession.user_id==user.id).limit(1))


def recovery_link(db,user,school,resend=False):
    previous = db.scalar(select(UserInvitation).where(UserInvitation.user_id==user.id,
        UserInvitation.purpose=='password_reset',UserInvitation.revoked_at.is_(None),
        UserInvitation.used_at.is_(None),UserInvitation.expires_at>now()).order_by(UserInvitation.created_at.desc()).limit(1))
    if previous:
        if eligible(db,previous):
            job = db.get(m.IntegrationJob,previous.job_id)
            if utc(previous.created_at)>now()-timedelta(minutes=1):
                return False
            if not resend and job and job.status!='failed':
                return False
        revoke(db,previous)
    enqueue_access_link(db,user,school,'password_reset')
    return True


@router.post('/invitations/inspect')
def inspect(data:TokenInput,db:DB,request:Request,response:Response):
    from .portal import rate_limit
    token=request_token(data,request)
    rate_limit(db,request,'invitation-inspect',digest(token),20)
    row=resolve_session(db,token,data);school=db.get(m.School,row.school_id)
    if data.invitation_id and data.invitation_id!=row.id:fail(400,'Convite indisponível. Reabra o link enviado pela escola.')
    user=db.get(m.User,row.user_id)
    require_portal_role(request,user)
    invitation_cookie(response,row.id,token,max_age=max(1,int((utc(row.expires_at)-now()).total_seconds())))
    return {'invitation_id':row.id,'school_name':school.name,'expires_at':row.expires_at,'min_password_length':12,
            'purpose': row.purpose, 'login_path': PORTAL_LOGIN_PATHS.get(user.role, '/'),
            'continue_path': (PORTAL_LOGIN_PATHS[user.role]+'/first-access' if data.token and portal_origin(user.role) and
                              request.headers.get('origin','').rstrip('/') == settings().app_url.rstrip('/') else None)}


@router.post('/invitations/accept')
def accept(data:AcceptInput,db:DB,request:Request,response:Response):
    from .portal import rate_limit
    token=request_token(data,request)
    rate_limit(db,request,'invitation-accept',digest(token),10)
    row=resolve_session(db,token,data)
    if data.invitation_id and data.invitation_id!=row.id:fail(400,'Convite indisponível. Reabra o link enviado pela escola.')
    lock_school(db,row.school_id)
    user=db.scalar(select(m.User).where(m.User.id==row.user_id).with_for_update().execution_options(populate_existing=True))
    require_portal_role(request,user)
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
    audit(db,request,user,'users.password_recovered' if row.purpose=='password_reset' else 'users.invitation_used',row,row.school_id)
    invitation_cookie(response,row.id)
    return {'message':'Senha definida. Entre com seu e-mail e sua nova senha.','login_path': PORTAL_LOGIN_PATHS.get(user.role, '/')}


@router.post('/schools/{school_id}/users/{user_id}/invitation/{action}')
def administer(user_id:str,action:str,db:DB,user:Actor,school:Scope,request:Request):
    from .user_access import manage,account_access,manageable_role
    manage(user);lock_school(db,school.id)
    target,access=account_access(db,school.id,user_id,True);manageable_role(user,target.role)
    db.scalar(select(m.User).where(m.User.id==target.id).with_for_update())
    if action=='recover':
        if target.role not in PORTAL_LOGIN_PATHS or not active_access(db,target,school):
            fail(409,'A recuperação requer um acesso ativo ao portal da instituição.')
        if not can_recover(db,target,school):
            fail(409,'A conta ainda aguarda o primeiro acesso. Use Reenviar convite.')
        if not recovery_link(db,target,school,resend=True):
            fail(429,'Aguarde 60 segundos para reenviar a recuperação.')
        audit(db,request,user,'users.password_recovery_requested',target,school.id)
        return {'message':'Recuperação enfileirada para o e-mail de acesso.'}
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
