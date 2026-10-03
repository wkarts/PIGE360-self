"""Global default and per-user choice of institutional webmail client."""
from alembic import op
import sqlalchemy as sa

revision = '0038_webmail_preferences'
down_revision = '0037_sogo_user_source'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('email_server_settings', sa.Column('webmail_default', sa.String(length=16),
                  server_default='sogo', nullable=False))
    op.create_table('email_webmail_preferences',
                    sa.Column('id', sa.String(length=36), primary_key=True),
                    sa.Column('school_id', sa.String(length=36), sa.ForeignKey('schools.id'), nullable=False),
                    sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id'), nullable=False),
                    sa.Column('mode', sa.String(length=16), nullable=False),
                    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
                    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
                    sa.Column('version', sa.Integer(), nullable=False),
                    sa.UniqueConstraint('school_id', 'user_id'))
    op.create_index('ix_email_webmail_preferences_user_id', 'email_webmail_preferences', ['user_id'])
    op.create_index('ix_email_webmail_preferences_school_id', 'email_webmail_preferences', ['school_id'])


def downgrade():
    op.drop_index('ix_email_webmail_preferences_school_id', table_name='email_webmail_preferences')
    op.drop_index('ix_email_webmail_preferences_user_id', table_name='email_webmail_preferences')
    op.drop_table('email_webmail_preferences')
    op.drop_column('email_server_settings', 'webmail_default')
