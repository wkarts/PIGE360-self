"""Versioned variable requirements and resumable contract preparation."""
from alembic import op
import sqlalchemy as sa

revision = '0057_contract_field_options'
down_revision = '0056_crm_bridge_external'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('document_templates', sa.Column('field_options', sa.JSON(), nullable=False, server_default='{}'))
    op.create_table('contract_preparation_drafts',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('school_id', sa.String(36), sa.ForeignKey('schools.id'), nullable=False),
        sa.Column('enrollment_id', sa.String(36), sa.ForeignKey('enrollments.id'), nullable=False),
        sa.Column('template_id', sa.String(36), sa.ForeignKey('document_templates.id'), nullable=False),
        sa.Column('template_version', sa.Integer(), nullable=False),
        sa.Column('values', sa.JSON(), nullable=False),
        sa.Column('updated_by', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.UniqueConstraint('school_id', 'enrollment_id', 'template_id', 'template_version', name='uq_contract_preparation_revision'))
    op.create_index('ix_contract_preparation_drafts_school_id', 'contract_preparation_drafts', ['school_id'])


def downgrade():
    # Drafts may contain work not yet issued: keep them until explicitly exported.
    raise RuntimeError('Exporte os rascunhos contratuais antes de remover esta migração.')
