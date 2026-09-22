# Matrícula online e atendimento da família

## Processo público por escola

Acesse **Inscrições online → Processos e link público** como administrador. Defina título, slug único, datas de abertura/encerramento, instruções, versão dos termos e aviso de privacidade. Selecione as turmas ofertadas; elas precisam pertencer à mesma escola e ao mesmo ano letivo. O ano deve estar ativo. Uma nova escola pode publicar seu próprio processo na mesma instalação, sem compartilhar inscrições privadas.

Publique somente após revisar texto, ofertas e canais de suporte. A URL é `/online.html?campaign=SLUG`. A página exibe a escola, o processo, as datas e o aviso. Os números de vagas são informativos; o envio não reserva vaga.

A política permite exigir contato verificado, arquivos dos documentos obrigatórios e pagamento antes da efetivação. Enviar arquivo não equivale a aprovar documento. A efetivação também verifica a política de documentação da escola, vagas e o responsável legal.

## Conta do responsável

O pai, mãe ou responsável informa nome, e-mail, senha e dados de contato. CPF pode ser informado no cadastro e é necessário para uma cobrança emitida por este fluxo. A autorização de avisos por WhatsApp é explícita; não é confundida com o aceite do aviso de privacidade.

As contas são próprias do portal. Saber o CPF de alguém ou registrar o mesmo documento não associa automaticamente alunos de cadastros internos. A Secretaria precisa verificar a identidade e os vínculos. Uma conta pode criar inscrições para vários alunos; só vê suas próprias inscrições e os documentos/cobranças liberados para elas.

A verificação de contato usa código de uso único, validade de dez minutos e limite de tentativas. E-mail depende de SMTP; telefone depende da conexão de WhatsApp configurada. A recuperação de senha usa e-mail e revoga sessões anteriores. Sem canal de envio, a tela orienta procurar a Secretaria; nenhum código é exposto na resposta da API.

A alteração do telefone da conta remove a confirmação anterior. Alterar o perfil não reescreve retroativamente o cadastro oficial ou snapshots de inscrições já enviadas.

## Autocadastro e documentos

O responsável cadastra os dados do aluno, nascimento, endereço, escola anterior, vínculo familiar e a turma/oferta desejada. Pode salvar rascunho e continuar depois. Edita inscrições em rascunho ou devolvidas para correção, respeitando a versão do registro e o período do processo.

Os anexos aceitam PDF, PNG e JPEG validados, com limites de tamanho e quantidade. Arquivos têm nome interno, hash e vínculo privado com a inscrição; não são publicados como uma pasta estática. A substituição mantém o histórico do documento anterior. Documentos destinados à escola são conferidos pela equipe, não aprovados automaticamente pelo upload.

Para enviar a pré-matrícula, o responsável aceita a versão atual dos termos e declara sua responsabilidade pelo aluno. A declaração é uma informação fornecida pelo responsável, **não uma prova automatizada de representação legal**. O recibo comprova envio, não matrícula efetiva.

## Trabalho da Secretaria

A fila permite localizar pelo aluno/número e situação. A equipe pode iniciar análise, solicitar correções, colocar em lista de espera, indeferir ou registrar desistência com justificativa. Há conversas visíveis à família e notas internas que não aparecem no portal. A comunicação externa via Connect exige telefone confirmado e autorização de avisos.

A análise documental aceita validação ou rejeição com parecer. Antes da aprovação, confira documentos e vínculo do responsável. Na existência de CPF já cadastrado, selecione explicitamente a pessoa/aluno existentes; não faça associação automática apenas pela coincidência. A aprovação reaproveita ou cria os registros verificados e gera matrícula em rascunho, importando os anexos pertinentes.

Na etapa **Efetivar matrícula**, o sistema verifica novamente a matrícula, vaga, política documental e cobrança obrigatória. A operação mantém histórico e gera comprovante persistido. O responsável passa a consultar a situação efetiva e baixar o documento escolar autorizado.

Estados principais:

```text
rascunho → enviada → em análise
                    ├─ correção solicitada → reenviada
                    ├─ lista de espera
                    ├─ indeferida / desistência
                    └─ aprovada → matrícula em preparação → matriculada
```

A inscrição aprovada não é automaticamente ativada apenas por pagar. A Secretaria conclui a conferência final. A matrícula interna e sua movimentação continuam disponíveis pelas telas já existentes.

## Cobrança no contexto da matrícula

O administrador pode gerar cobrança vinculada à inscrição ou à matrícula. Define valor, vencimento, descrição, Pix/boleto e se uma taxa avulsa é obrigatória para efetivar. O sistema exige responsável financeiro identificável e conta ASAAS habilitada; não cria pagamento fictício na ausência de credenciais.

Mensalidades podem ser criadas como lote de até 24 cobranças mensais independentes. O valor informado é **de cada parcela**, não o valor total dividido. Datas mantêm o dia, ajustando ao último dia de meses menores. Este lote não é um contrato de assinatura automática do ASAAS.

O portal mostra cobrança e documento financeiro apenas para a conta autorizada daquele processo. Uma obrigação marcada como obrigatória precisa de situação recebida conciliada no provedor. Não há Pix de saída ou transferência bancária automática.

## Limites

O portal atual atende inscrições e acompanhamento dos processos criados nesta versão. Não oferece automaticamente todos os prontuários históricos da escola nem portal acadêmico de notas/frequência. A rematrícula interna existente foi mantida; um novo processo público pode ser analisado e associado explicitamente a aluno existente, mas não há disparo massivo automático de rematrícula online para a base antiga.

Pré-matrícula não produz histórico escolar acadêmico oficial, certificado de conclusão, assinatura ICP-Brasil/GOV.BR ou transmissão Educacenso. Esses itens não foram implementados nesta expansão.
