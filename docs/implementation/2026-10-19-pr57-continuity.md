# Continuidade operacional da PR 57

Repositório exclusivo `wkarts/PIGE360-self`. Origem conferida pela integração GitHub: PR 57 aberta, `feature/academic-admission-completion` → `develop`, HEAD `37a6fd8364f02aa807814026e827b07a4575382b`. A cópia local foi reconstruída das 550 entradas Git e todos os blobs conferidos por SHA-1 Git antes de alterar. O ZIP 1.1.2 anexado foi inventariado como referência histórica; não substituiu o código remoto atual 0.12.1.

Esta entrega atualiza a mesma PR. Não executa merge, release, DNS, SSH ou deploy na escola. Os comandos Docker dos testes referem-se exclusivamente a stacks descartáveis `pige360-ci-*`.

## Matriz de requisitos e evidências

| Requisito | Implementação verificada | Teste/evidência reproduzível | Limite externo ou decisão |
|---|---|---|---|
| Estrutura acadêmica, vínculos e capacidade | Preservados `registry.py`, `admissions.py`, `admission_reservations.py` | Suíte backend; `test_admission_reservations.py`; `e2e-online.py`, `e2e-workspace.py`, `e2e-completion.py` no CI | Prazo comercial é definido pela instituição |
| Matrícula, retomada e documentos | Fluxo existente preservado no portal de inscrições | Testes de inscrição, reserva, última vaga concorrente PostgreSQL, pagamento e reativação | Nenhum pagamento real foi feito |
| Família assina primeiro; A1 institucional no fim | `contract_signatures.py`, `personal_signing.py`, histórico imutável e assinatura incremental preservados | `test_online_contract.py`, `test_personal_signing.py`; E2E de contrato no CI | ICP-Brasil/A1 real e política de assinatura digitalizada continuam pendentes |
| OCR local revisável | Worker e limites existentes preservados | `test_assisted_intake.py`, `e2e-assisted.py`; smoke executa motor dentro da imagem | Documentos reais autorizados ainda precisam de avaliação; não há taxa de acerto real declarada |
| Backup externo interrompido | `backup_delivery.py`, outbox `backup_send`, identidade persistida e conciliação por conteúdo | `test_continuity_operations.py`: aceite perdido, restart, limites, hash Dropbox e conflito | Drive/Dropbox testados com transportes simulados, não com contas reais |
| Importação persistente e retomada | `import_operations.py`, fila `legacy_import`, pacote privado, etapas/contagens e transação única | Testes de refresh/repetição, falha intermediária, rollback e restart; UI com polling | Pacotes ficam preservados; frequência/retenção não são inferidas |
| Restauração visual segura | `restore_control.py`, preparação administrativa; execução offline no deployer existente | Pré-validação/permissões no backend; falha/cancelamento e configuração no CI unitário; `surfaces-smoke.py` executa UI e restore real Docker | Somente PostgreSQL e pacote v2 com schema compatível; nunca produção nesta tarefa |
| Recuperação de objetos MinIO | Smoke apaga os objetos originais e verifica indisponibilidade antes do restore | `backup-smoke.py`: bytes, SHA-256, metadados e banco; pacote corrompido recusado | Bucket exclusivamente descartável do CI |
| Portabilidade delegável | Habilitação/delegação existentes mantidas e revalidadas no worker | Testes positivos/negativos, isolamento institucional e permissão revogada | Delegação não concede backup/restore/diagnóstico global |
| Financeiro nativo e ponte opcional | Configuração, recibos, mapeamentos e reenvio existentes preservados | Suíte `test_crm_bridge.py`, testes bancários e E2Es existentes | Recibo de transporte não é pagamento; emissão/baixa remota não habilitadas por inferência |
| Site público separado | `services/website`, três modelos; token interno dedicado opcional e compatibilidade com publicações públicas anteriores | E2E dos três modelos, publicação privada bloqueada e falha da API; smoke Docker percorre API → site | DNS/proxy real da escola não alterados |
| Portal privado separado | `services/portal`, `family_portal.py`, Vue pré-compilado; imagem/porta próprias e proxy com rotas permitidas | E2E login/logout, aluno, dois/um/nenhum dependente, revogação, deep link/refresh, origem inválida e API indisponível | Contas de inscrição e acesso escolar continuam identidades distintas |
| Convite automático | `user_invitations.py`, `User.email`, hash/expiração/revogação/uso único e outbox SMTP criptografada | Backend e E2E UI → SMTP TLS local capturado → senha → login; concorrência PostgreSQL no CI | Aceite SMTP não comprova entrega/leitura. Nenhum e-mail real enviado |
| Deployer e instalação existente | Mesma ferramenta: URLs/portas/perfis, preservação de `.env`, preview, planos/execução de restore | `test_deployer_recovery.py`, testes de atualização existentes, smoke visual na stack adotada sem trocar projeto | GUI Windows executada apenas no self-test do artefato pelo CI, não interativamente neste ambiente Linux |
| Versionamento e GHCR | Versão canônica 0.12.1 mantida; portal incluído no mesmo conjunto por digest/SHA | Testes de promoção/rollback de cinco imagens; build Docker no CI | Nenhuma release publicada; bancos por unidade continuam adiados |

## Arquitetura do portal e sessões

O navegador acessa somente o domínio do portal. Um servidor HTTP sem dependências extras serve o Vue pré-compilado e encaminha uma lista fechada de rotas à API interna. Não recebe segredo administrativo nem credenciais de banco. Não encaminha headers de host/proxy arbitrários. URLs internas Docker nunca entram no JavaScript.

O acesso escolar usa `User`/`SchoolAccess`, JWT curto apenas em memória e refresh em cookie HttpOnly, host-only, SameSite, com os mesmos controles de expiração/rotação do núcleo. `PORTAL_PUBLIC_URL` é uma origem exata, distinta de `APP_URL`; em domínio público exige HTTPS. Backend e proxy validam a origem e o cabeçalho CSRF. Não há CORS irrestrito. Logout do acesso escolar também encerra a sessão de inscrição no mesmo portal, quando presente.

O núcleo revalida pessoa, perfil e vínculo ativo em cada consulta. Notas reutilizam `own_profile_students`; documentos precisam pertencer ao aluno autorizado. Financeiro exige vínculo de responsável explicitamente financeiro e retorna somente cobranças das matrículas autorizadas. Não há cobrança, baixa ou recibo inventado. Aluno não herda permissão financeira. A troca de dependente é validada pelo servidor; o ID da URL não concede acesso.

`/online.html` mantém a inscrição existente, com cadastro/retomada, documentos, mensagens e contrato. `PortalAccount` e `User` não são fundidos por e-mail. A interface explica a distinção e permite navegar entre os acessos. As rotas antigas no gestor permanecem disponíveis. O service worker do serviço privado não armazena respostas ou documentos offline.

## Convites e recuperação de envio

O cadastro administrativo agora enfileira convite automaticamente na mesma transação de usuário/vínculo. O destinatário é `User.email`; a caixa `SchoolMailbox.address` é independente e o provisionamento Mailcow permanece intacto. Usuário existente recebe apenas novo vínculo compatível; a senha não é redefinida e não é criado convite de primeiro acesso indevido. Repetição na mesma escola continua conflito controlado.

O formulário não pede senha inicial. A API anterior ainda aceita senha explícita com pelo menos 12 caracteres para preservar consumidores existentes. Sem esse campo, grava somente hash de segredo aleatório inacessível e aguarda a definição pelo convite. Nunca envia senha em e-mail.

Token de 48 bytes aleatórios, hash no registro e link apenas na outbox criptografada. `INVITATION_HOURS` tem padrão técnico de 24 horas, configurável entre 1 e 168; não define política comercial da escola. A criação exige a chave de criptografia já gerada pelo configurador. Falha de configuração SMTP não desfaz um usuário validamente cadastrado: fica visível como falha do job.

O link usa origem confiável configurada e token no fragmento. A página remove o fragmento do histórico, usa `Referrer-Policy: no-referrer` e não possui analytics ou terceiros. Inspeção não consome o convite. Consumo ocorre somente no POST explícito, com locks e compare-and-set. Revoga sessões anteriores. Inativação/arquivamento/redução de acesso e desativação do perfil revogam convites pendentes; restauração de banco também os invalida.

Reenvio exige autorização, espera mínima de 60 s e revoga o link anterior atomicamente. Usuários mostra estado de ativação separado do envio, tentativas e diagnóstico sanitizado. Atualizar usuários consulta o estado real. `completed` significa aceite SMTP, não entrega na caixa. Timeout/restart durante envio vira `uncertain`, sem reenvio automático. Reenviar pela área de Usuários cria um novo link e invalida o antigo; SMTP pode produzir mensagens duplicadas, mas não múltiplos acessos válidos. Payload criptografado é descartado após uso, revogação, expiração ou aceite SMTP quando não precisa mais ser enviado.

## Importações duráveis

`POST /schools/{id}/legacy-import/operations` valida a seleção e grava pacote privado com UUID, fingerprint e outbox. Retorna 202; não prende toda a importação ao HTTP. `GET .../operations` persiste histórico, etapa, contagens reais, tentativas, erros e resumo. `POST .../{id}/resume` tem autorização, limite de cinco tentativas e espera mínima de 30 s.

A aplicação dos cadastros permanece uma transação: pessoas, vínculos, matrículas e histórico são confirmados juntos. Checkpoints de observação são gravados atomicamente no volume compartilhado, fora da transação PostgreSQL; o heartbeat evita retomar uma execução ainda ativa; não representam commits parciais de alunos. Interrupção reprocessa a transação, usando fingerprint e mapeamentos existentes. Intenções de gravação de objetos são registradas em arquivo durável antes de escrever; na retomada, objetos sem referência confirmada são limpos antes de repetir. Não são apagados objetos referenciados por dados já confirmados.

Importados continuam inativos e matrículas antigas continuam rascunhos. Não cria convites para usuários legados inativos. Autorização/delegação é revalidada na execução e na retomada. A interface consulta a operação após refresh e atualiza os catálogos do gestor quando ela termina. O endpoint síncrono anterior é mantido para compatibilidade; a interface nova usa a operação persistente.

## Backup remoto e reconciliação

O envio usa a outbox existente. Persiste tentativas, lease, horários, resultado e auditoria. Em Drive, um ID é alocado e confirmado no banco antes de criar o arquivo; a retomada consulta esse mesmo ID. Em Dropbox, o caminho determinístico usa `add`, sem autorename; a reconciliação compara tamanho e o content hash em blocos de 4 MiB. Drive compara nome, pasta, tamanho e MD5 de arquivo binário. O SHA-256 local continua obrigatório antes do envio. Upload sem confirmação de conteúdo não é marcado concluído.

Falhas HTTP confirmadas, resultado desconhecido e cópia confirmada têm estados distintos. Até cinco tentativas, backoff existente e espera mínima de 30 s para retomada manual. Token é renovado pela tela mantendo a identidade original de pasta/provedor. Mudar o destino exige voltar à configuração original antes de recuperar um envio existente.

Envios legados sem identidade persistida exigem confirmação explícita de conta/pasta original; `sending` antigo só pode ser recuperado após 30 min. Drive procura o nome determinístico; múltiplos candidatos ou conteúdo divergente exigem revisão. Se nada for encontrado, a criação de nova cópia exige autorização explícita pela tela e pode duplicar uma cópia antiga não visível à consulta. Isso não é apresentado como garantia de envio único. O pacote local permanece preservado.

Referências de protocolo consultadas: [uploads Drive](https://developers.google.com/workspace/drive/api/guides/manage-uploads), [content hash Dropbox](https://docs.dropboxapi.com/dropbox-api/docs/technical-reference/content-hash). OAuth interativo/refresh automático de tokens não foram acrescentados.

## Restauração visual e falhas

1. Administrador da instalação abre Portabilidade → Backup. Seleciona um pacote local concluído ou carrega um ZIP. Upload tem limite configurável `RESTORE_MAX_UPLOAD_MB` (1024 MiB por padrão); pode usar pacote local maior no histórico.
2. A aplicação verifica formato, caminhos, checksums, nomes de bucket, schema Alembic e confiança. Pacotes v2 antigos sem revisão de schema não são aceitos nessa jornada visual: precisam do procedimento offline adequado à versão original. Não adivinhar compatibilidade.
3. A preparação gera plano válido por uma hora, com hash, escopo, objetos e texto `RESTAURAR <id>`. Isso não restaura nem para serviços. Usuário delegado da importação não recebe esse privilégio.
4. Administrador autorizado do host acessa o deployer por túnel local já suportado. Consulta o plano e digita sua confirmação exata. Confirmação cancelada/incorreta não para serviços.
5. O deployer usa a composição existente e o mesmo nome de projeto. Valida o pacote, obtém exclusão mútua persistente por stack e para escritores, incluindo gestor, workers, site e portal. Banco/MinIO/monitor de armazenamento continuam necessários.
6. O comando fixo `app.restore_control` preserva backup completo do estado anterior, repõe objetos e restaura PostgreSQL em transação. Invalida sessões e convites pendentes e marca efeitos externos para conciliação. O painel não aceita comando arbitrário ou caminho de sistema.
7. Somente após resultado concluído o deployer inicia a composição e espera saúde. Diários ficam fora do banco substituído. Acompanhar restauração permite consultar etapas/resultado após refresh.

Se houver falha crítica, mantenha escritores parados. O histórico do deployer registra `failed` ou `interrupted`; o diário do volume registra etapa e ID do backup prévio. Não repetir um plano já usado nem ligar serviços com resultado desconhecido. Verifique logs sanitizados, espaço, ferramentas e diário; revalide o pacote e prepare uma operação de recuperação adequada ao estado observado. O procedimento offline `app.backup_restore` continua disponível ao operador autorizado. Uma falha de rede após `up --wait` provoca nova parada dos escritores. O rollback de schema não é automaticamente seguro nem preserva os controles novos.

## Instalação, imagens e proxy

O conjunto da aplicação passa a conter gestor, mail-agent, SOGo, website e portal, além das imagens auxiliares já existentes. O pipeline promove digests aprovados do mesmo SHA; não reconstrói na promoção. Manifests históricos até 0.12.1 continuam verificáveis com seu conjunto original. A versão fonte não foi rebaixada nem foi inventada nova release.

Os quatro adaptadores Compose têm serviço `portal`, perfil opcional, `PORTAL_IMAGE`, `PORTAL_PUBLIC_URL`, `PORTAL_BIND` e `PORTAL_PORT`; defaults locais 127.0.0.1:58083, sem alterar a porta do gestor. Website mantém sua própria porta e imagem. Perfis não são ativados em instalações existentes silenciosamente. `WEBSITE_INTERNAL_TOKEN` é gerado em novas instalações/atualizações sem substituir valores existentes e é compartilhado somente entre núcleo e site.

No deployer, Configurar site e portal valida URLs/portas, salva backup e preserva SMTP, WhatsApp, credenciais, volumes, bind, imagem personalizada e projeto. Domínios públicos exigem HTTPS e o portal externo em produção exige COOKIE_SECURE=true. Validar/salvar a configuração não executa atualização. Confira diferenças antes de uma instalação autorizada. O smoke adota uma composição personalizada resolvida com o mesmo projeto, para provar que não abre stack paralela.

No CloudPanel, cada domínio deve encaminhar para sua porta local. Preserve `Host`, `X-Forwarded-Proto` e IP do cliente no proxy que já atende o gestor; configure somente proxies confiáveis. Não exponha PostgreSQL/MinIO. Use os domínios públicos exatos no ambiente. Confirme cookies Secure em HTTPS e URLs dos convites em homologação. Nenhum DNS foi alterado.

## Testes executados e limites

Comandos locais: Python 3.13.16 em ambiente isolado; `pytest` do backend; `python -m unittest discover -s tests/ci -v`; `npm run typecheck --prefix frontend`; `npm run build --prefix frontend`; `compileall`; `python scripts/ci/validate.py`; `git diff --check`; `scripts/e2e-continuity.py` com Chromium headless instalado e SMTP TLS local.

A regressão completa posterior dessa composição aprovou 551 testes, pulou três cenários exclusivos PostgreSQL e aprovou cinco subtestes. A bateria posterior de convite/restore/usuários aprovou 27 e pulou um concorrente; testes de CI somaram 186 aprovados. O E2E de gestão posterior aprovou importação seletiva pela fila, refresh antes do worker, resultado persistido e relatórios PDF/CSV/mobile. Um teste adicional confirmou a rejeição de portal público sem HTTPS/cookie seguro. O limite RESTORE_MAX_UPLOAD_MB é encaminhado pelos quatro adaptadores. A jornada visual terminou com oito verificações e zero erros de página. Resultados da suíte final e do Docker/PostgreSQL devem ser lidos no run do SHA final da PR, não herdados do SHA de origem. Node local 24.19.0 apresentou aviso de engine; Node 22 é usado no CI/imagens. Nenhuma dependência de produção foi trocada por causa desse aviso.

`e2e-continuity.py` exercita processos reais separados para API, site e portal, SMTP TLS capturado, link, senha, login/logout, aluno, dependentes e falhas de conexão. `backup-smoke.py` remove objetos antes do restore e verifica bytes/hash/metadata; `surfaces-smoke.py` exercita site/portal construídos em Docker e restauração pela UI do deployer, incluindo confirmação cancelada e revogação de sessões. Ambos recusam destinos fora da stack CI descartável. Build/self-test do executável Windows continua no job `deployer_binary`.

Homologações ainda externas: conta Drive/Dropbox real; A1 institucional/ICP-Brasil/GOV.BR real; documentos autorizados da escola; DNS/TLS/proxy e GUI Windows interativa no ambiente do cliente. Decisões institucionais: duração comercial da reserva, aceitação de assinatura digitalizada e frequência/retenção de backups. Bancos independentes por unidade continuam estudo futuro. Esses itens não são apresentados como validados por mocks ou CI.
