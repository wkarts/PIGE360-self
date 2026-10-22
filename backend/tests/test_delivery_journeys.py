"""Controles novos com dados descartáveis; transportes externos são simulados."""
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import uuid
import zipfile
import pytest
from sqlalchemy import select
from app import models as m
from app.config import settings
from app.db import SessionLocal, engine
from app.backups import BackupRun, add_objects, verify_bundle
from app.crm_bridge_models import CRMBridgeConnection
from conftest import PASSWORD, API


def employee(client,admin,school):
    email=uuid.uuid4().hex+'@example.com'
    response=client.post('/api/v1/users',headers=admin,json={'name':'Gestora de teste','email':email,
        'password':PASSWORD,'role':'direction','school_ids':[school['id']]})
    assert response.status_code==201,response.text
    login=client.post('/api/v1/auth/login',json={'email':email,'password':PASSWORD}).json()
    return response.json(),{'Authorization':'Bearer '+login['access_token'],'X-School-Id':school['id']}


def test_production_portability_can_be_enabled_and_delegated_per_school(api,client,admin,monkeypatch):
    monkeypatch.setattr(settings(),'portability_enabled',False)
    monkeypatch.setattr('app.admin_tools.develop_build',lambda:False)
    user,headers=employee(client,admin,api.school)
    with SessionLocal.begin() as db:
        installation=db.get(m.Installation,1);previous=installation.portability_enabled;installation.portability_enabled=None
    try:
        access=api.get('/portability-access')
        assert not access['enabled']
        assert client.get(api.base+'/legacy-import/runs',headers=headers).status_code==403
        response=client.put(api.base+'/portability-access',headers=admin,json={'enabled':True,'version':access['version']})
        assert response.status_code==200,response.text
        assert client.get(api.base+'/legacy-import/runs',headers=headers).status_code==403
        grant=next(g for g in api.get('/portability-access')['grants'] if g['user_id']==user['id'])
        response=client.put(api.base+'/portability-access/users/'+user['id'],headers=admin,json={'enabled':True,'version':grant['version']})
        assert response.status_code==200,response.text
        assert client.get(api.base+'/legacy-import/runs',headers=headers).status_code==200
        assert client.get('/api/v1/auth/me',headers=headers).json()['admin_tools']['portability']
        assert client.put(api.base+'/portability-access',headers=headers,json={'enabled':False,'version':access['version']}).status_code==403
        assert client.get('/api/v1/backups',headers=headers).status_code==403
        assert client.get('/api/v1/diagnostics/summary',headers=headers).status_code==403
        grant=next(g for g in api.get('/portability-access')['grants'] if g['user_id']==user['id'])
        client.put(api.base+'/portability-access/users/'+user['id'],headers=admin,json={'enabled':False,'version':grant['version']}).raise_for_status()
        assert client.get(api.base+'/legacy-import/runs',headers=headers).status_code==403
    finally:
        with SessionLocal.begin() as db:db.get(m.Installation,1).portability_enabled=previous


def test_bridge_visual_configuration_encrypts_secret_and_preserves_native_finance(api,monkeypatch):
    monkeypatch.setattr(settings(),'crm_bridge_enabled',False)
    secret='synthetic-bridge-secret-0000000000000000000000'
    data={'enabled':True,'base_url':'https://finance.example.test','issuer_id':'12','account_id':'school-account',
        'environment':'sandbox','secret':secret}
    response=api.call('PUT','/crm-bridge/configuration',data)
    assert secret not in json.dumps(response)
    assert response['secret_configured']
    from app.crm_bridge import configured
    with SessionLocal() as db:
        row=db.get(CRMBridgeConnection,response['id'])
        assert secret not in row.encrypted_secret
        assert configured(row.id,api.school['id'],db)['secret']==secret
    current=api.get('/crm-bridge/configuration')['configuration']
    api.call('PUT','/crm-bridge/configuration',{**data,'version':current['version'],'secret':''})
    assert api.get('/crm-bridge/status')['enabled']
    assert api.get('/crm-bridge/status')['capabilities']=={'issue_charge':False}
    api.call('PUT','/crm-bridge/configuration',{**data,'version':current['version'],'base_url':'http://localhost'},expect=422)
    api.call('PUT','/crm-bridge/configuration',{**data,'version':current['version'],'enabled':False},expect=409)


def test_website_only_exposes_published_public_content(api,client):
    public=api.post('/community-posts',{'title':'Encontro público','content':'Conteúdo público sintético da escola.',
        'audience':'public','status':'published'})
    api.post('/community-posts',{'title':'Comunicado privado','content':'Texto privado para responsáveis sintéticos.',
        'audience':'guardians','status':'published'})
    api.post('/community-posts',{'title':'Rascunho público','content':'Este rascunho ainda não pode ser divulgado.',
        'audience':'public','status':'draft'})
    path='/api/v1/public/schools/'+api.school['id']+'/website'
    assert client.get(path).status_code==404
    data={'enabled':True,'theme':'editorial','headline':'Aprender juntos','introduction':'Uma escola de possibilidades.',
        'about':'História sintética.','public_url':'https://escola.example.test','portal_url':'https://gestor.example.test/online.html'}
    config=api.call('PUT','/website',data)
    published=client.get(path).json()
    assert [p['id'] for p in published['posts']]==[public['id']]
    assert 'student_data' not in json.dumps(published) and 'guardians' not in json.dumps(published)
    api.call('PUT','/website',{**data,'version':config['version'],'theme':'invalid'},expect=422)
    api.call('PUT','/website',{**data,'version':config['version'],'public_url':'javascript:alert(1)'},expect=422)
    module_path=Path(__file__).resolve().parents[2]/'services/website/server.py'
    spec=importlib.util.spec_from_file_location('website_server',module_path);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    published['website']['headline']='<script>alert(1)</script>'
    for theme in ('horizon','editorial','campus'):
        published['website']['theme']=theme
        preview=api.post('/website/preview',{**data,'headline':published['website']['headline'],'theme':theme},200)
        html=module.render({**published,'html':preview['html']})
        fallback=module.render({key:value for key,value in published.items() if key!='html'})
        assert '<script>' not in fallback and '&lt;script&gt;' in fallback
        assert '<script>' not in html and '&lt;script&gt;' in html
        assert f'body class="{theme}"' in html
        assert 'http://app:8000' not in html


def test_backup_queue_is_idempotent_and_unsupported_database_is_explicit(client,admin,monkeypatch,tmp_path):
    from app import backups
    monkeypatch.setattr(backups,'directory',lambda:tmp_path)
    key=str(uuid.uuid4())
    for _ in range(2):
        result=client.post('/api/v1/backups',headers=admin,json={'client_key':key})
        assert result.status_code==202,result.text
        assert result.json()['id']==key
    if engine.dialect.name=='sqlite':
        assert backups.process_one()
        with SessionLocal() as db:
            run=db.get(BackupRun,key)
            assert run.status=='failed' and run.error_code=='BACKUP_REQUIRES_POSTGRESQL'
        assert client.get('/api/v1/backups/'+key+'/download',headers=admin).status_code==404
    else:
        with SessionLocal.begin() as db:
            row=db.get(BackupRun,key);row.status='failed';row.error_code='TEST_FIXTURE_CLEANUP'


def test_backup_collects_minio_references_and_checks_hashes_without_public_urls(api,monkeypatch,tmp_path):
    from app import backups
    raw=b'synthetic stored object';sha=hashlib.sha256(raw).hexdigest()
    with SessionLocal.begin() as db:
        from app.documents import write_file
        record=write_file(db,api.school['id'],api.client.get('/api/v1/auth/me',headers=api.headers).json()['id'],
            'synthetic.txt','text/plain',raw)
        record.storage_backend='s3';record.bucket_name='isolated-test-bucket'
        ident=record.id
    monkeypatch.setattr(backups,'read_bytes',lambda record:raw if record.id==ident else __import__('app.storage',fromlist=['read_bytes']).read_bytes(record))
    package=tmp_path/'manifest-only.zip'
    with SessionLocal() as db,zipfile.ZipFile(package,'w') as archive:
        # Limita este teste de armazenamento à escola descartável da fixture.
        class OnlyRecord:
            def scalars(self,stmt):return [db.get(m.FileRecord,ident)] if stmt.column_descriptions[0]['entity'] is m.FileRecord else []
        objects=add_objects(archive,OnlyRecord())
        assert objects[0]['backend']=='s3' and objects[0]['bucket']=='isolated-test-bucket'
        assert objects[0]['sha256']==sha
        dump=b'SYNTHETIC MANIFEST TEST, NOT A DATABASE DUMP'
        archive.writestr('database.dump',dump)
        archive.writestr('manifest.json',json.dumps({'format':'pige360-backup-v2','database_sha256':hashlib.sha256(dump).hexdigest(),'objects':objects,'trust_roots':[]}))
    with SessionLocal.begin() as db:
        record=db.get(m.FileRecord,ident);record.storage_backend='local';record.bucket_name=''
    assert verify_bundle(package)['objects'][0]['sha256']==sha
    with zipfile.ZipFile(package,'a') as archive:archive.writestr('../unexpected',b'bad')
    with pytest.raises(ValueError,match='BACKUP_UNEXPECTED_ENTRY'):verify_bundle(package)


def test_interrupted_backup_is_reconciled_without_blocking_future_requests(client,admin,monkeypatch,tmp_path):
    from datetime import timedelta
    from app import backups
    from app.db import now
    monkeypatch.setattr(backups,'directory',lambda:tmp_path)
    user=client.get('/api/v1/auth/me',headers=admin).json()
    key=str(uuid.uuid4())
    with SessionLocal.begin() as db:
        db.add(BackupRun(id=key,created_by=user['id'],status='processing',stage='database_and_storage',
            updated_at=now()-timedelta(minutes=31)))
    assert backups.process_one()
    with SessionLocal() as db:
        row=db.get(BackupRun,key)
        assert row.status=='failed' and row.error_code=='BACKUP_INTERRUPTED'


def test_version_uses_built_frontend_and_preserves_explicit_image_version(monkeypatch,tmp_path):
    from app.config import Settings
    monkeypatch.delenv('APP_VERSION',raising=False)
    (tmp_path/'build-info.json').write_text(json.dumps({'product':'PIGE360 Self',
        'pipeline':'typescript-vue-precompiled','version':'9.8.7-develop.123'}))
    assert Settings(_env_file=None,frontend_path=tmp_path).app_version=='9.8.7-develop.123'
    assert Settings(_env_file=None,frontend_path=tmp_path,app_version='1.2.3').app_version=='1.2.3'
    (tmp_path/'build-info.json').write_text('{broken')
    assert Settings(_env_file=None,frontend_path=tmp_path).app_version==(Path(__file__).resolve().parents[2]/'VERSION').read_text().strip()
