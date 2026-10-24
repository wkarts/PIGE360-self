# PIGE/CRM v3 — emissão externa e comandos explícitos

Nova tabela additive0056 `crm_bridge_external_requests`, mantendo única origem externa por escola/cobrança e referência ao journalv2. Nenhum dado v1/v2 é reescrito. Corpo/evento issue são imutáveis; payer_id aponta a vínculo de pagador já existente e confirmado pelo CRM/Asaas, nunca cliente fixo ou upsert.

API PIGE `POST /api/v1/schools/{school_id}/crm-bridge/charges` recebe invoice_request_id,payer_id,billing_type (PIX/BOLETO), exige banking.write, master switch/conexão e fatura v2 confirmada. Fila apenas emissão: worker persiste `sending` ANTES de HTTP. Timeout/crash mantém sending/uncertain; nenhum retry automático ou novoPOST. Repetir enqueue retorna mesma origem, não reenfileira. Recuperação é comando separado; emissão sem dispatch comprovável ainda permanece fechada nesta versão.

POST `/charges/{id}/{status|sync|instruments|reconcile}` exige banking.write e escopo da escola; status/instruments recebem{}, sync recebe recovery_id explícito (string vazia permitida), reconcile recebe proof_id igual à última prova observada. Não há fila/retry desses comandos. Falha retorna last_command.status=unconfirmed, preserva recibo anterior e não enfileira emissão. Audit registra evento/ação/dados mínimos. GET `/charges` e `/charges/{id}` consultam somente armazenamento local, sem transporte.

Destino HMAC-SHA256: `/pige_bridge/api/v3/charges` e sufixos `/status`,`/sync`,`/instruments`,`/reconcile`; eventos schema3 `charge.{ação}.requested`. Emissão usa charge_id,payer_id,billing_type; demais seguem campos acima. Scope fixa escola/issuer/conta/ambiente da conexão. Resposta estrita15campos: schema_version,event_id,charge_id,request_id,scope,provider,status,origin_id,remote_id,proof_id,reconciliation_status,payment_id,instrument,payment_effect_applied,academic_effect_applied. IDs/origem já observados não podem ser substituídos. Instrumento somente texto limitado; nenhum HTML/URL/base64 remoto.

payment_effect_applied=true permitido apenas resposta da conciliação explícita, com payment_id/reconciled. Esse efeito pertence ao CRM. PIGE nunca altera BankCharge, matrícula, admissão ou recebimento nativo. UI reutiliza Ponte financeira opcional, separa solicitar fatura, emitirexterna, consultar, sincronizar prova, obter instrumento e conciliar recebimento no CRM (com confirmação). Código/recibo não significa baixa acadêmica.

Backup restaurado com journal56 coloca queued/sending em uncertain, sem replay. Backup anterior sem a nova tabela continua aceito pelo trecho de reconciliação. Downgrade destrutivo56 recusado; exportar e reconciliar origens antes de qualquer plano de reversão.

Validações locais novas: suite bridge v1/v2/v3 inicialmente68 PASS, buildfrontend PASS, tests/ci253 OK(1 skipped), scripts/ci/validate e diffcheck PASS. Testes adicionais de HMAC por cinco caminhos e regressões bancárias/backup são reportados no checkpoint final. Ambiente Python3.12/Node24 difere de Python3.13/Node22 prescritos; PostgreSQL concorrente, PHP/MySQL do CRM, browser real e HTTP entre aplicações dependem CI autorizado. Somente transporte sintético, nenhuma emissão real ou publicação.

Checkpoint final local: suite completa focada bridge73 PASS (inclui HMAC dos cinco caminhos e migration56 realSQLite); regressões backup/manual banking/banking operations31 PASS. Total104 testes backend destas duas execuções, um aviso depreciação Starlette por execução. Build gerado0b92f55d0232080c; sem mudança de dependências. Não confundir com validação de produção/PostgreSQL/CRM PHP.

## Extensão Banco do Brasil
A seleção local `provider=banco_brasil` serve apenas para construir/validar o formulário; não vai no envelope HMAC e não altera a configuração de empresa/conta/provedor do CRM. Recibo com provedor diferente do contrato solicitado é recusado.

Para BB, `payer_id` é o ID do cliente CRM **da mesma fatura v2**, `billing_type` deve ser BOLETO e `bb_title` é obrigatório, com exatamente: `payer_address`, `payer_district`, `payer_zip`, `payer_city`, `payer_state`, `species`, `acceptance`. Espécie e aceite são escolhas explícitas sem defaults. Sem juros/desconto/protesto/parcelamento/upsert. O CRM permanece responsável pela validação nativa do título e vínculo da empresa. Asaas não aceita `bb_title` e preserva o significado original do ID de pagador existente.

Estados BB aceitos correspondem ao serviço nativo: reserved, api_reserved, api_auth_failed, api_registered, api_query_observed, api_settlement_observed, api_cancel_requested, api_cancelled_confirmed, api_conflict_review, api_unknown, api_registration_rejected. Nenhum deles altera pagamento ou matrícula PIGE automaticamente. Instrumentos BB são texto BOLETO no mesmo contrato limitado, sem URL/HTML. Sync BB exige recovery_id vazio: usa somente nosso número imutável da origem. proof_id é o ID da operação de consulta validada no CRM, não prova fornecida pelo usuário.

A extensão não muda migrations, regra sending/uncertain ou número de tentativas. Alterar endereço/espécie/aceite/pagador após fila criada conflita; consulta e comandos não reemitem.

## Branch
`feature/crm-bridge-rebuild`, destino pretendido `develop`. Extensão local BB sem publicação própria.

## Descrição
Extensão compatível do journal v3 para BB: nenhuma migration adicional, dependência ou mudança de efeito acadêmico. Testes novos exercitam API/SQLite/transportes sintéticos; PHP/MySQL CRM, PostgreSQL concorrente e banco real permanecem não executados neste ambiente. Node local24/Python3.12 diferem de Node22/Python3.13 CI; build local não substitui CI de release.
