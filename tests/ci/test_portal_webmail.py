"""Contrato HTTP entre os dois portais e o proxy autenticado do SOGo."""
import http.client
import importlib.util
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('mail_portal_service', Path(__file__).resolve().parents[2]/'services/portal/server.py')
portal = importlib.util.module_from_spec(spec)
spec.loader.exec_module(portal)

SCHOOL = '12345678-1111-2222-3333-123456789012'
MAIL = '/webmail/'+SCHOOL
EMAIL_API = '/api/v1/schools/'+SCHOOL+'/email/'


class PortalMailTests(unittest.TestCase):
    def server(self, handler):
        server=ThreadingHTTPServer(('127.0.0.1',0),handler)
        thread=threading.Thread(target=server.serve_forever,daemon=True)
        thread.start()
        self.addCleanup(lambda:(server.shutdown(),server.server_close(),thread.join()))
        return server

    def test_only_personal_connections_and_sogo_are_forwarded(self):
        for teacher in (False,True):
            with self.subTest(teacher=teacher), patch.object(portal,'TEACHER_ONLY',teacher):
                for route in ('settings','webmail-default','connection','reconcile','mailboxes','send'):
                    for method in ('GET','PUT','POST'):
                        self.assertFalse(portal.allowed(EMAIL_API+route,method))
                self.assertTrue(portal.allowed(EMAIL_API+'account','GET'))
                self.assertTrue(portal.allowed(EMAIL_API+'connection/linked','POST'))
                self.assertTrue(portal.allowed(EMAIL_API+'connection/automatic','POST'))
                self.assertTrue(portal.allowed(EMAIL_API+'webmail-ticket','POST'))
                self.assertFalse(portal.webmail_route(MAIL+'/SOGo/%2e%2e/admin','GET'))
                self.assertFalse(portal.webmail_route(MAIL+'/settings','GET'))
                self.assertFalse(portal.webmail_route(MAIL+'/launch','GET'))

    def test_ticket_redirect_cookie_csp_and_resources_on_both_portals(self):
        class Upstream(BaseHTTPRequestHandler):
            def log_message(self,*args): pass
            def do_POST(self):
                assert self.path == MAIL+'/launch'
                assert self.rfile.read(int(self.headers['Content-Length'])) == b'ticket=test'
                self.send_response(303)
                self.send_header('Location', MAIL+'/SOGo/')
                self.send_header('Set-Cookie','pige_webmail_test=local; Path='+MAIL+'; HttpOnly')
                self.end_headers()
            def do_GET(self):
                assert self.path == MAIL+'/SOGo/so/person%40school/Mail'
                assert self.headers['Cookie'] == 'pige_webmail_test=local'
                self.send_response(200)
                self.send_header('Content-Security-Policy',"frame-ancestors 'self'; script-src 'self' 'unsafe-inline'")
                self.send_header('X-Frame-Options','SAMEORIGIN')
                self.send_header('Content-Type','text/html')
                self.end_headers()
                self.wfile.write(b'<title>SOGo</title>')
        upstream = self.server(Upstream)
        server = self.server(portal.Handler)
        origin = 'http://127.0.0.1:'+str(server.server_port)
        for teacher in (False,True):
            with self.subTest(teacher=teacher), patch.object(portal,'TEACHER_ONLY',teacher), patch.object(portal,'PUBLIC',origin), patch.object(portal,'ORIGIN','http://127.0.0.1:'+str(upstream.server_port)):
                conn = http.client.HTTPConnection('127.0.0.1',server.server_port,timeout=3)
                try:
                    conn.request('POST',MAIL+'/launch',body='ticket=test',headers={'Origin':'https://other.test'})
                    denied = conn.getresponse()
                    self.assertEqual(denied.status,403)
                    denied.read()
                    conn.request('POST',MAIL+'/launch',body='ticket=test',headers={'Origin':origin})
                    launch = conn.getresponse()
                    self.assertEqual(launch.status,303)
                    self.assertEqual(launch.getheader('location'),MAIL+'/SOGo/')
                    cookie = launch.getheader('Set-Cookie').split(';',1)[0]
                    launch.read()
                    conn.request('GET',MAIL+'/SOGo/so/person%40school/Mail',headers={'Cookie':cookie})
                    frame = conn.getresponse()
                    self.assertIn("frame-ancestors 'self'",frame.getheader('Content-Security-Policy'))
                    self.assertEqual(frame.getheader('X-Frame-Options'),'SAMEORIGIN')
                    self.assertIn(b'SOGo',frame.read())
                finally:
                    conn.close()
