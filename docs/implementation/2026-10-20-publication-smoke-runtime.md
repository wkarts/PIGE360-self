# Publicação após o merge da PR 57 — runtime do smoke

## Origem e causa comprovada

HEAD remoto `develop` conferido antes das alterações: `c0b7ab2a62167eeb406cdb6e3f9b7947ced95c26`, merge da PR 57. Árvore `60df48dfc97494b1b091d79a6dcfb0b5e38946eb`, idêntica ao código validado da revisão de autorização. Nenhum checkpoint reaplicado.

O [run 39348619088](https://github.com/wkarts/PIGE360-self/actions/runs/39348619088), job `publish / publish` (`118391870060`), construiu as cinco imagens candidatas e iniciou a stack descartável. Gestor, site e portal ficaram saudáveis. O passo 12 parou na importação de `scripts/ci/surfaces-smoke.py`: `ModuleNotFoundError: No module named 'httpx'`.

O job de testes instalava `backend/requirements-dev.txt` e Chromium, mas o job de publicação começava em outro runner e não preparava esses componentes. Depois do primeiro erro também faltariam Playwright e seu navegador; instalar apenas httpx deixaria a causa parcialmente corrigida. O estado saudável do SOGo e a ausência da dependência no host distinguem esta falha dos avisos de criação inicial de tabelas do webmail.

As cinco construções e o smoke isolado do site passaram. A promoção dos aliases develop foi **ignorada** e o job `promote` não executou. Imagens candidatas construídas não equivalem a canal promovido, release concluída ou deploy.

## Correção

- Ação composta `setup-smoke`: Python 3.13, dependências HTTP/navegador fixadas e Chromium com bibliotecas do sistema. Verificação executável cria cliente HTTP e inicia um navegador real com página sintética, antes de construir/publicar candidatos.
- `publish-image.yml` usa a ação após checkout e antes dos builds. Gate do smoke integrado e todas as asserções de isolamento, restauração e preservação permanecem.
- Job independente `publication_smoke_runtime` no CI da PR usa a **mesma ação**, sem instalar o backend; assim os testes gerais não mascaram dependências ausentes do publisher.
- `requirements-smoke.txt` compartilha os pins já existentes de httpx 0.28.1 e Playwright 1.57.0 com `requirements-dev.txt`. Cache do CI considera ambos. Nenhuma dependência de produção, serviço, imagem estável, segredo ou parâmetro de instalação foi alterado.
- Três testes de contrato verificam a preparação antes do build, o gate antes da promoção, o runner isolado e as dependências/bibliotecas do navegador.

## Validação local

- `PIGE_COMPOSE_BINARY=/tmp/pige-compose /tmp/pige-venv/bin/python -m unittest discover -s tests/ci -v`: **211 testes aprovados**, incluindo regressões e Compose CLI real, sem daemon Docker.
- `python scripts/ci/validate.py`, `compileall`, `git diff --check`, YAML e actionlint 1.7.7 dos workflows alterados: aprovados.
- Ambiente virtual novo (Python 3.12 local), sem pacotes do backend, reproduziu `ModuleNotFoundError: httpx`. Instalar somente o arquivo compartilhado permitiu importar httpx/Playwright, criar cliente e iniciar o driver Playwright.
- A instalação do Chromium 143 do Playwright 1.57 pelo CDN falhou no transporte deste ambiente; nenhum navegador foi iniciado localmente nesta correção. A instalação e a execução sem override com Python 3.13 são verificadas pelo novo job remoto.
- Sem daemon Docker local: o smoke completo e PostgreSQL/Windows dependem do CI remoto. A evidência terminal deve identificar o SHA e o run da nova PR; um resultado anterior não valida esta correção.

## Operação, publicação e rollback

A correção segue em nova branch/PR para develop, pois a PR 57 já foi mesclada pelo usuário. Não houve merge, nova execução de publicação, promoção manual ou deploy neste atendimento. Reexecutar o run antigo usa o workflow daquele SHA e não incorpora a correção.

Após integração autorizada, o fluxo normal prepara o runtime, constrói e testa os candidatos por digest e só então promove os aliases permitidos. Desenvolver não publica `latest`/estáveis. Reverter esta mudança reintroduz a dependência implícita do runner; não exige rollback de banco, volumes ou configuração da instalação.

## Escopo e limites preservados

Site e portal mantêm serviços/imagens GHCR separados na mesma stack, identidade PIGE e comunicação interna. A correção de autorização institucional, o upgrade Compose e o restore com preservação forense permanecem intactos. Sem mudança em CRM ou dados reais.

CI verde da nova PR demonstra o código e o runtime testados; não comprova publicação pós-merge nem homologação externa. Certificados/provedores reais, DNS/TLS/proxy e GUI Windows no cliente continuam com homologação própria. OCR: **18/21 campos; foto degradada 0/3**, revisão humana obrigatória. Refinamento visual e estúdio de edição permanecem fora deste ajuste.
