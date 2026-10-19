"""Portabilidade assíncrona: pacote durável e aplicação atômica/idempotente."""
import json
from pathlib import Path
from fastapi import APIRouter, File, Form, Request, UploadFile
from sqlalchemy import ForeignKey, JSON, String, UniqueConstraint, select
from sqlalchemy.orm import Mapped, mapped_column
from . import models as m
from .db import Base, Record, SessionLocal, uid
from .config import settings
from .common import output, audit
from .security import DB, Actor, Scope, fail, lock_school
from .integration_core import enqueue, IntegrationFailure
from . import legacy_import as legacy

router=APIRouter(prefix='/api/v1/schools/{school_id}/legacy-import/operations',tags=['Operações de portabilidade'])


class ImportOperation(Record,Base):
    __tablename__='import_operations'
    school_id:Mapped[str]=mapped_column(ForeignKey('schools.id'),index=True)
    created_by:Mapped[str]=mapped_column(ForeignKey('users.id'))
    fingerprint:Mapped[str]=mapped_column(String(64))
    job_id:Mapped[str|None]=mapped_column(ForeignKey('integration_jobs.id'))
    stage:Mapped[str]=mapped_column(String(40),default='queued')
    progress:Mapped[dict]=mapped_column(JSON,default=dict)
    result:Mapped[dict]=mapped_column(JSON,default=dict)
    options:Mapped[dict]=mapped_column(JSON,default=dict)
    __table_args__=(UniqueConstraint('school_id','fingerprint',name='uq_import_operation_selection'),)


def directory(ident):
    from uuid import UUID
    if str(UUID(ident))!=ident:raise ValueError('Invalid operation id')
    return settings().storage_path.parent/'import-operations'/ident


def view(db,row):
    job=db.get(m.IntegrationJob,row.job_id)
    return {**output(row,('options',)), 'status':job.status if job else 'failed',
        'attempts':job.attempts if job else 0,'error_code':job.error_code if job else 'JOB_UNAVAILABLE',
        'available_at':job.available_at if job else None}


@router.get('')
def history(db:DB,user:Actor,school:Scope):
    legacy._admin(user)
    return [view(db,row) for row in db.scalars(select(ImportOperation).where(ImportOperation.school_id==school.id).order_by(ImportOperation.created_at.desc()).limit(100))]


@router.post('',status_code=202)
def queue(db:DB,user:Actor,school:Scope,request:Request,
    fingerprint:str=Form(...),confirmation:str=Form(...),selection:str=Form(...),
    backup:UploadFile=File(...),container_media:UploadFile|None=File(None)):
    legacy._admin(user)
    if confirmation.strip().upper()!='IMPORTAR':fail(422,'Digite IMPORTAR para confirmar.')
    lock_school(db,school.id)
    existing=db.scalar(select(ImportOperation).where(ImportOperation.school_id==school.id,ImportOperation.fingerprint==fingerprint))
    if existing:return view(db,existing)
    # Validação e prévia mantêm os mesmos limites e fronteira da seleção original.
    with legacy._source(backup,container_media) as source:
        legacy._configure_selection(source,db,school,selection)
        if source.fingerprint!=fingerprint:fail(409,'A seleção mudou. Gere uma nova prévia.')
        issues=legacy._selection_issues(source,db,school)
        if issues or not any(source.selected_keys.values()):fail(422,'Revise a seleção. '+' '.join(issues))
        total=sum(len(x) for x in source.selected_keys.values())
    ident=uid();root=directory(ident);root.mkdir(parents=True,mode=0o700)
    options={'selection':selection,'backup_name':Path(backup.filename or 'backup.sqlite').name,'media_name':Path(container_media.filename or 'media.zip').name if container_media else ''}
    try:
        for name,upload in [('backup',backup),('media',container_media)]:
            if upload:
                upload.file.seek(0);path=root/name
                legacy._copy_limited(upload.file,path,settings().legacy_import_max_mb*1024*1024);path.chmod(0o600)
                db.info.setdefault('new_files',[]).append(path)
        row=ImportOperation(id=ident,school_id=school.id,created_by=user.id,fingerprint=fingerprint,options=options,progress={'selected_records':total,'archived_records':0})
        db.add(row);db.flush()
        job=enqueue(db,school.id,'legacy_import',{'operation_id':ident},'legacy-import:'+ident)
        row.job_id=job.id;db.flush();audit(db,request,user,'legacy_import.queued',row,school.id)
        return view(db,row)
    except BaseException:
        import shutil
        shutil.rmtree(root,ignore_errors=True)
        raise


@router.post('/{ident}/resume')
def resume(ident:str,db:DB,user:Actor,school:Scope,request:Request):
    legacy._admin(user);lock_school(db,school.id)
    row=db.scalar(select(ImportOperation).where(ImportOperation.id==ident,ImportOperation.school_id==school.id).with_for_update())
    if not row:fail(404,'Operação não encontrada.')
    job=db.get(m.IntegrationJob,row.job_id)
    if job.status in {'pending','processing','retry','completed'}:return view(db,row)
    if job.attempts>=5:fail(409,'Limite de cinco tentativas atingido. Consulte o diagnóstico.')
    if not (directory(row.id)/'backup').is_file():fail(409,'Pacote indisponível. Gere uma nova prévia.')
    from datetime import timedelta
    from .db import now
    from .security import utc
    if utc(job.updated_at)>now()-timedelta(seconds=30):fail(429,'Aguarde 30 segundos para retomar.')
    job.status='retry';job.error_code='';job.available_at=now();row.stage='queued'
    audit(db,request,user,'legacy_import.resumed',row,school.id)
    return view(db,row)


def execute(db,job,payload):
    from .access_security import bind_access
    row=db.get(ImportOperation,payload['operation_id'])
    if not row or row.school_id!=job.school_id:raise IntegrationFailure('IMPORT_SCOPE_MISMATCH')
    user=db.get(m.User,row.created_by);school=db.get(m.School,row.school_id)
    if not user or not user.active or not school or not school.active:raise IntegrationFailure('IMPORT_ACCESS_REVOKED')
    bind_access(db,user,school.id);legacy._admin(user)
    previous=db.scalar(select(m.LegacyImportRun).where(m.LegacyImportRun.school_id==school.id,m.LegacyImportRun.fingerprint==row.fingerprint))
    if previous:
        row.stage='completed';row.result={'run_id':previous.id,'summary':previous.summary};return previous.id
    def progress(stage,counts=None):
        # PostgreSQL persiste a observação fora da transação dos dados importados.
        # No SQLite de testes, evita uma segunda conexão concorrente de escrita.
        if db.bind.dialect.name=='postgresql':
            with SessionLocal.begin() as observer:
                current=observer.get(ImportOperation,row.id);current.stage=stage
                from datetime import timedelta
                from .db import now
                observer.get(m.IntegrationJob,job.id).lease_until=now()+timedelta(minutes=5)
                if counts:current.progress={**current.progress,**dict(counts)}
        else:row.stage=stage
    root=directory(row.id);options=row.options
    intents=root/'storage-intents.json'
    from .storage import delete_key
    recorded=json.loads(intents.read_text()) if intents.is_file() else []
    for backend,bucket,key in recorded:
        if not key.startswith(school.id+'/'):raise IntegrationFailure('IMPORT_STORAGE_SCOPE_MISMATCH')
        if not db.scalar(select(m.FileRecord.id).where(m.FileRecord.storage_key==key,m.FileRecord.storage_backend==backend)):
            delete_key(backend,key,bucket)
    recorded=[]
    def storage_intent(backend,bucket,key):
        import os
        recorded.append((backend,bucket,key));temporary=intents.with_suffix('.part')
        with temporary.open('w') as f:json.dump(recorded,f);f.flush();os.fsync(f.fileno())
        temporary.chmod(0o600);temporary.replace(intents)
    db.info['storage_intent']=storage_intent
    db.info['import_progress']=progress
    from contextlib import ExitStack
    try:
        progress('validating')
        with ExitStack() as stack:
            backup=UploadFile(file=stack.enter_context((root/'backup').open('rb')),filename=options['backup_name'])
            media=UploadFile(file=stack.enter_context((root/'media').open('rb')),filename=options['media_name']) if options['media_name'] else None
            req=Request({'type':'http','headers':[],'client':('worker',0),'method':'POST','path':'/legacy-import/operations'})
            result=legacy.apply_import(db,user,school,req,row.fingerprint,'IMPORTAR',backup,media,options['selection'])
        row.result=result;row.stage='completed';row.progress={**row.progress,'archived_records':result['summary']['archive_record_count']}
        return result['run_id']
    finally:
        db.info.pop('import_progress',None);db.info.pop('storage_intent',None)
