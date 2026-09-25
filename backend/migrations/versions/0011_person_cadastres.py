"""Dados PF/PJ e detalhes de vínculos na mesma identidade cadastral."""
from alembic import op
import sqlalchemy as sa
revision = '0011_person_cadastres'
down_revision = '0010_institution_identity'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('persons', sa.Column('entity_kind', sa.String(16), nullable=False, server_default='individual'))
    op.add_column('persons', sa.Column('cnpj', sa.String(14), nullable=True))
    for name, size in [('trade_name', 180), ('state_registration', 40), ('municipal_registration', 40)]:
        op.add_column('persons', sa.Column(name, sa.String(size), nullable=False, server_default=''))
    op.create_index('uq_persons_school_cnpj', 'persons', ['school_id', 'cnpj'], unique=True)
    op.add_column('person_type_links', sa.Column('details', sa.JSON(), nullable=False, server_default='{}'))


def downgrade():
    op.drop_column('person_type_links', 'details')
    op.drop_index('uq_persons_school_cnpj', table_name='persons')
    for name in ['municipal_registration', 'state_registration', 'trade_name', 'cnpj', 'entity_kind']:
        op.drop_column('persons', name)
