# Relatório de entrega — PIGE360 Self 0.3.0

Data: 22/09/2026. Base: pacote PIGE360-Self-Secretaria-0.2.0-Branding.zip fornecido na conversa. Construção local; sem alteração de repositório, publicação, deploy remoto, mensagem real ou cobrança real.

## Resultado

Aplicação FastAPI/Vue ampliada com portal dos responsáveis, pré-matrícula online, análise e efetivação pela Secretaria, integração de cobrança ASAAS, conector HTTP configurável para ARGWS Connect API e processamento persistente. Template original removido do pacote. Os 14 ativos mapeados do branding e as migrations 0001/0002 foram conferidos por hash e preservados.

## Verificações executadas

| Verificação | Resultado |
|---|---|
| Backend, incluindo regressões | **70 aprovados; 1 ignorado** de 71 coletados |
| Interface administrativa anterior | 20 verificações aprovadas |
| Novas telas de portal/inscrições/integrações/cobranças | 14 verificações aprovadas |
| Total de verificações de interface | **34 aprovadas** |
| JavaScript das telas exercitadas | Nenhuma exceção observada |
| TypeScript + templates Vue/PWA | Compilação local concluída |
| Alembic instalação vazia/upgrade/check/downgrade/reupgrade | Aprovados em SQLite descartável |
| Migração de base anterior com registro existente | Aprovada em teste automatizado |
| Schema resultante | 37 tabelas; 97 caminhos OpenAPI |
| DDL PostgreSQL | Compilado estaticamente; não executado |
| Configurador e preparador de upgrade | Geração, preservação de chaves, reexecução e backup 0600 testados |
| Compose/shell | Análise YAML e sintaxe shell aprovadas; três serviços e uma porta publicada |
| Documento escolar gerado | PDF gerado pela API, baixado pelo mecanismo de teste, texto conferido e página renderizada/inspecionada |

O teste ignorado depende de PostgreSQL real para validar ativação concorrente na última vaga. Não foi convertido em teste SQLite nem declarado aprovado.

## Como o navegador foi testado

O Chromium bloqueou a navegação HTTP local com `net::ERR_BLOCKED_BY_ADMINISTRATOR`. Foi usado `PIGE_UI_BRIDGE=1`: Vue real, API FastAPI real por HTTPX e banco SQLite descartável. Formulários, validações, arquivos e documentos persistiram realmente. As respostas da API não foram simuladas.

Esse mecanismo não equivale a navegação HTTP nativa. **Não valida cookies nativos do navegador, CSP em navegação, downloads nativos, proxy/HTTPS nem instalação PWA em dispositivo.** Essas verificações permanecem necessárias no ambiente de destino. A PWA não oferece edição de dados privados offline.

## Integrações externas

ASAAS: código baseado na API v3 e testes de transporte/contrato com respostas controladas, inclusive criação, consulta, Pix, timeout, referência externa, divergência de valor e webhook duplicado. Não houve homologação em conta sandbox/produção com credenciais reais.

Connect API: transporte configurável e testes de payload/timeout/callback. **O contrato HTTP/OpenAPI real da instalação não estava nos anexos consultados.** A compatibilidade precisa ser conferida antes de habilitar; o pacote não declara rotas inventadas como oficiais. O adaptador atende o formato descrito em `INTEGRACOES.md` e pode exigir ajuste se o contrato real diferir.

SMTP: lógica de envio TLS e fila implementadas; códigos, expiração, consumo e recuperação foram testados localmente. Entrega real por SMTP não homologada.

Nenhuma liquidação financeira ou entrega efetiva de WhatsApp foi realizada/atestada. Geração de cobrança e HTTP de envio não são comprovantes de pagamento ou leitura.

## Limitações de infraestrutura

Docker, PostgreSQL, imagens OCI, migração em PostgreSQL, bloqueios concorrentes reais, backup/restauração em Docker e envio externo ainda precisam de homologação. `compose.yaml` e os scripts estão entregues, mas não há alegação de imagem Docker já construída ou de CI remoto aprovado.

O teste de restauração está descrito operacionalmente, mas não foi executado neste ambiente. A lógica de recuperação marca efeitos incertos para evitar reenvio cego depois de restaurar um snapshot.

## Evidências

- `evidence/0.3.0/pytest.xml`: resultados completos do backend.
- `evidence/0.3.0/ui-integration-results.json`: interface administrativa.
- `evidence/0.3.0/online/results.json`: portal e integração das novas telas.
- `evidence/0.3.0/static-validation.json`: migrations, contagens e compilação.
- `evidence/0.3.0/deployment-static.json`: configuração e análise de deployment.
- `evidence/0.3.0/preservation.json`: hashes de migrations e ativos.
- `evidence/0.3.0/online/`: capturas reais e comprovante com dados sintéticos.

Código e frontend compilado acompanham a distribuição. Não foram incluídos template original, segredos de produção, bancos de teste, caches, dependências instaladas ou fontes tipográficas. A lista integral de arquivos está em `TREE.txt`; hashes estão em `SHA256SUMS`. Consulte `ESCOPO-0.3.0.md` para não confundir a expansão da Secretaria com todos os módulos do ERP original.
