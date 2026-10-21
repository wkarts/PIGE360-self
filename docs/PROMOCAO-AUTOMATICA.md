# Promoção automática de develop para latest

## Resultado e limites

Após um push/merge em `develop`, o pipeline oficial testa o commit, constrói os três candidatos GHCR e executa o smoke. Só então cria ou reutiliza uma única PR de `develop` para `main`, testa a composição da PR, faz o merge normal e solicita a release estável. Não há deploy, SSH, acesso a VPS nem uso de dados reais.

O incremento automático é `patch`. Se já houver uma PR válida com título `release(minor): ...` ou `release(major): ...`, o título, o incremento e a descrição humanos são preservados. Uma PR em rascunho, conflitante ou inválida interrompe a promoção com erro visível. O fluxo nunca aprova reviews nem altera proteção de branch.

A criação de novas PRs pode usar uma [GitHub App restrita](PROMOTION-GITHUB-APP.md) para evitar o gate específico do `GITHUB_TOKEN`. Sem configuração, o modo legado continua com aviso; configuração parcial ou falha da App interrompe sem fallback. A PR de suporte não instala nem configura a App.

## Sequência executada

1. `develop-image.yml`: `version → bases → tests → publish`, mantendo as verificações existentes de PostgreSQL, Chromium, Docker, Windows e smoke dos três artefatos.
2. O job `promote` só inicia depois do sucesso de todos esses jobs. Chama `promote-develop.yml` diretamente por `workflow_call`.
3. `prepare` confirma o repositório fixo `wkarts/PIGE360-self`, o evento `push`/`workflow_dispatch`, a branch `develop` e o SHA da execução. Rejeita um SHA antigo se `develop` avançou.
4. Reutiliza a PR aberta `develop → main` ou cria uma com as seções exigidas. Não cria uma segunda PR. Quando não há diferenças, termina sem nova PR; se uma tentativa anterior já mesclou exatamente o mesmo head no main atual, retoma somente a release.
5. Registra head, base, SHA e árvore do merge sintético de GitHub. Confirma que os dois parents são exatamente `[main, develop]`.
6. Executa `ci.yml` novamente sobre esse SHA sintético, com token somente de leitura e as mesmas bases imutáveis já utilizadas. O nome do artefato de evidência inclui o SHA, evitando colisão com o primeiro CI no mesmo run. Os labels Docker usam o SHA realmente verificado no checkout.
7. Antes do merge, consulta novamente a PR, `main`, `develop`, parents, árvore e incremento SemVer. Qualquer mudança interrompe a operação. Usa a API normal de merge com `sha` do head e método `merge`, sem force, admin ou bypass.
8. Verifica parents e árvore do commit realmente mesclado. Somente depois reconcilia os runs de `release.yml` do mesmo SHA. Reutiliza run em curso/concluído ou release publicada verificável; um run falho exige retomada de seus próprios jobs. Apenas sem execução/release anterior solicita `workflow_dispatch`, `ref=main`, SHA exato e número da PR.
9. `release.yml` carrega seu verificador do SHA do evento main, nunca do SHA fornecido por input. Exige que o input corresponda ao SHA do evento, ao main atual e à PR já mesclada. Executa novamente o pipeline estável existente: bases, CI completo, builds e smoke por digest. Antes da finalização verifica novamente o main atual.
10. A release confere o conjunto de aplicação, agente de e-mail e SOGo; promove os mesmos digests aprovados; registra `images.json`; verifica os aliases e publica o release/checkpoint. O pipeline develop acompanha o run correlacionado até sucesso, falha ou timeout explícito de 120 minutos. Sucesso do run ainda exige verificação independente de tag, manifesto, SHA e digests publicados. Um retry nunca considera apenas a existência da release como prova suficiente.

## Por que o fluxo não depende do evento pull_request do bot

O `GITHUB_TOKEN` não dispara normalmente workflows de eventos produzidos por ele. A documentação atual também descreve eventos `pull_request` `opened`/`synchronize`/`reopened` produzidos por esse token em estado que exige aprovação; `closed` não dispara a release. Por isso:

- o CI da promoção é uma chamada explícita `workflow_call`, independente de aprovação do evento da PR;
- a release é um `workflow_dispatch` explícito, que pode ser disparado pelo token;
- não existe `pull_request_target`, PAT, autoaprovação nem workflow recursivo; opcionalmente, somente a criação/reconciliação da PR usa uma GitHub App restrita;
- o CI normal de PRs humanas continua existindo;
- se uma proteção exigir especificamente um check de PR aguardando aprovação, a promoção para e exige a ação humana necessária. Não fabrica status nem contorna essa exigência.

A instalação não depende de um workflow `workflow_run` já estar em main. O primeiro merge desta alteração em develop pode executar a promoção. O dispatch ocorre depois que o merge levou o novo contrato de `release.yml` para main. A PR de implementação deve ser revisada antes da ativação.

Fontes oficiais:

- [GITHUB_TOKEN e eventos](https://docs.github.com/en/actions/concepts/security/github_token)
- [Permissões de workflows reutilizáveis](https://docs.github.com/en/actions/reference/workflows-and-actions/reusing-workflow-configurations)
- [API normal de merge de PR](https://docs.github.com/en/rest/pulls/pulls#merge-a-pull-request)
- [Inspeção de imagens por digest](https://docs.docker.com/reference/cli/docker/buildx/imagetools/inspect/)

## Permissões e pré-requisitos

| Etapa | Permissões do job |
| --- | --- |
| Preparar PR | `contents: read`, `pull-requests: write` |
| CI do merge sintético | `contents: read`, `packages: read` |
| Merge normal | `contents: write`, `pull-requests: read` |
| Solicitar release | `contents: read`, `pull-requests: read`, `actions: write` |
| Esperar/verificar release | `contents: read`, `actions: read`, `packages: read` |
| Validação inicial da release | `contents: read`, `pull-requests: read` |
| Builds/finalização | Permissões existentes de GHCR; a finalização mantém `contents: write` e `packages: write` |

O job chamador `promote` concede o teto necessário aos jobs reutilizáveis; cada job reduz suas permissões. Checkouts dos jobs de orquestração usam `persist-credentials: false`. O código testado não recebe token de escrita durante o CI da composição.

No modo legado, a opção de repositório “Allow GitHub Actions to create and approve pull requests” precisa permitir criação de PR com `GITHUB_TOKEN`. Essa configuração não é alterada por este código e sua disponibilidade não foi presumida. Uma recusa HTTP 403 apresenta o bloqueio exato. Qualquer ajuste de configuração ou credencial exige autorização específica do responsável. Nenhum PAT é usado. O modo legado não requer secret adicional; o modo App requer Client ID e chave privada conforme o guia vinculado.

O merge normal continua sujeito às regras atuais do GitHub, inclusive reviews, checks e filas obrigatórias. Se o repositório não permitir o método merge, ele falha sem substituir por squash/rebase. Não é criado acesso persistente extra.

## Concorrência e integridade

- `pige360-develop-pipeline` continua serializado, com `cancel-in-progress: false`.
- A release continua usando `pige360-stable-release`, e a mutação GHCR usa `pige360-ghcr-mutation`.
- As filas de concurrency do GitHub não são FIFO garantidas e podem substituir um run pendente por um mais novo. O objetivo é publicar o head atual; nunca é prometida uma release para cada SHA intermediário.
- O endpoint de merge aceita lease do **head**, não da **base**. Existe uma janela entre a última leitura de main e o merge. A verificação posterior detecta parents/árvore diferentes e bloqueia o dispatch. O merge já realizado não é desfeito. Uma retomada passa pelo CI completo da release antes de qualquer promoção estável. Garantia estrita de base antes do merge exigiria configuração de proteção/fila aprovada separadamente.
- Antes de um novo dispatch, o fluxo realiza quatro reconciliações somente leitura ao longo de 45 segundos, permitindo que um POST anterior de resultado incerto fique visível. A API não oferece chave de idempotência; a janela reduz duplicatas por consistência eventual, mas não equivale a garantia atômica. Depois da espera, main e PR são revalidados antes de qualquer POST.
- O dispatch também pode concorrer com uma atualização de main. O SHA é validado na execução da release e o observador acusa divergência do SHA do run. Não escolhe silenciosamente outro commit.
- Se main avançar durante os builds, a finalização aborta antes de publicar aliases. Ainda existe a janela inerente entre essa leitura final e as escritas no registry; versões mais recentes e a serialização da release evitam regressão causada por outro run deste pipeline, mas escritores externos não podem ser travados por este código.

## Coerência das três imagens

`stable_set.py` faz um preflight completo antes da primeira escrita: registry e nomes estritos, digest, plataforma linux/amd64, label `org.opencontainers.image.revision` igual ao SHA aprovado e ausência de conflito em qualquer tag de versão imutável. Todas as tags estáveis imutáveis são preservadas.

O conjunto de digests é registrado no asset `images.json`, junto do SHA e dos aliases anteriores. Cada alias é aplicado aos três artefatos, e o conjunto inteiro é verificado novamente antes de publicar a release. Uma falha tenta restaurar os aliases preexistentes por digest e sempre deixa o run em falha. Uma recuperação parcial é informada expressamente; nunca se declara sucesso nesse caso.

O GHCR não oferece transação atômica entre três repositórios de imagens. Há uma pequena janela durante a atualização dos aliases. Tags novas sem valor anterior não são removidas automaticamente; pacotes e versões nunca são apagados pelo fluxo. Para instalações que exigem um conjunto imutável, use os três digests do `images.json`, em vez de resolver três aliases mutáveis em momentos distintos.

Releases já publicadas são verificadas sem recompilar, promover ou reescrever. Se uma release mais recente detiver legitimamente os aliases, seu próprio manifesto e conjunto são verificados; os aliases não são rebaixados para a versão antiga.

## Falhas e retomada

- **PR proibida pelo GitHub:** a criação falha com a mensagem da opção necessária. Não altera a configuração. Um responsável pode criar a PR válida manualmente; reexecutar o pipeline então reutiliza essa PR.
- **CI falha:** não há merge nem dispatch. Corrija por uma nova PR em develop; o próximo pipeline valida o novo SHA.
- **Head/base mudam:** não reutilize evidência antiga. Reexecute o pipeline do head atual para reconstruir e testar a composição nova.
- **Conflito ou proteção/review pendente:** resolva a causa no GitHub e reexecute. Não há bypass ou aprovação automática.
- **Merge concluído, dispatch falhou:** reexecutar develop detecta a PR mesclada no main atual, consulta os runs e a release, e reutiliza o resultado existente. Um POST incerto não é repetido na mesma execução. Não cria outra PR nem outro build quando o dispatch anterior foi aceito.
- **Release falhou:** o erro e o link ficam nos Actions. Um retry de develop aponta ao run existente e não cria outra execução de release. Reexecute os jobs pertinentes da release para preservar o mesmo candidato/digest. Se reexecutar todos os builds produzir digests diferentes de tags de versão já criadas, a proteção de imutabilidade interrompe a promoção; não exclua nem sobrescreva as tags para forçar passagem. Recupere usando os digests e evidências do run anterior, ou publique uma nova versão após revisão.
- **Timeout do observador:** o run da release pode continuar. Consulte seu estado; timeout não confirma `latest` e não cancela silenciosamente o run externo.
- **Falha na compensação de aliases:** use `images.json` e o artefato `release-*` do run para diagnóstico e restauração autorizada por digest. Não trate falha como publicação bem-sucedida.

## Testes e verificação

Testes novos em `tests/ci/test_auto_promotion.py` cobrem PR idempotente, metadados, origem/forks, SHA antigo, base alterada, composição sintética, CI obrigatório, corrida pós-merge, dispatch, correlação, timeouts, contrato YAML, POST incerto, reutilização de run em curso/concluído, bloqueio de reconstrução após falha, manifesto/aliases divergentes e promoção dos três artefatos com preflight e rollback compensatório.

Comandos locais:

```sh
python -m unittest discover -s tests/ci -v
python -m compileall -q scripts/ci
bash -n scripts/ci/finalize-release.sh
npm run typecheck --prefix frontend
npm run build --prefix frontend
python scripts/ci/validate.py
```

A validação efetiva de GitHub Actions, permissões do token, PostgreSQL, Chromium, Windows e Docker continua sendo a execução remota. Simulações unitárias não são evidência de publicação real. O ambiente local pode não oferecer Docker ou `actionlint`; isso deve ser reportado, não presumido.

## Rollback do código

Reverter a PR de automação em develop remove o encadeamento automático. Releases e imagens já publicadas são preservadas. Não há migration de banco nem mudança de contrato da aplicação. Um rollback funcional de versão é uma nova release aprovada; o fluxo não sobrescreve versões imutáveis nem implanta nada em servidores.
