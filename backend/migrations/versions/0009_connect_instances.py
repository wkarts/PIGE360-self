"""Instâncias e fila da Connect API separadas do financeiro."""
from alembic import op
import sqlalchemy as sa

revision = "0009_connect_instances"
down_revision = "0008_company_support_hub"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "connect_instances",
        sa.Column("company_id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("display_name", sa.String(length=160), nullable=False, server_default=""),
        sa.Column("document", sa.String(length=14), nullable=False, server_default=""),
        sa.Column("primary", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("status", sa.String(length=24), nullable=False, server_default="created"),
        sa.Column("connection_state", sa.String(length=24), nullable=False, server_default=""),
        sa.Column("external_id", sa.String(length=160), nullable=False, server_default=""),
        sa.Column("last_error", sa.String(length=240), nullable=False, server_default=""),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], name="fk_connect_instances_company_id_companies"),
        sa.PrimaryKeyConstraint("id", name="pk_connect_instances"),
        sa.UniqueConstraint("company_id", "name", name="uq_connect_instances_company_name"),
        sa.CheckConstraint(
            "status IN ('creating','created','connecting','open','close','error','deleted')",
            name="connect_instance_status",
        ),
    )
    op.create_index("ix_connect_instances_company_id", "connect_instances", ["company_id"], unique=False)

    op.create_table(
        "connect_message_jobs",
        sa.Column("school_id", sa.String(length=36), nullable=False),
        sa.Column("instance_id", sa.String(length=36), nullable=False),
        sa.Column("kind", sa.String(length=24), nullable=False, server_default="text"),
        sa.Column("dedupe_key", sa.String(length=180), nullable=False),
        sa.Column("encrypted_payload", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False, server_default="pending"),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("available_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("lease_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_code", sa.String(length=80), nullable=False, server_default=""),
        sa.Column("remote_id", sa.String(length=160), nullable=False, server_default=""),
        sa.Column("delivery_status", sa.String(length=32), nullable=False, server_default=""),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"], name="fk_connect_message_jobs_school_id_schools"),
        sa.ForeignKeyConstraint(["instance_id"], ["connect_instances.id"], name="fk_connect_message_jobs_instance_id_connect_instances"),
        sa.PrimaryKeyConstraint("id", name="pk_connect_message_jobs"),
        sa.UniqueConstraint("dedupe_key", name="uq_connect_message_jobs_dedupe_key"),
        sa.CheckConstraint("status IN ('pending','processing','completed','retry','failed','uncertain','cancelled')", name="connect_job_status"),
    )
    op.create_index("ix_connect_message_jobs_school_id", "connect_message_jobs", ["school_id"], unique=False)
    op.create_index("ix_connect_message_jobs_instance_id", "connect_message_jobs", ["instance_id"], unique=False)
    op.create_index("ix_connect_message_jobs_status", "connect_message_jobs", ["status"], unique=False)


def downgrade():
    op.drop_index("ix_connect_message_jobs_status", table_name="connect_message_jobs")
    op.drop_index("ix_connect_message_jobs_instance_id", table_name="connect_message_jobs")
    op.drop_index("ix_connect_message_jobs_school_id", table_name="connect_message_jobs")
    op.drop_table("connect_message_jobs")
    op.drop_index("ix_connect_instances_company_id", table_name="connect_instances")
    op.drop_table("connect_instances")
