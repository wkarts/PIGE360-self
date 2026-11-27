"""Checkout e consentimento de cartão por fatura."""
from alembic import op
import sqlalchemy as sa

revision = '0068_asaas_recurring_card'
down_revision = '0067_asaas_pix_auto'
branch_labels = depends_on = None


def link(name, table, **kwargs):
    return sa.Column(name,sa.String(36),sa.ForeignKey(table+'.id'),nullable=False,**kwargs)


def record():
    return [sa.Column('id',sa.String(36),primary_key=True),link('school_id','schools',index=True),
            sa.Column('version',sa.Integer(),nullable=False),sa.Column('created_at',sa.DateTime(timezone=True),nullable=False),
            sa.Column('updated_at',sa.DateTime(timezone=True),nullable=False)]


def upgrade():
    op.create_table('asaas_card_checkouts',*record(),link('connection_id','integration_connections'),link('charge_id','bank_charges',index=True),
        link('enrollment_id','enrollments'),link('payer_id','persons'),sa.Column('client_key',sa.String(80),nullable=False),
        sa.Column('mode',sa.String(24),nullable=False),sa.Column('max_installments',sa.Integer(),nullable=False),
        sa.Column('cycle',sa.String(24),nullable=False),sa.Column('ends_on',sa.Date()),sa.Column('first_due',sa.Date(),nullable=False),
        sa.Column('quote',sa.JSON(),nullable=False),sa.Column('environment',sa.String(16),nullable=False),sa.Column('remote_id',sa.String(160)),
        sa.Column('subscription_id',sa.String(160)),sa.Column('installment_id',sa.String(160)),sa.Column('status',sa.String(32),nullable=False),
        sa.Column('refunds',sa.JSON(),nullable=False),sa.Column('transactions',sa.JSON(),nullable=False),sa.UniqueConstraint('school_id','client_key'),sa.UniqueConstraint('connection_id','remote_id'))
    op.create_table('asaas_card_mandates',*record(),link('checkout_id','asaas_card_checkouts',unique=True),link('user_id','users'),
        sa.Column('customer_id',sa.String(160),nullable=False),sa.Column('sealed_token',sa.Text(),nullable=False),
        sa.Column('terms_version',sa.String(32),nullable=False),sa.Column('limit_cents',sa.BigInteger(),nullable=False),
        sa.Column('ends_on',sa.Date(),nullable=False),sa.Column('status',sa.String(24),nullable=False))


def downgrade():
    raise RuntimeError('Preserve o histórico financeiro e concilie os cartões antes de qualquer reversão.')
