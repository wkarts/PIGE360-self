#!/usr/bin/env python3
"""Promove somente develop validado do PIGE; não altera regras, secrets ou servidores."""
import argparse
import json
import os
import re
import time
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import HTTPRedirectHandler, Request, build_opener

from version import TITLE, validate_pr

REPOSITORY = 'wkarts/PIGE360-self'
SHA = re.compile(r'[0-9a-f]{40}')
MARKER = '<!-- pige360-auto-promotion -->'


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def sha(value):
    require(isinstance(value, str) and SHA.fullmatch(value), 'SHA completo inválido')
    return value


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise RuntimeError('Redirect inesperado da API; operação interrompida')


class GitHub:
    def __init__(self):
        require(os.environ.get('GITHUB_REPOSITORY') == REPOSITORY, 'Repositório fora do escopo')
        self.token = os.environ.get('GH_TOKEN', '')
        require(bool(self.token.strip()), 'Token da promoção ausente; operação interrompida sem fallback')

    def api(self, path, method='GET', data=None):
        # Sem redirects nem endpoints fornecidos por PRs. O token só vai ao GitHub.
        require(path.startswith('/') and not path.startswith('//'), 'Endpoint inválido')
        request = Request('https://api.github.com/repos/' + REPOSITORY + path,
                          data=json.dumps(data).encode() if data is not None else None,
                          headers={'Authorization': 'Bearer ' + self.token,
                                   'Accept': 'application/vnd.github+json',
                                   'X-GitHub-Api-Version': '2022-11-28',
                                   'Content-Type': 'application/json'}, method=method)
        try:
            with build_opener(NoRedirect).open(request, timeout=30) as response:
                payload = response.read()
                return json.loads(payload) if payload else None
        except HTTPError as error:
            # Não repetir POST/PUT incerto: uma nova execução reconcilia o estado real.
            message = error.read().decode('utf-8', errors='replace')[:1000]
            if method == 'POST' and path == '/pulls' and error.code == 403:
                raise RuntimeError('GitHub recusou criar a PR. Verifique a permissão '
                                   'da GitHub App (Pull requests: write e Contents: read), ou, no modo legado, '
                                   '“Allow GitHub Actions to create and approve pull requests”. '
                                   'Nenhuma configuração foi alterada. ' + message) from error
            raise RuntimeError(f'GitHub {method} {path}: HTTP {error.code}: {message}') from error

    def pages(self, path, key=None):
        values = []
        for page in range(1, 101):
            result = self.api(path + ('&' if '?' in path else '?') + urlencode({'per_page': 100, 'page': page}))
            batch = result[key] if key else result
            values.extend(batch)
            if len(batch) < 100:
                return values
        raise RuntimeError('Paginação excedeu limite seguro; operação interrompida')

    def branch(self, branch):
        require(branch in ('main', 'develop'), 'Branch fora do escopo')
        return sha(self.api('/git/ref/heads/' + branch)['object']['sha'])


def identity(pr):
    for side, ref in (('head', 'develop'), ('base', 'main')):
        require(pr[side]['ref'] == ref and pr[side].get('repo', {}).get('full_name') == REPOSITORY,
                'PR precisa ser develop → main do mesmo repositório')
    require(not pr.get('draft'), 'PR em rascunho exige decisão humana')
    validate_pr(pr['title'], pr.get('body') or '', 'develop', 'main', True)
    return TITLE.fullmatch(pr['title'])[1]


def assert_current(api, expected_head, expected_base=None):
    require(api.branch('develop') == sha(expected_head), 'develop mudou; aguarde o pipeline do novo SHA')
    base = api.branch('main')
    if expected_base:
        require(base == sha(expected_base), 'main mudou; execute novamente para testar o novo merge sintético')
    return base


def snapshot(api, number, expected_head, expected_base=None):
    pr = api.api(f'/pulls/{number}')
    bump = identity(pr)
    require(pr['state'] == 'open' and not pr.get('merged'), 'PR não está aberta')
    require(pr['head']['sha'] == expected_head, 'Head da PR mudou')
    base = assert_current(api, expected_head, expected_base)
    require(pr['base']['sha'] == base, 'Base da PR ainda não reflete main')
    require(pr.get('mergeable') is True, 'PR conflitante ou mergeabilidade ainda desconhecida')
    merge_sha = sha(pr['merge_commit_sha'])
    commit = api.api('/git/commits/' + merge_sha)
    require([p['sha'] for p in commit['parents']] == [base, expected_head],
            'Merge sintético não corresponde exatamente a main + develop')
    return {'pr': str(number), 'head': expected_head, 'base': base, 'merge': merge_sha,
            'tree': sha(commit['tree']['sha']), 'bump': bump, 'release_sha': '', 'ready': 'true'}


def prepare(api, expected_head, sleep=time.sleep):
    base = assert_current(api, expected_head)
    comparison = api.api(f'/compare/{base}...{expected_head}')
    if comparison['ahead_by'] == 0:
        # Retry depois do merge e antes/durante a publicação: reutiliza o mesmo commit.
        closed = api.pages('/pulls?state=closed&base=main&head=wkarts%3Adevelop&sort=updated&direction=desc')
        matches = [p for p in closed if p.get('merged_at') and p['head']['sha'] == expected_head
                   and p.get('merge_commit_sha') == base]
        if matches:
            pr = api.api('/pulls/' + str(matches[0]['number']))
            bump = identity(pr)
            require(pr.get('merged') is True, 'PR fechada não está mesclada')
            return {'ready': 'false', 'release_sha': base, 'pr': str(pr['number']), 'bump': bump}
        return {'ready': 'false', 'release_sha': '', 'pr': '', 'bump': 'patch'}
    prs = api.pages('/pulls?state=open&base=main&head=wkarts%3Adevelop')
    require(len(prs) <= 1, 'Mais de uma PR develop → main; reconciliação humana necessária')
    if prs:
        number = prs[0]['number']
        identity(prs[0])  # Preserva título, incremento e descrição decididos por humanos.
    else:
        body = (f'{MARKER}\n## Descrição\nPromoção automática do develop validado. '
                f'SHA inicial: `{expected_head}`.\n\n## Branch\n`develop` → `main`\n\n'
                'CI completo será executado no merge sintético antes do merge normal. '
                'Release SemVer patch e imagens GHCR são publicadas somente após os testes e smoke. '
                'Não executa deploy em servidor.\n')
        created = api.api('/pulls', 'POST', {'head': 'develop', 'base': 'main',
                          'title': 'release(patch): promove develop validado automaticamente', 'body': body})
        number = created['number']
    # GitHub calcula mergeabilidade de forma assíncrona. Só esta leitura é repetida.
    for attempt in range(24):
        pr = api.api(f'/pulls/{number}')
        if pr.get('mergeable') is not None:
            return snapshot(api, number, expected_head, base)
        sleep(5)
    raise RuntimeError('GitHub não calculou mergeabilidade em 120 segundos; PR preservada para retry')


def merge(api, expected, ci_result):
    require(ci_result == 'success', 'CI do merge sintético não passou')
    current = snapshot(api, int(expected['pr']), expected['head'], expected['base'])
    for key in ('merge', 'tree', 'bump'):
        require(current[key] == expected[key], 'PR mudou após os testes: ' + key)
    # O endpoint normal aplica as proteções existentes; não usa admin, force ou bypass.
    result = api.api(f"/pulls/{expected['pr']}/merge", 'PUT',
                     {'sha': expected['head'], 'merge_method': 'merge',
                      'commit_title': f"release({expected['bump']}): promove develop validado (#{expected['pr']})"})
    require(result.get('merged') is True, 'GitHub não confirmou merge: ' + str(result.get('message', '')))
    merged = sha(result['sha'])
    actual = api.api('/git/commits/' + merged)
    require([p['sha'] for p in actual['parents']] == [expected['base'], expected['head']]
            and actual['tree']['sha'] == expected['tree'],
            'main mudou durante o merge; publicação bloqueada. O commit foi mesclado e precisa ser revalidado.')
    require(api.branch('main') == merged, 'main avançou após merge; publicação deste SHA bloqueada')
    return {'release_sha': merged, 'pr': expected['pr'], 'bump': expected['bump']}


def verify_release(api, target, number=''):
    sha(target)
    require(api.branch('main') == target, 'Release exige o SHA atual de main; nada será publicado')
    if number:
        require(number.isdigit(), 'Número de PR inválido')
        pr = api.api('/pulls/' + number)
        identity(pr)
        require(pr.get('merged') is True and pr['merge_commit_sha'] == target,
                'PR de promoção não corresponde ao SHA da release')
    return target


def trusted_run(run, target, pr):
    if (run.get('repository', {}).get('full_name') != REPOSITORY
            or run.get('head_repository', {}).get('full_name') != REPOSITORY
            or run.get('path') != '.github/workflows/release.yml'):
        return False
    if run['event'] == 'workflow_dispatch':
        return (run['head_branch'] == 'main' and run['head_sha'] == target
                and run['display_title'].endswith(' | ' + target))
    if run['event'] == 'pull_request':
        return (run['head_branch'] == 'develop' and run['head_sha'] == pr['head']['sha']
                and run['created_at'] >= pr['merged_at']
                and (run['display_title'].endswith(' | ' + target) or run['display_title'] == pr['title']))
    return False


def dispatch(api, target, number, bump, correlation, sleep=time.sleep):
    from release_state import releases_for_sha
    require(bump in ('patch', 'minor', 'major'), 'Incremento inválido')
    require(re.fullmatch(r'[0-9]+-[0-9]+', correlation), 'Correlação inválida')
    verify_release(api, target, number)
    pr = api.api('/pulls/' + number)
    require(identity(pr) == bump, 'Incremento da PR mudou antes do dispatch')
    result = {'correlation': correlation, 'release_sha': target, 'pr': number,
              'run_id': '', 'published': 'false'}
    # A API não tem chave de idempotência. Releituras dão tempo para um POST anterior
    # de resultado incerto aparecer, sem repetir a mutação durante essa janela.
    for attempt in range(4):
        runs = [run for run in api.pages('/actions/workflows/release.yml/runs', 'workflow_runs')
                if trusted_run(run, target, pr)]
        if runs:
            run = max(runs, key=lambda r: (r['id'], r['run_attempt']))
            if run['status'] == 'completed':
                require(run['conclusion'] == 'success',
                        'Release existente falhou. Reexecute os jobs desse run preservando os candidatos: ' + run['html_url'])
            result['run_id'] = str(run['id'])
            print('Reutilizando release existente: ' + run['html_url'])
            return result
        existing = releases_for_sha(api, target)
        if existing:
            require(not existing[0]['draft'] and not existing[0]['prerelease'],
                    'Release parcial existente; recupere o run original sem reconstruir tags imutáveis')
            result['published'] = 'true'
            return result
        if attempt < 3:
            sleep(15)
    verify_release(api, target, number)
    require(identity(api.api('/pulls/' + number)) == bump, 'Incremento da PR mudou antes do dispatch')
    api.api('/actions/workflows/release.yml/dispatches', 'POST',
            {'ref': 'main', 'inputs': {'bump': bump, 'target_sha': target,
             'promotion_pr': number, 'promotion_run': correlation}})
    print(f'Release solicitada para {target}. A publicação ainda precisa concluir.')
    return result


def watch(api, target, correlation, number='', run_id='', published='false',
          sleep=time.sleep, monotonic=time.monotonic, verify=None):
    from release_state import verify_for_sha
    verify = verify or verify_for_sha
    if published == 'true':
        return verify(api, target)
    require(number.isdigit(), 'PR de promoção inválida')
    pr = api.api('/pulls/' + number)
    identity(pr)
    require(pr.get('merged') and pr['merge_commit_sha'] == target, 'PR não corresponde ao SHA solicitado')
    require(not run_id or run_id.isdigit(), 'Run inválido')
    deadline = monotonic() + 7200
    title = f'PIGE360 stable | {correlation} | {target}'
    while monotonic() < deadline:
        if run_id:
            run = api.api('/actions/runs/' + run_id)
            require(trusted_run(run, target, pr), 'Run existente não corresponde à release solicitada')
            matches = [run]
        else:
            runs = api.pages('/actions/workflows/release.yml/runs?event=workflow_dispatch&branch=main', 'workflow_runs')
            matches = [r for r in runs if r['display_title'] == title]
        if matches:
            run = max(matches, key=lambda r: (r['id'], r['run_attempt']))
            require(trusted_run(run, target, pr), 'main mudou durante o dispatch ou origem inválida: ' + run['html_url'])
            if run['status'] == 'completed':
                require(run['conclusion'] == 'success', 'Release não concluiu com sucesso: ' + run['html_url'])
                result = verify(api, target)
                result['run_url'] = run['html_url']
                print('Release e imagens verificadas: ' + run['html_url'])
                return result
        sleep(30)
    raise RuntimeError('Release não confirmou sucesso em 120 minutos; consulte Actions. Não há confirmação de latest.')


def output(values):
    print(json.dumps(values, ensure_ascii=False))
    if path := os.getenv('GITHUB_OUTPUT'):
        with open(path, 'a') as handle:
            for key, value in values.items():
                require('\n' not in value and '\r' not in value, 'Output inválido')
                handle.write(f'{key}={value}\n')
    if path := os.getenv('GITHUB_STEP_SUMMARY'):
        with open(path, 'a') as handle:
            handle.write('\nPromoção PIGE360: ' + json.dumps(values, ensure_ascii=False) + '\n')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('mode', choices=('prepare', 'merge', 'dispatch', 'watch', 'verify-release'))
    args = parser.parse_args()
    api = GitHub()
    if args.mode == 'prepare':
        require(os.getenv('GITHUB_REF') == 'refs/heads/develop'
                and os.getenv('GITHUB_EVENT_NAME') in ('push', 'workflow_dispatch'), 'Origem de execução inválida')
        require(os.environ['EXPECTED_HEAD'] == os.environ['GITHUB_SHA'], 'SHA não corresponde ao workflow develop')
        result = prepare(api, os.environ['EXPECTED_HEAD'])
    elif args.mode == 'merge':
        result = merge(api, {k: os.environ['EXPECTED_' + k.upper()] for k in ('pr', 'head', 'base', 'merge', 'tree', 'bump')}, os.environ['CI_RESULT'])
    elif args.mode == 'dispatch':
        result = dispatch(api, os.environ['TARGET_SHA'], os.environ['PROMOTION_PR'], os.environ['BUMP'], os.environ['CORRELATION'])
    elif args.mode == 'watch':
        result = watch(api, os.environ['TARGET_SHA'], os.environ['CORRELATION'],
                       os.environ['PROMOTION_PR'], os.getenv('RELEASE_RUN_ID', ''),
                       os.getenv('ALREADY_PUBLISHED', 'false'))
    else:
        require(os.getenv('GITHUB_REF') == 'refs/heads/main', 'Release somente em main')
        require(os.environ['TARGET_SHA'] == os.environ['TRUSTED_EVENT_SHA'],
                'SHA solicitado difere do evento main; checkout arbitrário proibido')
        result = {'target_sha': verify_release(api, os.environ['TARGET_SHA'], os.getenv('PROMOTION_PR', ''))}
    output(result)


if __name__ == '__main__':
    main()
