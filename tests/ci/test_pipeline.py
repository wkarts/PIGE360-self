import importlib.util
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'scripts/ci'))
import cleanup
import version
import promote

class VersionTests(unittest.TestCase):
    def test_bumps(self):
        self.assertEqual(version.bump('1.9.9','patch'),'1.9.10')
        self.assertEqual(version.bump('1.9.9','minor'),'1.10.0')
        self.assertEqual(version.bump('1.9.9','major'),'2.0.0')
    def test_initial_baseline(self):self.assertEqual(version.resolve([],[],'0.3.0','patch'),'0.3.0')
    def test_numeric_sort(self):self.assertEqual(version.resolve(['1.9.0','1.10.0'],[],'0.3.0','patch'),'1.10.1')
    def test_idempotent_target(self):self.assertEqual(version.resolve(['1.2.0'],['1.2.0'],'0.3.0','major'),'1.2.0')
    def test_no_prerelease_as_stable(self):self.assertEqual(version.resolve(['1.2.0','8.0.0-rc.1'],[],'0.3.0','patch'),'1.2.1')
    def test_no_prefix(self):
        for tag in ['v1.0.0','w1.0.0','01.0.0','1.0','1.0.0-dev.1','1.0.0\n','1.0.0;echo injected']:
            with self.subTest(tag=tag),self.assertRaises(ValueError):version.parse(tag)
    def test_release_pr(self):version.validate_pr('release(minor): secretaria','## Descrição\nTeste\n## Branch','develop','main')
    def test_main_blocks_other_branches(self):
        with self.assertRaises(ValueError):version.validate_pr('release(patch): teste','## Descrição\n## Branch','fix/x','main')
    def test_fork_named_develop_cannot_release(self):
        with self.assertRaises(ValueError):version.validate_pr('release(patch): teste','## Descrição\n## Branch','develop','main',False)
    def test_feature_pr(self):version.validate_pr('feat(secretaria): testar','## Descrição\n## Branch','feature/alunos','develop')
    def test_description_required(self):
        with self.assertRaises(ValueError):version.validate_pr('ci: teste','','ci/teste','develop')

class CleanupTests(unittest.TestCase):
    now=datetime(2026,9,22,tzinfo=timezone.utc)
    def item(self,id,tags,days=20):
        return dict(id=id,name='sha256:'+format(id,'064x'),created_at=(self.now-timedelta(days=days)).isoformat(),metadata={'container':{'tags':tags}})
    def test_stable_and_aliases_always_protected(self):
        for tag in ['1.0.0','v1.0.0','1.0','1','0.3.0','latest','stable','production','main','develop','develop-0','develop-0.3','develop-0.3.0']:
            with self.subTest(tag=tag):self.assertFalse(cleanup.deletable_tags([tag]))
    def test_mixed_digest_stable_wins(self):self.assertFalse(cleanup.deletable_tags(['release-candidate-1.0.0-r1.1','latest']))
    def test_unknown_tag_preserved(self):self.assertFalse(cleanup.deletable_tags(['cliente-homologacao']))
    def test_old_develop_selected(self):
        values=[self.item(n,[f'develop-0.3.0-r{n}.1']) for n in range(1,13)]
        self.assertEqual(len(cleanup.select_versions(values,self.now)),2)
    def test_recent_kept(self):self.assertEqual(cleanup.select_versions([self.item(1,['develop-0.3.0-r1.1'],1)],self.now),[])
    def test_keep_latest(self):
        values=[self.item(n,[f'develop-0.3.0-r{n}.1'],30-n) for n in range(1,13)]
        self.assertEqual({v['id'] for v in cleanup.select_versions(values,self.now)},{1,2})
    def test_orphans_opt_in(self):
        self.assertEqual(cleanup.select_versions([self.item(1,[])],self.now),[])
        self.assertEqual(len(cleanup.select_versions([self.item(1,[])],self.now,include_orphans=True)),1)
    def test_base_tags_kept(self):self.assertFalse(cleanup.deletable_tags(['3.13-slim','latest']))
    def test_protect_nested_manifest(self):
        a,b,c=['sha256:'+x*64 for x in 'abc']
        with patch.object(cleanup,'children',side_effect=lambda image,d:{a:[b],b:[c],c:[]}[d]):
            self.assertEqual(cleanup.reachable('image',[a]),{a,b,c})
    def test_graph_failure_is_not_swallowed(self):
        with patch.object(cleanup,'children',side_effect=RuntimeError('registry unavailable')):
            with self.assertRaises(RuntimeError):cleanup.reachable('image',['sha256:'+'a'*64])
    def test_main_develop_cache_kept(self):
        for ref in ['refs/heads/main','refs/heads/develop']:
            self.assertFalse(cleanup.cache_deletable(dict(ref=ref,last_accessed_at='2020-01-01T00:00:00Z'),self.now))
    def test_stale_feature_cache(self):self.assertTrue(cleanup.cache_deletable(dict(ref='refs/heads/feature/x',last_accessed_at='2026-09-21T00:00:00Z'),self.now))
    def test_only_closed_pr(self):
        c=dict(ref='refs/pull/12/merge',last_accessed_at=self.now.isoformat())
        self.assertTrue(cleanup.cache_deletable(c,self.now,pr_ref='refs/pull/12/merge'))
        self.assertFalse(cleanup.cache_deletable(c,self.now,pr_ref='refs/pull/13/merge'))
    def test_pagination_snapshot(self):
        with patch.object(cleanup,'api',side_effect=[list(range(100)),[100]]) as call:
            self.assertEqual(len(cleanup.pages('endpoint')),101);self.assertEqual(call.call_count,2)
    def test_promotion_no_overwrite(self):
        with patch.object(promote,'inspect',return_value='sha256:'+'a'*64):
            with self.assertRaises(RuntimeError):promote.promote('release','ghcr.io/wkarts/pige360-self','sha256:'+'b'*64,'1.0.0')
    def test_foreign_registry_rejected(self):
        with self.assertRaises(ValueError):promote.promote('develop','ghcr.io/other/repo','sha256:'+'b'*64,'1.0.0-develop.1.1')
    def test_semver_docs_sources_not_executed(self):
        for path in (ROOT/'.github/workflows').glob('*.yml'):
            self.assertNotIn('vercel',path.read_text().lower())
    def test_env_only_migration_code_untouched(self):
        self.assertTrue((ROOT/'backend/migrations').is_dir())
        self.assertNotIn('build:',(ROOT/'deploy/compose.yaml').read_text())
    def test_npm_lock_matches_package(self):
        package=json.loads((ROOT/'frontend/package.json').read_text());lock=json.loads((ROOT/'frontend/package-lock.json').read_text())
        self.assertEqual(package['devDependencies'],lock['packages']['']['devDependencies'])

if __name__=='__main__':unittest.main()

class PackagePlanTests(unittest.TestCase):
    now=CleanupTests.now
    item=CleanupTests.item
    def test_tagged_candidates_are_actually_eligible(self):
        import argparse
        items=[self.item(i,[f'develop-0.3.0-r{i}.1'],30-i) for i in range(1,13)]
        items += [self.item(20,['latest','0.3.0']), self.item(21,[])]
        args=argparse.Namespace(days=7,keep=10,orphans=True,apply=False)
        metadata={'owner':{'type':'User'},'repository':{'full_name':'wkarts/PIGE360-self'}}
        def api(path,method='GET'):
            if path=='repos/wkarts/PIGE360-self':return metadata
            if path.endswith('/pige360-self'):return metadata
            return {'repository':{'full_name':'another/project'}}
        report=[]
        with patch.object(cleanup,'api',side_effect=api),patch.object(cleanup,'pages',return_value=items),patch.object(cleanup,'children',return_value=[]):
            cleanup.cleanup_packages(args,'wkarts/PIGE360-self',report)
        self.assertEqual({e['id'] for e in report if e.get('status')=='dry_run'},{1,2,21})
