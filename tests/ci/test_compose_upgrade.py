"""Mesclagem conservadora: Docker é substituído só no teste unitário."""
import importlib.util
import json
import os
from pathlib import Path
import shutil
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

    def test_raw_models_and_candidate_validation_use_the_resolved_project(self):
        calls=[]
        def execute(args,**kwargs):
            calls.append(args)
            return self.docker(args,**kwargs)
        with patch.object(module.subprocess,'run',side_effect=execute):
            module.refresh_compose(self.root,self.path)
        self.assertNotIn('--no-interpolate',calls[0])
        self.assertNotIn('-p',calls[0])
        for command in calls[1:]:
            self.assertEqual(command[command.index('-p')+1],'school-existing')
        self.assertEqual(sum('--no-interpolate' in command for command in calls),2)

    def test_invalid_project_identity_aborts_before_writing_or_reading_baseline(self):
        for name in (None,'','UPPERCASE','../foreign'):
            with self.subTest(name=name),patch.object(module.subprocess,'run',return_value=types.SimpleNamespace(stdout=json.dumps({'name':name}))) as command:
                with self.assertRaisesRegex(ValueError,'projeto Compose'):
                    module.refresh_compose(self.root,self.path)
                self.assertEqual(command.call_count,1)
                self.assertEqual(self.target.read_text(),'ORIGINAL COMPOSE')
                self.assertFalse(list(self.target.parent.glob('compose.backup-*')))


class RealComposeIdentityTest(unittest.TestCase):
    """Only Compose config runs here; no daemon, images or installation required."""
    def test_upgrade_preserves_resolved_identity_and_generated_resources(self):
        binary=os.environ.get('PIGE_COMPOSE_BINARY')
        command=[binary] if binary else ['docker','compose']
        if not binary and not shutil.which('docker'):
            self.skipTest('Compose CLI unavailable; CI runs this with real Docker Compose.')
        original_run=subprocess.run
        def execute(args,**kwargs):
            self.assertEqual(args[:2],['docker','compose'])
            return original_run([*command,*args[2:]],**kwargs)
        environment={key:value for key,value in os.environ.items() if key not in
                     {'COMPOSE_PROJECT_NAME','COMPOSE_FILE','COMPOSE_PROFILES'}}
        cases=[('interpolated','${COMPOSE_PROJECT_NAME:-existing-school}',''),
               ('explicit','existing-school',''),('directory',None,''),
               ('env-override','${COMPOSE_PROJECT_NAME:-other-default}','COMPOSE_PROJECT_NAME=existing-env-school\n')]
        for label,name,project_line in cases:
            with self.subTest(identity=label),tempfile.TemporaryDirectory(prefix='pige-compose-identity-') as tmp:
                root=Path(tmp);path=Path('deploy/instances/synthetic/.env.production')
                target=root/path.parent/'compose.yaml';target.parent.mkdir(parents=True)
                source=root/'deploy/docker/compose.yaml';source.parent.mkdir(parents=True)
                env=root/path;env.write_text(project_line+'APP_IMAGE=private.example/school:pinned\nSMTP_PASSWORD=synthetic-keep\n')
                installed={'services':{'app':{'image':'${APP_IMAGE}',
                    'ports':['127.0.0.1:58181:8000'],'volumes':['documents:/data','./existing-files:/files'],
                    'environment':{'SMTP_PASSWORD':'${SMTP_PASSWORD}','APP_URL':'https://existing.example.test'}},
                    'custom':{'image':'private.example/custom:pinned'}},'volumes':{'documents':{}}}
                if name is not None:installed['name']=name
                target.write_text(json.dumps(installed));original=target.read_bytes();original_env=env.read_bytes()
                source.write_text(json.dumps({'name':'unexpected-new-default','services':{'app':{
                    'image':'official:latest','ports':['127.0.0.1:58080:8000'],
                    'volumes':['new-default:/data'],'environment':{'SMTP_PASSWORD':'wrong-default','NEW_OPTION':'enabled'}}},
                    'volumes':{'new-default':{}}}))
                def resolved():
                    result=original_run([*command,'--env-file',str(env),'-f',str(target),'config','--format','json'],
                        check=True,capture_output=True,text=True,env=environment)
                    return json.loads(result.stdout)
                before=resolved()
                with patch.dict(os.environ,environment,clear=True),patch.object(module.subprocess,'run',side_effect=execute):
                    module.refresh_compose(root,path)
                after=resolved()
                self.assertEqual(after['name'],before['name'])
                self.assertEqual(json.loads(target.read_text())['name'],before['name'])
                self.assertEqual(after['networks']['default']['name'],before['networks']['default']['name'])
                self.assertEqual(after['volumes']['documents']['name'],before['volumes']['documents']['name'])
                for key in ('image','ports','volumes'):
                    self.assertEqual(after['services']['app'][key],before['services']['app'][key])
                for key in ('SMTP_PASSWORD','APP_URL'):
                    self.assertEqual(after['services']['app']['environment'][key],before['services']['app']['environment'][key])
                self.assertEqual(after['services']['app']['environment']['NEW_OPTION'],'enabled')
                self.assertEqual(after['services']['custom'],before['services']['custom'])
                self.assertEqual(env.read_bytes(),original_env)
                self.assertEqual(next(target.parent.glob('compose.backup-*')).read_bytes(),original)


if __name__=='__main__':unittest.main()
