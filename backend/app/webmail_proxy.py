"""Keep SOGo redirects and cookies under the authorized school path."""
import base64
import re
from urllib.parse import urljoin, urlsplit, urlunsplit


def auth_headers(principal: str, password: str) -> dict[str, str]:
    """SOGo extracts the IMAP password only when Basic's user matches remote-user.

    The SQL user source maps this principal to the mailbox address for IMAP/SMTP.
    """
    basic = base64.b64encode(f'{principal}:{password}'.encode('utf-8')).decode('ascii')
    return {'x-webobjects-remote-user': principal, 'x-webobjects-auth-type': 'Basic',
            'authorization': 'Basic ' + basic}


def cache_control(resource: str, query: str, status: int, method: str) -> str:
    """Only versioned SOGo distribution assets can be reused by one browser."""
    static = resource.startswith(('SOGo.woa/WebServerResources/', 'SOGo/WebServerResources/'))
    if static and 'lm=' in query and status == 200 and method in {'GET', 'HEAD'}:
        return 'private, max-age=86400'
    return 'no-store'


def _webmail_path(path: str, prefix: str) -> str:
    if path in (prefix + '/SOGo', '/SOGo'):
        return prefix + '/SOGo/'
    for root in ('/SOGo/', '/principals/', '/SOGo.woa/WebServerResources/'):
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
        if path in ('/SOGo', '/principals') or path.startswith(('/SOGo/', '/principals/', '/SOGo.woa/WebServerResources/')):
            return match.group(1) + 'Path=' + prefix + path
        return match.group(0)

    # An upstream Domain=sogo cookie cannot be stored by the public site.
    # Keep it host-only after passing through our same-origin proxy.
    cookie = re.sub(r'(?i);\s*domain=[^;]*', '', cookie)
    return re.sub(r'(?i)(^|;\s*)path=([^;]*)', replace, cookie, count=1)
