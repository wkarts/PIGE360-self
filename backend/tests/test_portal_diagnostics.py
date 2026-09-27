"""Regressões do portal vazio e do diagnóstico; somente dados sintéticos."""
from datetime import timedelta
from io import BytesIO
from zipfile import ZipFile
import hashlib
import json
import time
import uuid
import pytest
from sqlalchemy import select, update
from app import models as m, telemetry
from app.db import SessionLocal
from app.portal_access import today, login_school
from app.security import hash_password
from app.config import settings
from conftest import PASSWORD

HEADERS={'X-CSRF-Protection':'1'}


def account(school):
    with SessionLocal.begin() as db:
        row=m.PortalAccount(school_id=school['id'],email=uuid.uuid4().hex+'@example.com',name='Responsável de teste',password_hash=hash_password(PASSWORD))
        db.add(row);db.flush();return {'id':row.id,'email':row.email,'school_id':row.school_id}


def campaign(api,active=True,opening=-1,closing=1):
    group=api.catalogs(capacity=20)['group']
    return api.post('/admission-campaigns',{'title':'Matrícula de teste','slug':'teste-'+uuid.uuid4().hex,
        'opens_on':str(today()+timedelta(days=opening)),'closes_on':str(today()+timedelta(days=closing)),
        'class_group_ids':[group['id']],'privacy_notice':'Aviso de privacidade sintético para os testes automatizados da escola.',
        'active':active,'require_verified_contact':False})


def test_login_without_campaign_and_without_enrollments(client,school):
    a=account(school)
    r=client.post('/api/v1/portal/login',headers=HEADERS,json={'school_id':school['id'],'email':a['email'],'password':PASSWORD})
    assert r.status_code==200,r.text
    assert r.json()['id']==a['id']
    assert client.get('/api/v1/portal/admissions').json()['items']==[]
    client.post('/api/v1/portal/logout',headers=HEADERS,json={})


@pytest.mark.parametrize('active,opening,closing',[(False,-2,2),(True,1,10),(True,-10,-1)])
def test_unavailable_campaign_does_not_block_existing_login(client,api,active,opening,closing):
    c=campaign(api,active,opening,closing);a=account(api.school)
    assert c['slug'] not in [i['slug'] for i in client.get('/api/v1/portal/campaigns').json()]
    r=client.post('/api/v1/portal/login',headers=HEADERS,json={'campaign_slug':c['slug'],'email':a['email'],'password':PASSWORD})
    assert r.status_code==200,r.text
    client.post('/api/v1/portal/logout',headers=HEADERS,json={})


def test_login_never_finds_account_in_other_school(client,api,school):
    a=account(school)
    r=client.post('/api/v1/portal/login',headers=HEADERS,json={'school_id':api.school['id'],'email':a['email'],'password':PASSWORD+'wrong'})
    assert r.status_code==401
    c=campaign(api)
    r=client.post('/api/v1/portal/login',headers=HEADERS,json={'school_id':'missing-school','campaign_slug':c['slug'],'email':a['email'],'password':PASSWORD})
    assert r.status_code==404


def test_scope_requires_selection_when_multiple_schools(client):
    with SessionLocal() as db:
        from fastapi import HTTPException
        assert len(list(db.scalars(select(m.School).where(m.School.active.is_(True)))))>1
        with pytest.raises(HTTPException) as exc:login_school(db)
        assert exc.value.status_code==422


def test_context_no_private_data(client):
    r=client.get('/api/v1/portal/context')
    assert r.status_code==200
    assert r.headers['cache-control']=='no-store'
    assert all(set(x)=={'id','name'} for x in r.json()['schools'])


def test_readiness_explains_missing_configuration(api):
    r=api.get('/admission-readiness')
    assert not r['ready']
    assert {v['code'] for v in r['issues']}=={'no_academic_year','no_class_groups','no_campaigns'}
    assert r['campaigns']==[]
    c=campaign(api,False)
    r=api.get('/admission-readiness')
    assert r['campaigns'][0]['reasons']==['not_published']
    c=api.patch('/admission-campaigns/'+c['id'],{k:v for k,v in {**c,'active':True}.items() if k in __import__('app.online_schemas',fromlist=['CampaignEdit']).CampaignEdit.model_fields})
    assert api.get('/admission-readiness')['ready']


def test_no_active_groups_not_advertised(client,api):
    c=campaign(api)
    with SessionLocal.begin() as db:db.execute(update(m.ClassGroup).where(m.ClassGroup.id==c['class_group_ids'][0]).values(active=False))
    assert c['slug'] not in [x['slug'] for x in client.get('/api/v1/portal/campaigns').json()]
    assert not client.get('/api/v1/portal/campaigns/'+c['slug']).json()['accepting']
    assert 'no_active_groups' in api.get('/admission-readiness')['campaigns'][0]['reasons']


def test_error_reference_and_request_logging(client,tmp_path,monkeypatch):
    monkeypatch.setattr(telemetry,'directory',lambda:tmp_path)
    r=client.post('/api/v1/portal/login?token=never-record-me',json={'password':'Secret-Do-Not-Record','email':'private@example.com'})
    assert r.status_code in (403,422)
    assert len(r.headers['x-request-id'])==24
    events=telemetry.recent_events()['items'];serialized=json.dumps(events)
    assert events and all(v['route']=='/api/v1/portal/login' for v in events)
    for secret in ('never-record-me','Secret-Do-Not-Record','private@example.com'):assert secret not in serialized


def test_diag_requires_administrator(client,admin,school):
    assert client.get('/api/v1/diagnostics/events').status_code==401
    assert client.get('/api/v1/diagnostics/export').status_code==401
    email=uuid.uuid4().hex+'@example.com'
    r=client.post('/api/v1/users',headers=admin,json={'name':'Usuário de consulta','email':email,'password':PASSWORD,'role':'viewer','school_ids':[school['id']]})
    assert r.status_code==201,r.text
    token=client.post('/api/v1/auth/login',json={'email':email,'password':PASSWORD}).json()['access_token']
    assert client.get('/api/v1/diagnostics/summary',headers={'Authorization':'Bearer '+token}).status_code==403


def test_export_structure_hashes_and_redaction(client,admin,tmp_path,monkeypatch):
    monkeypatch.setattr(telemetry,'directory',lambda:tmp_path)
    telemetry.emit('test.safe',request_id='a'*24,password='never-export',email='private@example.com',sql='select password',body={'name':'private'})
    r=client.get('/api/v1/diagnostics/export?request_id='+'a'*24,headers=admin)
    assert r.status_code==200,r.text
    assert r.headers['cache-control']=='no-store'
    z=ZipFile(BytesIO(r.content))
    assert set(z.namelist())=={'system.json','events.jsonl','manifest.json','LEIA-ME.txt','resumo.html','SHA256SUMS'}
    for line in z.read('SHA256SUMS').decode().splitlines():
        digest,name=line.split('  ',1);assert hashlib.sha256(z.read(name)).hexdigest()==digest
    content=''.join(z.read(n).decode() for n in z.namelist())
    for secret in ('never-export','private@example.com',settings().app_secret_key,'select password'):assert secret not in content
    assert json.loads(z.read('manifest.json'))['records']==1


def test_log_rotation_retention_failure_and_filters(tmp_path,monkeypatch):
    monkeypatch.setattr(telemetry,'directory',lambda:tmp_path);monkeypatch.setattr(telemetry,'MAX_BYTES',500)
    for i in range(30):telemetry.emit('test.rotate',level='ERROR' if i%2 else 'INFO',request_id='b'*24)
    assert len(list(tmp_path.glob('app.jsonl*')))<=telemetry.BACKUPS+1
    rows=telemetry.recent_events(level='ERROR',request_id='b'*24)['items']
    assert rows and all(x['level']=='ERROR' for x in rows)
    assert not telemetry.recent_events(service='../../etc/passwd')['items']
    monkeypatch.setattr(telemetry,'directory',lambda:tmp_path/'app.jsonl'/'not-a-directory')
    telemetry.emit('test.failure')
    assert telemetry.LAST_WRITE_ERROR


def test_client_events_reject_free_text_and_anonymous_export(client):
    r=client.post('/api/v1/diagnostics/client-event',headers=HEADERS,json={'area':'portal','event':'javascript_error','message':'must never log private text'})
    assert r.status_code==422
    r=client.post('/api/v1/diagnostics/client-event',headers=HEADERS,json={'area':'portal','event':'javascript_error'})
    assert r.status_code==202,r.text
    assert client.get('/api/v1/diagnostics/summary').status_code==401


def test_filter_dates_validation(client,admin):
    r=client.get('/api/v1/diagnostics/events?since=2026-09-27T00:00:00Z&until=2026-09-26T00:00:00Z',headers=admin)
    assert r.status_code==422
