#!/usr/bin/env python3
"""Reconcilia release publicada por SHA e verifica contrato imutável sem republicar."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import tempfile
from urllib.error import HTTPError

from auto_promotion import GitHub, output, require, sha
from promote import inspect
from stable_set import IMAGES, revision
from version import STABLE, parse


def tag_sha(api, tag):
    require(bool(STABLE.fullmatch(tag)), 'Tag não é SemVer numérico')
    ref = api.api('/git/ref/tags/' + tag)['object']
    if ref['type'] == 'tag':
        ref = api.api('/git/tags/' + ref['sha'])['object']
    require(ref['type'] == 'commit', 'Tag não aponta diretamente para commit')
    return sha(ref['sha'])


def releases_for_sha(api, target):
    # O corpo é somente um filtro; a tag imutável é consultada para confirmar o SHA.
    found = []
    for release in api.pages('/releases'):
        tag = release['tag_name']
        if STABLE.fullmatch(tag) and (release.get('target_commitish') == target
                or f'Commit: `{target}`' in (release.get('body') or '')):
            if tag_sha(api, tag) == target:
                found.append(release)
    return sorted(found, key=lambda r: parse(r['tag_name']), reverse=True)


def load_manifest(release):
    assets = [asset for asset in release.get('assets', []) if asset['name'] == 'images.json']
    require(len(assets) == 1 and 0 < assets[0]['size'] <= 131072,
            'Release sem manifesto images.json verificável; recuperação manual necessária')
    with tempfile.TemporaryDirectory() as directory:
        path = Path(directory) / 'images.json'
        subprocess.run(['gh', 'release', 'download', release['tag_name'], '--repo',
                        'wkarts/PIGE360-self', '--pattern', 'images.json', '--output', str(path)],
                       check=True, timeout=60)
        return json.loads(path.read_text())


def verify_manifest(api, release, loader=load_manifest, aliases=False):
    require(not release['draft'] and not release['prerelease'], 'Release não é estável publicada')
    tag = release['tag_name']
    parse(tag)
    target = tag_sha(api, tag)
    manifest = loader(release)
    require(manifest.get('version') == tag and manifest.get('commit') == target,
            'Manifesto difere da tag/SHA publicado')
    images = manifest.get('images', {})
    require(set(images) == set(IMAGES), 'Manifesto não contém exatamente as três imagens PIGE')
    for image, digest in images.items():
        import re
        require(isinstance(digest, str) and re.fullmatch(r'sha256:[0-9a-f]{64}', digest), 'Digest inválido')
        require(inspect(image + ':' + tag) == digest and revision(image + '@' + digest) == target,
                'Imagem imutável/SHA diverge do manifesto: ' + image)
        if aliases:
            major, minor, _ = parse(tag)
            for alias in (f'{major}.{minor}', str(major), 'production', 'stable', 'latest'):
                require(inspect(image + ':' + alias) == digest, 'Alias estável divergente: ' + image + ':' + alias)
    return manifest


def verify_published(api, version, target, loader=load_manifest):
    release = api.api('/releases/tags/' + version)
    manifest = verify_manifest(api, release, loader)
    require(manifest['commit'] == target, 'Release publicada pertence a outro commit')
    latest = api.api('/releases/latest')
    require(parse(latest['tag_name']) >= parse(version), 'Latest é anterior à release publicada solicitada')
    # Um release mais novo pode legitimamente possuir os aliases. Verifica o conjunto novo, sem rebaixar.
    verify_manifest(api, latest, loader, aliases=True)
    return {'version': version, 'commit': target, 'release_url': release['html_url'],
            'latest_version': latest['tag_name'], 'verified': 'true'}


def verify_for_sha(api, target, loader=load_manifest):
    matches = [r for r in releases_for_sha(api, target) if not r['draft'] and not r['prerelease']]
    require(bool(matches), 'Run terminou, mas não existe release estável publicada verificável para o SHA')
    return verify_published(api, matches[0]['tag_name'], target, loader)


def state(api, version, target):
    parse(version)
    try:
        release = api.api('/releases/tags/' + version)
    except RuntimeError as error:
        if isinstance(error.__cause__, HTTPError) and error.__cause__.code == 404:
            return {'published': 'false'}
        raise
    require(tag_sha(api, version) == target, 'Tag existente pertence a outro SHA')
    return {'published': str(not release['draft']).lower()}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('mode', choices=('state', 'verify'))
    parser.add_argument('--version', required=True)
    parser.add_argument('--sha', required=True)
    args = parser.parse_args()
    api = GitHub()
    sha(args.sha)
    result = state(api, args.version, args.sha) if args.mode == 'state' else verify_published(api, args.version, args.sha)
    output(result)


if __name__ == '__main__':
    main()
