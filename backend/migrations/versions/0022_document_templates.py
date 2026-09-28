"""Modelos editáveis e emissão idempotente de documentos por matrícula."""
from alembic import op
import sqlalchemy as sa

revision = '0022_document_templates'
down_revision = '0021_legacy_import_archive'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'document_templates',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('school_id', sa.String(36), sa.ForeignKey('schools.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(160), nullable=False),
        sa.Column('kind', sa.String(40), nullable=False),
        sa.Column('header', sa.Text(), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('footer', sa.Text(), nullable=False),
        sa.Column('academic_year_id', sa.String(36), sa.ForeignKey('academic_years.id'), nullable=True),
        sa.Column('valid_from', sa.Date(), nullable=True),
        sa.Column('valid_until', sa.Date(), nullable=True),
        sa.Column('active', sa.Boolean(), nullable=False),
        sa.Column('require_signature', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('letterhead_file_id', sa.String(36), sa.ForeignKey('files.id'), nullable=True),
        sa.CheckConstraint('valid_until IS NULL OR valid_from IS NULL OR valid_until >= valid_from', name='ck_document_templates_template_validity'),
    )
    op.create_index('ix_document_templates_school_id', 'document_templates', ['school_id'])
    op.create_index('ix_document_templates_academic_year_id', 'document_templates', ['academic_year_id'])
    op.create_table(
        'document_template_revisions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('school_id', sa.String(36), sa.ForeignKey('schools.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('template_id', sa.String(36), sa.ForeignKey('document_templates.id'), nullable=False),
        sa.Column('version_number', sa.Integer(), nullable=False),
        sa.Column('sha256', sa.String(64), nullable=False),
        sa.Column('content', sa.JSON(), nullable=False),
        sa.Column('created_by', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.UniqueConstraint('template_id', 'version_number', name='uq_document_template_revision_version'),
    )
    op.create_index('ix_document_template_revisions_school_id', 'document_template_revisions', ['school_id'])
    op.create_index('ix_document_template_revisions_template_id', 'document_template_revisions', ['template_id'])
    with op.batch_alter_table('issued_documents') as batch:
        batch.add_column(sa.Column('template_id', sa.String(36), nullable=True))
        batch.add_column(sa.Column('idempotency_key', sa.String(120), nullable=True))
        batch.add_column(sa.Column('signature_status', sa.String(24), nullable=False, server_default='unsigned'))
        batch.create_foreign_key('fk_issued_documents_template_id_document_templates', 'document_templates', ['template_id'], ['id'])
        batch.create_unique_constraint('uq_issued_document_idempotency', ['school_id', 'idempotency_key'])
        batch.create_unique_constraint('uq_issued_document_template_enrollment_version',
                                       ['school_id', 'enrollment_id', 'template_id', 'template_version'])
        batch.create_index('ix_issued_documents_template_id', ['template_id'])


def downgrade():
    with op.batch_alter_table('issued_documents') as batch:
        batch.drop_index('ix_issued_documents_template_id')
        batch.drop_constraint('uq_issued_document_idempotency', type_='unique')
        batch.drop_constraint('uq_issued_document_template_enrollment_version', type_='unique')
        batch.drop_constraint('fk_issued_documents_template_id_document_templates', type_='foreignkey')
        batch.drop_column('signature_status')
        batch.drop_column('idempotency_key')
        batch.drop_column('template_id')
    op.drop_index('ix_document_templates_academic_year_id', table_name='document_templates')
    op.drop_index('ix_document_templates_school_id', table_name='document_templates')
    op.drop_index('ix_document_template_revisions_template_id', table_name='document_template_revisions')
    op.drop_index('ix_document_template_revisions_school_id', table_name='document_template_revisions')
    op.drop_table('document_template_revisions')
    op.drop_table('document_templates')
