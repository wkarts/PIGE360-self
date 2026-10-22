"""Site público independente. Apenas GET para API interna e ativos de marca."""
import html
import hashlib
import json
import logging
import os
from pathlib import Path
import re
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.error import HTTPError, URLError
from urllib.request import Request, build_opener, ProxyHandler, HTTPRedirectHandler
from urllib.parse import urlsplit, parse_qs

ORIGIN=os.environ.get('PIGE_INTERNAL_URL','http://app:8000').rstrip('/')
SCHOOL=os.environ.get('WEBSITE_SCHOOL_ID','')
TOKEN=os.environ.get('WEBSITE_INTERNAL_TOKEN','')
logger=logging.getLogger('pige360.website')


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):return None


def fetch(path,limit=2*1024*1024,host=''):
    # O navegador nunca recebe a origem interna nem cookies/sessões do gestor.
    headers={'Host':'localhost','Accept':'application/json'}
    if TOKEN:headers['X-Website-Key']=TOKEN
    if host:
        if len(host)>255 or any(ord(char)<33 or ord(char)>126 for char in host):raise ValueError('Domínio inválido')
        headers['X-Website-Host']=host
    with build_opener(ProxyHandler({}),NoRedirect()).open(Request(ORIGIN+path,headers=headers),timeout=8) as response:
        data=response.read(limit+1)
        if len(data)>limit:raise ValueError('Resposta acima do limite')
        return data,response.headers.get('Content-Type','application/octet-stream')


def error_page(status,message,request_id):
    safe=html.escape(message,quote=True)
    body=('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">'
          '<meta name="viewport" content="width=device-width,initial-scale=1">'
          '<title>Site institucional</title><style>'
          'body{margin:0;padding:24px;background:#f7f8f5;color:#263746;font:16px/1.6 system-ui,sans-serif}'
          'main{box-sizing:border-box;width:min(100%,680px);margin:12vh auto;padding:clamp(20px,5vw,40px);'
          'background:#fff;border:1px solid #d9dfd9;border-radius:12px}h1{font-size:clamp(24px,6vw,34px);line-height:1.2}'
          'p,small{overflow-wrap:anywhere}</style></head><body><main role="alert"><h1>'+('Site em preparação' if status==404 else 'Site institucional indisponível')+'</h1>'
          f'<p>{safe}</p><small>Código de atendimento: {request_id}</small></main></body></html>').encode()
    return body


def render(data):
    if isinstance(data.get('html'),str):return data['html']
    e=lambda value:html.escape(str(value or ''),quote=True)
    school,site,identity=data['school'],data['website'],data['identity']
    name=identity.get('display_name') or school['name']
    theme=site['theme'] if site['theme'] in {'horizon','editorial','campus'} else 'horizon'
    colors=[identity.get('primary_color','#006D77'),identity.get('secondary_color','#0D1B2A')]
    colors=[c if re.fullmatch(r'#[0-9a-fA-F]{6}',c) else '#006D77' for c in colors]
    logo=identity.get('logo_url','')
    logo_html=f'<img class="logo" src="{e(logo)}" alt="">' if re.fullmatch(r'/api/v1/institution/assets/[0-9a-f]{64}\.png',logo) else ''
    portal=site.get('portal_url','')
    valid=urlsplit(portal)
    portal=portal if valid.scheme=='https' and valid.hostname and not valid.username and not valid.password else ''
    action=f'<a class="button" href="{e(portal)}">Matrícula e portal da família <span aria-hidden="true">↗</span></a>' if portal else '<a class="button" href="#contato">Converse com a escola</a>'
    cards=[]
    for post in data['posts']:
        paragraphs=''.join('<p>'+e(p)+'</p>' for p in post['content'].split('\n\n'))
        event=('<p class="date">'+e(post.get('event_start',''))[:16].replace('T',' · ')+' · '+e(post.get('location',''))+'</p>') if post['kind']=='event' else ''
        cards.append(f'<article class="card"><span class="tag">{"Agenda" if post["kind"]=="event" else "Na escola"}</span><h3>{e(post["title"])}</h3>{event}<p>{e(post["summary"])}</p><details><summary>Ler publicação</summary>{paragraphs}</details></article>')
    notice=f'<aside class="notice" role="status">{e(site["notice"])}</aside>' if site.get('notice') else ''
    return f'''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="{e(site['introduction'])}"><meta name="theme-color" content="{colors[0]}"><title>{e(name)}</title><link rel="manifest" href="/manifest.webmanifest"><link rel="icon" type="image/png" href="/api/v1/institution/icon.png?size=32"><link rel="apple-touch-icon" href="/api/v1/institution/icon.png?size=180"><link rel="stylesheet" href="/site.css"><link rel="stylesheet" href="/api/v1/institution/theme.css"><style>:root{{--brand:var(--primary,{colors[0]});--ink:{colors[1]}}}</style></head><body class="{theme}"><a class="skip" href="#conteudo">Ir para o conteúdo</a><header>{logo_html}<a class="wordmark" href="/">{e(name)}</a><nav aria-label="Navegação principal"><a href="#escola">A escola</a><a href="#novidades">Novidades e agenda</a><a href="#contato">Contato</a></nav></header><main id="conteudo"><section class="hero"><div class="hero-copy"><p class="eyebrow">APRENDER · CONVIVER · DESCOBRIR</p><h1>{e(site['headline'])}</h1><p class="lead">{e(site['introduction'])}</p>{action}</div><div class="hero-art" aria-hidden="true"><span class="shape one"></span><span class="shape two"></span><span class="shape three"></span><span class="art-label">Cada descoberta<br>abre um caminho.</span></div></section>{notice}<section id="escola" class="about"><p class="eyebrow">NOSSA ESCOLA</p><h2>Um lugar para crescer.</h2><div class="prose">{''.join('<p>'+e(p)+'</p>' for p in site['about'].split(chr(10)+chr(10)))}</div></section><section id="novidades"><div class="section-head"><div><p class="eyebrow">VIDA EM COMUNIDADE</p><h2>Acontece por aqui.</h2></div><span>Notícias, encontros e próximos passos</span></div><div class="cards">{''.join(cards) or '<p>Em breve, novidades da nossa comunidade.</p>'}</div></section><section id="contato" class="contact"><div><p class="eyebrow">VAMOS CONVERSAR</p><h2>Estamos perto.</h2></div><address>{e(school['address'])}<br>{e(school['phone'])}<br>{e(school['email'])}</address>{action}</section></main><footer><strong>{e(name)}</strong><p>Educação feita de encontros e possibilidades.</p><a href="#conteudo">Voltar ao início ↑</a></footer></body></html>'''


class Handler(BaseHTTPRequestHandler):
    def log_message(self,*_):pass

    def respond(self,status,body,mime,request_id,headers=()):
        self.send_response(status)
        self.send_header('Content-Type',mime)
        self.send_header('Content-Length',str(len(body)))
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('X-Request-ID',request_id)
        self.send_header('Content-Security-Policy',"default-src 'none'; img-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; manifest-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'")
        self.send_header('Referrer-Policy','strict-origin-when-cross-origin')
        for key,value in headers:self.send_header(key,value)
        self.end_headers();self.wfile.write(body)

    def fail(self,status,message,category,request_id,upstream_status=0):
        host=self.headers.get('Host','')
        host_fingerprint=hashlib.sha256(host.encode('utf-8','replace')).hexdigest()[:12]
        path=urlsplit(self.path).path
        route='website' if path=='/' else 'readiness' if path=='/health/ready' else 'public_asset'
        logger.warning('website_request_failed category=%s status=%s upstream_status=%s route=%s request_id=%s host_fingerprint=%s',
                       category,status,upstream_status,route,request_id,host_fingerprint)
        self.respond(status,error_page(status,message,request_id),'text/html; charset=utf-8',request_id)

    def do_GET(self):
        request_id=uuid.uuid4().hex[:12]
        try:
            parsed=urlsplit(self.path);path=parsed.path
            if '%' in path or '..' in path or '\\' in path or self.path.startswith('//'):self.send_error(400);return
            if path=='/health/live':body=b'{"status":"live"}';mime='application/json; charset=utf-8'
            elif path=='/health/ready':
                payload,_=fetch('/health/ready')
                ready=json.loads(payload)
                if not isinstance(ready,dict):raise TypeError('Resposta de readiness inválida')
                if ready.get('status')!='ready':raise RuntimeError('upstream_not_ready')
                body=b'{"status":"ready"}';mime='application/json; charset=utf-8'
            elif path=='/site.css':body=Path(__file__).with_name('site.css').read_bytes();mime='text/css'
            elif path=='/manifest.webmanifest':body,mime=fetch('/manifest.webmanifest?surface=website')
            elif re.fullmatch(r'/api/v1/institution/(?:assets/[0-9a-f]{64}\.(?:png|ttf|woff2)|theme.css|icon.png)',path):
                params=parse_qs(parsed.query,keep_blank_values=True)
                if len(parsed.query)>100 or any(key not in {'size','v'} or len(values)!=1 or not values[0].isdigit() for key,values in params.items()):self.send_error(400);return
                body,mime=fetch(self.path)
            elif path=='/':
                upstream_path='/api/v1/internal/website/by-host' if TOKEN else '/api/v1/public/website/by-host'
                try:
                    payload,_=fetch(upstream_path,host=self.headers.get('Host',''))
                except HTTPError as error:
                    # Resolve the public Host first. Keep the old school-ID behavior only
                    # for installations that have not yet registered this domain.
                    if error.code!=404 or not SCHOOL or not re.fullmatch(r'[0-9a-f-]{36}',SCHOOL):raise
                    upstream_path=f'/api/v1/internal/website?school_id={SCHOOL}' if TOKEN else f'/api/v1/public/schools/{SCHOOL}/website'
                    payload,_=fetch(upstream_path)
                body=render(json.loads(payload)).encode();mime='text/html; charset=utf-8'
            else:self.send_error(404);return
            self.respond(200,body,mime,request_id)
        except HTTPError as error:
            if error.code==404 and path=='/':
                self.fail(404,'Este domínio ainda não está associado a um site publicado da escola.','domain_not_published',request_id,error.code)
            elif error.code==409:
                self.fail(409,'A configuração deste domínio precisa ser revisada pela escola.','domain_conflict',request_id,error.code)
            elif error.code==400:
                self.fail(400,'O domínio informado não é válido.','invalid_domain',request_id,error.code)
            else:self.fail(503,'O site está temporariamente indisponível. Tente novamente em instantes.','upstream_http_error',request_id,error.code)
        except (URLError,TimeoutError,OSError):
            self.fail(503,'O site está temporariamente indisponível. Tente novamente em instantes.','upstream_unavailable',request_id)
        except (json.JSONDecodeError,KeyError,TypeError,AttributeError,IndexError,UnicodeDecodeError):
            self.fail(502,'A publicação não pôde ser carregada com a resposta atual.','invalid_upstream_payload',request_id)
        except RuntimeError:
            self.fail(503,'O site está temporariamente indisponível. Tente novamente em instantes.','upstream_not_ready',request_id)
        except ValueError:
            self.fail(503,'A configuração do site precisa ser revisada pela escola.','invalid_site_configuration',request_id)


if __name__=='__main__':ThreadingHTTPServer(('0.0.0.0',int(os.environ.get('PORT','8080'))),Handler).serve_forever()
