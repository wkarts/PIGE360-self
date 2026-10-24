"""Separate external bridge journal; never reinterprets v1/v2 invoice history."""
from alembic import op
import sqlalchemy as sa
revision='0056_crm_bridge_external'
down_revision='0055_website_model_checkpoint'
branch_labels=None
depends_on=None

def upgrade():
    op.create_table('crm_bridge_external_requests',
        sa.Column('id',sa.String(36),primary_key=True),
        sa.Column('created_at',sa.DateTime(timezone=True),nullable=False),
        sa.Column('updated_at',sa.DateTime(timezone=True),nullable=False),
        sa.Column('version',sa.Integer(),nullable=False),
        sa.Column('school_id',sa.String(36),sa.ForeignKey('schools.id'),nullable=False),
        sa.Column('charge_id',sa.String(36),sa.ForeignKey('bank_charges.id'),nullable=False),
        sa.Column('invoice_request_id',sa.String(36),sa.ForeignKey('crm_bridge_requests.id'),nullable=False),
        sa.Column('connection_id',sa.String(64),nullable=False),
        sa.Column('scope',sa.JSON(),nullable=False),sa.Column('raw_body',sa.Text(),nullable=False),
        sa.Column('payload_hash',sa.String(64),nullable=False),sa.Column('status',sa.String(24),nullable=False),
        sa.Column('request_id',sa.String(128)),sa.Column('receipt',sa.JSON(),nullable=False),
        sa.Column('last_command',sa.JSON(),nullable=False),sa.Column('error_code',sa.String(80),nullable=False),
        sa.Column('attempts',sa.Integer(),nullable=False),
        sa.UniqueConstraint('school_id','charge_id',name='uq_crm_bridge_external_charge'),
        sa.UniqueConstraint('connection_id','request_id',name='uq_crm_bridge_external_remote'))
    op.create_index('ix_crm_bridge_external_requests_school_id','crm_bridge_external_requests',['school_id'])

def downgrade():
    raise RuntimeError('Export and reconcile external financial journal before a destructive downgrade.')
