"""The public website proxies only published photo bytes, never management routes."""
import importlib.util
import io
from pathlib import Path
import threading
import unittest
from http.server import ThreadingHTTPServer
from urllib.error import HTTPError
from urllib.request import urlopen
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('website_asset_proxy',ROOT/'services/website/server.py')
website=importlib.util.module_from_spec(spec);spec.loader.exec_module(website)


class AssetProxyTests(unittest.TestCase):
    def setUp(self):
        server=ThreadingHTTPServer(('127.0.0.1',0),website.Handler)
        thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        self.addCleanup(lambda:(server.shutdown(),server.server_close(),thread.join(timeout=2)))
        self.base=f'http://127.0.0.1:{server.server_port}'
        self.path='/api/v1/public/schools/11111111-2222-4333-8444-555555555555/website-assets/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'

    def test_demo_catalog_assets_have_narrow_jpeg_proxy(self):
        with patch.object(website,'fetch',return_value=(b'jpeg fixture','image/jpeg')) as fetch:
            for name in ['garden','community','library','theatre','lab','sport']:
                path='/api/v1/public/website-model-assets/'+name+'.jpg'
                with urlopen(self.base+path) as response:self.assertEqual(response.read(),b'jpeg fixture')
                fetch.assert_called_with(path,limit=3*1024*1024)
            fetch.reset_mock()
            for path in ['/api/v1/public/website-model-assets/private.jpg','/api/v1/public/website-model-assets/garden.jpg?x=1','/api/v1/public/website-model-assets/garden.png']:
                with self.assertRaises(HTTPError):urlopen(self.base+path)
            fetch.assert_not_called()
        with patch.object(website,'fetch',return_value=(b'unsafe','text/html')):
            with self.assertRaises(HTTPError) as error:urlopen(self.base+'/api/v1/public/website-model-assets/lab.jpg')
            self.assertEqual(error.exception.code,503)

    def test_only_png_public_route_is_forwarded(self):
        with patch.object(website,'fetch',return_value=(b'\x89PNGsynthetic','image/png')) as fetch:
            with urlopen(self.base+self.path) as response:
                self.assertEqual(response.read(),b'\x89PNGsynthetic')
                self.assertEqual(response.headers['Cache-Control'],'no-store')
                self.assertIn("img-src 'self' https:",response.headers['Content-Security-Policy'])
            fetch.assert_called_once_with(self.path,limit=3*1024*1024)
            fetch.reset_mock()
            for path in [self.path+'?token=x','/api/v1/schools/11111111-2222-4333-8444-555555555555/website/assets']:
                with self.assertRaises(HTTPError):urlopen(self.base+path)
            fetch.assert_not_called()

    def test_missing_photo_remains_404_without_private_error(self):
        failure=HTTPError('http://app/private',404,'private upstream detail',{},io.BytesIO(b'sensitive'))
        with patch.object(website,'fetch',side_effect=failure):
            with self.assertRaises(HTTPError) as caught:urlopen(self.base+self.path)
            self.assertEqual(caught.exception.code,404)
            self.assertNotIn('sensitive',caught.exception.read().decode())


    def test_website_payload_limit_is_specific_and_excess_is_rejected(self):
        data=b'{"html":"<h1>Website</h1>"}'
        with patch.object(website,'TOKEN',''),patch.object(website,'fetch',return_value=(data,'application/json')) as fetch:
            with urlopen(self.base+'/') as response:self.assertEqual(response.status,200)
            self.assertEqual(fetch.call_args.kwargs['limit'],8*1024*1024)
        class Upstream:
            headers={'Content-Type':'application/json'}
            def __init__(self,size):self.size=size;self.read_limit=None
            def __enter__(self):return self
            def __exit__(self,*args):pass
            def read(self,limit):self.read_limit=limit;return b'x'*min(limit,self.size)
        from unittest.mock import MagicMock
        for size,allowed in [(8*1024*1024,True),(8*1024*1024+1,False)]:
            upstream=Upstream(size);opener=MagicMock();opener.open.return_value=upstream
            with patch.object(website,'build_opener',return_value=opener):
                if allowed:self.assertEqual(len(website.fetch('/api/v1/public/website/by-host',limit=8*1024*1024)[0]),size)
                else:
                    with self.assertRaises(ValueError):website.fetch('/api/v1/public/website/by-host',limit=8*1024*1024)
            self.assertEqual(upstream.read_limit,8*1024*1024+1)
        # Default remains 2 MB for manifests/readiness/brand assets.
        upstream=Upstream(2*1024*1024+1);opener=MagicMock();opener.open.return_value=upstream
        with patch.object(website,'build_opener',return_value=opener):
            with self.assertRaises(ValueError):website.fetch('/manifest.webmanifest')
        self.assertEqual(upstream.read_limit,2*1024*1024+1)

    def test_real_page_route_preserves_host_and_never_falls_back_after_page_404(self):
        calls=[]
        def fetch(path,limit=2*1024*1024,host=''):
            calls.append((path,host))
            if '?page=missing' in path:raise HTTPError(path,404,'missing page',{},None)
            return (b'{"html":"<h1>Page</h1>"}','application/json')
        with patch.object(website,'TOKEN',''),patch.object(website,'SCHOOL','11111111-2222-4333-8444-555555555555'),patch.object(website,'fetch',side_effect=fetch):
            with urlopen(self.base+'/a-escola') as response:self.assertEqual(response.status,200)
            self.assertEqual([call[0] for call in calls],['/api/v1/public/website/by-host','/api/v1/public/website/by-host?page=a-escola'])
            self.assertTrue(all(host for _,host in calls))
            calls.clear()
            with self.assertRaises(HTTPError) as caught:urlopen(self.base+'/missing')
            self.assertEqual(caught.exception.code,404)
            self.assertEqual([call[0] for call in calls],['/api/v1/public/website/by-host','/api/v1/public/website/by-host?page=missing'])
            calls.clear()
            for path in ['/admin','/online','/family','/api','/assets','/nested/page','/escola.html','/A-escola']:
                with self.assertRaises(HTTPError) as caught:urlopen(self.base+path)
                self.assertEqual(caught.exception.code,404)
            self.assertEqual(calls,[])

    def test_page_uses_legacy_school_only_after_root_host_resolution_fails(self):
        calls=[]
        def fetch(path,limit=2*1024*1024,host=''):
            calls.append(path)
            if path.endswith('/by-host'):raise HTTPError(path,404,'no host',{},None)
            return (b'{"html":"<h1>Page</h1>"}','application/json')
        school='11111111-2222-4333-8444-555555555555'
        with patch.object(website,'TOKEN','token'),patch.object(website,'SCHOOL',school),patch.object(website,'fetch',side_effect=fetch):
            with urlopen(self.base+'/a-escola') as response:self.assertEqual(response.status,200)
        self.assertEqual(calls,['/api/v1/internal/website/by-host','/api/v1/internal/website?school_id='+school,'/api/v1/internal/website?school_id='+school+'&page=a-escola'])
