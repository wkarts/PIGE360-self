# Desenvolvimento, releases e instalação — PIGE360 Self

## Origem e escopo

Adaptação dos anexos **PlanilhaAT-main.zip** e **PlanilhaAT-develop.zip**: validação de PR, imagem develop, bases GHCR por fingerprint, release por promoção de candidato e manutenção de cache/registry. Os anexos possuem o mesmo conteúdo de arquivos, embora os bytes dos ZIPs sejam diferentes. Não foram transplantados módulos, regras fiscais, autenticação Supabase, frontend React ou implantação Vercel. A aplicação permanece FastAPI + Vue 3 Web/PWA.

A base local foi conferida contra a árvore `d58f0f5e78286115695b43b5eb496dfa9f5fc534`, do commit `8eee3d6f582e3c500acf0da7f9605189bd3a79b3` em `wkarts/PIGE360-self`. As migrations e os módulos operacionais não foram refatorados. Os relatórios `evidence/0.3.0` anteriores são históricos; não representam validação deste novo pipeline.

## Fluxo

```text
feature/*, fix/*, ci/* ... → PR develop → testes → bases GHCR
→ candidato develop imutável → smoke Docker → aliases develop

develop → PR main com release(patch|minor|major): descrição
→ merge autorizado → testes → bases → candidato estável
→ smoke Docker → tag numérica + release draft + ZIP
→ promoção do mesmo digest → publicação da GitHub Release
```

Push direto em `main` valida CI, mas não publica release estável. A única exceção ao fluxo de PR foi o bootstrap desta configuração. PR de fork chamado `develop` não pode acionar release. Execução manual de release é restrita a `main`; execução manual de develop, a `develop`.

A validação de título é um **check**, não uma regra de proteção administrativa da branch. Configure rulesets/required checks no GitHub para impedir merges que ignorem CI; nenhuma proteção administrativa é alegada como ativada por estes arquivos.

## SemVer sem prefixo

A primeira release sem tag numérica prévia usa `VERSION` (atualmente `0.3.0`); as seguintes incrementam `patch`, `minor` ou `major`. Tags de pré-release e tags `v...` não entram no cálculo. A manutenção, contudo, preserva versões estáveis legadas com v. Reexecutar release já publicada do mesmo commit não gera nova versão.

| Canal | Exemplos de tags da imagem |
|---|---|
| Desenvolvimento | `develop`, `develop-0`, `develop-0.3`, `develop-0.3.0`, `develop-0.3.0-r12.1` |
| Estável | `0.3.0`, `0.3`, `0`, `production`, `stable`, `latest` |
| Candidato interno | `release-candidate-0.3.0-r4.1` |

A versão interna de develop usa `0.3.0-develop.12.1`. `APP_VERSION` é incorporada no backend via imagem e no build da PWA. O arquivo `VERSION` no Git é a base inicial, não um contador que exige commits do bot a cada build. O manifesto da release informa versão calculada e commit fonte.

Tags móveis apontam ao último build aprovado; para rollback e instalações controladas, use a versão exata ou `@sha256:...`. Não reutilize uma tag estável para outro digest.

## Imagens

- `ghcr.io/wkarts/pige360-self`: API, PWA e worker (mesma imagem; comandos diferentes).
- `ghcr.io/wkarts/pige360-self-base-node:22-alpine`: compilação Node.
- `ghcr.io/wkarts/pige360-self-base-python:3.13-slim`: runtime Python.
- `ghcr.io/wkarts/pige360-self-postgres:17-bookworm`: wrapper do PostgreSQL da instalação.

Build inicial: `linux/amd64`. Nenhum build ARM/mobile/desktop é alegado. Bases são reconstruídas quando mudam digest upstream, Dockerfile ou aliases; execução manual pode forçar. O pipeline resolve bases por digest antes do build da aplicação. `provenance`/`sbom` automáticos do BuildKit permanecem desativados, como nos anexos; não alegar SBOM/atestado assinado como entregue.

A publicação usa `GITHUB_TOKEN` com `packages:write`; a release exige `contents:write`. A imagem precisa estar vinculada ao repositório. Visibilidade pública do pacote não é presumida: se for privado, faça login de leitura no host; para pull anônimo, altere a visibilidade em Package settings. O pipeline informa essa condição sem fingir que o pacote é público.

## Testes que bloqueiam a publicação

Políticas de CI/CD; testes FastAPI com PostgreSQL 17 real, incluindo concorrência; compilação TypeScript e PWA; E2E HTTP no Chromium; build Docker completo; inicialização de aplicação, banco e worker em projeto descartável; health checks e entrega de páginas/manifesto. O candidato é testado por digest. Falha não atualiza aliases de desenvolvimento nem estáveis.

Os arquivos de evidência atuais são artifacts dos runs. Nenhuma chave `.env` acompanha os artifacts. O smoke usa exclusivamente projeto `pige360-ci-*`, com volumes descartáveis; ele não acessa VPS, dados ou volumes da instalação.

## Limpeza automática

A cada 6 horas, a partir do workflow presente em `main`:

1. Caches fora de `main` e `develop`, sem uso por mais de 2 horas.
2. Imagens não estáveis com mais de 7 dias, preservando as 10 versões efêmeras mais recentes de cada pacote.
3. Órfãos sem tag somente após inventário completo e inspeção dos manifestos OCI. Filhos de imagens preservadas não são lixo.

No encerramento de PR, remover apenas `refs/pull/NUMERO/merge`. O workflow privilegiado executa exclusivamente código de `main`, nunca da branch do PR.

A limpeza preserva SEMPRE versões `X.Y.Z`, aliases numéricos, `latest`, `stable`, `production`, `main`, aliases develop ativos e qualquer tag desconhecida. Uma única tag protegida protege todo o digest, mesmo que ele também possua uma tag de candidato. Não é necessário haver tag Git correspondente para preservar imagem estável.

Allowlist exclusiva dos quatro pacotes acima, e vínculo obrigatório ao repositório. Falha na inspeção de manifestos aborta exclusões; pacote inacessível ou de outro repositório é preservado. A lista é obtida completamente antes de apagar, evitando saltos de paginação. O inventário é revalidado antes da exclusão. Publicação e limpeza compartilham controle de concorrência. Não executar mutações manuais no registry durante manutenção.

Variáveis opcionais: `GHCR_MIN_AGE_DAYS=7`, `GHCR_KEEP_RECENT=10`. Execução manual começa com `dry_run=true`; confira o artifact antes de usar `false`. Pacotes antigos podem precisar conceder ao repositório acesso administrativo ao pacote. Falhas de autorização não são tratadas como exclusão bem-sucedida.

## Instalação nova — estável

Somente depois de uma release estável publicada:

```bash
python3 scripts/configure.py --channel stable --url https://escola.exemplo.com.br
# Caso o pacote seja privado: docker login ghcr.io (token com leitura de packages).
docker compose --env-file .env -f deploy/compose.yaml pull
docker compose --env-file .env -f deploy/compose.yaml up -d --wait
```

Configure seu proxy/CloudPanel para `127.0.0.1:58080`, com HTTPS e Host original. Defina `TRUSTED_PROXY_IPS` conforme a rede real do proxy. Não existe Nginx ou Traefik dentro da stack. Application/PWA: uma única porta. Banco e worker: sem portas publicadas.

## Instalação develop isolada

```bash
python3 scripts/configure.py --channel develop --env-file .env.develop --url https://d.escola.exemplo.com.br
# A configuração usa porta 58081 e projeto Compose pige360-self-develop.
docker compose --env-file .env.develop -f deploy/compose.yaml pull
docker compose --env-file .env.develop -f deploy/compose.yaml up -d --wait
```

O gerador não sobrescreve arquivo existente. Não reutilizar as credenciais ou volumes de produção. Para CloudPanel, Dockge ou Portainer, usar o mesmo `deploy/compose.yaml` image-only e suas variáveis; não há dependência de checkout/build no servidor. O PostgreSQL upstream continua padrão; selecionar o wrapper GHCR em `POSTGRES_IMAGE` é opcional, mantendo major 17.

## Atualização de instalação 0.3.0 existente

Faça backup de banco, arquivos e chaves antes de trocar o código. Preserve `.env`, `COMPOSE_PROJECT_NAME`, nomes dos volumes e `INTEGRATION_ENCRYPTION_KEY`. Não execute configurador novamente. Se os volumes originais são `pige360-self_postgres_data` e `pige360-self_documents_data`, mantenha projeto `pige360-self`; para instalações com outro nome, preserve o nome REAL observado em `docker compose ls`/`docker volume ls`.

Depois de uma imagem publicada, altere APENAS `APP_IMAGE` para a tag desejada e configure `APP_PULL_POLICY=always`:

```bash
docker compose --env-file .env -f deploy/compose.yaml pull
docker compose --env-file .env -f deploy/compose.yaml up -d --wait
docker compose --env-file .env -f deploy/compose.yaml logs --tail=100 app worker
```

Não usar `down -v`. O código não executa deploy remoto nem modifica servidores. Os scripts de backup/restauração existentes usam o Compose da raiz; execute-os na mesma pasta/projeto da instalação. Rollback de imagem não reverte migrations incompatíveis: restauração exige backup coerente e procedimento testado.

## Checkpoint local

```bash
python3 scripts/ci/package.py --version 0.3.0 --commit COMMIT_COMPLETO --output /caminho/checkpoint.zip
```

Executar em checkout Git com os arquivos desejados rastreados. O pacote contém aplicação, workflows, Compose e documentação, com `MANIFEST.json` e `SHA256SUMS` regenerados. Não contém o template original, `.env`, chaves, caches, node_modules ou fontes. Gerar checkpoint não publica nada.

## Falha parcial de release

O processo mantém draft antes da promoção final. Reexecuções de release publicada são ignoradas. Se uma falha ocorrer entre promoção de uma tag exata e publicação da release, preserve o digest já associado à tag exata; nunca force sua substituição. Reconcilie/reexecute a finalização com o candidato original, não uma imagem recompilada. As operações de registry e GitHub Releases não são uma transação atômica única.

## Fontes técnicas externas utilizadas na adaptação

GitHub Docs: REST Actions Cache; Working with the Container registry; Deleting and restoring a package. Docker Docs: buildx imagetools create (`--prefer-index=false`). O contrato das Actions utilizadas vem dos workflows anexados; o npm lock registra a integridade oficial de TypeScript 5.8.3.

## Isolamento do namespace das bases

As bases usam o prefixo `pige360-self-`, exclusivo desta aplicação. A primeira tentativa com `pige360-base-node` encontrou `permission_denied: write_package`. Nenhum pacote antigo foi excluído, desvinculado ou teve permissões alteradas para contornar esse bloqueio. A criação de novas bases próprias do repositório evita depender de pacotes gerais ou de outra instalação. Se houver bloqueio também no namespace novo, conceder acesso de Actions ao pacote correto é uma operação administrativa; não habilitar publicação com credenciais amplas de outros projetos.
