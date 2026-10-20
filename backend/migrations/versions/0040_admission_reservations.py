"""Reserva financeira aditiva; inscrições antigas preservam a política anterior."""
from alembic import op
import sqlalchemy as sa

revision = '0040_admission_reservations'
down_revision = '0039_crm_bridge'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('admission_campaigns', sa.Column('payment_reservation_hours', sa.Integer(), nullable=True))
    op.add_column('admissions', sa.Column('reservation_status', sa.String(24), nullable=False, server_default='none'))
    op.add_column('admissions', sa.Column('reserved_until', sa.DateTime(timezone=True), nullable=True))
    op.add_column('admissions', sa.Column('reservation_paid_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('admissions', sa.Column('contract_signing_order', sa.String(24), nullable=False, server_default='school_first'))
    op.create_index('ix_admissions_reservation', 'admissions', ['class_group_id', 'reservation_status', 'reserved_until'])
    op.add_column('admission_attachments', sa.Column('storage_backend', sa.String(16), nullable=False, server_default='local'))
    op.add_column('admission_attachments', sa.Column('bucket_name', sa.String(120), nullable=False, server_default=''))


def downgrade():
    op.drop_column('admission_attachments', 'bucket_name')
    op.drop_column('admission_attachments', 'storage_backend')
    op.drop_index('ix_admissions_reservation', table_name='admissions')
    for column in ('contract_signing_order', 'reservation_paid_at', 'reserved_until', 'reservation_status'):
        op.drop_column('admissions', column)
    op.drop_column('admission_campaigns', 'payment_reservation_hours')
