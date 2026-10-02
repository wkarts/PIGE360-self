# E-mail institucional dentro da aplicação

Cada usuário com caixa provisionada e ativa pode abrir **Meu e-mail** na instituição à qual tem acesso. O administrador não recebe acesso às mensagens dos demais usuários. Professores, alunos e responsáveis usam o mesmo isolamento por titular e escola.

O cliente lê a caixa real e permite pesquisar, paginar, abrir mensagens e anexos, marcar leitura ou destaque, mover mensagens, salvar e editar rascunhos e enviar e-mails. Pastas personalizadas podem ser criadas, renomeadas e removidas quando vazias. Mensagens na lixeira ou no spam podem ser excluídas definitivamente após confirmação. As pastas principais não podem ser renomeadas ou removidas.

## Conexão

- A configuração administrativa existente fornece o hostname padrão. A API `GET/PUT /api/v1/schools/{school_id}/email/settings`, exclusiva do administrador, permite especificar `imap_host`, `smtp_host` e `smtp_port`.
- A leitura usa IMAPS na porta 993. O envio usa SMTPS na porta 465 ou STARTTLS obrigatório na porta 587. Não existe opção de enviar senha ou mensagens sem TLS.
- O certificado deve ser válido para o hostname configurado. A instalação precisa conseguir acessar as portas de saída escolhidas.
- Hostnames resolvem uma vez por conexão; todas as respostas DNS são verificadas antes de fixar o IP do socket. Loopback, link-local, metadados, multicast e endereços reservados são bloqueados. Redes privadas só são aceitas quando a configuração administrativa existente permite explicitamente essa rede.
- Nas novas provisões, a senha aleatória recebe uma cópia criptografada separada para o cliente pessoal. A senha inicial administrativa continua disponível uma única vez, pelo prazo existente; revelá-la não expõe nem apaga a credencial do cliente pessoal.
- Novas caixas recebem credencial aleatória forte e configuração completa. No primeiro acesso ao e-mail, a aplicação valida IMAP e SMTP automaticamente, sem solicitar novamente uma senha já conhecida e sem enviar mensagem. A caixa só aparece conectada após ambas as autenticações. A criação remota usa `force_pw_update=0`, pois a senha gerada é uma credencial de serviço protegida.
- Caixas provisionadas anteriormente recuperam a conexão quando a credencial de provisionamento ainda existe. Desconexão explícita é respeitada. Falha de rede permite tentar novamente; senha rejeitada exige a senha atual do titular, sem redefinição remota automática.
- Caixas existentes no domínio da instituição podem ser vinculadas por **E-mail institucional → Vincular e-mails existentes**, ou pelo próprio titular em **Meu e-mail → Verificar meu e-mail**. A aplicação verifica o domínio e a existência/ativação remota antes de criar o vínculo local. Sem credencial conhecida, o titular autentica a caixa uma vez; a API administrativa não permite recuperar a senha antiga.
- A migration `0034_email_auto_connection` adiciona o estado e a data da validação. Alterar as configurações do servidor invalida as verificações anteriores da instituição. Nenhuma senha aparece no retorno da conexão automática.

## Segurança e limites

As mensagens permanecem no servidor institucional. A aplicação não armazena o corpo dos e-mails nem anexos no banco. Credenciais são criptografadas com a chave de integrações existente. Os recibos de envio guardam titular, escola, hash da solicitação, identificador e resultado do envio, sem corpo nem senha. A auditoria registra conexão/configuração e estado de envio, sem conteúdo, destinatários ou credenciais.

O conteúdo recebido é convertido em texto. HTML, scripts, imagens remotas e rastreadores não são executados. Anexos são devolvidos como download, com tipo binário, `nosniff`, política de conteúdo isolada e sem cache. A leitura tem limite de 10 MiB por mensagem; a composição permite até 10 anexos somando 5 MiB e até 50 destinatários. A pesquisa usa o servidor e a paginação usa UIDs, com UIDVALIDITY obrigatório em leitura e alterações. Uma mudança de identidade da pasta bloqueia operações até atualizar a lista.

Mover exige a extensão MOVE do servidor. Exclusão definitiva exige UIDPLUS e usa `UID EXPUNGE` de uma única mensagem. O cliente nunca executa EXPUNGE global e nunca exclui as mensagens marcadas por outros clientes. Pastas customizadas são conferidas antes da exclusão; a operação continua sujeita a alterações simultâneas feitas por outros clientes no servidor.

## Envio e reconciliação

O envio acontece somente na ação explícita **Enviar**. Não existe job de envio automático. Cada tentativa recebe um UUID; a intenção é persistida antes do contato de envio. Repetir o mesmo UUID consulta o resultado já registrado, sem reenviar. Reusar o UUID para outro conteúdo é bloqueado.

Após aceitação pelo servidor, o estado enviado é persistido antes de salvar a cópia em Enviados. Uma falha de gravação dessa cópia gera aviso, mas não refaz o envio. Destinatários ocultos não entram no conteúdo entregue; a cópia pessoal em Enviados conserva essa informação. Recusa parcial apresenta os destinatários recusados. Timeout após iniciar a submissão gera estado **incerto**: confira Enviados e os destinatários antes de criar uma nova tentativa. SMTP não oferece confirmação transacional ponta a ponta; a aplicação não declara sucesso sem aceitação nem garante entrega à caixa final.

Rascunhos são gravados antes de remover a versão anterior. Se a remoção da versão anterior falhar, o retorno indica que ela continua na pasta. Após envio integral aceito, a aplicação tenta remover o rascunho original com exclusão específica por UID.

## Atualização e validação

A migration `0027_email_client` sucede `0027_school_community` e cria configurações do cliente, credenciais pessoais e recibos de envio. Não requer bibliotecas adicionais. Reverter essa migration remove as credenciais salvas e recibos locais; não remove caixas ou mensagens do servidor.

Os testes utilizam caixas sintéticas, transporte de protocolo simulado e servidores TLS locais descartáveis. Cobrem isolamento, conexão/desconexão, preservação da senha inicial, MIME, HTML seguro, anexos, paginação, UIDVALIDITY, pastas, rascunhos, exclusão específica, envio único, recusa parcial, timeout, falha de cópia e proteção de DNS/TLS. Nenhuma conta institucional real é provisionada e nenhum e-mail externo é enviado na validação.

A validação no servidor institucional depende dos hostnames, portas, certificado e credenciais reais da instalação. O teste de leitura da API de provisionamento não comprova autenticação IMAP/SMTP nem permissão de criação de caixas.

## Referências técnicas

- Python 3.13: https://docs.python.org/3.13/library/imaplib.html
- Python 3.13: https://docs.python.org/3.13/library/smtplib.html
- IMAP MOVE: https://www.rfc-editor.org/rfc/rfc6851
- IMAP UIDPLUS: https://www.rfc-editor.org/rfc/rfc4315
