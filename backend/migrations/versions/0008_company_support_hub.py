"""Configuração do chat de suporte do Hub por empresa/tenant."""
from alembic import op
import sqlalchemy as sa

revision = "0008_company_support_hub"
down_revision = "0007_secretaria_staff_profiles"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'company_support_settings',
        sa.Column('company_id', sa.String(length=36), nullable=False),
        sa.Column('enabled', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('base_url', sa.String(length=500), nullable=False, server_default=''),
        sa.Column('position', sa.String(length=16), nullable=False, server_default='left'),
        sa.Column('widget_type', sa.String(length=40), nullable=False, server_default='expanded_bubble'),
        sa.Column('launcher_title', sa.String(length=80), nullable=False, server_default='Suporte'),
        sa.Column('encrypted_token', sa.Text(), nullable=False, server_default=''),
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], name=op.f('fk_company_support_settings_company_id_companies')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_company_support_settings')),
        sa.UniqueConstraint('company_id', name=op.f('uq_company_support_settings_company_id')),
        sa.CheckConstraint("position IN ('left','right')", name='support_hub_position'),
    )
    op.create_index(
        op.f('ix_company_support_settings_company_id'),
        'company_support_settings',
        ['company_id'],
        unique=False,
    )


def downgrade():
    op.drop_index(op.f('ix_company_support_settings_company_id'), table_name='company_support_settings')
    op.drop_table('company_support_settings')
