"""Integra os históricos existentes e separa o destino dos rascunhos."""
from alembic import op
import sqlalchemy as sa

revision = '0062_escola_contratos_censo'
down_revision = ('0061_school_census_options', '0060_contract_history')
branch_labels = depends_on = None


def upgrade():
    op.add_column('educacenso_drafts', sa.Column('environment', sa.String(16), nullable=False,
                                                 server_default='treinamento'))
    op.add_column('educacenso_evidence', sa.Column('reported_status', sa.String(48)))
    op.add_column('companies', sa.Column('allow_contract_history_removal', sa.Boolean(),
                                         nullable=False, server_default=sa.false()))


def downgrade():
    if op.get_bind().execute(sa.text("SELECT 1 FROM educacenso_drafts WHERE environment != 'treinamento' LIMIT 1")).first():
        raise RuntimeError('Preserve a separação de lotes antes de reverter.')
    if op.get_bind().execute(sa.text('SELECT 1 FROM educacenso_evidence WHERE reported_status IS NOT NULL LIMIT 1')).first():
        raise RuntimeError('Preserve os resultados registrados antes de reverter.')
    if op.get_bind().execute(sa.text('SELECT 1 FROM companies WHERE allow_contract_history_removal LIMIT 1')).first():
        raise RuntimeError('Revise a política da empresa antes de reverter.')
    op.drop_column('educacenso_evidence', 'reported_status')
    op.drop_column('companies', 'allow_contract_history_removal')
    op.drop_column('educacenso_drafts', 'environment')
