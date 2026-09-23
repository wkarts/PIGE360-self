from fastapi import APIRouter, File, Query, Request, UploadFile
from sqlalchemy import func, or_, select
from . import models as m, schemas as s
from .common import audit, number, output
from .security import Actor, DB, Scope, check_version, fail, lock_school, require, scoped
from .registry import validate
from .config import settings
from .documents import validate_upload, write_file

router = APIRouter(prefix='/api/v1/schools/{school_id}', tags=['Pessoas, alunos e responsáveis'])

PERSON_TYPE_LABELS = {
    'student': 'Aluno',
    'teacher': 'Professor',
    'collaborator': 'Colaborador',
    'employee': 'Funcionário',
    'parent': 'Pai / mãe',
    'mother': 'Mãe',
    'father': 'Pai',
    'guardian': 'Responsável',
    'financial_responsible': 'Responsável financeiro',
    'legal_responsible': 'Responsável legal',
    'staff': 'Equipe / administrativo',
    'other': 'Outro',
}
RESPONSIBLE_PERSON_TYPES = frozenset({
    'parent', 'mother', 'father', 'guardian',
    'financial_responsible', 'legal_responsible',
})


def person_type_label(code):
    return PERSON_TYPE_LABELS.get(code, code.replace('_', ' ').capitalize())


def derived_person_types(db, person_id):
    result = set()
    if db.scalar(select(m.Student.id).where(m.Student.person_id == person_id).limit(1)):
        result.add('student')
    if db.scalar(select(m.GuardianLink.id).where(
        m.GuardianLink.person_id == person_id,
        m.GuardianLink.active.is_(True),
    ).limit(1)):
        result.add('guardian')
    if db.scalar(select(m.TeacherProfile.id).where(
        m.TeacherProfile.person_id == person_id,
    ).limit(1)):
        result.add('teacher')
    if db.scalar(select(m.EmployeeProfile.id).where(
        m.EmployeeProfile.person_id == person_id,
    ).limit(1)):
        result.add('employee')
    return result


def active_person_types(db, person_id):
    return set(db.scalars(select(m.PersonTypeLink.type_code).where(
        m.PersonTypeLink.person_id == person_id,
        m.PersonTypeLink.active.is_(True),
    )).all())


def sync_person_types(db, person, requested, required=()):
    if requested is None:
        return
    desired = set(requested) | set(required) | derived_person_types(db, person.id)
    current = {
        link.type_code: link
        for link in db.scalars(select(m.PersonTypeLink).where(
            m.PersonTypeLink.person_id == person.id,
            m.PersonTypeLink.school_id == person.school_id,
        )).all()
    }
    for code, link in current.items():
        link.active = code in desired
    for code in desired:
        if code not in current:
            db.add(m.PersonTypeLink(
                school_id=person.school_id,
                person_id=person.id,
                type_code=code,
                active=True,
            ))
    person.is_guardian = bool(desired & RESPONSIBLE_PERSON_TYPES)


def ensure_person_type(db, person, code):
    desired = active_person_types(db, person.id)
    desired.add(code)
    sync_person_types(db, person, desired, required=(code,))


def person_output(db, obj):
    student_id = db.scalar(select(m.Student.id).where(
        m.Student.person_id == obj.id,
    ).limit(1))
    explicit_types = active_person_types(db, obj.id)
    type_codes = explicit_types | derived_person_types(db, obj.id)
    # Tipos de Pessoa são exclusivamente cadastrais. Usuário, login e perfil
    # de acesso pertencem a outro domínio e nunca entram nesta classificação.
    return {
        **output(obj),
        # Alias legado: representa somente tipos funcionais da Pessoa.
        'role_keys': sorted(type_codes),
        'roles': [person_type_label(key) for key in sorted(type_codes)],
        'person_types': sorted(type_codes),
        'person_type_labels': [person_type_label(key) for key in sorted(type_codes)],
        'student_id': student_id,
        'photo_file_id': obj.photo_file_id,
    }


def student_output(db, obj):
    return {**output(obj), 'person': person_output(db, db.get(m.Person, obj.person_id))}


def teacher_output(db, obj):
    return {**output(obj), 'person': person_output(db, db.get(m.Person, obj.person_id))}


def employee_output(db, obj):
    return {**output(obj), 'person': person_output(db, db.get(m.Person, obj.person_id))}


def _person_for_profile(db, school, person_id, person_data, type_code):
    if person_id:
        person = scoped(db, m.Person, person_id, school.id)
    else:
        values = person_data.model_dump(exclude={'person_types'})
        values['is_guardian'] = bool(values.get('is_guardian'))
        person = m.Person(school_id=school.id, **values)
        db.add(person)
        db.flush()
    ensure_person_type(db, person, type_code)
    return person


def _profile_list(db, school, model, output_fn, q, page, page_size, search_fields):
    stmt = select(model).join(m.Person, model.person_id == m.Person.id).where(
        model.school_id == school.id,
    )
    if q:
        like = '%' + q.replace('%', r'\%').replace('_', r'\_') + '%'
        stmt = stmt.where(or_(*[
            field.ilike(like, escape='\\') for field in search_fields
        ]))
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = db.scalars(stmt.order_by(m.Person.name).offset((page - 1) * page_size).limit(page_size)).all()
    return {
        'items': [output_fn(db, row) for row in rows],
        'total': total,
        'page': page,
        'page_size': page_size,
    }


@router.get('/persons')
def list_persons(db: DB, user: Actor, school: Scope, q: str = Query(default='', max_length=160), guardians_only: bool = False, page: int = Query(1, ge=1), page_size: int = Query(30, ge=1, le=100)):
    stmt = select(m.Person).where(m.Person.school_id == school.id)
    if guardians_only:
        responsible = select(m.PersonTypeLink.person_id).where(
            m.PersonTypeLink.school_id == school.id,
            m.PersonTypeLink.active.is_(True),
            m.PersonTypeLink.type_code.in_(RESPONSIBLE_PERSON_TYPES),
        )
        stmt = stmt.where(or_(m.Person.is_guardian.is_(True), m.Person.id.in_(responsible)))
    if q:
        like = '%' + q.replace('%', r'\%').replace('_', r'\_') + '%'
        stmt = stmt.where(or_(
            m.Person.name.ilike(like, escape='\\'),
            m.Person.social_name.ilike(like, escape='\\'),
            m.Person.cpf.ilike(like, escape='\\'),
            m.Person.rg.ilike(like, escape='\\'),
            m.Person.phone.ilike(like, escape='\\'),
            m.Person.email.ilike(like, escape='\\'),
            m.Person.birth_certificate.ilike(like, escape='\\'),
        ))
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    items = [person_output(db, x) for x in db.scalars(stmt.order_by(m.Person.name).offset((page - 1) * page_size).limit(page_size))]
    return {'items': items, 'total': total, 'page': page, 'page_size': page_size}

@router.post('/persons', status_code=201)
def create_person(data: s.PersonInput, db: DB, user: Actor, school: Scope, request: Request):
    require(user, 'people.write')
    values = data.model_dump(exclude={'person_types'})
    requested = set(data.person_types or [])
    if data.is_guardian:
        requested.add('guardian')
    values['is_guardian'] = bool(requested & RESPONSIBLE_PERSON_TYPES)
    obj = m.Person(school_id=school.id, **values)
    db.add(obj)
    db.flush()
    sync_person_types(db, obj, requested)
    db.flush()
    audit(db, request, user, 'person.created', obj, school.id)
    return person_output(db, obj)

@router.patch('/persons/{person_id}')
def update_person(person_id: str, data: s.Edit, db: DB, user: Actor, school: Scope, request: Request):
    require(user, 'people.write')
    lock_school(db, school.id)
    obj = scoped(db, m.Person, person_id, school.id)
    check_version(obj, data.version)
    values = validate(s.PersonInput, data.data).model_dump()
    requested_types = values.pop('person_types', None)
    legacy_guardian = values.pop('is_guardian', None)
    if not values['birth_date'] and db.scalar(select(m.Student.id).where(
        m.Student.person_id == obj.id,
    ).limit(1)):
        fail(422, 'A data de nascimento do aluno não pode ser removida.')

    if requested_types is not None or legacy_guardian is not None:
        desired = set(requested_types) if requested_types is not None else active_person_types(db, obj.id)
        if requested_types is None:
            if legacy_guardian:
                desired.add('guardian')
            else:
                desired -= RESPONSIBLE_PERSON_TYPES
        elif legacy_guardian:
            desired.add('guardian')
        active_guardian_link = db.scalar(select(m.GuardianLink.id).where(
            m.GuardianLink.person_id == obj.id,
            m.GuardianLink.active.is_(True),
        ).limit(1))
        if active_guardian_link and not desired.intersection(RESPONSIBLE_PERSON_TYPES):
            fail(409, 'A pessoa possui vínculos ativos como responsável.')
        sync_person_types(db, obj, desired)

    before = person_output(db, obj)
    for key, value in values.items():
        setattr(obj, key, value)
    obj.version += 1
    db.flush()
    audit(db, request, user, 'person.updated', obj, school.id, {
        'before': before,
        'after': person_output(db, obj),
    })
    return person_output(db, obj)

@router.post('/persons/{person_id}/photo')
def upload_photo(person_id: str, db: DB, user: Actor, school: Scope, request: Request, file: UploadFile = File(...)):
    require(user, 'people.write')
    person = scoped(db, m.Person, person_id, school.id)
    maximum = settings().max_photo_mb * 1024 * 1024
    data = file.file.read(maximum + 1)
    if len(data) > maximum:
        fail(413, 'A foto está acima do limite configurado.')
    mime = validate_upload(data, file.filename or '')
    if mime not in ('image/png', 'image/jpeg'):
        fail(422, 'A foto deve ser PNG ou JPEG.')
    stored = write_file(db, school.id, user.id, file.filename or 'foto.jpg', mime, data, file_kind='photo')
    previous = person.photo_file_id
    person.photo_file_id = stored.id
    person.version += 1
    db.flush()
    audit(db, request, user, 'person.photo_uploaded', person, school.id, {'file_id': stored.id, 'replaced_file_id': previous})
    return person_output(db, person)


@router.delete('/persons/{person_id}/photo')
def remove_photo(person_id: str, db: DB, user: Actor, school: Scope, request: Request):
    require(user, 'people.write')
    person = scoped(db, m.Person, person_id, school.id)
    previous = person.photo_file_id
    if not previous:
        return person_output(db, person)
    person.photo_file_id = None
    person.version += 1
    db.flush()
    audit(db, request, user, 'person.photo_removed', person, school.id, {'file_id': previous})
    return person_output(db, person)


@router.get('/teachers')
def list_teachers(
    db: DB,
    user: Actor,
    school: Scope,
    q: str = Query(default='', max_length=160),
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
):
    return _profile_list(
        db, school, m.TeacherProfile, teacher_output, q, page, page_size,
        [m.Person.name, m.Person.social_name, m.Person.cpf, m.Person.phone,
         m.Person.email, m.TeacherProfile.registration_number,
         m.TeacherProfile.professional_registration],
    )


@router.post('/teachers', status_code=201)
def create_teacher(data: s.TeacherInput, db: DB, user: Actor, school: Scope, request: Request):
    require(user, 'people.write')
    lock_school(db, school.id)
    person = _person_for_profile(db, school, data.person_id, data.person, 'teacher')
    if db.scalar(select(m.TeacherProfile.id).where(m.TeacherProfile.person_id == person.id).limit(1)):
        fail(409, 'A pessoa já possui cadastro de Professor nesta escola.')
    values = data.model_dump(exclude={'person', 'person_id'})
    obj = m.TeacherProfile(school_id=school.id, person_id=person.id, **values)
    db.add(obj)
    db.flush()
    audit(db, request, user, 'teacher.created', obj, school.id, {'person_id': person.id})
    return teacher_output(db, obj)


@router.patch('/teachers/{teacher_id}')
def update_teacher(teacher_id: str, data: s.Edit, db: DB, user: Actor, school: Scope, request: Request):
    require(user, 'people.write')
    lock_school(db, school.id)
    obj = scoped(db, m.TeacherProfile, teacher_id, school.id)
    check_version(obj, data.version)
    values = validate(s.TeacherData, data.data).model_dump()
    before = teacher_output(db, obj)
    for key, value in values.items():
        setattr(obj, key, value)
    obj.version += 1
    db.flush()
    audit(db, request, user, 'teacher.updated', obj, school.id, {'before': before, 'after': teacher_output(db, obj)})
    return teacher_output(db, obj)


@router.get('/employees')
def list_employees(
    db: DB,
    user: Actor,
    school: Scope,
    q: str = Query(default='', max_length=160),
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
):
    return _profile_list(
        db, school, m.EmployeeProfile, employee_output, q, page, page_size,
        [m.Person.name, m.Person.social_name, m.Person.cpf, m.Person.phone,
         m.Person.email, m.EmployeeProfile.employee_number,
         m.EmployeeProfile.department, m.EmployeeProfile.job_title],
    )


@router.post('/employees', status_code=201)
def create_employee(data: s.EmployeeInput, db: DB, user: Actor, school: Scope, request: Request):
    require(user, 'people.write')
    lock_school(db, school.id)
    person = _person_for_profile(db, school, data.person_id, data.person, 'employee')
    if db.scalar(select(m.EmployeeProfile.id).where(m.EmployeeProfile.person_id == person.id).limit(1)):
        fail(409, 'A pessoa já possui cadastro de Funcionário nesta escola.')
    values = data.model_dump(exclude={'person', 'person_id'})
    obj = m.EmployeeProfile(school_id=school.id, person_id=person.id, **values)
    db.add(obj)
    db.flush()
    audit(db, request, user, 'employee.created', obj, school.id, {'person_id': person.id})
    return employee_output(db, obj)


@router.patch('/employees/{employee_id}')
def update_employee(employee_id: str, data: s.Edit, db: DB, user: Actor, school: Scope, request: Request):
    require(user, 'people.write')
    lock_school(db, school.id)
    obj = scoped(db, m.EmployeeProfile, employee_id, school.id)
    check_version(obj, data.version)
    values = validate(s.EmployeeData, data.data).model_dump()
    before = employee_output(db, obj)
    for key, value in values.items():
        setattr(obj, key, value)
    obj.version += 1
    db.flush()
    audit(db, request, user, 'employee.updated', obj, school.id, {'before': before, 'after': employee_output(db, obj)})
    return employee_output(db, obj)


@router.get('/students')
def list_students(db: DB, user: Actor, school: Scope, q: str = Query(default='', max_length=160), page: int = Query(1, ge=1), page_size: int = Query(30, ge=1, le=100), status: str = ''):
    stmt = select(m.Student).join(m.Person, m.Student.person_id == m.Person.id).where(m.Student.school_id == school.id)
    if q:
        like = '%' + q.replace('%', r'\%').replace('_', r'\_') + '%'
        guardian_matches = select(m.GuardianLink.student_id).join(m.Person, m.Person.id == m.GuardianLink.person_id).where(m.GuardianLink.school_id == school.id, m.GuardianLink.active.is_(True), or_(m.Person.name.ilike(like, escape='\\'), m.Person.cpf.ilike(like, escape='\\'), m.Person.phone.ilike(like, escape='\\')))
        enrollment_matches = select(m.Enrollment.student_id).where(m.Enrollment.school_id == school.id, m.Enrollment.number.ilike(like, escape='\\'))
        stmt = stmt.where(or_(m.Person.name.ilike(like, escape='\\'), m.Person.cpf.ilike(like, escape='\\'), m.Student.number.ilike(like, escape='\\'), m.Person.phone.ilike(like, escape='\\'), m.Student.id.in_(guardian_matches.correlate(None)), m.Student.id.in_(enrollment_matches.correlate(None))))
    if status:
        stmt = stmt.where(m.Student.status == status)
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    items = [student_output(db, x) for x in db.scalars(stmt.order_by(m.Person.name).offset((page-1)*page_size).limit(page_size))]
    return {'items': items, 'total': total, 'page': page, 'page_size': page_size}

@router.post('/students', status_code=201)
def create_student(data: s.StudentInput, db: DB, user: Actor, school: Scope, request: Request):
    require(user, 'people.write'); lock_school(db, school.id)
    if data.person_id:
        person = scoped(db, m.Person, data.person_id, school.id)
    else:
        person_values = data.person.model_dump(exclude={'person_types'})
        person_values['is_guardian'] = bool(person_values.get('is_guardian'))
        person = m.Person(school_id=school.id, **person_values)
        db.add(person)
        db.flush()
    ensure_person_type(db, person, 'student')
    if not person.birth_date:
        fail(422, 'Informe a data de nascimento do aluno.')
    student_values = data.model_dump(exclude={'person', 'person_id'})
    obj = m.Student(school_id=school.id, person_id=person.id, number=number(db, school.id, 'student', 'AL-'), **student_values)
    db.add(obj); db.flush(); audit(db, request, user, 'student.created', obj, school.id)
    return student_output(db, obj)

@router.patch('/students/{student_id}')
def update_student(student_id: str, data: s.Edit, db: DB, user: Actor, school: Scope, request: Request):
    require(user, 'people.write')
    lock_school(db, school.id)
    obj = scoped(db, m.Student, student_id, school.id)
    check_version(obj, data.version)
    values = validate(s.StudentData, data.data).model_dump()
    before = output(obj)
    for key, value in values.items():
        setattr(obj, key, value)
    obj.version += 1
    db.flush()
    audit(db, request, user, 'student.updated', obj, school.id, {'before': before, 'after': output(obj)})
    return student_output(db, obj)


@router.get('/students/{student_id}')
def student(student_id: str, db: DB, user: Actor, school: Scope):
    obj = scoped(db, m.Student, student_id, school.id)
    guardians = []
    for link in db.scalars(select(m.GuardianLink).where(m.GuardianLink.student_id == obj.id, m.GuardianLink.school_id == school.id).order_by(m.GuardianLink.created_at)):
        guardians.append({**output(link), 'person': person_output(db, db.get(m.Person, link.person_id))})
    enrollments = [output(e) for e in db.scalars(select(m.Enrollment).where(m.Enrollment.student_id == obj.id).order_by(m.Enrollment.created_at.desc()))]
    return {**student_output(db, obj), 'guardians': guardians, 'enrollments': enrollments}

@router.post('/students/{student_id}/guardians', status_code=201)
def add_guardian(student_id: str, data: s.GuardianInput, db: DB, user: Actor, school: Scope, request: Request):
    require(user, 'people.write'); lock_school(db, school.id)
    obj = scoped(db, m.Student, student_id, school.id)
    person = scoped(db, m.Person, data.person_id, school.id)
    if obj.person_id == person.id:
        fail(422, 'O aluno não pode ser vinculado como seu próprio responsável.')
    ensure_person_type(db, person, 'guardian')
    link = m.GuardianLink(school_id=school.id, student_id=obj.id, **data.model_dump())
    db.add(link); db.flush(); audit(db, request, user, 'guardian.linked', link, school.id)
    return {**output(link), 'person': person_output(db, person)}

@router.patch('/students/{student_id}/guardians/{link_id}')
def edit_guardian(student_id: str, link_id: str, data: s.Edit, db: DB, user: Actor, school: Scope, request: Request):
    require(user, 'people.write'); lock_school(db, school.id)
    obj = scoped(db, m.GuardianLink, link_id, school.id)
    if obj.student_id != student_id:
        fail(404, 'Vínculo não encontrado.')
    check_version(obj, data.version)
    values = validate(s.GuardianInput, data.data).model_dump()
    if values['person_id'] != obj.person_id:
        fail(422, 'Para trocar a pessoa, cadastre outro vínculo.')
    for key, value in values.items():
        setattr(obj, key, value)
    obj.version += 1; audit(db, request, user, 'guardian.updated', obj, school.id)
    db.flush(); return output(obj)

@router.post('/students/{student_id}/archive')
def archive_student(student_id: str, data: s.Edit, db: DB, user: Actor, school: Scope, request: Request):
    require(user, 'people.write'); lock_school(db, school.id)
    obj = scoped(db, m.Student, student_id, school.id); check_version(obj, data.version)
    if db.scalar(select(m.Enrollment.id).where(m.Enrollment.student_id == obj.id, m.Enrollment.status.in_(['draft','active','suspended'])).limit(1)):
        fail(409, 'Conclua ou cancele as matrículas em aberto antes de arquivar.')
    reason = str(data.data.get('reason', '')).strip()
    if len(reason) < 3 or len(reason) > 1000:
        fail(422, 'Informe uma justificativa de 3 a 1000 caracteres.')
    obj.status = 'archived'; obj.version += 1
    audit(db, request, user, 'student.archived', obj, school.id, {'reason': reason})
    return student_output(db, obj)

@router.get('/students/{student_id}/history')
def student_history(student_id: str, db: DB, user: Actor, school: Scope):
    obj = scoped(db, m.Student, student_id, school.id)
    stmt = select(m.EnrollmentEvent).join(m.Enrollment, m.Enrollment.id == m.EnrollmentEvent.enrollment_id).where(m.Enrollment.student_id == obj.id, m.EnrollmentEvent.school_id == school.id).order_by(m.EnrollmentEvent.created_at.desc())
    return [output(x) for x in db.scalars(stmt)]
