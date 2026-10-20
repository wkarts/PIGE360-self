import smtplib
from contextlib import contextmanager
from types import SimpleNamespace
from datetime import timedelta
import pytest
from sqlalchemy import select
from app import models as m, notification_email as n
from app.db import SessionLocal, now
from app.integration_core import enqueue, unseal
from app.integration_worker import process_one
from test_online import online, draft, submit, pc

PASSWORD=' synthetic SMTP password '


def configure(api,**changes):
    data={'mode':'school','host':'mail.example.com','port':587,'username':'mailer@example.com',
        'from_address':'secretaria@example.com','password':PASSWORD,'version':None,**changes}
    return api.call('PUT','/notification-email',data)


def transport(monkeypatch,*,error=None):
    calls=[]
    @contextmanager
    def smtp():
        calls.append('authenticate')
        if error=='auth':raise smtplib.SMTPAuthenticationError(535,b'secret provider response')
        def send_message(message):
            calls.append(message)
            if error=='timeout':raise TimeoutError('secret socket details')
            return {}
        yield SimpleNamespace(send_message=send_message)
    monkeypatch.setattr(n,'smtp_client',lambda row:SimpleNamespace(smtp=smtp))
    return calls


def test_config_secret_version_and_auth_only_validation(api,monkeypatch):
    config=configure(api); assert config['available'] and config['password_configured']
    assert PASSWORD not in str(config)
    with SessionLocal() as db:
        row=n.configuration(db,api.school['id'])
        assert row.encrypted_secret!=PASSWORD
        assert unseal(row.encrypted_secret)=={'password':PASSWORD}
    calls=transport(monkeypatch)
    response=api.post('/notification-email/validate',{},200)
    assert response['ok'] and response['checked_at'] and calls==['authenticate']
    api.post('/notification-email/validate',{},429)
    saved=configure(api,version=config['version'],password='')
    assert saved['password_configured'] and saved['checked_at'] is None
    api.call('PUT','/notification-email',{'mode':'inherit','version':config['version']},409)


def test_test_message_is_owned_deduplicated_and_worker_uses_school_smtp(api,monkeypatch):
    configure(api);calls=transport(monkeypatch)
    body={'client_key':'00000000-0000-4000-8000-000000000001'}
    queued=api.post('/notification-email/test',body,202)
    assert api.post('/notification-email/test',body,202)['job_id']==queued['job_id']
    api.post('/notification-email/test',{'client_key':'00000000-0000-4000-8000-000000000002'},429)
    assert process_one(queued['job_id']) and len(calls)==2
    assert str(calls[1]['To'])=='admin@example.com'
    assert str(calls[1]['From'])=='secretaria@example.com'
    assert calls[1]['Message-ID']
    status=api.get('/notification-email');assert status['jobs'][0]['status']=='completed'
    assert status['jobs'][0]['label']=='Aceito pelo servidor SMTP'
    assert all(j['id']!=queued['job_id'] for j in api.get('/integration-jobs?category=banking')['items'])
    assert not process_one(queued['job_id'])


@pytest.mark.parametrize('error,status,code',[('auth','failed','EMAIL_AUTH'),('timeout','uncertain','EMAIL_NETWORK')])
def test_failure_is_safe_and_uncertain_sends_are_not_replayed(api,monkeypatch,error,status,code):
    configure(api);calls=transport(monkeypatch,error=error)
    job=api.post('/notification-email/test',{'client_key':'00000000-0000-4000-8000-000000000001'},202)
    assert process_one(job['job_id'])
    result=api.get('/notification-email')['jobs'][0]
    assert result['status']==status and result['error_code']==code
    assert 'secret' not in str(result)
    assert not process_one(job['job_id'])


def test_disabled_school_never_falls_back_to_installation(api,monkeypatch):
    configure(api,mode='disabled')
    monkeypatch.setattr('app.integration_worker.send_email',lambda payload:pytest.fail('Must not use global SMTP'))
    with SessionLocal() as db:
        job=enqueue(db,api.school['id'],'smtp_email',{'to':'test@example.com','text':'Synthetic message'},'test-disabled:'+api.school['id']);db.commit();id=job.id
    assert process_one(id)
    assert api.get('/notification-email')['jobs'][0]['error_code']=='SMTP_DISABLED'
    api.post('/notification-email/test',{'client_key':'00000000-0000-4000-8000-000000000001'},409)


def test_school_smtp_handles_parent_verification_reset_and_admission_notices(online,monkeypatch):
    o=online;api=o['api'];configure(api);calls=transport(monkeypatch)
    pc(o,'POST','/verification/request',{'channel':'email'})
    with SessionLocal() as db:
        jobs=list(db.scalars(select(m.IntegrationJob).where(m.IntegrationJob.school_id==api.school['id'],m.IntegrationJob.kind=='smtp_email')))
        assert len(jobs)==1
    assert process_one(jobs[0].id)
    a=submit(o,draft(o))
    api.post('/admissions/'+a['id']+'/actions',{'version':a['version'],'action':'review','reason':'Início da análise sintética.'},200)
    with SessionLocal() as db:
        notices=list(db.scalars(select(m.IntegrationJob).where(m.IntegrationJob.school_id==api.school['id'],m.IntegrationJob.dedupe_key.startswith('admission-email:'))))
        assert notices
        assert all(unseal(j.encrypted_payload)['to']==o['account']['email'] for j in notices)
    for job in notices: assert process_one(job.id)
    pc(o,'POST','/password/request',{'school_id':api.school['id'],'email':o['account']['email']})
    with SessionLocal() as db:
        assert db.scalar(select(m.PortalChallenge.id).where(m.PortalChallenge.account_id==o['account']['id'],m.PortalChallenge.purpose=='reset'))


def test_configuration_validation_scope_and_queue_delay(api,client,admin,monkeypatch):
    for changes in [{'host':'http://mail.example.com'},{'port':25},{'from_address':'bad\n@example.com'}]:
        data={'mode':'school','host':'mail.example.com','port':587,'username':'mailer','from_address':'test@example.com','password':'synthetic',**changes}
        api.call('PUT','/notification-email',data,422)
    configure(api)
    from test_mailcow import new_user
    user=new_user(client,admin,api.school,role='viewer')
    token=client.post('/api/v1/auth/login',json={'email':user['email'],'password':'Example-only-app-password-2026!'}).json()['access_token']
    assert client.get(api.base+'/notification-email',headers={'Authorization':'Bearer '+token}).status_code==403
    with SessionLocal() as db:
        job=enqueue(db,api.school['id'],'smtp_email',{'to':'test@example.com','text':'Synthetic'},'delay:'+api.school['id']);job.created_at=now()-timedelta(minutes=10);db.commit()
    assert api.get('/notification-email')['queue_delayed']


def test_network_targets_remain_pinned_and_restricted(api,monkeypatch):
    from app import email_client as e
    configure(api)
    calls=[]
    monkeypatch.setattr(e,'_target',lambda host,port,private:(calls.append((host,port,private)) or '8.8.8.8'))
    class SMTP:
        def __init__(self,*args):calls.append(args)
        def login(self,user,password):calls.append((user,password))
        def quit(self):pass
    monkeypatch.setattr(e,'PinnedSMTPStartTLS',SMTP)
    with SessionLocal() as db:
        with n.smtp_client(n.configuration(db,api.school['id'])).smtp():pass
    assert calls[0]==('mail.example.com',587,False)
    assert calls[-1]==('mailer@example.com',PASSWORD)
