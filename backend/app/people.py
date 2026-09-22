from fastapi import APIRouter, File, Query, Request, UploadFile
from sqlalchemy import func, or_, select
from . import models as m, schemas as s
from .common import audit, number, output
from .security import Actor, DB, Scope, check_version, fail, lock_school, require, scoped
from .registry import validate
from .config import settings
from .documents import validate_upload, write_file
from .security import ROLE_LABELS

router = APIRouter(prefix='/api/v1/schools/{school_id}', tags=['Pessoas, alunos e responsáveis'])

def person_output(db, obj):
    role_keys = set()
    if db.scalar(select(m.Student.id).where(m.Student.person_id == obj.id).limit(1)):
        role_keys.add('student')
    if db.scalar(select(m.GuardianLink.id).where(m.GuardianLink.person_id == obj.id, m.GuardianLink.active.is_(True)).limit(1)):
        role_keys.add('guardian')
    role_keys.update(db.scalars(select(m.User.role).where(m.User.person_id == obj.id, m.User.active.is_(True))).all())
    return {
        **output(obj),
        'role_keys': sorted(role_keys),
        'roles': [ROLE_LABELS.get(key, key) for key in sorted(role_keys)],
        'photo_file_id': obj.photo_file_id,
    }


def student_output(db, obj):
    return {**output(obj), 'person': person_output(db, db.get(m.Person, obj.person_id))}


@router.get('/persons')
def list_persons(db: DB, user: Actor, school: Scope, q: str = Query(default='', max_length=160), guardians_only: bool = False, page: int = Query(1, ge=1), page_size: int = Query(30, ge=1, le=100)):
    stmt = select(m.Person).where(m.Person.school_id == school.id)
    if guardians_only:
        stmt = stmt.where(m.Person.is_guardian.is_(True))
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
    obj = m.Person(school_id=school.id, **data.model_dump()); db.add(obj); db.flush()
    audit(db, request, user, 'person.created', obj, school.id)
    return person_output(db, obj)

@router.patch('/persons/{person_id}')
def update_person(person_id: str, data: s.Edit, db: DB, user: Actor, school: Scope, request: Request):
    require(user, 'people.write'); lock_school(db, school.id)
    obj = scoped(db, m.Person, person_id, school.id); check_version(obj, data.version)
    values = validate(s.PersonInput, data.data).model_dump()
    if not values['birth_date'] and db.scalar(select(m.Student.id).where(m.Student.person_id == obj.id).limit(1)):
        fail(422, 'A data de nascimento do aluno não pode ser removida.')
    if not values['is_guardian'] and obj.is_guardian and db.scalar(select(m.GuardianLink.id).where(m.GuardianLink.person_id == obj.id, m.GuardianLink.active.is_(True)).limit(1)):
        fail(409, 'A pessoa possui vínculos ativos como responsável.')
    before = person_output(db, obj)
    for key, value in values.items():
        setattr(obj, key, value)
    obj.version += 1
    audit(db, request, user, 'person.updated', obj, school.id, {'before': before, 'after': person_output(db, obj)})
    db.flush(); return person_output(db, obj)

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
        person = m.Person(school_id=school.id, **data.person.model_dump()); db.add(person); db.flush()
    if not person.birth_date:
        fail(422, 'Informe a data de nascimento do aluno.')
    obj = m.Student(school_id=school.id, person_id=person.id, number=number(db, school.id, 'student', 'AL-'), previous_school=data.previous_school)
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
    person.is_guardian = True
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
