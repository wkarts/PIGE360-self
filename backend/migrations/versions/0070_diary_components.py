"""Campos de aula e planejamento da composição do diário."""
from alembic import op
import sqlalchemy as sa

revision = '0070_diary_components'
down_revision = '0069_asaas_admission_fee'
branch_labels = depends_on = None


def upgrade():
    op.add_column('schools', sa.Column('diary_entry_settings', sa.JSON(), nullable=False, server_default='{}'))
    for table in ('diary_lessons', 'curriculum_plans'):
        op.add_column(table, sa.Column('extra_fields', sa.JSON(), nullable=False, server_default='[]'))


def downgrade():
    for table in ('curriculum_plans', 'diary_lessons'):
        op.drop_column(table, 'extra_fields')
    op.drop_column('schools', 'diary_entry_settings')
