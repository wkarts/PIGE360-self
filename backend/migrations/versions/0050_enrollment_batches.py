"""Execução retomável por matrícula sem copiar pessoas nem histórico."""
from alembic import op
import sqlalchemy as sa
revision='0050_enrollment_batches'
down_revision='0049_website_drafts'
branch_labels=None
depends_on=None

def upgrade():
    op.create_table('enrollment_batches',
        sa.Column('id',sa.String(36),primary_key=True),
        sa.Column('created_at',sa.DateTime(timezone=True),nullable=False),
        sa.Column('updated_at',sa.DateTime(timezone=True),nullable=False),
        sa.Column('version',sa.Integer(),nullable=False),
        sa.Column('school_id',sa.String(36),sa.ForeignKey('schools.id'),nullable=False),
        sa.Column('created_by',sa.String(36),sa.ForeignKey('users.id'),nullable=False),
        sa.Column('client_key',sa.String(80),nullable=False),
        sa.Column('input_hash',sa.String(64),nullable=False),
        sa.Column('payload',sa.JSON(),nullable=False),
        sa.Column('results',sa.JSON(),nullable=False),
        sa.Column('status',sa.String(24),nullable=False),
        sa.UniqueConstraint('school_id','client_key',name='uq_enrollment_batches_school_id'))
    op.create_index('ix_enrollment_batches_school_id','enrollment_batches',['school_id'])

def downgrade():
    op.drop_table('enrollment_batches')
