# Reconstrução verificável da ponte CRM — checkpoint1

## Origem e contrato

Base publicada develop092e1736661094d6584945a68b358060f31fac59. Bytes dos checkpoints locais anteriores não estavam disponíveis nem no GitHub (422); esta entrega é uma nova implementação, sem reutilizar evidências de testes perdidos. UI/API de configuração criptografada já existente foi preservada; não duplicada. Migration0055 pertence ao website, não foi reutilizada.

Master `CRM_BRIDGE_ENABLED=false` agora retorna antes de ler conexõesDB/decifrar segredos. A validação administrativa de duplicidade de escopos/segredos continua ativa durante salvamento, inclusive com master desligado; isso não faz transporte.

O botão connection-test usa POST HMAC path-bound em `/pige_bridge/api/v1/diagnostics`, envelope1 `connection.test`, data `{nonce:UUID}`. Reusa transporte HTTPS com DNS público fixado, SNI/Host original, semproxy/redirect, timeout/corpo limitados. Só HTTP200 com nonce/evento/scope exatos e efeitos falsos confirma autenticação. HTTP401/403/405 não é mais tratado como autenticação bem-sucedida. Nenhuma cobrança, recibo financeiro ou matrícula é criada; auditoria administrativa registra apenas resultado genérico.

Contrato/fixture: `docs/contracts/pige-crm-diagnostics-v1.json`, compartilhado com CRM. V1 financeiro permanece bloqueado até implementação específica e gates próprios; não se remove capabilityfalse para fingir prontidão.

## Evidências novas

`PYTHONPATH=backend /tmp/pige-crm-rebuild-venv/bin/python -m pytest -q backend/tests/test_crm_bridge.py backend/tests/test_crm_bridge_diagnostics.py`: **49 passed**, 1 aviso depreciação Starlette/AnyIO. Dependências declaradas instaladas normalmente emvenv temporária isolada; nenhuma credencial/configuração produção. CI stdlib:253 testes OK/1 skipped; scripts/ci/validate.py e git diff --check passaram. PHP/MySQL/HTTP entre instalações não executados.

# Pull Request

## Branch
`feature/crm-bridge-rebuild` para develop.
**Título:** `feat(crm-bridge): authenticate diagnostics and enforce the master switch`
## Descrição
Primeiro checkpoint incremental, baseado no contrato publicado e regras confirmadas. Configuração existente preservada, diagnóstico autenticado sem efeitos financeiros, masterkill antecipado.
**Contexto/objetivo:** substituir teste de alcanceHEAD por prova HMAC e impedir runtimeDB habilitado quando masteroff.
**Escopo:** contrato/backend/testes/docs; fora emissão/baixa/matrícula nesta etapa.
**Arquivos:** crm_bridge.py, crm_bridge_contract.py, test_crm_bridge_diagnostics.py e fixture/docs.
**Banco:** nenhuma migration ou alteração de dados reais.
**API:** mesma rota local connection-test, agora HMAC; v1 requests/webhooks preservados.
**Dependências/configuração:** sem dependência nova; gate existente, false por padrão.
**Segurança:** scope fixo, nonce, path-bound, limites, SSRF/TLS preservados; semtoken retornado/logado.
**Desempenho/observabilidade:** uma requisição limitada; auditoria genérica administrativa.
**Testes:** 49 executados conforme acima; par PHP/Python real e UI/browser recomendados, não executados.
**Validação manual:** flagoff bloqueia; assinatura/incorreto scope/nonce falham; sucesso não enfileira financeiro.
**Impactos/compatibilidade:** transporte acessível sem autenticação já não é sucesso; nenhuma mudança financeira.
**Deploy:** somente após autorização/CI; manter gatesoff e homologar com fixtures.
**Rollback:** reverter código mantendo configurações e journals; não apagar dados.
**Build/release/distribuição:** não houve publicação, imagem, merge ou deploy nesta etapa.
**Checklist:** contratos/fixtures preservados; gatesoff; semprod; runtimeconjunto pendente.
**Commit:** feat(crm-bridge): authenticate diagnostics and enforce the master switch.
**Merge:** squash após CI/revisão autorizados; não executado.
**Versão:** sem tag/versão alterada; etapa incremental de integração.
