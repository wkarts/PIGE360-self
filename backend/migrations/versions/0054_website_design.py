"""Editorial structure; existing sites and drafts retain their previous content."""
from alembic import op
import sqlalchemy as sa
revision='0054_website_design'
down_revision='0053_campaign_portal_button'
branch_labels=None
depends_on=None


def upgrade():
    op.create_table('school_website_assets',
        sa.Column('id',sa.String(36),primary_key=True),
        sa.Column('created_at',sa.DateTime(timezone=True),nullable=False),
        sa.Column('updated_at',sa.DateTime(timezone=True),nullable=False),
        sa.Column('version',sa.Integer(),nullable=False),
        sa.Column('school_id',sa.String(36),sa.ForeignKey('schools.id'),nullable=False),
        sa.Column('sha256',sa.String(64),nullable=False),
        sa.Column('content',sa.LargeBinary(),nullable=False),
        sa.UniqueConstraint('school_id','sha256'))
    op.add_column('school_community_posts',sa.Column('image',sa.JSON(),nullable=True))
    op.add_column('school_websites',sa.Column('design',sa.JSON(),nullable=False,server_default='{}'))


def downgrade():
    op.drop_column('school_community_posts','image')
    op.drop_column('school_websites','design')
    op.drop_table('school_website_assets')
