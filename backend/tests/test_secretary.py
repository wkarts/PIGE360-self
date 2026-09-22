import hashlib
import io
import os
import uuid
import pytest
from pypdf import PdfReader
from sqlalchemy import text
from conftest import API,PASSWORD


def test_setup_requires_key_and_cannot_repeat(client):
    data={'admin_name':'Test','admin_email':'again@example.com','admin_password':PASSWORD,'company_name':'Test','school_name':'Test','academic_year':2026}
    assert client.post('/api/v1/setup',json=data).status_code==403
    assert client.post('/api/v1/setup',json=data,headers={'X-Setup-Token':os.environ['SETUP_TOKEN']}).status_code==409

def test_health_and_security_headers(client):
    assert client.get('/health/ready').json()['status']=='ready'
    r=client.get('/');assert r.status_code==200
    assert "script-src 'self'" in r.headers['content-security-policy']
    assert 'unsafe-eval' not in r.headers['content-security-policy']
    assert client.get('/api/v1/not-present').status_code==404
    assert client.get('/health/live',headers={'Host':'evil.example.com'}).status_code==400

def test_auth_refresh_logout_and_replay(client,admin):
    old=client.cookies.get('pige_refresh')
    assert client.post('/api/v1/auth/refresh').status_code==403
    r=client.post('/api/v1/auth/refresh',headers={'X-CSRF-Protection':'1'});assert r.status_code==200
    assert client.cookies.get('pige_refresh')!=old
    token=r.json()['access_token']
    replay=client.post('/api/v1/auth/refresh',headers={'X-CSRF-Protection':'1','Cookie':'pige_refresh='+old})
    assert replay.status_code==401
    assert client.get('/api/v1/auth/me',headers={'Authorization':'Bearer '+token}).status_code==401

def test_origin_and_anonymous_access(api):
    r=api.client.get(api.base+'/students');assert r.status_code==401
    r=api.client.post(api.base+'/persons',headers={**api.headers,'Origin':'https://evil.example.com'},json={'name':'Invasor'});assert r.status_code==403

def test_cpf_validation_and_optional_unique_cpf(api):
    api.post('/persons',{'name':'CPF errado','cpf':'11111111111'},422)
    p=api.post('/persons',{'name':'Pessoa 1','cpf':'529.982.247-25'})
    assert p['cpf']=='52998224725'
    api.post('/persons',{'name':'Pessoa 2','cpf':'52998224725'},409)
    api.post('/persons',{'name':'Sem CPF 1'});api.post('/persons',{'name':'Sem CPF 2'})

def test_student_existing_person_and_date_validation(api):
    person=api.post('/persons',{'name':'Pessoa existente','birth_date':'2017-06-10'})
    student=api.post('/students',{'person_id':person['id']})
    assert student['person_id']==person['id']
    api.post('/students',{'person_id':person['id']},409)
    api.patch('/persons/'+person['id'],{'version':person['version'],'data':{'name':person['name'],'birth_date':None}},422)
    api.post('/students',{'person':{'name':'Sem Nascimento'}},422)

def test_guardian_search_and_duplicate_links(api):
    student=api.student();guardian=api.guardian(student,'Maria Responsável')
    assert api.get('/students?q=Maria')['total']==1
    assert api.get('/students?q=5575999990000')['total']==1
    api.post('/students/'+student['id']+'/guardians',{'person_id':guardian['id'],'legal':True},409)
    api.post('/students/'+student['id']+'/guardians',{'person_id':student['person_id']},422)

def test_enrollment_guardian_and_duplicate_policy(api):
    cat=api.catalogs();student=api.student();e=api.enroll(student,cat['group'])
    api.move(e,'activate',422)
    api.guardian(student)
    e=api.move(e,'activate');assert e['status']=='active'
    api.post('/enrollments',{'student_id':student['id'],'class_group_id':cat['group']['id'],'enrolled_on':'2026-09-21'},409)
    assert api.get('/students?q='+e['number'])['total']==1

def test_capacity_suspend_release_and_version(api):
    cat=api.catalogs();a=api.student('Adulto Um',True);b=api.student('Adulto Dois',True)
    e1=api.move(api.enroll(a,cat['group']),'activate')
    e2=api.enroll(b,cat['group']);api.move(e2,'activate',409)
    api.move({**e1,'version':1},'cancel',409)
    e1=api.move(e1,'suspend');api.move(e2,'activate',409)
    e1=api.move(e1,'cancel');e2=api.move(e2,'activate');assert e2['status']=='active'
    api.move(e1,'reactivate',409)

def test_movement_and_reenrollment_preserve_history(api):
    c=api.catalogs();p=api.student(adult=True);e=api.move(api.enroll(p,c['group']),'activate')
    dest=api.post('/class-groups',{'name':'3º Ano B','unit_id':c['unit']['id'],'academic_year_id':c['year']['id'],'grade_id':c['grade']['id'],'shift_id':c['shift']['id'],'capacity':10})
    e=api.move(e,'change_class',class_group_id=dest['id']);assert e['class_group_id']==dest['id']
    next_year=api.post('/academic-years',{'name':'2027','starts_on':'2027-01-01','ends_on':'2027-12-31'})
    next_class=api.post('/class-groups',{'name':'4º Ano A','unit_id':c['unit']['id'],'academic_year_id':next_year['id'],'grade_id':c['grade']['id'],'shift_id':c['shift']['id'],'capacity':10})
    new=api.post('/enrollments/'+e['id']+'/reenroll',{'class_group_id':next_class['id'],'enrolled_on':'2027-01-10'})
    assert new['id']!=e['id'] and new['previous_enrollment_id']==e['id']
    assert api.get('/enrollments/'+e['id'])['status']=='active'
    assert len(api.get('/students/'+p['id']+'/history'))==4
    e=api.move(e,'transfer');api.move(e,'reactivate',409)

def test_closed_period_and_structural_class_edit(api):
    c=api.catalogs();p=api.student(adult=True);e=api.enroll(p,c['group'])
    year=c['year'];api.patch('/academic-years/'+year['id'],{'version':year['version'],'data':{'name':year['name'],'starts_on':'2026-01-01','ends_on':'2026-12-31','status':'closed'}})
    api.move(e,'activate',409)

def test_upload_checklist_pdf_and_integrity(api):
    c=api.catalogs();p=api.student();api.guardian(p);e=api.enroll(p,c['group'])
    kind=api.post('/document-types',{'name':'Certidão de nascimento','required':True})
    school=api.school
    api.client.patch('/api/v1/schools/'+school['id'],headers=api.headers,json={'version':school['version'],'data':{'name':school['name'],'company_id':school['company_id'],'document_policy':'block'}}).raise_for_status()
    api.move(e,'activate',409)
    from app.documents import render_pdf
    content=render_pdf('Escola de Teste','Documento sintético',[('Aluno','Dados de teste')])
    doc=api.call('POST','/students/'+p['id']+'/documents',expect=201,data={'document_type_id':kind['id']},files={'file':('certidao.pdf',content,'application/pdf')})
    assert doc['file']['sha256']==hashlib.sha256(content).hexdigest()
    assert 'storage_key' not in doc['file']
    api.move(e,'activate',409)
    api.patch('/student-documents/'+doc['id'],{'version':doc['version'],'status':'validated','notes':'Conferido no teste'})
    e=api.move(e,'activate')
    generated=api.post('/students/'+p['id']+'/issued-documents',{'kind':'enrollment_receipt','enrollment_id':e['id']})
    pdf=api.get('/files/'+generated['file']['id']+'/download')
    assert pdf.content.startswith(b'%PDF-')
    assert 'matrícula' in PdfReader(io.BytesIO(pdf.content)).pages[0].extract_text()
    assert api.get('/reports/class/'+c['group']['id']+'/pdf').content.startswith(b'%PDF-')
    assert api.get('/students/'+p['id']+'/documents')['checklist'][0]['complete']
    from app.db import SessionLocal
    from app.models import FileRecord
    from app.config import settings
    with SessionLocal() as db:
        key=db.get(FileRecord,doc['file']['id']).storage_key
    (settings().storage_path/key).write_bytes(b'corrompido')
    api.call('GET','/files/'+doc['file']['id']+'/download',expect=409)

def test_dangerous_upload_and_public_file_denial(api):
    p=api.student();kind=api.post('/document-types',{'name':'Documento'})
    for name,content in [('arquivo.pdf',b'nao e pdf'),('script.svg',b'<svg onload="alert(1)"/>'),('bad.jpg',b'not image')]:
        api.call('POST','/students/'+p['id']+'/documents',expect=422,data={'document_type_id':kind['id']},files={'file':(name,content)})
    assert api.client.get(api.base+'/files/inexistente/download').status_code==401

def test_waiver_and_expired_document(api):
    p=api.student();kind=api.post('/document-types',{'name':'Documento obrigatório','required':True})
    api.post('/students/'+p['id']+'/document-waivers',{'document_type_id':kind['id'],'reason':'Dispensa justificada no teste'})
    assert api.get('/students/'+p['id']+'/documents')['checklist'][0]['complete']
    from app.documents import render_pdf
    doc=api.call('POST','/students/'+p['id']+'/documents',expect=201,data={'document_type_id':kind['id'],'expires_on':'2000-01-01'},files={'file':('teste.pdf',render_pdf('Teste','Teste',[('Origem','Teste')]))})
    assert doc['effective_status']=='expired'
    assert not api.get('/students/'+p['id']+'/documents')['checklist'][0]['complete']

def test_protocol_and_csv_formula_injection(api):
    p=api.student('=FORMULA(1)',adult=True)
    protocol=api.post('/protocols',{'kind':'Declaração','student_id':p['id'],'description':'Documento solicitado'})
    completed=api.patch('/protocols/'+protocol['id'],{'version':protocol['version'],'data':{'kind':'Declaração','student_id':p['id'],'status':'completed'}})
    assert completed['completed_at']
    csv=api.get('/reports/students.csv');assert "'=FORMULA(1)" in csv.text

def test_school_and_record_isolation(api):
    from conftest import API
    company=api.school['company_id']
    school=api.client.post('/api/v1/schools',headers=api.headers,json={'company_id':company,'name':'Outra Escola'}).json()
    other=API(api.client,api.headers,school);p=other.student()
    api.call('GET','/students/'+p['id'],expect=404)
    kind=other.post('/document-types',{'name':'Privado'})
    me=api.student()
    api.post('/students/'+me['id']+'/document-waivers',{'document_type_id':kind['id'],'reason':'Não permitido'},404)

def test_viewer_forbidden_write_and_school_scope(api):
    email='viewer-'+uuid.uuid4().hex[:8]+'@example.com'
    user=api.client.post('/api/v1/users',headers=api.headers,json={'name':'Consulta','email':email,'password':PASSWORD,'role':'viewer','school_ids':[api.school['id']]})
    assert user.status_code==201,user.text
    login=api.client.post('/api/v1/auth/login',json={'email':email,'password':PASSWORD}).json()
    view=API(api.client,{'Authorization':'Bearer '+login['access_token']},api.school)
    assert view.get('/students')['total']==0
    view.post('/persons',{'name':'Não autorizado'},403)
    other=api.client.post('/api/v1/schools',headers=api.headers,json={'name':'Escola Restrita','company_id':api.school['company_id']}).json()
    assert api.client.get('/api/v1/schools/'+other['id']+'/students',headers=view.headers).status_code==403

def test_audit_append_only_and_archive(api):
    p=api.student(adult=True)
    api.post('/students/'+p['id']+'/archive',{'version':p['version'],'data':{'reason':'Duplicidade revisada'}},200)
    assert api.get('/students/'+p['id'])['status']=='archived'
    assert api.get('/audit')['total']>=2
    from app.db import engine
    from sqlalchemy.exc import DBAPIError
    with pytest.raises(DBAPIError):
        with engine.begin() as con:con.execute(text("DELETE FROM audit_events"))

def test_failed_login_no_credential_echo(client):
    r=client.post('/api/v1/auth/login',json={'email':'invalid','password':'NeverEchoThisSecret'})
    assert r.status_code==422 and 'NeverEchoThisSecret' not in r.text
    r=client.post('/api/v1/auth/login',json={'email':'unknown@example.com','password':PASSWORD});assert r.status_code==401

def test_cross_school_file_download_denied(api):
    from app.documents import render_pdf
    c=api.client.post('/api/v1/schools',headers=api.headers,json={'name':'Escola Arquivos','company_id':api.school['company_id']}).json()
    other=API(api.client,api.headers,c);p=other.student();kind=other.post('/document-types',{'name':'Privado'})
    doc=other.call('POST','/students/'+p['id']+'/documents',expect=201,data={'document_type_id':kind['id']},files={'file':('teste.pdf',render_pdf('Teste','Teste',[('Teste','Teste')]))})
    api.call('GET','/files/'+doc['file']['id']+'/download',expect=404)

def test_duplicate_request_does_not_duplicate_movement(api):
    c=api.catalogs();p=api.student(adult=True);e=api.enroll(p,c['group'])
    api.move(e,'activate');api.move(e,'activate',409)
    assert len(api.get('/enrollments/'+e['id'])['history'])==2

def test_malicious_pdf_rejected(api):
    from app.documents import render_pdf
    content=render_pdf('Teste','Teste',[('Teste','Teste')])+b'\n/JavaScript\n'
    p=api.student();kind=api.post('/document-types',{'name':'PDF'})
    api.call('POST','/students/'+p['id']+'/documents',expect=422,data={'document_type_id':kind['id']},files={'file':('ativo.pdf',content)})

def test_postgresql_concurrent_activation_one_vacancy(api):
    from app.db import engine
    if engine.dialect.name!='postgresql':pytest.skip('Requer PostgreSQL real para validar SELECT FOR UPDATE.')
    from concurrent.futures import ThreadPoolExecutor
    from threading import Barrier
    c=api.catalogs(capacity=1);a=api.student('Concorrência Um',True);b=api.student('Concorrência Dois',True)
    first=api.enroll(a,c['group']);second=api.enroll(b,c['group']);barrier=Barrier(2)
    def activate(e):
        barrier.wait()
        return api.client.post(api.base+'/enrollments/'+e['id']+'/movements',headers=api.headers,json={'version':e['version'],'action':'activate','reason':'Concorrência PostgreSQL'}).status_code
    with ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(activate,[first,second]))
    assert sorted(results)==[200,409]

def test_unified_person_registry_complete_fields_and_private_photo(api):
    person=api.post('/persons',{
        'name':'João da Silva',
        'social_name':'João',
        'cpf':'529.982.247-25',
        'birth_date':'2012-04-10',
        'birth_certificate':'REG-123',
        'birth_city':'Salvador',
        'birth_state':'BA',
        'nationality':'Brasileira',
        'sex':'male',
        'race_color':'parda',
        'rg':'1234567',
        'rg_issuer':'SSP',
        'rg_state':'BA',
        'rg_issued_on':'2020-01-10',
        'mother_name':'Maria da Silva',
        'phone':'5571999999999',
        'phone_secondary':'5571988888888',
        'postal_code':'40000000',
        'street':'Rua Central',
        'address_number':'10',
        'district':'Centro',
        'city':'Salvador',
        'state':'BA',
        'country':'Brasil',
        'emergency_contact_name':'Maria da Silva',
        'emergency_contact_phone':'5571999999999',
    })
    assert person['country']=='Brasil'
    student=api.post('/students',{'person_id':person['id'],'previous_school':'Escola anterior','nis':'123'})
    assert student['nis']=='123'
    listed=api.get('/persons?q=1234567')['items'][0]
    assert 'Aluno' in listed['roles']
    from PIL import Image
    image=io.BytesIO()
    Image.new('RGB',(20,20),(0,109,119)).save(image,format='PNG')
    photo=api.call('POST','/persons/'+person['id']+'/photo',expect=200,files={'file':('joao.png',image.getvalue(),'image/png')})
    assert photo['photo_file_id']
    downloaded=api.get('/files/'+photo['photo_file_id']+'/download')
    assert downloaded.content.startswith(b'\x89PNG')
    assert api.call('DELETE','/persons/'+person['id']+'/photo',expect=200)['photo_file_id'] is None


def test_complete_student_and_enrollment_fields_are_persisted(api):
    catalogs=api.catalogs(capacity=5)
    student=api.student('Aluno Completo',adult=True)
    edited=api.patch('/students/'+student['id'],{
        'version':student['version'],
        'data':{
            'previous_school':'Colégio de Origem',
            'nis':'NIS-99',
            'sus_card':'SUS-99',
            'inep_code':'INEP-99',
            'health_plan':'Plano Escola',
            'allergies':'Amendoim',
            'medications':'Nenhum',
            'health_notes':'Acompanhamento',
            'special_needs':'Nenhuma',
            'authorized_transport':'Van 1',
            'student_notes':'Observação integral',
        }
    })
    assert edited['previous_school']=='Colégio de Origem'
    assert edited['special_needs']=='Nenhuma'
    enrollment=api.post('/enrollments',{
        'student_id':student['id'],
        'class_group_id':catalogs['group']['id'],
        'enrolled_on':'2026-09-21',
        'enrollment_type':'transfer_in',
        'origin_school':'Escola de Origem',
        'origin_city':'Salvador',
        'entry_reason':'Transferência regular',
        'external_reference':'DOC-2026-01',
    })
    assert enrollment['enrollment_type']=='transfer_in'
    assert enrollment['origin_school']=='Escola de Origem'

