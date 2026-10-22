"""Institution selection must precede effective school-profile authorization."""
import uuid

import pytest

from app import models as m
from app.access_models import SchoolAccessProfile
from app.db import SessionLocal
from conftest import PASSWORD


def account(api,role,permissions=None,linked=True):
    student=api.student('Aluno vinculado sintético')
    guardian=api.guardian(student) if role=='guardian' else None
    person_id=guardian['id'] if guardian else student['person']['id']
    payload={'name':'Acesso familiar sintético','email':uuid.uuid4().hex+'@example.com',
        'password':PASSWORD,'role':role,'school_ids':[api.school['id']],
        'person_id':person_id}
    if permissions is not None:
        profile=api.post('/access-profiles',{'name':'Perfil familiar sintético',
            'base_role':role,'permissions':permissions})
        payload['access_profile_id']=profile['id']
    user=api.post('/users',payload)
    if not linked:
        with SessionLocal.begin() as db:db.get(m.User,user['id']).person_id=None
    response=api.client.post('/api/v1/auth/login',json={'email':user['email'],'password':PASSWORD})
    assert response.status_code==200,response.text
    headers={'Authorization':'Bearer '+response.json()['access_token']}
    return user,headers,student,guardian


@pytest.mark.parametrize('role',['student','guardian'])
@pytest.mark.parametrize('permissions',[['read'],['read','profile.self']])
def test_restricted_profiles_cannot_bypass_permissions_by_omitting_school(api,role,permissions):
    _,headers,student,_=account(api,role,permissions)
    paths=['/family/context','/profile/learning',
        '/profile/learning/'+student['id']+'/report.pdf',
        '/family/students/'+student['id']+'/charges',
        '/family/students/'+student['id']+'/documents/'+str(uuid.uuid4())]
    if 'profile.self' not in permissions:paths.append('/profile/context')
    for selected in ({'X-School-ID':api.school['id']},{}, {'X-School-ID':api.school['id']}):
        for path in paths:
            result=api.client.get('/api/v1'+path,headers={**headers,**selected})
            assert result.status_code==403,(role,permissions,selected,path,result.text)
    result=api.client.get('/api/v1/profile/learning',params={'school_id':api.school['id']},headers=headers)
    assert result.status_code==403,result.text


@pytest.mark.parametrize('role',['student','guardian'])
@pytest.mark.parametrize('custom',[False,True])
def test_authorized_profiles_keep_only_their_linked_students(api,role,custom):
    permissions=['read','profile.self',role+'.self.read'] if custom else None
    _,headers,student,_=account(api,role,permissions)
    other=api.student('Aluno de outra família')
    api.guardian(other,'Outro responsável sintético')
    for selected in ({'X-School-ID':api.school['id']},{},{'X-School-ID':api.school['id']}):
        request_headers={**headers,**selected}
        for path,key in [('/family/context','id'),('/profile/learning','student_id')]:
            result=api.client.get('/api/v1'+path,headers=request_headers)
            assert result.status_code==200,result.text
            assert [row[key] for row in result.json()['students']]==[student['id']]
        for path in ['/profile/learning/'+other['id']+'/report.pdf',
                     '/family/students/'+other['id']+'/charges',
                     '/family/students/'+other['id']+'/documents/'+str(uuid.uuid4())]:
            result=api.client.get('/api/v1'+path,headers=request_headers)
            assert result.status_code==404,(path,result.text)
    result=api.client.get('/api/v1/family/students/'+student['id']+'/charges',headers=headers)
    assert result.status_code==(200 if role=='guardian' else 403),result.text


@pytest.mark.parametrize('role',['student','guardian'])
def test_school_selection_is_explicit_and_rechecks_each_institution_profile(api,admin,role):
    user,headers,student,_=account(api,role,['read','profile.self',role+'.self.read'])
    result=api.client.post('/api/v1/schools',headers=admin,json={
        'company_id':api.school['company_id'],'name':'Instituição adicional sintética'})
    assert result.status_code==201,result.text
    other_school=result.json()
    for path in ('/family/context','/profile/learning','/profile/context'):
        denied=api.client.get('/api/v1'+path,headers={**headers,'X-School-ID':other_school['id']})
        assert denied.status_code==403,denied.text
    with SessionLocal.begin() as db:
        profile=SchoolAccessProfile(school_id=other_school['id'],name='Restrito na segunda escola',
            base_role=role,permissions=['read'])
        db.add(profile);db.flush()
        db.add(m.SchoolAccess(user_id=user['id'],school_id=other_school['id'],access_profile_id=profile.id))
    for path in ('/family/context','/profile/learning','/profile/context'):
        ambiguous=api.client.get('/api/v1'+path,headers=headers)
        assert ambiguous.status_code==422,ambiguous.text
        denied=api.client.get('/api/v1'+path,headers={**headers,'X-School-ID':other_school['id']})
        assert denied.status_code==403,denied.text
    for path,key in [('/family/context','id'),('/profile/learning','student_id')]:
        result=api.client.get('/api/v1'+path,headers={**headers,'X-School-ID':api.school['id']})
        assert result.status_code==200,result.text
        assert [row[key] for row in result.json()['students']]==[student['id']]
    conflict=api.client.get('/api/v1/profile/learning',params={'school_id':other_school['id']},
        headers={**headers,'X-School-ID':api.school['id']})
    assert conflict.status_code==409,conflict.text
    # An authorized second school still cannot use a person from the first one.
    with SessionLocal.begin() as db:
        access=db.get(m.SchoolAccess,(user['id'],other_school['id']));access.access_profile_id=None
    for path in ('/family/context','/profile/learning'):
        result=api.client.get('/api/v1'+path,headers={**headers,'X-School-ID':other_school['id']})
        assert result.status_code==200 and result.json()['students']==[],result.text


@pytest.mark.parametrize('role',['student','guardian'])
def test_missing_person_link_does_not_fall_back_to_matching_email(api,role):
    user,headers,student,guardian=account(api,role,linked=False)
    with SessionLocal.begin() as db:
        db.get(m.Person,guardian['id'] if guardian else student['person']['id']).email=user['email']
    for selected in ({},{'X-School-ID':api.school['id']}):
        for path in ('/family/context','/profile/learning'):
            result=api.client.get('/api/v1'+path,headers={**headers,**selected})
            assert result.status_code==200 and result.json()['students']==[],result.text


@pytest.mark.parametrize('role',['student','guardian'])
def test_disabled_custom_profile_is_denied_without_optional_school_header(api,role):
    user,headers,_,_=account(api,role,['read','profile.self',role+'.self.read'])
    with SessionLocal.begin() as db:
        access=db.get(m.SchoolAccess,(user['id'],api.school['id']))
        db.get(SchoolAccessProfile,access.access_profile_id).active=False
    for selected in ({},{'X-School-ID':api.school['id']}):
        for path in ('/family/context','/profile/learning'):
            result=api.client.get('/api/v1'+path,headers={**headers,**selected})
            assert result.status_code==403,result.text


@pytest.mark.parametrize('role',['student','guardian'])
def test_revoked_school_access_never_returns_family_data(api,role):
    user,headers,_,_=account(api,role)
    with SessionLocal.begin() as db:db.get(m.SchoolAccess,(user['id'],api.school['id'])).active=False
    for path in ('/family/context','/profile/learning'):
        result=api.client.get('/api/v1'+path,headers=headers)
        assert result.status_code==200 and result.json()['students']==[],result.text
        result=api.client.get('/api/v1'+path,headers={**headers,'X-School-ID':api.school['id']})
        assert result.status_code==403,result.text


@pytest.mark.parametrize('path',['/institution/intake','/institution/lookups/cep'])
def test_related_unscoped_institution_operations_keep_custom_restrictions(api,monkeypatch,path):
    from app import lookups
    called=[]
    monkeypatch.setattr(lookups,'lookup',lambda *args:called.append(args) or {'synthetic':True})
    profile=api.post('/access-profiles',{'name':'Direção restrita sintética',
        'base_role':'direction','permissions':['read']})
    user=api.post('/users',{'name':'Gestor restrito sintético','email':uuid.uuid4().hex+'@example.com',
        'password':PASSWORD,'role':'direction','access_profile_id':profile['id']})
    response=api.client.post('/api/v1/auth/login',json={'email':user['email'],'password':PASSWORD})
    assert response.status_code==200,response.text
    headers={'Authorization':'Bearer '+response.json()['access_token']}
    for selected in ({'X-School-ID':api.school['id']},{}):
        result=api.client.request('POST' if path.endswith('/cep') else 'GET','/api/v1'+path,
            headers={**headers,**selected},**({'json':{'value':'40020000'}} if path.endswith('/cep') else {}))
        assert result.status_code==403,result.text
    assert called==[]


@pytest.mark.parametrize('path',['/institution/intake','/institution/lookups/cep'])
def test_related_operations_allow_legitimate_context_but_require_unambiguous_access(api,admin,monkeypatch,path):
    from app import lookups
    monkeypatch.setattr(lookups,'lookup',lambda *args:{'synthetic':True})
    profile=api.post('/access-profiles',{'name':'Direção autorizada sintética',
        'base_role':'direction','permissions':['read','schools.manage']})
    user=api.post('/users',{'name':'Gestor autorizado sintético','email':uuid.uuid4().hex+'@example.com',
        'password':PASSWORD,'role':'direction','access_profile_id':profile['id']})
    response=api.client.post('/api/v1/auth/login',json={'email':user['email'],'password':PASSWORD})
    assert response.status_code==200,response.text
    headers={'Authorization':'Bearer '+response.json()['access_token']}
    def call(selected):
        return api.client.request('POST' if path.endswith('/cep') else 'GET','/api/v1'+path,
            headers=selected,**({'json':{'value':'40020000'}} if path.endswith('/cep') else {}))
    assert call(headers).status_code==200
    assert call(admin).status_code==200
    result=api.client.post('/api/v1/schools',headers=admin,json={
        'company_id':api.school['company_id'],'name':'Seleção institucional sintética'})
    assert result.status_code==201,result.text
    with SessionLocal.begin() as db:db.add(m.SchoolAccess(user_id=user['id'],school_id=result.json()['id']))
    assert call(headers).status_code==422
    assert call({**headers,'X-School-ID':api.school['id']}).status_code==200
    with SessionLocal.begin() as db:
        for access in db.query(m.SchoolAccess).filter_by(user_id=user['id']):access.active=False
    assert call(headers).status_code==403


@pytest.mark.parametrize('field',['active','legal'])
def test_guardian_link_restrictions_apply_with_and_without_selected_school(api,field):
    _,headers,student,guardian=account(api,'guardian')
    with SessionLocal.begin() as db:
        link=db.query(m.GuardianLink).filter_by(person_id=guardian['id'],student_id=student['id']).one()
        setattr(link,field,False)
    for selected in ({},{'X-School-ID':api.school['id']}):
        for path in ('/family/context','/profile/learning'):
            result=api.client.get('/api/v1'+path,headers={**headers,**selected})
            assert result.status_code==200 and result.json()['students']==[],result.text


def test_two_children_have_independent_financial_permissions_and_revoked_access(api):
    _,headers,first,guardian=account(api,'guardian')
    second=api.student('Segundo filho sintético')
    link=api.post('/students/'+second['id']+'/guardians',{'person_id':guardian['id'],'legal':True,'financial':False})
    result=api.client.get('/api/v1/family/context',headers=headers)
    by_id={r['id']:r for r in result.json()['students']}
    assert by_id[first['id']]['financial_authorized'] is True
    assert by_id[second['id']]['financial_authorized'] is False
    assert api.client.get('/api/v1/family/students/'+second['id']+'/charges',headers=headers).status_code==403
    api.patch('/students/'+second['id']+'/guardians/'+link['id'],{'version':link['version'],'data':{'person_id':guardian['id'],'legal':True,'financial':False,'active':False}})
    assert second['id'] not in [r['id'] for r in api.client.get('/api/v1/family/context',headers=headers).json()['students']]
    assert api.client.get('/api/v1/family/students/'+second['id']+'/charges',headers=headers).status_code==404
