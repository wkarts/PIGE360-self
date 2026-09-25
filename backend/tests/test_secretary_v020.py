"""Regressões da versão 0.2.0; nenhum dado/segredo de produção."""
import csv
import hashlib
import io
import json
import subprocess
import sys
import os
from datetime import date, timedelta
from pathlib import Path
import pytest
from pypdf import PdfReader
from conftest import API, PASSWORD

ROOT = Path(__file__).resolve().parents[2]


def pdf_text(response):
    assert response.headers['content-type'].startswith('application/pdf')
    reader = PdfReader(io.BytesIO(response.content))
    assert len(reader.pages) > 0
    return '\n'.join(p.extract_text() for p in reader.pages)


def test_official_assets_preserved_and_original_template_removed(client):
    mapping = json.loads((ROOT/'docs/branding/ASSETS-MAP.json').read_text())
    for entry in mapping['assets']:
        data = (ROOT/entry['destination']).read_bytes()
        assert hashlib.sha256(data).hexdigest() == entry['sha256']
        assert entry['transformed'] is False
        if entry['destination'].startswith('frontend/public/'):
            path = '/' + entry['destination'].removeprefix('frontend/public/')
            r = client.get(path)
            assert r.status_code == 200, path
            assert r.content == data, path
    assert not (ROOT/'reference/template-original.zip').exists()
    assert not any(ROOT.rglob('template-original.zip'))


def test_pwa_manifest_and_build(client):
    manifest = client.get('/manifest.webmanifest').json()
    identity=client.get('/api/v1/institution/identity').json()
    assert manifest['short_name'] == identity['short_name']
    assert manifest['name'] == identity['display_name']
    for icon in manifest['icons']:
        assert client.get(icon['src']).headers['content-type']=='image/png'
    assert all(icon['purpose'] == 'any' for icon in manifest['icons'])
    assert '/#/protocols' in [s['url'] for s in manifest['shortcuts']]
    info = client.get('/build-info.json').json()
    assert info['version'] == (ROOT/'VERSION').read_text().strip()
    sw = client.get('/sw.js').text
    assert '/branding/pige360/logo-horizontal.png' not in sw
    assert '/institution-layout.css' in sw
    assert "url.pathname.startsWith('/api/')" in sw
    assert client.get('/favicon.ico').content[:4] == b'\x00\x00\x01\x00'


def test_edit_draft_preserves_student_number_year_and_event(api):
    cats = api.catalogs()
    student = api.student(adult=True)
    e = api.enroll(student, cats['group'])
    target = api.post('/class-groups', {'name':'3º Ano B','unit_id':cats['unit']['id'],'academic_year_id':cats['year']['id'], 'grade_id':cats['grade']['id'],'shift_id':cats['shift']['id'],'capacity':5})
    values = {'version':e['version'], 'class_group_id':target['id'],'enrolled_on':'2026-09-20','notes':'Data e turma revisadas','reason':'Correção administrativa'}
    changed = api.patch('/enrollments/'+e['id'],values)
    assert changed['class_group_id'] == target['id']
    assert changed['student_id'] == student['id'] and changed['number'] == e['number']
    assert changed['academic_year_id'] == e['academic_year_id'] and changed['status'] == 'draft'
    assert changed['activation_key'] == e['activation_key']
    assert changed['version'] == e['version']+1
    detail = api.get('/enrollments/'+e['id'])
    assert detail['history'][0]['action'] == 'draft_updated'
    assert detail['history'][0]['before']['class_group_id'] == cats['group']['id']
    assert api.get('/class-groups')[0]['occupied'] == 0
    api.patch('/enrollments/'+e['id'],values,expect=409)
    active = api.move(changed,'activate')
    api.patch('/enrollments/'+e['id'],{**values,'version':active['version']},expect=409)


def test_draft_rejects_another_year_or_school(api,client,admin,school):
    cats = api.catalogs(); student=api.student(adult=True); e=api.enroll(student,cats['group'])
    year = api.post('/academic-years',{'name':'2027','starts_on':'2027-01-01','ends_on':'2027-12-31'})
    group = api.post('/class-groups',{'name':'Destino 2027','unit_id':cats['unit']['id'],'academic_year_id':year['id'],'grade_id':cats['grade']['id'],'shift_id':cats['shift']['id']})
    values = {'version':e['version'],'class_group_id':group['id'],'enrolled_on':'2027-01-01','notes':'','reason':'Troca indevida de período'}
    api.patch('/enrollments/'+e['id'],values,expect=422)
    companies=client.get('/api/v1/companies',headers=admin).json()
    other_school=client.post('/api/v1/schools',headers=admin,json={'company_id':companies[0]['id'],'name':'Outra escola no teste'}).json()
    other_api=API(client,admin,other_school)
    other_api.call('PATCH','/enrollments/'+e['id'],values,expect=404)


def test_enrollment_search_filters(api):
    cats=api.catalogs(capacity=5)
    e=api.enroll(api.student('Aluna Carolina de Teste',adult=True),cats['group'])
    assert api.get('/enrollments?q=Carolina')['total']==1
    assert api.get('/enrollments?q='+e['number'])['total']==1
    assert api.get('/enrollments?q=Inexistente')['total']==0
    assert api.get('/enrollments?q=%25')['total']==0
    assert api.get('/enrollments?status=active')['total']==0
    assert api.get('/enrollments?status=draft&academic_year_id='+cats['year']['id'])['total']==1
    api.call('GET','/enrollments?status=anything',expect=422)


def test_enrollment_form_allowed_draft_but_not_declaration(api):
    from test_institution import image, save
    assert save(api.client, api.headers, {'display_name':api.school['name']}, files={'logo':('school.png',image(),'image/png')}).status_code == 200
    cats=api.catalogs();student=api.student(adult=True);e=api.enroll(student,cats['group'])
    issued=api.post('/students/'+student['id']+'/issued-documents',{'kind':'enrollment_form','enrollment_id':e['id']})
    assert issued['template_version']=='3'
    response=api.get('/files/'+issued['file_id']+'/download')
    content=pdf_text(response)
    assert 'Ficha de matrícula' in content and 'rascunho' in content
    assert 'Não contém assinatura digital' in content
    reader=PdfReader(io.BytesIO(response.content))
    assert reader.pages[0]['/Resources'].get('/XObject'), 'O logotipo configurado pela escola precisa estar incorporado no PDF'
    api.post('/students/'+student['id']+'/issued-documents',{'kind':'enrollment_declaration','enrollment_id':e['id']},expect=409)
    other=api.student('Outro aluno de Teste',adult=True)
    api.post('/students/'+other['id']+'/issued-documents',{'kind':'enrollment_form','enrollment_id':e['id']},expect=422)
    api.post('/students/'+other['id']+'/issued-documents',{'kind':'student_record','enrollment_id':e['id']},expect=422)


def test_protocol_timeline_concurrency_and_receipt(api):
    student=api.student();obj=api.post('/protocols',{'kind':'Declaração escolar','student_id':student['id'],'due_on':(date.today()-timedelta(days=2)).isoformat()})
    detail=api.get('/protocols/'+obj['id']);assert len(detail['history'])==1
    assert detail['history'][0]['action']=='created' and detail['overdue']
    assert detail['student_name']==student['person']['name']
    updated=api.post('/protocols/'+obj['id']+'/notes',{'version':obj['version'],'message':'Recebidos os dados necessários para análise.'})
    api.post('/protocols/'+obj['id']+'/notes',{'version':obj['version'],'message':'Esta repetição está desatualizada.'},expect=409)
    detail=api.get('/protocols/'+obj['id']);assert len(detail['history'])==2
    assert detail['history'][1]['message']=='Recebidos os dados necessários para análise.'
    assert detail['history'][1]['actor_name']
    edited=api.patch('/protocols/'+obj['id'],{'version':updated['version'],'data':{'kind':'Declaração escolar','student_id':student['id'],'status':'completed'}})
    assert edited['completed_at'] and not edited['overdue']
    api.post('/protocols/'+obj['id']+'/notes',{'version':edited['version'],'message':'Fechado não permite atendimento.'},expect=409)
    text=pdf_text(api.get('/protocols/'+obj['id']+'/pdf'))
    assert obj['number'] in text and 'Concluído' in text
    api.call('DELETE','/protocols/'+obj['id']+'/notes',expect=405)
    detail=api.get('/protocols/'+obj['id']);assert len(detail['history'])==3
    assert detail['history'][-1]['before']['status']=='open'


def test_protocol_filters_and_student_query(api):
    st=api.student();a=api.post('/protocols',{'kind':'Histórico antigo','student_id':st['id'],'due_on':(date.today()-timedelta(days=1)).isoformat()})
    api.post('/protocols',{'kind':'Retirada','status':'completed','due_on':(date.today()-timedelta(days=1)).isoformat()})
    assert api.get('/protocols?overdue=true')['total']==1
    assert api.get('/protocols?status=completed')['total']==1
    assert api.get('/protocols?q='+a['number'])['total']==1
    assert api.get('/protocols?student_id='+st['id'])['total']==1
    assert api.get('/dashboard')['overdue_protocols']==1
    api.call('GET','/protocols?status=invalid',expect=422)


def test_pendency_filters_exports_and_pagination(api):
    cats=api.catalogs(capacity=50)
    st=api.student('Ana Secretaria Teste',adult=True);api.enroll(st,cats['group'])
    kind=api.post('/document-types',{'name':'Certidão','required':True})
    api.post('/document-types',{'name':'Opcional','required':False})
    data=api.get('/document-pendencies?class_group_id='+cats['group']['id'])
    assert data['total']==1 and data['total_documents']==1 and not data['truncated']
    assert data['items'][0]['class_name']==cats['group']['name']
    assert api.get('/document-pendencies?q=Inexistente')['total']==0
    assert api.get('/document-pendencies?document_status=received')['total']==0
    assert api.get('/document-pendencies?document_type_id='+kind['id'])['total']==1
    csv_response=api.get('/reports/document-pendencies.csv?q=Ana')
    rows=list(csv.reader(io.StringIO(csv_response.content.decode('utf-8-sig')),delimiter=';'))
    assert len(rows)==2 and rows[1][1]=='Ana Secretaria Teste'
    assert 'Pendências documentais' in pdf_text(api.get('/reports/document-pendencies.pdf'))
    assert 'Ana Secretaria Teste' in pdf_text(api.get('/reports/document-pendencies.pdf'))
    api.call('GET','/document-pendencies?document_status=validated',expect=422)
    api.call('GET','/document-pendencies?document_type_id=unknown',expect=404)
    for i in range(31):api.student('Aluno Paginação '+str(i).zfill(2),adult=True)
    first=api.get('/document-pendencies?page=1&page_size=30')
    second=api.get('/document-pendencies?page=2&page_size=30')
    assert first['total']==32 and len(first['items'])==30 and len(second['items'])==2
    assert not {r['student_id'] for r in first['items']} & {r['student_id'] for r in second['items']}


def test_pending_reviewed_documents_and_export_safety(api):
    st=api.student('=CMD Teste',adult=True)
    kind=api.post('/document-types',{'name':'Residência','required':True})
    image=(ROOT/'frontend/public/icons/icon-192.png').read_bytes()
    r=api.client.post(api.base+'/students/'+st['id']+'/documents',headers=api.headers,data={'document_type_id':kind['id']},files={'file':('test.png',image,'image/png')})
    assert r.status_code==201,r.text
    doc=r.json()
    assert api.get('/document-pendencies?document_status=received')['total']==1
    assert api.get('/dashboard')['received_documents']==1
    exported=api.get('/reports/document-pendencies.csv').content.decode('utf-8-sig')
    assert "'=CMD Teste" in exported
    api.patch('/student-documents/'+doc['id'],{'version':doc['version'],'status':'validated','notes':'Documento revisado em teste.'})
    assert api.get('/document-pendencies')['total']==0
    assert api.get('/dashboard')['received_documents']==0


def test_additions_enforce_school_and_readonly_access(client,admin,api):
    cats=api.catalogs();st=api.student(adult=True);enr=api.enroll(st,cats['group']);protocol=api.post('/protocols',{'kind':'Proteção entre escolas'})
    import uuid
    email=uuid.uuid4().hex+'@example.com'
    create=client.post('/api/v1/users',headers=admin,json={'name':'Consulta Teste','email':email,'password':PASSWORD,'role':'viewer','school_ids':[api.school['id']]})
    assert create.status_code==201,create.text
    auth=client.post('/api/v1/auth/login',json={'email':email,'password':PASSWORD}).json()
    view=API(client,{'Authorization':'Bearer '+auth['access_token']},api.school)
    assert view.get('/protocols/'+protocol['id'])['id']==protocol['id']
    view.post('/protocols/'+protocol['id']+'/notes',{'version':protocol['version'],'message':'Não autorizado.'},expect=403)
    view.patch('/enrollments/'+enr['id'],{'version':enr['version'],'class_group_id':cats['group']['id'],'enrolled_on':'2026-09-01','reason':'Sem permissão.'},expect=403)
    companies=client.get('/api/v1/companies',headers=admin).json()
    new_school=client.post('/api/v1/schools',headers=admin,json={'company_id':companies[0]['id'],'name':'Outra escola privada'}).json()
    other=API(client,admin,new_school)
    other.call('GET','/protocols/'+protocol['id'],expect=404)
    other.call('GET','/protocols/'+protocol['id']+'/pdf',expect=404)
    other.call('POST','/protocols/'+protocol['id']+'/notes',{'version':protocol['version'],'message':'Tentativa cruzada'},expect=404)
    other.call('GET','/reports/document-pendencies.csv?class_group_id='+cats['group']['id'],expect=404)
    stranger=API(client,view.headers,new_school)
    stranger.call('GET','/document-pendencies',expect=403)


def test_export_rejects_truncated_results(api,monkeypatch):
    from app import reports
    def truncated(*args,**kwargs):return {'truncated':True}
    monkeypatch.setattr(reports,'collect_pendencies',truncated)
    api.call('GET','/reports/document-pendencies.csv',expect=422)
    api.call('GET','/reports/document-pendencies.pdf',expect=422)


def test_upgrade_from_v010_preserves_existing_data(tmp_path):
    """Aplica 0001, grava um registro e aplica 0002 sem reescrever 0001."""
    env={**os.environ,'DATABASE_URL':'sqlite:///'+str(tmp_path/'upgrade.db'),'STORAGE_PATH':str(tmp_path/'files')}
    backend=ROOT/'backend'
    subprocess.run([sys.executable,'-m','alembic','upgrade','0001_secretary'],cwd=backend,env=env,check=True,capture_output=True)
    import sqlite3
    db=sqlite3.connect(tmp_path/'upgrade.db')
    db.execute("INSERT INTO companies (id,name,document,created_at,updated_at,version) VALUES (?,?,?,?,?,?)",('legacy-company','Mantenedora anterior',None,'2026-01-01','2026-01-01',1));db.commit();db.close()
    subprocess.run([sys.executable,'-m','alembic','upgrade','head'],cwd=backend,env=env,check=True,capture_output=True)
    subprocess.run([sys.executable,'-m','alembic','check'],cwd=backend,env=env,check=True,capture_output=True)
    db=sqlite3.connect(tmp_path/'upgrade.db')
    assert db.execute('SELECT name FROM companies WHERE id=?',('legacy-company',)).fetchone()==('Mantenedora anterior',)
    assert db.execute('SELECT COUNT(*) FROM protocol_events').fetchone()[0]==0
    db.close()
