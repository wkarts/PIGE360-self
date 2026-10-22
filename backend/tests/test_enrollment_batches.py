from sqlalchemy import func,select
from app.db import SessionLocal
from app import models as m
from app.enrollment_batches import EnrollmentBatch


def batch(api,count=2):
    c=api.catalogs(capacity=10)
    students=[api.student('Aluno sintético '+str(i),adult=True) for i in range(count)]
    return {'academic_year_id':c['year']['id'],'enrolled_on':'2026-10-01','items':[{'student_id':x['id'],'class_group_id':c['group']['id']} for x in students],'activate':False}


def counts():
    with SessionLocal() as db:return [db.scalar(select(func.count()).select_from(cls)) for cls in (m.Enrollment,m.BankCharge,m.IssuedDocument,EnrollmentBatch)]


def test_dry_run_retry_and_no_external_effects(api):
    payload=batch(api);before=counts()
    preview=api.post('/enrollment-batches/preview',payload,200)
    assert counts()==before
    assert preview['eligible']==2
    body={**payload,'preview_hash':preview['preview_hash'],'client_key':'synthetic-batch-idempotency-001'}
    job=api.post('/enrollment-batches',body)
    assert api.post('/enrollment-batches',body)['id']==job['id']
    result=api.post('/enrollment-batches/'+job['id']+'/process',{},200)
    assert result['status']=='completed'
    assert all(r['academic_status']=='draft' for r in result['results'])
    after=counts();assert after[0]==before[0]+2;assert after[1:3]==before[1:3]
    assert api.post('/enrollment-batches/'+job['id']+'/process',{},200)['results']==result['results']
    assert counts()==after
    duplicate=api.post('/enrollment-batches/preview',payload,200)
    assert duplicate['blocked']==2


def test_stale_preview_and_manipulated_period(api):
    payload=batch(api,1)
    preview=api.post('/enrollment-batches/preview',payload,200)
    item=payload['items'][0]
    api.post('/enrollments',{**item,'enrolled_on':payload['enrolled_on']})
    api.post('/enrollment-batches',{**payload,'preview_hash':preview['preview_hash'],'client_key':'synthetic-stale-batch-0001'},409)
    other=api.post('/academic-years',{'name':'2027','starts_on':'2027-01-01','ends_on':'2027-12-31'})
    result=api.post('/enrollment-batches/preview',{**payload,'academic_year_id':other['id']},200)
    assert result['blocked']==1


def test_partial_failure_rolls_back_item_and_retry_preserves_success(api):
    payload=batch(api)
    preview=api.post('/enrollment-batches/preview',payload,200)
    job=api.post('/enrollment-batches',{**payload,'preview_hash':preview['preview_hash'],'client_key':'synthetic-partial-batch-001'})
    first=payload['items'][0]
    api.post('/enrollments',{**first,'enrolled_on':payload['enrolled_on']})
    result=api.post('/enrollment-batches/'+job['id']+'/process',{},200)
    assert result['status']=='partial'
    assert result['results'][0]['status']=='failed'
    assert result['results'][1]['status']=='completed'
    before=counts();api.post('/enrollment-batches/'+job['id']+'/process',{},200);assert counts()==before
    cancelled=api.post('/enrollment-batches/'+job['id']+'/cancel',{},200)
    assert cancelled['results'][1]==result['results'][1]
    api.post('/enrollment-batches/'+job['id']+'/process',{},409)
    assert counts()==before


def test_explicit_activation_reuses_existing_rules(api):
    payload=batch(api,1);payload['activate']=True
    preview=api.post('/enrollment-batches/preview',payload,200)
    assert preview['eligible']==1
    job=api.post('/enrollment-batches',{**payload,'preview_hash':preview['preview_hash'],'client_key':'synthetic-active-batch-001'})
    result=api.post('/enrollment-batches/'+job['id']+'/process',{},200)
    assert result['results'][0]['academic_status']=='active'


def test_cancel_and_export_keep_completed_items(api):
    payload=batch(api)
    plan=api.post('/enrollment-batches/preview',payload,200)
    job=api.post('/enrollment-batches',{**payload,'preview_hash':plan['preview_hash'],'client_key':'synthetic-cancellation-001'})
    api.post('/enrollment-batches/'+job['id']+'/cancel',{},200)
    api.post('/enrollment-batches/'+job['id']+'/process',{},409)
    cancelled=api.get('/enrollment-batches/'+job['id'])
    assert cancelled['status']=='cancelled'
    assert len(cancelled['results'])==2 and all(row['status']=='cancelled' for row in cancelled['results'])
    exported=api.get('/enrollment-batches/'+job['id']+'/result.csv')
    assert exported.status_code==200 and exported.text.count('Cancelado')==2
