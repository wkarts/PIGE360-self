"""Ferramentas administrativas: restrição de papel e ativação explícita."""
import json
import re
from .config import settings
from .security import fail


def develop_build():
    # O manifesto é produzido no build da imagem, não pelo APP_ENV da instalação.
    # Falha fechada quando ausente/corrompido ou quando a versão é estável.
    try:
        manifest = json.loads((settings().frontend_path / 'build-info.json').read_text())
        return (isinstance(manifest, dict)
                and manifest.get('product') == 'PIGE360 Self'
                and manifest.get('pipeline') == 'typescript-vue-precompiled'
                and bool(re.fullmatch(r'\d+\.\d+\.\d+-develop\.\d+(?:\.\d+)*', str(manifest.get('version', '')))))
    except (OSError, ValueError, TypeError):
        return False


def portability_enabled(db):
    from .models import Installation
    obj=db.get(Installation,1) if db else None
    return obj.portability_enabled if obj and obj.portability_enabled is not None else (settings().portability_enabled or develop_build())


def capabilities(user):
    from sqlalchemy.orm import object_session
    from sqlalchemy import select
    from .models import SchoolAccess
    db=object_session(user)
    admin=user.role=='admin'
    sid=getattr(user,'_active_school_id',None)
    query=select(SchoolAccess).where(SchoolAccess.user_id==user.id,SchoolAccess.active.is_(True),
        SchoolAccess.archived_at.is_(None),SchoolAccess.portability_granted.is_(True))
    if sid:query=query.where(SchoolAccess.school_id==sid)
    delegated=bool(db and user.role in {'direction','coordination','secretary'} and db.scalar(query.limit(1)))
    return {'portability':bool((admin or delegated) and portability_enabled(db)),
            'diagnostics':admin,'audit':admin,'develop_build':admin and develop_build()}


def require_admin(user):
    if user.role != 'admin':
        fail(403, 'Esta ferramenta está disponível somente para o administrador da instalação.')


def require_portability(user):
    if not capabilities(user)['portability']:
        fail(403,'A portabilidade não está habilitada ou seu acesso não foi delegado nesta escola.')
