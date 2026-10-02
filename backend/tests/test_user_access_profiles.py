"""Permissões, ciclo de vida e isolamento dos acessos por instituição."""
import uuid
from sqlalchemy import select
from conftest import PASSWORD


def create(api, role='secretary', **values):
    return api.post('/users', {'name':'Usuário de acesso', 'email':uuid.uuid4().hex+'@example.com', 'password':PASSWORD, 'role':role, 'school_ids':[api.school['id']], **values})


def login(api, user):
    response=api.client.post('/api/v1/auth/login',json={'email':user['email'],'password':PASSWORD})
    assert response.status_code==200,response.text
    return {'Authorization':'Bearer '+response.json()['access_token'], 'X-School-Id':api.school['id']}


def action(api, user, action, expect=200, **values):
    return api.post('/users/'+user['id']+'/lifecycle', {'action':action,'version':user['version'],'reason':'Revisão de acesso autorizada','confirmation':user['email'],**values},expect=expect)


def test_user_list_and_mutation_are_school_scoped(api, client, admin):
    user=create(api)
    other=client.post('/api/v1/schools',headers=admin,json={'company_id':api.school['company_id'],'name':'Outra instituição '+uuid.uuid4().hex}).json()
    assert client.get('/api/v1/schools/'+other['id']+'/users',headers=admin).status_code==200
    assert user['id'] not in {u['id'] for u in client.get('/api/v1/schools/'+other['id']+'/users',headers=admin).json()}
    result=client.patch('/api/v1/schools/'+other['id']+'/users/'+user['id'],headers=admin,json={'name':user['name'],'role':user['role'],'active':False,'school_ids':[other['id']],'version':user['version'],'reason':'Não pertence a esta instituição'})
    assert result.status_code==404,result.text
    result=client.get('/api/v1/users?school_id='+api.school['id'],headers=admin)
    assert result.status_code==200,result.text
    assert all(u['school_ids']==[api.school['id']] for u in result.json())
    result=client.get('/api/v1/users',headers=admin)
    assert result.status_code==422,result.text


def test_custom_profile_enforces_restrictions_immediately(api):
    profile=api.post('/access-profiles',{'name':'Consulta secretaria','base_role':'secretary','permissions':['read','people.read','profile.read']})
    user=create(api,access_profile_id=profile['id'])
    headers=login(api,user)
    result=api.client.get(api.base+'/persons',headers=headers)
    assert result.status_code==200,result.text
    result=api.client.post(api.base+'/persons',headers=headers,json={'name':'Cadastro negado'})
    assert result.status_code==403,result.text
    me=api.client.get('/api/v1/auth/me',headers=headers).json()
    assert me['permissions']==['people.read','profile.read','read']
    assert me['access_profile_name']=='Consulta secretaria'
    changed=api.patch('/access-profiles/'+profile['id'], {'name':profile['name'],'base_role':'secretary','permissions':['read','people.read','people.write','profile.read'],'active':True,'version':profile['version'],'reason':'Permitir cadastro autorizado'})
    result=api.client.post(api.base+'/persons',headers=headers,json={'name':'Cadastro autorizado'})
    assert result.status_code==201,result.text
    api.patch('/access-profiles/'+profile['id'], {'name':profile['name'],'base_role':'secretary','permissions':changed['permissions'],'active':False,'version':changed['version'],'reason':'Suspender permissões do grupo'})
    assert api.client.get(api.base+'/persons',headers=headers).status_code==403


def test_profile_rejects_escalation_cross_school_and_incompatible_role(api, client, admin):
    api.post('/access-profiles',{'name':'Elevação inválida','base_role':'viewer','permissions':['users.manage']},expect=422)
    api.post('/access-profiles',{'name':'Administrador personalizado','base_role':'admin','permissions':['users.manage']},expect=422)
    profile=api.post('/access-profiles',{'name':'Consulta','base_role':'viewer','permissions':['read','profile.read']})
    api.post('/users',{'name':'Perfil incompatível','email':uuid.uuid4().hex+'@example.com','password':PASSWORD,'role':'secretary','access_profile_id':profile['id']},expect=422)
    other=client.post('/api/v1/schools',headers=admin,json={'company_id':api.school['company_id'],'name':'Escola isolada '+uuid.uuid4().hex}).json()
    r=client.post('/api/v1/schools/'+other['id']+'/users',headers=admin,json={'name':'Perfil cruzado','email':uuid.uuid4().hex+'@example.com','password':PASSWORD,'role':'viewer','access_profile_id':profile['id']})
    assert r.status_code==422,r.text


def test_direction_cannot_create_or_modify_admin(api):
    direction=create(api,'direction')
    headers=login(api,direction)
    r=api.client.post(api.base+'/users',headers=headers,json={'name':'Administrador indevido','email':uuid.uuid4().hex+'@example.com','password':PASSWORD,'role':'admin'})
    assert r.status_code==403,r.text


def test_restricted_manager_cannot_delegate_more_permissions(api):
    profile=api.post('/access-profiles', {'name':'Gestor restrito','base_role':'direction','permissions':['read','users.manage']})
    manager=create(api,'direction',access_profile_id=profile['id'])
    headers=login(api,manager)
    r=api.client.post(api.base+'/users',headers=headers,json={'name':'Acesso excedente','email':uuid.uuid4().hex+'@example.com','password':PASSWORD,'role':'secretary'})
    assert r.status_code==403,r.text
    r=api.client.post(api.base+'/access-profiles',headers=headers,json={'name':'Delegação indevida','base_role':'secretary','permissions':['people.write']})
    assert r.status_code==403,r.text
    r=api.client.post(api.base+'/access-profiles',headers=headers,json={'name':'Delegação limitada','base_role':'viewer','permissions':['read']})
    assert r.status_code==201,r.text
    admin_user=create(api,'admin')
    r=api.client.post(api.base+'/users/'+admin_user['id']+'/lifecycle',headers=headers,json={'action':'deactivate','version':admin_user['version'],'reason':'Tentativa sem autorização'})
    assert r.status_code==403,r.text


def test_access_archive_restore_and_permanent_delete_preserve_other_school(api, client, admin):
    from app.db import SessionLocal
    from app.models import SchoolAccess, User
    user=create(api,'viewer')
    other=client.post('/api/v1/schools',headers=admin,json={'company_id':api.school['company_id'],'name':'Unidade extra '+uuid.uuid4().hex}).json()
    with SessionLocal() as db:
        db.add(SchoolAccess(user_id=user['id'],school_id=other['id']));db.commit()
    headers=login(api,user)
    action(api,user,'archive')
    assert client.get(api.base+'/dashboard',headers=headers).status_code==403
    other_headers={**headers,'X-School-Id':other['id']}
    assert client.get('/api/v1/schools/'+other['id']+'/dashboard',headers=other_headers).status_code==200
    current=next(u for u in api.get('/users') if u['id']==user['id'])
    action(api,current,'restore')
    current=next(u for u in api.get('/users') if u['id']==user['id'])
    assert client.get(api.base+'/dashboard',headers=headers).status_code==200
    action(api,current,'delete_account',expect=409)
    action(api,current,'delete_access')
    assert client.get(api.base+'/dashboard',headers=headers).status_code==403
    assert client.get('/api/v1/schools/'+other['id']+'/dashboard',headers=other_headers).status_code==200
    with SessionLocal() as db:
        assert db.get(User,user['id'])
        assert db.get(SchoolAccess,(user['id'],other['id']))


def test_delete_account_requires_confirmation_and_preserves_history(api):
    from app.db import SessionLocal
    from app.models import User
    pristine=create(api,'viewer')
    action(api,pristine,'delete_account',expect=422,confirmation='incorreto')
    action(api,pristine,'delete_account')
    with SessionLocal() as db:
        assert db.get(User,pristine['id']) is None
    used=create(api,'viewer');login(api,used)
    assert api.get('/users/'+used['id']+'/lifecycle')['can_delete_account'] is False
    action(api,used,'delete_account',expect=409)


def test_self_changes_stale_version_and_profile_delete_guard(api):
    me=api.client.get('/api/v1/auth/me',headers={**api.headers,'X-School-Id':api.school['id']}).json()
    self_access=next(u for u in api.get('/users') if u['id']==me['id'])
    action(api,self_access,'deactivate',expect=422)
    user=create(api,'viewer')
    action(api,user,'deactivate')
    action(api,user,'activate',expect=409)
    profile=api.post('/access-profiles',{'name':'Perfil protegido','base_role':'viewer','permissions':['read','profile.read']})
    linked=create(api,'viewer',access_profile_id=profile['id'])
    api.post('/access-profiles/'+profile['id']+'/delete',{'action':'delete','version':profile['version'],'reason':'Excluir perfil utilizado','confirmation':profile['name']},expect=409)
    action(api,linked,'delete_access')
    api.post('/access-profiles/'+profile['id']+'/delete',{'action':'delete','version':profile['version'],'reason':'Excluir perfil sem vínculos','confirmation':profile['name']},expect=200)
