"""Regressões dos cadastros individualizados sem duplicar pessoas."""
import pytest
from app.schemas import PersonInput
from pydantic import ValidationError


@pytest.mark.parametrize('code', ['supplier', 'service_provider', 'customer', 'partner'])
def test_contextual_create_edit_and_filter(api, code):
    person = api.post('/business-persons/'+code, {'person': {'name':'Pessoa contextual '+code},
        'details': {'category':'Categoria teste','reference':'TEST-01'}})
    assert person['person_types']==[code]
    assert person['business_profiles'][code]['category']=='Categoria teste'
    assert api.get('/persons?type_code='+code)['total']==1
    assert api.get('/persons?type_code=other')['total']==0
    changed = api.patch('/business-persons/'+code+'/'+person['id'], {
        'version':person['version'], 'person':{'name':'Nome revisado'},
        'details':{'category':'Categoria revisada'}})
    assert changed['name']=='Nome revisado'
    assert changed['business_profiles'][code]['category']=='Categoria revisada'
    api.patch('/business-persons/'+code+'/'+person['id'], {
        'version':person['version'], 'person':{'name':'Obsoleto'},'details':{}},409)


def test_shared_identity_two_roles_no_data_loss(api):
    first=api.post('/business-persons/supplier', {'person':{
        'name':'Fornecedor único','cpf':'529.982.247-25','birth_city':'Cidade preservada',
        'person_types':['guardian']},'details':{'category':'Material'}})
    second=api.post('/business-persons/customer',{'person_id':first['id'],
        'version':first['version'],'details':{'category':'Serviços'}})
    assert first['id']==second['id']
    assert set(second['person_types'])=={'supplier','customer','guardian'}
    assert api.get('/persons')['total']==1
    changed=api.patch('/business-persons/customer/'+second['id'], {
        'version':second['version'],'person':{'phone':'5575999999999'},'details':{'category':'Outro'}})
    assert changed['birth_city']=='Cidade preservada'
    assert changed['cpf']=='52998224725'
    assert changed['business_profiles']['supplier']['category']=='Material'
    assert changed['business_profiles']['customer']['category']=='Outro'
    assert 'guardian' in changed['person_types']
    api.post('/business-persons/customer',{'person_id':changed['id'],'version':changed['version']},409)
    assert api.get('/persons?guardians_only=true')['items'][0]['id']==first['id']


@pytest.mark.parametrize('cnpj,normalized', [('11.222.333/0001-81','11222333000181'),('12.abc.345/01de-35','12ABC34501DE35')])
def test_cnpj_formats_uniqueness_and_search(api, cnpj, normalized):
    first=api.post('/business-persons/supplier',{'person':{
        'name':'Empresa teste','entity_kind':'organization','cnpj':cnpj,'trade_name':'Fantasia'}})
    assert first['cnpj']==normalized
    assert api.get('/persons?entity_kind=organization')['total']==1
    assert api.get('/persons?entity_kind=individual')['total']==0
    assert api.get('/persons?q='+cnpj)['total']==1
    api.post('/business-persons/customer',{'person':{
        'name':'Duplicata','entity_kind':'organization','cnpj':cnpj}},409)
    assert api.get('/persons')['total']==1
    for endpoint in ['students','teachers','employees']:
        api.post('/'+endpoint, {'person_id':first['id']},422)
    api.post('/persons/'+first['id']+'/responsible',{'version':first['version'],'data':{}},422)
    student=api.student()
    api.post('/students/'+student['id']+'/guardians',{'person_id':first['id'],'legal':True},422)


@pytest.mark.parametrize('payload', [
    {'entity_kind':'organization','cnpj':'11222333000182'},
    {'entity_kind':'organization','cnpj':'00000000000000'},
    {'entity_kind':'organization','cnpj':'12ABC34501DE34'},
    {'entity_kind':'individual','cnpj':'11222333000181'},
    {'entity_kind':'organization','cpf':'52998224725'},
    {'entity_kind':'organization','person_types':['teacher']},
])
def test_invalid_document_or_type_rejected(payload):
    with pytest.raises(ValidationError):PersonInput(name='Pessoa teste',**payload)


def test_school_isolation_and_invalid_type(api, client, admin, school):
    person=api.post('/business-persons/supplier',{'person':{'name':'Fornecedor local'}})
    # Another school in this same installation cannot attach a record outside its scope.
    companies=client.get('/api/v1/companies',headers=admin).json()
    other=client.post('/api/v1/schools',headers=admin,json={
        'name':'Outra unidade teste','company_id':companies[0]['id']}).json()
    base='/api/v1/schools/'+other['id']
    result=client.post(base+'/business-persons/customer',headers=admin,json={
        'person_id':person['id'],'version':person['version']})
    assert result.status_code==404
    assert client.get(base+'/persons?type_code=supplier',headers=admin).json()['total']==0
    api.post('/business-persons/admin',{'person':{'name':'Não criar'}},422)
    assert api.get('/persons')['total']==1


def test_responsible_reuse_and_active_filter(api):
    person=api.post('/persons',{'name':'Pessoa compartilhada','person_types':['supplier']})
    linked=api.post('/persons/'+person['id']+'/responsible',{'version':person['version'],'data':{}},200)
    assert set(linked['person_types'])=={'supplier','guardian'}
    assert api.get('/persons?guardians_only=true')['total']==1
    api.patch('/persons/'+linked['id'],{'version':linked['version'],'data':{'active':False}})
    assert api.get('/persons?active=true')['total']==0
    assert api.get('/persons?active=false')['total']==1


def test_business_patch_preserves_other_roles_and_rolls_back(api):
    person=api.post('/business-persons/partner',{'person':{'name':'Sócio existente'},'details':{'category':'Fundador'}})
    api.patch('/business-persons/partner/'+person['id'],{'version':person['version'],
        'person':{'person_types':[]},'details':{'category':'Não salvar'}},422)
    current=api.get('/persons')['items'][0]
    assert current['business_profiles']['partner']['category']=='Fundador'
    assert current['version']==person['version']
