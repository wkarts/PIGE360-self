"""Falhas, permissões e recuperação com dados sintéticos e transportes isolados."""
from datetime import timedelta
import hashlib
import io
import json
import re
import uuid
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import patch
import httpx
import pytest
from sqlalchemy import select,func
from app import models as m
from app.config import settings
from app.db import SessionLocal,now,engine
from app.integration_core import unseal,seal,IntegrationFailure
from app.integration_worker import process_one,recover_expired
from app.user_invitations import UserInvitation
from conftest import PASSWORD


def invite(api,email=None,**values):
    email=email or uuid.uuid4().hex+'@example.com'
    user=api.post('/users',{'name':'Pessoa sintética','email':email,'role':'viewer',**values})
    with SessionLocal() as db:
        row=db.scalar(select(UserInvitation).where(UserInvitation.user_id==user['id']))
        job=db.get(m.IntegrationJob,row.job_id);payload=unseal(job.encrypted_payload)
        token=re.search(r'first-access.html#([A-Za-z0-9_-]+)',payload['text']).group(1)
        return user,row.id,job.id,token,payload


def test_invitation_atomic_user_outbox_and_correct_recipient(api,client,monkeypatch):
    sent=[];monkeypatch.setattr('app.integration_worker.send_email',lambda payload:sent.append(payload) or '')
    user,ident,job,token,payload=invite(api)
    assert payload['to']==user['email'] and not sent and token not in json.dumps(user)
    with SessionLocal() as db:
        assert db.get(UserInvitation,ident).token_hash!=token
        assert token not in db.get(m.IntegrationJob,job).encrypted_payload
    assert process_one(job) and sent[0]['to']==user['email']
    current=next(u for u in api.get('/users') if u['id']==user['id'])['invitation']
    assert current['delivery_status']=='completed' and 'SMTP' in current['delivery_label']
    assert 'entregue' not in current['delivery_label'].lower()
    # GET/scanner não consome o token; inspeção também não define senha.
    assert client.get('/first-access.html').status_code==200
    for _ in range(2):assert client.post('/api/v1/invitations/inspect',json={'token':token}).status_code==200
    assert client.post('/api/v1/invitations/accept',json={'token':token,'password':PASSWORD}).status_code==200
    assert client.post('/api/v1/auth/login',json={'email':user['email'],'password':PASSWORD}).status_code==200
    assert client.post('/api/v1/invitations/accept',json={'token':token,'password':'Other-password-123!'}).status_code==400
    with SessionLocal() as db:assert db.get(m.IntegrationJob,job).encrypted_payload==''


@pytest.mark.parametrize('condition',['expired','revoked','disabled_user','disabled_access','archived_access','removed_access'])
def test_invitation_rejects_expiry_revocation_and_disabled_scopes(api,client,condition):
    user,ident,job,token,payload=invite(api)
    with SessionLocal.begin() as db:
        row=db.get(UserInvitation,ident);access=db.get(m.SchoolAccess,(user['id'],api.school['id']))
        if condition=='expired':row.expires_at=now()-timedelta(seconds=1)
        elif condition=='revoked':row.revoked_at=now()
        elif condition=='disabled_user':db.get(m.User,user['id']).active=False
        elif condition=='disabled_access':access.active=False
        elif condition=='archived_access':access.archived_at=now()
        else:db.delete(access)
    assert client.post('/api/v1/invitations/accept',json={'token':token,'password':PASSWORD}).status_code==400


def test_invitation_resend_revokes_previous_and_uses_same_email(api,client):
    user,ident,job,token,payload=invite(api)
    assert api.call('POST','/users/'+user['id']+'/invitation/resend',{},expect=429)
    with SessionLocal.begin() as db:db.get(UserInvitation,ident).created_at=now()-timedelta(minutes=2)
    response=api.call('POST','/users/'+user['id']+'/invitation/resend',{})
    assert response['state']=='pending' and response['id']!=ident
    assert client.post('/api/v1/invitations/inspect',json={'token':token}).status_code==400
    with SessionLocal() as db:
        assert db.get(m.IntegrationJob,job).status=='failed'
        assert db.scalar(select(func.count()).select_from(UserInvitation).where(UserInvitation.user_id==user['id'],UserInvitation.revoked_at.is_(None)))==1


def test_invitation_smtp_failure_uncertain_and_restart_are_visible(api,monkeypatch):
    user,ident,job,token,payload=invite(api)
    def unavailable(_):raise IntegrationFailure('SMTP_NOT_CONFIGURED')
    monkeypatch.setattr('app.integration_worker.send_email',unavailable)
    process_one(job)
    assert next(u for u in api.get('/users') if u['id']==user['id'])['invitation']['error_code']=='SMTP_NOT_CONFIGURED'
    with SessionLocal.begin() as db:
        row=db.get(m.IntegrationJob,job);row.status='processing';row.lease_until=now()-timedelta(seconds=1)
    with SessionLocal() as db:recover_expired(db)
    with SessionLocal() as db:assert db.get(m.IntegrationJob,job).status=='uncertain'
    assert not process_one(job) # Não repetir SMTP com aceite desconhecido.


def test_invitation_rollback_does_not_leave_identity_or_mail(api,monkeypatch):
    from app.user_access import create_in_school
    from app.schemas import UserInput
    from fastapi import Request
    email=uuid.uuid4().hex+'@example.com'
    with SessionLocal() as db:
        user=db.scalar(select(m.User).where(m.User.email=='admin@example.com'));school=db.get(m.School,api.school['id'])
        from app.access_security import bind_access
        bind_access(db,user,school.id)
        result=create_in_school(UserInput(name='Rollback sintético',email=email,school_ids=[school.id]),db,user,Request({'type':'http','headers':[]}),school)
        ident=result['id'];db.rollback()
    with SessionLocal() as db:
        assert not db.get(m.User,ident)
        assert not db.scalar(select(UserInvitation.id).where(UserInvitation.user_id==ident))


def test_existing_identity_new_school_does_not_reset_password_or_issue_invite(api,client,admin,school):
    user,ident,job,token,payload=invite(api,password=PASSWORD)
    company=client.get('/api/v1/companies',headers=admin).json()[0]
    school=client.post('/api/v1/schools',headers=admin,json={'name':'Outra escola sintética','company_id':company['id']}).json()
    result=client.post('/api/v1/schools/'+school['id']+'/users',headers=admin,json={'name':'Outro nome ignorado','email':user['email'],'role':'viewer','password':'Must-not-replace-123!'})
    assert result.status_code==201 and result.json()['id']==user['id'] and result.json()['existing_account']
    assert result.json()['invitation'] is None
    assert client.post('/api/v1/auth/login',json={'email':user['email'],'password':PASSWORD}).status_code==200


def test_invitation_concurrent_consumption_postgresql(api,client):
    if engine.dialect.name!='postgresql':pytest.skip('Concorrência de convite exige PostgreSQL real.')
    user,ident,job,token,payload=invite(api)
    def accept(_):return client.post('/api/v1/invitations/accept',json={'token':token,'password':PASSWORD}).status_code
    with ThreadPoolExecutor(max_workers=2) as pool:statuses=list(pool.map(accept,range(2)))
    assert sorted(statuses)==[200,400]


def backup(api):
    from app.backups import BackupRun,BackupTarget,bundle_path
    ident=str(uuid.uuid4());path=bundle_path(ident);path.write_bytes(b'synthetic-complete-backup')
    with SessionLocal.begin() as db:
        user=db.scalar(select(m.User).where(m.User.email=='admin@example.com'))
        row=BackupRun(id=ident,created_by=user.id,status='completed',stage='completed',sha256=hashlib.sha256(path.read_bytes()).hexdigest(),size=path.stat().st_size)
        db.add(row)
        target=db.scalar(select(BackupTarget).limit(1))
        if not target:target=BackupTarget(provider='drive',folder='folder',encrypted_token=seal({'access_token':'synthetic-token'}));db.add(target)
        else:target.provider='drive';target.folder='folder';target.encrypted_token=seal({'access_token':'synthetic-token'})
    return ident,path


def test_backup_queue_and_ambiguous_accept_reconcile_without_second_upload(api,client,admin,monkeypatch):
    from app.backups import BackupRun
    ident,path=backup(api)
    client.post('/api/v1/backups/'+ident+'/send',headers=admin).raise_for_status()
    with SessionLocal() as db:job=db.scalar(select(m.IntegrationJob).where(m.IntegrationJob.dedupe_key=='backup-send:'+ident));job_id=job.id
    remote={};uploads=[]
    def reconcile(client,target,path,remote_id):return remote.get('id')
    def upload(target,token,path,remote_id):
        uploads.append(remote_id);remote['id']=remote_id
        raise httpx.ReadTimeout('synthetic lost acknowledgement')
    monkeypatch.setattr('app.backup_delivery.reconcile',reconcile)
    monkeypatch.setattr('app.backup_delivery.upload_remote',upload)
    def transport(request):return httpx.Response(200,json={'ids':['stable-remote-id']})
    original=httpx.Client
    monkeypatch.setattr('app.backup_delivery.httpx.Client',lambda **kwargs:original(transport=httpx.MockTransport(transport),**kwargs))
    assert process_one(job_id)
    with SessionLocal.begin() as db:
        assert db.get(BackupRun,ident).remote_status=='uncertain'
        db.get(m.IntegrationJob,job_id).updated_at=now()-timedelta(minutes=1)
    client.post('/api/v1/backups/'+ident+'/recover',headers=admin).raise_for_status()
    assert process_one(job_id)
    with SessionLocal() as db:assert db.get(BackupRun,ident).remote_status=='sent'
    assert uploads==['stable-remote-id'] and path.read_bytes()==b'synthetic-complete-backup'


def test_backup_restart_and_attempt_limit(api,client,admin):
    from app.backups import BackupRun
    ident,path=backup(api);client.post('/api/v1/backups/'+ident+'/send',headers=admin).raise_for_status()
    with SessionLocal.begin() as db:
        job=db.scalar(select(m.IntegrationJob).where(m.IntegrationJob.dedupe_key=='backup-send:'+ident));job.status='processing';job.lease_until=now()-timedelta(seconds=1);job.attempts=5
    with SessionLocal() as db:recover_expired(db)
    assert client.post('/api/v1/backups/'+ident+'/recover',headers=admin).status_code==409
    with SessionLocal() as db:assert db.get(BackupRun,ident).remote_status=='uncertain'


def test_dropbox_reconciliation_proves_content_and_rejects_conflict(tmp_path):
    from app.backup_delivery import reconcile,dropbox_hash
    from types import SimpleNamespace
    path=tmp_path/'synthetic.zip';path.write_bytes(b'a'*(4*1024*1024+17))
    target=SimpleNamespace(provider='dropbox',folder='/backups')
    def handle(request):return httpx.Response(200,json={'id':'id:synthetic','size':path.stat().st_size,'content_hash':dropbox_hash(path)})
    with httpx.Client(transport=httpx.MockTransport(handle)) as client:assert reconcile(client,target,path,'')=='id:synthetic'
    with httpx.Client(transport=httpx.MockTransport(lambda _:httpx.Response(200,json={'id':'conflict','size':1,'content_hash':'wrong'}))) as client:
        with pytest.raises(IntegrationFailure):reconcile(client,target,path,'')


def test_family_portal_strict_explicit_links_and_revocation(api,client,admin):
    student=api.student();other=api.student('Aluno de outra família');guardian=api.guardian(student)
    user=api.post('/users',{'name':'Responsável sintético','email':uuid.uuid4().hex+'@example.com','password':PASSWORD,'role':'guardian','person_id':guardian['id']})
    auth=client.post('/api/v1/auth/login',json={'email':user['email'],'password':PASSWORD}).json()
    headers={'Authorization':'Bearer '+auth['access_token'],'X-School-Id':api.school['id']}
    context=client.get('/api/v1/family/context',headers=headers).json()
    assert [s['id'] for s in context['students']]==[student['id']]
    assert client.get('/api/v1/family/students/'+other['id']+'/charges',headers=headers).status_code==404
    with SessionLocal.begin() as db:
        link=db.scalar(select(m.GuardianLink).where(m.GuardianLink.person_id==guardian['id']));link.active=False
    assert client.get('/api/v1/family/context',headers=headers).json()['students']==[]
    assert client.get('/api/v1/family/students/'+student['id']+'/charges',headers=headers).status_code==404


def import_operation(api,client,admin,monkeypatch):
    from test_legacy_import import _sample_archives,_full_selection
    monkeypatch.setattr(settings(),'portability_enabled',True)
    with SessionLocal.begin() as db:db.get(m.Installation,1).portability_enabled=True
    backup,media,_=_sample_archives()
    # User.email é global. Cada operação sintética tem origem independente.
    import sqlite3,zipfile
    rebuilt=io.BytesIO()
    with zipfile.ZipFile(io.BytesIO(backup)) as source,zipfile.ZipFile(rebuilt,'w') as target:
        for name in source.namelist():
            data=source.read(name)
            if name=='school_desktop_suite/app.db':
                conn=sqlite3.connect(':memory:');conn.deserialize(data);conn.execute('UPDATE usuarios SET email=?',(uuid.uuid4().hex+'@example.test',));conn.commit();data=conn.serialize();conn.close()
            target.writestr(name,data)
    backup=rebuilt.getvalue();selection=_full_selection(backup)
    base=api.base+'/legacy-import'
    files={'backup':('synthetic.zip',backup,'application/zip'),'container_media':('media.zip',media,'application/zip')}
    preview=client.post(base+'/preview',headers=admin,data={'selection':selection},files=files);assert preview.is_success,preview.text
    data={'selection':selection,'fingerprint':preview.json()['fingerprint'],'confirmation':'IMPORTAR'}
    response=client.post(base+'/operations',headers=admin,data=data,files=files);assert response.status_code==202,response.text
    return response.json(),data,files


def test_import_operation_survives_refresh_and_repeated_confirmation(api,client,admin,monkeypatch):
    from app.import_operations import ImportOperation
    operation,data,files=import_operation(api,client,admin,monkeypatch)
    again=client.post(api.base+'/legacy-import/operations',headers=admin,data=data,files=files)
    assert again.json()['id']==operation['id']
    assert client.get(api.base+'/legacy-import/operations',headers=admin).json()[0]['status']=='pending'
    with SessionLocal() as db:job_id=db.get(ImportOperation,operation['id']).job_id
    assert process_one(job_id)
    history=client.get(api.base+'/legacy-import/operations',headers=admin).json()[0]
    assert history['status']=='completed',history
    assert history['result']['summary']['counts']['students_created']==1
    assert history['result']['summary']['security_policy']['legacy_users']=='inactive_viewer'
    assert not process_one(job_id)
    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(m.Student).where(m.Student.school_id==api.school['id']))==1


def test_import_intermediate_failure_rolls_back_and_recovery_deduplicates(api,client,admin,monkeypatch):
    from app.import_operations import ImportOperation
    from app import legacy_import
    operation,data,files=import_operation(api,client,admin,monkeypatch)
    original=legacy_import._import_academic
    def interrupted(*args):raise RuntimeError('synthetic interruption after people')
    monkeypatch.setattr(legacy_import,'_import_academic',interrupted)
    with SessionLocal() as db:job_id=db.get(ImportOperation,operation['id']).job_id
    process_one(job_id)
    with SessionLocal.begin() as db:
        assert db.scalar(select(func.count()).select_from(m.Student).where(m.Student.school_id==api.school['id']))==0
        job=db.get(m.IntegrationJob,job_id);assert job.status=='failed';job.updated_at=now()-timedelta(minutes=1)
    monkeypatch.setattr(legacy_import,'_import_academic',original)
    assert client.post(api.base+'/legacy-import/operations/'+operation['id']+'/resume',headers=admin).status_code==200
    assert process_one(job_id)
    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(m.Student).where(m.Student.school_id==api.school['id']))==1
        assert db.get(ImportOperation,operation['id']).stage=='completed'


def test_import_worker_restart_reprocesses_transaction_safely(api,client,admin,monkeypatch):
    from app.import_operations import ImportOperation
    operation,data,files=import_operation(api,client,admin,monkeypatch)
    with SessionLocal.begin() as db:
        job=db.get(m.IntegrationJob,db.get(ImportOperation,operation['id']).job_id);job_id=job.id
        job.status='processing';job.lease_until=now()-timedelta(seconds=1)
    with SessionLocal() as db:recover_expired(db)
    with SessionLocal.begin() as db:db.get(m.IntegrationJob,job_id).available_at=now()
    assert process_one(job_id)
    with SessionLocal() as db:assert db.get(m.IntegrationJob,job_id).status=='completed'


def test_restore_preparation_validates_schema_integrity_permissions_and_no_http_execution(api,client,admin):
    import zipfile
    from sqlalchemy import text
    with engine.connect() as connection:revision=connection.scalar(text('SELECT version_num FROM alembic_version'))
    def package(revision,corrupt=False):
        bundle=io.BytesIO();data=b'synthetic-dump-for-preflight-only'
        manifest={'format':'pige360-backup-v2','schema_revision':revision,'database_sha256':hashlib.sha256(data).hexdigest(),'objects':[],'trust_roots':[]}
        with zipfile.ZipFile(bundle,'w') as z:
            z.writestr('database.dump',b'corrupt' if corrupt else data);z.writestr('manifest.json',json.dumps(manifest))
        return bundle.getvalue()
    path='/api/v1/backups/restore/upload'
    for content in [b'not zip',package('future-schema'),package(revision,True)]:
        result=client.post(path,headers=admin,files={'file':('synthetic.zip',content,'application/zip')});assert result.status_code==422,result.text
    result=client.post(path,headers=admin,files={'file':('synthetic.zip',package(revision),'application/zip')});assert result.status_code==201,result.text
    plan=result.json();assert plan['status']=='prepared' and plan['confirmation']=='RESTAURAR '+plan['id'][:8]
    assert client.post('/api/v1/backups/restore/'+plan['id']+'/execute',headers=admin).status_code in {404,405}
    user,ident,job,token,payload=invite(api,password=PASSWORD)
    auth=client.post('/api/v1/auth/login',json={'email':user['email'],'password':PASSWORD}).json()
    denied=client.get('/api/v1/backups/restore/plans',headers={'Authorization':'Bearer '+auth['access_token']})
    assert denied.status_code==403


def test_public_portal_requires_tls_and_secure_cookie_configuration():
    from app.config import Settings
    base={'_env_file':None,'app_env':'production','app_url':'http://127.0.0.1:58080','database_url':'postgresql+psycopg://synthetic:synthetic@localhost/synthetic','allow_sqlite':False}
    for public_url,cookie in [('http://family.example.test',True),('https://family.example.test',False)]:
        with pytest.raises(ValueError,match='HTTPS e COOKIE_SECURE'):
            Settings(**base,portal_public_url=public_url,cookie_secure=cookie)
    assert Settings(**base,portal_public_url='https://family.example.test',cookie_secure=True).cookie_secure
