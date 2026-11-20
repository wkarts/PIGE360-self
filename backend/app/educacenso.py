"""Prévia local das fontes acadêmicas para a Matrícula Inicial."""
from datetime import date
from collections import Counter, defaultdict

from fastapi import APIRouter, Request
from pydantic import Field
from sqlalchemy import select

from . import models as m
from .common import audit
from .schemas import Input
from .enrollment_history import state_on_date
from .security import Actor, DB, Scope, check_version, fail, lock_school, require, scoped

router = APIRouter(prefix='/api/v1/schools/{school_id}/educacenso', tags=['Educacenso'])


class PreviewSetting(Input):
    enabled: bool
    version: int = Field(ge=1)


@router.get('/configuration')
def configuration(user: Actor, school: Scope):
    require(user, 'educacenso.preview')
    return {'enabled': school.census_preview_enabled, 'version': school.version}


@router.put('/configuration')
def configure(data: PreviewSetting, request: Request, db: DB, user: Actor, school: Scope):
    require(user, 'schools.manage')
    require(user, 'educacenso.preview')
    lock_school(db, school.id)
    db.refresh(school)
    check_version(school, data.version)
    if school.census_preview_enabled != data.enabled:
        school.census_preview_enabled = data.enabled
        school.version += 1
        audit(db, request, user, 'educacenso.preview.configured', school, school.id, {'enabled': data.enabled})
    return {'enabled': school.census_preview_enabled, 'version': school.version}


def require_preview(user, school):
    require(user, 'educacenso.preview')
    if not school.census_preview_enabled:
        fail(409, 'A Direção precisa habilitar a prévia para esta escola.')


@router.get('/years')
def years(db: DB, user: Actor, school: Scope):
    require_preview(user, school)
    rows = db.execute(select(m.AcademicYear.id, m.AcademicYear.name).where(
        m.AcademicYear.school_id == school.id).order_by(m.AcademicYear.starts_on.desc()))
    return [dict(row._mapping) for row in rows]


@router.get('/preview')
def preview(academic_year_id: str, reference_date: date, db: DB, user: Actor, school: Scope):
    require_preview(user, school)
    year = scoped(db, m.AcademicYear, academic_year_id, school.id)
    if not year.starts_on <= reference_date <= year.ends_on:
        fail(422, 'A data de referência precisa estar dentro do ano letivo selecionado.')

    filters = (m.Enrollment.school_id == school.id, m.Enrollment.academic_year_id == year.id,
               m.Enrollment.enrolled_on <= reference_date)
    events = defaultdict(list)
    for event in db.scalars(select(m.EnrollmentEvent).join(m.Enrollment).where(
            *filters, m.EnrollmentEvent.school_id == school.id,
            m.EnrollmentEvent.created_at >= reference_date
    ).order_by(m.EnrollmentEvent.created_at.desc(), m.EnrollmentEvent.id.desc())):
        events[event.enrollment_id].append(event)
    groups = {g.id: g.name for g in db.scalars(select(m.ClassGroup).where(
        m.ClassGroup.school_id == school.id, m.ClassGroup.academic_year_id == year.id))}
    counts = Counter()
    students, unidentified = set(), set()
    for enrollment, inep_code in db.execute(select(m.Enrollment, m.Student.inep_code).join(
            m.Student, m.Student.id == m.Enrollment.student_id).where(*filters, m.Student.school_id == school.id)):
        state = state_on_date(enrollment, reference_date, events[enrollment.id])
        if state and state[0] in ('active', 'suspended'):
            counts[state[1]] += 1
            students.add(enrollment.student_id)
            if not (inep_code or '').strip():
                unidentified.add(enrollment.student_id)

    return {'reference_date': reference_date, 'academic_year_id': year.id,
            'enrollments': sum(counts.values()), 'students': len(students),
            'students_without_local_inep_id': len(unidentified),
            'groups': [{'name': groups.get(group_id, 'Turma a conferir'), 'enrollments': count}
                       for group_id, count in sorted(counts.items(), key=lambda pair: (groups.get(pair[0], ''), pair[0]))],
            'official_export_available': False}
