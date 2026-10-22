"""Contexto acadêmico explícito; links antigos permanecem válidos."""
from alembic import op
import sqlalchemy as sa

revision = '0048_campaign_period'
down_revision = '0047_notification_email'
branch_labels = None
depends_on = None

def upgrade():
    with op.batch_alter_table('admission_campaigns') as batch:
        batch.add_column(sa.Column('academic_year_id', sa.String(36), nullable=True))
        batch.create_foreign_key('fk_campaign_academic_year', 'academic_years', ['academic_year_id'], ['id'])
    connection = op.get_bind()
    campaigns = sa.table('admission_campaigns', sa.column('id'), sa.column('school_id'), sa.column('class_group_ids', sa.JSON), sa.column('academic_year_id'))
    groups = sa.table('class_groups', sa.column('id'), sa.column('school_id'), sa.column('academic_year_id'))
    for row in connection.execute(sa.select(campaigns)).mappings():
        ids = row['class_group_ids'] or []
        years = set(connection.execute(sa.select(groups.c.academic_year_id).where(groups.c.id.in_(ids), groups.c.school_id == row['school_id'])).scalars())
        if len(years) == 1:
            connection.execute(campaigns.update().where(campaigns.c.id == row['id']).values(academic_year_id=next(iter(years))))

def downgrade():
    with op.batch_alter_table('admission_campaigns') as batch:
        batch.drop_constraint('fk_campaign_academic_year', type_='foreignkey')
        batch.drop_column('academic_year_id')
