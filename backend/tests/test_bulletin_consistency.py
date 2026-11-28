"""A ficha e o boletim preservam o período, o vínculo e a procedência dos lançamentos."""
from datetime import UTC, datetime, timedelta
from io import BytesIO
from pypdf import PdfReader

from app import models as m
from app.db import SessionLocal
from app.learning_portal import learning_data, _period_data
from app.diary_report_sections import individual
from test_learning_portal import published_learning


def test_period_closure_precedes_annual_and_individual_uses_frozen_annual(api):
    student, _, enrollment, _, closure_id = published_learning(api)
    with SessionLocal.begin() as db:
        partial = db.get(m.DiaryClosure, closure_id)
        diary_id, period_id = partial.diary_id, partial.academic_period_id
        data = dict(partial.snapshot)
        data['period'] = None
        data['lessons'] = [dict(row, content='Conteudo congelado anual') for row in data['lessons']]
        data['lessons'].append(dict(data['lessons'][0], id='fora-do-periodo', academic_period_id='outro-periodo',
                                    content='DADO FORA DO RECORTE'))
        data['period_results'] = [dict(row, numeric_value='7.00') for row in data['period_results']]
        annual = m.DiaryClosure(school_id=api.school['id'], diary_id=diary_id, academic_period_id=None, snapshot=data,
            snapshot_hash='a' * 64, reason='Publicação anual sintética', closed_by=partial.closed_by,
            closed_at=datetime.now(UTC) + timedelta(seconds=1), active=True)
        db.add(annual)
        db.flush()
        annual_id = annual.id
        def grade():
            return learning_data(db, [db.get(m.Student, student['id'])])['students'][0]['enrollments'][0]['subjects'][0]['periods'][0]
        specific = grade()
        assert (specific['publication_id'], specific['grade_display']) == (closure_id, '8,5')
        partial.active = False
        db.flush()
        fallback = grade()
        assert (fallback['publication_id'], fallback['grade_display']) == (annual_id, '7')
    path = f"/diaries/{diary_id}/reports/student_record.pdf?academic_period_id={period_id}&enrollment_id={enrollment['id']}"
    pdf = api.get(path)
    text = '\n'.join(p.extract_text() for p in PdfReader(BytesIO(pdf.content)).pages)
    assert 'Conteudo congelado anual' in text and 'DADO FORA DO RECORTE' not in text
    assert 'Resultado consolidado por período' in text and 'Fechamento vigente' in text


def test_unmarked_class_and_zero_grade_in_individual_record(api):
    student, _, enrollment, _, closure_id = published_learning(api)
    with SessionLocal() as db:
        closure = db.get(m.DiaryClosure, closure_id)
        person = db.get(m.Enrollment, enrollment['id'])
        period = db.get(m.AcademicPeriod, closure.academic_period_id)
        first, second = closure.snapshot['lessons']
        history = {**closure.snapshot,
                   'lessons': [first, second, dict(first, id='fora-da-vigencia')],
                   'attendance': [r for r in closure.snapshot['attendance'] if r['lesson_id']==first['id']],
                   'period_results': [{'student_id': student['id'], 'enrollment_id': person.id, 'academic_period_id': period.id,
                                       'numeric_value': 0, 'status': 'calculated', 'calculation': {'attendance_percent': '100'}}]}
        allowed = {first['id'], second['id']}
        family = _period_data(history, person, period, closure, allowed)
        assert family['grade_display'] == '0'
        assert family['attendance']['unrecorded'] == int(second['lesson_count'])
        assert family['attendance']['percentage'] is None
        sheet = individual(history, person.id, lambda row, _key: row['id'] in allowed, {period.id: period.name})
        records = next(s['rows'] for s in sheet if s['title']=='Frequência individual')
        assert len(records) == 2 and records[1]['3'] == 'Sem chamada'
        grades = next(s['rows'] for s in sheet if s['title']=='Resultado consolidado por período')
        assert grades == [{'0': period.name, '1': '0', '2': 'Consolidado'}]
