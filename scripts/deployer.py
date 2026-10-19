#!/usr/bin/env python3
"""Local visual manager for isolated PIGE360 Compose stacks.

Run on the Docker host and reach 127.0.0.1 through an SSH tunnel. The tool
does not mount docker.sock into the application or expose stack credentials.
"""
import argparse
import json
import base64  # Helper scripts are loaded at runtime by the frozen executable.
from datetime import datetime, timezone
from http import cookies
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from html import escape
from pathlib import Path
import re
import runpy
import secrets
import shutil
import subprocess
import sys
import os
import tempfile
import hashlib
import threading
from uuid import UUID
from urllib.parse import parse_qs, urlsplit

ROOT = Path(sys.executable).resolve().parent if getattr(sys, 'frozen', False) else Path(__file__).resolve().parents[1]
INSTANCE_DIR = ROOT / 'deploy' / 'instances'
ADAPTERS = ('docker', 'dockge', 'portainer', 'cloudpanel')
SLUG = re.compile(r'[a-z][a-z0-9-]{2,39}\Z')


def helper_command(root, script, *args):
    if script not in ('configure.py', 'prepare-upgrade.py'):
        raise ValueError('Operação desconhecida.')
    if getattr(sys, 'frozen', False):
        return [sys.executable, '--internal-script', script, str(root), *args]
    return [sys.executable, str(root / 'scripts' / script), *args]


def run_internal_script(script, root, args):
    if script not in ('configure.py', 'prepare-upgrade.py'):
        raise ValueError('Operação desconhecida.')
    path = root / 'scripts' / script
    if not path.is_file():
        raise ValueError('Arquivos da instalação não encontrados no diretório selecionado.')
    sys.argv = [str(path), *args]
    runpy.run_path(str(path), run_name='__main__')


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
                    if key in {'APP_URL', 'APP_PORT', 'APP_ENV', 'APP_IMAGE', 'COMPOSE_PROJECT_NAME', 'STORAGE_BACKEND','WEBSITE_PUBLIC_URL','WEBSITE_PORT','PORTAL_PUBLIC_URL','PORTAL_PORT','COMPOSE_PROFILES'}:
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
        compose = compose.replace('context: ../../services/', 'context: ../../../services/').replace('context: ../..,','context: ../../..,')
        (destination / 'compose.yaml').write_text(compose)
        env_path = Path('deploy') / 'instances' / name / ('.env.develop' if channel == 'develop' else '.env.production')
        subprocess.run([*helper_command(root, 'configure.py'),
                        '--channel', channel, '--env-file', env_path.as_posix(),
                        '--url', url, '--port', port], cwd=root, check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True, timeout=15)
        return env_path.as_posix()
    except Exception:
        if not any(destination.glob('.env*')):
            shutil.rmtree(destination)
        raise


def deploy(root, env_path,refresh=False):
    available = stacks(root)
    if env_path not in available:
        raise ValueError('Stack não encontrada.')
    if not shutil.which('docker'):
        raise ValueError('Docker Compose não está instalado neste host.')
    env = root / env_path
    compose = env.parent / 'compose.yaml'
    commands = (
        helper_command(root, 'prepare-upgrade.py', '--env-file', env_path, '--track-channel',*(['--refresh-compose'] if refresh else [])),
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


def preview_upgrade(root,env_path):
    if env_path not in stacks(root):raise ValueError('Stack não encontrada.')
    result=subprocess.run(helper_command(root,'prepare-upgrade.py','--env-file',env_path,'--preview'),
        cwd=root,check=True,capture_output=True,text=True,timeout=40)
    return json.dumps(json.loads(result.stdout),ensure_ascii=False,indent=2)


def inspect_stack(root,env_path):
    if env_path not in stacks(root):raise ValueError('Stack não encontrada.')
    command=['docker','compose','--env-file',str(root/env_path),'-f',str((root/env_path).parent/'compose.yaml')]
    result=subprocess.run([*command,'ps','--format','json'],cwd=root,check=True,capture_output=True,text=True,timeout=30)
    parsed=json.loads(result.stdout) if result.stdout.strip().startswith('[') else [json.loads(line) for line in result.stdout.splitlines() if line.strip()]
    health=json.dumps([{key:row.get(key,'') for key in ('Service','State','Health','Status')} for row in parsed],ensure_ascii=False)
    logs=subprocess.run([*command,'logs','--no-color','--tail=60','app','worker','worker-ocr'],cwd=root,check=True,capture_output=True,text=True,timeout=30).stdout[-16000:]
    for line in (root/env_path).read_text().splitlines():
        if '=' in line:
            key,value=line.split('=',1)
            if value and len(value)>=6 and re.search(r'PASSWORD|TOKEN|SECRET|KEY|CREDENTIAL',key):logs=logs.replace(value,'[protegido]')
    logs=re.sub(r'(?i)(bearer\s+|(?:token|api_key|password)[=:]\s*)[^\s,;]+',r'\1[protegido]',logs)
    return health+'\n'+logs


def restore_command(root,env_path):
    if env_path not in stacks(root):raise ValueError('Stack não encontrada.')
    return ['docker','compose','--env-file',str(root/env_path),'-f',str((root/env_path).parent/'compose.yaml')]


def configure_surfaces(root,env_path,website_url,website_port,portal_url,portal_port,website_enabled,portal_enabled):
    available=stacks(root)
    if env_path not in available:raise ValueError('Stack não encontrada.')
    values=available[env_path]
    def origin(value):
        parsed=urlsplit(value)
        if (parsed.scheme not in {'http','https'} or not parsed.hostname or parsed.username or parsed.password
            or parsed.path not in {'','/'} or parsed.query or parsed.fragment
            or any(x in value for x in ('\n','\r','$','#','"',"'"))):raise ValueError('Informe origens públicas exatas, sem caminhos ou credenciais.')
        if parsed.scheme!='https' and parsed.hostname not in {'localhost','127.0.0.1'}:raise ValueError('Domínios públicos de site e portal exigem HTTPS.')
        return value.rstrip('/')
    desired={}
    for key,url,port,enabled in [('WEBSITE',website_url,website_port,website_enabled),('PORTAL',portal_url,portal_port,portal_enabled)]:
        if enabled or url:
            desired[key+'_PUBLIC_URL']=origin(url)
        if not port.isdecimal() or not 1024<=int(port)<=65535:raise ValueError('Portas devem estar entre 1024 e 65535.')
        desired[key+'_PORT']=port
    used=[values.get('APP_PORT'),website_port if website_enabled else None,portal_port if portal_enabled else None]
    used=[p for p in used if p]
    if len(set(used))!=len(used):raise ValueError('Gestor, site e portal precisam de portas distintas.')
    for path,other in available.items():
        if path!=env_path and any(port in used for key,port in other.items() if key.endswith('_PORT')):raise ValueError('Uma das portas pertence a outra stack deste checkout.')
    destination=root/env_path;original=destination.read_text();lines=original.splitlines()
    old=dict(line.split('=',1) for line in lines if '=' in line and not line.lstrip().startswith('#'))
    profiles={x for x in old.get('COMPOSE_PROFILES','').split(',') if x}
    for profile,enabled in [('website',website_enabled),('portal',portal_enabled)]:
        if enabled:profiles.add(profile)
        else:profiles.discard(profile)
    desired['COMPOSE_PROFILES']=','.join(sorted(profiles))
    if portal_enabled and values.get('APP_URL','').rstrip('/')==desired.get('PORTAL_PUBLIC_URL'):raise ValueError('O domínio do portal deve ser distinto do gestor.')
    if website_enabled and website_url.rstrip('/') in {values.get('APP_URL','').rstrip('/'),portal_url.rstrip('/') if portal_enabled else ''}:raise ValueError('O site deve usar domínio próprio.')
    stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    backup=destination.with_name('.env.backup-'+stamp);shutil.copyfile(destination,backup);backup.chmod(0o600)
    updated=[]
    for line in lines:
        key=line.split('=',1)[0]
        updated.append(key+'='+desired[key] if key in desired else line)
    updated.extend(key+'='+value for key,value in desired.items() if key not in old)
    temp=destination.with_name('.env.surfaces-'+stamp)
    try:
        temp.write_text('\n'.join(updated)+'\n');temp.chmod(0o600)
        command=['docker','compose','--env-file',str(temp),'-f',str(destination.parent/'compose.yaml'),'config','--quiet']
        subprocess.run(command,cwd=root,check=True,capture_output=True,text=True,timeout=40)
        temp.replace(destination)
    finally:temp.unlink(missing_ok=True)
    return 'Configuração validada e salva. Gestor, SMTP, WhatsApp, segredos, volumes e projeto preservados. Confira diferenças antes de atualizar serviços.'


def restore_plans(root,env_path):
    command=restore_command(root,env_path)
    result=subprocess.run([*command,'run','--rm','--no-deps','-T','--entrypoint','python','app','-m','app.restore_control','list'],cwd=root,check=True,capture_output=True,text=True,timeout=60)
    return json.loads(result.stdout)


def restore_state_dir(root,env_path):
    values=stacks(root)
    if env_path not in values:raise ValueError('Stack não encontrada.')
    # Mesmo projeto Compose usa a mesma exclusão mútua, inclusive entre arquivos env.
    identity=values[env_path].get('COMPOSE_PROJECT_NAME') or str((root/env_path).parent)
    directory=root/'deploy'/'restore-state'/hashlib.sha256(identity.encode()).hexdigest()
    directory.mkdir(parents=True,exist_ok=True,mode=0o700)
    return directory


def restore_history(root,env_path):
    import fcntl
    directory=restore_state_dir(root,env_path)
    rows=[]
    for path in directory.glob('*.json'):
        row=json.loads(path.read_text())
        if row['status']=='processing':
            with (directory/'execution.lock').open('a') as lock:
                try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
                except BlockingIOError:pass
                else:
                    row['status']='interrupted';row['error_code']='DEPLOYER_INTERRUPTED_KEEP_SERVICES_STOPPED'
                    path.write_text(json.dumps(row))
        rows.append(row)
    return sorted(rows,key=lambda r:r['created_at'],reverse=True)


def start_restore(root,env_path,ident,confirmation):
    import fcntl
    if str(UUID(ident))!=ident:raise ValueError('Plano inválido.')
    plan=next((p for p in restore_plans(root,env_path) if p['id']==ident),None)
    if not plan or plan['status']!='prepared' or plan['expires_at']<datetime.now(timezone.utc).isoformat():raise ValueError('Prepare novamente o plano na administração. Ele precisa estar válido e não utilizado.')
    if confirmation!=plan['confirmation']:raise ValueError('Digite exatamente a confirmação mostrada no plano. Nenhum serviço foi parado.')
    command=restore_command(root,env_path);directory=restore_state_dir(root,env_path)
    lock=(directory/'execution.lock').open('a')
    try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
    except BlockingIOError:
        lock.close();raise ValueError('Já existe restauração em andamento nesta stack.')
    path=directory/(ident+'.json')
    if path.exists():
        lock.close();raise ValueError('Este plano já possui execução. Consulte o resultado; não o repita automaticamente.')
    row={'id':ident,'status':'processing','stage':'validating','created_at':datetime.now(timezone.utc).isoformat(),'error_code':''}
    def save():
        temporary=path.with_suffix('.part');temporary.write_text(json.dumps(row));temporary.chmod(0o600);temporary.replace(path)
    save()
    def run():
        def execute(args,timeout=120):return subprocess.run([*command,*args],cwd=root,check=True,capture_output=True,text=True,timeout=timeout)
        try:
            execute(['config','--quiet'])
            # Verifica o pacote outra vez antes de interromper os serviços.
            execute(['run','--rm','--no-deps','-T','--entrypoint','python','app','-m','app.restore_control','inspect',ident])
            config=json.loads(execute(['config','--format','json']).stdout)
            writers=[name for name in config['services'] if name not in {'db','minio','storage-init'}]
            row['stage']='stopping_services';save();execute(['stop',*writers])
            row['stage']='protecting_and_restoring';save()
            execute(['run','--rm','--no-deps','-T','--entrypoint','python','app','-m','app.restore_control','execute',ident],timeout=1800)
            row['stage']='verifying_result';save()
            completed=next((p for p in restore_plans(root,env_path) if p['id']==ident),None)
            if not completed or completed['status']!='completed':raise ValueError('Restore not completed')
            row['stage']='starting_and_checking_health';save();execute(['up','-d','--wait'],timeout=600)
            row['status']='completed';row['stage']='completed';save()
        except BaseException:
            row['status']='failed';row['error_code']='RESTORE_FAILED_KEEP_SERVICES_STOPPED';save()
            if 'writers' in locals():
                try:execute(['stop',*writers])
                except Exception:pass
        finally:lock.close()
    threading.Thread(target=run,daemon=True,name='restore-'+ident[:8]).start()
    return row


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
                '<label><input type="checkbox" name="refresh" value="yes"> Incluir evolução do Compose preservando parâmetros</label><button>Atualizar imagens e serviços</button></form>' +
                '<form method="post" action="/preview">'+field+'<input type="hidden" name="path" value="'+escape(path,quote=True)+'"><button>Conferir diferenças</button></form>'+
                '<form method="post" action="/inspect">'+field+'<input type="hidden" name="path" value="'+escape(path,quote=True)+'"><button>Saúde e logs</button></form>'+
                '<form method="post" action="/restore-plans">'+field+'<input type="hidden" name="path" value="'+escape(path,quote=True)+'"><button>Consultar planos de restauração</button></form>'+
                '<form method="post" action="/restore-history">'+field+'<input type="hidden" name="path" value="'+escape(path,quote=True)+'"><button>Acompanhar restauração</button></form>'+
                '<details><summary>Configurar site e portal independentes</summary><form method="post" action="/surfaces">'+field+'<input type="hidden" name="path" value="'+escape(path,quote=True)+'">'+
                '<label><input type="checkbox" name="website_enabled" value="yes" '+('checked' if 'website' in v.get('COMPOSE_PROFILES','').split(',') else '')+'> Habilitar site</label><label>URL pública do site<input name="website_url" value="'+escape(v.get('WEBSITE_PUBLIC_URL',''),quote=True)+'"></label><label>Porta do site<input name="website_port" value="'+escape(v.get('WEBSITE_PORT','58082'),quote=True)+'"></label>'+
                '<label><input type="checkbox" name="portal_enabled" value="yes" '+('checked' if 'portal' in v.get('COMPOSE_PROFILES','').split(',') else '')+'> Habilitar portal</label><label>URL pública do portal<input name="portal_url" value="'+escape(v.get('PORTAL_PUBLIC_URL',''),quote=True)+'"></label><label>Porta do portal<input name="portal_port" value="'+escape(v.get('PORTAL_PORT','58083'),quote=True)+'"></label><p>O conteúdo e a marca do site continuam administrados pelo PIGE. Configure o proxy reverso de cada domínio antes de liberar o acesso externo.</p><button>Validar e salvar configuração</button></form></details>'+
                '<form method="post" action="/restore">'+field+'<input type="hidden" name="path" value="'+escape(path,quote=True)+'"><label>ID do plano preparado no gestor<input name="id" required></label><p>Substitui o banco e repõe arquivos de toda a instalação. Para os serviços, preserva o estado anterior e revoga sessões. Falhas exigem recuperação antes de liberar a escola.</p><label>Confirmação exibida no plano<input name="confirmation" required autocomplete="off"></label><button>Confirmar restauração destrutiva</button></form></li>'
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
            if self.path not in ('/login', '/create', '/deploy','/preview','/inspect','/restore-plans','/restore-history','/restore','/surfaces'):
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
                if self.path=='/preview':return self.send_html(self.page(preview_upgrade(ROOT,form.get('path',''))))
                if self.path=='/inspect':return self.send_html(self.page(inspect_stack(ROOT,form.get('path',''))))
                if self.path=='/surfaces':return self.send_html(self.page(configure_surfaces(ROOT,form.get('path',''),form.get('website_url',''),form.get('website_port',''),form.get('portal_url',''),form.get('portal_port',''),form.get('website_enabled')=='yes',form.get('portal_enabled')=='yes')))
                if self.path=='/restore-plans':return self.send_html(self.page(json.dumps(restore_plans(ROOT,form.get('path','')),ensure_ascii=False,indent=2)))
                if self.path=='/restore-history':return self.send_html(self.page(json.dumps(restore_history(ROOT,form.get('path','')),ensure_ascii=False,indent=2)))
                if self.path=='/restore':
                    start_restore(ROOT,form.get('path',''),form.get('id',''),form.get('confirmation',''))
                    return self.send_html(self.page('Restauração iniciada. Use Acompanhar restauração. Não feche o deployer durante a operação.'))
                deploy(ROOT, form.get('path', ''),refresh=form.get('refresh')=='yes')
                return self.send_html(self.page('Stack atualizada; confira a saúde dos serviços no Docker.'))
            except (ValueError, FileExistsError, subprocess.CalledProcessError, subprocess.TimeoutExpired) as error:
                return self.send_html(self.page(str(error) if isinstance(error, ValueError) else 'Não foi possível criar a stack.'), 400)

    print(f'Abra {origin} no host ou por túnel SSH. Senha temporária: {password}', flush=True)
    ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()


if __name__ == '__main__':
    if len(sys.argv) >= 4 and sys.argv[1] == '--internal-script':
        run_internal_script(sys.argv[2], Path(sys.argv[3]).resolve(), sys.argv[4:])
        raise SystemExit(0)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=58100)
    parser.add_argument('--root', type=Path, default=ROOT, help='Checkout PIGE360 com deploy/ e scripts/.')
    arguments = parser.parse_args()
    if not 1024 <= arguments.port <= 65535:
        parser.error('A porta deve estar entre 1024 e 65535.')
    ROOT = arguments.root.resolve()
    if not (ROOT / 'deploy' / 'docker' / 'compose.yaml').is_file() or not (ROOT / 'scripts' / 'configure.py').is_file():
        parser.error('--root deve apontar para um checkout PIGE360 com deploy/ e scripts/.')
    serve(arguments.port)
