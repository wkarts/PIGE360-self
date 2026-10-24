# Fatura local CRM v2 — implementação nova

Mantém v1 bloqueado e o journal existente, sem migration. `POST /api/v1/schools/{school_id}/crm-bridge/invoices` requer `banking.write`, master switch ativo, conexão da escola e `{connection_id,charge_id,client_id}`. Cliente existente é selecionado por solicitação; não há cliente fixo ou upsert. O CRM deve autorizar o cliente no issuer autenticado antes de criar a fatura. O primeiro corpo/evento/cliente/escopo fica imutável; conflito retorna 409.

Worker envia HMAC-SHA256 sobre POST `/pige_bridge/api/v2/invoices`, schema 2, `invoice.requested`, dados charge_id/client_id/amount_cents/currency/due_date/description. TLS, host fixado ao IP público resolvido, sem redirects/proxy; timeout e retry limitados preservam evento/corpo. A cobrança nativa deve continuar pendente com valor/vencimento originais.

Resposta exata: schema_version=2, event_id eco, charge_id, request_id=`req_`+32hex, scope, status=`pending` ou `invoice_created`, invoice_id=null ou inteiro positivo, capabilities={issue_charge:false}, payment_effect_applied=false, academic_effect_applied=false. Não aceita paid, emissão externa ou efeitos acadêmicos. `invoice_created` não representa boleto/Pix nem pagamento.

`POST /requests/{id}/invoice-status` é comando explícito autorizado, enviando novo evento `invoice.status.requested` ao endpoint CRM `/pige_bridge/api/v2/invoices/status` com somente charge_id. O destino consulta seu journal sem escrever nem chamar provider. PIGE valida e armazena o recibo de observação, sem modificar BankCharge ou admissão. Timeout não enfileira criação/reenvio. GETs PIGE leem somente journal local. `POST /requests/{id}/reconcile` permanece o comando separado de reenvio mutante do MESMO corpo/evento.

UI reutiliza a tela Ponte financeira opcional, acrescenta ID do cliente por cobrança e separa consultar estado de reenviar evento. Nenhum segredo retorna nos recibos. Nenhuma chamada real realizada no desenvolvimento; testes usam transporte sintético.

Limites: runtime PHP/MySQL do receptor e HTTP real entre aplicações dependem CI/integrador; providers externos e baixa acadêmica não fazem parte do contrato v2. PostgreSQL concorrente e navegador real não provados pelos testes SQLite locais. Rollback preserva tabelas/journal; não converte eventos v2 para v1.

## Evidências locais novas

- `cd backend && /tmp/pige-crm-rebuild-venv/bin/python -m pytest tests/test_crm_bridge.py tests/test_crm_bridge_diagnostics.py tests/test_crm_bridge_invoices.py -q`: 61 passaram, um aviso de depreciação Starlette.
- `npm ci --prefix frontend --ignore-scripts --cache /tmp/pige-crm-rebuild-npm-cache` e `npm run build --prefix frontend`: passaram; Node local 24.22.1 (CI precisa repetir no Node22 prescrito).
- `python -m unittest discover -s tests/ci -q`: 253 testes, 1 ignorado; resultado OK.
- `python scripts/ci/validate.py` e `git diff --check`: passaram.
- Primeiras tentativas corrigidas: pytest executado da raiz não encontrava app; build sem dependências não encontrava tsc; npm com cache padrão falhou por diretório indisponível; teste esperava201 em comando cujo contrato é200. Nenhuma dessas tentativas foi contada como aprovada.
