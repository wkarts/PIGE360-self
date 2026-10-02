"""Filtros, isolamento, controles de acesso e exportações administrativas."""
import json
import re
import uuid
from app import models as m, telemetry
from app.config import settings
from app.db import SessionLocal
from conftest import PASSWORD


def test_portability_default_and_develop_manifest(client,admin,api,tmp_path,monkeypatch):
    monkeypatch.setattr(settings(),'portability_enabled',False)
    monkeypatch.setattr(settings(),'frontend_path',tmp_path)
    # APP_ENV alone never grants a dangerous capability.
    monkeypatch.setattr(settings(),'app_env','develop')
    assert not client.get('/api/v1/auth/me',headers=admin).json()['admin_tools']['portability']
    assert client.get(api.base+'/legacy-import/runs',headers=admin).status_code==403
    manifest={'product':'PIGE360 Self','pipeline':'typescript-vue-precompiled','version':'1.2.0-develop.45.1'}
    (tmp_path/'build-info.json').write_text(json.dumps(manifest))
    assert client.get('/api/v1/auth/me',headers=admin).json()['admin_tools']['portability']
    assert client.get(api.base+'/legacy-import/runs',headers=admin).status_code==200
    manifest['version']='1.2.0';(tmp_path/'build-info.json').write_text(json.dumps(manifest))
    monkeypatch.setattr(settings(),'app_version','1.2.0-develop.99')
    assert client.get(api.base+'/legacy-import/runs',headers=admin).status_code==403
    for invalid in ('[]','null','{broken',json.dumps({**manifest,'version':'1.2.0-develop.1','product':'Other'})):
        (tmp_path/'build-info.json').write_text(invalid)
        assert not client.get('/api/v1/auth/me',headers=admin).json()['admin_tools']['portability']
    monkeypatch.setattr(settings(),'portability_enabled',True)
    assert client.get(api.base+'/legacy-import/runs',headers=admin).status_code==200


def test_admin_tools_never_granted_to_direction_in_develop(client,admin,api,tmp_path,monkeypatch):
    monkeypatch.setattr(settings(),'portability_enabled',True)
    monkeypatch.setattr(settings(),'frontend_path',tmp_path)
    (tmp_path/'build-info.json').write_text(json.dumps({'product':'PIGE360 Self','pipeline':'typescript-vue-precompiled','version':'1.2.0-develop.3'}))
    email=uuid.uuid4().hex+'@example.com'
    r=client.post('/api/v1/users',headers=admin,json={'name':'Gestor de teste','email':email,'password':PASSWORD,'role':'direction','school_ids':[api.school['id']]})
    assert r.status_code==201,r.text
    session=client.post('/api/v1/auth/login',json={'email':email,'password':PASSWORD}).json()
    assert not any(session['user']['admin_tools'].values())
    assert 'audit.read' not in session['user']['permissions']
    headers={'Authorization':'Bearer '+session['access_token']}
    for path in ['/diagnostics/summary','/diagnostics/events','/diagnostics/export',api.base.removeprefix('/api/v1')+'/audit',api.base.removeprefix('/api/v1')+'/audit/options',api.base.removeprefix('/api/v1')+'/audit/export',api.base.removeprefix('/api/v1')+'/legacy-import/runs']:
        assert client.get('/api/v1'+path,headers=headers).status_code==403,path


def test_diagnostic_download_unique_institution_name_and_second(client,admin):
    names=[]
    for _ in range(2):
        r=client.get('/api/v1/diagnostics/export',headers=admin)
        assert r.status_code==200,r.text
        name=r.headers['content-disposition']
        assert re.fullmatch(r'attachment; filename="diagnostico-escola-de-teste-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}-UTC-[0-9a-f]{6}\.zip"',name),name
        names.append(name)
    assert names[0]!=names[1]


def test_diagnostic_filters_and_statistics(client,admin,tmp_path,monkeypatch):
    monkeypatch.setattr(telemetry,'directory',lambda:tmp_path)
    job=str(uuid.uuid4())
    telemetry.emit('mailbox_sync',level='ERROR',code='MAILCOW_IP_NOT_ALLOWED',job_id=job,request_id='b'*24)
    telemetry.emit('mailbox_sync',level='ERROR',code='MAILCOW_IP_NOT_ALLOWED',job_id=job,request_id='c'*24)
    telemetry.emit('request.completed',status=503,route='/api/v1/health',level='ERROR',request_id='b'*24)
    telemetry.emit('request.completed',status=200,route='/api/v1/health',level='INFO')
    r=client.get('/api/v1/diagnostics/events',headers=admin,params={'event':'mailbox','code':'MAILCOW_IP_NOT_ALLOWED','job_id':job}).json()
    assert r['total']==2
    assert r['statistics']['recurring'][0]['count']==2
    assert {x['request_id'] for x in r['items']}=={'b'*24,'c'*24}
    r=client.get('/api/v1/diagnostics/events',headers=admin,params={'request_id':'b'*24}).json()
    assert r['total']==2
    assert r['statistics']['http_errors']==1
    r=client.get('/api/v1/diagnostics/events',headers=admin,params={'min_status':500,'route':'/health'}).json()
    assert r['total']==1 and r['items'][0]['status']==503


def test_audit_filters_scope_redaction_csv(client,admin,api):
    ref='d'*24
    with SessionLocal.begin() as db:
        actor=db.scalar(__import__('sqlalchemy').select(m.User).where(m.User.email=='admin@example.com'))
        other=m.School(company_id=api.school['company_id'],name='Outra escola sintética');db.add(other);db.flush()
        records=[m.AuditEvent(school_id=s,actor_id=actor.id,action='students.updated',entity_type='students',entity_id='record-'+str(i),request_id=ref,ip='127.0.0.1',details={'before':{'name':'Antes'},'after':{'name':'Depois','password':'never-export','api_token':'never-export'}}) for i,s in enumerate([api.school['id'],other.id,None])]
        db.add_all(records);db.flush();ids=[r.id for r in records];actor_id=actor.id
    r=api.get('/audit?request_id='+ref)
    assert [x['id'] for x in r['items']]==[ids[0]]
    assert r['items'][0]['actor_name']=='Administrador de Teste'
    assert r['items'][0]['created_at'].endswith('+00:00')
    assert 'never-export' not in json.dumps(r)
    r=api.get('/audit?include_global=true&request_id='+ref)
    assert {x['id'] for x in r['items']}=={ids[0]}  # parâmetro legado não amplia o recorte ativo
    r=api.get('/audit?actor_id='+actor_id+'&entity_id=record-0&action=students.updated&entity_type=students')
    assert r['total']==1
    opts=api.get('/audit/options')
    assert 'students.updated' in opts['actions'] and 'students' in opts['entities']
    r=client.get(api.base+'/audit/export?request_id='+ref,headers=admin)
    assert r.status_code==200
    assert '.csv"' in r.headers['content-disposition']
    assert 'Depois' in r.content.decode('utf-8-sig')
    assert 'record-1' not in r.text and 'never-export' not in r.text
    assert client.get(api.base+'/audit?since=2026-10-02&until=2026-10-01',headers=admin).status_code==422
