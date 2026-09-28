"""Vincula o contrato configurado à campanha e congela a revisão na aprovação."""
from alembic import op
import sqlalchemy as sa


revision = '0024_admission_contract_binding'
down_revision = '0023_document_signatures'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('admission_campaigns') as batch:
        batch.add_column(sa.Column('contract_template_id', sa.String(36), nullable=True))
        batch.create_foreign_key('fk_admission_campaigns_contract_template_id',
                                 'document_templates', ['contract_template_id'], ['id'])
        batch.create_index('ix_admission_campaigns_contract_template_id', ['contract_template_id'])
    with op.batch_alter_table('admissions') as batch:
        batch.add_column(sa.Column('contract_template_id', sa.String(36), nullable=True))
        batch.add_column(sa.Column('contract_template_version', sa.Integer(), nullable=True))
        batch.add_column(sa.Column('contract_template_revision_sha256', sa.String(64), nullable=True))
        batch.create_foreign_key('fk_admissions_contract_template_id',
                                 'document_templates', ['contract_template_id'], ['id'])
        batch.create_index('ix_admissions_contract_template_id', ['contract_template_id'])


def downgrade():
    with op.batch_alter_table('admissions') as batch:
        batch.drop_index('ix_admissions_contract_template_id')
        batch.drop_constraint('fk_admissions_contract_template_id', type_='foreignkey')
        batch.drop_column('contract_template_revision_sha256')
        batch.drop_column('contract_template_version')
        batch.drop_column('contract_template_id')
    with op.batch_alter_table('admission_campaigns') as batch:
        batch.drop_index('ix_admission_campaigns_contract_template_id')
        batch.drop_constraint('fk_admission_campaigns_contract_template_id', type_='foreignkey')
        batch.drop_column('contract_template_id')
