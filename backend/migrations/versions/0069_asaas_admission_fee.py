"""Taxa bancária opcional por campanha de inscrição."""
from alembic import op
import sqlalchemy as sa

revision = '0069_asaas_admission_fee'
down_revision = '0068_asaas_recurring_card'
branch_labels = depends_on = None


def upgrade():
    op.add_column('admission_campaigns',sa.Column('fee_enabled',sa.Boolean,server_default=sa.false(),nullable=False))
    op.add_column('admission_campaigns',sa.Column('fee_amount',sa.Numeric(12,2)))
    op.add_column('admission_campaigns',sa.Column('fee_billing_type',sa.String(16),server_default='PIX',nullable=False))
    op.add_column('admission_campaigns',sa.Column('fee_due_days',sa.Integer,server_default='3',nullable=False))
    # Os vínculos são validados no escopo da escola no cadastro e na emissão; ALTER é aditivo em SQLite.
    op.add_column('admission_campaigns',sa.Column('fee_connection_id',sa.String(36)))
    op.add_column('admission_campaigns',sa.Column('fee_authorized_by',sa.String(36)))


def downgrade():
    for name in ('fee_authorized_by','fee_connection_id','fee_due_days','fee_billing_type','fee_amount','fee_enabled'):
        op.drop_column('admission_campaigns',name)
