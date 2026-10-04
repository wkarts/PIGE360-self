"""Sessões webmail curtas, de uso único e vinculadas à instituição."""
from alembic import op
import sqlalchemy as sa

revision = '0036_sogo_webmail_sessions'
down_revision = '0035_email_alternate_mailbox'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'email_webmail_sessions',
        sa.Column('school_id', sa.String(36), nullable=False),
        sa.Column('user_id', sa.String(36), nullable=False),
        sa.Column('mailbox_id', sa.String(36), nullable=False),
        sa.Column('token_hash', sa.String(64), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('redeemed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['mailbox_id'], ['school_mailboxes.id'], name='fk_email_webmail_sessions_mailbox_id_school_mailboxes'),
        sa.ForeignKeyConstraint(['school_id'], ['schools.id'], name='fk_email_webmail_sessions_school_id_schools'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name='fk_email_webmail_sessions_user_id_users'),
        sa.PrimaryKeyConstraint('id', name='pk_email_webmail_sessions'),
        sa.UniqueConstraint('token_hash', name='uq_email_webmail_sessions_token_hash'),
    )
    op.create_index('ix_email_webmail_sessions_mailbox_id', 'email_webmail_sessions', ['mailbox_id'])
    op.create_index('ix_email_webmail_sessions_school_id', 'email_webmail_sessions', ['school_id'])
    op.create_index('ix_email_webmail_sessions_user_id', 'email_webmail_sessions', ['user_id'])
    op.create_index('ix_email_webmail_sessions_expires_at', 'email_webmail_sessions', ['expires_at'])


def downgrade():
    op.drop_index('ix_email_webmail_sessions_expires_at', table_name='email_webmail_sessions')
    op.drop_index('ix_email_webmail_sessions_user_id', table_name='email_webmail_sessions')
    op.drop_index('ix_email_webmail_sessions_school_id', table_name='email_webmail_sessions')
    op.drop_index('ix_email_webmail_sessions_mailbox_id', table_name='email_webmail_sessions')
    op.drop_table('email_webmail_sessions')
