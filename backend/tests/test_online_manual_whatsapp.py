"""Real API/DB regressions for existing shared WhatsApp instances and manual files."""
import io
import re
from datetime import timedelta
from unittest.mock import patch
from types import SimpleNamespace

from PIL import Image
from sqlalchemy import select
from app import models as m
from app.config import settings
from app.db import SessionLocal, now
from app.integration_core import unseal
from app.integration_worker import process_connect_one
from test_online import online, pc, draft, submit, CSRF


def instance(o, **changes):
    with SessionLocal() as db:
        school=db.get(m.School,o['account']['school_id'])
        row=m.ConnectInstance(company_id=school.company_id,school_id=school.id,
            name='shared-hub-existing-'+school.id[:8],source='adopted',status='open',primary=True,**changes)
        db.add(row);db.flush();db.add(m.ConnectSchoolBinding(school_id=school.id,instance_id=row.id,updated_at=now()));db.commit()
        return row.id


def test_existing_shared_instance_sends_and_verifies_without_legacy_connection(online, monkeypatch):
    o=online;ident=instance(o)
    assert pc(o,'GET','/verification/channels')['whatsapp'] is True
    result=pc(o,'POST','/verification/request',{'channel':'whatsapp'});assert 'code' not in result
    with SessionLocal() as db:
        assert not db.scalar(select(m.IntegrationConnection).where(m.IntegrationConnection.school_id==o['account']['school_id']))
        job=db.scalar(select(m.ConnectMessageJob).where(m.ConnectMessageJob.instance_id==ident))
        payload=unseal(job.encrypted_payload);code=re.search(r'\b\d{6}\b',payload['text'])[0]
        assert code not in job.encrypted_payload and 'expires_at' in payload
        name=db.get(m.ConnectInstance,ident).name
        job.created_at=now()-timedelta(days=36500);db.commit()
    # Only sending is allowed: no QR, connect, create, webhook changes or logout calls.
    calls=[]
    monkeypatch.setattr('app.integration_worker.ConnectApiClient',lambda:SimpleNamespace(send_text=lambda *args:calls.append(args) or 'remote-message'))
    assert process_connect_one()
    assert calls[0][:3]==(name,o['account']['phone'],payload['text'])
    assert pc(o,'POST','/verification/confirm',{'code':code})['phone_verified'] is True
    pc(o,'POST','/verification/confirm',{'code':code},400)
    with SessionLocal() as db:assert db.get(m.ConnectInstance,ident).status=='open'


def test_unavailable_whatsapp_has_no_provider_or_configuration_details(online):
    o=online
    assert pc(o,'GET','/verification/channels')['whatsapp'] is False
    error=pc(o,'POST','/verification/request',{'channel':'whatsapp'},409)
    assert 'WhatsApp' in error['detail']
    assert all(word not in str(error) for word in ('connect_api','Connect API','INTEGRATION_ENCRYPTION_KEY'))


def test_different_school_instance_cannot_be_used_for_verification(online):
    o=online;ident=instance(o)
    with SessionLocal() as db:
        row=db.get(m.ConnectInstance,ident);row.school_id=None;db.commit()
    assert pc(o,'GET','/verification/channels')['whatsapp'] is False
    pc(o,'POST','/verification/request',{'channel':'whatsapp'},409)


def test_closed_preferred_instance_is_not_replaced_by_another_sender(online):
    o=online;ident=instance(o)
    with SessionLocal() as db:db.get(m.ConnectInstance,ident).status='close';db.commit()
    assert pc(o,'GET','/verification/channels')['whatsapp'] is False
    pc(o,'POST','/verification/request',{'channel':'whatsapp'},409)


def test_expired_code_is_not_sent_by_instance_worker(online,monkeypatch):
    o=online;ident=instance(o);pc(o,'POST','/verification/request',{'channel':'whatsapp'})
    from app.integration_core import seal
    with SessionLocal() as db:
        job=db.scalar(select(m.ConnectMessageJob).where(m.ConnectMessageJob.instance_id==ident))
        payload=unseal(job.encrypted_payload);payload['expires_at']=(now()-timedelta(seconds=1)).isoformat();job.encrypted_payload=seal(payload);job_id=job.id;job.created_at=now()-timedelta(days=36500);db.commit()
    with patch('app.integration_worker.ConnectApiClient.send_text') as send:
        assert process_connect_one();send.assert_not_called()
    with SessionLocal() as db:
        job=db.get(m.ConnectMessageJob,job_id);assert job.status=='failed' and job.error_code=='MESSAGE_EXPIRED'


def manual_upload(o,a,name='documento.png'):
    buf=io.BytesIO();Image.new('RGB',(20,20)).save(buf,'PNG')
    return o['parent'].post('/api/v1/portal/admissions/'+a['id']+'/attachments',headers=CSRF,
        data={'version':a['version']},files={'file':(name,buf.getvalue(),'image/png')})


def test_manual_documents_without_catalog_preserve_multiple_files_and_submit(online):
    o=online;a=draft(o);assert not a['document_types']
    for name in ('certidao.png','comprovante.png'):
        result=manual_upload(o,a,name);assert result.status_code==201,result.text;a=result.json()
    assert len(a['attachments'])==2 and not a['document_types']
    for item in a['attachments']:
        result=pc(o,'GET',f"/admissions/{a['id']}/attachments/{item['id']}");assert result.content.startswith(b'\x89PNG')
    assert submit(o,a)['status']=='submitted'
    assert manual_upload(o,a).status_code==409


def test_complementary_files_do_not_satisfy_required_types(online):
    o=online;o['api'].post('/document-types',{'name':'Certidão obrigatória','required':True})
    with SessionLocal() as db:db.get(m.AdmissionCampaign,o['campaign']['id']).require_documents=True;db.commit()
    a=draft(o);result=manual_upload(o,a);assert result.status_code==201;a=result.json()
    pc(o,'POST',f"/admissions/{a['id']}/submit",{'version':a['version'],'accept_terms':True,'legal_responsibility':True,'terms_version':'1'},409)


def test_manual_files_cannot_be_uploaded_to_another_account_admission(online):
    o=online;a=draft(o)
    pc(o,'POST','/logout',{})
    assert manual_upload(o,a).status_code==401


def test_builtin_contract_is_valid_importable_and_contains_no_school_data(online):
    o=online;model=o['api'].get('/document-template-models')['items'][0]
    assert not model['active'] and model['require_signature']
    assert '{{escola.nome}}' in model['body'] and '{{contratante2.nome}}' in model['body']
    assert 'Navegantes' not in str(model) and '60.494' not in str(model)
    created=o['api'].post('/document-templates',model)
    assert created['body']==model['body']
