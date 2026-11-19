"""Materiais do diário e comprovantes opcionais de justificativa."""
from alembic import op
import sqlalchemy as sa

revision = '0059_class_materials_absences'
down_revision = '0058_finance_role'
branch_labels = depends_on = None


def reference(name, table, *, nullable=False, primary=False):
    return sa.Column(name, sa.String(36), sa.ForeignKey(table + '.id'),
                     nullable=nullable, primary_key=primary)


def upgrade():
    op.create_table('class_materials',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False),
        reference('school_id', 'schools'), reference('diary_id', 'school_diaries'),
        reference('enrollment_id', 'enrollments', nullable=True), reference('author_id', 'users'),
        sa.Column('kind', sa.String(24), nullable=False), sa.Column('title', sa.String(160), nullable=False),
        sa.Column('body', sa.Text(), nullable=False))
    for field in ('diary_id', 'school_id'):
        op.create_index('ix_class_materials_' + field, 'class_materials', [field])
    op.create_table('absence_submissions', reference('protocol_id', 'protocols', primary=True),
        reference('author_id', 'users'), reference('file_id', 'files', nullable=True),
        sa.Column('absence_date', sa.Date(), nullable=False), sa.Column('client_key', sa.String(36), nullable=False),
        sa.Column('fingerprint', sa.String(64), nullable=False), sa.UniqueConstraint('author_id', 'client_key'))


def downgrade():
    for table in ('absence_submissions', 'class_materials'):
        if op.get_bind().execute(sa.text('SELECT 1 FROM ' + table + ' LIMIT 1')).first():
            raise RuntimeError('Restaure o backup anterior para preservar o histórico deste período.')
    op.drop_table('absence_submissions')
    op.drop_table('class_materials')
