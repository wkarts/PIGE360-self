# PR 57 — identidade Compose e reconciliação final

## Origem e causa demonstrada

HEAD remoto reconfirmado antes das alterações:
`e16f488dfb29f49c3c59f29a53606e31abec05f7`, árvore
`0100de331ae40b38752164ba29aa867820671246`. Nenhum commit posterior foi
encontrado. O novo anexo tem o mesmo SHA-256 do contexto de 712 linhas já lido
integralmente. O checkpoint publicado `9cf3a717` e sua árvore `e11c8762` foram
preservados; não houve reaplicação de patch nem substituição pelo pacote antigo.

O [CI 39331797488](https://github.com/wkarts/PIGE360-self/actions/runs/39331797488)
falhou somente no upgrade Compose, depois de aprovar 594 testes PostgreSQL,
cinco subtestes, 205 testes de infraestrutura, E2Es Chromium, OCR na imagem,
site/portal separados e restauração visual com proteção forense. Windows e MinIO
também passaram. Esses resultados pertencem ao SHA anterior, não ao novo commit.

A reprodução local usa o CLI Docker Compose **2.40.3**, sem daemon e sem subir
serviços. Para o arquivo `name: ${COMPOSE_PROJECT_NAME:-existing-school}`:

| Leitura | Nome resultante | Rede padrão gerada |
| --- | --- | --- |
| `config --format json` | `existing-school` | `existing-school_default` |
| `config --no-interpolate --no-env-resolution --no-path-resolution --format json` | `compose_project_name-existing-school` | `compose_project_name-existing-school_default` |

A leitura sem interpolação conservava variáveis de configuração, mas normalizava
a expressão do nome como texto literal. A mesclagem gravava esse nome incorreto.
O deployer usava `-p` correto na atualização em curso, porém a próxima consulta
sem `-p`, inclusive `compose_project`, encontrava outra identidade. Trocar apenas
o campo `name` deixaria nomes gerados de redes/volumes sujeitos à mesma divergência.

## Correção e regressões

`prepare-upgrade.py` resolve e valida primeiro a identidade do Compose instalado,
com a mesma precedência efetiva usada por `compose_project`. As duas leituras
sem interpolação e a validação do candidato recebem `-p` com essa identidade.
Assim o arquivo mesclado conserva nome, recursos gerados, variáveis, configuração
customizada, portas, caminhos de volumes, serviços extras e segredos existentes.
O nome não é preenchido a partir do exemplo de ambiente. Um nome inválido impede
a gravação do Compose. O backup protegido e a substituição atômica permanecem.

A asserção original do smoke Docker permanece: tanto o nome resolvido quanto
`compose_project` devem ser iguais ao projeto original. Foi acrescentado somente
diagnóstico dos três nomes, sem credenciais. As demais asserções de porta,
domínio, volume, SMTP/Connect, serviço adicional e ausência de stack extra continuam.

O teste novo usa Compose real apenas para `config`, cobrindo nome interpolado,
nome explícito, fallback do diretório e override pelo ambiente. Confere nome do
projeto, rede, volume nomeado, bind mount, porta, domínio, segredos sintéticos,
serviço personalizado, nova opção e backup. **Falhou antes da correção** com
`compose_project_name-existing-school != existing-school` e passou depois.
Outras regressões verificam o uso do projeto em todas as leituras/validação e o
aborto sem gravação quando a identidade não pode ser resolvida.

## Critérios do contexto reconciliados

| Critério | Código e evidência existente preservados | Estado/limite |
| --- | --- | --- |
| HEAD, mesma PR e checkpoint | Árvores conferidas; publicação com pai remoto e sem force | PR 57 → develop; nenhum merge/deploy |
| Estrutura acadêmica, capacidade e matrícula | `registry.py`, reservas, testes PostgreSQL e `e2e-online.py` | Implementado/testado com dados sintéticos; prazo comercial institucional |
| Rascunho e reserva paga/documentos | `test_academic_completion_evidence.py`, idempotência e última vaga | Rascunho em nova sessão, vaga paga mantida e bloqueio documental testados |
| Contrato família primeiro, A1 final | Assinatura incremental, revisões, `test_online_contract.py`, E2E completion | Sintético; A1/ICP real, revogação e política de assinatura digitalizada externos |
| OCR e limites | Limite próprio, streaming, worker/container e avaliação sintética | **18/21 campos; foto degradada 0/3**. Revisão humana; qualidade desse caso não resolvida |
| Envio de backup interrompido | `backup_delivery.py`, `test_backup_recovery_regressions.py`, recuperação UI | Conciliação, sending abandonado e autorização para novo upload; provedores reais externos |
| Importação persistente e retomável | `import_operations.py`, 600 registros, rollback/idempotência e E2E management | Worker separado e refresh/retomada pela UI testados |
| Restauração visual | `restore_control.py`, deployer e `surfaces-smoke.py` | Confirmação, exclusão mútua, manutenção e sessões; só pacote/schema compatíveis |
| Arquivos ausentes/corrompidos e MinIO | `backup-smoke.py`, proteção forense, hashes/bytes/metadados | Restore real descartável; proteção degradada recusada como backup restaurável |
| Portabilidade delegável | `portability_access.py`, UI e permissão revalidada no worker | Delegação não concede backup/restore global |
| Financeiro nativo e ponte opcional | Configuração visual, autenticação, recibos, outbox e testes existentes | Recibo de transporte não é pagamento; cobrança/baixa remota não habilitadas |
| Site público independente | `services/website`, imagem/porta próprias e três modelos | API interna, publicação privada ausente e indisponibilidade testadas |
| Portal independente e isolamento | `services/portal`, `family_portal.py`, JWT/refresh/CSRF e IP assinado | Aluno, múltiplos dependentes, revogação, notas/documentos e financeiro autorizado |
| White label e primeiro acesso | Identidade canônica, fontes/cores/logo/manifest/icon; E2E continuity | Preservados três modelos e experiência móvel; refinamento adicional fora desta retomada |
| Convites administrativos | `User.email`, outbox criptografada, HttpOnly, validade, reenvio/revogação | SMTP TLS capturado e concorrência PostgreSQL; entrega real não homologada |
| Mailcow, SMTP, WhatsApp e parâmetros | Provisionamento existente, configuração e backups preservados | Nenhuma conta real criada ou mensagem real enviada |
| Deployer, instalação e upgrade | Helper corrigido, locks e smoke de instalação personalizada | CLI config local real; ciclo Docker e binário Windows no CI do SHA final |
| Compose, imagens GHCR e versões | Quatro adaptadores; site/portal na mesma stack e promoção por SHA/digest | Versão 0.12.1; sem nova migration, release ou fluxo paralelo |
| Banco por unidade e edição visual | Estudo e refinamentos futuros preservados | Adiados; estúdio de edição fora do escopo |

## Validações desta correção

- `PIGE_COMPOSE_BINARY=/tmp/pige-compose python -m unittest discover -s tests/ci -v`:
  **208 testes aprovados**, incluindo as quatro variantes com Compose CLI real.
- `python scripts/ci/validate.py`, `python -m compileall -q scripts tests/ci` e
  `git diff --check`: aprovados.
- Backend/frontend/serviços não foram alterados nesta correção; as execuções
  locais completas anteriores estão no registro `2026-10-19-pr57-checkpoint-validation.md`.
- Docker daemon e GUI Windows não estão disponíveis localmente. O CI do **SHA
  final publicado** repete PostgreSQL, E2Es, builds e o upgrade real. Seu resultado
  terminal, SHA, árvore e link são registrados no relatório da PR após conclusão.

## Operação e pendências externas

Sem nova dependência ou migration. Rollout não executado. A atualização autorizada
deve usar o projeto existente, manter backups/chaves e conferir saúde/diferenças.
Rollback de imagem não restaura dados; falha de restore conserva manutenção.
Seguem válidos os procedimentos dos registros de continuidade e correções auditadas.

Continuam externas: documentos reais autorizados e qualidade OCR em campo,
A1/ICP institucional e revogação, contas reais Drive/Dropbox, DNS/TLS/proxy e GUI
Windows interativa. Nenhuma dessas homologações é substituída por mocks ou CI.
Não houve acesso a produção, merge, release, deploy nem trabalho em outro repositório.
