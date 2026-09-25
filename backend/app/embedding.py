"""Incorporação explícita; não dá acesso à API ao site que hospeda o iframe."""
import re
from urllib.parse import urlsplit
from .config import settings


def origins(value: str, production: bool = True) -> list[str]:
    result = []
    for item in re.split(r"[,\s]+", value.strip()):
        if not item:
            continue
        if any(ord(ch) < 33 or ord(ch) == 127 for ch in item) or len(item) > 300:
            raise ValueError('Origem inválida.')
        url = urlsplit(item)
        try:
            port = url.port
        except ValueError as exc:
            raise ValueError('Porta inválida em EMBED_ALLOWED_ORIGINS.') from exc
        host = url.hostname or ''
        local = not production and host in {'localhost', '127.0.0.1', '[::1]', '::1'}
        if (url.scheme != 'https' and not (local and url.scheme == 'http')) or not host or url.username or url.password or url.path not in ('', '/') or url.query or url.fragment or not re.fullmatch(r'[a-zA-Z0-9.:-]+', host) or '..' in host or port == 0:
            raise ValueError('EMBED_ALLOWED_ORIGINS aceita somente origens HTTPS exatas, sem caminhos, curingas ou credenciais.')
        host = '[' + host + ']' if ':' in host else host.lower()
        normalized = url.scheme + '://' + host + (':' + str(port) if port and port != (443 if url.scheme == 'https' else 80) else '')
        if normalized not in result:
            result.append(normalized)
    if len(result) > 12:
        raise ValueError('Autorize no máximo 12 origens de incorporação.')
    return result


def effective_origins(db) -> list[str]:
    # Preferência da interface substitui o bootstrap do .env, inclusive desativado.
    from .models import EmbeddingSettings
    cfg = settings()
    row = db.get(EmbeddingSettings, 1)
    value = cfg.embed_allowed_origins
    if row and row.configured:
        value = ','.join(row.allowed_origins) if row.enabled else ''
    if value and (not cfg.cookie_secure or not cfg.app_url.startswith('https://')):
        return []  # falha fechada após configuração incoerente do ambiente
    return origins(value, cfg.app_env == 'production')


def frame_sources() -> list[str]:
    from .db import SessionLocal
    try:
        with SessionLocal() as db:
            return effective_origins(db)
    except Exception:
        # Migração/banco indisponível nunca libera incorporação por engano.
        return []


def cookie(response, key: str, value: str = '', *, path: str, max_age: int = 0, delete: bool = False, db=None):
    cfg = settings()
    embedded = bool(effective_origins(db) if db is not None else frame_sources())
    if delete:
        # Remove a variante atual e a antiga; outras partições ficam revogadas no banco.
        response.set_cookie(key, '', path=path, max_age=0, expires=0,
                            secure=cfg.cookie_secure, httponly=True, samesite='strict')
        if cfg.cookie_secure:
            response.set_cookie(key, '', path=path, max_age=0, expires=0,
                                secure=True, httponly=True, samesite='none')
            name, header = response.raw_headers[-1]
            response.raw_headers[-1] = (name, header + b'; Partitioned')
        return
    response.set_cookie(key, value, path=path, max_age=max_age,
                        secure=cfg.cookie_secure, httponly=True,
                        samesite='none' if embedded else 'strict')
    if embedded:
        # Suporte ao atributo CHIPS também no Python 3.13. Valor constante, sem interpolação.
        name, header = response.raw_headers[-1]
        assert name == b'set-cookie'
        response.raw_headers[-1] = (name, header + b'; Partitioned')
