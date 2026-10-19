# PR 57 — permissões efetivas após resolução institucional

## Origem preservada

HEAD remoto auditado e reconfirmado antes das alterações:
`009d7ddead70da6cd57aa1601eaa8716b5e52edf`, árvore
`ba167c7dd7bc3c6daf171c8ed8306a5c06e79ca4`.
Mesma branch `feature/academic-admission-completion`, destino `develop`.
Checkpoint, proteção forense, restauração visual e preservação de projeto Compose
permanecem intactos. O ZIP histórico não foi reaplicado.

## Defeito reproduzido e correção

`own_profile_students` avaliava `profile.self` e a permissão própria do papel
antes de `school_ids` vincular a única instituição disponível. Sem `X-School-ID`,
`permissions_for` ainda via o papel base; o perfil personalizado só era carregado
depois da autorização. O perfil restrito recebia 403 com cabeçalho e 200 sem ele.
Não foi demonstrado acesso a outra família pelo defeito original.

A resolução e validação institucional agora precedem as duas verificações de
permissão no helper compartilhado. A correção é no servidor: não exige cabeçalho
novo no cliente e não utiliza ausência de cabeçalho como autorização adicional.

- Uma instituição ativa única pode ser resolvida pelo mecanismo existente.
- Mais de uma instituição exige seleção explícita (422), sem escolha arbitrária.
- Seleção não autorizada é recusada (403); seleções conflitantes continuam 409.
- Perfil personalizado inativo ou incompatível é recusado no vínculo.
- Ausência de pessoa/vínculo válido não produz dados; acesso institucional
  revogado mantém resposta vazia sem seleção ou 403 quando selecionado.
- Permanecem pessoa explícita, instituição, vínculo ativo/legal, filtro de aluno,
  permissão financeira do responsável, integridade e autorização de documentos.

## Caminhos revisados

| Caminho | Resolução e autorização |
| --- | --- |
| `family/context`, cobranças e downloads do portal | Usam o helper compartilhado corrigido, antes de consultar dados do aluno |
| `profile/learning` e PDF do boletim | Usam o mesmo helper, incluindo seleção explícita por query/header |
| `profile/context` | Já resolvia `school_ids` antes de `require`; cobertura negativa preservada e ampliada |
| Gestão de usuários e perfis, inclusive rotas antigas | `select_school`/`Scope` vincula a instituição antes de `manage`/`require` |
| Rotas administrativas e Diário | `Scope`/`DiaryScope` valida vínculo antes de avaliar permissões |
| Identidade institucional e configuração global sensível | Mantêm exigência explícita de administrador; seleção de mantenedora por não administrador já exige contexto |
| Leitura `institution/intake` e consulta `institution/lookups/{kind}` | Também reproduziram permissão base indevida sem seleção; corrigidas para resolver contexto do não administrador antes de `schools.manage` |

Nas duas operações institucionais adicionais, múltiplas instituições exigem
seleção e ausência de acesso ativo resulta em 403. Administrador da instalação
mantém a operação global. As consultas de CEP/CNPJ dos testes usam transporte
simulado, sem rede/provedor real. Login, refresh e seleção de escola permanecem
disponíveis; metadados do login não substituem a autorização dos endpoints.

## Regressões e evidência

Novo arquivo `backend/tests/test_family_access_profiles.py`, com 22 casos:

- Student e guardian com `['read']` ou `['read', 'profile.self']`, com/sem cabeçalho,
  incluindo contexto, boletim/PDF, cobranças e documentos: negados quando falta a
  capacidade exigida. Repetição com cabeçalho após request sem cabeçalho verifica
  que não há contexto residual entre requisições.
- Papel padrão e perfil personalizado autorizado: somente alunos vinculados.
- Outra família: PDF, cobranças e documentos recusados por ID.
- Outra instituição: sem vínculo negada; seleção ambígua recusada; perfil da
  segunda instituição reavaliado; pessoa da primeira não concede dados na segunda.
- Pessoa ausente, mesmo com e-mail coincidente; escola revogada; perfil desativado;
  vínculo do responsável inativo ou sem representação legal: nenhum dado indevido.
- Operações institucionais adicionais: perfil restrito negado, perfil legítimo e
  administrador permitidos, seleção ambígua/ausência de acesso tratadas com segurança.

Antes da correção, quatro casos student/guardian e dois casos institucionais
falharam com 200 indevido no request sem cabeçalho. Depois, os 22 casos passaram.
A bateria direcionada de perfis, boletim e administração também aprovou 33 casos
antes da adição dos quatro últimos cenários de borda.

## Testes locais e CI por SHA

Ambiente local: Python 3.13.16, Node 24.19.0, SQLite descartável, Chromium headless,
SMTP TLS capturador e dados/certificados exclusivamente sintéticos.

| Validação local | Resultado |
| --- | --- |
| `PYTHONPATH=backend python -m pytest backend/tests -q` | 613 aprovados, três casos PostgreSQL ignorados localmente, cinco subtestes aprovados |
| `PYTHONPATH=backend python -m pytest backend/tests/test_family_access_profiles.py -q` | 22 aprovados |
| `PIGE_COMPOSE_BINARY=/tmp/pige-compose python -m unittest discover -s tests/ci -v` | 208 aprovados, incluindo Compose CLI real |
| `npm ci`, `npm run typecheck`, `npm run build` com `--prefix frontend` | Aprovados; frontend sem alteração funcional |
| `python scripts/ci/validate.py`, compileall e diff-check | Aprovados |
| `scripts/e2e-continuity.py` com Chromium local | Dez verificações, zero erros de página; login, convite, primeiro acesso, dependentes, revogação e três modelos |

A suíte backend completa e o CI remoto são registrados com suas contagens
observadas no relatório da revisão. O CI repete PostgreSQL real, toda a bateria
Chromium, Node 22, Docker/OCR/MinIO/restore visual/upgrade e Windows. O run anterior
`39339148026` é evidência histórica do SHA de origem; não valida este incremento.
O relatório da PR identifica o **SHA final** e o resultado terminal do novo run.

As capturas locais novas do E2E, apenas com dados sintéticos, são entregues em
pacote separado com resultados e hashes do código executado. São evidência da
jornada funcional, não avaliação estética nem artefato publicado pelo run anterior.
O upload de artefatos do CI continua condicionado à opção existente; não se
presume publicação de imagens a partir de logs verdes.

## Escopo original e limites preservados

A matriz completa continua em `2026-10-19-pr57-continuity.md` e na reconciliação
`2026-10-19-pr57-compose-identity.md`. Foram preservados serviços/imagens GHCR
separados de site e portal, identidade herdada do PIGE, comunicação interna,
convites/primeiro acesso, matrícula/contrato, portabilidade, backup, restore e
deployer. Esta correção não altera essas arquiteturas, migrations ou dependências.
Versão canônica permanece 0.12.1.

**Limitação técnica OCR:** avaliação conhecida de 18/21 campos, foto degradada
0/3; esse caso não foi resolvido. Revisão humana continua obrigatória.

**Homologação externa:** A1/ICP institucional e revogação, documentos reais
autorizados, Drive/Dropbox reais, DNS/TLS/proxy e Windows interativo. Aceite SMTP
capturado não comprova entrega real. Decisões comerciais de reserva, assinatura
digitalizada e retenção continuam institucionais. Banco por unidade, refinamento
visual adicional e estúdio de edição permanecem fora desta correção.

## Operação e compatibilidade

Sem migration ou dependência nova. Atualização não executada: após autorização,
seguir o deployer/fluxo existente com backup e configuração preservados. Rollback
de código não restaura dados; regras de manutenção e recuperação continuam válidas.
O resultado 403 antes ausente é uma correção de autorização. Não relaxar o perfil
personalizado para contornar a resposta. Nenhum merge, deploy, release, operação
produtiva, e-mail real ou alteração de outro repositório foi executado.
