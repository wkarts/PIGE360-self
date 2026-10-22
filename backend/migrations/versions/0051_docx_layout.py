"""Originais e mapeamentos DOCX versionados, sem alterar documentos emitidos."""
from alembic import op
import sqlalchemy as sa
revision='0051_docx_layout'
down_revision='0050_enrollment_batches'
branch_labels=None
depends_on=None

def upgrade():
    with op.batch_alter_table('document_templates') as batch:
        batch.add_column(sa.Column('source_docx_file_id',sa.String(36),nullable=True))
        batch.add_column(sa.Column('docx_mapping',sa.JSON(),nullable=False,server_default='[]'))
        batch.add_column(sa.Column('docx_reviewed',sa.Boolean(),nullable=False,server_default=sa.false()))
        batch.create_foreign_key('fk_template_docx_source','files',['source_docx_file_id'],['id'])

def downgrade():
    with op.batch_alter_table('document_templates') as batch:
        batch.drop_constraint('fk_template_docx_source',type_='foreignkey')
        for name in ('docx_reviewed','docx_mapping','source_docx_file_id'):batch.drop_column(name)
