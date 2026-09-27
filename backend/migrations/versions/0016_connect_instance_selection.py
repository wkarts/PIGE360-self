"""Seleção por escola e origem das instâncias Connect API."""
from alembic import op
import sqlalchemy as sa

revision = "0016_connect_instance_selection"
down_revision = "0015_assisted_intake"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("connect_instances", sa.Column("source", sa.String(16), nullable=False, server_default="pige360"))
    # SQLite exige batch mode para alterar constraints de tabela; PostgreSQL também é compatível.
    with op.batch_alter_table("connect_instances") as batch:
        batch.create_check_constraint("connect_instance_source", "source IN ('pige360','adopted')")
    op.create_table(
        "connect_school_bindings",
        sa.Column("school_id", sa.String(36), sa.ForeignKey("schools.id"), primary_key=True),
        sa.Column("instance_id", sa.String(36), sa.ForeignKey("connect_instances.id"), nullable=False, index=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_table(
        "connect_unit_bindings",
        sa.Column("unit_id", sa.String(36), sa.ForeignKey("units.id"), primary_key=True),
        sa.Column("instance_id", sa.String(36), sa.ForeignKey("connect_instances.id"), nullable=False, index=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )


def downgrade():
    op.drop_table("connect_unit_bindings")
    op.drop_table("connect_school_bindings")
    with op.batch_alter_table("connect_instances") as batch:
        batch.drop_constraint("connect_instance_source", type_="check")
    op.drop_column("connect_instances", "source")
