"""Publicação real, audiências por vínculo e isolamento entre escolas."""
from datetime import timedelta
import uuid
from sqlalchemy import select
from app import models as m
from app.db import SessionLocal, now
from app.school_community import SchoolCommunityPost
from app.security import hash_password
from conftest import API, PASSWORD
from test_online import online


def post(api,**changes):
    return api.post('/community-posts',{'title':'Notícia da escola','content':'Conteúdo completo destinado à comunidade escolar.','status':'published','audience':'public',**changes})


def public(api,query=''):
    response=api.client.get('/api/v1/public/schools/'+api.school['id']+'/community-feed'+query)
    assert response.status_code==200,response.text
    return response.json()


def role_api(api,role,linked=True):
    email=uuid.uuid4().hex+'@example.com'
    with SessionLocal() as db:
        user=m.User(name='Usuário da comunidade',email=email,role=role,password_hash=hash_password(PASSWORD),active=True)
        db.add(user);db.flush()
        if linked:db.add(m.SchoolAccess(user_id=user.id,school_id=api.school['id']))
        db.commit()
    response=api.client.post('/api/v1/auth/login',json={'email':email,'password':PASSWORD})
    assert response.status_code==200,response.text
    return API(api.client,{'Authorization':'Bearer '+response.json()['access_token']},api.school)


def test_public_feed_only_published_public_current_items(api):
    visible=post(api)
    post(api,title='Rascunho oculto',status='draft')
    post(api,title='Mensagem privada',audience='authenticated')
    post(api,title='Publicação futura',publish_at=(now()+timedelta(days=1)).isoformat())
    expired=post(api,title='Publicação encerrada')
    with SessionLocal() as db:
        row=db.get(SchoolCommunityPost,expired['id']);row.publish_at=now()-timedelta(days=2);row.expires_at=now()-timedelta(days=1);db.commit()
    items=public(api)['items'];assert [row['id'] for row in items]==[visible['id']]
    assert 'version' not in items[0] and 'created_by' not in items[0]


def test_role_audiences_require_school_membership(api):
    for audience in ('public','authenticated','students','guardians','teachers'):post(api,title='Publicação '+audience,audience=audience)
    teacher=role_api(api,'teacher')
    assert {item['audience'] for item in teacher.get('/community-feed')['items']}=={'public','authenticated','teachers'}
    student=role_api(api,'student');assert {item['audience'] for item in student.get('/community-feed')['items']}=={'public','authenticated','students'}
    outsider=role_api(api,'teacher',linked=False);outsider.call('GET','/community-feed',expect=403)
    teacher.post('/community-posts',{'title':'Tentativa de publicação','content':'Professor não autorizado para publicação.'},403)


def test_guardian_portal_never_gets_teacher_feed_or_other_school(online):
    api=online['api']
    for audience in ('public','authenticated','guardians','teachers','students'):post(api,title='Mensagem '+audience,audience=audience)
    response=online['parent'].get('/api/v1/portal/community-feed?school_id=another-school')
    assert response.status_code==200
    items=response.json()['items']
    assert {item['audience'] for item in items}=={'public','authenticated','guardians'}
    assert {item['school_id'] for item in items}=={api.school['id']}
    assert online['parent'].get('/api/v1/schools/'+api.school['id']+'/community-posts').status_code==401


def test_events_validate_schedule_and_text(api):
    base={'title':'Reunião de responsáveis','content':'Encontro para acompanhar as atividades do semestre.','kind':'event'}
    api.post('/community-posts',base,422)
    api.post('/community-posts',{**base,'event_start':'2029-02-10T14:00:00'},422)
    api.post('/community-posts',{**base,'event_start':'2029-02-10T14:00:00-03:00','event_end':'2029-02-10T13:00:00-03:00'},422)
    api.post('/community-posts',{**base,'kind':'news','content':'<script>alert(1)</script>'},422)
    item=post(api,kind='event',event_start='2029-02-10T14:00:00-03:00',event_end='2029-02-10T16:00:00-03:00',location='Auditório da escola')
    assert public(api,'?kind=event&upcoming=true')['items'][0]['id']==item['id']


def test_update_uses_version_and_archive_removes_publication(api):
    item=post(api)
    keys=('title','summary','content','kind','audience','status','pinned','publish_at','expires_at','event_start','event_end','location','version')
    data={key:item[key] for key in keys}
    api.patch('/community-posts/'+item['id'],{**data,'version':data['version']+1},409)
    api.call('DELETE','/community-posts/'+item['id']+'?version='+str(item['version']),expect=409)
    updated=api.patch('/community-posts/'+item['id'],{**data,'status':'archived'})
    assert updated['version']==item['version']+1 and public(api)['total']==0
    draft=post(api,status='draft');api.call('DELETE','/community-posts/'+draft['id']+'?version='+str(draft['version']))
    assert all(row['id']!=draft['id'] for row in api.get('/community-posts')['items'])


def test_search_pagination_and_cross_school_isolation(api):
    for index in range(4):post(api,title=f'Oficina de leitura {index}')
    assert public(api,'?q=Oficina&page=2&page_size=2')['total']==4
    assert len(public(api,'?q=Oficina&page=2&page_size=2')['items'])==2
    assert public(api,'?q=%25')['total']==0
    with SessionLocal() as db:
        school=m.School(company_id=api.school['company_id'],name='Outra unidade',active=True);db.add(school);db.flush()
        row=db.scalar(select(SchoolCommunityPost).where(SchoolCommunityPost.school_id==api.school['id']))
        other=SchoolCommunityPost(school_id=school.id,title='Privado de outra unidade',content='Mensagem da outra unidade escolar.',summary='',kind='news',audience='public',status='published',pinned=False,publish_at=now(),location='',created_by=row.created_by,updated_by=row.updated_by);db.add(other);db.commit()
    assert public(api)['total']==4


def test_secretary_cannot_publish(api):
    secretary=role_api(api,'secretary')
    secretary.post('/community-posts',{'title':'Publicação sem permissão','content':'Uma mensagem que não pode ser publicada.'},403)
    secretary.call('GET','/community-posts',expect=403)
