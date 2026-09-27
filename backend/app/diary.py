"""API do núcleo do Diário Escolar Digital."""
import hashlib
import json
from decimal import Decimal
from datetime import UTC, date, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Request
from fastapi.responses import Response
from sqlalchemy import func, select

from . import diary_schemas as s, models as m
from .common import audit, output
from .db import now
from .documents import render_pdf
from .security import Actor, DB, PERMISSIONS, check_version, current_user, fail, require


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
    year = _scoped(db, m.AcademicYear, data.academic_year_id, school.id)
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
    return [output(x) for x in db.scalars(stmt.order_by(m.CurriculumPlan.created_at.desc()))]


@router.post("/curriculum-plans", status_code=201)
def create_plan(data: s.CurriculumPlanInput, db: DB, user: Actor, school: DiaryScope, request: Request):
    require(user, "diary.write")
    group = _scoped(db, m.ClassGroup, data.class_group_id, school.id)
    _scoped(db, m.CurriculumComponent, data.component_id, school.id)
    if data.academic_period_id: _period(db, school.id, data.academic_period_id, group.academic_year_id)
    if data.teacher_assignment_id:
        assignment = _scoped(db, m.TeacherAssignment, data.teacher_assignment_id, school.id)
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
    obj = _scoped(db, m.CurriculumPlan, plan_id, school.id)
    check_version(obj, data.version)
    assignment = db.get(m.TeacherAssignment, obj.teacher_assignment_id) if obj.teacher_assignment_id else None
    if user.role == "teacher" and (not assignment or not (assignment.teacher_user_id == user.id or (user.person_id and assignment.teacher_person_id == user.person_id))):
        fail(403, "O planejamento não pertence a uma atribuição docente do usuário.")
    values = data.model_dump(exclude={"version"})
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
    group = _scoped(db, m.ClassGroup, data.class_group_id, school.id)
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
    }
