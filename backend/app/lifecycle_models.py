"""Estado de arquivamento separado da situação operacional dos cadastros."""
from typing import Literal
from sqlalchemy import JSON, ForeignKey, String, Text, UniqueConstraint, or_, select
from sqlalchemy.orm import Mapped, mapped_column
from .db import Base, Record
from .models import Scoped, Student
from .security import fail

ArchiveFilter = Literal['active', 'archived', 'all']


class RecordArchive(Record, Scoped, Base):
    __tablename__ = 'record_archives'
    entity_type: Mapped[str] = mapped_column(String(60))
    entity_id: Mapped[str] = mapped_column(String(36))
    archived_by: Mapped[str] = mapped_column(ForeignKey('users.id'))
    reason: Mapped[str] = mapped_column(Text)
    previous_values: Mapped[dict] = mapped_column(JSON, default=dict)
    __table_args__ = (UniqueConstraint('school_id', 'entity_type', 'entity_id', name='uq_record_archive_entity'),)


def archive_record(db, obj):
    return db.scalar(select(RecordArchive).where(
        RecordArchive.school_id == obj.school_id,
        RecordArchive.entity_type == obj.__tablename__, RecordArchive.entity_id == obj.id))


def archive_condition(model):
    condition = model.id.in_(select(RecordArchive.entity_id).where(
        RecordArchive.school_id == model.school_id,
        RecordArchive.entity_type == model.__tablename__).correlate(model))
    # Compatibilidade com alunos arquivados antes da central de exclusões.
    return or_(condition, model.status == 'archived') if model is Student else condition


def filter_archived(stmt, model, archived: ArchiveFilter = 'active'):
    if archived == 'all':
        return stmt
    condition = archive_condition(model)
    return stmt.where(condition if archived == 'archived' else ~condition)


def archive_output(db, obj):
    record = archive_record(db, obj)
    return {'archived': bool(record) or (isinstance(obj, Student) and obj.status == 'archived'),
            'archived_at': record.created_at.isoformat() if record else None}


def require_available(db, obj):
    if archive_record(db, obj) or (isinstance(obj, Student) and obj.status == 'archived'):
        fail(409, 'Este cadastro está arquivado. Restaure-o antes de editar ou criar novos vínculos.')
