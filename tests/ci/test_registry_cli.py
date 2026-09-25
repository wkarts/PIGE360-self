"""Regressão da mensagem curta do Buildx; sem acesso ao registry."""
from pathlib import Path
import subprocess
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts/ci"))
import base_images

class RegistryCliTests(unittest.TestCase):
    ref = "ghcr.io/wkarts/pige360-self-base-python:base-test"

    def inspect(self, error):
        result = subprocess.CompletedProcess([], 1, "", error)
        with patch.object(base_images.subprocess, "run", return_value=result):
            return base_images.inspect(self.ref, optional=True)

    def test_exact_ref_not_found_is_absent(self):
        self.assertIsNone(self.inspect("ERROR: " + self.ref + ": not found\n"))

    def test_exact_production_hash_with_502_is_absent(self):
        # Hash real da falha 36195390772; 502 aqui NÃO é status HTTP.
        self.ref = ("ghcr.io/wkarts/pige360-self-base-python:base-"
                    "1721929d401f487e4ab46515026c8d6d2dae82b0c6d455f2712d6425e28d9e6b")
        self.assertIsNone(self.inspect("ERROR: " + self.ref + ": not found\n"))

    def test_http_digits_inside_hashes_are_not_errors(self):
        for code in ("401", "403", "408", "429", "500", "502", "503", "504"):
            with self.subTest(code=code):
                self.ref = "ghcr.io/wkarts/pige360-self-base-python:base-" + "a"*30 + code + "b"*31
                self.assertIsNone(self.inspect("ERROR: " + self.ref + ": not found\n"))

    def test_real_http_failure_is_not_absence(self):
        for status in ("401 Unauthorized", "403 Forbidden", "408 Request Timeout",
                       "429 Too Many Requests", "500 Internal Server Error",
                       "502 Bad Gateway", "503 Service Unavailable", "504 Gateway Timeout"):
            with self.subTest(status=status):
                with self.assertRaises(RuntimeError):
                    self.inspect("ERROR: " + self.ref + ": not found\nHTTP/1.1 " + status + "\n")

    def test_network_and_rate_limit_fail_closed(self):
        for diagnostic in ("rate limit exceeded", "toomanyrequests", "connection refused",
                           "connection reset", "TLS handshake error", "no such host",
                           "temporary failure", "i/o timeout", "timed out"):
            with self.subTest(diagnostic=diagnostic):
                with self.assertRaises(RuntimeError):
                    self.inspect("ERROR: " + self.ref + ": not found\n" + diagnostic)

    def test_required_manifest_still_raises_on_missing(self):
        result = subprocess.CompletedProcess([], 1, "", "ERROR: " + self.ref + ": not found\n")
        with patch.object(base_images.subprocess, "run", return_value=result):
            with self.assertRaises(RuntimeError):
                base_images.inspect(self.ref, optional=False)

    def test_other_path_not_found_is_not_absent(self):
        with self.assertRaises(RuntimeError):
            self.inspect("ERROR: /home/runner/config: not found\n")

    def test_short_error_with_auth_failure_is_not_absent(self):
        with self.assertRaises(RuntimeError):
            self.inspect("ERROR: " + self.ref + ": not found\nunauthorized\n")


class MissingBaseBuildTests(unittest.TestCase):
    def test_real_missing_hash_builds_once_then_reuses(self):
        """Exercita ensure + inspect reais; só substitui a CLI externa."""
        import io
        import json
        from contextlib import redirect_stdout
        fingerprint = '1721929d401f487e4ab46515026c8d6d2dae82b0c6d455f2712d6425e28d9e6b'
        image = 'ghcr.io/wkarts/pige360-self-base-python'
        upstream = 'docker.io/library/python:3.13-slim'
        immutable, alias = image + ':base-' + fingerprint, image + ':3.13-slim'
        old, new = 'sha256:' + 'a' * 64, 'sha256:' + 'b' * 64
        state = {'built': False, 'alias': old, 'builds': 0}
        spec = dict(id='python', package='pige360-self-base-python', upstream=upstream,
                    security_revision=1, dockerfile='Dockerfile', inputs=[], aliases=['3.13-slim'])
        def cli(args, **kwargs):
            if args[:3] == ['docker', 'buildx', 'build']:
                state.update(built=True, builds=state['builds'] + 1)
                self.assertIn(immutable, args)
                return subprocess.CompletedProcess(args, 0, '', '')
            self.assertEqual(args[:4], ['docker', 'buildx', 'imagetools', 'inspect'])
            ref = args[4]
            if ref == immutable and not state['built']:
                return subprocess.CompletedProcess(args, 1, '', f'ERROR: {ref}: not found\n')
            if args[-1] == '{{json .Image}}':
                payload = {'config': {'Labels': {
                    base_images.LABEL + 'upstream.tag': upstream,
                    base_images.LABEL + 'upstream.resolved': upstream + '@' + old,
                }}}
            else:
                payload = {'digest': new if ref == immutable else state['alias']}
            return subprocess.CompletedProcess(args, 0, json.dumps(payload), '')
        def retag(*args):
            self.assertEqual(args[-1], image + '@' + new)
            state['alias'] = new
        with patch.dict('os.environ', {'GITHUB_REPOSITORY': 'wkarts/PIGE360-self'}), \
             patch.object(base_images, 'fingerprint', return_value=fingerprint), \
             patch.object(base_images.subprocess, 'run', side_effect=cli), \
             patch.object(base_images, 'run', side_effect=retag), redirect_stdout(io.StringIO()):
            first = base_images.ensure(spec, 'wkarts', 'linux/amd64', False)
            second = base_images.ensure(spec, 'wkarts', 'linux/amd64', False)
        self.assertEqual(state['builds'], 1)
        self.assertEqual(first['status'], 'missing-or-inputs-changed')
        self.assertEqual(second['status'], 'reused')
        self.assertEqual(first['digest'], second['digest'])

if __name__ == "__main__":
    unittest.main()
