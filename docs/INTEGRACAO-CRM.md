# Ponte opcional PIGE360 ↔ ARGWS-CRM, contrato v1

## Estado e limites

Fundação **opt-in e desativada por padrão**. O financeiro nativo PIGE, suas cobranças manuais/Asaas e as regras acadêmicas permanecem independentes. Não existe emissão de fatura, boleto, Pix, baixa ou ativação de matrícula através desta ponte nesta versão.

A ponte envia uma solicitação de cobrança ao módulo `pige_bridge` do CRM e persiste o recibo da solicitação. O CRM retorna `status: blocked`, `reason: issuer_finance_not_isolated`, `capabilities.issue_charge: false`. HTTP 202 confirma somente a persistência da solicitação. A API PIGE sempre informa a capacidade indisponível e `financial_effect_applied: false`. Não foi criada uma tela administrativa nesta etapa.

Pré-condição para uma futura emissão: isolamento financeiro completo por emitente no núcleo CRM e uma nova versão/capacidade explicitamente homologada. Esta implementação rejeita recibos que aleguem capacidade de emissão. O recebedor de webhooks está implementado, mas o emissor de callbacks CRM e a aplicação de efeitos financeiros não fazem parte desta fundação. `confirmed` e `received` são observações distintas, sem poder alterar `BankCharge`, matrícula ou gates existentes.

## Configuração e escopo

Novas variáveis, encaminhadas ao app e worker pelos quatro adaptadores Compose:

- `CRM_BRIDGE_ENABLED=false`
- `CRM_BRIDGE_CONNECTIONS={}`

Quando autorizado e homologado, `CRM_BRIDGE_CONNECTIONS` recebe um objeto JSON cuja chave é um identificador de conexão (`[A-Za-z0-9_-]{1,64}`). Cada valor tem exatamente `base_url`, `scope` e `secret`. A origem exige HTTPS, porta 443 e nenhuma credencial/caminho/query/fragmento. O transporte rejeita resolução DNS não pública, redirects e proxies de ambiente, valida TLS e limita timeout ao `INTEGRATION_TIMEOUT_SECONDS` (3–30 s). O destino é fixado pelo administrador, nunca pelo corpo da API. A conexão usa o IP numérico previamente validado, com Host e TLS/SNI no hostname original (extensão sni_hostname do httpcore); não faz uma segunda resolução DNS para conectar. Egress restrito ao CRM continua recomendado como defesa adicional.

`scope` contém exatamente:
- `school_id`: UUID RFC canônico minúsculo da escola PIGE
- `issuer_id`: ID CRM positivo como string, 1–19 dígitos
- `account_id`: identificador de conta de integração CRM, ASCII `[A-Za-z0-9_.:-]{1,128}`; não é o ID da conta de responsável PIGE
- `environment`: `sandbox` ou `production`

O segredo HMAC tem 32–512 bytes UTF-8 e é distinto por conexão. Não há segredo padrão nem API de configuração/gravação. Não reutilizar o segredo sintético da fixture. Nenhum segredo real foi criado/configurado neste desenvolvimento. Não comitar `.env` ou imprimir a configuração; ela deve ser fornecida pelo procedimento seguro da instalação.

Configuração inválida, escopo repetido ou segredo reutilizado falham fechados. A ponte não aceita fallback entre escola, emitente, conta ou ambiente. Alterar um escopo depois de enfileirar bloqueia o envio/reconciliação desse registro. Rotação do segredo no mesmo escopo requer coordenação entre os dois lados. Uma falha da ponte é isolada do worker financeiro nativo.

No CRM, o módulo correspondente usa `APP_PIGE_BRIDGE_ENABLED=true` e `APP_PIGE_BRIDGE_CONNECTIONS`, com a mesma chave, `scope`, `secret` e `enabled: true` por conexão. Essas configurações são distintas das variáveis PIGE.

## API PIGE administrativa

Prefixo `/api/v1/schools/{school_id}/crm-bridge`, autenticação e escopo escolar existentes:

| Método/rota | Permissão | Efeito |
|---|---|---|
| `GET /status` | `banking.read` | Configurações públicas de escopo/capacidades; nunca segredo |
| `POST /requests` | `banking.write` | Corpo `{connection_id, charge_id}`; enfileira snapshot e retorna 202 |
| `GET /requests/{id}` | `banking.read` | Recibo, estado da entrega e até 100 observações |
| `POST /requests/{id}/reconcile` | `banking.write` | Reenvia o mesmo evento/corpo para recuperar recibo; retorna 202 |

Somente cobranças nativas `pending`, `overdue` ou `queued` podem originar a solicitação inicial. Uma mesma cobrança/escola tem uma única solicitação. Repetição retorna o registro original; outro escopo gera 409. Snapshot imutável de valor/vencimento: alterações posteriores na cobrança nativa não são sincronizadas. Antes de qualquer envio ou reconciliação, status, valor e vencimento nativos são revalidados sob lock; pagamento/cancelamento ou divergência bloqueiam o POST. A descrição transmitida é sempre `Cobrança escolar`, sem copiar nome, CPF, telefone, e-mail, documentos ou descrição livre. Não transmitir dados adicionais nesta versão.

Estados locais: `queued`, `retry`, `blocked` (recibo CRM validado), `failed`. Não são estados financeiros. Reconciliação não apaga observações e não gera um novo evento. Não há cancelamento remoto ou reemissão nesta fase.

## Contrato HTTP e assinatura

PIGE → CRM: `POST /pige_bridge/api/v1/requests`.

Envelope v1 possui exatamente `schema_version` (inteiro 1), `event_id` (UUID RFC minúsculo), `event_type: charge.requested`, `scope` e `data`.

`data`: `charge_id` (UUID PIGE), `amount_cents` (inteiro positivo até 999999999999, sem float/bool), `currency: BRL`, `due_date` (ISO estrito YYYY-MM-DD válido), `description` (1–500 caracteres Unicode não brancos, sem controles proibidos, até 2000 bytes).

JSON UTF-8 compacto: sem espaços separadores, Unicode e barras não escapados, sem chaves duplicadas, sem NaN/Infinity, sem campos extras. A ordem dos campos é preservada; não ordenar na retransmissão. O corpo exato é congelado na outbox. Máximo 16 KiB, tanto no corpo de webhook como no recibo HTTP.

Headers:
- `X-Pige-Timestamp`: epoch UTC em segundos, inteiro decimal positivo, tolerância ±300 segundos
- `X-Pige-Event-Id`: mesmo UUID do envelope
- `X-Pige-Signature`: `sha256=` seguido do HMAC-SHA256 hexadecimal minúsculo

Entrada da assinatura: timestamp + LF + event_id + LF + `POST` + LF + caminho exato + LF + bytes UTF-8 do corpo. Sem newline ao final. A fixture `docs/contracts/pige-crm-v1.json` contém um vetor sintético compartilhado com PHP. Timestamp é renovado em retries, event_id/corpo permanecem idênticos.

Recibo CRM validado possui exatamente `schema_version`, `event_id`, `request_id` (ASCII seguro 1–128), `status: blocked`, `reason: issuer_finance_not_isolated`, `capabilities: {issue_charge: false}`. O request_id remoto fica ligado à solicitação PIGE; colisões ou mudanças de mapping falham fechadas.

## Webhooks e replay

CRM → PIGE: `POST /api/crm-bridge/webhooks/{connection_id}`. Assinatura inclui esse caminho exato. Sem sessão do usuário; HMAC obrigatório, headers únicos e scope exato. O body usa `event_type: charge.status` e `data` com exatamente `charge_id`, `request_id`, `status`, `amount_cents`, `currency`.

Status aceitos: `blocked`, `pending`, `confirmed`, `received`, `cancelled`. Todas as observações são append-only; nenhuma é tratada como estado financeiro atual, já que ainda não existe sequenciamento do provedor. Isso evita promover um webhook atrasado a verdade financeira. Valor, moeda e mapeamento devem bater com o snapshot/recibo persistido. Antes de o mapeamento existir, 409 permite retry posterior.

O par conexão+event_id é único. Mesmo corpo retorna sucesso idempotente; mesmo ID com hash diferente retorna 409. A verificação temporal/autenticação ocorre também em repetições; retries tardios precisam de timestamp e assinatura novos. Erros principais: 401 assinatura/replay temporal, 403 escopo, 409 mapping/hash, 413 limite, 422 contrato, 503 configuração inválida. Nenhum payload bruto ou segredo é logado.

## Outbox, operação e observabilidade

Migração aditiva `0039_crm_bridge` cria `crm_bridge_requests` e `crm_bridge_observations`, com índices, FKs para escola/cobrança e constraints de unicidade. Não altera tabelas financeiras/ acadêmicas existentes.

O worker existente processa no máximo uma solicitação CRM por iteração, sob lock de linha PostgreSQL `FOR UPDATE SKIP LOCKED`; chamada HTTP permanece dentro da transação por no máximo o timeout configurado. Uma queda reverte a transação local e repete apenas o mesmo evento/corpo, dependendo da garantia idempotente do endpoint CRM. SQLite valida funcionalidade local, não a semântica de locks/concorrência PostgreSQL.

Timeout/rede, 429 e 5xx geram até cinco tentativas totais, backoff exponencial limitado. Erros de contrato, scope, resposta/mapping e demais 4xx exigem intervenção. `POST .../reconcile` reinicia tentativas de forma auditada. Um 202 bloqueado é terminal até reconciliação manual; não há polling periódico infinito. Eventos de auditoria: enfileiramento, reconciliação e observação; worker registra códigos genéricos sem dados privados.

## Implantação e rollback (não executados)

1. Revisar conjuntamente as PRs PIGE e CRM, validar PostgreSQL/MySQL e proxy/caminhos reais em sandbox sintético.
2. Fazer backup habitual e aplicar `alembic upgrade head` pelo fluxo existente, mantendo flag false.
3. Instalar/validar módulo CRM, configurar scopes e segredos por procedimento seguro somente com autorização. Manter capacidade de emissão bloqueada.
4. Homologar uma solicitação sintética e seu retry, confirmar recibo bloqueado e nenhuma alteração de cobrança nativa.
5. Para rollback operacional, definir `CRM_BRIDGE_ENABLED=false`, reiniciar app/worker pelo procedimento existente e manter as tabelas para auditoria. Código anterior ignora as tabelas aditivas.
6. `alembic downgrade 0038_webmail_preferences` remove os dois journals: exportar/preservar dados antes, exigir janela/consentimento apropriados. Não executar downgrade destrutivo como rotina.

A ativação real, provisionamento de segredos, envio para contas reais, merge, release e deploy não estão autorizados nem foram executados nesta entrega. Homologação HTTP entre duas instalações reais, geração de callbacks CRM, concorrência PostgreSQL/MySQL, painel visual e efeitos financeiros continuam pendentes.
