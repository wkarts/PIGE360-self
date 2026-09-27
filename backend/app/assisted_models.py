"""Fila privada de OCR e cache de consultas públicas; sem novo broker."""
from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text, Index
from sqlalchemy.orm import Mapped, mapped_column
from .db import Base, Record, now


class OcrJob(Record, Base):
    __tablename__ = 'ocr_jobs'
    school_id: Mapped[str] = mapped_column(ForeignKey('schools.id'), index=True)
    owner_kind: Mapped[str] = mapped_column(String(12))
    owner_id: Mapped[str] = mapped_column(String(36))
    purpose: Mapped[str] = mapped_column(String(20), default='identity')
    sha256: Mapped[str] = mapped_column(String(64))
    storage_key: Mapped[str] = mapped_column(String(240))
    storage_backend: Mapped[str] = mapped_column(String(12))
    bucket_name: Mapped[str] = mapped_column(String(120), default='')
    mime_type: Mapped[str] = mapped_column(String(40))
    size: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(20), default='queued')
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    available_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    lease_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    lease_token: Mapped[str] = mapped_column(String(64), default='')
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    encrypted_result: Mapped[str] = mapped_column(Text, default='')
    error_code: Mapped[str] = mapped_column(String(60), default='')
    __table_args__ = (
        Index('ix_ocr_owner', 'school_id', 'owner_kind', 'owner_id'),
        Index('ix_ocr_queue', 'status', 'available_at'),
    )


class LookupCache(Base):
    __tablename__ = 'lookup_cache'
    key: Mapped[str] = mapped_column(String(80), primary_key=True)
    data: Mapped[dict] = mapped_column(JSON, default=dict)
    provider: Mapped[str] = mapped_column(String(24), default='')
    fetched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    lease_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    lease_token: Mapped[str] = mapped_column(String(64), default='')


class LookupProvider(Base):
    __tablename__ = 'lookup_providers'
    id: Mapped[str] = mapped_column(String(24), primary_key=True)
    available_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class AssistedQuota(Base):
    __tablename__ = 'assisted_quotas'
    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    count: Mapped[int] = mapped_column(Integer, default=0)
    window_started: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class IntakeSettings(Base):
    __tablename__ = 'installation_intake'
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    ocr_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    lookups_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
