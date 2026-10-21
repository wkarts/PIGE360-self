import contextlib
import io
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts/ci'))
import promotion_auth as auth
import auto_promotion as auto


class PromotionAuthTests(unittest.TestCase):
    def test_absent_credentials_preserve_legacy(self):
        self.assertEqual(auth.select_mode('', ''), 'legacy')

    def test_complete_credentials_select_app(self):
        self.assertEqual(auth.select_mode('client-test', 'synthetic-key'), 'app')

    def test_partial_and_whitespace_configuration_fail_without_echo(self):
        for client, key in [('client-test', ''), ('', 'synthetic-key'), (' ', 'key'), ('id', ' '), (' ', '')]:
            with self.subTest(client=client), self.assertRaisesRegex(RuntimeError, 'Sem fallback') as error:
                auth.select_mode(client, key)
            self.assertNotIn('synthetic-key', str(error.exception))

    def test_outputs_and_summary_never_include_credentials(self):
        for mode, client, key in [('legacy', '', ''), ('app', 'synthetic-client', 'synthetic-key')]:
            with self.subTest(mode=mode), tempfile.TemporaryDirectory() as directory:
                output, summary = Path(directory) / 'output', Path(directory) / 'summary'
                stdout = io.StringIO()
                with patch.dict(os.environ, {'PROMOTION_APP_CLIENT_ID': client,
                    'PROMOTION_APP_PRIVATE_KEY': key, 'GITHUB_OUTPUT': str(output),
                    'GITHUB_STEP_SUMMARY': str(summary)}, clear=True), contextlib.redirect_stdout(stdout):
                    auth.main()
                self.assertEqual(output.read_text(), f'mode={mode}\n')
                content = output.read_text() + summary.read_text() + stdout.getvalue()
                self.assertNotIn('synthetic-key', content)
                self.assertNotIn('synthetic-client', content)
                self.assertEqual('::warning::' in stdout.getvalue(), mode == 'legacy')

    def test_missing_app_token_fails_closed(self):
        with patch.dict(os.environ, {'GITHUB_REPOSITORY': auto.REPOSITORY, 'GH_TOKEN': ''}, clear=True):
            with self.assertRaisesRegex(RuntimeError, 'sem fallback'):
                auto.GitHub()

    def test_workflow_scope_and_failure_contract(self):
        text = (ROOT / '.github/workflows/promote-develop.yml').read_text()
        prepare, remainder = text.split('  tests:', 1)
        self.assertIn("github.repository == 'wkarts/PIGE360-self'", prepare)
        self.assertIn("github.ref == 'refs/heads/develop'", prepare)
        self.assertIn("github.event_name == 'push' || github.event_name == 'workflow_dispatch'", prepare)
        self.assertIn('ref: ${{ github.sha }}', prepare)
        self.assertIn('persist-credentials: false', prepare)
        self.assertIn('actions/create-github-app-token@64ab729a6294000f5aa4a4bc0b73d1f32bc45510', prepare)
        self.assertIn("if: steps.auth.outputs.mode == 'app'", prepare)
        self.assertIn('owner: wkarts\n          repositories: PIGE360-self', prepare)
        self.assertIn('permission-contents: read\n          permission-pull-requests: write', prepare)
        self.assertNotIn('skip-token-revoke:', text)
        self.assertNotIn('continue-on-error:', text)
        self.assertIn("steps.auth.outputs.mode == 'legacy' && secrets.GITHUB_TOKEN || steps.app-token.outputs.token", prepare)
        self.assertNotIn('app-token', remainder)
        self.assertNotIn('promotion_app_private_key', remainder)
        self.assertNotIn('PROMOTION_APP', remainder)
        self.assertNotIn('token', prepare.split('    outputs:', 1)[1].split('    steps:', 1)[0])
        self.assertIn('GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}', remainder)
        self.assertNotIn('secrets: inherit', text)

    def test_only_develop_passes_named_secret_to_prepare_workflow(self):
        workflows = ROOT / '.github/workflows'
        text = (workflows / 'develop-image.yml').read_text()
        before, promote = text.split('  promote:', 1)
        self.assertNotIn('PROMOTION_APP', before)
        self.assertIn('needs: [version, bases, tests, publish]', promote)
        self.assertIn('promotion_app_private_key: ${{ secrets.PROMOTION_APP_PRIVATE_KEY }}', promote)
        for file in workflows.glob('*.yml'):
            if file.name not in ('develop-image.yml', 'promote-develop.yml'):
                self.assertNotIn('PROMOTION_APP', file.read_text())
                self.assertNotIn('promotion_app_private_key', file.read_text())
        pr = (workflows / 'pr-validation.yml').read_text()
        self.assertIn('branches: [develop, main]', pr)
        self.assertIn('uses: ./.github/workflows/ci.yml', pr)


if __name__ == '__main__':
    unittest.main()
