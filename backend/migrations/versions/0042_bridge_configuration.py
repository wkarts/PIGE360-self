"""Configuração criptografada da ponte opcional pela interface."""
from alembic import op
import sqlalchemy as sa

revision='0042_bridge_configuration'
down_revision='0041_portability_access'
branch_labels=None
depends_on=None


def upgrade():
    op.create_table('crm_bridge_connections',
        sa.Column('id',sa.String(36),primary_key=True),
        sa.Column('school_id',sa.String(36),sa.ForeignKey('schools.id'),nullable=False),
        sa.Column('created_at',sa.DateTime(timezone=True),nullable=False),
        sa.Column('updated_at',sa.DateTime(timezone=True),nullable=False),
        sa.Column('version',sa.Integer(),nullable=False),
        sa.Column('base_url',sa.String(500),nullable=False),
        sa.Column('issuer_id',sa.String(19),nullable=False),
        sa.Column('account_id',sa.String(128),nullable=False),
        sa.Column('environment',sa.String(16),nullable=False),
        sa.Column('enabled',sa.Boolean(),nullable=False),
        sa.Column('encrypted_secret',sa.Text(),nullable=False),
        sa.UniqueConstraint('school_id',name='uq_crm_bridge_connection_school'))


def downgrade():
    op.drop_table('crm_bridge_connections')
