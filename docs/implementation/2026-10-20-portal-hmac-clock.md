# Janela HMAC do portal — teste temporal determinístico

## Estado remoto e falha comprovada

HEAD de develop conferido antes das alterações: `fa87d9b94c4b7127e6f170bd7ff8a7a74b969905`, merge da PR 58. Árvore `b013fd0645f8b39f81fa158fefef0e3b79759526`. Preservados os checkpoints e todas as correções anteriores.

No [run 39355318143](https://github.com/wkarts/PIGE360-self/actions/runs/39355318143), os testes de develop, builds, runtime isolado, smoke integrado e publicação dos aliases develop concluíram com sucesso. A correção de dependências da PR 58 funcionou. A falha posterior ocorreu em `promote / tests / validate` (job 118415597140), antes do merge/dispatch/release: 615 testes PostgreSQL e cinco subtestes passaram; um teste HMAC falhou. Os jobs de merge, dispatch e publicação estável foram ignorados.

A PR automática de release 59 usou o merge sintético `f0aa9c7af1c957e111159622c424bd3bf1bed8c0`, árvore igual à de develop. A diferença não foi código perdido ou outro projeto: o teste usava o relógio real durante múltiplas requisições.

## Causa e reprodução

O teste gerava todos os headers negativos antecipadamente. O timestamp futuro era `int(time.time()) + 31`, mas o middleware avalia `abs(time.time() - timestamp) <= 30` no momento da recepção. Uma assinatura inicialmente fora da janela pode entrar nela antes da requisição ser recebida.

Reprodução determinística do teste antigo, sem alterar o middleware: relógio do emissor `BASE + 0,99`, timestamp `BASE + 31`, relógio do receptor `BASE + 1,01`. A diferença na recepção é 29,99 segundos; o HMAC válido corretamente preserva o IP assinado. O teste antigo esperava `testclient` e falhou, reproduzindo o erro anexado. Não foi necessário sleep, retry ou redução de carga.

## Correção e proteção preservada

Somente testes e este documento são alterados. A fixture controla apenas a referência de relógio do módulo `portal_proxy`; não modifica o relógio global, timers do runner ou timestamps do banco. O teste original usa o mesmo instante para assinar e verificar, mantendo suas asserções para spoofing, IP adulterado, método/rota errados, headers duplicados, janela expirada/futura, rota administrativa e segredo ausente.

Doze casos adicionais exercitam a recepção: passado/futuro fora da janela, exatamente nos 30 segundos, um milissegundo fora, chegada antes/no/depois da expiração e timestamp futuro que entra na janela com a passagem do tempo. O último caso demonstra por que a expectativa anterior era instável. Os cabeçalhos internos continuam removidos em todos os resultados.

**Middleware, HMAC, comparação constante, segredo e tolerância de 30 segundos permanecem inalterados.** Não se alterou a asserção para aceitar spoofing nem se ampliou o limite para aprovar o CI.

## Validação

- Antes da correção: falha reproduzida controlando a virada de segundo no teste antigo.
- Python 3.13.16, SQLite descartável: arquivo de segurança com **19 testes aprovados**; teste original repetido **100 vezes com sucesso**, com suas rejeições preservadas.
- Infraestrutura: **211 testes aprovados**, incluindo Compose CLI 2.40.3 real sem daemon Docker.
- `scripts/ci/validate.py` e `git diff --check`: aprovados.
- Suíte backend local completa e CI final: o relatório por SHA da nova PR registra os resultados terminais. Os resultados deste documento não substituem essa evidência.
- Docker/PostgreSQL, Chromium, Windows e restore/upgrade completos são validados no CI remoto do SHA publicado; não executados contra instalações reais.

## Operação, compatibilidade e pendências

Nova PR para develop, pois a PR 58 já foi mesclada pelo usuário. A PR de release 59 e o fluxo normal não foram reorganizados. Não foi reexecutado o job de promoção que poderia efetuar merge/release. Não houve merge, deploy ou operação com dados reais neste atendimento.

Sem dependências novas, migration, configuração, mudança de versão ou efeito em instalações. Rollback é a reversão dos testes/documentação; reintroduz a dependência de relógio real, sem necessidade de reverter banco ou imagens.

A publicação develop observada no run anterior é evidência real daquele SHA, não da correção nova. CI verde da nova PR não comprova publicação subsequente ou homologação externa. Site/portal mantêm serviços e imagens separados, identidade PIGE e comunicação interna. OCR permanece **18/21 campos, foto degradada 0/3**, com revisão humana. Certificados/provedores reais, DNS/TLS/proxy e GUI Windows interativa conservam homologação própria. Refinamento visual/estúdio e CRM ficam fora deste ajuste.
