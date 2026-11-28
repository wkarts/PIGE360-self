"""Diário idempotente das operações Asaas nativas por escola."""
import sqlalchemy as sa
from alembic import op

revision = '0066_asaas_native_ops'
down_revision = '0065_support_launcher_tooltip'
branch_labels = depends_on = None
TABLE = 'asaas_native_operations'


def upgrade():
    op.create_table(
        TABLE,
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('school_id', sa.String(36), sa.ForeignKey('schools.id'), nullable=False),
        sa.Column('connection_id', sa.String(36), sa.ForeignKey('integration_connections.id'), nullable=False),
        sa.Column('charge_id', sa.String(36), sa.ForeignKey('bank_charges.id')),
        sa.Column('created_by', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('client_key', sa.String(128), nullable=False),
        sa.Column('kind', sa.String(64), nullable=False),
        sa.Column('fingerprint', sa.String(64), nullable=False),
        sa.Column('issuance_channel', sa.String(16)),
        sa.Column('released_at', sa.DateTime(timezone=True)),
        sa.Column('status', sa.String(16), nullable=False),
        sa.Column('remote_id', sa.String(160), nullable=False),
        sa.Column('response', sa.JSON(), nullable=False),
        sa.Column('error_code', sa.String(80), nullable=False),
        sa.UniqueConstraint('school_id', 'client_key', name='uq_asaas_native_school_key'),
        sa.CheckConstraint("status IN ('processing','completed','failed','uncertain')", name='asaas_operation_status'),
    )
    op.create_index('ix_asaas_native_operations_school_id', TABLE, ['school_id'])
    op.create_index('ix_asaas_native_school_created', TABLE, ['school_id', 'created_at', 'id'])
    op.create_index('ix_asaas_native_remote', TABLE, ['connection_id', 'remote_id'])
    active = sa.text("issuance_channel IS NOT NULL AND released_at IS NULL AND status IN ('processing','completed','uncertain')")
    op.create_index('uq_asaas_native_active_issuance', TABLE, ['school_id', 'charge_id'], unique=True,
                    postgresql_where=active, sqlite_where=active)
    lifecycle = sa.text("kind IN ('adjust','cash_receipt','reactivate','refund') AND status IN ('processing','uncertain')")
    op.create_index('uq_asaas_native_active_lifecycle', TABLE, ['school_id', 'charge_id'], unique=True,
                    postgresql_where=lifecycle, sqlite_where=lifecycle)


def downgrade():
    op.drop_table(TABLE)
