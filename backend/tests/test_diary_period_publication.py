"""Jornadas de publicação por etapa, correção da consolidação e recuperação."""
from decimal import Decimal

import pytest

from app import models as m
from app.db import SessionLocal
from test_diary_operations import diary_fixture


def review(api, root, diary):
    submitted = api.post(root + '/submit', {'version': diary['version']}, 200)
    return api.post(root + '/review', {'version': submitted['version']}, 200)


def lesson_with_attendance(api, root, period, enrollment, day, status='present'):
    lesson = api.post(root + '/lessons', {'academic_period_id': period['id'], 'lesson_date': day,
                                          'content': 'Aula registrada', 'lesson_count': 1})
    route = root + '/lessons/' + lesson['id'] + '/attendance'
    api.call('PUT', route, {'items': [{'enrollment_id': enrollment['id'], 'status': status}]})
    return route


def test_continue_in_next_period_preserves_published_bulletin(api):
    catalog, enrollment, first, diary = diary_fixture(api)
    root = '/diaries/' + diary['id']
    second = api.post('/academic-periods', {'academic_year_id': catalog['year']['id'], 'name': 'Etapa final',
                                            'starts_on': '2026-12-21', 'ends_on': '2026-12-31', 'order_index': 2})
    mark = lesson_with_attendance(api, root, first, enrollment, '2026-09-22')
    reviewed = review(api, root, diary)
    api.post(root + '/resume', {'version': reviewed['version']}, 409)
    first_closure = api.post(root + '/close', {'academic_period_id': first['id'], 'version': reviewed['version'],
                                               'reason': 'Conferência da primeira etapa'}, 200)
    api.post(root + '/resume', {'version': reviewed['version']}, 409)
    resumed = api.post(root + '/resume', {'version': first_closure['diary']['version']}, 200)
    assert resumed['status'] == 'open'
    lesson_with_attendance(api, root, second, enrollment, '2026-12-22')
    api.call('PUT', mark, {'items': [{'enrollment_id': enrollment['id'], 'status': 'absent'}]}, 409)
    api.post(root + '/lessons', {'lesson_date': '2026-09-25', 'content': 'Registro sem período'}, 409)
    api.post(root + '/opinions', {'academic_period_id': first['id'], 'enrollment_id': enrollment['id'],
                                  'text': 'Alteração em etapa publicada'}, 409)
    api.post(root + '/assessments', {'assessment_date': '2026-09-25', 'title': 'Prova sem período',
                                     'status': 'published', 'max_score': 10}, 409)
    with SessionLocal() as db:
        from app.learning_portal import learning_data
        closure = db.get(m.DiaryClosure, first_closure['closure']['id'])
        assert closure.active and closure.snapshot_hash == first_closure['closure']['snapshot_hash']
        subject = learning_data(db, [db.get(m.Student, enrollment['student_id'])])['students'][0]['enrollments'][0]['subjects'][0]
        assert [p['publication_id'] for p in subject['periods']] == [closure.id]
    assert api.get(root + '/history')['revisions'] == []
    reviewed = review(api, root, resumed)
    final = api.post(root + '/close', {'version': reviewed['version'], 'reason': 'Encerramento anual'}, 200)
    api.post(root + '/resume', {'version': final['diary']['version']}, 409)


@pytest.mark.parametrize('changed', ['grade', 'attendance', 'rule'])
def test_close_rejects_stale_results_until_explicit_consolidation(api, changed):
    _, enrollment, period, diary = diary_fixture(api)
    root = '/diaries/' + diary['id']
    rule_path = root + '/assessment-rules/' + period['id']
    rule_data = {'method': 'arithmetic', 'scale_max': 10, 'justified_absence_counts_as_present': False}
    rule = api.call('PUT', rule_path, rule_data)
    marks = lesson_with_attendance(api, root, period, enrollment, '2026-09-22')
    exam = api.post(root + '/assessments', {'academic_period_id': period['id'], 'assessment_date': '2026-09-22',
                                            'title': 'Prova', 'status': 'published', 'max_score': 10})
    results = root + '/assessments/' + exam['id'] + '/results'
    api.call('PUT', results, {'items': [{'enrollment_id': enrollment['id'], 'numeric_score': 6}]})
    consolidate = root + '/periods/' + period['id'] + '/consolidate'
    api.post(consolidate, {'version': diary['version']}, 200)
    if changed == 'grade':
        api.call('PUT', results, {'items': [{'enrollment_id': enrollment['id'], 'numeric_score': 9}]})
    elif changed == 'attendance':
        api.call('PUT', marks, {'items': [{'enrollment_id': enrollment['id'], 'status': 'absent'}]})
    else:
        api.call('PUT', rule_path, {**rule_data, 'scale_max': 20, 'version': rule['version']})
        assert api.get(root + '/periods/' + period['id'] + '/results')['items'][0]['requires_recalculation']
    reviewed = review(api, root, diary)
    close = {'version': reviewed['version'], 'reason': 'Conferência'}
    api.post(root + '/close', close, 409)
    api.post(root + '/close', {**close, 'academic_period_id': period['id']}, 409)
    assert api.get(root + '/history')['closures'] == []
    row = api.post(consolidate, {'version': reviewed['version']}, 200)['results'][0]
    closed = api.post(root + '/close', {**close, 'academic_period_id': period['id']}, 200)
    expected_grade = {'grade': 9, 'attendance': 6, 'rule': 12}[changed]
    with SessionLocal() as db:
        snapshot = db.get(m.DiaryClosure, closed['closure']['id']).snapshot
        published = snapshot['period_results'][0]
        assert published['source_hash'] == row['source_hash']
        assert Decimal(published['numeric_value']) == expected_grade
        assert Decimal(published['calculation']['attendance_percent']) == (0 if changed == 'attendance' else 100)


def test_ignored_recovery_without_grade_does_not_block_publication(api):
    _, enrollment, period, diary = diary_fixture(api)
    root = '/diaries/' + diary['id']
    api.call('PUT', root + '/assessment-rules/' + period['id'], {'recovery_mode': 'none'})
    lesson_with_attendance(api, root, period, enrollment, '2026-09-22')
    payload = {'academic_period_id': period['id'], 'assessment_date': '2026-09-22', 'status': 'published'}
    regular = api.post(root + '/assessments', {**payload, 'title': 'Regular', 'max_score': 10})
    api.call('PUT', root + '/assessments/' + regular['id'] + '/results',
             {'items': [{'enrollment_id': enrollment['id'], 'numeric_score': 8}]})
    api.post(root + '/assessments', {**payload, 'title': 'Recuperação', 'kind': 'recovery', 'value_type': 'concept'})
    row = api.post(root + '/periods/' + period['id'] + '/consolidate', {'version': diary['version']}, 200)['results'][0]
    assert Decimal(row['numeric_value']) == 8 and row['status'] == 'calculated'
    assert api.get('/diary-dashboard')['totals']['assessment_results_pending'] == 0
    reviewed = review(api, root, diary)
    api.post(root + '/close', {'academic_period_id': period['id'], 'version': reviewed['version'],
                               'reason': 'Frequência e resultados conferidos'}, 200)


def test_descriptive_period_can_publish_final_opinion_without_numeric_assessments(api):
    _, enrollment, period, diary = diary_fixture(api)
    root = '/diaries/' + diary['id']
    api.call('PUT', root + '/assessment-rules/' + period['id'], {'required_opinion': True})
    lesson_with_attendance(api, root, period, enrollment, '2026-09-22')
    reviewed = review(api, root, diary)
    close = {'academic_period_id': period['id'], 'reason': 'Conferência dos pareceres'}
    api.post(root + '/close', {**close, 'version': reviewed['version']}, 409)
    opened = api.post(root + '/reopen', {'version': reviewed['version'], 'reason': 'Finalização do parecer obrigatório'}, 200)['diary']
    opinion = api.post(root + '/opinions', {'academic_period_id': period['id'], 'enrollment_id': enrollment['id'],
                                             'text': 'Participou das atividades em grupo.', 'status': 'final'})
    revised = review(api, root, opened)
    closed = api.post(root + '/close', {**close, 'version': revised['version']}, 200)
    with SessionLocal() as db:
        snapshot = db.get(m.DiaryClosure, closed['closure']['id']).snapshot
        assert snapshot['opinions'][0]['id'] == opinion['id'] and snapshot['period_results'] == []
