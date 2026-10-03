"""Checks the deployment configurators against each adapter's real examples."""
from pathlib import Path
import shutil
import importlib.util
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
        shutil.copy(ROOT / 'scripts' / 'deployer.py', self.root / 'scripts' / 'deployer.py')
        for adapter in ADAPTERS:
            target = self.root / 'deploy' / adapter
            target.mkdir(parents=True)
            for source in (ROOT / 'deploy' / adapter).glob('.env*.example'):
                shutil.copy(source, target / source.name)
            shutil.copy(ROOT / 'deploy' / adapter / 'compose.yaml', target / 'compose.yaml')

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
                        self.assertIn('COMPOSE_PROFILES=s3,infra', content)
                        self.assertIn('STORAGE_BACKEND=s3', content)
                        self.assertIn('STORAGE_ENDPOINT_URL=http://minio:9000', content)
                        self.assertRegex(content, r'REDIS_PASSWORD=[A-Za-z0-9_-]{30,}')
                        self.assertRegex(content, r'RABBITMQ_PASSWORD=[A-Za-z0-9_-]{30,}')
                        self.assertRegex(content, r'STORAGE_SECRET_KEY=[A-Za-z0-9_-]{30,}')
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
                self.assertIn('COMPOSE_PROFILES=\n', content)
                backups = list(path.parent.glob('.env.backup-*'))
                self.assertEqual(len(backups), 1)
                self.assertEqual(backups[0].stat().st_mode & 0o777, 0o600)
                self.assertIn('APP_IMAGE=pige360-self:0.3.0', backups[0].read_text())

    def test_visual_deployer_creates_isolated_stack_and_preserves_existing_one(self):
        spec = importlib.util.spec_from_file_location('deployer', self.root / 'scripts' / 'deployer.py')
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        path = module.create(self.root, 'escola-dev', 'develop', 'https://dev.exemplo.com.br', '58081')
        self.assertEqual(path, 'deploy/instances/escola-dev/.env.develop')
        env = (self.root / path).read_text()
        self.assertIn('COMPOSE_PROJECT_NAME=pige360-escola-dev\n', env)
        self.assertIn('STORAGE_BACKEND=s3\n', env)
        compose = (self.root / 'deploy/instances/escola-dev/compose.yaml').read_text()
        self.assertIn('context: ../../../services/sogo', compose)
        self.assertIn('minio:', compose)
        with self.assertRaises(FileExistsError):
            module.create(self.root, 'escola-dev', 'stable', 'https://outra.exemplo.com.br', '58082')
        self.assertEqual((self.root / path).read_text(), env)
        self.assertIn(path, module.stacks(self.root))

    def test_upgrade_tracks_only_official_channel_images(self):
        path = self.root / 'deploy/docker/.env.develop'
        path.write_text('APP_IMAGE=ghcr.io/wkarts/pige360-self:legacy\n'
                        'MAIL_AGENT_IMAGE=ghcr.io/wkarts/pige360-self-mail-agent:old\n'
                        'SOGO_IMAGE=registry.example.org/custom-sogo:kept\n'
                        'POSTGRES_PASSWORD=KEEP\nAPP_SECRET_KEY=KEEP\n'
                        'INTEGRATION_ENCRYPTION_KEY=\n')
        self.run_script('prepare-upgrade.py', '--env-file', 'deploy/docker/.env.develop', '--track-channel')
        content = path.read_text()
        self.assertIn('APP_IMAGE=ghcr.io/wkarts/pige360-self:develop\n', content)
        self.assertIn('MAIL_AGENT_IMAGE=ghcr.io/wkarts/pige360-self-mail-agent:develop\n', content)
        self.assertIn('SOGO_IMAGE=registry.example.org/custom-sogo:kept\n', content)
        self.assertIn('POSTGRES_PASSWORD=KEEP\n', content)

    def test_sogo_apache_template_keeps_trusted_proxy_headers(self):
        spec = importlib.util.spec_from_file_location('configure_apache', ROOT / 'services/sogo/configure_apache.py')
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        apache = self.root / 'apache'
        apache.mkdir()
        config = apache / 'SOGo.conf'
        config.write_text('''ProxyPass /SOGo http://127.0.0.1:20000/SOGo
RequestHeader set "x-webobjects-server-port" "443"
RequestHeader set "x-webobjects-server-name" "%{HTTP_HOST}e" env=HTTP_HOST
RequestHeader set "x-webobjects-server-url" "https://%{HTTP_HOST}e" env=HTTP_HOST
RequestHeader unset "x-webobjects-remote-user"
RequestHeader set "x-webobjects-server-protocol" "HTTP/1.0"
''')
        module.configure(apache)
        self.assertIn('ProxyPass /SOGo ', config.read_text())
        self.assertNotIn('RequestHeader unset "x-webobjects-remote-user"', config.read_text())
        self.assertNotIn('RequestHeader set "x-webobjects-server-url"', config.read_text())
        with self.assertRaises(SystemExit):
            module.configure(apache)


if __name__ == '__main__':
    unittest.main()
