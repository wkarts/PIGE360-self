"""Exclusão explícita, transacional e sem cascatas de cadastros da escola."""
from typing import Literal
from fastapi import APIRouter, Request
from pydantic import Field
from sqlalchemy import delete, func, or_, select
from sqlalchemy.exc import IntegrityError
from . import models as m, schemas as s
from .common import audit
from .db import Base
from .lifecycle_models import RecordArchive, archive_record, require_available
from .security import Actor, DB, Scope, check_version, fail, lock_school, require, scoped

router = APIRouter(prefix='/schools/{school_id}/record-lifecycle', tags=['Arquivamento e exclusão'])

RESOURCES = {
    'persons': (m.Person, 'people.write', 'Pessoa'),
    'students': (m.Student, 'people.write', 'Aluno'),
    'teachers': (m.TeacherProfile, 'people.write', 'Professor'),
    'employees': (m.EmployeeProfile, 'people.write', 'Funcionário'),
    'units': (m.Unit, 'academic.write', 'Unidade'),
    'academic-years': (m.AcademicYear, 'academic.write', 'Ano letivo'),
    'grades': (m.Grade, 'academic.write', 'Série'),
    'shifts': (m.Shift, 'academic.write', 'Turno'),
    'class-groups': (m.ClassGroup, 'academic.write', 'Turma'),
    'document-types': (m.DocumentType, 'documents.write', 'Tipo de documento'),
}
LABELS = {
    'students': 'Perfis de aluno', 'teacher_profiles': 'Perfis de professor',
    'employee_profiles': 'Perfis de funcionário', 'student_guardians': 'Vínculos com responsáveis',
    'users': 'Usuários de acesso', 'teacher_assignments': 'Atribuições docentes',
    'enrollments': 'Matrículas', 'class_groups': 'Turmas', 'academic_periods': 'Períodos acadêmicos',
    'school_diaries': 'Diários escolares', 'curriculum_plans': 'Planejamentos pedagógicos',
    'student_documents': 'Documentos recebidos', 'issued_documents': 'Documentos emitidos',
    'document_types': 'Tipos de documento', 'document_templates': 'Modelos de documento',
    'protocols': 'Protocolos', 'bank_charges': 'Cobranças', 'admissions': 'Inscrições online',
    'admission_campaigns': 'Processos de inscrição', 'admission_documents': 'Documentos de inscrição',
    'diary_attendance': 'Registros de frequência', 'assessment_results': 'Resultados de avaliação',
    'descriptive_opinions': 'Pareceres pedagógicos', 'pedagogical_records': 'Registros pedagógicos',
    'diary_occurrences': 'Ocorrências escolares', 'diary_family_communications': 'Comunicações familiares',
    'period_results': 'Resultados do período', 'portal_student_links': 'Acessos ao portal',
    'connect_unit_bindings': 'Integrações da unidade',
}


class LifecycleAction(s.Input):
    action: Literal['archive', 'restore', 'delete']
    version: int = Field(ge=1)
    reason: str = Field(min_length=3, max_length=1000)
    confirmation: str = Field(default='', max_length=200)


def resource_config(resource):
    config = RESOURCES.get(resource)
    if config is None:
        fail(404, 'Este tipo de cadastro não oferece exclusão por esta operação.')
    return config


def record_label(db, obj):
    if hasattr(obj, 'person_id'):
        person = db.get(m.Person, obj.person_id)
        return person.name if person else 'Cadastro'
    return obj.name


def reference_counts(db, obj):
    """A lista nasce das FKs reais, incluindo modelos adicionados no futuro.

    Nenhum ON DELETE CASCADE é usado como autorização para remover dependentes.
    Somente as classificações cadastrais pertencentes à própria Pessoa são
    metadados descartáveis e aparecem separadamente na prévia.
    """
    result = []
    owned = []
    for table in Base.metadata.tables.values():
        columns = {fk.parent.name for fk in table.foreign_keys
                   if fk.column.table.name == obj.__tablename__ and fk.column.name == 'id'}
        if not columns:
            continue
        count = db.scalar(select(func.count()).select_from(table).where(
            or_(*(table.c[name] == obj.id for name in columns)))) or 0
        if not count:
            continue
        item = {'key': table.name, 'label': LABELS.get(table.name, 'Registros relacionados'), 'count': count}
        if isinstance(obj, m.Person) and table.name == 'person_type_links':
            owned.append({**item, 'label': 'Classificações da própria pessoa'})
        else:
            result.append(item)
    # Docentes/alunos são ligados por Pessoa em alguns domínios legados.
    if isinstance(obj, m.TeacherProfile):
        count = db.scalar(select(func.count()).select_from(m.TeacherAssignment).where(
            or_(m.TeacherAssignment.teacher_person_id == obj.person_id,
                m.TeacherAssignment.teacher_user_id.in_(select(m.User.id).where(m.User.person_id == obj.person_id))))) or 0
        if count:
            result.append({'key': 'teacher_assignments', 'label': 'Atribuições docentes', 'count': count})
    if isinstance(obj, m.ClassGroup):
        from .online_models import AdmissionCampaign
        campaigns = list(db.scalars(select(AdmissionCampaign).where(AdmissionCampaign.school_id == obj.school_id)))
        count = sum(obj.id in (campaign.class_group_ids or []) for campaign in campaigns)
        if count:
            result.append({'key': 'admission_campaigns', 'label': 'Processos de inscrição online', 'count': count})
    if isinstance(obj, (m.Student, m.TeacherProfile)):
        role = 'student' if isinstance(obj, m.Student) else 'teacher'
        count = db.scalar(select(func.count()).select_from(m.User).where(
            m.User.person_id == obj.person_id, m.User.role == role)) or 0
        if count:
            result.append({'key': 'profile_access', 'label': 'Usuários vinculados a este perfil', 'count': count})
    imported = db.scalar(select(func.count()).select_from(m.LegacyImportRecord).where(
        m.LegacyImportRecord.mapped_entity_id == obj.id)) or 0
    if imported:
        result.append({'key': 'legacy_import', 'label': 'Referências da importação legada', 'count': imported})
    return result, owned


def operational_blocks(db, obj):
    blocks = []
    def count(label, model, *conditions):
        total = db.scalar(select(func.count()).select_from(model).where(*conditions)) or 0
        if total:
            blocks.append({'label': label, 'count': total})
    if isinstance(obj, m.Student):
        count('Matrículas em aberto', m.Enrollment, m.Enrollment.student_id == obj.id,
              m.Enrollment.status.in_(['draft', 'active', 'suspended']))
    if isinstance(obj, m.Person):
        count('Perfis de aluno ativos', m.Student, m.Student.person_id == obj.id, m.Student.status != 'archived')
        for model, label in [(m.TeacherProfile, 'Perfis de professor em uso'), (m.EmployeeProfile, 'Perfis de funcionário em uso')]:
            count(label, model, model.person_id == obj.id, ~model.id.in_(select(RecordArchive.entity_id).where(
                RecordArchive.entity_type == model.__tablename__, RecordArchive.school_id == obj.school_id)))
        count('Vínculos ativos como responsável', m.GuardianLink, m.GuardianLink.person_id == obj.id, m.GuardianLink.active.is_(True))
        count('Usuários de acesso ativos', m.User, m.User.person_id == obj.id, m.User.active.is_(True))
        count('Matrículas com responsabilidade financeira', m.Enrollment,
              m.Enrollment.financial_person_id == obj.id, m.Enrollment.status.in_(['draft', 'active', 'suspended']))
    if isinstance(obj, (m.Person, m.TeacherProfile)):
        person_id = obj.id if isinstance(obj, m.Person) else obj.person_id
        count('Atribuições docentes ativas', m.TeacherAssignment,
              or_(m.TeacherAssignment.teacher_person_id == person_id,
                  m.TeacherAssignment.teacher_user_id.in_(select(m.User.id).where(m.User.person_id == person_id))),
              m.TeacherAssignment.active.is_(True))
    group_fields = {m.Unit: 'unit_id', m.AcademicYear: 'academic_year_id', m.Grade: 'grade_id', m.Shift: 'shift_id'}
    if type(obj) in group_fields:
        count('Turmas ativas', m.ClassGroup, getattr(m.ClassGroup, group_fields[type(obj)]) == obj.id, m.ClassGroup.active.is_(True))
    if isinstance(obj, (m.ClassGroup, m.AcademicYear)):
        field = 'class_group_id' if isinstance(obj, m.ClassGroup) else 'academic_year_id'
        count('Matrículas em aberto', m.Enrollment, getattr(m.Enrollment, field) == obj.id,
              m.Enrollment.status.in_(['draft', 'active', 'suspended']))
        count('Atribuições docentes ativas', m.TeacherAssignment,
              getattr(m.TeacherAssignment, field) == obj.id, m.TeacherAssignment.active.is_(True))
        count('Diários ainda não encerrados', m.SchoolDiary, getattr(m.SchoolDiary, field) == obj.id, m.SchoolDiary.status != 'closed')
    if isinstance(obj, m.ClassGroup):
        from .online_models import AdmissionCampaign
        count('Planejamentos em uso', m.CurriculumPlan, m.CurriculumPlan.class_group_id == obj.id, m.CurriculumPlan.status != 'archived')
        campaigns = list(db.scalars(select(AdmissionCampaign).where(
            AdmissionCampaign.school_id == obj.school_id, AdmissionCampaign.active.is_(True))))
        total = sum(obj.id in (campaign.class_group_ids or []) for campaign in campaigns)
        if total:
            blocks.append({'label': 'Processos de inscrição publicados', 'count': total})
    return blocks


def preview(db, user, obj, resource):
    archived = archive_record(db, obj)
    is_archived = bool(archived) or (isinstance(obj, m.Student) and obj.status == 'archived')
    dependencies, owned = reference_counts(db, obj)
    blocks = operational_blocks(db, obj) if not is_archived else []
    can_delete = user.role in {'admin', 'direction'}
    restore_blocks = []
    if is_archived and hasattr(obj, 'person_id'):
        person = db.get(m.Person, obj.person_id)
        if person and archive_record(db, person):
            restore_blocks.append({'label': 'Restaure primeiro a pessoa no Cadastro único', 'count': 1})
    if is_archived and isinstance(obj, m.ClassGroup):
        for key, model in [('unit_id', m.Unit), ('academic_year_id', m.AcademicYear), ('grade_id', m.Grade), ('shift_id', m.Shift)]:
            parent = db.get(model, getattr(obj, key))
            if parent and archive_record(db, parent):
                restore_blocks.append({'label': 'Restaure primeiro os cadastros da estrutura desta turma', 'count': 1})
                break
    return {'resource': resource, 'id': obj.id, 'label': record_label(db, obj), 'kind': RESOURCES[resource][2],
            'version': obj.version, 'archived': is_archived,
            'archived_at': archived.created_at.isoformat() if archived else None,
            'archive_reason': archived.reason if archived else '',
            'dependencies': dependencies, 'owned_records': owned,
            'archive_allowed': not is_archived and not blocks, 'archive_blocks': blocks,
            'restore_allowed': is_archived and not restore_blocks, 'restore_blocks': restore_blocks,
            'delete_allowed': can_delete and not dependencies,
            'delete_permission': can_delete,
            'delete_note': 'A exclusão definitiva exige um perfil de Administração ou Direção.' if not can_delete else
                           'Registros com vínculos históricos, financeiros ou operacionais não podem ser excluídos definitivamente.',
            'preserves_person': hasattr(obj, 'person_id'),
            'confirmation': record_label(db, obj)}


@router.get('/{resource}/{record_id}')
def inspect_record(resource: str, record_id: str, db: DB, user: Actor, school: Scope):
    model, permission, _ = resource_config(resource)
    require(user, permission)
    obj = scoped(db, model, record_id, school.id)
    return preview(db, user, obj, resource)


@router.post('/{resource}/{record_id}')
def manage_record(resource: str, record_id: str, data: LifecycleAction, db: DB, user: Actor, school: Scope, request: Request):
    model, permission, _ = resource_config(resource)
    require(user, permission)
    if data.action == 'delete' and user.role not in {'admin', 'direction'}:
        fail(403, 'A exclusão definitiva exige um perfil de Administração ou Direção.')
    lock_school(db, school.id)
    obj = db.scalar(select(model).where(model.id == record_id, model.school_id == school.id).with_for_update())
    if obj is None:
        fail(404, 'Registro não encontrado nesta escola.')
    check_version(obj, data.version)
    impact = preview(db, user, obj, resource)
    if not impact[data.action + '_allowed']:
        if data.action == 'delete':
            fail(409, 'O cadastro possui vínculos que precisam ser preservados. Use o arquivamento quando disponível.')
        fail(409, 'A operação não está disponível. Confira os vínculos ativos ou a situação de arquivamento do cadastro.')
    saved = archive_record(db, obj)
    details = {'reason': data.reason, 'resource': resource, 'label': impact['label'], 'version': obj.version}
    try:
        if data.action == 'archive':
            values = {'status': 'archived'} if isinstance(obj, m.Student) else \
                     {'status': 'closed'} if isinstance(obj, m.AcademicYear) else \
                     {'employment_status': 'inactive'} if isinstance(obj, (m.TeacherProfile, m.EmployeeProfile)) else {'active': False}
            previous = {key: getattr(obj, key) for key in values}
            db.add(RecordArchive(school_id=school.id, entity_type=obj.__tablename__, entity_id=obj.id,
                                 archived_by=user.id, reason=data.reason, previous_values=previous))
            for key, value in values.items():
                setattr(obj, key, value)
            obj.version += 1
        elif data.action == 'restore':
            values = saved.previous_values if saved else {'status': 'active'}
            for key, value in values.items():
                setattr(obj, key, value)
            if saved:
                db.delete(saved)
            obj.version += 1
        else:
            if data.confirmation != impact['confirmation']:
                fail(422, 'Digite o nome completo do cadastro para confirmar a exclusão definitiva.')
            if isinstance(obj, m.Person):
                db.execute(delete(m.PersonTypeLink).where(m.PersonTypeLink.person_id == obj.id, m.PersonTypeLink.school_id == school.id))
            if saved:
                db.delete(saved)
            db.delete(obj)
        audit(db, request, user, 'record.' + data.action, obj, school.id, details)
        db.flush()
    except IntegrityError:
        # Uma referência criada entre prévia e confirmação nunca gera cascata.
        db.rollback()
        fail(409, 'O cadastro recebeu novos vínculos. Atualize a prévia antes de tentar novamente.')
    message = {'archive': 'Cadastro arquivado. Ele pode ser restaurado pelo filtro Arquivados.',
               'restore': 'Cadastro restaurado.', 'delete': 'Cadastro excluído definitivamente.'}[data.action]
    return {'action': data.action, 'resource': resource, 'id': record_id, 'message': message,
            'version': None if data.action == 'delete' else obj.version}
