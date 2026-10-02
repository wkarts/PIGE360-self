"""Notícias e eventos com audiência e publicação por escola."""
from alembic import op
import sqlalchemy as sa

revision='0027_school_community'
down_revision='0026_mailcow'
branch_labels=None
depends_on=None


def upgrade():
    op.create_table('school_community_posts',
        sa.Column('id',sa.String(36),primary_key=True),
        sa.Column('created_at',sa.DateTime(timezone=True),nullable=False),
        sa.Column('updated_at',sa.DateTime(timezone=True),nullable=False),
        sa.Column('version',sa.Integer(),nullable=False),
        sa.Column('school_id',sa.String(36),sa.ForeignKey('schools.id'),nullable=False),
        sa.Column('title',sa.String(160),nullable=False),
        sa.Column('summary',sa.String(400),nullable=False),
        sa.Column('content',sa.Text(),nullable=False),
        sa.Column('kind',sa.String(16),nullable=False),
        sa.Column('audience',sa.String(24),nullable=False),
        sa.Column('status',sa.String(16),nullable=False),
        sa.Column('pinned',sa.Boolean(),nullable=False),
        sa.Column('publish_at',sa.DateTime(timezone=True)),
        sa.Column('expires_at',sa.DateTime(timezone=True)),
        sa.Column('event_start',sa.DateTime(timezone=True)),
        sa.Column('event_end',sa.DateTime(timezone=True)),
        sa.Column('location',sa.String(240),nullable=False),
        sa.Column('created_by',sa.String(36),sa.ForeignKey('users.id'),nullable=False),
        sa.Column('updated_by',sa.String(36),sa.ForeignKey('users.id'),nullable=False),
        sa.CheckConstraint("kind IN ('news','event')",name='community_kind'),
        sa.CheckConstraint("status IN ('draft','published','archived')",name='community_status'),
        sa.CheckConstraint("audience IN ('public','authenticated','students','guardians','teachers')",name='community_audience'),
        sa.CheckConstraint("kind != 'event' OR event_start IS NOT NULL",name='community_event_start'),
        sa.CheckConstraint('event_end IS NULL OR event_end >= event_start',name='community_event_order'),
        sa.CheckConstraint('expires_at IS NULL OR publish_at IS NULL OR expires_at > publish_at',name='community_publication_order'),
    )
    op.create_index('ix_school_community_posts_school_id','school_community_posts',['school_id'])
    op.create_index('ix_community_school_status_publish','school_community_posts',['school_id','status','publish_at'])


def downgrade():
    op.drop_table('school_community_posts')
