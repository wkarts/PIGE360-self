"""Modelos do Diário Escolar Digital.

Estrutura aditiva: reutiliza escola, turma, matrícula, pessoa e atribuição docente.
"""
from datetime import date, datetime
from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, ForeignKey, Integer, JSON, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base, Record
from .models import Scoped


class AcademicPeriod(Record, Scoped, Base):
    __tablename__ = "academic_periods"
    academic_year_id: Mapped[str] = mapped_column(ForeignKey("academic_years.id"), index=True)
    name: Mapped[str] = mapped_column(String(80))
    starts_on: Mapped[date] = mapped_column(Date)
    ends_on: Mapped[date] = mapped_column(Date)
    order_index: Mapped[int] = mapped_column(Integer, default=1)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    __table_args__ = (
        UniqueConstraint("school_id", "academic_year_id", "name", name="uq_academic_period_name"),
        CheckConstraint("ends_on >= starts_on", name="academic_period_dates"),
        CheckConstraint("order_index > 0", name="academic_period_order"),
    )


class CurriculumComponent(Record, Scoped, Base):
    __tablename__ = "curriculum_components"
    name: Mapped[str] = mapped_column(String(120))
    code: Mapped[str] = mapped_column(String(40), default="")
    workload_hours: Mapped[int] = mapped_column(Integer, default=0)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    __table_args__ = (
        UniqueConstraint("school_id", "name", name="uq_curriculum_component_name"),
        CheckConstraint("workload_hours >= 0", name="curriculum_component_workload"),
    )


class CurriculumPlan(Record, Scoped, Base):
    __tablename__ = "curriculum_plans"
    class_group_id: Mapped[str] = mapped_column(ForeignKey("class_groups.id"), index=True)
    component_id: Mapped[str] = mapped_column(ForeignKey("curriculum_components.id"), index=True)
    academic_period_id: Mapped[str | None] = mapped_column(ForeignKey("academic_periods.id"), index=True)
    teacher_assignment_id: Mapped[str | None] = mapped_column(ForeignKey("teacher_assignments.id"), index=True)
    objectives: Mapped[str] = mapped_column(Text, default="")
    thematic_units: Mapped[str] = mapped_column(Text, default="")
    knowledge_objects: Mapped[str] = mapped_column(Text, default="")
    bncc_references: Mapped[list] = mapped_column(JSON, default=list)
    methodology: Mapped[str] = mapped_column(Text, default="")
    resources: Mapped[str] = mapped_column(Text, default="")
    assessment_strategy: Mapped[str] = mapped_column(Text, default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(16), default="draft")
    __table_args__ = (
        UniqueConstraint("school_id", "class_group_id", "component_id", "academic_period_id", name="uq_curriculum_plan_scope"),
        CheckConstraint("status IN ('draft','published','archived')", name="curriculum_plan_status"),
    )


class SchoolDiary(Record, Scoped, Base):
    __tablename__ = "school_diaries"
    class_group_id: Mapped[str] = mapped_column(ForeignKey("class_groups.id"), index=True)
    academic_year_id: Mapped[str] = mapped_column(ForeignKey("academic_years.id"), index=True)
    component_id: Mapped[str] = mapped_column(ForeignKey("curriculum_components.id"), index=True)
    teacher_assignment_id: Mapped[str | None] = mapped_column(ForeignKey("teacher_assignments.id"), index=True)
    status: Mapped[str] = mapped_column(String(16), default="open")
    notes: Mapped[str] = mapped_column(Text, default="")
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    closed_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    __table_args__ = (
        UniqueConstraint("school_id", "class_group_id", "component_id", name="uq_school_diary_scope"),
        CheckConstraint("status IN ('draft','open','submitted','reviewed','closed')", name="school_diary_status"),
    )


class DiaryLesson(Record, Scoped, Base):
    __tablename__ = "diary_lessons"
    diary_id: Mapped[str] = mapped_column(ForeignKey("school_diaries.id"), index=True)
    academic_period_id: Mapped[str | None] = mapped_column(ForeignKey("academic_periods.id"), index=True)
    lesson_date: Mapped[date] = mapped_column(Date, index=True)
    lesson_count: Mapped[int] = mapped_column(Integer, default=1)
    content: Mapped[str] = mapped_column(Text)
    skills: Mapped[str] = mapped_column(Text, default="")
    methodology: Mapped[str] = mapped_column(Text, default="")
    activities: Mapped[str] = mapped_column(Text, default="")
    homework: Mapped[str] = mapped_column(Text, default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    recorded_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    __table_args__ = (
        UniqueConstraint("diary_id", "lesson_date", name="uq_diary_lesson_date"),
        CheckConstraint("lesson_count > 0", name="diary_lesson_count"),
    )


class DiaryAttendance(Record, Scoped, Base):
    __tablename__ = "diary_attendance"
    lesson_id: Mapped[str] = mapped_column(ForeignKey("diary_lessons.id"), index=True)
    enrollment_id: Mapped[str] = mapped_column(ForeignKey("enrollments.id"), index=True)
    student_id: Mapped[str] = mapped_column(ForeignKey("students.id"), index=True)
    status: Mapped[str] = mapped_column(String(20), default="present")
    note: Mapped[str] = mapped_column(String(500), default="")
    recorded_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    __table_args__ = (
        UniqueConstraint("lesson_id", "enrollment_id", name="uq_diary_attendance_enrollment"),
        CheckConstraint("status IN ('present','absent','justified_absence')", name="diary_attendance_status"),
    )


class DiaryClosure(Record, Scoped, Base):
    __tablename__ = "diary_closures"
    diary_id: Mapped[str] = mapped_column(ForeignKey("school_diaries.id"), index=True)
    academic_period_id: Mapped[str | None] = mapped_column(ForeignKey("academic_periods.id"), index=True)
    snapshot: Mapped[dict] = mapped_column(JSON)
    snapshot_hash: Mapped[str] = mapped_column(String(64), index=True)
    reason: Mapped[str] = mapped_column(String(1000), default="")
    closed_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    closed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class DiaryRevision(Record, Scoped, Base):
    __tablename__ = "diary_revisions"
    diary_id: Mapped[str] = mapped_column(ForeignKey("school_diaries.id"), index=True)
    closure_id: Mapped[str | None] = mapped_column(ForeignKey("diary_closures.id"), index=True)
    reason: Mapped[str] = mapped_column(String(1000))
    reopened_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    reopened_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    previous_status: Mapped[str] = mapped_column(String(16))


class AssessmentInstrument(Record, Scoped, Base):
    __tablename__ = "assessment_instruments"
    diary_id: Mapped[str] = mapped_column(ForeignKey("school_diaries.id"), index=True)
    academic_period_id: Mapped[str | None] = mapped_column(ForeignKey("academic_periods.id"), index=True)
    title: Mapped[str] = mapped_column(String(160))
    kind: Mapped[str] = mapped_column(String(60), default="activity")
    assessment_date: Mapped[date] = mapped_column(Date)
    value_type: Mapped[str] = mapped_column(String(16), default="numeric")
    max_score: Mapped[float | None] = mapped_column(Numeric(10,2))
    weight: Mapped[float | None] = mapped_column(Numeric(10,4))
    description: Mapped[str] = mapped_column(Text, default="")
    skills: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(16), default="draft")
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    __table_args__ = (
        CheckConstraint("value_type IN ('numeric','concept')", name="assessment_value_type"),
        CheckConstraint("status IN ('draft','published','closed')", name="assessment_status"),
        CheckConstraint("max_score IS NULL OR max_score > 0", name="assessment_max_score"),
        CheckConstraint("weight IS NULL OR weight > 0", name="assessment_weight"),
    )


class AssessmentResult(Record, Scoped, Base):
    __tablename__ = "assessment_results"
    instrument_id: Mapped[str] = mapped_column(ForeignKey("assessment_instruments.id"), index=True)
    enrollment_id: Mapped[str] = mapped_column(ForeignKey("enrollments.id"), index=True)
    student_id: Mapped[str] = mapped_column(ForeignKey("students.id"), index=True)
    numeric_score: Mapped[float | None] = mapped_column(Numeric(10,2))
    concept: Mapped[str] = mapped_column(String(80), default="")
    note: Mapped[str] = mapped_column(String(1000), default="")
    recorded_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    __table_args__ = (UniqueConstraint("instrument_id","enrollment_id",name="uq_assessment_result_enrollment"),)


class DescriptiveOpinion(Record, Scoped, Base):
    __tablename__ = "descriptive_opinions"
    diary_id: Mapped[str] = mapped_column(ForeignKey("school_diaries.id"), index=True)
    academic_period_id: Mapped[str | None] = mapped_column(ForeignKey("academic_periods.id"), index=True)
    enrollment_id: Mapped[str] = mapped_column(ForeignKey("enrollments.id"), index=True)
    student_id: Mapped[str] = mapped_column(ForeignKey("students.id"), index=True)
    text: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(16), default="draft")
    authored_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    reviewed_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    __table_args__ = (
        UniqueConstraint("diary_id","academic_period_id","enrollment_id",name="uq_descriptive_opinion_scope"),
        CheckConstraint("status IN ('draft','reviewed','final')",name="descriptive_opinion_status"),
    )


class PedagogicalRecord(Record, Scoped, Base):
    __tablename__ = "pedagogical_records"
    diary_id: Mapped[str] = mapped_column(ForeignKey("school_diaries.id"), index=True)
    enrollment_id: Mapped[str] = mapped_column(ForeignKey("enrollments.id"), index=True)
    student_id: Mapped[str] = mapped_column(ForeignKey("students.id"), index=True)
    record_date: Mapped[date] = mapped_column(Date, index=True)
    kind: Mapped[str] = mapped_column(String(24), default="observation")
    text: Mapped[str] = mapped_column(Text)
    recorded_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    __table_args__ = (
        CheckConstraint("kind IN ('follow_up','intervention','recovery','adaptation','referral','observation')",name="pedagogical_record_kind"),
    )


class DiaryOccurrence(Record, Scoped, Base):
    """Ocorrência pedagógica interna vinculada a matrícula e diário."""
    __tablename__ = "diary_occurrences"
    diary_id: Mapped[str] = mapped_column(ForeignKey("school_diaries.id"), index=True)
    academic_period_id: Mapped[str] = mapped_column(ForeignKey("academic_periods.id"), index=True)
    enrollment_id: Mapped[str] = mapped_column(ForeignKey("enrollments.id"), index=True)
    student_id: Mapped[str] = mapped_column(ForeignKey("students.id"), index=True)
    occurrence_date: Mapped[date] = mapped_column(Date, index=True)
    kind: Mapped[str] = mapped_column(String(20), default="pedagogical")
    title: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(16), default="draft")
    recorded_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    reviewed_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    __table_args__ = (
        CheckConstraint("kind IN ('positive','pedagogical','behavioral','safety','other')", name="diary_occurrence_kind"),
        CheckConstraint("status IN ('draft','reviewed')", name="diary_occurrence_status"),
    )


class DiaryFamilyCommunication(Record, Scoped, Base):
    """Mensagem imutável da escola, acessível somente à conta de responsável vinculada."""
    __tablename__ = "diary_family_communications"
    diary_id: Mapped[str] = mapped_column(ForeignKey("school_diaries.id"), index=True)
    academic_period_id: Mapped[str | None] = mapped_column(ForeignKey("academic_periods.id"), index=True)
    occurrence_id: Mapped[str | None] = mapped_column(ForeignKey("diary_occurrences.id"), index=True)
    enrollment_id: Mapped[str] = mapped_column(ForeignKey("enrollments.id"), index=True)
    student_id: Mapped[str] = mapped_column(ForeignKey("students.id"), index=True)
    guardian_link_id: Mapped[str] = mapped_column(ForeignKey("student_guardians.id"), index=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("portal_accounts.id"), index=True)
    title: Mapped[str] = mapped_column(String(160))
    message: Mapped[str] = mapped_column(Text)
    client_key: Mapped[str] = mapped_column(String(80))
    sent_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    __table_args__ = (
        UniqueConstraint("account_id", "client_key", name="uq_diary_family_communication_account_key"),
    )


class PeriodAssessmentRule(Record, Scoped, Base):
    """Regra explícita de consolidação, configurada para um diário e período."""
    __tablename__ = "period_assessment_rules"
    diary_id: Mapped[str] = mapped_column(ForeignKey("school_diaries.id"), index=True)
    academic_period_id: Mapped[str] = mapped_column(ForeignKey("academic_periods.id"), index=True)
    method: Mapped[str] = mapped_column(String(16), default="arithmetic")
    scale_max: Mapped[float] = mapped_column(Numeric(10,4), default=10)
    decimal_places: Mapped[int] = mapped_column(Integer, default=2)
    minimum_score: Mapped[float | None] = mapped_column(Numeric(10,4))
    minimum_attendance_percent: Mapped[float | None] = mapped_column(Numeric(5,2))
    justified_absence_counts_as_present: Mapped[bool | None] = mapped_column(Boolean)
    recovery_mode: Mapped[str] = mapped_column(String(16), default="none")
    concept_scale: Mapped[list] = mapped_column(JSON, default=list)
    required_opinion: Mapped[bool] = mapped_column(Boolean, default=False)
    configured_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    __table_args__ = (
        UniqueConstraint("diary_id", "academic_period_id", name="uq_diary_period_assessment_rule"),
        CheckConstraint("method IN ('arithmetic','weighted','concept')", name="period_rule_method"),
        CheckConstraint("scale_max > 0", name="period_rule_scale"),
        CheckConstraint("decimal_places BETWEEN 0 AND 4", name="period_rule_decimals"),
        CheckConstraint("minimum_score IS NULL OR minimum_score >= 0", name="period_rule_minimum_score"),
        CheckConstraint("minimum_attendance_percent IS NULL OR minimum_attendance_percent BETWEEN 0 AND 100", name="period_rule_attendance"),
        CheckConstraint("recovery_mode IN ('none','replace','higher','mean')", name="period_rule_recovery"),
    )


class PeriodResult(Record, Scoped, Base):
    """Último resultado consolidado. Reprocessamentos são explícitos e auditados."""
    __tablename__ = "period_results"
    diary_id: Mapped[str] = mapped_column(ForeignKey("school_diaries.id"), index=True)
    academic_period_id: Mapped[str] = mapped_column(ForeignKey("academic_periods.id"), index=True)
    enrollment_id: Mapped[str] = mapped_column(ForeignKey("enrollments.id"), index=True)
    student_id: Mapped[str] = mapped_column(ForeignKey("students.id"), index=True)
    rule_id: Mapped[str] = mapped_column(ForeignKey("period_assessment_rules.id"), index=True)
    numeric_value: Mapped[float | None] = mapped_column(Numeric(10,4))
    concept_value: Mapped[str] = mapped_column(String(80), default="")
    status: Mapped[str] = mapped_column(String(32), default="calculated")
    flags: Mapped[list] = mapped_column(JSON, default=list)
    calculation: Mapped[dict] = mapped_column(JSON, default=dict)
    source_hash: Mapped[str] = mapped_column(String(64), index=True)
    rule_version: Mapped[int] = mapped_column(Integer)
    calculated_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    calculated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    __table_args__ = (
        UniqueConstraint("diary_id", "academic_period_id", "enrollment_id", name="uq_diary_period_result"),
        CheckConstraint("status IN ('pending','calculated','below_minimum','attendance_below_minimum','opinion_pending','concept')", name="period_result_status"),
    )
