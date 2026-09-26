import base64
import time
import uuid
from datetime import timedelta
import pytest
from app import models as m
from app.db import SessionLocal, now
from app.mfa import otp
from app.security import hash_password, digest

PASSWORD='Security-Test-Only-2026!'
CSRF={'X-CSRF-Protection':'1'}

@pytest.fixture
def secured(client):
    email='mfa-'+uuid.uuid4().hex+'@example.com'
    with SessionLocal.begin() as db:
        user=m.User(name='Administrador MFA',email=email,password_hash=hash_password(PASSWORD),role='admin')
        db.add(user);db.flush();ident=user.id
    response=client.post('/api/v1/auth/login',json={'email':email,'password':PASSWORD})
    assert 'access_token' in response.json(),response.text
    headers={**CSRF,'Authorization':'Bearer '+response.json()['access_token']}
    try:yield client,email,ident,headers
    finally:
        with SessionLocal.begin() as db:
            policy=db.get(m.MFAPolicy,1);policy.required=False;policy.version+=1


def setup_factor(data):
    c,email,ident,headers=data
    challenge=c.post('/api/v1/auth/mfa/enroll',headers=headers,json={'current_password':PASSWORD})
    assert challenge.status_code==200,challenge.text
    token=challenge.json()['mfa_token']
    details=c.post('/api/v1/auth/mfa/challenge',headers=CSRF,json={'token':token})
    assert details.status_code==200,details.text
    assert details.json()['qr'].startswith('data:image/svg+xml;base64,')
    secret=details.json()['secret']
    done=c.post('/api/v1/auth/mfa/verify',headers=CSRF,json={'token':token,'code':otp(secret,int(time.time())//30)})
    assert done.status_code==200,done.text
    return secret,done.json(),token


@pytest.mark.parametrize('timestamp,expected',[(59,'94287082'),(1111111109,'07081804'),(1111111111,'14050471'),(1234567890,'89005924'),(2000000000,'69279037'),(20000000000,'65353130')])
def test_rfc6238_sha1_vectors(timestamp,expected):
    assert otp(base64.b32encode(b'12345678901234567890').decode(),timestamp//30,8)==expected


def test_enrollment_password_confirmation_encryption_and_secret_not_exposed(secured):
    c,email,ident,h=secured
    assert c.post('/api/v1/auth/mfa/enroll',headers=h,json={'current_password':'invalid'}).status_code==422
    secret,session,token=setup_factor(secured)
    assert len(session['recovery_codes'])==10
    with SessionLocal() as db:
        cred=db.get(m.MFACredential,'user:'+ident)
        assert secret not in cred.encrypted_secret and cred.enabled
        codes=db.query(m.MFARecovery).filter_by(subject=cred.subject).all()
        assert all(code.code_hash not in session['recovery_codes'] for code in codes)
    assert c.get('/api/v1/auth/me',headers=h).status_code==401
    me=c.get('/api/v1/auth/me',headers={'Authorization':'Bearer '+session['access_token']})
    assert secret not in me.text and token not in me.text and me.status_code==200
    assert c.post('/api/v1/auth/mfa/verify',headers=CSRF,json={'token':token,'code':session['recovery_codes'][0]}).status_code==401


def test_no_session_before_mfa_and_recovery_single_use(secured):
    c,email,ident,h=secured
    secret,session,_=setup_factor(secured)
    c.cookies.clear()
    challenge=c.post('/api/v1/auth/login',json={'email':email,'password':PASSWORD})
    assert 'access_token' not in challenge.json() and 'pige_refresh' not in challenge.cookies
    token=challenge.json()['mfa_token']
    assert c.post('/api/v1/auth/refresh',headers=CSRF).status_code==401
    done=c.post('/api/v1/auth/mfa/verify',headers=CSRF,json={'token':token,'code':session['recovery_codes'][0]})
    assert done.status_code==200 and 'access_token' in done.json(),done.text
    token=c.post('/api/v1/auth/login',json={'email':email,'password':PASSWORD}).json()['mfa_token']
    again=c.post('/api/v1/auth/mfa/verify',headers=CSRF,json={'token':token,'code':session['recovery_codes'][0]})
    assert again.status_code==401
    replay=c.post('/api/v1/auth/mfa/verify',headers=CSRF,json={'token':token,'code':otp(secret,int(time.time())//30)})
    assert replay.status_code==401


def test_required_policy_for_all_accounts_and_no_legacy_session_bypass(secured):
    c,email,ident,h=secured
    secret,session,_=setup_factor(secured)
    h={**CSRF,'Authorization':'Bearer '+session['access_token']}
    policy=c.get('/api/v1/institution/mfa',headers=h).json()
    saved=c.put('/api/v1/institution/mfa',headers=h,json={'version':policy['version'],'required':True,'current_password':PASSWORD,'code':session['recovery_codes'][0]})
    assert saved.status_code==200 and saved.json()['requires_login'],saved.text
    assert c.get('/api/v1/auth/me',headers=h).status_code==401
    assert c.post('/api/v1/auth/refresh',headers=CSRF).status_code==401
    # Sem sessão plena para conta ainda não enrolada.
    from conftest import PASSWORD as ADMIN_PASSWORD
    result=c.post('/api/v1/auth/login',json={'email':'admin@example.com','password':ADMIN_PASSWORD})
    assert result.json()['enrollment_required'] and 'access_token' not in result.json()
    # Voltar ao modo opcional não apaga o fator configurado na conta.
    with SessionLocal.begin() as db:db.get(m.MFAPolicy,1).required=False
    result=c.post('/api/v1/auth/login',json={'email':email,'password':PASSWORD})
    assert result.json()['mfa_required'] and not result.json()['enrollment_required']


def test_expiry_password_change_wrong_codes_and_csrf(secured):
    c,email,ident,h=secured
    _,session,_=setup_factor(secured)
    challenge=c.post('/api/v1/auth/login',json={'email':email,'password':PASSWORD}).json()
    token=challenge['mfa_token']
    assert c.post('/api/v1/auth/mfa/challenge',json={'token':token}).status_code==403
    assert c.post('/api/v1/auth/mfa/verify',headers={**CSRF,'Origin':'https://untrusted.example'},json={'token':token,'code':session['recovery_codes'][0]}).status_code==403
    for _ in range(5):
        assert c.post('/api/v1/auth/mfa/verify',headers=CSRF,json={'token':token,'code':'9999999999'}).status_code==401
    assert c.post('/api/v1/auth/mfa/verify',headers=CSRF,json={'token':token,'code':session['recovery_codes'][0]}).status_code==401
    token=c.post('/api/v1/auth/login',json={'email':email,'password':PASSWORD}).json()['mfa_token']
    with SessionLocal.begin() as db:
        row=db.query(m.MFAChallenge).filter_by(token_hash=digest(token)).one();row.expires_at=now()-timedelta(seconds=1)
    assert c.post('/api/v1/auth/mfa/challenge',headers=CSRF,json={'token':token}).status_code==401
    token=c.post('/api/v1/auth/login',json={'email':email,'password':PASSWORD}).json()['mfa_token']
    with SessionLocal.begin() as db:db.get(m.User,ident).password_hash=hash_password('Other-Test-Password-2026!')
    assert c.post('/api/v1/auth/mfa/challenge',headers=CSRF,json={'token':token}).status_code==401


def test_required_portal_enrollment_no_registration_bypass(secured,api):
    c,email,ident,h=secured
    cat=api.catalogs()
    campaign=api.post('/admission-campaigns',{'title':'Admissão com MFA','slug':'mfa-'+uuid.uuid4().hex[:10], 'opens_on':'2020-01-01','closes_on':'2030-12-31','class_group_ids':[cat['group']['id']], 'instructions':'Teste','privacy_notice':'Aviso sintético de privacidade para teste de autenticação do portal escolar.','terms_version':'1','active':True})
    with SessionLocal.begin() as db:db.get(m.MFAPolicy,1).required=True
    r=c.post('/api/v1/portal/register',headers=CSRF,json={'campaign_slug':campaign['slug'],'name':'Responsável MFA','email':'guardian-'+uuid.uuid4().hex+'@example.com','password':PASSWORD,'accept_privacy':True,'terms_version':'1'})
    assert r.status_code==201,r.text
    assert r.json()['enrollment_required'] and 'pige_portal' not in r.cookies
    assert c.get('/api/v1/portal/me').status_code==401
    token=r.json()['mfa_token']
    secret=c.post('/api/v1/auth/mfa/challenge',headers=CSRF,json={'token':token}).json()['secret']
    r=c.post('/api/v1/auth/mfa/verify',headers=CSRF,json={'token':token,'code':otp(secret,int(time.time())//30)})
    assert r.status_code==200 and len(r.json()['recovery_codes'])==10,r.text
    assert c.get('/api/v1/portal/me').status_code==200
    assert c.post('/api/v1/portal/mfa/disable',headers=CSRF,json={'current_password':PASSWORD,'code':r.json()['recovery_codes'][0]}).status_code==409


def test_optional_disable_requires_proof_and_revokes_sessions(secured):
    c,email,ident,h=secured
    _,session,_=setup_factor(secured)
    h={**CSRF,'Authorization':'Bearer '+session['access_token']}
    assert c.post('/api/v1/auth/mfa/disable',headers=h,json={'current_password':'wrong','code':session['recovery_codes'][0]}).status_code==422
    response=c.post('/api/v1/auth/mfa/disable',headers=h,json={'current_password':PASSWORD,'code':session['recovery_codes'][0]})
    assert response.status_code==200 and response.json()['requires_login']
    assert c.get('/api/v1/auth/me',headers=h).status_code==401
    assert 'access_token' in c.post('/api/v1/auth/login',json={'email':email,'password':PASSWORD}).json()
    with SessionLocal() as db:
        assert db.query(m.MFARecovery).filter_by(subject='user:'+ident).count()==0
        assert db.get(m.MFACredential,'user:'+ident).encrypted_secret==''


def test_regeneration_invalidates_all_previous_recovery_codes(secured):
    c,email,ident,h=secured
    _,session,_=setup_factor(secured)
    h={**CSRF,'Authorization':'Bearer '+session['access_token']}
    result=c.post('/api/v1/auth/mfa/recovery',headers=h,json={'current_password':PASSWORD,'code':session['recovery_codes'][0]})
    assert result.status_code==200,result.text
    challenge=c.post('/api/v1/auth/login',json={'email':email,'password':PASSWORD}).json()['mfa_token']
    assert c.post('/api/v1/auth/mfa/verify',headers=CSRF,json={'token':challenge,'code':session['recovery_codes'][1]}).status_code==401
    assert c.post('/api/v1/auth/mfa/verify',headers=CSRF,json={'token':challenge,'code':result.json()['recovery_codes'][0]}).status_code==200


def test_five_wrong_attempts_invalidate_challenge_and_cancel_removes_pending_secret(secured):
    c,email,ident,h=secured
    _,session,_=setup_factor(secured)
    token=c.post('/api/v1/auth/login',json={'email':email,'password':PASSWORD}).json()['mfa_token']
    for _ in range(5):
        assert c.post('/api/v1/auth/mfa/verify',headers=CSRF,json={'token':token,'code':'ABCDEF'}).status_code==401
    assert c.post('/api/v1/auth/mfa/verify',headers=CSRF,json={'token':token,'code':session['recovery_codes'][0]}).status_code==401
    token=c.post('/api/v1/auth/login',json={'email':email,'password':PASSWORD}).json()['mfa_token']
    assert c.post('/api/v1/auth/mfa/cancel',headers=CSRF,json={'token':token}).status_code==200
    assert c.post('/api/v1/auth/mfa/verify',headers=CSRF,json={'token':token,'code':session['recovery_codes'][0]}).status_code==401


def test_policy_requires_admin_and_does_not_accept_password_only(secured):
    c,email,ident,h=secured
    p=c.get('/api/v1/institution/mfa',headers=h).json()
    result=c.put('/api/v1/institution/mfa',headers=h,json={'version':p['version'],'required':True,'current_password':PASSWORD,'code':'ABCDEF'})
    assert result.status_code==422
    with SessionLocal.begin() as db:db.get(m.User,ident).role='viewer'
    assert c.get('/api/v1/institution/mfa',headers=h).status_code==403


def test_two_parallel_challenges_do_not_reuse_totp(secured):
    from concurrent.futures import ThreadPoolExecutor
    c,email,ident,h=secured
    secret,session,_=setup_factor(secured)
    tokens=[c.post('/api/v1/auth/login',json={'email':email,'password':PASSWORD}).json()['mfa_token'] for _ in range(2)]
    # Avanço de um passo dentro da janela admitida, pois o passo atual foi usado na ativação.
    code=otp(secret,int(time.time())//30+1)
    def submit(token):
        return c.post('/api/v1/auth/mfa/verify',headers=CSRF,json={'token':token,'code':code}).status_code
    with ThreadPoolExecutor(max_workers=2) as pool:statuses=list(pool.map(submit,tokens))
    assert sorted(statuses)==[200,401],statuses
