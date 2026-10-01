"""Boletins publicados: leitura própria a partir de fechamentos imutáveis do Diário."""
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from fastapi import APIRouter, Query, Request
from fastapi.responses import Response
from sqlalchemy import select
from . import models as m
from .common import audit
from .security import Actor, DB, fail, require

router = APIRouter(tags=['Boletim do estudante'])
NOTE = ('Notas e frequência são exibidas após o fechamento pela escola. '
        'Períodos em preparação ou reabertos para correção não são publicados. '
        'O resultado apresentado pertence ao período e não representa aprovação anual automática.')
RESULT_LABELS = {
    'pending': 'Consolidação pendente', 'calculated': 'Consolidado',
    'below_minimum': 'Abaixo da média do período',
    'attendance_below_minimum': 'Frequência abaixo do mínimo',
    'opinion_pending': 'Parecer pendente', 'concept': 'Conceito consolidado',
}


def own_profile_students(db, user, school_id=''):
    """Exige vínculo explícito: igualdade de e-mail nunca autoriza acesso pedagógico."""
    require(user, 'profile.self')
    if user.role not in ('student', 'guardian'):
        fail(403, 'Este espaço é destinado a estudantes e responsáveis vinculados.')
    require(user, 'student.self.read' if user.role == 'student' else 'guardian.self.read')
    schools = list(db.scalars(select(m.School.id).join(
        m.SchoolAccess, m.SchoolAccess.school_id == m.School.id,
    ).where(m.SchoolAccess.user_id == user.id, m.School.active.is_(True))))
    if school_id:
        if school_id not in schools:
            fail(404, 'Escola não encontrada para este acesso.')
        schools = [school_id]
    if not schools or not user.person_id:
        return []
    person = db.scalar(select(m.Person).where(
        m.Person.id == user.person_id, m.Person.school_id.in_(schools), m.Person.active.is_(True),
    ))
    if not person:
        return []
    if user.role == 'student':
        return list(db.scalars(select(m.Student).where(
            m.Student.person_id == person.id, m.Student.school_id == person.school_id,
        )))
    return list(db.scalars(select(m.Student).join(
        m.GuardianLink, m.GuardianLink.student_id == m.Student.id,
    ).where(
        m.GuardianLink.person_id == person.id, m.GuardianLink.school_id == person.school_id,
        m.GuardianLink.active.is_(True), m.GuardianLink.legal.is_(True),
        m.Student.school_id == person.school_id,
    )).unique())


def own_portal_students(db, account):
    from .portal_access import active_portal_student_access
    return list({student.id: student for _, student, _ in active_portal_student_access(db, account)}.values())


def _grade(result):
    if not result or result.get('status') == 'pending':
        return 'Aguardando consolidação'
    if result.get('concept_value'):
        return str(result['concept_value'])
    if result.get('numeric_value') is None:
        return 'Aguardando consolidação'
    try:
        return format(Decimal(str(result['numeric_value'])).normalize(), 'f').replace('.', ',')
    except (InvalidOperation, ValueError):
        return 'Aguardando consolidação'


def _period_data(snapshot, enrollment, period, closure):
    result = next((row for row in snapshot.get('period_results', [])
                   if row.get('enrollment_id') == enrollment.id
                   and row.get('student_id') == enrollment.student_id
                   and row.get('academic_period_id') == period.id), None)
    lessons = {row['id']: row for row in snapshot.get('lessons', [])
               if row.get('academic_period_id') == period.id
               and str(row.get('lesson_date', '')) >= enrollment.enrolled_on.isoformat()}
    counts = {'present': 0, 'absent': 0, 'justified_absence': 0, 'unrecorded': 0, 'total': 0}
    marks = {row['lesson_id']: row for row in snapshot.get('attendance', [])
             if row.get('enrollment_id') == enrollment.id
             and row.get('student_id') == enrollment.student_id}
    for lesson_id, lesson in lessons.items():
        weight = max(0, int(lesson.get('lesson_count', 1)))
        mark = marks.get(lesson_id)
        status = mark.get('status') if mark else 'unrecorded'
        counts[status if status in ('present', 'absent', 'justified_absence') else 'unrecorded'] += weight
        counts['total'] += weight
    rule = next((row for row in snapshot.get('assessment_rules', [])
                 if row.get('academic_period_id') == period.id), None)
    credited = counts['present']
    if rule and rule.get('justified_absence_counts_as_present') is True:
        credited += counts['justified_absence']
    # Sem regra explícita ou com chamada incompleta, não inventar percentual oficial.
    percentage = (float((Decimal(credited) * 100 / counts['total']).quantize(Decimal('.01'), rounding=ROUND_HALF_UP))
                  if counts['total'] and not counts['unrecorded'] and rule
                  and rule.get('justified_absence_counts_as_present') is not None else None)
    return {
        'period_id': period.id, 'period_name': period.name,
        'grade_display': _grade(result), 'result_status': result.get('status', 'pending') if result else 'pending',
        'result_label': RESULT_LABELS.get(result.get('status'), 'Consolidado') if result else 'Consolidação pendente',
        'attendance': {**counts, 'percentage': percentage}, 'published': True,
        'published_at': closure.closed_at.isoformat(),
    }


def learning_data(db, students):
    output = []
    for student in students:
        person = db.get(m.Person, student.person_id)
        school = db.get(m.School, student.school_id)
        enrollments = list(db.scalars(select(m.Enrollment).where(
            m.Enrollment.school_id == student.school_id, m.Enrollment.student_id == student.id,
            m.Enrollment.status != 'draft',
        ).order_by(m.Enrollment.enrolled_on.desc(), m.Enrollment.created_at.desc())))
        items = []
        for enrollment in enrollments:
            group = db.get(m.ClassGroup, enrollment.class_group_id)
            year = db.get(m.AcademicYear, enrollment.academic_year_id)
            periods = list(db.scalars(select(m.AcademicPeriod).where(
                m.AcademicPeriod.school_id == student.school_id,
                m.AcademicPeriod.academic_year_id == enrollment.academic_year_id,
            ).order_by(m.AcademicPeriod.order_index, m.AcademicPeriod.starts_on)))
            diaries = list(db.scalars(select(m.SchoolDiary).where(
                m.SchoolDiary.school_id == student.school_id,
                m.SchoolDiary.class_group_id == enrollment.class_group_id,
                m.SchoolDiary.academic_year_id == enrollment.academic_year_id,
            )))
            subjects = []
            for diary in diaries:
                closures = list(db.scalars(select(m.DiaryClosure).where(
                    m.DiaryClosure.school_id == student.school_id,
                    m.DiaryClosure.diary_id == diary.id, m.DiaryClosure.active.is_(True),
                ).order_by(m.DiaryClosure.closed_at.desc(), m.DiaryClosure.id.desc())))
                published = []
                for period in periods:
                    closure = next((row for row in closures
                                    if row.academic_period_id in (None, period.id)), None)
                    if not closure:
                        continue
                    snapshot = closure.snapshot or {}
                    if not any(row.get('enrollment_id') == enrollment.id for key in ('roster', 'attendance', 'period_results') for row in snapshot.get(key, [])):
                        continue
                    if not any(row.get('academic_period_id') == period.id for row in snapshot.get('lessons', [])):
                        continue
                    # Nenhum resultado de outro estudante, anotação interna ou rascunho é serializado.
                    published.append(_period_data(snapshot, enrollment, period, closure))
                if published:
                    component = db.get(m.CurriculumComponent, diary.component_id)
                    subjects.append({'diary_id': diary.id, 'component_name': component.name if component else '', 'periods': published})
            items.append({'enrollment_id': enrollment.id, 'number': enrollment.number,
                          'class_name': group.name if group else '', 'year_name': year.name if year else '',
                          'status': enrollment.status, 'subjects': sorted(subjects, key=lambda item: item['component_name'])})
        output.append({'student_id': student.id, 'student_name': (person.social_name or person.name) if person else '',
                       'student_number': student.number, 'school_id': student.school_id,
                       'school_name': school.name if school else '', 'enrollments': items})
    return {'students': output, 'note': NOTE}


def report_response(db, students, student_id, enrollment_id, issuer):
    student = next((item for item in students if item.id == student_id), None)
    if not student:
        fail(404, 'Estudante não encontrado para este acesso.')
    info = learning_data(db, [student])['students'][0]
    enrollments = [row for row in info['enrollments'] if not enrollment_id or row['enrollment_id'] == enrollment_id]
    if enrollment_id and not enrollments:
        fail(404, 'Matrícula não encontrada para este acesso.')
    rows = []
    for enrollment in enrollments:
        for subject in enrollment['subjects']:
            for period in subject['periods']:
                a = period['attendance']
                rows.append({'year': enrollment['year_name'], 'class': enrollment['class_name'],
                             'subject': subject['component_name'], 'period': period['period_name'],
                             'grade': period['grade_display'], 'present': a['present'], 'absent': a['absent'],
                             'justified': a['justified_absence'], 'attendance': f"{a['percentage']:.2f}%".replace('.', ',') if a['percentage'] is not None else 'Não consolidada',
                             'result': period['result_label']})
    if not rows:
        fail(409, 'O boletim ficará disponível após a escola publicar o fechamento do período.')
    from .school_reports import render_table
    columns = [{'key': key, 'label': label, 'type': 'text', 'width': width} for key, label, width in [
        ('year', 'Ano', .6), ('class', 'Turma', .9), ('subject', 'Componente', 1.35), ('period', 'Período', 1),
        ('grade', 'Nota / conceito', .9), ('present', 'Presenças', .7), ('absent', 'Faltas', .55),
        ('justified', 'Justif.', .55), ('attendance', 'Frequência', .9), ('result', 'Resultado do período', 1.3),
    ]]
    content = render_table(info['school_name'], 'Boletim escolar', columns, rows,
                           profile={'name': info['student_name'], 'detail': 'Registro escolar ' + info['student_number']},
                           notes=[NOTE, 'Presenças e ausências são contadas pela quantidade de aulas registrada em cada dia.'],
                           issuer=issuer, db=db)
    return Response(content, media_type='application/pdf', headers={
        'Content-Disposition': 'attachment; filename="boletim-escolar.pdf"', 'Cache-Control': 'no-store',
    })


@router.get('/profile/learning')
def profile_learning(db: DB, user: Actor, school_id: str = Query(default='', max_length=36)):
    return learning_data(db, own_profile_students(db, user, school_id))


@router.get('/profile/learning/{student_id}/report.pdf')
def profile_report(student_id: str, request: Request, db: DB, user: Actor,
                   enrollment_id: str = Query(default='', max_length=36), school_id: str = Query(default='', max_length=36)):
    students = own_profile_students(db, user, school_id)
    response = report_response(db, students, student_id, enrollment_id, user.name)
    student = next(item for item in students if item.id == student_id)
    audit(db, request, user, 'learning.report.downloaded', student, student.school_id)
    return response
