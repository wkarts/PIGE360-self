"""Perfil do usuário e foto privada; preserva usuários e pessoas existentes."""
from alembic import op
import sqlalchemy as sa
revision = '0012_user_profile'
down_revision = '0011_person_cadastres'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table('user_profiles',
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), primary_key=True),
        sa.Column('phone', sa.String(32), nullable=False, server_default=''),
        sa.Column('job_title', sa.String(120), nullable=False, server_default=''),
        sa.Column('department', sa.String(120), nullable=False, server_default=''),
        sa.Column('bio', sa.String(1000), nullable=False, server_default=''),
        sa.Column('photo', sa.LargeBinary(), nullable=True),
        sa.Column('photo_hash', sa.String(64), nullable=False, server_default=''))

def downgrade():
    op.drop_table('user_profiles')
