from conftest import API


def campaign(group, year=None):
    import uuid
    return {'slug':'periodo-'+uuid.uuid4().hex[:12], 'title':'Processo de teste',
            'academic_year_id':year, 'class_group_ids':[group['id']],
            'opens_on':'2026-01-01','closes_on':'2027-12-31'}


def test_explicit_period_rejects_foreign_and_different_year(api):
    catalog=api.catalogs()
    other=api.post('/academic-years',{'name':'2027','starts_on':'2027-01-01','ends_on':'2027-12-31'})
    api.post('/admission-campaigns',campaign(catalog['group'],other['id']),422)
    api.post('/admission-campaigns',campaign(catalog['group'],'another-school-year'),422)
    created=api.post('/admission-campaigns',campaign(catalog['group'],catalog['year']['id']))
    assert created['academic_year_id']==catalog['year']['id']


def test_legacy_request_keeps_one_fixed_period(api):
    catalog=api.catalogs()
    created=api.post('/admission-campaigns',campaign(catalog['group']))
    assert created['academic_year_id']==catalog['year']['id']
    assert created['groups'][0]['year']=='2026'
