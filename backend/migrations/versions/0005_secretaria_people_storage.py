"""Cadastro único completo, fotos e armazenamento externo."""
from alembic import op
import sqlalchemy as sa

revision = "0005_secretaria_people_storage"
down_revision = "0004_unified_profiles"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('persons', schema=None) as batch_op:
        batch_op.add_column(sa.Column('rg', sa.String(length=40), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('rg_issuer', sa.String(length=80), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('rg_state', sa.String(length=2), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('rg_issued_on', sa.Date(), nullable=True))
        batch_op.add_column(sa.Column('birth_certificate', sa.String(length=80), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('birth_city', sa.String(length=120), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('birth_state', sa.String(length=2), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('nationality', sa.String(length=80), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('sex', sa.String(length=32), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('gender', sa.String(length=80), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('race_color', sa.String(length=80), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('marital_status', sa.String(length=40), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('mother_name', sa.String(length=180), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('father_name', sa.String(length=180), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('phone_secondary', sa.String(length=32), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('postal_code', sa.String(length=16), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('street', sa.String(length=180), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('address_number', sa.String(length=24), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('address_complement', sa.String(length=120), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('district', sa.String(length=120), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('city', sa.String(length=120), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('state', sa.String(length=2), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('country', sa.String(length=80), nullable=False, server_default='Brasil'))
        batch_op.add_column(sa.Column('occupation', sa.String(length=120), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('employer', sa.String(length=180), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('education', sa.String(length=100), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('emergency_contact_name', sa.String(length=180), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('emergency_contact_phone', sa.String(length=32), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('photo_file_id', sa.String(length=36), nullable=True))
        batch_op.add_column(sa.Column('active', sa.Boolean(), nullable=False, server_default=sa.true()))
        batch_op.create_index(op.f('ix_persons_rg'), ['rg'], unique=False)
        batch_op.create_foreign_key(op.f('fk_persons_photo_file_id_files'), 'files', ['photo_file_id'], ['id'])

    with op.batch_alter_table('students', schema=None) as batch_op:
        batch_op.add_column(sa.Column('nis', sa.String(length=32), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('sus_card', sa.String(length=32), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('inep_code', sa.String(length=32), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('health_plan', sa.String(length=120), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('allergies', sa.Text(), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('medications', sa.Text(), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('health_notes', sa.Text(), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('special_needs', sa.Text(), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('authorized_transport', sa.String(length=120), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('student_notes', sa.Text(), nullable=False, server_default=''))

    with op.batch_alter_table('enrollments', schema=None) as batch_op:
        batch_op.add_column(sa.Column('enrollment_type', sa.String(length=24), nullable=False, server_default='new'))
        batch_op.add_column(sa.Column('origin_school', sa.String(length=180), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('origin_city', sa.String(length=120), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('entry_reason', sa.String(length=1000), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('external_reference', sa.String(length=120), nullable=False, server_default=''))

    with op.batch_alter_table('files', schema=None) as batch_op:
        batch_op.add_column(sa.Column('storage_backend', sa.String(length=16), nullable=False, server_default='local'))
        batch_op.add_column(sa.Column('bucket_name', sa.String(length=160), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('file_kind', sa.String(length=24), nullable=False, server_default='document'))


def downgrade():
    with op.batch_alter_table('files', schema=None) as batch_op:
        batch_op.drop_column('file_kind')
        batch_op.drop_column('bucket_name')
        batch_op.drop_column('storage_backend')

    with op.batch_alter_table('enrollments', schema=None) as batch_op:
        batch_op.drop_column('external_reference')
        batch_op.drop_column('entry_reason')
        batch_op.drop_column('origin_city')
        batch_op.drop_column('origin_school')
        batch_op.drop_column('enrollment_type')

    with op.batch_alter_table('students', schema=None) as batch_op:
        batch_op.drop_column('student_notes')
        batch_op.drop_column('authorized_transport')
        batch_op.drop_column('special_needs')
        batch_op.drop_column('health_notes')
        batch_op.drop_column('medications')
        batch_op.drop_column('allergies')
        batch_op.drop_column('health_plan')
        batch_op.drop_column('inep_code')
        batch_op.drop_column('sus_card')
        batch_op.drop_column('nis')

    with op.batch_alter_table('persons', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('fk_persons_photo_file_id_files'), type_='foreignkey')
        batch_op.drop_index(op.f('ix_persons_rg'))
        batch_op.drop_column('active')
        batch_op.drop_column('photo_file_id')
        batch_op.drop_column('emergency_contact_phone')
        batch_op.drop_column('emergency_contact_name')
        batch_op.drop_column('education')
        batch_op.drop_column('employer')
        batch_op.drop_column('occupation')
        batch_op.drop_column('country')
        batch_op.drop_column('state')
        batch_op.drop_column('city')
        batch_op.drop_column('district')
        batch_op.drop_column('address_complement')
        batch_op.drop_column('address_number')
        batch_op.drop_column('street')
        batch_op.drop_column('postal_code')
        batch_op.drop_column('phone_secondary')
        batch_op.drop_column('father_name')
        batch_op.drop_column('mother_name')
        batch_op.drop_column('marital_status')
        batch_op.drop_column('race_color')
        batch_op.drop_column('gender')
        batch_op.drop_column('sex')
        batch_op.drop_column('nationality')
        batch_op.drop_column('birth_state')
        batch_op.drop_column('birth_city')
        batch_op.drop_column('birth_certificate')
        batch_op.drop_column('rg_issued_on')
        batch_op.drop_column('rg_state')
        batch_op.drop_column('rg_issuer')
        batch_op.drop_column('rg')
