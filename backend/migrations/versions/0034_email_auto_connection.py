"""Estado verificável de conexão automática IMAP e SMTP por titular."""
from alembic import op
import sqlalchemy as sa

revision = '0034_email_auto_connection'
down_revision = '0033_connect_school_ownership'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('email_connections') as batch:
        batch.add_column(sa.Column('checked_at', sa.DateTime(timezone=True), nullable=True))
        batch.add_column(sa.Column('last_error', sa.String(40), nullable=False, server_default=''))


def downgrade():
    with op.batch_alter_table('email_connections') as batch:
        batch.drop_column('last_error')
        batch.drop_column('checked_at')
