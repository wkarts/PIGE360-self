"""Assinaturas XML fiscais e preferências de vencimento do certificado."""
from alembic import op
import sqlalchemy as sa

revision = '0028_fiscal_certificate_alerts'
down_revision = '0027_email_client'
branch_labels = None
depends_on = None


def common_columns():
    return [sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('version', sa.Integer(), nullable=False),
            sa.Column('school_id', sa.String(36), sa.ForeignKey('schools.id'), nullable=False)]


def upgrade():
    op.create_table('signed_fiscal_documents', *common_columns(),
        sa.Column('profile', sa.String(32), nullable=False),
        sa.Column('original_sha256', sa.String(64), nullable=False),
        sa.Column('signed_sha256', sa.String(64), nullable=False),
        sa.Column('certificate_sha256', sa.String(64), nullable=False),
        sa.Column('original_file_id', sa.String(36), sa.ForeignKey('files.id'), nullable=False),
        sa.Column('signed_file_id', sa.String(36), sa.ForeignKey('files.id'), nullable=False),
        sa.Column('created_by', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.UniqueConstraint('school_id', 'profile', 'original_sha256', 'certificate_sha256', name='uq_fiscal_signature_source'))
    op.create_index('ix_signed_fiscal_documents_school_id', 'signed_fiscal_documents', ['school_id'])
    op.create_table('certificate_alert_preferences', *common_columns(),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('email_enabled', sa.Boolean(), nullable=False),
        sa.Column('whatsapp_enabled', sa.Boolean(), nullable=False),
        sa.UniqueConstraint('school_id', 'user_id', name='uq_certificate_alert_preference'))
    op.create_index('ix_certificate_alert_preferences_school_id', 'certificate_alert_preferences', ['school_id'])
    op.create_index('ix_certificate_alert_preferences_user_id', 'certificate_alert_preferences', ['user_id'])


def downgrade():
    op.drop_table('certificate_alert_preferences')
    op.drop_table('signed_fiscal_documents')
