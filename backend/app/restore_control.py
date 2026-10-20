"""Planos de restauração persistidos fora do banco substituído; execução só offline."""
import argparse
import hashlib
import json
import os
import zipfile
from pathlib import Path
from datetime import timedelta
from uuid import UUID
from fastapi import APIRouter, File, Request, UploadFile
from pydantic import Field
from sqlalchemy import text
from .backups import bundle_path, verify_bundle
from .common import audit
from .config import settings
from .db import now,uid,engine
from .admin_tools import require_admin
from .schemas import Input
from .security import DB,Actor,fail

router=APIRouter(prefix='/api/v1/backups/restore',tags=['Preparação da restauração offline'])


def root():
    path=settings().storage_path.parent/'restore-operations';path.mkdir(parents=True,exist_ok=True,mode=0o700)
    return path


def journal(ident):
    if str(UUID(ident))!=ident:raise ValueError('Invalid restore id')
    return root()/(ident+'.json')


def save(row):
    path=journal(row['id']);temp=path.with_suffix('.part')
    data=json.dumps({**row,'updated_at':now().isoformat()},ensure_ascii=False)
    with temp.open('w') as f:f.write(data);f.flush();os.fsync(f.fileno())
    temp.chmod(0o600);temp.replace(path)


def load(ident):return json.loads(journal(ident).read_text())


def list_plans():return sorted([json.loads(p.read_text()) for p in root().glob('*.json')],key=lambda r:r['created_at'],reverse=True)[:100]


def package(row):return bundle_path(row['backup_id']) if row['source']=='local' else root()/(row['id']+'.zip')


def check_package(path):
    manifest=verify_bundle(path)
    with engine.connect() as c:revision=c.scalar(text('SELECT version_num FROM alembic_version'))
    if manifest.get('schema_revision')!=revision:raise ValueError('BACKUP_SCHEMA_INCOMPATIBLE')
    for obj in manifest['objects']:
        if obj['backend']=='s3' and obj['bucket']!=settings().storage_bucket:raise ValueError('BACKUP_BUCKET_INCOMPATIBLE')
    if manifest['trust_roots'] and not settings().signature_trust_roots_dir:raise ValueError('BACKUP_TRUST_ROOTS_NOT_CONFIGURED')
    return manifest


def prepare(path,user_id,source='upload',backup_id='',ident=None):
    manifest=check_package(path);ident=ident or uid()
    with path.open('rb') as f:digest=hashlib.file_digest(f,'sha256').hexdigest()
    row={'id':ident,'created_at':now().isoformat(),'expires_at':(now()+timedelta(hours=1)).isoformat(),'created_by':user_id,
        'status':'prepared','stage':'validated','source':source,'backup_id':backup_id,'sha256':digest,
        'schema_revision':manifest['schema_revision'],'objects':len(manifest['objects']),'object_bytes':sum(x['size'] for x in manifest['objects']),
        'confirmation':'RESTAURAR '+ident[:8],'error_code':'','previous_backup_id':''}
    save(row);return row


class Prepare(Input):backup_id:str=Field(min_length=36,max_length=36)


@router.get('/plans')
def history(db:DB,user:Actor):
    require_admin(user);return list_plans()


@router.post('/plans',status_code=201)
def local(data:Prepare,db:DB,user:Actor,request:Request):
    from .backups import BackupRun
    require_admin(user)
    backup=db.get(BackupRun,data.backup_id)
    if not backup or backup.status!='completed':fail(404,'Backup concluído não encontrado.')
    try:row=prepare(bundle_path(backup.id),user.id,'local',backup.id)
    except (OSError,ValueError,KeyError,zipfile.BadZipFile,TypeError):fail(422,'Pacote inválido, incompatível ou indisponível. Confira versão, integridade, bucket e raízes de confiança.')
    audit(db,request,user,'restore.prepared',backup)
    return row


@router.post('/upload',status_code=201)
def upload(db:DB,user:Actor,request:Request,file:UploadFile=File(...)):
    require_admin(user);ident=uid();path=root()/(ident+'.zip')
    try:
        total=0
        with path.open('xb') as target:
            while chunk:=file.file.read(1024*1024):
                total+=len(chunk)
                if total>settings().restore_max_upload_mb*1024*1024:fail(413,'Backup acima do limite de envio. Utilize um pacote local no histórico.')
                target.write(chunk)
        path.chmod(0o600);row=prepare(path,user.id,ident=ident)
    except (ValueError,KeyError,zipfile.BadZipFile,TypeError,OSError):
        path.unlink(missing_ok=True)
        fail(422,'Pacote inválido, corrompido ou incompatível com esta instalação.')
    except BaseException:
        path.unlink(missing_ok=True)
        raise
    audit(db,request,user,'restore.upload_prepared',user,details={'operation_id':ident,'sha256':row['sha256']})
    return row


def execute(ident):
    """O deployer para escritores antes de chamar este comando. Não exposto no HTTP."""
    import fcntl
    with (root()/'execution.lock').open('a') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        row=load(ident)
        if row['status']!='prepared' or row['expires_at']<now().isoformat():raise ValueError('RESTORE_PLAN_EXPIRED_OR_USED')
        path=package(row)
        with path.open('rb') as f:digest=hashlib.file_digest(f,'sha256').hexdigest()
        if digest!=row['sha256']:raise ValueError('RESTORE_PACKAGE_CHANGED')
        check_package(path)
        def progress(stage,previous_id=''):
            row['status']='processing';row['stage']=stage
            if previous_id:row['previous_backup_id']=previous_id
            save(row)
        try:
            from .backup_restore import restore
            restore(path,progress=progress)
            row['status']='completed';row['stage']='completed';save(row)
        except BaseException:
            row['status']='failed';row['stage']='failed';row['error_code']='RESTORE_FAILED_KEEP_SERVICES_STOPPED';save(row)
            raise


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('action',choices=['list','inspect','execute']);parser.add_argument('id',nargs='?');args=parser.parse_args()
    if args.action=='list':print(json.dumps(list_plans()))
    elif args.action=='inspect':
        row=load(args.id);check_package(package(row));print(json.dumps(row))
    else:execute(args.id)
