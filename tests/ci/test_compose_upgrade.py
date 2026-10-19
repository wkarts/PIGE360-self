"""Mesclagem conservadora: Docker é substituído só no teste unitário."""
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import types
import unittest
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('compose_upgrade',ROOT/'scripts/prepare-upgrade.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)


class ComposeUpgradeTest(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name)
        self.path=Path('deploy/instances/synthetic/.env.production')
        (self.root/self.path).parent.mkdir(parents=True)
        (self.root/self.path).write_text('SMTP_PASSWORD=synthetic-secret-to-preserve\n')
        self.target=(self.root/self.path).parent/'compose.yaml';self.target.write_text('ORIGINAL COMPOSE')
        (self.root/'deploy/docker').mkdir(parents=True)
        (self.root/'deploy/docker/compose.yaml').write_text('BASELINE')
        self.current={'name':'school-existing','services':{'app':{'image':'private.example/app:pinned',
            'ports':['127.0.0.1:58181:8000'],'volumes':['./old-documents:/data'],
            'environment':{'SMTP_PASSWORD':'synthetic-secret-to-preserve','APP_URL':'https://existing.example.test'}},
            'custom':{'image':'custom:keep'}}}
        self.baseline={'name':'new-default','services':{'app':{'image':'official:latest',
            'ports':['127.0.0.1:58080:8000'],'volumes':['./data-documents:/data'],
            'environment':{'SMTP_PASSWORD':'${SMTP_PASSWORD:-}','NEW_OPTION':'enabled'}},
            'website':{'profiles':['website'],'build':{'context':'../../services/website'}}}}

    def docker(self,args,**kwargs):
        if '--quiet' in args:return types.SimpleNamespace(stdout='',returncode=0)
        path=Path(args[args.index('-f')+1])
        return types.SimpleNamespace(stdout=json.dumps(self.current if path==self.target else self.baseline),returncode=0)

    def test_preview_never_writes_or_displays_secret_values(self):
        with patch.object(module.subprocess,'run',side_effect=self.docker):result=module.refresh_compose(self.root,self.path,preview=True)
        self.assertEqual(result['services_added'],['website'])
        self.assertNotIn('synthetic-secret',json.dumps(result))
        self.assertEqual(self.target.read_text(),'ORIGINAL COMPOSE')
        self.assertFalse(list(self.target.parent.glob('compose.backup-*')))

    def test_merge_preserves_identity_ports_volumes_custom_services_and_secret(self):
        with patch.object(module.subprocess,'run',side_effect=self.docker):module.refresh_compose(self.root,self.path)
        result=json.loads(self.target.read_text())
        self.assertEqual(result['name'],'school-existing')
        for key in ('image','ports','volumes'):self.assertEqual(result['services']['app'][key],self.current['services']['app'][key])
        self.assertEqual(result['services']['custom'],self.current['services']['custom'])
        self.assertEqual(result['services']['app']['environment']['SMTP_PASSWORD'],'synthetic-secret-to-preserve')
        self.assertEqual(result['services']['app']['environment']['NEW_OPTION'],'enabled')
        self.assertEqual(result['services']['website']['build']['context'],'../../../services/website')
        self.assertEqual(result['services']['website']['profiles'],['website'])
        backups=list(self.target.parent.glob('compose.backup-*'))
        self.assertEqual(len(backups),1);self.assertEqual(backups[0].read_text(),'ORIGINAL COMPOSE')
        self.assertEqual(self.target.stat().st_mode&0o777,0o600)

    def test_failed_validation_preserves_original_and_removes_temporary_candidate(self):
        def fail(args,**kwargs):
            if '--quiet' in args:raise subprocess.CalledProcessError(1,args)
            return self.docker(args,**kwargs)
        with patch.object(module.subprocess,'run',side_effect=fail),self.assertRaises(subprocess.CalledProcessError):
            module.refresh_compose(self.root,self.path)
        self.assertEqual(self.target.read_text(),'ORIGINAL COMPOSE')
        self.assertFalse(list(self.target.parent.glob('.compose-upgrade-*')))


if __name__=='__main__':unittest.main()
