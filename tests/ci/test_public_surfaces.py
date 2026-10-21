"""Contrato do proxy e white-label das superfícies sem Docker ou rede externa."""
import importlib.util
import io
import json
from pathlib import Path
import re
import subprocess
import threading
import unittest
from http.server import ThreadingHTTPServer
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
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
    def serve_website(self):
        server=ThreadingHTTPServer(('127.0.0.1',0),website.Handler)
        thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        self.addCleanup(lambda:(server.shutdown(),server.server_close(),thread.join(timeout=2)))
        return f'http://127.0.0.1:{server.server_port}'

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

    def test_website_selects_the_school_from_the_public_host(self):
        data={'school':{'name':'Escola de Teste','address':'Endereço sintético','phone':'','email':''},
            'identity':IDENTITY,'website':{'theme':'campus','headline':'Publicação por domínio','introduction':'Teste sintético',
            'about':'','notice':'','portal_url':''},'posts':[]}
        calls=[]
        def fake_fetch(path,limit=2*1024*1024,host=''):
            calls.append((path,host));return json.dumps(data).encode(),'application/json'
        base=self.serve_website()
        with patch.object(website,'SCHOOL',''),patch.object(website,'TOKEN','synthetic-website-token'),patch.object(website,'fetch',side_effect=fake_fetch):
            request=Request(base+'/',headers={'Host':'Site-A.Example.Test:443'})
            with urlopen(request,timeout=3) as response:
                body=response.read().decode();self.assertEqual(response.status,200)
                self.assertEqual(len(response.headers['X-Request-ID']),12)
                self.assertIn('Publicação por domínio',body)
                self.assertEqual(response.headers['Content-Security-Policy'].split(';')[0],"default-src 'none'")
        self.assertEqual(calls,[('/api/v1/internal/website/by-host','Site-A.Example.Test:443')])

    def test_public_host_takes_priority_over_a_stale_legacy_school_id(self):
        data={'school':{'name':'Escola correta por domínio','address':'Endereço sintético','phone':'','email':''},
            'identity':IDENTITY,'website':{'theme':'campus','headline':'Domínio prevalece','introduction':'Teste',
            'about':'','notice':'','portal_url':''},'posts':[]}
        calls=[]
        def fake_fetch(path,limit=2*1024*1024,host=''):
            calls.append((path,host));return json.dumps(data).encode(),'application/json'
        base=self.serve_website()
        stale_id='11111111-2222-4333-8444-555555555555'
        with patch.object(website,'SCHOOL',stale_id),patch.object(website,'TOKEN','synthetic-website-token'),patch.object(website,'fetch',side_effect=fake_fetch):
            with urlopen(Request(base+'/',headers={'Host':'site-a.example.test'}),timeout=3) as response:
                body=response.read().decode()
                self.assertEqual(response.status,200)
                self.assertIn('Domínio prevalece',body)
        self.assertEqual(calls,[('/api/v1/internal/website/by-host','site-a.example.test')])

    def test_website_keeps_the_legacy_school_fallback(self):
        data={'school':{'name':'Escola legada de teste','address':'Endereço sintético','phone':'','email':''},
            'identity':IDENTITY,'website':{'theme':'horizon','headline':'Compatibilidade legada','introduction':'Teste',
            'about':'','notice':'','portal_url':''},'posts':[]}
        calls=[]
        def fake_fetch(path,limit=2*1024*1024,host=''):
            calls.append((path,host))
            if path.endswith('/by-host'):
                raise HTTPError('http://app/api/v1/internal/website/by-host',404,'not published',{},io.BytesIO(b''))
            return json.dumps(data).encode(),'application/json'
        base=self.serve_website()
        school_id='11111111-2222-4333-8444-555555555555'
        with patch.object(website,'SCHOOL',school_id),patch.object(website,'TOKEN','synthetic-website-token'),patch.object(website,'fetch',side_effect=fake_fetch):
            with urlopen(base+'/',timeout=3) as response:
                self.assertEqual(response.status,200)
                self.assertIn('Compatibilidade legada',response.read().decode())
        self.assertEqual(calls[0][0],'/api/v1/internal/website/by-host')
        self.assertTrue(calls[0][1])
        self.assertEqual(calls[1],(f'/api/v1/internal/website?school_id={school_id}',''))

    def test_website_readiness_probes_api_and_live_check_does_not(self):
        base=self.serve_website()
        with patch.object(website,'fetch',side_effect=URLError('synthetic connection failure')) as probe:
            with self.assertRaises(HTTPError) as failed:urlopen(base+'/health/ready',timeout=3)
            self.assertEqual(failed.exception.code,503)
            self.assertNotIn('high load',failed.exception.read().decode().lower())
            self.assertEqual(urlopen(base+'/health/live',timeout=3).status,200)
            probe.assert_called_once_with('/health/ready')

    def test_website_does_not_turn_missing_publication_into_a_fake_load_error(self):
        base=self.serve_website()
        error=HTTPError('http://app/api/v1/public/website/by-host',404,'not published',{},io.BytesIO(b'private internal detail'))
        with patch.object(website,'SCHOOL',''),patch.object(website,'TOKEN',''),patch.object(website,'fetch',side_effect=error):
            with self.assertLogs('pige360.website',level='WARNING') as captured:
                with self.assertRaises(HTTPError) as failed:urlopen(Request(base+'/',headers={'Host':'missing.example.test'}),timeout=3)
        body=failed.exception.read().decode()
        self.assertEqual(failed.exception.code,404)
        self.assertIn('não está associado',body)
        self.assertNotIn('private internal detail',body)
        self.assertNotIn('high load',body.lower())
        self.assertIn('category=domain_not_published',captured.output[0])
        self.assertIn('upstream_status=404',captured.output[0])
        self.assertNotIn('missing.example.test',captured.output[0])

    def test_portal_does_not_forward_administrative_routes(self):
        self.assertFalse(portal.allowed('/api/v1/backups','GET'))
        self.assertFalse(portal.allowed('/api/v1/institution/identity','POST'))
        self.assertTrue(portal.allowed('/api/v1/invitations/inspect','POST'))
        for suffix in ('png','ttf','woff2'):
            self.assertTrue(portal.allowed('/api/v1/institution/assets/'+'1'*64+'.'+suffix,'GET'))
        self.assertFalse(portal.allowed('/api/v1/institution/assets/arbitrary.js','GET'))


if __name__=='__main__':unittest.main()
