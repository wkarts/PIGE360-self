from sqlalchemy import LargeBinary
from datetime import date, datetime
from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text, JSON, UniqueConstraint, CheckConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column
from .db import Base, Record, now

class Installation(Base):
    __tablename__ = 'installation'
    id: Mapped[int] = mapped_column(primary_key=True)
    configured: Mapped[bool] = mapped_column(Boolean, default=False)
    configured_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

class EmbeddingSettings(Base):
    __tablename__ = 'installation_embedding'
    id: Mapped[int] = mapped_column(primary_key=True)
    configured: Mapped[bool] = mapped_column(Boolean, default=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    allowed_origins: Mapped[list] = mapped_column(JSON, default=list)
    version: Mapped[int] = mapped_column(Integer, default=1)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)

class Company(Record, Base):
    __tablename__ = 'companies'
    name: Mapped[str] = mapped_column(String(160))
    document: Mapped[str | None] = mapped_column(String(24))
    trade_name: Mapped[str] = mapped_column(String(180), default='')
    address: Mapped[str] = mapped_column(String(400), default='')
    phone: Mapped[str] = mapped_column(String(32), default='')
    email: Mapped[str] = mapped_column(String(254), default='')
    postal_code: Mapped[str] = mapped_column(String(16), default='')
    street: Mapped[str] = mapped_column(String(180), default='')
    address_number: Mapped[str] = mapped_column(String(24), default='')
    address_complement: Mapped[str] = mapped_column(String(120), default='')
    district: Mapped[str] = mapped_column(String(120), default='')
    city: Mapped[str] = mapped_column(String(120), default='')
    state: Mapped[str] = mapped_column(String(2), default='')
    country: Mapped[str] = mapped_column(String(80), default='Brasil')
    registration_status: Mapped[str] = mapped_column(String(60), default='')
    opened_on: Mapped[str] = mapped_column(String(30), default='')
    legal_nature: Mapped[str] = mapped_column(String(180), default='')
    main_activity: Mapped[str] = mapped_column(String(180), default='')

class CompanySupportSettings(Record, Base):
    """Configuração do widget de suporte por empresa/tenant."""
    __tablename__ = 'company_support_settings'
    company_id: Mapped[str] = mapped_column(ForeignKey('companies.id'), index=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    base_url: Mapped[str] = mapped_column(String(500), default='')
    position: Mapped[str] = mapped_column(String(16), default='left')
    widget_type: Mapped[str] = mapped_column(String(40), default='expanded_bubble')
    launcher_title: Mapped[str] = mapped_column(String(80), default='Suporte')
    encrypted_token: Mapped[str] = mapped_column(Text, default='')
    __table_args__ = (
        UniqueConstraint('company_id', name='uq_company_support_settings_company_id'),
        CheckConstraint("position IN ('left','right')", name='support_hub_position'),
    )


class School(Record, Base):
    __tablename__ = 'schools'
    company_id: Mapped[str] = mapped_column(ForeignKey('companies.id'))
    name: Mapped[str] = mapped_column(String(160))
    address: Mapped[str] = mapped_column(String(400), default='')
    phone: Mapped[str] = mapped_column(String(32), default='')
    email: Mapped[str] = mapped_column(String(254), default='')
    document_policy: Mapped[str] = mapped_column(String(16), default='warn')
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    __table_args__ = (CheckConstraint("document_policy IN ('warn','block')", name='document_policy'),)

class User(Record, Base):
    __tablename__ = 'users'
    name: Mapped[str] = mapped_column(String(160))
    email: Mapped[str] = mapped_column(String(254), unique=True)
    password_hash: Mapped[str] = mapped_column(String(512))
    role: Mapped[str] = mapped_column(String(32), default='secretary')
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    # Perfis de autoatendimento apontam para a pessoa correspondente.
    person_id: Mapped[str | None] = mapped_column(ForeignKey('persons.id'), index=True)
    __table_args__ = (CheckConstraint(
        "role IN ('admin','direction','coordination','secretary','teacher','student','guardian','viewer')",
        name='valid_role'
    ),)

class UserProfile(Base):
    __tablename__ = 'user_profiles'
    user_id: Mapped[str] = mapped_column(ForeignKey('users.id'), primary_key=True)
    phone: Mapped[str] = mapped_column(String(32), default='')
    job_title: Mapped[str] = mapped_column(String(120), default='')
    department: Mapped[str] = mapped_column(String(120), default='')
    bio: Mapped[str] = mapped_column(String(1000), default='')
    photo: Mapped[bytes | None] = mapped_column(LargeBinary, deferred=True)
    photo_hash: Mapped[str] = mapped_column(String(64), default='')


class SchoolAccess(Base):
    __tablename__ = 'school_access'
    user_id: Mapped[str] = mapped_column(ForeignKey('users.id'), primary_key=True)
    school_id: Mapped[str] = mapped_column(ForeignKey('schools.id'), primary_key=True)

class AuthSession(Record, Base):
    __tablename__ = 'auth_sessions'
    user_id: Mapped[str] = mapped_column(ForeignKey('users.id'), index=True)
    token_hash: Mapped[str] = mapped_column(String(64))
    previous_hash: Mapped[str | None] = mapped_column(String(64))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    mfa_verified: Mapped[bool] = mapped_column(Boolean, default=False)

class LoginAttempt(Base):
    __tablename__ = 'login_attempts'
    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    count: Mapped[int] = mapped_column(Integer, default=0)
    window_started: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class Scoped:
    school_id: Mapped[str] = mapped_column(ForeignKey('schools.id'), index=True)

class Unit(Record, Scoped, Base):
    __tablename__ = 'units'
    name: Mapped[str] = mapped_column(String(160))
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    __table_args__ = (UniqueConstraint('school_id', 'name'),)

class AcademicYear(Record, Scoped, Base):
    __tablename__ = 'academic_years'
    name: Mapped[str] = mapped_column(String(40))
    starts_on: Mapped[date] = mapped_column(Date)
    ends_on: Mapped[date] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(16), default='active')
    __table_args__ = (UniqueConstraint('school_id', 'name'), CheckConstraint('ends_on >= starts_on', name='year_dates'))

class Grade(Record, Scoped, Base):
    __tablename__ = 'grades'
    name: Mapped[str] = mapped_column(String(100))
    level: Mapped[str] = mapped_column(String(100), default='Educação básica')
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    __table_args__ = (UniqueConstraint('school_id', 'name'),)

class Shift(Record, Scoped, Base):
    __tablename__ = 'shifts'
    name: Mapped[str] = mapped_column(String(80))
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    __table_args__ = (UniqueConstraint('school_id', 'name'),)

class ClassGroup(Record, Scoped, Base):
    __tablename__ = 'class_groups'
    name: Mapped[str] = mapped_column(String(120))
    unit_id: Mapped[str] = mapped_column(ForeignKey('units.id'))
    academic_year_id: Mapped[str] = mapped_column(ForeignKey('academic_years.id'))
    grade_id: Mapped[str] = mapped_column(ForeignKey('grades.id'))
    shift_id: Mapped[str] = mapped_column(ForeignKey('shifts.id'))
    capacity: Mapped[int] = mapped_column(Integer, default=30)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    __table_args__ = (UniqueConstraint('school_id', 'academic_year_id', 'unit_id', 'name'), CheckConstraint('capacity > 0', name='positive_capacity'))

class TeacherAssignment(Record, Scoped, Base):
    __tablename__ = 'teacher_assignments'
    teacher_user_id: Mapped[str | None] = mapped_column(ForeignKey('users.id'), index=True)
    # A docente pode existir no cadastro de pessoas antes de receber acesso.
    # teacher_user_id permanece para compatibilidade com instalações anteriores.
    teacher_person_id: Mapped[str | None] = mapped_column(ForeignKey('persons.id'), index=True)
    class_group_id: Mapped[str] = mapped_column(ForeignKey('class_groups.id'), index=True)
    academic_year_id: Mapped[str] = mapped_column(ForeignKey('academic_years.id'), index=True)
    subject_name: Mapped[str] = mapped_column(String(120), default='')
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    __table_args__ = (
        UniqueConstraint('school_id', 'teacher_user_id', 'class_group_id', 'academic_year_id', 'subject_name'),
    )


class Person(Record, Scoped, Base):
    __tablename__ = 'persons'
    name: Mapped[str] = mapped_column(String(180), index=True)
    social_name: Mapped[str] = mapped_column(String(180), default='')
    cpf: Mapped[str | None] = mapped_column(String(11))
    birth_date: Mapped[date | None] = mapped_column(Date)
    email: Mapped[str] = mapped_column(String(254), default='')
    phone: Mapped[str] = mapped_column(String(32), default='')
    address: Mapped[str] = mapped_column(String(400), default='')
    notes: Mapped[str] = mapped_column(Text, default='')
    is_guardian: Mapped[bool] = mapped_column(Boolean, default=False)
    rg: Mapped[str] = mapped_column(String(40), default='', index=True)
    rg_issuer: Mapped[str] = mapped_column(String(80), default='')
    rg_state: Mapped[str] = mapped_column(String(2), default='')
    rg_issued_on: Mapped[date | None] = mapped_column(Date)
    birth_certificate: Mapped[str] = mapped_column(String(80), default='')
    birth_city: Mapped[str] = mapped_column(String(120), default='')
    birth_state: Mapped[str] = mapped_column(String(2), default='')
    nationality: Mapped[str] = mapped_column(String(80), default='')
    sex: Mapped[str] = mapped_column(String(32), default='')
    gender: Mapped[str] = mapped_column(String(80), default='')
    race_color: Mapped[str] = mapped_column(String(80), default='')
    marital_status: Mapped[str] = mapped_column(String(40), default='')
    mother_name: Mapped[str] = mapped_column(String(180), default='')
    father_name: Mapped[str] = mapped_column(String(180), default='')
    phone_secondary: Mapped[str] = mapped_column(String(32), default='')
    postal_code: Mapped[str] = mapped_column(String(16), default='')
    street: Mapped[str] = mapped_column(String(180), default='')
    address_number: Mapped[str] = mapped_column(String(24), default='')
    address_complement: Mapped[str] = mapped_column(String(120), default='')
    district: Mapped[str] = mapped_column(String(120), default='')
    city: Mapped[str] = mapped_column(String(120), default='')
    state: Mapped[str] = mapped_column(String(2), default='')
    country: Mapped[str] = mapped_column(String(80), default='Brasil')
    occupation: Mapped[str] = mapped_column(String(120), default='')
    employer: Mapped[str] = mapped_column(String(180), default='')
    education: Mapped[str] = mapped_column(String(100), default='')
    emergency_contact_name: Mapped[str] = mapped_column(String(180), default='')
    emergency_contact_phone: Mapped[str] = mapped_column(String(32), default='')
    photo_file_id: Mapped[str | None] = mapped_column(ForeignKey('files.id'))
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    entity_kind: Mapped[str] = mapped_column(String(16), default='individual', server_default='individual')
    cnpj: Mapped[str | None] = mapped_column(String(14))
    trade_name: Mapped[str] = mapped_column(String(180), default='', server_default='')
    state_registration: Mapped[str] = mapped_column(String(40), default='', server_default='')
    municipal_registration: Mapped[str] = mapped_column(String(40), default='', server_default='')
    registration_status: Mapped[str] = mapped_column(String(60), default='')
    opened_on: Mapped[str] = mapped_column(String(30), default='')
    legal_nature: Mapped[str] = mapped_column(String(180), default='')
    main_activity: Mapped[str] = mapped_column(String(180), default='')
    __table_args__ = (UniqueConstraint('school_id', 'cpf'),
                      Index('uq_persons_school_cnpj', 'school_id', 'cnpj', unique=True))


class TeacherProfile(Record, Scoped, Base):
    """Dados profissionais do docente, separados de autenticação e usuário."""
    __tablename__ = 'teacher_profiles'
    person_id: Mapped[str] = mapped_column(ForeignKey('persons.id'), unique=True)
    registration_number: Mapped[str] = mapped_column(String(40), default='')
    professional_registration: Mapped[str] = mapped_column(String(80), default='')
    employment_type: Mapped[str] = mapped_column(String(32), default='other')
    employment_status: Mapped[str] = mapped_column(String(24), default='active')
    admission_date: Mapped[date | None] = mapped_column(Date)
    termination_date: Mapped[date | None] = mapped_column(Date)
    inep_code: Mapped[str] = mapped_column(String(32), default='')
    education_institution: Mapped[str] = mapped_column(String(180), default='')
    degree_course: Mapped[str] = mapped_column(String(180), default='')
    specialization: Mapped[str] = mapped_column(Text, default='')
    teaching_areas: Mapped[str] = mapped_column(Text, default='')
    workload_hours: Mapped[int] = mapped_column(Integer, default=0)
    profile_notes: Mapped[str] = mapped_column(Text, default='')


class EmployeeProfile(Record, Scoped, Base):
    """Dados funcionais do colaborador, separados de autenticação e usuário."""
    __tablename__ = 'employee_profiles'
    person_id: Mapped[str] = mapped_column(ForeignKey('persons.id'), unique=True)
    employee_number: Mapped[str] = mapped_column(String(40), default='')
    employment_type: Mapped[str] = mapped_column(String(32), default='other')
    employment_status: Mapped[str] = mapped_column(String(24), default='active')
    admission_date: Mapped[date | None] = mapped_column(Date)
    termination_date: Mapped[date | None] = mapped_column(Date)
    department: Mapped[str] = mapped_column(String(120), default='')
    job_title: Mapped[str] = mapped_column(String(160), default='')
    work_schedule: Mapped[str] = mapped_column(String(160), default='')
    supervisor_name: Mapped[str] = mapped_column(String(180), default='')
    profile_notes: Mapped[str] = mapped_column(Text, default='')

class PersonTypeLink(Record, Scoped, Base):
    __tablename__ = 'person_type_links'
    person_id: Mapped[str] = mapped_column(ForeignKey('persons.id'), index=True)
    type_code: Mapped[str] = mapped_column(String(40), index=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    notes: Mapped[str] = mapped_column(Text, default='')
    details: Mapped[dict] = mapped_column(JSON, default=dict, server_default='{}')
    __table_args__ = (
        UniqueConstraint('school_id', 'person_id', 'type_code'),
    )


class Student(Record, Scoped, Base):
    __tablename__ = 'students'
    person_id: Mapped[str] = mapped_column(ForeignKey('persons.id'), unique=True)
    number: Mapped[str] = mapped_column(String(32))
    previous_school: Mapped[str] = mapped_column(String(180), default='')
    nis: Mapped[str] = mapped_column(String(32), default='')
    sus_card: Mapped[str] = mapped_column(String(32), default='')
    inep_code: Mapped[str] = mapped_column(String(32), default='')
    health_plan: Mapped[str] = mapped_column(String(120), default='')
    allergies: Mapped[str] = mapped_column(Text, default='')
    medications: Mapped[str] = mapped_column(Text, default='')
    health_notes: Mapped[str] = mapped_column(Text, default='')
    special_needs: Mapped[str] = mapped_column(Text, default='')
    authorized_transport: Mapped[str] = mapped_column(String(120), default='')
    student_notes: Mapped[str] = mapped_column(Text, default='')
    status: Mapped[str] = mapped_column(String(20), default='active')
    __table_args__ = (UniqueConstraint('school_id', 'number'),)

class GuardianLink(Record, Scoped, Base):
    __tablename__ = 'student_guardians'
    student_id: Mapped[str] = mapped_column(ForeignKey('students.id'), index=True)
    person_id: Mapped[str] = mapped_column(ForeignKey('persons.id'))
    relationship: Mapped[str] = mapped_column(String(60), default='Responsável')
    legal: Mapped[bool] = mapped_column(Boolean, default=False)
    financial: Mapped[bool] = mapped_column(Boolean, default=False)
    pickup: Mapped[bool] = mapped_column(Boolean, default=False)
    primary_contact: Mapped[bool] = mapped_column(Boolean, default=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    __table_args__ = (UniqueConstraint('student_id', 'person_id'),)

class Enrollment(Record, Scoped, Base):
    __tablename__ = 'enrollments'
    student_id: Mapped[str] = mapped_column(ForeignKey('students.id'), index=True)
    academic_year_id: Mapped[str] = mapped_column(ForeignKey('academic_years.id'))
    class_group_id: Mapped[str] = mapped_column(ForeignKey('class_groups.id'))
    number: Mapped[str] = mapped_column(String(40))
    enrolled_on: Mapped[date] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(32), default='draft')
    financial_person_id: Mapped[str | None] = mapped_column(ForeignKey('persons.id'))
    previous_enrollment_id: Mapped[str | None] = mapped_column(ForeignKey('enrollments.id'))
    activation_key: Mapped[str | None] = mapped_column(String(160), unique=True)
    enrollment_type: Mapped[str] = mapped_column(String(24), default='new')
    origin_school: Mapped[str] = mapped_column(String(180), default='')
    origin_city: Mapped[str] = mapped_column(String(120), default='')
    entry_reason: Mapped[str] = mapped_column(String(1000), default='')
    external_reference: Mapped[str] = mapped_column(String(120), default='')
    notes: Mapped[str] = mapped_column(Text, default='')
    __table_args__ = (UniqueConstraint('school_id', 'number'), CheckConstraint("status IN ('draft','active','suspended','transferred','cancelled','completed')", name='enrollment_status'))

class EnrollmentEvent(Record, Scoped, Base):
    __tablename__ = 'enrollment_events'
    enrollment_id: Mapped[str] = mapped_column(ForeignKey('enrollments.id'), index=True)
    action: Mapped[str] = mapped_column(String(32))
    reason: Mapped[str] = mapped_column(String(1000))
    before: Mapped[dict] = mapped_column(JSON, default=dict)
    after: Mapped[dict] = mapped_column(JSON, default=dict)
    actor_id: Mapped[str] = mapped_column(ForeignKey('users.id'))

class DocumentType(Record, Scoped, Base):
    __tablename__ = 'document_types'
    name: Mapped[str] = mapped_column(String(120))
    required: Mapped[bool] = mapped_column(Boolean, default=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    grade_id: Mapped[str | None] = mapped_column(ForeignKey('grades.id'))
    __table_args__ = (UniqueConstraint('school_id', 'name'),)

class FileRecord(Record, Scoped, Base):
    __tablename__ = 'files'
    original_name: Mapped[str] = mapped_column(String(240))
    storage_key: Mapped[str] = mapped_column(String(200), unique=True)
    mime_type: Mapped[str] = mapped_column(String(100))
    size: Mapped[int] = mapped_column(Integer)
    sha256: Mapped[str] = mapped_column(String(64))
    storage_backend: Mapped[str] = mapped_column(String(16), default='local')
    bucket_name: Mapped[str] = mapped_column(String(160), default='')
    file_kind: Mapped[str] = mapped_column(String(24), default='document')
    created_by: Mapped[str] = mapped_column(ForeignKey('users.id'))

class StudentDocument(Record, Scoped, Base):
    __tablename__ = 'student_documents'
    student_id: Mapped[str] = mapped_column(ForeignKey('students.id'), index=True)
    document_type_id: Mapped[str] = mapped_column(ForeignKey('document_types.id'))
    file_id: Mapped[str | None] = mapped_column(ForeignKey('files.id'))
    status: Mapped[str] = mapped_column(String(20), default='received')
    expires_on: Mapped[date | None] = mapped_column(Date)
    notes: Mapped[str] = mapped_column(Text, default='')
    validated_by: Mapped[str | None] = mapped_column(ForeignKey('users.id'))
    __table_args__ = (CheckConstraint("status IN ('received','validated','rejected','waived','archived')", name='document_status'),)

class IssuedDocument(Record, Scoped, Base):
    __tablename__ = 'issued_documents'
    student_id: Mapped[str] = mapped_column(ForeignKey('students.id'), index=True)
    enrollment_id: Mapped[str | None] = mapped_column(ForeignKey('enrollments.id'))
    kind: Mapped[str] = mapped_column(String(40))
    file_id: Mapped[str] = mapped_column(ForeignKey('files.id'))
    template_version: Mapped[str] = mapped_column(String(20), default='1')
    snapshot: Mapped[dict] = mapped_column(JSON)
    created_by: Mapped[str] = mapped_column(ForeignKey('users.id'))

class Protocol(Record, Scoped, Base):
    __tablename__ = 'protocols'
    number: Mapped[str] = mapped_column(String(40))
    student_id: Mapped[str | None] = mapped_column(ForeignKey('students.id'))
    kind: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(Text, default='')
    status: Mapped[str] = mapped_column(String(24), default='open')
    due_on: Mapped[date | None] = mapped_column(Date)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    __table_args__ = (UniqueConstraint('school_id', 'number'),)

class AuditEvent(Record, Base):
    __tablename__ = 'audit_events'
    school_id: Mapped[str | None] = mapped_column(ForeignKey('schools.id'), index=True)
    actor_id: Mapped[str | None] = mapped_column(ForeignKey('users.id'))
    action: Mapped[str] = mapped_column(String(80))
    entity_type: Mapped[str] = mapped_column(String(60))
    entity_id: Mapped[str] = mapped_column(String(64))
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    request_id: Mapped[str] = mapped_column(String(64), default='')
    ip: Mapped[str] = mapped_column(String(64), default='')

class Sequence(Base):
    __tablename__ = 'number_sequences'
    key: Mapped[str] = mapped_column(String(160), primary_key=True)
    value: Mapped[int] = mapped_column(Integer, default=0)


class ProtocolEvent(Record, Scoped, Base):
    """Histórico operacional imutável pela API, isolado por escola."""
    __tablename__ = 'protocol_events'
    protocol_id: Mapped[str] = mapped_column(ForeignKey('protocols.id'), index=True)
    actor_id: Mapped[str] = mapped_column(ForeignKey('users.id'))
    action: Mapped[str] = mapped_column(String(24))
    message: Mapped[str] = mapped_column(Text, default='')
    before: Mapped[dict] = mapped_column(JSON, default=dict)
    after: Mapped[dict] = mapped_column(JSON, default=dict)

# Registro das tabelas aditivas; os modelos anteriores permanecem inalterados.
from .online_models import (AdmissionCampaign, PortalAccount, PortalSession, PortalChallenge,
    Admission, AdmissionMessage, AdmissionAttachment, ConnectInstance, ConnectSchoolBinding, ConnectUnitBinding, ConnectMessageJob, IntegrationConnection,
    IntegrationJob, BankCharge, BankEvent, IntegrationWebhook)


class MFAPolicy(Base):
    __tablename__ = 'installation_mfa'
    id: Mapped[int] = mapped_column(primary_key=True)
    required: Mapped[bool] = mapped_column(Boolean, default=False)
    version: Mapped[int] = mapped_column(Integer, default=1)


class MFACredential(Base):
    __tablename__ = 'mfa_credentials'
    subject: Mapped[str] = mapped_column(String(80), primary_key=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    encrypted_secret: Mapped[str] = mapped_column(Text, default='')
    last_counter: Mapped[int] = mapped_column(Integer, default=-1)


class MFAChallenge(Record, Base):
    __tablename__ = 'mfa_challenges'
    subject: Mapped[str] = mapped_column(String(80), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    password_revision: Mapped[str] = mapped_column(String(64))
    policy_version: Mapped[int] = mapped_column(Integer)
    purpose: Mapped[str] = mapped_column(String(16))
    encrypted_secret: Mapped[str] = mapped_column(Text, default='')
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    failures: Mapped[int] = mapped_column(Integer, default=0)
    consumed: Mapped[bool] = mapped_column(Boolean, default=False)


class MFARecovery(Record, Base):
    __tablename__ = 'mfa_recovery_codes'
    subject: Mapped[str] = mapped_column(ForeignKey('mfa_credentials.subject'), index=True)
    code_hash: Mapped[str] = mapped_column(String(64), unique=True)

from .assisted_models import OcrJob, LookupCache, LookupProvider, AssistedQuota, IntakeSettings  # noqa: F401
