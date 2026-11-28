from test_user_access_profiles import create, login


def test_teacher_routines_bound_to_school_and_enforced_on_both_diary_routes(api, client, admin):
    from app.db import SessionLocal
    from app.models import SchoolAccess

    school_id = api.school['id']
    group = api.catalogs()['group']
    person = api.post('/teachers', {'person': {'name': 'Docente de homologação'}})['person']
    user = create(api, 'teacher', person_id=person['id'])
    headers = login(api, user)
    assert set(user['teacher_routines']) == {'agenda', 'diary', 'materials', 'mail', 'news'}
    other = client.post('/api/v1/schools', headers=admin, json={
        'company_id':api.school['company_id'], 'name':'Segunda instituição de rotinas'}).json()
    with SessionLocal() as db:
        db.add(SchoolAccess(user_id=user['id'], school_id=other['id']))
        db.commit()
    assignment = api.post('/teacher-assignments', {'teacher_person_id': person['id'],
                          'class_group_id': group['id'], 'subject_name':'Ciências'})
    component = api.post('/curriculum-components', {'name':'Ciências'})
    diary = api.post('/diaries', {'teacher_assignment_id': assignment['id'],
                     'component_id':component['id'], 'class_group_id': group['id']})
    student = api.student()
    api.guardian(student)
    api.move(api.enroll(student, group), 'activate')
    assert client.get('/api/v1/profile/context', headers=headers).json()['assignments'][0]['students'][0]['id'] == student['id']
    api.post('/diaries/'+diary['id']+'/lessons', {'lesson_date':'2026-11-27', 'content':'Respiração'})
    feed = api.base+'/community-feed'
    prefix = '/api/v1/teacher/schools/' + school_id
    agenda = prefix+'/programacao?week=2026-11-27'
    assignments = prefix+'/atribuicoes?week=2026-11-27'
    form = {'name':user['name'], 'person_id':person['id'], 'role':'teacher', 'active':True,
            'version':user['version'], 'teacher_routines':['diary']}
    path = '/users/'+user['id']
    assert client.get(agenda, headers=headers).json()['events'][0]['title']=='Respiração'
    api.patch(path, form, expect=422)
    changed = api.patch(path, {**form,'reason':'Liberar somente diário'})
    assert changed['teacher_routines']==['diary']
    assert client.get('/api/v1/auth/me',headers=headers).json()['teacher_routines']==['diary']
    assert client.get('/api/v1/auth/me',headers={**headers,'X-School-Id':other['id']}).json()['teacher_routines']==user['teacher_routines']
    assert client.get(agenda, headers=headers).status_code==403
    permitted = client.get(assignments, headers=headers).json()
    assert permitted['events']==[] and permitted['assignments'][0]['class_group_id']==group['id']
    assert client.get(feed,headers=headers).status_code==403
    assert client.get(feed,headers=admin).status_code==200
    material = {'client_key':'f2a99130-d6a3-45c6-930c-c733be877024','kind':'Atividade',
                'title':'Observação','body':'Descreva a atividade.'}
    for base in (prefix,api.base):
        diary_path = base+'/diaries/'+diary['id']
        assert client.get(diary_path,headers=headers).status_code==200
        assert client.get(diary_path+'/materials',headers=headers).status_code==403
        assert client.post(diary_path+'/materials',headers=headers,json=material).status_code==403
        assert client.get(diary_path+'/materials/'+material['client_key']+'/print.pdf',headers=headers).status_code==403
    form['version'] = changed['version']
    api.patch(path, {**form,'teacher_routines':['materials'],'reason':'Seleção incompatível'},expect=422)
    current = api.patch(path, {key:value for key,value in form.items() if key!='teacher_routines'})
    assert current['teacher_routines']==['diary']
    api.patch(path, {**form,'teacher_routines':['agenda'],'version':current['version'],'reason':'Somente programação'})
    assert client.get(agenda,headers=headers).json()['events'][0]['title']=='Respiração'
    assert client.get(assignments,headers=headers).status_code==403
    assert client.get('/api/v1/profile/context',headers=headers).json()['assignments'][0]['students']==[]
    for base in (prefix,api.base):
        assert client.get(base+'/diaries/'+diary['id'],headers=headers).status_code==403


def test_routines_cannot_expand_custom_profile_or_skip_admin_manage(api, client, admin):
    profile = api.post('/access-profiles', {'name':'Docente sem diário', 'base_role':'teacher',
                       'permissions':['profile.self', 'read']})
    person = api.post('/persons',{'name':'Docente com perfil restrito'})
    user = create(api, 'teacher', access_profile_id=profile['id'], person_id=person['id'],
                  teacher_routines=['diary','materials','news'])
    headers = login(api, user)
    me = client.get('/api/v1/auth/me', headers=headers).json()
    assert me['teacher_routines']==['news']
    prefix = '/api/v1/teacher/schools/'+api.school['id']
    assert client.get(prefix+'/atribuicoes?week=2026-11-27', headers=headers).status_code==403
    assert client.get(api.base+'/community-feed', headers=headers).status_code==200
    form={'name':user['name'], 'person_id':person['id'], 'role':'teacher', 'active':True,
          'version':user['version'], 'teacher_routines':[], 'reason':'Suspender rotinas'}
    assert client.patch(api.base+'/users/'+user['id'], headers=headers, json=form).status_code==403
    updated = api.patch('/users/'+user['id'], form)
    assert updated['teacher_routines']==[] and updated['access_profile_id']==profile['id']
    assert client.get('/api/v1/auth/me', headers=headers).json()['teacher_routines']==[]
    assert client.get(api.base+'/community-feed', headers=headers).status_code==403
    assert client.get('/api/v1/profile/context', headers=headers).json()['assignments']==[]
    assert any(row['id'] == api.school['id'] for row in client.get('/api/v1/teacher/schools', headers=headers).json())
    api.patch('/access-profiles/'+profile['id'], {'name':profile['name'], 'base_role':'teacher',
              'permissions':profile['permissions'], 'active':False,'reason':'Suspender perfil docente','version':profile['version']})
    assert client.get('/api/v1/teacher/schools', headers=headers).json()==[]
    assert client.post(api.base+'/users',headers=admin,json={
        'name':'Teste inválido','email':'invalido@example.test','role':'secretary','teacher_routines':['mail']
    }).status_code==422
