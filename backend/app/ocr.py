"""API privada do OCR compartilhada entre Secretaria e portal da família."""
import base64
from datetime import timedelta
import hashlib
import json
from pathlib import Path
from typing import Literal
from cryptography.fernet import Fernet
from fastapi import APIRouter, File, Form, Request, UploadFile
from sqlalchemy import func, select, update
from PIL import Image
import io
from . import models as m
from .assisted_models import OcrJob, IntakeSettings
from .assisted_common import enabled, quota
from .common import audit
from .config import settings
from .db import now, uid
from .security import Actor, DB, Scope, PERMISSIONS, fail, require, scoped, utc
from .portal import Parent, own_admission
from .storage import put_bytes
from .schemas import Input

router=APIRouter(tags=['OCR de documentos'])
Purpose=Literal['identity','birth','address','company','generic']


def cipher():
    # Separada da chave/credenciais bancárias; acompanha o backup APP_SECRET_KEY.
    key=hashlib.sha256(('document-ocr:v1:'+settings().app_secret_key).encode()).digest()
    return Fernet(base64.urlsafe_b64encode(key))


def seal(result):return cipher().encrypt(json.dumps(result,ensure_ascii=False).encode()).decode()

def output(row):
    return {'id':row.id,'status':row.status,'purpose':row.purpose,'attempts':row.attempts,
        'expires_at':utc(row.expires_at).isoformat(),'error_code':row.error_code,
        'result':json.loads(cipher().decrypt(row.encrypted_result.encode())) if row.encrypted_result else None}


def access(user):
    if not {'people.write','documents.write','schools.manage'}.intersection(PERMISSIONS.get(user.role,set())):
        fail(403,'Seu perfil não pode solicitar a leitura de documentos.')


def validate(data:bytes, filename:str):
    if not data:fail(422,'O arquivo está vazio.')
    if len(data)>settings().ocr_max_upload_mb*1024*1024:fail(413,'Documento acima do limite do OCR.')
    ext=Path(filename).suffix.lower()
    if ext=='.pdf' and data.startswith(b'%PDF-'):
        return 'application/pdf'  # integridade e páginas verificadas no worker isolado
    if ext not in ('.jpg','.jpeg','.png','.webp'):fail(422,'Envie PDF, PNG, JPEG ou WebP. HEIC deve ser convertido pelo aparelho.')
    try:
        with Image.open(io.BytesIO(data)) as image:
            if image.format not in ('JPEG','PNG','WEBP') or image.width*image.height>30_000_000:
                fail(422,'Imagem inválida ou acima de 30 megapixels.')
            image.verify()
            return {'JPEG':'image/jpeg','PNG':'image/png','WEBP':'image/webp'}[image.format]
    except (OSError,ValueError,Image.DecompressionBombError):fail(422,'Imagem inválida.')


def submit(db,school_id,owner_kind,owner_id,purpose,data,filename,request):
    enabled(db,'ocr_enabled')
    mime=validate(data,filename)
    sha=hashlib.sha256(data).hexdigest()
    # Deduplicação apenas dentro do dono e da finalidade; não denuncia documentos alheios.
    previous=db.scalar(select(OcrJob).where(OcrJob.school_id==school_id,OcrJob.owner_kind==owner_kind,
        OcrJob.owner_id==owner_id,OcrJob.sha256==sha,OcrJob.purpose==purpose,
        OcrJob.expires_at>now(),OcrJob.status.in_(['queued','processing','succeeded'])).order_by(OcrJob.created_at.desc()).limit(1))
    if previous:return output(previous)
    quota(db,'ocr:'+owner_kind+':'+owner_id,30)
    # Serializa admissão na fila por escola, sem manter o lock durante OCR.
    from .security import lock_school
    lock_school(db,school_id)
    previous=db.scalar(select(OcrJob).where(OcrJob.school_id==school_id,OcrJob.owner_kind==owner_kind,
        OcrJob.owner_id==owner_id,OcrJob.sha256==sha,OcrJob.purpose==purpose,
        OcrJob.expires_at>now(),OcrJob.status.in_(['queued','processing','succeeded'])).order_by(OcrJob.created_at.desc()).limit(1))
    if previous:return output(previous)
    criteria=[OcrJob.school_id==school_id,OcrJob.status.in_(['queued','processing']),OcrJob.expires_at>now()]
    if db.scalar(select(func.count()).select_from(OcrJob).where(*criteria))>=50:
        fail(429,'Fila da escola cheia. Aguarde ou continue preenchendo manualmente.')
    if db.scalar(select(func.count()).select_from(OcrJob).where(*criteria,OcrJob.owner_id==owner_id,OcrJob.owner_kind==owner_kind))>=3:
        fail(429,'Você já possui documentos em processamento. Aguarde a leitura anterior.')
    job_id=uid();cfg=settings();key=f'{school_id}/ocr/{job_id}'
    put_bytes(key,data,mime)
    bucket=cfg.storage_bucket if cfg.storage_backend=='s3' else ''
    db.info.setdefault('new_storage_objects',[]).append((cfg.storage_backend,bucket,key))
    row=OcrJob(id=job_id,school_id=school_id,owner_kind=owner_kind,owner_id=owner_id,purpose=purpose,
        sha256=sha,storage_key=key,storage_backend=cfg.storage_backend,bucket_name=bucket,mime_type=mime,size=len(data),
        expires_at=now()+timedelta(hours=cfg.ocr_retention_hours))
    db.add(row);db.flush()
    audit(db,request,db.get(m.User,owner_id) if owner_kind=='user' else None,'ocr.requested',row,school_id,{'purpose':purpose,'owner_kind':owner_kind})
    return output(row)


def read_job(db,id,school_id,kind,owner):
    row=db.scalar(select(OcrJob).where(OcrJob.id==id,OcrJob.school_id==school_id,OcrJob.owner_kind==kind,OcrJob.owner_id==owner))
    if not row:fail(404,'Leitura não encontrada.')
    if utc(row.expires_at)<=now():fail(410,'Leitura expirada. O formulário continua disponível para preenchimento manual.')
    return row


@router.post('/api/v1/schools/{school_id}/ocr/jobs',status_code=202)
def create_job(request:Request,db:DB,user:Actor,school:Scope,purpose:Purpose=Form('identity'),file:UploadFile=File(...)):
    access(user)
    return submit(db,school.id,'user',user.id,purpose,file.file.read(settings().ocr_max_upload_mb*1024*1024+1),file.filename or '',request)


@router.get('/api/v1/schools/{school_id}/ocr/jobs/{id}')
def get_job(id:str,db:DB,user:Actor,school:Scope):
    access(user);return output(read_job(db,id,school.id,'user',user.id))


@router.delete('/api/v1/schools/{school_id}/ocr/jobs/{id}')
def cancel_job(id:str,db:DB,user:Actor,school:Scope):
    access(user);row=read_job(db,id,school.id,'user',user.id)
    row.status='cancelled';row.encrypted_result='';row.lease_token='';row.expires_at=now()
    return {'ok':True}


@router.post('/api/v1/portal/ocr/jobs',status_code=202)
def portal_create(request:Request,db:DB,account:Parent,purpose:Purpose=Form('identity'),file:UploadFile=File(...)):
    return submit(db,account.school_id,'portal',account.id,purpose,file.file.read(settings().ocr_max_upload_mb*1024*1024+1),file.filename or '',request)


@router.get('/api/v1/portal/ocr/jobs/{id}')
def portal_get(id:str,db:DB,account:Parent):return output(read_job(db,id,account.school_id,'portal',account.id))


@router.delete('/api/v1/portal/ocr/jobs/{id}')
def portal_cancel(id:str,db:DB,account:Parent):
    row=read_job(db,id,account.school_id,'portal',account.id)
    row.status='cancelled';row.encrypted_result='';row.lease_token='';row.expires_at=now()
    return {'ok':True}


class Source(Input):
    purpose:Purpose='identity'


@router.post('/api/v1/portal/admissions/{id}/attachments/{attachment_id}/ocr',status_code=202)
def attachment_job(id:str,attachment_id:str,data:Source,request:Request,db:DB,account:Parent):
    obj=own_admission(db,account,id)
    source=db.scalar(select(m.AdmissionAttachment).where(m.AdmissionAttachment.id==attachment_id,
        m.AdmissionAttachment.admission_id==obj.id,m.AdmissionAttachment.active.is_(True)))
    if not source:fail(404,'Documento não encontrado.')
    from .storage import read_bytes
    if source.size>settings().ocr_max_upload_mb*1024*1024:fail(413,'Documento acima do limite do OCR.')
    raw=read_bytes(source)
    if hashlib.sha256(raw).hexdigest()!=source.sha256:fail(409,'Integridade do documento inválida.')
    return submit(db,account.school_id,'portal',account.id,data.purpose,raw,source.original_name,request)


@router.post('/api/v1/schools/{school_id}/files/{file_id}/ocr',status_code=202)
def file_job(file_id:str,data:Source,request:Request,db:DB,user:Actor,school:Scope):
    require(user,'documents.read');access(user);source=scoped(db,m.FileRecord,file_id,school.id)
    from .storage import read_bytes
    if source.size>settings().ocr_max_upload_mb*1024*1024:fail(413,'Documento acima do limite do OCR.')
    raw=read_bytes(source)
    if hashlib.sha256(raw).hexdigest()!=source.sha256:fail(409,'Integridade do documento inválida.')
    return submit(db,school.id,'user',user.id,data.purpose,raw,source.original_name,request)


@router.get('/api/v1/institution/intake')
def intake_status(db:DB,user:Actor):
    require(user,'schools.manage');row=db.get(IntakeSettings,1)
    return {'version':row.version,'ocr_enabled':row.ocr_enabled,'lookups_enabled':row.lookups_enabled,
        'ocr_max_upload_mb':settings().ocr_max_upload_mb,'ocr_retention_hours':settings().ocr_retention_hours}


class IntakeInput(Input):
    version:int
    ocr_enabled:bool
    lookups_enabled:bool


@router.put('/api/v1/institution/intake')
def intake_update(data:IntakeInput,request:Request,db:DB,user:Actor):
    if user.role!='admin':fail(403,'Somente o administrador da instalação pode alterar esta configuração.')
    from .security import check_version
    row=db.scalar(select(IntakeSettings).where(IntakeSettings.id==1).with_for_update())
    check_version(row,data.version)
    row.ocr_enabled=data.ocr_enabled;row.lookups_enabled=data.lookups_enabled;row.version+=1
    audit(db,request,user,'intake.configured',row,details={'ocr_enabled':row.ocr_enabled,'lookups_enabled':row.lookups_enabled})
    return {'ok':True}
