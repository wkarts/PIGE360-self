# Pull Request

## Branch

`feature/gestao-escolar-relatorios-importacao` → `develop`

## Título

feat(escola): ampliar gestão escolar, portais, relatórios e integrações

## Descrição

A operação escolar tinha relatórios insuficientes, fichas pouco legíveis e uma importação que criava outra instituição e não permitia escolher registros. Também havia falhas no diário, na matrícula online e na apresentação dos formulários. Esta alteração entrega uma central de relatórios com recorte trimestral, importação seletiva, documentos completos, boletins e frequência nos portais, notícias e eventos, provisionamento Mailcow, assinaturas e melhorias nas cobranças.

## Contexto e objetivo

Atender à revisão da aplicação inteira solicitada por Wallace, preservando os cadastros, a identidade da escola, FastAPI, Vue 3 Web/PWA, PostgreSQL e os quatro adaptadores de implantação. A instalação permanece self-hosted para a instituição e suas unidades.

## Escopo incluído

- Oito relatórios gerenciais com filtros, indicadores, consolidação mensal, PDF e CSV; últimos três meses completos como período inicial.
- Fichas cadastral e de matrícula com identificação, responsáveis, contatos, vínculo acadêmico e conferência documental.
- Importação SQLite/ZIP por categoria e registro, prévia vinculada à seleção e preservação da escola de destino.
- Navegação, formulários, tabelas, diálogos e telas móveis revisados; validação em português.
- Diário do professor com correções de permissões, recarga, avaliações, notas parciais e frequência ponderada.
- Matrícula online em etapas e boletins publicados para alunos e responsáveis, incluindo PDF.
- Portal público e interno de notícias/eventos com audiências e períodos de publicação.
- Mailcow por escola, fila de provisionamento no cadastro de usuário e administração das caixas.
- A1 institucional e pessoal, sessão de retorno GOV.BR e recepção de PDF assinado externamente.
- Cobranças Asaas, conciliação, consulta operacional e prevenção de duplicação.

## Fora do escopo

Merge, release, publicação de imagem e implantação em VPS; homologação com credenciais reais; implementação de outros bancos/CNAB; acesso direto do navegador a token A3; instalação de servidor Mailcow; sincronização offline de dados escolares privados.

## Decisões técnicas e arquitetura

Os novos recursos usam os routers, permissões, armazenamento privado e worker existentes. Não foram introduzidos serviços de infraestrutura. Mailcow usa `IntegrationJob` na mesma transação do usuário, com comunicação remota pelo worker. Boletins consultam fechamentos ativos e não inventam resultados anuais. PDFs históricos e revisões assinadas permanecem preservados.

## Alterações realizadas e arquivos

Principais novos módulos: `management_reports.py`, `student_reports.py`, `learning_portal.py`, `mailcow.py`, `school_community.py`, `personal_signing.py`, `govbr_login.py` e `validation_messages.py`. Componentes Vue novos: relatórios, importação, boletim, Mailcow e comunidade; página pública `news.html`.

Foram modificados os módulos de diário, documentos, cadastro de usuário, portal, importação e integrações; templates/CSS; configuração de build; exemplos Compose; testes e documentação. O frontend compilado acompanha as fontes. O inventário integral de arquivos adicionados/modificados consta em `ARQUIVOS-ALTERADOS-0.10.0.json`. Nenhum módulo de produto foi removido. `e2e-online.py` continua como entrada do CI, delegando ao roteiro atualizado.

## Banco de dados

Migrations aditivas encadeadas após `0024_admission_contract_binding`:

| Revisão | Tabelas | Restrições relevantes |
|---|---|---|
| 0025_signature_sessions | govbr_signature_sessions | Estado de uso único e vínculo com conta, sessão, documento e escola |
| 0026_mailcow | mailcow_configs, school_mailboxes | Uma configuração por escola; uma caixa por usuário/escola e por endereço/configuração |
| 0027_school_community | school_community_posts | Audiência, situação, datas coerentes e índices de publicação |

Não há seed de dados reais nem reprocessamento automático de consolidações antigas. Upgrade completo e correspondência com metadados verificados em SQLite; locks/concorrência PostgreSQL são verificados pelo gate de CI. Downgrade das migrations novas remove seus registros; rollback operacional deve restaurar backup consistente.

## APIs, contratos e integrações

OpenAPI regenerado em `openapi.json`. Novas famílias autenticadas: `/schools/{id}/reports`, `/schools/{id}/mailcow`, `/schools/{id}/community-posts`, `/profile/learning`, `/portal/learning` e assinatura pessoal. Os feeds públicos só expõem publicações destinadas ao público.

Importação mantém suas rotas, mas aplicar agora exige seleção explícita e fingerprint da prévia. Consumidores antigos precisam adotar esse contrato para impedir importação involuntária. Operações remotas mantêm idempotência, fila persistente, timeout e estado de falha. GOV.BR requer Login Único e credenciais oficiais; autenticação e consentimento continuam no serviço oficial.

## Dependências, configurações e ambiente

Sem novas dependências de runtime. Python 3.13, Node 22 para build e bibliotecas já fixadas no projeto. Os quatro Compose recebem variáveis opcionais GOV.BR desativadas por padrão. Mailcow é configurado pela interface e usa `INTEGRATION_ENCRYPTION_KEY`. App e worker precisam da mesma configuração e das chaves anteriores. Configurações completas em `MAILCOW.md` e `ASSINATURAS-DIGITAIS.md`.

## Segurança e privacidade

Isolamento por escola, vínculo e permissão; CPF/validade do A1 pessoal; PKCE/nonce/estado de uso único no retorno GOV.BR; cookie temporário limitado ao callback. Certificado pessoal e senha não são persistidos. Mailcow valida DNS, fixa IP/TLS, bloqueia redirecionamento e destinos não autorizados; a senha inicial tem consulta única e prazo limitado. O worker revalida usuário/vínculo antes de provisionar. Importações excluem registros e arquivos desmarcados. CSV neutraliza fórmulas. Publicações tratam HTML como texto. Dados, imagens e PDFs reais fornecidos pelo cliente não integram a PR ou os pacotes de demonstração.

## Desempenho e observabilidade

Consultas paginadas, limites explícitos de exportação e índices de publicação; operações Mailcow executadas fora da requisição do cadastro. Conciliação reaproveita jobs pendentes e evita enfileiramento duplicado. Estados operacionais e tentativas ficam visíveis na interface. Relatórios recusam excesso de registros, sem truncamento silencioso.

## Testes implementados

Regressões de importação seletiva/idempotência, cálculos e filtros dos relatórios, frequência/notas, isolamento do boletim, matrícula/anexos, integrações bancárias, Mailcow/SSRF, audiências, assinaturas/retorno de uso único e validação em português. E2Es novos para importação/relatórios, comunidade e portal completo; roteiros anteriores atualizados sem retirar suas verificações. Build inclui renderização de componentes, navegação por permissão e fluxo do diário.

## Testes executados

Resultado reproduzível registrado em `VALIDACAO-0.10.0.json`. Suíte backend: 326 testes e 5 subtests passaram; 1 teste de lock PostgreSQL não executado localmente. Políticas de CI: 96 testes passaram. Build Vue/TypeScript e validação estrutural passaram. E2Es HTTP em Chromium usam somente bancos, contas e arquivos sintéticos. As migrations completas foram aplicadas nos bancos temporários.

## Testes recomendados

O CI da PR deve concluir PostgreSQL real e Docker. Antes de ativar integrações, homologar domínio/API Mailcow e entrega de e-mail, emissão/conciliação Asaas sandbox, certificado A1 da escola, cadeia de confiança e credenciais/callback GOV.BR no ambiente autorizado. Token A3 é exercitado no assinador externo adotado pela escola.

## Validação manual

PDFs sintéticos de ficha, matrícula, pendências e financeiro foram renderizados e inspecionados. Telas de relatório, importação, portais, cadastros e comunidade foram inspecionadas em desktop/celular. Roteiro completo por área em `ENTREGA-0.10.0.md`, incluindo correspondência entre filtros e exportação, ausência de nova escola, audiência restrita e preservação de histórico.

## Impactos, compatibilidade e riscos

As rotas anteriores de relatórios permanecem. A seleção obrigatória muda intencionalmente o contrato de aplicação do legado. Responsáveis já existentes precisam reconfirmar a autorização do diário, agora incluindo boletim/frequência. Consolidações antigas com regra alterada são sinalizadas para revisão, sem reescrita automática. Caixas Mailcow provisionadas não são excluídas/desativadas automaticamente ao alterar o usuário. Integração implementada não equivale a homologação remota concluída.

## Deploy

Após revisão e aprovação do fluxo do projeto: guardar backup de banco/arquivos/chaves, validar a imagem produzida pelo CI, atualizar app e workers em conjunto, aplicar migrations pelo startup existente e verificar `/health/ready`, `/build-info.json`, login, documentos, fila e versão PWA. Usar o adaptador existente e preservar projeto/volumes. Procedimento detalhado em `ENTREGA-0.10.0.md`.

## Rollback

Restaurar banco, arquivos, chaves e imagem do mesmo ponto de recuperação. Voltar somente a imagem não desfaz novos registros/migrations. Não usar `docker compose down -v`. Provisionamentos externos já realizados devem ser conciliados no Mailcow; restauração do banco não os desfaz.

## Build, release e distribuição

Código-fonte 0.10.0 com PWA compilada. Checkpoint ZIP inclui manifesto, árvore e hashes; evidências geradas são excluídas do pacote de código. Os novos E2Es integram o CI e suas evidências são coletadas pelo workflow. Esta PR tem destino `develop`; a abertura não executa merge, release nem deploy externo.

## Documentação

`ENTREGA-0.10.0.md`, `MAILCOW.md`, `ASSINATURAS-DIGITAIS.md`, `openapi.json`, `VALIDACAO-0.10.0.json`, `ARQUIVOS-ALTERADOS-0.10.0.json` e README atualizado.

## Checklist

- [x] Arquitetura, identidade institucional e cadastros preservados.
- [x] Permissões, isolamento e validações exercitados.
- [x] Migrations e exemplos de configuração presentes.
- [x] Testes, build, E2Es e inspeção dos PDFs registrados.
- [x] Pacote exclui segredos, bancos, certificados e evidências privadas.
- [x] Limitações e homologações externas descritas.
- [ ] PostgreSQL e Docker no workflow remoto concluídos.
- [ ] Homologação com serviços reais da escola concluída.

## Commit sugerido

`feat(escola): ampliar gestão escolar, portais, relatórios e integrações`

## Merge sugerido

Squash da feature em `develop` após CI e revisão. Sem merge automático nesta entrega.

## Versão sugerida

0.10.0 (minor em relação ao pacote distribuído 0.9.0). A versão publicada deverá ser confirmada pelo fluxo de release do repositório.
