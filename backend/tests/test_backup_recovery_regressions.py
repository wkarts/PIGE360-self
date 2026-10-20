"""Synthetic recovery regressions; Docker CI additionally exercises real MinIO/UI."""
import hashlib
import io
import json
import zipfile
from datetime import timedelta
from types import SimpleNamespace
import httpx
import pytest
from sqlalchemy import select
from app import models as m
from app.db import SessionLocal,now
from app.backups import add_objects,verify_bundle,BackupRun,BackupTarget
from app.integration_core import IntegrationFailure,seal
from test_continuity_operations import backup


class Records:
    def __init__(self,rows):self.rows=rows
    def scalars(self,query):
        return self.rows if query.column_descriptions[0]['entity'] is m.FileRecord else []


def record(key):return SimpleNamespace(storage_backend='local',storage_key=key,sha256=hashlib.sha256(b'original').hexdigest(),size=8,mime_type='text/plain')


def test_protection_preserves_corrupt_bytes_and_records_missing(monkeypatch,tmp_path):
    def read(row):
        if row.storage_key=='missing':raise FileNotFoundError()
        return b'corrupted bytes'
    monkeypatch.setattr('app.backups.read_bytes',read)
    damage=[];path=tmp_path/'protection.zip'
    with zipfile.ZipFile(path,'w') as z:
        objects=add_objects(z,Records([record('missing'),record('corrupt')]),damage=damage)
        z.writestr('database.dump',b'database')
        z.writestr('manifest.json',json.dumps({'format':'pige360-backup-v2','database_sha256':hashlib.sha256(b'database').hexdigest(),'objects':objects,'trust_roots':[],'protection':{'purpose':'pre_restore','damage':damage}}))
    assert [d['state'] for d in damage]==['missing','corrupt']
    assert damage[1]['expected_sha256']==record('corrupt').sha256
    with zipfile.ZipFile(path) as z:assert z.read(objects[0]['path'])==b'corrupted bytes'
    assert verify_bundle(path,allow_degraded=True)['protection']['damage']==damage
    with pytest.raises(ValueError,match='DEGRADED'):verify_bundle(path)
    with zipfile.ZipFile(io.BytesIO(),'w') as z:
        with pytest.raises(FileNotFoundError):add_objects(z,Records([record('missing')]))
        with pytest.raises(ValueError,match='INTEGRITY'):add_objects(z,Records([record('corrupt')]))


def test_protection_never_swallows_permissions_or_transport_failure(monkeypatch):
    def denied(_):raise PermissionError('synthetic')
    monkeypatch.setattr('app.backups.read_bytes',denied)
    with zipfile.ZipFile(io.BytesIO(),'w') as z:
        with pytest.raises(PermissionError):add_objects(z,Records([record('key')]),damage=[])


def test_legacy_sending_recovery_visible_only_after_lease_window(api,client,admin):
    ident,_=backup(api)
    with SessionLocal.begin() as db:
        row=db.get(BackupRun,ident);row.remote_status='sending';row.updated_at=now()-timedelta(minutes=31)
    rows=client.get('/api/v1/backups',headers=admin).json()['items']
    assert next(r for r in rows if r['id']==ident)['can_recover']
    assert client.post('/api/v1/backups/'+ident+'/recover',headers=admin,json={'confirmed_original_destination':False}).status_code==409
    response=client.post('/api/v1/backups/'+ident+'/recover',headers=admin,json={'confirmed_original_destination':True,'allow_new_upload':False})
    assert response.status_code==200,response.text
    rows=client.get('/api/v1/backups',headers=admin).json()['items']
    assert not next(r for r in rows if r['id']==ident)['can_recover']


@pytest.mark.parametrize('allow_new',[False,True])
def test_dropbox_missing_legacy_requires_explicit_upload_permission(api,client,admin,monkeypatch,allow_new):
    from app.backup_delivery import execute
    ident,path=backup(api)
    with SessionLocal.begin() as db:
        target=db.scalar(select(BackupTarget));target.provider='dropbox';target.folder='/backups'
        row=db.get(BackupRun,ident);row.remote_status='sending';row.updated_at=now()-timedelta(minutes=31)
    response=client.post('/api/v1/backups/'+ident+'/recover',headers=admin,json={'confirmed_original_destination':True,'allow_new_upload':allow_new})
    assert response.status_code==200,response.text
    uploads=[];remote={}
    monkeypatch.setattr('app.backup_delivery.reconcile',lambda *a:remote.get('id'))
    def upload(*args):uploads.append(1);remote['id']='synthetic-dropbox';return remote['id']
    monkeypatch.setattr('app.backup_delivery.upload_remote',upload)
    from app.integration_core import unseal
    with SessionLocal() as db:
        job=db.scalar(select(m.IntegrationJob).where(m.IntegrationJob.dedupe_key=='backup-send:'+ident))
        if allow_new:assert execute(db,job,unseal(job.encrypted_payload))=='synthetic-dropbox'
        else:
            with pytest.raises(IntegrationFailure) as caught:execute(db,job,unseal(job.encrypted_payload))
            assert caught.value.code=='BACKUP_LEGACY_NOT_FOUND_REQUIRES_CONFIRMATION'
    assert len(uploads)==int(allow_new)


@pytest.mark.parametrize('code,missing',[('NoSuchKey',True),('404',False),('NoSuchBucket',False),('AccessDenied',False),('SlowDown',False)])
def test_protection_only_tolerates_proven_missing_minio_object(monkeypatch,code,missing):
    from botocore.exceptions import ClientError
    def read(_):raise ClientError({'Error':{'Code':code}},'GetObject')
    monkeypatch.setattr('app.backups.read_bytes',read)
    damage=[]
    with zipfile.ZipFile(io.BytesIO(),'w') as z:
        if missing:
            assert add_objects(z,Records([record('missing')]),damage=damage)==[]
            assert damage[0]['state']=='missing'
        else:
            with pytest.raises(ClientError):add_objects(z,Records([record('missing')]),damage=damage)
            assert not damage
