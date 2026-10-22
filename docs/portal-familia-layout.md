# Portal do aluno e responsável — shell da aplicação

## Escopo e identidade

O portal privado usa o shell aprovado: navegação lateral desktop, gaveta com menu no celular, cabeçalho com conta/contexto, cartões de visão geral e views separadas. O login reutiliza **auth.css da aplicação principal**, com duas colunas no desktop e marca acima do formulário no mobile. Logo, nome, cores e fonte vêm exclusivamente de `PigeInstitution` e `/api/v1/institution/theme.css`; não existe cadastro de identidade específico do portal.

As imagens aprovadas eram propostas, não dados de produto. Esta implementação **não inclui dados demonstrativos**, métricas fictícias ou menus administrativos. A visão geral conta alunos/matrículas/documentos reais e cobranças registradas; não inventa percentual de presença nem status de mensagem lida. Boletim e frequência continuam no componente existente `PigeLearning`.

## Entrada, arquivos e contratos

- `frontend/public/family.html` é o documento público de entrada; monta `#family`.
- `frontend/templates/familyPortal.html` é o template privado/login compilado.
- **Não confundir** com `frontend/templates/family.html`, fragmento administrativo de vínculos, não alterado.
- `services/portal/server.py` já serve o portal em `/`, `/family.html`, `/academic`, `/documents` e `/finance` no domínio `PORTAL_PUBLIC_URL`.
- Novas navegações usam `/family.html?view=<view>&student=<id>`; os deep links anteriores continuam reconhecidos. Back/Forward sincronizam view e aluno, sem duplicar entradas em clique repetido.
- `auth.css` e `ui-icons.svg` são incluídos na allowlist estática do proxy. O único novo caminho de API no proxy é **GET** `/api/v1/schools/{uuid}/community-feed`; rotas administrativas e escrita permanecem bloqueadas.
- O feed utiliza a sessão escolar e a audiência filtrada pelo backend; não usa `/portal/community-feed`, que pertence à conta independente de inscrição.
- Autenticação `/auth/login`, renovação, logout, MFA, `/family/context`, cobranças, downloads e `/profile/learning` permanecem com os mesmos contratos e autorizações.

## Views e estados

Visão geral, Meus alunos, Vida acadêmica, Agenda escolar, Comunicados, Financeiro, Documentos e Atendimento. Inscrição/contratos permanece link para o fluxo independente, sem alteração de layout desse fluxo.

- Seleção de instituição/aluno usa apenas vínculos devolvidos por `/family/context`.
- Financeiro não faz requisição quando o vínculo não autoriza; falha não é apresentada como inexistência de dívida.
- Não há captura de senha em storage nem novo login social.
- MFA substitui o formulário de login durante o desafio; mantém código, recuperação e cancelamento existentes.
- Respostas atrasadas não atravessam troca de instituição/aluno; sair/expirar limpa dados privados.
- Leitura de comunicado é texto escapado, sem HTML injetado; foco segue leitura/fechamento.
- Drawer tem Escape, ciclo de foco, fundo inerte e fechamento ao navegar/redimensionar.
- Estados de carregamento, erro, sem vínculo, sem publicações, sem documentos e financeiro restrito são explícitos.

## Verificação desta frente

Comandos executados antes do checkpoint (reexecutar após integração):

- `npm ci --prefix frontend --ignore-scripts --offline --cache /tmp/pige-npm-cache`
- `npm run build --prefix frontend` — TypeScript e smoke existentes aprovados.
- `node frontend/tests/family-flow.mjs` — novo teste aprovado (login/MFA, views, permissão financeira, histórico, cliques repetidos, respostas atrasadas, logout).
- `python -m unittest discover -s tests/ci -v` — 227 testes, OK, 1 skip.
- `PYTHONPATH=backend /tmp/pige-button-venv/bin/pytest -q backend/tests/test_family_access_profiles.py backend/tests/test_learning_portal.py backend/tests/test_school_community.py backend/tests/test_surface_security.py` — 53 aprovados.
- `python scripts/ci/validate.py` — aprovado.
- Ambiente local Node 24.19.0; o projeto requer Node 22. Instalação emitiu EBADENGINE (não falha). Confirmar com Node 22 no CI remoto.

### Limite de validação visual

**Não há novas capturas do aplicativo implementado neste ambiente.** Chromium/Playwright abortou em `process_singleton_posix.cc` com `socket() failed: Operation not permitted`; browser cloud em localhost retornou `ERR_CONNECTION_REFUSED`. Mockups anteriores não substituem QA de navegador. Não houve contorno de sandbox nem publicação de preview.

Roteiro pendente em ambiente com navegador: login desktop/mobile (incluindo MFA/erro), dashboard com vínculos reais, drawer 390/320px e teclado, seleção aluno/escola, financeiro autorizado/restrito, boletim/PDF, documentos/download, comunicados/paginação/fechar/Back, agenda vazia, expiração e logout. Conferir overflow, contraste com duas identidades e nomes longos, foco e alterações repetidas de seleção.

## Integração e operação

Somente fontes e testes no commit desta frente; o integrador de PR67 regenera `frontend/dist` junto com a frente de sites e o botão da inscrição. Não aplicar arquivos dist de builds concorrentes. Nenhuma migration, dependência ou variável nova. Sem alteração de site, inscrição, cobrança, permissões ou backend de autenticação.

Deploy e merge não foram executados nem autorizados nesta frente. Rollback: reverter o commit de fontes e regenerar dist no fluxo normal; nenhuma alteração de banco é necessária.
