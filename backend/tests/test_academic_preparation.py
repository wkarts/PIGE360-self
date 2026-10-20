import pytest
from sqlalchemy import func, select
from app import models as m
from app.db import SessionLocal


def request(cat, **changes):
    return {'source_year_id': cat['year']['id'], 'target': {'name': '2027', 'starts_on': '2027-01-01', 'ends_on': '2027-12-31'}, **changes}


def test_prepare_all_classes_preserves_manual_and_repeats_safely(api):
    cat = api.catalogs(capacity=24)
    second = api.post('/class-groups', {k: v for k, v in cat['group'].items() if k in {'unit_id','academic_year_id','grade_id','shift_id','capacity'}} | {'name': '3º Ano B', 'active': False})
    student = api.student(); enrollment = api.enroll(student, cat['group'])
    data = request(cat); preview = api.post('/academic-preparation/preview', data, 200)
    assert preview['create_count'] == 2 and not preview['conflicts']
    assert len(api.get('/academic-years')) == 1  # A prévia não escreve.
    applied = api.post('/academic-preparation/apply', {**data, 'preview_hash': preview['preview_hash']}, 200)
    assert applied['created'] == 2 and applied['reused'] == 0
    repeated = api.post('/academic-preparation/apply', {**data, 'preview_hash': preview['preview_hash']}, 200)
    assert repeated == {**applied, 'created': 0, 'reused': 2}
    groups = [g for g in api.get('/class-groups') if g['academic_year_id'] == applied['academic_year_id']]
    assert {(g['name'], g['capacity'], g['active']) for g in groups} == {('3º Ano A',24,True),('3º Ano B',24,False)}
    assert all(g['unit_id'] == cat['unit']['id'] and g['available'] == 24 for g in groups)
    with SessionLocal() as db:
        assert db.get(m.Enrollment,enrollment['id']).academic_year_id == cat['year']['id']
        assert db.scalar(select(func.count()).select_from(m.Enrollment).where(m.Enrollment.academic_year_id==applied['academic_year_id'])) == 0
        assert db.get(m.ClassGroup,second['id']).active is False
    # A criação manual continua disponível no destino.
    api.post('/class-groups', {'name':'Turma manual','unit_id':cat['unit']['id'],'academic_year_id':applied['academic_year_id'],'grade_id':cat['grade']['id'],'shift_id':cat['shift']['id'],'capacity':20})


def test_source_change_rejects_stale_preview_without_creating_year(api):
    cat=api.catalogs(); data=request(cat); plan=api.post('/academic-preparation/preview',data,200)
    values={k:cat['group'][k] for k in ('name','unit_id','academic_year_id','grade_id','shift_id','capacity','active')};values['capacity']=30
    api.patch('/class-groups/'+cat['group']['id'],{'version':cat['group']['version'],'data':values})
    api.post('/academic-preparation/apply',{**data,'preview_hash':plan['preview_hash']},409)
    assert len(api.get('/academic-years'))==1


def test_conflicting_target_rolls_back_all_classes(api):
    cat=api.catalogs();data=request(cat)
    target=api.post('/academic-years',data['target'])
    api.post('/class-groups',{'name':cat['group']['name'],'unit_id':cat['unit']['id'],'academic_year_id':target['id'],'grade_id':cat['grade']['id'],'shift_id':cat['shift']['id'],'capacity':99})
    plan=api.post('/academic-preparation/preview',data,200)
    assert plan['conflicts']==[cat['group']['name']]
    api.post('/academic-preparation/apply',{**data,'preview_hash':plan['preview_hash']},409)
    assert len(api.get('/class-groups'))==2


@pytest.mark.parametrize('change', ['same_year','dates','closed_target','inactive_ref','foreign_source'])
def test_invalid_context_never_prepares(api,change):
    cat=api.catalogs();data=request(cat);status=409
    if change=='same_year':data['target']['name']='2026';status=422
    if change=='dates':data['target']['ends_on']='2026-01-01';status=422
    if change=='closed_target':api.post('/academic-years',{**data['target'],'status':'closed'})
    if change=='inactive_ref':
        api.patch('/units/'+cat['unit']['id'],{'version':cat['unit']['version'],'data':{'name':cat['unit']['name'],'active':False}})
    if change=='foreign_source':data['source_year_id']='00000000-0000-0000-0000-000000000000';status=404
    api.post('/academic-preparation/preview',data,status)


def test_read_only_cannot_prepare(api,client,admin,school):
    from test_mailcow import new_user
    user=new_user(client,admin,school,role='viewer')
    token=client.post('/api/v1/auth/login',json={'email':user['email'],'password':'Example-only-app-password-2026!'}).json()['access_token']
    cat=api.catalogs();data=request(cat)
    response=client.post(api.base+'/academic-preparation/preview',headers={'Authorization':'Bearer '+token},json=data)
    assert response.status_code==403
