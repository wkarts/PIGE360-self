import json
import uuid
from sqlalchemy import select
from app.db import SessionLocal
from app import models as m


def save(api, data, expected=200):
    return api.post('/person-dossiers',data,expect=expected)


def test_student_and_mother_single_identity_bidirectional_and_flags_independent(api):
    data=save(api,{'person':{'name':'Aluno ficha','birth_date':'2017-01-02','person_types':['student']},'family':[{'direction':'guardian','new_person':{'name':'Maria familiar','person_types':['mother']},'relationship':'Mãe'}]})
    person=data['person']; student=data['profiles']['student'];link=data['family']['items'][0]
    assert not link['legal'] and not link['financial'] and not link['pickup']
    mother=api.get('/persons/'+link['peer']['id']+'/dossier')
    assert mother['family']['total']==1
    inverse=mother['family']['items'][0]
    assert inverse['id']==link['id'] and inverse['direction']=='student' and inverse['peer']['id']==person['id']
    assert 'mother' in mother['person']['person_types']
    update=save(api,{'person_id':mother['person']['id'],'version':mother['person']['version'],'person':{'phone':'5575999990011'},'family':[{'link_id':link['id'],'version':link['version'],'direction':'student','relationship':'Mãe','legal':True,'financial':True}]})
    reflected=api.get('/persons/'+person['id']+'/family')['items'][0]
    assert reflected['legal'] and reflected['financial'] and not reflected['pickup']
    assert reflected['peer']['phone']=='5575999990011'
    assert api.get('/students/'+student['id'])['guardians'][0]['id']==link['id']


def test_reverse_new_student_and_one_guardian_many_students(api):
    parent=save(api,{'person':{'name':'Pai cadastro','person_types':['guardian']},'family':[{'direction':'student','new_person':{'name':'Filho novo','birth_date':'2016-03-10'},'relationship':'Pai','pickup':True}]})
    pupil=api.student('Outro filho')
    result=save(api,{'person_id':parent['person']['id'],'version':parent['person']['version'],'person':{},'family':[{'direction':'student','person_id':pupil['person']['id'],'relationship':'Pai','financial':True}]})
    assert result['family']['total']==2
    assert api.get('/persons/'+pupil['person']['id']+'/family')['items'][0]['financial']


def test_transaction_rolls_back_person_profiles_and_new_relative(api):
    name='Rollback '+uuid.uuid4().hex
    existing=api.student()
    save(api,{'person':{'name':name,'birth_date':'2014-01-02','person_types':['student','teacher']},'profiles':{'teacher':{'data':{'degree_course':'História'}}},'family':[{'direction':'guardian','new_person':{'name':name+' mãe'},'relationship':'Mãe'},{'direction':'student','person_id':str(uuid.uuid4()),'relationship':'Pai'}]},404)
    assert api.get('/persons?q='+name)['total']==0
    assert api.get('/teachers?q='+name)['total']==0


def test_existing_multi_profiles_and_legacy_details_are_preserved(api):
    person=api.post('/persons',{'name':'Pessoa histórica','person_types':['teacher','guardian'],'mother_name':'Nome legado','notes':'Observação anterior'})
    teacher=api.post('/teachers',{'person_id':person['id'],'degree_course':'Matemática','profile_notes':'Não apagar'})
    data=api.get('/persons/'+person['id']+'/dossier')
    changed=save(api,{'person_id':person['id'],'version':data['person']['version'],'person':{'phone':'557500000111','person_types':['teacher','employee','guardian']},'profiles':{'teacher':{'version':teacher['version'],'data':{'workload_hours':20}},'employee':{'data':{'job_title':'Coordenação'}}}})
    assert changed['person']['mother_name']=='Nome legado' and changed['person']['notes']=='Observação anterior'
    assert changed['profiles']['teacher']['degree_course']=='Matemática' and changed['profiles']['teacher']['profile_notes']=='Não apagar'
    assert changed['profiles']['employee']['job_title']=='Coordenação'
    assert api.get('/persons?q=Pessoa histórica')['total']==1


def test_conflict_and_invalid_profile_roll_back_other_changes(api):
    pupil=api.student();person=pupil['person']
    save(api,{'person_id':person['id'],'version':person['version'],'person':{'name':'Deve reverter'},'profiles':{'student':{'version':999,'data':{'allergies':'Nova'}}}},409)
    assert api.get('/persons/'+person['id']+'/dossier')['person']['name']==person['name']
    save(api,{'person':{'name':'Tentativa inválida','person_types':['teacher']},'profiles':{'teacher':{'data':{'person_id':person['id']}}}},422)
    assert api.get('/persons?q=Tentativa inválida')['total']==0


def test_no_duplicates_self_link_or_person_from_other_school(api,client,admin):
    student=api.student();person=student['person'];relative=api.guardian(student)
    save(api,{'person_id':person['id'],'version':person['version'],'person':{},'family':[{'direction':'guardian','person_id':relative['id'],'relationship':'Mãe'}]},409)
    save(api,{'person_id':person['id'],'version':person['version'],'person':{},'family':[{'direction':'guardian','person_id':person['id'],'relationship':'Próprio'}]},422)
    with SessionLocal.begin() as db:
        foreign=m.Person(school_id=next(x['id'] for x in client.get('/api/v1/schools',headers=admin).json() if x['id']!=api.school['id']),name='Pessoa outra escola')
        db.add(foreign);db.flush();foreign_id=foreign.id
    save(api,{'person_id':person['id'],'version':person['version'],'person':{'name':'Não salvar'},'family':[{'direction':'guardian','person_id':foreign_id,'relationship':'Mãe'}]},404)
    assert api.get('/persons/'+person['id']+'/dossier')['person']['name']==person['name']


def test_soft_remove_keeps_history_and_can_reactivate(api):
    pupil=api.student();guardian=api.guardian(pupil)
    data=api.get('/persons/'+pupil['person']['id']+'/dossier');link=data['family']['items'][0]
    edit={'link_id':link['id'],'version':link['version'],'direction':'guardian','relationship':'Mãe','active':False}
    saved=save(api,{'person_id':data['person']['id'],'version':data['person']['version'],'person':{},'family':[edit]})
    assert saved['family']['total']==1 and not saved['family']['items'][0]['active']
    reverse=api.get('/persons/'+guardian['id']+'/family')['items'][0]
    assert reverse['id']==link['id'] and not reverse['active']
    edit.update(version=reverse['version'],active=True)
    saved=save(api,{'person_id':saved['person']['id'],'version':saved['person']['version'],'person':{},'family':[edit]})
    assert saved['family']['items'][0]['active']


def test_bad_photo_rolls_back_new_person_and_relatives(api):
    payload={'person':{'name':'Foto inválida rollback','birth_date':'2015-01-01','person_types':['student']},'family':[{'direction':'guardian','new_person':{'name':'Familiar rollback foto'},'relationship':'Pai'}]}
    result=api.client.post(api.base+'/person-dossiers/with-photo',headers=api.headers,data={'payload':json.dumps(payload)},files={'file':('photo.png',b'not-an-image','image/png')})
    assert result.status_code in (415,422),result.text
    assert api.get('/persons?q=rollback')['total']==0

def test_unique_dossier_saves_all_business_profiles_on_one_person(api):
    details={
        'supplier':{'contact_name':'Contato compras','category':'Material escolar','reference':'FOR-001','notes':'Entrega mensal'},
        'service_provider':{'contact_name':'Contato técnico','category':'Manutenção','reference':'PRE-002','notes':'Atendimento agendado'},
        'customer':{'contact_name':'Contato financeiro','category':'Pessoa física','reference':'CLI-003','notes':'Cobrança por e-mail'},
        'partner':{'contact_name':'Contato societário','category':'Sócio fundador','reference':'SOC-004','notes':'Participação administrativa'},
    }
    profiles={kind:{'data':values} for kind,values in details.items()}
    saved=save(api,{'person':{'name':'Pessoa com quatro vínculos','person_types':list(details)},'profiles':profiles})
    person=saved['person']
    assert set(person['person_types'])==set(details)
    assert api.get('/persons')['total']==1
    with SessionLocal() as db:
        created_events=db.scalars(select(m.AuditEvent).where(
            m.AuditEvent.entity_id==person['id'],
            m.AuditEvent.action=='person.business.created')).all()
    assert {event.details['type_code'] for event in created_events}==set(details)
    for kind,values in details.items():
        assert {key:saved['profiles'][kind][key] for key in values}==values
        assert person['business_profiles'][kind]==values

    loaded=api.get('/persons/'+person['id']+'/dossier')
    changed_supplier={**details['supplier'],'category':'Materiais de consumo'}
    edited=save(api,{
        'person_id':person['id'],'version':person['version'],
        'person':{'phone':'5575999991234','person_types':['supplier','service_provider','customer','partner']},
        'profiles':{'supplier':{'version':loaded['profiles']['supplier']['version'],'data':changed_supplier}},
    })
    assert edited['person']['id']==person['id']
    assert edited['profiles']['supplier']['category']=='Materiais de consumo'
    assert edited['profiles']['customer']['category']==details['customer']['category']
    with SessionLocal() as db:
        update_events=db.scalars(select(m.AuditEvent).where(
            m.AuditEvent.entity_id==person['id'],
            m.AuditEvent.action=='person.business.updated')).all()
    assert len(update_events)==1 and update_events[0].details['type_code']=='supplier'
    assert update_events[0].details['before']['category']==details['supplier']['category']
    assert update_events[0].details['after']['category']=='Materiais de consumo'
    assert api.get('/persons?q=Pessoa com quatro vínculos')['total']==1

    inactive=save(api,{
        'person_id':edited['person']['id'],'version':edited['person']['version'],
        'person':{'person_types':['service_provider','customer','partner']},
    })
    assert 'supplier' not in inactive['person']['person_types']
    assert inactive['profiles']['supplier']['category']=='Materiais de consumo'
    reactivated=save(api,{
        'person_id':inactive['person']['id'],'version':inactive['person']['version'],
        'person':{'person_types':['supplier','service_provider','customer','partner']},
    })
    assert reactivated['profiles']['supplier']['category']=='Materiais de consumo'


def test_unique_dossier_rejects_business_data_for_unselected_type_and_rolls_back(api):
    save(api,{
        'person':{'name':'Vínculo comercial incompatível','person_types':['supplier']},
        'profiles':{'customer':{'data':{'category':'Não deve ser salvo'}}},
    },422)
    assert api.get('/persons?q=Vínculo comercial incompatível')['total']==0

