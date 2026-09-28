"""O smoke de imagem não pode apagar arquivos de uma instalação local."""
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[2]


class SmokeIsolationTests(unittest.TestCase):
    def test_failed_pull_preserves_existing_deployment_data(self):
        with tempfile.TemporaryDirectory(prefix='pige360-smoke-test-') as tmp:
            directory = Path(tmp)
            checkout = directory / 'checkout'
            (checkout / 'scripts' / 'ci').mkdir(parents=True)
            deployment = checkout / 'deploy' / 'docker'
            deployment.mkdir(parents=True)
            shutil.copy2(ROOT / 'scripts/ci/smoke.sh', checkout / 'scripts/ci/smoke.sh')
            shutil.copy2(ROOT / 'deploy/docker/compose.yaml', deployment / 'compose.yaml')
            for name in ('data-postgres', 'data-documents'):
                folder = deployment / name
                folder.mkdir()
                (folder / 'preserve-me').write_bytes(b'existing installation')

            binaries = directory / 'bin'
            binaries.mkdir()
            docker = binaries / 'docker'
            docker.write_text('#!/bin/sh\nexit 69\n')
            docker.chmod(0o755)
            isolated_tmp = directory / 'tmp'
            isolated_tmp.mkdir()
            environment = dict(os.environ, PATH=str(binaries) + os.pathsep + os.environ['PATH'], TMPDIR=str(isolated_tmp))
            result = subprocess.run(
                ['bash', str(checkout / 'scripts/ci/smoke.sh'), 'example.invalid/image:ci', 'remote'],
                cwd=checkout, env=environment, text=True, capture_output=True, timeout=30,
            )
            self.assertNotEqual(result.returncode, 0, result.stdout)
            for name in ('data-postgres', 'data-documents'):
                self.assertEqual((deployment / name / 'preserve-me').read_bytes(), b'existing installation')
            self.assertEqual(list(isolated_tmp.iterdir()), [], 'Diretório temporário do smoke não foi limpo')


if __name__ == '__main__':
    unittest.main()
