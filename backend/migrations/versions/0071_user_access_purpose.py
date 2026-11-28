"""Distingue recuperação de senha dos convites de primeiro acesso."""
from alembic import op
import sqlalchemy as sa

revision = '0071_user_access_purpose'
down_revision = '0070_diary_components'
branch_labels = depends_on = None


def upgrade():
    op.add_column('user_invitations', sa.Column('purpose', sa.String(20), nullable=False, server_default='first_access'))


def downgrade():
    op.execute("DELETE FROM user_invitations WHERE purpose = 'password_reset'")
    op.drop_column('user_invitations', 'purpose')
