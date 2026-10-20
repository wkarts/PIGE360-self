"""Habilitação de portabilidade e delegação sem elevar o papel do usuário."""
from alembic import op
import sqlalchemy as sa

revision='0041_portability_access'
down_revision='0040_admission_reservations'
branch_labels=None
depends_on=None


def upgrade():
    op.add_column('installation',sa.Column('portability_enabled',sa.Boolean(),nullable=True))
    op.add_column('installation',sa.Column('portability_version',sa.Integer(),nullable=False,server_default='1'))
    op.add_column('school_access',sa.Column('portability_granted',sa.Boolean(),nullable=False,server_default=sa.false()))


def downgrade():
    op.drop_column('school_access','portability_granted')
    op.drop_column('installation','portability_version')
    op.drop_column('installation','portability_enabled')
