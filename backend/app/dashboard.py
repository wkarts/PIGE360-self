"""Leituras da Visão geral. Cada bloco usa o vínculo ativo e a permissão do seu módulo."""
from datetime import UTC, datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import case, func, select

from . import models as m
from .admission_reservations import active_reservations
from .security import utc
from .school_community import SchoolCommunityPost, role_audiences, visible_query

SCHOOL_ZONE = ZoneInfo('America/Bahia')
MAX_ROWS = 6
OPEN_PROTOCOLS = ('open', 'in_progress', 'waiting')


def capacity_summary(db, school_id):
    """Agrupa os vínculos e as reservas antes de apurar as vagas de cada turma."""
    group, year, enrollment, admission = m.ClassGroup, m.AcademicYear, m.Enrollment, m.Admission
    groups = db.execute(select(group.id, group.capacity).join(year, year.id == group.academic_year_id).where(
        group.school_id == school_id, year.school_id == school_id, group.active.is_(True), year.status == 'active')).all()
    if not groups:
        return {'classes':0, 'capacity':0, 'available':0}
    ids = [g.id for g in groups]
    occupied = dict(db.execute(select(enrollment.class_group_id, func.count(enrollment.id)).where(
        enrollment.school_id == school_id, enrollment.class_group_id.in_(ids), enrollment.status.in_(('active','suspended'))
    ).group_by(enrollment.class_group_id)).all())
    reserved = dict(db.execute(active_reservations().with_only_columns(admission.class_group_id, func.count(admission.id)).where(
        admission.school_id == school_id, enrollment.school_id == school_id, admission.class_group_id.in_(ids)
    ).group_by(admission.class_group_id)).all())
    available = sum(max(0, g.capacity - occupied.get(g.id, 0) - reserved.get(g.id, 0)) for g in groups)
    return {'classes':len(groups), 'capacity':sum(g.capacity for g in groups), 'available':available}


def school_operations(db, school_id, user, permissions, instant, days):
    day = instant.astimezone(SCHOOL_ZONE).date()
    first_day = day - timedelta(days=days - 1)
    last_day = day + timedelta(days=6)
    since = datetime.combine(first_day, time.min, SCHOOL_ZONE).astimezone(UTC)
    until = datetime.combine(last_day + timedelta(days=1), time.min, SCHOOL_ZONE).astimezone(UTC)
    activity, agenda, counts = [], [], {}

    def add_activity(query, page, label=None):
        rows = db.execute(query.order_by(query.selected_columns.stamp.desc(), query.selected_columns.id.desc()).limit(MAX_ROWS))
        for row in rows:
            stamp = utc(row.stamp)
            activity.append(dict(id=row.id, at=stamp.astimezone(UTC), title=label or row.title, detail=row.detail, page=page,
                                 record_id=getattr(row, 'record_id', row.id)))

    def add_agenda(query, page, label):
        rows = db.execute(query.order_by(query.selected_columns.due, query.selected_columns.id).limit(MAX_ROWS))
        for row in rows:
            due = row.due
            hour = ''
            if isinstance(due, datetime):
                local = utc(due).astimezone(SCHOOL_ZONE)
                due, hour = local.date(), local.strftime('%H:%M')
            agenda.append(dict(id=row.id, day=due, hour=hour, title=row.title, detail=row.detail, kind=label, page=page))

    if 'enrollments.read' in permissions:
        e = m.Enrollment
        add_activity(select(e.id, e.created_at.label('stamp'), e.number.label('detail')).where(
            e.school_id == school_id, e.created_at.between(since, instant)), 'enrollments', 'Matrícula registrada')

        event = m.EnrollmentEvent
        labels = {'activate':'Matrícula efetivada', 'reactivate':'Matrícula reativada', 'suspend':'Matrícula suspensa',
                  'cancel':'Matrícula cancelada', 'transfer':'Transferência registrada', 'complete':'Matrícula concluída',
                  'change_class':'Turma da matrícula alterada'}
        add_activity(select(event.id, e.id.label('record_id'), event.created_at.label('stamp'),
                            e.number.label('detail'), case(labels, value=event.action).label('title'))
                     .join(e, e.id == event.enrollment_id).where(
                         e.school_id == school_id, event.school_id == school_id, event.action.in_(labels),
                         event.created_at.between(since, instant)), 'enrollments')

    if 'documents.read' in permissions:
        doc, kind = m.StudentDocument, m.DocumentType
        add_activity(select(doc.id, doc.created_at.label('stamp'), kind.name.label('detail'))
                     .join(kind, kind.id == doc.document_type_id).where(
                         doc.school_id == school_id, kind.school_id == school_id, doc.file_id.is_not(None),
                         doc.status != 'archived', doc.created_at.between(since, instant)), 'documents', 'Documento recebido')

    if 'admissions.read' in permissions:
        a = m.Admission
        counts['admissions_review'] = db.scalar(select(func.count(a.id)).where(
            a.school_id == school_id, a.status.in_(('submitted', 'under_review'))))
        add_activity(select(a.id, a.submitted_at.label('stamp'), a.number.label('detail')).where(
            a.school_id == school_id, a.submitted_at.between(since, instant)), 'online', 'Inscrição enviada')

    if 'protocols.read' in permissions:
        p = m.Protocol
        for stamp, label in ((p.created_at, 'Protocolo aberto'), (p.completed_at, 'Protocolo concluído')):
            add_activity(select(p.id, stamp.label('stamp'), p.number.label('detail')).where(
                p.school_id == school_id, stamp.between(since, instant)), 'protocols', label)
        add_agenda(select(p.id, p.due_on.label('due'), p.kind.label('title'), p.number.label('detail')).where(
            p.school_id == school_id, p.status.in_(OPEN_PROTOCOLS), p.due_on.between(day, last_day)), 'protocols', 'Prazo de protocolo')

    if 'banking.read' in permissions:
        from .banking import effective_status_expression
        counts['overdue_charges'] = db.scalar(select(func.count(m.BankCharge.id)).where(
            m.BankCharge.school_id == school_id, effective_status_expression() == 'overdue'))

    if 'diary.read' in permissions and user.role in ('admin', 'direction', 'coordination', 'secretary', 'viewer'):
        lesson, group, diary, exam = m.DiaryLesson, m.ClassGroup, m.SchoolDiary, m.AssessmentInstrument
        missing = ~select(m.DiaryAttendance.id).where(
            m.DiaryAttendance.school_id == school_id, m.DiaryAttendance.lesson_id == lesson.id).exists()
        counts['lessons_without_calls'] = db.scalar(select(func.count(lesson.id)).where(
            lesson.school_id == school_id, lesson.lesson_date.between(day - timedelta(days=6), day), missing))
        add_activity(select(lesson.id, lesson.created_at.label('stamp'), group.name.label('detail'))
                     .join(diary, diary.id == lesson.diary_id).join(group, group.id == diary.class_group_id).where(
                         lesson.school_id == school_id, diary.school_id == school_id, group.school_id == school_id,
                         lesson.created_at.between(since, instant)), 'diary', 'Aula registrada')
        add_agenda(select(exam.id, exam.assessment_date.label('due'), exam.title, group.name.label('detail'))
                   .join(diary, diary.id == exam.diary_id).join(group, group.id == diary.class_group_id).where(
                       exam.school_id == school_id, diary.school_id == school_id, group.school_id == school_id,
                       exam.status == 'published', exam.assessment_date.between(day, last_day)), 'diary', 'Avaliação')

    if user.role not in ('teacher', 'student', 'guardian'):
        post = SchoolCommunityPost
        visible = visible_query(school_id, role_audiences(user.role))
        add_activity(visible.with_only_columns(post.id, post.publish_at.label('stamp'), post.title.label('detail')).where(
            post.publish_at.between(since, instant)), 'community', 'Publicação da escola')
        add_agenda(visible.with_only_columns(post.id, post.event_start.label('due'), post.title, post.location.label('detail')).where(
            post.kind == 'event', post.event_start >= datetime.combine(day, time.min, SCHOOL_ZONE).astimezone(UTC),
            post.event_start < until), 'community', 'Evento')

    activity.sort(key=lambda item: (item['at'], item['id']), reverse=True)
    agenda.sort(key=lambda item: (item['day'], item['hour'], item['kind'], item['id']))
    return dict(today=day, days=days, since=first_day, through=last_day, counts=counts,
                activity=activity[:MAX_ROWS], agenda=agenda[:MAX_ROWS])
