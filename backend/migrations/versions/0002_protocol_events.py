"""Histórico de atendimentos; nenhuma alteração destrutiva no schema anterior."""
from alembic import op
import sqlalchemy as sa

revision = '0002_protocol_events'
down_revision = '0001_secretary'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'protocol_events',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('school_id', sa.String(36), nullable=False),
        sa.Column('protocol_id', sa.String(36), nullable=False),
        sa.Column('actor_id', sa.String(36), nullable=False),
        sa.Column('action', sa.String(24), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('before', sa.JSON(), nullable=False),
        sa.Column('after', sa.JSON(), nullable=False),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_protocol_events')),
        sa.ForeignKeyConstraint(['school_id'], ['schools.id'], name=op.f('fk_protocol_events_school_id_schools')),
        sa.ForeignKeyConstraint(['protocol_id'], ['protocols.id'], name=op.f('fk_protocol_events_protocol_id_protocols')),
        sa.ForeignKeyConstraint(['actor_id'], ['users.id'], name=op.f('fk_protocol_events_actor_id_users')),
    )
    op.create_index(op.f('ix_protocol_events_school_id'), 'protocol_events', ['school_id'])
    op.create_index(op.f('ix_protocol_events_protocol_id'), 'protocol_events', ['protocol_id'])


def downgrade():
    # Destrutivo somente para o histórico introduzido nesta revisão.
    op.drop_index(op.f('ix_protocol_events_protocol_id'), table_name='protocol_events')
    op.drop_index(op.f('ix_protocol_events_school_id'), table_name='protocol_events')
    op.drop_table('protocol_events')
