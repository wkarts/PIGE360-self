"""Exercise the shared shell helper without Docker; real image runs in PR CI."""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / 'scripts/ci/website-isolated-smoke.sh'


class WebsiteIsolatedSmokeTests(unittest.TestCase):
    def run_smoke(self, ready='503', transport='0', live='200'):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            docker = root / 'docker'
            docker.write_text('''#!/bin/bash
printf '%s\\n' "$*" >> "$CALLS"
if [[ "$1" == run ]]; then echo synthetic-container; fi
''')
            curl = root / 'curl'
            curl.write_text('''#!/bin/bash
printf '%s\\n' "$*" >> "$CALLS"
if [[ "${@: -1}" == */health/live ]]; then printf '%s' "$LIVE"; exit 0; fi
printf '%s' "$READY"
exit "$TRANSPORT"
''')
            docker.chmod(0o755)
            curl.chmod(0o755)
            calls = root / 'calls'
            env = {**os.environ, 'PATH': str(root) + ':' + os.environ['PATH'],
                   'CALLS': str(calls), 'READY': ready, 'TRANSPORT': transport, 'LIVE': live}
            result = subprocess.run(['bash', str(SCRIPT), 'synthetic-image@sha256:test'],
                                    env=env, capture_output=True, text=True)
            return result, calls.read_text()

    def test_live_and_not_ready_without_upstream(self):
        result, calls = self.run_smoke()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('-e PIGE_INTERNAL_URL=http://127.0.0.1:1', calls)
        self.assertIn('synthetic-image@sha256:test', calls)
        self.assertIn('logs synthetic-container', calls)
        self.assertIn('rm -f synthetic-container', calls)

    def test_unexpected_readiness_never_passes_and_cleans_up(self):
        for status in ('200', '404', '500', '000'):
            with self.subTest(status=status):
                result, calls = self.run_smoke(ready=status)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn('rm -f synthetic-container', calls)

    def test_transport_failure_is_not_accepted_as_unready(self):
        result, calls = self.run_smoke(transport='7')
        self.assertEqual(result.returncode, 7)
        self.assertIn('rm -f synthetic-container', calls)

    def test_liveness_must_be_exactly_200(self):
        result, calls = self.run_smoke(live='204')
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn('/health/ready', calls)
        self.assertIn('rm -f synthetic-container', calls)

    def test_pr_and_publisher_share_contract_and_keep_integrated_gate(self):
        helper = 'bash scripts/ci/website-isolated-smoke.sh'
        ci = (ROOT / '.github/workflows/ci.yml').read_text()
        publisher = (ROOT / '.github/workflows/publish-image.yml').read_text()
        self.assertIn(helper + ' pige360-website:ci', ci)
        self.assertIn(helper + ' "$WEBSITE_IMAGE"', publisher)
        self.assertLess(publisher.index(helper), publisher.index('bash scripts/ci/smoke.sh'))
        self.assertLess(publisher.index('bash scripts/ci/smoke.sh'), publisher.index('python scripts/ci/promote.py develop'))
        self.assertNotIn('continue-on-error:', publisher)
        stack = (ROOT / 'scripts/ci/smoke.sh').read_text()
        self.assertIn('python scripts/ci/surfaces-smoke.py', stack)
        surfaces = (ROOT / 'scripts/ci/surfaces-smoke.py').read_text()
        self.assertIn("for path in ('/health/live','/health/ready'):", surfaces)
        self.assertIn('assert response.status_code==200', surfaces)
