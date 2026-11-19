from pathlib import Path
import importlib.util
import tempfile
import unittest


spec = importlib.util.spec_from_file_location('prepare_apt', Path(__file__).resolve().parents[2] / 'scripts/ci/prepare_apt.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class PrepareAptTests(unittest.TestCase):
    def test_azure_ubuntu_mirror_changes_preserving_trust_and_other_repositories(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            sources = root / 'sources.list.d'
            sources.mkdir()
            traditional = root / 'sources.list'
            traditional.write_text('deb [signed-by=/keys/ubuntu.gpg] http://azure.archive.ubuntu.com/ubuntu noble main\n')
            modern = sources / 'ubuntu.sources'
            modern.write_text('Types: deb\nURIs: https://azure.archive.ubuntu.com/ubuntu/\nSuites: noble-updates\nComponents: main universe\nSigned-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg\n')
            other = sources / 'other.list'
            other_content = 'deb [signed-by=/keys/vendor.gpg] https://packages.example.test/ubuntu noble main\n'
            other.write_text(other_content)
            mirrorlist = root / 'apt-mirrors.txt'
            mirrorlist.write_text('http://azure.archive.ubuntu.com/ubuntu\tpriority:1\nhttps://archive.ubuntu.com/ubuntu\tpriority:2\n')
            mirrors = root / 'mirrors'
            mirrors.mkdir()
            nested = mirrors / 'ubuntu.list'
            nested.write_text('https://azure.archive.ubuntu.com/ubuntu/\n')
            self.assertEqual(module.prepare_apt(root), 4)
            self.assertEqual(traditional.read_text(), 'deb [signed-by=/keys/ubuntu.gpg] https://archive.ubuntu.com/ubuntu noble main\n')
            self.assertIn('URIs: https://archive.ubuntu.com/ubuntu/\n', modern.read_text())
            self.assertIn('Suites: noble-updates\nComponents: main universe\nSigned-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg\n', modern.read_text())
            self.assertEqual(other.read_text(), other_content)
            self.assertEqual(mirrorlist.read_text(), 'https://archive.ubuntu.com/ubuntu\tpriority:1\nhttps://archive.ubuntu.com/ubuntu\tpriority:2\n')
            self.assertEqual(nested.read_text(), 'https://archive.ubuntu.com/ubuntu/\n')
            self.assertEqual(module.prepare_apt(root), 0)
            self.assertIn('Acquire::https::Timeout "30";', (root / 'apt.conf.d/80-pige360-ci-network').read_text())

    def test_ec2_runner_uses_official_archive_without_changing_other_sources(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            catalog = root / 'sources.list.d/ubuntu.sources'
            catalog.parent.mkdir()
            mirror = 'http://us-east-2.ec2.archive.ubuntu.com/ubuntu'
            archive = 'https://archive.ubuntu.com/ubuntu'
            metadata = 'Suites: resolute resolute-updates\nSigned-By: /keys/ubuntu.gpg\n'
            catalog.write_text(f'Types: deb\nURIs: {mirror}\n{metadata}')
            mirrors = root / 'apt-mirrors.txt'
            other = 'https://security.ubuntu.com/ubuntu'
            mirrors.write_text(f'{mirror.replace("http:", "https:")}/\tpriority:1\n{other}\n')
            self.assertEqual(module.prepare_apt(root), 2)
            self.assertEqual(catalog.read_text(), f'Types: deb\nURIs: {archive}\n{metadata}')
            self.assertEqual(mirrors.read_text(), f'{archive}/\tpriority:1\n{other}\n')
            self.assertEqual(module.prepare_apt(root), 0)

    def test_runner_mirrorlist_keeps_deb822_indirection_and_rewrites_only_archive_root(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            catalog = root / 'sources.list.d/ubuntu.sources'
            catalog.parent.mkdir()
            source = ('Types: deb\nURIs: mirror+file:/etc/apt/apt-mirrors.txt\n'
                      'Suites: resolute resolute-updates resolute-security\n'
                      'Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg\n')
            catalog.write_text(source)
            mirrors = root / 'apt-mirrors.txt'
            regional = 'http://us-east-2.ec2.archive.ubuntu.com/ubuntu'
            other = (f'{regional}/custom\tpriority:2\n'
                     'https://security.ubuntu.com/ubuntu\tpriority:3\n')
            mirrors.write_text(f'{regional}/\tpriority:1\n' + other)
            self.assertEqual(module.prepare_apt(root), 1)
            self.assertEqual(catalog.read_text(), source)
            self.assertEqual(mirrors.read_text(), 'https://archive.ubuntu.com/ubuntu/\tpriority:1\n' + other)
            self.assertEqual(module.prepare_apt(root), 0)
