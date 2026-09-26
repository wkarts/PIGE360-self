"""Cadastros contextuais: identidade única, vínculo e dados específicos transacionais."""
from typing import Literal
from fastapi import APIRouter, Request
from pydantic import Field, model_validator
from sqlalchemy import select
from . import models as m, schemas as s
from .people import create_person, update_person, ensure_person_type, person_output
from .common import audit
from .security import Actor, DB, Scope, require, scoped, lock_school, check_version, fail

router = APIRouter(prefix='/api/v1/schools/{school_id}', tags=['Cadastros por vínculo'])
BusinessType = Literal['supplier', 'service_provider', 'customer', 'partner']


class BusinessDetails(s.Input):
    contact_name: str = Field(default='', max_length=180)
    category: str = Field(default='', max_length=120)
    reference: str = Field(default='', max_length=80)
    notes: str = Field(default='', max_length=4000)


class BusinessInput(s.Input):
    person: s.PersonInput | None = None
    person_id: str | None = None
    version: int | None = Field(default=None, ge=1)
    details: BusinessDetails = Field(default_factory=BusinessDetails)

    @model_validator(mode='after')
    def one_identity(self):
        if bool(self.person) == bool(self.person_id):
            raise ValueError('Informe uma pessoa existente ou uma nova identidade, nunca ambas.')
        if self.person_id and self.version is None:
            raise ValueError('Informe a versão da pessoa existente.')
        return self


class BusinessEdit(s.Input):
    version: int = Field(ge=1)
    person: dict = Field(default_factory=dict)
    details: BusinessDetails


def save_details(db, person, type_code, details):
    ensure_person_type(db, person, type_code)
    db.flush()
    link = db.scalar(select(m.PersonTypeLink).where(
        m.PersonTypeLink.school_id == person.school_id,
        m.PersonTypeLink.person_id == person.id,
        m.PersonTypeLink.type_code == type_code))
    link.details = details.model_dump()
    db.flush()


@router.post('/business-persons/{type_code}', status_code=201)
def create_business_person(type_code: BusinessType, data: BusinessInput, db: DB,
                           user: Actor, school: Scope, request: Request):
    require(user, 'people.write')
    lock_school(db, school.id)
    if data.person_id:
        person = scoped(db, m.Person, data.person_id, school.id)
        check_version(person, data.version)
        existing = db.scalar(select(m.PersonTypeLink.id).where(
            m.PersonTypeLink.person_id == person.id, m.PersonTypeLink.school_id == school.id,
            m.PersonTypeLink.type_code == type_code, m.PersonTypeLink.active.is_(True)))
        if existing:
            fail(409, 'A pessoa já possui este vínculo. Abra seu cadastro para editar.')
        person.version += 1
    else:
        payload = data.person.model_copy(update={
            'person_types': sorted(set(data.person.person_types or []) | {type_code})})
        result = create_person(payload, db, user, school, request)
        person = db.get(m.Person, result['id'])
    save_details(db, person, type_code, data.details)
    audit(db, request, user, 'person.business.created', person, school.id, {'type_code': type_code})
    return person_output(db, person)


@router.patch('/business-persons/{type_code}/{person_id}')
def edit_business_person(type_code: BusinessType, person_id: str, data: BusinessEdit,
                         db: DB, user: Actor, school: Scope, request: Request):
    require(user, 'people.write')
    lock_school(db, school.id)
    person = scoped(db, m.Person, person_id, school.id)
    check_version(person, data.version)
    link = db.scalar(select(m.PersonTypeLink.id).where(
        m.PersonTypeLink.person_id == person.id, m.PersonTypeLink.school_id == school.id,
        m.PersonTypeLink.type_code == type_code, m.PersonTypeLink.active.is_(True)))
    if not link:
        fail(404, 'Vínculo não encontrado nesta instituição.')
    # Somente dados comuns são editados aqui; outros vínculos são preservados.
    if 'person_types' in data.person or 'is_guardian' in data.person:
        fail(422, 'Gerencie os tipos pelo Cadastro Único; esta tela preserva os demais vínculos.')
    update_person(person_id, s.Edit(version=data.version, data=data.person), db, user, school, request)
    save_details(db, person, type_code, data.details)
    audit(db, request, user, 'person.business.updated', person, school.id, {'type_code': type_code})
    return person_output(db, person)


@router.post('/persons/{person_id}/responsible', status_code=200)
def add_responsible(person_id: str, data: s.Edit, db: DB, user: Actor, school: Scope, request: Request):
    require(user, 'people.write')
    lock_school(db, school.id)
    person = scoped(db, m.Person, person_id, school.id)
    check_version(person, data.version)
    if person.entity_kind != 'individual':
        fail(422, 'O responsável por aluno deve ser pessoa física.')
    ensure_person_type(db, person, 'guardian')
    person.version += 1
    db.flush()
    audit(db, request, user, 'person.responsible.added', person, school.id)
    return person_output(db, person)
