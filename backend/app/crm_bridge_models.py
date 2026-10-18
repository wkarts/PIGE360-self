"""Dedicated bridge journal: native BankCharge and admission states are untouched."""
from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from .db import Base, Record, now


class CRMBridgeRequest(Record, Base):
    __tablename__ = 'crm_bridge_requests'
    school_id: Mapped[str] = mapped_column(ForeignKey('schools.id'), index=True)
    charge_id: Mapped[str] = mapped_column(ForeignKey('bank_charges.id'))
    connection_id: Mapped[str] = mapped_column(String(64))
    scope: Mapped[dict] = mapped_column(JSON)
    # The record UUID is also the immutable event_id/idempotency key.
    raw_body: Mapped[str] = mapped_column(Text)
    payload_hash: Mapped[str] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(24), default='queued')
    request_id: Mapped[str | None] = mapped_column(String(128))
    receipt: Mapped[dict] = mapped_column(JSON, default=dict)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    available_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, index=True)
    error_code: Mapped[str] = mapped_column(String(80), default='')
    __table_args__ = (
        UniqueConstraint('school_id', 'charge_id', name='uq_crm_bridge_charge'),
        UniqueConstraint('connection_id', 'request_id', name='uq_crm_bridge_remote_request'),
    )


class CRMBridgeObservation(Record, Base):
    __tablename__ = 'crm_bridge_observations'
    school_id: Mapped[str] = mapped_column(ForeignKey('schools.id'), index=True)
    bridge_request_id: Mapped[str] = mapped_column(ForeignKey('crm_bridge_requests.id'), index=True)
    connection_id: Mapped[str] = mapped_column(String(64))
    event_id: Mapped[str] = mapped_column(String(36))
    payload_hash: Mapped[str] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(24))
    __table_args__ = (UniqueConstraint('connection_id', 'event_id', name='uq_crm_bridge_event'),)
