"""Telefone persistido para pareamento das instâncias Connect API."""
from alembic import op
import sqlalchemy as sa

revision = "0017_connect_instance_phone"
down_revision = "0016_connect_instance_selection"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("connect_instances", sa.Column("phone", sa.String(24), nullable=False, server_default=""))


def downgrade():
    op.drop_column("connect_instances", "phone")
