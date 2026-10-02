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


def capabilities(user):
    admin = user.role == 'admin'
    development = develop_build()
    return {'portability': admin and (settings().portability_enabled or development),
            'diagnostics': admin, 'audit': admin, 'develop_build': admin and development}


def require_admin(user):
    if user.role != 'admin':
        fail(403, 'Esta ferramenta está disponível somente para o administrador da instalação.')


def require_portability(user):
    require_admin(user)
    if not capabilities(user)['portability']:
        fail(403, 'A portabilidade de dados não está habilitada nesta instalação.')
