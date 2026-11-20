"""Habilitação explícita da prévia local do Educacenso por escola."""
from alembic import op
import sqlalchemy as sa

revision = '0061_census_preview'
down_revision = '0060_component_validity'
branch_labels = depends_on = None


def upgrade():
    op.add_column('schools', sa.Column('census_preview_enabled', sa.Boolean(),
                                      server_default=sa.false(), nullable=False))


def downgrade():
    op.drop_column('schools', 'census_preview_enabled')
