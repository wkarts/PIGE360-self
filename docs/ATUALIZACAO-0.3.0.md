# Atualização para 0.3.0

## Preparar

Agende janela de manutenção. Preserve `.env`, os volumes `postgres_data`/`documents_data`, o nome do projeto Compose e o diretório de implantação. Guarde uma cópia do código/imagem anteriores. O pacote novo não contém credenciais nem banco.

Execute o backup da instalação existente. Na versão nova, `scripts/backup.sh` interrompe app **e worker** durante o dump e a cópia dos documentos, retomando os serviços que estavam ativos ao final. Ele gera banco, arquivos e manifesto com hashes, mas não cifra os artefatos automaticamente. Proteja os arquivos e salve `.env` separadamente.

```bash
sh scripts/backup.sh
```

Não rode o script contra uma instalação ainda não configurada. Ele depende de Docker/PostgreSQL reais e deve ser testado no seu ambiente.

## Aplicar

Substitua o código pelos arquivos desta versão sem remover `.env` ou volumes. O diretório `reference` antigo pode ser removido da cópia de código: deixou de fazer parte do produto e não é usado em runtime.

```bash
python3 scripts/prepare-upgrade.py
# Confira as opções acrescentadas; configure SMTP e allowlist da Connect API.
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 app worker
```

O preparador faz backup de `.env` antes de editar, preserva `APP_SECRET_KEY`, `SETUP_TOKEN`, `POSTGRES_PASSWORD` e a chave de integração existente. Acrescenta `INTEGRATION_ENCRYPTION_KEY` apenas quando ausente/vazia. Não substitui silenciosamente chave inválida.

Se `APP_IMAGE` é a imagem local da versão 0.1/0.2, atualiza para `pige360-self:0.3.0`. Para tags de registro próprio, escolha a tag pelo seu procedimento de distribuição; o script não publica imagens nem altera repositórios.

O startup aplica Alembic até `0003_online_admissions`. Não reescreve `0001_secretary`/`0002_protocol_events`. A nova migration cria 12 tabelas: processos de inscrição, contas/sessões/códigos do portal, inscrições/mensagens/anexos, conexões/jobs/webhooks e cobranças/eventos. As migrations anteriores permanecem byte a byte iguais à base 0.2.0 fornecida.

Agora existem três serviços: `app`, `db` e `worker`. Somente `app` publica porta; a porta e os volumes da instalação anterior são mantidos.

## Conferir

Valide login administrativo, seleção da escola, cadastros anteriores, PDF antigo, dashboard e saúde do worker. Crie um processo exclusivamente de teste, use dados sintéticos, confirme o contato, envie uma inscrição e finalize a matrícula. Teste o ASAAS em sandbox e a instância de WhatsApp de homologação antes da produção.

Guarde `INTEGRATION_ENCRYPTION_KEY` com o backup seguro. Sem a mesma chave, conexões e jobs restaurados não podem ser decifrados. Não compartilhe o `.env` em tickets ou repositórios.

## HTTPS e proxy existente

Defina `APP_URL` com o endereço público HTTPS, `COOKIE_SECURE=true` e `ALLOWED_HOSTS` compatível. Encaminhe o proxy externo para `127.0.0.1:58080` no padrão de publicação do host; ajuste o destino conforme sua rede Docker. Preserve o header Host. `TRUSTED_PROXY_IPS` só deve conter IPs/CIDRs reais do proxy, nunca `*` ou rede irrestrita. Sem configuração, cabeçalhos de proxy não são confiados.

## Recuperação

Não execute downgrade de schema em produção como rollback automático: as novas tabelas contêm inscrições, anexos e cobranças. Restaure de backup em ambiente isolado primeiro. O script `restore.sh DIRETORIO --confirm-restore` é destrutivo e exige confirmação.

A restauração coloca jobs ainda pendentes/em execução em estado **incerto**, porque um efeito remoto pode ter ocorrido depois do snapshot. Concilie cobranças por consulta ao ASAAS; não reenvie mensagens/cobranças cegamente. Transações já realizadas no provedor não são desfeitas ao restaurar o banco local.

Backups/restauração, Docker e bloqueios concorrentes do PostgreSQL não foram executados neste ambiente de entrega. Há scripts e testes preparados, não uma certificação de operação em produção.
