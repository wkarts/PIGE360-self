"""Boletins publicados: leitura própria a partir de fechamentos imutáveis do Diário."""
from collections import defaultdict
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from fastapi import APIRouter, Query, Request
from fastapi.responses import Response
from sqlalchemy import select
from . import models as m
from .school_reports import format_value
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
    if user.role not in ('student', 'guardian'):
        fail(403, 'Este espaço é destinado a estudantes e responsáveis vinculados.')
    from .profiles import school_ids, allowed_school
    active_id = getattr(user, '_active_school_id', None)
    if school_id and active_id and school_id != active_id:
        fail(409, 'A instituição ativa foi alterada. Reabra a tela antes de continuar.')
    if school_id:
        allowed_school(db, user, school_id)
    schools = school_ids(db, user)
    # Resolve even the implicit single-school context before consulting effective
    # permissions. Omitting X-School-ID must never fall back to the base role.
    require(user, 'profile.self')
    require(user, 'student.self.read' if user.role == 'student' else 'guardian.self.read')
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


def _period_data(snapshot, enrollment, period, closure, lessons_in_scope=None):
    result = next((row for row in snapshot.get('period_results', [])
                   if row.get('enrollment_id') == enrollment.id
                   and row.get('student_id') == enrollment.student_id
                   and row.get('academic_period_id') == period.id), None)
    lessons = {row['id']: row for row in snapshot.get('lessons', [])
               if row.get('academic_period_id') == period.id
               and (lessons_in_scope is None or row['id'] in lessons_in_scope)
               and str(row.get('lesson_date', '')) >= enrollment.enrolled_on.isoformat()
               and ('expected_enrollment_ids' not in row or enrollment.id in row['expected_enrollment_ids'])}
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
    calculation = (result or {}).get('calculation') or {}
    if calculation.get('attendance_percent') is not None:
        percentage = float(Decimal(str(calculation['attendance_percent'])).quantize(Decimal('.01'), rounding=ROUND_HALF_UP))
    recovery = (calculation.get('aggregation') or {}).get('recovery') or []
    opinions = [r['text'] for r in snapshot.get('opinions', []) if r.get('status') == 'final'
                and r.get('enrollment_id') == enrollment.id and r.get('student_id') == enrollment.student_id
                and r.get('academic_period_id') == period.id]
    return {
        'period_id': period.id, 'period_name': period.name,
        'order_index': period.order_index, 'starts_on': period.starts_on.isoformat(),
        'grade_display': _grade(result), 'result_status': result.get('status', 'pending') if result else 'pending',
        'result_label': RESULT_LABELS.get(result.get('status'), 'Consolidado') if result else 'Consolidação pendente',
        'attendance': {**counts, 'percentage': percentage}, 'published': True,
        'published_at': closure.closed_at.isoformat(), 'publication_id': closure.id,
        'opinions': opinions, 'recovery': [str(v.get('concept') or v['score']).replace('.', ',')
                                          for v in recovery if v.get('concept') or v.get('score') is not None],
    }


def grade_tables(subjects, current_class, *, attendance=False, style='grade', calendars=None):
    """Quadros por turma de origem. Cada coluna representa um fechamento publicado."""
    classes = {}
    for subject in subjects:
        for period in subject['periods']:
            group = period['class_name'] or current_class
            heading = period['component_name'] or subject['component_name']
            periods, components = classes.setdefault((period.get('class_group_id') or group, period.get('class_label') or group), ({}, {}))
            periods.setdefault(period['period_id'], period)
            # Diários diferentes com nomes iguais continuam sendo linhas independentes.
            cells = components.setdefault((heading, subject['diary_id']), {})
            if attendance or style in ('integrated', 'journey'):
                counts = period['attendance']
                rate = format_value(counts['percentage'], 'percent') if counts['percentage'] is not None else 'Não apurada'
                detail = f"{counts['total']} A · {counts['absent']} F · {counts['justified_absence']} J"
                if counts['unrecorded']:
                    detail += f" · {counts['unrecorded']} S"
                if style == 'integrated':
                    detail = period['grade_display'] + '\n' + detail + ' · ' + rate
                elif style == 'journey':
                    detail = period['grade_display'] + ' · ' + rate + '\n' + detail
                    if period.get('recovery'):
                        detail += '\nRec.: ' + ', '.join(period['recovery'])
                else:
                    detail = rate + '\n' + detail
                cells[period['period_id']] = detail
            else:
                cells[period['period_id']] = period['grade_display']

    tables = []
    for (group_id, group), (periods, components) in classes.items():
        columns_in_scope = {p['period_id']: p for p in (calendars or {}).get(group_id, [])}
        columns_in_scope.update(periods)  # O nome congelado no fechamento prevalece.
        ordered = sorted(columns_in_scope.values(), key=lambda p: (p['order_index'], p['starts_on'], p['period_id']))
        # Limite de leitura por quadro, independente da quantidade de etapas do calendário.
        for start in range(0, len(ordered), 4):
            window = ordered[start:start + 4]
            columns = [{'key': 'subject', 'label': 'Componente curricular', 'width': 2}]
            columns.extend({'key': p['period_id'], 'label': p['period_name']} for p in window)
            rows = [{'subject': label, **{p['period_id']: cells.get(p['period_id'], '—' if p['period_id'] in periods else 'Não publicado') for p in window}}
                    for (label, _), cells in sorted(components.items())
                    if calendars or any(p['period_id'] in cells for p in window)]
            label = 'Frequência por período' if attendance else 'Notas e conceitos'
            if style == 'integrated':
                label = 'Rendimento e frequência'
            elif style == 'journey':
                label = 'Percurso por componente'
            tables.append({'class_group_id': group_id, 'title': label + ' · ' + group, 'columns': columns, 'rows': rows})
    return tables


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
            class_ids = {enrollment.class_group_id}
            moves = db.execute(select(m.EnrollmentEvent.created_at, m.EnrollmentEvent.before, m.EnrollmentEvent.after).where(
                m.EnrollmentEvent.school_id == student.school_id,
                m.EnrollmentEvent.enrollment_id == enrollment.id,
                m.EnrollmentEvent.action == 'change_class').order_by(m.EnrollmentEvent.created_at.desc(), m.EnrollmentEvent.id.desc())).all()
            for _, before, after in moves:
                for state in (before, after):
                    if isinstance(state, dict) and state.get('class_group_id'):
                        class_ids.add(state['class_group_id'])
            def enrolled_for_lesson(lesson, diary):
                if 'expected_enrollment_ids' in lesson:
                    return enrollment.id in lesson['expected_enrollment_ids']
                origin = enrollment.class_group_id
                for stamp, before, _ in moves:
                    if stamp.date().isoformat() <= lesson['lesson_date']:
                        break
                    origin = (before or {}).get('class_group_id', origin)
                return origin == diary.class_group_id

            diaries = list(db.scalars(select(m.SchoolDiary).where(
                m.SchoolDiary.school_id == student.school_id,
                m.SchoolDiary.class_group_id.in_(class_ids),
                m.SchoolDiary.academic_year_id == enrollment.academic_year_id,
            )))
            groups = {g.id: g for g in db.scalars(select(m.ClassGroup).where(m.ClassGroup.school_id == student.school_id,
                                                                                    m.ClassGroup.id.in_(class_ids)))}
            units = dict(db.execute(select(m.Unit.id, m.Unit.name).where(m.Unit.school_id == student.school_id,
                          m.Unit.id.in_({g.unit_id for g in groups.values()}))).all())
            from .diary import period_applies
            inactive = set(db.execute(select(m.SchoolDiary.class_group_id, m.DiaryClosure.academic_period_id).join(
                m.SchoolDiary, m.SchoolDiary.id == m.DiaryClosure.diary_id).where(m.DiaryClosure.school_id == student.school_id,
                m.SchoolDiary.id.in_([d.id for d in diaries]), m.DiaryClosure.active.is_(False))).all())
            intervals = defaultdict(list)
            last_group, last_day = enrollment.class_group_id, year.ends_on
            from datetime import timedelta
            for stamp, before, _ in moves:
                day = stamp.date()
                intervals[last_group].append((max(day, enrollment.enrolled_on), last_day))
                last_day = min(last_day, day - timedelta(days=1))
                last_group = (before or {}).get('class_group_id') or last_group
            intervals[last_group].append((enrollment.enrolled_on, last_day))
            calendars = {gid: [{'period_id': p.id, 'period_name': p.name, 'order_index': p.order_index,
                                'starts_on': p.starts_on.isoformat()} for p in periods
                               if period_applies(origin, p) and (gid, p.id) not in inactive
                               and any(start <= end and start <= p.ends_on and end >= p.starts_on for start, end in intervals[gid])]
                         for gid, origin in groups.items()}
            by_diary = defaultdict(list)
            for revision in db.scalars(select(m.DiaryClosure).where(m.DiaryClosure.school_id == student.school_id,
                    m.DiaryClosure.diary_id.in_([d.id for d in diaries]), m.DiaryClosure.active.is_(True))
                    .order_by(m.DiaryClosure.closed_at.desc(), m.DiaryClosure.id.desc())):
                by_diary[revision.diary_id].append(revision)
            component_names = dict(db.execute(select(m.CurriculumComponent.id, m.CurriculumComponent.name).where(
                m.CurriculumComponent.school_id == student.school_id, m.CurriculumComponent.id.in_([d.component_id for d in diaries]))).all())
            subjects = []
            for diary in diaries:
                closures = by_diary[diary.id]
                published = []
                for period in periods:
                    closure = next((row for row in closures
                                    if row.academic_period_id in (None, period.id)), None)
                    if not closure:
                        continue
                    snapshot = closure.snapshot or {}
                    if not any(row.get('enrollment_id') == enrollment.id and row.get('student_id') == student.id for key in ('roster', 'attendance', 'period_results') for row in snapshot.get(key, [])):
                        continue
                    eligible = {r['id'] for r in snapshot.get('lessons', []) if r.get('academic_period_id') == period.id
                                and str(r.get('lesson_date', '')) >= enrollment.enrolled_on.isoformat()
                                and enrolled_for_lesson(r, diary)}
                    personal = any(r.get('enrollment_id') == enrollment.id and r.get('student_id') == student.id
                                   and r.get('academic_period_id') == period.id for key in ('period_results', 'opinions')
                                   for r in snapshot.get(key, []))
                    if not eligible and not personal:
                        continue
                    # Nenhum resultado de outro estudante, anotação interna ou rascunho é serializado.
                    item = _period_data(snapshot, enrollment, period, closure, eligible)
                    origin = snapshot.get('diary') or {}
                    source_group = groups[diary.class_group_id]
                    item['class_group_id'] = source_group.id
                    item['class_name'] = origin.get('class_name') or source_group.name
                    item['class_label'] = item['class_name'] + ' · ' + units.get(source_group.unit_id, '')
                    item['unit_id'] = source_group.unit_id
                    item['component_name'] = origin.get('component_name') or ''
                    if closure.academic_period_id == period.id and snapshot.get('period'):
                        item['period_name'] = snapshot['period'].get('name') or period.name
                    published.append(item)
                if published:
                    subjects.append({'diary_id': diary.id, 'component_name': published[-1]['component_name'] or component_names.get(diary.component_id, ''), 'periods': published})
            from .report_preferences import preferences
            prefs = preferences(school)
            grade = db.get(m.Grade, group.grade_id)
            shift = db.get(m.Shift, group.shift_id)
            items.append({'class_group_id': group.id, 'academic_year_id': year.id,
                          'grade_id': grade.id, 'grade_name': grade.name, 'stage': grade.level, 'shift': shift.name,
                          'unit': units.get(group.unit_id), 'bulletin_model': prefs['bulletin'], 'report_color': prefs['color'],
                          'calendar': [{'id': p.id, 'name': p.name, 'starts_on': p.starts_on.isoformat(), 'ends_on': p.ends_on.isoformat()}
                                       for p in periods if period_applies(group, p)],
                          'enrollment_id': enrollment.id, 'number': enrollment.number,
                          'class_name': group.name if group else '', 'year_name': year.name if year else '',
                          'status': enrollment.status, 'class_calendars': calendars, 'grade_tables': grade_tables(subjects, group.name, calendars=calendars),
                          'subjects': sorted(subjects, key=lambda item: item['component_name'])})
        from .report_bulletins import published_editions, bulletin_sections
        editions = published_editions(db, student, items)
        for item in items:
            item['display_sections'] = bulletin_sections([item], item['bulletin_model'])
            item['official_editions'] = editions[item['enrollment_id']]
        from .student_reports import student_photo
        import base64
        from io import BytesIO
        from PIL import Image
        thumbnail = ''
        photo = student_photo(db, student.school_id, person) if person else None
        if photo:
            with Image.open(BytesIO(photo)) as picture:
                picture.thumbnail((128, 160))
                stream = BytesIO()
                picture.convert('RGB').save(stream, format='JPEG')
                thumbnail = 'data:image/jpeg;base64,' + base64.b64encode(stream.getvalue()).decode()
        from .report_preferences import school_logo_url
        logo = school_logo_url(school)
        output.append({'report_logo': logo, 'report_font': (school.report_preferences or {}).get('font_family', 'inherit'), 'photo': thumbnail, 'student_id': student.id, 'student_name': (person.social_name or person.name) if person else '',
                       'student_number': student.number, 'school_id': student.school_id,
                       'school_name': school.name if school else '', 'enrollments': items})
    return {'students': output, 'note': NOTE}


def report_response(db, students, student_id, enrollment_id, issuer, document_id=''):
    student = next((item for item in students if item.id == student_id), None)
    if not student:
        fail(404, 'Estudante não encontrado para este acesso.')
    info = learning_data(db, [student])['students'][0]
    enrollments = [row for row in info['enrollments'] if not enrollment_id or row['enrollment_id'] == enrollment_id]
    if enrollment_id and not enrollments:
        fail(404, 'Matrícula não encontrada para este acesso.')
    from .report_bulletins import render_bulletin, official_content
    content = official_content(db, student, enrollments, document_id) if document_id else render_bulletin(db, student, info, enrollments, issuer)
    return Response(content, media_type='application/pdf', headers={
        'Content-Disposition': 'attachment; filename="boletim-escolar.pdf"', 'Cache-Control': 'no-store',
    })


@router.get('/profile/learning')
def profile_learning(db: DB, user: Actor, school_id: str = Query(default='', max_length=36)):
    return learning_data(db, own_profile_students(db, user, school_id))


@router.get('/profile/learning/{student_id}/report.pdf')
def profile_report(student_id: str, request: Request, db: DB, user: Actor,
                   enrollment_id: str = Query(default='', max_length=36), document_id: str = Query(default='', max_length=36), school_id: str = Query(default='', max_length=36)):
    students = own_profile_students(db, user, school_id)
    response = report_response(db, students, student_id, enrollment_id, user.name, document_id)
    student = next(item for item in students if item.id == student_id)
    audit(db, request, user, 'learning.report.downloaded', student, student.school_id)
    return response
