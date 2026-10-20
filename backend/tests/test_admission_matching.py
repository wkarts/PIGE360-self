import pytest
from sqlalchemy import select
from app import models as m
from app.db import SessionLocal
from test_online import online, draft, submit, CPF


def test_auto_search_uses_separate_student_and_parent_identities(online):
    o=online;api=o['api'];a=submit(o,draft(o))
    student=api.post('/students',{'person':{'name':'Aluno Online','birth_date':'2017-03-10'}})
    # Pessoa preexistente ainda sem a classificação de responsável.
    parent=api.post('/persons',{'name':'Responsável Teste','cpf':CPF,'email':o['account']['email']})
    result=api.get('/admissions/'+a['id']+'/matches')
    assert [p['id'] for p in result['students']['items']]==[student['id']]
    assert [p['id'] for p in result['guardians']['items']]==[parent['id']]
    assert 'Nascimento coincidente' in result['students']['items'][0]['reasons']
    with SessionLocal() as db:
        assert db.get(m.Admission,a['id']).student_id is None
        assert not db.get(m.Person,parent['id']).is_guardian
    approved=api.post('/admissions/'+a['id']+'/approve',{'version':a['version'],'identity_confirmed':True,'reason':'Identidades e vínculos conferidos manualmente.','existing_student_id':student['id'],'existing_guardian_id':parent['id']},200)
    assert approved['student_id']==student['id']


def test_accents_formatted_cpf_independent_queries_and_ambiguity(online):
    o=online;api=o['api'];a=submit(o,draft(o))
    first=api.post('/students',{'person':{'name':'Áluno  Ónline','birth_date':'2017-03-10'}})
    second=api.post('/students',{'person':{'name':'Aluno Online','birth_date':'2018-05-15'}})
    parent=api.post('/persons',{'name':'Responsável Teste','cpf':CPF})
    result=api.get('/admissions/'+a['id']+'/matches')
    assert {p['id'] for p in result['students']['items']}=={first['id'],second['id']}
    assert 'Nascimento divergente' in next(p for p in result['students']['items'] if p['id']==second['id'])['conflicts']
    queried=api.get('/admissions/'+a['id']+'/matches?student_q=ALUNO&guardian_q=529.982.247-25')
    assert len(queried['students']['items'])==2
    assert [p['id'] for p in queried['guardians']['items']]==[parent['id']]


def test_candidates_exclude_inactive_archived_and_other_schools(online,client,admin):
    o=online;api=o['api'];a=submit(o,draft(o))
    good=api.student('Aluno Online')
    hidden=api.student('Aluno Online')
    with SessionLocal() as db:
        db.get(m.Student,hidden['id']).status='archived'
        other=m.School(company_id=api.school['company_id'],name='Outra escola sintética');db.add(other);db.flush()
        person=m.Person(school_id=other.id,name='Aluno Online',birth_date=__import__('datetime').date(2017,3,10));db.add(person);db.flush()
        db.add(m.Student(school_id=other.id,person_id=person.id,number='OUTRO-1'));db.commit()
    result=api.get('/admissions/'+a['id']+'/matches')
    assert [p['id'] for p in result['students']['items']]==[good['id']]
    assert all(p['id']!=person.id for p in result['guardians']['items'])


def test_no_identity_never_lists_all_people(online):
    o=online;api=o['api'];a=draft(o);api.student('Qualquer pessoa')
    with SessionLocal() as db:
        row=db.get(m.Admission,a['id']);row.student_data={};row.guardian_snapshot={};db.commit()
    result=api.get('/admissions/'+a['id']+'/matches')
    assert result['students']['items']==result['guardians']['items']==[]


def test_same_cpf_requires_manual_identity_review(online):
    o=online;api=o['api'];a=draft(o)
    with SessionLocal() as db:
        row=db.get(m.Admission,a['id']);row.student_data={**row.student_data,'cpf':CPF};row.guardian_snapshot={'name':'Responsável Teste','cpf':CPF};db.commit()
    assert len(api.get('/admissions/'+a['id']+'/matches')['warnings'])==1


def test_restricted_profile_cannot_enumerate_candidates(online,client,admin):
    from test_mailcow import new_user
    o=online;api=o['api'];a=draft(o)
    user=new_user(client,admin,api.school,role='viewer')
    token=client.post('/api/v1/auth/login',json={'email':user['email'],'password':'Example-only-app-password-2026!'}).json()['access_token']
    assert client.get(api.base+'/admissions/'+a['id']+'/matches',headers={'Authorization':'Bearer '+token}).status_code==403
