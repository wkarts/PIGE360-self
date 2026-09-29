"""Certificado A1 protegido e histórico imutável de revisões assinadas."""
from alembic import op
import sqlalchemy as sa

revision = '0023_document_signatures'
down_revision = '0022_document_templates'
branch_labels = None
depends_on = None


def common():
    return [
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('school_id', sa.String(36), sa.ForeignKey('schools.id'), nullable=False),
    ]


def upgrade():
    op.create_table(
        'school_signing_certificates', *common(),
        sa.Column('encrypted_credentials', sa.Text(), nullable=False),
        sa.Column('certificate_sha256', sa.String(64), nullable=False),
        sa.Column('subject', sa.String(240), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('configured_by', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.UniqueConstraint('school_id', name='uq_school_signing_certificate_school'),
    )
    op.create_index('ix_school_signing_certificates_school_id', 'school_signing_certificates', ['school_id'])
    op.create_table(
        'issued_document_signatures', *common(),
        sa.Column('issued_document_id', sa.String(36), sa.ForeignKey('issued_documents.id'), nullable=False),
        sa.Column('file_id', sa.String(36), sa.ForeignKey('files.id'), nullable=False),
        sa.Column('previous_sha256', sa.String(64), nullable=False),
        sa.Column('sha256', sa.String(64), nullable=False),
        sa.Column('source', sa.String(24), nullable=False),
        sa.Column('signature_count', sa.Integer(), nullable=False),
        sa.Column('trust_status', sa.String(48), nullable=False),
        sa.Column('signer', sa.String(240), nullable=False),
        sa.Column('certificate_sha256', sa.String(64), nullable=False),
        sa.Column('idempotency_key', sa.String(128), nullable=False),
        sa.Column('created_by', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('validated_by', sa.String(36), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('validated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('signer_cpf', sa.String(11), nullable=False, server_default=''),
        sa.Column('validation_reference', sa.String(120), nullable=False, server_default=''),
        sa.Column('validation_evidence_file_id', sa.String(36), sa.ForeignKey('files.id'), nullable=True),
        sa.Column('rejection_reason', sa.Text(), nullable=False, server_default=''),
        sa.UniqueConstraint('issued_document_id', 'sha256', name='uq_issued_signature_pdf_hash'),
        sa.UniqueConstraint('issued_document_id', 'idempotency_key', name='uq_issued_signature_operation'),
    )
    op.create_index('ix_issued_document_signatures_school_id', 'issued_document_signatures', ['school_id'])
    op.create_index('ix_issued_document_signatures_issued_document_id', 'issued_document_signatures', ['issued_document_id'])


def downgrade():
    op.drop_table('issued_document_signatures')
    op.drop_table('school_signing_certificates')
