# GitHub App restrita para a promoção develop → main

## Causa e alcance

A PR de promoção criada pelo `GITHUB_TOKEN` pode gerar uma execução `pull_request` que aguarda aprovação humana. Na PR #64, a tentativa inicial expirou sem executar jobs: “This workflow run required approval but was not approved before it expired.” Reexecutar manualmente liberou aquela tentativa, mas não muda a identidade que abre a próxima PR.

O suporte abaixo usa uma GitHub App para criar novas PRs de promoção. Publicar ou mesclar esta mudança **não configura a App** e não garante por si só eliminar a intervenção: a instalação e as duas configurações precisam ser feitas por administrador autorizado. Não altera regras de aprovação, proteções, instalações, permissões ou secrets existentes.

## Comportamento e migração

- Sem os dois valores: mantém `GITHUB_TOKEN`, emite warning e resumo explícitos. O fluxo atual continua; aprovação manual ainda pode ser necessária.
- Com ambos: emite token de instalação temporário da App apenas no job `prepare`, após testes e publicação de develop. Usa o checkout confiável do evento de develop.
- Configuração parcial, valores em branco ou erro de autenticação/permissões da App: interrompe antes de criar PR, sem fallback silencioso.
- PR existente é reutilizada e preservada. Configurar a App não reabre PR nem recupera uma execução antiga expirada. Para essa execução específica ainda pode ser necessária aprovação/reexecução humana.
- Merge, validação do merge sintético, verificações de SHA/tree, dispatch idempotente e acompanhamento da release continuam como antes. `merge` e `dispatch` conservam `GITHUB_TOKEN`; a App não publica release e não mescla código.
- A validação normal de PR continua ativa para develop e main; não é removida para esconder a execução vermelha. Os testes internos da promoção também permanecem.

## Configuração administrativa (ação separada e autorizada)

1. Criar uma GitHub App de uso exclusivo da promoção e instalá-la somente em `wkarts/PIGE360-self` (Selected repositories).
2. Permissões de repositório mínimas: **Contents: read** para refs, compare e git commits; **Pull requests: write** para criar/ler PR; Metadata read é implícito. Não conceder Actions write, Contents write, Workflows, Administration ou acesso a outros repositórios para esta finalidade. Webhook/subscrições não são necessários para este job.
3. Salvar o Client ID como variável de Actions `PROMOTION_APP_CLIENT_ID` e a chave privada como secret de Actions `PROMOTION_APP_PRIVATE_KEY`. Inserção da chave deve ser feita pelo responsável em interface segura; nunca em PR, conversa, log, arquivo versionado ou artefato.
4. Revisar permissões e a origem das credenciais antes de ativar. A action oficial é fixada no commit `64ab729a6294000f5aa4a4bc0b73d1f32bc45510` (v3). Solicita explicitamente somente o repositório e as duas permissões citadas; revoga o token ao finalizar o job. Não persiste token em checkout nem o exporta como output de job.
5. Na próxima promoção autorizada, verificar o resumo indicando App, autor da nova PR e início da validação sem aprovação pendente. Confirmar CI e release pelos respectivos runs, sem criar publicação concorrente. Políticas organizacionais adicionais ainda podem exigir aprovação: não são contornadas por esta mudança.

O secret é encaminhado nominalmente somente de `develop-image.yml` para `promote-develop.yml`, nunca por `secrets: inherit`, nem a `ci.yml` ou workflows de PR. Guardas exigem repositório exato, `refs/heads/develop` e evento `push`/`workflow_dispatch` antes da emissão do token.

## Recuperação e rollback

Falha de App: corrigir Client ID, chave, instalação selecionada ou permissões mediante autorização, depois reconciliar o run existente. Não reenviar POST incerto nem criar PR duplicada. Para voltar conscientemente ao legado, remover os dois valores juntos; isso restaura a possibilidade de aprovação manual. Remover apenas um falha fechado. Revogação/rotação de chave e alterações de acesso são operações administrativas separadas, não executadas pela PR.

## Evidência e referências

- [Run original e tentativas da PR #64](https://github.com/wkarts/PIGE360-self/actions/runs/39620658830)
- [Token automático e eventos](https://docs.github.com/en/actions/concepts/security/github_token)
- [Action oficial create-github-app-token](https://github.com/actions/create-github-app-token)
- [Permissão de criação de PR](https://docs.github.com/en/rest/pulls/pulls#create-a-pull-request)
- [Leitura de refs](https://docs.github.com/en/rest/git/refs#get-a-reference) e [comparação de commits](https://docs.github.com/en/rest/commits/commits#compare-two-commits)

Testes locais verificam seleção, ausência de vazamento, escopos e ligação dos workflows, além das regressões de promoção existentes. Nenhuma App real ou chave privada é necessária para esses testes. A verificação ponta a ponta da identidade App permanece pendente até a configuração autorizada.
