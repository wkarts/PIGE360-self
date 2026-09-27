"""Portal Web/PWA dos responsáveis. A sessão pública nunca é uma sessão administrativa."""
import hashlib
import hmac
import os
import secrets
from datetime import date, timedelta
from pathlib import Path
from typing import Annotated
from fastapi import APIRouter, Depends, File, Form, Query, Request, Response, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select, func, update
from . import models as m, online_schemas as s
from .config import settings
from .db import now, uid
from .security import DB, digest, fail, hash_password, verify, utc, request_csrf, lock_school, check_version
from .common import output, number, audit
from .auth import DUMMY_PASSWORD_HASH
from .documents import validate_upload, render_pdf
from .integration_core import connection, enqueue, admission_notification
from .portal_access import login_school, offered_groups, public_context, today

router=APIRouter(prefix='/api/v1/portal',tags=['Portal dos responsáveis'])
EDITABLE={'draft','changes_requested'}
STATUS_LABELS={'draft':'Rascunho','submitted':'Enviada','under_review':'Em análise','changes_requested':'Correção solicitada','waitlisted':'Lista de espera','approved':'Aprovada / matrícula em preparação','enrolled':'Matriculada','rejected':'Indeferida','withdrawn':'Desistência'}

def rate_limit(db,request,namespace,key,limit=12,seconds=900):
    """Persiste a tentativa mesmo quando o restante da requisição for recusado."""
    peer=request.client.host if request.client else 'unknown'
    for suffix,ceiling in [(key,limit),('ip:'+peer,120)]:
        ident=digest('portal:'+namespace+':'+suffix)
        row=db.scalar(select(m.LoginAttempt).where(m.LoginAttempt.key==ident).with_for_update())
        if not row:
            row=m.LoginAttempt(key=ident,count=0,window_started=now());db.add(row);db.flush()
        if utc(row.window_started)+timedelta(seconds=seconds)<now():row.count=0;row.window_started=now()
        if row.count>=ceiling:fail(429,'Limite de tentativas atingido. Tente novamente mais tarde.')
        row.count+=1
    db.commit()

def get_campaign(db,slug=None,id=None,open_required=False):
    row=db.scalar(select(m.AdmissionCampaign).where(m.AdmissionCampaign.slug==slug)) if slug else db.get(m.AdmissionCampaign,id)
    school=db.get(m.School,row.school_id) if row else None
    if not row or not school or not school.active:fail(404,'Processo de matrícula não encontrado.')
    if open_required and (not row.active or not row.opens_on<=today()<=row.closes_on or not offered_groups(db,row)):fail(409,'Inscrições encerradas ou ainda não abertas.')
    return row

def account_output(account):
    result=output(account,('password_hash','registration_consent','personal_details'))
    result.update({k:v for k,v in (account.personal_details or {}).items() if k in s.GuardianDetails.model_fields})
    return result

def new_session(db,account,response,mfa_verified=False):
    secret=secrets.token_urlsafe(48)
    session=m.PortalSession(mfa_verified=mfa_verified,account_id=account.id,token_hash=digest(secret),expires_at=now()+timedelta(hours=settings().portal_session_hours))
    db.add(session);db.flush()
    from .embedding import cookie
    cookie(response,'pige_portal',session.id+'.'+secret,path='/api/v1/portal',max_age=settings().portal_session_hours*3600,db=db)
    return account_output(account)

def portal_account(request:Request,db:DB):
    if request.method not in ('GET','HEAD','OPTIONS'):request_csrf(request)
    raw=request.cookies.get('pige_portal','').split('.',1)
    if len(raw)!=2:fail(401,'Entre no portal de responsáveis.')
    session=db.get(m.PortalSession,raw[0])
    if not session or session.revoked or utc(session.expires_at)<=now() or not secrets.compare_digest(session.token_hash,digest(raw[1])):fail(401,'Sessão do portal expirada.')
    account=db.get(m.PortalAccount,session.account_id)
    school=db.get(m.School,account.school_id) if account else None
    if not account or not account.active or not school or not school.active:fail(401,'Acesso ao portal indisponível.')
    from .mfa import enforce_session
    enforce_session(db,'portal',account,session)
    request.state.portal_account_id=account.id
    request.state.portal_session_id=session.id
    return account

Parent=Annotated[m.PortalAccount,Depends(portal_account)]

def own_admission(db,account,id):
    row=db.scalar(select(m.Admission).where(m.Admission.id==id,m.Admission.school_id==account.school_id,m.Admission.account_id==account.id))
    if not row:fail(404,'Inscrição não encontrada.')
    return row

def campaign_output(db,obj):
    from .registry import occupancy
    school=db.get(m.School,obj.school_id)
    groups=[]
    for id in obj.class_group_ids:
        g=db.get(m.ClassGroup,id)
        if not g or g.school_id!=obj.school_id or not g.active:continue
        y=db.get(m.AcademicYear,g.academic_year_id)
        if y.status!='active':continue
        groups.append({'id':g.id,'name':g.name,'grade':db.get(m.Grade,g.grade_id).name,'shift':db.get(m.Shift,g.shift_id).name,'year':y.name,'unit':db.get(m.Unit,g.unit_id).name,'vacancies':max(0,g.capacity-occupancy(db,g.id))})
    return {**output(obj),'school_name':school.name,'school_phone':school.phone,'school_email':school.email,'groups':groups,'accepting':obj.active and obj.opens_on<=today()<=obj.closes_on and bool(groups)}

def document_types(db,admission):
    group=db.get(m.ClassGroup,admission.class_group_id)
    return list(db.scalars(select(m.DocumentType).where(m.DocumentType.school_id==admission.school_id,m.DocumentType.active.is_(True), (m.DocumentType.grade_id.is_(None)) | (m.DocumentType.grade_id==group.grade_id)).order_by(m.DocumentType.name)))

def admission_output(db,obj,public=True):
    campaign=db.get(m.AdmissionCampaign,obj.campaign_id)
    data=output(obj)
    if public:data.pop('reviewed_by',None)
    data.update({'status_label':STATUS_LABELS[obj.status],'campaign_title':campaign.title,'class_name':db.get(m.ClassGroup,obj.class_group_id).name})
    data['attachments']=[output(x,('storage_key',)) for x in db.scalars(select(m.AdmissionAttachment).where(m.AdmissionAttachment.admission_id==obj.id,m.AdmissionAttachment.active.is_(True)).order_by(m.AdmissionAttachment.created_at))]
    criteria=[m.AdmissionMessage.admission_id==obj.id]
    if public:criteria.append(m.AdmissionMessage.internal.is_(False))
    data['messages']=[output(x) for x in db.scalars(select(m.AdmissionMessage).where(*criteria).order_by(m.AdmissionMessage.created_at,m.AdmissionMessage.id))]
    data['document_types']=[{'id':x.id,'name':x.name,'required':x.required} for x in document_types(db,obj)]
    account=db.get(m.PortalAccount,obj.account_id)
    if not public:data['account']=account_output(account)
    if obj.enrollment_id:
        enrollment=db.get(m.Enrollment,obj.enrollment_id)
        data['enrollment']={'id':enrollment.id,'number':enrollment.number,'status':enrollment.status,'class_group_id':enrollment.class_group_id}
        data['issued_documents']=[output(x,('snapshot',)) for x in db.scalars(select(m.IssuedDocument).where(m.IssuedDocument.enrollment_id==enrollment.id,m.IssuedDocument.school_id==obj.school_id))]
    else:data['issued_documents']=[]
    return data

def add_message(db,obj,text,kind='message',user=None,account=None,internal=False):
    db.add(m.AdmissionMessage(school_id=obj.school_id,admission_id=obj.id,text=text,kind=kind,actor_id=user.id if user else None,account_id=account.id if account else None,internal=internal))

def parent_audit(db,request,account,action,obj,details=None):
    audit(db,request,None,'portal.'+action,obj,account.school_id,{'portal_account_id':account.id,**(details or {})})

@router.get('/context')
def context(db:DB):
    return public_context(db)

@router.get('/campaigns')
def campaigns(db:DB):
    rows=db.scalars(select(m.AdmissionCampaign).join(m.School).where(m.School.active.is_(True),m.AdmissionCampaign.active.is_(True),m.AdmissionCampaign.opens_on<=today(),m.AdmissionCampaign.closes_on>=today()).order_by(m.AdmissionCampaign.title).limit(100))
    return [{'id':x.id,'slug':x.slug,'title':x.title,'school_id':x.school_id,'school_name':db.get(m.School,x.school_id).name,'closes_on':x.closes_on.isoformat()} for x in rows if offered_groups(db,x)]

@router.get('/campaigns/{slug}')
def campaign_detail(slug:str,db:DB):
    obj=get_campaign(db,slug=slug)
    if not obj.active:fail(404,'Processo não publicado.')
    return campaign_output(db,obj)

@router.post('/register',status_code=201)
def register(data:s.Registration,request:Request,response:Response,db:DB):
    request_csrf(request)
    email=str(data.email).lower()
    rate_limit(db,request,'register',email,5)
    campaign=get_campaign(db,slug=data.campaign_slug,open_required=True)
    if db.scalar(select(m.PortalAccount.id).where(m.PortalAccount.school_id==campaign.school_id,m.PortalAccount.email==email)):
        fail(409,'Não foi possível criar a conta. Use Entrar ou Recuperar acesso caso já tenha cadastro.')
    if data.terms_version!=campaign.terms_version:fail(409,'Leia e aceite a versão atual do aviso de privacidade.')
    account=m.PortalAccount(registration_consent={'terms_version':campaign.terms_version,'privacy_notice':campaign.privacy_notice,'accepted_at':now().isoformat()},school_id=campaign.school_id,email=email,password_hash=hash_password(data.password),**data.model_dump(exclude={'campaign_slug','email','password','accept_privacy','terms_version'}))
    db.add(account);db.flush();parent_audit(db,request,account,'account.created',account)
    from .mfa import before_login
    challenge=before_login(db,request,'portal',account)
    return challenge or new_session(db,account,response)

@router.post('/login')
def login(data:s.PortalLogin,request:Request,response:Response,db:DB):
    request_csrf(request)
    email=str(data.email).lower();rate_limit(db,request,'login',email,10)
    school=login_school(db,data.school_id,data.campaign_slug)
    account=db.scalar(select(m.PortalAccount).where(m.PortalAccount.school_id==school.id,m.PortalAccount.email==email))
    valid=verify(data.password,account.password_hash if account else DUMMY_PASSWORD_HASH)
    if not account or not account.active or not valid:fail(401,'E-mail ou senha inválidos.')
    parent_audit(db,request,account,'login',account)
    from .mfa import before_login
    challenge=before_login(db,request,'portal',account)
    return challenge or new_session(db,account,response)

@router.get('/me')
def me(account:Parent):return account_output(account)

@router.post('/logout')
def logout(account:Parent,request:Request,response:Response,db:DB):
    db.get(m.PortalSession,request.state.portal_session_id).revoked=True
    from .embedding import cookie
    cookie(response,'pige_portal',path='/api/v1/portal',delete=True,db=db)
    return {'ok':True}

def code_hash(account_id,purpose,code):
    return hmac.new(settings().app_secret_key.encode(),f'{account_id}:{purpose}:{code}'.encode(),hashlib.sha256).hexdigest()

def challenge(db,account,purpose,channel):
    config=settings()
    if channel=='email':
        if not config.smtp_host or not config.smtp_from:fail(409,'Envio de e-mail não configurado. Solicite orientação à Secretaria.')
        conn=None;kind='smtp_email';target=account.email
    else:
        conn=connection(db,account.school_id,'connect_api')
        if not account.phone:fail(422,'Não há telefone na conta. Utilize verificação por e-mail.')
        kind='connect_text';target=account.phone
    db.execute(update(m.PortalChallenge).where(m.PortalChallenge.account_id==account.id,m.PortalChallenge.purpose==purpose,m.PortalChallenge.used.is_(False)).values(used=True))
    code=f'{secrets.randbelow(1_000_000):06d}'
    item=m.PortalChallenge(account_id=account.id,purpose=purpose,channel=channel,code_hash=code_hash(account.id,purpose,code),expires_at=now()+timedelta(minutes=10))
    db.add(item);db.flush()
    from .institution import identity_data
    school_name=identity_data(db)['display_name']
    text=f'Seu código de acesso — {school_name} — é {code}. Válido por 10 minutos. Não compartilhe este código. Ignore esta mensagem se não solicitou.'
    payload={'number':target,'text':text} if kind=='connect_text' else {'to':target,'subject':'Código de acesso — '+school_name,'text':text}
    payload['expires_at']=item.expires_at.isoformat()
    enqueue(db,account.school_id,kind,payload,'otp:'+item.id,conn.id if conn else None)
    return {'ok':True,'message':'Código solicitado. Consulte o canal escolhido.','expires_in_seconds':600}

def consume_code(db,account,purpose,code):
    item=db.scalar(select(m.PortalChallenge).where(m.PortalChallenge.account_id==account.id,m.PortalChallenge.purpose==purpose,m.PortalChallenge.used.is_(False)).order_by(m.PortalChallenge.created_at.desc()).with_for_update())
    if not item or utc(item.expires_at)<now() or item.attempts>=5:fail(400,'Código inválido ou expirado. Solicite um novo código.')
    item.attempts+=1
    if not secrets.compare_digest(item.code_hash,code_hash(account.id,purpose,code)):
        db.commit();fail(400,'Código inválido ou expirado.')
    item.used=True
    return item

@router.post('/verification/request')
def request_verification(data:s.VerifyRequest,request:Request,db:DB,account:Parent):
    rate_limit(db,request,'verify-send',account.id,4,600)
    return challenge(db,account,'verify',data.channel)

@router.post('/verification/confirm')
def confirm_verification(data:s.VerifyCode,request:Request,db:DB,account:Parent):
    item=consume_code(db,account,'verify',data.code)
    if item.channel=='email':account.email_verified=True
    else:account.phone_verified=True
    parent_audit(db,request,account,'contact.verified',account,{'channel':item.channel})
    return account_output(account)

@router.post('/password/request')
def reset_request(data:s.ResetRequest,request:Request,db:DB):
    request_csrf(request)
    email=str(data.email).lower();rate_limit(db,request,'reset',email,4,600)
    school=login_school(db,data.school_id,data.campaign_slug)
    account=db.scalar(select(m.PortalAccount).where(m.PortalAccount.school_id==school.id,m.PortalAccount.email==email,m.PortalAccount.active.is_(True)))
    if settings().smtp_host and settings().smtp_from and settings().integration_encryption_key and account:
        challenge(db,account,'reset','email')
    return {'ok':True,'message':'Caso haja uma conta e envio de e-mail configurado, um código será enviado. Caso contrário, procure a Secretaria.'}

@router.post('/password/confirm')
def reset_confirm(data:s.ResetConfirm,request:Request,db:DB,response:Response):
    request_csrf(request)
    email=str(data.email).lower();rate_limit(db,request,'reset-confirm',email,10)
    school=login_school(db,data.school_id,data.campaign_slug)
    account=db.scalar(select(m.PortalAccount).where(m.PortalAccount.school_id==school.id,m.PortalAccount.email==email,m.PortalAccount.active.is_(True)))
    if not account:fail(400,'Código inválido ou expirado.')
    consume_code(db,account,'reset',data.code)
    account.password_hash=hash_password(data.password)
    db.execute(update(m.PortalSession).where(m.PortalSession.account_id==account.id).values(revoked=True))
    parent_audit(db,request,account,'password.reset',account)
    from .embedding import cookie
    cookie(response,'pige_portal',path='/api/v1/portal',delete=True,db=db)
    return {'ok':True}

@router.get('/admissions')
def list_admissions(db:DB,account:Parent,page:int=Query(1,ge=1),page_size:int=Query(20,ge=1,le=50)):
    stmt=select(m.Admission).where(m.Admission.account_id==account.id,m.Admission.school_id==account.school_id)
    total=db.scalar(select(func.count()).select_from(stmt.subquery()))
    return {'items':[admission_output(db,x) for x in db.scalars(stmt.order_by(m.Admission.created_at.desc()).offset((page-1)*page_size).limit(page_size))],'total':total,'page':page,'page_size':page_size}

def valid_group(db,campaign,id):
    from .enrollments import check_group
    if id not in campaign.class_group_ids:fail(422,'Turma não oferecida neste processo.')
    group=db.get(m.ClassGroup,id)
    if not group or group.school_id!=campaign.school_id:fail(422,'Turma não encontrada.')
    check_group(db,group,campaign.school_id)
    return group

@router.get('/admissions/{id}/campaign')
def own_campaign(id:str, db:DB, account:Parent):
    row=own_admission(db,account,id)
    return campaign_output(db,db.get(m.AdmissionCampaign,row.campaign_id))

@router.post('/admissions',status_code=201)
def create_admission(data:s.AdmissionInput,request:Request,db:DB,account:Parent):
    rate_limit(db,request,'admission-create',account.id,20)
    campaign=get_campaign(db,id=data.campaign_id,open_required=True)
    if campaign.school_id!=account.school_id:fail(404,'Processo não encontrado nesta escola.')
    lock_school(db,account.school_id)
    previous=db.scalar(select(m.Admission).where(m.Admission.account_id==account.id,m.Admission.client_key==data.client_key))
    if previous:
        expected={**data.student.model_dump(mode='json'),'previous_school':data.previous_school}
        if previous.campaign_id!=campaign.id or previous.class_group_id!=data.class_group_id or previous.student_data!=expected:
            fail(409,'Chave de operação já usada com outros dados. Reabra a inscrição existente.')
        return admission_output(db,previous)
    valid_group(db,campaign,data.class_group_id)
    if db.scalar(select(func.count()).select_from(m.Admission).where(m.Admission.account_id==account.id,m.Admission.status.not_in(['rejected','withdrawn','enrolled'])))>=20:
        fail(409,'Limite de inscrições abertas atingido. Procure a Secretaria.')
    child=data.student.model_dump(mode='json');child['previous_school']=data.previous_school
    obj=m.Admission(school_id=account.school_id,campaign_id=campaign.id,account_id=account.id,number=number(db,account.school_id,'admission','PRE-'),client_key=data.client_key,class_group_id=data.class_group_id,student_data=child,relationship=data.relationship,notes=data.notes)
    db.add(obj);db.flush();parent_audit(db,request,account,'admission.created',obj)
    return admission_output(db,obj)

@router.get('/admissions/{id}')
def detail(id:str,db:DB,account:Parent):return admission_output(db,own_admission(db,account,id))

@router.patch('/admissions/{id}')
def edit_admission(id:str,data:s.AdmissionEdit,request:Request,db:DB,account:Parent):
    lock_school(db,account.school_id)
    obj=own_admission(db,account,id);check_version(obj,data.version)
    if obj.status not in EDITABLE:fail(409,'Inscrição não está aberta para edição. Solicite correção à Secretaria.')
    campaign=get_campaign(db,id=obj.campaign_id,open_required=True);valid_group(db,campaign,data.class_group_id)
    obj.class_group_id=data.class_group_id;obj.student_data={**data.student.model_dump(mode='json'),'previous_school':data.previous_school};obj.relationship=data.relationship;obj.notes=data.notes;obj.version+=1
    parent_audit(db,request,account,'admission.updated',obj)
    return admission_output(db,obj)

@router.post('/admissions/{id}/submit')
def submit(id:str,data:s.SubmitAdmission,request:Request,db:DB,account:Parent):
    lock_school(db,account.school_id);obj=own_admission(db,account,id);check_version(obj,data.version)
    if obj.status not in EDITABLE:fail(409,'Inscrição já enviada ou encerrada.')
    campaign=get_campaign(db,id=obj.campaign_id,open_required=True);valid_group(db,campaign,obj.class_group_id)
    if data.terms_version!=campaign.terms_version:fail(409,'O aviso de privacidade foi atualizado. Leia e aceite a versão atual.')
    if campaign.require_verified_contact and not(account.email_verified or account.phone_verified):fail(409,'Valide um contato antes de enviar a inscrição.')
    if campaign.require_documents:
        delivered=set(db.scalars(select(m.AdmissionAttachment.document_type_id).where(m.AdmissionAttachment.admission_id==obj.id,m.AdmissionAttachment.active.is_(True),m.AdmissionAttachment.review_status!='rejected')))
        if any(d.required and d.id not in delivered for d in document_types(db,obj)):fail(409,'Envie os documentos obrigatórios antes de concluir.')
    # Não captura o hash de senha nem atribui vínculo com alunos existentes.
    obj.guardian_snapshot={**(account.personal_details or {}),**{k:getattr(account,k) for k in ('name','email','cpf','phone','address','email_verified','phone_verified')}}
    obj.consent={'terms_version':campaign.terms_version,'privacy_notice':campaign.privacy_notice,'accepted_at':now().isoformat(),'account_id':account.id,'legal_responsibility':True,'ip':request.client.host if request.client else '', 'user_agent':request.headers.get('user-agent','')[:400]}
    obj.status='submitted';obj.submitted_at=now();obj.version+=1
    add_message(db,obj,'Inscrição enviada para análise da Secretaria. O envio não garante vaga.','submitted',account=account)
    parent_audit(db,request,account,'admission.submitted',obj,{'terms_version':campaign.terms_version})
    admission_notification(db,obj,f'Inscrição {obj.number} recebida pela Secretaria.','submitted')
    db.flush();return admission_output(db,obj)

@router.post('/admissions/{id}/withdraw')
def withdraw(id:str,data:s.FinalizeAdmission,request:Request,db:DB,account:Parent):
    lock_school(db,account.school_id);obj=own_admission(db,account,id);check_version(obj,data.version)
    if obj.status in ('approved','enrolled','rejected','withdrawn'):fail(409,'Para esta situação, solicite atendimento à Secretaria.')
    obj.status='withdrawn';obj.version+=1;add_message(db,obj,data.reason,'withdrawn',account=account)
    parent_audit(db,request,account,'admission.withdrawn',obj)
    return admission_output(db,obj)

@router.post('/admissions/{id}/messages',status_code=201)
def message(id:str,data:s.MessageInput,request:Request,db:DB,account:Parent):
    rate_limit(db,request,'messages',account.id,30)
    obj=own_admission(db,account,id)
    if data.internal:fail(403,'Responsáveis não podem criar notas internas.')
    if obj.status in ('rejected','withdrawn'):fail(409,'Inscrição encerrada.')
    add_message(db,obj,data.text,account=account);parent_audit(db,request,account,'message.created',obj)
    db.flush();return admission_output(db,obj)

@router.post('/admissions/{id}/attachments',status_code=201)
def upload(id:str,request:Request,db:DB,account:Parent,document_type_id:str=Form(...),version:int=Form(...),file:UploadFile=File(...)):
    rate_limit(db,request,'uploads',account.id,30)
    lock_school(db,account.school_id);obj=own_admission(db,account,id);check_version(obj,version)
    if obj.status not in EDITABLE:fail(409,'Envio documental permitido em rascunho ou correção solicitada.')
    if document_type_id not in {d.id for d in document_types(db,obj)}:fail(422,'Tipo documental não aplicável a esta inscrição.')
    maximum=settings().max_upload_mb*1024*1024;content=file.file.read(maximum+1)
    if len(content)>maximum:fail(413,'Arquivo maior que o limite configurado.')
    name=Path((file.filename or 'arquivo').replace('\\','/')).name[:240]
    mime=validate_upload(content,name)
    count=db.scalar(select(func.count()).select_from(m.AdmissionAttachment).where(m.AdmissionAttachment.admission_id==obj.id,m.AdmissionAttachment.active.is_(True)))
    used=db.scalar(select(func.coalesce(func.sum(m.AdmissionAttachment.size),0)).join(m.Admission,m.Admission.id==m.AdmissionAttachment.admission_id).where(m.Admission.account_id==account.id))
    if count>=settings().portal_max_files or used+len(content)>settings().portal_max_storage_mb*1024*1024:fail(413,'Limite de armazenamento do portal atingido. Procure a Secretaria.')
    # Um anexo atual por tipo; as versões anteriores permanecem preservadas.
    db.execute(update(m.AdmissionAttachment).where(m.AdmissionAttachment.admission_id==obj.id,m.AdmissionAttachment.document_type_id==document_type_id,m.AdmissionAttachment.active.is_(True)).values(active=False))
    root=settings().storage_path.resolve();key=f'{account.school_id}/portal/{uid()}';path=root/key
    path.parent.mkdir(parents=True,exist_ok=True)
    descriptor=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
    with os.fdopen(descriptor,'wb') as handle:handle.write(content);handle.flush();os.fsync(handle.fileno())
    db.info.setdefault('new_files',[]).append(path)
    attachment=m.AdmissionAttachment(school_id=account.school_id,admission_id=obj.id,document_type_id=document_type_id,original_name=name,storage_key=key,mime_type=mime,size=len(content),sha256=hashlib.sha256(content).hexdigest())
    db.add(attachment);obj.version+=1;db.flush();parent_audit(db,request,account,'attachment.uploaded',attachment,{'sha256':attachment.sha256})
    return admission_output(db,obj)

def attachment_response(obj):
    root=settings().storage_path.resolve();path=(root/obj.storage_key).resolve()
    if not path.is_relative_to(root) or not path.is_file():fail(404,'Arquivo indisponível.')
    with path.open('rb') as h:hash=hashlib.file_digest(h,'sha256').hexdigest()
    if not secrets.compare_digest(hash,obj.sha256):fail(409,'Integridade do arquivo inválida.')
    return FileResponse(path,media_type=obj.mime_type,filename=obj.original_name,headers={'Cache-Control':'no-store'})

@router.get('/admissions/{id}/attachments/{attachment_id}')
def download(id:str,attachment_id:str,request:Request,db:DB,account:Parent):
    obj=own_admission(db,account,id)
    attachment=db.scalar(select(m.AdmissionAttachment).where(m.AdmissionAttachment.id==attachment_id,m.AdmissionAttachment.admission_id==obj.id,m.AdmissionAttachment.active.is_(True)))
    if not attachment:fail(404,'Arquivo não encontrado.')
    parent_audit(db,request,account,'attachment.downloaded',attachment)
    return attachment_response(attachment)

@router.get('/admissions/{id}/receipt.pdf')
def receipt(id:str,request:Request,db:DB,account:Parent):
    obj=own_admission(db,account,id)
    if obj.status=='draft':fail(409,'Envie a inscrição antes de obter o protocolo.')
    school=db.get(m.School,obj.school_id)
    data=render_pdf(school.name,'Protocolo de inscrição online',[
        ('Protocolo',obj.number),('Aluno',obj.student_data['name']),('Responsável',obj.guardian_snapshot.get('name',account.name)),
        ('Processo',db.get(m.AdmissionCampaign,obj.campaign_id).title),('Turma pretendida',db.get(m.ClassGroup,obj.class_group_id).name),
        ('Situação',STATUS_LABELS[obj.status]),('Enviada em',str(obj.submitted_at)),
    ],'Protocolo de recebimento. Não constitui garantia de vaga, comprovação de pagamento ou declaração de matrícula ativa.')
    parent_audit(db,request,account,'receipt.generated',obj)
    return Response(data,media_type='application/pdf',headers={'Content-Disposition':f'attachment; filename="inscricao-{obj.number}.pdf"','Cache-Control':'no-store'})

@router.get('/admissions/{id}/issued/{issued_id}')
def issued(id:str,issued_id:str,request:Request,db:DB,account:Parent):
    obj=own_admission(db,account,id)
    record=db.get(m.IssuedDocument,issued_id)
    if not obj.enrollment_id or not record or record.school_id!=obj.school_id or record.enrollment_id!=obj.enrollment_id:fail(404,'Documento não encontrado.')
    stored=db.get(m.FileRecord,record.file_id)
    parent_audit(db,request,account,'issued.downloaded',record)
    return attachment_response(stored)

@router.get('/admissions/{id}/charges')
def charges(id:str,db:DB,account:Parent):
    from .banking import charge_output
    obj=own_admission(db,account,id)
    return [charge_output(x,public=True) for x in db.scalars(select(m.BankCharge).where(m.BankCharge.school_id==obj.school_id,m.BankCharge.admission_id==obj.id,m.BankCharge.account_id==account.id).order_by(m.BankCharge.due_on))]

@router.patch('/me')
def update_profile(data:s.PortalProfile,account:Parent,db:DB,request:Request):
    lock_school(db,account.school_id);check_version(account,data.version)
    if data.phone!=account.phone:
        account.phone_verified=False
        db.execute(update(m.PortalChallenge).where(m.PortalChallenge.account_id==account.id,m.PortalChallenge.channel=='whatsapp',m.PortalChallenge.used.is_(False)).values(used=True))
    details=set(s.GuardianDetails.model_fields)
    for key,value in data.model_dump(exclude={'version',*details}).items():setattr(account,key,value)
    changed=data.model_dump(mode='json',include=details,exclude_unset=True)
    account.personal_details={**(account.personal_details or {}),**changed}
    account.version+=1
    parent_audit(db,request,account,'profile.updated',account,{'official_records_unchanged':True})
    return account_output(account)
