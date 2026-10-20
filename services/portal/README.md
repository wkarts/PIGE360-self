# Portal e identidade institucional

O portal usa a identidade canônica da instalação em `/api/v1/institution/identity`:
nome, logo, cores, fonte, favicon e manifest. O site usa a mesma identidade nos
três modelos existentes. Dados cadastrais e vínculos continuam por escola; esta
alteração não cria branding diferente para cada unidade. Os ativos públicos são
endereçados por SHA-256 e extensão, inclusive fontes TTF/WOFF2.

## IP do cliente

`PORTAL_INTERNAL_TOKEN` é um segredo dedicado, compartilhado apenas pelo núcleo
e pelo portal. O configurador o gera e o upgrade preserva o valor existente.
Não reutilize chave administrativa, não publique o valor nem o registre em logs.
O portal assina IP, método, alvo e horário; o núcleo só usa assinaturas válidas
por 30 segundos nas rotas desta superfície. Headers internos enviados pelo
navegador são descartados. A assinatura não concede autenticação de usuário.

Sem proxy externo, o endereço da conexão é usado diretamente. Com proxy reverso,
configure `PORTAL_TRUSTED_PROXY_IPS` com os IPs/CIDRs exatos dos proxies vistos
pelo serviço (a passagem pela rede Docker pode mudar o endereço observado).
O proxy deve sobrescrever ou acrescentar corretamente `X-Forwarded-For`.
A cadeia é percorrida da direita para a esquerda, removendo apenas saltos
confiáveis. Valores vazios não confiam em nenhum header de cliente; `*`,
`0.0.0.0/0` e `::/0` são recusados. Nunca libere toda a rede por conveniência.
Sem a configuração correta, o IP do proxy continua sendo usado, conservadoramente,
e seus clientes ainda podem compartilhar o limite. Valide com dois clientes no
proxy HTTPS real antes da homologação. O segredo não substitui essa configuração.

## Primeiro acesso

A inspeção do link mantém o token num cookie host-only, HttpOnly, SameSite=Strict,
restrito a `/api/v1/invitations`, Secure em produção e com a validade original.
Só então o fragmento secreto sai da URL. Um identificador público de convite
permite retomar após refresh e isola convites abertos em abas distintas. O token
não vai para localStorage/sessionStorage. Uso, expiração ou revogação invalidam
o convite; o cookie é limpo no consumo ou na próxima consulta inválida.

DNS, TLS, configuração do proxy e entrega efetiva do e-mail precisam de
homologação na instalação. Testes locais/CI usam apenas dados e SMTP sintéticos.
