# PR67 — site, portal, matrículas e documentos

Ponto de partida conferido: `195aff27bf7206e55d741ca648224826f46a1c62`, na branch `fix/site-portal-domain-responsive`, base `develop`. As quatro entregas anteriores da PR foram preservadas. Não houve acesso a banco de produção, merge, deploy, release nem envio externo a pessoas.

## Jornadas disponíveis

| Jornada | Operação e proteção | Evidência |
|---|---|---|
| Site institucional | Rascunho privado, prévia com renderer público, publicação explícita, retirada atômica e controle de versão | `test_website_editor.py`, E2E HTTP |
| Quatro temas | Horizon: abertura em duas colunas; Editorial: manchete e coluna de notícias; Culture: composição assimétrica; Campus: acessos rápidos e agenda | capturas em `qa/pr67`, 320/390/768/1440 px |
| White label | Identidade instalada como base; nome, cores e fonte do site substituíveis; vazio restaura herança; logo/fonte instalados preservados | duas escolas e configuração parcial em teste de API |
| Portal familiar | Login escolar separado da inscrição, renovação de sessão, documentos/boletim/financeiro, proteção contra resposta tardia ao trocar aluno, nomes das instituições | E2E 320/360/390/768/1024/1440, paisagem e espaço de zoom; testes de dois filhos e vínculo revogado |
| Campanha de matrícula | Seleção administrativa explícita de ano; turmas/modelos compatíveis; link e slug existentes preservados; servidor rejeita turma/ano adulterados | `test_campaign_period.py` e regressão de admissões |
| Matrícula em lote | Pessoas existentes/importadas, filtro por origem e curso/etapa, ano/turma explícitos; simulação sem escrita; confirmação idempotente; execução de até 20 itens por requisição | `test_enrollment_batches.py`, E2E cria duas matrículas |
| Recuperação do lote | Histórico, retomada por item, sucesso preservado em falha parcial, cancelamento somente do que falta, resultado CSV | testes de repetição, conflito, cancelamento e exportação |
| Matrícula manual | Cadastro único e vínculos sem sair do assistente; destino acadêmico, financeiro, modelos/contratos vinculados à matrícula e estados separados | E2E cria matrícula e duas parcelas internas pendentes |
| Financeiro | Parcelas e total em centavos; controle interno ou solicitação explícita ao provedor; recebimento integral separado com referência e data; consulta recuperada ao retomar | regras bancárias existentes e regressão completa |
| Documento DOCX | Original privado até 8 MB, sugestões por região, aprovação ou preservação literal, prévia PDF, revisão obrigatória antes de ativar e versão de emissão imutável | teste OOXML/PDF real e E2E da interface |
| Portabilidade | Códigos operacionais comuns, alias anterior interno pesquisável, mapas e originais preservados | `test_imported_identifiers.py` e regressão de importação |

Os comandos de cobrança por provedor e recebimento só executam após ação do operador com permissão. Criar matrícula não registra pagamento nem assinatura. A efetivação reaproveita as regras existentes de documentos, responsável, capacidade, reserva, financeiro e contrato. Não há avanço de série automático.

## DOCX e documentos de referência

Os três DOCX anexados foram lidos e renderizados localmente como referência. Os contratos produziram seis páginas cada; a ficha produziu cinco. As próprias renderizações dos originais apresentam texto sobreposto à faixa superior e uma página quase vazia de assinatura na ficha. O modo preservar layout mantém a estrutura OOXML e as imagens; não corrige silenciosamente esses problemas. A escola precisa conferir todas as páginas da prévia e ajustar o original quando necessário. Não se promete equivalência pixel a pixel entre Word e LibreOffice.

O editor reconhece marcadores `{{campo}}`, sequências de X e sublinhados, inclusive entre runs do Word. Cada sugestão não explícita exige escolha de campo ou confirmação de preservação literal. Lacunas que não forem reconhecidas podem ser marcadas no Word e reimportadas. Conteúdo livre pode continuar sendo criado no editor textual/JSON existente. Os arquivos reais não foram adicionados ao repositório, enviados a processamento externo ou convertidos em seeds.

O catálogo inclui campos de ficha e saúde provenientes do cadastro privado, que exigem permissão de leitura de alunos ao gerar documentos. Consentimento de imagem permanece campo manual sem valor presumido. Não foram inferidas regras financeiras, consentimentos ou signatários a partir dos anexos. Permanecem decisões da instituição: quantidade ambígua de parcelas, cumulatividade dos descontos, autorização de imagem, signatários, data efetiva de assinatura e condições de cancelamento/formalização. O sistema não combina descontos automaticamente nem presume consentimento.

### Dependência local de conversão

A imagem da aplicação e o runner de CI instalam `libreoffice-writer` em modo não interativo, com timeout de rede de 30 segundos e três retentativas. A preparação no runner tem limite de oito minutos para não bloquear silenciosamente o restante da validação. Instalações próprias fora da imagem precisam de `soffice` ou `libreoffice` no PATH do backend e das fontes usadas no documento. Cada conversão usa diretório/perfil temporário, macros desabilitadas e limite de 60 segundos. Ausência do conversor retorna 503 explicativo e conserva o original. Arquivos ativos, referências externas de conteúdo, ZIP inválido, caminhos suspeitos e expansão acima de 40 MB são rejeitados. Hyperlinks não são executados.

## Migrações propostas

| Revisão | Alteração | Compatibilidade |
|---|---|---|
| 0048 | `admission_campaigns.academic_year_id` e FK | Backfill somente para grupos de um único ano; chamadas antigas inferem o ano das ofertas já autorizadas |
| 0049 | rascunho JSON, versão publicada, ação de inscrição e marca do site | Conteúdo publicado existente permanece habilitado e preservado |
| 0050 | tabela `enrollment_batches`, escola/autor, payload/resultados e chave única por escola | Não cria pessoas, matrícula, cobrança ou documento durante a migration |
| 0051 | original DOCX, mapeamento JSON e confirmação de revisão em modelos | Modelos textuais e documentos já emitidos continuam válidos |
| 0052 | alias `imported_number` em alunos/matrículas/perfis | Normaliza apenas códigos que correspondam ao algoritmo original e à chave/ID de origem de entidades comprovadamente mapeadas; IDs, FKs, documentos históricos e arquivos de origem não mudam |

0052 não procura nem substitui palavras em nomes livres. Busca por código antigo continua funcionando. Novas importações recebem códigos operacionais comuns. Relatórios, seletores, documentos novos e portal usam o mesmo código operacional. Códigos históricos em PDFs assinados não são alterados. Metadados técnicos permanecem nas áreas autorizadas de portabilidade/auditoria.

Antes de uma implantação autorizada, executar em uma cópia representativa e medir a prévia:

```bash
python scripts/preview-imported-identifiers.py --school-id ID_DA_ESCOLA
```

O comando só faz SELECT e retorna contagens, sem nomes ou documentos pessoais. Não foi executado contra produção. 0052 é repetível por registro e confere colisões com códigos existentes. Seu custo cresce com os registros importados e exige janela compatível com o volume real.

### Implantação e recuperação, somente após autorização

1. Confirmar escola/domínios, obter backup consistente de banco e arquivos e testar a restauração em cópia.
2. Conferir as contagens da prévia e os registros mapeados. Não excluir volumes ou recriar a instalação.
3. Usar os artefatos do SHA aprovado e aplicar migrations com o procedimento existente da instalação.
4. Validar prontidão, login, publicação do site, matrícula e conversor de documentos com dados sintéticos.
5. Só liberar tráfego após validação. Manter os artefatos anteriores e backup pelo período acordado.

Rollback de código não desfaz o uso de novos números em documentos. O downgrade de 0052 não renumera registros em uso; remover as colunas perde a busca pelos aliases. Para reversão integral, restaurar banco e arquivos do mesmo checkpoint antes de novas escritas, sob autorização. Não executar downgrade destrutivo como tentativa automática de recuperação.

## Referências visuais consultadas

- https://www.portoseguro.org.br/ — hierarquia institucional, acessos e ofertas.
- https://site.veracruz.edu.br/escola-vera-cruz/ — organização editorial e etapas.
- https://www.escoladavila.com.br/home — narrativa pedagógica e projetos.
- https://colband.net.br/ — acessos acadêmicos, agenda e notícias.

As composições são próprias; não incorporam marca, fotografias ou textos dessas escolas. Todas as capturas versionadas usam dados sintéticos.

## Validação realizada e limites

- Backend completo em SQLite descartável: **694 passaram, 3 ignorados por exigirem PostgreSQL, 5 subtestes passaram**. Os ajustes finais de DOCX/portabilidade/site também receberam testes focados; o CI executa a suíte completa do SHA final com PostgreSQL.
- CI local: **223 executados, 222 aprovados, 1 ignorado** por ausência do Docker Compose local.
- TypeScript, build Vue, smoke tests do build, validação de políticas e `git diff --check`: executados.
- E2E HTTP sem bridge: **30 verificações**, Chromium 153 local, API e serviços reais, SQLite temporário. Abrange publicação, vínculo familiar, financeiro autorizado, matrículas e PDF via LibreOffice. `qa/pr67/results.json` registra a execução e limitações.
- Python local 3.12 e Node 24; CI usa Python 3.13 e Node 22. Nenhuma alegação de validação local com Docker/PostgreSQL. O checkpoint remoto `918dd5f` passou 700 testes no PostgreSQL real e cinco subtestes. A regressão de navegador parou em um seletor antigo do editor de site; o teste foi atualizado para rascunho/publicação explícita e passou localmente.
- As jornadas adicionais `e2e-completion.py` (8 verificações), `e2e-continuity.py` (10) e `e2e-diagnostics.py` também passaram localmente, incluindo dois dependentes, SMTP TLS capturador e assinaturas sintéticas.
- Nenhuma transação de dinheiro real, assinatura com certificado de produção, entrega real de comunicação, implantação ou teste em Firefox/WebKit.
- Os contratos privados de referência não foram ativados para uma escola: exigem decisões institucionais e correção/revisão do layout original. O fluxo genérico foi testado com documento sintético e PDF real.
- Pagamento parcial, bolsas e fórmulas contratuais de desconto não foram adicionados: o fluxo usa o valor por parcela revisado e o recebimento integral já suportado. Isso permanece uma limitação explícita, sem aplicar regras dos anexos por suposição.

## Checkpoints publicados

| Commit remoto | Conteúdo |
|---|---|
| `3e5e187c80149cd65c15017ddafad07b14d9e676` | Sessão, campanhas por período e site editável |
| `6f099fe49c1753f2eb5d2a3969dde11dca3df8a9` | Matrículas manual/lote e recuperação |
| `133192fd8d026fd527325e247217ae7b26ac7b64` | DOCX e códigos com origem preservada |
| `7eec72daa3d68f7e40e4335cecace2edfe0f0bf1` | E2E, build e retirada atômica do site |

A descrição da PR e os checks do último commit registram o resultado terminal do CI. Os SHAs acima são checkpoints, não substituem a conferência do HEAD final.
