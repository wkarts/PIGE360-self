"""Lotes de portabilidade e arquivo sanitizado de dados legados."""
from alembic import op
import sqlalchemy as sa


revision = "0021_legacy_import_archive"
down_revision = "0020_diary_family_communications"
branch_labels = None
depends_on = None


def record_columns():
    return [
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
    ]


def upgrade():
    op.create_table(
        "legacy_import_runs",
        *record_columns(),
        sa.Column("school_id", sa.String(36), sa.ForeignKey("schools.id"), nullable=False),
        sa.Column("fingerprint", sa.String(64), nullable=False),
        sa.Column("source_system", sa.String(80), nullable=False, server_default="school_desktop_suite"),
        sa.Column("imported_by", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("summary", sa.JSON(), nullable=False),
        sa.UniqueConstraint("school_id", "fingerprint", name="uq_legacy_import_run_fingerprint"),
    )
    op.create_index("ix_legacy_import_runs_school_id", "legacy_import_runs", ["school_id"])
    op.create_table(
        "legacy_import_records",
        *record_columns(),
        sa.Column("run_id", sa.String(36), sa.ForeignKey("legacy_import_runs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("source_table", sa.String(120), nullable=False),
        sa.Column("source_key", sa.String(160), nullable=False),
        sa.Column("mapped_entity_type", sa.String(60), nullable=False, server_default=""),
        sa.Column("mapped_entity_id", sa.String(36), nullable=True),
        sa.Column("file_id", sa.String(36), sa.ForeignKey("files.id"), nullable=True),
        sa.Column("record_data", sa.JSON(), nullable=False),
        sa.UniqueConstraint("run_id", "source_table", "source_key", name="uq_legacy_import_source_record"),
    )
    op.create_index("ix_legacy_import_records_run_id", "legacy_import_records", ["run_id"])
    op.create_index("ix_legacy_import_records_source_table", "legacy_import_records", ["source_table"])
    op.create_index("ix_legacy_import_records_run_table", "legacy_import_records", ["run_id", "source_table"])


def downgrade():
    op.drop_table("legacy_import_records")
    op.drop_table("legacy_import_runs")
