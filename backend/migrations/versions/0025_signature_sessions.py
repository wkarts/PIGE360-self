"""Sessões GOV.BR vinculadas ao responsável, à matrícula e ao PDF exato."""
from alembic import op
import sqlalchemy as sa

revision = '0025_signature_sessions'
down_revision = '0024_admission_contract_binding'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('govbr_signature_sessions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('school_id', sa.String(36), sa.ForeignKey('schools.id'), nullable=False),
        sa.Column('account_id', sa.String(36), sa.ForeignKey('portal_accounts.id'), nullable=False),
        sa.Column('portal_session_id', sa.String(36), sa.ForeignKey('portal_sessions.id'), nullable=False),
        sa.Column('admission_id', sa.String(36), sa.ForeignKey('admissions.id'), nullable=False),
        sa.Column('issued_document_id', sa.String(36), sa.ForeignKey('issued_documents.id'), nullable=False),
        sa.Column('state_hash', sa.String(64), nullable=False, unique=True),
        sa.Column('browser_token_hash', sa.String(64), nullable=False),
        sa.Column('nonce', sa.String(128), nullable=False),
        sa.Column('encrypted_pkce', sa.Text(), nullable=False),
        sa.Column('source_sha256', sa.String(64), nullable=False),
        sa.Column('expected_cpf', sa.String(11), nullable=False),
        sa.Column('phase', sa.String(24), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('message', sa.String(240), nullable=False))
    op.create_index('ix_govbr_signature_sessions_school_id', 'govbr_signature_sessions', ['school_id'])
    op.create_index('ix_govbr_signature_sessions_account_id', 'govbr_signature_sessions', ['account_id'])


def downgrade():
    op.drop_table('govbr_signature_sessions')
