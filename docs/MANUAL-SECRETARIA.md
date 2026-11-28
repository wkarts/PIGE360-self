# Manual de operação — Secretaria

## Estrutura da instalação

A mantenedora é cadastrada em Instituição. Uma mantenedora pode ter várias escolas; cada escola tem unidades, anos letivos, séries, turnos, turmas e seus próprios cadastros. O seletor superior define a escola de trabalho. Um usuário não administrador só acessa escolas que lhe foram autorizadas. Selecionar um identificador diferente pela API não concede acesso.

O primeiro acesso cria uma escola, uma unidade e um ano. Cadastre os demais elementos em Estrutura acadêmica. Inative cadastros que não devem ser oferecidos em novas operações, sem excluí-los. Não altere a identidade acadêmica de uma turma com matrículas: movimente os alunos pelo fluxo de matrícula.

## Aluno e responsáveis

Em Cadastro único, mantenha os dados pessoais da pessoa. CPF pode ficar vazio; um CPF informado é validado e não pode repetir dentro da escola. Em Alunos, informe pelo menos nome e nascimento. A matrícula do cadastro (AL-) é distinta do número do vínculo anual (MAT-).

Na ficha do aluno, aba Responsáveis, use Vincular responsável. Parentesco e poderes são independentes: “Mãe/Pai/Tutor” descreve o vínculo; os indicadores Legal, Financeiro, Retirada e Principal definem suas funções. Um mesmo responsável pode cuidar de vários alunos.

Antes de criar um aluno, use **Vincular pessoa existente** e pesquise por nome ou CPF. A busca começa após dois caracteres, mostra até vinte resultados e informa quando é preciso refinar. Se encontrar a pessoa, selecione-a para adicionar somente o perfil de aluno. Use **+ Novo aluno** quando a busca não localizar a identidade. A mesma pessoa pode ser aluno, responsável, professor ou funcionário; cada papel mantém seus próprios dados, enquanto nome, documentos e contatos permanecem no cadastro pessoal compartilhado. Confira homônimos antes de selecionar. Não confunda arquivar aluno com cancelar matrícula: o arquivamento exige que não existam matrículas em aberto.

## Documentação

Cadastre Tipos de documento e marque se são obrigatórios, gerais ou específicos por série. Receba o arquivo na ficha do aluno. O sistema aceita PDF, PNG e JPEG dentro do limite configurado. Recebimento cria situação Recebido; um operador autorizado deve conferir e Validar ou Rejeitar, com justificativa. O arquivo original fica preservado; novos recebimentos geram novos registros.

O checklist considera o recebimento mais recente não arquivado por tipo. Um arquivo vencido não satisfaz a obrigação. Dispensa documentada é uma decisão administrativa disponível apenas ao administrador. A política da escola pode somente avisar pendências ou impedir a ativação da matrícula enquanto houver obrigação sem validação/dispensa.

Não faça upload de dados de saúde sem definir previamente permissões, finalidade, retenção e controles específicos da instituição. O perfil Consulta tem leitura dos documentos da escola autorizada; não existe separação por sensibilidade do documento nesta versão.

## Matrículas e movimentações

Em **Nova matrícula**, selecione aluno, turma e data. A turma determina ano, série, turno e unidade. **Salvar rascunho** guarda os dados para continuar em Detalhes. **Efetivar matrícula** pede confirmação e ocupa a vaga na mesma operação. Se a efetivação for recusada, corrija a pendência ou escolha salvar um rascunho. Para aluno menor de 18 anos, é exigido vínculo legal ativo. Vagas e documentação são verificadas no servidor.

Ativa e suspensa ocupam vaga. Rascunho não ocupa vaga, mas impede outro rascunho/vínculo equivalente no ano. Uma tentativa repetida com a mesma versão não gera a mesma movimentação duas vezes: o servidor responde conflito e exige recarregar o registro.

Mudar turma/turno exige outra turma da mesma série e ano, com vaga. Para outro ano, use Rematricular: um novo registro é criado, com referência ao anterior. A rematrícula não conclui automaticamente o ano anterior e não realiza progressão acadêmica ou análise de notas.

Transferir registra a saída externa e libera a vaga, sem excluir histórico. Não cadastra o aluno automaticamente em outra escola. Suspender preserva a vaga. Cancelar exige justificativa e libera a vaga; uma reativação volta a verificar as condições. Concluir registra o encerramento e mantém a identidade daquele vínculo anual.

A aplicação não implementa um lançamento retroativo de vigência de movimentações: registra o momento da ação e sua justificativa. Não deve substituir escrituração acadêmica legal sem análise dos requisitos da escola.

## Emissão de documentos

Ficha cadastral pode ser emitida na ficha do aluno. Comprovante e declaração exigem matrícula ativa. O PDF fica arquivado, junto a uma cópia dos dados usados na emissão e o hash do arquivo. Edições posteriores nos cadastros não modificam automaticamente os PDFs já emitidos.

A emissão não significa assinatura digital nem validação oficial. O documento contém espaço de assinatura física e aviso de ausência de assinatura digital. Os templates são código versionado nesta entrega; alterações de layout exigem manutenção no módulo de documentos.

## Protocolos e relatórios

Abra um protocolo, selecione o aluno quando aplicável, informe tipo, prazo e descrição. Os estados disponíveis são Aberto, Em atendimento, Aguardando, Concluído e Cancelado. Conclusão registra data. Não há aprovação em cadeia, notificação automática ou SLA com alertas.

Relatórios permite selecionar turma e gerar PDF. Exportar cadastro CSV inclui código, nome, nascimento, contato e situação. As fórmulas perigosas em células de texto são prefixadas para não serem interpretadas como fórmulas em uma planilha.

## Acesso e recuperação

Selecione a instituição no gestor. Em **Alunos**, **Pais e responsáveis** ou **Professores**, abra a ficha da pessoa e escolha **Gerenciar acesso ao portal**. Esse atalho abre o acesso existente ou inicia a criação com a pessoa e o perfil selecionados. Quem possui permissão de gerenciar usuários também pode abrir **Usuários e acessos** na barra lateral.

1. Confira **E-mail**, **Perfil base** e **Pessoa vinculada**. Para o responsável, confira também os vínculos na ficha de cada aluno. O endereço em **E-mail** deve receber o convite e as mensagens de recuperação.
2. Clique em **Salvar acesso**. Acompanhe o envio e o primeiro acesso na lista de usuários. O professor abre o convite, define a senha e entra no Portal do Professor. Alunos e responsáveis seguem o mesmo procedimento no Portal do Aluno e Responsável. A instalação usa o domínio configurado para cada portal. Quando a escola usa um único domínio, os caminhos de entrada são `/professor` e `/family`, respectivamente.
3. Se a pessoa ainda aguarda o primeiro acesso, confira o destinatário e use **Reenviar convite**. O novo envio substitui o link anterior. Quem já ativou o acesso usa **Esqueci minha senha** na tela de entrada do próprio portal e informa o e-mail do cadastro. O gestor também pode escolher **Enviar recuperação de senha** no acesso ativo de quem já usou o convite ou de quem possui conta anterior à implantação dos convites. O link de recuperação pode ser usado uma vez, em até 30 minutos. Para suspender o acesso à escola, use **Gerenciar acesso** na lista do gestor.

### Liberar o trabalho do professor

Em **Usuários e acessos**, clique em **Editar** no cadastro docente. Em **Rotinas do Portal do Professor**, selecione as atividades que ele exercerá nesta escola. **Atividades e trabalhos** depende de **Diário de classe**. O professor sempre tem acesso à **Visão geral**. Para alterar um acesso existente, preencha **Motivo da alteração** e salve.

Para atribuir a turma, abra **Diário Escolar → Configuração → Abrir diário ou vincular professor**. Escolha turma, componente e professor. Clique em **Abrir diário** para um novo diário ou em **Salvar vínculo docente** para um existente. Atribua a mesma pessoa que consta no login. Na visão geral do professor, **Minhas turmas** apresenta o componente atribuído. **Planejar aula** e **Fazer chamada** aparecem conforme as permissões de lançamento do perfil.

### Liberar e-mail institucional

No cadastro de um novo usuário, a escola pode marcar **Criar uma caixa de e-mail institucional**. Para quem já tem conta de acesso, use **Integrações → E-mail → Nova caixa de e-mail**. Se a caixa já existe no servidor com o e-mail cadastrado do usuário, use **Vincular e-mails existentes → Verificar e vincular**. Para o professor, marque também a rotina **E-mail institucional** em **Usuários e acessos**.

O titular abre **E-mail** no próprio portal. Aluno e responsável usam contas individuais. A troca de aluno acompanhado preserva a caixa da pessoa que entrou. [Operação do e-mail institucional](EMAIL-INTEGRADO.md)

## Sem conexão

A PWA não é um sistema de matrícula offline. Sem conexão, a interface avisa a indisponibilidade e não confirma a gravação. Dados já abertos podem permanecer temporariamente na memória da aba, mas não são persistidos pelo service worker. Ao sair, o estado de aplicação é limpo. Não use terminais compartilhados sem políticas de sessão e proteção do dispositivo.

## Guia dentro da aplicação

Em qualquer tela autenticada, use **Guia de uso** para abrir a sequência recomendada: configurar a estrutura acadêmica, cadastrar ou reutilizar a identidade, criar e ativar a matrícula e operar o Diário. Na tela do Diário, o roteiro rápido explica períodos, aulas, chamada, avaliações, revisão, fechamento e autorização familiar. Mensagens de validação apontam o campo que precisa de correção; erros exibem um código de referência para suporte.


No **Guia de uso**, em **Escolher tarefa**, selecione **Consultar atividades e boletim no Portal do Aluno** para orientar a família ou **Fazer chamada e planejar uma aula no Portal do Professor** para orientar o docente. As duas opções mostram telas da aplicação com dados fictícios. [Ver exemplo do painel do aluno](../frontend/public/guia/portal-aluno.webp) · [Ver exemplo do diário do professor](../frontend/public/guia/professor.webp)

## Recursos adicionados na 0.2.0

### Corrigir uma pré-matrícula

Em Matrículas, abra Detalhes e use **Editar pré-matrícula**. Disponível apenas em rascunho. Corrija turma (do mesmo ano), data e observações; informe o motivo. O sistema preserva aluno/número e registra antes/depois. O botão **Ficha de matrícula PDF** também funciona antes da ativação e imprime a situação real.

### Acompanhar protocolos

Abra **Ver atendimento** para consultar a descrição e a linha do tempo. **Registrar atendimento** acrescenta uma nota; não sobrescreve a anterior. **Atualizar protocolo** permite alterar prazo e situação, com registro de autoria. Para protocolos encerrados, reabra antes de acrescentar nova nota. **Comprovante PDF** comprova o pedido registrado, não o deferimento.

A lista permite buscar número/assunto/descrição e filtrar situação ou apenas prazos vencidos. Na ficha do aluno, a aba **Protocolos** reúne os pedidos vinculados e permite abrir outro com o aluno já selecionado.

### Conferir documentação em lote

Em Documentação, use ano, turma, tipo e situação. Clique **Aplicar filtros**. O resultado distingue ausência, recebimento sem análise, rejeição e vencimento. **Exportar CSV** e **Gerar PDF** respeitam os filtros configurados na emissão. A contagem é por documento obrigatório, não por quantidade de arquivos armazenados.

O relatório usa a matrícula mais recente em rascunho/ativa/suspensa que corresponda ao filtro. Sem ano/turma, usa a mais recente nesses estados. Ele não substitui uma auditoria de todos os períodos históricos. Resultados grandes exigem refinamento para não gerar arquivos incompletos.


## Expansão 0.3.0

Para Inscrições online, Cobranças e Integrações, leia `MATRICULA-ONLINE.md` e `INTEGRACOES.md`. Os passos anteriores continuam referentes à operação interna. O template original não acompanha mais a aplicação.
