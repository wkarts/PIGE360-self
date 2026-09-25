"""Identidade única da escola por instalação, sem alterar cadastros existentes."""
from alembic import op
import sqlalchemy as sa

revision = '0010_institution_identity'
down_revision = '0009_connect_instances'
branch_labels = None
depends_on = None


def upgrade():
    table = op.create_table('institution_identity',
        sa.Column('id', sa.Integer(), sa.ForeignKey('installation.id'), primary_key=True),
        sa.Column('identity', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('identity_version', sa.Integer(), nullable=False, server_default='1'))
    op.bulk_insert(table, [{'id': 1, 'identity': {}, 'identity_version': 1}])
    op.create_table('institution_assets',
        sa.Column('id', sa.String(70), primary_key=True),
        sa.Column('media_type', sa.String(40), nullable=False),
        sa.Column('content', sa.LargeBinary(), nullable=False))


def downgrade():
    op.drop_table('institution_assets')
    op.drop_table('institution_identity')
