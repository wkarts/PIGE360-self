# PIGE360 Self 0.10.0 - entrega técnica

Data: 01/10/2026. Produto self-hosted, exclusivamente Web/PWA, instalado para uma instituição e suas unidades próprias. A identidade, os dados e as integrações pertencem à escola.

**Esta entrega corresponde ao código-fonte 0.10.0 e aos arquivos produzidos a partir dele. O número da versão não comprova publicação de imagem GHCR, release, merge ou implantação. Nenhum desses eventos é declarado por este documento.** A referência de imagem da instalação deverá ser definida a partir de uma construção validada ou de uma publicação efetivamente concluída.

## Problema atendido e resultado

A operação precisava de relatórios utilizáveis, fichas escolares completas, controle sobre os dados importados e interfaces mais claras para Secretaria, professores, alunos e responsáveis. Havia ainda lacunas no acompanhamento de cobranças, no diário e na operação dos serviços integrados.

As alterações preservam FastAPI, SQLAlchemy, Vue 3, permissões, cadastros, arquivos privados e o fluxo self-hosted existente. A atualização acrescenta componentes operacionais e migrations aditivas; não transforma a instalação em uma plataforma SaaS nem exige aplicativo nativo do aluno ou do responsável.

| Área | Alteração integrada | Resultado esperado na operação |
|---|---|---|
| Relatórios | Central com filtros, indicadores, consolidação mensal, paginação, PDF e CSV | Consultar e exportar a mesma seleção, com critérios de data explícitos |
| Fichas e impressão | Ficha cadastral, matrícula, comprovantes e declarações com apresentação institucional | Emitir documentos legíveis, completos para sua finalidade e com paginação |
| Importação legada | Seleção de categorias e registros, prévia e instituição de destino fixa | Importar apenas o que foi escolhido, sem criar outra instituição |
| Interface administrativa | Reorganização visual de formulários, navegação, tabelas, filtros e diálogos | Trabalhar com menos ruído e melhor leitura em telas menores |
| Diário Escolar | Operação de planos, aulas, chamadas, avaliações e consolidações revisada | Registrar notas e frequência preservando regras e atribuições docentes |
| Área do aluno e do responsável | Boletim e frequência publicados, com PDF e vínculos verificados | Consultar somente dados do estudante autorizado |
| Matrícula online | Fluxo de inscrição, correções, documentos, cobrança e assinatura integrado ao portal | Acompanhar a solicitação até a efetivação pela escola |
| Professor | Acesso ao contexto atribuído e às operações do diário | Atuar nas turmas e componentes autorizados |
| Comunidade escolar | Notícias e eventos com audiência, período de publicação e situação | Publicar conteúdo público ou restrito ao público correto |
| E-mail institucional | Provisionamento de caixas Mailcow pela aplicação e pelo worker | Criar contas institucionais sem bloquear o cadastro de usuários |
| Assinaturas | A1 da escola, A1 do responsável, fluxo GOV.BR e recebimento de PDF externo | Preservar o contrato original e registrar revisões verificáveis |
| Cobranças Asaas | Emissão, detalhes, filtros, conciliação e recuperação de falhas revisados | Acompanhar Pix e boletos com separação entre emissão, confirmação e recebimento |

## Relatórios e documentos escolares

A central oferece seleção dos últimos três meses completos, mês atual, trimestre atual, ano atual ou intervalo personalizado. Ano letivo, turma, unidade, situação e busca aparecem conforme o relatório. A exportação utiliza os filtros da consulta aplicada; alterar os campos exige atualizar a consulta antes de baixar o arquivo.

| Relatório | Critério temporal | Observação de leitura |
|---|---|---|
| Matrículas | Data da matrícula | Situação atual, contagem de matrículas e de alunos distintos |
| Alunos cadastrados | Data de criação do cadastro | Turma vigente mais recente dentro dos filtros; situação atual |
| Cobranças e recebimentos | Vencimento da cobrança | Valores nominais; confirmado, recebido e recebido externamente separados |
| Inscrições online | Data de criação da inscrição | Situação atual e indicadores de análise, matrícula e espera |
| Pendências documentais | Matrículas realizadas no intervalo | Documentos verificados na data da emissão; não reconstitui o passado |
| Frequência escolar | Data da aula | Quantidade de aulas ponderada; presenças, faltas e justificativas separadas |
| Notas e resultados por período | Data final do período letivo | Última consolidação registrada, com indicação de regra alterada |
| Atendimentos e protocolos | Data de abertura | Situação e atraso apurados na data da emissão |

Os totais correspondem à seleção completa, mesmo quando a tela mostra uma página. Datas de criação consideram os limites do dia no fuso America/Bahia. CSV usa UTF-8, separador `;` e proteção contra interpretação de conteúdo como fórmula. PDFs incorporam fontes de leitura, usam a identidade institucional no cabeçalho e repetem os títulos das colunas nas páginas seguintes.

O limite geral é de 20.000 registros por consulta/CSV, 2.000 registros por PDF e três anos por intervalo. Pendências documentais mantêm a proteção de varredura de 5.000 alunos; o PDF da rota anterior tem limite próprio de 1.000 pendências. Quando o limite é excedido, a operação pede filtros mais restritos e não emite um relatório parcial silenciosamente.

As fichas cadastral e de matrícula passam a apresentar identificação, filiação, contatos, endereço, responsáveis e atribuições, foto disponível, vínculo acadêmico e conferência documental. Comprovantes e declarações continuam exigindo matrícula ativa; a ficha administrativa pode representar uma pré-matrícula e identifica essa condição. CPF permanece mascarado na ficha padrão. Anotações clínicas não são acrescentadas indiscriminadamente aos relatórios gerenciais.

PDFs históricos, contratos já emitidos, hashes e revisões assinadas não são regravados. O novo formato vale para novas emissões. As rotas anteriores de relação de turma e pendências documentais continuam disponíveis.

## Importação seletiva do legado

O fluxo é **Escolher arquivo → Selecionar dados → Conferir e importar**. A escola em uso é exibida como destino e não é criada nem substituída pelo SQLite.

1. Informar o SQLite ou ZIP de backup e, quando necessário, o ZIP de fotos/documentos do container legado.
2. Selecionar as categorias desejadas. A seleção inicial não autoriza importar todos os dados.
3. Usar **Escolher registros** para selecionar alunos ou outros cadastros individualmente, com busca e paginação.
4. Marcar separadamente fotos, arquivos, responsáveis, vínculos e matrículas que devem acompanhar os registros escolhidos.
5. Escolher uma unidade existente, se desejado. Essa opção impede importar simultaneamente as unidades do arquivo.
6. Conferir quantidade, destino, dependências, avisos e registros ausentes na prévia. Confirmar somente após a seleção estar válida.

A seleção individual de alunos restringe os registros dependentes selecionados àqueles alunos. Importar responsáveis sem os vínculos não cria relações automaticamente. Importações parciais do mesmo SQLite reutilizam o mapeamento anterior dentro da mesma escola; pessoas com CPF válido já existente são associadas preservando o cadastro local. Fotos e arquivos não selecionados ficam fora da operação. Caminhos de Magento permanecem excluídos.

Dados legados sem correspondência operacional, quando escolhidos, são preservados como histórico de portabilidade, sem executar filas antigas. Usuários legados selecionados entram inativos e com acesso de consulta; senhas e permissões antigas não são reaproveitadas. O histórico informa o resultado da importação e permite baixar seus detalhes. Os arquivos de clientes não integram o repositório de código.

## Diário, professor, aluno e responsável

O diário mantém turmas, componentes, atribuições docentes, períodos, planos, aulas, avaliações, pareceres, ocorrências, comunicações e fechamento. As operações respeitam o contexto do professor e o estado aberto/fechado do diário. Campos de nota e quantidade de aulas possuem validação; não é permitido tratar nota zero como ausência de lançamento.

A frequência considera a quantidade de aulas registrada em cada lançamento. Falta justificada só recebe crédito quando a regra configurada determinar isso. Consolidação, recuperação e situação do período seguem as regras da escola; a aplicação não inventa um mínimo de aprovação nem declara aprovação anual a partir de uma média parcial.

O relatório gerencial de resultados apresenta consolidações administrativas existentes. O boletim do aluno/responsável utiliza **fechamentos publicados e preservados**. Rascunhos e períodos reabertos para correção não são publicados como resultado definitivo. Essa diferença é intencional: a Secretaria acompanha o trabalho em andamento e a família recebe o resultado liberado pela escola.

O usuário aluno ou responsável precisa estar explicitamente vinculado ao cadastro e à escola. A coincidência de e-mail não concede acesso pedagógico. No portal de responsáveis, também são respeitados os vínculos e a autorização de acompanhamento escolar. O professor acessa suas atribuições; os perfis de aluno e responsável não ganham acesso aos endpoints administrativos.

## Matrícula online e comunidade

O portal mantém conta própria do responsável, inscrições por processo, anexos, mensagens, correções solicitadas, cobranças e documentos. As orientações e etapas foram reorganizadas para mostrar a próxima ação relevante. A Secretaria continua aprovando e efetivando a matrícula conforme identidade, vínculo, documentação, disponibilidade de vaga, contrato e cobrança obrigatória configurada.

Uma inscrição enviada ou uma cobrança criada não equivalem a matrícula efetivada. O recebimento de um contrato assinado também não dispensa sua conferência. Processos que exigem verificação de contato precisam de SMTP ou WhatsApp funcionando antes da abertura ao público.

Notícias e eventos têm rascunho, publicação, arquivamento, destaque, início e fim de exibição. As audiências são público, autenticados, alunos, responsáveis e professores. Conteúdo restrito não aparece no mural público. A página pública fica em `/news.html`; o parâmetro `school` permite selecionar uma escola disponível no contexto público. Textos são tratados como texto simples, sem execução de HTML enviado pelo editor.

## Integrações e assinaturas

### Bancária / Asaas

A operação bancária implementada nesta entrega usa Asaas para Pix e boleto. A tela apresenta cobranças, detalhes de emissão, histórico de eventos, filtros por vencimento e situação, indicadores e conciliação. A fila compartilha a infraestrutura existente de `IntegrationJob` e depende do worker.

Criação de cobrança valida o CPF do pagador, valor, vencimento e contexto da matrícula/inscrição. Repetições da mesma operação preservam a idempotência; modificar parcelas ou dados de uma operação já utilizada exige nova operação. Conciliação manual, em lote, periódica e por webhook convergem para consulta em andamento, evitando enfileiramento redundante da mesma cobrança.

Conciliação em lote exige filtro de até 250 cobranças elegíveis. Emissão inconclusiva não autoriza repetição cega: a recuperação confere o provedor antes de reemitir. Confirmado não é recebido; cancelamentos, estornos, recebimentos externos e contestações conservam situações distintas. Os relatórios não representam saldo bancário, tarifas líquidas ou contabilidade.

A implementação e os testes simulados não substituem a homologação com a conta Asaas da escola. Não se declara nesta versão a implementação de outros bancos, CNAB ou integração bancária universal.

### WhatsApp e SMTP

O menu de integrações separa WhatsApp, e-mail e bancária. A comunicação com o usuário final é apresentada como WhatsApp; o nome do provedor permanece na configuração técnica pertinente. Configurações, permissões, endereço acessível e credenciais da instalação precisam ser conferidos no ambiente real.

SMTP continua responsável pelo envio transacional, inclusive quando o servidor utilizado é Mailcow. Provisionar uma caixa Mailcow não configura automaticamente o SMTP nem comprova a entrega de mensagens.

### Mailcow

A configuração fica em **Integrações → E-mail**, por escola: servidor HTTPS, domínio, chave da API, cota e eventual autorização explícita de rede privada. A API key é criptografada com `INTEGRATION_ENCRYPTION_KEY` e não retorna nas consultas.

O cadastro de usuário pode solicitar sua caixa institucional, processada pelo worker. Também é possível solicitar uma caixa para usuário existente, consultar situação/uso, abrir webmail e revisar tentativas. A senha inicial é independente da senha da aplicação, tem consulta única por prazo limitado e não é enviada automaticamente por e-mail ou WhatsApp. Contas remotas preexistentes sem a identificação da aplicação geram conflito, sem adoção ou sobrescrita.

Domínio, DNS, MX, SPF, DKIM, DMARC, TLS, permissão de escrita da API e entrega de mensagens continuam sob administração do servidor Mailcow. O teste de conexão consulta o domínio; não comprova provisionamento nem entrega. Detalhes: [MAILCOW.md](MAILCOW.md).

### A1, GOV.BR e A3

O menu **Assinaturas** concentra certificado da mantenedora, documentos aguardando assinatura e conferência das vias recebidas. A1 da escola exige certificado vigente, identidade correspondente e âncoras de confiança instaladas. Chave e senha persistidas da escola permanecem criptografadas. A assinatura cria uma revisão incremental, preservando o original.

O responsável pode usar A1 durante a requisição, sem cadastro permanente do seu certificado, ou receber retorno da integração oficial GOV.BR quando habilitada. O fluxo GOV.BR vincula autorização à conta, sessão, responsável, matrícula e hash do documento, com consumo único e prazo de validade. Verificação criptográfica, confiança e conferência externa são tratadas separadamente. Uma assinatura rejeitada precisa de novo envio; não pode ser promovida diretamente à situação validada.

**A3 permanece um fluxo externo:** baixar o PDF, assinar no software que acessa o token/cartão e reenviar o arquivo. Não há acesso direto do navegador ao token nem aplicativo nativo PIGE360 exigido.

**GOV.BR integrado exige credenciais oficiais e aprovação da integração.** Instalar o código ou habilitar uma variável não concede acesso às APIs. Sem habilitação, o responsável utiliza o assinador público e envia o PDF. Configuração, callback, confiança, privacidade dos logs e limites: [ASSINATURAS-DIGITAIS.md](ASSINATURAS-DIGITAIS.md).

## Atualização de uma instalação existente

Este procedimento descreve a atualização planejada. Ele não afirma que uma VPS já foi alterada ou que uma imagem 0.10.0 esteja publicada.

### 1. Preparar um ponto de recuperação

Registrar a imagem/digest atual, diretório do adaptador, `COMPOSE_PROJECT_NAME`, bind mounts e configuração. Fazer backup verificado do PostgreSQL, documentos, fotos e `trust-roots`; guardar `.env` e chaves em local protegido e separado do código. Preservar especialmente `APP_SECRET_KEY` e `INTEGRATION_ENCRYPTION_KEY` existentes.

Para armazenamento local e adaptador CloudPanel, na raiz do projeto:

```bash
PIGE_STACK_DIR=deploy/cloudpanel sh scripts/backup.sh
```

O script interrompe temporariamente as gravações para copiar banco e arquivos de forma consistente. Para outro adaptador, usar seu diretório. Para S3/MinIO, obter backup/snapshot coerente do bucket e do banco: o script local não copia o bucket e recusa esse cenário. Não excluir volumes nem recriar a instituição para atualizar.

### 2. Preparar a imagem e revisar a configuração

Usar uma imagem construída com este código e validada, ou o digest exato de uma imagem posteriormente publicada. Não presumir que `latest` ou uma tag `0.10.0` contenham esta entrega. Para construção local, o `Dockerfile` existente permite gerar uma imagem própria; as imagens base e dependências precisam estar acessíveis.

Revisar o `.env` existente com o preparador, sem substituir credenciais:

```bash
python3 scripts/prepare-upgrade.py --env-file deploy/cloudpanel/.env.production
```

Conferir `APP_IMAGE`, política de pull, `APP_URL`, hosts, HTTPS/cookies, proxy confiável, armazenamento, chaves e limites de upload. Na construção local, configurar uma política de pull compatível com uma imagem local. Na distribuição por registry, preferir o digest validado. App, worker e worker-ocr devem utilizar a mesma referência de aplicação.

Configurar Mailcow pela interface. Revisar Asaas, webhook, WhatsApp e SMTP por ambiente. Habilitar GOV.BR somente quando os requisitos oficiais estiverem atendidos; conferir o callback HTTPS da própria instalação. Instalar as âncoras da assinatura no caminho configurado e manter esse diretório no backup.

### 3. Aplicar migrations e iniciar os serviços

As novas revisões são sequenciais:

| Revisão | Dependência | Finalidade |
|---|---|---|
| `0025_signature_sessions` | `0024_admission_contract_binding` | Sessões temporárias do retorno de assinatura GOV.BR |
| `0026_mailcow` | `0025_signature_sessions` | Configuração Mailcow e caixas institucionais |
| `0027_school_community` | `0026_mailcow` | Notícias e eventos com escola, audiência e publicação |

O inicializador do app executa `alembic upgrade head` antes de servir HTTP. Instalações mais antigas também precisam de todas as revisões intermediárias; não se deve marcar revisões como aplicadas sem executar sua migração. Os workers iniciam após a saúde do app.

Depois de preparar a referência correta de imagem e o ponto de recuperação, a operação de atualização utiliza o Compose do adaptador:

```bash
docker compose --env-file deploy/cloudpanel/.env.production -f deploy/cloudpanel/compose.yaml config --quiet
docker compose --env-file deploy/cloudpanel/.env.production -f deploy/cloudpanel/compose.yaml up -d --wait
docker compose --env-file deploy/cloudpanel/.env.production -f deploy/cloudpanel/compose.yaml ps
docker compose --env-file deploy/cloudpanel/.env.production -f deploy/cloudpanel/compose.yaml logs --tail=100 app worker worker-ocr
```

A obtenção da imagem deve respeitar a política escolhida: `pull` para uma referência remota disponível, construção prévia quando local. A stack publica somente a porta da aplicação; PostgreSQL e workers continuam internos. O proxy HTTPS existente, inclusive CloudPanel, permanece responsável pela entrada pública.

### 4. Conferir interface, fila e cache PWA

Verificar `/health/ready`, revisão Alembic, login e versão informada em `/build-info.json`. Confirmar que app e workers estão saudáveis e que jobs de teste saem da fila com resultado verificável. Não considerar a integração funcional apenas porque sua configuração foi salva.

No navegador/PWA, concluir formulários abertos, fechar abas antigas e carregar a versão atual após a atualização. Conferir a versão do frontend. Se ainda houver recursos antigos, atualizar o service worker ou remover somente seu registro e os caches de recursos estáticos para esse domínio, recarregando em seguida. Não apagar cadastros, arquivos, cookies ou armazenamento local indiscriminadamente como procedimento de atualização.

### 5. Recuperação em caso de falha

Preservar logs e o estado com falha antes de intervir. Migrations alteram o banco: voltar apenas à imagem anterior pode ser incompatível. A recuperação deve restaurar banco, arquivos/bucket, `.env`, chaves e imagem do mesmo ponto de recuperação, em manutenção planejada. Não executar `docker compose down -v`. Consulte também [deploy/README.md](../deploy/README.md).

## Critérios de aceitação

| Área | Conferência objetiva |
|---|---|
| Cadastros | Criar e editar aluno/responsável; salvar, reabrir e navegar sem bloqueio de formulário ou tabela |
| Importação | Importar apenas um aluno escolhido sem criar escola, outros alunos ou responsáveis não selecionados; repetir a mesma seleção e conferir ausência de duplicação |
| Fichas | Emitir ficha cadastral e matrícula; conferir dados, responsáveis, turma, logo, fontes, quebra de página e arquivo histórico preservado |
| Relatórios | Comparar prévia, totais e exportações com o mesmo filtro; conferir início/fim inclusivos, três meses e escola correta |
| Bancária | Em sandbox autorizado, emitir Pix/boleto, acompanhar o worker, conciliar o retorno e distinguir confirmado de recebido; conferir repetição sem cobrança duplicada |
| Diário | Lançar aula com mais de uma unidade, chamada, nota zero, avaliação e correção; consolidar conforme regra; confirmar restrição do professor à atribuição |
| Boletim | Publicar fechamento e conferir o mesmo resultado no aluno/responsável e no PDF; reabrir o período e verificar retirada da versão em correção |
| Matrícula online | Criar inscrição, enviar anexo, solicitar e responder correção, aprovar e efetivar conforme os requisitos configurados |
| Comunidade | Publicar notícia pública e evento restrito; conferir audiência, escola, programação e expiração em acessos distintos |
| Mailcow | Validar domínio/API, criar caixa de teste pelo worker, conferir consulta única de senha e repetição sem duplicação |
| Assinaturas | Assinar pela escola, receber assinatura do responsável, rejeitar e reenviar; conferir integridade, CPF, revisão e bloqueio de retorno GOV.BR repetido |
| Atualização | Confirmar migrations, saúde dos serviços, frontend atualizado, acesso a fotos/documentos e possibilidade de restauração do backup |

Esses critérios incluem verificações no ambiente de destino. A conclusão dos testes locais, os totais finais e os arquivos de evidência devem acompanhar o commit/PR da entrega. Este documento não atribui números de testes nem substitui o resultado da validação integrada.

## Limites e pendências operacionais

- **Homologação remota:** não foi concluída com credenciais e serviços reais da escola para Asaas, Mailcow, GOV.BR, WhatsApp ou SMTP. Mocks verificam contratos e tratamento de falhas, mas não comprovam disponibilidade ou liberação da conta real.
- **PostgreSQL e containers:** execução com PostgreSQL real, concorrência/locks e E2E Docker continuam como gate de CI e de implantação. Testes SQLite não demonstram comportamento concorrente do PostgreSQL.
- **Assinatura A3:** utilização de assinador externo e envio do PDF. Não houve validação física de token/cartão neste ambiente.
- **GOV.BR:** depende de aprovação e credenciais oficiais compatíveis, Login Único, ambiente correto e URLs cadastradas. A integração permanece indisponível quando esses requisitos não forem atendidos.
- **Mailcow:** exige servidor já instalado, domínio operacional e API autorizada. O recurso provisiona caixas; não instala o servidor nem substitui a configuração SMTP transacional.
- **Relatórios:** pendências e situações cadastrais/financeiras refletem o estado atual. O financeiro usa vencimento e valor nominal. O boletim publicado depende de fechamento; não há aprovação anual implícita.
- **Importação:** depende do esquema legado reconhecido, dos registros selecionados e dos arquivos de mídia fornecidos. Caminho local referenciado no SQLite não torna a foto disponível sem o arquivo correspondente.
- **PWA:** interface Web/PWA preservada. Não se declara sincronização offline de cadastros ou dados escolares privados como recurso desta entrega.
- **Distribuição:** este pacote não comprova merge, release, imagem publicada ou deploy. A disponibilização remota e a implantação precisam de evidência própria e devem seguir o fluxo autorizado do projeto.
