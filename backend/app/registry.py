from datetime import date
from fastapi import APIRouter, Request
from sqlalchemy import func, select
from pydantic import ValidationError
from fastapi.exceptions import RequestValidationError
from . import models as m, schemas as s
from .common import audit, output
from .security import Actor, DB, Scope, check_version, fail, lock_school, require, scoped

router = APIRouter(prefix='/api/v1', tags=['Institucional e estrutura acadêmica'])

@router.get('/schools')
def schools(db: DB, user: Actor):
    stmt = select(m.School).where(m.School.active.is_(True))
    if user.role != 'admin':
        stmt = stmt.join(m.SchoolAccess, m.SchoolAccess.school_id == m.School.id).where(m.SchoolAccess.user_id == user.id)
    return [output(x) for x in db.scalars(stmt.order_by(m.School.name))]

@router.get('/companies')
def companies(db: DB, user: Actor):
    require(user, 'schools.manage')
    return [output(x) for x in db.scalars(select(m.Company).order_by(m.Company.name))]

@router.post('/companies', status_code=201)
def add_company(data: s.CompanyInput, db: DB, user: Actor, request: Request):
    require(user, 'schools.manage')
    obj = m.Company(**data.model_dump()); db.add(obj); db.flush()
    audit(db, request, user, 'company.created', obj)
    return output(obj)

@router.post('/schools', status_code=201)
def add_school(data: s.SchoolInput, db: DB, user: Actor, request: Request):
    require(user, 'schools.manage')
    if not db.get(m.Company, data.company_id):
        fail(422, 'Empresa inválida.')
    obj = m.School(**data.model_dump()); db.add(obj); db.flush()
    audit(db, request, user, 'school.created', obj, obj.id)
    return output(obj)

@router.patch('/schools/{school_id}')
def edit_school(data: s.Edit, db: DB, user: Actor, school: Scope, request: Request):
    require(user, 'schools.manage'); lock_school(db, school.id); check_version(school, data.version)
    payload = validate(s.SchoolInput, data.data)
    if payload.company_id != school.company_id:
        fail(422, 'A empresa da escola não pode ser trocada nesta versão.')
    before = output(school)
    for key, value in payload.model_dump().items():
        setattr(school, key, value)
    school.version += 1
    audit(db, request, user, 'school.updated', school, school.id, {'before': before, 'after': output(school)})
    db.flush(); return output(school)

def validate(schema, payload):
    try:
        return schema.model_validate(payload)
    except ValidationError as exc:
        raise RequestValidationError(exc.errors()) from exc

def occupancy(db, class_id):
    return db.scalar(select(func.count()).select_from(m.Enrollment).where(m.Enrollment.class_group_id == class_id, m.Enrollment.status.in_(['active','suspended']))) or 0

def catalog_output(db, obj):
    data = output(obj)
    if isinstance(obj, m.ClassGroup):
        data['occupied'] = occupancy(db, obj.id)
        data['available'] = max(0, obj.capacity - data['occupied'])
    return data

def validate_refs(db, model, data, school_id, existing=None):
    if model is m.ClassGroup:
        for field, ref in [('unit_id', m.Unit), ('academic_year_id', m.AcademicYear), ('grade_id', m.Grade), ('shift_id', m.Shift)]:
            target = scoped(db, ref, data[field], school_id)
            if hasattr(target, 'active') and not target.active:
                fail(422, 'Não é permitido utilizar cadastro acadêmico inativo.')
        year = scoped(db, m.AcademicYear, data['academic_year_id'], school_id)
        if year.status != 'active':
            fail(409, 'O ano letivo está fechado.')
        if existing:
            count = db.scalar(select(func.count()).select_from(m.Enrollment).where(m.Enrollment.class_group_id == existing.id))
            if count and any(data[k] != getattr(existing, k) for k in ['academic_year_id','grade_id','unit_id','shift_id']):
                fail(409, 'Turma com matrículas não pode mudar ano, série, unidade ou turno. Cadastre outra turma e movimente as matrículas.')
            if data['capacity'] < occupancy(db, existing.id):
                fail(409, 'A capacidade não pode ficar abaixo das vagas ocupadas.')
    if model is m.DocumentType and data.get('grade_id'):
        scoped(db, m.Grade, data['grade_id'], school_id)

CATALOGS = {
    'units': (m.Unit, s.UnitInput),
    'academic-years': (m.AcademicYear, s.YearInput),
    'grades': (m.Grade, s.GradeInput),
    'shifts': (m.Shift, s.ShiftInput),
    'class-groups': (m.ClassGroup, s.ClassInput),
    'document-types': (m.DocumentType, s.DocumentTypeInput),
}

def register_catalog(resource, model, schema):
    permission = 'documents.write' if model is m.DocumentType else 'academic.write'
    def listing(db: DB, user: Actor, school: Scope):
        return [catalog_output(db, x) for x in db.scalars(select(model).where(model.school_id == school.id).order_by(model.name))]
    def create(data, db: DB, user: Actor, school: Scope, request: Request):
        require(user, permission); lock_school(db, school.id)
        values = data.model_dump(); validate_refs(db, model, values, school.id)
        obj = model(school_id=school.id, **values); db.add(obj); db.flush()
        audit(db, request, user, resource + '.created', obj, school.id)
        return catalog_output(db, obj)
    create.__annotations__['data'] = schema
    def update(record_id: str, data: s.Edit, db: DB, user: Actor, school: Scope, request: Request):
        require(user, permission); lock_school(db, school.id)
        obj = scoped(db, model, record_id, school.id); check_version(obj, data.version)
        values = validate(schema, data.data).model_dump(); validate_refs(db, model, values, school.id, obj)
        before = output(obj)
        for key, value in values.items():
            setattr(obj, key, value)
        obj.version += 1
        audit(db, request, user, resource + '.updated', obj, school.id, {'before': before, 'after': output(obj)})
        db.flush(); return catalog_output(db, obj)
    base = '/schools/{school_id}/' + resource
    router.add_api_route(base, listing, methods=['GET'], name='list_' + resource)
    router.add_api_route(base, create, methods=['POST'], status_code=201, name='create_' + resource)
    router.add_api_route(base + '/{record_id}', update, methods=['PATCH'], name='update_' + resource)

for key, (model, schema) in CATALOGS.items():
    register_catalog(key, model, schema)
