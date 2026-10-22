"""Contratos de entrada e allowlist do portal escolar, sem ampliar edição administrativa."""
import importlib.util
from pathlib import Path
import subprocess
import unittest

ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('family_portal_proxy',ROOT/'services/portal/server.py')
proxy=importlib.util.module_from_spec(spec);spec.loader.exec_module(proxy)

class FamilyShellTests(unittest.TestCase):
    def test_feed_is_read_only_and_school_scoped(self):
        path='/api/v1/schools/11111111-1111-1111-1111-111111111111/community-feed'
        self.assertTrue(proxy.allowed(path,'GET'))
        for method in ('POST','PATCH','PUT','DELETE','HEAD'):
            self.assertFalse(proxy.allowed(path,method))
        for path in ('/api/v1/schools/../community-feed','/api/v1/schools/any/community-feed','/api/v1/schools/11111111-1111-1111-1111-111111111111/community-posts'):
            self.assertFalse(proxy.allowed(path,'GET'))
    def test_auth_assets_use_existing_application_and_identity(self):
        html=(ROOT/'frontend/public/family.html').read_text()
        self.assertIn('/auth.css',html)
        self.assertIn('/api/v1/institution/theme.css',html)
        self.assertIn('auth.css',proxy.ASSETS)
        self.assertIn('ui-icons.svg',proxy.ASSETS)
        source=(ROOT/'frontend/templates/familyPortal.html').read_text()
        self.assertIn('auth-intro',source);self.assertIn('auth-panel',source)
        self.assertIn('family-navigation',source);self.assertIn('aria-expanded',source)
        self.assertIn('identity.logo_url',source)
        self.assertNotIn('Mariana Costa',source)
        self.assertNotIn('98%',source)
    def test_family_flow(self):
        subprocess.run(['node',str(ROOT/'frontend/tests/family-flow.mjs')],check=True,capture_output=True,text=True)
