from fastapi import APIRouter, Request
from sqlalchemy import select
from . import models as m, schemas as s
from .common import audit, output
from .registry import validate
from .security import Actor, DB, ROLE_LABELS, Scope, check_version, fail, require, scoped

router = APIRouter(prefix='/api/v1', tags=['Perfis e espaços de trabalho'])


def allowed_school(db, user, school_id):
    school = db.get(m.School, school_id)
    if not school or not school.active:
        fail(404, 'Escola não encontrada.')
    if user.role != 'admin' and not db.get(m.SchoolAccess, (user.id, school_id)):
        fail(403, 'Acesso não autorizado a esta escola.')
    return school


def school_ids(db, user):
    if user.role == 'admin':
        return [school.id for school in db.scalars(select(m.School).where(m.School.active.is_(True))).all()]
    return list(db.scalars(select(m.SchoolAccess.school_id).where(m.SchoolAccess.user_id == user.id)))


def linked_person(db, user, school_id):
    if user.person_id:
        return db.scalar(select(m.Person).where(m.Person.id == user.person_id, m.Person.school_id == school_id))
    # Compatibilidade para instalações antigas: o vínculo pode ser resolvido
    # pelo e-mail até que o administrador edite o usuário e grave person_id.
    return db.scalar(select(m.Person).where(m.Person.school_id == school_id, m.Person.email == user.email))


def enrollment_summary(db, enrollment):
    group = db.get(m.ClassGroup, enrollment.class_group_id)
    year = db.get(m.AcademicYear, enrollment.academic_year_id)
    grade = db.get(m.Grade, group.grade_id) if group else None
    shift = db.get(m.Shift, group.shift_id) if group else None
    return {
        'id': enrollment.id,
        'number': enrollment.number,
        'status': enrollment.status,
        'enrolled_on': enrollment.enrolled_on.isoformat(),
        'class_group_id': enrollment.class_group_id,
        'class_name': group.name if group else '',
        'year_name': year.name if year else '',
        'grade_name': grade.name if grade else '',
        'shift_name': shift.name if shift else '',
    }


def student_summary(db, student, school_id, include_documents=False):
    person = db.get(m.Person, student.person_id)
    enrollments = db.scalars(select(m.Enrollment).where(
        m.Enrollment.school_id == school_id,
        m.Enrollment.student_id == student.id,
        m.Enrollment.status.in_(['draft', 'active', 'suspended', 'completed']),
    ).order_by(m.Enrollment.created_at.desc())).all()
    result = {
        'id': student.id,
        'number': student.number,
        'name': person.social_name or person.name if person else '',
        'full_name': person.name if person else '',
        'birth_date': person.birth_date.isoformat() if person and person.birth_date else None,
        'status': student.status,
        'enrollments': [enrollment_summary(db, item) for item in enrollments],
    }
    if include_documents:
        documents = db.execute(select(m.StudentDocument, m.DocumentType.name).join(
            m.DocumentType, m.DocumentType.id == m.StudentDocument.document_type_id
        ).where(
            m.StudentDocument.school_id == school_id,
            m.StudentDocument.student_id == student.id,
            m.StudentDocument.status != 'archived',
        ).order_by(m.StudentDocument.created_at.desc())).all()
        result['documents'] = [{
            'id': document.id,
            'type_name': name,
            'status': document.status,
            'expires_on': document.expires_on.isoformat() if document.expires_on else None,
            'file_id': document.file_id,
        } for document, name in documents]
    return result


def teacher_context(db, user):
    assignments = []
    for school_id in school_ids(db, user):
        school = allowed_school(db, user, school_id)
        rows = db.scalars(select(m.TeacherAssignment).where(
            m.TeacherAssignment.school_id == school.id,
            m.TeacherAssignment.teacher_user_id == user.id,
            m.TeacherAssignment.active.is_(True),
        ).order_by(m.TeacherAssignment.created_at)).all()
        for assignment in rows:
            group = db.get(m.ClassGroup, assignment.class_group_id)
            year = db.get(m.AcademicYear, assignment.academic_year_id)
            grade = db.get(m.Grade, group.grade_id) if group else None
            shift = db.get(m.Shift, group.shift_id) if group else None
            roster = db.execute(select(m.Student, m.Person, m.Enrollment).join(
                m.Person, m.Person.id == m.Student.person_id
            ).join(
                m.Enrollment, m.Enrollment.student_id == m.Student.id
            ).where(
                m.Enrollment.school_id == school.id,
                m.Enrollment.class_group_id == assignment.class_group_id,
                m.Enrollment.status.in_(['active', 'suspended']),
            ).order_by(m.Person.name)).all()
            assignments.append({
                'id': assignment.id,
                'school_id': school.id,
                'school_name': school.name,
                'class_group_id': assignment.class_group_id,
                'class_name': group.name if group else '',
                'year_name': year.name if year else '',
                'grade_name': grade.name if grade else '',
                'shift_name': shift.name if shift else '',
                'subject_name': assignment.subject_name,
                'students': [{
                    'id': student.id,
                    'number': student.number,
                    'name': person.social_name or person.name,
                    'status': enrollment.status,
                } for student, person, enrollment in roster],
            })
    return assignments


def student_context(db, user):
    students = []
    for school_id in school_ids(db, user):
        school = allowed_school(db, user, school_id)
        person = linked_person(db, user, school.id)
        if not person:
            continue
        student = db.scalar(select(m.Student).where(
            m.Student.school_id == school.id, m.Student.person_id == person.id
        ))
        if student:
            students.append({**student_summary(db, student, school.id, include_documents=True), 'school_name': school.name})
    return students


def guardian_context(db, user):
    students = []
    for school_id in school_ids(db, user):
        school = allowed_school(db, user, school_id)
        person = linked_person(db, user, school.id)
        if not person:
            continue
        links = db.scalars(select(m.GuardianLink).where(
            m.GuardianLink.school_id == school.id,
            m.GuardianLink.person_id == person.id,
            m.GuardianLink.active.is_(True),
        ).order_by(m.GuardianLink.created_at)).all()
        for link in links:
            student = db.get(m.Student, link.student_id)
            if student:
                students.append({
                    **student_summary(db, student, school.id, include_documents=False),
                    'school_name': school.name,
                    'relationship': link.relationship,
                    'legal': link.legal,
                    'financial': link.financial,
                })
    return students


@router.get('/profile/context')
def profile_context(db: DB, user: Actor):
    require(user, 'profile.self')
    role = user.role
    data = {
        'role': role,
        'role_label': ROLE_LABELS.get(role, role),
        'person_id': user.person_id,
        'schools': [],
    }
    if role == 'teacher':
        data['assignments'] = teacher_context(db, user)
    elif role == 'student':
        data['students'] = student_context(db, user)
    elif role == 'guardian':
        data['students'] = guardian_context(db, user)
    else:
        data['person'] = output(db.get(m.Person, user.person_id)) if user.person_id else None
    for school_id in school_ids(db, user):
        school = allowed_school(db, user, school_id)
        data['schools'].append({'id': school.id, 'name': school.name})
    return data


def assignment_output(db, assignment):
    group = db.get(m.ClassGroup, assignment.class_group_id)
    year = db.get(m.AcademicYear, assignment.academic_year_id)
    teacher = db.get(m.User, assignment.teacher_user_id)
    person = db.get(m.Person, teacher.person_id) if teacher and teacher.person_id else None
    return {
        **output(assignment),
        'teacher_name': person.name if person else (teacher.name if teacher else ''),
        'teacher_email': teacher.email if teacher else '',
        'class_name': group.name if group else '',
        'year_name': year.name if year else '',
    }


@router.get('/schools/{school_id}/teacher-assignments')
def list_teacher_assignments(db: DB, user: Actor, school: Scope):
    require(user, 'staff.assignments.read')
    rows = db.scalars(select(m.TeacherAssignment).where(
        m.TeacherAssignment.school_id == school.id
    ).order_by(m.TeacherAssignment.created_at.desc())).all()
    return [assignment_output(db, row) for row in rows]


@router.post('/schools/{school_id}/teacher-assignments', status_code=201)
def create_teacher_assignment(data: s.TeacherAssignmentInput, db: DB, user: Actor, school: Scope, request: Request):
    require(user, 'staff.assignments.write')
    teacher = db.get(m.User, data.teacher_user_id)
    if not teacher or not teacher.active or teacher.role != 'teacher':
        fail(422, 'O usuário informado não é um Professor ativo.')
    if teacher.role != 'admin' and not db.get(m.SchoolAccess, (teacher.id, school.id)):
        fail(422, 'O Professor não possui acesso à escola informada.')
    group = scoped(db, m.ClassGroup, data.class_group_id, school.id)
    obj = m.TeacherAssignment(
        school_id=school.id,
        teacher_user_id=teacher.id,
        class_group_id=group.id,
        academic_year_id=group.academic_year_id,
        subject_name=data.subject_name.strip(),
        active=data.active,
    )
    db.add(obj)
    db.flush()
    audit(db, request, user, 'teacher_assignment.created', obj, school.id)
    return assignment_output(db, obj)


@router.patch('/schools/{school_id}/teacher-assignments/{assignment_id}')
def update_teacher_assignment(assignment_id: str, data: s.Edit, db: DB, user: Actor, school: Scope, request: Request):
    require(user, 'staff.assignments.write')
    obj = scoped(db, m.TeacherAssignment, assignment_id, school.id)
    check_version(obj, data.version)
    values = validate(s.TeacherAssignmentInput, data.data)
    teacher = db.get(m.User, values.teacher_user_id)
    if not teacher or teacher.role != 'teacher':
        fail(422, 'O usuário informado não é um Professor.')
    group = scoped(db, m.ClassGroup, values.class_group_id, school.id)
    obj.teacher_user_id = teacher.id
    obj.class_group_id = group.id
    obj.academic_year_id = group.academic_year_id
    obj.subject_name = values.subject_name.strip()
    obj.active = values.active
    obj.version += 1
    audit(db, request, user, 'teacher_assignment.updated', obj, school.id)
    db.flush()
    return assignment_output(db, obj)
