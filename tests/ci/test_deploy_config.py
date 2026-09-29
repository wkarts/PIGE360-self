"""Checks the deployment configurators against each adapter's real examples."""
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[2]
ADAPTERS = ('docker', 'dockge', 'portainer', 'cloudpanel')


class DeployConfigTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'scripts').mkdir()
        shutil.copy(ROOT / 'VERSION', self.root / 'VERSION')
        for name in ('configure.py', 'prepare-upgrade.py'):
            shutil.copy(ROOT / 'scripts' / name, self.root / 'scripts' / name)
        for adapter in ADAPTERS:
            target = self.root / 'deploy' / adapter
            target.mkdir(parents=True)
            for source in (ROOT / 'deploy' / adapter).glob('.env*.example'):
                shutil.copy(source, target / source.name)

    def run_script(self, name, *args, success=True):
        result = subprocess.run(
            [sys.executable, str(self.root / 'scripts' / name), *args],
            cwd=self.root, text=True, capture_output=True, check=False,
        )
        self.assertEqual(result.returncode == 0, success, result.stderr)
        return result

    def test_configure_all_adapters_and_channels_without_overwrite(self):
        version = (ROOT / 'VERSION').read_text().strip()
        for adapter in ADAPTERS:
            for channel, name in (('local', '.env.local'), ('develop', '.env.develop'), ('stable', '.env.production')):
                env = f'deploy/{adapter}/{name}'
                with self.subTest(adapter=adapter, channel=channel):
                    self.run_script('configure.py', '--channel', channel, '--env-file', env)
                    path = self.root / env
                    content = path.read_text()
                    self.assertIn(f'COMPOSE_PROJECT_NAME=pige360-self-{adapter}-', content)
                    self.assertIn('LEGACY_IMPORT_MAX_MB=128', content)
                    self.assertIn('SIGNATURE_TRUST_ROOTS_DIR=/data/trust-roots', content)
                    self.assertIn('EMBED_ALLOWED_ORIGINS=', content)
                    if channel == 'local':
                        self.assertIn(f'APP_IMAGE=pige360-self:{version}', content)
                    else:
                        self.assertIn('APP_IMAGE=ghcr.io/wkarts/pige360-self:', content)
                    self.run_script('configure.py', '--channel', channel, '--env-file', env, success=False)
                    self.assertEqual(path.read_text(), content)

    def test_upgrade_preserves_secrets_and_updates_local_image(self):
        for adapter in ADAPTERS:
            with self.subTest(adapter=adapter):
                env = f'deploy/{adapter}/.env.production'
                path = self.root / env
                path.write_text('APP_IMAGE=pige360-self:0.3.0\nAPP_SECRET_KEY=KEEP\n'
                                'POSTGRES_PASSWORD=KEEP_DB\nINTEGRATION_ENCRYPTION_KEY=\n')
                self.run_script('prepare-upgrade.py', '--env-file', env)
                content = path.read_text()
                self.assertIn(f'APP_IMAGE=pige360-self:{(ROOT / "VERSION").read_text().strip()}', content)
                self.assertIn('APP_SECRET_KEY=KEEP\n', content)
                self.assertIn('POSTGRES_PASSWORD=KEEP_DB\n', content)
                self.assertIn('LEGACY_IMPORT_MAX_MB=128\n', content)
                self.assertIn('SIGNATURE_TRUST_ROOTS_DIR=/data/trust-roots\n', content)
                backups = list(path.parent.glob('.env.backup-*'))
                self.assertEqual(len(backups), 1)
                self.assertEqual(backups[0].stat().st_mode & 0o777, 0o600)
                self.assertIn('APP_IMAGE=pige360-self:0.3.0', backups[0].read_text())


if __name__ == '__main__':
    unittest.main()
