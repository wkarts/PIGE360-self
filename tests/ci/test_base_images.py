"""Politicas de bases sem rede: registry e comandos Docker sao isolados nos testes."""
import argparse
from contextlib import redirect_stdout
from copy import deepcopy
from datetime import datetime, timezone
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
import zipfile

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'scripts/ci'))
import base_images as bases
import cleanup
spec=importlib.util.spec_from_file_location('base_checkpoint_package',ROOT/'scripts/ci/package.py')
pack=importlib.util.module_from_spec(spec);spec.loader.exec_module(pack)

class FingerprintTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name)
        (self.root/'Dockerfile').write_text('FROM base\n')
        (self.root/'requirements.txt').write_text('dependency==1.0\n')
        self.spec=dict(id='python',package='pige360-self-base-python',upstream='python:3.13-slim',security_revision=1,dockerfile='Dockerfile',inputs=['requirements.txt'],aliases=['3.13-slim'])
        self.upstream='python:3.13-slim@sha256:'+'a'*64
    def value(self,spec=None,upstream=None,platform='linux/amd64'):
        return bases.fingerprint(spec or self.spec,upstream or self.upstream,platform,self.root)
    def test_deterministic(self):self.assertEqual(self.value(),self.value())
    def test_full_sha256(self):self.assertRegex(self.value(),r'^[0-9a-f]{64}$')
    def test_application_change_does_not_rebuild_base(self):
        before=self.value();(self.root/'application.py').write_text('changed=True');self.assertEqual(before,self.value())
    def test_alias_does_not_rebuild_base(self):
        other=deepcopy(self.spec);other['aliases'].append('latest');self.assertEqual(self.value(),self.value(other))
    def test_dependency_change_rebuilds(self):
        before=self.value();(self.root/'requirements.txt').write_text('dependency==2.0\n');self.assertNotEqual(before,self.value())
    def test_dockerfile_change_rebuilds(self):
        before=self.value();(self.root/'Dockerfile').write_text('FROM other\n');self.assertNotEqual(before,self.value())
    def test_upstream_digest_change_rebuilds(self):self.assertNotEqual(self.value(),self.value(upstream='python@sha256:'+'b'*64))
    def test_platform_change_rebuilds(self):self.assertNotEqual(self.value(),self.value(platform='linux/arm64'))
    def test_security_revision_change_rebuilds(self):
        other=deepcopy(self.spec);other['security_revision']=2;self.assertNotEqual(self.value(),self.value(other))
    def test_paths_cannot_escape_repository(self):
        self.spec['inputs']=['../external'];
        with self.assertRaises(ValueError):self.value()

class RegistryTests(unittest.TestCase):
    def test_valid_digest(self):self.assertEqual(bases.digest_of({'digest':'sha256:'+'a'*64}),'sha256:'+'a'*64)
    def test_digest_missing_is_not_success(self):
        with self.assertRaises(ValueError):bases.digest_of({})
    def test_wrong_digest_is_not_success(self):
        with self.assertRaises(ValueError):bases.digest_of({'digest':'latest'})
    def result(self,error='',stdout='{}'):
        return subprocess.CompletedProcess([],1 if error else 0,stdout,error)
    def test_missing_manifest_can_be_created(self):
        with patch.object(bases.subprocess,'run',return_value=self.result('manifest unknown')):
            self.assertIsNone(bases.inspect('image',optional=True))
    def test_auth_error_never_means_missing(self):
        with patch.object(bases.subprocess,'run',return_value=self.result('denied: manifest unknown')):
            with self.assertRaises(RuntimeError):bases.inspect('image',optional=True)
    def test_network_error_never_means_missing(self):
        with patch.object(bases.subprocess,'run',return_value=self.result('404 not found; no such host')):
            with self.assertRaises(RuntimeError):bases.inspect('image',optional=True)
    def test_registry_unavailable_fails(self):
        with patch.object(bases.subprocess,'run',return_value=self.result('503 service unavailable')):
            with self.assertRaises(RuntimeError):bases.inspect('image',optional=True)
    def test_unknown_payload_fails(self):
        with patch.object(bases.subprocess,'run',return_value=self.result(stdout='[]')):
            with self.assertRaises(RuntimeError):bases.inspect('image')

class ReuseTests(unittest.TestCase):
    def setUp(self):
        self.digest='sha256:'+'b'*64
        self.spec=dict(id='python',package='pige360-self-base-python',upstream='docker.io/library/python:3.13-slim',security_revision=1,dockerfile='Dockerfile',inputs=[],aliases=['3.13-slim'])
        self.image='ghcr.io/wkarts/pige360-self-base-python'
        self.calls=[]
    def inspect(self,ref,field='Manifest',optional=False):
        self.calls.append((ref,field))
        if field=='Image':return {'config':{'Labels':{bases.LABEL+'upstream.tag':self.spec['upstream'],bases.LABEL+'upstream.resolved':self.spec['upstream']+'@sha256:'+'a'*64}}}
        return {'digest':self.digest if ref.startswith('ghcr.io/') else 'sha256:'+'a'*64}
    def test_normal_run_neither_checks_upstream_nor_builds(self):
        with patch.object(bases,'inspect',side_effect=self.inspect),patch.object(bases,'fingerprint',return_value='f'*64),patch.object(bases.subprocess,'run') as build,patch.object(bases,'run') as retag,redirect_stdout(io.StringIO()):
            result=bases.ensure(self.spec,'wkarts','linux/amd64',False)
        build.assert_not_called();retag.assert_not_called()
        self.assertTrue(all(ref.startswith('ghcr.io/') for ref,_ in self.calls))
        self.assertEqual(result['status'],'reused')
    def test_weekly_unchanged_digest_does_not_rebuild(self):
        with patch.object(bases,'inspect',side_effect=self.inspect),patch.object(bases,'fingerprint',return_value='f'*64),patch.object(bases.subprocess,'run') as build,patch.object(bases,'run') as retag,redirect_stdout(io.StringIO()):
            bases.ensure(self.spec,'wkarts','linux/amd64',True)
        build.assert_not_called();retag.assert_not_called()
        self.assertIn((self.spec['upstream'],'Manifest'),self.calls)
    def test_missing_alias_only_retags(self):
        state={'retagged':False};alias=self.image+':latest';self.spec['aliases'].append('latest')
        def inspect(ref,field='Manifest',optional=False):
            if ref==alias and not state['retagged']:return None
            return self.inspect(ref,field,optional)
        def retag(*args):state['retagged']=True
        with patch.object(bases,'inspect',side_effect=inspect),patch.object(bases,'fingerprint',return_value='f'*64),patch.object(bases.subprocess,'run') as build,patch.object(bases,'run',side_effect=retag) as tag,redirect_stdout(io.StringIO()):
            bases.ensure(self.spec,'wkarts','linux/amd64',False)
        build.assert_not_called();self.assertEqual(tag.call_count,1)
    def test_new_fingerprint_builds_once(self):
        state={'built':False};immutable=self.image+':base-'+'f'*64
        def inspect(ref,field='Manifest',optional=False):
            if ref==immutable and not state['built']:return None
            return self.inspect(ref,field,optional)
        def build(*args,**kwargs):state['built']=True
        with patch.dict('os.environ',{'GITHUB_REPOSITORY':'wkarts/PIGE360-self'}),patch.object(bases,'inspect',side_effect=inspect),patch.object(bases,'fingerprint',return_value='f'*64),patch.object(bases.subprocess,'run',side_effect=build) as command,patch.object(bases,'run'),redirect_stdout(io.StringIO()):
            result=bases.ensure(self.spec,'wkarts','linux/amd64',False)
        self.assertEqual(command.call_count,1)
        self.assertIn('--push',command.call_args.args[0])
        self.assertEqual(result['status'],'missing-or-inputs-changed')

class CatalogAndRetentionTests(unittest.TestCase):
    def test_required_mirrors(self):
        catalog=json.loads((ROOT/'containers/images.json').read_text())
        self.assertEqual({s['id'] for s in catalog['images']},{'python','node','postgres','redis','rabbitmq'})
        self.assertTrue(all(s['package'].startswith('pige360-self-') for s in catalog['images']))
    def test_node_tracks_lock_and_python_tracks_requirements(self):
        items={s['id']:s for s in json.loads((ROOT/'containers/images.json').read_text())['images']}
        self.assertIn('frontend/package-lock.json',items['node']['inputs'])
        self.assertIn('backend/requirements.txt',items['python']['inputs'])
    def test_all_runtime_composes_use_ghcr_postgres(self):
        for name in ('compose.yaml','deploy/compose.yaml'):
            self.assertIn('ghcr.io/wkarts/pige360-self-postgres',(ROOT/name).read_text())
    def test_external_services_not_added_without_consumers(self):
        text=(ROOT/'deploy/compose.yaml').read_text()
        self.assertNotIn('\n  redis:',text);self.assertNotIn('\n  rabbitmq:',text)
    def test_bases_not_visited_by_cleanup_even_for_orphans(self):
        calls=[]
        def api(path,method='GET'):
            calls.append(path)
            return {'owner':{'type':'User'},'repository':{'full_name':'wkarts/PIGE360-self'}}
        args=argparse.Namespace(days=7,keep=10,orphans=True,apply=False)
        with patch.object(cleanup,'api',side_effect=api),patch.object(cleanup,'pages',return_value=[]):
            cleanup.cleanup_packages(args,'wkarts/PIGE360-self',[])
        self.assertEqual(calls,['repos/wkarts/PIGE360-self','users/wkarts/packages/container/pige360-self'])
    def test_stable_versions_remain_protected(self):
        for tag in ('0.3.0','1.0.0','latest','stable','main','develop','base-'+'a'*64):
            self.assertFalse(cleanup.deletable_tags([tag]))
    def test_no_external_deploy_workflow(self):
        for file in (ROOT/'.github/workflows').glob('*.yml'):
            self.assertNotIn('vercel',file.read_text().lower())

class PackageLockTests(unittest.TestCase):
    def test_checkpoint_keeps_base_lock_and_excludes_secrets(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);(root/'ci-evidence').mkdir();(root/'VERSION').write_text('0.3.0\n')
            (root/'.env').write_text('SECRET=do-not-publish');(root/'font.ttf').write_bytes(b'not-a-font')
            lock={'schema_version':1,'images':{k:{'ref':'ghcr.io/wkarts/pige360-self-'+k+'@sha256:'+'a'*64} for k in ('node','python','postgres')}}
            (root/'ci-evidence/base-images.lock.json').write_text(json.dumps(lock))
            image='ghcr.io/wkarts/pige360-self@sha256:'+'b'*64
            with patch.object(pack.subprocess,'check_output',return_value=b'VERSION\x00.env\x00font.ttf\x00'),redirect_stdout(io.StringIO()):
                pack.package(root,root/'test.zip','0.3.0','a'*40,image)
            with zipfile.ZipFile(root/'test.zip') as archive:
                self.assertIn('pige360-self/deploy/images.lock.json',archive.namelist())
                self.assertNotIn('pige360-self/.env',archive.namelist());self.assertNotIn('pige360-self/font.ttf',archive.namelist())
                self.assertIn(image,archive.read('pige360-self/deploy/images.env').decode())

if __name__=='__main__':unittest.main()
