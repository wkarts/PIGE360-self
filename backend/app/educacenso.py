"""Prévia interna de treinamento e guarda de evidências do operador."""
from copy import deepcopy
from datetime import UTC, date, datetime, time, timedelta
from hashlib import sha256
import json
from zoneinfo import ZoneInfo
from typing import Literal

from fastapi import APIRouter, Form, Request, Response, UploadFile
from pydantic import Field, model_validator
from sqlalchemy import Boolean, Date, ForeignKey, Integer, JSON, String, UniqueConstraint, false, func, or_, select, update
from sqlalchemy.orm import Mapped, mapped_column

from . import models as m
from .admission_matching import name_column
from .text_normalization import normalized_name
from .common import audit, output
from .config import settings
from .db import Base, Record
from .documents import write_file
from .schemas import Input
from .security import Actor, DB, Scope, check_version, fail, lock_school, require, scoped

router = APIRouter(prefix='/api/v1/schools/{school_id}/educacenso', tags=['Educacenso'])
SOURCES = {
    'matricula_inicial': 'https://www.gov.br/inep/pt-br/areas-de-atuacao/pesquisas-estatisticas-e-indicadores/censo-escolar/orientacoes/matricula-inicial/migracao',
    'situacao_aluno': 'https://www.gov.br/inep/pt-br/areas-de-atuacao/pesquisas-estatisticas-e-indicadores/censo-escolar/orientacoes/situacao-do-aluno',
}


# Regras documentadas são específicas da coleta. Um manual não homologa um serializador.
INEP_MIGRATION = 'https://download.inep.gov.br/educacao_basica/educacenso/migracao/'
PROCEDURES = {
    (2025, 'situacao_aluno'): (
        INEP_MIGRATION + '2025/etapas_e_instrucoes_gerais_para_a_migracao_sistema_segunda_etapa_2025_aluno_18_02_26.pdf',
        'substitui_declaracao_da_escola',
        ('Aguardando validação', 'Em validação', 'Aguardando processamento', 'Aguardando fechamento',
         'Importado parcialmente', 'Importado', 'Recusado')),
    (2025, 'matricula_inicial'): (
        INEP_MIGRATION + '2023/etapas_e_instrucoes_gerais_para_a_migracao_no_educacenso_2025.pdf',
        'substitui_declaracao_da_escola', ()),
}


Environment = Literal['treinamento', 'producao']


class Draft(Record, m.Scoped, Base):
    __tablename__ = 'educacenso_drafts'
    year_id: Mapped[str] = mapped_column(ForeignKey('academic_years.id'))
    environment: Mapped[str] = mapped_column(String(16), default='treinamento', server_default='treinamento')
    stage: Mapped[str] = mapped_column(String(24))
    reference_date: Mapped[date] = mapped_column(Date)
    digest: Mapped[str] = mapped_column(String(64))
    snapshot: Mapped[dict] = mapped_column(JSON)
    archived: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    selection_digest: Mapped[str | None] = mapped_column(String(64), index=True)
    author_id: Mapped[str] = mapped_column(ForeignKey('users.id'))
    __table_args__ = (UniqueConstraint('school_id', 'digest', name='uq_censo_draft_digest'),)


class Revision(Record, m.Scoped, Base):
    __tablename__ = 'educacenso_draft_revisions'
    draft_id: Mapped[str] = mapped_column(ForeignKey('educacenso_drafts.id'))
    draft_version: Mapped[int] = mapped_column(Integer)
    snapshot: Mapped[dict] = mapped_column(JSON)
    digest: Mapped[str] = mapped_column(String(64))
    reason: Mapped[str] = mapped_column(String(1000))
    author_id: Mapped[str] = mapped_column(ForeignKey('users.id'))
    __table_args__ = (UniqueConstraint('draft_id', 'draft_version', name='uq_censo_revision_version'),)


class Evidence(Record, m.Scoped, Base):
    __tablename__ = 'educacenso_evidence'
    draft_id: Mapped[str] = mapped_column(ForeignKey('educacenso_drafts.id'))
    file_id: Mapped[str] = mapped_column(ForeignKey('files.id'))
    reported_status: Mapped[str | None] = mapped_column(String(48))
    digest: Mapped[str] = mapped_column(String(64))
    author_id: Mapped[str] = mapped_column(ForeignKey('users.id'))
    __table_args__ = (UniqueConstraint('draft_id', 'digest', name='uq_censo_evidence_digest'),)


class Selection(Input):
    year_id: str
    stage: Literal['matricula_inicial', 'situacao_aluno']
    reference_date: date
    environment: Environment
    # None = todos os grupos. Lista vazia não pode virar seleção total.
    class_group_ids: list[str] | None = Field(default=None, min_length=1, max_length=500)

    enrollment_ids: list[str] | None = Field(default=None, min_length=1, max_length=1000)

    @model_validator(mode='after')
    def distinct_groups(self):
        if self.class_group_ids and len(set(self.class_group_ids)) != len(self.class_group_ids):
            raise ValueError('A seleção contém turmas repetidas.')
        if self.enrollment_ids and len(set(self.enrollment_ids)) != len(self.enrollment_ids):
            raise ValueError('A seleção contém matrículas repetidas.')
        return self


class Search(Selection):
    q: str = Field(default='', max_length=180)
    offset: int = Field(default=0, ge=0)
    limit: int = Field(default=25, ge=1, le=100)


class DraftChange(Input):
    version: int = Field(ge=1)
    reason: str = Field(min_length=5, max_length=1000)


class ChangeRow(DraftChange):
    student_name: str | None = Field(default=None, min_length=1, max_length=200)
    student_inep_code: str | None = Field(default=None, max_length=32)
    birth_date: date | None = None
    status: str | None = Field(default=None, min_length=1, max_length=80)


def authorize(user, school):
    require(user, 'educacenso.manage')


def historical(field, current, school_id, cutoff):
    # Primeiro movimento depois do corte que modificou esta coluna.
    if cutoff is None:
        return current
    event = m.EnrollmentEvent
    before = event.before[field].as_string()
    previous = (select(before).where(event.school_id == school_id,
        event.enrollment_id == m.Enrollment.id, event.created_at >= cutoff, before.is_not(None))
        .order_by(event.created_at, event.id).limit(1).correlate(m.Enrollment).scalar_subquery())
    return func.coalesce(previous, current)


def candidates(data, db, school, *, include_identification=True):
    year = scoped(db, m.AcademicYear, data.year_id, school.id)
    if not year.starts_on <= data.reference_date <= year.ends_on:
        fail(422, 'A data de referência deve pertencer ao ano letivo escolhido.')
    groups = set(db.scalars(select(m.ClassGroup.id).where(
        m.ClassGroup.school_id == school.id, m.ClassGroup.academic_year_id == year.id)))
    selected = groups if data.class_group_ids is None else set(data.class_group_ids)
    if not selected <= groups:
        fail(422, 'Turma fora do escopo da escola e do ano.')
    cutoff = None
    if data.reference_date < date.max:
        next_day = data.reference_date + timedelta(days=1)
        cutoff = datetime.combine(next_day, time.min, tzinfo=ZoneInfo('America/Bahia')).astimezone(UTC)
    enrollment, student, person, group = m.Enrollment, m.Student, m.Person, m.ClassGroup
    group_at_date = historical('class_group_id', enrollment.class_group_id, school.id, cutoff)
    status_at_date = historical('status', enrollment.status, school.id, cutoff)
    query = (select(enrollment.id.label('enrollment_id'), enrollment.number.label('enrollment_number'),
        student.id.label('student_id'), student.number.label('student_number'),
        person.name.label('student_name'), group.id.label('class_group_id'), group.name.label('class_name'),
        m.Grade.name.label('grade_name'), m.Grade.level.label('grade_level'), m.Shift.name.label('shift_name'),
        status_at_date.label('local_status')).select_from(enrollment)
        .join(student, student.id == enrollment.student_id).join(person, person.id == student.person_id)
        .join(group, group.id == group_at_date).join(m.Grade, m.Grade.id == group.grade_id)
        .join(m.Shift, m.Shift.id == group.shift_id)
        .where(enrollment.school_id == school.id, enrollment.academic_year_id == year.id,
               enrollment.enrolled_on <= data.reference_date, student.school_id == school.id,
               person.school_id == school.id, group.school_id == school.id,
               m.Grade.school_id == school.id, m.Shift.school_id == school.id,
               group.academic_year_id == year.id))
    if include_identification:
        query = query.add_columns(student.inep_code.label('student_inep_code'))
        if data.stage == 'matricula_inicial':
            query = query.add_columns(person.birth_date.label('birth_date'))
    if data.class_group_ids is not None:
        query = query.where(group.id.in_(selected))
    if data.enrollment_ids is not None:
        query = query.where(enrollment.id.in_(data.enrollment_ids))
    return year, groups, selected, query


def identified_rows(db, query):
    rows = []
    for values in db.execute(query).mappings():
        row = dict(values)
        if row.get('birth_date'):
            row['birth_date'] = row['birth_date'].isoformat()
        row['declaration'] = {key: row[key] for key in ('student_name', 'student_inep_code', 'birth_date') if key in row}
        row['declaration']['status'] = ''
        rows.append(row)
    return rows


@router.post('/enrollments/search')
def search_enrollments(data: Search, db: DB, user: Actor, school: Scope):
    authorize(user, school)
    _, _, _, query = candidates(data, db, school, include_identification=False)
    if data.q:
        term = normalized_name(data.q)
        query = query.where(or_(name_column(db).contains(term, autoescape=True),
            func.lower(m.Enrollment.number).contains(term, autoescape=True),
            func.lower(m.Student.number).contains(term, autoescape=True),
            func.lower(m.Student.inep_code).contains(term, autoescape=True)))
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    page = query.order_by(m.Person.name, m.Enrollment.number, m.Enrollment.id).offset(data.offset).limit(data.limit)
    return {'items': identified_rows(db, page), 'total': total, 'offset': data.offset, 'limit': data.limit}


def preview(data, db, school):
    year, groups, selected, query = candidates(data, db, school)
    rows = identified_rows(db, query.order_by(m.Enrollment.id).limit(10001))
    if len(rows) > 10000:
        fail(409, 'Volume acima do limite da prévia síncrona. Selecione turmas ou matrículas.')
    if data.enrollment_ids is not None and len(rows) != len(data.enrollment_ids):
        fail(422, 'Há matrículas fora da seleção de escola, ano, turma ou data.')
    blocks = ['leiaute_e_dominios_sem_homologacao', 'declaracao_oficial_sem_comparacao']
    if selected != groups or data.enrollment_ids is not None:
        blocks.append('selecao_parcial')
    if not rows:
        blocks.append('selecao_sem_matriculas')
    collection_year = year.starts_on.year
    source, replacement, statuses = PROCEDURES.get((collection_year, data.stage),
        (SOURCES[data.stage], 'regra_pendente_de_verificacao', ()))
    return {'school_id': school.id, 'year_id': year.id, 'year_name': year.name, 'stage': data.stage,
            'collection_year': collection_year, 'replacement_rule': replacement,
            'return_statuses': list(statuses),
            'environment': data.environment, 'reference_date': data.reference_date.isoformat(),
            'class_group_ids': sorted(selected), 'enrollment_ids': sorted(data.enrollment_ids) if data.enrollment_ids else None, 'rows': rows, 'blocks': blocks,
            'official_export_enabled': False, 'official_source': source}


@router.post('/preview')
def make_preview(data: Selection, db: DB, user: Actor, school: Scope):
    authorize(user, school)
    return preview(data, db, school)


def canonical(snapshot):
    return json.dumps(snapshot, ensure_ascii=True, sort_keys=True, separators=(',', ':')).encode()


def snapshot_digest(snapshot):
    return sha256(canonical(snapshot)).hexdigest()


def scoped_draft(db, school_id, draft_id, environment):
    draft = scoped(db, Draft, draft_id, school_id)
    if draft.environment != environment:
        fail(404, 'Lote não encontrado neste ambiente.')
    return draft


def stored_revision(db, draft, version):
    if version == 1:
        return draft
    revision = db.scalar(select(Revision).where(Revision.school_id == draft.school_id,
        Revision.draft_id == draft.id, Revision.draft_version == version))
    if revision is None:
        fail(404, 'Revisão não encontrada neste lote.')
    return revision


def draft_snapshot(db, draft, version=None):
    return stored_revision(db, draft, draft.version if version is None else version).snapshot


def display_rows(db, draft, rows):
    # Originais legados têm apenas as chaves. A identificação atual é exclusiva da tela;
    # o download de uma revisão sempre conserva os mesmos bytes e a mesma impressão.
    missing = [r['enrollment_id'] for r in rows if 'student_name' not in r]
    if not missing:
        return rows
    identity = {}
    for start in range(0, len(missing), 500):
        query = (select(m.Enrollment.id, m.Enrollment.number, m.Person.name, m.Student.id,
                        m.Student.number, m.Student.inep_code)
                 .join(m.Student, m.Student.id == m.Enrollment.student_id)
                 .join(m.Person, m.Person.id == m.Student.person_id)
                 .where(m.Enrollment.school_id == draft.school_id, m.Student.school_id == draft.school_id,
                        m.Person.school_id == draft.school_id, m.Enrollment.id.in_(missing[start:start+500])))
        for eid, number, name, student_id, student_number, inep in db.execute(query):
            identity[eid] = dict(student_name=name, enrollment_number=number, student_number=student_number,
                                 student_id=student_id, student_inep_code=inep)
    groups = dict(db.execute(select(m.ClassGroup.id, m.ClassGroup.name).where(
        m.ClassGroup.school_id == draft.school_id, m.ClassGroup.academic_year_id == draft.year_id)).all())
    return [{**identity.get(r['enrollment_id'], {}), 'class_name': groups.get(r['class_group_id'], ''), **r} for r in rows]


def detail(db, draft):
    revision = stored_revision(db, draft, draft.version)
    evidence = db.scalars(select(Evidence).where(Evidence.school_id == draft.school_id,
        Evidence.draft_id == draft.id).order_by(Evidence.created_at, Evidence.id))
    return {**output(draft), 'snapshot': revision.snapshot, 'digest': revision.digest,
            'rows_display': display_rows(db, draft, revision.snapshot['rows']),
            'evidence': [output(item) for item in evidence],
            'status': 'arquivado' if draft.archived else 'rascunho'}


@router.post('/drafts')
def save_draft(data: Selection, db: DB, user: Actor, school: Scope, request: Request):
    authorize(user, school)
    lock_school(db, school.id)
    snapshot = preview(data, db, school)
    selection_digest = snapshot_digest(snapshot)
    previous = db.scalar(select(Draft).where(Draft.school_id == school.id,
        Draft.selection_digest == selection_digest).order_by(Draft.created_at.desc(), Draft.id.desc()).limit(1))
    if previous and not previous.archived and previous.version == 1:
        return detail(db, previous)
    if previous:
        snapshot['based_on_draft_id'] = previous.id
    if db.bind.dialect.name == 'postgresql':
        from sqlalchemy.dialects.postgresql import insert
    else:
        from sqlalchemy.dialects.sqlite import insert
    digest = snapshot_digest(snapshot)
    values = dict(school_id=school.id, year_id=data.year_id, stage=data.stage, environment=data.environment,
        reference_date=data.reference_date, digest=digest, snapshot=snapshot,
        selection_digest=selection_digest, author_id=user.id)
    created = db.scalar(insert(Draft).values(**values).on_conflict_do_nothing(
        index_elements=['school_id', 'digest']).returning(Draft.id))
    draft = db.scalar(select(Draft).where(Draft.school_id == school.id, Draft.digest == digest))
    if created:
        audit(db, request, user, 'educacenso.draft.created', draft, school.id, {'digest': digest})
    return detail(db, draft)


@router.get('/drafts')
def drafts(db: DB, user: Actor, school: Scope, offset: int = 0,
           environment: Environment = 'treinamento', archived: bool = False):
    authorize(user, school)
    # Evita carregar todos os alunos de cada lote só para compor o histórico da escola.
    columns = [col for col in Draft.__table__.columns if col.name not in ('snapshot', 'digest')]
    query = (select(*columns, func.coalesce(Revision.digest, Draft.digest).label('digest'))
        .outerjoin(Revision, (Revision.draft_id == Draft.id) & (Revision.school_id == Draft.school_id)
                   & (Revision.draft_version == Draft.version))
        .where(Draft.school_id == school.id, Draft.environment == environment, Draft.archived == archived)
        .order_by(Draft.created_at.desc(), Draft.id.desc()).offset(max(0, offset)).limit(50))
    return [{**row, 'status': 'arquivado' if archived else 'rascunho'} for row in db.execute(query).mappings()]


@router.get('/drafts/{draft_id}')
def read_draft(draft_id: str, db: DB, user: Actor, school: Scope, environment: Environment = 'treinamento'):
    authorize(user, school)
    return detail(db, scoped_draft(db, school.id, draft_id, environment))


@router.get('/drafts/{draft_id}/revisions')
def revisions(draft_id: str, db: DB, user: Actor, school: Scope, environment: Environment = 'treinamento'):
    authorize(user, school)
    draft = scoped_draft(db, school.id, draft_id, environment)
    entries = [{'version': 1, 'digest': draft.digest, 'reason': '', 'created_at': draft.created_at}]
    query = select(Revision.draft_version, Revision.digest, Revision.reason, Revision.created_at).where(
        Revision.draft_id == draft.id, Revision.school_id == school.id).order_by(Revision.draft_version)
    entries.extend(dict(version=number, digest=digest, reason=reason, created_at=created)
                   for number, digest, reason, created in db.execute(query))
    return {'items': entries}


@router.get('/drafts/{draft_id}/diagnostico.json')
def download_local(draft_id: str, db: DB, user: Actor, school: Scope,
                   environment: Environment = 'treinamento', version: int | None = None):
    authorize(user, school)
    draft = scoped_draft(db, school.id, draft_id, environment)
    return Response(canonical(draft_snapshot(db, draft, version)), media_type='application/json', headers={
        'Content-Disposition': f'attachment; filename="diagnostico-local-{draft.id}.json"',
        'Cache-Control': 'no-store'})


def editable(db, school, draft_id, environment, version):
    lock_school(db, school.id)
    draft = scoped_draft(db, school.id, draft_id, environment)
    if draft.archived:
        fail(409, 'Este lote está arquivado.')
    check_version(draft, version)
    return draft


def persist_revision(db, user, request, draft, change, snapshot, action, enrollment_id=None):
    new_version = change.version + 1
    updated = db.execute(update(Draft).where(Draft.id == draft.id, Draft.school_id == draft.school_id,
        Draft.version == change.version, Draft.archived.is_(False)).values(
            version=new_version, archived=action == 'archived'))
    if updated.rowcount != 1:
        fail(409, 'O rascunho foi alterado. Atualize e confira a revisão.')
    digest = snapshot_digest(snapshot)
    db.add(Revision(school_id=draft.school_id, draft_id=draft.id, draft_version=new_version,
        snapshot=snapshot, digest=digest, reason=change.reason, author_id=user.id))
    db.flush()
    audit(db, request, user, 'educacenso.draft.'+action, draft, draft.school_id, {
        'enrollment_id': enrollment_id, 'revision': new_version, 'digest': digest, 'reason': change.reason})
    return detail(db, draft)


def row_in_snapshot(db, draft, enrollment_id):
    snapshot = deepcopy(draft_snapshot(db, draft))
    for row in snapshot['rows']:
        if row['enrollment_id'] == enrollment_id:
            return snapshot, row
    fail(404, 'Matrícula não encontrada nesta revisão do lote.')


@router.patch('/drafts/{draft_id}/rows/{enrollment_id}')
def change_row(draft_id: str, enrollment_id: str, data: ChangeRow, db: DB, user: Actor, school: Scope,
               request: Request, environment: Environment = 'treinamento'):
    authorize(user, school)
    draft = editable(db, school, draft_id, environment, data.version)
    fields = data.model_fields_set - {'reason', 'version'}
    allowed = {'student_name', 'student_inep_code', 'birth_date'} if draft.stage == 'matricula_inicial' else {'status'}
    if not fields or not fields <= allowed or any(getattr(data, k) is None for k in fields & {'student_name', 'status'}):
        fail(422, 'Informe os campos declaratórios correspondentes à etapa do lote.')
    if data.status and data.status.casefold() in {'draft', 'active', 'suspended', 'transferred', 'cancelled', 'completed'}:
        fail(422, 'Informe a situação declaratória da etapa, em vez do código interno da matrícula.')
    if data.birth_date and data.birth_date > draft.reference_date:
        fail(422, 'A data de nascimento deve ser igual ou anterior à data de referência.')
    snapshot, row = row_in_snapshot(db, draft, enrollment_id)
    declaration = row.setdefault('declaration', {k: row[k] for k in allowed if k in row})
    values = data.model_dump(mode='json', include=fields)
    if 'student_inep_code' in values and not values['student_inep_code']:
        values['student_inep_code'] = None
    if all((declaration.get(k) or None) == value for k, value in values.items()):
        fail(422, 'Altere pelo menos um dado declaratório antes de salvar a revisão.')
    declaration.update(values)
    return persist_revision(db, user, request, draft, data, snapshot, 'row_changed', enrollment_id)


@router.delete('/drafts/{draft_id}/rows/{enrollment_id}')
def remove_row(draft_id: str, enrollment_id: str, data: DraftChange, db: DB, user: Actor, school: Scope,
               request: Request, environment: Environment = 'treinamento'):
    authorize(user, school)
    draft = editable(db, school, draft_id, environment, data.version)
    snapshot, row = row_in_snapshot(db, draft, enrollment_id)
    snapshot['rows'].remove(row)
    if snapshot.get('enrollment_ids') is not None:
        snapshot['enrollment_ids'].remove(enrollment_id)
    for block in ['selecao_parcial'] + ([] if snapshot['rows'] else ['selecao_sem_matriculas']):
        if block not in snapshot['blocks']:
            snapshot['blocks'].append(block)
    return persist_revision(db, user, request, draft, data, snapshot, 'row_removed', enrollment_id)


@router.post('/drafts/{draft_id}/archive')
def archive(draft_id: str, data: DraftChange, db: DB, user: Actor, school: Scope, request: Request,
            environment: Environment = 'treinamento'):
    authorize(user, school)
    draft = editable(db, school, draft_id, environment, data.version)
    return persist_revision(db, user, request, draft, data, draft_snapshot(db, draft), 'archived')


@router.post('/drafts/{draft_id}/evidence')
async def attach(draft_id: str, file: UploadFile, db: DB, user: Actor, school: Scope, request: Request,
                 environment: Environment = 'treinamento', reported_status: str | None = Form(None, max_length=48)):
    authorize(user, school)
    lock_school(db, school.id)
    draft = scoped_draft(db, school.id, draft_id, environment)
    if draft.archived:
        fail(409, 'Este lote está arquivado.')
    if reported_status and reported_status not in draft.snapshot.get('return_statuses', []):
        fail(422, 'Situação de retorno não documentada para esta coleta.')
    limit = min(4, settings().max_upload_mb) * 1024 * 1024
    raw = await file.read(limit + 1)
    if not raw or len(raw) > limit:
        fail(422, 'Anexo vazio ou acima do limite de 4 MiB.')
    digest = sha256(raw).hexdigest()
    evidence = db.scalar(select(Evidence).where(Evidence.draft_id == draft_id, Evidence.digest == digest))
    if evidence and reported_status and evidence.reported_status != reported_status:
        fail(409, 'Este arquivo já foi registrado com outra observação.')
    if not evidence:
        # Conteúdo opaco: nunca usar nome fornecido, executar, inferir formato ou promover status.
        stored = write_file(db, school.id, user.id, 'evidencia-' + digest[:12] + '.bin',
                            'application/octet-stream', raw, 'educacenso_evidence')
        evidence = Evidence(school_id=school.id, draft_id=draft_id, digest=digest,
                            file_id=stored.id, author_id=user.id, reported_status=reported_status)
        db.add(evidence)
        db.flush()
        audit(db, request, user, 'educacenso.evidence.attached', evidence, school.id, {'draft_id': draft_id})
    return {**output(evidence), 'interpreted': False, 'status': 'rascunho'}
