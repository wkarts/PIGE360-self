"""Prévia interna de treinamento e guarda de evidências do operador."""
from datetime import date
from hashlib import sha256
import json
from typing import Literal

from fastapi import APIRouter, Request, UploadFile
from pydantic import Field, model_validator
from sqlalchemy import Date, ForeignKey, JSON, String, UniqueConstraint, select
from sqlalchemy.orm import Mapped, mapped_column

from . import models as m
from .common import audit, output
from .config import settings
from .db import Base, Record
from .documents import write_file
from .schemas import Input
from .security import Actor, DB, Scope, fail, lock_school, require, scoped

router = APIRouter(prefix='/api/v1/schools/{school_id}/educacenso', tags=['Educacenso'])
SOURCES = {
    'matricula_inicial': 'https://www.gov.br/inep/pt-br/areas-de-atuacao/pesquisas-estatisticas-e-indicadores/censo-escolar/orientacoes/matricula-inicial/migracao',
    'situacao_aluno': 'https://www.gov.br/inep/pt-br/areas-de-atuacao/pesquisas-estatisticas-e-indicadores/censo-escolar/orientacoes/situacao-do-aluno',
}


class Draft(Record, m.Scoped, Base):
    __tablename__ = 'educacenso_drafts'
    year_id: Mapped[str] = mapped_column(ForeignKey('academic_years.id'))
    stage: Mapped[str] = mapped_column(String(24))
    reference_date: Mapped[date] = mapped_column(Date)
    digest: Mapped[str] = mapped_column(String(64))
    snapshot: Mapped[dict] = mapped_column(JSON)
    author_id: Mapped[str] = mapped_column(ForeignKey('users.id'))
    __table_args__ = (UniqueConstraint('school_id', 'digest', name='uq_censo_draft_digest'),)


class Evidence(Record, m.Scoped, Base):
    __tablename__ = 'educacenso_evidence'
    draft_id: Mapped[str] = mapped_column(ForeignKey('educacenso_drafts.id'))
    file_id: Mapped[str] = mapped_column(ForeignKey('files.id'))
    digest: Mapped[str] = mapped_column(String(64))
    author_id: Mapped[str] = mapped_column(ForeignKey('users.id'))
    __table_args__ = (UniqueConstraint('draft_id', 'digest', name='uq_censo_evidence_digest'),)


class Selection(Input):
    year_id: str
    stage: Literal['matricula_inicial', 'situacao_aluno']
    reference_date: date
    environment: Literal['treinamento']
    # None = todos os grupos. Lista vazia não pode virar seleção total.
    class_group_ids: list[str] | None = Field(default=None, min_length=1, max_length=500)

    @model_validator(mode='after')
    def distinct_groups(self):
        if self.class_group_ids and len(set(self.class_group_ids)) != len(self.class_group_ids):
            raise ValueError('A seleção contém turmas repetidas.')
        return self


def authorize(user, school):
    require(user, 'educacenso.manage')
    if not school.educacenso_training:
        fail(404, 'Treinamento do Educacenso desativado para esta escola.')


def preview(data, db, school):
    year = scoped(db, m.AcademicYear, data.year_id, school.id)
    if not year.starts_on <= data.reference_date <= year.ends_on:
        fail(422, 'A data de referência deve pertencer ao ano letivo escolhido.')
    groups = set(db.scalars(select(m.ClassGroup.id).where(
        m.ClassGroup.school_id == school.id, m.ClassGroup.academic_year_id == year.id)))
    selected = groups if data.class_group_ids is None else set(data.class_group_ids)
    if not selected <= groups:
        fail(422, 'Turma fora do escopo da escola e do ano.')
    # A turma atual não é um filtro válido antes de reconstruir as movimentações.
    query = select(m.Enrollment).where(m.Enrollment.school_id == school.id,
        m.Enrollment.academic_year_id == year.id, m.Enrollment.enrolled_on <= data.reference_date)
    enrollments = db.scalars(query.order_by(m.Enrollment.id).limit(10001)).all()
    if len(enrollments) > 10000:
        fail(409, 'Volume acima do limite da prévia síncrona. Processamento em fila pendente.')
    at_reference = {e.id: (e.status, e.class_group_id) for e in enrollments}
    events = select(m.EnrollmentEvent).where(m.EnrollmentEvent.school_id == school.id,
        m.EnrollmentEvent.enrollment_id.in_(query.with_only_columns(m.Enrollment.id))).order_by(
        m.EnrollmentEvent.created_at.desc(), m.EnrollmentEvent.id.desc())
    for event in db.scalars(events.execution_options(yield_per=500)):
        if event.created_at.date() > data.reference_date and isinstance(event.before, dict):
            status, group = at_reference[event.enrollment_id]
            at_reference[event.enrollment_id] = (event.before.get('status', status), event.before.get('class_group_id', group))
    rows = [{'enrollment_id': key, 'class_group_id': group, 'local_status': status}
            for key, (status, group) in at_reference.items() if group in selected]
    blocks = ['leiaute_e_dominios_sem_homologacao', 'declaracao_oficial_sem_comparacao']
    if selected != groups:
        blocks.append('selecao_parcial')
    if not rows:
        blocks.append('selecao_sem_matriculas')
    return {'school_id': school.id, 'year_id': year.id, 'stage': data.stage,
            'environment': data.environment, 'reference_date': data.reference_date.isoformat(),
            'class_group_ids': sorted(selected), 'rows': rows, 'blocks': blocks,
            'official_export_enabled': False, 'official_source': SOURCES[data.stage]}


@router.post('/preview')
def make_preview(data: Selection, db: DB, user: Actor, school: Scope):
    authorize(user, school)
    return preview(data, db, school)


@router.post('/drafts')
def save_draft(data: Selection, db: DB, user: Actor, school: Scope, request: Request):
    authorize(user, school)
    lock_school(db, school.id)
    snapshot = preview(data, db, school)
    digest = sha256(json.dumps(snapshot, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
    draft = db.scalar(select(Draft).where(Draft.school_id == school.id, Draft.digest == digest))
    if not draft:
        draft = Draft(school_id=school.id, year_id=data.year_id, stage=data.stage,
                      reference_date=data.reference_date, digest=digest, snapshot=snapshot, author_id=user.id)
        db.add(draft)
        db.flush()
        audit(db, request, user, 'educacenso.draft.created', draft, school.id, {'digest': digest})
    return output(draft)


@router.get('/drafts')
def drafts(db: DB, user: Actor, school: Scope, offset: int = 0):
    authorize(user, school)
    rows = db.scalars(select(Draft).where(Draft.school_id == school.id).order_by(
        Draft.created_at.desc(), Draft.id.desc()).offset(max(0, offset)).limit(50))
    return [output(row, ('snapshot',)) for row in rows]


@router.get('/drafts/{draft_id}')
def read_draft(draft_id: str, db: DB, user: Actor, school: Scope):
    authorize(user, school)
    draft = scoped(db, Draft, draft_id, school.id)
    evidence = db.scalars(select(Evidence).where(Evidence.school_id == school.id,
        Evidence.draft_id == draft.id).order_by(Evidence.created_at, Evidence.id))
    return {**output(draft), 'evidence': [output(item) for item in evidence], 'status': 'rascunho'}


@router.post('/drafts/{draft_id}/evidence')
async def attach(draft_id: str, file: UploadFile, db: DB, user: Actor, school: Scope, request: Request):
    authorize(user, school)
    scoped(db, Draft, draft_id, school.id)
    limit = min(4, settings().max_upload_mb) * 1024 * 1024
    raw = await file.read(limit + 1)
    if not raw or len(raw) > limit:
        fail(422, 'Anexo vazio ou acima do limite de treinamento.')
    digest = sha256(raw).hexdigest()
    lock_school(db, school.id)
    evidence = db.scalar(select(Evidence).where(Evidence.draft_id == draft_id, Evidence.digest == digest))
    if not evidence:
        # Conteúdo opaco: nunca usar nome fornecido, executar, inferir formato ou promover status.
        stored = write_file(db, school.id, user.id, 'evidencia-' + digest[:12] + '.bin',
                            'application/octet-stream', raw, 'educacenso_evidence')
        evidence = Evidence(school_id=school.id, draft_id=draft_id, digest=digest,
                            file_id=stored.id, author_id=user.id)
        db.add(evidence)
        db.flush()
        audit(db, request, user, 'educacenso.evidence.attached', evidence, school.id, {'draft_id': draft_id})
    return {**output(evidence), 'interpreted': False, 'status': 'rascunho'}
