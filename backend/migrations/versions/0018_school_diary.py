"""Núcleo do Diário Escolar Digital."""
from alembic import op
import sqlalchemy as sa

revision = "0018_school_diary"
down_revision = "0017_connect_instance_phone"
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
        "academic_periods",
        *record_columns(),
        sa.Column("academic_year_id", sa.String(36), sa.ForeignKey("academic_years.id"), nullable=False),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("starts_on", sa.Date(), nullable=False),
        sa.Column("ends_on", sa.Date(), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.UniqueConstraint("school_id","academic_year_id","name",name="uq_academic_period_name"),
        sa.CheckConstraint("ends_on >= starts_on",name="academic_period_dates"),
        sa.CheckConstraint("order_index > 0",name="academic_period_order"),
    )
    op.create_index("ix_academic_periods_school_id","academic_periods",["school_id"])
    op.create_index("ix_academic_periods_academic_year_id","academic_periods",["academic_year_id"])

    op.create_table(
        "curriculum_components",
        *record_columns(),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("code", sa.String(40), nullable=False, server_default=""),
        sa.Column("workload_hours", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.UniqueConstraint("school_id","name",name="uq_curriculum_component_name"),
        sa.CheckConstraint("workload_hours >= 0",name="curriculum_component_workload"),
    )
    op.create_index("ix_curriculum_components_school_id","curriculum_components",["school_id"])

    op.create_table(
        "curriculum_plans",
        *record_columns(),
        sa.Column("class_group_id", sa.String(36), sa.ForeignKey("class_groups.id"), nullable=False),
        sa.Column("component_id", sa.String(36), sa.ForeignKey("curriculum_components.id"), nullable=False),
        sa.Column("academic_period_id", sa.String(36), sa.ForeignKey("academic_periods.id"), nullable=True),
        sa.Column("teacher_assignment_id", sa.String(36), sa.ForeignKey("teacher_assignments.id"), nullable=True),
        sa.Column("objectives", sa.Text(), nullable=False, server_default=""),
        sa.Column("thematic_units", sa.Text(), nullable=False, server_default=""),
        sa.Column("knowledge_objects", sa.Text(), nullable=False, server_default=""),
        sa.Column("bncc_references", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("methodology", sa.Text(), nullable=False, server_default=""),
        sa.Column("resources", sa.Text(), nullable=False, server_default=""),
        sa.Column("assessment_strategy", sa.Text(), nullable=False, server_default=""),
        sa.Column("notes", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(16), nullable=False, server_default="draft"),
        sa.UniqueConstraint("school_id","class_group_id","component_id","academic_period_id",name="uq_curriculum_plan_scope"),
        sa.CheckConstraint("status IN ('draft','published','archived')",name="curriculum_plan_status"),
    )
    for name,col in [("ix_curriculum_plans_school_id","school_id"),("ix_curriculum_plans_class_group_id","class_group_id"),("ix_curriculum_plans_component_id","component_id"),("ix_curriculum_plans_academic_period_id","academic_period_id"),("ix_curriculum_plans_teacher_assignment_id","teacher_assignment_id")]:
        op.create_index(name,"curriculum_plans",[col])

    op.create_table(
        "school_diaries",
        *record_columns(),
        sa.Column("class_group_id", sa.String(36), sa.ForeignKey("class_groups.id"), nullable=False),
        sa.Column("academic_year_id", sa.String(36), sa.ForeignKey("academic_years.id"), nullable=False),
        sa.Column("component_id", sa.String(36), sa.ForeignKey("curriculum_components.id"), nullable=False),
        sa.Column("teacher_assignment_id", sa.String(36), sa.ForeignKey("teacher_assignments.id"), nullable=True),
        sa.Column("status", sa.String(16), nullable=False, server_default="open"),
        sa.Column("notes", sa.Text(), nullable=False, server_default=""),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("closed_by", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.UniqueConstraint("school_id","class_group_id","component_id",name="uq_school_diary_scope"),
        sa.CheckConstraint("status IN ('draft','open','submitted','reviewed','closed')",name="school_diary_status"),
    )
    for name,col in [("ix_school_diaries_school_id","school_id"),("ix_school_diaries_class_group_id","class_group_id"),("ix_school_diaries_academic_year_id","academic_year_id"),("ix_school_diaries_component_id","component_id"),("ix_school_diaries_teacher_assignment_id","teacher_assignment_id")]:
        op.create_index(name,"school_diaries",[col])

    op.create_table(
        "diary_lessons",
        *record_columns(),
        sa.Column("diary_id", sa.String(36), sa.ForeignKey("school_diaries.id"), nullable=False),
        sa.Column("academic_period_id", sa.String(36), sa.ForeignKey("academic_periods.id"), nullable=True),
        sa.Column("lesson_date", sa.Date(), nullable=False),
        sa.Column("lesson_count", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("skills", sa.Text(), nullable=False, server_default=""),
        sa.Column("methodology", sa.Text(), nullable=False, server_default=""),
        sa.Column("activities", sa.Text(), nullable=False, server_default=""),
        sa.Column("homework", sa.Text(), nullable=False, server_default=""),
        sa.Column("notes", sa.Text(), nullable=False, server_default=""),
        sa.Column("recorded_by", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.UniqueConstraint("diary_id","lesson_date",name="uq_diary_lesson_date"),
        sa.CheckConstraint("lesson_count > 0",name="diary_lesson_count"),
    )
    for name,col in [("ix_diary_lessons_school_id","school_id"),("ix_diary_lessons_diary_id","diary_id"),("ix_diary_lessons_academic_period_id","academic_period_id"),("ix_diary_lessons_lesson_date","lesson_date")]:
        op.create_index(name,"diary_lessons",[col])

    op.create_table(
        "diary_attendance",
        *record_columns(),
        sa.Column("lesson_id", sa.String(36), sa.ForeignKey("diary_lessons.id"), nullable=False),
        sa.Column("enrollment_id", sa.String(36), sa.ForeignKey("enrollments.id"), nullable=False),
        sa.Column("student_id", sa.String(36), sa.ForeignKey("students.id"), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="present"),
        sa.Column("note", sa.String(500), nullable=False, server_default=""),
        sa.Column("recorded_by", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.UniqueConstraint("lesson_id","enrollment_id",name="uq_diary_attendance_enrollment"),
        sa.CheckConstraint("status IN ('present','absent','justified_absence')",name="diary_attendance_status"),
    )
    for name,col in [("ix_diary_attendance_school_id","school_id"),("ix_diary_attendance_lesson_id","lesson_id"),("ix_diary_attendance_enrollment_id","enrollment_id"),("ix_diary_attendance_student_id","student_id")]:
        op.create_index(name,"diary_attendance",[col])

    op.create_table(
        "diary_closures",
        *record_columns(),
        sa.Column("diary_id", sa.String(36), sa.ForeignKey("school_diaries.id"), nullable=False),
        sa.Column("academic_period_id", sa.String(36), sa.ForeignKey("academic_periods.id"), nullable=True),
        sa.Column("snapshot", sa.JSON(), nullable=False),
        sa.Column("snapshot_hash", sa.String(64), nullable=False),
        sa.Column("reason", sa.String(1000), nullable=False, server_default=""),
        sa.Column("closed_by", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    for name,col in [("ix_diary_closures_school_id","school_id"),("ix_diary_closures_diary_id","diary_id"),("ix_diary_closures_academic_period_id","academic_period_id"),("ix_diary_closures_snapshot_hash","snapshot_hash")]:
        op.create_index(name,"diary_closures",[col])


    op.create_table(
        "assessment_instruments",
        *record_columns(),
        sa.Column("diary_id", sa.String(36), sa.ForeignKey("school_diaries.id"), nullable=False),
        sa.Column("academic_period_id", sa.String(36), sa.ForeignKey("academic_periods.id"), nullable=True),
        sa.Column("title", sa.String(160), nullable=False),
        sa.Column("kind", sa.String(60), nullable=False, server_default="activity"),
        sa.Column("assessment_date", sa.Date(), nullable=False),
        sa.Column("value_type", sa.String(16), nullable=False, server_default="numeric"),
        sa.Column("max_score", sa.Numeric(10,2), nullable=True),
        sa.Column("weight", sa.Numeric(10,4), nullable=True),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("skills", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(16), nullable=False, server_default="draft"),
        sa.Column("created_by", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.CheckConstraint("value_type IN ('numeric','concept')",name="assessment_value_type"),
        sa.CheckConstraint("status IN ('draft','published','closed')",name="assessment_status"),
        sa.CheckConstraint("max_score IS NULL OR max_score > 0",name="assessment_max_score"),
        sa.CheckConstraint("weight IS NULL OR weight > 0",name="assessment_weight"),
    )
    for name,col in [("ix_assessment_instruments_school_id","school_id"),("ix_assessment_instruments_diary_id","diary_id"),("ix_assessment_instruments_academic_period_id","academic_period_id")]:
        op.create_index(name,"assessment_instruments",[col])

    op.create_table(
        "assessment_results",
        *record_columns(),
        sa.Column("instrument_id", sa.String(36), sa.ForeignKey("assessment_instruments.id"), nullable=False),
        sa.Column("enrollment_id", sa.String(36), sa.ForeignKey("enrollments.id"), nullable=False),
        sa.Column("student_id", sa.String(36), sa.ForeignKey("students.id"), nullable=False),
        sa.Column("numeric_score", sa.Numeric(10,2), nullable=True),
        sa.Column("concept", sa.String(80), nullable=False, server_default=""),
        sa.Column("note", sa.String(1000), nullable=False, server_default=""),
        sa.Column("recorded_by", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.UniqueConstraint("instrument_id","enrollment_id",name="uq_assessment_result_enrollment"),
    )
    for name,col in [("ix_assessment_results_school_id","school_id"),("ix_assessment_results_instrument_id","instrument_id"),("ix_assessment_results_enrollment_id","enrollment_id"),("ix_assessment_results_student_id","student_id")]:
        op.create_index(name,"assessment_results",[col])

    op.create_table(
        "descriptive_opinions",
        *record_columns(),
        sa.Column("diary_id", sa.String(36), sa.ForeignKey("school_diaries.id"), nullable=False),
        sa.Column("academic_period_id", sa.String(36), sa.ForeignKey("academic_periods.id"), nullable=True),
        sa.Column("enrollment_id", sa.String(36), sa.ForeignKey("enrollments.id"), nullable=False),
        sa.Column("student_id", sa.String(36), sa.ForeignKey("students.id"), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="draft"),
        sa.Column("authored_by", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("reviewed_by", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.UniqueConstraint("diary_id","academic_period_id","enrollment_id",name="uq_descriptive_opinion_scope"),
        sa.CheckConstraint("status IN ('draft','reviewed','final')",name="descriptive_opinion_status"),
    )
    for name,col in [("ix_descriptive_opinions_school_id","school_id"),("ix_descriptive_opinions_diary_id","diary_id"),("ix_descriptive_opinions_academic_period_id","academic_period_id"),("ix_descriptive_opinions_enrollment_id","enrollment_id"),("ix_descriptive_opinions_student_id","student_id")]:
        op.create_index(name,"descriptive_opinions",[col])

    op.create_table(
        "pedagogical_records",
        *record_columns(),
        sa.Column("diary_id", sa.String(36), sa.ForeignKey("school_diaries.id"), nullable=False),
        sa.Column("enrollment_id", sa.String(36), sa.ForeignKey("enrollments.id"), nullable=False),
        sa.Column("student_id", sa.String(36), sa.ForeignKey("students.id"), nullable=False),
        sa.Column("record_date", sa.Date(), nullable=False),
        sa.Column("kind", sa.String(24), nullable=False, server_default="observation"),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("recorded_by", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.CheckConstraint("kind IN ('follow_up','intervention','recovery','adaptation','referral','observation')",name="pedagogical_record_kind"),
    )
    for name,col in [("ix_pedagogical_records_school_id","school_id"),("ix_pedagogical_records_diary_id","diary_id"),("ix_pedagogical_records_enrollment_id","enrollment_id"),("ix_pedagogical_records_student_id","student_id"),("ix_pedagogical_records_record_date","record_date")]:
        op.create_index(name,"pedagogical_records",[col])

    op.create_table(
        "diary_revisions",
        *record_columns(),
        sa.Column("diary_id", sa.String(36), sa.ForeignKey("school_diaries.id"), nullable=False),
        sa.Column("closure_id", sa.String(36), sa.ForeignKey("diary_closures.id"), nullable=True),
        sa.Column("reason", sa.String(1000), nullable=False),
        sa.Column("reopened_by", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("reopened_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("previous_status", sa.String(16), nullable=False),
    )
    for name,col in [("ix_diary_revisions_school_id","school_id"),("ix_diary_revisions_diary_id","diary_id"),("ix_diary_revisions_closure_id","closure_id")]:
        op.create_index(name,"diary_revisions",[col])


def downgrade():
    for table in ["diary_revisions","pedagogical_records","descriptive_opinions","assessment_results","assessment_instruments","diary_closures","diary_attendance","diary_lessons","school_diaries","curriculum_plans","curriculum_components","academic_periods"]:
        op.drop_table(table)
