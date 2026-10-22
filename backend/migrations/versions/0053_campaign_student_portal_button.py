"""Visibilidade do atalho do portal escolar por publicação de matrícula."""
from alembic import op
import sqlalchemy as sa

revision = '0053_campaign_portal_button'
down_revision = '0052_imported_identifiers'
branch_labels = None
depends_on = None

def upgrade():
    # Preserve availability of the existing portal shortcut on current campaigns.
    op.add_column('admission_campaigns', sa.Column('show_student_portal_button', sa.Boolean(), nullable=False, server_default=sa.true()))

def downgrade():
    op.drop_column('admission_campaigns', 'show_student_portal_button')
