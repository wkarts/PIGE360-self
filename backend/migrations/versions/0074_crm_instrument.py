"""Preserva o instrumento confirmado de uma cobrança entre consultas da ponte."""
from alembic import op
import sqlalchemy as sa

revision = '0074_crm_instrument'
down_revision = '0073_webmail_auth_session'
branch_labels = depends_on = None


def upgrade():
    op.add_column('crm_bridge_external_requests', sa.Column('payment_instrument', sa.JSON(), nullable=True))


def downgrade():
    op.drop_column('crm_bridge_external_requests', 'payment_instrument')
