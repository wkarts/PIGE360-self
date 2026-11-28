"""Identifica o solicitante e separa as mensagens públicas das notas internas."""
from alembic import op
import sqlalchemy as sa

revision = '0075_portal_protocols'
down_revision = '0074_crm_instrument'
branch_labels = depends_on = None


def upgrade():
    op.add_column('school_access', sa.Column('protocol_opening_channel', sa.String(16), nullable=False, server_default='portal'))
    with op.batch_alter_table('protocols') as batch:
        batch.add_column(sa.Column('requester_user_id', sa.String(36), nullable=True))
        batch.create_foreign_key('fk_protocol_requester', 'users', ['requester_user_id'], ['id'])
        batch.add_column(sa.Column('source', sa.String(16), nullable=False, server_default='manager'))
        batch.add_column(sa.Column('category', sa.String(24), nullable=False, server_default=''))
        batch.add_column(sa.Column('preferred_channel', sa.String(16), nullable=False, server_default='portal'))
        batch.create_index('ix_protocol_requester_queue',['school_id','requester_user_id','updated_at'])
        batch.create_index('ix_protocol_school_activity',['school_id','updated_at','id'])
    # A origem das justificativas já existentes é conhecida. Seu atendimento continua na rota própria.
    op.execute("UPDATE protocols SET source='family', category='pedagogico' WHERE EXISTS "
               "(SELECT 1 FROM absence_submissions a WHERE a.protocol_id=protocols.id)")
    with op.batch_alter_table('protocol_events') as batch:
        batch.add_column(sa.Column('visibility',sa.String(12),nullable=False,server_default='internal'))
        batch.add_column(sa.Column('file_id',sa.String(36),nullable=True))
        batch.create_foreign_key('fk_protocol_attachment','files',['file_id'],['id'])
        batch.add_column(sa.Column('client_key',sa.String(36),nullable=True))
        batch.add_column(sa.Column('client_fingerprint',sa.String(64),nullable=True))
        batch.create_unique_constraint('uq_protocol_post_key',['school_id','actor_id','client_key'])


def downgrade():
    with op.batch_alter_table('school_access') as batch:
        batch.drop_column('protocol_opening_channel')
    with op.batch_alter_table('protocol_events') as batch:
        batch.drop_constraint('uq_protocol_post_key',type_='unique')
        batch.drop_constraint('fk_protocol_attachment',type_='foreignkey')
        for name in ('client_fingerprint','client_key','file_id','visibility'):
            batch.drop_column(name)
    with op.batch_alter_table('protocols') as batch:
        batch.drop_index('ix_protocol_requester_queue')
        batch.drop_index('ix_protocol_school_activity')
        batch.drop_constraint('fk_protocol_requester',type_='foreignkey')
        for name in ('preferred_channel','category','source','requester_user_id'):
            batch.drop_column(name)
