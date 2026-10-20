import copy
from datetime import timedelta
from sqlalchemy import select
from app import email_client as e, mailcow, models as m
from app.db import SessionLocal, now
from app.integration_core import unseal
from test_email_client import mailbox_api


def allow_check(a):
    with SessionLocal() as db:
        row=db.scalar(select(e.EmailConnection).where(e.EmailConnection.mailbox_id==a['user']['mailbox']['id']))
        row.checked_at=now()-timedelta(minutes=1);db.commit()


def read_only_mailcow(monkeypatch):
    original=mailcow.MailcowClient.request;calls=[]
    def request(self,path,method='GET',data=None):
        assert method=='GET', 'Repair must not create/delete accounts or change a password.'
        calls.append(path);return original(self,path,method,data)
    monkeypatch.setattr(mailcow.MailcowClient,'request',request)
    return calls


def test_owner_repair_reauthenticates_and_preserves_every_message(mailbox_api,monkeypatch):
    a=mailbox_api;allow_check(a);calls=read_only_mailcow(monkeypatch)
    messages=copy.deepcopy(a['state']['folders']);password=a['state']['password']
    with SessionLocal() as db:
        box=db.get(mailcow.SchoolMailbox,a['user']['mailbox']['id']);before=(box.id,box.address,box.quota_mb,box.user_id,box.config_id)
    r=a['client'].post(a['base']+'/connection/repair',headers=a['headers'],json={})
    assert r.status_code==200 and r.json()['connected'],r.text
    assert calls and a['state']['password']==password and a['state']['folders']==messages and a['state']['sent']==[]
    assert a['state']['commands']==[]  # Nenhuma escrita IMAP.
    with SessionLocal() as db:
        box=db.get(mailcow.SchoolMailbox,box.id)
        assert (box.id,box.address,box.quota_mb,box.user_id,box.config_id)==before
    assert a['client'].post(a['base']+'/connection/repair',headers=a['headers'],json={}).status_code==429


def test_explicit_disconnect_is_not_undone_by_repair(mailbox_api,monkeypatch):
    a=mailbox_api;read_only_mailcow(monkeypatch)
    a['client'].delete(a['base']+'/connection',headers=a['headers'])
    r=a['client'].post(a['base']+'/connection/repair',headers=a['headers'],json={})
    assert r.status_code==200 and not r.json()['connected'] and r.json()['needs_password']
    with SessionLocal() as db:
        row=db.scalar(select(e.EmailConnection).where(e.EmailConnection.mailbox_id==a['user']['mailbox']['id']))
        assert row.encrypted_secret==''


def test_changed_mail_password_is_repaired_with_current_password_without_reset(mailbox_api,monkeypatch):
    a=mailbox_api;allow_check(a);read_only_mailcow(monkeypatch)
    messages=copy.deepcopy(a['state']['folders']);a['state']['password']='Current-synthetic-mail-password'
    r=a['client'].post(a['base']+'/connection/repair',headers=a['headers'],json={})
    assert r.status_code==200 and not r.json()['connected'] and r.json()['connection_error_code']=='EMAIL_AUTH'
    r=a['client'].post(a['base']+'/connection',headers=a['headers'],json={'password':a['state']['password']})
    assert r.status_code==200 and r.json()['connected']
    assert a['state']['folders']==messages and a['state']['sent']==[]


def test_admin_repair_restores_binding_not_remote_account_or_disconnected_secret(mailbox_api,monkeypatch):
    a=mailbox_api;calls=read_only_mailcow(monkeypatch)
    a['client'].delete(a['base']+'/connection',headers=a['headers'])
    with SessionLocal() as db:
        box=db.get(mailcow.SchoolMailbox,a['user']['mailbox']['id']);job=db.get(m.IntegrationJob,box.job_id)
        box.provisioned_at=None;job.status='failed';job.error_code='MAILCOW_NETWORK_ERROR';db.commit()
    url=a['base'].removesuffix('/email')+'/mailcow/mailboxes/'+box.id+'/repair'
    r=a['client'].post(url,headers=a['admin'],json={})
    assert r.status_code==200 and r.json()['status']=='active' and r.json()['job_status']=='completed',r.text
    assert calls and a['state']['sent']==[]
    with SessionLocal() as db:
        connection=db.scalar(select(e.EmailConnection).where(e.EmailConnection.mailbox_id==box.id))
        assert connection.encrypted_secret==''
    assert a['client'].post(url,headers=a['headers'],json={}).status_code==403


def test_foreign_mailbox_or_school_is_denied(mailbox_api,monkeypatch):
    a=mailbox_api;allow_check(a)
    monkeypatch.setattr(mailcow.MailcowClient,'mailbox',lambda *args:{'username':'foreign@example.com','active':1,'tags':[]})
    r=a['client'].post(a['base']+'/connection/repair',headers=a['headers'],json={})
    assert r.status_code==502
    assert a['state']['sent']==[]
    with SessionLocal() as db:
        other=m.School(company_id=a['school']['company_id'],name='Escola sintética isolada');db.add(other);db.commit()
    assert a['client'].post('/api/v1/schools/'+other.id+'/email/connection/repair',headers=a['headers'],json={}).status_code==403
