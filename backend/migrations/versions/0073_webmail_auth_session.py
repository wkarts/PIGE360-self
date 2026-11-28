"""Vincula a caixa SOGo à sessão escolar e à origem em que foi aberta."""
from alembic import op
import sqlalchemy as sa

revision = '0073_webmail_auth_session'
down_revision = '0072_teacher_routines'
branch_labels = depends_on = None


def upgrade():
    with op.batch_alter_table('email_webmail_sessions') as batch:
        batch.add_column(sa.Column('auth_session_id', sa.String(36), nullable=True))
        batch.add_column(sa.Column('surface', sa.String(12), nullable=False, server_default='manager'))
        batch.create_foreign_key('fk_webmail_login', 'auth_sessions', ['auth_session_id'], ['id'], ondelete='CASCADE')


def downgrade():
    with op.batch_alter_table('email_webmail_sessions') as batch:
        batch.drop_constraint('fk_webmail_login', type_='foreignkey')
        batch.drop_column('surface')
        batch.drop_column('auth_session_id')
