"""Cobranças internas e baixa integral sem dependência de provedor bancário."""
from alembic import op
import sqlalchemy as sa

revision = '0030_manual_school_charges'
down_revision = '0029_record_lifecycle'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('bank_charges') as batch:
        batch.alter_column('connection_id', existing_type=sa.String(36), nullable=True)
        batch.add_column(sa.Column('collection_mode', sa.String(16), nullable=False, server_default='provider'))
        batch.add_column(sa.Column('manual_paid_on', sa.Date(), nullable=True))
        batch.add_column(sa.Column('manual_paid_amount', sa.Numeric(12,2), nullable=True))
        batch.add_column(sa.Column('manual_payment_method', sa.String(24), nullable=False, server_default=''))
        batch.add_column(sa.Column('manual_reference', sa.String(200), nullable=False, server_default=''))
        batch.add_column(sa.Column('manual_receipt_key', sa.String(80), nullable=True))
        batch.add_column(sa.Column('manual_received_by', sa.String(36), nullable=True))
        batch.create_foreign_key('fk_bank_charges_manual_received_by_users', 'users', ['manual_received_by'], ['id'])
        batch.create_unique_constraint('uq_bank_charges_manual_receipt', ['school_id','manual_receipt_key'])
        batch.drop_constraint(op.f('ck_bank_charges_charge_type'), type_='check')
        batch.create_check_constraint('charge_type', "billing_type IN ('PIX','BOLETO','MANUAL')")
        batch.create_check_constraint('charge_collection_mode', "(collection_mode = 'manual' AND connection_id IS NULL AND billing_type = 'MANUAL') OR (collection_mode = 'provider' AND connection_id IS NOT NULL AND billing_type IN ('PIX','BOLETO'))")


def downgrade():
    count=op.get_bind().execute(sa.text("SELECT COUNT(*) FROM bank_charges WHERE collection_mode='manual'")).scalar()
    if count:
        raise RuntimeError('Não é possível remover cobranças manuais registradas. Preserve o histórico financeiro antes de reverter a versão.')
    with op.batch_alter_table('bank_charges') as batch:
        batch.drop_constraint(op.f('ck_bank_charges_charge_collection_mode'), type_='check')
        batch.drop_constraint(op.f('ck_bank_charges_charge_type'), type_='check')
        batch.create_check_constraint('charge_type', "billing_type IN ('PIX','BOLETO')")
        batch.drop_constraint('uq_bank_charges_manual_receipt', type_='unique')
        batch.drop_constraint('fk_bank_charges_manual_received_by_users', type_='foreignkey')
        for name in ('manual_received_by','manual_receipt_key','manual_reference','manual_payment_method','manual_paid_amount','manual_paid_on','collection_mode'):
            batch.drop_column(name)
        batch.alter_column('connection_id', existing_type=sa.String(36), nullable=False)
