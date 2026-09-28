"""Regras configuráveis, ocorrências e consolidação auditável do Diário Escolar."""
from alembic import op
import sqlalchemy as sa

revision = "0019_diary_consolidation"
down_revision = "0018_school_diary"
branch_labels = None
depends_on = None


def record_columns():
    return [
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("school_id", sa.String(36), sa.ForeignKey("schools.id"), nullable=False),
    ]


def upgrade():
    op.create_table(
        "diary_occurrences",
        *record_columns(),
        sa.Column("diary_id", sa.String(36), sa.ForeignKey("school_diaries.id"), nullable=False),
        sa.Column("academic_period_id", sa.String(36), sa.ForeignKey("academic_periods.id"), nullable=False),
        sa.Column("enrollment_id", sa.String(36), sa.ForeignKey("enrollments.id"), nullable=False),
        sa.Column("student_id", sa.String(36), sa.ForeignKey("students.id"), nullable=False),
        sa.Column("occurrence_date", sa.Date(), nullable=False),
        sa.Column("kind", sa.String(20), nullable=False, server_default="pedagogical"),
        sa.Column("title", sa.String(160), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="draft"),
        sa.Column("recorded_by", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("reviewed_by", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.CheckConstraint("kind IN ('positive','pedagogical','behavioral','safety','other')", name="diary_occurrence_kind"),
        sa.CheckConstraint("status IN ('draft','reviewed')", name="diary_occurrence_status"),
    )
    for name, column in [
        ("ix_diary_occurrences_school_id", "school_id"),
        ("ix_diary_occurrences_diary_id", "diary_id"),
        ("ix_diary_occurrences_academic_period_id", "academic_period_id"),
        ("ix_diary_occurrences_enrollment_id", "enrollment_id"),
        ("ix_diary_occurrences_student_id", "student_id"),
        ("ix_diary_occurrences_occurrence_date", "occurrence_date"),
    ]:
        op.create_index(name, "diary_occurrences", [column])

    op.create_table(
        "period_assessment_rules",
        *record_columns(),
        sa.Column("diary_id", sa.String(36), sa.ForeignKey("school_diaries.id"), nullable=False),
        sa.Column("academic_period_id", sa.String(36), sa.ForeignKey("academic_periods.id"), nullable=False),
        sa.Column("method", sa.String(16), nullable=False, server_default="arithmetic"),
        sa.Column("scale_max", sa.Numeric(10, 4), nullable=False, server_default="10"),
        sa.Column("decimal_places", sa.Integer(), nullable=False, server_default="2"),
        sa.Column("minimum_score", sa.Numeric(10, 4), nullable=True),
        sa.Column("minimum_attendance_percent", sa.Numeric(5, 2), nullable=True),
        sa.Column("justified_absence_counts_as_present", sa.Boolean(), nullable=True),
        sa.Column("recovery_mode", sa.String(16), nullable=False, server_default="none"),
        sa.Column("concept_scale", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("required_opinion", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("configured_by", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.UniqueConstraint("diary_id", "academic_period_id", name="uq_diary_period_assessment_rule"),
        sa.CheckConstraint("method IN ('arithmetic','weighted','concept')", name="period_rule_method"),
        sa.CheckConstraint("scale_max > 0", name="period_rule_scale"),
        sa.CheckConstraint("decimal_places BETWEEN 0 AND 4", name="period_rule_decimals"),
        sa.CheckConstraint("minimum_score IS NULL OR minimum_score >= 0", name="period_rule_minimum_score"),
        sa.CheckConstraint("minimum_attendance_percent IS NULL OR minimum_attendance_percent BETWEEN 0 AND 100", name="period_rule_attendance"),
        sa.CheckConstraint("recovery_mode IN ('none','replace','higher','mean')", name="period_rule_recovery"),
    )
    for name, column in [
        ("ix_period_assessment_rules_school_id", "school_id"),
        ("ix_period_assessment_rules_diary_id", "diary_id"),
        ("ix_period_assessment_rules_academic_period_id", "academic_period_id"),
    ]:
        op.create_index(name, "period_assessment_rules", [column])

    op.create_table(
        "period_results",
        *record_columns(),
        sa.Column("diary_id", sa.String(36), sa.ForeignKey("school_diaries.id"), nullable=False),
        sa.Column("academic_period_id", sa.String(36), sa.ForeignKey("academic_periods.id"), nullable=False),
        sa.Column("enrollment_id", sa.String(36), sa.ForeignKey("enrollments.id"), nullable=False),
        sa.Column("student_id", sa.String(36), sa.ForeignKey("students.id"), nullable=False),
        sa.Column("rule_id", sa.String(36), sa.ForeignKey("period_assessment_rules.id"), nullable=False),
        sa.Column("numeric_value", sa.Numeric(10, 4), nullable=True),
        sa.Column("concept_value", sa.String(80), nullable=False, server_default=""),
        sa.Column("status", sa.String(32), nullable=False, server_default="calculated"),
        sa.Column("flags", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("calculation", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("source_hash", sa.String(64), nullable=False),
        sa.Column("rule_version", sa.Integer(), nullable=False),
        sa.Column("calculated_by", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("calculated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("diary_id", "academic_period_id", "enrollment_id", name="uq_diary_period_result"),
        sa.CheckConstraint("status IN ('pending','calculated','below_minimum','attendance_below_minimum','opinion_pending','concept')", name="period_result_status"),
    )
    for name, column in [
        ("ix_period_results_school_id", "school_id"),
        ("ix_period_results_diary_id", "diary_id"),
        ("ix_period_results_academic_period_id", "academic_period_id"),
        ("ix_period_results_enrollment_id", "enrollment_id"),
        ("ix_period_results_student_id", "student_id"),
        ("ix_period_results_rule_id", "rule_id"),
        ("ix_period_results_source_hash", "source_hash"),
    ]:
        op.create_index(name, "period_results", [column])


def downgrade():
    op.drop_table("period_results")
    op.drop_table("period_assessment_rules")
    op.drop_table("diary_occurrences")
