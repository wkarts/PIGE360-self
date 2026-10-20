"""IP autenticado do portal, sessão temporária de convite e identidade pública."""
from datetime import timedelta
from functools import partial
import hashlib
import hmac
import time
from types import SimpleNamespace
import pytest
from starlette.testclient import TestClient
from starlette.requests import Request
from starlette.responses import JSONResponse
from app import portal_proxy
from app.config import settings
from app.portal_proxy import PortalClientMiddleware
from app.db import SessionLocal,now
from app import models as m
from app.security import digest
from sqlalchemy import select
from app.user_invitations import UserInvitation,INVITATION_COOKIE_PATH
from test_continuity_operations import invite
from conftest import PASSWORD

SECRET='synthetic-portal-service-key-0000000000000'
CSRF={'Origin':'http://testserver','X-CSRF-Protection':'1'}


def signed(ip,path='/api/v1/auth/login',method='POST',timestamp=None):
    stamp=str(int(time.time()) if timestamp is None else timestamp)
    signature=hmac.new(SECRET.encode(),'\n'.join((stamp,method,path,ip)).encode(),hashlib.sha256).hexdigest()
    return {'X-Pige-Portal-IP':ip,'X-Pige-Portal-Time':stamp,'X-Pige-Portal-Signature':signature}


@pytest.fixture
def portal_clock(monkeypatch):
    # Altera só o relógio consultado pelo middleware; não afeta timers do runner.
    clock=SimpleNamespace(now=1_800_000_000.0)
    monkeypatch.setattr(portal_proxy,'time',SimpleNamespace(time=lambda:clock.now))
    return clock


def test_portal_ip_hmac_rejects_spoofing_replay_duplicate_headers_and_wrong_target(monkeypatch,portal_clock):
    monkeypatch.setattr(settings(),'portal_internal_token',SECRET)
    sign=partial(signed,timestamp=int(portal_clock.now))
    async def echo(scope,receive,send):
        request=Request(scope,receive)
        await JSONResponse({'peer':request.client.host,'internal_header':request.headers.get('x-pige-portal-ip')})(scope,receive,send)
    client=TestClient(PortalClientMiddleware(echo))
    for ip in ('198.51.100.1','198.51.100.2','2001:db8::1'):
        response=client.post('/api/v1/auth/login',headers=sign(ip))
        assert response.json()=={'peer':ip,'internal_header':None}
    for path in ('/api/v1/auth/mfa/verify','/api/v1/portal/mfa/enroll'):
        assert client.post(path,headers=sign('198.51.100.1',path=path)).json()['peer']=='198.51.100.1'
    for headers in [
        {'X-Forwarded-For':'198.51.100.1','X-Pige-Portal-IP':'198.51.100.1'},
        {**sign('198.51.100.1'),'X-Pige-Portal-IP':'198.51.100.2'},
        sign('198.51.100.1',method='GET'),sign('198.51.100.1',path='/api/v1/auth/logout'),
        sign('198.51.100.1',timestamp=int(portal_clock.now)-31),sign('198.51.100.1',timestamp=int(portal_clock.now)+31),
        list(sign('198.51.100.1').items())+[('X-Pige-Portal-IP','198.51.100.2')],
    ]:
        assert client.post('/api/v1/auth/login',headers=headers).json()['peer']=='testclient'
    assert client.post('/api/v1/backups',headers=sign('198.51.100.1',path='/api/v1/backups')).json()['peer']=='testclient'
    monkeypatch.setattr(settings(),'portal_internal_token','')
    assert client.post('/api/v1/auth/login',headers=sign('198.51.100.1')).json()['peer']=='testclient'


@pytest.mark.parametrize('offset,elapsed,accepted',[
    pytest.param(-31,0,False,id='past-outside'),
    pytest.param(-30,0,True,id='past-at-boundary'),
    pytest.param(-30,0.001,False,id='past-just-expired'),
    pytest.param(-29,0.999,True,id='past-within-fractional-second'),
    pytest.param(0,29.999,True,id='arrival-before-expiry'),
    pytest.param(0,30,True,id='arrival-at-expiry'),
    pytest.param(0,30.001,False,id='arrival-after-expiry'),
    pytest.param(30,0,True,id='future-at-boundary'),
    pytest.param(31,0,False,id='future-outside'),
    pytest.param(31,0.999,False,id='future-just-outside'),
    pytest.param(31,1,True,id='future-enters-window-at-next-second'),
    pytest.param(31,1.001,True,id='future-within-after-delivery'),
])
def test_portal_hmac_window_is_evaluated_at_reception(monkeypatch,portal_clock,offset,elapsed,accepted):
    monkeypatch.setattr(settings(),'portal_internal_token',SECRET)
    headers=signed('198.51.100.1',timestamp=int(portal_clock.now)+offset)
    portal_clock.now+=elapsed
    async def echo(scope,receive,send):
        request=Request(scope,receive)
        await JSONResponse({'peer':request.client.host,'internal_header':request.headers.get('x-pige-portal-ip')})(scope,receive,send)
    client=TestClient(PortalClientMiddleware(echo))
    try:
        response=client.post('/api/v1/auth/login',headers=headers)
    finally:
        client.close()
    assert response.json()=={'peer':'198.51.100.1' if accepted else 'testclient','internal_header':None}


def test_invitation_refresh_uses_scoped_httponly_cookie_without_exposing_token(api,client):
    user,ident,job,token,_=invite(api)
    result=client.post('/api/v1/invitations/inspect',json={'token':token},headers=CSRF)
    assert result.status_code==200 and result.json()['invitation_id']==ident
    assert token not in result.text
    cookie=result.headers['set-cookie']
    assert 'HttpOnly' in cookie and 'SameSite=strict' in cookie and 'Path='+INVITATION_COOKIE_PATH in cookie
    assert 'Domain=' not in cookie
    for _ in range(2):
        response=client.post('/api/v1/invitations/inspect',json={'invitation_id':ident},headers=CSRF)
        assert response.status_code==200
    assert client.post('/api/v1/invitations/accept',json={'invitation_id':ident,'password':PASSWORD}).status_code==403
    assert client.post('/api/v1/invitations/accept',json={'invitation_id':ident,'password':PASSWORD},headers={**CSRF,'Origin':'https://evil.example'}).status_code==403
    accepted=client.post('/api/v1/invitations/accept',json={'invitation_id':ident,'password':PASSWORD},headers=CSRF)
    assert accepted.status_code==200
    assert 'Max-Age=0' in accepted.headers['set-cookie']
    assert f'pige_invitation_{ident}=' in accepted.headers['set-cookie']
    assert 'Path='+INVITATION_COOKIE_PATH in accepted.headers['set-cookie']
    assert client.post('/api/v1/auth/login',json={'email':user['email'],'password':PASSWORD}).status_code==200
    assert client.post('/api/v1/invitations/inspect',json={'invitation_id':ident},headers=CSRF).status_code==400


def test_two_invitation_tabs_keep_their_own_identity_and_expiry(api,client):
    first=invite(api);second=invite(api)
    for item in (first,second):
        assert client.post('/api/v1/invitations/inspect',json={'token':item[3]},headers=CSRF).status_code==200
    assert client.post('/api/v1/invitations/accept',json={'token':first[3],'invitation_id':second[1],'password':PASSWORD},headers=CSRF).status_code==400
    accepted=client.post('/api/v1/invitations/accept',json={'invitation_id':first[1],'password':PASSWORD},headers=CSRF)
    assert accepted.status_code==200
    assert client.post('/api/v1/invitations/inspect',json={'invitation_id':second[1]},headers=CSRF).status_code==200
    with SessionLocal.begin() as db:db.get(UserInvitation,second[1]).expires_at=now()-timedelta(seconds=1)
    expired=client.post('/api/v1/invitations/accept',json={'invitation_id':second[1],'password':PASSWORD},headers=CSRF)
    assert expired.status_code==400 and 'Max-Age=0' in expired.headers['set-cookie']
    assert 'Path='+INVITATION_COOKIE_PATH in expired.headers['set-cookie']
    assert client.post('/api/v1/auth/login',json={'email':first[0]['email'],'password':PASSWORD}).status_code==200
    assert client.post('/api/v1/auth/login',json={'email':second[0]['email'],'password':PASSWORD}).status_code==401


def test_manifest_uses_identity_and_surface_specific_navigation(client):
    identity=client.get('/api/v1/institution/identity').json()
    manager=client.get('/manifest.webmanifest').json()
    portal=client.get('/manifest.webmanifest?surface=portal').json()
    website=client.get('/manifest.webmanifest?surface=website').json()
    for manifest in (manager,portal,website):
        assert manifest['name']==identity['display_name']
        assert manifest['theme_color']==identity['primary_color']
        assert all(icon['src'].startswith('/api/v1/institution/icon.png') for icon in manifest['icons'])
    assert portal['shortcuts']==[{'name':'Boletim','url':'/academic'},{'name':'Documentos','url':'/documents'},{'name':'Inscrição','url':'/online.html'}]
    assert website['display']=='browser'
    assert all('/#/' not in item['url'] for item in portal['shortcuts']+website['shortcuts'])
    assert manager['shortcuts'][0]['url']=='/#/students'


def test_signed_client_ip_keeps_login_rate_limits_independent(client,monkeypatch):
    monkeypatch.setattr(settings(),'portal_internal_token',SECRET)
    blocked='198.51.100.71';other='198.51.100.72'
    with SessionLocal.begin() as db:
        db.add(m.LoginAttempt(key=digest('ip:'+blocked),count=80,window_started=now()))
    try:
        body={'email':'rate-ip@example.com','password':PASSWORD}
        assert client.post('/api/v1/auth/login',json=body,headers=signed(blocked)).status_code==429
        assert client.post('/api/v1/auth/login',json=body,headers=signed(other)).status_code==401
        with SessionLocal() as db:
            assert db.scalar(select(m.LoginAttempt).where(m.LoginAttempt.key==digest('ip:'+other))).count==1
            assert db.scalar(select(m.LoginAttempt).where(m.LoginAttempt.key==digest('ip:'+blocked))).count==80
    finally:
        with SessionLocal.begin() as db:
            for key in ('ip:'+blocked,'ip:'+other,'account:rate-ip@example.com'):
                row=db.scalar(select(m.LoginAttempt).where(m.LoginAttempt.key==digest(key)))
                if row:db.delete(row)


def test_invitation_cookie_is_secure_in_production(monkeypatch):
    from starlette.responses import Response
    from app.user_invitations import invitation_cookie
    monkeypatch.setattr(settings(),'app_env','production')
    monkeypatch.setattr(settings(),'cookie_secure',False)
    response=Response();invitation_cookie(response,'11111111-1111-4111-8111-111111111111','synthetic-token',10)
    assert 'Secure' in response.headers['set-cookie'] and 'Max-Age=10' in response.headers['set-cookie']


def test_portal_middleware_preserves_scope_route_and_state_for_telemetry(monkeypatch):
    monkeypatch.setattr(settings(),'portal_internal_token',SECRET)
    async def handler(scope,receive,send):
        scope['route']='resolved-route'
        scope['state']={'school_id':'synthetic-school'}
        await JSONResponse({'ok':True})(scope,receive,send)
    middleware=PortalClientMiddleware(handler)
    async def telemetry(scope,receive,send):
        await middleware(scope,receive,send)
        assert scope['route']=='resolved-route'
        assert scope['state']['school_id']=='synthetic-school'
    probe=TestClient(telemetry)
    assert probe.post('/api/v1/auth/login',headers=signed('198.51.100.1')).status_code==200
    assert probe.get('/api/v1/schools/synthetic/students').status_code==200
