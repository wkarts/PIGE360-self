"""Acesso familiar consentido e comunicados pedagógicos no portal."""
from alembic import op
import sqlalchemy as sa


revision = "0020_diary_family_communications"
down_revision = "0019_diary_consolidation"
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
        "portal_student_access",
        *record_columns(),
        sa.Column("account_id", sa.String(36), sa.ForeignKey("portal_accounts.id"), nullable=False),
        sa.Column("guardian_link_id", sa.String(36), sa.ForeignKey("student_guardians.id"), nullable=False),
        sa.Column("student_id", sa.String(36), sa.ForeignKey("students.id"), nullable=False),
        sa.Column("consent_version", sa.String(40), nullable=False),
        sa.Column("consent_text", sa.Text(), nullable=False),
        sa.Column("consented_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("account_id", "guardian_link_id", name="uq_portal_diary_access_account_guardian"),
    )
    for name, column in [
        ("ix_portal_student_access_school_id", "school_id"),
        ("ix_portal_student_access_account_id", "account_id"),
        ("ix_portal_student_access_guardian_link_id", "guardian_link_id"),
        ("ix_portal_student_access_student_id", "student_id"),
        ("ix_portal_student_access_active", "active"),
    ]:
        op.create_index(name, "portal_student_access", [column])

    op.create_table(
        "diary_family_communications",
        *record_columns(),
        sa.Column("diary_id", sa.String(36), sa.ForeignKey("school_diaries.id"), nullable=False),
        sa.Column("academic_period_id", sa.String(36), sa.ForeignKey("academic_periods.id"), nullable=True),
        sa.Column("occurrence_id", sa.String(36), sa.ForeignKey("diary_occurrences.id"), nullable=True),
        sa.Column("enrollment_id", sa.String(36), sa.ForeignKey("enrollments.id"), nullable=False),
        sa.Column("student_id", sa.String(36), sa.ForeignKey("students.id"), nullable=False),
        sa.Column("guardian_link_id", sa.String(36), sa.ForeignKey("student_guardians.id"), nullable=False),
        sa.Column("account_id", sa.String(36), sa.ForeignKey("portal_accounts.id"), nullable=False),
        sa.Column("title", sa.String(160), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("client_key", sa.String(80), nullable=False),
        sa.Column("sent_by", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("account_id", "client_key", name="uq_diary_family_communication_account_key"),
    )
    for name, column in [
        ("ix_diary_family_communications_school_id", "school_id"),
        ("ix_diary_family_communications_diary_id", "diary_id"),
        ("ix_diary_family_communications_academic_period_id", "academic_period_id"),
        ("ix_diary_family_communications_occurrence_id", "occurrence_id"),
        ("ix_diary_family_communications_enrollment_id", "enrollment_id"),
        ("ix_diary_family_communications_student_id", "student_id"),
        ("ix_diary_family_communications_guardian_link_id", "guardian_link_id"),
        ("ix_diary_family_communications_account_id", "account_id"),
        ("ix_diary_family_communications_sent_at", "sent_at"),
    ]:
        op.create_index(name, "diary_family_communications", [column])


def downgrade():
    op.drop_table("diary_family_communications")
    op.drop_table("portal_student_access")
