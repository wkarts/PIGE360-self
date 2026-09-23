"""Perfis profissionais de docentes e funcionários no cadastro único."""
from alembic import op
import sqlalchemy as sa

revision = "0007_secretaria_staff_profiles"
down_revision = "0006_person_type_links"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('teacher_assignments', schema=None) as batch_op:
        batch_op.alter_column('teacher_user_id', existing_type=sa.String(length=36), nullable=True)
        batch_op.add_column(sa.Column('teacher_person_id', sa.String(length=36), nullable=True))
        batch_op.create_index(op.f('ix_teacher_assignments_teacher_person_id'), ['teacher_person_id'], unique=False)
        batch_op.create_foreign_key(
            op.f('fk_teacher_assignments_teacher_person_id_persons'),
            'persons', ['teacher_person_id'], ['id'],
        )

    op.create_table(
        'teacher_profiles',
        sa.Column('person_id', sa.String(length=36), nullable=False),
        sa.Column('registration_number', sa.String(length=40), nullable=False, server_default=''),
        sa.Column('professional_registration', sa.String(length=80), nullable=False, server_default=''),
        sa.Column('employment_type', sa.String(length=32), nullable=False, server_default='other'),
        sa.Column('employment_status', sa.String(length=24), nullable=False, server_default='active'),
        sa.Column('admission_date', sa.Date(), nullable=True),
        sa.Column('termination_date', sa.Date(), nullable=True),
        sa.Column('inep_code', sa.String(length=32), nullable=False, server_default=''),
        sa.Column('education_institution', sa.String(length=180), nullable=False, server_default=''),
        sa.Column('degree_course', sa.String(length=180), nullable=False, server_default=''),
        sa.Column('specialization', sa.Text(), nullable=False, server_default=''),
        sa.Column('teaching_areas', sa.Text(), nullable=False, server_default=''),
        sa.Column('workload_hours', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('profile_notes', sa.Text(), nullable=False, server_default=''),
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('school_id', sa.String(length=36), nullable=False),
        sa.ForeignKeyConstraint(['person_id'], ['persons.id'], name=op.f('fk_teacher_profiles_person_id_persons')),
        sa.ForeignKeyConstraint(['school_id'], ['schools.id'], name=op.f('fk_teacher_profiles_school_id_schools')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_teacher_profiles')),
        sa.UniqueConstraint('person_id', name=op.f('uq_teacher_profiles_person_id')),
    )
    op.create_index(op.f('ix_teacher_profiles_school_id'), 'teacher_profiles', ['school_id'], unique=False)

    op.create_table(
        'employee_profiles',
        sa.Column('person_id', sa.String(length=36), nullable=False),
        sa.Column('employee_number', sa.String(length=40), nullable=False, server_default=''),
        sa.Column('employment_type', sa.String(length=32), nullable=False, server_default='other'),
        sa.Column('employment_status', sa.String(length=24), nullable=False, server_default='active'),
        sa.Column('admission_date', sa.Date(), nullable=True),
        sa.Column('termination_date', sa.Date(), nullable=True),
        sa.Column('department', sa.String(length=120), nullable=False, server_default=''),
        sa.Column('job_title', sa.String(length=160), nullable=False, server_default=''),
        sa.Column('work_schedule', sa.String(length=160), nullable=False, server_default=''),
        sa.Column('supervisor_name', sa.String(length=180), nullable=False, server_default=''),
        sa.Column('profile_notes', sa.Text(), nullable=False, server_default=''),
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('school_id', sa.String(length=36), nullable=False),
        sa.ForeignKeyConstraint(['person_id'], ['persons.id'], name=op.f('fk_employee_profiles_person_id_persons')),
        sa.ForeignKeyConstraint(['school_id'], ['schools.id'], name=op.f('fk_employee_profiles_school_id_schools')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_employee_profiles')),
        sa.UniqueConstraint('person_id', name=op.f('uq_employee_profiles_person_id')),
    )
    op.create_index(op.f('ix_employee_profiles_school_id'), 'employee_profiles', ['school_id'], unique=False)


def downgrade():
    remaining = op.get_bind().execute(sa.text(
        'SELECT COUNT(*) FROM teacher_assignments WHERE teacher_user_id IS NULL'
    )).scalar_one()
    if remaining:
        raise RuntimeError(
            'Não é possível reverter 0007 enquanto houver atribuições docentes '
            'vinculadas somente a Pessoa; associe-as a um usuário antes do downgrade.'
        )

    op.drop_index(op.f('ix_employee_profiles_school_id'), table_name='employee_profiles')
    op.drop_table('employee_profiles')

    op.drop_index(op.f('ix_teacher_profiles_school_id'), table_name='teacher_profiles')
    op.drop_table('teacher_profiles')

    with op.batch_alter_table('teacher_assignments', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('fk_teacher_assignments_teacher_person_id_persons'), type_='foreignkey')
        batch_op.drop_index(op.f('ix_teacher_assignments_teacher_person_id'))
        batch_op.drop_column('teacher_person_id')
        batch_op.alter_column('teacher_user_id', existing_type=sa.String(length=36), nullable=False)
