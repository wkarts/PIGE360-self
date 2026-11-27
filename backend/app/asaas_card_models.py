"""Checkout hospedado e autorização escolar para débitos por título."""
from datetime import date
from sqlalchemy import BigInteger, Date, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from .db import Base, Record
from .models import Scoped


class CardCheckout(Record, Scoped, Base):
    __tablename__ = 'asaas_card_checkouts'
    connection_id: Mapped[str] = mapped_column(ForeignKey('integration_connections.id'))
    charge_id: Mapped[str] = mapped_column(ForeignKey('bank_charges.id'), index=True)
    enrollment_id: Mapped[str] = mapped_column(ForeignKey('enrollments.id'))
    payer_id: Mapped[str] = mapped_column(ForeignKey('persons.id'))
    client_key: Mapped[str] = mapped_column(String(80))
    mode: Mapped[str] = mapped_column(String(24))
    max_installments: Mapped[int] = mapped_column(Integer)
    cycle: Mapped[str] = mapped_column(String(24), default='')
    ends_on: Mapped[date | None] = mapped_column(Date)
    first_due: Mapped[date] = mapped_column(Date)
    quote: Mapped[dict] = mapped_column(JSON)
    environment: Mapped[str] = mapped_column(String(16))
    remote_id: Mapped[str | None] = mapped_column(String(160))
    subscription_id: Mapped[str | None] = mapped_column(String(160))
    installment_id: Mapped[str | None] = mapped_column(String(160))
    status: Mapped[str] = mapped_column(String(32), default='creating')
    refunds: Mapped[dict] = mapped_column(JSON, default=dict)
    transactions: Mapped[list] = mapped_column(JSON, default=list)
    __table_args__ = (UniqueConstraint('school_id','client_key'), UniqueConstraint('connection_id','remote_id'))


class CardMandate(Record, Scoped, Base):
    __tablename__ = 'asaas_card_mandates'
    checkout_id: Mapped[str] = mapped_column(ForeignKey('asaas_card_checkouts.id'), unique=True)
    user_id: Mapped[str] = mapped_column(ForeignKey('users.id'))
    customer_id: Mapped[str] = mapped_column(String(160))
    sealed_token: Mapped[str] = mapped_column(Text)
    terms_version: Mapped[str] = mapped_column(String(32))
    limit_cents: Mapped[int] = mapped_column(BigInteger)
    ends_on: Mapped[date] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(24), default='active')
