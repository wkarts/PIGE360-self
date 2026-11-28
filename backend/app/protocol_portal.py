"""Atendimento dos portais sobre o protocolo da Secretaria e seu histórico público."""
import hashlib
import json
from pathlib import Path
from typing import Annotated, Literal
from urllib.parse import quote
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.responses import Response
from sqlalchemy import and_, func, or_, select

from . import models as m
from .common import audit, number
from .config import settings
from .db import now
from .documents import validate_upload, write_file
from .learning_portal import own_profile_students
from .profiles import allowed_school
from .protocol_notifications import available_channels, queue_protocol_notice, school_whatsapp_contact
from .schemas import Input
from .security import Actor, DB, Scope, fail, lock_school, require, scoped
from .storage import read_bytes

PORTAL_ROLES = ('student', 'guardian', 'teacher')
Category = Literal['secretaria', 'pedagogico', 'financeiro', 'tecnico']
Channel = Literal['portal','email','whatsapp']
portal = APIRouter(prefix='/schools/{school_id}/protocols')
management = APIRouter(prefix='/schools/{school_id}')


class ChannelInput(Input):
    preferred_channel: Channel


def _surface(school_id: str, db: DB, user: Actor, request: Request):
    teacher = request.url.path.startswith('/api/v1/teacher/')
    if user.role not in (('teacher',) if teacher else ('student','guardian')):
        fail(403,'Use o portal correspondente ao seu perfil.')
    school = allowed_school(db,user,school_id)
    require(user,'profile.self')
    return school


PortalSchool = Annotated[m.School, Depends(_surface)]


def _student_access(db, user, school_id):
    allowed_school(db,user,school_id)
    require(user,'profile.self')
    if user.role=='teacher':
        return {}, {}
    academic = {row.id:row for row in own_profile_students(db,user,school_id)}
    financial = ({row.id:row for row in own_profile_students(db,user,school_id,financial=True)}
                 if user.role=='guardian' else {})
    return academic,financial


def _can_discuss(role, student_id, category, academic, financial):
    if role=='teacher':
        return student_id is None and category in ('secretaria','pedagogico','tecnico')
    if category=='financeiro':
        return student_id in financial
    if category=='pedagogico':
        return student_id in academic
    return category in ('secretaria','tecnico') and (student_id in academic or student_id in financial)


def requester_has_access(db, protocol, user):
    if not user or not user.active or user.id!=protocol.requester_user_id or user.role not in PORTAL_ROLES:
        return False
    try:
        academic,financial=_student_access(db,user,protocol.school_id)
    except HTTPException as exc:
        if exc.status_code in (403,404,409):
            return False
        raise
    return _can_discuss(user.role,protocol.student_id,protocol.category,academic,financial)


def find_requester(db,school_id,user_id):
    target=db.get(m.User,user_id)
    if not target or not target.active or target.role not in PORTAL_ROLES:
        fail(404,'Solicitante indisponível nesta instituição.')
    try:
        allowed_school(db,target,school_id)
        require(target,'profile.self')
    except HTTPException as exc:
        if exc.status_code in (403,404):
            fail(404,'Solicitante indisponível nesta instituição.')
        raise
    return target


def _owned(db,school,user,protocol_id):
    item=db.scalar(select(m.Protocol).where(m.Protocol.id==protocol_id,m.Protocol.school_id==school.id,
                                            m.Protocol.requester_user_id==user.id))
    if not item or not requester_has_access(db,item,user):
        fail(404,'Protocolo indisponível neste acesso.')
    return item


def _fingerprint(*values):
    return hashlib.sha256(json.dumps(values,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()


def _previous(db,school_id,user,key,fingerprint):
    if not key:
        return None
    event=db.scalar(select(m.ProtocolEvent).where(m.ProtocolEvent.school_id==school_id,
                                                  m.ProtocolEvent.actor_id==user.id,m.ProtocolEvent.client_key==str(key)))
    if event and event.client_fingerprint!=fingerprint:
        fail(409,'Este envio já foi usado em outro atendimento. Atualize o rascunho.')
    return event


def _message(value):
    value=value.strip()
    if not 3<=len(value)<=4000:
        fail(422,'Escreva uma mensagem de 3 a 4.000 caracteres.')
    return value


async def _upload(file):
    if not file:
        return None
    limit=settings().max_upload_mb*1024*1024
    data=await file.read(limit+1)
    if len(data)>limit:
        fail(413,'O anexo ultrapassa o limite de tamanho da instituição.')
    name=Path((file.filename or '').replace('\\','/')).name[:200]
    if not name or any(ord(c)<32 or ord(c)==127 for c in name):
        fail(422,'Nome de arquivo inválido.')
    return name,validate_upload(data,name),data


def _file_key(upload):
    return (upload[0],hashlib.sha256(upload[2]).hexdigest()) if upload else None


def public_event(db, protocol, user, action, message, *, upload=None, key=None, fingerprint=None):
    file=write_file(db,protocol.school_id,user.id,*upload,file_kind='protocol_attachment') if upload else None
    event=m.ProtocolEvent(school_id=protocol.school_id,protocol_id=protocol.id,actor_id=user.id,
        action=action,message=message,visibility='public',file_id=file.id if file else None,
        client_key=str(key) if key else None,client_fingerprint=fingerprint)
    db.add(event)
    db.flush()
    if user.id!=protocol.requester_user_id:
        queue_protocol_notice(db,protocol,event)
    return event


def _summary(p,changed):
    return {'id':p.id,'number':p.number,'category':p.category,'subject':p.kind,'source':p.source,
            'status':p.status,'student_id':p.student_id,'created_at':p.created_at,'updated_at':changed or p.created_at,
            'due_on':p.due_on,'preferred_channel':p.preferred_channel}


def attachment_info(file):
    return {'id':file.id,'name':file.original_name} if file else None


def detail(db,p):
    history=[]
    rows=db.execute(select(m.ProtocolEvent,m.FileRecord).outerjoin(m.FileRecord,and_(
        m.FileRecord.id==m.ProtocolEvent.file_id,m.FileRecord.school_id==p.school_id,m.FileRecord.file_kind=='protocol_attachment'
    )).where(m.ProtocolEvent.protocol_id==p.id,m.ProtocolEvent.school_id==p.school_id,m.ProtocolEvent.visibility=='public')
        .order_by(m.ProtocolEvent.created_at,m.ProtocolEvent.id))
    for event,file in rows:
        history.append({'id':event.id,'action':event.action,'author':'you' if event.actor_id==p.requester_user_id else 'school',
                        'message':event.message,'created_at':event.created_at,'attachment':attachment_info(file)})
    return {**_summary(p,history[-1]['created_at'] if history else None),'history':history}


def open_ticket(db,school,actor,requester,student_id,category,subject,message,source,channel,key,upload,request,*,status='open',due_on=None):
    subject=subject.strip()
    if not 2<=len(subject)<=120:
        fail(422,'Informe um assunto de 2 a 120 caracteres.')
    message=_message(message)
    lock_school(db,school.id)
    academic,financial=_student_access(db,requester,school.id)
    if not _can_discuss(requester.role,student_id,category,academic,financial):
        fail(403,'Esta categoria ou aluno não está disponível para o solicitante.')
    fingerprint=_fingerprint('create',requester.id,student_id,category,subject,message,channel,status,str(due_on),_file_key(upload))
    old=_previous(db,school.id,actor,key,fingerprint)
    if old:
        return scoped(db,m.Protocol,old.protocol_id,school.id)
    channels = available_channels(db, school.id, requester)
    if source == 'manager':
        channel = _opening_channel(db, requester, school.id, channels)
    elif channel not in channels:
        fail(422,'O canal de aviso selecionado não está disponível para este acesso.')
    obj=m.Protocol(school_id=school.id,number=number(db,school.id,'protocol','PRO-'),requester_user_id=requester.id,
                   source=source,student_id=student_id,category=category,kind=subject,description=message,
                   status=status,due_on=due_on,preferred_channel=channel,completed_at=now() if status=='completed' else None)
    db.add(obj);db.flush()
    action = 'public_opened' if source == 'manager' else 'public_message'
    public_event(db,obj,actor,action,message,upload=upload,key=key,fingerprint=fingerprint)
    audit(db,request,actor,'protocol.created',obj,school.id)
    return obj


def _opening_channel(db, user, school_id, channels):
    access = db.get(m.SchoolAccess, (user.id, school_id))
    stored = access.protocol_opening_channel if access else 'portal'
    return stored if stored in channels else 'portal'


def _options(db, user, school_id, channels):
    return {'channels':channels, 'opening_channel':_opening_channel(db, user, school_id, channels),
            'whatsapp_contact':school_whatsapp_contact(db, school_id), 'max_attachment_mb':settings().max_upload_mb}


@portal.get('/options')
def options(db:DB,user:Actor,school:PortalSchool):
    return _options(db, user, school.id, available_channels(db, school.id, user))


@portal.put('/opening-channel')
def save_opening_channel(data:ChannelInput, db:DB, user:Actor, school:PortalSchool, request:Request):
    lock_school(db, school.id)
    academic, financial = _student_access(db, user, school.id)
    channel = data.preferred_channel
    if channel != 'portal' and user.role != 'teacher' and not (academic or financial):
        fail(403, 'Vincule um aluno a este acesso para receber avisos de atendimento.')
    channels = available_channels(db, school.id, user)
    if channel not in channels:
        fail(422, 'O canal de aviso selecionado não está disponível para este acesso.')
    access = db.get(m.SchoolAccess, (user.id, school.id))
    if access.protocol_opening_channel != channel:
        before = access.protocol_opening_channel
        access.protocol_opening_channel = channel
        access.version += 1
        audit(db, request, user, 'protocol.opening_channel_changed', user, school.id,
              {'previous_channel':before, 'opening_channel':channel})
    return _options(db, user, school.id, channels)


@portal.post('',status_code=201)
async def create(db:DB,user:Actor,school:PortalSchool,request:Request,category:Category=Form(...),
                 subject:str=Form(...,max_length=120),message:str=Form(...,max_length=4000),student_id:UUID|None=Form(None),
                 preferred_channel:Channel=Form('portal'),client_key:UUID=Form(...),file:UploadFile|None=File(None)):
    p=open_ticket(db,school,user,user,str(student_id) if student_id else None,category,subject,message,
                  'teacher' if user.role=='teacher' else 'family',preferred_channel,client_key,await _upload(file),request)
    return detail(db,p)


@portal.get('')
def list_own(db:DB,user:Actor,school:PortalSchool,q:str=Query('',max_length=120),student_id:str=Query('',max_length=36),
             page:int=Query(1,ge=1),page_size:int=Query(30,ge=1,le=100)):
    protocol=m.Protocol
    academic,financial=_student_access(db,user,school.id)
    scope=[protocol.school_id==school.id,protocol.requester_user_id==user.id]
    if user.role=='teacher':
        scope.extend((protocol.student_id.is_(None),protocol.category.in_(('secretaria','tecnico','pedagogico'))))
    else:
        scope.append(or_(and_(protocol.category.in_(('secretaria','tecnico')),protocol.student_id.in_(academic.keys()|financial.keys())),
                         and_(protocol.category=='pedagogico',protocol.student_id.in_(academic)),
                         and_(protocol.category=='financeiro',protocol.student_id.in_(financial))))
    if student_id:
        scope.append(protocol.student_id==student_id)
    if q.strip():
        scope.append(or_(protocol.number.icontains(q.strip(),autoescape=True),protocol.kind.icontains(q.strip(),autoescape=True)))
    total=db.scalar(select(func.count(protocol.id)).where(*scope))
    changed=select(func.max(m.ProtocolEvent.created_at)).where(m.ProtocolEvent.protocol_id==protocol.id,
        m.ProtocolEvent.school_id==school.id,m.ProtocolEvent.visibility=='public').correlate(protocol).scalar_subquery()
    rows=db.execute(select(protocol,changed.label('changed')).where(*scope).order_by(changed.desc(),protocol.id.desc())
                    .offset((page-1)*page_size).limit(page_size))
    return {'items':[_summary(obj,stamp) for obj,stamp in rows],'total':total,'page':page,'page_size':page_size}


@portal.get('/{protocol_id}')
def view(protocol_id:str,db:DB,user:Actor,school:PortalSchool):
    return detail(db,_owned(db,school,user,protocol_id))


@portal.patch('/{protocol_id}/channel')
def channel(protocol_id:str,data:ChannelInput,db:DB,user:Actor,school:PortalSchool,request:Request):
    lock_school(db,school.id)
    p=_owned(db,school,user,protocol_id)
    if data.preferred_channel not in available_channels(db,school.id,user):
        fail(422,'Canal de aviso indisponível.')
    if p.preferred_channel!=data.preferred_channel:
        p.preferred_channel=data.preferred_channel;p.version+=1
        audit(db,request,user,'protocol.channel_changed',p,school.id)
    return detail(db,p)


def _reply(db,school,actor,p,message,key,upload,request):
    message=_message(message)
    fingerprint=_fingerprint('reply',p.id,message,_file_key(upload))
    if _previous(db,school.id,actor,key,fingerprint):
        return
    if p.status in ('completed','cancelled'):
        fail(409,'O protocolo está encerrado. Abra outro atendimento ou solicite a reabertura à secretaria.')
    p.version+=1
    public_event(db,p,actor,'public_message',message,upload=upload,key=key,fingerprint=fingerprint)
    audit(db,request,actor,'protocol.public_message',p,school.id)


@portal.post('/{protocol_id}/messages',status_code=201)
async def reply(protocol_id:str,db:DB,user:Actor,school:PortalSchool,request:Request,client_key:UUID=Form(...),
                message:str=Form(...,max_length=4000),file:UploadFile|None=File(None)):
    upload=await _upload(file)
    lock_school(db,school.id);p=_owned(db,school,user,protocol_id)
    _reply(db,school,user,p,message,client_key,upload,request)
    return detail(db,p)


def _attachment(db,p,file_id,user,request):
    file=db.scalar(select(m.FileRecord).join(m.ProtocolEvent,m.ProtocolEvent.file_id==m.FileRecord.id)
        .where(m.ProtocolEvent.school_id==p.school_id,m.ProtocolEvent.protocol_id==p.id,m.ProtocolEvent.visibility=='public',
               m.FileRecord.school_id==p.school_id,m.FileRecord.id==file_id,m.FileRecord.file_kind=='protocol_attachment'))
    if not file:
        fail(404,'Anexo indisponível para este protocolo.')
    try:
        data=read_bytes(file)
    except (FileNotFoundError,KeyError):
        fail(404,'Anexo indisponível no armazenamento.')
    if hashlib.sha256(data).hexdigest()!=file.sha256:
        fail(409,'Falha na verificação de integridade do anexo.')
    audit(db,request,user,'protocol.attachment_downloaded',file,p.school_id)
    return Response(data,media_type=file.mime_type,headers={'Content-Disposition':"attachment; filename*=UTF-8''"+quote(file.original_name,safe=''),
                    'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"})


@portal.get('/{protocol_id}/attachments/{file_id}')
def own_attachment(protocol_id:str,file_id:str,db:DB,user:Actor,school:PortalSchool,request:Request):
    return _attachment(db,_owned(db,school,user,protocol_id),file_id,user,request)


@management.post('/protocols/{protocol_id}/messages',status_code=201)
async def manager_reply(protocol_id:str,db:DB,user:Actor,school:Scope,request:Request,client_key:UUID=Form(...),
                        message:str=Form(...,max_length=4000),file:UploadFile|None=File(None)):
    require(user,'protocols.write')
    upload=await _upload(file)
    lock_school(db,school.id);p=scoped(db,m.Protocol,protocol_id,school.id)
    target=db.get(m.User,p.requester_user_id) if p.requester_user_id else None
    if not requester_has_access(db,p,target):
        fail(409,'Este protocolo não possui solicitante autorizado para conversa no portal.')
    _reply(db,school,user,p,message,client_key,upload,request)
    from .reports import protocol_details
    return protocol_details(db,p)


@management.get('/protocols/{protocol_id}/attachments/{file_id}')
def manager_attachment(protocol_id:str,file_id:str,db:DB,user:Actor,school:Scope,request:Request):
    require(user,'protocols.read')
    return _attachment(db,scoped(db,m.Protocol,protocol_id,school.id),file_id,user,request)


@management.get('/protocol-requesters')
def requesters(db:DB,user:Actor,school:Scope,q:str=Query('',max_length=120),student_id:str=Query('',max_length=36),
               page:int=Query(1,ge=1),page_size:int=Query(30,ge=1,le=100)):
    require(user,'protocols.write')
    access=m.SchoolAccess
    filters=[access.school_id==school.id,access.active.is_(True),access.archived_at.is_(None),m.User.active.is_(True),m.User.role.in_(PORTAL_ROLES)]
    if q.strip():
        filters.append(m.User.name.icontains(q.strip(),autoescape=True))
    if student_id:
        student=scoped(db,m.Student,student_id,school.id)
        people=select(m.GuardianLink.person_id).where(m.GuardianLink.school_id==school.id,m.GuardianLink.student_id==student.id,
                                                       m.GuardianLink.active.is_(True))
        filters.append(or_(and_(m.User.role=='student',m.User.person_id==student.person_id),
                           and_(m.User.role=='guardian',m.User.person_id.in_(people))))
    profile=m.SchoolAccessProfile
    filters.append(or_(access.access_profile_id.is_(None),
                       and_(profile.school_id==school.id,profile.active.is_(True),profile.base_role==m.User.role)))
    stmt=(select(m.User.id,m.User.name,m.User.role).join(access,access.user_id==m.User.id)
          .outerjoin(profile,profile.id==access.access_profile_id).where(*filters))
    total=db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows=db.execute(stmt.order_by(m.User.name,m.User.id).offset((page-1)*page_size).limit(page_size)).mappings().all()
    return {'items':rows,'total':total,'page':page,'page_size':page_size}


@management.get('/protocol-requesters/{user_id}/students')
def requester_students(user_id:str,db:DB,user:Actor,school:Scope):
    require(user,'protocols.write')
    target=find_requester(db,school.id,user_id)
    academic,financial=_student_access(db,target,school.id)
    children=academic|financial
    names=db.execute(select(m.Student.id,m.Person.name).join(m.Person,m.Person.id==m.Student.person_id)
        .where(m.Student.school_id==school.id,m.Person.school_id==school.id,m.Student.id.in_(children)).order_by(m.Person.name))
    return {'items':[{'id':ident,'name':name,'academic_authorized':ident in academic,'financial_authorized':ident in financial} for ident,name in names]}


router=APIRouter(tags=['Atendimento escolar'])
router.include_router(portal,prefix='/api/v1/family')
router.include_router(portal,prefix='/api/v1/teacher')
router.include_router(management,prefix='/api/v1')
