import importlib.util
import subprocess
import tempfile
import unittest
from pathlib import Path

tool = Path(__file__).resolve().parents[2] / 'scripts/qa/finance_contracts.py'
spec = importlib.util.spec_from_file_location('finance_contracts', tool)
finance = importlib.util.module_from_spec(spec)
spec.loader.exec_module(finance)


class FinanceContractsTest(unittest.TestCase):
    def test_only_confirmed_paths_and_official_origin(self):
        with tempfile.TemporaryDirectory() as directory:
            repo = Path(directory)
            def git(*args):
                return subprocess.check_output(['git', '-C', directory, *args], text=True).strip()
            git('init', '-q')
            git('remote', 'add', 'origin', 'https://github.com/' + finance.OFFICIAL)
            routes = repo / finance.ROUTES
            routes.parent.mkdir(parents=True)
            routes.write_text("$route['pige_bridge/api/v1/requests'] = 'bridge/requests';\n")
            fixture = repo / finance.FIXTURE
            fixture.parent.mkdir(parents=True)
            fixture.write_bytes(finance.LOCAL_FIXTURE.read_bytes())
            git('add', '.')
            git('-c', 'user.name=Teste', '-c', 'user.email=teste@example.test', 'commit', '-qm', 'fixture')
            sha = git('rev-parse', 'HEAD')
            result = finance.inspect(repo, sha)
            pending = result['rotas_pendentes_de_comprovacao']
            self.assertEqual(pending['recepcao_v1'], [])
            self.assertTrue(pending['diagnostico_v1'] and pending['fatura_v2'] and pending['cobranca_v3'])
            self.assertTrue(result['fixture_v1_igual'])
            self.assertFalse(result['homologado_em_sandbox'])
            git('remote', 'set-url', 'origin', 'https://github.com/wkarts/ARGWS-CRM')
            with self.assertRaises(ValueError):
                finance.inspect(repo, sha)
