"""Somente cadastros sintéticos e provedores simulados; OCR local real em um caso."""
from datetime import timedelta
import io
import json
from pathlib import Path
import shutil
import uuid
import pytest
from PIL import Image, ImageDraw, ImageFont
from sqlalchemy import delete, select, update
from fastapi import HTTPException
from app import models as m
from app.assisted_models import OcrJob, LookupCache, LookupProvider, IntakeSettings, AssistedQuota
from app.db import SessionLocal, now
from app import lookups, ocr, ocr_worker, ocr_engine
from app.config import settings
from conftest import PASSWORD

CNPJ='11222333000181'
ALPHA='12ABC34501DE35'

@pytest.fixture(autouse=True)
def clean_assistance(client):
    with SessionLocal.begin() as db:
        # Exclusivamente banco/arquivos descartáveis criados por conftest.
        for row in db.scalars(select(OcrJob)):
            from app.storage import delete_file
            delete_file(row)
        for table in (OcrJob,LookupCache,AssistedQuota):db.execute(delete(table))
        db.execute(update(LookupProvider).values(available_at=now()-timedelta(seconds=10)))
        db.execute(update(IntakeSettings).values(ocr_enabled=True,lookups_enabled=True))
    yield


def company(cnpj=CNPJ):
    return {'cnpj':cnpj,'razao_social':'Empresa de Teste Ltda','nome_fantasia':'Papelaria Teste',
        'logradouro':'Rua Teste','numero':'123','complemento':'Sala 2','bairro':'Centro','municipio':'Salvador',
        'uf':'BA','cep':'40020000','ddd_telefone_1':'7133332222','email':'teste@example.com',
        'descricao_situacao_cadastral':'ATIVA','data_inicio_atividade':'2020-01-02',
        'natureza_juridica':'Sociedade Limitada','cnae_fiscal_descricao':'Comércio de papelaria',
        'qsa':[{'nome_socio':'Não expor QSA'}]}


def cep(value='40020000'):
    return {'cep':value,'logradouro':'Rua Teste','bairro':'Centro','localidade':'Salvador','uf':'BA','ibge':'2927408'}


def call(api,kind,value,status=200):return api.post('/lookups/'+kind,{'value':value},expect=status)


def image_bytes(name='PESSOA SINTETICA TESTE'):
    image=Image.new('RGB',(1400,800),'white');draw=ImageDraw.Draw(image)
    try:font=ImageFont.truetype('DejaVuSans.ttf',40)
    except OSError:font=ImageFont.load_default(size=40)
    for i,line in enumerate(['DOCUMENTO FICTICIO PARA TESTE','NOME: '+name,'CPF: 529.982.247-25','DATA DE NASCIMENTO: 15/05/2000','CEP: 40020-000']):
        draw.text((70,70+i*110),line,font=font,fill='black')
    data=io.BytesIO();image.save(data,format='PNG');return data.getvalue()


def upload(api,data=None,name='teste.png',purpose='identity',status=202):
    r=api.client.post(api.base+'/ocr/jobs',headers=api.headers,data={'purpose':purpose},files={'file':(name,data or image_bytes(),'application/octet-stream')})
    assert r.status_code==status,r.text
    return r.json()


def test_cnpj_normalizes_and_caches_without_saving_person(api,monkeypatch):
    calls=[]
    monkeypatch.setattr(lookups,'fetch_public',lambda url:(calls.append(url) or (200,{},company())))
    first=call(api,'cnpj','11.222.333/0001-81');second=call(api,'cnpj',CNPJ)
    assert first['data']['name']=='Empresa de Teste Ltda' and not first['cached'] and second['cached']
    assert first['data']['state']=='BA' and first['data']['registration_status']=='ATIVA'
    assert len(calls)==1 and 'qsa' not in first['data'] and 'Não expor' not in json.dumps(first)
    assert api.get('/persons?q=Empresa de Teste')['total']==0


def test_cep_cache_does_not_invent_number_or_apartment(api,monkeypatch):
    monkeypatch.setattr(lookups,'fetch_public',lambda url:(200,{},dict(cep(),complemento='referência postal')))
    result=call(api,'cep','40020-000');assert result['data']['city']=='Salvador'
    assert 'address_number' not in result['data'] and 'address_complement' not in result['data']
    monkeypatch.setattr(lookups,'fetch_public',lambda url:pytest.fail('Cache não deve consultar novamente'))
    assert call(api,'cep','40020000')['cached']


@pytest.mark.parametrize('kind,value',[('cnpj','00000000000000'),('cnpj','123'),('cnpj','12<script>'),('cep','0000'),('cep','https://localhost')])
def test_invalid_identifiers_never_leave_server(api,monkeypatch,kind,value):
    monkeypatch.setattr(lookups,'fetch_public',lambda url:pytest.fail('Consulta inválida não pode sair'))
    call(api,kind,value,422)


def test_sequential_fallback_and_retry_after_respected(api,monkeypatch):
    calls=[]
    def fetch(url):
        calls.append(url)
        if 'brasilapi' in url:return 429,{'Retry-After':'120'},{}
        return 200,{}, {'razao_social':'Empresa Fallback','estabelecimento':{'cnpj':CNPJ,'cidade':{'nome':'Salvador'},'estado':{'sigla':'BA'}}}
    monkeypatch.setattr(lookups,'fetch_public',fetch)
    result=call(api,'cnpj',CNPJ);assert result['provider']=='cnpjws' and len(calls)==2
    with SessionLocal() as db:assert __import__('app.security',fromlist=['utc']).utc(db.get(LookupProvider,'brasilapi_cnpj').available_at)>now()+timedelta(seconds=115)


def test_alpha_is_not_stripped_and_numeric_only_providers_not_called(api,monkeypatch):
    urls=[];monkeypatch.setattr(lookups,'fetch_public',lambda url:(urls.append(url) or (200,{},company(ALPHA))))
    result=call(api,'cnpj',ALPHA);assert result['data']['cnpj']==ALPHA and urls==['https://brasilapi.com.br/api/cnpj/v1/'+ALPHA]


def test_receitaws_adapter_preserves_supported_fields():
    r=lookups.normalized('receitaws',CNPJ,{'status':'OK','cnpj':'11.222.333/0001-81','nome':'Empresa Receita Teste','fantasia':'Fantasia','municipio':'Salvador','uf':'BA','abertura':'01/01/2020','atividade_principal':[{'text':'Atividade teste'}]})
    assert r['main_activity']=='Atividade teste' and r['name']=='Empresa Receita Teste'


def test_service_failure_uses_only_recent_stale_cache_with_warning(api,monkeypatch):
    with SessionLocal.begin() as db:db.add(LookupCache(key='cnpj:'+CNPJ,data={'cnpj':CNPJ,'name':'Cache antigo'},provider='brasilapi_cnpj',fetched_at=now()-timedelta(days=2),expires_at=now()-timedelta(hours=1)))
    monkeypatch.setattr(lookups,'fetch_public',lambda url:(503,{},{}))
    result=call(api,'cnpj',CNPJ);assert result['stale'] and 'vencido' in result['warning']


def test_singleflight_rejects_duplicate_inflight_request(api,monkeypatch):
    with SessionLocal.begin() as db:db.add(LookupCache(key='cep:40020000',data={},provider='',lease_token='someone',lease_until=now()+timedelta(seconds=20)))
    monkeypatch.setattr(lookups,'fetch_public',lambda url:pytest.fail('Lease ativo não pode repetir'))
    call(api,'cep','40020000',409)


def test_negative_cache_short_and_manual_still_possible(api,monkeypatch):
    urls=[];monkeypatch.setattr(lookups,'fetch_public',lambda url:(urls.append(url) or (404,{},{})))
    call(api,'cep','40020000',404);call(api,'cep','40020000',404);assert len(urls)==2
    assert api.post('/persons',{'name':'Preenchimento Manual'})['name']=='Preenchimento Manual'


def test_mismatching_identifier_response_never_applied(api,monkeypatch):
    monkeypatch.setattr(lookups,'fetch_public',lambda url:(200,{},company(ALPHA)))
    call(api,'cnpj',CNPJ,503)


def test_company_enrichment_roundtrip_and_legacy_patch_preserves_fields(client,admin):
    row=client.get('/api/v1/companies',headers=admin).json()[0]
    data={'name':row['name'],'document':CNPJ,'trade_name':'Nome fantasia teste','postal_code':'40020000','street':'Rua cadastral','city':'Salvador','state':'BA','registration_status':'ATIVA','main_activity':'Educação'}
    r=client.patch('/api/v1/companies/'+row['id'],headers=admin,json={'version':row['version'],'data':data});assert r.status_code==200,r.text
    new=r.json();assert new['postal_code']=='40020000'
    r=client.patch('/api/v1/companies/'+row['id'],headers=admin,json={'version':new['version'],'data':{'name':row['name'],'document':CNPJ}})
    assert r.json()['main_activity']=='Educação' and r.json()['street']=='Rua cadastral'


def test_person_pj_extra_fields_persist(api):
    data=api.post('/persons',{'name':'Fornecedor','entity_kind':'organization','cnpj':CNPJ,'registration_status':'ATIVA','opened_on':'2020-01-01','legal_nature':'Ltda','main_activity':'Papelaria'})
    assert api.get('/persons/'+data['id']+'/dossier')['person']['main_activity']=='Papelaria'


def test_ocr_dedup_private_owner_cancel_and_no_autosave(api,client,admin):
    job=upload(api);same=upload(api);assert same['id']==job['id']
    assert api.get('/persons?q=PESSOA SINTETICA')['total']==0
    with SessionLocal() as db:
        row=db.get(OcrJob,job['id']);assert row.status=='queued' and row.sha256 and row.encrypted_result==''
        from app.storage import read_bytes
        assert read_bytes(row)==image_bytes()
    r=client.get(api.base+'/ocr/jobs/'+job['id']);assert r.status_code==401
    api.call('DELETE','/ocr/jobs/'+job['id']);assert api.call('GET','/ocr/jobs/'+job['id'],expect=410)
    with SessionLocal() as db:ocr_worker.cleanup(db);assert db.get(OcrJob,job['id']) is None


def test_results_cannot_be_read_by_another_user_even_same_school(api,client,admin):
    job=upload(api);email='reader-'+uuid.uuid4().hex+'@example.com'
    r=client.post('/api/v1/users',headers=admin,json={'name':'Secretaria teste','email':email,'password':PASSWORD,'role':'secretary','school_ids':[api.school['id']]});assert r.status_code==201,r.text
    token=client.post('/api/v1/auth/login',json={'email':email,'password':PASSWORD}).json()['access_token']
    r=client.get(api.base+'/ocr/jobs/'+job['id'],headers={'Authorization':'Bearer '+token});assert r.status_code==404,r.text


@pytest.mark.parametrize('raw,name',[ (b'not a pdf','x.pdf'),(b'<svg></svg>','x.svg'),(b'fake png','x.png'),(b'anything','x.heic')])
def test_invalid_upload_never_queued(api,raw,name):upload(api,raw,name,status=422)


def test_small_or_active_pdf_rejected_by_engine(tmp_path):
    p=tmp_path/'tiny.png';Image.new('RGB',(100,100)).save(p)
    with pytest.raises(ValueError,match='image_too_small'):ocr_engine.extract(p,'image/png','identity',tmp_path)


def test_parser_ambiguous_cpf_and_unlabelled_data_are_not_guessed():
    text='NOME: ANA TESTE\nCPF: 529.982.247-25\nOUTRO CPF: 111.444.777-35\nDATA DE NASCIMENTO: 31/02/2000'
    rows=ocr_engine.suggestions(text,'identity',95);assert not any(r['field'] in ('cpf','birth_date') for r in rows)
    assert not ocr_engine.suggestions('Ana Teste nasceu ontem','identity',95)


def test_parser_labels_birth_and_company_and_review_required():
    text='NOME: JOAO TESTE\nCPF: 529.982.247-25\nDATA DE NASCIMENTO: 15/05/2000\nMAE: MARIA TESTE'
    rows=ocr_engine.suggestions(text,'identity',88);v={r['field']:r['value'] for r in rows}
    assert v['birth_date']=='2000-05-15' and v['mother_name']=='MARIA TESTE' and all(r['requires_review'] for r in rows)
    rows=ocr_engine.suggestions('RAZAO SOCIAL: EMPRESA TESTE\nCNPJ: '+ALPHA,'company',99)
    assert any(r['value']==ALPHA for r in rows) and not any(r['field']=='cpf' for r in rows)


def test_worker_lease_reclaim_fences_old_attempt_and_retry_limit(api):
    job=upload(api)
    with SessionLocal() as db:
        first=ocr_worker.claim(db);assert first and first[0]==job['id']
        assert ocr_worker.claim(db) is None
        db.execute(update(OcrJob).where(OcrJob.id==job['id']).values(lease_until=now()-timedelta(seconds=1)));db.commit()
        second=ocr_worker.claim(db);assert second and first[1]!=second[1]
        assert not db.execute(update(OcrJob).where(OcrJob.id==job['id'],OcrJob.lease_token==first[1]).values(encrypted_result='stale')).rowcount
        db.execute(update(OcrJob).where(OcrJob.id==job['id']).values(attempts=3,lease_until=now()-timedelta(seconds=1)));db.commit()
        assert ocr_worker.claim(db) is None
        assert db.get(OcrJob,job['id'],populate_existing=True).status=='failed'


def test_real_portuguese_ocr_worker_encrypts_and_keeps_only_proposals(api):
    assert shutil.which('tesseract'), 'Instale tesseract-ocr e tesseract-ocr-por para esta validação'
    job=upload(api)
    assert ocr_worker.process_one()
    reply=api.get('/ocr/jobs/'+job['id']);assert reply['status']=='succeeded',reply
    result=reply['result'];assert result['engine'].startswith('tesseract')
    assert result['requires_review'] and not result['document_authenticity_verified']
    fields={r['field']:r['value'] for r in result['suggestions']}
    assert fields['cpf']=='52998224725' and fields['birth_date']=='2000-05-15',result['text']
    assert result['pages'][0]['tokens'] and len(result['pages'][0]['tokens'][0]['box'])==4
    with SessionLocal() as db:
        row=db.get(OcrJob,job['id']);assert '52998224725' not in row.encrypted_result
        assert json.loads(ocr.cipher().decrypt(row.encrypted_result.encode()))['requires_review']
    assert api.get('/persons?q=PESSOA SINTETICA')['total']==0


def test_pdf_existing_text_does_not_call_tesseract(tmp_path,monkeypatch):
    from reportlab.pdfgen import canvas
    p=tmp_path/'test.pdf';c=canvas.Canvas(str(p));c.drawString(30,800,'DOCUMENTO SINTETICO PARA TESTE DE EXTRACAO DIGITAL');c.drawString(30,760,'NOME: PESSOA EXEMPLO');c.drawString(30,720,'CPF: 529.982.247-25');c.save()
    monkeypatch.setattr(ocr_engine,'command',lambda *a:pytest.fail('PDF com texto não precisa de OCR'))
    result=ocr_engine.extract(p,'application/pdf','identity',tmp_path)
    assert result['pages'][0]['source']=='pdf_text' and result['confidence'] is None


def test_settings_disable_processing_and_lookup_without_disabling_manual(api,client,admin,monkeypatch):
    r=client.get('/api/v1/institution/intake',headers=admin);cfg=r.json()
    r=client.put('/api/v1/institution/intake',headers=admin,json={'version':cfg['version'],'ocr_enabled':False,'lookups_enabled':False});assert r.status_code==200,r.text
    upload(api,status=409)
    monkeypatch.setattr(lookups,'fetch_public',lambda url:pytest.fail('Disabled'))
    call(api,'cep','40020000',409)
    assert api.post('/persons',{'name':'Manual disponível'})['id']


def test_setup_lookup_closed_after_installation(client,monkeypatch):
    monkeypatch.setattr(lookups,'fetch_public',lambda url:pytest.fail('Setup fechado'))
    assert client.post('/api/v1/setup/lookups/cnpj',json={'value':CNPJ}).status_code==404

# Reutiliza somente fixtures de processo escolar com dados sintéticos.
from test_online import online, pc, draft, submit as submit_admission, approve


def test_portal_identity_is_reviewed_snapshot_not_automatic_official_change(online):
    o=online;a=o['account']
    data=pc(o,'PATCH','/me',{'version':a['version'],'name':a['name'],'cpf':a['cpf'],'phone':a['phone'],
        'address':'Rua Teste, 123','birth_date':'1990-01-10','rg':'12345678','postal_code':'40020000','street':'Rua Teste','city':'Salvador','state':'BA'})
    assert data['rg']=='12345678' and data['birth_date']=='1990-01-10'
    assert o['api'].get('/persons?q=Responsável Teste')['total']==0
    a=draft(o);a=submit_admission(o,a);assert a['guardian_snapshot']['rg']=='12345678'
    a=approve(o,a)
    official=o['api'].get('/persons?q=Responsável Teste')['items'][0]
    assert official['rg']=='12345678' and official['birth_date']=='1990-01-10'
    later=pc(o,'PATCH','/me',{'version':data['version'],'name':data['name'],'cpf':data['cpf'],'phone':data['phone'],'address':'Outro endereço'})
    assert later['rg']=='12345678' # Cliente antigo não remove dados complementares.
    assert o['api'].get('/persons/'+official['id']+'/dossier')['person']['address']=='Rua Teste, 123'


def test_portal_ocr_is_owned_and_source_reuses_actual_attachment(online):
    o=online;a=draft(o);dt=o['api'].post('/document-types',{'name':'Identidade do responsável'})
    r=o['parent'].post('/api/v1/portal/admissions/'+a['id']+'/attachments',headers={'X-CSRF-Protection':'1'},
        data={'version':a['version'],'document_type_id':dt['id']},files={'file':('identidade.png',image_bytes(),'image/png')})
    assert r.status_code==201,r.text
    a=pc(o,'GET','/admissions/'+a['id']);att=a['attachments'][0]
    job=pc(o,'POST',f"/admissions/{a['id']}/attachments/{att['id']}/ocr",{'purpose':'identity'},202)
    assert pc(o,'GET','/ocr/jobs/'+job['id'])['status']=='queued'
    assert o['api'].call('GET','/ocr/jobs/'+job['id'],expect=404)
    assert o['parent'].post('/api/v1/portal/lookups/cnpj',json={'value':CNPJ},headers={'X-CSRF-Protection':'1'}).status_code in (404,405)
    # Outro pai da mesma escola não lê uma tarefa/documento deste responsável.
    pc(o,'POST','/register',{'campaign_slug':o['campaign']['slug'],'name':'Outro responsável','email':uuid.uuid4().hex+'@example.com','password':PASSWORD,'accept_privacy':True,'terms_version':'1'},201)
    pc(o,'GET','/ocr/jobs/'+job['id'],status=404)
    pc(o,'POST',f"/admissions/{a['id']}/attachments/{att['id']}/ocr",{'purpose':'identity'},404)


def test_portal_cannot_change_permissions_through_identity_details(online):
    o=online;a=o['account']
    pc(o,'PATCH','/me',{'version':a['version'],'name':a['name'],'role':'admin'},422)
    pc(o,'PATCH','/me',{'version':a['version'],'name':a['name'],'birth_date':'2100-01-01'},422)


def test_ocr_per_owner_queue_limit_and_cancellation_releases_slot(api):
    jobs=[upload(api,purpose=p) for p in ['identity','birth','generic']]
    upload(api,purpose='address',status=429)
    api.call('DELETE','/ocr/jobs/'+jobs[0]['id'])
    assert upload(api,purpose='address')['status']=='queued'
