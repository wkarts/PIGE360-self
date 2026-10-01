# E-mail institucional com Mailcow

A configuração fica em **Integrações → E-mail**, por escola. O cadastro de usuários pode solicitar a criação de uma caixa institucional, e a execução ocorre no worker já usado pela aplicação. Este recurso provisiona contas; não envia mensagens.

## Configuração

1. Cadastre e ative previamente o domínio no Mailcow. DNS, MX, SPF, DKIM, DMARC, certificados e entrega de mensagens são administrados no servidor de e-mail.
2. Habilite a API de leitura e escrita do Mailcow e autorize o IP de saída desta instalação na lista de acesso da API.
3. Na aplicação, informe o endereço HTTPS do Mailcow, o domínio, a chave da API e a cota padrão por caixa em MB. Exemplo: `https://mail.escola.edu.br`, domínio `escola.edu.br`, cota `2048` MB.
4. Habilite a criação de contas, salve e use **Testar conexão**. Esse teste consulta o domínio; não cria uma caixa e não comprova permissão de escrita ou entrega de mensagens.
5. Mantenha o serviço worker ativo para processar a fila.

A chave da API é criptografada com a mesma `INTEGRATION_ENCRYPTION_KEY` já exigida pelas integrações da instalação. Ela não é devolvida pelas consultas. Não há uma variável de ambiente específica para definir o Mailcow ou seu domínio: essas configurações são feitas na aplicação.

O servidor precisa usar HTTPS nas portas 443 ou 8443, sem caminho adicional na URL. Para um servidor em rede privada, marque explicitamente a opção de rede privada. A conexão valida os endereços DNS, fixa o IP da conexão e mantém o hostname original na validação TLS; não segue redirecionamentos nem usa proxies do ambiente. Loopback, link-local, endereços de metadados e endereços não permitidos continuam bloqueados. Redes privadas autorizadas: RFC 1918 e IPv6 ULA.

## Criar contas

- Ao cadastrar um usuário, marque a opção de criar caixa institucional e informe a escola e o nome antes do `@`.
- Para um usuário já cadastrado, use **Nova caixa de e-mail** em Integrações → E-mail.
- A aplicação permite uma caixa por usuário e escola. Repetir a mesma solicitação reutiliza o registro existente.
- O endereço da caixa pode ser diferente do e-mail de acesso à aplicação. As senhas são independentes.
- A cota é enviada ao Mailcow em MB; 1.024 MB equivalem a 1 GB. A aplicação aceita de 1 a 1.048.576 MB, sujeita aos limites e ao espaço disponível no Mailcow.

A criação do usuário e o registro do pedido de caixa são gravados na mesma transação. Nenhuma chamada ao Mailcow ocorre durante o cadastro do usuário. Indisponibilidade remota não desfaz o usuário; o pedido permanece na fila com sua situação e tentativas.

O worker revalida escola ativa, usuário ativo e vínculo com a escola antes de provisionar. Desativação ou remoção do vínculo durante a espera impede a criação. Alterações em usuários já provisionados não removem nem desativam automaticamente uma caixa existente no Mailcow.

## Senha inicial e consulta

A senha inicial é gerada aleatoriamente, criptografada em repouso e nunca copiada da senha da aplicação. O Mailcow recebe a opção de exigir troca no primeiro acesso.

Após a confirmação da criação, o administrador pode usar **Ver acesso inicial** uma única vez, até sete dias após o provisionamento. A leitura remove o segredo armazenado na aplicação e usa resposta `no-store`; a interface mantém a senha somente em memória até fechar o diálogo ou sair da página. O administrador entrega o acesso por seu procedimento interno. A aplicação não envia a senha por e-mail ou WhatsApp.

Se a consulta já foi usada, expirou ou a resposta se perdeu, redefina a senha pelo procedimento administrativo do Mailcow. A aplicação não revela senhas atuais nem altera automaticamente caixas de terceiros.

**Consultar servidor** atualiza situação e armazenamento. Uma caixa remota desativada aparece como **Desativada**. **Abrir webmail** abre o endereço SOGo do servidor configurado.

## Fila e segurança de repetição

O processamento utiliza `IntegrationJob`, tipo `mailbox_provision`, e um identificador único da caixa. Antes de criar, consulta o endereço exato no Mailcow. A criação inclui uma tag `pige360-<id>`; a aplicação só reconhece como sua a caixa cujo endereço e tag coincidam.

Se houver timeout depois de o Mailcow criar a caixa, a tentativa seguinte consulta novamente e confirma a mesma conta sem repetir a criação. Uma caixa existente sem a tag esperada gera conflito; ela não é adotada, sobrescrita nem tem a senha redefinida. A confirmação de um POST depende do conteúdo retornado e de uma consulta posterior: HTTP 200 com `type: danger` ou `type: error` é falha.

Falhas de rede recebem tentativas automáticas com espera progressiva, até cinco execuções. Falhas permanentes, conflitos e esgotamento ficam visíveis para revisão; **Tentar novamente** solicita nova tentativa. Um processo interrompido pode ser retomado com conferência do estado remoto. Corpos de erro do provedor, chave da API e senhas não são persistidos nos logs ou na auditoria.

Desabilitar a integração suspende novos provisionamentos, preservando as contas já criadas. Servidor e domínio não podem ser substituídos enquanto houver caixas vinculadas, evitando enviar pedidos antigos para um destino diferente.

## Validação e limites

Testes automatizados usam HTTP e Mailcow simulados, cobrindo fila sem bloqueio do cadastro, resposta HTTP 200 de erro, conflito de endereço, timeout após criação, repetição sem duplicar, senha de uso único, isolamento por escola, revogação de acesso durante a fila e proteção contra SSRF/redirecionamento.

Não houve homologação contra um servidor Mailcow real nem criação de caixas reais. A implantação deve validar a versão instalada, permissões de escrita da API, domínio, cotas, funcionamento do worker e acesso ao webmail. Este módulo não administra DNS, não instala Mailcow e não configura o SMTP de envio transacional da aplicação.

Referência oficial de contrato: [OpenAPI do Mailcow](https://github.com/mailcow/mailcow-dockerized/blob/master/data/web/api/openapi.yaml). Operações utilizadas: `GET /api/v1/get/domain/{domain}`, `GET /api/v1/get/mailbox/{email}` e `POST /api/v1/add/mailbox`, autenticadas por `X-API-Key`.
