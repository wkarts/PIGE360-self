# Manual de operação — Secretaria

## Estrutura da instalação

A mantenedora é cadastrada em Instituição. Uma mantenedora pode ter várias escolas; cada escola tem unidades, anos letivos, séries, turnos, turmas e seus próprios cadastros. O seletor superior define a escola de trabalho. Um usuário não administrador só acessa escolas que lhe foram autorizadas. Selecionar um identificador diferente pela API não concede acesso.

O primeiro acesso cria uma escola, uma unidade e um ano. Cadastre os demais elementos em Estrutura acadêmica. Inative cadastros que não devem ser oferecidos em novas operações, sem excluí-los. Não altere a identidade acadêmica de uma turma com matrículas: movimente os alunos pelo fluxo de matrícula.

## Navegar no gestor e nos portais

No computador, **Recolher menu lateral** deixa os ícones visíveis e libera espaço para cadastros e lançamentos. No gestor, aponte para o ícone de **Cadastros** ou clique nele. O painel ao lado mostra **Alunos**, **Professores** e os demais cadastros permitidos ao seu perfil. Escolha **Alunos** para abrir a lista. **Expandir menu lateral** volta a mostrar os nomes na própria barra. [Ver o menu Cadastros recolhido](../frontend/public/guia/navegacao.webp)

Para navegar com o teclado, use **Tab** até o ícone do grupo e pressione **→** para ir à primeira opção. As teclas **↑** e **↓** percorrem a lista. Pressione **Enter** para abrir a opção ou **Esc** para fechar o painel e voltar ao ícone. Com o mouse, clique fora do painel para fechá-lo.

No Portal do Aluno e Responsável, quem tem acesso acadêmico encontra as tarefas em **Acompanhamento escolar → Atividades**. Para falar com a escola, use **Serviços escolares → Atendimento**. No Portal do Professor, consulte a agenda em **Rotina docente → Minha programação** e acompanhe os protocolos em **Comunicação → Atendimento**, conforme as rotinas liberadas.

No celular, toque em **Abrir menu**, escolha o grupo e a opção desejada. Para voltar ao conteúdo sem escolher outra área, use **Fechar menu**.

As áreas abertas ficam nas guias do alto da tela. Selecione o nome da guia para retomar a tarefa ou o **×** ao lado desse nome para fechá-la. Para manter só a guia inicial, dê um duplo clique nela ou use **Fechar outras guias**, inclusive no celular. No aviso, selecione **Voltar** se ainda precisar salvar um lançamento. **Fechar outras guias** confirma o descarte dos rascunhos nas guias que serão fechadas.

Quando a aplicação pedir confirmação, **Tab** percorre os botões do aviso. **Esc** ou **×** cancela a ação e devolve o foco ao controle que abriu o aviso. Ao enviar um formulário com campos inválidos, o primeiro campo a corrigir recebe o foco e uma mensagem explica o que preencher.

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

Confira no próprio documento se a emissão prevê assinatura física ou digital. Para o boletim, a família pode baixar o PDF de consulta ou uma revisão oficial que a escola já tenha assinado com certificado A1.

## Protocolos e relatórios

No gestor, abra **Protocolos** para acompanhar pedidos recebidos e atendimentos iniciados pela Secretaria. Os estados disponíveis são Aberto, Em atendimento, Aguardando, Concluído e Cancelado. A conclusão registra a data. A equipe pode informar prazo para acompanhar pendências na própria lista.

### Fale com o colégio nos portais

1. O professor, aluno ou responsável entra em **Atendimento → Novo protocolo**. No portal da família, primeiro seleciona o aluno. A categoria **Pedagógico** exige acesso acadêmico ao aluno e **Financeiro** exige o vínculo de responsável financeiro. O professor abre os próprios pedidos sem selecionar um aluno.
2. O solicitante escolhe a categoria, informa assunto e mensagem e, se necessário, anexa um PDF, JPG ou PNG dentro do limite exibido. Ao clicar em **Abrir protocolo**, recebe um número com o prefixo **PRO-**. Para consultar depois, pode buscar pelo número ou abrir o assunto em **Meus protocolos**. Cada conta vê os pedidos em seu nome no contexto da escola e do aluno selecionados.
3. Na Secretaria, abra **Protocolos → Ver atendimento**. Confira a origem, o solicitante e o aluno, quando houver. Em **Conversa com o solicitante**, use **Responder ao solicitante** para publicar texto e anexo no portal. **Adicionar nota interna** grava somente no histórico da equipe. Para iniciar um pedido em nome de alguém, escolha **Iniciar atendimento no portal**, pesquise o solicitante e confira o aluno e a categoria antes de enviar.
4. No portal, o solicitante abre **Histórico do protocolo** para ler e baixar anexos. Durante o atendimento, escreve em **Sua resposta** e usa **Enviar resposta**. Depois do encerramento, o histórico continua disponível para consulta.

**Preferência de avisos** define onde a pessoa recebe o aviso de uma atualização pública da escola. O e-mail depende do endereço da conta e do serviço de envio configurado. O WhatsApp exige telefone cadastrado e conexão ativa da escola. Cada aviso indica o número do protocolo e direciona ao portal para ler e responder.

Para definir como quer receber a abertura de futuros atendimentos pela Secretaria, o titular usa **Avisos de novos protocolos abertos pela escola**, na lista. Escolha o canal disponível e clique em **Salvar preferência de abertura**. A escolha vale para essa pessoa nessa escola. Dentro de cada protocolo em andamento, o titular pode ajustar a preferência daquele atendimento.

**Abrir chat da escola** inicia o atendimento pelo HUB quando a escola o habilita e o chat fica disponível. Use **Copiar número do protocolo** e cole a referência na conversa para que o atendente localize o pedido no gestor. **Continuar pelo WhatsApp** abre a conversa com a escola e prepara uma mensagem com esse número para o solicitante enviar. As conversas e respostas por e-mail ficam nos respectivos canais. Para acrescentar uma mensagem ao histórico do protocolo, use **Enviar resposta** no portal ou **Responder ao solicitante** no gestor.

[Ver exemplo do histórico de atendimento](../frontend/public/guia/atendimento.webp)

### Relatórios

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

### Orientar a leitura do boletim

O aluno entra em **Minha vida escolar**. O responsável com acesso acadêmico seleciona o dependente e entra em **Vida acadêmica**. Ambos também podem escolher **Consultar boletim** na visão geral. Confira a matrícula, o ano e a turma antes de interpretar as notas. Quando houver vários fechamentos, **Período e turma** filtra a consulta.

Cada componente segue o critério da escola, que pode usar nota ou conceito. A frequência e as faltas correspondem ao mesmo período. **Não publicado** indica um período que ainda aguarda publicação. **Sem resultado publicado** indica que há publicação no período, mas falta resultado para aquele componente. **Não apurada** indica que a frequência ainda não pôde ser calculada. Quando a escola publica uma observação, ela aparece em **Pareceres pedagógicos**.

**Baixar boletim PDF** reúne os resultados publicados da matrícula inteira, inclusive quando a tela exibe apenas um período. Para entregar uma via com assinatura digital, abra a revisão solicitada em **Vias oficiais assinadas**. Essa lista aparece quando a escola já emitiu uma revisão com certificado A1. [Ver a grade com quatro bimestres e cinco componentes](../frontend/public/guia/boletim-aluno.webp)

### Conferir as cobranças que a família pode acessar

Na ficha do aluno, confirme o vínculo **Financeiro** ativo do responsável. Em **Financeiro**, ele vê as cobranças autorizadas para aquele dependente. O pagador identificado na cobrança também pode consultar o documento de pagamento enquanto houver instruções válidas. O vínculo exclusivamente financeiro permite consultar as próprias cobranças e preserva a privacidade das atividades e do boletim.

No Asaas, o portal pode apresentar fatura, boleto ou Pix copia e cola. Pela integração com o CRM, o título pode trazer Pix ou a linha digitável e o código de barras do boleto. **Pagamento identificado no CRM** informa o retorno externo. Para conferir a baixa na escola, consulte o registro da cobrança no gestor.

## Sem conexão

A PWA não é um sistema de matrícula offline. Sem conexão, a interface avisa a indisponibilidade e não confirma a gravação. Dados já abertos podem permanecer temporariamente na memória da aba, mas não são persistidos pelo service worker. Ao sair, o estado de aplicação é limpo. Não use terminais compartilhados sem políticas de sessão e proteção do dispositivo.

## Conferir uma matrícula no Educacenso

Em **Educacenso → Dados a declarar**, escolha o ambiente, a etapa, o ano letivo e a data de referência. Em **Abrangência**, selecione **Um aluno**. Busque pelo nome ou número e confira a turma e a matrícula, especialmente quando houver nomes parecidos. Clique em **Validar prévia** e em **Guardar rascunho** depois da conferência.

Em **Editar dados**, a etapa **Matrícula Inicial** permite ajustar o nome, o código Inep e a data de nascimento declarados. A etapa **Situação do Aluno** permite ajustar a situação. Informe o motivo e use **Salvar ajuste**. Retirar uma matrícula altera a composição desse rascunho. Arquivar encerra o trabalho nele e preserva a consulta pelo **Histórico** no ambiente correspondente. Use **Baixar ficha do aluno** para imprimir ou guardar o PDF daquela matrícula. Cada revisão tem um diagnóstico local em JSON. A secretaria continua responsável pelo procedimento oficial no INEP. [Ver exemplo de rascunho individual](../frontend/public/guia/educacenso-individual.webp)

## Guia dentro da aplicação

No gestor, abra **Guia de uso → Escolher tarefa** para consultar os passos e as capturas da aplicação. Selecione **Ler e imprimir o boletim escolar**, **Orientar a família sobre atividades e cobranças** ou **Fazer chamada e planejar uma aula no Portal do Professor** conforme a dúvida. No Diário, o roteiro rápido também explica chamada, avaliações, revisão, fechamento e publicação para a família. [Ver exemplo do painel do aluno](../frontend/public/guia/portal-aluno.webp) · [Ver exemplo do diário do professor](../frontend/public/guia/professor.webp)

## Recursos adicionados na 0.2.0

### Corrigir uma pré-matrícula

Em Matrículas, abra Detalhes e use **Editar pré-matrícula**. Disponível apenas em rascunho. Corrija turma (do mesmo ano), data e observações; informe o motivo. O sistema preserva aluno/número e registra antes/depois. O botão **Ficha de matrícula PDF** também funciona antes da ativação e imprime a situação real.

### Acompanhar protocolos

Abra **Ver atendimento** para consultar a descrição e a linha do tempo. Nos protocolos internos, **Registrar atendimento** acrescenta uma nota e preserva os registros anteriores. Nos protocolos vinculados a um solicitante, use **Responder ao solicitante** ou **Adicionar nota interna**, conforme o destinatário. **Atualizar protocolo** permite alterar prazo e situação, com registro de autoria. Para protocolos encerrados, reabra antes de acrescentar uma nota. **Comprovante PDF** documenta o pedido registrado.

A lista permite buscar número/assunto/descrição e filtrar situação ou apenas prazos vencidos. Na ficha do aluno, a aba **Protocolos** reúne os pedidos vinculados e permite abrir outro com o aluno já selecionado.

### Conferir documentação em lote

Em Documentação, use ano, turma, tipo e situação. Clique **Aplicar filtros**. O resultado distingue ausência, recebimento sem análise, rejeição e vencimento. **Exportar CSV** e **Gerar PDF** respeitam os filtros configurados na emissão. A contagem é por documento obrigatório, não por quantidade de arquivos armazenados.

O relatório usa a matrícula mais recente em rascunho/ativa/suspensa que corresponda ao filtro. Sem ano/turma, usa a mais recente nesses estados. Ele não substitui uma auditoria de todos os períodos históricos. Resultados grandes exigem refinamento para não gerar arquivos incompletos.


## Expansão 0.3.0

Para Inscrições online, Cobranças e Integrações, leia `MATRICULA-ONLINE.md` e `INTEGRACOES.md`. Os passos anteriores continuam referentes à operação interna. O template original não acompanha mais a aplicação.
