#!/usr/bin/env python3
"""SemVer numérico; resolve o mesmo commit de forma idempotente. Sem rede."""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess

STABLE = re.compile(r'(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)')
TITLE = re.compile(r'release\((patch|minor|major)\): .+')

def parse(value):
    match = STABLE.fullmatch(value)
    if not match:
        raise ValueError('Versão deve usar MAJOR.MINOR.PATCH, sem v: ' + value)
    return tuple(map(int, match.groups()))

def bump(value, kind):
    major, minor, patch = parse(value)
    if kind == 'major': return f'{major+1}.0.0'
    if kind == 'minor': return f'{major}.{minor+1}.0'
    if kind == 'patch': return f'{major}.{minor}.{patch+1}'
    raise ValueError('Incremento inválido')

def resolve(tags, pointing, baseline, kind):
    parse(baseline)
    exact = [tag for tag in pointing if STABLE.fullmatch(tag)]
    if exact:
        return max(exact, key=parse)
    stable = [tag for tag in tags if STABLE.fullmatch(tag)]
    return bump(max(stable, key=parse), kind) if stable else baseline

def validate_pr(title, body, head, base, same_repo=True):
    if not all(section in body for section in ('## Descrição', '## Branch')):
        raise ValueError('PR exige seções ## Descrição e ## Branch')
    if base == 'main':
        if head != 'develop' or not same_repo or not TITLE.fullmatch(title):
            raise ValueError('main recebe develop do mesmo repositório: release(patch|minor|major): descrição')
    elif base == 'develop':
        if not re.fullmatch(r'(feature|feat|fix|refactor|chore|docs|test|ci|perf|build)/[a-z0-9][a-z0-9._/-]*', head):
            raise ValueError('Use uma branch feature/*, fix/*, ci/*, chore/* etc.')
        if not re.fullmatch(r'(feat|fix|perf|refactor|chore|docs|test|ci|build)(\([a-zA-Z0-9._/-]+\))?(!)?: .+', title):
            raise ValueError('Título deve usar Conventional Commits')
    else:
        raise ValueError('Branch base não suportada')

def git(*args):
    return subprocess.check_output(['git', *args], text=True).strip()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('mode', choices=['develop', 'release', 'pr'])
    args = parser.parse_args()
    if args.mode == 'pr':
        validate_pr(os.environ['PR_TITLE'], os.environ.get('PR_BODY',''), os.environ['HEAD_REF'],
                    os.environ['BASE_REF'], os.environ.get('HEAD_REPO') == os.environ.get('GITHUB_REPOSITORY'))
        return
    baseline = Path('VERSION').read_text().strip()
    parse(baseline)
    target = git('rev-parse', 'HEAD')
    tags = git('tag', '--merged', target).splitlines()
    kind = os.getenv('MANUAL_BUMP', '') or 'patch'
    if args.mode == 'release' and os.getenv('GITHUB_EVENT_NAME') == 'pull_request':
        match = TITLE.fullmatch(os.environ.get('PR_TITLE',''))
        if not match: raise SystemExit('Título de release inválido')
        kind = match[1]
    run = os.environ.get('GITHUB_RUN_NUMBER','1')
    attempt = os.environ.get('GITHUB_RUN_ATTEMPT','1')
    if not run.isdigit() or not attempt.isdigit(): raise SystemExit('Identificação do run inválida')
    if args.mode == 'release':
        version = resolve(tags, git('tag','--points-at',target).splitlines(), baseline, kind)
        app_version = version
        candidate = f'release-candidate-{version}-r{run}.{attempt}'
    else:
        version = max([baseline]+[t for t in tags if STABLE.fullmatch(t)], key=parse)
        app_version = f'{version}-develop.{run}.{attempt}'
        candidate = f'develop-{version}-r{run}.{attempt}'
    major, minor, patch = parse(version)
    result = dict(version=version, app_version=app_version, tag=version, major=str(major),
                  minor=str(minor), patch=str(patch), target_sha=target, candidate_tag=candidate)
    print(json.dumps(result, indent=2))
    if output := os.getenv('GITHUB_OUTPUT'):
        with open(output, 'a') as handle:
            handle.writelines(f'{key}={value}\n' for key,value in result.items())

if __name__ == '__main__': main()
