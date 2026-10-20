"""O publisher precisa de runtime próprio: jobs de testes não compartilham pacotes."""
import ast
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[2]
ACTION = './.github/actions/setup-smoke'


class PublicationSmokeRuntimeTests(unittest.TestCase):
    def test_publisher_prepares_runtime_before_build_and_retains_promotion_gate(self):
        workflow = (ROOT / '.github/workflows/publish-image.yml').read_text()
        self.assertLess(workflow.index('actions/checkout@'), workflow.index(ACTION))
        self.assertLess(workflow.index(ACTION), workflow.index('id: build\n'))
        self.assertLess(workflow.index('bash scripts/ci/smoke.sh'), workflow.index('python scripts/ci/promote.py develop'))
        self.assertIn('if: inputs.channel == \'develop\'', workflow)
        self.assertNotIn('continue-on-error:', workflow)

    def test_clean_ci_job_uses_publisher_runtime_without_backend_dependencies(self):
        workflow = (ROOT / '.github/workflows/ci.yml').read_text()
        job = workflow.split('  publication_smoke_runtime:\n', 1)[1].split('  deployer_binary:\n', 1)[0]
        self.assertIn('runs-on: ubuntu-latest', job)
        self.assertIn('ref: ${{ inputs.ref || github.sha }}', job)
        self.assertIn(ACTION, job)
        self.assertNotIn('requirements-dev', job)
        self.assertNotIn('continue-on-error:', job)

    def test_shared_pinned_dependencies_cover_smoke_imports_and_browser_launch(self):
        requirements = (ROOT / 'scripts/ci/requirements-smoke.txt').read_text()
        dependencies = {line.split('==')[0] for line in requirements.splitlines() if line and not line.startswith('#')}
        imports = ast.parse((ROOT / 'scripts/ci/surfaces-smoke.py').read_text())
        third_party = set()
        for node in ast.walk(imports):
            if isinstance(node, ast.Import):
                third_party.update(alias.name.split('.')[0] for alias in node.names if alias.name.split('.')[0] in ('httpx', 'playwright'))
            elif isinstance(node, ast.ImportFrom) and node.module:
                name = node.module.split('.')[0]
                if name in ('httpx', 'playwright'):
                    third_party.add(name)
        self.assertEqual(dependencies, third_party)
        for dependency in dependencies:
            self.assertRegex(requirements, rf'{dependency}==\d+\.\d+\.\d+')
        self.assertIn('-r ../scripts/ci/requirements-smoke.txt', (ROOT / 'backend/requirements-dev.txt').read_text())
        action = (ROOT / '.github/actions/setup-smoke/action.yml').read_text()
        self.assertIn("python-version: '3.13'", action)
        install = action.index('python -m pip install -r scripts/ci/requirements-smoke.txt')
        browser = action.index('python -m playwright install --with-deps chromium')
        launch = action.index('playwright.chromium.launch(headless=True)')
        self.assertLess(install, browser)
        self.assertLess(browser, launch)
        self.assertIn('import httpx', action)
        self.assertNotIn('continue-on-error:', action)


if __name__ == '__main__':
    unittest.main()
