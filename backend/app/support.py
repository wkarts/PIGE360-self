"""Configuração do widget de atendimento por empresa/tenant.

O token é cifrado em repouso. O endpoint público devolve somente os campos
necessários para inicializar o SDK no navegador, pois o website token precisa
ser conhecido pelo widget do Hub.
"""
from urllib.parse import urlsplit

from fastapi import APIRouter, Request
from sqlalchemy import select

from . import models as m, schemas as s
from .common import audit
from .config import settings
from .db import SessionLocal
from .integration_core import IntegrationFailure, seal, unseal
from .security import Actor, DB, check_version, fail, require


router = APIRouter(prefix='/api/v1', tags=['Atendimento via site'])


def _company_for_user(db, company_id: str, user: Actor):
    company = db.get(m.Company, company_id)
    if not company:
        fail(404, 'Empresa não encontrada.')
    if user.role != 'admin':
        allowed = db.scalar(
            select(m.School.id)
            .join(m.SchoolAccess, m.SchoolAccess.school_id == m.School.id)
            .where(m.School.company_id == company_id, m.SchoolAccess.user_id == user.id)
            .limit(1)
        )
        if not allowed:
            fail(403, 'Acesso não autorizado a esta empresa.')
    return company


def _validate_base_url(value: str, enabled: bool) -> str:
    base_url = (value or '').strip().rstrip('/')
    if not base_url:
        if enabled:
            fail(422, 'Informe a URL base do Hub antes de habilitar o chat.')
        return ''
    parsed = urlsplit(base_url)
    if parsed.scheme not in ('http', 'https') or not parsed.hostname:
        fail(422, 'A URL base do Hub deve usar http:// ou https://.')
    if parsed.username or parsed.password or parsed.query or parsed.fragment:
        fail(422, 'A URL base do Hub não pode conter credenciais, query ou fragmento.')
    if any(ord(char) < 32 for char in base_url):
        fail(422, 'A URL base do Hub contém caracteres inválidos.')
    if settings().app_env == 'production' and parsed.scheme != 'https':
        fail(422, 'Em produção, a URL base do Hub precisa usar HTTPS.')
    return base_url


def _empty(company_id: str) -> dict:
    return {
        'id': '',
        'company_id': company_id,
        'enabled': False,
        'base_url': '',
        'position': 'left',
        'widget_type': 'expanded_bubble',
        'launcher_title': 'Suporte',
        'token_configured': False,
        'version': 1,
    }


def _settings_output(obj, company_id: str) -> dict:
    if obj is None:
        return _empty(company_id)
    return {
        'id': obj.id,
        'company_id': obj.company_id,
        'enabled': obj.enabled,
        'base_url': obj.base_url,
        'position': obj.position,
        'widget_type': obj.widget_type,
        'launcher_title': obj.launcher_title,
        'token_configured': bool(obj.encrypted_token),
        'version': obj.version,
    }


def _public_output(obj) -> dict:
    disabled = {
        'enabled': False,
        'base_url': '',
        'website_token': '',
        'position': 'left',
        'type': 'expanded_bubble',
        'launcherTitle': 'Suporte',
    }
    if obj is None or not obj.enabled or not obj.base_url or not obj.encrypted_token:
        return disabled
    try:
        token = str(unseal(obj.encrypted_token).get('website_token') or '')
    except (IntegrationFailure, ValueError, TypeError):
        return disabled
    if not token:
        return disabled
    return {
        'enabled': True,
        'base_url': obj.base_url,
        'website_token': token,
        'position': obj.position,
        'type': obj.widget_type,
        'launcherTitle': obj.launcher_title,
    }


def _company_settings(db, company_id: str, lock: bool = False):
    stmt = select(m.CompanySupportSettings).where(
        m.CompanySupportSettings.company_id == company_id
    )
    if lock:
        stmt = stmt.with_for_update()
    return db.scalar(stmt)


@router.get('/support-widget')
def public_support_widget(db: DB):
    """Configuração pública mínima para o shell do tenant principal."""
    obj = db.scalar(
        select(m.CompanySupportSettings)
        .where(m.CompanySupportSettings.enabled.is_(True))
        .order_by(m.CompanySupportSettings.created_at, m.CompanySupportSettings.id)
        .limit(1)
    )
    return _public_output(obj)


@router.get('/schools/{school_id}/support-widget')
def school_support_widget(school_id: str, db: DB, user: Actor):
    """Configuração pública do Hub da empresa da escola ativa."""
    school = db.get(m.School, school_id)
    if not school or not school.active:
        fail(404, 'Escola não encontrada.')
    if user.role != 'admin' and not db.get(m.SchoolAccess, (user.id, school_id)):
        fail(403, 'Acesso não autorizado a esta escola.')
    obj = db.scalar(
        select(m.CompanySupportSettings)
        .where(m.CompanySupportSettings.company_id == school.company_id)
    )
    return _public_output(obj)


@router.get('/companies/{company_id}/support-hub')
def get_support_hub(company_id: str, db: DB, user: Actor):
    require(user, 'schools.manage')
    company = _company_for_user(db, company_id, user)
    return _settings_output(_company_settings(db, company.id), company.id)


@router.put('/companies/{company_id}/support-hub')
def save_support_hub(
    company_id: str,
    data: s.SupportHubInput,
    db: DB,
    user: Actor,
    request: Request,
):
    require(user, 'schools.manage')
    company = _company_for_user(db, company_id, user)
    obj = _company_settings(db, company.id, lock=True)
    base_url = _validate_base_url(data.base_url, data.enabled)
    token = data.token.strip()
    encrypted_token = obj.encrypted_token if obj else ''
    if token:
        if len(token) < 8:
            fail(422, 'O token do Hub parece incompleto.')
        encrypted_token = seal({'website_token': token})
    if data.enabled and not encrypted_token:
        fail(422, 'Informe o token do Hub antes de habilitar o chat.')
    if obj and data.version is None:
        fail(422, 'Informe a versão atual da configuração.')
    if obj and data.version is not None:
        check_version(obj, data.version)

    if obj is None:
        obj = m.CompanySupportSettings(
            company_id=company.id,
            enabled=data.enabled,
            base_url=base_url,
            position=data.position,
            widget_type=data.widget_type,
            launcher_title=data.launcher_title,
            encrypted_token=encrypted_token,
        )
        db.add(obj)
    else:
        obj.enabled = data.enabled
        obj.base_url = base_url
        obj.position = data.position
        obj.widget_type = data.widget_type
        obj.launcher_title = data.launcher_title
        if token:
            obj.encrypted_token = encrypted_token
        obj.version += 1
    db.flush()
    audit(
        db,
        request,
        user,
        'company.support_hub.updated',
        obj,
        details={
            'company_id': company.id,
            'enabled': obj.enabled,
            'base_url': obj.base_url,
            'token_configured': bool(obj.encrypted_token),
        },
    )
    return _settings_output(obj, company.id)


def csp_sources() -> tuple[list[str], list[str]]:
    """Retorna origens aprovadas para o SDK e WebSocket do Hub."""
    try:
        with SessionLocal() as db:
            urls = list(db.scalars(
                select(m.CompanySupportSettings.base_url).where(
                    m.CompanySupportSettings.enabled.is_(True),
                    m.CompanySupportSettings.base_url != '',
                )
            ))
    except Exception:
        return [], []

    origins: set[str] = set()
    sockets: set[str] = set()
    for value in urls:
        parsed = urlsplit(value)
        if not parsed.hostname or parsed.scheme not in ('http', 'https'):
            continue
        origin = f'{parsed.scheme}://{parsed.netloc}'
        origins.add(origin)
        sockets.add(('wss' if parsed.scheme == 'https' else 'ws') + f'://{parsed.netloc}')
    return sorted(origins), sorted(sockets)
