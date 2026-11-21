"""Aceite pelos mesmos endpoints utilizados pela secretaria e pela família."""
from copy import deepcopy
from datetime import UTC, datetime, timedelta
from io import BytesIO
from uuid import uuid4

from cryptography.hazmat.primitives import serialization
from PIL import Image, ImageDraw
from pypdf import PdfReader
from sqlalchemy import select, func

from app import models as m
from app.db import SessionLocal
from app.learning_portal import learning_data
from test_contract_signatures import certificate
from test_institution import save
from test_learning_portal import activate, portal_call, portal_session, published_learning


def artwork(logo=False):
    """Ativos desenhados para o ensaio, sem usar marca ou retrato de escola real."""
    image = Image.new('RGB', (120, 120), '#edf3f4')
    draw = ImageDraw.Draw(image)
    if logo:
        draw.polygon([(15,20),(105,20),(100,74),(60,105),(20,74)],fill='#205966')
        draw.polygon([(32,40),(60,46),(88,40),(88,68),(60,75),(32,68)],fill='white')
        draw.line([(60,46),(60,71)],fill='#205966',width=2)
    else:
        draw.ellipse((40,18,80,61), fill='#ac8572')
        draw.ellipse((15,65,105,155), fill='#40737a')
    stream = BytesIO()
    image.save(stream, format='PNG')
    return stream.getvalue()


def assert_document(content, target, horizontal, *labels):
    target.write_bytes(content)
    pages = PdfReader(BytesIO(content)).pages
    text = '\n'.join(page.extract_text() for page in pages)
    for index, page in enumerate(pages, 1):
        assert (page.mediabox.width > page.mediabox.height) == horizontal
        assert sorted(round(float(v)) for v in (page.mediabox.width,page.mediabox.height)) == [595,842]
        assert f'Página {index} de {len(pages)}' in page.extract_text()
    for label in (*labels, 'Carimbo de identificação institucional', 'Assinatura da instituição'):
        assert label in text, label
    assert 'PIGE360' not in text and 'NOTA_INTERNA' not in text
    return text


def test_eleven_rendered_school_documents(api, client, admin, tmp_path):
    from app.documents import write_file
    api.update_school(name='Colégio Horizonte · Homologação', address='Rua do Saber, 42 · Cidade de Ensaio', email='secretaria@example.test')
    assert save(client, admin, {'display_name':api.school['name'],'short_name':'Horizonte'}, files={'logo':('timbre.png',artwork(True),'image/png')}).is_success
    student, _, enrollment, _, cid = published_learning(api)
    person = api.post('/person-dossiers', {'person':{'name':'Beatriz de Sá · Cadastro de ensaio','person_types':['teacher','employee']},
        'profiles':{'teacher':{'data':{'degree_course':'Licenciatura em Ciências','education_institution':'Universidade de Ensaio'}},
                    'employee':{'data':{'job_title':'Coordenadora','department':'Secretaria'}}}},200)['person']
    with SessionLocal.begin() as db:
        uid=db.scalar(select(m.User.id).where(m.User.email=='admin@example.com'))
        image=write_file(db,api.school['id'],uid,'avatar.png','image/png',artwork())
        pupil=db.get(m.Person,student['person']['id'])
        pupil.name='Mariana de Assis e Albuquerque · Aluna de ensaio'
        pupil.photo_file_id=image.id
        c=db.get(m.DiaryClosure,cid)
        diary,period=c.diary_id,c.academic_period_id
    for model,title in [('integrated','Grade integrada'),('panel','Painel do aluno'),('journey','Percurso acadêmico')]:
        content=api.get('/reports/bulletins/'+enrollment['id']+'/preview.pdf?model='+model).content
        assert_document(content,tmp_path/(model+'.pdf'),True,title,'Matemática','8,5','66,67%','Horizonte')
        assert len(PdfReader(BytesIO(content)).pages[0].images)>=2
    for kind in ('student','employee','teacher'):
        for orient in ('portrait','landscape'):
            if kind=='student':
                issued=api.post('/students/'+student['id']+'/issued-documents',{'kind':'student_record','orientation':orient})
                content=api.get('/files/'+issued['file_id']+'/download').content
            else:
                content=api.get('/persons/'+person['id']+'/records/'+kind+'.pdf?orientation='+orient).content
            assert_document(content,tmp_path/(kind+'-'+orient+'.pdf'),orient=='landscape',
                            'Mariana' if kind=='student' else 'Beatriz','Horizonte')
    for kind,title in [('attendance','Chamada'),('pedagogical_register','Registro cronológico')]:
        content=api.get('/diaries/'+diary+'/reports/'+kind+'.pdf?academic_period_id='+period).content
        assert_document(content,tmp_path/(kind+'.pdf'),True,title,'Matemática','Horizonte')
    subset=api.get('/diaries/'+diary+'/reports/attendance.pdf?date_from=2026-09-23&date_to=2026-09-23')
    text=' '.join(p.extract_text() for p in PdfReader(BytesIO(subset.content)).pages)
    assert '23/09/2026' in text and '22/09/2026' not in text


def test_official_bulletin_a1_revisions_and_rollback(api, client, tmp_path, monkeypatch):
    from app.config import settings
    from app.contract_signatures import SchoolSigningCertificate, _company_revision, _read_verified
    from app.pdf_signing import inspect_signatures, trust_roots, InvalidPdfSignature
    student, _, enrollment, other, cid = published_learning(api)
    eid=enrollment['id']
    route='/reports/bulletins/'+eid+'/issue?operation='
    with SessionLocal.begin() as db:
        closure=db.get(m.DiaryClosure,cid)
        snapshot=deepcopy(closure.snapshot)
        snapshot['opinions']=[{'status':'final','enrollment_id':eid,'student_id':student['id'],
            'academic_period_id':closure.academic_period_id,'text':('Parecer pedagógico de homologação sobre as atividades desenvolvidas. ' * 85).strip()}]
        closure.snapshot=snapshot
    op=str(uuid4())
    api.post(route+op,{},409)
    with SessionLocal() as db:
        doc=db.get(m.Company,api.school['company_id']).document
    cert,pfx=certificate('A1 Escola de Ensaio','2.16.76.1.3.3',''.join(c for c in doc or '' if c.isdigit()) or '12345678000190')
    roots=tmp_path/'roots'
    roots.mkdir()
    (roots/'public.pem').write_bytes(cert.public_bytes(serialization.Encoding.PEM))
    monkeypatch.setattr(settings(),'signature_trust_roots_dir',roots)
    configured=client.put(api.base+'/signing-certificate/a1',headers=api.headers,files={'file':('teste.p12',pfx)},data={'password':'senha-teste'})
    assert configured.is_success, configured.text
    with SessionLocal.begin() as db:
        c=db.scalar(select(SchoolSigningCertificate).where(SchoolSigningCertificate.school_id==api.school['id']))
        expiry=c.expires_at
        c.expires_at=datetime.now(UTC)-timedelta(days=1)
    api.post(route+op,{},409)
    with SessionLocal.begin() as db:
        db.scalar(select(SchoolSigningCertificate).where(SchoolSigningCertificate.school_id==api.school['id'])).expires_at=expiry
    def failed(*args):
        raise InvalidPdfSignature('Falha de ensaio')
    with monkeypatch.context() as patch:
        patch.setattr('app.contract_signatures.sign_pdf_pfx',failed)
        api.post(route+op,{},409)
    with SessionLocal() as db:
        assert not db.scalar(select(func.count()).select_from(m.IssuedDocument).where(m.IssuedDocument.kind=='official_bulletin',m.IssuedDocument.school_id==api.school['id']))
    first=api.post(route+op,{},200)
    assert first['revision']==1 and first['status']=='company_signed'
    assert first==api.post(route+op,{},200)
    from test_profiles import create_user, login
    email=str(uuid4())+'@example.com'
    create_user(client,api.headers,name='Consulta de ensaio',email=email,role='viewer',school_id=api.school['id'],person_id=None)
    viewer=login(client,email,'Profile-Test-Password-2026!')
    assert client.post(api.base+route+str(uuid4()),headers=viewer).status_code==403
    assert client.put(api.base+'/report-preferences',headers=viewer,json={**api.get('/report-preferences'),'bulletin':'panel'}).status_code==403
    cookies,_=portal_session(api)
    path='/learning/'+student['id']+'/report.pdf?enrollment_id='+eid+'&document_id='+first['id']
    portal_call(client,cookies,'GET',path,expected=404)
    activate(client,cookies,student)
    signed=portal_call(client,cookies,'GET',path).content
    assert len(PdfReader(BytesIO(signed)).pages) > 1
    result=inspect_signatures(signed,roots=trust_roots(roots))
    assert result['chain_trusted'] and result['cryptographic_valid'] and len(result['signatures'])==1
    (tmp_path/'boletim-oficial-A1-ensaio.pdf').write_bytes(signed)
    with SessionLocal() as db:
        revision=_company_revision(db,db.get(m.IssuedDocument,first['id']))
        assert signed==_read_verified(db.get(m.FileRecord,revision.file_id))
    pref=api.get('/report-preferences')
    api.call('PUT','/report-preferences',{**pref,'bulletin':'journey','color':'#295436','student':'landscape'})
    second=api.post(route+str(uuid4()),{},200)
    assert second['revision']==2 and second['id']!=first['id']
    assert portal_call(client,cookies,'GET',path).content==signed
    portal_call(client,cookies,'GET',path.replace(student['id'],other['id']),expected=404)
    with SessionLocal.begin() as db:
        db.get(m.DiaryClosure,cid).active=False
    portal_call(client,cookies,'GET',path,expected=404)


def test_three_calendars_in_one_year_and_distinct_curricula(api, tmp_path):
    """Três configurações simultâneas. O teste vai da matrícula ao PDF de cada modelo."""
    from calendar import monthrange
    from datetime import date
    from app.diary import _snapshot
    catalog=api.catalogs(capacity=10)
    year=catalog['year']['id']
    regimes=[(3,'Trimestre','Ciências'),(4,'Bimestre','Artes'),(2,'Semestre','Tecnologia')]
    for count, term, discipline in regimes:
        group=catalog['group']
        if count!=3:
            grade=api.post('/grades',{'name':f'{count}º ano'})
            unit=api.post('/units',{'name':'Unidade '+term})
            group=api.post('/class-groups',{'name':group['name'],'unit_id':unit['id'],'academic_year_id':year,
                    'grade_id':grade['id'],'shift_id':catalog['shift']['id'],'capacity':10})
        student=api.student('Estudante · '+term)
        enrollment=api.post('/enrollments',{'student_id':student['id'],'class_group_id':group['id'],'enrolled_on':'2026-01-01'})
        with SessionLocal.begin() as db:
            db.get(m.Enrollment,enrollment['id']).status='active'
        comp=api.post('/curriculum-components',{'name':discipline})
        diary=api.post('/diaries',{'class_group_id':group['id'],'component_id':comp['id']})
        for index in range(count):
            start_month=1+index*(12//count)
            end_month=start_month+12//count-1
            start=date(2026,start_month,1)
            end=date(2026,end_month,monthrange(2026,end_month)[1])
            period=api.post('/academic-periods',{'academic_year_id':year,'class_group_id':group['id'],'name':f'{index+1}º {term}',
                'starts_on':start.isoformat(),'ends_on':end.isoformat(),'order_index':index+1})
            lesson=api.post('/diaries/'+diary['id']+'/lessons',{'academic_period_id':period['id'],
                'lesson_date':start.isoformat(),'lesson_count':1,'content':'Atividade curricular de '+discipline})
            with SessionLocal.begin() as db:
                snap=_snapshot(db,db.get(m.SchoolDiary,diary['id']),period['id'])
                snap['lessons'][0]['expected_enrollment_ids']=[enrollment['id']]
                snap['period_results']=[{'academic_period_id':period['id'],'enrollment_id':enrollment['id'],'student_id':student['id'],
                    'status':'pending' if index==1 else 'calculated','numeric_value':0 if index==0 else None,
                    'concept_value':'Satisfatório' if index>1 else ''}]
                uid=db.scalar(select(m.User.id).where(m.User.email=='admin@example.com'))
                db.add(m.DiaryClosure(school_id=api.school['id'],diary_id=diary['id'],academic_period_id=period['id'],
                     snapshot=snap,snapshot_hash='1'*64,reason='Ensaio de regime',closed_by=uid,closed_at=datetime.now(UTC),active=True))
        with SessionLocal() as db:
            item=learning_data(db,[db.get(m.Student,student['id'])])['students'][0]['enrollments'][0]
            assert [p['name'] for p in item['calendar']]==[f'{n+1}º {term}' for n in range(count)]
            assert [s['component_name'] for s in item['subjects']]==[discipline]
            terms=item['subjects'][0]['periods']
            assert terms[0]['grade_display']=='0' and terms[1]['grade_display']=='Aguardando consolidação'
            assert all(t['attendance']['percentage'] is None and t['attendance']['unrecorded']==1 for t in terms)
        for model in ('integrated','panel','journey'):
            pdf=api.get('/reports/bulletins/'+enrollment['id']+'/preview.pdf?model='+model).content
            text=assert_document(pdf,tmp_path/f'{count}-{term}-{model}.pdf',True,discipline,*[t['period_name'] for t in terms])
            assert all(other not in text for _,other,_ in regimes if other!=term)


def test_same_named_transfer_keeps_both_published_classes(api):
    student, _, enrollment, _, cid=published_learning(api)
    with SessionLocal() as db:
        original=db.get(m.ClassGroup,enrollment['class_group_id'])
        params={k:getattr(original,k) for k in ('name','grade_id','academic_year_id','shift_id','capacity')}
        component=db.get(m.SchoolDiary,db.get(m.DiaryClosure,cid).diary_id).component_id
    new_unit=api.post('/units',{'name':'Unidade Leste'})
    target=api.post('/class-groups',{**params,'unit_id':new_unit['id']})
    api.move(api.get('/enrollments/'+enrollment['id']),'change_class',class_group_id=target['id'])
    second=api.post('/diaries',{'class_group_id':target['id'],'component_id':component})
    with SessionLocal.begin() as db:
        first=db.get(m.DiaryClosure,cid)
        snap=deepcopy(first.snapshot)
        snap['diary'].update({'id':second['id'],'class_group_id':target['id']})
        snap['lessons']=[]
        snap['attendance']=[]
        snap['period_results'][0]['numeric_value']='0'
        db.add(m.DiaryClosure(school_id=api.school['id'],diary_id=second['id'],academic_period_id=first.academic_period_id,
              snapshot=snap,snapshot_hash='2'*64,reason='Ensaio após mudança de unidade',closed_by=first.closed_by,
              closed_at=datetime.now(UTC),active=True))
    with SessionLocal() as db:
        entry=learning_data(db,[db.get(m.Student,student['id'])])['students'][0]['enrollments'][0]
        tables={t['class_group_id']:t for t in entry['grade_tables']}
        assert set(tables)=={target['id'],enrollment['class_group_id']}
        assert 'Unidade Leste' in tables[target['id']]['title']
        assert '0' in tables[target['id']]['rows'][0].values()
        assert '8,5' in tables[enrollment['class_group_id']]['rows'][0].values()
