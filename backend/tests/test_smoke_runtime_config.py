"""The disposable Docker smoke must satisfy the real production settings."""
from pathlib import Path
import subprocess
import sys

from app.config import Settings


def test_generated_smoke_environment_passes_production_validation(tmp_path):
    root = Path(__file__).resolve().parents[2]
    script = (root / 'scripts/ci/smoke.sh').read_text()
    generator = script.split("<<'PYCONF'\n", 1)[1].split('\nPYCONF\n', 1)[0]
    destination = tmp_path / 'smoke.env'
    subprocess.run([sys.executable, '-', str(destination)], input=generator,
                   text=True, check=True)
    values = dict(line.split('=', 1) for line in destination.read_text().splitlines())
    config = Settings(_env_file=None, **{key.lower(): value for key, value in values.items()},
                      database_url='postgresql+psycopg://smoke:synthetic@db/smoke', allow_sqlite=False)
    assert config.app_env == 'production'
    assert config.portal_public_url != config.app_url
    assert not config.cookie_secure  # HTTP is permitted only for a local origin.
