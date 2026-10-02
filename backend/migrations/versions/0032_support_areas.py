"""Atendimento por instituição e seleção explícita de áreas de exibição."""
from uuid import uuid4
from alembic import op
import sqlalchemy as sa

revision = '0032_support_areas'
down_revision = '0031_user_access_profiles'
branch_labels = None
depends_on = None


def upgrade():
    target = op.create_table(
        'school_support_settings',
        sa.Column('school_id', sa.String(36), nullable=False),
        sa.Column('enabled', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('enabled_areas', sa.JSON(), nullable=False, server_default='["online_enrollment"]'),
        sa.Column('base_url', sa.String(500), nullable=False, server_default=''),
        sa.Column('position', sa.String(16), nullable=False, server_default='left'),
        sa.Column('widget_type', sa.String(40), nullable=False, server_default='expanded_bubble'),
        sa.Column('launcher_title', sa.String(80), nullable=False, server_default='Suporte'),
        sa.Column('encrypted_token', sa.Text(), nullable=False, server_default=''),
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
        sa.ForeignKeyConstraint(['school_id'], ['schools.id'], name=op.f('fk_school_support_settings_school_id_schools')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_school_support_settings')),
        sa.CheckConstraint("position IN ('left','right')", name='school_support_position'),
    )
    op.create_index(op.f('ix_school_support_settings_school_id'), 'school_support_settings', ['school_id'], unique=True)
    # Copia apenas para as instituições da mesma mantenedora, sem decifrar,
    # registrar ou devolver o segredo. Cada nova configuração é independente.
    connection = op.get_bind()
    rows = connection.execute(sa.text('''
        SELECT s.id AS school_id, c.enabled, c.base_url, c.position,
               c.widget_type, c.launcher_title, c.encrypted_token,
               c.created_at, c.updated_at, c.version
          FROM company_support_settings c JOIN schools s ON s.company_id = c.company_id
    ''')).mappings()
    for row in rows:
        data = dict(row)
        data.update(id=str(uuid4()), enabled_areas=['online_enrollment'])
        # DateTime values from SQLite text queries are strings; typed reflection
        # lets the driver perform identical conversion on SQLite/PostgreSQL.
        for key in ('created_at', 'updated_at'):
            if isinstance(data[key], str):
                from datetime import datetime
                data[key] = datetime.fromisoformat(data[key])
        connection.execute(target.insert().values(**data))


def downgrade():
    op.drop_index(op.f('ix_school_support_settings_school_id'), table_name='school_support_settings')
    op.drop_table('school_support_settings')
