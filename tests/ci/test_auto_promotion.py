import copy
import importlib.util
import json
import os
from pathlib import Path
import sys
import unittest
from unittest.mock import Mock, patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts/ci'))
import auto_promotion as auto

H, B, M, T, R = [c * 40 for c in 'abcde']


def pr():
    return {'number': 7, 'title': 'release(minor): versão testada',
            'body': '## Descrição\nPreservar\n## Branch\ndevelop → main',
            'head': {'sha': H, 'ref': 'develop', 'repo': {'full_name': auto.REPOSITORY}},
            'base': {'sha': B, 'ref': 'main', 'repo': {'full_name': auto.REPOSITORY}},
            'state': 'open', 'draft': False, 'merged': False, 'mergeable': True,
            'merge_commit_sha': M, 'merged_at': '2026-10-18T00:00:00Z'}


class FakeGitHub:
    def __init__(self):
        self.head, self.base = H, B
        self.pr = pr()
        self.prs = [self.pr]
        self.closed = []
        self.calls = []
        self.ahead = 1
        self.commit = {'parents': [{'sha': B}, {'sha': H}], 'tree': {'sha': T}}
        self.merged_commit = copy.deepcopy(self.commit)
        self.merge_result = {'merged': True, 'sha': R}
        self.runs = []
        self.releases = []

    def branch(self, branch):
        return self.head if branch == 'develop' else self.base

    def pages(self, path, key=None):
        self.calls.append(('GET', path, None))
        if path.startswith('/actions/'):
            return self.runs
        if path == '/releases':
            return self.releases
        return self.closed if 'state=closed' in path else self.prs

    def api(self, path, method='GET', data=None):
        self.calls.append((method, path, data))
        if path.startswith('/actions/runs/'):
            return next(run for run in self.runs if str(run['id']) == path.rsplit('/', 1)[1])
        if path.startswith('/compare/'):
            return {'ahead_by': self.ahead}
        if path == '/pulls' and method == 'POST':
            self.pr.update(data)
            return self.pr
        if path.endswith('/merge') and method == 'PUT':
            if self.merge_result['merged']:
                self.base = R
            return self.merge_result
        if path == '/git/commits/' + M:
            return self.commit
        if path == '/git/commits/' + R:
            return self.merged_commit
        if path == '/pulls/7':
            return self.pr
        if path.endswith('/dispatches'):
            return None
        raise AssertionError((path, method, data))


class PromotionTests(unittest.TestCase):
    def setUp(self):
        self.api = FakeGitHub()

    def expected(self):
        return auto.snapshot(self.api, 7, H, B)

    def writes(self):
        return [c for c in self.api.calls if c[0] != 'GET']

    def test_prepare_reuses_existing_pr_and_bump(self):
        result = auto.prepare(self.api, H)
        self.assertEqual(result['bump'], 'minor')
        self.assertEqual(result['merge'], M)
        self.assertEqual(self.writes(), [])

    def test_prepare_creates_one_pr_with_valid_metadata(self):
        self.api.prs = []
        # The real API returns expanded objects; preserve fake identity after POST.
        original = self.api.api
        def call(path, method='GET', data=None):
            if path == '/pulls':
                self.api.calls.append((method, path, data))
                self.api.pr['title'], self.api.pr['body'] = data['title'], data['body']
                return {'number': 7}
            return original(path, method, data)
        self.api.api = call
        result = auto.prepare(self.api, H)
        self.assertEqual(result['bump'], 'patch')
        self.assertEqual(len(self.writes()), 1)
        self.assertIn(auto.MARKER, self.writes()[0][2]['body'])

    def test_duplicate_prs_fail_without_writes(self):
        self.api.prs *= 2
        with self.assertRaisesRegex(RuntimeError, 'Mais de uma'):
            auto.prepare(self.api, H)
        self.assertEqual(self.writes(), [])

    def test_new_develop_sha_never_merges_old_head(self):
        self.api.head = R
        with self.assertRaisesRegex(RuntimeError, 'develop mudou'):
            auto.prepare(self.api, H)
        self.assertEqual(self.writes(), [])

    def test_base_changed_before_merge_fails_without_write(self):
        expected = self.expected()
        self.api.base = R
        with self.assertRaises(RuntimeError):
            auto.merge(self.api, expected, 'success')
        self.assertEqual(self.writes(), [])

    def test_synthetic_parents_must_be_exact(self):
        self.api.commit['parents'].reverse()
        with self.assertRaisesRegex(RuntimeError, 'Merge sintético'):
            auto.prepare(self.api, H)

    def test_unknown_mergeability_has_bounded_wait(self):
        self.api.pr['mergeable'] = None
        sleep = Mock()
        with self.assertRaisesRegex(RuntimeError, '120 segundos'):
            auto.prepare(self.api, H, sleep=sleep)
        self.assertEqual(sleep.call_count, 24)
        self.assertEqual(self.writes(), [])

    def test_conflict_is_visible(self):
        self.api.pr['mergeable'] = False
        with self.assertRaisesRegex(RuntimeError, 'conflitante'):
            auto.prepare(self.api, H)

    def test_forks_are_rejected(self):
        for side in ('head', 'base'):
            candidate = pr()
            candidate[side]['repo']['full_name'] = 'attacker/PIGE360-self'
            with self.subTest(side=side), self.assertRaises(RuntimeError):
                auto.identity(candidate)

    def test_wrong_branches_drafts_title_body_are_rejected(self):
        for key, value in [('draft', True), ('title', 'release(patch): x\ninjected'), ('body', '')]:
            candidate = pr()
            candidate[key] = value
            with self.subTest(key=key), self.assertRaises((ValueError, RuntimeError)):
                auto.identity(candidate)
        self.api.pr['head']['ref'] = 'feature/x'
        with self.assertRaises(RuntimeError):
            auto.prepare(self.api, H)

    def test_merge_requires_ci_success(self):
        expected = self.expected()
        for result in ('failure', 'skipped', 'cancelled', '', 'neutral'):
            with self.subTest(result=result), self.assertRaises(RuntimeError):
                auto.merge(self.api, expected, result)
        self.assertEqual(self.writes(), [])

    def test_title_changed_after_tests_blocks_merge(self):
        expected = self.expected()
        self.api.pr['title'] = 'release(major): mudança posterior'
        with self.assertRaisesRegex(RuntimeError, 'bump'):
            auto.merge(self.api, expected, 'success')
        self.assertEqual(self.writes(), [])

    def test_merge_uses_normal_endpoint_with_head_lease(self):
        result = auto.merge(self.api, self.expected(), 'success')
        self.assertEqual(result['release_sha'], R)
        self.assertEqual(self.writes()[0][1], '/pulls/7/merge')
        self.assertEqual(self.writes()[0][2]['sha'], H)
        self.assertEqual(self.writes()[0][2]['merge_method'], 'merge')
        self.assertNotIn('force', self.writes()[0][2])

    def test_rules_rejection_never_dispatches(self):
        self.api.merge_result = {'merged': False, 'message': 'Required review missing'}
        with self.assertRaisesRegex(RuntimeError, 'Required review'):
            auto.merge(self.api, self.expected(), 'success')
        self.assertEqual(len(self.writes()), 1)

    def test_base_race_after_merge_blocks_publication(self):
        self.api.merged_commit['parents'][0]['sha'] = M
        with self.assertRaisesRegex(RuntimeError, 'precisa ser revalidado'):
            auto.merge(self.api, self.expected(), 'success')
        self.assertEqual(len(self.writes()), 1)

    def test_different_tree_after_merge_blocks_publication(self):
        self.api.merged_commit['tree']['sha'] = M
        with self.assertRaises(RuntimeError):
            auto.merge(self.api, self.expected(), 'success')

    def test_no_difference_is_idempotent_noop(self):
        self.api.ahead = 0
        result = auto.prepare(self.api, H)
        self.assertEqual(result['ready'], 'false')
        self.assertEqual(result['release_sha'], '')
        self.assertEqual(self.writes(), [])

    def test_retry_after_merge_reuses_current_main(self):
        self.api.ahead = 0
        self.api.pr.update(merged=True, merged_at='2026-10-18T00:00:00Z', state='closed', merge_commit_sha=B)
        self.api.closed = [self.api.pr]
        result = auto.prepare(self.api, H)
        self.assertEqual(result['release_sha'], B)
        self.assertEqual(result['bump'], 'minor')
        self.assertEqual(self.writes(), [])

    def test_dispatch_targets_main_with_exact_sha_and_correlation(self):
        self.api.pr.update(merged=True, state='closed', merge_commit_sha=B)
        auto.dispatch(self.api, B, '7', 'minor', '123-1', sleep=lambda _: None)
        method, path, payload = self.writes()[0]
        self.assertEqual(path, '/actions/workflows/release.yml/dispatches')
        self.assertEqual(payload['ref'], 'main')
        self.assertEqual(payload['inputs']['target_sha'], B)
        self.assertEqual(payload['inputs']['promotion_run'], '123-1')

    def test_dispatch_rejects_other_sha_or_unmerged_pr(self):
        for target in (B, M):
            with self.subTest(target=target), self.assertRaises(RuntimeError):
                auto.dispatch(self.api, target, '7', 'patch', '123-1')
        self.assertEqual(self.writes(), [])

    def test_release_guard_rejects_arbitrary_ref(self):
        for target in ('develop', 'refs/heads/main', 'a'*39, 'A'*40, 'a'*40+'\n'):
            with self.subTest(target=target), self.assertRaises(RuntimeError):
                auto.verify_release(self.api, target)

    def test_watch_accepts_only_correlated_completed_success(self):
        self.api.pr.update(merged=True, merge_commit_sha=B, state='closed')
        good = {'repository': {'full_name': auto.REPOSITORY}, 'head_repository': {'full_name': auto.REPOSITORY},
                'path': '.github/workflows/release.yml', 'display_title': f'PIGE360 stable | 123-1 | {B}', 'head_sha': B,
                'head_branch': 'main', 'event': 'workflow_dispatch', 'run_attempt': 1, 'id': 1,
                'status': 'completed', 'conclusion': 'success', 'html_url': 'https://github.com/example/run/1'}
        self.api.runs = [good]
        result = auto.watch(self.api, B, '123-1', '7', monotonic=lambda: 0, verify=lambda *_: {'verified': 'true'})
        self.assertEqual(result['run_url'], good['html_url'])
        for conclusion in ('failure', 'cancelled', 'skipped', 'timed_out'):
            good['conclusion'] = conclusion
            with self.subTest(conclusion=conclusion), self.assertRaises(RuntimeError):
                auto.watch(self.api, B, '123-1', '7', monotonic=lambda: 0, verify=lambda *_: {'verified': 'true'})

    def test_watch_timeout_never_claims_success(self):
        self.api.pr.update(merged=True, merge_commit_sha=B, state='closed')
        ticks = iter([0, 0, 7201])
        sleep = Mock()
        with self.assertRaisesRegex(RuntimeError, 'Não há confirmação'):
            auto.watch(self.api, B, '123-1', '7', sleep=sleep, monotonic=lambda: next(ticks))
        sleep.assert_called_once_with(30)


class WorkflowContractTests(unittest.TestCase):
    def test_promotion_requires_successful_develop_graph(self):
        text = (ROOT / '.github/workflows/develop-image.yml').read_text()
        self.assertIn('needs: [version, bases, tests, publish]', text)
        self.assertIn('cancel-in-progress: false', text)

    def test_explicit_call_dispatch_no_recursive_event_dependency(self):
        text = (ROOT / '.github/workflows/promote-develop.yml').read_text()
        self.assertIn('workflow_call:', text)
        self.assertNotIn('workflow_run:', text)
        self.assertNotIn('pull_request_target:', text)
        self.assertIn('ref: ${{ needs.prepare.outputs.merge }}', text)
        self.assertIn('permissions:\n      contents: read\n      packages: read', text)
        self.assertIn("needs.tests.result == 'success'", text)
        self.assertIn('actions: write', text)
        self.assertIn('auto_promotion.py watch', text)
        self.assertIn("github.ref == 'refs/heads/develop'", text)
        self.assertNotIn('ref: ${{ inputs.sha }}', text)

    def test_release_guard_precedes_versioning_and_write_job(self):
        text = (ROOT / '.github/workflows/release.yml').read_text()
        self.assertIn('target_sha:', text)
        self.assertIn('promotion_pr:', text)
        self.assertLess(text.index('auto_promotion.py verify-release'), text.index('python scripts/ci/version.py release'))
        self.assertIn('github.ref == \'refs/heads/main\'', text)
        self.assertIn('pige360-stable-release', text)
        self.assertIn('ref: ${{ github.event.pull_request.merge_commit_sha || github.sha }}', text)
        self.assertNotIn('ref: ${{ inputs.target_sha', text)

    def test_ci_artifacts_and_image_revision_follow_checked_out_sha(self):
        text = (ROOT / '.github/workflows/ci.yml').read_text()
        self.assertIn('name: ci-${{ github.run_id }}-${{ github.run_attempt }}-${{ inputs.ref || github.sha }}', text)
        self.assertNotIn('SOURCE_REVISION="$GITHUB_SHA"', text)
        self.assertIn('SOURCE_REVISION="$(git rev-parse HEAD)"', text)

    def test_finalization_rechecks_current_main_and_all_three_images(self):
        text = (ROOT / 'scripts/ci/finalize-release.sh').read_text()
        self.assertLess(text.index('main mudou;'), text.index('git tag -a'))
        self.assertIn("('MAIL_AGENT_IMAGE', 'MAIL_AGENT_DIGEST')", text)
        self.assertIn("('SOGO_IMAGE', 'SOGO_DIGEST')", text)
        self.assertLess(text.index('Conjunto estável divergente'), text.index('gh release edit'))


class StableSetTests(unittest.TestCase):
    def setUp(self):
        import stable_set
        self.module = stable_set
        self.new = {image: 'sha256:' + char * 64 for image, char in zip(stable_set.IMAGES, 'abc')}
        self.old = {image: 'sha256:' + char * 64 for image, char in zip(stable_set.IMAGES, 'def')}
        self.registry = {}
        for image, digest in self.new.items():
            self.registry[image + '@' + digest] = digest
            for tag in ('0.12', '0', 'production', 'stable', 'latest'):
                self.registry[image + ':' + tag] = self.old[image]
        self.writes = []

    def write(self, image, tag, digest):
        self.writes.append((image, tag, digest))
        self.registry[image + ':' + tag] = digest

    def call(self, revision=H, writer=None):
        with patch.object(self.module, 'inspect', side_effect=self.registry.get), \
             patch.object(self.module, 'revision', return_value=revision), \
             patch.object(self.module, 'set_tag', side_effect=writer or self.write):
            return self.module.promote_set(self.new, '0.12.0', H)

    def test_three_images_match_same_sha_and_digests(self):
        result = self.call()
        self.assertEqual(result['commit'], H)
        for image, digest in self.new.items():
            self.assertEqual(self.registry[image + ':latest'], digest)
            self.assertEqual(self.registry[image + ':0.12.0'], digest)

    def test_wrong_sha_fails_before_any_registry_write(self):
        with self.assertRaisesRegex(RuntimeError, 'SHA aprovado'):
            self.call(revision=B)
        self.assertEqual(self.writes, [])

    def test_conflict_on_third_immutable_image_fails_before_any_write(self):
        image = self.module.IMAGES[2]
        self.registry[image + ':0.12.0'] = self.old[image]
        with self.assertRaisesRegex(RuntimeError, 'imutável'):
            self.call()
        self.assertEqual(self.writes, [])

    def test_partial_failure_restores_existing_aliases(self):
        failed = False
        def writer(image, tag, digest):
            nonlocal failed
            self.write(image, tag, digest)
            if not failed and tag == 'latest' and image == self.module.IMAGES[1]:
                failed = True
                raise RuntimeError('registry transient failure after accepted write')
        with self.assertRaisesRegex(RuntimeError, 'Aliases anteriores restaurados'):
            self.call(writer=writer)
        for image, digest in self.old.items():
            for tag in ('0.12', '0', 'production', 'stable', 'latest'):
                self.assertEqual(self.registry[image + ':' + tag], digest)

    def test_failed_rollback_is_reported_as_manual_recovery(self):
        def writer(image, tag, digest):
            if tag == 'latest' and image == self.module.IMAGES[0]:
                raise RuntimeError('registry unavailable')
            self.write(image, tag, digest)
        with self.assertRaisesRegex(RuntimeError, 'Recuperação manual necessária'):
            self.call(writer=writer)

    def test_foreign_image_rejected_without_write(self):
        self.new['ghcr.io/other/project'] = self.new.pop(self.module.IMAGES[0])
        with self.assertRaises(ValueError):
            self.call()
        self.assertEqual(self.writes, [])

    def test_same_digests_can_be_retried_idempotently(self):
        self.call()
        self.call()
        for image, digest in self.new.items():
            self.assertEqual(self.registry[image + ':latest'], digest)


class ApiSafetyTests(unittest.TestCase):
    def test_cross_repository_execution_is_rejected(self):
        with patch.dict(os.environ, {'GITHUB_REPOSITORY': 'other/project', 'GH_TOKEN': 'test-token'}):
            with self.assertRaisesRegex(RuntimeError, 'fora do escopo'):
                auto.GitHub()

    def test_api_redirect_is_never_followed(self):
        with self.assertRaisesRegex(RuntimeError, 'Redirect inesperado'):
            auto.NoRedirect().redirect_request(None, None, 302, 'redirect', {}, 'https://other.invalid')

    def test_forbidden_pr_creation_reports_exact_setting_without_retry(self):
        from io import BytesIO
        from urllib.error import HTTPError
        error = HTTPError('https://api.github.com', 403, 'Forbidden', {}, BytesIO(b'{"message":"Actions may not create PRs"}'))
        opener = Mock()
        opener.open.side_effect = error
        with patch.dict(os.environ, {'GITHUB_REPOSITORY': auto.REPOSITORY, 'GH_TOKEN': 'test-token'}), \
             patch.object(auto, 'build_opener', return_value=opener):
            api = auto.GitHub()
            with self.assertRaisesRegex(RuntimeError, 'Allow GitHub Actions to create and approve pull requests'):
                api.api('/pulls', 'POST', {'head': 'develop', 'base': 'main'})
        self.assertEqual(opener.open.call_count, 1)

    def test_release_cli_rejects_target_different_from_trusted_event_sha(self):
        with patch.dict(os.environ, {'GITHUB_REF': 'refs/heads/main', 'TRUSTED_EVENT_SHA': B, 'TARGET_SHA': H}), \
             patch.object(auto, 'GitHub'), patch.object(sys, 'argv', ['auto_promotion.py', 'verify-release']):
            with self.assertRaisesRegex(RuntimeError, 'checkout arbitrário proibido'):
                auto.main()

    def test_prepare_cli_rejects_invalid_event_before_writes(self):
        with patch.dict(os.environ, {'GITHUB_REF': 'refs/heads/develop', 'GITHUB_EVENT_NAME': 'pull_request'}), \
             patch.object(auto, 'GitHub'), patch.object(sys, 'argv', ['auto_promotion.py', 'prepare']):
            with self.assertRaisesRegex(RuntimeError, 'Origem de execução inválida'):
                auto.main()

    def test_watch_detects_base_race_during_dispatch(self):
        api = FakeGitHub()
        api.pr.update(merged=True, merge_commit_sha=B, state='closed')
        api.runs = [{'display_title': f'PIGE360 stable | 123-1 | {B}', 'head_sha': H,
                     'head_branch': 'main', 'event': 'workflow_dispatch', 'run_attempt': 1,
                     'id': 1, 'html_url': 'https://github.com/example/run/1'}]
        with self.assertRaisesRegex(RuntimeError, 'main mudou durante o dispatch'):
            auto.watch(api, B, '123-1', '7', monotonic=lambda: 0)


class DispatchReconciliationTests(unittest.TestCase):
    def setUp(self):
        self.api = FakeGitHub()
        self.api.pr.update(merged=True, merge_commit_sha=B, state='closed')

    def existing_run(self, status='in_progress', conclusion=None):
        return {'repository': {'full_name': auto.REPOSITORY},
                'head_repository': {'full_name': auto.REPOSITORY},
                'path': '.github/workflows/release.yml', 'display_title': f'PIGE360 stable | 100-1 | {B}',
                'head_branch': 'main', 'head_sha': B, 'event': 'workflow_dispatch',
                'created_at': '2026-10-18T00:01:00Z', 'status': status, 'conclusion': conclusion,
                'id': 99, 'run_attempt': 1, 'html_url': 'https://github.com/example/run/99'}

    def dispatch(self):
        return auto.dispatch(self.api, B, '7', 'minor', '123-2', sleep=lambda _: None)

    def assert_no_dispatch(self):
        self.assertEqual([c for c in self.api.calls if c[0] == 'POST'], [])

    def test_existing_running_run_is_reused(self):
        self.api.runs = [self.existing_run()]
        self.assertEqual(self.dispatch()['run_id'], '99')
        self.assert_no_dispatch()

    def test_completed_success_is_reused_and_reverified(self):
        self.api.runs = [self.existing_run('completed', 'success')]
        result = self.dispatch()
        verify = Mock(return_value={'verified': 'true'})
        auto.watch(self.api, B, result['correlation'], '7', result['run_id'], verify=verify, monotonic=lambda: 0)
        verify.assert_called_once_with(self.api, B)
        self.assert_no_dispatch()

    def test_failed_release_requires_existing_job_retry_not_new_build(self):
        for conclusion in ('failure', 'cancelled', 'timed_out', 'skipped'):
            self.api.runs = [self.existing_run('completed', conclusion)]
            with self.subTest(conclusion=conclusion), self.assertRaisesRegex(RuntimeError, 'Reexecute os jobs'):
                self.dispatch()
        self.assert_no_dispatch()

    def test_retried_failed_run_in_progress_is_reused(self):
        run = self.existing_run()
        run['run_attempt'] = 2
        self.api.runs = [run]
        self.assertEqual(self.dispatch()['run_id'], '99')
        self.assert_no_dispatch()

    def test_uncertain_post_is_not_repeated_and_next_call_reconciles(self):
        original = self.api.api
        def api(path, method='GET', data=None):
            if path.endswith('/dispatches'):
                self.api.calls.append((method, path, data))
                self.api.runs = [self.existing_run()]
                raise RuntimeError('connection lost after accepted dispatch')
            return original(path, method, data)
        self.api.api = api
        with self.assertRaisesRegex(RuntimeError, 'connection lost'):
            self.dispatch()
        self.assertEqual(self.dispatch()['run_id'], '99')
        self.assertEqual(len([c for c in self.api.calls if c[0] == 'POST']), 1)

    def test_same_sha_from_wrong_workflow_or_repository_is_not_trusted(self):
        for field, value in [('path', '.github/workflows/other.yml'),
                             ('repository', {'full_name': 'attacker/repo'}),
                             ('head_repository', {'full_name': 'attacker/repo'}),
                             ('head_branch', 'feature/x'), ('head_sha', M)]:
            run = self.existing_run()
            run[field] = value
            with self.subTest(field=field):
                self.assertFalse(auto.trusted_run(run, B, self.api.pr))

    def test_human_closed_pr_release_is_reused_by_verified_origin(self):
        run = self.existing_run()
        run.update(event='pull_request', head_branch='develop', head_sha=H,
                   display_title=self.api.pr['title'])
        self.api.runs = [run]
        self.assertEqual(self.dispatch()['run_id'], '99')
        self.assert_no_dispatch()

    def test_old_pull_request_run_does_not_authorize_new_merge(self):
        run = self.existing_run()
        run.update(event='pull_request', head_branch='develop', head_sha=H,
                   display_title=self.api.pr['title'], created_at='2026-10-17T00:00:00Z')
        self.assertFalse(auto.trusted_run(run, B, self.api.pr))

    def test_run_success_without_published_contract_is_not_success(self):
        self.api.runs = [self.existing_run('completed', 'success')]
        with self.assertRaisesRegex(RuntimeError, 'manifest missing'):
            auto.watch(self.api, B, '123-1', '7', '99', monotonic=lambda: 0,
                       verify=Mock(side_effect=RuntimeError('manifest missing')))

    def test_published_release_without_run_is_verified_without_post(self):
        import release_state
        with patch.object(release_state, 'releases_for_sha', return_value=[{'draft': False, 'prerelease': False}]):
            result = self.dispatch()
        self.assertEqual(result['published'], 'true')
        verify = Mock(return_value={'verified': 'true'})
        auto.watch(self.api, B, '123-1', published='true', verify=verify)
        verify.assert_called_once()
        self.assert_no_dispatch()

    def test_partial_release_never_triggers_rebuild(self):
        import release_state
        with patch.object(release_state, 'releases_for_sha', return_value=[{'draft': True, 'prerelease': False}]):
            with self.assertRaisesRegex(RuntimeError, 'parcial existente'):
                self.dispatch()
        self.assert_no_dispatch()


class PublishedContractTests(unittest.TestCase):
    def setUp(self):
        import release_state
        self.module = release_state
        self.api = Mock()
        self.release = {'tag_name': '0.12.0', 'draft': False, 'prerelease': False,
                        'html_url': 'https://github.com/example/release/0.12.0'}
        self.images = {image: 'sha256:' + char * 64 for image, char in zip(release_state.IMAGES, 'abc')}
        self.manifest = {'version': '0.12.0', 'commit': H, 'images': self.images}
        self.api.api.side_effect = lambda path: self.release if path.startswith('/releases/') else {'object': {'type': 'commit', 'sha': H}}
        self.loader = Mock(return_value=self.manifest)

    def verify(self, inspector=None, revision=H):
        with patch.object(self.module, 'inspect', side_effect=inspector or (lambda ref: next(d for i, d in self.images.items() if ref.startswith(i + ':')))), \
             patch.object(self.module, 'revision', return_value=revision):
            return self.module.verify_published(self.api, '0.12.0', H, self.loader)

    def test_published_version_is_verified_without_any_mutation(self):
        self.assertEqual(self.verify()['verified'], 'true')
        for call in self.api.api.call_args_list:
            self.assertEqual(len(call.args), 1)

    def test_wrong_commit_in_manifest_is_rejected(self):
        self.manifest['commit'] = B
        with self.assertRaisesRegex(RuntimeError, 'Manifesto difere'):
            self.verify()

    def test_wrong_revision_is_rejected(self):
        with self.assertRaisesRegex(RuntimeError, 'Imagem imutável'):
            self.verify(revision=B)

    def test_drifted_latest_is_not_false_success(self):
        def inspector(ref):
            if ref.endswith(':latest'):
                return 'sha256:' + 'f' * 64
            return next(d for i, d in self.images.items() if ref.startswith(i + ':'))
        with self.assertRaisesRegex(RuntimeError, 'Alias estável divergente'):
            self.verify(inspector=inspector)

    def test_draft_is_not_published_success(self):
        self.release['draft'] = True
        with self.assertRaisesRegex(RuntimeError, 'não é estável publicada'):
            self.verify()

    def test_foreign_images_in_manifest_are_rejected(self):
        self.images['ghcr.io/other/project'] = self.images.pop(self.module.IMAGES[0])
        with self.assertRaisesRegex(RuntimeError, 'exatamente as três'):
            self.verify()

    def test_newer_latest_is_verified_without_repointing_old_aliases(self):
        latest = dict(self.release, tag_name='0.13.0')
        self.api.api.side_effect = lambda path: latest if path == '/releases/latest' else self.release
        with patch.object(self.module, 'verify_manifest', side_effect=[self.manifest, {'version': '0.13.0', 'commit': B}]) as verify:
            result = self.module.verify_published(self.api, '0.12.0', H, self.loader)
        self.assertEqual(result['latest_version'], '0.13.0')
        self.assertTrue(verify.call_args_list[1].kwargs['aliases'])


class PublicationEnvironmentTests(unittest.TestCase):
    def test_both_read_only_verifiers_have_ghcr_auth_and_buildx(self):
        promotion = (ROOT / '.github/workflows/promote-develop.yml').read_text().split('  publication:', 1)[1]
        release = (ROOT / '.github/workflows/release.yml').read_text().split('  verify_published:', 1)[1].split('  bases:', 1)[0]
        for text in (promotion, release):
            with self.subTest(block=text[:60]):
                self.assertIn('contents: read', text)
                self.assertIn('packages: read', text)
                self.assertIn('uses: docker/setup-buildx-action@v3', text)
                self.assertIn('uses: docker/login-action@v3', text)
                self.assertIn('registry: ghcr.io', text)
                self.assertIn('password: ${{ secrets.GITHUB_TOKEN }}', text)
                self.assertIn('GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}', text)
                self.assertNotIn('packages: write', text)
                self.assertNotIn('contents: write', text)
        self.assertIn('auto_promotion.py watch', promotion)
        self.assertIn('release_state.py verify', release)


class EventualConsistencyTests(unittest.TestCase):
    setUp = DispatchReconciliationTests.setUp
    existing_run = DispatchReconciliationTests.existing_run
    assert_no_dispatch = DispatchReconciliationTests.assert_no_dispatch
    def test_previous_post_becomes_visible_during_read_only_settle(self):
        sleep = Mock(side_effect=lambda _: self.api.runs.append(self.existing_run()))
        result = auto.dispatch(self.api, B, '7', 'minor', '123-2', sleep=sleep)
        self.assertEqual(result['run_id'], '99')
        self.assert_no_dispatch()
        sleep.assert_called_once_with(15)

    def test_base_change_during_settle_prevents_post(self):
        sleep = Mock(side_effect=lambda _: setattr(self.api, 'base', R))
        with self.assertRaisesRegex(RuntimeError, 'SHA atual de main'):
            auto.dispatch(self.api, B, '7', 'minor', '123-2', sleep=sleep)
        self.assert_no_dispatch()

    def test_fresh_dispatch_waits_bounded_reads_not_indefinitely(self):
        sleep = Mock()
        auto.dispatch(self.api, B, '7', 'minor', '123-2', sleep=sleep)
        self.assertEqual(sleep.call_count, 3)
        self.assertEqual(len([c for c in self.api.calls if c[0] == 'POST']), 1)


if __name__ == '__main__':
    unittest.main()
