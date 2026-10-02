"""Atendimento configurável por instituição e área de uso.

O website token é público por natureza, porém permanece cifrado em repouso e
só é entregue à área habilitada da instituição explicitamente selecionada.
"""
from urllib.parse import urlsplit

from fastapi import APIRouter, Request
from sqlalchemy import select

from . import models as m, schemas as s
from .common import audit
from .config import settings
from .db import SessionLocal
from .integration_core import IntegrationFailure, seal, unseal
from .security import Actor, DB, Scope, check_version, fail, require

router = APIRouter(prefix='/api/v1', tags=['Atendimento via site'])
DEFAULT_AREAS = ['online_enrollment']


def _validate_base_url(value: str, enabled: bool) -> str:
    base_url = (value or '').strip().rstrip('/')
    if not base_url:
        if enabled:
            fail(422, 'Informe o endereço do atendimento antes de habilitá-lo.')
        return ''
    parsed = urlsplit(base_url)
    if parsed.scheme not in ('http', 'https') or not parsed.hostname:
        fail(422, 'O endereço do atendimento deve usar http:// ou https://.')
    if parsed.username or parsed.password or parsed.query or parsed.fragment:
        fail(422, 'O endereço não pode conter credenciais, parâmetros ou fragmentos.')
    if any(ord(char) < 32 for char in base_url):
        fail(422, 'O endereço contém caracteres inválidos.')
    if settings().app_env == 'production' and parsed.scheme != 'https':
        fail(422, 'Em produção, o atendimento precisa usar HTTPS.')
    return base_url


def _settings_output(obj, school_id: str) -> dict:
    return {
        'id': obj.id if obj else '',
        'school_id': school_id,
        'enabled': obj.enabled if obj else False,
        'enabled_areas': list(obj.enabled_areas or []) if obj else list(DEFAULT_AREAS),
        'base_url': obj.base_url if obj else '',
        'position': obj.position if obj else 'left',
        'widget_type': obj.widget_type if obj else 'expanded_bubble',
        'launcher_title': obj.launcher_title if obj else 'Suporte',
        'token_configured': bool(obj and obj.encrypted_token),
        'version': obj.version if obj else 1,
    }


def _public_output(obj, area: str) -> dict:
    disabled = {
        'enabled': False, 'base_url': '', 'website_token': '',
        'position': 'left', 'type': 'expanded_bubble', 'launcherTitle': 'Suporte',
    }
    if (obj is None or not obj.enabled or area not in (obj.enabled_areas or [])
            or not obj.base_url or not obj.encrypted_token):
        return disabled
    try:
        token = str(unseal(obj.encrypted_token).get('website_token') or '')
    except (IntegrationFailure, ValueError, TypeError):
        return disabled
    if not token:
        return disabled
    return {
        'enabled': True, 'base_url': obj.base_url, 'website_token': token,
        'position': obj.position, 'type': obj.widget_type, 'launcherTitle': obj.launcher_title,
    }


def _school_settings(db, school_id: str, lock: bool = False):
    stmt = select(m.SchoolSupportSettings).where(m.SchoolSupportSettings.school_id == school_id)
    if lock:
        stmt = stmt.with_for_update()
    return db.scalar(stmt)


@router.get('/support-widget')
def public_support_widget(db: DB):
    """Login sem seletor: disponível somente quando existe uma escola ativa.

    Nunca escolhe a primeira instituição de uma instalação com várias escolas.
    O opt-in de login também é obrigatório nessa escola única.
    """
    schools = list(db.scalars(select(m.School.id).where(m.School.active.is_(True)).limit(2)))
    obj = _school_settings(db, schools[0]) if len(schools) == 1 else None
    return _public_output(obj, 'login')


@router.get('/schools/{school_id}/support-widget')
def school_support_widget(school_id: str, db: DB, area: s.SupportArea = 'online_enrollment'):
    school = db.get(m.School, school_id)
    if not school or not school.active:
        fail(404, 'Instituição não encontrada.')
    return _public_output(_school_settings(db, school.id), area)


@router.get('/schools/{school_id}/support-hub')
def get_support_hub(db: DB, user: Actor, school: Scope):
    require(user, 'schools.manage')
    return _settings_output(_school_settings(db, school.id), school.id)


@router.put('/schools/{school_id}/support-hub')
def save_support_hub(data: s.SupportHubInput, db: DB, user: Actor, school: Scope, request: Request):
    require(user, 'schools.manage')
    obj = _school_settings(db, school.id, lock=True)
    base_url = _validate_base_url(data.base_url, data.enabled)
    token = data.token.strip()
    encrypted_token = obj.encrypted_token if obj else ''
    if token:
        if len(token) < 8:
            fail(422, 'A chave do atendimento parece incompleta.')
        encrypted_token = seal({'website_token': token})
    if data.enabled and not encrypted_token:
        fail(422, 'Informe a chave do atendimento antes de habilitá-lo.')
    if obj and data.version is None:
        fail(422, 'Informe a versão atual da configuração.')
    if obj:
        check_version(obj, data.version)
    areas = list(dict.fromkeys(data.enabled_areas))
    if data.enabled and not areas:
        fail(422, 'Selecione pelo menos uma área para exibir o atendimento.')
    if obj is None:
        obj = m.SchoolSupportSettings(school_id=school.id)
        db.add(obj)
    else:
        obj.version += 1
    obj.enabled = data.enabled
    obj.enabled_areas = areas
    obj.base_url = base_url
    obj.position = data.position
    obj.widget_type = data.widget_type
    obj.launcher_title = data.launcher_title
    obj.encrypted_token = encrypted_token
    db.flush()
    audit(db, request, user, 'school.support.updated', obj, school.id, details={
        'enabled': obj.enabled, 'enabled_areas': areas, 'token_configured': bool(obj.encrypted_token),
    })
    return _settings_output(obj, school.id)


@router.get('/companies/{company_id}/support-hub', deprecated=True)
@router.put('/companies/{company_id}/support-hub', deprecated=True)
def legacy_company_support_hub(company_id: str, user: Actor):
    require(user, 'schools.manage')
    fail(409, 'Selecione a instituição e configure o atendimento nela. A configuração por mantenedora foi substituída.')


def csp_sources() -> tuple[list[str], list[str]]:
    """Origens aprovadas; credenciais nunca fazem parte da política pública."""
    try:
        with SessionLocal() as db:
            urls = list(db.scalars(select(m.SchoolSupportSettings.base_url).where(
                m.SchoolSupportSettings.enabled.is_(True), m.SchoolSupportSettings.base_url != '',
            )))
    except Exception:
        return [], []
    origins: set[str] = set()
    sockets: set[str] = set()
    for value in urls:
        parsed = urlsplit(value)
        if not parsed.hostname or parsed.scheme not in ('http', 'https'):
            continue
        origins.add(f'{parsed.scheme}://{parsed.netloc}')
        sockets.add(('wss' if parsed.scheme == 'https' else 'ws') + f'://{parsed.netloc}')
    return sorted(origins), sorted(sockets)
