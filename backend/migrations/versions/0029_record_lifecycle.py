"""Arquivamento reversível de cadastros sem remover registros históricos."""
from alembic import op
import sqlalchemy as sa

revision = '0029_record_lifecycle'
down_revision = '0028_fiscal_certificate_alerts'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('record_archives',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('school_id', sa.String(36), sa.ForeignKey('schools.id'), nullable=False),
        sa.Column('entity_type', sa.String(60), nullable=False),
        sa.Column('entity_id', sa.String(36), nullable=False),
        sa.Column('archived_by', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('previous_values', sa.JSON(), nullable=False),
        sa.UniqueConstraint('school_id', 'entity_type', 'entity_id', name='uq_record_archive_entity'),
    )
    op.create_index('ix_record_archives_school_id', 'record_archives', ['school_id'])


def downgrade():
    # O downgrade não reativa cadastros que o operador arquivou.
    op.drop_table('record_archives')
