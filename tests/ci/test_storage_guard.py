"""Regressão do storage-init persistente, sem banco nem dependências externas."""
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import threading
import time
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('storage_guard', ROOT / 'backend/app/storage_guard.py')
guard = importlib.util.module_from_spec(spec)
spec.loader.exec_module(guard)


class StorageTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / 'data'
        self.root.mkdir()
        self.documents = self.root / 'documents'
        self.state = Path(self.temp.name) / 'health.json'

    def prepare(self):
        guard.prepare_storage(self.root, os.geteuid(), os.getegid())

    def snapshot(self, **values):
        payload = dict(healthy=True, monotonic=time.monotonic(), pid=os.getpid(),
                       uid=guard.UID, gid=guard.GID)
        payload.update(values)
        self.state.write_text(json.dumps(payload))

    def test_prepare_is_idempotent_and_preserves_content_and_modes(self):
        self.prepare()
        document = self.documents / 'document.txt'
        document.write_bytes(b'documento existente')
        document.chmod(0o640)
        self.prepare()
        with patch.object(guard.os, 'fchown') as directories, patch.object(guard.os, 'chown') as files:
            self.prepare()
        directories.assert_not_called()
        files.assert_not_called()
        self.assertEqual(document.read_bytes(), b'documento existente')
        self.assertEqual(document.stat().st_mode & 0o777, 0o640)

    def test_prepare_does_not_follow_nested_symlinks(self):
        outside = Path(self.temp.name) / 'outside'
        outside.mkdir()
        document = outside / 'keep.txt'
        document.write_text('fora do volume')
        (self.root / 'external-directory').symlink_to(outside, target_is_directory=True)
        (self.root / 'external-file').symlink_to(document)
        self.prepare()
        self.assertEqual(document.read_text(), 'fora do volume')
        with patch.object(guard.os, 'chown') as changed:
            self.prepare()
        changed.assert_not_called()
        self.assertTrue((self.root / 'external-file').is_symlink())

    def test_prepare_rejects_documents_symlink(self):
        self.documents.symlink_to(Path(self.temp.name), target_is_directory=True)
        with self.assertRaises(OSError):
            self.prepare()

    def test_prepare_rejects_root_symlink(self):
        alias = Path(self.temp.name) / 'alias'
        alias.symlink_to(self.root, target_is_directory=True)
        with self.assertRaises(OSError):
            guard.prepare_storage(alias, os.geteuid(), os.getegid())

    def test_probe_reads_writes_and_removes_only_its_own_file(self):
        self.prepare()
        keep = self.documents / 'existing'
        keep.write_bytes(b'original')
        guard.probe(self.documents)
        self.assertEqual(list(self.documents.iterdir()), [keep])
        self.assertEqual(keep.read_bytes(), b'original')

    def test_probe_does_not_hide_disk_full_and_cleans_up(self):
        self.prepare()
        with patch.object(guard.os, 'write', side_effect=OSError('No space left on device')):
            with self.assertRaises(OSError):
                guard.probe(self.documents)
        self.assertEqual(list(self.documents.iterdir()), [])

    def test_probe_rejects_missing_or_symlink_directory(self):
        with self.assertRaises(OSError):
            guard.probe(self.documents)
        self.documents.symlink_to(self.root, target_is_directory=True)
        with self.assertRaises(OSError):
            guard.probe(self.documents)

    def test_healthy_requires_recent_success(self):
        self.snapshot()
        self.assertTrue(guard.healthy(self.state))
        self.snapshot(healthy=False)
        self.assertFalse(guard.healthy(self.state))
        self.snapshot(monotonic=time.monotonic() - guard.MAX_AGE - 1)
        self.assertFalse(guard.healthy(self.state))
        self.snapshot(monotonic=time.monotonic() + 20)
        self.assertFalse(guard.healthy(self.state))

    def test_healthy_rejects_root_dead_process_and_invalid_payload(self):
        self.snapshot(uid=0)
        self.assertFalse(guard.healthy(self.state))
        self.snapshot()
        with patch.object(guard.os, 'kill', side_effect=ProcessLookupError):
            self.assertFalse(guard.healthy(self.state))
        for data in ('[]', '{}', 'invalid', '{"healthy": true}'):
            self.state.write_text(data)
            self.assertFalse(guard.healthy(self.state))
        self.state.unlink()
        self.assertFalse(guard.healthy(self.state))

    def test_status_is_atomic_and_private(self):
        guard.write_state(True, path=self.state)
        self.assertTrue(json.loads(self.state.read_text())['healthy'])
        self.assertEqual(self.state.stat().st_mode & 0o777, 0o600)
        self.assertFalse(list(self.state.parent.glob('.pige360-storage-state-*')))

    def test_monitor_records_failure_recovery_and_shutdown(self):
        stop = threading.Event()
        states = []
        def write(ok, error, path):
            states.append((ok, error))
            if len(states) == 2:
                stop.set()
        with patch.object(guard, 'probe', side_effect=[OSError('read-only'), None]), \
                patch.object(guard, 'write_state', side_effect=write), \
                patch.object(guard.log, 'error'):
            guard.monitor(stop, self.documents, self.state, interval=0.001)
        self.assertEqual([ok for ok, _ in states], [False, True, False])
        self.assertIn('read-only', states[0][1])

    def test_privileges_drop_groups_before_uid(self):
        calls = []
        with patch.object(guard.os, 'geteuid', side_effect=[0, guard.UID]), \
                patch.object(guard.os, 'getegid', return_value=guard.GID), \
                patch.object(guard.os, 'setgroups', side_effect=lambda _: calls.append('groups')), \
                patch.object(guard.os, 'setgid', side_effect=lambda _: calls.append('gid')), \
                patch.object(guard.os, 'setuid', side_effect=lambda _: calls.append('uid')):
            guard.drop_privileges()
        self.assertEqual(calls, ['groups', 'gid', 'uid'])

    def test_wrong_uid_is_not_reported_as_healthy(self):
        with patch.object(guard.os, 'geteuid', return_value=12345):
            with self.assertRaises(PermissionError):
                guard.drop_privileges()

    def test_all_deploys_wait_for_real_storage_health(self):
        for adapter in ('docker', 'dockge', 'portainer', 'cloudpanel'):
            text = (ROOT / 'deploy' / adapter / 'compose.yaml').read_text()
            storage = text.split('  storage-init:\n', 1)[1].split('\n  app:\n', 1)[0]
            self.assertIn('entrypoint: ["python", "-m", "app.storage_guard"]', storage)
            self.assertIn('"--health"', storage)
            self.assertIn('restart: unless-stopped', storage)
            self.assertIn('cap_drop: ["ALL"]', storage)
            self.assertIn('storage-init: {condition: service_healthy}', text)
            self.assertNotIn('service_completed_successfully', text)
            self.assertNotIn('tail -f', storage)
            self.assertNotIn('sleep infinity', storage)
            self.assertEqual(text.count('ports:'), 1)
            self.assertIn('./data-documents:/data', storage)


if __name__ == '__main__':
    unittest.main()
