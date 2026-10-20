"""Sugestões independentes por identidade. Buscar nunca concilia automaticamente."""
import re
from fastapi import APIRouter, Query, Request
from sqlalchemy import func, or_, select
from . import models as m
from .common import audit
from .security import Actor, DB, Scope, require, scoped
from .lifecycle_models import filter_archived
from .text_normalization import normalized_name as normalized

router = APIRouter(prefix='/api/v1/schools/{school_id}/admissions', tags=['Conciliação da inscrição'])


def name_column(db):
    if db.bind.dialect.name == 'sqlite':
        # Uma função registrada por conexão evita dezenas de REPLACE aninhados,
        # que excedem a pilha do parser em SQLite 3.45 usado nos E2E do CI.
        return func.pige_name_key(m.Person.name)
    source, target = '', ''
    for chars, replacement in [('áàâãäÁÀÂÃÄ', 'a'), ('éèêëÉÈÊË', 'e'), ('íìîïÍÌÎÏ', 'i'),
                               ('óòôõöÓÒÔÕÖ', 'o'), ('úùûüÚÙÛÜ', 'u'), ('çÇ', 'c')]:
        source += chars; target += replacement * len(chars)
    # PostgreSQL nativo, sem instalar unaccent nem mudar os dados originais.
    return func.regexp_replace(func.trim(func.translate(func.lower(m.Person.name), source, target)), r'\s+', ' ', 'g')


def cpf_column():
    column = m.Person.cpf
    for char in '.- /': column = func.replace(column, char, '')
    return column


def candidates(db, school_id, identity, query, student):
    cpf = re.sub(r'\D', '', str(identity.get('cpf') or ''))
    name = normalized(identity.get('name'))
    email = str(identity.get('email') or '').casefold().strip()
    stmt = select(m.Person, m.Student) .outerjoin(m.Student,
        (m.Student.person_id == m.Person.id) & (m.Student.school_id == school_id))
    stmt = filter_archived(stmt.where(m.Person.school_id == school_id, m.Person.active.is_(True),
        m.Person.entity_kind == 'individual'), m.Person, 'active')
    if student:
        stmt = filter_archived(stmt.where(m.Student.school_id == school_id,
            m.Student.status == 'active'), m.Student, 'active')
    terms = []
    if query.strip():
        q = normalized(query)
        digits = re.sub(r'\D', '', q)
        terms.append(name_column(db).contains(q, autoescape=True))
        if digits and len(digits) >= 3: terms.append(cpf_column().contains(digits, autoescape=True))
        terms.append(func.lower(m.Person.email).contains(q, autoescape=True))
        if student: terms.append(func.lower(m.Student.number).contains(q, autoescape=True))
    else:
        if len(cpf) == 11: terms.append(cpf_column() == cpf)
        if name: terms.append(name_column(db) == name)
        if email and not student: terms.append(func.lower(m.Person.email) == email)
    if not terms: return {'items': [], 'total': 0, 'truncated': False}
    stmt = stmt.where(or_(*terms))
    # DISTINCT evita duplicação caso um responsável também tenha perfil de aluno.
    if not student: stmt = select(m.Person).where(m.Person.id.in_(stmt.with_only_columns(m.Person.id)))
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    results = []
    for result in db.execute(stmt.order_by(m.Person.name, m.Person.id).limit(40)):
        person = result[0]; child = result[1] if student else None
        reasons, conflicts, score = [], [], 0
        if cpf and re.sub(r'\D', '', person.cpf or '') == cpf:
            reasons.append('CPF coincidente'); score += 100
        elif cpf and person.cpf: conflicts.append('CPF divergente')
        if name and normalized(person.name) == name:
            reasons.append('Nome coincidente'); score += 40
        elif name: conflicts.append('Nome divergente; confira o documento')
        birth = identity.get('birth_date')
        if birth and person.birth_date:
            if str(person.birth_date) == str(birth): reasons.append('Nascimento coincidente'); score += 40
            else: conflicts.append('Nascimento divergente')
        if email and person.email.casefold() == email:
            reasons.append('E-mail coincidente'); score += 20
        identity_output = {'id': person.id, 'name': person.name, 'cpf': person.cpf,
            'birth_date': person.birth_date, 'email': person.email}
        results.append({**({'id': child.id, 'number': child.number, 'person': identity_output} if student else identity_output),
            'reasons': reasons, 'conflicts': conflicts, 'score': score})
    results.sort(key=lambda item: (-item['score'], item['id']))
    return {'items': results, 'total': total, 'truncated': total > len(results)}


@router.get('/{id}/matches')
def matches(id: str, db: DB, user: Actor, school: Scope, request: Request,
            student_q: str = Query('', max_length=160), guardian_q: str = Query('', max_length=160)):
    require(user, 'admissions.read'); require(user, 'students.read'); require(user, 'people.read')
    admission = scoped(db, m.Admission, id, school.id)
    guardian = admission.guardian_snapshot or {}
    warnings = []
    if admission.student_data.get('cpf') and admission.student_data.get('cpf') == guardian.get('cpf'):
        warnings.append('Aluno e responsável informaram o mesmo CPF. Confira a inscrição antes de conciliar.')
    audit(db, request, user, 'admission.matches_viewed', admission, school.id)
    return {'students': candidates(db, school.id, admission.student_data, student_q, True),
        'guardians': candidates(db, school.id, guardian, guardian_q, False), 'warnings': warnings,
        'notice': 'Sugestões não confirmam identidade. Confira documentos, homônimos e vínculos antes de selecionar.'}
