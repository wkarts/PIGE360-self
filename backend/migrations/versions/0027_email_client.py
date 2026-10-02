"""Cliente de e-mail institucional: credenciais pessoais e recibos de envio."""
from alembic import op
import sqlalchemy as sa

revision = '0027_email_client'
down_revision = '0027_school_community'
branch_labels = None
depends_on = None


def record_columns():
    return [sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('version', sa.Integer(), nullable=False),
            sa.Column('school_id', sa.String(36), sa.ForeignKey('schools.id'), nullable=False)]


def upgrade():
    op.create_table('email_server_settings', *record_columns(),
        sa.Column('imap_host', sa.String(253), nullable=False),
        sa.Column('smtp_host', sa.String(253), nullable=False),
        sa.Column('smtp_port', sa.Integer(), nullable=False), sa.UniqueConstraint('school_id'))
    op.create_index('ix_email_server_settings_school_id', 'email_server_settings', ['school_id'])
    op.create_table('email_connections', *record_columns(),
        sa.Column('mailbox_id', sa.String(36), sa.ForeignKey('school_mailboxes.id'), nullable=False),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('encrypted_secret', sa.Text(), nullable=False),
        sa.Column('validated_at', sa.DateTime(timezone=True)),
        sa.UniqueConstraint('mailbox_id'), sa.UniqueConstraint('school_id', 'user_id'))
    op.create_index('ix_email_connections_school_id', 'email_connections', ['school_id'])
    op.create_index('ix_email_connections_user_id', 'email_connections', ['user_id'])
    op.create_table('email_submissions', *record_columns(),
        sa.Column('mailbox_id', sa.String(36), sa.ForeignKey('school_mailboxes.id'), nullable=False),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('request_id', sa.String(36), nullable=False),
        sa.Column('payload_hash', sa.String(64), nullable=False),
        sa.Column('message_id', sa.String(254), nullable=False),
        sa.Column('status', sa.String(16), nullable=False), sa.Column('result', sa.JSON(), nullable=False),
        sa.UniqueConstraint('mailbox_id', 'request_id'))
    op.create_index('ix_email_submissions_school_id', 'email_submissions', ['school_id'])
    op.create_index('ix_email_submissions_mailbox_id', 'email_submissions', ['mailbox_id'])


def downgrade():
    op.drop_table('email_submissions')
    op.drop_table('email_connections')
    op.drop_table('email_server_settings')
