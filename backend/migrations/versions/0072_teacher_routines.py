"""Liberação individual das rotinas docentes no vínculo com a instituição."""
from alembic import op
import sqlalchemy as sa


revision = '0072_teacher_routines'
down_revision = '0071_user_access_purpose'
branch_labels = depends_on = None


def upgrade():
    op.add_column('school_access', sa.Column('teacher_routines', sa.JSON(), nullable=True))


def downgrade():
    op.drop_column('school_access', 'teacher_routines')
