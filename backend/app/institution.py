"""Identidade pública de UMA instituição por instalação; não é cadastro de tenants.

Configuração e poucos ativos de marca limitados são guardados no banco, de modo
que o backup e a recriação dos containers preservem a identidade da escola.
Nenhuma credencial, documento de aluno ou configuração bancária é publicada.
"""
import hashlib
import io
import struct
from typing import Literal

from fastapi import APIRouter, File, Form, Query, Request, UploadFile
from fastapi.responses import JSONResponse, Response
from PIL import Image, ImageDraw, ImageFont, ImageOps, UnidentifiedImageError
from pydantic import BaseModel, ConfigDict, Field, ValidationError
from sqlalchemy import ForeignKey, Integer, JSON, LargeBinary, String, select
from sqlalchemy.orm import Mapped, mapped_column

from . import models as m
from .common import audit, output
from .db import Base
from .schemas import CompanyInput, Edit
from .security import Actor, DB, fail, require

router = APIRouter(tags=['Identidade institucional'])
MAX_ASSET = 2 * 1024 * 1024
FONTS = {
    'system': 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    'arial': 'Arial, Helvetica, sans-serif',
    'verdana': 'Verdana, Geneva, sans-serif',
    'georgia': 'Georgia, "Times New Roman", serif',
    'times': '"Times New Roman", Times, serif',
    'custom': '"InstitutionFont", system-ui, sans-serif',
}


class InstitutionIdentity(Base):
    __tablename__ = 'institution_identity'
    id: Mapped[int] = mapped_column(ForeignKey('installation.id'), primary_key=True)
    identity: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    identity_version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)


class InstitutionAsset(Base):
    __tablename__ = 'institution_assets'
    id: Mapped[str] = mapped_column(String(70), primary_key=True)
    media_type: Mapped[str] = mapped_column(String(40))
    content: Mapped[bytes] = mapped_column(LargeBinary)


class IdentityInput(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    version: int = Field(ge=1)
    display_name: str = Field(min_length=2, max_length=160)
    short_name: str = Field(min_length=2, max_length=30)
    primary_color: str = Field(pattern=r'^#[0-9a-fA-F]{6}$')
    secondary_color: str = Field(pattern=r'^#[0-9a-fA-F]{6}$')
    font_family: Literal['system', 'arial', 'verdana', 'georgia', 'times', 'custom'] = 'system'
    remove_logo: bool = False
    remove_font: bool = False
    font_license_confirmed: bool = False
    show_preenrollment_button: bool = Field(default=True, strict=True)


def identity_data(db):
    install = db.get(InstitutionIdentity, 1)
    saved = dict(install.identity or {}) if install else {}
    school = db.scalar(select(m.School).order_by(m.School.created_at, m.School.id).limit(1))
    name = saved.get('display_name') or (school.name if school else 'Sua escola')
    return {
        'display_name': name,
        'short_name': saved.get('short_name') or name[:30],
        'primary_color': saved.get('primary_color', '#006D77'),
        'secondary_color': saved.get('secondary_color', '#0D1B2A'),
        'font_family': saved.get('font_family', 'system'),
        'show_preenrollment_button': saved.get('show_preenrollment_button', True),
        'logo_asset_id': saved.get('logo_asset_id', ''),
        'font_asset_id': saved.get('font_asset_id', ''),
        'version': install.identity_version if install else 1,
    }


def public_identity(db):
    data = identity_data(db)
    logo = data.pop('logo_asset_id')
    font = data.pop('font_asset_id')
    data['logo_url'] = '/api/v1/institution/assets/' + logo if logo else ''
    data['font_configured'] = bool(font)
    return data


@router.get('/api/v1/institution/identity')
def read_identity(db: DB):
    return public_identity(db)


def _admin(user):
    require(user, 'schools.manage')
    if user.role != 'admin':
        fail(403, 'Somente o administrador da instalação pode alterar a identidade institucional.')


def _asset_content(upload: UploadFile, kind: str) -> tuple[bytes, str, str]:
    data = upload.file.read(MAX_ASSET + 1)
    if not data or len(data) > MAX_ASSET:
        fail(422, 'Cada ativo de marca deve ter conteúdo e no máximo 2 MB.')
    if kind == 'font':
        from .institution_fonts import truetype
        if not (upload.filename or '').lower().endswith(('.woff2', '.ttf')):
            fail(422, 'Envie uma fonte TTF ou WOFF2 licenciada para tela e PDF.')
        truetype(data)  # valida integralmente antes de persistir
        return (data, 'font/woff2', '.woff2') if data[:4] == b'wOF2' else (data, 'font/ttf', '.ttf')
    try:
        with Image.open(io.BytesIO(data)) as image:
            if image.format not in ('PNG', 'JPEG', 'WEBP') or image.width * image.height > 16_000_000:
                fail(422, 'Utilize PNG, JPEG ou WebP com até 16 megapixels.')
            image.load()
            normal = ImageOps.exif_transpose(image).convert('RGBA')
            normal.thumbnail((2048, 2048), Image.Resampling.LANCZOS)
            target = io.BytesIO()
            normal.save(target, format='PNG', optimize=True)
        data = target.getvalue()
        if len(data) > MAX_ASSET:
            fail(422, 'O logotipo normalizado supera 2 MB. Reduza as dimensões.')
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
        fail(422, 'Logotipo inválido. Envie uma imagem PNG, JPEG ou WebP.')
    return data, 'image/png', '.png'


@router.put('/api/v1/institution/identity')
def save_identity(
    db: DB, user: Actor, request: Request,
    payload: str = Form(...), logo: UploadFile | None = File(None), font: UploadFile | None = File(None),
):
    _admin(user)
    try:
        data = IdentityInput.model_validate_json(payload)
    except ValidationError:
        fail(422, 'Revise nome, nome curto, cores hexadecimais, tipografia e versão da identidade.')
    installation = db.get(m.Installation, 1)
    install = db.scalar(select(InstitutionIdentity).where(InstitutionIdentity.id == 1).with_for_update())
    if not installation or not installation.configured or not install:
        fail(409, 'Conclua a instalação antes de personalizar a identidade.')
    if install.identity_version != data.version:
        fail(409, 'A identidade foi alterada por outro acesso. Reabra a configuração antes de salvar.')
    saved = identity_data(db)
    for key in ('display_name', 'short_name', 'primary_color', 'secondary_color', 'font_family'):
        saved[key] = getattr(data, key)
    # Clientes antigos não enviam este campo; preservar o valor já salvo.
    if 'show_preenrollment_button' in data.model_fields_set:
        saved['show_preenrollment_button'] = data.show_preenrollment_button
    for kind, upload, remove in (('logo', logo, data.remove_logo), ('font', font, data.remove_font)):
        if remove and upload:
            fail(422, 'Não remova e envie o mesmo ativo na mesma operação.')
        if remove:
            saved[kind + '_asset_id'] = ''
        if upload:
            if kind == 'font' and not data.font_license_confirmed:
                fail(422, 'Confirme a licença de uso web e incorporação em PDF da fonte enviada.')
            content, media, extension = _asset_content(upload, kind)
            asset_id = hashlib.sha256(content).hexdigest() + extension
            if not db.get(InstitutionAsset, asset_id):
                db.add(InstitutionAsset(id=asset_id, media_type=media, content=content))
            saved[kind + '_asset_id'] = asset_id
    if data.font_family == 'custom' and not saved.get('font_asset_id'):
        fail(422, 'Envie uma fonte TTF ou WOFF2 para utilizar a tipografia personalizada.')
    saved.pop('version', None)
    install.identity = saved
    install.identity_version += 1
    audit(db, request, user, 'institution.identity.updated', install, details={
        'display_name': saved['display_name'], 'version': install.identity_version,
        'logo_configured': bool(saved.get('logo_asset_id')), 'font_family': data.font_family,
        'show_preenrollment_button': saved['show_preenrollment_button'],
    })
    # Ativos não referenciados são públicos de marca, mas não precisam crescer indefinidamente.
    keep = {saved.get('logo_asset_id'), saved.get('font_asset_id')} - {'', None}
    db.flush()
    for asset in db.scalars(select(InstitutionAsset)):
        if asset.id not in keep:
            db.delete(asset)
    db.flush()
    return public_identity(db)


@router.get('/api/v1/institution/assets/{asset_id}')
def asset(asset_id: str, db: DB):
    data = identity_data(db)
    if asset_id not in {data.get('logo_asset_id'), data.get('font_asset_id')}:
        fail(404, 'Ativo de identidade não encontrado.')
    obj = db.get(InstitutionAsset, asset_id)
    if not obj:
        fail(404, 'Ativo de identidade não encontrado.')
    return Response(obj.content, media_type=obj.media_type, headers={'X-Content-Type-Options': 'nosniff'})


def foreground(value):
    def linear(v):
        c = int(v, 16) / 255
        return c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4
    r, g, b = [linear(value[i:i+2]) for i in (1, 3, 5)]
    luminance = .2126 * r + .7152 * g + .0722 * b
    return '#000000' if luminance > .179 else '#FFFFFF'


@router.get('/api/v1/institution/theme.css', include_in_schema=False)
def theme(db: DB):
    data = identity_data(db)
    primary, secondary = data['primary_color'], data['secondary_color']
    family = FONTS.get(data['font_family'], FONTS['system'])
    css = ''
    if data['font_family'] == 'custom' and data['font_asset_id']:
        css += '@font-face{font-family:InstitutionFont;src:url("/api/v1/institution/assets/' + data['font_asset_id'] + '");font-display:swap;}'
    dark = '#' + ''.join(f'{round(int(primary[i:i+2], 16) * .82):02x}' for i in (1, 3, 5))
    css += (f':root{{--primary:{primary};--primary-dark:{dark};--ink:{secondary};'
            f'--institution-font:{family};--primary-on:{foreground(primary)};'
            f'--pige360-petroleum:{primary};--pige360-navy:{secondary};font-family:{family};}}'
            '.btn-primary{color:var(--primary-on)}')
    return Response(css, media_type='text/css')


@router.get('/api/v1/institution/icon.png', include_in_schema=False)
def icon(db: DB, size: int = Query(192)):
    if size not in (32, 180, 192, 512):
        fail(422, 'Tamanho de ícone inválido.')
    data = identity_data(db)
    logo = db.get(InstitutionAsset, data['logo_asset_id']) if data['logo_asset_id'] else None
    image = Image.new('RGBA', (size, size), (255, 255, 255, 0))
    if logo:
        with Image.open(io.BytesIO(logo.content)) as source:
            source = source.convert('RGBA')
            source.thumbnail((size, size), Image.Resampling.LANCZOS)
            image.alpha_composite(source, ((size-source.width)//2, (size-source.height)//2))
    else:
        image.paste(data['primary_color'], (0, 0, size, size))
        initials = ''.join(w[0] for w in data['display_name'].split()[:2]).upper()
        draw = ImageDraw.Draw(image)
        draw.text((size/2, size/2), initials, fill=foreground(data['primary_color']),
                  font=ImageFont.load_default(size=max(12, size//3)), anchor='mm')
    buffer = io.BytesIO()
    image.save(buffer, 'PNG')
    return Response(buffer.getvalue(), media_type='image/png')


@router.get('/manifest.webmanifest', include_in_schema=False)
def manifest(db: DB):
    data = identity_data(db)
    return JSONResponse({
        'id': '/', 'name': data['display_name'], 'short_name': data['short_name'],
        'description': 'Gestão escolar e atendimento da instituição.', 'lang': 'pt-BR',
        'start_url': '/', 'scope': '/', 'display': 'standalone',
        'background_color': '#F2F4F7', 'theme_color': data['primary_color'],
        'icons': [{'src': f'/api/v1/institution/icon.png?size={size}&v={data["version"]}',
                   'sizes': f'{size}x{size}', 'type': 'image/png', 'purpose': 'any'} for size in (192, 512)],
        'shortcuts': [{'name': 'Alunos', 'url': '/#/students'}, {'name': 'Matrículas', 'url': '/#/enrollments'}, {'name': 'Protocolos', 'url': '/#/protocols'}],
    }, media_type='application/manifest+json')


@router.patch('/api/v1/companies/{company_id}')
def edit_company(company_id: str, data: Edit, db: DB, user: Actor, request: Request):
    # Mantém o contrato versionado existente, sem criar outra mantenedora.
    _admin(user)
    try:
        values = CompanyInput.model_validate(data.data)
    except ValidationError:
        fail(422, 'Revise razão social, documento e versão da mantenedora.')
    company = db.scalar(select(m.Company).where(m.Company.id == company_id).with_for_update())
    if not company:
        fail(404, 'Mantenedora não encontrada.')
    if company.version != data.version:
        fail(409, 'A mantenedora foi alterada. Reabra o cadastro.')
    for key, value in values.model_dump().items():
        setattr(company, key, value)
    company.version += 1
    audit(db, request, user, 'company.updated', company)
    db.flush()
    return output(company)
