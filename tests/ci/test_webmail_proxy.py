"""Regression checks for SOGo behind the per-school webmail proxy."""
import base64
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

    def test_sogo_basic_username_matches_trusted_principal(self):
        principal = 'user-123@school-456'
        headers = proxy.auth_headers(principal, 'mailbox-secret')
        encoded = headers['authorization'].removeprefix('Basic ')
        self.assertEqual(headers['x-webobjects-remote-user'], principal)
        self.assertEqual(headers['x-webobjects-auth-type'], 'Basic')
        self.assertEqual(base64.b64decode(encoded).decode(), principal + ':mailbox-secret')

    def test_only_versioned_static_assets_are_cached_privately(self):
        css = 'SOGo.woa/WebServerResources/css/styles.css'
        self.assertEqual(proxy.cache_control(css, 'lm=123', 200, 'GET'), 'private, max-age=86400')
        for resource, query, status, method in ((css, '', 200, 'GET'),
                                                 (css, 'lm=123', 404, 'GET'),
                                                 ('SOGo/so/u/Mail/view', 'lm=123', 200, 'GET'),
                                                 (css, 'lm=123', 200, 'POST')):
            with self.subTest(resource=resource, status=status, method=method):
                self.assertEqual(proxy.cache_control(resource, query, status, method), 'no-store')

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


    def test_root_relative_urls_in_mail_payloads_stay_in_the_school_proxy(self):
        payload = ('{"body":"<img src=\\\"/SOGo/so/u/Mail/0/folderINBOX/1/signature.png\\\">",'
                   '"attachment":"/SOGo/so/u/Mail/0/folderINBOX/1/file.pdf",'
                   '"css":"url(/SOGo.woa/WebServerResources/fonts/mail.woff2)"}')
        rewritten = proxy.rewrite_resource_urls(payload, self.prefix)
        self.assertIn(self.prefix + '/SOGo/so/u/Mail/0/folderINBOX/1/signature.png', rewritten)
        self.assertIn(self.prefix + '/SOGo/so/u/Mail/0/folderINBOX/1/file.pdf', rewritten)
        self.assertIn(self.prefix + '/SOGo.woa/WebServerResources/fonts/mail.woff2', rewritten)
        self.assertEqual(proxy.rewrite_resource_urls('/webmail/escola-123/SOGo/a', self.prefix),
                         '/webmail/escola-123/SOGo/a')

    def test_only_known_sogo_origins_are_rewritten_in_mail_payloads(self):
        payload = ('{"same":"https://pige360.example.org/SOGo/so/u/Mail/1.png",'
                   '"upstream":"http://sogo/SOGo/so/u/Mail/2.png",'
                   '"external":"https://external.example/SOGo/so/u/Mail/3.png"}')
        rewritten = proxy.rewrite_resource_urls(payload, self.prefix,
                                                ('https://pige360.example.org', 'http://sogo'))
        self.assertIn(self.prefix + '/SOGo/so/u/Mail/1.png', rewritten)
        self.assertIn(self.prefix + '/SOGo/so/u/Mail/2.png', rewritten)
        self.assertIn('https://external.example/SOGo/so/u/Mail/3.png', rewritten)

    def test_textual_sogo_payload_types_and_brand_colors_are_strict(self):
        self.assertTrue(proxy.is_rewritable_content_type('application/json; charset=utf-8'))
        self.assertTrue(proxy.is_rewritable_content_type('text/html'))
        self.assertFalse(proxy.is_rewritable_content_type('image/png'))
        self.assertEqual(proxy.safe_theme_color('#abcdef', '#000'), '#abcdef')
        self.assertEqual(proxy.safe_theme_color('red; background:url(evil)', '#000'), '#000')


if __name__ == '__main__':
    unittest.main()
