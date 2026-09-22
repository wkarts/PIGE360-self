#!/usr/bin/env python3
"""Bases GHCR content-addressed. Run comum não consulta a tag upstream móvel."""
from __future__ import annotations
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[2]
LABEL = 'br.com.argws.pige360.base.'
DIGEST = re.compile(r'^sha256:[0-9a-f]{64}$')


def run(*args: str) -> str:
    return subprocess.check_output(args, text=True, cwd=ROOT).strip()


def inspect(ref: str, field: str = 'Manifest', optional: bool = False) -> dict | None:
    process = subprocess.run(['docker', 'buildx', 'imagetools', 'inspect', ref,
                              '--format', '{{json .' + field + '}}'],
                             text=True, capture_output=True, cwd=ROOT)
    if process.returncode:
        error = process.stderr.lower()
        # A CLI também pode devolver ERROR: <referência exata>: not found.
        exact_missing = re.search(r'(?:^|\n)(?:error:\s*)?' + re.escape(ref.lower())
                                  + r':\s*not found\s*(?:\n|$)', error) is not None
        # Não confundir falta de permissão, rate limit ou rede com imagem ausente.
        missing = exact_missing or any(x in error for x in ('manifest unknown', 'manifest_unknown', 'name unknown', '404 not found'))
        if optional and missing \
                and not any(x in error for x in ('unauthorized', 'denied', 'forbidden', 'no such host', 'temporary failure', 'timeout', 'timed out', '502', '503')):
            return None
        raise RuntimeError(f'Não foi possível inspecionar {ref}: {process.stderr.strip()}')
    result = json.loads(process.stdout)
    if not isinstance(result, dict):
        raise RuntimeError(f'Metadados inválidos: {ref}')
    return result


def digest_of(manifest: dict) -> str:
    digest = manifest.get('digest', '')
    if not DIGEST.fullmatch(digest):
        raise ValueError('Registry não informou digest SHA-256 válido.')
    return digest


def fingerprint(spec: dict, upstream: str, platform: str, root: Path = ROOT) -> str:
    data = {key: spec[key] for key in ('id', 'package', 'upstream', 'security_revision')}
    data.update(upstream_resolved=upstream, platform=platform, schema=1)
    hasher = hashlib.sha256(json.dumps(data, sort_keys=True).encode())
    # Arquivos da aplicação e aliases não invalidam uma base.
    for name in sorted([spec['dockerfile'], *spec['inputs']]):
        path = (root / name).resolve()
        if not path.is_relative_to(root.resolve()):
            raise ValueError('Input fora do projeto.')
        hasher.update(name.encode() + b'\0' + path.read_bytes())
    return hasher.hexdigest()


def ensure(spec: dict, owner: str, platform: str, refresh: bool) -> dict:
    image = f"ghcr.io/{owner}/{spec['package']}"
    alias = image + ':' + spec['aliases'][0]
    current = inspect(alias, optional=True)
    labels = {}
    if current:
        config = inspect(alias, 'Image')
        labels = config.get('config', {}).get('Labels', {}) or {}
    upstream_tag = spec['upstream']
    resolved = labels.get(LABEL + 'upstream.resolved', '')
    if refresh or not resolved or labels.get(LABEL + 'upstream.tag') != upstream_tag:
        upstream_digest = digest_of(inspect(upstream_tag))
        resolved = upstream_tag.split('@')[0] + '@' + upstream_digest
    elif not DIGEST.fullmatch(resolved.rsplit('@', 1)[-1]):
        raise ValueError(f'Label upstream inválido em {alias}')
    value = fingerprint(spec, resolved, platform)
    immutable = image + ':base-' + value
    found = inspect(immutable, optional=True)
    reason = 'reused'
    if not found:
        reason = 'missing-or-inputs-changed'
        command = ['docker', 'buildx', 'build', '--platform', platform,
                   '--file', spec['dockerfile'], '--build-arg', 'UPSTREAM_IMAGE=' + resolved,
                   '--tag', immutable, '--push', '--provenance=false', '--sbom=false',
                   '--cache-to', 'type=inline',
                   '--label', 'org.opencontainers.image.source=https://github.com/' + os.environ['GITHUB_REPOSITORY'],
                   '--label', LABEL + 'fingerprint=' + value,
                   '--label', LABEL + 'upstream.tag=' + upstream_tag,
                   '--label', LABEL + 'upstream.resolved=' + resolved]
        if current:
            command += ['--cache-from', 'type=registry,ref=' + alias]
        subprocess.run(command + ['.'], cwd=ROOT, check=True)
        found = inspect(immutable)
    digest = digest_of(found)
    # Corrigir aliases é retag, não reconstrução. Imutáveis nunca são sobrescritos.
    for tag in spec['aliases']:
        ref = image + ':' + tag
        metadata = inspect(ref, optional=True)
        if metadata is None or digest_of(metadata) != digest:
            run('docker', 'buildx', 'imagetools', 'create', '--prefer-index=false',
                '--tag', ref, image + '@' + digest)
            if digest_of(inspect(ref)) != digest:
                raise RuntimeError('Retag alterou inesperadamente o digest.')
    result = {'image': image, 'ref': image + '@' + digest, 'tag': immutable,
              'digest': digest, 'fingerprint': value, 'upstream': resolved, 'status': reason}
    print(json.dumps({spec['id']: result}, ensure_ascii=False))
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--refresh-upstream', action='store_true')
    parser.add_argument('--output', default='ci-evidence/base-images.lock.json')
    args = parser.parse_args()
    repo = os.environ.get('GITHUB_REPOSITORY', '')
    if not re.fullmatch(r'[A-Za-z0-9_.-]+/PIGE360-self', repo, re.I):
        parser.error('Este publicador está limitado ao repositório PIGE360-self.')
    if os.environ.get('GITHUB_REF') not in ('refs/heads/main', 'refs/heads/develop'):
        parser.error('Bases só podem ser publicadas por main/develop; PR não publica.')
    catalog = json.loads((ROOT / 'containers/images.json').read_text())
    resolved = {}
    for spec in catalog['images']:
        if spec['enabled']:
            resolved[spec['id']] = ensure(spec, repo.split('/')[0].lower(), catalog['platform'], args.refresh_upstream)
    output = ROOT / args.output
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps({'schema_version': 1, 'images': resolved}, indent=2) + '\n')
    if os.getenv('GITHUB_OUTPUT'):
        with open(os.environ['GITHUB_OUTPUT'], 'a') as handle:
            for key, item in resolved.items():
                handle.write(f'{key}_ref={item["ref"]}\n')
    if os.getenv('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as handle:
            handle.write('## Bases e espelhos GHCR\n|Imagem|Decisão|Digest|\n|---|---|---|\n')
            for key, item in resolved.items():
                handle.write(f'|{key}|{item["status"]}|`{item["digest"]}`|\n')


if __name__ == '__main__':
    main()
