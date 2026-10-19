"""Preferências do site separado; publicações existentes são reaproveitadas."""
from alembic import op
import sqlalchemy as sa

revision='0044_school_website'
down_revision='0043_backup_runs'
branch_labels=None
depends_on=None


def upgrade():
    op.create_table('school_websites',sa.Column('id',sa.String(36),primary_key=True),
        sa.Column('created_at',sa.DateTime(timezone=True),nullable=False),sa.Column('updated_at',sa.DateTime(timezone=True),nullable=False),
        sa.Column('version',sa.Integer(),nullable=False),sa.Column('school_id',sa.String(36),sa.ForeignKey('schools.id'),nullable=False,unique=True),
        sa.Column('enabled',sa.Boolean(),nullable=False),sa.Column('theme',sa.String(16),nullable=False),
        sa.Column('headline',sa.String(180),nullable=False),sa.Column('introduction',sa.String(500),nullable=False),
        sa.Column('about',sa.Text(),nullable=False),sa.Column('public_url',sa.String(500),nullable=False),
        sa.Column('portal_url',sa.String(500),nullable=False),sa.Column('notice',sa.String(1000),nullable=False))


def downgrade():
    op.drop_table('school_websites')
