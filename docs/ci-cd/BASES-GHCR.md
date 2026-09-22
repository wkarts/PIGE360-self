# PIGE360 Self — bases reutilizáveis e serviços no GHCR

Complemento ao fluxo `FLUXO-GITHUB-GHCR.md`. Preserva FastAPI, Vue 3/PWA, SemVer sem prefixo v/w, aprovação do candidato antes da promoção e ausência de deploy externo. Não altera módulos, migrations, branding ou dados da Secretaria.

## Imagens do próprio projeto

| Pacote GHCR no owner wkarts | Função | Alias de compatibilidade |
|---|---|---|
| pige360-self-base-python | Python 3.13 e dependências de backend/requirements.txt instaladas | 3.13-slim |
| pige360-self-base-node | Node 22 e dependências do frontend/package-lock.json instaladas | 22-alpine |
| pige360-self-postgres | Espelho da imagem oficial PostgreSQL 17 | 17-bookworm |
| pige360-self-redis | Espelho da imagem oficial Redis 8 | 8-alpine |
| pige360-self-rabbitmq | Espelho da imagem oficial RabbitMQ 4 com management | 4-management-alpine |
| pige360-self | Aplicação e worker, a partir das bases acima | develop / latest / SemVer |

O namespace exclusivo `pige360-self-*` é preservado. Nenhum pacote de outro produto é reutilizado ou limpo. As bases são construídas para `linux/amd64`; não se declara suporte multiarch nesta revisão.

A instalação continua com **app, worker e PostgreSQL**, uma porta HTTP publicada e proxy externo. Redis/RabbitMQ ficam disponíveis no catálogo GHCR, mas NÃO são serviços ativos nem dependências artificiais da aplicação atual. MinIO e outros serviços devem ser acrescentados ao catálogo somente quando houver integração/consumidor real.

## Quando uma base é atualizada

`scripts/ci/base_images.py` calcula SHA-256 usando Dockerfile, arquivos de dependências, digest upstream, plataforma e `security_revision` do item em `containers/images.json`.

* Alteração em tela, rota, regra da Secretaria ou versão do produto não modifica a base.
* Mudança em requirements reconstrói a base Python correspondente.
* Mudança em package.json/package-lock reconstrói a base Node correspondente.
* Dockerfile, plataforma, upstream ou revisão de segurança alterados geram nova impressão digital.
* Alias ausente/divergente é corrigido por retag, sem rebuild.
* A rotina semanal consulta upstream, mas não reconstrói quando o digest permanece igual.

A tag imutável é `base-<sha256 completo>`. Execuções comuns reaproveitam o digest upstream gravado nos metadados; não buscam a tag móvel oficial em cada commit. `refresh_upstream=true` consulta atualizações. O antigo input `force` permanece compatível, mas significa consultar upstream: ele NÃO força rebuild desnecessário. Para reinstalação motivada por uma correção de segurança, incremente `security_revision` apenas no item afetado.

O primeiro registro/cold start precisa baixar a imagem oficial upstream. Depois disso, app/worker/PostgreSQL consomem imagens GHCR. As versões de serviço existentes são preservadas; atualizar a imagem PostgreSQL não implica alterar a versão major de um banco em produção.

## Dependências realmente reutilizadas

As bases incluem pip/npm já instalados. O Dockerfile da aplicação confere os arquivos de dependências e reutiliza a instalação quando coincidem. PRs que mudam dependências antes da publicação da base mantêm um fallback explícito para instalação durante o teste; isso não publica uma base a partir de código não confiável.

O backend conserva suas dependências diretas fixadas. `pip freeze` é registrado dentro da base para inspeção. Não se afirma que esse arquivo substitui um lock transitivo completo de Python.

## Main / develop e referências imutáveis

A sequência de publicação é: resolver versão e commit → assegurar bases → executar testes com os digests retornados → construir candidato com os mesmos digests → smoke com PostgreSQL fixado → promoção do candidato aprovado.

`develop` continua sem publicar `latest`/aliases estáveis. `main` mantém as regras de release e não reconstrói a imagem na promoção. Nenhum endpoint, token ou job de Vercel é acrescentado.

`container-bases.yml` produz `base-images.lock.json` como artifact. Na release, o pacote inclui `deploy/images.lock.json` e `deploy/images.env`, com aplicação/PostgreSQL fixados por digest. Os labels OCI da aplicação registram as bases Node/Python e a referência PostgreSQL. Não resolver novamente aliases entre teste e publicação.

## Bootstrap e autenticação

Em uma instalação nova do pipeline, executar primeiro **GHCR - Bases e servicos sob demanda** em `main`, antes de exigir CI que puxa esses pacotes. Em develop, o próprio pipeline assegura as bases antes dos testes. PRs não publicam bases e exigem as imagens já disponíveis para leitura.

O GitHub Actions utiliza GITHUB_TOKEN e permissões específicas de leitura/escrita. Pacotes privados exigem autenticação para pull na VPS; o operador também pode torná-los públicos nas configurações dos pacotes. Não são solicitados nem armazenados tokens na aplicação.

Erros de autenticação, rede e registry não são tratados como prova de imagem ausente. O job falha, sem simular que publicou/reutilizou corretamente.

## Instalação e atualização

O Compose raiz continua destinado ao build local. `deploy/compose.yaml` continua image-only. Ambos apontam PostgreSQL para `ghcr.io/wkarts/pige360-self-postgres:17-bookworm`, substituível por `POSTGRES_IMAGE`.

Para novas instalações de produção, use `python scripts/configure.py --channel stable --url https://sua-escola.example` e o Compose de deploy. Preserve sempre .env, segredos e volumes de instalações existentes. A nova variável está no .env.example; não regenere credenciais para atualizar imagens.

Para fixar uma release, incorpore somente APP_IMAGE, POSTGRES_IMAGE e APP_PULL_POLICY de `deploy/images.env` ao .env existente; não substitua o arquivo inteiro. Depois execute `docker compose --env-file .env -f deploy/compose.yaml pull` e `docker compose --env-file .env -f deploy/compose.yaml up -d --wait`.

Não usar `down -v`. A publicação de uma base nova não executa deploy na VPS nem modifica bancos de dados.

## Retenção

A limpeza de Actions preserva main/develop conforme o fluxo já existente. A limpeza GHCR é limitada ao pacote da aplicação e continua protegendo tags estáveis e dependências OCI.

**Bases e espelhos foram excluídos da limpeza automática, inclusive quando --orphans é solicitado.** Digests antigos podem constar em releases ou checkpoints e não são lixo apenas por terem perdido um alias. Isso implica acumulação de versões de base; qualquer redução futura deve conferir as referências das releases antes de excluir.

## Validação e referências

`python -m unittest discover -s tests/ci -v` inclui testes de fingerprint, reuso, retag, distinção de falhas de registry, catálogo, proteção de bases e locks de release. Os testes unitários substituem o registry por doubles de teste; não são homologação de publicação real.

A execução Docker/PostgreSQL/Chromium e a publicação real são verificações do GitHub Actions. Não apresentar validação estática local como sucesso dessas etapas.

Documentação oficial consultada: Docker Buildx imagetools inspect/create, cache GHA e GitHub Container Registry. O mecanismo de cache GHA usa version=2 e escopos separados por canal; a base usa cache inline/registry próprio.
