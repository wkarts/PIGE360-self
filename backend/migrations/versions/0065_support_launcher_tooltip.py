"""Título configurável da bolha do atendimento por escola."""
from alembic import op
import sqlalchemy as sa

revision = '0065_support_launcher_tooltip'
down_revision = '0064_school_report_kit'
branch_labels = depends_on = None


def upgrade():
    op.add_column('school_support_settings', sa.Column('launcher_tooltip', sa.String(120), nullable=False, server_default='Abrir Conversa'))


def downgrade():
    op.drop_column('school_support_settings', 'launcher_tooltip')
