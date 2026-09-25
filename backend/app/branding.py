"""HTML inicial público da instituição, sem sessão nem identidade do fornecedor."""
import json
from html import escape
from .config import settings
from .models import Installation
from .institution import public_identity


def branded_html(path, db):
    identity = public_identity(db)
    install = db.get(Installation, 1)
    bootstrap = {**identity, 'configured': bool(install and install.configured),
                 'app_version': settings().app_version}
    # Escapes adicionais devem ser literais JSON, não entidades HTML dentro do script.
    raw = json.dumps(bootstrap, ensure_ascii=True).replace('<', chr(92)+'u003c').replace('>', chr(92)+'u003e').replace('&', chr(92)+'u0026')
    html = path.read_text(encoding='utf-8')
    import re
    title = identity['display_name'] + (' · Portal dos responsáveis' if path.name == 'online.html' else ' · Gestão escolar')
    html = re.sub(r'<title>.*?</title>', lambda _: '<title>'+escape(title)+'</title>', html, count=1)
    html = html.replace('content="#006d77"', 'content="'+identity['primary_color']+'"')
    html = html.replace('/api/v1/institution/theme.css"', '/api/v1/institution/theme.css?v='+str(identity['version'])+'"')
    html = html.replace('icon.png?size=32"', 'icon.png?size=32&v='+str(identity['version'])+'"').replace('icon.png?size=180"', 'icon.png?size=180&v='+str(identity['version'])+'"')
    # A configuração é consumida pelo bundle local; nenhum script inline executável.
    html = html.replace('</head>', '<script type="application/json" id="institution-bootstrap">'+raw+'</script></head>')
    logo = '<img width="72" height="72" src="'+escape(identity['logo_url'], quote=True)+'" alt="">' if identity['logo_url'] else ''
    splash = '<div class="institution-splash" role="status">'+logo+'<strong>'+escape(identity['display_name'])+'</strong><span>Carregando…</span></div>'
    html = html.replace('<div id="app"></div>', '<div id="app">'+splash+'</div>').replace('<div id="portal"></div>', '<div id="portal">'+splash+'</div>')
    return html
