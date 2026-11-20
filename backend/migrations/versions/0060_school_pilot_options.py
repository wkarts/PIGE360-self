"""Opções acadêmicas da instituição, desativadas também nas escolas existentes."""
from alembic import op
import sqlalchemy as sa

revision = '0060_school_pilot_options'
down_revision = '0059_class_materials_absences'
branch_labels = depends_on = None


def upgrade():
    for name in ('diary_catalog', 'educacenso_training'):
        op.add_column('schools', sa.Column(name, sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade():
    for name in ('educacenso_training', 'diary_catalog'):
        op.drop_column('schools', name)
