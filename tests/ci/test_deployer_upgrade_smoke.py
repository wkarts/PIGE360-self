"""The real upgrade fixture may only mutate its generated temporary project."""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('upgrade_fixture',ROOT/'scripts/ci/deployer-upgrade-smoke.py')
fixture=importlib.util.module_from_spec(spec);spec.loader.exec_module(fixture)


class UpgradeSmokeSafetyTests(unittest.TestCase):
    def test_foreign_image_is_rejected_before_creating_files_or_running_docker(self):
        with patch.object(fixture.tempfile,'mkdtemp') as directory,patch.object(fixture.subprocess,'check_output') as command:
            with self.assertRaises(ValueError):fixture.main('registry.example/foreign:image')
        directory.assert_not_called();command.assert_not_called()

    def test_failure_cleans_only_owned_project_and_copies_both_helpers(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);owned=root/'owned';owned.mkdir();sentinel=root/'existing-school-data';sentinel.write_text('preserve')
            project='pige360-ci-upgrade-'+'a'*16
            def execute(command,**kwargs):
                if '--format' in command and 'config' in command:
                    self.assertTrue((owned/'scripts/configure.py').is_file())
                    self.assertTrue((owned/'scripts/prepare-upgrade.py').is_file())
                    return json.dumps({'name':project})
                if command[:2]==['docker','ps']:return ''
                raise subprocess.CalledProcessError(19,command)
            with patch.dict(os.environ,{'COMPOSE_PROJECT_NAME':'must-not-use-existing-stack'}), \
                 patch.object(fixture.tempfile,'mkdtemp',return_value=str(owned)), \
                 patch.object(fixture.secrets,'token_hex',return_value='a'*16), \
                 patch.object(fixture.subprocess,'check_output',side_effect=execute), \
                 patch.object(fixture.subprocess,'run',return_value=subprocess.CompletedProcess([],0)) as cleanup:
                with self.assertRaises(subprocess.CalledProcessError):fixture.main('ghcr.io/wkarts/pige360-self-base-python:3.13-slim')
            command=cleanup.call_args.args[0]
            self.assertEqual(command[command.index('-p')+1],project)
            self.assertIn('down',command);self.assertNotIn('must-not-use-existing-stack',command)
            self.assertFalse(owned.exists());self.assertEqual(sentinel.read_text(),'preserve')

    def test_ci_runs_fixture_after_main_container_smoke(self):
        workflow=(ROOT/'.github/workflows/ci.yml').read_text()
        self.assertLess(workflow.index('bash scripts/ci/smoke.sh pige360-self:ci local'),workflow.index('python scripts/ci/deployer-upgrade-smoke.py "$PYTHON_BASE_IMAGE"'))


if __name__=='__main__':unittest.main()
