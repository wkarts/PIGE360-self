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

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--env-file',default='deploy/docker/.env.production')
    args=parser.parse_args()
    root=Path(__file__).resolve().parents[1];target=root/args.env_file
    if not target.is_file():raise SystemExit('Instalação nova: execute python scripts/configure.py. Nenhum arquivo foi alterado.')
    text=target.read_text(encoding='utf-8');lines=text.splitlines()
    key_line=next((line.split('=',1)[1].strip().strip("\"'") for line in lines if line.startswith('INTEGRATION_ENCRYPTION_KEY=')),'')
    new_key=key_line or base64.urlsafe_b64encode(secrets.token_bytes(32)).decode()
    try:
        if len(base64.urlsafe_b64decode(new_key))!=32:raise ValueError()
    except Exception:raise SystemExit('INTEGRATION_ENCRYPTION_KEY existente inválida. Não foi substituída; confira seu backup.')
    existing={line.split('=',1)[0] for line in lines if '=' in line and not line.lstrip().startswith('#')}
    example=(root/'deploy/docker/.env.example').read_text().splitlines()
    # Preserve registry próprio e tags personalizadas; apenas a imagem local antiga é atualizada.
    updated=[]
    for line in lines:
        if line.startswith('INTEGRATION_ENCRYPTION_KEY='):line='INTEGRATION_ENCRYPTION_KEY='+new_key
        if re.fullmatch(r'APP_IMAGE=pige360-self:0\.[12]\.0',line):line='APP_IMAGE=pige360-self:0.3.0'
        updated.append(line)
    additions=[]
    for line in example:
        if '=' not in line or line.lstrip().startswith('#'):continue
        key=line.split('=',1)[0]
        if key in existing or key in ('APP_SECRET_KEY','SETUP_TOKEN','POSTGRES_PASSWORD'):continue
        additions.append('INTEGRATION_ENCRYPTION_KEY='+new_key if key=='INTEGRATION_ENCRYPTION_KEY' else line)
    stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    backup=target.parent/('.env.backup-'+stamp);shutil.copyfile(target,backup);os.chmod(backup,0o600)
    fd,tmp=tempfile.mkstemp(prefix='.env-upgrade-',dir=target.parent)
    try:
        os.chmod(tmp,0o600)
        with os.fdopen(fd,'w',encoding='utf-8',newline='\n') as f:
            f.write('\n'.join(updated)+'\n\n# Opções adicionadas na atualização 0.3.0\n'+'\n'.join(additions)+'\n');f.flush();os.fsync(f.fileno())
        os.replace(tmp,target)
    finally:
        Path(tmp).unlink(missing_ok=True)
    print('Configuração preservada e opções acrescentadas. Backup protegido:',backup.name)
    print('Revise SMTP_* e CONNECT_ALLOWED_HOSTS. Guarde INTEGRATION_ENCRYPTION_KEY junto ao backup.')
    print('Se APP_IMAGE usa registry próprio, publique/seleciona a imagem 0.3.0 pelo seu processo existente.')
    compose=target.parent/'compose.yaml'
    print(f'Execute: docker compose --env-file {args.env_file} -f {compose} up -d --wait; docker compose --env-file {args.env_file} -f {compose} logs --tail=100 app worker')
if __name__=='__main__':main()
