#!/usr/bin/env python3
"""Promove o mesmo digest, sem recompilar e sem sobrescrever versão estável."""
import os
import re
import subprocess
import sys
from version import parse

def inspect(ref):
    p=subprocess.run(['docker','buildx','imagetools','inspect',ref,'--format','{{.Manifest.Digest}}'],capture_output=True,text=True)
    if p.returncode:
        if re.search(r'not found|manifest unknown|no such manifest',p.stderr,re.I):return None
        raise RuntimeError('Não foi possível verificar imagem: '+p.stderr)
    result=p.stdout.strip()
    if not re.fullmatch(r'sha256:[0-9a-f]{64}',result):raise RuntimeError('Digest inválido')
    return result

def promote(channel, image, digest, version):
    if not re.fullmatch(r'ghcr\.io/wkarts/pige360-self',image):raise ValueError('Imagem fora do escopo')
    if not re.fullmatch(r'sha256:[0-9a-f]{64}',digest):raise ValueError('Digest inválido')
    stable=version.split('-develop.',1)[0];major,minor,_=parse(stable)
    if channel=='develop':tags=['develop',f'develop-{stable}',f'develop-{major}.{minor}',f'develop-{major}']
    elif channel=='release':
        parse(version)
        existing=inspect(image+':'+version)
        if existing and existing!=digest:raise RuntimeError('Versão imutável já possui outro digest; nenhuma tag alterada')
        tags=[version,f'{major}.{minor}',str(major),'production','stable','latest']
    else:raise ValueError('Canal inválido')
    for tag in tags:
        ref=image+':'+tag
        subprocess.run(['docker','buildx','imagetools','create','--prefer-index=false','--tag',ref,image+'@'+digest],check=True)
        if inspect(ref)!=digest:raise RuntimeError('Digest divergente após promoção: '+ref)
        print(ref+' -> '+digest)

if __name__=='__main__':promote(sys.argv[1],os.environ['IMAGE'],os.environ['DIGEST'],os.environ['VERSION'])
