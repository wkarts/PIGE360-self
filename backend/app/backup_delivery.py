"""Envio recuperável na outbox existente; identidade remota e conteúdo conferidos."""
import hashlib
from datetime import timedelta
from types import SimpleNamespace
from urllib.parse import quote
import httpx
from sqlalchemy import select
from . import models as m
from .backups import BackupRun, BackupTarget, bundle_path, upload_remote
from .common import audit, output
from .db import now
from .integration_core import enqueue,seal, unseal, IntegrationFailure
from .security import fail, utc
from .admin_tools import require_admin


def queue_delivery(ident,db,user,request,recover=False,confirmed=False,allow_new=False):
    require_admin(user)
    row=db.scalar(select(BackupRun).where(BackupRun.id==ident).with_for_update())
    target=db.scalar(select(BackupTarget).limit(1))
    if not row or row.status!='completed':fail(409,'Conclua o backup antes do envio.')
    if row.remote_status=='sent':return output(row)
    if not target:fail(409,'Configure o destino e o token autorizado.')
    key='backup-send:'+row.id
    job=db.scalar(select(m.IntegrationJob).where(m.IntegrationJob.dedupe_key==key).with_for_update())
    if job:
        payload=unseal(job.encrypted_payload)
        if (payload['provider'],payload['folder'])!=(target.provider,target.folder):
            fail(409,'Restaure a configuração do destino original antes de conciliar este envio.')
        if job.status in {'pending','retry','processing','completed'}:return output(row)
        if not recover:fail(409,'Use Conciliar e retomar para recuperar este envio.')
        if job.attempts>=5:fail(409,'Limite de cinco tentativas atingido. Preserve o pacote e revise o destino com o suporte.')
        if utc(job.updated_at)>now()-timedelta(seconds=30):fail(429,'Aguarde 30 segundos antes de uma nova tentativa.')
        if payload.get('legacy') and confirmed:
            payload['allow_new_upload']=allow_new;job.encrypted_payload=seal(payload)
        job.status='retry';job.available_at=now();job.error_code='';job.lease_until=None
    else:
        legacy=row.remote_status in {'sending','uncertain'}
        if legacy and (not recover or not confirmed):
            fail(409,'Confirme explicitamente que o destino configurado é o mesmo do envio original antes de conciliar o envio legado.')
        if legacy and row.remote_status=='sending' and utc(row.updated_at)>now()-timedelta(minutes=30):
            fail(409,'Envio legado ainda pode estar ativo. Aguarde 30 minutos desde a última atualização antes de recuperar.')
        school=db.scalar(select(m.School).join(m.SchoolAccess).where(m.SchoolAccess.user_id==user.id,m.SchoolAccess.active.is_(True)).limit(1))
        if not school:fail(403,'Acesso institucional ativo obrigatório.')
        job=enqueue(db,school.id,'backup_send',{'backup_id':row.id,'provider':target.provider,'folder':target.folder,'target_id':target.id,'legacy':legacy,'allow_new_upload':allow_new if legacy else True},key)
    row.remote_status='queued';row.error_code=''
    audit(db,request,user,'backup.delivery_recovered' if recover else 'backup.delivery_queued',row)
    return output(row)


def dropbox_hash(path):
    digest=hashlib.sha256()
    with path.open('rb') as handle:
        while chunk:=handle.read(4*1024*1024):digest.update(hashlib.sha256(chunk).digest())
    return digest.hexdigest()


def reconcile(client,target,path,remote_id):
    if target.provider=='dropbox':
        r=client.post('https://api.dropboxapi.com/2/files/get_metadata',json={'path':target.folder+'/'+path.name})
        if r.status_code==409 and r.json().get('error',{}).get('path',{}).get('.tag')=='not_found':return None
        r.raise_for_status();data=r.json()
        if data.get('size')!=path.stat().st_size or data.get('content_hash')!=dropbox_hash(path):
            raise IntegrationFailure('BACKUP_REMOTE_CONTENT_CONFLICT',uncertain=True)
    else:
        if not remote_id:return None
        r=client.get('https://www.googleapis.com/drive/v3/files/'+quote(remote_id,safe=''),params={'fields':'id,name,size,md5Checksum,trashed,parents'})
        if r.status_code==404:return None
        r.raise_for_status();data=r.json()
        with path.open('rb') as handle:digest=hashlib.file_digest(handle,'md5').hexdigest()
        if data.get('trashed') or data.get('name')!=path.name or str(data.get('size'))!=str(path.stat().st_size) or data.get('md5Checksum')!=digest or (target.folder and target.folder not in data.get('parents',[])):
            raise IntegrationFailure('BACKUP_REMOTE_CONTENT_CONFLICT',uncertain=True)
    return data['id']


def execute(db,job,payload):
    row=db.get(BackupRun,payload['backup_id']);destination=db.get(BackupTarget,payload['target_id'])
    if not row or row.status!='completed' or not destination:raise IntegrationFailure('BACKUP_OR_TARGET_UNAVAILABLE')
    if (destination.provider,destination.folder)!=(payload['provider'],payload['folder']):raise IntegrationFailure('BACKUP_TARGET_CHANGED')
    target=SimpleNamespace(provider=payload['provider'],folder=payload['folder'])
    path=bundle_path(row.id)
    if not path.is_file():raise IntegrationFailure('BACKUP_LOCAL_UNAVAILABLE')
    with path.open('rb') as handle:digest=hashlib.file_digest(handle,'sha256').hexdigest()
    if digest!=row.sha256:raise IntegrationFailure('BACKUP_OBJECT_INTEGRITY')
    token=unseal(destination.encrypted_token)['access_token']
    row.remote_status='sending'
    db.add(m.AuditEvent(school_id=job.school_id,actor_id=row.created_by,action='backup.delivery_attempted',entity_type='backup_runs',entity_id=row.id,details={'attempt':job.attempts,'stage':'reconcile','remote_id':job.remote_id},request_id='',ip='worker'))
    db.commit()
    try:
        with httpx.Client(headers={'Authorization':'Bearer '+token},timeout=30,follow_redirects=False,trust_env=False) as client:
            if payload.get('legacy') and target.provider=='drive' and not job.remote_id:
                query="name='"+path.name+"' and trashed=false"+(" and '"+target.folder+"' in parents" if target.folder else '')
                response=client.get('https://www.googleapis.com/drive/v3/files',params={'q':query,'fields':'files(id),nextPageToken','pageSize':100})
                response.raise_for_status();items=response.json()
                if items.get('nextPageToken') or len(items.get('files',[]))>1:raise IntegrationFailure('BACKUP_LEGACY_MULTIPLE_MATCHES',uncertain=True)
                if items.get('files'):job.remote_id=items['files'][0]['id'];db.commit()
                elif not payload.get('allow_new_upload'):raise IntegrationFailure('BACKUP_LEGACY_NOT_FOUND_REQUIRES_CONFIRMATION',uncertain=True)
            if target.provider=='drive' and not job.remote_id:
                r=client.get('https://www.googleapis.com/drive/v3/files/generateIds',params={'count':1,'space':'drive','type':'files'})
                r.raise_for_status();job.remote_id=r.json()['ids'][0];db.commit()
            remote=reconcile(client,target,path,job.remote_id)
            if not remote:
                remote=upload_remote(target,token,path,job.remote_id)
                # Resposta de upload sem conteúdo verificável não encerra conciliação.
                remote=reconcile(client,target,path,job.remote_id or remote)
                if not remote:raise IntegrationFailure('BACKUP_REMOTE_NOT_VERIFIED',uncertain=True)
        row.remote_status='sent';row.remote_id=remote;row.error_code='';db.commit()
        return remote
    except httpx.HTTPStatusError as error:
        status=error.response.status_code
        raise IntegrationFailure('BACKUP_REMOTE_HTTP_'+str(status),uncertain=status>=500 or status==409,retryable=status==429) from None
    except (httpx.HTTPError,KeyError,ValueError):
        raise IntegrationFailure('BACKUP_REMOTE_UNCERTAIN',uncertain=True) from None


def sync_state(db,job):
    payload=unseal(job.encrypted_payload);row=db.get(BackupRun,payload['backup_id'])
    if row:
        row.remote_status={'completed':'sent','pending':'queued','retry':'queued','processing':'sending','uncertain':'uncertain','failed':'failed'}.get(job.status,'uncertain')
        row.error_code=job.error_code
        db.add(m.AuditEvent(school_id=job.school_id,actor_id=row.created_by,action='backup.delivery_result',entity_type='backup_runs',entity_id=row.id,details={'attempt':job.attempts,'state':job.status,'code':job.error_code,'remote_id':job.remote_id},request_id='',ip='worker'))


def delivery_info(db,row):
    job=db.scalar(select(m.IntegrationJob).where(m.IntegrationJob.dedupe_key=='backup-send:'+row.id))
    history=[{'at':a.created_at,'action':a.action,'details':a.details} for a in db.scalars(select(m.AuditEvent).where(m.AuditEvent.entity_type=='backup_runs',m.AuditEvent.entity_id==row.id,m.AuditEvent.action.like('backup.delivery_%')).order_by(m.AuditEvent.created_at.desc()).limit(20))]
    return {**output(row),'delivery_history':history,'delivery':None if not job else {key:getattr(job,key) for key in ('id','status','attempts','error_code','remote_id','available_at','updated_at','completed_at')}}
