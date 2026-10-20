"""Shared maintenance lock and exact loopback Origin, without a Docker daemon."""
import http.cookiejar
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import socket
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from unittest.mock import patch
import urllib.error
import urllib.parse
import urllib.request
import uuid

ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('deployer_coordination',ROOT/'scripts/deployer.py')
deployer=importlib.util.module_from_spec(spec);spec.loader.exec_module(deployer)


class StackCoordinationTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name);directory=self.root/'deploy/docker';directory.mkdir(parents=True)
        self.path='deploy/docker/.env.production'
        (directory/'.env.production').write_text('APP_PORT=58181\nSMTP_PASSWORD=synthetic-preserved\n')
        (directory/'compose.yaml').write_text('name: existing-school\nservices: {}\n')

    def row(self,status,created='2026-01-01T00:00:00Z'):
        directory=deployer.restore_state_dir(self.root,self.path,'existing-school')
        row={'id':str(uuid.uuid4()),'status':status,'created_at':created,'error_code':''}
        (directory/(row['id']+'.json')).write_text(json.dumps(row))
        return directory,row

    def docker(self,command,**kwargs):
        return subprocess.CompletedProcess(command,0,json.dumps({'name':'existing-school','services':{'app':{},'worker':{},'db':{},'minio':{}}}))

    def test_deploy_pins_resolved_identity_before_helper_changes_environment(self):
        calls=[]
        def execute(command,**kwargs):
            calls.append(command)
            if 'prepare-upgrade.py' in ' '.join(command):
                with (self.root/self.path).open('a') as f:f.write('COMPOSE_PROJECT_NAME=unexpected-other-project\n')
            return self.docker(command,**kwargs)
        with patch.object(deployer.shutil,'which',return_value='/usr/bin/docker'),patch.object(deployer.subprocess,'run',side_effect=execute):
            deployer.deploy(self.root,self.path)
        mutations=[c for c in calls if 'pull' in c or 'up' in c]
        self.assertEqual(len(mutations),2)
        for command in mutations:self.assertEqual(command[command.index('-p')+1],'existing-school')

    def test_failed_or_abandoned_restore_blocks_deploy_and_surface_configuration(self):
        for status in ('failed','interrupted','processing'):
            with self.subTest(status=status):
                directory,row=self.row(status)
                original=(self.root/self.path).read_bytes()
                with patch.object(deployer.shutil,'which',return_value='/usr/bin/docker'),patch.object(deployer.subprocess,'run',side_effect=self.docker) as command:
                    with self.assertRaisesRegex(ValueError,'restauração verificada'):deployer.deploy(self.root,self.path)
                    with self.assertRaisesRegex(ValueError,'restauração verificada'):
                        deployer.configure_surfaces(self.root,self.path,'https://site.example.test','58182','https://portal.example.test','58183',True,True)
                self.assertFalse(any('up' in c.args[0] or 'pull' in c.args[0] for c in command.call_args_list))
                self.assertEqual((self.root/self.path).read_bytes(),original)
                if status=='processing':self.assertEqual(json.loads((directory/(row['id']+'.json')).read_text())['status'],'interrupted')
                for path in directory.glob('*.json'):path.unlink()

    def test_later_completed_recovery_allows_update(self):
        self.row('failed');self.row('completed','2026-01-02T00:00:00Z')
        with patch.object(deployer.shutil,'which',return_value='/usr/bin/docker'),patch.object(deployer.subprocess,'run',side_effect=self.docker) as command:
            deployer.deploy(self.root,self.path)
        self.assertTrue(any('up' in c.args[0] for c in command.call_args_list))

    def test_legacy_fallback_maintenance_journal_is_not_lost(self):
        legacy=self.root/'deploy/restore-state'/hashlib.sha256(str((self.root/self.path).parent).encode()).hexdigest()
        legacy.mkdir(parents=True)
        row={'id':str(uuid.uuid4()),'status':'failed','created_at':'2026-01-01T00:00:00Z','error_code':'RESTORE_FAILED_KEEP_SERVICES_STOPPED'}
        (legacy/(row['id']+'.json')).write_text(json.dumps(row))
        with patch.object(deployer.shutil,'which',return_value='/usr/bin/docker'),patch.object(deployer.subprocess,'run',side_effect=self.docker):
            with self.assertRaisesRegex(ValueError,'restauração verificada'):deployer.deploy(self.root,self.path)
            self.assertEqual(deployer.restore_history(self.root,self.path),[row])
        self.assertTrue((legacy/(row['id']+'.json')).exists())

    def test_environment_aliases_use_same_project_lock(self):
        alias='deploy/docker/.env.other';(self.root/alias).write_text('APP_PORT=58181\n')
        _,lock=deployer.acquire_stack_lock(self.root,self.path,'existing-school')
        try:
            with patch.object(deployer.shutil,'which',return_value='/usr/bin/docker'),patch.object(deployer.subprocess,'run',side_effect=self.docker):
                with self.assertRaisesRegex(ValueError,'em andamento'):deployer.deploy(self.root,alias)
                with self.assertRaisesRegex(ValueError,'em andamento'):deployer.start_restore(self.root,alias,str(uuid.uuid4()),'any')
        finally:lock.close()

    def test_restore_in_progress_blocks_update_and_preserves_active_status(self):
        ident=str(uuid.uuid4());plan={'id':ident,'status':'prepared','expires_at':'2999-01-01','confirmation':'RESTAURAR '+ident[:8]}
        entered=threading.Event();release=threading.Event();finished=threading.Event();calls=[]
        def execute(command,**kwargs):
            calls.append(command)
            if 'execute' in command:
                entered.set()
                if not release.wait(5):raise RuntimeError('Test restore timed out')
            if 'up' in command:finished.set()
            return self.docker(command,**kwargs)
        def plans(*args):return [{**plan,'status':'completed' if release.is_set() else 'prepared'}]
        with patch.object(deployer.shutil,'which',return_value='/usr/bin/docker'),patch.object(deployer.subprocess,'run',side_effect=execute),patch.object(deployer,'restore_plans',side_effect=plans):
            deployer.start_restore(self.root,self.path,ident,plan['confirmation'])
            try:
                self.assertTrue(entered.wait(3))
                self.assertEqual(deployer.restore_history(self.root,self.path)[0]['status'],'processing')
                with self.assertRaisesRegex(ValueError,'em andamento'):deployer.deploy(self.root,self.path)
                self.assertFalse(any('pull' in c for c in calls))
            finally:
                release.set();self.assertTrue(finished.wait(3))
                # Wait for the worker to persist completion and release the file lock.
                for _ in range(100):
                    try:_,lock=deployer.acquire_stack_lock(self.root,self.path,'existing-school')
                    except ValueError:time.sleep(.01)
                    else:lock.close();break
                else:self.fail('Restore did not release the stack lock')
            self.assertEqual(deployer.restore_history(self.root,self.path)[0]['status'],'completed')

    def test_update_keeps_lock_until_health_check_finishes(self):
        entered=threading.Event();release=threading.Event();errors=[]
        def execute(command,**kwargs):
            if 'up' in command:
                entered.set()
                if not release.wait(5):raise RuntimeError('Test update timed out')
            return self.docker(command,**kwargs)
        def update():
            try:deployer.deploy(self.root,self.path)
            except BaseException as error:errors.append(error)
        with patch.object(deployer.shutil,'which',return_value='/usr/bin/docker'),patch.object(deployer.subprocess,'run',side_effect=execute):
            worker=threading.Thread(target=update);worker.start()
            try:
                self.assertTrue(entered.wait(3))
                with self.assertRaisesRegex(ValueError,'em andamento'):
                    deployer.start_restore(self.root,self.path,str(uuid.uuid4()),'unused')
            finally:release.set();worker.join(timeout=3)
        self.assertFalse(worker.is_alive());self.assertEqual(errors,[])


class LoopbackOriginTests(unittest.TestCase):
    def test_alternate_port_authenticates_but_wrong_origin_and_csrf_are_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);(root/'deploy/docker').mkdir(parents=True);(root/'scripts').mkdir()
            (root/'deploy/docker/compose.yaml').write_text('services: {}\n');(root/'scripts/configure.py').write_text('')
            with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
            process=subprocess.Popen([sys.executable,str(ROOT/'scripts/deployer.py'),'--root',str(root),'--port',str(port)],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True)
            try:
                password=re.search(r'Senha temporária: (\S+)',process.stdout.readline()).group(1)
                origin=f'http://127.0.0.1:{port}'
                opener=urllib.request.build_opener(urllib.request.ProxyHandler({}),urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
                def post(path,fields,source=origin):
                    request=urllib.request.Request(origin+path,data=urllib.parse.urlencode(fields).encode(),headers={'Origin':source})
                    try:
                        with opener.open(request,timeout=5) as response:return response.status,response.read().decode()
                    except urllib.error.HTTPError as response:return response.code,response.read().decode()
                for _ in range(100):
                    try:
                        with opener.open(origin,timeout=1):break
                    except urllib.error.URLError:time.sleep(.01)
                else:self.fail('Local deployer did not start')
                other_port=port+1 if port<65535 else port-1
                self.assertEqual(post('/login',{'password':password},f'http://127.0.0.1:{other_port}')[0],403)
                status,body=post('/login',{'password':password});self.assertEqual(status,200)
                self.assertIn('Nova stack isolada',body)
                self.assertEqual(post('/create',{'csrf':'invalid','name':'example'})[0],403)
                csrf=re.search(r'name="csrf" value="([^"]+)"',body).group(1)
                self.assertEqual(post('/create',{'csrf':csrf,'name':'example'},'http://evil.example.test')[0],403)
                status,body=post('/create',{'csrf':csrf,'name':'!bad'})
                self.assertEqual(status,400);self.assertIn('Nome:',body)
            finally:
                process.terminate();process.wait(timeout=5);process.stdout.close()


if __name__=='__main__':unittest.main()
