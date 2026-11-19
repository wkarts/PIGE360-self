"""Agenda semanal do docente a partir das atribuições e dos registros do Diário."""
from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import or_, select

from . import diary, models as m
from .profiles import allowed_school
from .security import Actor, DB, fail, require


def teacher_only(user: Actor):
    if user.role != "teacher":
        fail(403, "O Portal do Professor requer uma conta docente.")


router = APIRouter(prefix="/api/v1/teacher", dependencies=[Depends(teacher_only)])
# Mesmos serviços, transações, escopo de atribuição e auditoria do gestor.
router.include_router(diary.router, include_in_schema=False)


@router.get("/schools")
def schools(db: DB, user: Actor):
    records = db.execute(select(m.School.id, m.School.name).join(m.SchoolAccess).where(
        m.SchoolAccess.user_id == user.id, m.SchoolAccess.active.is_(True),
        m.SchoolAccess.archived_at.is_(None), m.School.active.is_(True),
    ).order_by(m.School.name))
    return [dict(row._mapping) for row in records]


@router.get("/schools/{school_id}/programacao")
def schedule(school_id: str, week: date, db: DB, user: Actor):
    school = allowed_school(db, user, school_id)
    require(user, "diary.read")
    assignment = m.TeacherAssignment
    owners = [assignment.teacher_user_id == user.id]
    if user.person_id:
        owners.append(assignment.teacher_person_id == user.person_id)
    rows = db.execute(select(
        assignment.id, assignment.subject_name, m.ClassGroup.name.label("class_name"),
        m.Shift.name.label("shift_name"), m.AcademicYear.name.label("year_name"),
    ).join(m.ClassGroup, m.ClassGroup.id == assignment.class_group_id)
      .join(m.AcademicYear, m.AcademicYear.id == assignment.academic_year_id)
      .outerjoin(m.Shift, m.Shift.id == m.ClassGroup.shift_id)
      .where(assignment.school_id == school.id, assignment.active.is_(True), or_(*owners))
      .order_by(m.ClassGroup.name, assignment.subject_name)).mappings().all()
    start = week - timedelta(days=week.weekday())
    end = start + timedelta(days=min(6, (date.max-start).days))
    diaries = db.execute(select(m.SchoolDiary.id, m.SchoolDiary.teacher_assignment_id,
                                m.CurriculumComponent.name.label("component"))
                         .join(m.CurriculumComponent, m.CurriculumComponent.id == m.SchoolDiary.component_id)
                         .where(m.SchoolDiary.school_id == school.id, m.SchoolDiary.teacher_assignment_id.in_(
                             [row.id for row in rows]))).all()
    ids = [row.id for row in diaries]
    events = []
    for table, day, title, kind in (
        (m.DiaryLesson, m.DiaryLesson.lesson_date, m.DiaryLesson.content, "Aula registrada"),
        (m.AssessmentInstrument, m.AssessmentInstrument.assessment_date, m.AssessmentInstrument.title, "Avaliação"),
    ):
        events.extend(dict(row, kind=kind) for row in db.execute(
            select(table.id, table.diary_id, day.label("date"), title.label("title"))
            .where(table.diary_id.in_(ids), day.between(start, end))).mappings())
    return {"starts_on": start, "ends_on": end, "assignments": [dict(row) for row in rows],
            "diaries": [dict(row._mapping) for row in diaries],
            "events": sorted(events, key=lambda item: (item["date"], item["kind"], item["title"], item["id"]))}
