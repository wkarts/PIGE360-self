"""Preferências visuais por escola, independentes do currículo e do fechamento."""
from base64 import b64encode
from typing import Literal
from pydantic import Field
from fastapi import APIRouter, Request, UploadFile, File, Form
from .schemas import Input
from .common import audit
from .security import Actor, DB, Scope, check_version, lock_school, require
router = APIRouter(prefix='/api/v1/schools/{school_id}', tags=['Parâmetros de relatórios'])

Orientation = Literal['portrait', 'landscape']


class Preferences(Input):
    bulletin: Literal['integrated', 'panel', 'journey'] = 'integrated'
    color: str = Field(default='', pattern=r'^(#[0-9a-fA-F]{6})?$')
    font_family: Literal['inherit', 'system', 'arial', 'verdana', 'georgia', 'times'] = 'inherit'
    student: Orientation = 'portrait'
    employee: Orientation = 'portrait'
    teacher: Orientation = 'portrait'
    watermark_documents: list[Literal['bulletins', 'records', 'diary', 'management']] = Field(default_factory=list, max_length=4)


def school_logo_url(school):
    return 'data:image/png;base64,' + b64encode(school.report_logo).decode('ascii') if school.report_logo else ''


def preferences(school):
    return Preferences.model_validate(school.report_preferences or {}).model_dump()


class UpdatePreferences(Preferences):
    version: int = Field(ge=1)


@router.get('/report-preferences')
def read_preferences(db: DB, user: Actor, school: Scope):
    require(user, 'schools.manage')
    return {**preferences(school), 'version': school.version}


@router.put('/report-preferences')
def update_preferences(data: UpdatePreferences, request: Request, db: DB, user: Actor, school: Scope):
    require(user, 'schools.manage')
    school = lock_school(db, school.id)
    check_version(school, data.version)
    before = preferences(school)
    updated = data.model_dump(exclude={'version'})
    if 'watermark_documents' not in data.model_fields_set:
        updated['watermark_documents'] = before['watermark_documents']
    school.report_preferences = updated
    school.version += 1
    audit(db, request, user, 'school.report_preferences.updated', school, school.id,
          {'before': before, 'after': school.report_preferences})
    return {**preferences(school), 'version': school.version}

@router.put('/report-preferences/logo')
def set_logo(request: Request, db: DB, user: Actor, school: Scope, version: int = Form(...), file: UploadFile = File(...)):
    from io import BytesIO
    from PIL import Image, ImageOps
    from .security import fail
    require(user, 'schools.manage')
    school = lock_school(db, school.id)
    check_version(school, version)
    content = file.file.read(2_000_001)
    if len(content) > 2_000_000:
        fail(422, 'A marca deve ter até 2 MB.')
    try:
        with Image.open(BytesIO(content)) as original:
            if original.format not in {'PNG','JPEG'} or original.width * original.height > 8_000_000:
                fail(422, 'Envie um logotipo PNG ou JPEG de até 8 megapixels.')
            logo = ImageOps.exif_transpose(original).convert('RGBA')
            logo.thumbnail((640,640))
            normalized = BytesIO()
            logo.save(normalized, 'PNG')
    except (OSError, ValueError, Image.DecompressionBombError):
        fail(422, 'Não foi possível ler o logotipo.')
    school.report_logo = normalized.getvalue()
    school.version += 1
    audit(db, request, user, 'school.report_logo.updated', school, school.id)
    return {'version': school.version, 'report_logo': school_logo_url(school)}
