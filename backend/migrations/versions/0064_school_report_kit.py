"""Preferências de emissão e calendário efetivo por turma."""
from alembic import op
import sqlalchemy as sa

revision = '0064_school_report_kit'
down_revision = '0063_retomada_censo_contratos'
branch_labels = depends_on = None


def upgrade():
    op.add_column('schools', sa.Column('report_logo', sa.LargeBinary(), nullable=True))
    op.add_column('schools', sa.Column('report_preferences', sa.JSON(), nullable=False, server_default='{}'))
    op.add_column('class_groups', sa.Column('academic_period_ids', sa.JSON(), nullable=False, server_default='[]'))
    op.add_column('academic_periods', sa.Column('class_calendar_only', sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade():
    for table, column in [('academic_periods', 'class_calendar_only'), ('class_groups', 'academic_period_ids'), ('schools', 'report_preferences'), ('schools', 'report_logo')]:
        op.drop_column(table, column)
