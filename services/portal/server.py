"""Portal de mesma origem. Proxy restrito, identidade pública e IP autenticado."""
import hashlib
import hmac
import html
import http.client
import ipaddress
import json
import os
from pathlib import Path
from functools import lru_cache
import re
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, unquote, urlsplit

ORIGIN=os.environ.get('PIGE_INTERNAL_URL','http://app:8000')
PUBLIC=os.environ.get('PORTAL_PUBLIC_URL','').rstrip('/')
INTERNAL_TOKEN=os.environ.get('PORTAL_INTERNAL_TOKEN','')
STATIC=Path(os.environ.get('FRONTEND_PATH','/portal/public')).resolve()
MAX_BODY=20*1024*1024
ASSETS={'teacher.js','teacher.css','auth.css','ui-icons.svg','family.js','family.css','portal.js','family-renders.js','teacher-renders.js','renders.js','app.css','institution-layout.css','portal.css','community.css','mfa.css','assist.css','camera.css','diagnostic-client.js','first-access.js', 'form-validation.js','first-access.html','favicon.svg','icons/icon-192.png','icons/icon-512.png','vendor/vue-3.5.13.global.prod.js'}


TEACHER_ONLY = os.environ.get('PORTAL_SURFACE', '') == 'teacher'


def proxy_networks(value):
    networks=[]
    for item in value.split(','):
        if not item.strip():continue
        network=ipaddress.ip_network(item.strip(),strict=False)
        if network.prefixlen==0:raise ValueError('PORTAL_TRUSTED_PROXY_IPS não aceita confiança irrestrita.')
        networks.append(network)
    return networks


TRUSTED_PROXIES=proxy_networks(os.environ.get('PORTAL_TRUSTED_PROXY_IPS',''))


def client_ip(peer,forwarded='',trusted=None):
    """Remove somente proxies explicitamente confiáveis, da direita para a esquerda."""
    trusted=TRUSTED_PROXIES if trusted is None else trusted
    address=ipaddress.ip_address(peer)
    if not any(address in net for net in trusted) or not forwarded:return str(address)
    parts=forwarded.split(',')
    if len(parts)>20:return str(address)
    try:chain=[ipaddress.ip_address(part.strip()) for part in parts]+[address]
    except ValueError:return str(address)
    while len(chain)>1 and any(chain[-1] in net for net in trusted):chain.pop()
    return str(chain[-1])


def client_headers(method,path,peer,forwarded=''):
    if not INTERNAL_TOKEN:return {}
    address=client_ip(peer,forwarded)
    timestamp=str(int(time.time()))
    message='\n'.join((timestamp,method,path,address)).encode()
    signature=hmac.new(INTERNAL_TOKEN.encode(),message,hashlib.sha256).hexdigest()
    return {'X-Pige-Portal-IP':address,'X-Pige-Portal-Time':timestamp,'X-Pige-Portal-Signature':signature}


MAIL_METHODS = {'GET','HEAD','POST','PUT','DELETE','OPTIONS','PROPFIND','REPORT','MKCOL','MOVE','COPY'}


def webmail_route(path, method):
    match = re.fullmatch(r'/webmail/[0-9a-f-]{36}/(.+)', path)
    if not match:
        return False
    resource = match[1]
    if resource == 'launch':
        return method == 'POST'
    decoded = unquote(unquote(resource))
    return (method in MAIL_METHODS and len(decoded) <= 4096
            and decoded.startswith(('SOGo/', 'principals/', 'SOGo.woa/WebServerResources/'))
            and not any(part in {'.', '..'} for part in decoded.split('/'))
            and not any(ord(char) < 32 or ord(char) == 127 or char == chr(92) for char in decoded))


def allowed(path,method):
    protocols = re.fullmatch(r'/api/v1/(teacher|family)/schools/[0-9a-f-]{36}/protocols(?:/(.*))?', path)
    if protocols:
        if (protocols[1] == 'teacher') != TEACHER_ONLY:
            return False
        resource = protocols[2]
        if resource is None:
            return method in {'GET', 'POST'}
        if resource == 'opening-channel':
            return method == 'PUT'
        identifier = r'[0-9a-f-]{36}'
        if resource == 'options' or re.fullmatch(identifier, resource) or re.fullmatch(identifier + '/attachments/' + identifier, resource):
            return method == 'GET'
        if re.fullmatch(identifier + '/messages', resource):
            return method == 'POST'
        return method == 'PATCH' and bool(re.fullmatch(identifier + '/channel', resource))
    mail = re.fullmatch(r'/api/v1/schools/[0-9a-f-]{36}/email/(account|webmail-ticket|connection/(?:automatic|linked))', path)
    if mail:
        return method == ('GET' if mail[1] == 'account' else 'POST')
    if path=='/api/v1/support-widget' or re.fullmatch(r'/api/v1/schools/[0-9a-f-]{36}/support-widget',path):return method=='GET'
    if TEACHER_ONLY and not (path.startswith(('/api/v1/teacher/', '/api/v1/auth/', '/api/v1/institution/', '/api/v1/invitations/'))
            or re.fullmatch(r'/api/v1/schools/[0-9a-f-]{36}/community-feed', path)):
        return False
    if not TEACHER_ONLY and path.startswith('/api/v1/teacher/'):
        return False
    if path=='/api/v1/teacher/schools':return method=='GET'
    teacher=re.fullmatch(r'/api/v1/teacher/schools/[0-9a-f-]{36}/(.+)',path)
    if teacher:
        resource=teacher[1]
        if resource in {'programacao','atribuicoes','diaries','academic-periods','curriculum-components','diary-dashboard','diary-entry-fields'}:return method=='GET'
        if resource=='curriculum-plans':return method in {'GET','POST'}
        if re.fullmatch(r'curriculum-plans/[0-9a-f-]{36}',resource):return method=='PATCH'
        diary=re.fullmatch(r'diaries/[0-9a-f-]{36}(?:/(.*))?',resource)
        if not diary:return False
        tail=diary[1] or ''
        if tail in {'','summary','history','assessment-rules','communication-recipients'}:return method=='GET'
        if tail in {'lessons','submit'}:return method=='POST'
        if re.fullmatch(r'lessons/[0-9a-f-]{36}/remove',tail):return method=='POST'
        if tail in {'materials','assessments','opinions','pedagogical-records','communications','occurrences'}:return method in {'GET','POST'}
        if re.fullmatch(r'(lessons/[0-9a-f-]{36}/attendance|assessments/[0-9a-f-]{36}/results)',tail):return method in {'GET','PUT'}
        if re.fullmatch(r'(lessons|assessments|occurrences)/[0-9a-f-]{36}',tail):return method=='PATCH'
        return method=='GET' and bool(re.fullmatch(r'materials/[0-9a-f-]{36}/print\.pdf|periods/[0-9a-f-]{36}/results|reports/[a-z_]+\.pdf',tail))
    if re.fullmatch(r'/api/v1/(?:portal(?:/[^?#]*)?|family(?:/[^?#]*)?)',path):return method in {'GET','POST','PATCH','PUT','DELETE'}
    if re.fullmatch(r'/api/v1/auth/(?:login|refresh|logout|me|mfa(?:/[^?#]*)?)',path):return method in {'GET','POST'}
    if re.fullmatch(r'/api/v1/profile/learning(?:/[0-9a-f-]{36}/report.pdf)?',path):return method=='GET'
    if re.fullmatch(r'/api/v1/schools/[0-9a-f-]{36}/community-feed',path):return method=='GET'
    if re.fullmatch(r'/api/v1/invitations/(?:inspect|accept|password-recovery)',path):return method=='POST'
    if re.fullmatch(r'/api/v1/mfa/(?:challenge|verify|recovery|status)(?:/[^?#]*)?',path):return method in {'GET','POST'}
    if re.fullmatch(r'/api/v1/institution/(?:identity|theme.css|icon.png|assets/[0-9a-f]{64}\.(?:png|ttf|woff2))',path):return method=='GET'
    if re.fullmatch(r'/api/v1/support/(?:configuration|context|token)',path):return method in {'GET','POST'}
    return False


def connection(timeout=150):
    target=urlsplit(ORIGIN)
    if target.scheme!='http' or not target.hostname or target.username or target.password or target.path not in ('','/') or target.query or target.fragment:raise ValueError('Origem interna inválida.')
    return http.client.HTTPConnection(target.hostname,target.port or 80,timeout=timeout)


def branded_html(content,name,identity):
    """Bootstrap público, escapado, sem conta/sessão/segredo interno no HTML."""
    label=str(identity.get('display_name') or 'Sua escola')
    suffix='Portal do Professor' if name=='professor.html' else 'Primeiro acesso' if name=='first-access.html' else 'Portal dos responsáveis' if name=='online.html' else 'Portal do aluno e responsável'
    content=re.sub(r'<title>.*?</title>',lambda _: '<title>'+html.escape(label+' · '+suffix)+'</title>',content,count=1)
    primary=identity.get('primary_color','#006D77')
    if re.fullmatch(r'#[0-9a-fA-F]{6}',primary):content=re.sub(r'(<meta name="theme-color" content=")[^"]*',lambda m:m[1]+primary,content,count=1)
    raw=json.dumps(identity,ensure_ascii=True).replace('<','\\u003c').replace('>','\\u003e').replace('&','\\u0026')
    return content.replace('</head>','<script type="application/json" id="institution-bootstrap">'+raw+'</script></head>')


def portal_csp(upstream=''):
    # O backend já limita script-src aos Hubs habilitados. Conserve as
    # restrições próprias do portal, inclusive o bloqueio de incorporação.
    directive=next((part.split()[1:] for part in upstream.split(';')
                    if part.strip().split()[:1]==['script-src']), [])
    origins=[value for value in directive if re.fullmatch(
        r'https?://(?:[a-zA-Z0-9.-]+|\[[0-9a-fA-F:]+\])(?::[0-9]+)?',value)]
    scripts=' '.join(["'self'",*origins])
    connections=' '.join([scripts,*(value.replace('http','ws',1) for value in origins)])
    styles="'self' 'unsafe-inline'" + (' https://fonts.googleapis.com' if origins else '')
    fonts="'self'" + (' https://fonts.gstatic.com' if origins else '')
    return (f"default-src 'self'; script-src {scripts}; style-src {styles}; img-src 'self' data: blob:; "
            f"font-src {fonts}; connect-src {connections}; frame-src {scripts}; "
            "object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'")


@lru_cache(maxsize=1)
def static_build_id(directory):
    try:
        value = json.loads((directory / 'build-info.json').read_text())['build_id']
        return value if isinstance(value, str) and re.fullmatch(r'[a-f0-9]{16}', value) else ''
    except (OSError, KeyError, ValueError, TypeError):
        return ''


class Handler(BaseHTTPRequestHandler):
    def log_message(self,*args):pass
    def respond(self,status,body,mime='text/plain; charset=utf-8',headers=(),widget_policy='',cache_control='no-store'):
        self.send_response(status);self.send_header('Content-Type',mime);self.send_header('Content-Length',str(len(body)))
        self.send_header('Cache-Control',cache_control);self.send_header('Referrer-Policy','no-referrer');self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Content-Security-Policy',portal_csp(widget_policy))
        for key,value in headers:self.send_header(key,value)
        self.end_headers();self.wfile.write(body)

    def handle_request(self):
        parsed=urlsplit(self.path);path=parsed.path
        if path not in {'/health/ready','/health/live'} and self.headers.get('Host','')!=urlsplit(PUBLIC).netloc:return self.respond(403,b'Host invalid')
        if path.startswith('/webmail/'):
            if not webmail_route(path, self.command):
                return self.respond(404,b'Route unavailable')
            origin = self.headers.get('Origin','').rstrip('/')
            if (origin and origin != PUBLIC) or (self.command not in {'GET','HEAD','OPTIONS'} and origin != PUBLIC):
                return self.respond(403,b'Origin invalid')
            return self.proxy(self.path, webmail=True)
        if '%' in path or '\\' in path or '..' in path or self.path.startswith('//'):return self.respond(400,b'Invalid path')
        if TEACHER_ONLY and path in ('/manifest.webmanifest', '/sw.js'):
            return self.respond(404, b'Not found')
        if path=='/manifest.webmanifest':return self.proxy('/manifest.webmanifest?surface=portal')
        if path=='/sw.js':return self.respond(200,Path(__file__).with_name('sw.js').read_bytes(),'application/javascript')
        if path=='/health/live':return self.respond(200,b'ok')
        if path=='/health/ready':return self.proxy('/health/ready')
        if path.startswith('/api/'):
            if not allowed(path,self.command):return self.respond(404,b'Route unavailable')
            if path.startswith('/api/v1/schools/') and path.endswith('/support-widget'):
                areas=parse_qs(parsed.query,keep_blank_values=True).get('area',['online_enrollment'])
                supported={'teacher_portal'} if TEACHER_ONLY else {'guardian_portal','student_portal','online_enrollment'}
                if len(areas)!=1 or areas[0] not in supported:return self.respond(404,b'Route unavailable')
            if self.command not in {'GET','HEAD'}:
                if self.headers.get('Origin','').rstrip('/')!=PUBLIC or self.headers.get('X-CSRF-Protection')!='1':return self.respond(403,b'Origin or CSRF invalid')
            return self.proxy(self.path)
        if self.command!='GET':return self.respond(405,b'Method unavailable')
        routes = {'/': 'professor.html', '/professor': 'professor.html'} if TEACHER_ONLY else {
            '/': 'family.html', '/family': 'family.html', '/online': 'online.html', '/first-access': 'first-access.html',
            '/academic': 'family.html', '/finance': 'family.html', '/documents': 'family.html'}
        surface_path = '/professor' if TEACHER_ONLY else '/family'
        routes['/first-access'] = routes[surface_path + '/first-access'] = 'first-access.html'
        routes[surface_path + '/recuperar-senha'] = 'first-access.html'
        if path.endswith('.html'):
            legacy = path.removesuffix('.html')
            if legacy not in routes:
                return self.respond(404, b'Not found')
            target = '/' if legacy == '/professor' else legacy
            return self.respond(302, b'', headers=[('Location', target + ('?' + parsed.query if parsed.query else ''))])
        name = routes.get(path.rstrip('/') or '/', path.lstrip('/'))
        teacher_files = {'professor.html', 'teacher.js', 'teacher-renders.js', 'teacher.css', 'guia/professor.webp'}
        shared_files = {'auth.css', 'app.css', 'family.css', 'portal.css', 'institution-layout.css', 'mfa.css',
                        'ui-icons.svg', 'renders.js', 'vendor/vue-3.5.13.global.prod.js', 'favicon.svg', 'first-access.html', 'first-access.js', 'form-validation.js'}
        files = teacher_files | shared_files if TEACHER_ONLY else (ASSETS | {'family.html', 'online.html'}) - teacher_files
        if name not in files:
            return self.respond(404, b'Not found')
        file=STATIC/name
        if not file.is_file():return self.respond(404,b'Not found')
        import mimetypes
        content=file.read_bytes()
        if TEACHER_ONLY and name=='first-access.html':
            content=content.replace(b'<link rel="manifest" href="/manifest.webmanifest">',b'')
        widget_policy=''
        if name.endswith('.html'):
            conn=None
            try:
                conn=connection(timeout=5)
                conn.request('GET','/api/v1/institution/identity',headers={'Host':'localhost'})
                response=conn.getresponse();identity=response.read(65537)
                if response.status==200 and len(identity)<=65536:
                    content=branded_html(content.decode(),name,json.loads(identity)).encode()
                    if name!='first-access.html':widget_policy=response.getheader('Content-Security-Policy') or ''
            except (OSError,ValueError,TypeError,http.client.HTTPException):pass # A UI conserva o estado de indisponibilidade, sem marca inventada.
            finally:
                if conn:conn.close()
        cache_control = 'no-store'
        if name.endswith(('.js', '.css')):
            version = static_build_id(STATIC)
            if version and parse_qs(parsed.query).get('v') == [version]:
                cache_control = 'public, max-age=31536000, immutable'
        return self.respond(200,content,mimetypes.guess_type(name)[0] or 'application/octet-stream',
                            widget_policy=widget_policy,cache_control=cache_control)

    def proxy(self,path,webmail=False):
        conn=None
        try:
            length=int(self.headers.get('Content-Length','0'))
            if length<0 or length>MAX_BODY or self.headers.get('Transfer-Encoding'):return self.respond(413,b'Body too large')
            conn=connection()
            headers={key:self.headers[key] for key in ('Content-Type','Cookie','Authorization','X-CSRF-Protection','X-School-ID','Accept') if key in self.headers}
            if webmail:
                for key in ('Accept-Language','Depth','Destination','Overwrite','If','If-Match','If-None-Match',
                            'If-Modified-Since','Range','X-Requested-With','Prefer'):
                    if key in self.headers:
                        headers[key] = self.headers[key]
            headers['Host']='localhost'
            # Nunca encaminha X-Pige-* recebido. A assinatura é produzida neste serviço.
            headers.update(client_headers(self.command,path,self.client_address[0],','.join(self.headers.get_all('X-Forwarded-For',[]))))
            if webmail or '/email/' in path or self.command not in {'GET','HEAD'}:headers['Origin']=PUBLIC
            conn.request(self.command,path,body=self.rfile.read(length) if length else None,headers=headers)
            response=conn.getresponse()
            forwarded=[(k,v) for k,v in response.getheaders() if k.lower() in {'set-cookie','content-disposition','x-request-id','retry-after'}]
            content=response.read(64*1024*1024+1)
            if len(content)>64*1024*1024:return self.respond(502,b'Response too large')
            if webmail:
                # O CSP do SOGo exige incorporação pela própria origem; o shell continua com frame-ancestors 'none'.
                self.send_response(response.status)
                safe = {'content-type','content-language','content-security-policy','x-frame-options','cache-control',
                        'set-cookie','location','content-disposition','etag','last-modified','accept-ranges','content-range',
                        'referrer-policy','x-content-type-options','x-request-id','retry-after','allow','dav'}
                for key, value in response.getheaders():
                    if key.lower() in safe:
                        self.send_header(key,value)
                self.send_header('Content-Length', response.getheader('Content-Length','0') if self.command=='HEAD' else str(len(content)))
                self.end_headers()
                if self.command!='HEAD':
                    self.wfile.write(content)
                return
            self.respond(response.status,content,response.getheader('Content-Type','application/octet-stream'),forwarded)
        except (OSError,ValueError,http.client.HTTPException):self.respond(503,b'{"detail":"Portal temporariamente sem conexao com a escola. Tente novamente."}','application/json')
        finally:
            if conn:conn.close()

    do_GET=handle_request
    do_POST=handle_request
    do_PATCH=handle_request
    do_PUT=handle_request
    do_DELETE=handle_request
    do_HEAD=handle_request
    do_OPTIONS=handle_request
    do_PROPFIND=handle_request
    do_REPORT=handle_request
    do_MKCOL=handle_request
    do_MOVE=handle_request
    do_COPY=handle_request


if __name__=='__main__':
    public=urlsplit(PUBLIC)
    if not public.hostname or public.scheme not in {'http','https'} or public.path not in ('','/') or public.query or public.fragment or public.username or public.password:raise SystemExit('Configure PORTAL_PUBLIC_URL com a origem pública exata.')
    if INTERNAL_TOKEN and len(INTERNAL_TOKEN.encode())<32:raise SystemExit('PORTAL_INTERNAL_TOKEN exige pelo menos 32 bytes.')
    ThreadingHTTPServer(('0.0.0.0',int(os.environ.get('PORT','8080'))),Handler).serve_forever()
