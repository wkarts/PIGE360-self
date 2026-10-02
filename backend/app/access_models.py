"""Perfis de permissões pertencentes a uma única instituição."""
from sqlalchemy import Boolean, ForeignKey, JSON, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from .db import Base, Record


class SchoolAccessProfile(Record, Base):
    __tablename__ = 'school_access_profiles'
    school_id: Mapped[str] = mapped_column(ForeignKey('schools.id'), index=True)
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(String(500), default='')
    base_role: Mapped[str] = mapped_column(String(32))
    permissions: Mapped[list] = mapped_column(JSON, default=list)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    __table_args__ = (UniqueConstraint('school_id', 'name', name='uq_access_profile_school_name'),)
