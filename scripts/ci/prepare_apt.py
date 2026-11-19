"""Configure bounded APT downloads on disposable Ubuntu CI runners only."""
import re
from pathlib import Path


RUNNER_ARCHIVE = re.compile(
    r'(?<!\S)https?://(?:azure|us-east-2\.ec2)\.archive\.ubuntu\.com/ubuntu(?=/?(?:\s|$))'
)

NETWORK_CONFIG = '''Acquire::Retries "3";
Acquire::http::Timeout "30";
Acquire::https::Timeout "30";
DPkg::Lock::Timeout "120";
'''


def prepare_apt(root: Path = Path('/etc/apt')) -> int:
    paths = [root / 'sources.list', root / 'apt-mirrors.txt',
             *(root / 'mirrors').glob('*.list'), *(root / 'sources.list.d').glob('*.list'),
             *(root / 'sources.list.d').glob('*.sources')]
    changed = 0
    for path in paths:
        if not path.is_file():
            continue
        original = path.read_text()
        content = RUNNER_ARCHIVE.sub('https://archive.ubuntu.com/ubuntu', original)
        if content != original:
            path.write_text(content)
            changed += 1
    config = root / 'apt.conf.d' / '80-pige360-ci-network'
    config.parent.mkdir(parents=True, exist_ok=True)
    config.write_text(NETWORK_CONFIG)
    return changed


if __name__ == '__main__':
    print(f'APT CI: HTTPS Ubuntu mirror configured in {prepare_apt()} source files; bounded retries enabled.')
