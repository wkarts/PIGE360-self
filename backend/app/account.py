"""Perfil próprio e foto privada. Nenhuma alteração de papel/permissões pelo usuário."""
import hashlib
import io
from fastapi import APIRouter, File, Form, Request, UploadFile
from fastapi.responses import Response
from PIL import Image, ImageOps, UnidentifiedImageError
from pydantic import BaseModel, ConfigDict, EmailStr, Field, ValidationError, field_validator
from sqlalchemy import select, update
from . import models as m
from .auth import user_output
from .common import audit
from .security import Actor, DB, check_version, fail, verify

router = APIRouter(prefix='/api/v1/auth/profile', tags=['Meu perfil'])
MAX_PHOTO = 2 * 1024 * 1024

class ProfileInput(BaseModel):
    model_config = ConfigDict(extra='forbid')
    version: int = Field(ge=1)
    name: str = Field(min_length=2, max_length=160)
    email: EmailStr
    phone: str = Field(default='', max_length=32)
    job_title: str = Field(default='', max_length=120)
    department: str = Field(default='', max_length=120)
    bio: str = Field(default='', max_length=1000)
    remove_photo: bool = False
    current_password: str = Field(default='', max_length=128)

    @field_validator('name', 'phone', 'job_title', 'department', 'bio')
    @classmethod
    def strip_text(cls, value):
        return value.strip()


def profile_data(db, user):
    profile = db.get(m.UserProfile, user.id)
    fields = {key: getattr(profile, key, '') if profile else '' for key in ('phone', 'job_title', 'department', 'bio')}
    return {**user_output(db, user), **fields,
            'has_photo': bool(profile and profile.photo_hash),
            'photo_revision': profile.photo_hash if profile else ''}


@router.get('')
def read_profile(db: DB, user: Actor):
    return profile_data(db, user)


@router.get('/photo', include_in_schema=False)
def my_photo(db: DB, user: Actor):
    profile = db.get(m.UserProfile, user.id)
    if not profile or not profile.photo:
        fail(404, 'Foto não cadastrada.')
    return Response(profile.photo, media_type='image/png', headers={'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff'})


def photo_content(upload):
    data = upload.file.read(MAX_PHOTO+1)
    if not data or len(data) > MAX_PHOTO:
        fail(422, 'A foto deve ter no máximo 2 MB.')
    try:
        with Image.open(io.BytesIO(data)) as source:
            if source.format not in ('PNG', 'JPEG', 'WEBP') or source.width*source.height > 16_000_000:
                fail(422, 'Envie PNG, JPEG ou WebP com até 16 megapixels.')
            source.load()
            photo = ImageOps.fit(ImageOps.exif_transpose(source).convert('RGB'), (512, 512), method=Image.Resampling.LANCZOS)
            # Uma nova imagem sem metadados EXIF/GPS do arquivo original.
            target = io.BytesIO(); photo.save(target, 'PNG')
            return target.getvalue()
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
        fail(422, 'Imagem inválida. Envie PNG, JPEG ou WebP.')


@router.put('')
def save_profile(db: DB, user: Actor, request: Request, payload: str = Form(...), photo: UploadFile | None = File(None)):
    try:
        data = ProfileInput.model_validate_json(payload)
    except ValidationError:
        fail(422, 'Revise nome, e-mail, telefone, dados do perfil e versão.')
    user = db.scalar(select(m.User).where(m.User.id == user.id).with_for_update().execution_options(populate_existing=True))
    check_version(user, data.version)
    if len(data.name) < 2:
        fail(422, 'Informe seu nome de exibição.')
    email = str(data.email).lower()
    changed_email = email != user.email
    if changed_email:
        if not verify(data.current_password, user.password_hash):
            fail(422, 'Informe sua senha atual para alterar o e-mail de acesso.')
        if db.scalar(select(m.User.id).where(m.User.email == email, m.User.id != user.id)):
            fail(409, 'Este e-mail não pode ser utilizado.')
    if photo and data.remove_photo:
        fail(422, 'Escolha enviar ou remover a foto, não os dois.')
    content = photo_content(photo) if photo else None
    profile = db.get(m.UserProfile, user.id)
    if profile is None:
        profile = m.UserProfile(user_id=user.id); db.add(profile)
    for key in ('phone', 'job_title', 'department', 'bio'):
        setattr(profile, key, getattr(data, key))
    if data.remove_photo:
        profile.photo = None; profile.photo_hash = ''
    elif content is not None:
        profile.photo = content; profile.photo_hash = hashlib.sha256(content).hexdigest()
    user.name = data.name; user.email = email; user.version += 1
    if changed_email:
        db.execute(update(m.AuthSession).where(m.AuthSession.user_id == user.id).values(revoked=True))
    audit(db, request, user, 'account.profile.updated', user, details={'email_changed': changed_email, 'photo_changed': bool(photo or data.remove_photo)})
    db.flush()
    return {**profile_data(db, user), 'requires_login': changed_email}
