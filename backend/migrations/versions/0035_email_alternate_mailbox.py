"""Permite ao titular reconectar outra caixa já ativa no domínio da escola."""
from alembic import op
import sqlalchemy as sa

revision = '0035_email_alternate_mailbox'
down_revision = '0034_email_auto_connection'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('email_connections') as batch:
        batch.add_column(sa.Column('address_override', sa.String(254), nullable=False, server_default=''))


def downgrade():
    with op.batch_alter_table('email_connections') as batch:
        batch.drop_column('address_override')
