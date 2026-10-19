"""Portal com proxy de mesma origem e lista fechada de rotas; nunca acessa o banco."""
import http.client
import os
from pathlib import Path
import re
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from urllib.parse import urlsplit

ORIGIN=os.environ.get('PIGE_INTERNAL_URL','http://app:8000')
PUBLIC=os.environ.get('PORTAL_PUBLIC_URL','').rstrip('/')
STATIC=Path(os.environ.get('FRONTEND_PATH','/portal/public')).resolve()
MAX_BODY=20*1024*1024
ASSETS={'family.js','family.css','portal.js','renders.js','app.css','institution-layout.css','portal.css','community.css','mfa.css','assist.css','camera.css','diagnostic-client.js','first-access.js','first-access.html','favicon.svg','icons/icon-192.png','icons/icon-512.png','vendor/vue-3.5.13.global.prod.js'}


def allowed(path,method):
    if re.fullmatch(r'/api/v1/(?:portal(?:/[^?#]*)?|family(?:/[^?#]*)?)',path):return method in {'GET','POST','PATCH','PUT','DELETE'}
    if re.fullmatch(r'/api/v1/auth/(?:login|refresh|logout|me|mfa(?:/[^?#]*)?)',path):return method in {'GET','POST'}
    if re.fullmatch(r'/api/v1/profile/learning(?:/[0-9a-f-]{36}/report.pdf)?',path):return method=='GET'
    if re.fullmatch(r'/api/v1/invitations/(?:inspect|accept)',path):return method=='POST'
    if re.fullmatch(r'/api/v1/mfa/(?:challenge|verify|recovery|status)(?:/[^?#]*)?',path):return method in {'GET','POST'}
    if re.fullmatch(r'/api/v1/institution/(?:identity|theme.css|icon.png|assets/[0-9a-f-]{36}|fonts/[^/]+)',path):return method=='GET'
    if re.fullmatch(r'/api/v1/support/(?:configuration|context|token)',path):return method in {'GET','POST'}
    return False


class Handler(BaseHTTPRequestHandler):
    def log_message(self,*args):pass
    def respond(self,status,body,mime='text/plain; charset=utf-8',headers=()):
        self.send_response(status);self.send_header('Content-Type',mime);self.send_header('Content-Length',str(len(body)))
        self.send_header('Cache-Control','no-store');self.send_header('Referrer-Policy','no-referrer');self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'")
        for key,value in headers:self.send_header(key,value)
        self.end_headers();self.wfile.write(body)

    def handle_request(self):
        parsed=urlsplit(self.path);path=parsed.path
        if path not in {'/health/ready','/health/live'} and self.headers.get('Host','')!=urlsplit(PUBLIC).netloc:return self.respond(403,b'Host invalid')
        if '%' in path or '\\' in path or '..' in path or self.path.startswith('//'):return self.respond(400,b'Invalid path')
        if path=='/manifest.webmanifest':return self.proxy('/manifest.webmanifest')
        if path=='/sw.js':return self.respond(200,Path(__file__).with_name('sw.js').read_bytes(),'application/javascript')
        if path=='/health/live':return self.respond(200,b'ok')
        if path=='/health/ready':return self.proxy('/health/ready')
        if path.startswith('/api/'):
            if not allowed(path,self.command):return self.respond(404,b'Route unavailable')
            if self.command not in {'GET','HEAD'}:
                if self.headers.get('Origin','').rstrip('/')!=PUBLIC or self.headers.get('X-CSRF-Protection')!='1':return self.respond(403,b'Origin or CSRF invalid')
            return self.proxy(self.path)
        if self.command!='GET':return self.respond(405,b'Method unavailable')
        name='family.html' if path=='/' or re.fullmatch(r'/(?:academic|documents|finance)/?',path) else 'online.html' if path=='/online.html' else path.lstrip('/')
        if name not in ASSETS|{'family.html','online.html'}:return self.respond(404,b'Not found')
        file=STATIC/name
        if not file.is_file():return self.respond(404,b'Not found')
        import mimetypes
        return self.respond(200,file.read_bytes(),mimetypes.guess_type(name)[0] or 'application/octet-stream')

    def proxy(self,path):
        conn=None
        try:
            length=int(self.headers.get('Content-Length','0'))
            if length<0 or length>MAX_BODY or self.headers.get('Transfer-Encoding'):return self.respond(413,b'Body too large')
            target=urlsplit(ORIGIN)
            if target.scheme!='http' or not target.hostname or target.username or target.password or target.path not in ('','/'):raise ValueError()
            conn=http.client.HTTPConnection(target.hostname,target.port or 80,timeout=150)
            headers={key:self.headers[key] for key in ('Content-Type','Cookie','Authorization','X-CSRF-Protection','X-School-ID','Accept') if key in self.headers}
            headers['Host']='localhost'
            if self.command not in {'GET','HEAD'}:headers['Origin']=PUBLIC
            conn.request(self.command,path,body=self.rfile.read(length) if length else None,headers=headers)
            response=conn.getresponse()
            # Resposta privada com limite explícito, sem cache compartilhado.
            forwarded=[(k,v) for k,v in response.getheaders() if k.lower() in {'set-cookie','content-disposition','x-request-id','retry-after'}]
            content=response.read(64*1024*1024+1)
            if len(content)>64*1024*1024:return self.respond(502,b'Response too large')
            self.respond(response.status,content,response.getheader('Content-Type','application/octet-stream'),forwarded)
        except (OSError,ValueError,http.client.HTTPException):self.respond(503,b'{"detail":"Portal temporariamente sem conexao com a escola. Tente novamente."}','application/json')
        finally:
            if conn:conn.close()

    do_GET=handle_request
    do_POST=handle_request
    do_PATCH=handle_request
    do_PUT=handle_request
    do_DELETE=handle_request


if __name__=='__main__':
    public=urlsplit(PUBLIC)
    if not public.hostname or public.scheme not in {'http','https'} or public.path not in ('','/') or public.query or public.fragment or public.username or public.password:raise SystemExit('Configure PORTAL_PUBLIC_URL com a origem pública exata.')
    ThreadingHTTPServer(('0.0.0.0',int(os.environ.get('PORT','8080'))),Handler).serve_forever()
