"""Catch a dead SOGo user helper even when its Apache login page still returns 200."""
from pathlib import Path
from urllib.request import Request, urlopen


def helper_running(proc: Path = Path('/proc')) -> bool:
    for path in proc.glob('[0-9]*/cmdline'):
        try:
            command = path.read_bytes().replace(b'\0', b' ')
            if b'sogo-tool-plus -mode server' in command:
                return True
        except OSError:
            continue
    return False


def main() -> None:
    if not helper_running():
        raise SystemExit('SOGo user helper is not running')
    with urlopen('http://127.0.0.1/SOGo/', timeout=5) as response:
        if response.status != 200:
            raise SystemExit('SOGo HTTP status is not 200')
    # A página de login pode estar saudável enquanto Apache não serve CSS/JS.
    for resource, allowed_types in (
        ('css/styles.css', {'text/css'}),
        ('js/vendor/angular.min.js', {'application/javascript', 'text/javascript', 'application/x-javascript'}),
    ):
        request = Request('http://127.0.0.1/SOGo.woa/WebServerResources/' + resource, method='HEAD')
        with urlopen(request, timeout=5) as response:
            if response.status != 200 or response.headers.get_content_type() not in allowed_types:
                raise SystemExit('SOGo static resource is not served with its expected MIME type: ' + resource)


if __name__ == '__main__':
    main()
