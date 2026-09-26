"""Console de diagnóstico e exportação local, exclusivos do administrador."""
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
import hashlib
import html
import json
import shutil
import time
import zipfile
from typing import Literal
from fastapi import APIRouter, Query, Request
from fastapi.responses import Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select, func, text
from . import models as m, telemetry
from .config import settings
from .db import SessionLocal
from .security import DB, Actor, fail, request_csrf, utc
from .common import audit
from .portal_access import readiness

router=APIRouter(prefix='/api/v1/diagnostics',tags=['Diagnóstico da instalação'])


def admin_only(user):
    if user.role!='admin':fail(403,'O diagnóstico técnico é restrito ao administrador da instalação.')


def snapshot(db):
    cfg=settings()
    info={'generated_at':datetime.now(timezone.utc).isoformat(),'version':cfg.app_version,
          'database':{'status':'unavailable'},'build':{},'storage':{},'services':[],
          'logging':{'status':'degraded' if telemetry.LAST_WRITE_ERROR else 'ok',
                     'retention_days':telemetry.RETENTION_DAYS,'max_bytes_per_service':telemetry.MAX_BYTES*(telemetry.BACKUPS+1),
                     'scope':'app, worker e worker-ocr; sem logs do host/proxy/PostgreSQL'},
          'configuration':{'https':cfg.app_url.startswith('https://'),'secure_cookies':cfg.cookie_secure,
                           'storage_backend':cfg.storage_backend,'smtp_configured':bool(cfg.smtp_host and cfg.smtp_from)},
          'queues':{},'portal':[]}
    try:
        data=json.loads((cfg.frontend_path/'build-info.json').read_text())
        info['build']={k:data.get(k) for k in ('version','build_id','pipeline')}
    except (OSError,ValueError):info['build']={'status':'unavailable'}
    try:
        disk=shutil.disk_usage(cfg.storage_path.parent)
        info['storage']={'status':'ok','free_bytes':disk.free,'total_bytes':disk.total,
                         'note':'Disco local do volume; não mede a disponibilidade de S3 remoto.'}
    except OSError:info['storage']={'status':'unavailable'}
    for service in telemetry.SERVICES:
        item={'service':service,'status':'not_observed','last_seen':None}
        try:
            path=telemetry.directory()/(service+'.state.json')
            if not path.is_symlink():
                state=json.loads(path.read_text()[:1024]);dt=utc(datetime.fromisoformat(state['timestamp']))
                age=time.time()-dt.timestamp()
                item.update(last_seen=dt.isoformat(),status='recent' if 0<=age<=360 else 'stale')
        except (OSError,KeyError,TypeError,ValueError):pass
        info['services'].append(item)
    try:
        db.execute(text('SELECT 1'))
        revision=list(db.scalars(text('SELECT version_num FROM alembic_version')))
        info['database']={'status':'ok','dialect':db.bind.dialect.name,'migrations':revision}
        from .assisted_models import OcrJob
        for label,model in [('integrations',m.IntegrationJob),('communication',m.ConnectMessageJob),('ocr',OcrJob)]:
            info['queues'][label]=dict(db.execute(select(model.status,func.count()).group_by(model.status)).all())
        for school in db.scalars(select(m.School).order_by(m.School.name).limit(100)):
            info['portal'].append({'school_name':school.name,**readiness(db,school)})
    except Exception as exc:
        db.rollback();info['database']={'status':'unavailable','error_type':type(exc).__name__}
    return info


def filters(service='',level='',request_id='',since=None,until=None):
    if service and service not in telemetry.SERVICES:fail(422,'Serviço inválido.')
    since=utc(since) if since else None;until=utc(until) if until else None
    if since and until and since>until:fail(422,'O início deve ser anterior ao fim do período.')
    return dict(service=service,level=level,request_id=request_id,since=since,until=until)


@router.get('/summary')
def summary(db:DB,user:Actor,request:Request):
    admin_only(user)
    audit(db,request,user,'diagnostics.viewed',user,details={'scope':'technical_summary'})
    return snapshot(db)


@router.get('/events')
def events(user:Actor,db:DB,request:Request,
           service:Literal['','app','worker','worker-ocr']='',level:Literal['','INFO','WARNING','ERROR']='',
           request_id:str=Query('',pattern=r'^([a-f0-9]{24})?$'),since:datetime|None=None,until:datetime|None=None,
           page:int=Query(1,ge=1,le=100),page_size:int=Query(50,ge=1,le=100)):
    admin_only(user)
    found=telemetry.recent_events(**filters(service,level,request_id,since,until))
    rows=found.pop('items');total=len(rows)
    audit(db,request,user,'diagnostics.logs_viewed',user,details={'service':service,'level':level})
    return {**found,'items':rows[(page-1)*page_size:page*page_size],'total':total,'page':page,'page_size':page_size}


def bundle(db,options):
    summary=snapshot(db)
    found=telemetry.recent_events(**options)
    serialize=lambda x:json.dumps(x,ensure_ascii=False,indent=2,default=str).encode()
    # Exportação limitada ao recorte retido; nunca exporta .env, dump de banco ou anexos.
    files={'system.json':serialize(summary),
           'events.jsonl':b''.join((json.dumps(r,ensure_ascii=False)+'\n').encode() for r in found['items']),
           'manifest.json':serialize({'created_at':summary['generated_at'],'filters':options,'records':len(found['items']),
               'truncated':found['truncated'],'unreadable_records':found['unreadable_records'],'schema_version':1}),
           'LEIA-ME.txt':('Diagnóstico da instalação escolar. Horários em UTC.\n'
               'Logs técnicos sanitizados do período retido, sem senhas, cookies, CPF, OCR, anexos, corpos de requisições ou SQL.\n'
               'Ausência de evento não comprova ausência de erro. Logs anteriores a esta atualização não são reconstruídos.\n'
               'Recent/stale identifica atividade do processo, não é o estado Docker. Host, proxy e PostgreSQL não são coletados.\n'
               'Não publique este pacote: compartilhe somente com suporte autorizado.\n').encode(),
           'resumo.html':('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Diagnóstico da escola</title>'
              '<h1>Diagnóstico da instalação</h1><p>Arquivo local, sem scripts ou recursos externos.</p><pre>'+html.escape(json.dumps(summary,ensure_ascii=False,indent=2))+'</pre></html>').encode()}
    files['SHA256SUMS']= ''.join(hashlib.sha256(v).hexdigest()+'  '+k+'\n' for k,v in files.items()).encode()
    output=BytesIO()
    with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as z:
        for name,data in files.items():z.writestr(name,data)
    return output.getvalue()


@router.get('/export')
def export(db:DB,user:Actor,request:Request,
           service:Literal['','app','worker','worker-ocr']='',level:Literal['','INFO','WARNING','ERROR']='',
           request_id:str=Query('',pattern=r'^([a-f0-9]{24})?$'),since:datetime|None=None,until:datetime|None=None):
    admin_only(user)
    from .portal import rate_limit
    rate_limit(db,request,'diagnostics-export',user.id,6,600)
    data=bundle(db,filters(service,level,request_id,since,until))
    audit(db,request,user,'diagnostics.exported',user,details={'bytes':len(data),'service':service,'level':level})
    return Response(data,media_type='application/zip',headers={'Content-Disposition':'attachment; filename="diagnostico-escola.zip"','Cache-Control':'no-store'})


class ClientEvent(BaseModel):
    model_config=ConfigDict(extra='forbid')
    event:Literal['javascript_error','unhandled_rejection','resource_error','portal_bootstrap_failed']
    area:Literal['school','portal']
    reference:str=Field(default='',pattern=r'^([a-f0-9]{24})?$')


@router.post('/client-event',status_code=202)
def client_event(data:ClientEvent,db:DB,request:Request):
    # Endpoint restrito a códigos conhecidos, sem mensagem, URL, stack, dados de formulário ou texto livre.
    request_csrf(request)
    from .portal import rate_limit
    peer=request.client.host if request.client else 'unknown'
    rate_limit(db,request,'client-telemetry',peer,12,600)
    telemetry.emit('client.'+data.event,level='WARNING',kind=data.area,request_id=data.reference or getattr(request.state,'request_id',''))
    return {'ok':True}


if __name__=='__main__':
    # Uso somente pelo operador com acesso ao container; continua sanitizado se o banco cair.
    import argparse
    parser=argparse.ArgumentParser(description='Exportar diagnóstico técnico local (sem dados pessoais).')
    parser.add_argument('--output',required=True)
    args=parser.parse_args()
    with SessionLocal() as db:data=bundle(db,filters())
    path=Path(args.output)
    import os
    fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
    with os.fdopen(fd,'wb') as f:f.write(data)
    telemetry.emit('diagnostics.cli_exported')
    print('Diagnóstico sanitizado criado.')
