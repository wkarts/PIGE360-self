# Integrações — PIGE360 Self 0.3.0

## Condição de entrega

O código HTTP, persistência, telas, criptografia, fila e tratamento de respostas estão implementados. Os testes externos usaram transportes controlados: nenhuma mensagem, cobrança ou pagamento real foi executado na construção deste pacote.

**ASAAS** utiliza operações da API v3 consultadas na documentação oficial. **Connect API** utiliza um contrato JSON parametrizável porque o contrato HTTP/OpenAPI da instalação ARGWS Connect API não estava disponível nos anexos consultados. Configurar nomes de rotas não equivale a comprovar compatibilidade. O operador deve confrontar campos, autenticação, resposta e callbacks com sua documentação real antes de habilitar. Não foram copiados endpoints da Evolution como se fossem os da Connect.

## Segredos e worker

`INTEGRATION_ENCRYPTION_KEY` é uma chave Fernet de 32 bytes codificada em Base64 URL-safe; o configurador a gera. Fica no ambiente protegido, não no banco. API keys, tokens de webhook e payloads de jobs ficam cifrados no banco. As respostas administrativas indicam apenas se o segredo está configurado. Campo de segredo deixado vazio em edição preserva o valor anterior.

`app` e `worker` recebem as mesmas configurações. O worker realiza os envios e consultas; sem ele, as operações permanecem enfileiradas. O painel de Integrações mostra estado, tentativas e códigos de erro sem exibir segredos ou códigos de verificação.

```bash
docker compose ps
docker compose logs --tail=100 worker
```

## ASAAS

No painel **Integrações → ASAAS**, escolha sandbox/produção, informe a API key e um token exclusivo de webhook com pelo menos 32 caracteres. API key e token de webhook precisam ser diferentes. Habilite explicitamente a conexão e use Testar. Um teste HTTP acessível não certifica emissão/recebimento completos.

Endpoints fixos do adaptador:

```text
Sandbox:  https://api-sandbox.asaas.com/v3
Produção: https://api.asaas.com/v3
Header de API: access_token

POST /customers
GET  /customers?externalReference=...&limit=100
POST /payments
GET  /payments?externalReference=...&limit=100
GET  /payments/{id}
GET  /payments/{id}/pixQrCode
DELETE /payments/{id}
```

O cliente é identificado por referência externa estável desta instalação/escola e CPF. A cobrança contém customer, billingType, value, dueDate, description e externalReference. As mensalidades em lote são operações avulsas independentes, cada uma com referência própria; não usam assinatura recorrente, Pix Automático nem débito em conta.

O portal pode apresentar URL da fatura/boleto e QR Code/Pix copia e cola recebidos do ASAAS. O QR Code não é inventado localmente como comprovante de cobrança. Cancelamento remoto só é solicitado para estados pendente/vencido após consulta; cobranças recebidas não são estornadas pela aplicação.

### Webhook

Cadastre no painel ASAAS a URL pública HTTPS exibida em Integrações:

```text
POST /api/v1/hooks/asaas/{connection_id}
asaas-access-token: TOKEN_EXCLUSIVO_DO_WEBHOOK
```

Configure eventos de cobrança pertinentes, incluindo criação/alteração, confirmação, recebimento, vencimento, exclusão, restauração, estorno e disputa quando disponíveis na conta. A aplicação valida token, tamanho, objeto payment, identificador do evento e conexão. Eventos repetidos são deduplicados; mesmo ID com conteúdo divergente é recusado.

A notificação **não baixa a cobrança diretamente**. Persiste identificadores/hash e enfileira consulta ao ASAAS. A consulta confere ID, cliente, referência, tipo e valor antes de atualizar. Assim, evento atrasado ou um payload com valor indevido não força um estado financeiro confiável.

`CONFIRMED` fica distinto de `RECEIVED`. A política local de efetivação com pagamento obrigatório aceita recebimento conciliado, não criação da cobrança ou confirmação preliminar. `RECEIVED_IN_CASH`, quando retornado, é tratado como baixa externa, não comprovante bancário. Estados de estorno/disputa aparecem no histórico, mas não desfazem silenciosamente uma matrícula já efetivada.

### Conciliação e falhas

O worker consulta cobranças elegíveis desatualizadas segundo `BANK_RECONCILE_INTERVAL_SECONDS` (padrão 900 segundos), em lotes limitados a 25. Webhooks e o botão Conciliar podem solicitar atualização antes desse intervalo. É uma recuperação de notificações perdidas, não garantia de tempo de liquidação do provedor.

Antes de criar, consulta referência externa. Salva checkpoints antes de chamadas mutáveis. Se houver timeout depois de uma criação, não repete o POST cegamente: mantém estado incerto. Use Conciliar; se a cobrança não for encontrada, confira também no painel do provedor antes de **Autorizar reemissão**, com justificativa. Esse cuidado reduz duplicidade sem alegar garantia de exactly-once da API externa.

Uma conexão ASAAS que já possui cobranças não pode alternar sandbox/produção. Use escola/instalação de homologação separada. Renegociação, transferências, Pix de saída, CNAB, OFX, NFS-e e múltiplos provedores bancários não foram incluídos.

## ARGWS Connect API

No `.env`, permita somente o hostname real:

```dotenv
CONNECT_ALLOWED_HOSTS=connect.seudominio.com.br
CONNECT_ALLOW_PRIVATE=false
INTEGRATION_TIMEOUT_SECONDS=15
```

No painel configure base URL HTTPS, instância exclusiva da escola, caminho de consulta do estado, caminho de envio, header da chave, esquema de autenticação, nomes dos campos e caminho do ID de retorno. Não se listam/administram instâncias de outros aplicativos.

Ambos os caminhos são relativos e contêm `{instance}` exatamente uma vez. O envio utiliza POST JSON com dois campos configuráveis, para número e texto. O estado utiliza GET. Exemplo **somente de formato, não de endpoints oficiais da Connect API**:

```json
{
  "number": "5575999990000",
  "text": "Há uma atualização da sua inscrição. Acesse o portal."
}
```

Configurações aceitas:

| Chave | Uso |
|---|---|
| base_url | HTTPS sem senha, query ou fragmento |
| instance | Instância previamente configurada para esta escola |
| send_text_path | Caminho POST real, com `{instance}` |
| connection_state_path | Caminho GET real, com `{instance}` |
| api_key_header | Header real da API key; headers reservados são recusados |
| auth_scheme | Vazio ou `Bearer` |
| number_field / text_field | Nomes reais dos dois campos JSON de saída |
| message_id_path | Caminho do identificador na resposta, como `data.id`, conforme a API real |
| contract_confirmed | Confirmação explícita após revisar o contrato |

Se sua API exigir body aninhado, outros campos obrigatórios, autenticação diferente, IDs distintos, QR Code/pareamento ou eventos com outra estrutura, este adaptador exige ajuste conforme o contrato oficial. **Não se deve marcar contrato conferido apenas para liberar a tela.** Nenhum caminho de exemplo é distribuído como integração homologada.

O backend verifica allowlist, HTTPS e endereços privados (bloqueados por padrão), não segue redirects nem utiliza proxy herdado do ambiente. `CONNECT_ALLOW_PRIVATE=true` é exceção para redes administradas; restrinja saída de rede e DNS também na infraestrutura. Tokens não são enviados ao navegador.

Avisos automáticos são genéricos e vinculados a mudanças de inscrição e recebimento/estorno/disputa. Envio manual fica no atendimento. Ambos exigem telefone verificado e opção de receber avisos; códigos solicitados para verificar o próprio telefone usam a finalidade de verificação. Resultado HTTP de envio não é tratado como entrega/lida sem callback.

### Callback implementado no PIGE360

```text
POST /api/v1/hooks/connect_api/{connection_id}
x-connect-webhook-token: TOKEN_EXCLUSIVO
```

```json
{
  "id": "identificador-unico-do-evento",
  "instance": "instancia-configurada",
  "event": "delivery",
  "data": {"messageId": "id-de-envio-retornado-pela-api", "status": "delivered"}
}
```

`data.key.id` também é aceito para o identificador. Situações tratadas: sent, delivered, read e failed. Eventos de outra instância são recusados; estado de leitura não regride a entregue. O formato acima é **o receptor desta aplicação**, não uma afirmação sobre o payload nativo da ARGWS Connect API. Se o provedor não envia esse contrato/header, é necessário adaptar com seu contrato real.

Falha de resultado incerto não provoca reenvio automático de texto. Confira no provedor antes de novo envio manual. O módulo não é um hub de conversas, não sincroniza agenda e não cria instâncias por conta própria.

## E-mail de verificação / recuperação

```dotenv
SMTP_HOST=smtp.seudominio.com.br
SMTP_PORT=587
SMTP_USERNAME=secretaria@seudominio.com.br
SMTP_PASSWORD=
SMTP_FROM=secretaria@seudominio.com.br
SMTP_SECURITY=starttls
```

Use `ssl` para o modo TLS implícito/porta apropriada do seu serviço. Não há modo plaintext. Códigos têm dez minutos e jobs vencidos não são enviados. Sem credenciais, não há código fixo de desenvolvimento exposto nem envio simulado em produção. A tela retorna orientação e mantém a inscrição sem cumprir verificação.

## Testar antes de liberar

Use dados sintéticos, sandbox ASAAS e instância Connect de homologação. Confira envio/retorno, token do webhook, duplicação de evento, ausência de duplicação após timeout, consulta por referência, recepção de pagamento e comportamento da política de matrícula. Refaça após atualizar o provedor. Nunca use dados reais de menores para validar uma configuração ainda desconhecida.

## Fontes do adaptador ASAAS

Documentação consultada em 22/09/2026; não houve acesso autenticado à conta bancária:

- Criar cobrança: https://docs.asaas.com/reference/criar-nova-cobranca
- Criar cliente: https://docs.asaas.com/reference/criar-novo-cliente
- Listar cobranças: https://docs.asaas.com/reference/listar-cobrancas
- QR Code Pix: https://docs.asaas.com/reference/obter-qr-code-para-pagamentos-via-pix
- Webhooks/autenticação: https://docs.asaas.com/docs/sobre-os-webhooks
- Eventos: https://docs.asaas.com/docs/webhook-para-cobrancas
