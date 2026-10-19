# PR 57 — retomada e validação do checkpoint

Repositório exclusivo: `wkarts/PIGE360-self`.
Branch: `feature/academic-admission-completion` → `develop`.

## Reconciliação e preservação

O HEAD remoto foi consultado antes de alterar o código: permaneceu em
`bc26d8183b46bb77350d69418ac32c1f3a92a044`, sem commits posteriores ou revisões
pendentes. A cópia local limpa tinha a mesma árvore
`229be3ae7e467889a55c0010b4cb79be85d0cbf5`.

O contexto anexado foi lido integralmente. O ZIP original foi preservado, com
SHA-256 `de352efcedd01b45df98ed94f0551fad6a9ff2c9f1e21fccbf245a5b9bd2b58e`.
Foram conferidos CRC, caminhos seguros e os 601 hashes do manifesto. O patch foi
aplicado uma única vez; os 598 arquivos resultantes foram comparados byte a byte
com `source/`. A árvore resultante foi exatamente
`e11c876256ff6f6422766a2589c660ee1e8749f6`, correspondente ao checkpoint local
`1c39c5aab119c26ef799a864c3dae89893c63810`.

Essa árvore foi mantida em um commit próprio. A identidade do commit recriado
difere da identidade original; o conteúdo foi preservado integralmente. O commit
seguinte contém somente as correções de validação abaixo e este registro.

## Ajustes encontrados ao executar as validações

- O E2E de contrato usava `date.today()` do host para o recebimento manual, mas a
  regra financeira usa o calendário de `America/Bahia`. Um host em
  `Asia/Singapore` fornecia o dia seguinte e a API recusava corretamente a data
  futura. A fixture agora calcula essa data no mesmo fuso da regra, sem mudar a
  validação de produção.
- A fixture de importação pausa uma transação SQLite por oito segundos. O refresh
  de sessão pode aguardar essa escrita; a asserção visual aguardava apenas cinco
  segundos. A espera dessa asserção foi ajustada para quinze segundos, mantendo
  interrupção, rollback, refresh, retomada pela UI, contagem final e ausência de
  duplicação. Não foi removido nenhum cenário.
- Removida uma linha vazia excedente ao final de um teste para passar no diff-check.

## Testes locais efetivamente executados

Python **3.13.16**, Node **24.19.0**, SQLite descartável, Chromium headless local,
SMTP TLS capturador e dados/certificados/provedores sintéticos. O CI usa Node 22.

| Comando | Resultado observado |
| --- | --- |
| `PYTHONPATH=backend python -m pytest backend/tests -q` | 591 aprovados, 3 ignorados por exigirem PostgreSQL, 5 subtestes aprovados |
| `python -m unittest discover -s tests/ci -v` | 205 aprovados |
| `npm ci --prefix frontend --ignore-scripts` | aprovado |
| `npm run typecheck --prefix frontend` | aprovado |
| `npm run build --prefix frontend` | aprovado; nenhum dist divergente do checkpoint |
| `python scripts/ci/validate.py` | aprovado, quatro adaptadores conferidos |
| `python scripts/e2e-continuity.py` | 10 verificações; convite/refresh, portal, dependentes, IP assinado e três modelos |
| `python scripts/e2e-management.py` | 3 verificações; inclui worker interrompido, refresh, rollback e retomada pela UI |
| `python scripts/e2e-completion.py` | 8 verificações, zero erros de página; contrato/A1 sintético, site, delegação e recuperação legada |
| `PYTHONPATH=backend python scripts/evaluate-ocr.py` | 18/21 campos sintéticos; foto degradada 0/3; rejeições e revisão humana conferidas |
| `git diff --check` | aprovado após correção da linha excedente |

Os E2Es utilizaram o Chromium instalado por `PIGE_CHROMIUM_EXECUTABLE` no teste de
continuidade e um launcher local com `BrowserType.launch(executable_path=...)`
nos demais; o código de produção e as asserções foram executados normalmente.
Os avisos de depreciação observados não foram tratados como falhas de teste.

## CI remoto e homologação externa

Os resultados do CI devem ser vinculados ao **SHA final efetivamente publicado**
no relatório da PR. Checks antigos não validam este checkpoint. PostgreSQL real,
todos os E2Es, Docker/OCR/MinIO/restore visual, upgrade Compose de instalação
personalizada e compilação/self-test do executável Windows fazem parte do workflow.
Docker e Windows não foram executados localmente nesta retomada.

Continuam externas: A1/ICP institucional e revogação, documentos reais autorizados,
contas reais Drive/Dropbox, DNS/TLS/proxy da escola e GUI Windows interativa.
OCR sintético não estabelece acurácia em documentos reais. Aceite SMTP capturado
não comprova entrega de e-mail. Prazo comercial, assinatura digitalizada e
frequência/retenção de backups continuam decisões institucionais.

## Escopo e operação preservados

A matriz completa permanece em `2026-10-19-pr57-continuity.md`; as correções
auditadas do checkpoint estão em `2026-10-19-pr57-audit-fixes.md`. Serviços site e
portal, interfaces, Compose, deployer e testes foram preservados. Sem nova
migration neste delta; versão canônica `0.12.1`. Recuperação, proteção degradada,
segredo dedicado do portal, proxies confiáveis, rollout e rollback seguem esses
documentos. Nenhum merge, deploy, release ou acesso à produção foi executado.
