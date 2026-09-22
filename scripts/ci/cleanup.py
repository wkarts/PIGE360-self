#!/usr/bin/env python3
"""Limpeza restrita a este repositório. Dry-run por padrão; falha fechada."""
import argparse
from datetime import datetime, timedelta, timezone
import json
import os
from pathlib import Path
import re
import subprocess
from urllib.parse import quote

PROTECTED = re.compile(r'(?:v?\d+(?:\.\d+){0,2}|latest|stable|production|main|develop|develop-\d+(?:\.\d+){0,2})')
EPHEMERAL = re.compile(r'(?:develop-\d+\.\d+\.\d+-r\d+\.\d+|\d+\.\d+\.\d+-(?:develop|alpha|beta|rc)\.[\w.-]+|release-candidate-[\w.-]+|(?:dev-)?sha-[0-9a-f]{7,64})')
DIGEST = re.compile(r'sha256:[0-9a-f]{64}')

def timestamp(value):
    return datetime.fromisoformat(value.replace('Z', '+00:00'))

def tags_of(version):
    return version['metadata']['container']['tags']

def deletable_tags(tags):
    # Tags desconhecidas são preservadas, inclusive aliases definidos pelo operador.
    return bool(tags) and not any(PROTECTED.fullmatch(t) for t in tags) and all(EPHEMERAL.fullmatch(t) for t in tags)

def select_versions(versions, now, days=7, keep=10, include_orphans=False):
    recent = sorted(versions, key=lambda v: timestamp(v['created_at']), reverse=True)
    ephemeral = [v for v in recent if deletable_tags(tags_of(v))]
    keep_ids = {v['id'] for v in ephemeral[:keep]}
    cutoff = now - timedelta(days=days)
    return [v for v in recent if v['id'] not in keep_ids and timestamp(v['created_at']) < cutoff
            and (deletable_tags(tags_of(v)) or (include_orphans and not tags_of(v)))]

def cache_deletable(cache, now, hours=2, pr_ref=None):
    if pr_ref is not None:
        return cache['ref'] == pr_ref
    return cache['ref'] not in ('refs/heads/main','refs/heads/develop') and timestamp(cache['last_accessed_at']) < now-timedelta(hours=hours)

def run(*args):
    return subprocess.check_output(list(args), text=True).strip()

def api(path, method='GET'):
    text = run('gh','api','--method',method,'-H','X-GitHub-Api-Version: 2022-11-28',path)
    return json.loads(text) if text else None

def pages(path, field=None):
    # Snapshot completo antes de deletar: evita pular itens durante paginação.
    items=[]
    for page in range(1,1001):
        response=api(f'{path}{"&" if "?" in path else "?"}per_page=100&page={page}')
        chunk=response[field] if field else response
        if not isinstance(chunk,list): raise RuntimeError('Inventário inválido')
        items.extend(chunk)
        if len(chunk)<100:return items
    raise RuntimeError('Limite de paginação atingido; nenhuma exclusão foi feita')

def children(image, digest):
    if not DIGEST.fullmatch(digest):raise ValueError('Digest inesperado no inventário')
    manifest=json.loads(run('docker','buildx','imagetools','inspect','--raw',image+'@'+digest))
    if manifest.get('schemaVersion') != 2:raise ValueError('Manifesto desconhecido; limpeza abortada')
    refs=[entry['digest'] for entry in manifest.get('manifests',[])]
    if manifest.get('subject'):refs.append(manifest['subject']['digest'])
    return refs

def reachable(image, roots):
    seen=set();pending=list(roots)
    while pending:
        digest=pending.pop()
        if digest in seen:continue
        if len(seen)>10000:raise RuntimeError('Grafo grande demais; limpeza abortada')
        seen.add(digest);pending.extend(children(image,digest))
    return seen

def cleanup_packages(args, repo, report):
    owner,name=repo.split('/')
    repository=api('repos/'+repo)
    scope='orgs' if repository['owner']['type']=='Organization' else 'users'
    package=name.lower()
    # Bases e espelhos ficam fora da limpeza, inclusive com --orphans.
    # Referencias de releases antigas podem apontar para os seus digests.
    packages=[package]
    now=datetime.now(timezone.utc)
    for package in packages:
        endpoint=f'{scope}/{quote(owner,safe="")}/packages/container/{quote(package,safe="")}'
        try:
            metadata=api(endpoint)
        except subprocess.CalledProcessError as exc:
            # 404 de pacote inexistente/inacessível não autoriza excluir nada.
            report.append({'package':package,'status':'not_accessible','exit_code':exc.returncode})
            print(f'::warning::Pacote {package} não acessível; nenhuma exclusão nele.')
            continue
        linked=metadata.get('repository') or {}
        if linked.get('full_name','').lower()!=repo.lower():
            report.append({'package':package,'status':'preserved_repository_mismatch'});continue
        versions=pages(endpoint+'/versions')
        selected=select_versions(versions,now,args.days,args.keep,args.orphans)
        selected_ids={v['id'] for v in selected}
        image=f'ghcr.io/{owner.lower()}/{package}'
        # Proteger descendentes de TODOS os manifestos com tag e dos órfãos mantidos.
        # Não pressupor que "sem tag" significa lixo: pode ser plataforma/atestado OCI.
        roots={v['name'] for v in versions if tags_of(v) or v['id'] not in selected_ids}
        protected_roots={v['name'] for v in versions if v['id'] not in selected_ids}
        descendants={child for digest in roots for child in children(image,digest)} if selected else set()
        graph=reachable(image,protected_roots | descendants) if selected else set()
        selected=[v for v in selected if v['name'] not in graph]
        snapshot={(v['id'],v['name'],tuple(sorted(tags_of(v)))) for v in versions}
        if args.apply and selected:
            current=pages(endpoint+'/versions')
            if snapshot!={(v['id'],v['name'],tuple(sorted(tags_of(v)))) for v in current}:
                raise RuntimeError('Registry mudou durante inventário; exclusões abortadas')
        for version in selected:
            entry=dict(package=package,id=version['id'],digest=version['name'],tags=tags_of(version),status='dry_run')
            if args.apply:
                fresh=api(endpoint+f'/versions/{version["id"]}')
                if fresh['name']!=version['name'] or tags_of(fresh)!=tags_of(version):
                    raise RuntimeError('Versão mudou antes da exclusão; abortado')
                if tags_of(fresh) and not deletable_tags(tags_of(fresh)):
                    raise RuntimeError('Proteção de tags acionada; abortado')
                api(endpoint+f'/versions/{version["id"]}','DELETE');entry['status']='deleted'
            report.append(entry)
        report.append({'package':package,'inventoried':len(versions),'eligible':len(selected),'status':'completed'})

def main():
    p=argparse.ArgumentParser()
    p.add_argument('mode',choices=['cache','ghcr'])
    p.add_argument('--apply',action='store_true')
    p.add_argument('--orphans',action='store_true',help='Exige inspeção do grafo de manifestos')
    p.add_argument('--days',type=int,default=7);p.add_argument('--keep',type=int,default=10)
    p.add_argument('--hours',type=int,default=2);p.add_argument('--pr-ref')
    p.add_argument('--report',default='ci-evidence/maintenance.json')
    args=p.parse_args()
    if args.days<1 or args.keep<1 or args.hours<1:p.error('Retenção deve ser positiva')
    if args.pr_ref and not re.fullmatch(r'refs/pull/\d+/merge',args.pr_ref):p.error('PR ref inválida')
    repo=os.environ.get('GITHUB_REPOSITORY','')
    if repo.lower()!='wkarts/pige360-self':p.error('Somente wkarts/PIGE360-self é autorizado por esta configuração')
    if not os.getenv('GH_TOKEN'):p.error('GH_TOKEN obrigatório')
    report=[];destination=Path(args.report);destination.parent.mkdir(parents=True,exist_ok=True)
    try:
        if args.mode=='ghcr':cleanup_packages(args,repo,report)
        else:
            for cache in pages('repos/'+repo+'/actions/caches','actions_caches'):
                if cache_deletable(cache,datetime.now(timezone.utc),args.hours,args.pr_ref):
                    if args.apply:api(f'repos/{repo}/actions/caches/{cache["id"]}','DELETE')
                    report.append({'id':cache['id'],'ref':cache['ref'],'status':'deleted' if args.apply else 'dry_run'})
    finally:
        destination.write_text(json.dumps(report,indent=2)+'\n')
        print(json.dumps(report,indent=2))
if __name__=='__main__':main()
