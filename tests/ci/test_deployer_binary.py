"""The frozen deployer invokes bundled Python helpers from the selected checkout."""
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

source = Path(__file__).resolve().parents[2] / 'scripts/deployer.py'
spec = importlib.util.spec_from_file_location('deployer', source)
deployer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(deployer)


class DeployerBinaryTest(unittest.TestCase):
    def test_frozen_binary_executes_only_known_checkout_helpers(self):
        root = Path('/srv/pige360-self')
        with patch.object(deployer.sys, 'frozen', True, create=True), patch.object(deployer.sys, 'executable', '/srv/pige360-self/pige360-deployer-linux-amd64'):
            self.assertEqual(deployer.helper_command(root, 'configure.py', '--channel', 'develop'),
                             ['/srv/pige360-self/pige360-deployer-linux-amd64', '--internal-script',
                              'configure.py', '/srv/pige360-self', '--channel', 'develop'])
            with self.assertRaises(ValueError):
                deployer.helper_command(root, '../../unexpected.py')


if __name__ == '__main__':
    unittest.main()
