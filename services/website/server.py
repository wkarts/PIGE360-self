"""Site público independente. Apenas GET para API interna e ativos de marca."""
import html
import json
import os
from pathlib import Path
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.error import HTTPError, URLError
from urllib.request import Request, build_opener, ProxyHandler, HTTPRedirectHandler

ORIGIN=os.environ.get('PIGE_INTERNAL_URL','http://app:8000').rstrip('/')
SCHOOL=os.environ.get('WEBSITE_SCHOOL_ID','')
TOKEN=os.environ.get('WEBSITE_INTERNAL_TOKEN','')


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):return None


def fetch(path,limit=2*1024*1024):
    # O navegador nunca recebe a origem interna nem cookies/sessões do gestor.
    with build_opener(ProxyHandler({}),NoRedirect()).open(Request(ORIGIN+path,headers={'Host':'localhost','Accept':'application/json',**({'X-Website-Key':TOKEN} if TOKEN else {})}),timeout=8) as response:
        data=response.read(limit+1)
        if len(data)>limit:raise ValueError('Resposta acima do limite')
        return data,response.headers.get('Content-Type','application/octet-stream')


def render(data):
    e=lambda value:html.escape(str(value or ''),quote=True)
    school,site,identity=data['school'],data['website'],data['identity']
    theme=site['theme'] if site['theme'] in {'horizon','editorial','campus'} else 'horizon'
    colors=[identity.get('primary_color','#006D77'),identity.get('secondary_color','#0D1B2A')]
    colors=[c if re.fullmatch(r'#[0-9a-fA-F]{6}',c) else '#006D77' for c in colors]
    logo=identity.get('logo_url','')
    logo_html=f'<img class="logo" src="{e(logo)}" alt="">' if re.fullmatch(r'/api/v1/institution/assets/[0-9a-f-]{36}',logo) else ''
    portal=site.get('portal_url','')
    from urllib.parse import urlsplit
    valid=urlsplit(portal)
    portal=portal if valid.scheme=='https' and valid.hostname and not valid.username and not valid.password else ''
    action=f'<a class="button" href="{e(portal)}">Matrícula e portal da família <span aria-hidden="true">↗</span></a>' if portal else '<a class="button" href="#contato">Converse com a escola</a>'
    cards=[]
    for post in data['posts']:
        paragraphs=''.join('<p>'+e(p)+'</p>' for p in post['content'].split('\n\n'))
        event=('<p class="date">'+e(post.get('event_start',''))[:16].replace('T',' · ')+' · '+e(post.get('location',''))+'</p>') if post['kind']=='event' else ''
        cards.append(f'<article class="card"><span class="tag">{"Agenda" if post["kind"]=="event" else "Na escola"}</span><h3>{e(post["title"])}</h3>{event}<p>{e(post["summary"])}</p><details><summary>Ler publicação</summary>{paragraphs}</details></article>')
    notice=f'<aside class="notice" role="status">{e(site["notice"])}</aside>' if site.get('notice') else ''
    return f'''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="{e(site['introduction'])}"><title>{e(school['name'])}</title><link rel="stylesheet" href="/site.css"><style>:root{{--brand:{colors[0]};--ink:{colors[1]}}}</style></head><body class="{theme}"><a class="skip" href="#conteudo">Ir para o conteúdo</a><header>{logo_html}<a class="wordmark" href="/">{e(identity.get('display_name') or school['name'])}</a><nav aria-label="Navegação principal"><a href="#escola">A escola</a><a href="#novidades">Novidades e agenda</a><a href="#contato">Contato</a></nav></header><main id="conteudo"><section class="hero"><div class="hero-copy"><p class="eyebrow">APRENDER · CONVIVER · DESCOBRIR</p><h1>{e(site['headline'])}</h1><p class="lead">{e(site['introduction'])}</p>{action}</div><div class="hero-art" aria-hidden="true"><span class="shape one"></span><span class="shape two"></span><span class="shape three"></span><span class="art-label">Cada descoberta<br>abre um caminho.</span></div></section>{notice}<section id="escola" class="about"><p class="eyebrow">NOSSA ESCOLA</p><h2>Um lugar para crescer.</h2><div class="prose">{''.join('<p>'+e(p)+'</p>' for p in site['about'].split(chr(10)+chr(10)))}</div></section><section id="novidades"><div class="section-head"><div><p class="eyebrow">VIDA EM COMUNIDADE</p><h2>Acontece por aqui.</h2></div><span>Notícias, encontros e próximos passos</span></div><div class="cards">{''.join(cards) or '<p>Em breve, novidades da nossa comunidade.</p>'}</div></section><section id="contato" class="contact"><div><p class="eyebrow">VAMOS CONVERSAR</p><h2>Estamos perto.</h2></div><address>{e(school['address'])}<br>{e(school['phone'])}<br>{e(school['email'])}</address>{action}</section></main><footer><strong>{e(school['name'])}</strong><p>Educação feita de encontros e possibilidades.</p><a href="#conteudo">Voltar ao início ↑</a></footer></body></html>'''


class Handler(BaseHTTPRequestHandler):
    def log_message(self,*_):pass

    def do_GET(self):
        try:
            if self.path=='/health/ready':body=b'ok';mime='text/plain'
            elif self.path=='/site.css':body=Path(__file__).with_name('site.css').read_bytes();mime='text/css'
            elif re.fullmatch(r'/api/v1/institution/assets/[0-9a-f-]{36}',self.path):body,mime=fetch(self.path)
            elif self.path=='/':
                if SCHOOL and not re.fullmatch(r'[0-9a-f-]{36}',SCHOOL):raise ValueError('Escola inválida')
                path=f'/api/v1/public/schools/{SCHOOL}/website' if SCHOOL else '/api/v1/public/website'
                if TOKEN:path='/api/v1/internal/website'+('?school_id='+SCHOOL if SCHOOL else '')
                body=render(json.loads(fetch(path)[0])).encode();mime='text/html; charset=utf-8'
            else:self.send_error(404);return
            self.send_response(200)
            self.send_header('Content-Type',mime);self.send_header('Content-Length',str(len(body)))
            self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff')
            self.send_header('Content-Security-Policy',"default-src 'none'; img-src 'self'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'")
            self.send_header('Referrer-Policy','strict-origin-when-cross-origin');self.end_headers();self.wfile.write(body)
        except (HTTPError,URLError,ValueError,KeyError):self.send_error(503,'Site temporariamente indisponivel')


if __name__=='__main__':ThreadingHTTPServer(('0.0.0.0',8080),Handler).serve_forever()
