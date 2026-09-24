"""Tipos múltiplos para a Pessoa central do cadastro único."""
from datetime import UTC, datetime
from uuid import uuid4

from alembic import op
import sqlalchemy as sa

revision = "0006_person_type_links"
down_revision = "0005_secretaria_people_storage"
branch_labels = None
depends_on = None


def _legacy_types(bind):
    rows = set()

    for school_id, person_id in bind.execute(sa.text(
        "SELECT school_id, person_id FROM students"
    )):
        rows.add((school_id, person_id, "student"))

    for school_id, person_id in bind.execute(sa.text(
        "SELECT school_id, person_id FROM student_guardians"
    )):
        rows.add((school_id, person_id, "guardian"))

    return rows


def upgrade():
    op.create_table(
        "person_type_links",
        sa.Column("person_id", sa.String(length=36), nullable=False),
        sa.Column("type_code", sa.String(length=40), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("notes", sa.Text(), nullable=False, server_default=""),
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("school_id", sa.String(length=36), nullable=False),
        sa.ForeignKeyConstraint(
            ["person_id"], ["persons.id"],
            name=op.f("fk_person_type_links_person_id_persons"),
        ),
        sa.ForeignKeyConstraint(
            ["school_id"], ["schools.id"],
            name=op.f("fk_person_type_links_school_id_schools"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_person_type_links")),
        sa.UniqueConstraint(
            "school_id", "person_id", "type_code",
            name=op.f("uq_person_type_links_school_id"),
        ),
    )
    op.create_index(
        op.f("ix_person_type_links_school_id"),
        "person_type_links",
        ["school_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_person_type_links_person_id"),
        "person_type_links",
        ["person_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_person_type_links_type_code"),
        "person_type_links",
        ["type_code"],
        unique=False,
    )

    bind = op.get_bind()
    timestamp = datetime.now(UTC)
    for school_id, person_id, type_code in sorted(_legacy_types(bind)):
        bind.execute(
            sa.text(
                "INSERT INTO person_type_links "
                "(person_id, type_code, active, notes, id, created_at, updated_at, version, school_id) "
                "VALUES (:person_id, :type_code, :active, :notes, :id, :created_at, :updated_at, :version, :school_id)"
            ),
            {
                "person_id": person_id,
                "type_code": type_code,
                "active": True,
                "notes": "",
                "id": str(uuid4()),
                "created_at": timestamp,
                "updated_at": timestamp,
                "version": 1,
                "school_id": school_id,
            },
        )


def downgrade():
    op.drop_index(op.f("ix_person_type_links_type_code"), table_name="person_type_links")
    op.drop_index(op.f("ix_person_type_links_person_id"), table_name="person_type_links")
    op.drop_index(op.f("ix_person_type_links_school_id"), table_name="person_type_links")
    op.drop_table("person_type_links")
