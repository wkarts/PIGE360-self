"""Vincula as instâncias de WhatsApp à instituição, sem herança pela mantenedora."""
from alembic import op
import sqlalchemy as sa

revision = '0033_connect_school_ownership'
down_revision = '0032_support_areas'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('connect_instances') as batch:
        batch.add_column(sa.Column('school_id', sa.String(36), nullable=True))
        batch.create_foreign_key('fk_connect_instances_school_id', 'schools', ['school_id'], ['id'])
        batch.create_index('ix_connect_instances_school_id', ['school_id'])
    backfill_ownership(op.get_bind())


def backfill_ownership(db):
    schools = dict(db.execute(sa.text('SELECT id, company_id FROM schools')).all())
    duplicate_names = set(db.execute(sa.text('SELECT name FROM connect_instances GROUP BY name HAVING COUNT(*) > 1')).scalars())
    for instance_id, company_id, name in db.execute(sa.text('SELECT id, company_id, name FROM connect_instances')).fetchall():
        if name in duplicate_names:
            continue
        candidates = set(db.execute(sa.text('SELECT school_id FROM connect_school_bindings WHERE instance_id=:id'), {'id': instance_id}).scalars())
        candidates.update(db.execute(sa.text('SELECT u.school_id FROM connect_unit_bindings b JOIN units u ON u.id=b.unit_id WHERE b.instance_id=:id'), {'id': instance_id}).scalars())
        candidates.update(db.execute(sa.text("SELECT school_id FROM audit_events WHERE entity_type='connect_instances' AND entity_id=:id AND action IN ('connect.instance.created','connect.instance.adopted') AND school_id IS NOT NULL"), {'id': instance_id}).scalars())
        candidates = {sid for sid in candidates if schools.get(sid) == company_id}
        if not candidates:
            # Uma só escola na mantenedora é uma atribuição inequívoca.
            candidates = {sid for sid, cid in schools.items() if cid == company_id}
        if len(candidates) == 1:
            db.execute(sa.text('UPDATE connect_instances SET school_id=:sid WHERE id=:id'), {'sid': candidates.pop(), 'id': instance_id})
        # Vínculo ambíguo permanece preservado, sem autorizar outra escola por aproximação.


def downgrade():
    with op.batch_alter_table('connect_instances') as batch:
        batch.drop_index('ix_connect_instances_school_id')
        batch.drop_constraint('fk_connect_instances_school_id', type_='foreignkey')
        batch.drop_column('school_id')
