"""Rascunho separado da publicação; nenhuma publicação automática."""
from alembic import op
import sqlalchemy as sa
revision='0049_website_drafts'
down_revision='0048_campaign_period'
branch_labels=None
depends_on=None

def upgrade():
    op.add_column('school_websites',sa.Column('draft',sa.JSON(),nullable=True))
    op.add_column('school_websites',sa.Column('published_version',sa.Integer(),nullable=False,server_default='0'))
    op.add_column('school_websites',sa.Column('admission_url',sa.String(500),nullable=False,server_default=''))
    op.add_column('school_websites',sa.Column('brand',sa.JSON(),nullable=False,server_default='{}'))
    op.execute('UPDATE school_websites SET published_version = version WHERE enabled = true')

def downgrade():
    for column in ('brand','admission_url','published_version','draft'):
        op.drop_column('school_websites',column)
