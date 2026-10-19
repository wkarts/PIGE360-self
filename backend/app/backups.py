"""Backups administrativos consistentes de PostgreSQL, documentos e MinIO.

O worker mantém SHARE locks e um snapshot exportado durante a cópia. Os objetos
são identificados pelo cadastro e SHA-256, nunca por URLs públicas. Não remove
backups nem executa restauração de produção por uma requisição HTTP.
"""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time
from urllib.parse import urlsplit
import zipfile

import httpx
from fastapi import APIRouter, Request
from fastapi.responses import FileResponse
from pydantic import Field
from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, String, Text, select, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Mapped, mapped_column
from . import models as m
from .common import audit, output
from .config import settings
from .db import Base, Record, SessionLocal, engine, now
from .integration_core import seal, unseal
from .schemas import Input
from .security import Actor, DB, fail, utc
from .admin_tools import require_admin
from .storage import read_bytes

router=APIRouter(prefix='/api/v1/backups',tags=['Backup da instalação'])


class BackupRun(Record,Base):
    __tablename__='backup_runs'
    created_by:Mapped[str]=mapped_column(ForeignKey('users.id'))
    status:Mapped[str]=mapped_column(String(24),default='queued')
    stage:Mapped[str]=mapped_column(String(40),default='queued')
    error_code:Mapped[str]=mapped_column(String(80),default='')
    sha256:Mapped[str]=mapped_column(String(64),default='')
    size:Mapped[int]=mapped_column(BigInteger,default=0)
    completed_at:Mapped[object|None]=mapped_column(DateTime(timezone=True))
    remote_status:Mapped[str]=mapped_column(String(24),default='not_sent')
    remote_id:Mapped[str]=mapped_column(String(256),default='')


class BackupTarget(Record,Base):
    __tablename__='backup_targets'
    provider:Mapped[str]=mapped_column(String(16))
    folder:Mapped[str]=mapped_column(String(256),default='')
    encrypted_token:Mapped[str]=mapped_column(Text)


def directory():
    root=settings().storage_path.parent/'backups'
    root.mkdir(parents=True,exist_ok=True,mode=0o700)
    return root


def bundle_path(ident):
    from uuid import UUID
    if str(UUID(ident))!=ident:raise ValueError('Invalid backup id')
    return directory()/f'pige360-{ident}.zip'


def pg_environment():
    url=make_url(settings().database_url)
    return {**os.environ,'PGHOST':url.host or 'localhost','PGPORT':str(url.port or 5432),
        'PGDATABASE':url.database or '', 'PGUSER':url.username or '', 'PGPASSWORD':url.password or ''}


def add_objects(archive,db,progress=lambda:None):
    from .assisted_models import OcrJob
    manifest=[];seen=set()
    for model in (m.FileRecord,m.AdmissionAttachment,OcrJob):
        for record in db.scalars(select(model)):
            progress()
            backend=getattr(record,'storage_backend','local') or 'local'
            bucket=getattr(record,'bucket_name','') or (settings().storage_bucket if backend=='s3' else '')
            key=(backend,bucket,record.storage_key)
            if key in seen:continue
            seen.add(key)
            # OCR expirado é temporário; não impede backup do acervo permanente.
            if model is OcrJob and utc(record.expires_at)<=now():continue
            data=read_bytes(record)
            if len(data)!=record.size or hashlib.sha256(data).hexdigest()!=record.sha256:
                raise ValueError('BACKUP_OBJECT_INTEGRITY')
            path=f'objects/{len(manifest):08d}'
            archive.writestr(path,data)
            manifest.append({'path':path,'backend':backend,'bucket':bucket,'key':record.storage_key,
                'sha256':record.sha256,'size':len(data)})
    return manifest


def create_bundle(ident):
    if engine.dialect.name!='postgresql':raise ValueError('BACKUP_REQUIRES_POSTGRESQL')
    destination=bundle_path(ident)
    temporary=destination.with_suffix('.part')
    last_progress=[time.monotonic()]
    def progress():
        if time.monotonic()-last_progress[0]<25:return
        with SessionLocal.begin() as heartbeat:
            row=heartbeat.get(BackupRun,ident)
            if row:row.updated_at=now()
        last_progress[0]=time.monotonic()
    try:
        with tempfile.TemporaryDirectory(prefix='pige-backup-') as temp:
            dump=Path(temp)/'database.dump'
            with engine.connect().execution_options(isolation_level='REPEATABLE READ') as connection:
                with connection.begin():
                    connection.execute(text("SET LOCAL lock_timeout='10s'"))
                    # Uma ordem única evita deadlocks entre backups. A fila e os
                    # alvos de backup ficam fora dos locks para exibir progresso.
                    tables=sorted(t.name for t in Base.metadata.tables.values() if t.name not in {'backup_runs','backup_targets'})
                    names=','.join(connection.dialect.identifier_preparer.quote(name) for name in tables)
                    connection.execute(text('LOCK TABLE '+names+' IN SHARE MODE'))
                    snapshot=connection.scalar(text('SELECT pg_export_snapshot()'))
                    subprocess.run(['pg_dump','--format=custom','--no-owner','--snapshot='+snapshot,
                        '--file='+str(dump)],env=pg_environment(),check=True,timeout=300,
                        stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
                    with zipfile.ZipFile(temporary,'x',compression=zipfile.ZIP_DEFLATED,compresslevel=4) as archive:
                        archive.write(dump,'database.dump')
                        with SessionLocal(bind=connection) as db:objects=add_objects(archive,db,progress)
                        roots=[];trust=settings().signature_trust_roots_dir
                        if trust and trust.is_dir():
                            for path in sorted(trust.iterdir()):
                                if path.is_file() and not path.is_symlink() and path.suffix.lower() in {'.pem','.der','.cer','.crt'}:
                                    data=path.read_bytes();name='trust-roots/'+path.name
                                    archive.writestr(name,data);roots.append({'path':name,'sha256':hashlib.sha256(data).hexdigest(),'size':len(data)})
                        with dump.open('rb') as handle:digest=hashlib.file_digest(handle,'sha256').hexdigest()
                        archive.writestr('manifest.json',json.dumps({'format':'pige360-backup-v2','created_at':now().isoformat(),
                            'backup_id':ident,'database_sha256':digest,'objects':objects,'trust_roots':roots},ensure_ascii=False))
        temporary.chmod(0o600);temporary.replace(destination)
        with destination.open('rb') as handle:digest=hashlib.file_digest(handle,'sha256').hexdigest()
        return digest,destination.stat().st_size
    except BaseException:
        temporary.unlink(missing_ok=True)
        raise


def verify_bundle(path):
    """Valida conteúdo e nomes sem extrair caminhos fornecidos pelo pacote."""
    with zipfile.ZipFile(path) as archive:
        if sum(x.file_size for x in archive.infolist())>100*1024**3:raise ValueError('BACKUP_TOO_LARGE')
        if len(archive.infolist())>200_000 or len({x.filename for x in archive.infolist()})!=len(archive.infolist()):
            raise ValueError('BACKUP_INVALID_ARCHIVE')
        if archive.getinfo('manifest.json').file_size>64*1024*1024:raise ValueError('BACKUP_MANIFEST_TOO_LARGE')
        manifest=json.loads(archive.read('manifest.json'))
        if manifest.get('format')!='pige360-backup-v2':raise ValueError('BACKUP_INVALID_FORMAT')
        wanted={'manifest.json','database.dump'};keys=set()
        for item in [*manifest['objects'],*manifest['trust_roots']]:
            name=item['path']
            if name in wanted:raise ValueError('BACKUP_DUPLICATE_PATH')
            if not (name.startswith('objects/') or name.startswith('trust-roots/')) or len(name.split('/'))!=2 or name.endswith('/') or '\\' in name or '..' in name.split('/'):
                raise ValueError('BACKUP_INVALID_PATH')
            wanted.add(name)
            with archive.open(name) as handle:digest=hashlib.file_digest(handle,'sha256').hexdigest()
            if digest!=item['sha256'] or archive.getinfo(name).file_size!=item['size']:raise ValueError('BACKUP_OBJECT_INTEGRITY')
            if 'backend' in item:
                key=item['key']
                if item['backend'] not in {'local','s3'} or not key or key.startswith('/') or '\\' in key or any(x in {'','.','..'} for x in key.split('/')):
                    raise ValueError('BACKUP_INVALID_STORAGE_KEY')
                identity=(item['backend'],item['bucket'],key)
                if identity in keys:raise ValueError('BACKUP_DUPLICATE_OBJECT')
                keys.add(identity)
        if set(archive.namelist())!=wanted:raise ValueError('BACKUP_UNEXPECTED_ENTRY')
        with archive.open('database.dump') as handle:digest=hashlib.file_digest(handle,'sha256').hexdigest()
        if digest!=manifest['database_sha256']:raise ValueError('BACKUP_DATABASE_INTEGRITY')
    return manifest


def process_one():
    from datetime import timedelta
    with SessionLocal() as db:
        # Serializa claims entre workers sem manter lock da instalação no dump.
        installation=db.scalar(select(m.Installation).where(m.Installation.id==1).with_for_update())
        if not installation:return False
        stale=list(db.scalars(select(BackupRun).where(BackupRun.status=='processing',
            BackupRun.updated_at<=now()-timedelta(minutes=30)).with_for_update()))
        for old in stale:
            path=bundle_path(old.id)
            try:
                verify_bundle(path)
                with path.open('rb') as handle:old.sha256=hashlib.file_digest(handle,'sha256').hexdigest()
                old.size=path.stat().st_size;old.status='completed';old.stage='completed';old.completed_at=now()
                old.error_code='BACKUP_RECOVERED_AFTER_INTERRUPTION'
            except Exception:old.status='failed';old.error_code='BACKUP_INTERRUPTED';old.stage='failed'
        if db.scalar(select(BackupRun.id).where(BackupRun.status=='processing').limit(1)):
            db.commit();return bool(stale)
        row=db.scalar(select(BackupRun).where(BackupRun.status=='queued').order_by(
            BackupRun.created_at).with_for_update(skip_locked=True).limit(1))
        if not row:db.commit();return bool(stale)
        row.status='processing';row.stage='database_and_storage';ident=row.id;db.commit()
    try:
        digest,size=create_bundle(ident)
        verify_bundle(bundle_path(ident))
        with SessionLocal.begin() as db:
            row=db.get(BackupRun,ident);row.status='completed';row.stage='completed'
            row.sha256=digest;row.size=size;row.completed_at=now()
    except Exception as error:
        safe={'BACKUP_REQUIRES_POSTGRESQL','BACKUP_OBJECT_INTEGRITY'}
        with SessionLocal.begin() as db:
            row=db.get(BackupRun,ident);row.status='failed';row.stage='failed'
            row.error_code=str(error) if str(error) in safe else 'BACKUP_FAILED_CHECK_STORAGE_DATABASE_AND_TOOLS'
    return True


class Create(Input):
    client_key:str=Field(min_length=36,max_length=36)


@router.get('')
def history(db:DB,user:Actor):
    require_admin(user)
    return {'items':[output(row) for row in db.scalars(select(BackupRun).order_by(BackupRun.created_at.desc()).limit(100))],
        'supported':engine.dialect.name=='postgresql','note':'Backup completo da instalação; inclui todas as escolas. Frequência manual; sem exclusão automática.'}


@router.post('',status_code=202)
def queue(data:Create,db:DB,user:Actor,request:Request):
    require_admin(user)
    try:path=bundle_path(data.client_key)
    except ValueError:fail(422,'Chave de operação inválida.')
    db.scalar(select(m.Installation).where(m.Installation.id==1).with_for_update())
    previous=db.get(BackupRun,data.client_key)
    if previous:return output(previous)
    if db.scalar(select(BackupRun.id).where(BackupRun.status.in_(['queued','processing'])).limit(1)):
        fail(409,'Já existe backup na fila ou em execução. Acompanhe o histórico.')
    row=BackupRun(id=data.client_key,created_by=user.id);db.add(row);db.flush()
    audit(db,request,user,'backup.queued',row)
    return output(row)


@router.get('/{id}/download')
def download(id:str,db:DB,user:Actor,request:Request):
    require_admin(user);row=db.get(BackupRun,id)
    if not row or row.status!='completed':fail(404,'Backup concluído não encontrado.')
    path=bundle_path(row.id)
    if not path.is_file():fail(404,'Arquivo do backup indisponível.')
    with path.open('rb') as handle:digest=hashlib.file_digest(handle,'sha256').hexdigest()
    if digest!=row.sha256:fail(409,'A integridade do backup falhou.')
    audit(db,request,user,'backup.downloaded',row)
    return FileResponse(path,media_type='application/zip',filename=path.name,headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'})


class TargetInput(Input):
    provider:str=Field(pattern=r'^(drive|dropbox)$')
    folder:str=Field(default='',max_length=256)
    access_token:str=Field(default='',max_length=4096)
    version:int|None=Field(default=None,ge=1)


@router.get('/target/configuration')
def target(db:DB,user:Actor):
    require_admin(user);row=db.scalar(select(BackupTarget).limit(1))
    return {'target':{**output(row,('encrypted_token',)),'token_configured':True} if row else None}


@router.put('/target/configuration')
def configure_target(data:TargetInput,db:DB,user:Actor,request:Request):
    require_admin(user)
    db.scalar(select(m.Installation).where(m.Installation.id==1).with_for_update())
    row=db.scalar(select(BackupTarget).limit(1))
    if row:
        from .security import check_version
        if data.version is None:fail(409,'Recarregue a configuração do destino.')
        check_version(row,data.version)
    else:row=BackupTarget(encrypted_token='');db.add(row)
    if data.provider=='dropbox' and (data.folder and not data.folder.startswith('/') or any(x in {'.','..'} for x in data.folder.split('/'))):
        fail(422,'Informe uma pasta Dropbox absoluta, sem segmentos relativos.')
    if data.provider=='drive' and data.folder and not __import__('re').fullmatch(r'[A-Za-z0-9_-]+',data.folder):fail(422,'Informe o ID da pasta do Google Drive.')
    if data.access_token:row.encrypted_token=seal({'access_token':data.access_token})
    if not row.encrypted_token:fail(422,'Informe um token autorizado para gravação no destino.')
    row.provider=data.provider;row.folder=data.folder.rstrip('/')
    if row.id:row.version+=1
    db.flush();audit(db,request,user,'backup.target_configured',row)
    return {'provider':row.provider,'folder':row.folder,'version':row.version,'token_configured':True}


@router.post('/{id}/send')
def send(id:str,db:DB,user:Actor,request:Request):
    require_admin(user)
    row=db.scalar(select(BackupRun).where(BackupRun.id==id).with_for_update())
    destination=db.scalar(select(BackupTarget).limit(1))
    if not row or row.status!='completed':fail(409,'Gere e conclua o backup antes do envio.')
    if not destination:fail(409,'Configure o destino e seu token autorizado.')
    if row.remote_status=='sent':return output(row)
    if row.remote_status in {'sending','uncertain'}:fail(409,'Confira o arquivo no destino antes de repetir um envio incerto. O backup local está preservado.')
    path=bundle_path(row.id)
    with path.open('rb') as handle:digest=hashlib.file_digest(handle,'sha256').hexdigest()
    if digest!=row.sha256:fail(409,'A integridade do backup falhou.')
    credentials=unseal(destination.encrypted_token)
    row.remote_status='sending';db.commit()  # crash/timeout não gera reenvio automático
    try:
        remote=upload_remote(destination,credentials['access_token'],path)
        row.remote_status='sent';row.remote_id=remote
    except Exception:
        row.remote_status='uncertain';row.error_code='BACKUP_REMOTE_UNCERTAIN_CHECK_DESTINATION'
    audit(db,request,user,'backup.sent' if row.remote_status=='sent' else 'backup.send_uncertain',row)
    return output(row)


def upload_remote(target,token,path):
    """Somente hosts oficiais fixos. Tokens nunca são colocados em URLs/logs."""
    headers={'Authorization':'Bearer '+token}
    size=path.stat().st_size
    with httpx.Client(timeout=120,follow_redirects=False,trust_env=False) as client:
        if target.provider=='dropbox':
            endpoint='https://content.dropboxapi.com/2/files/'
            def call(route,args,data=b''):
                response=client.post(endpoint+route,headers={**headers,'Content-Type':'application/octet-stream',
                    'Dropbox-API-Arg':json.dumps(args,ensure_ascii=True)},content=data)
                response.raise_for_status();return response.json() if response.content else {}
            session=call('upload_session/start',{'close':False})['session_id'];offset=0
            with path.open('rb') as handle:
                while chunk:=handle.read(4*1024*1024):
                    call('upload_session/append_v2',{'cursor':{'session_id':session,'offset':offset},'close':False},chunk)
                    offset+=len(chunk)
            result=call('upload_session/finish',{'cursor':{'session_id':session,'offset':offset},
                'commit':{'path':target.folder+'/'+path.name,'mode':'add','autorename':False,'mute':True}})
            return result['id']
        response=client.post('https://www.googleapis.com/upload/drive/v3/files',params={'uploadType':'resumable','fields':'id'},
            headers={**headers,'X-Upload-Content-Type':'application/zip','X-Upload-Content-Length':str(size)},
            json={'name':path.name,**({'parents':[target.folder]} if target.folder else {})})
        response.raise_for_status();location=response.headers['Location'];url=urlsplit(location)
        if url.scheme!='https' or url.hostname!='www.googleapis.com' or url.username or url.password or url.port not in (None,443):
            raise ValueError('Untrusted upload session')
        with path.open('rb') as handle:
            response=client.put(location,headers={**headers,'Content-Length':str(size),'Content-Type':'application/zip'},
                content=iter(lambda:handle.read(1024*1024),b''))
        response.raise_for_status();return response.json()['id']
