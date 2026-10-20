"""Preparação transacional da estrutura; nunca rematricula nem copia diários."""
import hashlib
import json
from fastapi import APIRouter, Request
from pydantic import Field
from sqlalchemy import select
from . import models as m, schemas as s
from .common import audit
from .security import Actor, DB, Scope, fail, lock_school, require, scoped
from .lifecycle_models import filter_archived, require_available
from .registry import validate_refs

router = APIRouter(prefix='/api/v1/schools/{school_id}/academic-preparation', tags=['Preparação do ano letivo'])


class Preparation(s.Input):
    source_year_id: str = Field(min_length=1, max_length=36)
    target: s.YearInput


class Apply(Preparation):
    preview_hash: str = Field(pattern=r'^[0-9a-f]{64}$')


def plan(db, school, data):
    source = scoped(db, m.AcademicYear, data.source_year_id, school.id)
    require_available(db, source)
    if data.target.status != 'active':
        fail(422, 'O ano de destino deve estar aberto.')
    if source.name.casefold() == data.target.name.casefold():
        fail(422, 'Selecione um ano de destino diferente da origem.')
    years = list(db.scalars(select(m.AcademicYear).where(m.AcademicYear.school_id == school.id)))
    matches = [y for y in years if y.name.casefold() == data.target.name.casefold()]
    if len(matches) > 1:
        fail(409, 'Há anos de destino com nomes equivalentes. Regularize o cadastro antes de preparar.')
    target = matches[0] if matches else None
    if target:
        require_available(db, target)
        if target.status != 'active' or target.starts_on != data.target.starts_on or target.ends_on != data.target.ends_on:
            fail(409, 'O ano de destino já existe com situação ou datas diferentes. Confira o cadastro manual.')
    groups = list(db.scalars(filter_archived(select(m.ClassGroup).where(
        m.ClassGroup.school_id == school.id, m.ClassGroup.academic_year_id == source.id),
        m.ClassGroup, 'active').order_by(m.ClassGroup.unit_id, m.ClassGroup.name).limit(2001)))
    if not groups:
        fail(422, 'O ano de origem não possui turmas disponíveis para copiar.')
    if len(groups) > 2000:
        fail(422, 'A preparação aceita até 2.000 turmas por ano.')
    existing = list(db.scalars(select(m.ClassGroup).where(m.ClassGroup.school_id == school.id,
        m.ClassGroup.academic_year_id == target.id))) if target else []
    fields = ('name', 'unit_id', 'grade_id', 'shift_id', 'capacity', 'active')
    snapshot = {'source': [source.id, source.version], 'target': data.target.model_dump(mode='json'), 'groups': []}
    rows, conflicts = [], []
    for group in groups:
        values = {k: getattr(group, k) for k in fields}
        refs = []
        names = {}
        for field, model in (('unit_id', m.Unit), ('grade_id', m.Grade), ('shift_id', m.Shift)):
            ref = scoped(db, model, values[field], school.id)
            require_available(db, ref)
            if not ref.active:
                fail(409, f'A turma {group.name} utiliza um cadastro inativo. Regularize a estrutura antes de copiar.')
            refs.append([ref.id, ref.version])
            names[field.removesuffix('_id')] = ref.name
        snapshot['groups'].append([group.id, group.version, values, refs])
        same = [g for g in existing if g.unit_id == group.unit_id and g.name.casefold() == group.name.casefold()]
        state = 'create'
        if same:
            if len(same) != 1 or any(getattr(same[0], k) != values[k] for k in fields):
                state = 'conflict'
            else:
                # Uma turma arquivada nunca é reativada implicitamente.
                from .lifecycle_models import archive_record
                state = 'conflict' if archive_record(db, same[0]) else 'reuse'
        row = {'source_id': group.id, **values, **names, 'action': state}
        rows.append(row)
        if state == 'conflict': conflicts.append(group.name)
    fingerprint = hashlib.sha256(json.dumps(snapshot, sort_keys=True, ensure_ascii=True).encode()).hexdigest()
    return source, target, rows, fingerprint, conflicts


@router.post('/preview')
def preview(data: Preparation, db: DB, user: Actor, school: Scope):
    require(user, 'academic.write')
    source, target, rows, fingerprint, conflicts = plan(db, school, data)
    return {'source_name': source.name, 'target_id': target.id if target else None,
        'target': data.target.model_dump(), 'rows': rows, 'preview_hash': fingerprint,
        'create_count': sum(r['action'] == 'create' for r in rows),
        'reuse_count': sum(r['action'] == 'reuse' for r in rows), 'conflicts': conflicts,
        'scope': 'Unidades, séries e turnos são reutilizados; copiam-se turmas e capacidades. Matrículas, alunos, professores, aulas, notas e documentos não são copiados.'}


@router.post('/apply')
def apply(data: Apply, db: DB, user: Actor, school: Scope, request: Request):
    require(user, 'academic.write'); lock_school(db, school.id)
    source, target, rows, fingerprint, conflicts = plan(db, school, data)
    if fingerprint != data.preview_hash:
        fail(409, 'A estrutura de origem mudou. Gere uma nova prévia antes de confirmar.')
    if conflicts:
        fail(409, 'Há turmas de destino divergentes. Nenhuma alteração foi aplicada; confira a prévia.')
    if not target:
        target = m.AcademicYear(school_id=school.id, **data.target.model_dump())
        db.add(target); db.flush()
    created = []
    for row in rows:
        if row['action'] != 'create': continue
        values = {k: row[k] for k in ('name', 'unit_id', 'grade_id', 'shift_id', 'capacity', 'active')}
        values['academic_year_id'] = target.id
        validate_refs(db, m.ClassGroup, values, school.id)
        group = m.ClassGroup(school_id=school.id, **values); db.add(group); db.flush()
        created.append(group.id)
    audit(db, request, user, 'academic_year.prepared', target, school.id,
        {'source_year_id': source.id, 'created_class_ids': created, 'reused': len(rows) - len(created), 'preview_hash': fingerprint})
    return {'academic_year_id': target.id, 'created': len(created), 'reused': len(rows) - len(created)}
