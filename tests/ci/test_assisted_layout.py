"""Contratos estáticos do quinto serviço; não substituem smoke Docker/HTTP."""
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]

class AssistedLayoutTests(unittest.TestCase):
    def test_every_compose_isolates_the_ocr_consumer(self):
        for name in ['docker','dockge','portainer','cloudpanel']:
            text=(ROOT/'deploy'/name/'compose.yaml').read_text()
            self.assertEqual(text.count('  worker-ocr:'),1,name)
            worker=text.split('  worker-ocr:',1)[1]
            self.assertIn('command: ["worker-ocr"]',worker)
            self.assertIn('environment: *application_environment',worker)
            self.assertNotIn('ports:',worker)
            self.assertIn('app.ocr_worker',worker)
            self.assertIn('cap_drop: ["ALL"]',worker)
            self.assertIn('mem_limit:',worker)
            self.assertIn('cpus:',worker)
    def test_smoke_validates_new_service_and_the_real_driver(self):
        script=(ROOT/'scripts/ci/smoke.sh').read_text()
        self.assertIn('for service in db storage-init app worker worker-ocr;',script)
        self.assertIn('compose exec -T worker-ocr',script)
        self.assertIn("'app.ocr_engine'",script)
    def test_previous_browser_suites_and_new_suite_are_required(self):
        text=(ROOT/'.github/workflows/ci.yml').read_text()
        for script in ['e2e.py','e2e-online.py','e2e-cadastres.py','e2e-workspace.py','e2e-whitelabel.py','e2e-access.py','e2e-assisted.py']:
            self.assertIn('python scripts/'+script,text)
        self.assertNotIn('continue-on-error:',text)
    def test_the_motor_is_packaged_in_the_base(self):
        text=(ROOT/'containers/base-python.Dockerfile').read_text()
        for dep in ['tesseract-ocr','tesseract-ocr-por','poppler-utils']:
            self.assertIn(dep,text)

if __name__=='__main__':unittest.main()
