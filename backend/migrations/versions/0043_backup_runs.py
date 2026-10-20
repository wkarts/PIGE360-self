"""Fila e histórico de backup da instalação; sem exclusão de dados existentes."""
from alembic import op
import sqlalchemy as sa

revision='0043_backup_runs'
down_revision='0042_bridge_configuration'
branch_labels=None
depends_on=None


def common():
    return [sa.Column('id',sa.String(36),primary_key=True),sa.Column('created_at',sa.DateTime(timezone=True),nullable=False),
        sa.Column('updated_at',sa.DateTime(timezone=True),nullable=False),sa.Column('version',sa.Integer(),nullable=False)]


def upgrade():
    op.create_table('backup_runs',*common(),
        sa.Column('created_by',sa.String(36),sa.ForeignKey('users.id'),nullable=False),
        sa.Column('status',sa.String(24),nullable=False),sa.Column('stage',sa.String(40),nullable=False),
        sa.Column('error_code',sa.String(80),nullable=False),sa.Column('sha256',sa.String(64),nullable=False),
        sa.Column('size',sa.BigInteger(),nullable=False),sa.Column('completed_at',sa.DateTime(timezone=True)),
        sa.Column('remote_status',sa.String(24),nullable=False),sa.Column('remote_id',sa.String(256),nullable=False))
    op.create_table('backup_targets',*common(),sa.Column('provider',sa.String(16),nullable=False),
        sa.Column('folder',sa.String(256),nullable=False),sa.Column('encrypted_token',sa.Text(),nullable=False))


def downgrade():
    op.drop_table('backup_targets');op.drop_table('backup_runs')
