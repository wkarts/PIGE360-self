"""Contrato do proxy e white-label das superfícies sem Docker ou rede externa."""
import importlib.util
import json
from pathlib import Path
import re
import subprocess
import unittest
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[2]


def module(name,path):
    spec=importlib.util.spec_from_file_location(name,ROOT/path)
    result=importlib.util.module_from_spec(spec);spec.loader.exec_module(result)
    return result


portal=module('tested_portal','services/portal/server.py')
website=module('tested_website','services/website/server.py')
IDENTITY={'display_name':'Colégio & Horizonte','short_name':'Horizonte','primary_color':'#A12255',
    'secondary_color':'#223344','font_family':'custom','version':7,
    'logo_url':'/api/v1/institution/assets/1111111111111111111111111111111111111111111111111111111111111111.png'}


class SurfaceTests(unittest.TestCase):
    def test_first_access_script_survives_refresh_without_javascript_storage(self):
        subprocess.run(['node',str(ROOT/'tests/ci/first-access-session.mjs')],check=True,capture_output=True,text=True)

    def test_forwarded_ip_requires_explicit_peer_and_walks_trusted_chain(self):
        trusted=portal.proxy_networks('127.0.0.1/32,10.2.3.4/32')
        self.assertEqual(portal.client_ip('198.51.100.4','203.0.113.77',trusted),'198.51.100.4')
        self.assertEqual(portal.client_ip('127.0.0.1','203.0.113.77, 198.51.100.4',trusted),'198.51.100.4')
        self.assertEqual(portal.client_ip('127.0.0.1','203.0.113.77,10.2.3.4',trusted),'203.0.113.77')
        self.assertEqual(portal.client_ip('127.0.0.1','invalid',trusted),'127.0.0.1')
        self.assertEqual(portal.client_ip('127.0.0.1',','.join(['1.2.3.4']*21),trusted),'127.0.0.1')
        self.assertEqual(portal.client_ip('127.0.0.1','203.0.113.77',[]),'127.0.0.1')
        self.assertEqual(portal.client_ip('::1','2001:db8::2',portal.proxy_networks('::1/128')),'2001:db8::2')
        for value in ('*','0.0.0.0/0','::/0'):
            with self.subTest(value=value),self.assertRaises(ValueError):portal.proxy_networks(value)

    def test_client_ip_signature_is_bound_to_method_target_and_address(self):
        with patch.object(portal,'INTERNAL_TOKEN','synthetic-portal-service-token-0000000000'),patch.object(portal.time,'time',return_value=1700000000),patch.object(portal,'TRUSTED_PROXIES',[]):
            a=portal.client_headers('POST','/api/v1/auth/login','198.51.100.4','203.0.113.77')
            self.assertEqual(a['X-Pige-Portal-IP'],'198.51.100.4')
            self.assertNotEqual(a['X-Pige-Portal-Signature'],portal.client_headers('POST','/api/v1/auth/login','198.51.100.5')['X-Pige-Portal-Signature'])
            self.assertNotEqual(a['X-Pige-Portal-Signature'],portal.client_headers('GET','/api/v1/auth/login','198.51.100.4')['X-Pige-Portal-Signature'])
            self.assertNotEqual(a['X-Pige-Portal-Signature'],portal.client_headers('POST','/api/v1/auth/login?x=1','198.51.100.4')['X-Pige-Portal-Signature'])
        with patch.object(portal,'INTERNAL_TOKEN',''):self.assertEqual(portal.client_headers('GET','/','198.51.100.4'),{})

    def test_portal_bootstrap_is_escaped_and_uses_canonical_brand(self):
        identity={**IDENTITY,'display_name':'Colégio </script><script>alert(1)</script>'}
        for name,suffix in [('family.html','Portal do aluno e responsável'),('online.html','Portal dos responsáveis'),('first-access.html','Primeiro acesso')]:
            content=(ROOT/'frontend/public'/name).read_text()
            result=portal.branded_html(content,name,identity)
            self.assertIn(' · '+suffix+'</title>',result)
            self.assertNotIn('<script>alert(1)</script>',result)
            bootstrap=json.loads(re.search(r'id="institution-bootstrap">(.*?)</script>',result).group(1))
            self.assertEqual(bootstrap,identity)
            self.assertIn('content="#A12255"',result)
            self.assertIn('institution/theme.css',result)
            self.assertIn('rel="manifest"',result)
            self.assertIn('institution/icon.png?size=32',result)
        self.assertIn('var(--primary', (ROOT/'frontend/public/family.css').read_text())
        self.assertNotIn('background:#006d77',(ROOT/'frontend/public/family.css').read_text())

    def test_site_three_models_keep_layout_and_apply_name_logo_colors_font(self):
        data={'school':{'name':'Nome cadastral distinto','address':'Rua de teste','phone':'123','email':'contact@example.test'},
            'identity':IDENTITY,'website':{'theme':'horizon','headline':'Descobertas','introduction':'Juntos','about':'Nossa escola','notice':'','portal_url':'https://portal.example.test'},'posts':[]}
        for theme in ('horizon','editorial','campus'):
            data['website']['theme']=theme;rendered=website.render(data)
            self.assertIn('body class="'+theme+'"',rendered)
            self.assertIn('<title>Colégio &amp; Horizonte</title>',rendered)
            self.assertIn('<footer><strong>Colégio &amp; Horizonte</strong>',rendered)
            self.assertIn(IDENTITY['logo_url'],rendered)
            self.assertIn('#A12255',rendered);self.assertIn('#223344',rendered)
            self.assertIn('/api/v1/institution/theme.css',rendered)
            self.assertIn('rel="manifest"',rendered)
            self.assertIn('icon.png?size=32',rendered)
            self.assertNotIn('http://app:8000',rendered)
        self.assertIn('var(--institution-font',(ROOT/'services/website/site.css').read_text())
        data['identity']={**IDENTITY,'logo_url':'https://third-party.example/track.png','display_name':'<script>bad</script>'}
        self.assertNotIn('<script>bad</script>',website.render(data))
        self.assertNotIn('track.png',website.render(data))

    def test_portal_does_not_forward_administrative_routes(self):
        self.assertFalse(portal.allowed('/api/v1/backups','GET'))
        self.assertFalse(portal.allowed('/api/v1/institution/identity','POST'))
        self.assertTrue(portal.allowed('/api/v1/invitations/inspect','POST'))
        for suffix in ('png','ttf','woff2'):
            self.assertTrue(portal.allowed('/api/v1/institution/assets/'+'1'*64+'.'+suffix,'GET'))
        self.assertFalse(portal.allowed('/api/v1/institution/assets/arbitrary.js','GET'))


if __name__=='__main__':unittest.main()
