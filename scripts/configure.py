#!/usr/bin/env python3
"""Gera segredos locais; nunca sobrescreve uma instalação existente."""
import argparse
import base64
import os
from pathlib import Path
import secrets
from urllib.parse import urlsplit

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--url',default='http://localhost:58080')
    parser.add_argument('--port',type=int,default=None)
    parser.add_argument('--channel',choices=('local','stable','develop'),default='local')
    parser.add_argument('--env-file',default='.env')
    parser.add_argument('--bind',default='127.0.0.1')
    args=parser.parse_args()
    if args.port is None:args.port=58081 if args.channel=='develop' else 58080
    if args.url=='http://localhost:58080' and args.port!=58080:args.url=f'http://localhost:{args.port}'
    url=urlsplit(args.url)
    if url.scheme not in ('http','https') or not url.hostname or url.path not in ('','/') or url.query or url.fragment or url.username or url.password:
        parser.error('Use apenas a origem HTTP(S), sem caminho, credenciais, consulta ou fragmento.')
    if not 1024<=args.port<=65535:parser.error('Porta deve estar entre 1024 e 65535.')
    if args.bind not in ('127.0.0.1','0.0.0.0'):parser.error('Use 127.0.0.1 (padrão) ou 0.0.0.0 (rede externa, exige firewall).')
    if any(c in args.url for c in ['\n','\r','$','#','"',"'"]):parser.error('URL inválida para .env.')
    root=Path(__file__).resolve().parents[1]
    if not args.env_file.startswith('.env') or Path(args.env_file).name!=args.env_file:parser.error('--env-file deve ser um nome local iniciado por .env')
    destination=root/args.env_file
    text=(root/'.env.example').read_text()
    values={'APP_URL':args.url.rstrip('/'),'APP_PORT':str(args.port),'APP_BIND':args.bind,
            'COOKIE_SECURE':'true' if url.scheme=='https' else 'false',
            'ALLOWED_HOSTS':','.join(dict.fromkeys(['localhost','127.0.0.1',url.hostname])),
            'APP_SECRET_KEY':secrets.token_urlsafe(48),'SETUP_TOKEN':secrets.token_urlsafe(32),
            'INTEGRATION_ENCRYPTION_KEY':base64.urlsafe_b64encode(secrets.token_bytes(32)).decode(),
            'POSTGRES_PASSWORD':secrets.token_urlsafe(36),
            'APP_IMAGE':{'local':'pige360-self:0.3.0','stable':'ghcr.io/wkarts/pige360-self:latest','develop':'ghcr.io/wkarts/pige360-self:develop'}[args.channel]}
    lines=[line.split('=',1)[0]+'='+values[line.split('=',1)[0]] if '=' in line and line.split('=',1)[0] in values else line for line in text.splitlines()]
    if args.channel!='local':lines+=['COMPOSE_PROJECT_NAME=pige360-self'+('-develop' if args.channel=='develop' else ''),'APP_PULL_POLICY=always']
    try:
        fd=os.open(destination,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
    except FileExistsError:
        parser.error('.env já existe. Nenhuma credencial foi alterada. Edite a configuração existente com cuidado.')
    with os.fdopen(fd,'w',encoding='utf-8',newline='\n') as handle:handle.write('\n'.join(lines)+'\n')
    print('Arquivo .env criado. Guarde-o com acesso restrito e fora do controle de versão.')
    print('Inicie com: docker compose up -d --build' if args.channel=='local' else f'Inicie com: docker compose --env-file {args.env_file} -f deploy/compose.yaml up -d --wait')
    print('Primeiro acesso: use SETUP_TOKEN do .env e defina seu administrador na interface.')

if __name__=='__main__':main()
