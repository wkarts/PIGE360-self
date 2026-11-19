"""Permite um perfil financeiro independente da direção e da administração."""
from alembic import op
import sqlalchemy as sa

revision = '0058_finance_role'
down_revision = '0057_contract_field_options'
branch_labels = None
depends_on = None

PREVIOUS = "'admin','direction','coordination','secretary','teacher','student','guardian','viewer'"


def set_roles(roles):
    name = op.f('ck_users_valid_role')
    with op.batch_alter_table('users') as batch:
        batch.drop_constraint(name, type_='check')
        batch.create_check_constraint(name, f'role IN ({roles})')


def upgrade():
    set_roles(PREVIOUS + ",'finance'")


def downgrade():
    for table, field in [('users', 'role'), ('school_access_profiles', 'base_role')]:
        if op.get_bind().execute(sa.text(f"SELECT 1 FROM {table} WHERE {field}='finance' LIMIT 1")).first():
            raise RuntimeError('Reatribua as contas e perfis financeiros antes de reverter esta revisão.')
    set_roles(PREVIOUS)
