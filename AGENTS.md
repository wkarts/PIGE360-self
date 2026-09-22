# PIGE360 Self — regras de desenvolvimento

Backend FastAPI/Python 3.13, cliente Vue 3 Web/PWA. Preserve arquitetura, cadastros, permissões, migrations e branding existentes. Não criar aplicativos nativos nem introduzir nova plataforma de hospedagem.

## Git e CI/CD

Use `feature/*`, `fix/*`, `ci/*`, `chore/*` ou outro prefixo aceito pelo validador para PR em `develop`. Produção recebe PR de `develop` para `main`, com título `release(patch|minor|major): descrição`. Toda PR deve conter `## Descrição` e `## Branch`.

Tags Git e versões do produto usam `MAJOR.MINOR.PATCH`, sem prefixo v/w. `develop` nunca publica `latest` ou aliases estáveis. Release promove o digest aprovado, sem reconstruir. Não alterar tags estáveis já publicadas.

A inicialização deste fluxo foi autorizada diretamente em main/develop. As próximas mudanças seguem o fluxo acima. Não efetuar merge de release nem deploy em VPS sem pedido explícito. GitHub Actions produz imagens GHCR e artefatos de instalação; não executa deploy externo.

## Limpeza e segurança

Escopo exclusivo: `wkarts/PIGE360-self` e pacotes PIGE360 explicitamente cadastrados. Preservar imagens estáveis, aliases e descendentes OCI. Preferir simulação antes de ajuste de política. Nunca excluir imagens pela simples ausência de tag Git, nem tratar todo manifesto sem tag como lixo.

Não comitar `.env`, credenciais, bancos, documentos reais ou arquivos de fonte. Não reintroduzir o template original. Entregar checkpoint local com commit de origem, hashes e limitações reais dos testes.

## Validação

`python -m unittest discover -s tests/ci -v`; `npm ci --prefix frontend --ignore-scripts`; `npm run build --prefix frontend`; `python scripts/ci/validate.py`; testes em `backend`; E2E HTTP e Docker/PostgreSQL no GitHub Actions. Não desabilitar testes para publicar imagem.
