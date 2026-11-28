"""O atendimento dos portais usa a mesma fila do gestor, com histórico e anexos isolados."""
from datetime import datetime
from io import BytesIO
from uuid import uuid4

from PIL import Image
from sqlalchemy import func, select

from app import models as m
from app.config import settings
from app.db import SessionLocal
from app.security import utc
from conftest import PASSWORD
from test_family_access_profiles import account


def form(student=None,category='secretaria'):
    data={'subject':'Segunda via de documento','category':category,'message':'Preciso conferir a segunda via.',
          'client_key':str(uuid4())}
    if student:
        data['student_id']=student['id']
    return data


def photo():
    out=BytesIO()
    Image.new('RGB',(10,10),'white').save(out,'PNG')
    return out.getvalue()


def pupil_path(api):
    return '/api/v1/family/schools/'+api.school['id']+'/protocols'


def test_first_message_attachment_reply_private_notes_and_retry(api,monkeypatch):
    monkeypatch.setattr(settings(),'smtp_host','smtp.example.test')
    monkeypatch.setattr(settings(),'smtp_from','escola@example.test')
    user,h,student,_=account(api,'student')
    _,other,_,_=account(api,'student')
    base=pupil_path(api)
    data=form(student)
    file={'file':('pedido escolar.png',photo(),'image/png')}
    created=api.client.post(base,headers=h,data=data,files=file)
    assert created.status_code==201,created.text
    ticket=created.json();num=ticket['number'];pid=ticket['id']
    assert num.startswith('PRO-') and ticket['preferred_channel']=='portal'
    assert api.client.post(base,headers=h,data=data,files=file).json()['id']==pid
    assert api.client.post(base,headers=h,data={**data,'subject':'Outro assunto'},files=file).status_code==409
    own=base+'/'+pid
    assert api.client.get(base,params={'q':num},headers=h).json()['total']==1
    assert api.client.get(base,params={'q':num},headers=other).json()['total']==0
    assert api.client.get(own,headers=other).status_code==404
    assert api.client.get(base+'/options',headers=h).json()['channels'][0]=='portal'
    assert api.client.patch(own+'/channel',headers=h,json={'preferred_channel':'whatsapp'}).status_code==422
    assert api.client.patch(own+'/channel',headers=h,json={'preferred_channel':'portal'}).json()['preferred_channel']=='portal'
    assert api.client.patch(own+'/channel',headers=h,json={'preferred_channel':'email'}).json()['preferred_channel']=='email'
    attachment=ticket['history'][0]['attachment']
    assert ticket['history'][0]['author']=='you' and attachment['name']=='pedido escolar.png'
    url=own+'/attachments/'+attachment['id']
    assert api.client.get(url,headers=h).content==photo()
    assert api.client.get(url,headers=other).status_code==404
    manager=api.get('/protocols/'+pid)
    assert manager['requester_user_id']==user['id'] and manager['source']=='family'
    assert api.get('/protocols?source=family&category=secretaria&q='+num)['total']==1
    assert api.client.get(api.base+'/protocols/'+pid+'/attachments/'+attachment['id'],headers=api.headers).content==photo()
    api.post('/protocols/'+pid+'/notes',{'version':manager['version'],'message':'Anotação interna da secretaria'})
    assert 'Anotação interna' not in api.client.get(own,headers=h).text
    public={'message':'A segunda via está disponível.','client_key':str(uuid4())}
    url_manager=api.base+'/protocols/'+pid+'/messages'
    assert api.client.post(url_manager,headers=api.headers,data=public).status_code==201
    assert api.client.post(url_manager,headers=api.headers,data=public).status_code==201
    reply={'message':'Obrigada, vou retirar.','client_key':str(uuid4())}
    assert api.client.post(own+'/messages',headers=other,data=reply).status_code==404
    assert api.client.post(own+'/messages',headers=h,data=reply).status_code==201
    timeline=api.client.get(own,headers=h).json()['history']
    assert [m['author'] for m in timeline]==['you','school','you']
    assert all(set(m).isdisjoint({'before','after','actor_id','client_fingerprint','notification'}) for m in timeline)
    current=api.get('/protocols/'+pid)
    assert [e['notification'] for e in current['history']]==[None,None,{'channel':'email','status':'pending'},None]
    updated={'kind':current['kind'],'student_id':student['id'],'description':current['description'],'status':'completed'}
    api.patch('/protocols/'+pid,{'version':current['version'],'data':updated})
    closed=api.client.get(own,headers=h).json()
    assert closed['status']=='completed' and closed['history'][-1]['action']=='public_status'
    assert api.client.post(own+'/messages',headers=h,data=reply).status_code==201
    assert api.client.post(own+'/messages',headers=h,data={**reply,'client_key':str(uuid4())}).status_code==409
    with SessionLocal() as db:
        assert db.scalar(select(func.count(m.Protocol.id)).where(m.Protocol.id==pid))==1


def test_financial_only_guardian_revalidated_and_legacy_tickets_private(api):
    _,h,student,payer=account(api,'guardian')
    base=pupil_path(api)
    enrollment=api.enroll(student,api.catalogs()['group'])
    with SessionLocal.begin() as db:
        link=db.scalar(select(m.GuardianLink).where(m.GuardianLink.person_id==payer['id']))
        link.legal=False
        db.get(m.Enrollment,enrollment['id']).financial_person_id=payer['id']
    finance=api.client.post(base,headers=h,data=form(student,'financeiro'))
    assert finance.status_code==201,finance.text
    assert api.client.post(base,headers=h,data=form(student,'pedagogico')).status_code==403
    assert api.client.post(base,headers=h,data=form(student,'tecnico')).status_code==201
    private=api.post('/protocols',{'kind':'Assunto interno','student_id':student['id'],'description':'Apenas colaboradores'})
    assert api.client.get(base+'/'+private['id'],headers=h).status_code==404
    assert api.client.get(base,headers=h).json()['total']==2
    with SessionLocal.begin() as db:
        db.scalar(select(m.GuardianLink).where(m.GuardianLink.person_id==payer['id'])).active=False
    assert api.client.get(base+'/'+finance.json()['id'],headers=h).status_code==404
    assert api.client.get(base,headers=h).json()['total']==0


def test_manager_on_behalf_and_teacher_scope(api):
    person=api.post('/persons',{'name':'Docente de teste'})
    login=uuid4().hex+'@example.com'
    data={'name':'Docente do atendimento','role':'teacher','email':login,'password':PASSWORD,
          'school_ids':[api.school['id']],'person_id':person['id']}
    t=api.post('/users',data)
    h={'Authorization':'Bearer '+api.client.post('/api/v1/auth/login',json={'email':login,'password':PASSWORD}).json()['access_token']}
    me='/api/v1/teacher/schools/'+api.school['id']+'/protocols'
    child,student_headers,student,_=account(api,'student')
    assert api.client.post(pupil_path(api),headers=student_headers,data=form(student,'financeiro')).status_code==403
    assert api.client.get(me,headers=student_headers).status_code==403
    assert api.client.get(pupil_path(api),headers=h).status_code==403
    assert api.client.post(me,headers=h,data=form(student)).status_code==403
    assert api.client.post(me,headers=h,data=form(category='financeiro')).status_code==403
    assert api.client.post(me,headers=h,data=form(category='pedagogico')).status_code==201
    assert t['id'] in [r['id'] for r in api.get('/protocol-requesters?q=Docente')['items']]
    assert api.get('/protocol-requesters/'+child['id']+'/students')['items'][0]['id']==student['id']
    data={'kind':'Recado da coordenação','description':'Solicitação da escola para o docente.','category':'pedagogico',
          'requester_user_id':t['id'],'client_key':str(uuid4())}
    opened=api.post('/protocols',data)
    assert api.post('/protocols',data)['id']==opened['id']
    row=api.client.get(me+'/'+opened['id'],headers=h).json()
    assert row['source']=='manager' and row['preferred_channel']=='portal' and row['history'][0]['author']=='school'
    changed=api.get('/protocols/'+opened['id'])
    resp=api.client.patch(api.base+'/protocols/'+opened['id'],headers=api.headers,
        json={'version':changed['version'],'data':{'kind':'Novo vínculo','student_id':student['id']}})
    assert resp.status_code==409


def test_school_opening_preference_is_personal_optional_and_scoped(api, monkeypatch):
    monkeypatch.setattr(settings(), 'smtp_host', 'smtp.example.test')
    monkeypatch.setattr(settings(), 'smtp_from', 'escola@example.test')
    pupil, headers, student, _ = account(api, 'student')
    _, peer_headers, _, _ = account(api, 'student')
    base = pupil_path(api)
    channel_url = base + '/opening-channel'
    payload = {'preferred_channel':'email'}
    assert api.client.get(base + '/options', headers=headers).json()['opening_channel'] == 'portal'
    assert api.client.put(channel_url, headers=api.headers, json=payload).status_code == 403
    assert api.client.put(channel_url, headers=headers, json={**payload,'user_id':pupil['id']}).status_code == 422
    assert api.client.put(channel_url, headers=headers, json={'preferred_channel':'whatsapp'}).status_code == 422
    ticket = {'kind':'Material solicitado', 'description':'A secretaria separou seu material.', 'category':'secretaria',
              'requester_user_id':pupil['id'], 'student_id':student['id'], 'client_key':str(uuid4())}
    first = api.post('/protocols', ticket)
    assert first['preferred_channel'] == 'portal'
    assert api.get('/protocols/' + first['id'])['history'][0]['notification'] is None

    consenting = api.client.put(channel_url, headers=headers, json=payload)
    assert consenting.status_code == 200, consenting.text
    assert consenting.json()['opening_channel'] == 'email'
    assert api.client.get(base + '/options', headers=peer_headers).json()['opening_channel'] == 'portal'
    second_school = api.client.post('/api/v1/schools',headers=api.headers,
        json={'company_id':api.school['company_id'],'name':'Segunda escola '+uuid4().hex[:8]}).json()['id']
    elsewhere = base.replace(api.school['id'],second_school)
    assert api.client.put(elsewhere+'/opening-channel',headers=headers,json=payload).status_code == 403
    with SessionLocal.begin() as db:
        db.add(m.SchoolAccess(school_id=second_school,user_id=pupil['id']))
    assert api.client.get(elsewhere+'/options',headers=headers).json()['opening_channel'] == 'portal'
    assert api.client.put(elsewhere+'/opening-channel',headers=headers,json=payload).status_code == 403

    ticket = {**ticket,'client_key':str(uuid4())}
    opened = api.post('/protocols', ticket)
    assert opened['preferred_channel'] == 'email'
    event = api.get('/protocols/' + opened['id'])['history'][0]
    assert event['action'] == 'public_opened' and event['message'] == ticket['description']
    assert event['notification'] == {'channel':'email','status':'pending'}
    description = api.client.get(base + '/' + opened['id'], headers=headers).json()['history'][0]
    assert description['author'] == 'school' and 'notification' not in description

    monkeypatch.setattr(settings(),'smtp_host','')
    assert api.client.get(base + '/options', headers=headers).json()['opening_channel'] == 'portal'
    fallback = api.post('/protocols', {**ticket,'client_key':str(uuid4())})
    assert fallback['preferred_channel'] == 'portal'
    assert api.get('/protocols/' + fallback['id'])['history'][0]['notification'] is None
    revoked = api.client.put(channel_url,headers=headers,json={'preferred_channel':'portal'}).json()
    assert revoked['opening_channel'] == 'portal'
    assert api.post('/protocols', ticket)['id'] == opened['id']

    assert api.get('/protocols')['items'][0]['id'] == fallback['id']
    reply_url = base + '/' + first['id'] + '/messages'
    reply = {'message':'Retirei o material, obrigada.', 'client_key':str(uuid4())}
    assert api.client.post(reply_url,headers=headers,data=reply).status_code == 201
    top = api.get('/protocols')['items'][0]
    assert top['id'] == first['id']
    assert utc(datetime.fromisoformat(top['updated_at'])) > utc(datetime.fromisoformat(first['updated_at']))
    assert top['version'] == first['version'] + 1
