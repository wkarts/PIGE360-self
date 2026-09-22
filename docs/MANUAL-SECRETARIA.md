# Manual de operação — Secretaria

## Estrutura da instalação

A mantenedora é cadastrada em Instituição. Uma mantenedora pode ter várias escolas; cada escola tem unidades, anos letivos, séries, turnos, turmas e seus próprios cadastros. O seletor superior define a escola de trabalho. Um usuário não administrador só acessa escolas que lhe foram autorizadas. Selecionar um identificador diferente pela API não concede acesso.

O primeiro acesso cria uma escola, uma unidade e um ano. Cadastre os demais elementos em Estrutura acadêmica. Inative cadastros que não devem ser oferecidos em novas operações, sem excluí-los. Não altere a identidade acadêmica de uma turma com matrículas: movimente os alunos pelo fluxo de matrícula.

## Aluno e responsáveis

Em Responsáveis, cadastre a pessoa. CPF pode ficar vazio; um CPF informado é validado e não pode repetir dentro da escola. Em Alunos, informe pelo menos nome e nascimento. A matrícula do cadastro (AL-) é distinta do número do vínculo anual (MAT-).

Na ficha do aluno, aba Responsáveis, use Vincular responsável. Parentesco e poderes são independentes: “Mãe/Pai/Tutor” descreve o vínculo; os indicadores Legal, Financeiro, Retirada e Principal definem suas funções. Um mesmo responsável pode cuidar de vários alunos.

A mesma pessoa existente pode ganhar o papel de aluno pela API `POST /students` com `person_id`. A interface de Novo aluno cria os dados pessoais; não oferece um assistente de fusão/deduplicação de cadastros. Não confunda arquivar aluno com cancelar matrícula: o arquivamento exige que não existam matrículas em aberto.

## Documentação

Cadastre Tipos de documento e marque se são obrigatórios, gerais ou específicos por série. Receba o arquivo na ficha do aluno. O sistema aceita PDF, PNG e JPEG dentro do limite configurado. Recebimento cria situação Recebido; um operador autorizado deve conferir e Validar ou Rejeitar, com justificativa. O arquivo original fica preservado; novos recebimentos geram novos registros.

O checklist considera o recebimento mais recente não arquivado por tipo. Um arquivo vencido não satisfaz a obrigação. Dispensa documentada é uma decisão administrativa disponível apenas ao administrador. A política da escola pode somente avisar pendências ou impedir a ativação da matrícula enquanto houver obrigação sem validação/dispensa.

Não faça upload de dados de saúde sem definir previamente permissões, finalidade, retenção e controles específicos da instituição. O perfil Consulta tem leitura dos documentos da escola autorizada; não existe separação por sensibilidade do documento nesta versão.

## Matrículas e movimentações

Nova matrícula seleciona aluno, turma e data e cria rascunho. A turma determina ano, série, turno e unidade, evitando seleções inconsistentes. Abra Detalhes e escolha Ativar matrícula. Para aluno menor de 18 anos, é exigido vínculo legal ativo. Vagas e documentação são verificadas no servidor.

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

O administrador cria usuários e define escolas e perfil. Secretaria opera os cadastros e documentos; Consulta somente lê o conjunto permitido. O botão de avatar altera a senha do próprio usuário. A recuperação por perda de senha é feita por operador com acesso autorizado ao servidor, usando o comando descrito no README. Não há envio de e-mail ou senha automática.

## Sem conexão

A PWA não é um sistema de matrícula offline. Sem conexão, a interface avisa a indisponibilidade e não confirma a gravação. Dados já abertos podem permanecer temporariamente na memória da aba, mas não são persistidos pelo service worker. Ao sair, o estado de aplicação é limpo. Não use terminais compartilhados sem políticas de sessão e proteção do dispositivo.


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
