"""Keep SOGo redirects and cookies under the authorized school path."""
import base64
import re
from urllib.parse import urljoin, urlsplit, urlunsplit


_WEBMAIL_ROOT_REFERENCE = re.compile(
    r'(?<![A-Za-z0-9_.-])/(?:'
    r'SOGo(?=/|$|[?#"\'\\\s)>])|'
    r'principals(?=/|$|[?#"\'\\\s)>])|'
    r'SOGo\.woa/WebServerResources/)'
)
_CSS_COLOR = re.compile(r'\A#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\Z')


def rewrite_resource_urls(content: str, prefix: str, trusted_origins=()) -> str:
    """Keep SOGo root-relative URLs inside this school's authenticated proxy.

    Mail bodies are often returned inside JSON, not in the initial HTML page.
    Rewriting textual SOGo responses also covers images in signatures, CSS
    url() values, and download links embedded in those response payloads.
    """
    safe_prefix = prefix.rstrip('/')
    rewritten = _WEBMAIL_ROOT_REFERENCE.sub(lambda match: safe_prefix + match.group(0), content)
    for origin in trusted_origins:
        parsed = urlsplit(origin)
        if parsed.scheme not in {'http', 'https'} or not parsed.netloc:
            continue
        authority = f'{parsed.scheme}://{parsed.netloc}'
        absolute_reference = re.compile(
            re.escape(authority) + r'(?P<path>/(?:'
            r'SOGo(?=/|$|[?#"\'\\\s)>])|'
            r'principals(?=/|$|[?#"\'\\\s)>])|'
            r'SOGo\.woa/WebServerResources/))', re.IGNORECASE
        )
        rewritten = absolute_reference.sub(lambda match: safe_prefix + match.group('path'), rewritten)
    return rewritten


def is_rewritable_content_type(content_type: str) -> bool:
    media_type = content_type.partition(';')[0].strip().lower()
    return media_type in {
        'text/html', 'application/xhtml+xml', 'text/css', 'text/javascript',
        'application/javascript', 'application/x-javascript', 'application/ecmascript',
        'application/json', 'application/ld+json', 'application/xml', 'text/xml',
    }


def safe_theme_color(value: object, fallback: str) -> str:
    """Allow only literal hex colors before placing identity data in CSS."""
    return value if isinstance(value, str) and _CSS_COLOR.fullmatch(value) else fallback



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
