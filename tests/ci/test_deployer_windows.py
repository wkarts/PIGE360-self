"""Windows client keeps untrusted input within one quoted remote checkout path."""
import importlib.util
from pathlib import Path
import unittest


source = Path(__file__).resolve().parents[2] / 'scripts/deployer_windows.py'
spec = importlib.util.spec_from_file_location('deployer_windows', source)
deployer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(deployer)


class WindowsDeployerTest(unittest.TestCase):
    def test_connects_to_loopback_tunnel_with_quoted_checkout(self):
        command = deployer.ssh_command('admin@server.example', "/srv/escola's instance", 58109)
        self.assertIn('127.0.0.1:58109:127.0.0.1:58100', command)
        self.assertIn('BatchMode=yes', command)
        self.assertIn('StrictHostKeyChecking=yes', command)
        self.assertIn('ExitOnForwardFailure=yes', command)
        self.assertEqual(command[-2], 'admin@server.example')
        self.assertIn("cd '/srv/escola'\"'\"'s instance' &&", command[-1])
        self.assertIn('exec python3 scripts/deployer.py --root . --port 58100', command[-1])

    def test_rejects_remote_command_and_relative_path(self):
        for server, path in (('-oProxyCommand=bad@server', '/srv/app'),
                             ('admin@server;false', '/srv/app'),
                             ('admin@server', 'relative'),
                             ('admin@server', '/srv/../app')):
            with self.subTest(server=server, path=path), self.assertRaises(ValueError):
                deployer.ssh_command(server, path)


if __name__ == '__main__':
    unittest.main()
