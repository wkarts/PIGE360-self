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

Fluxo proposto:

`Diário/Turma/Aluno -> ocorrência -> comunicação opcional -> evento Connect API`

O Connect API será canal de entrega; não será o repositório oficial do registro pedagógico.

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
- `/api/v1/schools/{school_id}/diaries/{id}/reports/*`

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

- períodos letivos;
- componentes curriculares;
- diário;
- planejamento;
- aula;
- frequência;
- RBAC;
- auditoria;
- fechamento e reabertura auditada;
- relatório básico do diário.

### Fase 2 — avaliação

- instrumentos;
- notas/conceitos;
- regras configuráveis;
- consolidação;
- recuperação;
- parecer descritivo;
- relatórios.

### Fase 3 — pedagógico e família

- registros complementares;
- ocorrências;
- comunicação;
- publicação seletiva no portal;
- notificações via Connect API.

### Fase 4 — operação avançada

- offline PWA;
- sincronização idempotente;
- dashboards;
- alertas de pendências;
- exportações oficiais adicionais;
- integrações externas.

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

## Primeiro incremento recomendado

Começar pelo **núcleo do diário e frequência**, porque ambos estruturam os demais módulos e não exigem definir uma fórmula de notas prematuramente.

O primeiro incremento funcional deve permitir:

1. criar períodos;
2. estruturar componentes;
3. abrir diário por turma/componente/professor;
4. registrar aula;
5. fazer chamada;
6. revisar pendências;
7. fechar um período com snapshot;
8. emitir relatório institucional;
9. reabrir somente com justificativa e permissão;
10. consultar histórico completo de alterações.

Essa base permite acrescentar avaliação, parecer e comunicação sem refazer o modelo.
