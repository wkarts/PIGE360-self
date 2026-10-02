# E-mail institucional dentro da aplicação

Cada usuário com caixa ativa pode abrir **E-mail** na instituição à qual tem acesso. O titular pode informar novamente a senha ou conectar outra caixa do domínio autorizado; o sistema valida IMAP e SMTP antes de trocar a conexão. O administrador não recebe acesso às mensagens dos demais usuários. Professores, alunos e responsáveis usam o mesmo isolamento por titular e escola.

O cliente lê a caixa real e permite pesquisar, paginar, abrir mensagens e anexos, marcar leitura ou destaque, mover mensagens, salvar e editar rascunhos e enviar e-mails. Pastas personalizadas podem ser criadas, renomeadas e removidas quando vazias. Mensagens na lixeira ou no spam podem ser excluídas definitivamente após confirmação. As pastas principais não podem ser renomeadas ou removidas.

## Conexão

- A configuração administrativa existente fornece o hostname padrão. A API `GET/PUT /api/v1/schools/{school_id}/email/settings`, exclusiva do administrador, permite especificar `imap_host`, `smtp_host` e `smtp_port`.
- A leitura usa IMAPS na porta 993. O envio usa SMTPS na porta 465 ou STARTTLS obrigatório na porta 587. Não existe opção de enviar senha ou mensagens sem TLS.
- O certificado deve ser válido para o hostname configurado. A instalação precisa conseguir acessar as portas de saída escolhidas.
- Hostnames resolvem uma vez por conexão; todas as respostas DNS são verificadas antes de fixar o IP do socket. Loopback, link-local, metadados, multicast e endereços reservados são bloqueados. Redes privadas só são aceitas quando a configuração administrativa existente permite explicitamente essa rede.
- Nas novas provisões, a senha aleatória recebe uma cópia criptografada separada para o cliente pessoal. A senha inicial administrativa continua disponível uma única vez, pelo prazo existente; revelá-la não expõe nem apaga a credencial do cliente pessoal.
- Novas caixas recebem credencial aleatória forte e configuração completa. No primeiro acesso ao e-mail, a aplicação valida IMAP e SMTP automaticamente, sem solicitar novamente uma senha já conhecida e sem enviar mensagem. A caixa só aparece conectada após ambas as autenticações. A criação remota usa `force_pw_update=0`, pois a senha gerada é uma credencial de serviço protegida.
- Caixas provisionadas anteriormente recuperam a conexão quando a credencial de provisionamento ainda existe. Desconexão explícita é respeitada. Falha de rede permite tentar novamente; senha rejeitada exige a senha atual do titular, sem redefinição remota automática.
- Uma caixa alternativa só pode usar o domínio configurado para a instituição ativa. A autenticação em IMAP e SMTP confirma endereço e credencial sem enviar mensagem; a senha é criptografada e substitui a credencial pessoal anterior após as duas validações.
- A migration `0034_email_auto_connection` adiciona o estado e a data da validação. A migration `0035_email_alternate_mailbox` guarda somente o endereço alternativo, sem segredo. Alterar as configurações do servidor invalida as verificações anteriores da instituição. Nenhuma senha aparece no retorno da conexão automática.

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

## Webmail SOGo dentro do PIGE360

O menu **E-mail** abre o SOGo dentro da própria tela do PIGE360. O backend emite um ticket de 90 segundos, de uso único, que é trocado por cookie HttpOnly; cada chamada do quadro confirma novamente o usuário, o vínculo ativo, a instituição, a caixa e a credencial validada. A senha nunca é entregue ao JavaScript nem enviada em parâmetro de URL. A senha é encaminhada apenas do backend para o SOGo privado.

O SOGo não publica uma porta na máquina host. O proxy same-origin do PIGE360 é o único caminho para a interface. A fonte SQL contém somente caixas ativas e validadas e retorna um identificador exclusivo por usuário e instituição, além do login e host IMAP da escola. Uma role `pige360_sogo` separada pode ler a view e criar as tabelas próprias de calendário, contatos e preferências, sem ler as demais tabelas escolares. O downgrade preserva esses dados.

A faixa superior e as regras de cor e tipografia usam a identidade visual configurada em **Instituição**. Cada resposta HTML do webmail recebe os valores de marca atuais; o quadro continua dentro da instituição ativa.

Os ambientes Docker passam a incluir `mail-agent` e `sogo`, e o GHCR publica imagens próprias para os dois. `scripts/configure.py` gera `MAIL_AGENT_SHARED_KEY` e `SOGO_DB_PASSWORD`; mantenha esses segredos no `.env` com acesso restrito. `SOGO_SMTP_SERVER` recebe a URL do relay SMTP acessível pela rede privada; o SOGo usa um relay global porque sua configuração SMTP é global. A rota de IMAP é resolvida por escola. Até um relay SMTP com seleção automática por conexão ser configurado, o envio pelo SOGo depende desse valor; o cliente alternativo do PIGE360 continua disponível no mesmo menu.

O agente executa chamadas administrativas do provedor e testa credenciais IMAP/SMTP genéricas. O teste genérico não provisiona caixas: isso exige uma API administrativa do servidor. As chamadas Mailcow existentes são encaminhadas pelo agente interno; credenciais administrativas permanecem criptografadas no banco do PIGE360.

O pipeline compila e publica os dois sidecars como pacotes PIGE360, testa a stack com os três digests e promove os mesmos digests em `develop` e nas releases. O SOGo base é construído a partir da distribuição fonte comunitária `sonroyaalmerol/docker-sogo` com uma versão fixada, e a camada PIGE360 fornece defaults e autenticação pelo proxy. O projeto dessa imagem informa que sua conversão YAML não é suportada oficialmente pelo SOGo; por isso o smoke com Docker/PostgreSQL no GitHub Actions é necessário antes de promover qualquer versão.
