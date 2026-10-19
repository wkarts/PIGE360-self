#!/usr/bin/env python3
"""Atualiza somente a configuração da versão; preserva credenciais e faz backup."""
import base64
from datetime import datetime, timezone
import os
from pathlib import Path
import re
import secrets
import shutil
import tempfile
import argparse
import json
import subprocess

def refresh_compose(root,env_path,preview=False):
    target=root/env_path.parent/'compose.yaml'
    source=root/'deploy/docker/compose.yaml'
    def read(path):
        result=subprocess.run(['docker','compose','--env-file',str(root/env_path),'-f',str(path),
            'config','--no-interpolate','--no-env-resolution','--no-path-resolution','--format','json'],
            check=True,capture_output=True,text=True,timeout=30)
        return json.loads(result.stdout)
    current=read(target);baseline=read(source)
    if env_path.parent.parent.name=='instances':
        for service in baseline.get('services',{}).values():
            if isinstance(service.get('build'),dict):service['build']['context']=service['build']['context'].replace('../../services/','../../../services/')
            if isinstance(service.get('build'),dict) and service['build']['context']=='../..':service['build']['context']='../../..'
    def merge(default,existing):
        if isinstance(default,dict) and isinstance(existing,dict):
            return {key:merge(default.get(key),existing[key]) if key in existing else default[key] for key in default.keys()|existing.keys()}
        return existing
    merged=merge(baseline,current)
    summary={'services_added':sorted(set(baseline.get('services',{}))-set(current.get('services',{}))),
        'services_updated':sorted(name for name in current.get('services',{}) if name in baseline.get('services',{}) and baseline['services'][name]!=current['services'][name]),
        'preserved':['nome do projeto','imagens personalizadas','portas','volumes','ambiente existente','serviços personalizados']}
    if preview:return summary
    fd,temp=tempfile.mkstemp(prefix='.compose-upgrade-',suffix='.json',dir=target.parent)
    try:
        os.chmod(temp,0o600)
        with os.fdopen(fd,'w') as handle:json.dump(merged,handle,indent=2)
        subprocess.run(['docker','compose','--env-file',str(root/env_path),'-f',temp,'config','--quiet'],
            check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,timeout=30)
        backup=target.with_name('compose.backup-'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')+'.yaml')
        shutil.copyfile(target,backup);os.chmod(backup,0o600)
        os.replace(temp,target)
    finally:Path(temp).unlink(missing_ok=True)
    return summary


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--env-file',default='deploy/docker/.env.production')
    parser.add_argument('--track-channel',action='store_true',
                        help='Apontar imagens oficiais GHCR para develop ou main/latest.')
    parser.add_argument('--refresh-compose',action='store_true',help='Mesclar novos serviços e opções preservando parâmetros existentes, após validação Docker.')
    parser.add_argument('--preview',action='store_true',help='Mostrar somente nomes das diferenças, sem gravar configuração ou expor segredos.')
    args=parser.parse_args()
    root=Path(__file__).resolve().parents[1]
    env_path=Path(args.env_file)
    adapters=('docker','dockge','portainer','cloudpanel')
    instance=(len(env_path.parts)==4 and env_path.parts[:2]==('deploy','instances')
              and re.fullmatch(r'[a-z][a-z0-9-]{2,39}',env_path.parts[2]))
    adapter_env=(len(env_path.parts)==3 and env_path.parts[0]=='deploy' and env_path.parts[1] in adapters)
    if env_path.is_absolute() or not (adapter_env or instance) or '..' in env_path.parts or not env_path.name.startswith('.env') or env_path.name.endswith('.example'):
        parser.error('--env-file deve apontar para a configuração de um adaptador em deploy/.')
    target=root/env_path
    if not target.is_file():raise SystemExit('Instalação nova: execute python scripts/configure.py. Nenhum arquivo foi alterado.')
    if args.preview:
        print(json.dumps(refresh_compose(root,env_path,preview=True),ensure_ascii=False));return
    text=target.read_text(encoding='utf-8');lines=text.splitlines()
    key_line=next((line.split('=',1)[1].strip().strip("\"'") for line in lines if line.startswith('INTEGRATION_ENCRYPTION_KEY=')),'')
    new_key=key_line or base64.urlsafe_b64encode(secrets.token_bytes(32)).decode()
    try:
        if len(base64.urlsafe_b64decode(new_key))!=32:raise ValueError()
    except Exception:raise SystemExit('INTEGRATION_ENCRYPTION_KEY existente inválida. Não foi substituída; confira seu backup.')
    existing={line.split('=',1)[0] for line in lines if '=' in line and not line.lstrip().startswith('#')}
    channel='develop' if env_path.name.endswith('.develop') else 'production'
    tag='develop' if channel=='develop' else 'latest'
    official={'APP_IMAGE':'ghcr.io/wkarts/pige360-self',
              'MAIL_AGENT_IMAGE':'ghcr.io/wkarts/pige360-self-mail-agent',
              'PORTAL_IMAGE':'ghcr.io/wkarts/pige360-self-portal','SOGO_IMAGE':'ghcr.io/wkarts/pige360-self-sogo','WEBSITE_IMAGE':'ghcr.io/wkarts/pige360-self-website'}
    example=(root/'deploy'/('docker' if instance else env_path.parts[1])/f'.env.{channel}.example').read_text().splitlines()
    version=(root/'VERSION').read_text().strip()
    version_tuple=tuple(map(int,version.split('.')))
    # Preserve registry próprio e tags personalizadas; apenas a imagem local antiga é atualizada.
    updated=[]
    for line in lines:
        if line.startswith('INTEGRATION_ENCRYPTION_KEY='):line='INTEGRATION_ENCRYPTION_KEY='+new_key
        if args.track_channel and '=' in line:
            key,value=line.split('=',1)
            if key in official and value.startswith(official[key]+':'):
                line=f'{key}={official[key]}:{tag}'
            if key=='MINIO_IMAGE' and value=='quay.io/minio/minio:RELEASE.2025-09-07T16-13-09Z':
                line='MINIO_IMAGE=ghcr.io/wkarts/pige360-self-minio:RELEASE.2025-10-15T17-29-55Z'
        match=re.fullmatch(r'APP_IMAGE=pige360-self:(\d+)\.(\d+)\.(\d+)',line)
        if match and tuple(map(int,match.groups()))<version_tuple:line=f'APP_IMAGE=pige360-self:{version}'
        updated.append(line)
    additions=[]
    for line in example:
        if '=' not in line or line.lstrip().startswith('#'):continue
        key=line.split('=',1)[0]
        if key in existing or key in ('APP_SECRET_KEY','SETUP_TOKEN','POSTGRES_PASSWORD','STORAGE_SECRET_KEY','REDIS_PASSWORD','REDIS_URL','RABBITMQ_PASSWORD','RABBITMQ_URL'):continue
        # Upgrades must not silently move existing local files to S3 or start new
        # stateful services. Those choices belong to an explicit migration.
        if key=='WEBSITE_INTERNAL_TOKEN':line='WEBSITE_INTERNAL_TOKEN='+secrets.token_urlsafe(48)
        if key=='COMPOSE_PROFILES':line='COMPOSE_PROFILES='
        if key=='STORAGE_BACKEND':line='STORAGE_BACKEND=local'
        if key=='STORAGE_ENDPOINT_URL':line='STORAGE_ENDPOINT_URL='
        if key=='STORAGE_USE_SSL':line='STORAGE_USE_SSL=true'
        additions.append('INTEGRATION_ENCRYPTION_KEY='+new_key if key=='INTEGRATION_ENCRYPTION_KEY' else line)
    stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    backup=target.parent/('.env.backup-'+stamp);shutil.copyfile(target,backup);os.chmod(backup,0o600)
    fd,tmp=tempfile.mkstemp(prefix='.env-upgrade-',dir=target.parent)
    try:
        os.chmod(tmp,0o600)
        with os.fdopen(fd,'w',encoding='utf-8',newline='\n') as f:
            f.write('\n'.join(updated)+(f'\n\n# Opções adicionadas na atualização {version}\n'+'\n'.join(additions) if additions else '')+'\n');f.flush();os.fsync(f.fileno())
        os.replace(tmp,target)
    finally:
        Path(tmp).unlink(missing_ok=True)
    if args.refresh_compose:refresh_compose(root,env_path)
    print('Configuração preservada e opções acrescentadas. Backup protegido:',backup.name)
    print('Revise SMTP_* e CONNECT_ALLOWED_HOSTS. Guarde INTEGRATION_ENCRYPTION_KEY junto ao backup.')
    if args.track_channel:
        print('Imagem MinIO legada do Quay substituída somente quando era o padrão conhecido. Confira a visibilidade do novo pacote GHCR.')
    print(f'Se APP_IMAGE usa registry próprio, publique/selecione a imagem {version} pelo seu processo existente.')
    compose=target.parent/'compose.yaml'
    print(f'Execute: docker compose --env-file {args.env_file} -f {compose} up -d --wait; docker compose --env-file {args.env_file} -f {compose} logs --tail=100 app worker')
if __name__=='__main__':main()
