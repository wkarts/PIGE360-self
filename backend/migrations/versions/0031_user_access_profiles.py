"""Perfis e ciclo de vida dos acessos por instituição."""
from alembic import op
import sqlalchemy as sa

revision = '0031_user_access_profiles'
down_revision = '0030_manual_school_charges'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('school_access_profiles',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('school_id', sa.String(36), sa.ForeignKey('schools.id'), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.String(500), nullable=False, server_default=''),
        sa.Column('base_role', sa.String(32), nullable=False),
        sa.Column('permissions', sa.JSON(), nullable=False),
        sa.Column('active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.UniqueConstraint('school_id','name',name='uq_access_profile_school_name'))
    op.create_index('ix_school_access_profiles_school_id','school_access_profiles',['school_id'])
    with op.batch_alter_table('school_access') as batch:
        batch.add_column(sa.Column('active',sa.Boolean(),nullable=False,server_default=sa.true()))
        batch.add_column(sa.Column('version',sa.Integer(),nullable=False,server_default='1'))
        batch.add_column(sa.Column('access_profile_id',sa.String(36),nullable=True))
        batch.add_column(sa.Column('archived_at',sa.DateTime(timezone=True),nullable=True))
        batch.create_foreign_key('fk_school_access_profile','school_access_profiles',['access_profile_id'],['id'])
        batch.create_index('ix_school_access_access_profile_id',['access_profile_id'])
    # Converte o acesso administrativo implícito anterior em vínculos explícitos,
    # sem conceder qualquer instituição nova a contas criadas após a migração.
    op.execute(sa.text("INSERT INTO school_access (user_id, school_id, active, version) SELECT u.id, s.id, TRUE, 1 FROM users u CROSS JOIN schools s WHERE u.role='admin' AND NOT EXISTS (SELECT 1 FROM school_access a WHERE a.user_id=u.id AND a.school_id=s.id)"))


def downgrade():
    with op.batch_alter_table('school_access') as batch:
        batch.drop_index('ix_school_access_access_profile_id')
        batch.drop_constraint('fk_school_access_profile',type_='foreignkey')
        for name in ('archived_at','access_profile_id','version','active'):
            batch.drop_column(name)
    op.drop_index('ix_school_access_profiles_school_id',table_name='school_access_profiles')
    op.drop_table('school_access_profiles')
