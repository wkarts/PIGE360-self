"""Opt-in CRM bridge outbox and immutable observations; no native finance changes."""
from alembic import op
import sqlalchemy as sa

revision = '0039_crm_bridge'
down_revision = '0038_webmail_preferences'
branch_labels = None
depends_on = None


def common():
    return [sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('version', sa.Integer(), nullable=False)]


def upgrade():
    op.create_table('crm_bridge_requests', *common(),
        sa.Column('school_id', sa.String(36), sa.ForeignKey('schools.id'), nullable=False),
        sa.Column('charge_id', sa.String(36), sa.ForeignKey('bank_charges.id'), nullable=False),
        sa.Column('connection_id', sa.String(64), nullable=False),
        sa.Column('scope', sa.JSON(), nullable=False),
        sa.Column('raw_body', sa.Text(), nullable=False),
        sa.Column('payload_hash', sa.String(64), nullable=False),
        sa.Column('status', sa.String(24), nullable=False),
        sa.Column('request_id', sa.String(128)),
        sa.Column('receipt', sa.JSON(), nullable=False),
        sa.Column('attempts', sa.Integer(), nullable=False),
        sa.Column('available_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('error_code', sa.String(80), nullable=False),
        sa.UniqueConstraint('school_id', 'charge_id', name='uq_crm_bridge_charge'),
        sa.UniqueConstraint('connection_id', 'request_id', name='uq_crm_bridge_remote_request'))
    for col in ('school_id', 'available_at'):
        op.create_index('ix_crm_bridge_requests_' + col, 'crm_bridge_requests', [col])
    op.create_table('crm_bridge_observations', *common(),
        sa.Column('school_id', sa.String(36), sa.ForeignKey('schools.id'), nullable=False),
        sa.Column('bridge_request_id', sa.String(36), sa.ForeignKey('crm_bridge_requests.id'), nullable=False),
        sa.Column('connection_id', sa.String(64), nullable=False),
        sa.Column('event_id', sa.String(36), nullable=False),
        sa.Column('payload_hash', sa.String(64), nullable=False),
        sa.Column('status', sa.String(24), nullable=False),
        sa.UniqueConstraint('connection_id', 'event_id', name='uq_crm_bridge_event'))
    for col in ('school_id', 'bridge_request_id'):
        op.create_index('ix_crm_bridge_observations_' + col, 'crm_bridge_observations', [col])


def downgrade():
    # Operator must export the journal before a destructive downgrade.
    op.drop_table('crm_bridge_observations')
    op.drop_table('crm_bridge_requests')
