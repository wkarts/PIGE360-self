# PIGE360 Self — Prospecto Técnico do Diário Escolar Digital

## Base do cenário

Este prospecto parte do documento fornecido para o Colégio Navegantes, que define o **Diário Escolar Digital** como documento oficial de registro da vida escolar e organiza o escopo em dez áreas:

1. Identificação Geral
2. Planejamento Curricular alinhado à BNCC
3. Registro Diário de Aula
4. Controle de Frequência
5. Avaliação da Aprendizagem
6. Parecer Descritivo
7. Registros Pedagógicos Complementares
8. Ocorrências e Comunicações
9. Relatórios Oficiais
10. Controle, Segurança e Validação

O documento-fonte cita LDB, BNCC e normas do Conselho Estadual de Educação da Bahia, mas não detalha fórmulas de avaliação, percentuais de frequência, formatos oficiais, regras de assinatura, temporalidade, períodos letivos ou procedimentos de retificação. Esses pontos **não devem ser inventados no código**: serão configuráveis e, quando necessário, validados contra a regulamentação aplicável antes de declarar conformidade jurídica.

## Direção arquitetural

O Diário Escolar será um **módulo acadêmico nativo do PIGE360 Self**, não uma aplicação separada e não um SaaS externo.

Deve reutilizar a estrutura existente:

- mantenedora/empresa;
- escola;
- unidade;
- ano letivo;
- série/etapa;
- turno;
- turma;
- matrícula;
- professor/pessoa;
- atribuição docente (`TeacherAssignment`);
- usuários, permissões e auditoria;
- identidade visual da escola;
- emissão de documentos;
- diagnóstico e logs.

O professor trabalhará somente nas turmas/componentes para os quais possui atribuição ativa. Coordenação e direção terão funções de revisão, fechamento e validação conforme permissões.

## Princípios

### Registro oficial, não simples formulário

Cada alteração relevante precisa manter autoria, data/hora e versão. Depois de um fechamento formal, a informação não deve ser alterada silenciosamente.

Correções posteriores serão realizadas por retificação auditável, mantendo:

- valor anterior;
- valor novo;
- justificativa;
- responsável;
- data/hora;
- vínculo com o fechamento afetado.

### Configurável por escola

O motor não deve hardcodar uma única metodologia de avaliação.

A escola poderá parametrizar, por ano letivo/etapa:

- períodos avaliativos;
- nomenclaturas (unidade, bimestre, trimestre etc.);
- escala numérica ou conceitual;
- pesos;
- arredondamento;
- recuperação;
- quantidade e tipos de instrumentos;
- critérios de aprovação;
- regras de frequência;
- obrigatoriedade de parecer;
- fluxo de fechamento.

A primeira versão deve preservar cálculos simples, determinísticos e auditáveis. Regras avançadas entram como configuração, não como exceções espalhadas pelo código.

## Modelo funcional proposto

### 1. Identificação geral

O cabeçalho do diário será derivado da estrutura existente e não duplicado manualmente:

- instituição;
- unidade;
- ano letivo;
- turma;
- série/etapa;
- turno;
- componente curricular;
- professor;
- carga horária/plano;
- período de referência;
- situação do diário.

A identidade visual usada em relatórios será a identidade da própria escola.

### 2. Planejamento curricular

Criar estrutura para planejamento por turma/componente/período:

- objetivo;
- unidade temática;
- objeto de conhecimento;
- habilidades/competências;
- referências BNCC;
- metodologia;
- recursos;
- estratégia de avaliação;
- observações.

As referências BNCC devem ser dados configuráveis/importáveis. Não codificar uma lista fixa dentro da aplicação.

### 3. Registro diário de aula

Cada aula/dia terá registro próprio:

- data;
- quantidade de aulas;
- conteúdo ministrado;
- habilidades/referências vinculadas;
- metodologia;
- atividades;
- tarefa/orientação;
- observações;
- professor responsável;
- situação: rascunho, registrado, revisado/fechado.

O registro deverá suportar edição enquanto aberto e versionamento/retificação após fechamento.

### 4. Frequência

A frequência será vinculada ao registro de aula e à matrícula ativa na data.

Estados base propostos:

- presente;
- falta;
- falta justificada;
- ocorrência excepcional/configurável.

A aplicação deve impedir que a movimentação posterior da matrícula reescreva historicamente a chamada já registrada.

Resumo acumulado por aluno, período, componente e turma será calculado a partir dos registros, sem armazenar totais divergentes como fonte primária.

### 5. Avaliação da aprendizagem

Estrutura separada entre:

- instrumento avaliativo;
- resultado do aluno;
- regra de cálculo;
- consolidação do período.

Um instrumento poderá ter:

- título;
- tipo;
- data;
- período;
- valor máximo/peso;
- descrição;
- habilidades avaliadas.

O resultado poderá ser numérico, conceitual ou não aplicável, conforme configuração.

Nenhuma média será recalculada retroativamente quando uma regra futura for alterada sem uma ação explícita de reprocessamento e auditoria.

### 6. Parecer descritivo

Parecer por aluno e período, com:

- texto em rascunho;
- autoria;
- revisão opcional;
- versão;
- fechamento.

Pode haver modelo orientador configurável pela escola, mas o conteúdo final é produzido pela equipe pedagógica.

### 7. Registros pedagógicos complementares

Registro estruturado e cronológico para:

- acompanhamento;
- intervenção pedagógica;
- recuperação;
- adaptação;
- encaminhamento;
- observações do desenvolvimento.

Deve ser separado de dados médicos e de campos sensíveis que não sejam necessários ao contexto educacional.

### 8. Ocorrências e comunicações

O Diário poderá referenciar ocorrências e comunicações, mas não duplicará o módulo de atendimento/mensageria.

Fluxo implementado para mensagens internas ao portal:

`Diário/Turma/Aluno -> ocorrência revisada opcional -> comunicado no portal -> confirmação de leitura`

O comunicado é guardado no Diário, com autoria, data, responsável, conta destinatária e leitura. A publicação exige autorização expressa, vínculo legal ativo, estudante ativo e matrícula ativa ou suspensa, além de correspondência entre o CPF e um contato verificado da conta e o cadastro escolar. O vínculo e a autorização são reavaliados no acesso. O texto e a versão da autorização aceita ficam registrados; a versão muda quando o texto muda. A família pode revogar o acesso pelo portal. Responsáveis sem conta podem criar uma conta no portal independentemente de haver processo de matrícula aberto. A tela oferece os dois caminhos quando há processo aberto: iniciar nova pré-matrícula ou criar acesso familiar sem inscrever outro aluno. A criação isolada não cria nem altera matrícula e não libera dados do estudante antes das verificações e do consentimento do Diário.

Esta entrega não dispara Connect API, e-mail ou WhatsApp. Um canal externo pode ser acrescentado posteriormente sem substituir o registro oficial no Diário e somente após definir entrega, consentimento e auditoria próprios.

### 9. Relatórios oficiais

Relatórios previstos para a evolução do módulo:

- diário da turma/componente;
- registro de aulas;
- mapa de frequência;
- mapa de avaliações/notas/conceitos;
- pareceres descritivos;
- ficha individual;
- consolidação por período;
- relatório de fechamento;
- relatório de pendências;
- histórico de retificações;
- relatório de auditoria/validação.

Todos os PDFs devem utilizar somente nome, logotipo, tipografia e dados institucionais da escola.

### 10. Controle, segurança e validação

Estados propostos do diário:

`draft -> open -> submitted -> reviewed -> closed`

Reabertura não será uma edição direta. Será uma ação auditada por usuário autorizado, com justificativa.

O fluxo operacional implementado segue `open -> submitted -> reviewed -> closed`. O envio exige ao menos uma aula; a revisão e o fechamento respeitam RBAC e versão otimista. Lançamentos são aceitos somente enquanto o diário está aberto. Fechamentos por período preservam o estado revisado para permitir fechar outros períodos; qualquer reabertura exige justificativa e invalida os snapshots ativos sem apagar o histórico.

O fechamento deve gerar snapshot imutável do conjunto de dados e hash de integridade. O documento emitido precisa apontar:

- escola;
- diário;
- período;
- versão;
- data/hora do fechamento;
- responsável;
- hash/referência de validação.

O uso de assinatura eletrônica avançada/qualificada ou certificado ICP-Brasil deve ser tratado como camada adicional quando a política/regulamentação exigir; não será presumido pelo simples login do usuário.

## Modelo de dados proposto

Entidades novas, sempre com `school_id` quando aplicável e seguindo o padrão `Record` existente:

- `AcademicPeriod`
- `CurriculumComponent`
- `CurriculumPlan`
- `CurriculumPlanReference`
- `SchoolDiary`
- `DiaryLesson`
- `DiaryAttendance`
- `AssessmentInstrument`
- `AssessmentResult`
- `PeriodResult`
- `DescriptiveOpinion`
- `PedagogicalRecord`
- `DiaryClosure`
- `DiaryRevision`
- `DiaryOccurrence`
- `DiaryFamilyCommunication`
- `PortalStudentAccess`

Não duplicar aluno, turma, professor, matrícula, unidade ou ano letivo.

## Compatibilidade com a estrutura atual

### TeacherAssignment

A atribuição docente existente deve ser a base da autorização operacional do professor.

Evolução proposta:

- manter `subject_name` por compatibilidade;
- introduzir `CurriculumComponent`;
- permitir que atribuições novas apontem para o componente estruturado;
- migrar/conciliar gradualmente os nomes existentes sem destruir histórico.

### Matrículas

A frequência e avaliações apontam para a matrícula/aluno válidos no contexto da turma.

Transferência, cancelamento ou suspensão não apaga registros anteriores.

### PWA

O Diário precisa ser confortável em desktop, tablet e celular.

Fase posterior: lançamento offline controlado via PWA/IndexedDB/outbox, com sincronização idempotente. O fechamento oficial continuará dependendo de sincronização completa com o servidor.

## Permissões iniciais

- `diary.read`
- `diary.write`
- `diary.attendance`
- `diary.assessments`
- `diary.review`
- `diary.close`
- `diary.reopen`
- `diary.reports`
- `diary.configure`
- `communications.send` para publicar comunicado no portal

Professor: somente atribuições próprias.
Coordenação: leitura/revisão das turmas autorizadas.
Direção/administração: fechamento/reabertura/configuração conforme RBAC.
Secretaria: consulta e relatórios oficiais, sem alterar conteúdo pedagógico por padrão.

## API e eventos

Base sugerida:

- `/api/v1/schools/{school_id}/academic-periods`
- `/api/v1/schools/{school_id}/curriculum-components`
- `/api/v1/schools/{school_id}/diaries`
- `/api/v1/schools/{school_id}/diaries/{id}/lessons`
- `/api/v1/schools/{school_id}/diaries/{id}/attendance`
- `/api/v1/schools/{school_id}/diaries/{id}/assessments`
- `/api/v1/schools/{school_id}/diaries/{id}/opinions`
- `/api/v1/schools/{school_id}/diaries/{id}/submit`
- `/api/v1/schools/{school_id}/diaries/{id}/review`
- `/api/v1/schools/{school_id}/diaries/{id}/close`
- `/api/v1/schools/{school_id}/diaries/{id}/reopen`
- `/api/v1/schools/{school_id}/diaries/{id}/communication-recipients`
- `/api/v1/schools/{school_id}/diaries/{id}/communications`
- `/api/v1/schools/{school_id}/diaries/{id}/reports/*`
- `/api/v1/portal/diary/access-consent`
- `/api/v1/portal/diary/access` (consulta, ativação e revogação por estudante)
- `/api/v1/portal/diary/communications` (consulta e confirmação de leitura)
- `/api/v1/portal/registration-terms` e `/api/v1/portal/account/register` (criação de conta sem pré-matrícula)

Eventos internos/webhook poderão incluir:

- `diary.lesson.recorded`
- `diary.attendance.changed`
- `diary.assessment.published`
- `diary.submitted`
- `diary.closed`
- `diary.reopened`
- `student.absence.threshold_reached` (quando existir regra configurada)

WebSocket será usado para atualização de tela/estado e não como fonte de verdade.

## Interface proposta

Novo grupo principal **Pedagógico** ou expansão de **Estrutura acadêmica**, evitando pulverizar itens no menu.

Primeira composição recomendada:

- Diário de classe
- Planejamento
- Frequência
- Avaliações
- Pareceres
- Fechamentos
- Relatórios

Para professor, a entrada principal será uma tela "Minhas turmas", com seleção de turma/componente e visão de pendências do dia/período.

Para coordenação, painel por turma/professor com:

- aulas previstas/registradas;
- chamadas pendentes;
- avaliações pendentes;
- pareceres pendentes;
- diário pronto para fechamento;
- divergências/retificações.

## Fases de implementação

### Fase 1 — núcleo oficial

**Implementada nas PRs anteriores do Diário:** períodos letivos, componentes curriculares, diário, planejamento, aula, frequência, RBAC, auditoria, fechamento/reabertura auditada e relatório institucional básico.

### Fase 2 — avaliação

**Implementada neste incremento:** instrumentos, notas/conceitos, regras configuráveis por diário/período, consolidação explícita e auditada, opções de recuperação, pareceres e relatórios. Os métodos disponíveis são aritmético, ponderado e conceitual por escala ordenada. Escala, arredondamento, pesos, recuperação, critérios de frequência e obrigatoriedade de parecer são configurações da escola; nenhuma média é recalculada quando uma regra muda. A consolidação de frequência usa registros de chamada por aula registrada e não é apresentada como cálculo normativo da Bahia.

### Fase 3 — pedagógico e família

**Implementados:** registros pedagógicos complementares e ocorrências vinculadas ao aluno, turma, componente, período, autoria e revisão; criação de conta familiar sem depender de processo de matrícula aberto; vínculo de acesso por estudante mediante CPF e contato verificado compatíveis com o cadastro escolar, responsável legal ativo e matrícula ativa ou suspensa; autorização explícita com versão e texto registrados; revogação pela família; comunicados individuais ou associados a ocorrência revisada; confirmação de leitura no portal; histórico auditável e relatório PDF de comunicações. A interface não revela dados de contato dos destinatários.

**Pendente:** notificação externa por Connect API, e-mail ou WhatsApp. O destinatário não é inferido dos dados de inscrição e o fluxo de admissões não é reutilizado para divulgar dados pedagógicos. Sem vínculo e autorização vigentes, o portal não exibe os comunicados.

### Fase 4 — operação avançada

**Implementados neste incremento:** painel operacional de pendências para chamadas, resultados, consolidações e ocorrências aguardando revisão.

**Pendentes:** outbox offline com sincronização idempotente, exportações oficiais adicionais e integrações externas. O fechamento oficial continua online e só ocorre após confirmação do servidor.

## Situação da implementação

O Diário cobre identificação derivada da estrutura escolar, planejamento curricular com referências BNCC configuráveis, aulas, frequência, avaliação configurável, consolidação explícita, pareceres, registros pedagógicos, ocorrências, comunicados consentidos no portal, revisão, fechamento/reabertura auditáveis, painel de pendências e treze tipos de relatório institucional: diário da turma/componente, aulas, frequência, avaliações, pareceres, ocorrências, comunicações à família, ficha individual, consolidação por período, fechamento, pendências, retificações e auditoria/validação. Resultados consolidados registram hash dos dados e da regra utilizados; snapshots de fechamento incluem resultados, ocorrências e comunicados do âmbito fechado.

A publicação familiar funciona no portal com as verificações e a autorização descritas acima. A comunicação externa segue pendente. O documento-fonte não especifica fórmula legal de notas/frequência, prazos, formatos oficiais ou assinatura; o sistema exige configuração escolar e não declara conformidade normativa automática. A confirmação das regras da Bahia continua necessária antes de tratar PDFs como substitutos de documentos oficiais.

## Critérios de segurança e integridade

- nenhuma exclusão física de registro fechado pela interface;
- versionamento otimista em lançamentos concorrentes;
- auditoria das ações sensíveis;
- snapshots de fechamento;
- hashes de integridade;
- filtros por escola/unidade;
- professor sem acesso a turmas não atribuídas;
- dados sensíveis fora de logs;
- relatórios com identidade da escola;
- backups existentes continuam cobrindo as novas tabelas;
- migrations aditivas e testadas desde instalações anteriores.

## Pontos que exigem confirmação normativa antes de declarar conformidade

O documento de origem não detalha:

- carga horária mínima por etapa/componente;
- percentual e forma de cálculo da frequência;
- períodos obrigatórios;
- fórmula de média/recuperação;
- nomenclaturas oficiais;
- conteúdo mínimo de cada relatório;
- regras formais de assinatura/validação;
- prazo de guarda;
- procedimento normativo para retificações;
- integrações obrigatórias com sistemas públicos.

O sistema será desenhado para suportar essas regras sem hardcode. A validação normativa da Bahia deve ocorrer em uma etapa própria antes de afirmar conformidade completa.

## Próximos incrementos

Próximos incrementos: avaliar canais externos e a respectiva política de consentimento e entrega; implementar operação offline com resolução de conflitos e sincronização idempotente; validar regras oficiais de frequência, avaliação, assinatura, guarda e exportação antes de declarar conformidade. Fechamento continua dependendo de confirmação do servidor.
