"""Autorização de iframe pela escola. Não configura CORS, SSO ou o widget de chat."""
from fastapi import APIRouter, Request
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import select, update
from . import models as m
from .common import audit
from .config import settings
from .embedding import origins, effective_origins
from .security import Actor, DB, check_version, fail, require, request_csrf, verify

router = APIRouter(prefix='/api/v1/institution/embedding', tags=['Segurança institucional'])

class EmbeddingInput(BaseModel):
    model_config = ConfigDict(extra='forbid')
    version: int = Field(ge=1)
    enabled: bool
    allowed_origins: list[str] = Field(default_factory=list, max_length=12)
    current_password: str = Field(min_length=1, max_length=128)

    @field_validator('allowed_origins')
    @classmethod
    def validate_origins(cls, values):
        normalized = []
        for value in values:
            result = origins(value, settings().app_env == 'production')
            if len(result) != 1:
                raise ValueError('Informe uma origem HTTPS por linha.')
            if result[0] not in normalized:
                normalized.append(result[0])
        return normalized


def admin_only(user):
    require(user, 'schools.manage')
    if user.role != 'admin':
        fail(403, 'Somente o administrador da escola pode autorizar incorporação.')


def data(db):
    cfg = settings()
    row = db.get(m.EmbeddingSettings, 1)
    configured = bool(row and row.configured)
    saved = row.allowed_origins if configured else origins(cfg.embed_allowed_origins, cfg.app_env == 'production')
    return {'version': row.version if row else 1, 'enabled': row.enabled if configured else bool(saved),
            'allowed_origins': saved, 'effective_origins': effective_origins(db),
            'source': 'institution' if configured else 'environment',
            'https_ready': cfg.cookie_secure and cfg.app_url.startswith('https://'),
            'app_origin': cfg.app_url}


@router.get('')
def get_settings(db: DB, user: Actor):
    admin_only(user)
    return data(db)


@router.put('')
def save_settings(payload: EmbeddingInput, db: DB, user: Actor, request: Request):
    admin_only(user)
    request_csrf(request)
    if not verify(payload.current_password, user.password_hash):
        fail(422, 'Confirme sua senha atual para alterar a segurança da instalação.')
    row = db.scalar(select(m.EmbeddingSettings).where(m.EmbeddingSettings.id == 1).with_for_update())
    if not row:
        fail(503, 'Atualize as migrations antes de configurar a incorporação.')
    check_version(row, payload.version)
    before = data(db)
    if payload.enabled and not payload.allowed_origins:
        fail(422, 'Adicione pelo menos uma origem autorizada antes de ativar.')
    if payload.enabled and not before['https_ready']:
        fail(422, 'Configure APP_URL com HTTPS e COOKIE_SECURE=true antes de ativar a incorporação.')
    changed = before['enabled'] != payload.enabled or before['allowed_origins'] != payload.allowed_origins
    row.configured = True
    row.enabled = payload.enabled
    row.allowed_origins = payload.allowed_origins
    row.version += 1
    if changed:
        # Uma origem removida não deve conservar uma sessão já aberta em um iframe.
        db.execute(update(m.AuthSession).values(revoked=True))
        db.execute(update(m.PortalSession).values(revoked=True))
        db.execute(update(m.MFAChallenge).values(consumed=True, encrypted_secret=''))
    audit(db, request, user, 'institution.embedding.updated', row, details={
        'enabled': row.enabled, 'allowed_origins': row.allowed_origins,
        'previous_origins': before['allowed_origins'], 'sessions_revoked': changed})
    db.flush()
    return {**data(db), 'requires_login': changed}
