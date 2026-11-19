"""Publicação no diário e leitura pela matrícula atual."""
from typing import Literal
from uuid import UUID

from fastapi import Request
from fastapi.responses import Response
from pydantic import Field
from sqlalchemy import or_, select

from . import models as m
from .common import audit
from .school_reports import render_table
from .schemas import Input
from .security import fail


class MaterialInput(Input):
    client_key: UUID
    kind: Literal['Atividade', 'Trabalho', 'Orientação', 'Aviso']
    enrollment_id: str | None = None
    title: str = Field(min_length=2, max_length=160)
    body: str = Field(min_length=2, max_length=8000)


def visible_to(student):
    material, diary, enrollment = m.ClassMaterial, m.SchoolDiary, m.Enrollment
    return (select(material).join(diary, diary.id == material.diary_id)
            .join(enrollment, (enrollment.class_group_id == diary.class_group_id)
                  & (enrollment.academic_year_id == diary.academic_year_id))
            .where(material.school_id == student.school_id, diary.school_id == student.school_id,
                   enrollment.school_id == student.school_id, enrollment.student_id == student.id,
                   enrollment.status == 'active',
                   or_(material.enrollment_id.is_(None), material.enrollment_id == enrollment.id)).distinct())


def listed(db, query):
    return [dict(id=r.id, kind=r.kind, title=r.title, body=r.body, created_at=r.created_at,
                 enrollment_id=r.enrollment_id) for r in db.scalars(
                     query.order_by(m.ClassMaterial.created_at.desc(), m.ClassMaterial.id.desc()))]


def printable(db, school, user, request: Request, material):
    if not material:
        fail(404, 'Material indisponível.')
    diary = db.get(m.SchoolDiary, material.diary_id)
    group = db.get(m.ClassGroup, diary.class_group_id)
    component = db.get(m.CurriculumComponent, diary.component_id)
    pdf = render_table(school.name, material.title, [], [], db=db,
                       filters=[{'label':'Turma', 'value':group.name}, {'label':'Componente', 'value':component.name}],
                       sections=[{'title':material.kind, 'text':material.body}],
                       issuer=db.get(m.User, material.author_id).name)
    audit(db, request, user, 'diary.material_downloaded', material, school.id)
    return Response(pdf, media_type='application/pdf', headers={'Cache-Control':'no-store',
                    'Content-Disposition':'attachment; filename="material-escolar.pdf"'})
