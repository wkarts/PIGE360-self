from datetime import date
from fastapi import APIRouter, Query, Request
from sqlalchemy import func, select, or_
from . import models as m, schemas as s
from .common import audit, number, output
from .security import Actor, DB, Scope, check_version, fail, lock_school, require, scoped
from .registry import occupancy

router = APIRouter(prefix='/api/v1/schools/{school_id}', tags=['Matrículas e movimentações'])

ALLOWED = {
    'draft': {'activate','cancel'},
    'active': {'change_class','suspend','transfer','cancel','complete'},
    'suspended': {'reactivate','change_class','transfer','cancel'},
    'cancelled': {'reactivate'},
    'transferred': set(),
    'completed': set(),
}

def enrollment_output(db, obj):
    student = db.get(m.Student, obj.student_id)
    person = db.get(m.Person, student.person_id)
    group = db.get(m.ClassGroup, obj.class_group_id)
    financial = db.get(m.Person, obj.financial_person_id) if obj.financial_person_id else None
    type_labels = {'new': 'Nova matrícula', 'renewal': 'Rematrícula', 'transfer_in': 'Transferência recebida', 'returning': 'Retorno'}
    return {**output(obj), 'student_name': person.name, 'student_number': student.number, 'class_name': group.name,
            'year_name': db.get(m.AcademicYear, obj.academic_year_id).name,
            'grade_name': db.get(m.Grade, group.grade_id).name, 'shift_name': db.get(m.Shift, group.shift_id).name,
            'financial_person_name': financial.name if financial else '',
            'enrollment_type_label': type_labels.get(obj.enrollment_type, obj.enrollment_type),
            'actions': sorted(ALLOWED[obj.status])}

def check_group(db, group, school_id):
    if not group.active:
        fail(409, 'A turma está inativa.')
    year = scoped(db, m.AcademicYear, group.academic_year_id, school_id)
    if year.status != 'active':
        fail(409, 'O período letivo está fechado para movimentações.')
    return year

def event(db, request, user, obj, action, reason, before):
    after = output(obj)
    db.add(m.EnrollmentEvent(school_id=obj.school_id, enrollment_id=obj.id, action=action, reason=reason, before=before, after=after, actor_id=user.id))
    audit(db, request, user, 'enrollment.' + action, obj, obj.school_id, {'reason': reason, 'before': before, 'after': after})

def create_record(data, school, db, user, request, previous=None):
    lock_school(db, school.id)
    student = scoped(db, m.Student, data.student_id, school.id)
    if student.status != 'active':
        fail(409, 'O cadastro do aluno está arquivado.')
    group = scoped(db, m.ClassGroup, data.class_group_id, school.id)
    year = check_group(db, group, school.id)
    if data.financial_person_id:
        person = scoped(db, m.Person, data.financial_person_id, school.id)
        if person.id != student.person_id and not db.scalar(select(m.GuardianLink.id).where(m.GuardianLink.student_id == student.id, m.GuardianLink.person_id == person.id, m.GuardianLink.financial.is_(True), m.GuardianLink.active.is_(True))):
            fail(422, 'Responsável financeiro sem vínculo financeiro ativo com o aluno.')
    obj = m.Enrollment(school_id=school.id, academic_year_id=year.id, number=number(db, school.id, 'enrollment', 'MAT-'),
                       activation_key=f'{school.id}:{student.id}:{year.id}', previous_enrollment_id=previous,
                       **data.model_dump())
    db.add(obj); db.flush(); event(db, request, user, obj, 'created' if not previous else 'reenrolled', 'Matrícula criada como rascunho.', {})
    return obj

@router.get('/enrollments')
def list_enrollments(db: DB, user: Actor, school: Scope, status: str = '', class_group_id: str = '', student_id: str = '', academic_year_id: str = '', q: str = Query('', max_length=160), page: int = Query(1, ge=1), page_size: int = Query(30, ge=1, le=100)):
    stmt = select(m.Enrollment).where(m.Enrollment.school_id == school.id)
    if status and status not in ALLOWED:
        fail(422, 'Situação de matrícula inválida.')
    if status: stmt = stmt.where(m.Enrollment.status == status)
    if academic_year_id:
        scoped(db, m.AcademicYear, academic_year_id, school.id)
        stmt = stmt.where(m.Enrollment.academic_year_id == academic_year_id)
    if q.strip():
        stmt = stmt.join(m.Student, m.Student.id == m.Enrollment.student_id).join(m.Person, m.Person.id == m.Student.person_id).where(or_(
            m.Person.name.icontains(q.strip(), autoescape=True),
            m.Enrollment.number.icontains(q.strip(), autoescape=True),
            m.Student.number.icontains(q.strip(), autoescape=True),
        ))
    if class_group_id: stmt = stmt.where(m.Enrollment.class_group_id == class_group_id)
    if student_id: stmt = stmt.where(m.Enrollment.student_id == student_id)
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    return {'items': [enrollment_output(db, x) for x in db.scalars(stmt.order_by(m.Enrollment.created_at.desc()).offset((page-1)*page_size).limit(page_size))], 'total': total, 'page': page, 'page_size': page_size}

@router.post('/enrollments', status_code=201)
def create_enrollment(data: s.EnrollmentInput, db: DB, user: Actor, school: Scope, request: Request):
    require(user, 'enrollments.write')
    return enrollment_output(db, create_record(data, school, db, user, request))

@router.get('/enrollments/{enrollment_id}')
def enrollment_detail(enrollment_id: str, db: DB, user: Actor, school: Scope):
    from .documents import checklist
    obj = scoped(db, m.Enrollment, enrollment_id, school.id)
    group = db.get(m.ClassGroup, obj.class_group_id)
    return {**enrollment_output(db, obj), 'checklist': checklist(db, school.id, obj.student_id, group.grade_id),
            'history': [output(e) for e in db.scalars(select(m.EnrollmentEvent).where(m.EnrollmentEvent.enrollment_id == obj.id).order_by(m.EnrollmentEvent.created_at.desc()))]}

def activation_validation(db, school, obj, group):
    # A regra vale também nas rotas administrativas antigas, não apenas no portal.
    from .admissions import payment_gate
    payment_gate(db, school.id, obj.id)
    from .documents import checklist
    if occupancy(db, group.id) >= group.capacity and obj.status not in ('active','suspended'):
        fail(409, 'Não há vagas disponíveis nesta turma.')
    student = db.get(m.Student, obj.student_id)
    if student.status != 'active': fail(409, 'O aluno está arquivado.')
    person = db.get(m.Person, student.person_id)
    today = date.today()
    age = today.year - person.birth_date.year - ((today.month, today.day) < (person.birth_date.month, person.birth_date.day))
    if age < 18 and not db.scalar(select(m.GuardianLink.id).where(m.GuardianLink.student_id == obj.student_id, m.GuardianLink.legal.is_(True), m.GuardianLink.active.is_(True)).limit(1)):
        fail(422, 'Vincule ao menos um responsável legal ativo antes de ativar a matrícula.')
    pending = [x for x in checklist(db, school.id, obj.student_id, group.grade_id) if x['required'] and not x['complete']]
    if school.document_policy == 'block' and pending:
        fail(409, 'Documentação obrigatória pendente: ' + ', '.join(x['name'] for x in pending))

@router.post('/enrollments/{enrollment_id}/movements')
def movement(enrollment_id: str, data: s.MovementInput, db: DB, user: Actor, school: Scope, request: Request):
    require(user, 'enrollments.write'); lock_school(db, school.id)
    obj = scoped(db, m.Enrollment, enrollment_id, school.id); check_version(obj, data.version)
    if data.action not in ALLOWED[obj.status]:
        fail(409, 'Movimentação não permitida para a situação atual.')
    group = scoped(db, m.ClassGroup, obj.class_group_id, school.id)
    check_group(db, group, school.id)
    before = output(obj)
    if data.action in ('activate','reactivate'):
        activation_validation(db, school, obj, group)
        obj.activation_key = f'{school.id}:{obj.student_id}:{obj.academic_year_id}'
        obj.status = 'active'
    elif data.action == 'change_class':
        if not data.class_group_id or data.class_group_id == group.id:
            fail(422, 'Selecione uma turma de destino diferente.')
        target = scoped(db, m.ClassGroup, data.class_group_id, school.id)
        check_group(db, target, school.id)
        if target.academic_year_id != obj.academic_year_id:
            fail(422, 'Para outro ano letivo, use rematrícula.')
        if target.grade_id != group.grade_id:
            fail(422, 'Mudança de série exige análise acadêmica; nesta versão, movimente entre turmas da mesma série.')
        if occupancy(db, target.id) >= target.capacity:
            fail(409, 'Não há vagas disponíveis na turma de destino.')
        obj.class_group_id = target.id
    else:
        obj.status = {'suspend':'suspended', 'transfer':'transferred', 'cancel':'cancelled', 'complete':'completed'}[data.action]
        if obj.status in ('cancelled','transferred'):
            obj.activation_key = None
    obj.version += 1; db.flush()
    event(db, request, user, obj, data.action, data.reason, before)
    return enrollment_output(db, obj)

@router.post('/enrollments/{enrollment_id}/reenroll', status_code=201)
def reenroll(enrollment_id: str, data: s.ReenrollmentInput, db: DB, user: Actor, school: Scope, request: Request):
    require(user, 'enrollments.write')
    obj = scoped(db, m.Enrollment, enrollment_id, school.id)
    target = scoped(db, m.ClassGroup, data.class_group_id, school.id)
    if target.academic_year_id == obj.academic_year_id:
        fail(422, 'A rematrícula deve criar vínculo em outro ano letivo.')
    old_year = db.get(m.AcademicYear, obj.academic_year_id)
    new_year = db.get(m.AcademicYear, target.academic_year_id)
    if new_year.starts_on <= old_year.starts_on:
        fail(422, 'Selecione um período posterior ao período de origem.')
    payload = s.EnrollmentInput(
        student_id=obj.student_id,
        class_group_id=target.id,
        enrolled_on=data.enrolled_on,
        notes=data.notes,
        financial_person_id=obj.financial_person_id,
        enrollment_type='renewal',
        origin_school='',
        origin_city='',
        entry_reason='Rematrícula',
        external_reference='',
    )
    return enrollment_output(db, create_record(payload, school, db, user, request, previous=obj.id))


@router.patch('/enrollments/{enrollment_id}')
def edit_draft(enrollment_id: str, data: s.DraftEnrollmentEdit, db: DB, user: Actor, school: Scope, request: Request):
    require(user, 'enrollments.write')
    lock_school(db, school.id)
    obj = scoped(db, m.Enrollment, enrollment_id, school.id)
    check_version(obj, data.version)
    if obj.status != 'draft':
        fail(409, 'Somente pré-matrículas em rascunho podem ser editadas; para vínculos ativos, use movimentações.')
    group = scoped(db, m.ClassGroup, data.class_group_id, school.id)
    check_group(db, group, school.id)
    if group.academic_year_id != obj.academic_year_id:
        fail(422, 'A edição preserva o ano letivo. Para outro período, cancele o rascunho e crie uma nova matrícula.')
    if scoped(db, m.Student, obj.student_id, school.id).status != 'active':
        fail(409, 'O aluno está arquivado.')
    before = output(obj)
    obj.class_group_id = group.id
    obj.enrolled_on = data.enrolled_on
    obj.notes = data.notes
    obj.version += 1
    db.flush()
    event(db, request, user, obj, 'draft_updated', data.reason, before)
    return enrollment_output(db, obj)
