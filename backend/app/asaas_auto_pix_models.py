"""Vínculos locais do Pix Automático. O QR é guardado com a chave das integrações."""
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from .db import Base, Record
from .models import Scoped


class PixAuthorization(Record, Scoped, Base):
    __tablename__ = 'asaas_pix_authorizations'
    connection_id: Mapped[str] = mapped_column(ForeignKey('integration_connections.id'))
    credential_scope: Mapped[str] = mapped_column(String(64))
    charge_id: Mapped[str] = mapped_column(ForeignKey('bank_charges.id'), index=True)
    enrollment_id: Mapped[str] = mapped_column(ForeignKey('enrollments.id'))
    payer_id: Mapped[str] = mapped_column(ForeignKey('persons.id'))
    consent_user_id: Mapped[str] = mapped_column(ForeignKey('users.id'))
    terms_version: Mapped[str] = mapped_column(String(40))
    quote: Mapped[str] = mapped_column(String(64))
    customer_id: Mapped[str] = mapped_column(String(160))
    contract_id: Mapped[str] = mapped_column(String(35), unique=True)
    frequency: Mapped[str] = mapped_column(String(20))
    start_date: Mapped[date] = mapped_column(Date)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    status: Mapped[str] = mapped_column(String(24), index=True)
    remote_id: Mapped[str | None] = mapped_column(String(128))
    conciliation: Mapped[str | None] = mapped_column(String(128))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    encrypted_qr: Mapped[str] = mapped_column(Text, default='')
    scan_offset: Mapped[int] = mapped_column(default=0)
    terminal_scan_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    __table_args__ = (UniqueConstraint('connection_id','remote_id'), UniqueConstraint('connection_id','conciliation'))


class PixCycle(Record, Scoped, Base):
    __tablename__ = 'asaas_pix_cycles'
    authorization_id: Mapped[str] = mapped_column(ForeignKey('asaas_pix_authorizations.id'), index=True)
    charge_id: Mapped[str] = mapped_column(ForeignKey('bank_charges.id'), unique=True)
    cycle: Mapped[int]
    due_on: Mapped[date] = mapped_column(Date)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    status: Mapped[str] = mapped_column(String(24), index=True)
    previous_payment_id: Mapped[str | None] = mapped_column(String(160))
    payment_id: Mapped[str | None] = mapped_column(String(160))
    instruction_status: Mapped[str] = mapped_column(String(24), default='')
    __table_args__ = (UniqueConstraint('authorization_id', 'cycle'),)
