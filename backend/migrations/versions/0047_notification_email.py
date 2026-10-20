"""SMTP transacional por instituição; nenhuma caixa ou mensagem é alterada."""
from alembic import op
import sqlalchemy as sa
revision = '0047_notification_email'
down_revision = '0046_user_invitations'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('notification_email_settings',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('school_id', sa.String(36), sa.ForeignKey('schools.id'), nullable=False, unique=True),
        sa.Column('mode', sa.String(16), nullable=False), sa.Column('host', sa.String(253), nullable=False),
        sa.Column('port', sa.Integer(), nullable=False), sa.Column('username', sa.String(254), nullable=False),
        sa.Column('from_address', sa.String(254), nullable=False), sa.Column('encrypted_secret', sa.Text(), nullable=False),
        sa.Column('allow_private_network', sa.Boolean(), nullable=False),
        sa.Column('checked_at', sa.DateTime(timezone=True)), sa.Column('last_error', sa.String(40), nullable=False))
    op.create_index('ix_notification_email_settings_school_id', 'notification_email_settings', ['school_id'])


def downgrade():
    op.drop_table('notification_email_settings')
