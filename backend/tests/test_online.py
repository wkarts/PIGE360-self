"""API e banco reais. Apenas provedores externos são substituídos em testes de contrato."""
import re, uuid, io, base64
from datetime import date, timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from PIL import Image
from app import models as m
from app.db import SessionLocal
from app.config import settings
from app.integration_core import unseal, IntegrationFailure
from app.integration_worker import process_one
from conftest import PASSWORD
CSRF={'X-CSRF-Protection':'1'}
CPF='52998224725'

@pytest.fixture
def online(api):
    cat=api.catalogs(capacity=3,year='2027')
    campaign=api.post('/admission-campaigns',{'slug':'processo-'+uuid.uuid4().hex[:12],'title':'Matrículas 2027','class_group_ids':[cat['group']['id']], 'opens_on':str(date.today()-timedelta(days=1)),'closes_on':str(date.today()+timedelta(days=90)),'active':True,'require_verified_contact':False,'privacy_notice':'Dados utilizados exclusivamente no processo de matrícula e atendimento escolar, conforme o aviso institucional.'})
    from app.main import app
    parent=TestClient(app,base_url='http://testserver')
    r=parent.post('/api/v1/portal/register',headers=CSRF,json={'campaign_slug':campaign['slug'],'name':'Responsável Teste','email':uuid.uuid4().hex+'@example.com','password':PASSWORD,'cpf':CPF,'phone':'75999990000','accept_privacy':True,'terms_version':'1','whatsapp_opt_in':True})
    assert r.status_code==201,r.text
    return {'api':api,'parent':parent,'account':r.json(),'campaign':campaign,'cat':cat}

def pc(o,method,path,data=None,status=200,**kw):
    r=o['parent'].request(method,'/api/v1/portal'+path,headers=CSRF,json=data,**kw)
    assert r.status_code==status,(path,r.status_code,r.text[:1800])
    return r.json() if 'application/json' in r.headers.get('content-type','') else r

def draft(o):return pc(o,'POST','/admissions',{'campaign_id':o['campaign']['id'],'class_group_id':o['cat']['group']['id'],'client_key':str(uuid.uuid4()),'student':{'name':'Aluno Online','birth_date':'2017-03-10'},'relationship':'Mãe'},201)
def submit(o,a):return pc(o,'POST',f"/admissions/{a['id']}/submit",{'version':a['version'],'accept_terms':True,'legal_responsibility':True,'terms_version':'1'})
def approve(o,a):return o['api'].post(f"/admissions/{a['id']}/approve",{'version':a['version'],'identity_confirmed':True,'reason':'Identidade e documentos conferidos pela Secretaria.'},200)
def bank(o):return o['api'].post('/integrations/asaas',{'enabled':True,'api_key':'test-only-asaas-key','webhook_token':'test-only-webhook-token-000000000000000','config':{}},200)
def charge(o,a,**kw):return o['api'].post('/bank-charges',{'admission_id':a['id'],'amount':'150.00','due_on':str(date.today()+timedelta(days=10)),'description':'Taxa de matrícula','billing_type':'BOLETO','client_key':str(uuid.uuid4()),**kw})['items'][0]

def provider_mock(monkeypatch,status='PENDING',timeout=False):
    calls=[];store={'customers':{},'payments':{}}
    def call(provider,base,path,method='GET',data=None,params=None,**kw):
        calls.append((provider,path,method,data,params))
        if provider=='connect_api':return {'key':{'id':'msg-test-only'}}
        if path in ('/customers','/payments') and method=='GET':return {'data':[x for x in store[path[1:]].values() if x.get('externalReference')==(params or {}).get('externalReference')],'hasMore':False}
        if path=='/customers' and method=='POST':
            obj={**data,'id':'cus_'+uuid.uuid4().hex[:8]};store['customers'][obj['id']]=obj;return obj
        if path=='/payments' and method=='POST':
            if timeout:raise IntegrationFailure('PROVIDER_NETWORK_ERROR',uncertain=True)
            obj={**data,'id':'pay_'+uuid.uuid4().hex[:8],'status':status,'invoiceUrl':'https://www.asaas.com/i/test-only','bankSlipUrl':'https://www.asaas.com/b/pdf/test-only'};store['payments'][obj['id']]=obj;return obj
        if path.endswith('/pixQrCode'):
            buf=io.BytesIO();Image.new('RGB',(20,20)).save(buf,'PNG');return {'payload':'PIX-PAYLOAD-TEST-ONLY','encodedImage':base64.b64encode(buf.getvalue()).decode(),'expirationDate':'2027-12-01 23:59:59'}
        id=path.split('/')[-1]
        if id in store['payments']:
            if method=='DELETE':store['payments'][id]['deleted']=True;return {'deleted':True,'id':id}
            return store['payments'][id]
        raise AssertionError((path,method))
    monkeypatch.setattr('app.integration_core.call_json',call)
    return calls,store

def run_issue(c):
    with SessionLocal() as db:id=db.scalar(select(m.IntegrationJob.id).where(m.IntegrationJob.dedupe_key=='bank-issue:'+c['id']))
    assert process_one(id)
    with SessionLocal() as db:return db.get(m.BankCharge,c['id']),db.get(m.IntegrationJob,id)

def test_complete_online_flow(online):
    o=online;a=approve(o,submit(o,draft(o)));assert a['enrollment']['status']=='draft'
    a=o['api'].post('/admissions/'+a['id']+'/finalize',{'version':a['version'],'reason':'Conferência final concluída.'},200)
    assert a['status']=='enrolled' and a['enrollment']['status']=='active'
    pub=pc(o,'GET','/admissions/'+a['id']);doc=pub['issued_documents'][0]
    pdf=pc(o,'GET',f"/admissions/{a['id']}/issued/{doc['id']}");assert pdf.content.startswith(b'%PDF')
    again=o['api'].post('/admissions/'+a['id']+'/finalize',{'version':a['version'],'reason':'Repetição idempotente.'},200);assert len(again['issued_documents'])==1

def test_portal_cookie_separated_from_admin(online):
    o=online;assert o['parent'].get('/api/v1/schools').status_code==401;assert 'password_hash' not in o['account']
    assert o['parent'].post('/api/v1/portal/logout').status_code==403
    pc(o,'POST','/logout',{});pc(o,'GET','/me',status=401)

def test_another_parent_cannot_see_admission(online):
    o=online;a=draft(o)
    pc(o,'POST','/register',{'campaign_slug':o['campaign']['slug'],'name':'Outro responsável','email':uuid.uuid4().hex+'@example.com','password':PASSWORD,'accept_privacy':True,'terms_version':'1'},201)
    pc(o,'GET','/admissions/'+a['id'],status=404);assert pc(o,'GET','/admissions')['items']==[]

def test_verified_contact_required(online):
    o=online;a=draft(o)
    with SessionLocal() as db:c=db.get(m.AdmissionCampaign,o['campaign']['id']);c.require_verified_contact=True;db.commit()
    pc(o,'POST','/admissions/'+a['id']+'/submit',{'version':a['version'],'accept_terms':True,'legal_responsibility':True,'terms_version':'1'},409)
    pc(o,'POST','/admissions/'+a['id']+'/submit',{'version':a['version'],'accept_terms':False,'legal_responsibility':True,'terms_version':'1'},422)

def test_internal_note_and_changes_cycle(online):
    o=online;a=submit(o,draft(o));o['api'].post('/admissions/'+a['id']+'/messages',{'text':'ANOTACAO_INTERNA_SIGILOSA','internal':True})
    assert all(x['text']!='ANOTACAO_INTERNA_SIGILOSA' for x in pc(o,'GET','/admissions/'+a['id'])['messages'])
    a=o['api'].post('/admissions/'+a['id']+'/actions',{'version':a['version'],'action':'request_changes','reason':'Confira o endereço.'},200)
    a=pc(o,'PATCH','/admissions/'+a['id'],{'version':a['version'],'class_group_id':a['class_group_id'],'student':{'name':'Aluno Corrigido','birth_date':'2017-03-10'}})
    assert submit(o,a)['status']=='submitted'

def test_idempotency_and_version(online):
    o=online;data={'campaign_id':o['campaign']['id'],'class_group_id':o['cat']['group']['id'],'client_key':str(uuid.uuid4()),'student':{'name':'Aluno Teste','birth_date':'2017-03-10'}}
    a=pc(o,'POST','/admissions',data,201);assert pc(o,'POST','/admissions',data,201)['id']==a['id']
    data['student']['name']='Outro';pc(o,'POST','/admissions',data,409);a=submit(o,a)
    pc(o,'PATCH','/admissions/'+a['id'],{'version':a['version']-1,'class_group_id':a['class_group_id'],'student':{'name':'Aluno','birth_date':'2017-03-10'}},409)

def test_campaign_window_and_class(online):
    o=online;data={'campaign_id':o['campaign']['id'],'class_group_id':str(uuid.uuid4()),'client_key':str(uuid.uuid4()),'student':{'name':'Aluno Teste','birth_date':'2017-03-10'}}
    pc(o,'POST','/admissions',data,422)
    with SessionLocal() as db:c=db.get(m.AdmissionCampaign,o['campaign']['id']);c.closes_on=date.today()-timedelta(days=1);db.commit()
    data['class_group_id']=o['cat']['group']['id'];pc(o,'POST','/admissions',data,409)

def test_upload_review_import(online):
    o=online;dtype=o['api'].post('/document-types',{'name':'Certidão','required':True});a=draft(o);buf=io.BytesIO();Image.new('RGB',(20,20)).save(buf,'PNG')
    r=o['parent'].post('/api/v1/portal/admissions/'+a['id']+'/attachments',headers=CSRF,data={'version':a['version'],'document_type_id':dtype['id']},files={'file':('certidao.png',buf.getvalue(),'image/png')});assert r.status_code==201,r.text
    a=pc(o,'GET','/admissions/'+a['id']);attachment=a['attachments'][0];assert 'storage_key' not in attachment;a=submit(o,a)
    o['api'].post(f"/admissions/{a['id']}/attachments/{attachment['id']}/review",{'version':attachment['version'],'status':'validated','note':'Documento conferido.'},200)
    a=approve(o,a);assert o['api'].get('/students/'+a['student_id']+'/documents')['items'][0]['status']=='validated'

def test_otp_consumed_not_exposed(online,monkeypatch):
    o=online;monkeypatch.setattr(settings(),'smtp_host','smtp.example.test');monkeypatch.setattr(settings(),'smtp_from','secretaria@example.com')
    result=pc(o,'POST','/verification/request',{'channel':'email'});assert 'code' not in result
    with SessionLocal() as db:
        job=db.scalar(select(m.IntegrationJob).where(m.IntegrationJob.school_id==o['account']['school_id']));assert job.kind=='smtp_email'
        code=re.search(r'\b\d{6}\b',unseal(job.encrypted_payload)['text'])[0];assert code not in job.encrypted_payload
    assert pc(o,'POST','/verification/confirm',{'code':code})['email_verified'] is True
    pc(o,'POST','/verification/confirm',{'code':code},400)

def test_secret_encryption_bank_queue(online):
    o=online;conn=bank(o);assert 'encrypted_secrets' not in conn and 'api_key' not in conn;a=submit(o,draft(o));c=charge(o,a);assert c['status']=='queued' and c['remote_payment_id'] is None
    with SessionLocal() as db:r=db.get(m.IntegrationConnection,conn['id']);assert 'test-only-asaas-key' not in r.encrypted_secrets;assert unseal(r.encrypted_secrets)['api_key']=='test-only-asaas-key'

def test_bank_issue_pix_reconcile(online,monkeypatch):
    o=online;bank(o);a=submit(o,draft(o));c=charge(o,a,billing_type='PIX');calls,store=provider_mock(monkeypatch);row,job=run_issue(c)
    assert row.status=='pending' and job.status=='completed' and row.pix_copy_paste=='PIX-PAYLOAD-TEST-ONLY'
    assert len([x for x in calls if x[1]=='/payments' and x[2]=='POST'])==1
    store['payments'][row.remote_payment_id]['status']='RECEIVED';j=o['api'].post('/bank-charges/'+c['id']+'/sync',{'reason':'Conciliação solicitada.'},200);process_one(j['job_id'])
    items=pc(o,'GET','/admissions/'+a['id']+'/charges');assert items[0]['status']=='received' and 'payer_snapshot' not in items[0]

def test_timeout_not_reposted(online,monkeypatch):
    o=online;bank(o);a=submit(o,draft(o));c=charge(o,a);calls,_=provider_mock(monkeypatch,timeout=True);row,job=run_issue(c)
    assert row.status=='uncertain' and job.status=='uncertain';assert not process_one(job.id)
    o['api'].post('/integration-jobs/'+job.id+'/retry',{'reason':'Reenvio cego bloqueado.'},409)
    assert len([x for x in calls if x[1]=='/payments' and x[2]=='POST'])==1

def test_payment_gate_also_old_enrollment_route(online,monkeypatch):
    o=online;bank(o);a=submit(o,draft(o));c=charge(o,a,required_for_enrollment=True);a=approve(o,a)
    o['api'].post('/admissions/'+a['id']+'/finalize',{'version':a['version'],'reason':'Sem pagamento ainda.'},409)
    e=o['api'].get('/enrollments/'+a['enrollment_id']);o['api'].move(e,'activate',409)
    _,store=provider_mock(monkeypatch,'CONFIRMED');row,_=run_issue(c);assert row.status=='confirmed';o['api'].move(e,'activate',409)
    store['payments'][row.remote_payment_id]['status']='RECEIVED';j=o['api'].post('/bank-charges/'+c['id']+'/sync',{'reason':'Conferir crédito efetivo.'},200);process_one(j['job_id'])
    assert o['api'].post('/admissions/'+a['id']+'/finalize',{'version':a['version'],'reason':'Recebimento e documentos conferidos.'},200)['status']=='enrolled'

def test_webhook_auth_dedup_not_trust_body(online,monkeypatch):
    o=online;conn=bank(o);a=submit(o,draft(o));c=charge(o,a);provider_mock(monkeypatch);row,_=run_issue(c)
    path='/api/v1/hooks/asaas/'+conn['id'];body={'id':'evt-test-1','event':'PAYMENT_RECEIVED','payment':{'id':row.remote_payment_id,'value':0,'status':'RECEIVED'}}
    assert o['parent'].post(path,json=body).status_code==401
    h={'asaas-access-token':'test-only-webhook-token-000000000000000'};r=o['parent'].post(path,headers=h,json=body);assert r.status_code==200,r.text
    assert o['parent'].post(path,headers=h,json=body).json()['duplicate'] is True
    with SessionLocal() as db:job_id=db.scalar(select(m.IntegrationJob.id).where(m.IntegrationJob.school_id==conn['school_id'],m.IntegrationJob.kind=='bank_sync'))
    process_one(job_id)
    with SessionLocal() as db:assert db.get(m.BankCharge,c['id']).status=='pending'

def test_installments_idempotency(online):
    o=online;bank(o);a=submit(o,draft(o));data={'admission_id':a['id'],'amount':'300.00','due_on':'2027-01-31','description':'Mensalidade','billing_type':'BOLETO','client_key':str(uuid.uuid4()),'installment_count':3}
    rows=o['api'].post('/bank-charges',data)['items'];again=o['api'].post('/bank-charges',data)['items'];assert [x['due_on'] for x in rows]==['2027-01-31','2027-02-28','2027-03-31'];assert [x['id'] for x in rows]==[x['id'] for x in again]
    data['amount']='301.00';o['api'].post('/bank-charges',data,409)

def connect(o, monkeypatch, label=''):
    class FakeConnect:
        calls=[]

        def __init__(self):
            pass

        def create_instance(self, name):
            self.calls.append(('create_instance', name))
            return {'instance': {'instanceName': name, 'instanceId': 'remote-'+name, 'integration': 'WHATSAPP-BAILEYS', 'state': 'created'}, 'qrcode': {'base64': 'data:image/png;base64,TEST', 'code': 'qr-code'}}

        def connection_state(self, name):
            self.calls.append(('connection_state', name))
            return {'instance': {'instanceName': name, 'state': 'open'}}

        def connect(self, name, number=''):
            self.calls.append(('connect', name, number))
            return {'qrcode': {'pairingCode': '12345678'} if number else {'base64': 'data:image/png;base64,TEST', 'code': 'qr-code'}}

        def logout(self, name):
            self.calls.append(('logout', name))
            return {'status': 'ok'}

        def delete(self, name):
            self.calls.append(('delete', name))
            return {'status': 'ok'}

        def health(self):
            self.calls.append(('health',))
            return {'status': 'ok'}

        def send_text(self, name, number, text, request_key=''):
            self.calls.append(('send_text', name, number, text, request_key))
            return 'msg-test-only'

    monkeypatch.setattr('app.connect.ConnectApiClient', FakeConnect)
    monkeypatch.setattr('app.integration_worker.ConnectApiClient', FakeConnect)
    with SessionLocal() as db:
        school = db.get(m.School, o['api'].school['id'])
        company = db.get(m.Company, school.company_id)
        company.document = '11222333000181'
        db.commit()
    result = o['api'].post('/connect/instances', {'label': label, 'primary': not bool(label)}, 201)
    return result['instance'], FakeConnect

def test_connect_optin_and_payload(online, monkeypatch):
    o=online;instance,fake=connect(o,monkeypatch);a=submit(o,draft(o))
    data={'admission_id':a['id'],'text':'Uma atualização está disponível no portal.','client_key':str(uuid.uuid4())}
    o['api'].post('/connect/messages',data,409)
    with SessionLocal() as db:
        acc=db.get(m.PortalAccount,o['account']['id']);acc.phone_verified=True;db.commit()
    r=o['api'].post('/connect/messages',data,202)
    from app.integration_worker import process_connect_one
    assert process_connect_one()
    sent=[x for x in fake.calls if x[0]=='send_text']
    assert sent[0][2]=='5575999990000' and sent[0][3]==data['text']
    with SessionLocal() as db:
        job=db.get(m.ConnectMessageJob,r['job_id'])
        assert job.remote_id=='msg-test-only' and job.status=='completed' and job.instance_id==instance['id']

def test_connect_instance_name_and_additional_instance(online, monkeypatch):
    o=online;first,_=connect(o,monkeypatch);second,_=connect(o,monkeypatch,'Atendimento 2')
    assert first['name'].startswith('PG360-MANTENEDORA-DE-TESTE-11222333000181')
    assert second['name'].endswith('-ATENDIMENTO-2')
    assert first['primary'] is True and second['primary'] is False
    overview=o['api'].get('/connect')
    assert overview['config']['configured'] is True and overview['config']['api_key_configured'] is True
    assert {item['id'] for item in overview['items']}=={first['id'],second['id']}

def test_connect_requires_company_cnpj(online):
    o=online
    with SessionLocal() as db:
        school=db.get(m.School,o['api'].school['id']);company=db.get(m.Company,school.company_id);company.document='';db.commit()
    o['api'].post('/connect/instances',{},422)

def test_connect_is_not_mixed_with_finance(online):
    online['api'].post('/integrations/connect_api',{},404)

def test_connect_timeout_not_automatically_retried(online,monkeypatch):
    o=online;_,fake=connect(o,monkeypatch);a=submit(o,draft(o))
    with SessionLocal() as db:
        acc=db.get(m.PortalAccount,o['account']['id']);acc.phone_verified=True;db.commit()
    def ambiguous(self,*args,**kwargs):
        raise IntegrationFailure('PROVIDER_NETWORK_ERROR',uncertain=True)
    monkeypatch.setattr(fake,'send_text',ambiguous)
    r=o['api'].post('/connect/messages',{'admission_id':a['id'],'text':'Atualização de teste','client_key':str(uuid.uuid4())},202)
    from app.integration_worker import process_connect_one
    assert process_connect_one()
    with SessionLocal() as db:assert db.get(m.ConnectMessageJob,r['job_id']).status=='uncertain'
    assert not process_connect_one()

def test_manual_message_idempotency_rejects_different_content(online,monkeypatch):
    o=online;connect(o,monkeypatch);a=submit(o,draft(o))
    with SessionLocal() as db:db.get(m.PortalAccount,o['account']['id']).phone_verified=True;db.commit()
    data={'admission_id':a['id'],'text':'Aviso original','client_key':str(uuid.uuid4())}
    first=o['api'].post('/connect/messages',data,202)
    assert o['api'].post('/connect/messages',data,202)['job_id']==first['job_id']
    o['api'].post('/connect/messages',{**data,'text':'Aviso diferente'},409)

def test_no_automatic_cpf_link(online):
    o=online;p=o['api'].post('/persons',{'name':'Responsável existente','cpf':CPF,'is_guardian':True});a=submit(o,draft(o));data={'version':a['version'],'reason':'Identidade conferida explicitamente.','identity_confirmed':True}
    o['api'].post('/admissions/'+a['id']+'/approve',data,409);data['existing_guardian_id']=p['id'];assert o['api'].post('/admissions/'+a['id']+'/approve',data,200)['status']=='approved'

def test_profile_change_revokes_phone_verification(online):
    o=online
    with SessionLocal() as db:
        account=db.get(m.PortalAccount,o['account']['id']);account.phone_verified=True;db.commit()
    current=pc(o,'GET','/me')
    changed=pc(o,'PATCH','/me',{'version':current['version'],'name':current['name'],'cpf':CPF,'phone':'75988881111','address':'Endereço atualizado','whatsapp_opt_in':False})
    assert changed['phone']=='5575988881111' and not changed['phone_verified'] and not changed['whatsapp_opt_in']

def test_password_reset_revokes_existing_session(online,monkeypatch):
    o=online;monkeypatch.setattr(settings(),'smtp_host','smtp.example.test');monkeypatch.setattr(settings(),'smtp_from','secretaria@example.com')
    payload={'campaign_slug':o['campaign']['slug'],'email':o['account']['email']}
    pc(o,'POST','/password/request',payload)
    with SessionLocal() as db:
        job=db.scalar(select(m.IntegrationJob).where(m.IntegrationJob.school_id==o['account']['school_id'],m.IntegrationJob.kind=='smtp_email'))
        code=re.search(r'\b\d{6}\b',unseal(job.encrypted_payload)['text'])[0]
    pc(o,'POST','/password/confirm',{**payload,'code':code,'password':'New-Test-Only-Password-2026!'})
    pc(o,'GET','/me',status=401)
    pc(o,'POST','/login',{**payload,'password':PASSWORD},401)
    assert pc(o,'POST','/login',{**payload,'password':'New-Test-Only-Password-2026!'})['id']==o['account']['id']

def test_wrong_otp_attempts_persist(online,monkeypatch):
    o=online;monkeypatch.setattr(settings(),'smtp_host','smtp.example.test');monkeypatch.setattr(settings(),'smtp_from','secretaria@example.com')
    pc(o,'POST','/verification/request',{'channel':'email'})
    with SessionLocal() as db:
        job=db.scalar(select(m.IntegrationJob).where(m.IntegrationJob.school_id==o['account']['school_id']));code=re.search(r'\b\d{6}\b',unseal(job.encrypted_payload)['text'])[0]
    wrong='000000' if code!='000000' else '999999'
    for _ in range(5):pc(o,'POST','/verification/confirm',{'code':wrong},400)
    pc(o,'POST','/verification/confirm',{'code':code},400)
    with SessionLocal() as db:assert db.scalar(select(m.PortalChallenge).where(m.PortalChallenge.account_id==o['account']['id'])).attempts==5

def test_bank_amount_mismatch_does_not_mark_paid(online,monkeypatch):
    o=online;bank(o);a=submit(o,draft(o));c=charge(o,a);_,store=provider_mock(monkeypatch);row,_=run_issue(c)
    store['payments'][row.remote_payment_id]['status']='RECEIVED';store['payments'][row.remote_payment_id]['value']=1
    j=o['api'].post('/bank-charges/'+c['id']+'/sync',{'reason':'Consulta de valor divergente.'},200);process_one(j['job_id'])
    with SessionLocal() as db:
        assert db.get(m.BankCharge,c['id']).status!='received'
        assert db.get(m.IntegrationJob,j['job_id']).status=='failed'

def test_periodic_reconciliation_is_idempotent(online,monkeypatch):
    from app.integration_worker import schedule_reconciliations
    from app.db import now
    o=online;bank(o);a=submit(o,draft(o));c=charge(o,a);provider_mock(monkeypatch);run_issue(c)
    with SessionLocal() as db:db.get(m.BankCharge,c['id']).last_synced_at=now()-timedelta(days=2);db.commit()
    schedule_reconciliations();schedule_reconciliations()
    with SessionLocal() as db:
        tasks=list(db.scalars(select(m.IntegrationJob).where(m.IntegrationJob.school_id==o['account']['school_id'],m.IntegrationJob.dedupe_key.like('bank-periodic:'+c['id']+':%'))))
        assert len(tasks)==1 and tasks[0].kind=='bank_sync'

def test_lease_expiration_never_reissues_post(online):
    from app.integration_worker import recover_expired
    from app.db import now
    o=online;bank(o);c=charge(o,submit(o,draft(o)))
    with SessionLocal() as db:
        job=db.scalar(select(m.IntegrationJob).where(m.IntegrationJob.dedupe_key=='bank-issue:'+c['id']));job.status='processing';job.lease_until=now()-timedelta(minutes=1);db.commit();id=job.id
        recover_expired(db)
        assert db.get(m.IntegrationJob,id).status=='uncertain' and db.get(m.BankCharge,c['id']).status=='uncertain'

def test_actual_http_transport_asaas_headers(monkeypatch):
    import httpx
    from app.integration_core import call_json
    original=httpx.Client;seen=[]
    def handler(request):
        seen.append(request)
        return httpx.Response(200,json={'data':[],'hasMore':False})
    def factory(**kw):return original(transport=httpx.MockTransport(handler),**kw)
    monkeypatch.setattr('app.integration_core.httpx.Client',factory)
    assert call_json('asaas','https://api-sandbox.asaas.com/v3','/payments',api_key='test-only-http-key',params={'externalReference':'ref-local'})['data']==[]
    assert str(seen[0].url)=='https://api-sandbox.asaas.com/v3/payments?externalReference=ref-local'
    assert seen[0].headers['access_token']=='test-only-http-key'
    assert 'PIGE360' in seen[0].headers['User-Agent']

@pytest.mark.parametrize('status',[301,401,429,500])
def test_http_transport_error_safety(monkeypatch,status):
    import httpx
    from app.integration_core import call_json
    original=httpx.Client
    monkeypatch.setattr('app.integration_core.httpx.Client',lambda **kw:original(transport=httpx.MockTransport(lambda request:httpx.Response(status,json={'errors':['provider-detail-never-logged']})),**kw))
    with pytest.raises(IntegrationFailure) as error:call_json('asaas','https://api-sandbox.asaas.com/v3','/payments',method='POST',api_key='test-only-key',data={})
    assert str(error.value)==f'PROVIDER_HTTP_{status}'
    assert error.value.uncertain is (status>=500)


