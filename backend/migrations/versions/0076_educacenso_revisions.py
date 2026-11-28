"""Preserva cada revisão declaratória e permite arquivar lotes locais."""
from alembic import op
import sqlalchemy as sa

revision = '0076_educacenso_revisions'
down_revision = '0075_portal_protocols'
branch_labels = depends_on = None


def upgrade():
    op.add_column('educacenso_drafts', sa.Column('archived', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column('educacenso_drafts', sa.Column('selection_digest', sa.String(64)))
    op.execute('UPDATE educacenso_drafts SET selection_digest = digest')
    op.create_index('ix_educacenso_drafts_selection_digest', 'educacenso_drafts', ['selection_digest'])
    op.create_table('educacenso_draft_revisions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('school_id', sa.String(36), sa.ForeignKey('schools.id'), nullable=False),
        sa.Column('draft_id', sa.String(36), sa.ForeignKey('educacenso_drafts.id'), nullable=False),
        sa.Column('draft_version', sa.Integer(), nullable=False),
        sa.Column('snapshot', sa.JSON(), nullable=False),
        sa.Column('digest', sa.String(64), nullable=False),
        sa.Column('reason', sa.String(1000), nullable=False),
        sa.Column('author_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.UniqueConstraint('draft_id', 'draft_version', name='uq_censo_revision_version'))
    op.create_index('ix_educacenso_draft_revisions_school_id','educacenso_draft_revisions',['school_id'])


def downgrade():
    if op.get_bind().execute(sa.text('SELECT 1 FROM educacenso_draft_revisions LIMIT 1')).first():
        raise RuntimeError('Preserve as revisões e o histórico de arquivamento dos lotes antes de voltar.')
    op.drop_table('educacenso_draft_revisions')
    op.drop_index('ix_educacenso_drafts_selection_digest', table_name='educacenso_drafts')
    op.drop_column('educacenso_drafts', 'selection_digest')
    op.drop_column('educacenso_drafts', 'archived')
