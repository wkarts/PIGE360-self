# Interface móvel — login e operação escolar

Correção baseada em `develop` (`c0755cb5d88880f6a6b6812083727aa7e699bffb`).
Mantém Vue 3/PWA, FastAPI, a identidade institucional e os contratos existentes.

## Problemas corrigidos

O grid do login distribuía a altura livre entre duas linhas no celular, mesmo
com a apresentação oculta. O brasão ficava isolado em uma área vazia e o
formulário era empurrado para baixo. O login móvel agora usa fluxo vertical,
logo limitado por área e campos de 16 px. A senha pode ser mostrada/ocultada;
a aplicação não aciona o teclado automaticamente ao abrir a página.

O guia usava cartões `.panel` sem espaçamento próprio. Agora tem componentes
com 18–24 px de espaçamento interno, ações de pelo menos 44 px e orientações
expansíveis. Professores, alunos e responsáveis recebem orientações relativas
aos seus perfis, respeitando as permissões existentes.

As 12 listagens principais se tornam fichas em larguras de até 600 px,
preservando cabeçalhos e associações de tabela para leitores de tela.
As matrizes pedagógicas e os relatórios mantêm as colunas e a rolagem interna.
No celular, filtros cadastrais ficam no botão **Filtros**; o contador indica
filtros ativos mesmo quando os campos estão recolhidos. Em desktop continuam
visíveis. Busca, edição, paginação e ações usam as mesmas rotas e APIs.

O cabeçalho reduz informações repetidas e mantém alvos de toque de 44 px.
Os formulários móveis ocupam a tela, com o corpo rolável e as ações acessíveis.
`VisualViewport` acompanha alterações de altura e deslocamento do navegador,
inclusive nos editores de Notícias e Cobranças renderizados fora do shell;
a ampliação por gesto continua nativa. Na ausência dessa API, usa-se `dvh/vh`.
Não há bloqueio de zoom no metadado de viewport.

## Validação reproduzível

```bash
npm ci --prefix frontend --ignore-scripts
npm run typecheck --prefix frontend
npm run build --prefix frontend
python -m unittest discover -s tests/ci -v
python scripts/ci/validate.py
python scripts/e2e-mobile.py
python scripts/e2e-workspace.py
python scripts/e2e-cadastres.py
python scripts/e2e-whitelabel.py
```

Use Python 3.13 com `backend/requirements-dev.txt`, Node 22 e Chromium do
Playwright. `CHROMIUM_PATH` é opcional quando o navegador já está instalado.
Os testes abrem servidor HTTP real, usam SQLite descartável e dados sintéticos.
O teste móvel usa brasão vertical e fonte personalizada temporária, sem gravar
arquivos de fonte ou dados reais no repositório. CSP e autenticação ficam ativas.
`e2e-mobile.py` passa a integrar o fluxo de CI existente.

No cenário 390×844, a área da marca caiu de 277,7 para 88 px e o botão de
entrada aparece entre y=411,9 e y=459,9. Em 320×568, também fica inteiramente
visível. Os cartões do guia passaram de 0 para 18 px de espaçamento interno
no cenário 390 px. São medidas da identidade sintética usada no teste.

A validação local em Chromium cobre toque emulado, paisagem, identidade
personalizada, filtros, navegação, foco e salvamento real de cadastro. A
geometria de janela reduzida/VisualViewport e a ampliação são verificações
automatizadas; não equivalem a ensaios com teclado físico em Safari/iOS.
Antes de promover em produção, confira também o teclado e a identidade real
nos aparelhos usados pela escola.

## Publicação e reversão

Não há dependência, variável de ambiente ou migration nova. O CI compila os
ativos e atualiza o identificador do cache da PWA. Siga o fluxo de imagens já
adotado pelo projeto; não copie CSS isolado sobre um build anterior. Após
publicar a imagem aprovada, atualize a aplicação quando o aviso aparecer.

Para reverter, restaure a imagem anterior pelo fluxo existente. Não é
necessário reverter banco de dados. Esta PR não executa merge, release ou
deploy externo.
