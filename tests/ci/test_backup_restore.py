"""Backup local: integração do shell com Compose simulado e arquivos reais."""

import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tarfile
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('verify_backup', ROOT / 'scripts/verify_backup.py')
verify_backup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(verify_backup)


def backup_fixture(folder, members, *, has_roots=None):
    folder.mkdir(parents=True, exist_ok=True)
    (folder / 'database.dump').write_bytes(b'pgdump')
    with tarfile.open(folder / 'documents.tar.gz', 'w:gz') as archive:
        for name, kind, content in members:
            entry = tarfile.TarInfo(name)
            entry.mode = 0o700 if kind == 'dir' else 0o600
            entry.type = {'dir': tarfile.DIRTYPE, 'file': tarfile.REGTYPE,
                          'link': tarfile.SYMTYPE}[kind]
            entry.size = len(content) if kind == 'file' else 0
            if kind == 'link':
                entry.linkname = '../outside'
            archive.addfile(entry, io.BytesIO(content) if kind == 'file' else None)
    manifest = {'format': 'pige360-backup-v1', 'files': {}}
    if has_roots is not None:
        manifest['trust_roots_included'] = has_roots
    for name in ('database.dump', 'documents.tar.gz'):
        manifest['files'][name] = hashlib.sha256((folder / name).read_bytes()).hexdigest()
    (folder / 'manifest.json').write_text(json.dumps(manifest))


class VerifyBackupTests(unittest.TestCase):
    def test_legacy_archive_without_roots_remains_readable(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            backup_fixture(folder, [('documents', 'dir', b''),
                                    ('documents/a.pdf', 'file', b'%PDF-1.4')])
            self.assertFalse(verify_backup.verify(folder))

    def test_rejects_unsafe_paths_links_duplicates_and_root_mismatch(self):
        good = [('documents', 'dir', b'')]
        cases = [
            (good + [('documents/../../escape', 'file', b'x')], False),
            (good + [('documents/link', 'link', b'')], False),
            (good + [('documents/a', 'file', b'x'), ('documents/a', 'file', b'y')], False),
            (good + [('documents/a/b', 'file', b'x')], False),
            (good + [('trust-roots', 'dir', b'')], False),
        ]
        for members, marker in cases:
            with self.subTest(members=members), tempfile.TemporaryDirectory() as tmp:
                folder = Path(tmp)
                backup_fixture(folder, members, has_roots=marker)
                with self.assertRaises(ValueError):
                    verify_backup.verify(folder)


FAKE_DOCKER = '''#!/usr/bin/env python3
import json,os,pathlib,subprocess,sys
args=sys.argv[1:]
assert args[:2]==['compose','--env-file'],args
action=args[5];rest=args[6:]
root=pathlib.Path(os.environ['FAKE_STORAGE'])
with open(os.environ['FAKE_LOG'],'a') as handle:handle.write(action+' '+' '.join(rest)+'\\n')
if action=='config':
    print(json.dumps({'services':{'app':{'environment':{'STORAGE_BACKEND':os.environ['FAKE_BACKEND'],
      'STORAGE_PATH':'/data/documents','SIGNATURE_TRUST_ROOTS_DIR':os.environ.get('FAKE_TRUST_DIR','/data/trust-roots')}}}}))
elif action=='ps':
    print('app\\nworker\\nworker-ocr')
elif action in ('start','stop','up'):
    pass
elif action=='exec':
    if 'pg_dump' in rest[-1]:sys.stdout.buffer.write(b'pgdump')
    elif 'pg_restore' in rest[-1]:(root/'restored.dump').write_bytes(sys.stdin.buffer.read())
    else:sys.stdin.buffer.read()
elif action=='run':
    entrypoint=rest[rest.index('--entrypoint')+1]
    tail=rest[rest.index('app')+1:]
    if entrypoint=='sh':
        tail[tail.index('-c')+1]=tail[tail.index('-c')+1].replace('/data',str(root))
        command=['sh']+tail
    else:
        command=['tar']+[str(root) if value=='/data' else value for value in tail]
    raise SystemExit(subprocess.run(command,stdin=sys.stdin.buffer,stdout=sys.stdout.buffer,stderr=sys.stderr.buffer).returncode)
else:raise SystemExit('Unexpected docker command: '+action)
'''


class BackupRestoreShellTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        base = Path(self.temp.name)
        self.storage = base / 'storage'
        (self.storage / 'documents').mkdir(parents=True)
        (self.storage / 'documents' / 'contrato.pdf').write_bytes(b'contract')
        (self.storage / 'trust-roots').mkdir()
        (self.storage / 'trust-roots' / 'ac.pem').write_bytes(b'certificate')
        bindir = base / 'bin'
        bindir.mkdir()
        (bindir / 'docker').write_text(FAKE_DOCKER)
        (bindir / 'docker').chmod(0o755)
        self.log = base / 'docker.log'
        self.folder = base / 'backup'
        self.environment = {**os.environ, 'PATH': str(bindir) + os.pathsep + os.environ['PATH'],
                            'FAKE_STORAGE': str(self.storage), 'FAKE_LOG': str(self.log),
                            'FAKE_BACKEND': 'local', 'PIGE_STACK_DIR': 'deploy/docker'}

    def shell(self, script, *args):
        return subprocess.run(['sh', str(ROOT / 'scripts' / script), *map(str, args)],
                              cwd=ROOT, env=self.environment, capture_output=True, text=True)

    def test_backup_restore_roundtrip_preserves_document_and_roots(self):
        result = self.shell('backup.sh', self.folder)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(verify_backup.verify(self.folder))
        self.assertTrue(json.loads((self.folder / 'manifest.json').read_text())['trust_roots_included'])
        (self.storage / 'documents' / 'contrato.pdf').write_bytes(b'changed')
        (self.storage / 'trust-roots' / 'ac.pem').write_bytes(b'changed')
        result = self.shell('restore.sh', self.folder, '--confirm-restore')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((self.storage / 'documents' / 'contrato.pdf').read_bytes(), b'contract')
        self.assertEqual((self.storage / 'trust-roots' / 'ac.pem').read_bytes(), b'certificate')
        self.assertEqual((self.storage / 'restored.dump').read_bytes(), b'pgdump')
        log = self.log.read_text()
        self.assertGreaterEqual(log.count('stop worker-ocr worker app'), 2)
        self.assertIn('up -d --no-recreate --pull never --wait --wait-timeout 240 app', log)
        self.assertIn('start worker worker-ocr', log)
        self.assertLess(log.rfind('up -d --no-recreate'), log.rfind('start worker worker-ocr'))

    def test_s3_backup_and_restore_stop_before_modifying_services(self):
        self.environment['FAKE_BACKEND'] = 's3'
        backup = self.shell('backup.sh', self.folder)
        self.assertNotEqual(backup.returncode, 0)
        self.assertIn('STORAGE_BACKEND=s3', backup.stderr)
        self.assertFalse(self.folder.exists())
        backup_fixture(self.folder, [('documents', 'dir', b'')])
        restore = self.shell('restore.sh', self.folder, '--confirm-restore')
        self.assertNotEqual(restore.returncode, 0)
        self.assertIn('STORAGE_BACKEND=s3', restore.stderr)
        self.assertNotIn('stop', self.log.read_text())

    def test_custom_trust_path_fails_before_incomplete_backup(self):
        self.environment['FAKE_TRUST_DIR'] = '/data/other-roots'
        result = self.shell('backup.sh', self.folder)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('SIGNATURE_TRUST_ROOTS_DIR=/data/trust-roots', result.stderr)
        self.assertFalse(self.folder.exists())


if __name__ == '__main__':
    unittest.main()
