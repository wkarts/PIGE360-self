"""One durable pre-model editor checkpoint; published content is unchanged."""
from alembic import op
import sqlalchemy as sa
revision='0055_website_model_checkpoint'
down_revision='0054_website_design'
branch_labels=None
depends_on=None


def upgrade():
    op.add_column('school_websites',sa.Column('model_checkpoint',sa.JSON(),nullable=True))


def downgrade():
    op.drop_column('school_websites','model_checkpoint')
