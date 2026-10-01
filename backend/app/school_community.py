"""Notícias e agenda da escola, com publicação explícita e audiência verificada."""
from datetime import UTC, datetime
from typing import Literal
import re

from fastapi import APIRouter, Query, Request
from pydantic import Field, field_validator, model_validator
from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, String, Text, func, or_, select
from sqlalchemy.orm import Mapped, mapped_column

from . import models as m
from .common import audit
from .db import Base, Record, now
from .portal import Parent
from .profiles import allowed_school
from .schemas import Input
from .security import Actor, DB, Scope, check_version, fail, lock_school, require, scoped, utc

router=APIRouter(prefix='/api/v1',tags=['Notícias e eventos da escola'])
AUDIENCES=('public','authenticated','students','guardians','teachers')


class SchoolCommunityPost(Record,m.Scoped,Base):
    __tablename__='school_community_posts'
    title:Mapped[str]=mapped_column(String(160))
    summary:Mapped[str]=mapped_column(String(400),default='')
    content:Mapped[str]=mapped_column(Text)
    kind:Mapped[str]=mapped_column(String(16),default='news')
    audience:Mapped[str]=mapped_column(String(24),default='authenticated')
    status:Mapped[str]=mapped_column(String(16),default='draft')
    pinned:Mapped[bool]=mapped_column(Boolean,default=False)
    publish_at:Mapped[datetime|None]=mapped_column(DateTime(timezone=True))
    expires_at:Mapped[datetime|None]=mapped_column(DateTime(timezone=True))
    event_start:Mapped[datetime|None]=mapped_column(DateTime(timezone=True))
    event_end:Mapped[datetime|None]=mapped_column(DateTime(timezone=True))
    location:Mapped[str]=mapped_column(String(240),default='')
    created_by:Mapped[str]=mapped_column(ForeignKey('users.id'))
    updated_by:Mapped[str]=mapped_column(ForeignKey('users.id'))
    __table_args__=(
        CheckConstraint("kind IN ('news','event')",name='community_kind'),
        CheckConstraint("status IN ('draft','published','archived')",name='community_status'),
        CheckConstraint("audience IN ('public','authenticated','students','guardians','teachers')",name='community_audience'),
        CheckConstraint("kind != 'event' OR event_start IS NOT NULL",name='community_event_start'),
        CheckConstraint('event_end IS NULL OR event_end >= event_start',name='community_event_order'),
        CheckConstraint('expires_at IS NULL OR publish_at IS NULL OR expires_at > publish_at',name='community_publication_order'),
        Index('ix_community_school_status_publish','school_id','status','publish_at'),
    )


class PostInput(Input):
    title:str=Field(min_length=3,max_length=160)
    summary:str=Field(default='',max_length=400)
    content:str=Field(min_length=10,max_length=16000)
    kind:Literal['news','event']='news'
    audience:Literal['public','authenticated','students','guardians','teachers']='authenticated'
    status:Literal['draft','published','archived']='draft'
    pinned:bool=False
    publish_at:datetime|None=None
    expires_at:datetime|None=None
    event_start:datetime|None=None
    event_end:datetime|None=None
    location:str=Field(default='',max_length=240)

    @field_validator('title','summary','content','location')
    @classmethod
    def plain_text(cls,value):
        if re.search(r'<\s*/?\s*[A-Za-z][^>]*>',value):
            raise ValueError('Utilize texto simples, sem código HTML.')
        if any(ord(ch)<32 and ch not in '\n\r\t' for ch in value):
            raise ValueError('O texto contém caracteres não permitidos.')
        return value

    @field_validator('publish_at','expires_at','event_start','event_end')
    @classmethod
    def with_timezone(cls,value):
        if value and (value.tzinfo is None or value.utcoffset() is None):
            raise ValueError('Informe data e horário com fuso horário.')
        return value.astimezone(UTC) if value else None

    @model_validator(mode='after')
    def dates(self):
        if self.kind=='event' and not self.event_start:raise ValueError('Informe a data e o horário do evento.')
        if self.kind=='news' and (self.event_start or self.event_end or self.location):raise ValueError('Datas e local são exclusivos de eventos.')
        if self.event_end and (not self.event_start or self.event_end<self.event_start):raise ValueError('O encerramento deve ocorrer após o início do evento.')
        if self.expires_at and self.publish_at and self.expires_at<=self.publish_at:raise ValueError('O fim da publicação deve ser posterior ao início.')
        if self.status=='published' and not self.publish_at:self.publish_at=now()
        if self.status=='published' and self.expires_at and self.expires_at<=self.publish_at:raise ValueError('O período de publicação já terminou.')
        return self


class PostUpdate(PostInput):
    version:int=Field(ge=1)


def post_output(row,manage=False):
    data={key:getattr(row,key) for key in ('id','school_id','title','summary','content','kind','audience','pinned','publish_at','expires_at','event_start','event_end','location')}
    for key in ('publish_at','expires_at','event_start','event_end'):
        if data[key] is not None:data[key]=utc(data[key])
    if manage:
        data.update(version=row.version,status=row.status,created_at=utc(row.created_at),updated_at=utc(row.updated_at))
    return data


def public_school(db,school_id):
    school=db.get(m.School,school_id)
    if not school or not school.active:fail(404,'Escola não encontrada.')
    return school


def visible_query(school_id,audiences):
    instant=now()
    return select(SchoolCommunityPost).where(
        SchoolCommunityPost.school_id==school_id,
        SchoolCommunityPost.status=='published',
        SchoolCommunityPost.audience.in_(audiences),
        SchoolCommunityPost.publish_at<=instant,
        or_(SchoolCommunityPost.expires_at.is_(None),SchoolCommunityPost.expires_at>instant),
    )


def filter_query(stmt,q='',kind='',upcoming=False):
    if kind and kind not in ('news','event'):fail(422,'Tipo de publicação inválido.')
    if kind:stmt=stmt.where(SchoolCommunityPost.kind==kind)
    if q.strip():stmt=stmt.where(or_(SchoolCommunityPost.title.icontains(q.strip(),autoescape=True),SchoolCommunityPost.summary.icontains(q.strip(),autoescape=True),SchoolCommunityPost.content.icontains(q.strip(),autoescape=True)))
    if upcoming:stmt=stmt.where(SchoolCommunityPost.kind=='event',func.coalesce(SchoolCommunityPost.event_end,SchoolCommunityPost.event_start)>=now())
    return stmt


def page_output(db,stmt,page,page_size,manage=False,upcoming=False):
    total=db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    order=[SchoolCommunityPost.event_start.asc(),SchoolCommunityPost.id] if upcoming else [SchoolCommunityPost.pinned.desc(),SchoolCommunityPost.publish_at.desc(),SchoolCommunityPost.created_at.desc(),SchoolCommunityPost.id]
    rows=db.scalars(stmt.order_by(*order).offset((page-1)*page_size).limit(page_size))
    return {'items':[post_output(row,manage) for row in rows],'total':total,'page':page,'page_size':page_size}


def role_audiences(role):
    # A função só é usada após conferir o vínculo do usuário à escola.
    if role in ('admin','direction','coordination','secretary'):return AUDIENCES
    return ('public','authenticated',{'student':'students','guardian':'guardians','teacher':'teachers'}.get(role,'authenticated'))


@router.get('/schools/{school_id}/community-posts')
def manage_posts(db:DB,user:Actor,school:Scope,q:str=Query('',max_length=160),kind:str='',status:str='',page:int=Query(1,ge=1),page_size:int=Query(12,ge=1,le=50)):
    require(user,'schools.manage')
    stmt=filter_query(select(SchoolCommunityPost).where(SchoolCommunityPost.school_id==school.id),q,kind)
    if status:
        if status not in ('draft','published','archived'):fail(422,'Situação de publicação inválida.')
        stmt=stmt.where(SchoolCommunityPost.status==status)
    return page_output(db,stmt,page,page_size,True)


@router.post('/schools/{school_id}/community-posts',status_code=201)
def create_post(data:PostInput,db:DB,user:Actor,school:Scope,request:Request):
    require(user,'schools.manage');lock_school(db,school.id)
    row=SchoolCommunityPost(school_id=school.id,created_by=user.id,updated_by=user.id,**data.model_dump())
    db.add(row);db.flush();audit(db,request,user,'community.created',row,school.id,{'kind':row.kind,'audience':row.audience,'status':row.status})
    return post_output(row,True)


@router.patch('/schools/{school_id}/community-posts/{id}')
def update_post(id:str,data:PostUpdate,db:DB,user:Actor,school:Scope,request:Request):
    require(user,'schools.manage');lock_school(db,school.id)
    row=scoped(db,SchoolCommunityPost,id,school.id);check_version(row,data.version)
    for key,value in data.model_dump(exclude={'version'}).items():setattr(row,key,value)
    row.version+=1;row.updated_by=user.id
    audit(db,request,user,'community.updated',row,school.id,{'kind':row.kind,'audience':row.audience,'status':row.status})
    return post_output(row,True)


@router.delete('/schools/{school_id}/community-posts/{id}')
def delete_post(id:str,db:DB,user:Actor,school:Scope,request:Request,version:int=Query(ge=1)):
    require(user,'schools.manage');lock_school(db,school.id)
    row=scoped(db,SchoolCommunityPost,id,school.id);check_version(row,version)
    if row.status!='draft':fail(409,'Arquive a publicação para removê-la dos canais da escola. Somente rascunhos podem ser excluídos.')
    audit(db,request,user,'community.draft.deleted',row,school.id,{'title':row.title});db.delete(row)
    return {'deleted':True}


@router.get('/schools/{school_id}/community-feed')
def school_feed(school_id:str,db:DB,user:Actor,q:str=Query('',max_length=160),kind:str='',upcoming:bool=False,page:int=Query(1,ge=1),page_size:int=Query(12,ge=1,le=50)):
    allowed_school(db,user,school_id)
    stmt=filter_query(visible_query(school_id,role_audiences(user.role)),q,kind,upcoming)
    return page_output(db,stmt,page,page_size,upcoming=upcoming)


@router.get('/public/schools/{school_id}/community-feed')
def public_feed(school_id:str,db:DB,q:str=Query('',max_length=160),kind:str='',upcoming:bool=False,page:int=Query(1,ge=1),page_size:int=Query(12,ge=1,le=50)):
    public_school(db,school_id)
    return page_output(db,filter_query(visible_query(school_id,('public',)),q,kind,upcoming),page,page_size,upcoming=upcoming)


@router.get('/portal/community-feed')
def guardian_feed(db:DB,account:Parent,q:str=Query('',max_length=160),kind:str='',upcoming:bool=False,page:int=Query(1,ge=1),page_size:int=Query(12,ge=1,le=50)):
    public_school(db,account.school_id)
    return page_output(db,filter_query(visible_query(account.school_id,('public','authenticated','guardians')),q,kind,upcoming),page,page_size,upcoming=upcoming)
