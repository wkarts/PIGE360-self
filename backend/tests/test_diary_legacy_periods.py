"""Aulas e avaliações sem período só são projetadas em uma etapa inequívoca da turma."""
from decimal import Decimal

from app import models as m
from app.db import SessionLocal
from test_diary_operations import diary_fixture
from test_diary_period_publication import review


def test_legacy_entries_consolidate_and_publish_in_the_same_period(api):
    catalog, enrollment, period, diary = diary_fixture(api)
    root = '/diaries/' + diary['id']
    other = api.post('/class-groups', {'name': 'Outra turma', 'unit_id': catalog['unit']['id'],
        'academic_year_id': catalog['year']['id'], 'grade_id': catalog['grade']['id'],
        'shift_id': catalog['shift']['id'], 'capacity': 10})
    api.post('/academic-periods', {'name': 'Etapa de outra turma', 'academic_year_id': catalog['year']['id'],
        'class_group_id': other['id'], 'order_index': 2, 'starts_on': period['starts_on'], 'ends_on': period['ends_on']})
    api.call('PUT', root + '/assessment-rules/' + period['id'], {'method': 'arithmetic'})
    lesson = api.post(root + '/lessons', {'lesson_date': '2026-09-23', 'content': 'Atividade sem período', 'lesson_count': 2})
    api.call('PUT', root + '/lessons/' + lesson['id'] + '/attendance', {
        'items': [{'enrollment_id': enrollment['id'], 'status': 'present'}]})
    assessment = api.post(root + '/assessments', {'title': 'Avaliação sem período', 'status': 'published',
        'assessment_date': '2026-09-24', 'max_score': '10'})
    api.call('PUT', root + '/assessments/' + assessment['id'] + '/results', {
        'items': [{'enrollment_id': enrollment['id'], 'numeric_score': '8'}]})
    result = api.post(root + '/periods/' + period['id'] + '/consolidate', {'version': diary['version']}, 200)['results'][0]
    assert Decimal(result['numeric_value']) == 8
    assert Decimal(result['calculation']['attendance_percent']) == 100
    current = review(api, root, diary)
    closed = api.post(root + '/close', {'academic_period_id': period['id'], 'reason': 'Conferência do período.',
                      'version': current['version']}, 200)
    with SessionLocal() as db:
        snapshot = db.get(m.DiaryClosure, closed['closure']['id']).snapshot
        assert snapshot['lessons'][0]['academic_period_id'] == period['id']
        assert snapshot['assessments'][0]['academic_period_id'] == period['id']
        assert db.get(m.DiaryLesson, lesson['id']).academic_period_id is None
        assert db.get(m.AssessmentInstrument, assessment['id']).academic_period_id is None
        from app.learning_portal import learning_data
        published = learning_data(db, [db.get(m.Student, enrollment['student_id'])])['students'][0]['enrollments'][0]
        assert published['subjects'][0]['periods'][0]['attendance']['present'] == 2


def test_ambiguous_legacy_lesson_requires_an_explicit_period_before_closing(api):
    catalog, enrollment, period, diary = diary_fixture(api)
    api.post('/academic-periods', {'academic_year_id': catalog['year']['id'], 'name': 'Etapa sobreposta',
        'order_index': 2, 'starts_on': period['starts_on'], 'ends_on': period['ends_on']})
    root = '/diaries/' + diary['id']
    payload = {'lesson_date': '2026-09-23', 'content': 'Aula no intervalo sobreposto'}
    lesson = api.post(root + '/lessons', payload)
    api.call('PUT', root + '/lessons/' + lesson['id'] + '/attendance', {
        'items': [{'enrollment_id': enrollment['id'], 'status': 'present'}]})
    current = review(api, root, diary)
    close = {'version': current['version'], 'reason': 'Conferência de aula antiga.', 'academic_period_id': period['id']}
    error = api.post(root + '/close', close, 409)
    assert '23/09/2026' in error['detail'] and 'atribua o período' in error['detail']
    assert api.get(root + '/history')['closures'] == []
    reopened = api.post(root + '/reopen', {'version': current['version'], 'reason': 'Atribuir etapa à aula.'}, 200)['diary']
    api.patch(root + '/lessons/' + lesson['id'], {**payload, 'version': lesson['version'], 'academic_period_id': period['id']})
    current = review(api, root, reopened)
    assert api.post(root + '/close', {**close, 'version': current['version']}, 200)['scope'] == 'period'
