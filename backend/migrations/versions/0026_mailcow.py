"""Configuração Mailcow por escola e caixas institucionais com fila persistente."""
from alembic import op
import sqlalchemy as sa

revision = '0026_mailcow'
down_revision = '0025_signature_sessions'
branch_labels = None
depends_on = None


def record_columns():
    return [sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('version', sa.Integer(), nullable=False),
            sa.Column('school_id', sa.String(36), sa.ForeignKey('schools.id'), nullable=False)]


def upgrade():
    op.create_table('mailcow_configs', *record_columns(),
        sa.Column('enabled', sa.Boolean(), nullable=False),
        sa.Column('base_url', sa.String(300), nullable=False),
        sa.Column('domain', sa.String(253), nullable=False),
        sa.Column('default_quota_mb', sa.Integer(), nullable=False),
        sa.Column('allow_private_network', sa.Boolean(), nullable=False),
        sa.Column('encrypted_secret', sa.Text(), nullable=False),
        sa.Column('last_test_at', sa.DateTime(timezone=True)),
        sa.Column('last_test_ok', sa.Boolean()),
        sa.UniqueConstraint('school_id'))
    op.create_index('ix_mailcow_configs_school_id', 'mailcow_configs', ['school_id'])
    op.create_table('school_mailboxes', *record_columns(),
        sa.Column('config_id', sa.String(36), sa.ForeignKey('mailcow_configs.id'), nullable=False),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('job_id', sa.String(36), sa.ForeignKey('integration_jobs.id'), nullable=False),
        sa.Column('address', sa.String(254), nullable=False),
        sa.Column('display_name', sa.String(160), nullable=False),
        sa.Column('quota_mb', sa.Integer(), nullable=False),
        sa.Column('encrypted_password', sa.Text(), nullable=False),
        sa.Column('provisioned_at', sa.DateTime(timezone=True)),
        sa.Column('password_revealed_at', sa.DateTime(timezone=True)),
        sa.Column('last_synced_at', sa.DateTime(timezone=True)),
        sa.Column('remote_active', sa.Boolean()),
        sa.Column('quota_used_bytes', sa.BigInteger(), nullable=False),
        sa.UniqueConstraint('school_id', 'user_id'), sa.UniqueConstraint('config_id', 'address'))
    op.create_index('ix_school_mailboxes_school_id', 'school_mailboxes', ['school_id'])
    op.create_index('ix_school_mailboxes_user_id', 'school_mailboxes', ['user_id'])


def downgrade():
    op.drop_table('school_mailboxes')
    op.drop_table('mailcow_configs')
