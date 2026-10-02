"""API do núcleo do Diário Escolar Digital."""
import hashlib
import json
from decimal import Decimal, ROUND_HALF_UP
from datetime import UTC, date, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Request
from fastapi.responses import Response
from sqlalchemy import func, select

from . import diary_schemas as s, models as m
from .common import audit, output
from .db import now
from .documents import render_pdf
from .portal_access import PORTAL_DIARY_ACCESS_CONSENT_VERSION, verified_guardian_contact_matches
from .security import Actor, DB, PERMISSIONS, check_version, current_user, fail, lock_school, require
from .lifecycle_models import require_available


router = APIRouter(prefix="/api/v1/schools/{school_id}", tags=["Diário Escolar Digital"])


def diary_school_scope(school_id: str, db: DB, user: Actor):
    school = db.get(m.School, school_id)
    if not school or not school.active:
        fail(404, "Escola não encontrada.")
    if user.role == "admin":
        return school
    if user.role in {"direction","coordination","secretary","viewer"}:
        if not db.get(m.SchoolAccess, (user.id, school_id)):
            fail(403, "Acesso não autorizado a esta escola.")
        return school
    if user.role == "teacher":
        ownership = [m.TeacherAssignment.teacher_user_id == user.id]
        if user.person_id:
            ownership.append(m.TeacherAssignment.teacher_person_id == user.person_id)
        condition = ownership[0]
        for item in ownership[1:]:
            condition = condition | item
        own = db.scalar(select(m.TeacherAssignment.id).where(
            m.TeacherAssignment.school_id == school_id,
            m.TeacherAssignment.active.is_(True),
            condition,
        ))
        if own:
            return school
    fail(403, "Acesso não autorizado ao Diário Escolar desta escola.")


DiaryScope = Annotated[m.School, Depends(diary_school_scope)]


def _scoped(db, model, record_id, school_id):
    obj = db.scalar(select(model).where(model.id == record_id, model.school_id == school_id))
    if obj is None:
        fail(404, "Registro não encontrado nesta escola.")
    return obj


def _teacher_owns(db, user, diary):
    if user.role != "teacher":
        return True
    if not diary.teacher_assignment_id:
        return False
    assignment = db.get(m.TeacherAssignment, diary.teacher_assignment_id)
    return bool(
        assignment and assignment.active and assignment.school_id == diary.school_id and
        (assignment.teacher_user_id == user.id or (user.person_id and assignment.teacher_person_id == user.person_id))
    )


def _require_diary(db, user, diary, permission):
    require(user, permission)
    if not _teacher_owns(db, user, diary):
        fail(403, "Este diário não pertence a uma atribuição docente do usuário.")


def _require_open_diary(diary):
    if diary.status != "open":
        fail(409, "O diário precisa estar aberto para alterações.")


def _period(db, school_id, period_id, year_id=None):
    if not period_id:
        return None
    obj = _scoped(db, m.AcademicPeriod, period_id, school_id)
    if year_id and obj.academic_year_id != year_id:
        fail(422, "O período não pertence ao ano letivo do diário.")
    return obj


def _diary_output(db, obj):
    group = db.get(m.ClassGroup, obj.class_group_id)
    component = db.get(m.CurriculumComponent, obj.component_id)
    year = db.get(m.AcademicYear, obj.academic_year_id)
    assignment = db.get(m.TeacherAssignment, obj.teacher_assignment_id) if obj.teacher_assignment_id else None
    teacher = None
    if assignment:
        person = db.get(m.Person, assignment.teacher_person_id) if assignment.teacher_person_id else None
        user = db.get(m.User, assignment.teacher_user_id) if assignment.teacher_user_id else None
        teacher = person.name if person else user.name if user else ""
    return {
        **output(obj),
        "class_name": group.name if group else "",
        "component_name": component.name if component else "",
        "year_name": year.name if year else "",
        "teacher_name": teacher or "",
    }


def _enrollment_state_on(db, enrollment, on_date: date):
    if enrollment.enrolled_on > on_date:
        return None
    status = enrollment.status
    class_group_id = enrollment.class_group_id
    events = list(db.scalars(select(m.EnrollmentEvent).where(
        m.EnrollmentEvent.enrollment_id == enrollment.id
    ).order_by(m.EnrollmentEvent.created_at.desc(), m.EnrollmentEvent.id.desc())))
    for event in events:
        event_date = event.created_at.date() if event.created_at else enrollment.enrolled_on
        if event_date > on_date and isinstance(event.before, dict):
            status = str(event.before.get("status") or status)
            class_group_id = str(event.before.get("class_group_id") or class_group_id)
    return status, class_group_id


def _attendance_roster(db, diary, lesson_date: date | None = None):
    if lesson_date is None:
        enrollments = db.scalars(select(m.Enrollment).where(
            m.Enrollment.school_id == diary.school_id,
            m.Enrollment.class_group_id == diary.class_group_id,
            m.Enrollment.status.in_(["active","suspended"]),
        ).order_by(m.Enrollment.number)).all()
    else:
        enrollments = db.scalars(select(m.Enrollment).where(
            m.Enrollment.school_id == diary.school_id,
            m.Enrollment.academic_year_id == diary.academic_year_id,
        ).order_by(m.Enrollment.number)).all()
    rows = []
    for enrollment in enrollments:
        if lesson_date is not None:
            state = _enrollment_state_on(db, enrollment, lesson_date)
            if not state:
                continue
            status, class_group_id = state
            if class_group_id != diary.class_group_id or status not in ("active","suspended"):
                continue
        else:
            status = enrollment.status
        student = db.get(m.Student, enrollment.student_id)
        person = db.get(m.Person, student.person_id) if student else None
        if student and person:
            rows.append({
                "enrollment_id": enrollment.id,
                "student_id": student.id,
                "number": student.number,
                "name": person.name,
                "enrollment_status": status,
            })
    return rows


def _enrollment_for_diary(db, diary, enrollment_id: str, on_date: date | None = None):
    enrollment = _scoped(db, m.Enrollment, enrollment_id, diary.school_id)
    if enrollment.academic_year_id != diary.academic_year_id:
        fail(422, "A matrícula pertence a outro ano letivo.")
    if on_date:
        state = _enrollment_state_on(db, enrollment, on_date)
        if not state or state[1] != diary.class_group_id or state[0] not in ("active","suspended"):
            fail(422, "A matrícula não pertencia a esta turma na data informada.")
    elif enrollment.class_group_id != diary.class_group_id:
        belonged = False
        for event in db.scalars(select(m.EnrollmentEvent).where(m.EnrollmentEvent.enrollment_id == enrollment.id)):
            before = event.before if isinstance(event.before, dict) else {}
            after = event.after if isinstance(event.after, dict) else {}
            if before.get("class_group_id") == diary.class_group_id or after.get("class_group_id") == diary.class_group_id:
                belonged = True
                break
        if not belonged:
            fail(422, "A matrícula não pertence ao histórico desta turma.")
    return enrollment


def _portal_recipients_for_student(db, school_id, student_id):
    rows=db.execute(
        select(m.PortalStudentAccess,m.GuardianLink,m.Person,m.PortalAccount)
        .join(m.GuardianLink,m.GuardianLink.id==m.PortalStudentAccess.guardian_link_id)
        .join(m.Person,m.Person.id==m.GuardianLink.person_id)
        .join(m.Student,m.Student.id==m.GuardianLink.student_id)
        .join(m.PortalAccount,m.PortalAccount.id==m.PortalStudentAccess.account_id)
        .where(
            m.PortalStudentAccess.school_id==school_id,
            m.PortalStudentAccess.student_id==student_id,
            m.PortalStudentAccess.active.is_(True),
            m.PortalStudentAccess.consent_version==PORTAL_DIARY_ACCESS_CONSENT_VERSION,
            m.GuardianLink.school_id==school_id,
            m.GuardianLink.active.is_(True),
            m.GuardianLink.legal.is_(True),
            m.GuardianLink.student_id==student_id,
            m.Person.school_id==school_id,
            m.Person.active.is_(True),
            m.Student.school_id==school_id,
            m.Student.status=="active",
            m.Student.id.in_(select(m.Enrollment.student_id).where(
                m.Enrollment.school_id==school_id,
                m.Enrollment.status.in_(["active","suspended"]),
            )),
            m.PortalAccount.school_id==school_id,
            m.PortalAccount.active.is_(True),
        )
        .order_by(m.Person.name,m.GuardianLink.id,m.PortalAccount.id)
    ).all()
    result={}
    for access,link,person,account in rows:
        if not verified_guardian_contact_matches(account,person):
            continue
        item=result.setdefault(link.id,{'link':link,'person':person,'accounts':[]})
        item['accounts'].append(account)
    return result


def _communication_output(db, item):
    student=db.get(m.Student,item.student_id)
    person=db.get(m.Person,student.person_id) if student else None
    guardian=db.get(m.GuardianLink,item.guardian_link_id)
    guardian_person=db.get(m.Person,guardian.person_id) if guardian else None
    occurrence=db.get(m.DiaryOccurrence,item.occurrence_id) if item.occurrence_id else None
    return {
        'id':item.id,'enrollment_id':item.enrollment_id,'student_id':item.student_id,
        'student_name':person.name if person else '',
        'guardian_link_id':item.guardian_link_id,
        'guardian_name':guardian_person.name if guardian_person else '',
        'occurrence_id':item.occurrence_id,'title':item.title,'message':item.message,
        'occurrence_title':occurrence.title if occurrence else None,
        'academic_period_id':item.academic_period_id,
        'sent_at':item.sent_at.isoformat(),'read_at':item.read_at.isoformat() if item.read_at else None,
    }


def _json_safe(value):
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, dict):
        return {key:_json_safe(item) for key,item in value.items()}
    if isinstance(value, list):
        return [_json_safe(item) for item in value]
    return value


def _snapshot(db, diary, period_id=None):
    lessons_stmt = select(m.DiaryLesson).where(m.DiaryLesson.diary_id == diary.id)
    if period_id:
        lessons_stmt = lessons_stmt.where(m.DiaryLesson.academic_period_id == period_id)
    lessons = list(db.scalars(lessons_stmt.order_by(m.DiaryLesson.lesson_date, m.DiaryLesson.id)))
    lesson_ids = [x.id for x in lessons]
    attendances = []
    if lesson_ids:
        attendances = [output(x) for x in db.scalars(select(m.DiaryAttendance).where(
            m.DiaryAttendance.lesson_id.in_(lesson_ids)
        ).order_by(m.DiaryAttendance.lesson_id, m.DiaryAttendance.enrollment_id))]
    plan_stmt = select(m.CurriculumPlan).where(
        m.CurriculumPlan.school_id == diary.school_id,
        m.CurriculumPlan.class_group_id == diary.class_group_id,
        m.CurriculumPlan.component_id == diary.component_id,
    )
    plan_stmt = plan_stmt.where(
        m.CurriculumPlan.academic_period_id == period_id
        if period_id else m.CurriculumPlan.academic_period_id.is_(None)
    )
    plan = db.scalar(plan_stmt)
    assessment_stmt = select(m.AssessmentInstrument).where(m.AssessmentInstrument.diary_id == diary.id)
    opinion_stmt = select(m.DescriptiveOpinion).where(m.DescriptiveOpinion.diary_id == diary.id)
    records_stmt = select(m.PedagogicalRecord).where(m.PedagogicalRecord.diary_id == diary.id)
    if period_id:
        assessment_stmt = assessment_stmt.where(m.AssessmentInstrument.academic_period_id == period_id)
        opinion_stmt = opinion_stmt.where(m.DescriptiveOpinion.academic_period_id == period_id)
        period = db.get(m.AcademicPeriod, period_id)
        if period:
            records_stmt = records_stmt.where(
                m.PedagogicalRecord.record_date >= period.starts_on,
                m.PedagogicalRecord.record_date <= period.ends_on,
            )
    instruments = list(db.scalars(assessment_stmt.order_by(m.AssessmentInstrument.assessment_date,m.AssessmentInstrument.id)))
    instrument_ids = [x.id for x in instruments]
    results = [output(x) for x in db.scalars(select(m.AssessmentResult).where(
        m.AssessmentResult.instrument_id.in_(instrument_ids)
    ).order_by(m.AssessmentResult.instrument_id,m.AssessmentResult.enrollment_id))] if instrument_ids else []
    opinions = [output(x) for x in db.scalars(opinion_stmt.order_by(m.DescriptiveOpinion.enrollment_id))]
    pedagogical = [output(x) for x in db.scalars(records_stmt.order_by(m.PedagogicalRecord.record_date,m.PedagogicalRecord.id))]
    occurrence_stmt = select(m.DiaryOccurrence).where(m.DiaryOccurrence.diary_id == diary.id)
    if period_id: occurrence_stmt = occurrence_stmt.where(m.DiaryOccurrence.academic_period_id == period_id)
    occurrences = [output(x) for x in db.scalars(occurrence_stmt.order_by(m.DiaryOccurrence.occurrence_date))]
    communication_stmt = select(m.DiaryFamilyCommunication).where(m.DiaryFamilyCommunication.diary_id == diary.id)
    if period_id: communication_stmt = communication_stmt.where(m.DiaryFamilyCommunication.academic_period_id == period_id)
    communications = [_communication_output(db, x) for x in db.scalars(
        communication_stmt.order_by(m.DiaryFamilyCommunication.sent_at, m.DiaryFamilyCommunication.id)
    )]
    result_stmt = select(m.PeriodResult).where(m.PeriodResult.diary_id == diary.id)
    if period_id: result_stmt = result_stmt.where(m.PeriodResult.academic_period_id == period_id)
    period_results = [output(x) for x in db.scalars(result_stmt.order_by(m.PeriodResult.enrollment_id))]
    rule_stmt = select(m.PeriodAssessmentRule).where(m.PeriodAssessmentRule.diary_id == diary.id)
    if period_id: rule_stmt = rule_stmt.where(m.PeriodAssessmentRule.academic_period_id == period_id)
    assessment_rules = [output(x) for x in db.scalars(rule_stmt.order_by(m.PeriodAssessmentRule.academic_period_id))]
    snapshot = {
        "diary": _diary_output(db, diary),
        "period": output(db.get(m.AcademicPeriod, period_id)) if period_id and db.get(m.AcademicPeriod, period_id) else None,
        "plan": output(plan) if plan else None,
        "lessons": [output(x) for x in lessons],
        "attendance": attendances,
        "roster": _attendance_roster(db, diary),
        "assessments": [output(x) for x in instruments],
        "assessment_results": results,
        "opinions": opinions,
        "pedagogical_records": pedagogical,
        "occurrences": occurrences,
        "communications": communications,
        "period_results": period_results,
        "assessment_rules": assessment_rules,
    }
    return _json_safe(snapshot)


@router.get("/academic-periods")
def periods(db: DB, user: Actor, school: DiaryScope, academic_year_id: str = ""):
    require(user, "diary.read")
    stmt = select(m.AcademicPeriod).where(m.AcademicPeriod.school_id == school.id)
    if academic_year_id:
        stmt = stmt.where(m.AcademicPeriod.academic_year_id == academic_year_id)
    return [output(x) for x in db.scalars(stmt.order_by(m.AcademicPeriod.order_index, m.AcademicPeriod.starts_on))]


@router.post("/academic-periods", status_code=201)
def create_period(data: s.AcademicPeriodInput, db: DB, user: Actor, school: DiaryScope, request: Request):
    require(user, "diary.configure")
    lock_school(db, school.id)
    year = _scoped(db, m.AcademicYear, data.academic_year_id, school.id)
    require_available(db, year)
    if data.starts_on < year.starts_on or data.ends_on > year.ends_on:
        fail(422, "O período deve estar contido nas datas do ano letivo.")
    obj = m.AcademicPeriod(school_id=school.id, **data.model_dump())
    db.add(obj); db.flush()
    audit(db, request, user, "diary.period.created", obj, school.id)
    return output(obj)


@router.get("/curriculum-components")
def components(db: DB, user: Actor, school: DiaryScope):
    require(user, "diary.read")
    return [output(x) for x in db.scalars(select(m.CurriculumComponent).where(
        m.CurriculumComponent.school_id == school.id
    ).order_by(m.CurriculumComponent.name))]


@router.post("/curriculum-components", status_code=201)
def create_component(data: s.CurriculumComponentInput, db: DB, user: Actor, school: DiaryScope, request: Request):
    require(user, "diary.configure")
    obj = m.CurriculumComponent(school_id=school.id, **data.model_dump())
    db.add(obj); db.flush()
    audit(db, request, user, "diary.component.created", obj, school.id)
    return output(obj)


@router.get("/curriculum-plans")
def plans(db: DB, user: Actor, school: DiaryScope, class_group_id: str = "", component_id: str = ""):
    require(user, "diary.read")
    stmt = select(m.CurriculumPlan).where(m.CurriculumPlan.school_id == school.id)
    if class_group_id: stmt = stmt.where(m.CurriculumPlan.class_group_id == class_group_id)
    if component_id: stmt = stmt.where(m.CurriculumPlan.component_id == component_id)
    if user.role == "teacher":
        ownership = m.TeacherAssignment.teacher_user_id == user.id
        if user.person_id:
            ownership = ownership | (m.TeacherAssignment.teacher_person_id == user.person_id)
        assignments = select(m.TeacherAssignment.id).where(
            m.TeacherAssignment.school_id == school.id,
            m.TeacherAssignment.active.is_(True), ownership,
        )
        stmt = stmt.where(m.CurriculumPlan.teacher_assignment_id.in_(assignments))
    return [output(x) for x in db.scalars(stmt.order_by(m.CurriculumPlan.created_at.desc()))]


@router.post("/curriculum-plans", status_code=201)
def create_plan(data: s.CurriculumPlanInput, db: DB, user: Actor, school: DiaryScope, request: Request):
    require(user, "diary.write")
    lock_school(db, school.id)
    group = _scoped(db, m.ClassGroup, data.class_group_id, school.id)
    require_available(db, group)
    require_available(db, _scoped(db, m.AcademicYear, group.academic_year_id, school.id))
    _scoped(db, m.CurriculumComponent, data.component_id, school.id)
    if data.academic_period_id: _period(db, school.id, data.academic_period_id, group.academic_year_id)
    if data.teacher_assignment_id:
        assignment = _scoped(db, m.TeacherAssignment, data.teacher_assignment_id, school.id)
        if not assignment.active:
            fail(422, "A atribuição docente está inativa.")
        if assignment.class_group_id != group.id:
            fail(422, "A atribuição docente pertence a outra turma.")
        if user.role == "teacher" and not (assignment.teacher_user_id == user.id or (user.person_id and assignment.teacher_person_id == user.person_id)):
            fail(403, "A atribuição docente não pertence ao usuário.")
    elif user.role == "teacher":
        fail(422, "Professor deve informar sua atribuição docente.")
    duplicate_stmt = select(m.CurriculumPlan.id).where(
        m.CurriculumPlan.school_id == school.id,
        m.CurriculumPlan.class_group_id == data.class_group_id,
        m.CurriculumPlan.component_id == data.component_id,
    )
    duplicate_stmt = duplicate_stmt.where(
        m.CurriculumPlan.academic_period_id == data.academic_period_id
        if data.academic_period_id else m.CurriculumPlan.academic_period_id.is_(None)
    )
    if db.scalar(duplicate_stmt):
        fail(409, "Já existe planejamento para esta turma, componente e período.")
    obj = m.CurriculumPlan(school_id=school.id, **data.model_dump())
    db.add(obj); db.flush()
    audit(db, request, user, "diary.plan.created", obj, school.id)
    return output(obj)


@router.patch("/curriculum-plans/{plan_id}")
def edit_plan(plan_id: str, data: s.PlanEdit, db: DB, user: Actor, school: DiaryScope, request: Request):
    require(user, "diary.write")
    lock_school(db, school.id)
    obj = _scoped(db, m.CurriculumPlan, plan_id, school.id)
    check_version(obj, data.version)
    assignment = db.get(m.TeacherAssignment, obj.teacher_assignment_id) if obj.teacher_assignment_id else None
    if user.role == "teacher" and (not assignment or not assignment.active or not (assignment.teacher_user_id == user.id or (user.person_id and assignment.teacher_person_id == user.person_id))):
        fail(403, "O planejamento não pertence a uma atribuição docente do usuário.")
    values = data.model_dump(exclude={"version"})
    group = _scoped(db, m.ClassGroup, data.class_group_id, school.id)
    if group.id != obj.class_group_id or data.status != 'archived':
        require_available(db, group)
        require_available(db, _scoped(db, m.AcademicYear, group.academic_year_id, school.id))
    _scoped(db, m.CurriculumComponent, data.component_id, school.id)
    if data.academic_period_id:
        _period(db, school.id, data.academic_period_id, group.academic_year_id)
    if data.teacher_assignment_id:
        target = _scoped(db, m.TeacherAssignment, data.teacher_assignment_id, school.id)
        if not target.active or target.class_group_id != group.id:
            fail(422, "Selecione uma atribuição ativa desta turma.")
        if user.role == "teacher" and not (target.teacher_user_id == user.id or (user.person_id and target.teacher_person_id == user.person_id)):
            fail(403, "A atribuição docente não pertence ao usuário.")
    elif user.role == "teacher":
        fail(422, "Professor deve informar sua atribuição docente.")
    for key,value in values.items(): setattr(obj,key,value)
    obj.version += 1
    audit(db, request, user, "diary.plan.updated", obj, school.id)
    return output(obj)


@router.get("/diaries")
def diaries(db: DB, user: Actor, school: DiaryScope, class_group_id: str = ""):
    require(user, "diary.read")
    stmt = select(m.SchoolDiary).where(m.SchoolDiary.school_id == school.id)
    if class_group_id: stmt = stmt.where(m.SchoolDiary.class_group_id == class_group_id)
    if user.role == "teacher":
        ownership = [m.TeacherAssignment.teacher_user_id == user.id]
        if user.person_id:
            ownership.append(m.TeacherAssignment.teacher_person_id == user.person_id)
        condition = ownership[0]
        for item in ownership[1:]:
            condition = condition | item
        own_assignments = select(m.TeacherAssignment.id).where(
            m.TeacherAssignment.school_id == school.id,
            m.TeacherAssignment.active.is_(True),
            condition,
        )
        stmt = stmt.where(m.SchoolDiary.teacher_assignment_id.in_(own_assignments))
    return [_diary_output(db,x) for x in db.scalars(stmt.order_by(m.SchoolDiary.created_at.desc()))]


@router.post("/diaries", status_code=201)
def create_diary(data: s.DiaryInput, db: DB, user: Actor, school: DiaryScope, request: Request):
    require(user, "diary.configure")
    lock_school(db, school.id)
    group = _scoped(db, m.ClassGroup, data.class_group_id, school.id)
    require_available(db, group)
    require_available(db, _scoped(db, m.AcademicYear, group.academic_year_id, school.id))
    _scoped(db, m.CurriculumComponent, data.component_id, school.id)
    assignment = None
    if data.teacher_assignment_id:
        assignment = _scoped(db, m.TeacherAssignment, data.teacher_assignment_id, school.id)
        if assignment.class_group_id != group.id or assignment.academic_year_id != group.academic_year_id:
            fail(422, "A atribuição docente não corresponde à turma/ano letivo.")
    obj = m.SchoolDiary(
        school_id=school.id,
        class_group_id=group.id,
        academic_year_id=group.academic_year_id,
        component_id=data.component_id,
        teacher_assignment_id=assignment.id if assignment else None,
        notes=data.notes,
        status="open",
    )
    db.add(obj); db.flush()
    audit(db, request, user, "diary.created", obj, school.id)
    return _diary_output(db,obj)


@router.get("/diaries/{diary_id}")
def diary_detail(diary_id: str, db: DB, user: Actor, school: DiaryScope):
    obj = _scoped(db, m.SchoolDiary, diary_id, school.id)
    _require_diary(db,user,obj,"diary.read")
    lessons = [output(x) for x in db.scalars(select(m.DiaryLesson).where(
        m.DiaryLesson.diary_id == obj.id
    ).order_by(m.DiaryLesson.lesson_date.desc()))]
    return {**_diary_output(db,obj), "lessons":lessons, "roster":_attendance_roster(db,obj)}


@router.post("/diaries/{diary_id}/submit")
def submit_diary(diary_id: str, data: s.DiaryTransitionInput, db: DB, user: Actor, school: DiaryScope, request: Request):
    diary = _scoped(db, m.SchoolDiary, diary_id, school.id)
    _require_diary(db, user, diary, "diary.write")
    check_version(diary, data.version)
    if diary.status != "open":
        fail(409, "Somente um diário aberto pode ser enviado para revisão.")
    lessons = db.scalar(select(func.count()).select_from(m.DiaryLesson).where(
        m.DiaryLesson.diary_id == diary.id
    )) or 0
    if not lessons:
        fail(409, "Não é possível enviar um diário sem aulas registradas.")
    diary.status = "submitted"
    diary.version += 1
    audit(db, request, user, "diary.submitted", diary, school.id)
    return _diary_output(db, diary)


@router.post("/diaries/{diary_id}/review")
def review_diary(diary_id: str, data: s.DiaryTransitionInput, db: DB, user: Actor, school: DiaryScope, request: Request):
    diary = _scoped(db, m.SchoolDiary, diary_id, school.id)
    _require_diary(db, user, diary, "diary.review")
    check_version(diary, data.version)
    if diary.status != "submitted":
        fail(409, "Somente um diário enviado pode ser revisado.")
    diary.status = "reviewed"
    diary.version += 1
    audit(db, request, user, "diary.reviewed", diary, school.id)
    return _diary_output(db, diary)


@router.post("/diaries/{diary_id}/lessons", status_code=201)
def create_lesson(diary_id: str, data: s.LessonInput, db: DB, user: Actor, school: DiaryScope, request: Request):
    diary = _scoped(db,m.SchoolDiary,diary_id,school.id)
    _require_diary(db,user,diary,"diary.write")
    _require_open_diary(diary)
    group = db.get(m.ClassGroup,diary.class_group_id)
    year = db.get(m.AcademicYear,diary.academic_year_id)
    if data.lesson_date < year.starts_on or data.lesson_date > year.ends_on:
        fail(422, "A data da aula está fora do ano letivo.")
    if data.academic_period_id:
        period = _period(db,school.id,data.academic_period_id,diary.academic_year_id)
        if data.lesson_date < period.starts_on or data.lesson_date > period.ends_on:
            fail(422, "A data da aula está fora do período informado.")
    obj = m.DiaryLesson(school_id=school.id,diary_id=diary.id,recorded_by=user.id,**data.model_dump())
    db.add(obj); db.flush()
    audit(db,request,user,"diary.lesson.created",obj,school.id,{"diary_id":diary.id})
    return output(obj)


@router.patch("/diaries/{diary_id}/lessons/{lesson_id}")
def edit_lesson(diary_id: str, lesson_id: str, data: s.LessonEdit, db: DB, user: Actor, school: DiaryScope, request: Request):
    diary = _scoped(db,m.SchoolDiary,diary_id,school.id)
    _require_diary(db,user,diary,"diary.write")
    _require_open_diary(diary)
    obj = _scoped(db,m.DiaryLesson,lesson_id,school.id)
    if obj.diary_id != diary.id: fail(404,"Aula não encontrada neste diário.")
    check_version(obj,data.version)
    values=data.model_dump(exclude={"version"})
    if values.get("academic_period_id"):
        period=_period(db,school.id,values["academic_period_id"],diary.academic_year_id)
        if values["lesson_date"] < period.starts_on or values["lesson_date"] > period.ends_on:
            fail(422,"A data da aula está fora do período informado.")
    for key,value in values.items(): setattr(obj,key,value)
    obj.version += 1
    audit(db,request,user,"diary.lesson.updated",obj,school.id,{"diary_id":diary.id})
    return output(obj)


@router.get("/diaries/{diary_id}/lessons/{lesson_id}/attendance")
def attendance(diary_id: str, lesson_id: str, db: DB, user: Actor, school: DiaryScope):
    diary=_scoped(db,m.SchoolDiary,diary_id,school.id); _require_diary(db,user,diary,"diary.read")
    lesson=_scoped(db,m.DiaryLesson,lesson_id,school.id)
    if lesson.diary_id != diary.id: fail(404,"Aula não encontrada neste diário.")
    existing={x.enrollment_id:output(x) for x in db.scalars(select(m.DiaryAttendance).where(m.DiaryAttendance.lesson_id==lesson.id))}
    return {"lesson":output(lesson),"roster":[{**row,"attendance":existing.get(row["enrollment_id"])} for row in _attendance_roster(db,diary,lesson.lesson_date)]}


@router.put("/diaries/{diary_id}/lessons/{lesson_id}/attendance")
def save_attendance(diary_id: str, lesson_id: str, data: s.AttendanceInput, db: DB, user: Actor, school: DiaryScope, request: Request):
    diary=_scoped(db,m.SchoolDiary,diary_id,school.id); _require_diary(db,user,diary,"diary.attendance")
    _require_open_diary(diary)
    lesson=_scoped(db,m.DiaryLesson,lesson_id,school.id)
    if lesson.diary_id != diary.id: fail(404,"Aula não encontrada neste diário.")
    allowed={row["enrollment_id"]:row for row in _attendance_roster(db,diary,lesson.lesson_date)}
    if len({item.enrollment_id for item in data.items}) != len(data.items):
        fail(422,"Matrícula duplicada na chamada.")
    for item in data.items:
        row=allowed.get(item.enrollment_id)
        if not row: fail(422,"A chamada contém matrícula fora desta turma.")
        obj=db.scalar(select(m.DiaryAttendance).where(m.DiaryAttendance.lesson_id==lesson.id,m.DiaryAttendance.enrollment_id==item.enrollment_id))
        if obj:
            if item.version is not None: check_version(obj,item.version)
            obj.status=item.status; obj.note=item.note; obj.recorded_by=user.id; obj.version += 1
        else:
            obj=m.DiaryAttendance(school_id=school.id,lesson_id=lesson.id,enrollment_id=item.enrollment_id,student_id=row["student_id"],status=item.status,note=item.note,recorded_by=user.id)
            db.add(obj)
    db.flush()
    audit(db,request,user,"diary.attendance.saved",lesson,school.id,{"diary_id":diary.id,"count":len(data.items)})
    return {"saved":len(data.items)}


@router.get("/diaries/{diary_id}/assessments")
def assessments(diary_id: str, db: DB, user: Actor, school: DiaryScope):
    diary=_scoped(db,m.SchoolDiary,diary_id,school.id); _require_diary(db,user,diary,"diary.read")
    items=[]
    for obj in db.scalars(select(m.AssessmentInstrument).where(m.AssessmentInstrument.diary_id==diary.id).order_by(m.AssessmentInstrument.assessment_date,m.AssessmentInstrument.id)):
        count=db.scalar(select(func.count()).select_from(m.AssessmentResult).where(m.AssessmentResult.instrument_id==obj.id)) or 0
        items.append({**output(obj),"result_count":count})
    return items


@router.post("/diaries/{diary_id}/assessments", status_code=201)
def create_assessment(diary_id: str, data: s.AssessmentInstrumentInput, db: DB, user: Actor, school: DiaryScope, request: Request):
    diary=_scoped(db,m.SchoolDiary,diary_id,school.id); _require_diary(db,user,diary,"diary.assessments")
    _require_open_diary(diary)
    if data.academic_period_id:
        period=_period(db,school.id,data.academic_period_id,diary.academic_year_id)
        if data.assessment_date < period.starts_on or data.assessment_date > period.ends_on:
            fail(422,"A data da avaliação está fora do período informado.")
    year=db.get(m.AcademicYear,diary.academic_year_id)
    if data.assessment_date < year.starts_on or data.assessment_date > year.ends_on:
        fail(422,"A data da avaliação está fora do ano letivo.")
    obj=m.AssessmentInstrument(school_id=school.id,diary_id=diary.id,created_by=user.id,**data.model_dump())
    db.add(obj);db.flush()
    audit(db,request,user,"diary.assessment.created",obj,school.id,{"diary_id":diary.id})
    return output(obj)


@router.patch("/diaries/{diary_id}/assessments/{instrument_id}")
def edit_assessment(diary_id: str, instrument_id: str, data: s.AssessmentInstrumentEdit, db: DB, user: Actor, school: DiaryScope, request: Request):
    diary=_scoped(db,m.SchoolDiary,diary_id,school.id); _require_diary(db,user,diary,"diary.assessments")
    _require_open_diary(diary)
    obj=_scoped(db,m.AssessmentInstrument,instrument_id,school.id)
    if obj.diary_id!=diary.id: fail(404,"Avaliação não encontrada neste diário.")
    check_version(obj,data.version)
    year=db.get(m.AcademicYear,diary.academic_year_id)
    if not year.starts_on <= data.assessment_date <= year.ends_on:
        fail(422,"A data da avaliação está fora do ano letivo.")
    if data.academic_period_id:
        period=_period(db,school.id,data.academic_period_id,diary.academic_year_id)
        if not period.starts_on <= data.assessment_date <= period.ends_on:
            fail(422,"A data da avaliação está fora do período informado.")
    results=list(db.scalars(select(m.AssessmentResult).where(m.AssessmentResult.instrument_id==obj.id)))
    if results and data.value_type!=obj.value_type:
        fail(409,"A avaliação já possui resultados. Preserve o tipo de nota ou conceito.")
    for result in results:
        _enrollment_for_diary(db,diary,result.enrollment_id,data.assessment_date)
        if data.max_score is not None and result.numeric_score is not None and result.numeric_score>data.max_score:
            fail(422,"O valor máximo não pode ser menor que uma nota já registrada.")
    before=output(obj)
    for key,value in data.model_dump(exclude={"version"}).items(): setattr(obj,key,value)
    obj.version+=1
    audit(db,request,user,"diary.assessment.updated",obj,school.id,_json_safe({"before":before,"after":output(obj)}))
    return output(obj)


@router.get("/diaries/{diary_id}/assessments/{instrument_id}/results")
def assessment_results(diary_id: str, instrument_id: str, db: DB, user: Actor, school: DiaryScope):
    diary=_scoped(db,m.SchoolDiary,diary_id,school.id); _require_diary(db,user,diary,"diary.read")
    instrument=_scoped(db,m.AssessmentInstrument,instrument_id,school.id)
    if instrument.diary_id!=diary.id: fail(404,"Avaliação não encontrada neste diário.")
    existing={x.enrollment_id:output(x) for x in db.scalars(select(m.AssessmentResult).where(m.AssessmentResult.instrument_id==instrument.id))}
    roster=_attendance_roster(db,diary,instrument.assessment_date)
    return {"instrument":output(instrument),"roster":[{**row,"result":existing.get(row["enrollment_id"])} for row in roster]}


@router.put("/diaries/{diary_id}/assessments/{instrument_id}/results")
def save_assessment_results(diary_id: str, instrument_id: str, data: s.AssessmentResultsInput, db: DB, user: Actor, school: DiaryScope, request: Request):
    diary=_scoped(db,m.SchoolDiary,diary_id,school.id); _require_diary(db,user,diary,"diary.assessments")
    _require_open_diary(diary)
    instrument=_scoped(db,m.AssessmentInstrument,instrument_id,school.id)
    if instrument.diary_id!=diary.id: fail(404,"Avaliação não encontrada neste diário.")
    if instrument.status=="closed": fail(409,"A avaliação está fechada.")
    if len({item.enrollment_id for item in data.items})!=len(data.items): fail(422,"Matrícula duplicada nos resultados.")
    for item in data.items:
        enrollment=_enrollment_for_diary(db,diary,item.enrollment_id,instrument.assessment_date)
        if instrument.value_type=="numeric":
            if item.numeric_score is None: fail(422,"Informe a nota numérica.")
            if instrument.max_score is not None and item.numeric_score > instrument.max_score: fail(422,"Nota acima do valor máximo da avaliação.")
            concept=""
            numeric=item.numeric_score
        else:
            if not item.concept.strip(): fail(422,"Informe o conceito.")
            concept=item.concept.strip()
            numeric=None
        obj=db.scalar(select(m.AssessmentResult).where(m.AssessmentResult.instrument_id==instrument.id,m.AssessmentResult.enrollment_id==enrollment.id))
        if obj:
            if item.version is not None: check_version(obj,item.version)
            obj.numeric_score=numeric;obj.concept=concept;obj.note=item.note;obj.recorded_by=user.id;obj.version+=1
        else:
            obj=m.AssessmentResult(school_id=school.id,instrument_id=instrument.id,enrollment_id=enrollment.id,student_id=enrollment.student_id,numeric_score=numeric,concept=concept,note=item.note,recorded_by=user.id)
            db.add(obj)
    db.flush()
    audit(db,request,user,"diary.assessment.results_saved",instrument,school.id,{"count":len(data.items)})
    return {"saved":len(data.items)}


@router.get("/diaries/{diary_id}/opinions")
def opinions(diary_id: str, db: DB, user: Actor, school: DiaryScope):
    diary=_scoped(db,m.SchoolDiary,diary_id,school.id); _require_diary(db,user,diary,"diary.read")
    return [output(x) for x in db.scalars(select(m.DescriptiveOpinion).where(m.DescriptiveOpinion.diary_id==diary.id).order_by(m.DescriptiveOpinion.updated_at.desc()))]


@router.post("/diaries/{diary_id}/opinions", status_code=201)
def save_opinion(diary_id: str, data: s.DescriptiveOpinionInput, db: DB, user: Actor, school: DiaryScope, request: Request):
    diary=_scoped(db,m.SchoolDiary,diary_id,school.id); _require_diary(db,user,diary,"diary.write")
    _require_open_diary(diary)
    enrollment=_enrollment_for_diary(db,diary,data.enrollment_id)
    if data.status in ("reviewed","final"):
        require(user,"diary.review")
    if data.academic_period_id: _period(db,school.id,data.academic_period_id,diary.academic_year_id)
    stmt=select(m.DescriptiveOpinion).where(m.DescriptiveOpinion.diary_id==diary.id,m.DescriptiveOpinion.enrollment_id==enrollment.id)
    stmt=stmt.where(m.DescriptiveOpinion.academic_period_id==data.academic_period_id if data.academic_period_id else m.DescriptiveOpinion.academic_period_id.is_(None))
    obj=db.scalar(stmt)
    created=obj is None
    if obj:
        obj.text=data.text;obj.status=data.status;obj.authored_by=user.id;obj.reviewed_by=user.id if data.status in ("reviewed","final") and user.role!="teacher" else None;obj.version+=1
    else:
        obj=m.DescriptiveOpinion(school_id=school.id,diary_id=diary.id,academic_period_id=data.academic_period_id,enrollment_id=enrollment.id,student_id=enrollment.student_id,text=data.text,status=data.status,authored_by=user.id,reviewed_by=user.id if data.status in ("reviewed","final") and user.role!="teacher" else None)
        db.add(obj)
    db.flush()
    audit(db,request,user,"diary.opinion.created" if created else "diary.opinion.updated",obj,school.id)
    return output(obj)


@router.get("/diaries/{diary_id}/pedagogical-records")
def pedagogical_records(diary_id: str, db: DB, user: Actor, school: DiaryScope):
    diary=_scoped(db,m.SchoolDiary,diary_id,school.id); _require_diary(db,user,diary,"diary.read")
    return [output(x) for x in db.scalars(select(m.PedagogicalRecord).where(m.PedagogicalRecord.diary_id==diary.id).order_by(m.PedagogicalRecord.record_date.desc(),m.PedagogicalRecord.created_at.desc()))]


@router.post("/diaries/{diary_id}/pedagogical-records", status_code=201)
def create_pedagogical_record(diary_id: str, data: s.PedagogicalRecordInput, db: DB, user: Actor, school: DiaryScope, request: Request):
    diary=_scoped(db,m.SchoolDiary,diary_id,school.id); _require_diary(db,user,diary,"diary.write")
    _require_open_diary(diary)
    enrollment=_enrollment_for_diary(db,diary,data.enrollment_id,data.record_date)
    obj=m.PedagogicalRecord(school_id=school.id,diary_id=diary.id,enrollment_id=enrollment.id,student_id=enrollment.student_id,recorded_by=user.id,**data.model_dump(exclude={"enrollment_id"}))
    db.add(obj);db.flush()
    audit(db,request,user,"diary.pedagogical_record.created",obj,school.id,{"kind":obj.kind})
    return output(obj)


@router.post("/diaries/{diary_id}/close")
def close_diary(diary_id: str, data: s.CloseDiaryInput, db: DB, user: Actor, school: DiaryScope, request: Request):
    diary=_scoped(db,m.SchoolDiary,diary_id,school.id); _require_diary(db,user,diary,"diary.close")
    check_version(diary, data.version)
    if diary.status != "reviewed": fail(409,"Somente um diário revisado pode ser fechado.")
    if data.academic_period_id: _period(db,school.id,data.academic_period_id,diary.academic_year_id)
    snapshot=_snapshot(db,diary,data.academic_period_id)
    if not snapshot["lessons"]: fail(409,"Não é possível fechar um diário sem aulas registradas.")
    missing=[]
    for lesson in snapshot["lessons"]:
        count=db.scalar(select(func.count()).select_from(m.DiaryAttendance).where(m.DiaryAttendance.lesson_id==lesson["id"])) or 0
        expected=len(_attendance_roster(db,diary,date.fromisoformat(lesson["lesson_date"])))
        if count < expected: missing.append(lesson["lesson_date"])
    if missing:
        fail(409,"Existem aulas sem chamada completa: "+", ".join(missing[:5]))
    canonical=json.dumps(snapshot,ensure_ascii=False,sort_keys=True,separators=(",",":")).encode()
    digest=hashlib.sha256(canonical).hexdigest()
    stamp=datetime.now(UTC)
    scope = select(m.DiaryClosure).where(
        m.DiaryClosure.diary_id==diary.id,
        m.DiaryClosure.active.is_(True),
    )
    scope = scope.where(
        m.DiaryClosure.academic_period_id == data.academic_period_id
        if data.academic_period_id else m.DiaryClosure.academic_period_id.is_(None)
    )
    for old in db.scalars(scope):
        old.active=False; old.version += 1
    closure=m.DiaryClosure(school_id=school.id,diary_id=diary.id,academic_period_id=data.academic_period_id,snapshot=snapshot,snapshot_hash=digest,reason=data.reason,closed_by=user.id,closed_at=stamp,active=True)
    db.add(closure)
    if not data.academic_period_id:
        diary.status="closed"; diary.closed_at=stamp; diary.closed_by=user.id
    diary.version += 1
    db.flush()
    action = "diary.period.closed" if data.academic_period_id else "diary.closed"
    audit(db,request,user,action,diary,school.id,{"closure_id":closure.id,"snapshot_hash":digest})
    return {"diary":_diary_output(db,diary),"closure":output(closure,("snapshot",)),"scope":"period" if data.academic_period_id else "diary"}


@router.post("/diaries/{diary_id}/reopen")
def reopen_diary(diary_id: str, data: s.ReopenDiaryInput, db: DB, user: Actor, school: DiaryScope, request: Request):
    diary=_scoped(db,m.SchoolDiary,diary_id,school.id); _require_diary(db,user,diary,"diary.reopen")
    check_version(diary, data.version)
    if diary.status not in {"submitted","reviewed","closed"}:
        fail(409,"Somente um diário enviado, revisado ou fechado pode ser reaberto.")
    active_closures=list(db.scalars(select(m.DiaryClosure).where(
        m.DiaryClosure.diary_id==diary.id,
        m.DiaryClosure.active.is_(True),
    ).order_by(m.DiaryClosure.closed_at.desc())))
    closure=active_closures[0] if active_closures else None
    stamp=datetime.now(UTC)
    revision=m.DiaryRevision(school_id=school.id,diary_id=diary.id,closure_id=closure.id if closure else None,reason=data.reason,reopened_by=user.id,reopened_at=stamp,previous_status=diary.status)
    db.add(revision)
    for old in active_closures:
        old.active=False
        old.version += 1
    diary.status="open"; diary.closed_at=None; diary.closed_by=None; diary.version += 1
    db.flush()
    audit(db,request,user,"diary.reopened",diary,school.id,{"revision_id":revision.id,"reason":data.reason})
    return {"diary":_diary_output(db,diary),"revision":output(revision)}


@router.get("/diaries/{diary_id}/history")
def diary_history(diary_id: str, db: DB, user: Actor, school: DiaryScope):
    diary=_scoped(db,m.SchoolDiary,diary_id,school.id); _require_diary(db,user,diary,"diary.read")
    closures=[output(x,("snapshot",)) for x in db.scalars(select(m.DiaryClosure).where(m.DiaryClosure.diary_id==diary.id).order_by(m.DiaryClosure.closed_at.desc()))]
    revisions=[output(x) for x in db.scalars(select(m.DiaryRevision).where(m.DiaryRevision.diary_id==diary.id).order_by(m.DiaryRevision.reopened_at.desc()))]
    return {"closures":closures,"revisions":revisions}


@router.get("/diaries/{diary_id}/report.pdf")
def diary_report(diary_id: str, db: DB, user: Actor, school: DiaryScope):
    diary=_scoped(db,m.SchoolDiary,diary_id,school.id); _require_diary(db,user,diary,"diary.reports")
    closure = None
    if diary.status == "closed":
        closure = db.scalar(select(m.DiaryClosure).where(
            m.DiaryClosure.diary_id==diary.id,
            m.DiaryClosure.academic_period_id.is_(None),
            m.DiaryClosure.active.is_(True),
        ).order_by(m.DiaryClosure.closed_at.desc()))
    data = closure.snapshot if closure else _snapshot(db,diary)
    total_lessons=sum(int(x["lesson_count"]) for x in data["lessons"])
    absences=sum(1 for x in data["attendance"] if x["status"] in ("absent","justified_absence"))
    rows=[
        ("Ano letivo",data["diary"]["year_name"]),
        ("Turma",data["diary"]["class_name"]),
        ("Componente curricular",data["diary"]["component_name"]),
        ("Professor",data["diary"]["teacher_name"] or "Não vinculado"),
        ("Situação",diary.status),
        ("Aulas registradas",str(len(data["lessons"]))),
        ("Quantidade de aulas",str(total_lessons)),
        ("Registros de ausência",str(absences)),
        ("Avaliações",str(len(data.get("assessments",[])))),
        ("Pareceres descritivos",str(len(data.get("opinions",[])))),
        ("Registros pedagógicos",str(len(data.get("pedagogical_records",[])))),
    ]
    note=("Relatório emitido a partir do snapshot do fechamento. Hash de integridade: "+closure.snapshot_hash) if closure else "Relatório gerado a partir dos registros atuais do Diário Escolar Digital. Fechamentos possuem snapshot e hash de integridade próprios."
    content=render_pdf(school.name,"Diário Escolar Digital",rows,note,user.name,db=db)
    return Response(content,media_type="application/pdf",headers={"Content-Disposition":f'attachment; filename="diario-{diary.id}.pdf"'})


@router.get("/diaries/{diary_id}/summary")
def diary_summary(diary_id: str, db: DB, user: Actor, school: DiaryScope):
    diary=_scoped(db,m.SchoolDiary,diary_id,school.id); _require_diary(db,user,diary,"diary.read")
    lessons=list(db.scalars(select(m.DiaryLesson).where(m.DiaryLesson.diary_id==diary.id)))
    lesson_ids=[x.id for x in lessons]
    attendance=list(db.scalars(select(m.DiaryAttendance).where(m.DiaryAttendance.lesson_id.in_(lesson_ids)))) if lesson_ids else []
    pending = _diary_pending_counts(db, diary)
    return {
        "lessons":len(lessons),
        "lesson_count":sum(x.lesson_count for x in lessons),
        "attendance_records":len(attendance),
        "absences":sum(1 for x in attendance if x.status=="absent"),
        "justified_absences":sum(1 for x in attendance if x.status=="justified_absence"),
        "roster":len(_attendance_roster(db,diary)),
        "assessments":db.scalar(select(func.count()).select_from(m.AssessmentInstrument).where(m.AssessmentInstrument.diary_id==diary.id)) or 0,
        "opinions":db.scalar(select(func.count()).select_from(m.DescriptiveOpinion).where(m.DescriptiveOpinion.diary_id==diary.id)) or 0,
        "pedagogical_records":db.scalar(select(func.count()).select_from(m.PedagogicalRecord).where(m.PedagogicalRecord.diary_id==diary.id)) or 0,
        "occurrences":db.scalar(select(func.count()).select_from(m.DiaryOccurrence).where(m.DiaryOccurrence.diary_id==diary.id)) or 0,
        **pending,
    }


def _diary_pending_counts(db, diary):
    lessons = list(db.scalars(select(m.DiaryLesson).where(m.DiaryLesson.diary_id == diary.id)))
    incomplete = 0
    for lesson in lessons:
        saved = db.scalar(select(func.count()).select_from(m.DiaryAttendance).where(m.DiaryAttendance.lesson_id == lesson.id)) or 0
        incomplete += max(0, len(_attendance_roster(db, diary, lesson.lesson_date)) - saved)
    assessment_pending = 0
    for item in db.scalars(select(m.AssessmentInstrument).where(
        m.AssessmentInstrument.diary_id == diary.id,
        m.AssessmentInstrument.status.in_(["published", "closed"]),
    )):
        saved = db.scalar(select(func.count()).select_from(m.AssessmentResult).where(m.AssessmentResult.instrument_id == item.id)) or 0
        assessment_pending += max(0, len(_attendance_roster(db, diary, item.assessment_date)) - saved)
    consolidation_pending = 0
    for rule in db.scalars(select(m.PeriodAssessmentRule).where(m.PeriodAssessmentRule.diary_id == diary.id)):
        period = db.get(m.AcademicPeriod, rule.academic_period_id)
        if period:
            expected = len(_attendance_roster(db, diary, period.ends_on))
            saved = db.scalar(select(func.count()).select_from(m.PeriodResult).where(
                m.PeriodResult.diary_id == diary.id, m.PeriodResult.academic_period_id == period.id
            )) or 0
            pending_rows = db.scalar(select(func.count()).select_from(m.PeriodResult).where(
                m.PeriodResult.diary_id == diary.id, m.PeriodResult.academic_period_id == period.id,
                m.PeriodResult.status == "pending"
            )) or 0
            consolidation_pending += max(0, expected - saved) + pending_rows
    occurrence_pending = db.scalar(select(func.count()).select_from(m.DiaryOccurrence).where(
        m.DiaryOccurrence.diary_id == diary.id, m.DiaryOccurrence.status == "draft"
    )) or 0
    return {"lessons_without_complete_attendance": incomplete, "assessment_results_pending": assessment_pending,
            "consolidation_results_pending": consolidation_pending, "occurrences_pending_review": occurrence_pending}


@router.get("/diary-dashboard")
def diary_dashboard(db: DB, user: Actor, school: DiaryScope):
    require(user, "diary.read")
    stmt = select(m.SchoolDiary).where(m.SchoolDiary.school_id == school.id)
    if user.role == "teacher":
        owned = select(m.TeacherAssignment.id).where(
            m.TeacherAssignment.school_id == school.id, m.TeacherAssignment.active.is_(True),
            (m.TeacherAssignment.teacher_user_id == user.id) |
            (m.TeacherAssignment.teacher_person_id == user.person_id if user.person_id else False),
        )
        stmt = stmt.where(m.SchoolDiary.teacher_assignment_id.in_(owned))
    keys = ("lessons_without_complete_attendance","assessment_results_pending","consolidation_results_pending","occurrences_pending_review")
    totals = {"diaries": 0, **{key: 0 for key in keys}}
    items = []
    for diary in db.scalars(stmt.order_by(m.SchoolDiary.created_at.desc())):
        _require_diary(db, user, diary, "diary.read")
        pending = _diary_pending_counts(db, diary)
        totals["diaries"] += 1
        for key in keys: totals[key] += pending[key]
        items.append({**_diary_output(db, diary), "pending": pending})
    return {"items": items, "totals": totals}


def _assessment_rule_data(db, diary, period):
    return db.scalar(select(m.PeriodAssessmentRule).where(
        m.PeriodAssessmentRule.diary_id == diary.id,
        m.PeriodAssessmentRule.academic_period_id == period.id,
    ))


@router.get("/diaries/{diary_id}/assessment-rules")
def assessment_rules(diary_id: str, db: DB, user: Actor, school: DiaryScope):
    diary = _scoped(db, m.SchoolDiary, diary_id, school.id)
    _require_diary(db, user, diary, "diary.read")
    return [output(x) for x in db.scalars(select(m.PeriodAssessmentRule).where(
        m.PeriodAssessmentRule.diary_id == diary.id
    ).order_by(m.PeriodAssessmentRule.academic_period_id))]


@router.put("/diaries/{diary_id}/assessment-rules/{period_id}")
def save_assessment_rule(diary_id: str, period_id: str, data: s.PeriodAssessmentRuleInput, db: DB, user: Actor, school: DiaryScope, request: Request):
    diary = _scoped(db, m.SchoolDiary, diary_id, school.id)
    _require_diary(db, user, diary, "diary.configure")
    _require_open_diary(diary)
    period = _period(db, school.id, period_id, diary.academic_year_id)
    obj = _assessment_rule_data(db, diary, period)
    values = data.model_dump(exclude={"version"})
    if obj:
        if data.version is None: fail(409, "Atualize a regra antes de salvar.")
        check_version(obj, data.version)
        before = output(obj)
        for key, value in values.items(): setattr(obj, key, value)
        obj.configured_by, obj.version = user.id, obj.version + 1
    else:
        if data.version is not None: fail(409, "A regra mudou. Atualize a tela.")
        before = None
        obj = m.PeriodAssessmentRule(school_id=school.id, diary_id=diary.id, academic_period_id=period.id, configured_by=user.id, **values)
        db.add(obj)
    db.flush()
    audit(db, request, user, "diary.assessment_rule.saved", obj, school.id, _json_safe({"before": before, "after": output(obj)}))
    return output(obj)


def _aggregate_assessments(items, rule):
    if not items: return None, [], []
    values, trace, flags = [], [], []
    scale = Decimal(str(rule.scale_max))
    for instrument, result in items:
        if rule.method == "concept":
            concept = (result.concept or "").strip()
            matches = [i for i, label in enumerate(rule.concept_scale or []) if label.casefold() == concept.casefold()]
            if not matches: flags.append("conceito_fora_da_escala"); continue
            value, weight = Decimal(matches[0]), Decimal(1)
            trace.append({"instrument_id": instrument.id, "concept": concept, "rank": str(value)})
        else:
            if result.numeric_score is None or instrument.max_score is None: flags.append("resultado_numerico_ausente"); continue
            score, maximum = Decimal(str(result.numeric_score)), Decimal(str(instrument.max_score))
            value = score / maximum * scale
            weight = Decimal(str(instrument.weight)) if rule.method == "weighted" and instrument.weight else Decimal(1)
            if rule.method == "weighted" and weight <= 0: flags.append("peso_avaliativo_ausente"); continue
            if rule.method == "weighted" and instrument.weight is None: flags.append("peso_avaliativo_ausente"); continue
            trace.append({"instrument_id": instrument.id, "score": str(score), "maximum": str(maximum), "weight": str(weight), "normalized": str(value)})
        values.append((value, weight))
    if flags or not values: return None, trace, flags
    total_weight = sum((weight for _, weight in values), Decimal(0))
    return sum((value * weight for value, weight in values), Decimal(0)) / total_weight, trace, []


def _concept_from_rank(rank, scale):
    index = int(rank.quantize(Decimal("1"), rounding=ROUND_HALF_UP))
    return scale[max(0, min(index, len(scale)-1))]


@router.post("/diaries/{diary_id}/periods/{period_id}/consolidate")
def consolidate_period(diary_id: str, period_id: str, data: s.DiaryTransitionInput, db: DB, user: Actor, school: DiaryScope, request: Request):
    diary = _scoped(db, m.SchoolDiary, diary_id, school.id)
    _require_diary(db, user, diary, "diary.review")
    check_version(diary, data.version)
    if diary.status not in {"open", "reviewed"}: fail(409, "A consolidação exige diário aberto ou revisado.")
    period = _period(db, school.id, period_id, diary.academic_year_id)
    rule = _assessment_rule_data(db, diary, period)
    if not rule: fail(409, "Configure a regra de avaliação antes de consolidar.")
    instruments = list(db.scalars(select(m.AssessmentInstrument).where(
        m.AssessmentInstrument.diary_id == diary.id,
        m.AssessmentInstrument.academic_period_id == period.id,
        m.AssessmentInstrument.status.in_(["published", "closed"]),
    ).order_by(m.AssessmentInstrument.assessment_date)))
    if not instruments: fail(409, "Publique ao menos uma avaliação deste período.")
    expected = {item.id: {r["enrollment_id"]: r for r in _attendance_roster(db, diary, item.assessment_date)} for item in instruments}
    results = {item.id: {r.enrollment_id: r for r in db.scalars(select(m.AssessmentResult).where(m.AssessmentResult.instrument_id == item.id))} for item in instruments}
    for item in instruments:
        if (rule.method == "concept") != (item.value_type == "concept"):
            fail(422, "O método de consolidação e o tipo do instrumento não correspondem.")
    lessons = list(db.scalars(select(m.DiaryLesson).where(
        m.DiaryLesson.diary_id == diary.id, m.DiaryLesson.academic_period_id == period.id
    ).order_by(m.DiaryLesson.lesson_date)))
    marks = {}
    roster_by_id = {r["enrollment_id"]: r for r in _attendance_roster(db, diary, period.ends_on)}
    for item in instruments: roster_by_id.update(expected[item.id])
    for lesson in lessons:
        lesson_roster = _attendance_roster(db, diary, lesson.lesson_date)
        marks[lesson.id] = {r.enrollment_id: r for r in db.scalars(select(m.DiaryAttendance).where(m.DiaryAttendance.lesson_id == lesson.id))}
        if len(marks[lesson.id]) < len(lesson_roster): fail(409, "Complete a chamada das aulas do período antes de consolidar.")
        roster_by_id.update({r["enrollment_id"]: r for r in lesson_roster})
    opinions = {o.enrollment_id:o for o in db.scalars(select(m.DescriptiveOpinion).where(
        m.DescriptiveOpinion.diary_id == diary.id, m.DescriptiveOpinion.academic_period_id == period.id
    ))}
    output_rows, pending = [], 0
    for student in sorted(roster_by_id.values(), key=lambda r:r["number"]):
        enrollment_id = student["enrollment_id"]
        regular, recovery, missing, source_items = [], [], False, []
        for instrument in instruments:
            if enrollment_id not in expected[instrument.id]: continue
            result = results[instrument.id].get(enrollment_id)
            if not result:
                missing = True; source_items.append({"instrument_id":instrument.id,"missing":True}); continue
            source_items.append({"instrument_id":instrument.id,"result_id":result.id,"score":str(result.numeric_score) if result.numeric_score is not None else None,"concept":result.concept})
            target = recovery if instrument.kind.strip().casefold() in {"recovery","recuperacao","recuperação"} else regular
            target.append((instrument,result))
        base, base_trace, flags = _aggregate_assessments(regular, rule)
        rec, rec_trace, rec_flags = _aggregate_assessments(recovery, rule) if rule.recovery_mode != "none" else (None,[],[])
        flags += rec_flags
        if missing: flags.append("resultados_avaliativos_pendentes")
        value = None
        if not flags:
            if base is None: value = rec
            elif rec is None or rule.recovery_mode == "none": value = base
            elif rule.recovery_mode == "replace": value = rec
            elif rule.recovery_mode == "higher": value = max(base,rec)
            else: value = (base+rec)/Decimal(2)
            if value is None: flags.append("sem_resultado_aplicavel")
        attendance_total = attendance_credit = 0
        attendance_trace = []
        for lesson in lessons:
            if enrollment_id not in {r["enrollment_id"] for r in _attendance_roster(db, diary, lesson.lesson_date)}: continue
            lesson_units = max(1, int(lesson.lesson_count))
            attendance_total += lesson_units
            mark = marks[lesson.id].get(enrollment_id)
            if not mark: flags.append("chamada_pendente"); continue
            credited = mark.status == "present" or (mark.status == "justified_absence" and rule.justified_absence_counts_as_present is True)
            attendance_credit += lesson_units if credited else 0
            attendance_trace.append({"lesson_id":lesson.id,"status":mark.status,"lesson_count":lesson_units})
        attendance_pct = Decimal(attendance_credit)*Decimal(100)/Decimal(attendance_total) if attendance_total else None
        if rule.minimum_attendance_percent is not None and (attendance_pct is None or attendance_pct < Decimal(str(rule.minimum_attendance_percent))): flags.append("frequencia_abaixo_do_limite")
        opinion = opinions.get(enrollment_id)
        if rule.required_opinion and (not opinion or opinion.status != "final"): flags.append("parecer_final_pendente")
        hard_pending = {"resultados_avaliativos_pendentes","sem_resultado_aplicavel","chamada_pendente","conceito_fora_da_escala","peso_avaliativo_ausente","resultado_numerico_ausente"}
        status = "pending" if hard_pending.intersection(flags) else "calculated"
        numeric, concept = None, ""
        if value is not None:
            if rule.method == "concept":
                concept = _concept_from_rank(value, rule.concept_scale)
                if not flags: status = "concept"
            else:
                numeric = value.quantize(Decimal("1").scaleb(-rule.decimal_places), rounding=ROUND_HALF_UP)
                if rule.minimum_score is not None and numeric < Decimal(str(rule.minimum_score)): status = "below_minimum"
            if "frequencia_abaixo_do_limite" in flags: status = "attendance_below_minimum"
            elif "parecer_final_pendente" in flags: status = "opinion_pending"
        if status == "pending": pending += 1
        source = _json_safe({"rule":output(rule),"assessments":source_items,"aggregation":{"regular":base_trace,"recovery":rec_trace},"attendance":attendance_trace,"attendance_basis":"lesson_count","attendance_percent":str(attendance_pct) if attendance_pct is not None else None,"opinion_status":opinion.status if opinion else None})
        canonical = json.dumps(source,ensure_ascii=False,sort_keys=True,separators=(",",":")).encode()
        digest = hashlib.sha256(canonical).hexdigest()
        obj = db.scalar(select(m.PeriodResult).where(
            m.PeriodResult.diary_id==diary.id,m.PeriodResult.academic_period_id==period.id,m.PeriodResult.enrollment_id==enrollment_id
        ))
        if obj:
            obj.rule_id,obj.numeric_value,obj.concept_value=rule.id,numeric,concept
            obj.status,obj.flags,obj.calculation=status,flags,source
            obj.source_hash,obj.rule_version=digest,rule.version
            obj.calculated_by,obj.calculated_at=user.id,datetime.now(UTC)
            obj.version+=1
        else:
            obj=m.PeriodResult(school_id=school.id,diary_id=diary.id,academic_period_id=period.id,enrollment_id=enrollment_id,student_id=student["student_id"],rule_id=rule.id,numeric_value=numeric,concept_value=concept,status=status,flags=flags,calculation=source,source_hash=digest,rule_version=rule.version,calculated_by=user.id,calculated_at=datetime.now(UTC))
            db.add(obj)
        db.flush()
        output_rows.append({**output(obj),"student_name":student["name"],"student_number":student["number"]})
    audit(db,request,user,"diary.period.consolidated",diary,school.id,{"period_id":period.id,"rule_id":rule.id,"results":len(output_rows),"pending":pending,"source_hashes":[x["source_hash"] for x in output_rows]})
    return {"academic_period_id":period.id,"method":rule.method,"results":output_rows,"pending":pending,"count":len(output_rows)}


@router.get("/diaries/{diary_id}/periods/{period_id}/results")
def period_results(diary_id: str, period_id: str, db: DB, user: Actor, school: DiaryScope):
    diary=_scoped(db,m.SchoolDiary,diary_id,school.id);_require_diary(db,user,diary,"diary.read")
    period=_period(db,school.id,period_id,diary.academic_year_id)
    rows=list(db.scalars(select(m.PeriodResult).where(m.PeriodResult.diary_id==diary.id,m.PeriodResult.academic_period_id==period.id)))
    items=[]
    for row in rows:
        student=db.get(m.Student,row.student_id);person=db.get(m.Person,student.person_id) if student else None
        items.append({**output(row),"student_name":person.name if person else "","student_number":student.number if student else "", "requires_recalculation": (row.calculation or {}).get("attendance_basis") != "lesson_count"})
    rule=_assessment_rule_data(db,diary,period)
    return {"rule":output(rule) if rule else None,"items":items}


def _student_label(db, enrollment_id):
    enrollment=db.get(m.Enrollment,enrollment_id);student=db.get(m.Student,enrollment.student_id) if enrollment else None;person=db.get(m.Person,student.person_id) if student else None
    return (person.name if person else "Aluno")+(" · "+student.number if student else "")


def _report_attendance(db, snapshot):
    students={item["enrollment_id"]:item for item in snapshot.get("roster",[])}
    lessons={item["id"]:item for item in snapshot.get("lessons",[])}
    rules={item["academic_period_id"]:item for item in snapshot.get("assessment_rules",[])}
    scoped_period=(snapshot.get("period") or {}).get("id")
    counts={}
    for row in snapshot["attendance"]:
        lesson=lessons.get(row["lesson_id"],{})
        units=max(1,int(lesson.get("lesson_count") or 1))
        entry=counts.setdefault(row["enrollment_id"],{"present":0,"absent":0,"justified_absence":0,"credited":0})
        entry[row["status"]]=entry.get(row["status"],0)+units
        rule=rules.get(lesson.get("academic_period_id") or scoped_period,{})
        if row["status"]=="present" or (row["status"]=="justified_absence" and rule.get("justified_absence_counts_as_present") is True):
            entry["credited"]+=units
        if row["enrollment_id"] not in students:
            e=db.get(m.Enrollment,row["enrollment_id"]);st=db.get(m.Student,e.student_id) if e else None;p=db.get(m.Person,st.person_id) if st else None
            if e and st and p:students[e.id]={"enrollment_id":e.id,"name":p.name,"number":st.number}
    rows=[]
    for student in students.values():
        v=counts.get(student["enrollment_id"],{});total=sum(v.get(key,0) for key in ("present","absent","justified_absence"));credited=v.get("credited",0)
        rate=f"{credited*100/total:.1f}%".replace(".",",") if total else "—"
        rows.append((student["name"]+" · "+student["number"],f"Presenças: {v.get('present',0)} aula(s); faltas: {v.get('absent',0)}; justificadas: {v.get('justified_absence',0)}; frequência nas aulas com chamada: {rate}. Justificadas só geram crédito quando a regra do período autoriza."))
    return rows


REPORT_TITLES={"class_diary":"Diário da turma / componente","lessons":"Registro de aulas","attendance":"Mapa de frequência","assessments":"Mapa de avaliações/notas/conceitos","opinions":"Pareceres descritivos","occurrences":"Ocorrências pedagógicas","communications":"Comunicações à família","student_record":"Ficha individual do estudante","period_consolidation":"Consolidação por período","closure":"Relatório de fechamento","pending":"Relatório de pendências","revision_history":"Histórico de retificações","audit_validation":"Auditoria e validação"}


@router.get("/diaries/{diary_id}/reports/{report_type}.pdf")
def diary_report_family(diary_id: str, report_type: str, db: DB, user: Actor, school: DiaryScope, academic_period_id: str = "", enrollment_id: str = ""):
    diary=_scoped(db,m.SchoolDiary,diary_id,school.id);_require_diary(db,user,diary,"diary.reports")
    if report_type not in REPORT_TITLES:fail(404,"Tipo de relatório não encontrado.")
    period=_period(db,school.id,academic_period_id,diary.academic_year_id) if academic_period_id else None
    closure=None
    if period:
        closure=db.scalar(select(m.DiaryClosure).where(m.DiaryClosure.diary_id==diary.id,m.DiaryClosure.academic_period_id==period.id,m.DiaryClosure.active.is_(True)).order_by(m.DiaryClosure.closed_at.desc()))
    elif diary.status=="closed":
        closure=db.scalar(select(m.DiaryClosure).where(m.DiaryClosure.diary_id==diary.id,m.DiaryClosure.academic_period_id.is_(None),m.DiaryClosure.active.is_(True)).order_by(m.DiaryClosure.closed_at.desc()))
    data=closure.snapshot if closure else _snapshot(db,diary,period.id if period else None)
    rows=[("Ano letivo",data["diary"]["year_name"]),("Turma",data["diary"]["class_name"]),("Componente",data["diary"]["component_name"]),("Professor",data["diary"]["teacher_name"] or "Não vinculado"),("Situação",data["diary"]["status"])]
    if period:rows.append(("Período",period.name))
    if report_type in {"class_diary","lessons"}:
        plan=data.get("plan") or {}
        if plan:rows.extend([("Objetivos",plan.get("objectives","")),("Unidade/objetos",plan.get("thematic_units","")+" / "+plan.get("knowledge_objects","")),("Habilidades BNCC",", ".join(plan.get("bncc_references",[]))),("Metodologia",plan.get("methodology","")),("Recursos",plan.get("resources","")),("Estratégia de avaliação",plan.get("assessment_strategy",""))])
        for i,x in enumerate(data["lessons"],1):rows.append((f"Aula {i} · {x['lesson_date']}",f"{x['lesson_count']} aula(s) — {x['content']} | Habilidades: {x.get('skills','')} | Metodologia: {x.get('methodology','')} | Atividades: {x.get('activities','')} | Tarefa: {x.get('homework','')}"))
        if report_type=="class_diary":rows.extend(_report_attendance(db,data))
    elif report_type=="attendance":
        rows.extend(_report_attendance(db,data));rows.append(("Total de aulas",str(sum(int(x["lesson_count"]) for x in data["lessons"]))))
    elif report_type=="assessments":
        names={x["enrollment_id"]:x["name"]+" · "+x["number"] for x in data.get("roster",[])}
        for result in data.get("assessment_results",[]):names.setdefault(result["enrollment_id"],_student_label(db,result["enrollment_id"]))
        for inst in data.get("assessments",[]):
            rows.append(("Avaliação · "+inst["title"],inst["assessment_date"]+" · "+inst["value_type"]+" · "+inst["status"]))
            values={x["enrollment_id"]:x for x in data.get("assessment_results",[]) if x["instrument_id"]==inst["id"]}
            for enrollment_id,name in sorted(names.items(),key=lambda x:x[1]):
                result=values.get(enrollment_id);value=(str(result["numeric_score"]) if result and result.get("numeric_score") is not None else result.get("concept","") if result else "Pendente")
                rows.append((name,value))
        for result in data.get("period_results",[]):rows.append(("Consolidação · "+_student_label(db,result["enrollment_id"]),str(result.get("numeric_value") if result.get("numeric_value") is not None else result.get("concept_value") or "Pendente")+" · "+result["status"]))
    elif report_type in {"opinions","occurrences"}:
        collection=data.get("opinions" if report_type=="opinions" else "occurrences",[])
        for x in collection:
            if report_type=="opinions":rows.append((_student_label(db,x["enrollment_id"])+" · "+x["status"],x["text"]))
            else:rows.append((_student_label(db,x["enrollment_id"])+" · "+x["occurrence_date"]+" · "+x["kind"]+" · "+x["status"],x["title"]+" — "+x["description"]))
    elif report_type=="communications":
        if closure:
            records=data.get("communications",[])
        else:
            stmt=select(m.DiaryFamilyCommunication).where(m.DiaryFamilyCommunication.diary_id==diary.id)
            if period:
                stmt=stmt.where(m.DiaryFamilyCommunication.academic_period_id==period.id)
            records=[_communication_output(db,item) for item in db.scalars(stmt.order_by(m.DiaryFamilyCommunication.sent_at,m.DiaryFamilyCommunication.id))]
        for record in records:
            status='Lido em '+record['read_at'] if record['read_at'] else 'Disponível no portal'
            rows.append((record['student_name']+' · '+record['guardian_name']+' · '+record['sent_at'],record['title']+' — '+record['message']+' · '+status))
    elif report_type=="student_record":
        if not enrollment_id:fail(422,"Selecione a matrícula para emitir a ficha individual.")
        enrollment=_enrollment_for_diary(db,diary,enrollment_id);rows=[("Aluno",_student_label(db,enrollment.id)),*rows]
        for lesson in data["lessons"]:
            mark=next((x for x in data["attendance"] if x["lesson_id"]==lesson["id"] and x["enrollment_id"]==enrollment.id),None)
            if mark:rows.append(("Frequência · "+lesson["lesson_date"],mark["status"]))
        for instrument in data.get("assessments",[]):
            result=next((x for x in data.get("assessment_results",[]) if x["instrument_id"]==instrument["id"] and x["enrollment_id"]==enrollment.id),None)
            if result:rows.append(("Avaliação · "+instrument["title"],str(result.get("numeric_score") if result.get("numeric_score") is not None else result.get("concept",""))))
        for x in data.get("opinions",[]):
            if x["enrollment_id"]==enrollment.id:rows.append(("Parecer · "+x["status"],x["text"]))
        for x in data.get("pedagogical_records",[]):
            if x["enrollment_id"]==enrollment.id:rows.append(("Registro pedagógico · "+x["record_date"]+" · "+x["kind"],x["text"]))
        for x in data.get("occurrences",[]):
            if x["enrollment_id"]==enrollment.id:rows.append(("Ocorrência · "+x["occurrence_date"],x["title"]+" — "+x["description"]))
    elif report_type=="period_consolidation":
        if not period:fail(422,"Selecione o período para emitir a consolidação.")
        rule=_assessment_rule_data(db,diary,period)
        if rule:rows.extend([("Regra",rule.method),("Escala final",str(rule.scale_max)),("Casas decimais",str(rule.decimal_places)),("Recuperação",rule.recovery_mode),("Versão da regra",str(rule.version))])
        for x in data.get("period_results",[]):
            value=x.get("numeric_value") if x.get("numeric_value") is not None else x.get("concept_value") or "Pendente"
            rows.append((_student_label(db,x["enrollment_id"]),str(value)+" · "+x["status"]+" · "+", ".join(x.get("flags") or [])))
    elif report_type=="closure":
        for x in db.scalars(select(m.DiaryClosure).where(m.DiaryClosure.diary_id==diary.id).order_by(m.DiaryClosure.closed_at.desc())):
            period_row=db.get(m.AcademicPeriod,x.academic_period_id) if x.academic_period_id else None
            rows.append(((period_row.name if period_row else "Diário completo")+" · "+x.closed_at.isoformat(),"SHA-256: "+x.snapshot_hash+"; ativo: "+str(x.active)+"; motivo: "+x.reason))
    elif report_type=="pending":
        rows.extend((key,str(value)) for key,value in _diary_pending_counts(db,diary).items())
        for lesson in data["lessons"]:
            saved=sum(1 for x in data["attendance"] if x["lesson_id"]==lesson["id"]);expected=len(_attendance_roster(db,diary,date.fromisoformat(lesson["lesson_date"])))
            if saved<expected:rows.append(("Chamada · "+lesson["lesson_date"],f"{expected-saved} aluno(s) sem situação"))
        for x in data.get("occurrences",[]):
            if x["status"]=="draft":rows.append(("Ocorrência aguardando revisão · "+x["occurrence_date"],x["title"]))
    elif report_type=="revision_history":
        for x in db.scalars(select(m.DiaryClosure).where(m.DiaryClosure.diary_id==diary.id).order_by(m.DiaryClosure.closed_at.desc())):rows.append(("Fechamento · "+x.closed_at.isoformat(),x.snapshot_hash+" · "+x.reason))
        for x in db.scalars(select(m.DiaryRevision).where(m.DiaryRevision.diary_id==diary.id).order_by(m.DiaryRevision.reopened_at.desc())):rows.append(("Reabertura · "+x.reopened_at.isoformat(),x.reason))
    elif report_type=="audit_validation":
        issues=[]
        for lesson in data["lessons"]:
            expected=len(_attendance_roster(db,diary,date.fromisoformat(lesson["lesson_date"])));saved=sum(1 for x in data["attendance"] if x["lesson_id"]==lesson["id"])
            if saved<expected:issues.append(f"Chamada incompleta em {lesson['lesson_date']}: {saved}/{expected}")
        for result in data.get("period_results",[]):
            result_period=db.get(m.AcademicPeriod,result["academic_period_id"]);rule=_assessment_rule_data(db,diary,result_period) if result_period else None
            if rule and result["rule_version"]!=rule.version:issues.append("Consolidação desatualizada: "+_student_label(db,result["enrollment_id"]))
        rows.append(("Validação","Sem divergências verificadas." if not issues else f"{len(issues)} divergência(s)"))
        rows.extend((f"Item {i}",issue) for i,issue in enumerate(issues,1))
    note=("Snapshot de fechamento · SHA-256 "+closure.snapshot_hash) if closure else "Emitido dos registros atuais. A frequência exibida resume os registros de chamada e não presume regra normativa ou assinatura digital."
    if report_type=="period_consolidation" and period and not data.get("period_results"):note+=" Nenhuma consolidação foi processada."
    content=render_pdf(school.name,REPORT_TITLES[report_type],rows,note,user.name,db=db)
    suffix="-"+period.id if period else ""
    return Response(content,media_type="application/pdf",headers={"Content-Disposition":f'attachment; filename="diario-{report_type}-{diary.id}{suffix}.pdf"',"Cache-Control":"no-store"})


@router.get("/diaries/{diary_id}/occurrences")
def diary_occurrences(diary_id: str, db: DB, user: Actor, school: DiaryScope, academic_period_id: str = ""):
    diary=_scoped(db,m.SchoolDiary,diary_id,school.id);_require_diary(db,user,diary,"diary.read")
    stmt=select(m.DiaryOccurrence).where(m.DiaryOccurrence.diary_id==diary.id)
    if academic_period_id:
        _period(db,school.id,academic_period_id,diary.academic_year_id)
        stmt=stmt.where(m.DiaryOccurrence.academic_period_id==academic_period_id)
    return [output(x) for x in db.scalars(stmt.order_by(m.DiaryOccurrence.occurrence_date.desc()))]


@router.get("/diaries/{diary_id}/communication-recipients")
def diary_communication_recipients(diary_id: str, enrollment_id: str, db: DB, user: Actor, school: DiaryScope):
    diary=_scoped(db,m.SchoolDiary,diary_id,school.id);_require_diary(db,user,diary,"diary.read");require(user,"communications.send")
    enrollment=_enrollment_for_diary(db,diary,enrollment_id)
    recipients=_portal_recipients_for_student(db,school.id,enrollment.student_id)
    return [
        {'guardian_link_id':link_id,'name':item['person'].name,'relationship':item['link'].relationship,
         'portal_account_count':len(item['accounts'])}
        for link_id,item in sorted(recipients.items(),key=lambda row:(row[1]['person'].name.casefold(),row[0]))
    ]


@router.get("/diaries/{diary_id}/communications")
def diary_communications(diary_id: str, db: DB, user: Actor, school: DiaryScope):
    diary=_scoped(db,m.SchoolDiary,diary_id,school.id);_require_diary(db,user,diary,"diary.read")
    rows=db.scalars(select(m.DiaryFamilyCommunication).where(
        m.DiaryFamilyCommunication.school_id==school.id,
        m.DiaryFamilyCommunication.diary_id==diary.id,
    ).order_by(m.DiaryFamilyCommunication.sent_at.desc(),m.DiaryFamilyCommunication.id.desc()).limit(200)).all()
    return [_communication_output(db,item) for item in rows]


@router.post("/diaries/{diary_id}/communications",status_code=201)
def create_diary_communications(diary_id: str,data: s.DiaryCommunicationInput,db: DB,user: Actor,school: DiaryScope,request: Request):
    diary=_scoped(db,m.SchoolDiary,diary_id,school.id);_require_diary(db,user,diary,"diary.read");require(user,"communications.send")
    lock_school(db,school.id)
    enrollment=_enrollment_for_diary(db,diary,data.enrollment_id)
    period=_period(db,school.id,data.academic_period_id,diary.academic_year_id) if data.academic_period_id else None
    occurrence=None
    if data.occurrence_id:
        occurrence=_scoped(db,m.DiaryOccurrence,data.occurrence_id,school.id)
        if occurrence.diary_id!=diary.id or occurrence.enrollment_id!=enrollment.id:
            fail(422,"A ocorrência deve pertencer ao diário e à matrícula selecionados.")
        if occurrence.status!="reviewed":
            fail(409,"A ocorrência precisa ser revisada antes do envio ao responsável.")
        if period and period.id!=occurrence.academic_period_id:
            fail(422,"O período do comunicado precisa corresponder ao período da ocorrência.")
        period=db.get(m.AcademicPeriod,occurrence.academic_period_id)
    recipients=_portal_recipients_for_student(db,school.id,enrollment.student_id)
    selected=set(data.recipient_guardian_link_ids)
    if not selected or not selected.issubset(recipients):
        fail(422,"Selecione somente responsáveis legais com acesso ativo ao portal.")
    subject=data.title.strip();message=data.message.strip()
    if len(subject)<2 or len(message)<2:
        fail(422,"Informe um título e uma mensagem.")
    results=[];created=0;stamp=now()
    for link_id in sorted(selected):
        recipient=recipients[link_id]
        for account in recipient['accounts']:
            previous=db.scalar(select(m.DiaryFamilyCommunication).where(
                m.DiaryFamilyCommunication.account_id==account.id,
                m.DiaryFamilyCommunication.client_key==data.client_key,
            ).with_for_update())
            if previous:
                same=(previous.diary_id==diary.id and previous.academic_period_id==(period.id if period else None)
                      and previous.occurrence_id==(occurrence.id if occurrence else None)
                      and previous.enrollment_id==enrollment.id and previous.student_id==enrollment.student_id
                      and previous.guardian_link_id==link_id and previous.title==subject and previous.message==message)
                if not same:
                    fail(409,"A chave desta operação já foi usada com outro comunicado.")
                results.append(_communication_output(db,previous))
                continue
            item=m.DiaryFamilyCommunication(
                school_id=school.id,diary_id=diary.id,academic_period_id=period.id if period else None,
                occurrence_id=occurrence.id if occurrence else None,
                enrollment_id=enrollment.id,student_id=enrollment.student_id,guardian_link_id=link_id,
                account_id=account.id,title=subject,message=message,client_key=data.client_key,
                sent_by=user.id,sent_at=stamp,
            )
            db.add(item);db.flush();created+=1
            audit(db,request,user,"diary.family_communication.sent",item,school.id,{
                "channel":"portal","guardian_link_id":link_id,"occurrence_id":item.occurrence_id,
            })
            results.append(_communication_output(db,item))
    return {"created":created,"messages":results,"channel":"portal"}


def _occurrence_period(db, school_id, diary, supplied_period, occurrence_date):
    year=db.get(m.AcademicYear,diary.academic_year_id)
    if occurrence_date<year.starts_on or occurrence_date>year.ends_on:fail(422,"Data da ocorrência fora do ano letivo.")
    if supplied_period:
        period=_period(db,school_id,supplied_period,diary.academic_year_id)
        if occurrence_date<period.starts_on or occurrence_date>period.ends_on:fail(422,"Data da ocorrência fora do período informado.")
        return period
    periods=list(db.scalars(select(m.AcademicPeriod).where(m.AcademicPeriod.school_id==school_id,m.AcademicPeriod.academic_year_id==diary.academic_year_id,m.AcademicPeriod.starts_on<=occurrence_date,m.AcademicPeriod.ends_on>=occurrence_date)))
    if len(periods)!=1:fail(422,"Selecione o período letivo da ocorrência.")
    return periods[0]


@router.post("/diaries/{diary_id}/occurrences",status_code=201)
def create_diary_occurrence(diary_id: str,data: s.DiaryOccurrenceInput,db: DB,user: Actor,school: DiaryScope,request: Request):
    diary=_scoped(db,m.SchoolDiary,diary_id,school.id);_require_diary(db,user,diary,"diary.write");_require_open_diary(diary)
    enrollment=_enrollment_for_diary(db,diary,data.enrollment_id,data.occurrence_date)
    period=_occurrence_period(db,school.id,diary,data.academic_period_id,data.occurrence_date)
    if data.status=="reviewed":require(user,"diary.review")
    obj=m.DiaryOccurrence(school_id=school.id,diary_id=diary.id,academic_period_id=period.id,enrollment_id=enrollment.id,student_id=enrollment.student_id,occurrence_date=data.occurrence_date,kind=data.kind,title=data.title,description=data.description,status=data.status,recorded_by=user.id,reviewed_by=user.id if data.status=="reviewed" else None)
    db.add(obj);db.flush();audit(db,request,user,"diary.occurrence.created",obj,school.id,{"kind":obj.kind,"status":obj.status})
    return output(obj)


@router.patch("/diaries/{diary_id}/occurrences/{occurrence_id}")
def edit_diary_occurrence(diary_id: str,occurrence_id: str,data: s.DiaryOccurrenceEdit,db: DB,user: Actor,school: DiaryScope,request: Request):
    diary=_scoped(db,m.SchoolDiary,diary_id,school.id);_require_diary(db,user,diary,"diary.write");_require_open_diary(diary)
    obj=_scoped(db,m.DiaryOccurrence,occurrence_id,school.id)
    if obj.diary_id!=diary.id:fail(404,"Ocorrência não encontrada neste diário.")
    if obj.status=="reviewed":fail(409,"Ocorrência revisada é imutável; reabra o diário e registre retificação justificada como novo lançamento.")
    check_version(obj,data.version)
    enrollment=_enrollment_for_diary(db,diary,data.enrollment_id,data.occurrence_date)
    period=_occurrence_period(db,school.id,diary,data.academic_period_id,data.occurrence_date)
    if data.status=="reviewed":require(user,"diary.review")
    for key,value in data.model_dump(exclude={"version"}).items():
        if key not in {"academic_period_id","enrollment_id"}:setattr(obj,key,value)
    obj.academic_period_id,obj.enrollment_id,obj.student_id=period.id,enrollment.id,enrollment.student_id
    obj.reviewed_by=user.id if data.status=="reviewed" else None;obj.version+=1
    db.flush();audit(db,request,user,"diary.occurrence.updated",obj,school.id,{"status":obj.status,"version":obj.version})
    return output(obj)
