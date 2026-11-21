"""Investigação administrativa de operações, sem mutação dos registros de auditoria."""
from datetime import UTC, datetime
import csv
import io
import json
import re
from typing import Literal
from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import Response
from sqlalchemy import func, select
from . import models as m
from .admin_tools import require_admin
from .common import audit, output
from .security import Actor, DB, Scope, fail, utc

router = APIRouter()
SECRET = re.compile(r'password|senha|secret|token|authorization|cookie|private.?key|api.?key|encrypted|certificate|pfx|p12|credentials|body|content|payload', re.I)


def safe_details(value, depth=0):
    if depth > 8:return '[limite de profundidade]'
    if isinstance(value,dict):
        return {str(k): '[protegido]' if SECRET.search(str(k)) else safe_details(v,depth+1) for k,v in list(value.items())[:250]}
    if isinstance(value,list):return [safe_details(v,depth+1) for v in value[:250]]
    if isinstance(value,str):return value[:4000]
    return value


def audit_filters(action:str=Query('',max_length=80),entity_type:str=Query('',max_length=60),
                  entity_id:str=Query('',max_length=64),actor_id:str=Query('',max_length=64),
                  request_id:str=Query('',max_length=64),since:datetime|None=None,until:datetime|None=None,
                  include_global:bool=False):
    since=utc(since) if since else None;until=utc(until) if until else None
    if since and until and since>until:fail(422,'O início deve ser anterior ao fim do período.')
    return dict(action=action.strip(),entity_type=entity_type.strip(),entity_id=entity_id.strip(),
                actor_id=actor_id.strip(),request_id=request_id.strip(),since=since,until=until,include_global=include_global)


def statement(school_id,filters):
    # Parâmetro legado aceito por compatibilidade, sem misturar eventos da instalação.
    stmt=select(m.AuditEvent).where(m.AuditEvent.school_id==school_id)
    for key in ('action','entity_type','entity_id','actor_id','request_id'):
        if filters[key]:stmt=stmt.where(getattr(m.AuditEvent,key)==filters[key])
    if filters['since']:stmt=stmt.where(m.AuditEvent.created_at>=filters['since'])
    if filters['until']:stmt=stmt.where(m.AuditEvent.created_at<=filters['until'])
    return stmt


def record(row,names):
    return {**output(row,('details',)), 'created_at':utc(row.created_at).astimezone(UTC).isoformat(), 'details':safe_details(row.details),
            'actor_name':names.get(row.actor_id,'Sistema' if row.actor_id is None else 'Usuário removido'),
            'scope':'institution' if row.school_id is None else 'school'}


def records(db,rows):
    ids={row.actor_id for row in rows if row.actor_id}
    names=dict(db.execute(select(m.User.id,m.User.name).where(m.User.id.in_(ids))).all()) if ids else {}
    return [record(row,names) for row in rows]


@router.get('/audit')
def audit_list(db:DB,user:Actor,school:Scope,options:dict=Depends(audit_filters),
               page:int=Query(1,ge=1),page_size:int=Query(30,ge=1,le=100)):
    require_admin(user)
    stmt=statement(school.id,options)
    total=db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows=list(db.scalars(stmt.order_by(m.AuditEvent.created_at.desc(),m.AuditEvent.id.desc()).offset((page-1)*page_size).limit(page_size)))
    return {'items':records(db,rows),'total':total,'page':page,'page_size':page_size}


@router.get('/audit/options')
def options(db:DB,user:Actor,school:Scope,include_global:bool=False):
    require_admin(user)
    scope=m.AuditEvent.school_id==school.id
    return {'actions':list(db.scalars(select(m.AuditEvent.action).where(scope).distinct().order_by(m.AuditEvent.action).limit(500))),
            'entities':list(db.scalars(select(m.AuditEvent.entity_type).where(scope).distinct().order_by(m.AuditEvent.entity_type).limit(200))),
            'actors':[{'id':r[0],'name':r[1]} for r in db.execute(select(m.User.id,m.User.name).join(m.AuditEvent,m.AuditEvent.actor_id==m.User.id).where(scope).distinct().order_by(m.User.name).limit(1000))]}


@router.get('/audit/export')
def export(db: DB, user: Actor, school: Scope, request: Request, options: dict = Depends(audit_filters),
           format: Literal['csv', 'pdf'] = 'csv'):
    require_admin(user)
    from .diagnostics import download_filename
    from .portal import rate_limit
    rate_limit(db,request,'audit-export',user.id,6,600)
    stmt=statement(school.id,options)
    limit = 1000 if format == 'pdf' else 10000
    rows = list(db.scalars(stmt.order_by(m.AuditEvent.created_at.desc(), m.AuditEvent.id.desc()).limit(limit + 1)))
    if len(rows) > limit:
        fail(422, f'O limite da exportação em {format.upper()} é de {limit} operações. Refine o período.')
    if format == 'pdf':
        from .school_reports import render_table
        columns = [{'key': key, 'label': label, 'width': width} for key, label, width in (
            ('date', 'Data (UTC)', 1), ('action', 'Operação', 1.3), ('actor', 'Autor', 1),
            ('entity', 'Tipo de registro', 1), ('record', 'Identificador', 1.3))]
        names = dict(db.execute(select(m.User.id, m.User.name).where(
            m.User.id.in_({row.actor_id for row in rows if row.actor_id}))).all())
        entries = [{'date': utc(row.created_at).astimezone(UTC).strftime('%d/%m/%Y %H:%M'),
                    'action': row.action, 'actor': names.get(row.actor_id, 'Sistema' if not row.actor_id else 'Usuário removido'),
                    'entity': row.entity_type, 'record': row.entity_id} for row in rows]
        captions = {'action': 'Operação', 'entity_type': 'Tipo de registro', 'entity_id': 'Identificador',
                    'actor_id': 'Autor (ID)', 'request_id': 'Referência', 'since': 'Desde (UTC)', 'until': 'Até (UTC)'}
        applied = [{'label': caption, 'value': options[key]} for key, caption in captions.items() if options[key]]
        pdf = render_table(school, 'Histórico de operações', columns, entries, module='Auditoria',
                           filters=applied, issuer=user.name, db=db, circulation='Uso administrativo restrito',
                           notes=['Operações da instituição em ordem cronológica decrescente. O detalhamento de cada alteração está disponível na consulta administrativa.'])
        audit(db, request, user, 'audit.exported', school, school.id, details={'records': len(rows), 'format': 'pdf'})
        return Response(pdf, media_type='application/pdf', headers={'Cache-Control':'no-store',
                        'Content-Disposition':'attachment; filename="auditoria.pdf"'})
    stream=io.StringIO(newline='');writer=csv.writer(stream,delimiter=';')
    writer.writerow(['Data UTC','Operação','Tipo de registro','Registro','Autor','Autor ID','Origem','Referência','IP','Detalhes'])
    def cell(v):
        value=str(v if v is not None else '')
        return "'"+value if value.lstrip().startswith(('=','+','-','@')) else value
    for row in records(db,rows):
        writer.writerow([cell(v) for v in [row['created_at'],row['action'],row['entity_type'],row['entity_id'],row['actor_name'],row['actor_id'],row['scope'],row['request_id'],row['ip'],json.dumps(row['details'],ensure_ascii=False)]])
    audit(db,request,user,'audit.exported',school,school.id,details={'records':len(rows)})
    filename=download_filename(db,'auditoria',school.id).removesuffix('.zip')+'.csv'
    return Response(stream.getvalue().encode('utf-8-sig'),media_type='text/csv; charset=utf-8',headers={'Content-Disposition':f'attachment; filename="{filename}"','Cache-Control':'no-store'})
