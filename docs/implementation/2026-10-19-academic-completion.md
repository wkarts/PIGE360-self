# Conclusão das jornadas do PIGE360 Self

Origem conferida em 19/10/2026: `develop` em `b04df7c215f3fd7ef13cd8c4290471f496a0db9e`, `main` em `39c9fc7567690c8a4e1a1fbfccdcc653e9557912`, com árvores iguais. Escopo exclusivo deste repositório. Esta alteração não executa merge, release ou deploy na escola.

## Inventário e incremento

| Frente | Existia | Incremento |
|---|---|---|
| Estrutura acadêmica | Unidades, períodos, séries, turnos, turmas e capacidade | Turma deixa de aceitar vínculos quando sua unidade, série ou turno está inativo/arquivado; vagas incluem reservas válidas |
| Matrícula online | Conta, rascunho, retomada, documentos, análise e ativação | Prazo financeiro configurável por processo, reserva na aprovação, expiração independente do worker, recebimento tardio em análise, renovação explícita e verificação de capacidade |
| Contrato | Modelos/revisões imutáveis, PDF, assinaturas e conferência | Novas aprovações usam família primeiro, A1 da instituição por último na efetivação; contratos anteriores mantêm a ordem histórica |
| OCR | Worker local, português/inglês, PDF híbrido, sugestões revisáveis | Limite padrão passa a 16 MiB, OSD e recuperação de rotações, divergências de nomes não são escolhidas silenciosamente, cache de resultado atualizado |
| Documentos | Armazenamento privado e SHA-256 | Anexos do portal passam a usar local/MinIO como os demais arquivos, inclusive download, OCR e incorporação ao aluno |
| Portabilidade | Prévia/fingerprint/confirmação e histórico | Habilitação em produção pela tela e delegação explícita por escola a usuários administrativos |
| Backup | Scripts locais v1 | Fila administrativa, pacote v2 consistente com PostgreSQL + arquivos locais/MinIO + trust roots, download, histórico, destino Drive/Dropbox e restauração offline com backup prévio |
| Financeiro opcional | Outbox e protocolo autenticado | Configuração criptografada pela tela, teste HTTPS sem cobrança, consulta de eventos/recibos/mapeamentos e reenvio do mesmo evento |
| Site | Notícias/eventos e conteúdo público | Serviço/imagem próprios, porta separada e três modelos configuráveis, reaproveitando publicações e marca |
| Deployer | Instalação nova e atualização de imagens/ambiente | Prévia sanitizada, mesclagem opcional do Compose, backup e validação antes da troca, saúde e logs com redação de segredos |
| Versões | Release estável 0.12.1; fontes ainda 0.10.0 | Metadados fonte reconciliados em 0.12.1; próxima versão continua calculada pelo fluxo normal |

## Operação pela interface

### Oferta, reserva e conclusão

1. Cadastre ou confira a estrutura em **Estrutura acadêmica**. Cadastros históricos não são apagados.
2. Em **Inscrições online → Processos**, selecione turmas de um único ano e, quando houver pagamento prévio, informe **Prazo de reserva para pagamento (horas)**. Não há prazo comercial padrão: a instituição o define.
3. A família cria conta, salva o rascunho, retoma, envia documentos e aceita os termos. A chave de operação e a versão impedem repetição silenciosa e sobrescrita concorrente.
4. A Secretaria analisa e concilia pessoas existentes antes de aprovar. A aprovação cria matrícula em preparação; processos com pagamento prévio passam a reservar a vaga.
5. Uma reserva não paga deixa de ocupar vaga no horário limite, mesmo sem worker. Recebimento confirmado durante a vigência fixa a reserva paga; documentação pendente não a expira.
6. Recebimento observado após liberação fica em análise. A Secretaria confere a capacidade e usa **Revisar e renovar reserva**, com justificativa. Não há recuperação automática de vaga já oferecida a outra pessoa.
7. Pagamento confirmado pelo provedor não equivale a recebido. A conciliação consulta o provedor; webhook não efetiva matrícula. Observação antiga de pendência não desfaz um recebimento já conciliado.
8. A efetivação confere pagamento, reserva, capacidade, documentos e contrato. A própria reserva não é contada duas vezes ao ativar sua matrícula. Cancelamento libera a reserva.

O PostgreSQL serializa mutações de vaga pelo lock da escola. Leituras podem atualizar a disponibilidade sem alterar registros. A duração configurada afeta novas reservas; não muda retroativamente o prazo já concedido. Aprovações anteriores à migração preservam seu estado anterior e não recebem prazos inventados.

### Contrato

Em novas aprovações, a Secretaria prepara a revisão vinculada e a emite sem exigir A1 institucional nessa emissão. A família baixa o PDF original, assina externamente e devolve pela inscrição. A Direção/Administração confere a assinatura e anexa a evidência de validação. Na efetivação, a instituição assina incrementalmente com o A1 configurado.

O fluxo atualmente aceito continua sendo **PDF com assinatura criptográfica incremental**, preservando os bytes do documento original. O candidato não é obrigado a possuir A1. A aceitação de assinatura manuscrita digitalizada ou de outros formatos continua sendo decisão institucional pendente; não são automaticamente tratados como assinatura digital verificável.

A conclusão de contrato novo exige perfil Direção/Administração e as permissões operacionais de matrícula e geração de documento. O teste usa certificados sintéticos; isso não homologa ICP-Brasil, revogação nem o VALIDAR/ITI real. Uma falha no A1 mantém matrícula em rascunho e não grava revisão institucional assinada. A ativação administrativa alternativa não contorna essa exigência. Repetir a efetivação devolve a mesma matrícula e os documentos persistidos.

Revisões anteriores da escola permanecem com a ordem de assinatura antiga. Não há conversão de PDFs já assinados nem perda do histórico. Correções de conteúdo continuam exigindo nova revisão do modelo e conferência do vínculo: uma revisão já emitida não é sobrescrita.

### OCR

O processamento permanece local, isolado do processo HTTP, com Tesseract `por+eng`, Poppler, limite de cinco páginas e retenção padrão de 24 horas. O novo padrão de upload é 16 MiB, dentro do teto já suportado pela configuração. Valores explicitamente configurados em instalações existentes são preservados pelo deployer; confira `OCR_MAX_UPLOAD_MB` e o limite geral de documentos quando quiser ampliá-los.

A orientação é avaliada antes da extração; passagens adicionais permanecem limitadas pelo timeout e pelos limites de recursos do subprocesso. Conflitos entre nomes/CPFs não escolhem silenciosamente uma pessoa. Todos os campos exigem conferência. OCR não verifica identidade, parentesco ou autenticidade.

Avaliação reproduzível: `python scripts/evaluate-ocr.py`. O arquivo [ocr-synthetic-evaluation.json](evidence/ocr-synthetic-evaluation.json) contém cinco casos sintéticos, campos esperados e duração. Foram reconhecidos os 15 campos esperados: imagem normal, rotações de 90/180/270 graus e PDF textual. Não é uma medida de acurácia com documentos reais ou fotografias ruins de clientes.

### Portabilidade

O administrador acessa **Portabilidade** mesmo quando a importação está desabilitada. A tela permite habilitar a instalação em produção e delegar o uso a Direção, Coordenação ou Secretaria com vínculo ativo na escola. Essa delegação não concede diagnóstico, auditoria, backup completo ou administração global. Revogar o vínculo, a delegação ou a habilitação bloqueia a operação no backend.

A prévia, fingerprint, confirmação e histórico continuam obrigatórios. Usuários legados continuam inativos e matrículas legadas continuam em rascunho. A conclusão atualiza o histórico da tela; não há afirmação de perda de dados no relato anterior. Importação é transacional, e o reenvio usa as proteções de deduplicação existentes.

### Backup e restauração

O bloco **Backup completo da instalação**, na Portabilidade, é exclusivo do administrador e abrange todas as escolas. **Gerar backup local** enfileira uma operação idempotente no worker. A tela informa estado, etapa, erro, tamanho e SHA-256. Atualize o histórico para acompanhar. SQLite apresenta explicitamente que geração completa exige PostgreSQL.

O pacote v2 contém dump PostgreSQL em formato custom, manifesto, arquivos privados referenciados — locais ou em MinIO — e raízes de confiança. Durante o snapshot, locks de leitura compartilhada bloqueiam gravações no acervo. Isso pode fazer solicitações de escrita aguardarem; prefira período de menor uso. O dump tem timeout de cinco minutos e aquisição de locks tem limite de dez segundos. Falhas não produzem estado de backup concluído. Arquivos temporários de OCR já expirados não bloqueiam o acervo permanente.

O diretório de backups é `backups` ao lado de `STORAGE_PATH`, normalmente `/data/backups`, no volume existente. O pacote contém dados pessoais e credenciais criptografadas. Preserve **APP_SECRET_KEY** e **INTEGRATION_ENCRYPTION_KEY** separadamente. Não há exclusão nem retenção automática. A frequência é manual até a instituição definir sua política.

A tela aceita token de acesso autorizado e pasta do Google Drive ou Dropbox. O envio é explícito por backup concluído, usa hosts oficiais fixos, TLS, limites e nenhum redirecionamento arbitrário. Dropbox usa upload por sessão; Drive usa upload retomável. Tokens expirados precisam ser renovados na tela. Timeout deixa envio **incerto** e preserva o arquivo local, sem reenvio automático que crie cópias não verificadas. Confira no destino antes de resolver um envio incerto. OAuth interativo e renovação automática de tokens não foram implementados.

Restauração v2 deve ser feita offline. Exemplo, somente após autorização operacional e cópia segura do pacote no volume:

```sh
docker compose --env-file deploy/docker/.env.production -f deploy/docker/compose.yaml stop app worker worker-ocr
docker compose --env-file deploy/docker/.env.production -f deploy/docker/compose.yaml run --rm -T --no-deps --entrypoint python app -m app.backup_restore /data/backups/pige360-ID.zip --confirm-offline-restore
docker compose --env-file deploy/docker/.env.production -f deploy/docker/compose.yaml up -d --no-recreate --wait app worker worker-ocr
```

O comando verifica manifesto e hashes, gera uma cópia do estado anterior e então restaura arquivos e banco. Em falha, mantenha a aplicação parada e use essa cópia anterior para recuperação. O bucket deve manter o nome do pacote; um ambiente isolado pode usar outro endpoint com o mesmo nome de bucket. Sessões são revogadas e efeitos de integração recuperados ficam incertos/pendentes de conciliação. Não reenvie mensagens ou cobranças cegamente após restauração. Os scripts locais v1 permanecem disponíveis para seus pacotes anteriores; v1 não deve ser confundido com o novo formato v2.

Documentação dos transportes: [Google Drive — uploads](https://developers.google.com/workspace/drive/api/guides/manage-uploads) e [Dropbox — sessões](https://docs.dropboxapi.com/dropbox-api/api-reference/user-endpoints/files/upload-session-start). Validação com contas reais de destino permanece externa.

### Integração financeira opcional

Em **Integração bancária**, o bloco da ponte permite cadastrar origem HTTPS, emitente, conta, ambiente e segredo. O segredo fica criptografado e não volta à resposta. Conexões já usadas não mudam de escopo/destino silenciosamente; solicitação e corpo originais permanecem imutáveis.

O teste faz HEAD na rota para verificar o transporte sem criar cobrança. Ele não comprova autenticação nem capacidade financeira. A tela mostra a limitação real: o protocolo atual registra solicitações e observações, mas **não emite, baixa ou ativa matrículas**. Cobranças nativas continuam independentes. Não foi alterado outro sistema/repositório para inventar suporte no destino.

### Site separado

Em **Publicidade → Notícias e agenda → Configurar site**, escolha Horizonte, Editorial ou Campus, informe domínio público, chamada, apresentação, história e mural. A marca da instalação é aplicada. Somente notícias/eventos publicados para `public` aparecem; rascunhos, públicos autenticados e dados acadêmicos não são expostos.

O serviço usa a imagem `ghcr.io/wkarts/pige360-self-website`, porta interna 8080 e API interna `http://app:8000`. Para ativá-lo, acrescente `website` a `COMPOSE_PROFILES`; configure `WEBSITE_PORT`, `WEBSITE_BIND` e, em instalação com vários sites, `WEBSITE_SCHOOL_ID`. A porta padrão nova é 58082 com bind local. O gestor preserva a porta existente. Aponte um domínio próprio no Nginx/CloudPanel para essa porta. Esse procedimento não foi executado na escola.

O site não encaminha sessões nem autentica alunos: matrícula/portal usam o endereço público configurado pela instituição. A API interna é usada somente pelo serviço para obter conteúdo público e marca. A imagem integra o mesmo fluxo de candidato/smoke/promoção por digest; não foi criado workflow de release concorrente. A verificação continua aceitando os manifestos históricos de três imagens até 0.12.1, e exige o novo conjunto nas próximas releases.

### Deployer e atualização

O deployer existente mantém instalação nova e atualização via SSH. **Conferir diferenças** apresenta nomes de serviços adicionados/alterados e parâmetros preservados, sem mostrar segredos. A opção de evolução do Compose mescla novos defaults com a configuração anterior, preservando nome do projeto, portas, volumes, ambiente e serviços personalizados. Faz backup protegido e valida o resultado antes de substituir. Sem selecionar essa opção, o comportamento anterior de atualização do ambiente/imagens é mantido.

**Saúde e logs** exibe apenas campos operacionais do Compose e aplica redação das credenciais conhecidas. Os helpers exigem Docker Compose compatível com `config --no-interpolate --no-env-resolution --no-path-resolution`. Configuração incompatível interrompe a atualização. O cliente Windows continua usando a ferramenta existente; não foi criado outro deployer.

## Migrations e compatibilidade

Migrations próprias Alembic 0040–0044 são aditivas: campos de reserva, ordem de assinatura, backend dos anexos, habilitação/delegação, configuração criptografada da ponte, histórico/destino de backup e preferências do site. Nenhum aluno, responsável ou documento histórico é removido.

O downgrade remove os novos controles e seus históricos: não deve ser tratado como rollback sem perda. Em caso de regressão, mantenha os serviços parados e use imagem/cópia anterior compatível, ou restaure o backup validado com autorização. Não execute downgrade sobre uma instalação operante com novas reservas/contratos sem plano de migração.

## Evidências e limites

Validações locais observadas antes da revisão final:

- Python 3.13.16, dependências fixadas do projeto; frontend compilado com Node 22.
- Backend: 527 aprovados, dois casos de concorrência pulados por exigir PostgreSQL; cinco subtestes aprovados. Avisos de depreciação do TestClient permanecem.
- Políticas de CI: 178 aprovadas; TypeScript strict, build pré-compilado e validador estrutural aprovados.
- E2E HTTP matrícula: 16 verificações, sem erros JavaScript, dados SQLite descartáveis, sem chamadas a provedores reais.
- E2E espaço de matrícula: sete verificações, inclusive telas de 320/390px e janela baixa, sem erros de página/HTTP.
- E2E OCR: leitura local pelo worker, revisão e aplicação pela interface; sem erros JavaScript nos fluxos exercitados.
- Teste de contrato: assinatura criptográfica sintética da família seguida pelo A1 institucional, preservação das duas assinaturas, falha sem certificado e repetição idempotente.
- CI Docker recebeu roteiro de backup/restauração real do PostgreSQL com documentos locais e MinIO, exclusivamente na stack descartável. A execução remota deve ser consultada na PR; hashes de uma fixture não substituem esse teste.

Continuam externos: homologação ICP-Brasil/ITI/GOV.BR real, contas Drive/Dropbox, destino financeiro, proxy/domínios da escola, artefato Windows no Windows e documentos reais autorizados de OCR. O ambiente local não oferece Docker nem PostgreSQL operacional, portanto não comprova sozinho esses testes.

Decisões mantidas pendentes: prazo comercial de reserva, aceitação de assinaturas digitalizadas, frequência/retenção e autorização de contas externas. Banco independente por escola/unidade permanece adiado; separação do portal em outro serviço permanece proposta, sem migração realizada.
