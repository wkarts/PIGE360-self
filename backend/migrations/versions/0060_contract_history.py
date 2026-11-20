"""Preservação explícita de vias contratuais substituídas."""
from alembic import op
import sqlalchemy as sa

revision = '0060_contract_history'
down_revision = '0059_class_materials_absences'
branch_labels = depends_on = None


def upgrade():
    op.add_column('schools', sa.Column('allow_contract_history_removal', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column('issued_documents', sa.Column('superseded_at', sa.DateTime(timezone=True)))
    op.add_column('issued_documents', sa.Column('history_removed_at', sa.DateTime(timezone=True)))


def downgrade():
    # Remover as marcas reabriria vias ocultadas e permitiria reutilização.
    bind = op.get_bind()
    if bind.execute(sa.text('SELECT 1 FROM issued_documents WHERE superseded_at IS NOT NULL OR history_removed_at IS NOT NULL LIMIT 1')).first():
        raise RuntimeError('Preserve a trilha de contratos substituídos antes de reverter esta migração.')
    if bind.execute(sa.text('SELECT 1 FROM schools WHERE allow_contract_history_removal LIMIT 1')).first():
        raise RuntimeError('Desative a remoção administrativa de contratos antes de reverter.')
    op.drop_column('issued_documents', 'history_removed_at')
    op.drop_column('issued_documents', 'superseded_at')
    op.drop_column('schools', 'allow_contract_history_removal')
