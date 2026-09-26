"""Origens autorizadas da instalação; nenhuma liberação automática."""
from alembic import op
import sqlalchemy as sa
revision = '0013_embedding_security'
down_revision = '0012_user_profile'
branch_labels = None
depends_on = None

def upgrade():
    table = op.create_table('installation_embedding',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('configured', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('enabled', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('allowed_origins', sa.JSON(), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
    op.bulk_insert(table, [{'id': 1, 'configured': False, 'enabled': False, 'allowed_origins': [], 'version': 1}])

def downgrade():
    op.drop_table('installation_embedding')
