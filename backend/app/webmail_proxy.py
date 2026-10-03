"""Keep SOGo redirects and cookies under the authorized school path."""
import re
from urllib.parse import urljoin, urlsplit, urlunsplit


def _webmail_path(path: str, prefix: str) -> str:
    if path in (prefix + '/SOGo', '/SOGo'):
        return prefix + '/SOGo/'
    for root in ('/SOGo/', '/principals/'):
        if path.startswith(prefix + root):
            return path
        if path.startswith(root):
            return prefix + path
    raise ValueError('SOGo redirecionou para um caminho inesperado.')


def rewrite_location(location: str, target: str, upstream: str, public_base: str, prefix: str) -> str:
    resolved = urlsplit(urljoin(target, location))
    origins = {(p.scheme, p.netloc) for p in (urlsplit(upstream), urlsplit(public_base))}
    if (resolved.scheme, resolved.netloc) not in origins:
        raise ValueError('SOGo tentou redirecionar para outra origem.')
    path = _webmail_path(resolved.path, prefix)
    return urlunsplit(('', '', path, resolved.query, resolved.fragment))


def rewrite_cookie_path(cookie: str, prefix: str) -> str:
    def replace(match: re.Match[str]) -> str:
        path = match.group(2).strip()
        if path == '/':
            return match.group(1) + 'Path=' + prefix + '/'
        if path.startswith(prefix + '/'):
            return match.group(0)
        if path in ('/SOGo', '/principals') or path.startswith(('/SOGo/', '/principals/')):
            return match.group(1) + 'Path=' + prefix + path
        return match.group(0)

    # An upstream Domain=sogo cookie cannot be stored by the public site.
    # Keep it host-only after passing through our same-origin proxy.
    cookie = re.sub(r'(?i);\s*domain=[^;]*', '', cookie)
    return re.sub(r'(?i)(^|;\s*)path=([^;]*)', replace, cookie, count=1)
