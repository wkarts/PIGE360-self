"""Perfis educacionais, vínculo da pessoa e atribuições docentes."""
from alembic import op
import sqlalchemy as sa

revision = "0004_unified_profiles"
down_revision = "0003_online_admissions"
branch_labels = None
depends_on = None

ROLE_CHECK = "role IN ('admin','direction','coordination','secretary','teacher','student','guardian','viewer')"


def upgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('person_id', sa.String(length=36), nullable=True))
        batch_op.create_index(op.f('ix_users_person_id'), ['person_id'], unique=False)
        batch_op.create_foreign_key(
            op.f('fk_users_person_id_persons'),
            'persons',
            ['person_id'],
            ['id'],
        )
        batch_op.drop_constraint(op.f('ck_users_valid_role'), type_='check')
        batch_op.create_check_constraint(op.f('ck_users_valid_role'), ROLE_CHECK)

    op.create_table(
        'teacher_assignments',
        sa.Column('teacher_user_id', sa.String(length=36), nullable=False),
        sa.Column('class_group_id', sa.String(length=36), nullable=False),
        sa.Column('academic_year_id', sa.String(length=36), nullable=False),
        sa.Column('subject_name', sa.String(length=120), nullable=False),
        sa.Column('active', sa.Boolean(), nullable=False),
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('school_id', sa.String(length=36), nullable=False),
        sa.ForeignKeyConstraint(['academic_year_id'], ['academic_years.id'], name=op.f('fk_teacher_assignments_academic_year_id_academic_years')),
        sa.ForeignKeyConstraint(['class_group_id'], ['class_groups.id'], name=op.f('fk_teacher_assignments_class_group_id_class_groups')),
        sa.ForeignKeyConstraint(['school_id'], ['schools.id'], name=op.f('fk_teacher_assignments_school_id_schools')),
        sa.ForeignKeyConstraint(['teacher_user_id'], ['users.id'], name=op.f('fk_teacher_assignments_teacher_user_id_users')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_teacher_assignments')),
        sa.UniqueConstraint(
            'school_id', 'teacher_user_id', 'class_group_id', 'academic_year_id', 'subject_name',
            name=op.f('uq_teacher_assignments_school_id'),
        ),
    )
    op.create_index(op.f('ix_teacher_assignments_school_id'), 'teacher_assignments', ['school_id'], unique=False)
    op.create_index(op.f('ix_teacher_assignments_teacher_user_id'), 'teacher_assignments', ['teacher_user_id'], unique=False)
    op.create_index(op.f('ix_teacher_assignments_class_group_id'), 'teacher_assignments', ['class_group_id'], unique=False)
    op.create_index(op.f('ix_teacher_assignments_academic_year_id'), 'teacher_assignments', ['academic_year_id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_teacher_assignments_academic_year_id'), table_name='teacher_assignments')
    op.drop_index(op.f('ix_teacher_assignments_class_group_id'), table_name='teacher_assignments')
    op.drop_index(op.f('ix_teacher_assignments_teacher_user_id'), table_name='teacher_assignments')
    op.drop_index(op.f('ix_teacher_assignments_school_id'), table_name='teacher_assignments')
    op.drop_table('teacher_assignments')

    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_users_valid_role'), type_='check')
        batch_op.create_check_constraint(
            op.f('ck_users_valid_role'),
            "role IN ('admin','secretary','viewer')",
        )
        batch_op.drop_constraint(op.f('fk_users_person_id_persons'), type_='foreignkey')
        batch_op.drop_index(op.f('ix_users_person_id'))
        batch_op.drop_column('person_id')
