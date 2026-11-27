"""Consentimento, escopo da autorização e reserva de um débito por ciclo."""
from alembic import op
import sqlalchemy as sa

revision = '0067_asaas_pix_auto'
down_revision = '0066_asaas_native_ops'
branch_labels = depends_on = None


def record():
    return [sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('school_id', sa.String(36), sa.ForeignKey('schools.id'), nullable=False, index=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('version', sa.Integer, nullable=False)]


def link(name, target, **kw):
    return sa.Column(name, sa.String(36), sa.ForeignKey(target+'.id'), nullable=False, **kw)


def upgrade():
    op.create_table('asaas_pix_authorizations', *record(), link('connection_id', 'integration_connections'),
        link('charge_id','bank_charges', index=True), link('enrollment_id','enrollments'), link('payer_id','persons'),
        link('consent_user_id','users'), sa.Column('credential_scope',sa.String(64),nullable=False),
        sa.Column('terms_version',sa.String(40),nullable=False), sa.Column('quote',sa.String(64),nullable=False),
        sa.Column('customer_id',sa.String(160),nullable=False), sa.Column('contract_id',sa.String(35),unique=True,nullable=False),
        sa.Column('frequency',sa.String(20),nullable=False), sa.Column('start_date',sa.Date,nullable=False),
        sa.Column('amount',sa.Numeric(12,2),nullable=False), sa.Column('status',sa.String(24),nullable=False,index=True),
        sa.Column('remote_id',sa.String(128)), sa.Column('conciliation',sa.String(128)),
        sa.Column('expires_at',sa.DateTime(timezone=True)), sa.Column('encrypted_qr',sa.Text,nullable=False),
        sa.Column('scan_offset',sa.Integer,nullable=False), sa.Column('terminal_scan_at',sa.DateTime(timezone=True)), sa.Column('verified_at',sa.DateTime(timezone=True)),
        sa.UniqueConstraint('connection_id','remote_id'), sa.UniqueConstraint('connection_id','conciliation'))
    op.create_table('asaas_pix_cycles', *record(), link('authorization_id','asaas_pix_authorizations',index=True),
        link('charge_id','bank_charges',unique=True), sa.Column('cycle',sa.Integer,nullable=False),
        sa.Column('due_on',sa.Date,nullable=False), sa.Column('amount',sa.Numeric(12,2),nullable=False),
        sa.Column('status',sa.String(24),nullable=False,index=True), sa.Column('previous_payment_id',sa.String(160)),
        sa.Column('payment_id',sa.String(160)), sa.Column('instruction_status',sa.String(24),nullable=False),
        sa.UniqueConstraint('authorization_id','cycle'))


def downgrade():
    op.drop_table('asaas_pix_cycles')
    op.drop_table('asaas_pix_authorizations')
