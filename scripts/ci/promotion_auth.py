#!/usr/bin/env python3
"""Seleciona autenticação sem emitir credenciais ou fazer chamadas externas."""
import os


LEGACY_WARNING = ('Promoção em modo legado GITHUB_TOKEN: a validação da PR pode exigir '
                  'aprovação humana e expirar. Para evitar o gate específico do GITHUB_TOKEN, configure a GitHub App '
                  'restrita conforme docs/PROMOTION-GITHUB-APP.md. Nenhuma proteção foi alterada.')


def select_mode(client_id, private_key):
    if not client_id and not private_key:
        return 'legacy'
    if not client_id.strip() or not private_key.strip():
        raise RuntimeError('Configuração parcial/inválida da App: informe PROMOTION_APP_CLIENT_ID '
                           'e PROMOTION_APP_PRIVATE_KEY juntos. Sem fallback para GITHUB_TOKEN.')
    return 'app'


def main():
    mode = select_mode(os.getenv('PROMOTION_APP_CLIENT_ID', ''),
                       os.getenv('PROMOTION_APP_PRIVATE_KEY', ''))
    if mode == 'legacy':
        print('::warning::' + LEGACY_WARNING)
    with open(os.environ['GITHUB_OUTPUT'], 'a') as handle:
        handle.write(f'mode={mode}\n')
    if path := os.getenv('GITHUB_STEP_SUMMARY'):
        with open(path, 'a') as handle:
            handle.write('\n' + (LEGACY_WARNING if mode == 'legacy' else
                                 'Promoção: GitHub App restrita ao repositório; token temporário.') + '\n')


if __name__ == '__main__':
    main()
