"""SOGo health must catch a login page that hides broken CSS/JavaScript aliases."""
import importlib.util
from email.message import Message
from pathlib import Path
import unittest
from unittest.mock import patch

source = Path(__file__).resolve().parents[2] / 'services/sogo/healthcheck.py'
spec = importlib.util.spec_from_file_location('sogo_healthcheck', source)
health = importlib.util.module_from_spec(spec)
spec.loader.exec_module(health)


class FakeResponse:
    status = 200

    def __init__(self, mime):
        self.headers = Message()
        self.headers['Content-Type'] = mime

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False


class SogoAssetTest(unittest.TestCase):
    def test_broken_static_alias_is_unhealthy_even_if_login_returns_200(self):
        def respond(request, timeout):
            return FakeResponse('text/html' if isinstance(request, str) else 'application/json')

        with patch.object(health, 'helper_running', return_value=True), patch.object(health, 'urlopen', side_effect=respond):
            with self.assertRaises(SystemExit):
                health.main()


if __name__ == '__main__':
    unittest.main()
