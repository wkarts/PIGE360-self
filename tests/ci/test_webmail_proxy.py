"""Regression checks for SOGo behind the per-school webmail proxy."""
import importlib.util
from pathlib import Path
import unittest


SOURCE = Path(__file__).resolve().parents[2] / 'backend/app/webmail_proxy.py'
spec = importlib.util.spec_from_file_location('webmail_proxy', SOURCE)
proxy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(proxy)


class WebmailProxyTest(unittest.TestCase):
    prefix = '/webmail/escola-123'
    target = 'http://sogo/SOGo/'
    upstream = 'http://sogo'
    public = 'https://pige360.example.org'

    def location(self, value):
        return proxy.rewrite_location(value, self.target, self.upstream, self.public, self.prefix)

    def test_upstream_absolute_and_relative_redirects_stay_inside_school(self):
        self.assertEqual(self.location('http://sogo/SOGo/so/user/Mail?folder=INBOX'),
                         self.prefix + '/SOGo/so/user/Mail?folder=INBOX')
        self.assertEqual(self.location('/SOGo'), self.prefix + '/SOGo/')
        self.assertEqual(self.location('so/user/Mail'), self.prefix + '/SOGo/so/user/Mail')
        self.assertEqual(self.location('/SOGo.woa/WebServerResources/css/styles.css?lm=1'),
                         self.prefix + '/SOGo.woa/WebServerResources/css/styles.css?lm=1')

    def test_public_redirect_is_not_prefixed_twice(self):
        self.assertEqual(self.location(self.public + self.prefix + '/SOGo/'), self.prefix + '/SOGo/')
        self.assertEqual(self.location('/principals/users/123'), self.prefix + '/principals/users/123')

    def test_external_redirect_or_app_escape_is_rejected(self):
        for location in ('https://attacker.example/SOGo/', '//attacker.example/SOGo/',
                         '/api/v1/admin', self.public + '/other'):
            with self.subTest(location=location), self.assertRaises(ValueError):
                self.location(location)

    def test_session_cookie_paths_follow_proxy(self):
        for path, expected in (('/', self.prefix + '/'), ('/SOGo', self.prefix + '/SOGo'),
                               ('/SOGo/', self.prefix + '/SOGo/'),
                               (self.prefix + '/SOGo/', self.prefix + '/SOGo/'),
                               ('/SOGo.woa/WebServerResources/', self.prefix + '/SOGo.woa/WebServerResources/')):
            with self.subTest(path=path):
                original = 'SOGoSession=test; HttpOnly; Path=' + path + '; SameSite=Lax'
                actual = proxy.rewrite_cookie_path(original, self.prefix)
                self.assertIn('; Path=' + expected + ';', actual)

    def test_internal_cookie_domain_is_not_forwarded_to_browser(self):
        actual = proxy.rewrite_cookie_path('SOGoSession=test; Domain=sogo; Path=/SOGo/; HttpOnly', self.prefix)
        self.assertEqual(actual, 'SOGoSession=test; Path=' + self.prefix + '/SOGo/; HttpOnly')


if __name__ == '__main__':
    unittest.main()
