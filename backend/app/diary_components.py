"""Ciclo de uso de componentes, separado de instrumentos e regras de avaliação."""
from datetime import date
from typing import Literal

from fastapi import APIRouter, Request
from pydantic import Field
from sqlalchemy import select

from . import models as m
from .common import audit, output
from .lifecycle_models import RecordArchive, archive_record
from .record_lifecycle import reference_counts
from .schemas import Input
from .security import Actor, DB, Scope, check_version, fail, lock_school, require, scoped

router = APIRouter(prefix='/api/v1/schools/{school_id}/diary-catalog', tags=['Catálogo do Diário'])


class Suggestion(Input):
    name: str = Field(min_length=2, max_length=120)
    code: str = Field(default='', max_length=40)
    workload_hours: int = Field(default=0, ge=0, le=10000)


class Decision(Input):
    action: Literal['publish', 'retire', 'discard']
    version: int = Field(ge=1)
    reason: str = Field(min_length=3, max_length=1000)


def authorize(user, school):
    require(user, 'diary.configure')
    if not school.diary_catalog:
        fail(404, 'Catálogo piloto desativado nesta escola.')


DRAFT_ENTITY = 'curriculum_component_drafts'


def drafts_for(school_id):
    return select(RecordArchive.entity_id).where(RecordArchive.school_id == school_id,
                                                RecordArchive.entity_type == DRAFT_ENTITY)


def lifecycle(db, component):
    archive = archive_record(db, component)
    if archive:
        return 'retired', archive
    draft = db.scalar(select(RecordArchive).where(RecordArchive.school_id == component.school_id,
        RecordArchive.entity_type == DRAFT_ENTITY, RecordArchive.entity_id == component.id))
    return ('draft', draft) if draft else ('available', None)


def available_on(db, component, on_date: date | None = None):
    lock_school(db, component.school_id)
    status, archive = lifecycle(db, component)
    if status == 'draft' or (archive and (on_date is None or on_date >= archive.created_at.date())):
        fail(409, 'O componente está fora de vigência para este lançamento.')
    return component


@router.get('/suggestions')
def suggestions(db: DB, user: Actor, school: Scope):
    authorize(user, school)
    rows = db.scalars(select(m.CurriculumComponent).where(m.CurriculumComponent.school_id == school.id,
        m.CurriculumComponent.id.in_(drafts_for(school.id))).order_by(m.CurriculumComponent.name))
    return [output(row) for row in rows]


@router.post('/suggestions', status_code=201)
def suggest(data: Suggestion, db: DB, user: Actor, school: Scope, request: Request):
    authorize(user, school)
    lock_school(db, school.id)
    if db.scalar(select(m.CurriculumComponent.id).where(
            m.CurriculumComponent.school_id == school.id, m.CurriculumComponent.name == data.name)):
        fail(409, 'Já existe componente com este nome na escola.')
    obj = m.CurriculumComponent(school_id=school.id, active=False, **data.model_dump())
    db.add(obj)
    db.flush()
    db.add(RecordArchive(school_id=school.id, entity_type=DRAFT_ENTITY, entity_id=obj.id,
                         archived_by=user.id, reason='Sugestão curricular em rascunho.', previous_values={}))
    audit(db, request, user, 'diary.component.suggested', obj, school.id, {'after': output(obj)})
    return {**output(obj), 'catalog_status': 'draft'}


@router.get('/{component_id}/impact')
def impact(component_id: str, db: DB, user: Actor, school: Scope):
    authorize(user, school)
    obj = scoped(db, m.CurriculumComponent, component_id, school.id)
    status, archive = lifecycle(db, obj)
    refs, _ = reference_counts(db, obj)
    return {'id': obj.id, 'version': obj.version, 'catalog_status': status, 'references': refs,
            'discard_allowed': status == 'draft' and not refs,
            'effective_on': archive.created_at.date() if status == 'retired' else None}


@router.post('/{component_id}/decisions')
def decide(component_id: str, data: Decision, db: DB, user: Actor, school: Scope, request: Request):
    authorize(user, school)
    lock_school(db, school.id)
    obj = scoped(db, m.CurriculumComponent, component_id, school.id)
    check_version(obj, data.version)
    status, archive = lifecycle(db, obj)
    before = output(obj)
    if data.action == 'retire':
        if status != 'available':
            fail(409, 'Somente um componente disponível pode ser desativado.')
        archive = RecordArchive(school_id=school.id, entity_type=obj.__tablename__, entity_id=obj.id,
                                archived_by=user.id, reason=data.reason, previous_values={'active': obj.active})
        db.add(archive)
        obj.active = False
    elif status != 'draft':
        fail(409, 'Apenas uma sugestão em rascunho admite esta decisão.')
    elif data.action == 'publish':
        db.delete(archive)
        obj.active = True
    else:
        refs, _ = reference_counts(db, obj)
        if refs:
            fail(409, 'O rascunho recebeu vínculos. Preserve o componente.')
        db.delete(archive)
        db.delete(obj)
    obj.version += 1
    db.flush()
    after = None if data.action == 'discard' else output(obj)
    audit(db, request, user, 'diary.component.' + data.action, obj, school.id,
          {'reason': data.reason, 'before': before, 'after': after})
    return {'id': obj.id, 'component': after, 'effective_on': archive.created_at.date() if data.action == 'retire' else None}
