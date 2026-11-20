"""Vigência de oferta do componente, sem reclassificar cadastros anteriores."""
from alembic import op
import sqlalchemy as sa

revision = '0060_component_validity'
down_revision = '0059_class_materials_absences'
branch_labels = depends_on = None


def upgrade():
    op.add_column('curriculum_components', sa.Column('retired_from', sa.Date(), nullable=True))


def downgrade():
    if op.get_bind().execute(sa.text(
            'SELECT 1 FROM curriculum_components WHERE retired_from IS NOT NULL LIMIT 1')).first():
        raise RuntimeError('Restaure o backup anterior para preservar a vigência dos componentes.')
    op.drop_column('curriculum_components', 'retired_from')
