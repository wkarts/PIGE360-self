# Piloto do PIGE360 Self para escola privada

## Identificação da revisão

Base do produto 0.12.1, `develop` em `a19673e4c84dc1570641399bcbb1068f6ea77b77`. A referência recebida em 20/11/2026 tem SHA-256 `0361b99423f017d3becf7ee2b43bcb618e42986e0b4ce123d0434da41232eefa`. O ensaio combinou as branches em checkout descartável, com escolas, pessoas, cobranças e documentos fictícios. Árvore Git do primeiro ensaio de código `d478a4e5ce848ff8ae72facf1b8bc4803a0b2d22`, build da PWA `fef65810750f6a80`. Os testes dos provedores usam dados sintéticos. As PRs apontam para `develop`.

## Percursos e permissões

| Frente | Comportamento verificado | Revisão e limite |
|---|---|---|
| Diário no gestor e professor | Os mesmos formulários de aula, chamada, avaliação, parecer e fechamento passam a abrir por contexto e link. Aula e chamada funcionam no portal docente em 1440 e 390 px. O gestor recupera período e seleção após recarregar. Secretaria e professor têm acesso limitado às ações do seu perfil. | [#99](https://github.com/wkarts/PIGE360-self/pull/99). Mudança de apresentação opcional, sem migration. |
| Catálogo curricular | Coordenação pode ajustar nome, código e carga da sugestão antes de salvá-la, consultar os vínculos e decidir com motivo. Desativar componente preserva seu histórico e bloqueia novos usos após o corte. Inventário de impacto e concorrência por versão usam o identificador existente. | [#100](https://github.com/wkarts/PIGE360-self/pull/100) e [#104](https://github.com/wkarts/PIGE360-self/pull/104). Retirada imediata. Agendamento futuro, replicação entre séries e currículo aprovado por etapa continuam pendentes. |
| Cálculo e fechamento | O Diário já tem versões de regras, memória dos resultados, consolidação, fechamento e reabertura. Com fechamento ativo, uma consolidação ou mudança de regra conflitante precisa passar primeiro pela reabertura justificada. | [#102](https://github.com/wkarts/PIGE360-self/pull/102). Publicação pela Secretaria como estado separado, simulação de retificação e prévia de lançamento avaliativo em lote continuam pendentes. |
| Família, aluno e documentos | Após transferência, o boletim fechado continua disponível na turma de origem. PDF e frequência usam os vínculos registrados no fechamento. O portal autoriza o responsável vinculado. Foram exercitados documento de matrícula, DOCX, PDF e material docente. | [#105](https://github.com/wkarts/PIGE360-self/pull/105). A abertura de boletins antigos mantém a compatibilidade quando faltam os novos campos. Assinatura com certificado real e treinamento dos responsáveis pendentes. |
| Matrícula online, individual e lote | Solicitação, correção pela família, aprovação, efetivação e comprovante foram exercitados. No lote, 20 conflitos persistentes deixavam a próxima linha sem oportunidade. A retomada prioriza linhas menos tentadas e preserva linhas já concluídas. | [#103](https://github.com/wkarts/PIGE360-self/pull/103). A reorganização integral da ficha e das filas por subguia continua pendente. |
| Financeiro | O módulo nativo de matrícula e parcelas foi exercitado. O diagnóstico novo confere repositório, commit e contratos da ponte por versão. A fixture v1 coincide em `35ab71c` da `develop` do Finance. O receptor v1 devolve recibo bloqueado. Em `17e104f` da `main`, o adaptador esperado não foi localizado. | [#98](https://github.com/wkarts/PIGE360-self/pull/98). Emissão, baixa e conciliação pelo Finance bloqueadas até release instalada, endpoints funcionais v2/v3, carteira, credenciais e confirmação dos efeitos em sandbox. [Diagnóstico da main](finance-main.json) e [da develop](finance-develop.json). |
| Educacenso | Seleção por escola, etapa, data e turma, prévia parcial, rascunho com hash, histórico e recebimento de arquivo opaco com deduplicação. A permissão dedicada protege também o download. Um retorno sem parser conserva seu conteúdo e o rascunho. | [#101](https://github.com/wkarts/PIGE360-self/pull/101) e [#104](https://github.com/wkarts/PIGE360-self/pull/104). Codec testado com formato fictício. Exportador, parser oficial, críticas e encerramento aguardam especificação, amostra e treinamento. |
| Comunicação, gestão e atendimento | O portal recebeu publicação dirigida e verificou os limites de acesso. A restauração local agora retém mensagens e operações financeiras para reconciliação antes de iniciar os workers. | [#106](https://github.com/wkarts/PIGE360-self/pull/106). A implantação de uma central de modelos com prévia por canal, os indicadores por perfil e novos serviços da escola continuam em aberto. |

No piloto, o professor também pode ir de **Minhas turmas** diretamente a **Fazer chamada** para o diário atribuído. O E2E abre o atalho, confere a subguia ativa e repete a gravação em duas larguras. A consulta do PDF pela família é verificada separadamente, fora do intervalo cronometrado.

Os pontos de entrada auditados incluem `frontend/templates/diary.html`, `teacherPortal.html`, `familyPortal.html` e `enrollmentWorkflow.html`. No servidor, as revisões se concentram em `backend/app/diary.py`, `diary_components.py`, `learning_portal.py`, `enrollment_batches.py`, `educacenso.py`, `documents.py`, `security.py` e `registry.py`. A PR de cada frente lista o diff e os testes de regressão correspondentes. O inventário de percursos exercitados apresenta as verificações de autorização, navegação e dimensões de tela. [Resultados do Chromium](portal-chromium.json)

## Medição dos percursos

Uma execução automatizada por versão, mesma massa sintética e mesma instrumentação de eventos de clique do usuário. O intervalo exclui login e preparação da massa. Esperas de rede, renderização e automação entram no tempo. O número representa cliques de ponteiro e não inclui seleções programáticas, digitação ou trabalho humano de conferência.

| Recorte do percurso | Cliques na base → candidato | Tempo na base → candidato |
|---|---|---|
| Efetivar uma matrícula já aprovada | 4 → 4 | 0,357 → 0,342 s |
| Abrir e salvar a chamada da aula já visível | 2 → 2 | 0,154 → 0,135 s |
| Selecionar diário, revisar, consolidar e fechar o período | 6 → 6 | 0,975 → 1,013 s |

## Reprodução e evidências

Em ambiente descartável, instalar as dependências fixadas de backend e frontend. Executar `npm run typecheck --prefix frontend`, `npm run build --prefix frontend`, `python scripts/ci/validate.py` e `python -m unittest discover -s tests/ci -v`. Com `PIGE_TEST_DATABASE_URL` apontando para um PostgreSQL de testes vazio, executar `python -m pytest -q` a partir de `backend/`. O PostgreSQL e a base SQLite do teste de navegador são instâncias distintas.

O resultado anexado registra 42 verificações do portal. Executar `python scripts/e2e-portal-polished.py` e `python scripts/e2e-academic-pilots.py` a partir da raiz, com Chromium instalado. A segunda suíte exercita a combinação das PRs de APIs e telas. O comando `python scripts/qa/finance_contracts.py CAMINHO_DO_CHECKOUT SHA_DE_40_CARACTERES` opera em checkout do Finance oficial.

- Backend em PostgreSQL 16.2 com Python 3.13, 881 testes aprovados e 9 subtestes aprovados. Os 51 avisos de depreciação vieram de Starlette/AnyIO e do uso de cookies por chamada nos testes.
- A suíte de CI local executou 263 testes, com 262 aprovados e 1 ignorado porque o CLI do Docker Compose está indisponível. TypeScript, compilação Vue e verificação estrutural passaram.
- Em base e armazenamento separados, `pg_dump` e `pg_restore` preservaram a revisão `0060_educacenso_training`, 180 matrículas, 9 fechamentos e os hashes dos snapshots. Os dois arquivos de retorno recuperados do armazenamento conferiram byte a byte por SHA-256.
- Um exercício adicional em PostgreSQL executou duas vezes a reconciliação de cinco filas após restauração. Onze itens pendentes ficaram retidos e um item concluído por tabela conservou o estado. O teste do script também cobre falha do SQL antes de iniciar app e workers.
- Na CI da PR de catálogo, o teste da ponte CRM cruzou um segundo entre a geração e a verificação do timestamp. A regressão passou a controlar o relógio do receptor e verificar os dois limites de 300 e 301 segundos. Os 45 testes do arquivo passaram localmente.

## Habilitação e reversão

1. Revisar #99 antes da #104, que contém a mesma base de navegação. A tela de catálogo exige a API da #100. A tela do Censo exige API e migration aditiva da #101. A revisão documental é independente.
2. Para o piloto de navegação, abrir `/?diarioPiloto=ID_DA_ESCOLA&guia=attendance#/diary` no gestor. No portal docente usar a mesma consulta com `#diario`. Remover os parâmetros do piloto para voltar à interface anterior. A autorização de dados continua no servidor.
3. Em **Instituição → Dados da escola → Editar dados**, uma pessoa com a permissão `schools.manage` pode marcar **Habilitar catálogo curricular do Diário** e **Habilitar treinamento do Educacenso** separadamente. Salvar aplica a escolha à escola no banco e registra a alteração na auditoria. Escolas novas e existentes começam com ambos desligados. Para pausar, desmarcar a opção e salvar. Um cliente anterior que edite a escola sem esses campos preserva os valores. Os documentos, rascunhos e controles de acesso permanecem válidos.
4. Para o Finance, manter comandos externos desligados até atestar capacidades, recibos, idempotência, baixa, conciliação e política de coexistência com cobranças antigas na carteira piloto.
5. Para o Censo, exigir revisão e hash do leiaute da etapa, mapeamento campo a campo, amostra autorizada de retorno e teste de cobertura no ambiente oficial de treinamento. A seleção de turma serve ao diagnóstico local. O tratamento do conjunto omitido precisa ser verificado para o ano e a etapa. [Matrícula Inicial](https://www.gov.br/inep/pt-br/areas-de-atuacao/pesquisas-estatisticas-e-indicadores/censo-escolar/orientacoes/matricula-inicial/migracao) e [Situação do Aluno](https://www.gov.br/inep/pt-br/areas-de-atuacao/pesquisas-estatisticas-e-indicadores/censo-escolar/orientacoes/situacao-do-aluno).

O aceite do Navegantes continua pendente. Ainda é preciso exercitar a mesma imagem candidata, identificada por digest OCI, na stack isolada com os perfis da escola, conferir o regimento e registrar as exceções. As proteções de integridade dos fechamentos, dos lotes e da recuperação passam a fazer parte do comportamento normal quando as respectivas correções forem adotadas.

## Validação das preferências por escola

A árvore combinada desta correção é `6ba35e84e95af831806abb2b003e92b53f034e39`, com build da PWA `c65052bb9e32dec3`. Em Chromium, o operador abriu o cadastro da escola, habilitou ambos os recursos e usou o catálogo e o Educacenso. Depois pausou somente o Educacenso. A consulta à API confirmou o catálogo ativo e o treinamento desativado no mesmo processo.

Em PostgreSQL 16.2, a atualização de uma cópia da base de testes passou da revisão `0060_educacenso_training` para `0061_school_census_options`. Todas as 609 escolas existentes receberam ambos os campos desativados, e os dois anexos de evidência continuaram registrados. A migration `0060_school_pilot_options` é comum às PRs de backend. A revisão de junção preserva instalações que já executaram a migration de rascunhos.
