"""Allow only the private PIGE360 proxy to supply SOGo identity and public URL.

The upstream Apache template discards x-webobjects-remote-user and rewrites
x-webobjects-server-url to the container host. Both break proxy authentication
and the school-prefixed same-origin webmail path. Fail the image build if the
upstream template changes, so an image cannot silently lose this contract.
"""
from pathlib import Path


def configure(apache_directory: Path) -> Path:
    candidates = {
        path.resolve() for path in apache_directory.rglob('*SOGo*.conf')
        if path.is_file() and 'RequestHeader unset "x-webobjects-remote-user"' in path.read_text()
    }
    if len(candidates) != 1:
        raise SystemExit(f'Expected one upstream SOGo Apache template, found {len(candidates)}')
    path = candidates.pop()
    content = path.read_text()
    directives = (
        'RequestHeader unset "x-webobjects-remote-user"',
        'RequestHeader set "x-webobjects-server-url"',
        'RequestHeader set "x-webobjects-server-port"',
        'RequestHeader set "x-webobjects-server-name"',
    )
    for directive in directives:
        matching = [line for line in content.splitlines(keepends=True)
                    if line.lstrip().startswith(directive)]
        if len(matching) != 1:
            raise SystemExit(f'Unexpected upstream Apache directive: {directive}')
        content = content.replace(matching[0], '', 1)
    path.write_text(content)
    return path


def main() -> None:
    configure(Path('/etc/apache2'))


if __name__ == '__main__':
    main()
