import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import threading
import time
import unittest
from unittest.mock import patch
import uuid

ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('deployer_recovery',ROOT/'scripts/deployer.py')
deployer=importlib.util.module_from_spec(spec);spec.loader.exec_module(deployer)


class DeployerRecoveryTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup);self.root=Path(self.temp.name)
        directory=self.root/'deploy/docker';directory.mkdir(parents=True)
        (directory/'compose.yaml').write_text('services: {}')
        self.env=directory/'.env.production';self.path='deploy/docker/.env.production'
        self.env.write_text('COMPOSE_PROJECT_NAME=school-original\nAPP_PORT=58181\nAPP_URL=https://manager.example.test\nAPP_IMAGE=ghcr.io/wkarts/pige360-self:latest\nSMTP_PASSWORD=preserve-smtp\nCONNECT_API_KEY=preserve-whatsapp\nSTORAGE_BACKEND=s3\nCOMPOSE_PROFILES=s3,infra\n')

    def test_surfaces_preserve_project_secrets_and_existing_profiles(self):
        original=self.env.read_text()
        with patch.object(deployer.subprocess,'run',return_value=subprocess.CompletedProcess([],0)):
            deployer.configure_surfaces(self.root,self.path,'https://school.example.test','48182','https://portal.example.test','48183',True,True)
        result=self.env.read_text()
        for line in original.splitlines():
            if not line.startswith('COMPOSE_PROFILES='):self.assertIn(line+'\n',result)
        self.assertIn('COMPOSE_PROFILES=infra,portal,s3,website',result)
        self.assertTrue(list(self.env.parent.glob('.env.backup-*')))

    def test_bad_ports_or_origins_leave_existing_configuration_unchanged(self):
        original=self.env.read_bytes()
        for url,port in [('http://public.example.test','48183'),('https://portal.example.test/path','48183'),('https://portal.example.test','58181')]:
            with self.assertRaises(ValueError):deployer.configure_surfaces(self.root,self.path,'https://school.example.test','48182',url,port,True,True)
            self.assertEqual(self.env.read_bytes(),original)

    def test_invalid_configuration_does_not_replace_env(self):
        original=self.env.read_bytes()
        with patch.object(deployer.subprocess,'run',side_effect=subprocess.CalledProcessError(1,['docker'])):
            with self.assertRaises(subprocess.CalledProcessError):deployer.configure_surfaces(self.root,self.path,'https://school.example.test','48182','https://portal.example.test','48183',True,True)
        self.assertEqual(self.env.read_bytes(),original)

    def test_cancelled_confirmation_does_not_stop_services(self):
        ident=str(uuid.uuid4());plan={'id':ident,'status':'prepared','expires_at':'2999-01-01','confirmation':'RESTAURAR '+ident[:8]}
        with patch.object(deployer,'restore_plans',return_value=[plan]),patch.object(deployer.subprocess,'run') as command:
            with self.assertRaises(ValueError):deployer.start_restore(self.root,self.path,ident,'CANCELAR')
            command.assert_not_called()

    def test_critical_restore_failure_keeps_writers_stopped_and_records_failure(self):
        ident=str(uuid.uuid4());plan={'id':ident,'status':'prepared','expires_at':'2999-01-01','confirmation':'RESTAURAR '+ident[:8]};commands=[];finished=threading.Event()
        def execute(command,**kwargs):
            commands.append(command)
            if 'execute' in command:raise subprocess.CalledProcessError(1,command)
            if 'stop' in command and len([c for c in commands if 'stop' in c])>1:finished.set()
            return subprocess.CompletedProcess(command,0,json.dumps({'services':{'db':{},'minio':{},'storage-init':{},'app':{},'worker':{},'portal':{}}}) if '--format' in command else '')
        with patch.object(deployer,'restore_plans',return_value=[plan]),patch.object(deployer.subprocess,'run',side_effect=execute):
            deployer.start_restore(self.root,self.path,ident,plan['confirmation']);self.assertTrue(finished.wait(3))
        rows=deployer.restore_history(self.root,self.path);self.assertEqual(rows[0]['status'],'failed')
        self.assertFalse(any('up' in command for command in commands))
        stopped=next(c for c in commands if 'stop' in c);self.assertIn('app',stopped);self.assertIn('portal',stopped);self.assertNotIn('minio',stopped)


if __name__=='__main__':unittest.main()
