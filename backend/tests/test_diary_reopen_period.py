import io
from pypdf import PdfReader
from test_learning_portal import activate
from test_diary_portal import active_student_and_guardian, portal_session, portal_call


def test_retificar_apenas_um_dos_dois_periodos_publicados(api, client):
    catalogs, student, _, enrollment = active_student_and_guardian(api)
    component = api.post('/curriculum-components', {'name': 'Artes'})
    diary = api.post('/diaries', {'class_group_id':catalogs['group']['id'], 'component_id':component['id']})
    root = '/diaries/' + diary['id']
    periods = []
    lessons = []
    for month in (10, 11):
        day = f'2026-{month}-10'
        period = api.post('/academic-periods', {'name':f'Periodo {month}', 'starts_on':day,
            'ends_on':f'2026-{month}-28', 'order_index':month, 'academic_year_id':catalogs['year']['id']})
        periods.append(period)
        lesson = api.post(root+'/lessons', {'academic_period_id':period['id'],'lesson_date':day,'content':'Estudo de cor'})
        lessons.append(lesson)
        api.call('PUT', root+'/lessons/'+lesson['id']+'/attendance', {'items':[{'enrollment_id':enrollment['id'],'status':'present'}]})
    submitted = api.post(root+'/submit', {'version':diary['version']},200)
    current = api.post(root+'/review', {'version':submitted['version']},200)
    closures = []
    for period in periods:
        closed = api.post(root+'/close', {'version':current['version'],'academic_period_id':period['id'],'reason':'Período conferido'},200)
        closures.append(closed['closure'])
        current = closed['diary']
    cookies, _ = portal_session(api)
    activate(client,cookies,student)
    def names():
        reports = portal_call(client,cookies,'GET','/learning')
        return [p['period_name'] for p in reports['students'][0]['enrollments'][0]['subjects'][0]['periods']]
    def pdf_text():
        pdf = portal_call(client,cookies,'GET','/learning/'+student['id']+'/report.pdf')
        return '\n'.join(p.extract_text() for p in PdfReader(io.BytesIO(pdf.content)).pages)
    assert names() == ['Periodo 10','Periodo 11']
    assert all(p['name'] in pdf_text() for p in periods)
    reason = 'Corrigir a chamada de outubro'
    api.post(root+'/reopen', {'version':current['version'], 'reason':reason}, 409)
    assert names() == ['Periodo 10','Periodo 11']
    ret = api.post(root+'/reopen',{'academic_period_id':periods[0]['id'],'version':current['version'],'reason':reason},200)
    assert ret['revision']['closure_id'] == closures[0]['id']
    assert ret['revision']['reopened_by'] and ret['revision']['reason'] == reason
    attendance = {'items':[{'enrollment_id':enrollment['id'],'status':'absent'}]}
    api.call('PUT', root+'/lessons/'+lessons[1]['id']+'/attendance', attendance, expect=409)
    attendance['items'][0]['version'] = api.get(root+'/lessons/'+lessons[0]['id']+'/attendance')['roster'][0]['attendance']['version']
    api.call('PUT', root+'/lessons/'+lessons[0]['id']+'/attendance', attendance)
    assert names() == ['Periodo 11']
    report = pdf_text()
    assert 'Periodo 11' in report and 'Periodo 10' not in report
    history = api.get(root+'/history')
    still = next(x for x in history['closures'] if x['id']==closures[1]['id'])
    assert still['active'] and still['snapshot_hash']==closures[1]['snapshot_hash']
