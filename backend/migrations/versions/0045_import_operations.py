"""Operações persistentes de portabilidade, sem alterar o histórico importado."""
from alembic import op
import sqlalchemy as sa
revision='0045_import_operations'
down_revision='0044_school_website'
branch_labels=None
depends_on=None

def upgrade():
    op.create_table('import_operations',
        sa.Column('id',sa.String(36),primary_key=True),
        sa.Column('created_at',sa.DateTime(timezone=True),nullable=False),
        sa.Column('updated_at',sa.DateTime(timezone=True),nullable=False),
        sa.Column('version',sa.Integer(),nullable=False),
        sa.Column('school_id',sa.String(36),sa.ForeignKey('schools.id'),nullable=False),
        sa.Column('created_by',sa.String(36),sa.ForeignKey('users.id'),nullable=False),
        sa.Column('fingerprint',sa.String(64),nullable=False),
        sa.Column('job_id',sa.String(36),sa.ForeignKey('integration_jobs.id')),
        sa.Column('stage',sa.String(40),nullable=False),
        sa.Column('progress',sa.JSON(),nullable=False),sa.Column('result',sa.JSON(),nullable=False),sa.Column('options',sa.JSON(),nullable=False),
        sa.UniqueConstraint('school_id','fingerprint',name='uq_import_operation_selection'))
    op.create_index('ix_import_operations_school_id','import_operations',['school_id'])

def downgrade():op.drop_table('import_operations')
