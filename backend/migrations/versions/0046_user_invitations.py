"""Convite transacional de User; preserva PortalAccount e SchoolMailbox."""
from alembic import op
import sqlalchemy as sa
revision='0046_user_invitations'
down_revision='0045_import_operations'
branch_labels=None
depends_on=None

def upgrade():
    op.create_table('user_invitations',
        sa.Column('id',sa.String(36),primary_key=True),
        sa.Column('created_at',sa.DateTime(timezone=True),nullable=False),sa.Column('updated_at',sa.DateTime(timezone=True),nullable=False),sa.Column('version',sa.Integer(),nullable=False),
        sa.Column('user_id',sa.String(36),sa.ForeignKey('users.id'),nullable=False),sa.Column('school_id',sa.String(36),sa.ForeignKey('schools.id'),nullable=False),
        sa.Column('token_hash',sa.String(64),nullable=False,unique=True),sa.Column('email',sa.String(254),nullable=False),sa.Column('job_id',sa.String(36),sa.ForeignKey('integration_jobs.id')),
        sa.Column('expires_at',sa.DateTime(timezone=True),nullable=False),sa.Column('used_at',sa.DateTime(timezone=True)),sa.Column('revoked_at',sa.DateTime(timezone=True)))
    op.create_index('ix_user_invitations_user_id','user_invitations',['user_id'])
    op.create_index('ix_user_invitations_school_id','user_invitations',['school_id'])

def downgrade():op.drop_table('user_invitations')
