# Inscrição online com WhatsApp e documentos manuais

A confirmação do contato agora usa a instância selecionada em Integrações > WhatsApp, inclusive uma instância preexistente adotada e compartilhada com aplicações externas. O fluxo de código não cria instância, não pede pareamento, não altera webhooks, não desconecta e não renomeia a sessão remota. O envio usa o nome já vinculado, na fila operacional existente. A configuração legada continua disponível quando não existe uma instância atual selecionável.

## Comportamento público

Os botões de código por e-mail e WhatsApp aparecem na inscrição enquanto o contato não foi confirmado e também em Minha conta. O endpoint autenticado `GET /api/v1/portal/verification/channels` informa somente disponibilidade e orientação para o responsável, sem expor fornecedor, host, tokens ou detalhes administrativos. A solicitação revalida a configuração. Instância preferencial desconectada não autoriza escolher silenciosamente outro remetente.

O código continua criptografado na fila, válido por dez minutos, com limite de tentativas e consumo único. O worker verifica a expiração antes do envio pela instância. A confirmação mantém o registro aberto na tela e libera a continuidade sem perder os dados/documentos.

## Documentos

Após o cadastro do aluno, use **Salvar e enviar documentos**. Em Documentos do aluno, selecione um tipo solicitado ou **Documento complementar (envio manual)**. O envio manual aceita PDF, PNG e JPEG sem depender de OCR ou de catálogo prévio.

A primeira ação explícita de envio complementar cria somente um tipo opcional na própria escola. Vários anexos complementares permanecem ativos; os tipos solicitados mantêm a substituição versionada anterior. Anexos complementares não dispensam documentos obrigatórios. RBAC, titularidade da inscrição, limites de tamanho/quantidade/espaço, validação do conteúdo e integridade permanecem em vigor. Não há alteração de schema ou backfill.

## Modelo contratual

Em Modelos e contratos, **Usar modelo de serviços educacionais** carrega o texto com variáveis suportadas, sem gravar ou ativar automaticamente. O modelo distribuído não contém escola, pessoas ou valores de cliente. Cada instalação seleciona seu ano letivo e mantém sua própria versão. O contrato personalizado solicitado foi entregue separadamente e não está no repositório.

A emissão preenche escola, aluno, matrícula e responsáveis pelo cadastro. Os campos financeiros, data/local e testemunhas são conferidos na emissão. O texto não cria cobranças nem calcula descontos. A assinatura A1 da escola segue obrigatória para contratos.

## Evidências e validação

- `backend/tests/test_online_manual_whatsapp.py`: API e banco reais; somente o transporte externo é substituído.
- `scripts/e2e-online-verification.py`: navegador Chromium contra Uvicorn HTTP e SQLite temporários; instância adotada, anexos manuais sem catálogo, confirmação e envio pela interface.
- `docs/qa/online-verification/results.json`: resultado da jornada, larguras 320/390/768/1440 e ausência de erros JavaScript.

Suíte backend local: 839 testes aprovados, três ignorados por exigirem PostgreSQL e cinco subtestes aprovados. Um teste GOV.BR encontrou a configuração SOCKS do ambiente local; ele foi reexecutado sem as variáveis de proxy e passou. Os nove testes novos passaram também na execução completa. CI local: 257 executados, um ignorado por ausência de Docker Compose. TypeScript/build e validação de políticas aprovados.

O E2E lê o código da fila sintética para preencher a confirmação. Isso não comprova entrega em um telefone real. Nenhum provedor, certificado, banco ou dado de produção foi utilizado.

## Implantação e recuperação

Não houve merge, release ou deploy. A implantação futura exige aprovação, backup de banco/arquivos e publicação conjunta de app/worker/frontend do mesmo SHA. Não é necessária migration nova. Conferir saúde, remetente preferencial, solicitação real de código, dois anexos e conclusão da inscrição em homologação autorizada. Para recuperação, usar a imagem anterior; não remover anexos ou tipos já utilizados. Jobs anteriores continuam no formato compatível. O worker anterior não aplica a nova verificação adicional de expiração dos códigos na fila de instâncias.
