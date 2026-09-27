"""Admissões, portal de responsáveis e integrações. Tabelas aditivas da versão 0.3."""
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, JSON, Numeric, String, Text, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column
from .db import Base, Record
from .models import Scoped

class AdmissionCampaign(Record, Scoped, Base):
    __tablename__ = 'admission_campaigns'
    slug: Mapped[str] = mapped_column(String(80), unique=True)
    title: Mapped[str] = mapped_column(String(160))
    instructions: Mapped[str] = mapped_column(Text, default='')
    privacy_notice: Mapped[str] = mapped_column(Text)
    terms_version: Mapped[str] = mapped_column(String(40), default='1')
    class_group_ids: Mapped[list] = mapped_column(JSON, default=list)
    opens_on: Mapped[date] = mapped_column(Date)
    closes_on: Mapped[date] = mapped_column(Date)
    active: Mapped[bool] = mapped_column(Boolean, default=False)
    require_verified_contact: Mapped[bool] = mapped_column(Boolean, default=True)
    require_documents: Mapped[bool] = mapped_column(Boolean, default=False)
    require_payment_before_enrollment: Mapped[bool] = mapped_column(Boolean, default=False)
    __table_args__ = (CheckConstraint('closes_on >= opens_on', name='campaign_dates'),)

class PortalAccount(Record, Scoped, Base):
    __tablename__ = 'portal_accounts'
    email: Mapped[str] = mapped_column(String(254))
    password_hash: Mapped[str] = mapped_column(String(512))
    name: Mapped[str] = mapped_column(String(180))
    cpf: Mapped[str | None] = mapped_column(String(11))
    phone: Mapped[str] = mapped_column(String(24), default='')
    address: Mapped[str] = mapped_column(String(400), default='')
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    phone_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    whatsapp_opt_in: Mapped[bool] = mapped_column(Boolean, default=False)
    personal_details: Mapped[dict] = mapped_column(JSON, default=dict, server_default='{}')
    registration_consent: Mapped[dict] = mapped_column(JSON, default=dict)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    __table_args__ = (UniqueConstraint('school_id', 'email'),)

class PortalSession(Record, Base):
    __tablename__ = 'portal_sessions'
    account_id: Mapped[str] = mapped_column(ForeignKey('portal_accounts.id'), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    mfa_verified: Mapped[bool] = mapped_column(Boolean, default=False)

class PortalChallenge(Record, Base):
    __tablename__ = 'portal_challenges'
    account_id: Mapped[str] = mapped_column(ForeignKey('portal_accounts.id'), index=True)
    purpose: Mapped[str] = mapped_column(String(24))
    channel: Mapped[str] = mapped_column(String(16))
    code_hash: Mapped[str] = mapped_column(String(64))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    used: Mapped[bool] = mapped_column(Boolean, default=False)

class Admission(Record, Scoped, Base):
    __tablename__ = 'admissions'
    campaign_id: Mapped[str] = mapped_column(ForeignKey('admission_campaigns.id'), index=True)
    account_id: Mapped[str] = mapped_column(ForeignKey('portal_accounts.id'), index=True)
    number: Mapped[str] = mapped_column(String(40))
    client_key: Mapped[str] = mapped_column(String(80))
    class_group_id: Mapped[str] = mapped_column(ForeignKey('class_groups.id'))
    student_data: Mapped[dict] = mapped_column(JSON)
    guardian_snapshot: Mapped[dict] = mapped_column(JSON, default=dict)
    relationship: Mapped[str] = mapped_column(String(60), default='Responsável legal')
    notes: Mapped[str] = mapped_column(Text, default='')
    status: Mapped[str] = mapped_column(String(32), default='draft')
    consent: Mapped[dict] = mapped_column(JSON, default=dict)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    reviewed_by: Mapped[str | None] = mapped_column(ForeignKey('users.id'))
    student_id: Mapped[str | None] = mapped_column(ForeignKey('students.id'))
    enrollment_id: Mapped[str | None] = mapped_column(ForeignKey('enrollments.id'), unique=True)
    __table_args__ = (UniqueConstraint('school_id','number'), UniqueConstraint('account_id','client_key'), CheckConstraint("status IN ('draft','submitted','under_review','changes_requested','waitlisted','approved','enrolled','rejected','withdrawn')", name='admission_status'))

class AdmissionMessage(Record, Scoped, Base):
    __tablename__ = 'admission_messages'
    admission_id: Mapped[str] = mapped_column(ForeignKey('admissions.id'), index=True)
    actor_id: Mapped[str | None] = mapped_column(ForeignKey('users.id'))
    account_id: Mapped[str | None] = mapped_column(ForeignKey('portal_accounts.id'))
    kind: Mapped[str] = mapped_column(String(32), default='message')
    text: Mapped[str] = mapped_column(Text)
    internal: Mapped[bool] = mapped_column(Boolean, default=False)

class AdmissionAttachment(Record, Scoped, Base):
    __tablename__ = 'admission_attachments'
    admission_id: Mapped[str] = mapped_column(ForeignKey('admissions.id'), index=True)
    document_type_id: Mapped[str] = mapped_column(ForeignKey('document_types.id'))
    original_name: Mapped[str] = mapped_column(String(240))
    storage_key: Mapped[str] = mapped_column(String(200), unique=True)
    mime_type: Mapped[str] = mapped_column(String(100))
    size: Mapped[int] = mapped_column(Integer)
    sha256: Mapped[str] = mapped_column(String(64))
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    review_status: Mapped[str] = mapped_column(String(20), default='received')
    review_note: Mapped[str] = mapped_column(Text, default='')
    student_document_id: Mapped[str | None] = mapped_column(ForeignKey('student_documents.id'))

class ConnectInstance(Record, Base):
    """Instância global da Connect API vinculada à empresa/tenant."""
    __tablename__ = 'connect_instances'
    company_id: Mapped[str] = mapped_column(ForeignKey('companies.id'), index=True)
    name: Mapped[str] = mapped_column(String(100))
    display_name: Mapped[str] = mapped_column(String(160), default='')
    document: Mapped[str] = mapped_column(String(14), default='')
    primary: Mapped[bool] = mapped_column(Boolean, default=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    status: Mapped[str] = mapped_column(String(24), default='created')
    connection_state: Mapped[str] = mapped_column(String(24), default='')
    external_id: Mapped[str] = mapped_column(String(160), default='')
    phone: Mapped[str] = mapped_column(String(24), default='')
    source: Mapped[str] = mapped_column(String(16), default='pige360')
    last_error: Mapped[str] = mapped_column(String(240), default='')
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    __table_args__ = (
        UniqueConstraint('company_id', 'name', name='uq_connect_instances_company_name'),
        CheckConstraint("status IN ('creating','created','connecting','open','close','error','deleted')", name='connect_instance_status'),
        CheckConstraint("source IN ('pige360','adopted')", name='connect_instance_source'),
    )


class ConnectSchoolBinding(Base):
    __tablename__ = 'connect_school_bindings'
    school_id: Mapped[str] = mapped_column(ForeignKey('schools.id'), primary_key=True)
    instance_id: Mapped[str] = mapped_column(ForeignKey('connect_instances.id'), index=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ConnectUnitBinding(Base):
    __tablename__ = 'connect_unit_bindings'
    unit_id: Mapped[str] = mapped_column(ForeignKey('units.id'), primary_key=True)
    instance_id: Mapped[str] = mapped_column(ForeignKey('connect_instances.id'), index=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ConnectMessageJob(Record, Scoped, Base):
    """Fila de mensagens da Connect API; não compartilha a fila financeira."""
    __tablename__ = 'connect_message_jobs'
    instance_id: Mapped[str] = mapped_column(ForeignKey('connect_instances.id'), index=True)
    kind: Mapped[str] = mapped_column(String(24), default='text')
    dedupe_key: Mapped[str] = mapped_column(String(180), unique=True)
    encrypted_payload: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(24), default='pending', index=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    available_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    lease_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error_code: Mapped[str] = mapped_column(String(80), default='')
    remote_id: Mapped[str] = mapped_column(String(160), default='')
    delivery_status: Mapped[str] = mapped_column(String(32), default='')
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class IntegrationConnection(Record, Scoped, Base):
    __tablename__ = 'integration_connections'
    provider: Mapped[str] = mapped_column(String(24))
    enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    environment: Mapped[str] = mapped_column(String(16), default='sandbox')
    config: Mapped[dict] = mapped_column(JSON, default=dict)
    encrypted_secrets: Mapped[str] = mapped_column(Text, default='')
    last_test_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_test_ok: Mapped[bool | None] = mapped_column(Boolean)
    __table_args__ = (UniqueConstraint('school_id','provider'), CheckConstraint("provider IN ('connect_api','asaas')", name='integration_provider'))

class IntegrationJob(Record, Scoped, Base):
    __tablename__ = 'integration_jobs'
    connection_id: Mapped[str | None] = mapped_column(ForeignKey('integration_connections.id'))
    kind: Mapped[str] = mapped_column(String(32))
    dedupe_key: Mapped[str] = mapped_column(String(180), unique=True)
    encrypted_payload: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(24), default='pending', index=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    available_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    lease_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error_code: Mapped[str] = mapped_column(String(80), default='')
    remote_id: Mapped[str] = mapped_column(String(160), default='')
    delivery_status: Mapped[str] = mapped_column(String(32), default='')
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

class BankCharge(Record, Scoped, Base):
    __tablename__ = 'bank_charges'
    connection_id: Mapped[str] = mapped_column(ForeignKey('integration_connections.id'))
    admission_id: Mapped[str | None] = mapped_column(ForeignKey('admissions.id'), index=True)
    enrollment_id: Mapped[str | None] = mapped_column(ForeignKey('enrollments.id'), index=True)
    account_id: Mapped[str | None] = mapped_column(ForeignKey('portal_accounts.id'))
    payer_snapshot: Mapped[dict] = mapped_column(JSON)
    description: Mapped[str] = mapped_column(String(500))
    amount: Mapped[Decimal] = mapped_column(Numeric(12,2))
    due_on: Mapped[date] = mapped_column(Date)
    billing_type: Mapped[str] = mapped_column(String(16))
    required_for_enrollment: Mapped[bool] = mapped_column(Boolean, default=False)
    external_reference: Mapped[str] = mapped_column(String(160), unique=True)
    client_key: Mapped[str] = mapped_column(String(80))
    status: Mapped[str] = mapped_column(String(32), default='queued', index=True)
    remote_customer_id: Mapped[str] = mapped_column(String(160), default='')
    remote_payment_id: Mapped[str | None] = mapped_column(String(160))
    customer_attempted: Mapped[bool] = mapped_column(Boolean, default=False)
    payment_attempted: Mapped[bool] = mapped_column(Boolean, default=False)
    invoice_url: Mapped[str] = mapped_column(Text, default='')
    bank_slip_url: Mapped[str] = mapped_column(Text, default='')
    pix_copy_paste: Mapped[str] = mapped_column(Text, default='')
    pix_image: Mapped[str] = mapped_column(Text, default='')
    pix_expires_at: Mapped[str] = mapped_column(String(60), default='')
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_by: Mapped[str] = mapped_column(ForeignKey('users.id'))
    __table_args__ = (UniqueConstraint('school_id','client_key'), UniqueConstraint('connection_id','remote_payment_id'), CheckConstraint('amount > 0', name='charge_amount'), CheckConstraint("billing_type IN ('PIX','BOLETO')", name='charge_type'))

class BankEvent(Record, Scoped, Base):
    __tablename__ = 'bank_events'
    charge_id: Mapped[str] = mapped_column(ForeignKey('bank_charges.id'), index=True)
    source: Mapped[str] = mapped_column(String(32))
    previous_status: Mapped[str] = mapped_column(String(32))
    status: Mapped[str] = mapped_column(String(32))
    details: Mapped[dict] = mapped_column(JSON, default=dict)

class IntegrationWebhook(Record, Scoped, Base):
    __tablename__ = 'integration_webhooks'
    connection_id: Mapped[str] = mapped_column(ForeignKey('integration_connections.id'))
    event_id: Mapped[str] = mapped_column(String(200))
    event_type: Mapped[str] = mapped_column(String(80))
    payload_hash: Mapped[str] = mapped_column(String(64))
    remote_id: Mapped[str] = mapped_column(String(160), default='')
    status: Mapped[str] = mapped_column(String(32), default='received')
    __table_args__ = (UniqueConstraint('connection_id','event_id'),)
