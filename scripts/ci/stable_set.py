#!/usr/bin/env python3
"""Promove um conjunto GHCR verificado; rollback compensatório dos aliases existentes."""
import json
import os
from pathlib import Path
import re
import subprocess

from promote import inspect
from version import parse

IMAGES = ('ghcr.io/wkarts/pige360-self', 'ghcr.io/wkarts/pige360-self-mail-agent',
          'ghcr.io/wkarts/pige360-self-sogo')


def revision(ref):
    config = json.loads(subprocess.check_output(
        ['docker', 'buildx', 'imagetools', 'inspect', ref, '--format', '{{json .Image}}'], text=True))
    if config.get('os') != 'linux' or config.get('architecture') != 'amd64':
        raise RuntimeError('Candidato não é uma imagem única linux/amd64: ' + ref)
    return config.get('config', {}).get('Labels', {}).get('org.opencontainers.image.revision')


def set_tag(image, tag, digest):
    ref = image + ':' + tag
    subprocess.run(['docker', 'buildx', 'imagetools', 'create', '--prefer-index=false',
                    '--tag', ref, image + '@' + digest], check=True)
    if inspect(ref) != digest:
        raise RuntimeError('Digest divergente após promoção: ' + ref)


def promote_set(images, version, target, manifest_path=None):
    major, minor, _ = parse(version)
    if tuple(images) != IMAGES or not re.fullmatch(r'[0-9a-f]{40}', target):
        raise ValueError('Conjunto ou SHA fora do escopo')
    aliases = (f'{major}.{minor}', str(major), 'production', 'stable', 'latest')
    previous = {}
    # Falha antes de qualquer escrita se algum candidato/SHA/versão imutável divergir.
    for image, digest in images.items():
        if not re.fullmatch(r'sha256:[0-9a-f]{64}', digest):
            raise ValueError('Digest inválido')
        if inspect(image + '@' + digest) != digest or revision(image + '@' + digest) != target:
            raise RuntimeError('Candidato não corresponde ao SHA aprovado: ' + image)
        existing = inspect(image + ':' + version)
        if existing and existing != digest:
            raise RuntimeError('Versão imutável já possui outro digest: ' + image + ':' + version)
        previous[image] = {tag: inspect(image + ':' + tag) for tag in aliases}
    manifest = {'version': version, 'commit': target, 'images': images, 'previous_aliases': previous}
    if manifest_path:
        Path(manifest_path).write_text(json.dumps(manifest, indent=2) + '\n')
    attempted = []
    try:
        for image, digest in images.items():
            set_tag(image, version, digest)
        # Cada alias é aplicado ao conjunto completo antes do próximo alias.
        for tag in aliases:
            for image, digest in images.items():
                attempted.append((image, tag))
                set_tag(image, tag, digest)
        for image, digest in images.items():
            for tag in (version, *aliases):
                if inspect(image + ':' + tag) != digest:
                    raise RuntimeError('Verificação final do conjunto falhou: ' + image + ':' + tag)
    except Exception as original:
        unresolved = []
        for image, tag in reversed(attempted):
            old = previous[image][tag]
            if old is None:
                # Não remove tags/pacotes. Versões novas ficam disponíveis para diagnóstico.
                unresolved.append(image + ':' + tag + ' (alias novo, sem valor anterior)')
                continue
            try:
                set_tag(image, tag, old)
            except Exception:
                unresolved.append(image + ':' + tag)
        suffix = (' Recuperação manual necessária: ' + ', '.join(unresolved)) if unresolved else ' Aliases anteriores restaurados.'
        raise RuntimeError('Promoção incompleta; release deve permanecer em rascunho.' + suffix) from original
    return manifest


if __name__ == '__main__':
    images = {os.environ[name]: os.environ[digest] for name, digest in
              (('IMAGE', 'DIGEST'), ('MAIL_AGENT_IMAGE', 'MAIL_AGENT_DIGEST'), ('SOGO_IMAGE', 'SOGO_DIGEST'))}
    promote_set(images, os.environ['VERSION'], os.environ['TARGET_SHA'], 'release/images.json')
