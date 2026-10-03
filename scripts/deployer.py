#!/usr/bin/env python3
"""Local visual manager for isolated PIGE360 Compose stacks.

Run on the Docker host and reach 127.0.0.1 through an SSH tunnel. The tool
does not mount docker.sock into the application or expose stack credentials.
"""
import argparse
from http import cookies
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from html import escape
from pathlib import Path
import re
import secrets
import shutil
import subprocess
import sys
from urllib.parse import parse_qs, urlsplit

ROOT = Path(__file__).resolve().parents[1]
INSTANCE_DIR = ROOT / 'deploy' / 'instances'
ADAPTERS = ('docker', 'dockge', 'portainer', 'cloudpanel')
SLUG = re.compile(r'[a-z][a-z0-9-]{2,39}\Z')


def stacks(root=ROOT):
    """Only paths managed by this checkout are eligible for Docker commands."""
    result = {}
    for directory in [*(root / 'deploy' / name for name in ADAPTERS),
                      *((root / 'deploy' / 'instances').glob('*') if (root / 'deploy' / 'instances').is_dir() else ())]:
        if not directory.is_dir() or directory.is_symlink() or not (directory / 'compose.yaml').is_file():
            continue
        if directory.parent.name == 'instances' and not SLUG.fullmatch(directory.name):
            continue
        for env in sorted(directory.glob('.env*')):
            if env.name.endswith('.example') or env.name.startswith('.env.backup-') or env.is_symlink() or not env.is_file():
                continue
            relative = env.relative_to(root).as_posix()
            values = {}
            for line in env.read_text().splitlines():
                if '=' in line and not line.startswith('#'):
                    key, value = line.split('=', 1)
                    if key in {'APP_URL', 'APP_PORT', 'APP_ENV', 'APP_IMAGE', 'COMPOSE_PROJECT_NAME', 'STORAGE_BACKEND'}:
                        values[key] = value
            result[relative] = values
    return result


def create(root, name, channel, url, port):
    if not SLUG.fullmatch(name):
        raise ValueError('Nome: 3 a 40 caracteres, letras minúsculas, números e hífens.')
    if channel not in ('develop', 'stable'):
        raise ValueError('Escolha develop ou stable.')
    parsed = urlsplit(url)
    if (parsed.scheme not in ('http', 'https') or not parsed.hostname or parsed.path not in ('', '/')
            or parsed.query or parsed.fragment or parsed.username or parsed.password):
        raise ValueError('Use somente uma origem HTTP(S) para a URL.')
    if not port.isdecimal() or not 1024 <= int(port) <= 65535:
        raise ValueError('A porta deve estar entre 1024 e 65535.')
    for values in stacks(root).values():
        if values.get('APP_URL', '').rstrip('/') == url.rstrip('/'):
            raise ValueError('Esta URL já pertence a outra stack.')
        if values.get('APP_PORT') == port:
            raise ValueError('Esta porta local já pertence a outra stack.')
    destination = root / 'deploy' / 'instances' / name
    destination.mkdir(mode=0o700, parents=True, exist_ok=False)
    try:
        compose = (root / 'deploy' / 'docker' / 'compose.yaml').read_text()
        # The instance directory is one level deeper than an adapter.
        compose = compose.replace('context: ../../services/', 'context: ../../../services/')
        (destination / 'compose.yaml').write_text(compose)
        env_path = Path('deploy') / 'instances' / name / ('.env.develop' if channel == 'develop' else '.env.production')
        subprocess.run([sys.executable, str(root / 'scripts' / 'configure.py'),
                        '--channel', channel, '--env-file', env_path.as_posix(),
                        '--url', url, '--port', port], cwd=root, check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True, timeout=15)
        return env_path.as_posix()
    except Exception:
        if not any(destination.glob('.env*')):
            shutil.rmtree(destination)
        raise


def deploy(root, env_path):
    available = stacks(root)
    if env_path not in available:
        raise ValueError('Stack não encontrada.')
    if not shutil.which('docker'):
        raise ValueError('Docker Compose não está instalado neste host.')
    env = root / env_path
    compose = env.parent / 'compose.yaml'
    commands = (
        [sys.executable, str(root / 'scripts' / 'prepare-upgrade.py'), '--env-file', env_path],
        ['docker', 'compose', '--env-file', str(env), '-f', str(compose), 'config', '--quiet'],
        ['docker', 'compose', '--env-file', str(env), '-f', str(compose), 'pull'],
        ['docker', 'compose', '--env-file', str(env), '-f', str(compose), 'up', '-d', '--wait'],
    )
    for command in commands:
        try:
            subprocess.run(command, cwd=root, check=True, stdout=subprocess.DEVNULL,
                           stderr=subprocess.PIPE, text=True, timeout=600)
        except FileNotFoundError as error:
            raise ValueError('Docker Compose não está instalado neste host.') from error
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired) as error:
            raise ValueError('Atualização interrompida na etapa ' + ('validar configuração' if 'config' in command else
                'baixar imagens' if 'pull' in command else 'iniciar serviços' if 'up' in command else 'preparar ambiente') +
                '. Confira docker compose e os logs no host.') from error


def serve(port):
    password = secrets.token_urlsafe(32)
    session = secrets.token_urlsafe(32)
    csrf = secrets.token_urlsafe(32)
    origin = f'http://127.0.0.1:{port}'

    class Handler(BaseHTTPRequestHandler):
        def send_html(self, html, status=200, headers=()):
            data = html.encode('utf-8')
            self.send_response(status)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.send_header('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'")
            for key, value in headers:
                self.send_header(key, value)
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def authenticated(self):
            jar = cookies.SimpleCookie()
            try:
                jar.load(self.headers.get('Cookie', ''))
                value = jar['pige_deployer'].value
            except (KeyError, cookies.CookieError):
                return False
            return secrets.compare_digest(value, session)

        def page(self, message=''):
            notice = f'<p role="status">{escape(message)}</p>' if message else ''
            head = ('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width">'
                    '<title>PIGE360 · Deployer</title><style>body{font:16px system-ui;max-width:900px;margin:2em auto;padding:0 1em;background:#f4f7fa;color:#142437}'
                    'section{background:white;padding:1.5em;border-radius:12px;margin:1em 0}label{display:block;margin:.8em 0}input,select,button{font:inherit;padding:.55em;max-width:100%}'
                    'input{width:26em}button{cursor:pointer;background:#12569a;color:white;border:0;border-radius:6px}li{margin:1em 0}</style>'
                    '<h1>PIGE360 · Stacks</h1>')
            if not self.authenticated():
                return head + notice + '<section><form method="post" action="/login"><label>Senha local <input type="password" name="password" required autofocus></label><button>Entrar</button></form></section></html>'
            field = f'<input type="hidden" name="csrf" value="{csrf}">'
            items = ''.join('<li><strong>' + escape(path) + '</strong> · ' +
                escape(v.get('APP_ENV', '')) + ' · ' + escape(v.get('APP_URL', '')) + ' · ' +
                escape(v.get('STORAGE_BACKEND', 'local')) +
                '<form method="post" action="/deploy">' + field +
                '<input type="hidden" name="path" value="' + escape(path, quote=True) + '">' +
                '<button>Atualizar imagens e serviços</button></form></li>'
                for path, v in stacks(ROOT).items())
            return (head + notice + '<section><h2>Stacks deste checkout</h2><ul>' + (items or '<li>Nenhuma stack criada.</li>') +
                '</ul></section><section><h2>Nova stack isolada</h2><p>O ambiente é criado com segredos próprios; '
                'use “Atualizar” para implantar.</p><form method="post" action="/create">' + field +
                '<label>Nome <input name="name" required pattern="[a-z][a-z0-9-]{2,39}" placeholder="navegantes-dev"></label>'
                '<label>Canal <select name="channel"><option value="develop">develop</option><option value="stable">main · latest</option></select></label>'
                '<label>URL <input type="url" name="url" required placeholder="https://dev.exemplo.com.br"></label>'
                '<label>Porta local <input type="number" name="port" min="1024" max="65535" value="58081" required></label>'
                '<button>Criar stack</button></form></section></html>')

        def do_GET(self):
            self.send_html(self.page() if self.path == '/' else 'Não encontrado', 200 if self.path == '/' else 404)

        def do_POST(self):
            if self.path not in ('/login', '/create', '/deploy'):
                return self.send_html('Não encontrado', 404)
            if self.headers.get('Origin') != origin:
                return self.send_html('Origem inválida', 403)
            try:
                length = int(self.headers.get('Content-Length', '0'))
                if not 0 < length <= 4096:
                    raise ValueError('Formulário inválido.')
                form = {key: values[0] for key, values in parse_qs(self.rfile.read(length).decode('utf-8'), keep_blank_values=True).items()}
                if self.path == '/login':
                    if not secrets.compare_digest(form.get('password', ''), password):
                        return self.send_html(self.page('Senha incorreta.'), 403)
                    self.send_response(303)
                    self.send_header('Set-Cookie', f'pige_deployer={session}; HttpOnly; SameSite=Strict; Path=/')
                    self.send_header('Location', '/')
                    self.send_header('Cache-Control', 'no-store')
                    self.end_headers()
                    return
                if not self.authenticated() or not secrets.compare_digest(form.get('csrf', ''), csrf):
                    return self.send_html('Sessão inválida', 403)
                if self.path == '/create':
                    path = create(ROOT, form.get('name', ''), form.get('channel', ''), form.get('url', ''), form.get('port', ''))
                    return self.send_html(self.page('Stack criada: ' + path + '. Revise o .env antes de implantar.'))
                deploy(ROOT, form.get('path', ''))
                return self.send_html(self.page('Stack atualizada; confira a saúde dos serviços no Docker.'))
            except (ValueError, FileExistsError, subprocess.CalledProcessError, subprocess.TimeoutExpired) as error:
                return self.send_html(self.page(str(error) if isinstance(error, ValueError) else 'Não foi possível criar a stack.'), 400)

    print(f'Abra {origin} no host ou por túnel SSH. Senha temporária: {password}', flush=True)
    ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=58100)
    arguments = parser.parse_args()
    if not 1024 <= arguments.port <= 65535:
        parser.error('A porta deve estar entre 1024 e 65535.')
    serve(arguments.port)
