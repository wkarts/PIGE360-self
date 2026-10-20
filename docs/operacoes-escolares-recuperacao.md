# Operações escolares: recuperação e preparação

Base preservada: `develop` em `e84170da5d1d3526e765f4e63849eab77288e8f4`, que já contém a PR 60. Branch de implementação: `feature/school-operations-recovery`. Nenhum ZIP histórico foi reaplicado. Esta alteração não faz merge, deploy, release ou operações com dados reais.

## Uso e critérios de aceite

| Solicitação | Implementação | Preservação e limites |
| --- | --- | --- |
| Reparar e-mail existente | Em E-mail institucional, **Reparar vínculo local** reconsulta a caixa já vinculada. Em Meu e-mail, **Reparar conexão** revalida IMAP/SMTP. Uma falha no webmail integrado oferece acesso à conexão da caixa existente. | O provedor de contas recebe somente GET durante o reparo. Não há criação/exclusão de conta, redefinição de senha, exclusão de mensagens ou alteração de cota. O usuário informa a senha atual quando necessário. Uma desconexão explícita permanece desconectada. |
| Preparar ano letivo | Em Estrutura acadêmica, **Preparar a partir de outro ano**, escolher origem e destino, conferir prévia e confirmar. | Copia todas as turmas não arquivadas, com capacidade e situação, reutilizando unidade, série e turno. Cadastro manual continua disponível. Não rematricula alunos nem copia professores, aulas, notas ou documentos. Repetir preserva turmas equivalentes; divergências bloqueiam a transação inteira. Alterar a origem invalida a prévia. |
| Justificativas prontas | Em Análise e documentos, selecionar um modelo e clicar **Usar justificativa**. | Texto continua editável. Substituir um parecer digitado exige confirmação. Escolher o modelo não executa uma ação, valida documentos ou confirma identidade. As exigências do backend permanecem. |
| Encontrar cadastros preexistentes | A inscrição carrega automaticamente sugestões separadas para aluno e responsável. Há buscas independentes por nome/CPF/número e nome/CPF/e-mail. | Busca também pessoas ainda sem classificação de responsável. Normaliza acentos e formatação do CPF. Exibe homônimos e divergências; não escolhe nem vincula automaticamente. A Secretaria confirma a identidade. Não retorna pessoas inativas/arquivadas ou de outra escola. Exige permissões de inscrições, alunos e pessoas. |
| Corrigir envio automático | Em E-mail → **Envio de notificações**, selecionar SMTP da instalação, SMTP da escola ou desativado; configurar, validar autenticação, solicitar teste ao próprio e-mail e acompanhar fila. | Credencial criptografada e nunca devolvida. TLS obrigatório (465 ou 587) e DNS fixado após validação. Configuração escolar é usada pelo worker em convites, códigos de verificação/recuperação, avisos de inscrição e alertas existentes. O webmail pessoal tem autenticação separada. |
| Ativar atendimento por área | A lista de áreas é inicializada como array independente no formulário e preserva o subconjunto salvo. | Cada checkbox altera somente sua área. Cancelar não modifica a configuração. O botão global habilita/desabilita a exibição sem substituir a seleção. O backend mantém escola e área explícitas. |

## E-mail: diagnóstico e operação

Antes desta alteração, a configuração da caixa institucional não configurava o SMTP transacional: o worker dependia exclusivamente das variáveis `SMTP_*`. Verificação e recuperação da conta do portal também verificavam apenas essas variáveis. Agora todos esses caminhos resolvem a configuração de envio da escola, mantendo a instalação como padrão de compatibilidade. A opção **Desativado** nunca recorre silenciosamente ao SMTP global.

A validação de autenticação não envia mensagens. O teste de envio é enfileirado para o usuário autenticado, com idempotência e intervalo mínimo entre solicitações. O serviço de processamento precisa estar ativo. A fila de e-mail mostra falhas, tentativas, atraso e resultados incertos; operações SMTP não aparecem mais como operações bancárias nessa tela.

**Aceito pelo servidor SMTP não significa entregue.** Um timeout após iniciar o envio permanece incerto, sem repetição automática. Conferir caixa de entrada, spam, rejeições do provedor e, na homologação externa, domínio/remetente e DNS. Convites devem ser reenviados em Usuários e acessos para revogar o link anterior; não reutilizar um convite vencido ou revogado.

Reparo de caixa ausente, inativa ou cuja identidade não corresponde à caixa vinculada é bloqueado. A aplicação não tenta recriar uma caixa remota desaparecida. O reparo administrativo não recupera nem redefine a senha da conta; o titular conclui a conexão com sua senha atual.

## APIs, banco e compatibilidade

- `POST /schools/{id}/academic-preparation/preview` e `/apply`: `academic.write`, escopo institucional, prévia com fingerprint da origem e transação sob lock da escola.
- `GET /schools/{id}/admissions/{id}/matches`: sugestões sem efeitos de escrita sobre pessoas, alunos ou vínculos.
- `GET/PUT /schools/{id}/notification-email`, `POST /validate` e `/test`: `integrations.manage`, controle de versão, senha omitida preserva o segredo salvo.
- `POST /schools/{id}/mailcow/mailboxes/{id}/repair`: administração da escola, reconciliação local por leitura do provedor.
- `POST /schools/{id}/email/connection/repair`: somente a caixa do próprio usuário na escola autorizada; autenticação sem envio ou escrita IMAP.
- Migration aditiva `0047_notification_email`: tabela `notification_email_settings`, sem alterar contas, mensagens ou cadastros existentes. Usa a chave de criptografia já adotada pelas integrações. Sem nova dependência de produção.
- Site e portal continuam com serviços/imagens GHCR separados na mesma stack, identidade herdada do PIGE e comunicação interna existente. Não houve alteração de CRM, Compose, volumes, portas ou domínio.

Rollback de código não exige remover a tabela aditiva. Preserve a tabela e a chave de criptografia para conservar as configurações. Retornar ao código anterior volta a usar somente SMTP da instalação; considerar essa diferença antes de qualquer atualização externa autorizada.

## Validação e evidências

Os testes de backend cobrem repetição e conflitos da preparação, ausência de cópia de matrículas, acentos, CPF formatado, homônimos, ausência de identidade, classificação de responsável pendente, permissões, escolas distintas, preservação de mensagens/senha/cota, desconexão explícita, autenticação, credenciais criptografadas, idempotência, destinatário do teste, fila e resultado SMTP incerto. O teste de renderização cobre o tipo array, isolamento do formulário e cancelamento das áreas de atendimento.

`scripts/e2e-school-operations.py` usa HTTP real, banco descartável, Chromium e transportes de e-mail sintéticos. Exercita seleção individual do atendimento, preparação com prévia, busca automática e reutilização cadastral, justificativa pronta, configuração/teste SMTP e reconexão da caixa existente. Suas capturas ficam em `evidence/0.10.0/school-operations`. O upload amplo do CI permanece condicionado à variável existente `CI_UPLOAD_EVIDENCE`; não foi habilitado globalmente nem alterada a política de cota. As cinco capturas locais, o resultado e a referência do código testado serão disponibilizados em pacote próprio, identificado como evidência local. Não usam os dados das capturas fornecidas pelo usuário.

Validação local: **653 testes backend aprovados, três casos de concorrência reservados ao PostgreSQL ignorados e cinco subtestes aprovados**; **211 testes de infraestrutura executados, um ignorado por ausência de Compose local**; typecheck, build Vue/PWA com os testes de renderização/fluxo, `compileall`, `scripts/ci/validate.py` e `git diff --check` aprovados. Python 3.13; Node local 24 (CI usa Node 22). O CI do SHA final e seu PostgreSQL real serão registrados na PR separadamente. A jornada HTTP/Chromium local foi aprovada nas cinco frentes, com zero erros de página e cinco capturas sintéticas. O download padrão do Playwright retornou HTML; a execução local usou um binário Chromium 143 isolado obtido de pacote temporário, sem adicionar dependência ao produto. O CI repete a jornada com o Chromium oficial do Playwright. A consulta foi ajustada para SQLite 3.45: a versão anterior excedia a pilha do parser com vários REPLACE aninhados; SQLite usa agora uma função determinística por conexão e PostgreSQL usa TRANSLATE/REGEXP_REPLACE nativos, sem extensão. A conciliação continua exigindo resposta HTTP 200 e sugestões reais, sem reduzir a asserção. A jornada também cobre o reparo da conexão pelo próprio titular e preserva a mensagem da caixa simulada. O aviso de sucesso da preparação foi corrigido para sobreviver à limpeza do formulário.

## Homologação externa pendente

- Conexão de uma caixa e envio/recebimento pelo provedor efetivamente instalado, com autorização do titular e preservação do acervo real; nenhuma conta real foi usada neste desenvolvimento.
- Entrega em destinatários reais, spam, políticas do remetente, certificados e DNS; validação SMTP sintética não comprova essa entrega.
- Conferência pela escola das turmas do próximo período e dos pareceres padronizados, antes de uso operacional.
- OCR mantém a limitação conhecida: **18/21 campos; foto degradada 0/3**. A revisão humana permanece necessária. Esta alteração não fornece nova evidência de melhora desse caso.
- Refinamento visual adicional e estúdio de edição continuam fora do escopo. Capturas funcionais sintéticas não representam homologação estética.
