"""Catch a dead SOGo user helper even when its Apache login page still returns 200."""
from pathlib import Path
from urllib.request import urlopen


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


if __name__ == '__main__':
    main()
