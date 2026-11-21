"""Rascunhos locais de treinamento e evidências privadas do Educacenso."""
from alembic import op
import sqlalchemy as sa

revision = '0060_educacenso_training'
down_revision = '0059_class_materials_absences'
branch_labels = depends_on = None


def ref(name, table):
    return sa.Column(name, sa.String(36), sa.ForeignKey(table + '.id'), nullable=False)


def fields():
    return [sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('version', sa.Integer(), nullable=False), ref('school_id', 'schools'),
            ref('author_id', 'users'), sa.Column('digest', sa.String(64), nullable=False)]


def upgrade():
    op.create_table('educacenso_drafts', *fields(), ref('year_id', 'academic_years'),
                    sa.Column('stage', sa.String(24), nullable=False),
                    sa.Column('reference_date', sa.Date(), nullable=False),
                    sa.Column('snapshot', sa.JSON(), nullable=False),
                    sa.UniqueConstraint('school_id', 'digest', name='uq_censo_draft_digest'))
    op.create_table('educacenso_evidence', *fields(), ref('draft_id', 'educacenso_drafts'),
                    ref('file_id', 'files'), sa.UniqueConstraint('draft_id', 'digest', name='uq_censo_evidence_digest'))
    for table in ('educacenso_drafts', 'educacenso_evidence'):
        op.create_index('ix_' + table + '_school_id', table, ['school_id'])


def downgrade():
    if op.get_bind().execute(sa.text('SELECT 1 FROM educacenso_drafts LIMIT 1')).first():
        raise RuntimeError('Preserve os rascunhos e evidências. Desative o piloto por configuração.')
    op.drop_table('educacenso_evidence')
    op.drop_table('educacenso_drafts')
