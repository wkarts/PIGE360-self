# Deploy do PIGE360 Self

A aplicação é um único produto Web/PWA. O Compose publica somente a porta da aplicação; PostgreSQL e worker permanecem na rede interna. Nginx, Traefik e outro proxy não fazem parte da stack. Arquivos e fotos usam armazenamento privado: local persistente por padrão, ou bucket S3/MinIO quando `STORAGE_BACKEND=s3`.

## Develop

Na máquina ou VPS de desenvolvimento:

\`\`\`bash
python3 scripts/configure.py \
  --channel develop \
  --env-file .env.develop \
  --url https://dev.escola.exemplo.com.br

docker compose --env-file .env.develop -f deploy/compose.yaml pull
docker compose --env-file .env.develop -f deploy/compose.yaml up -d --wait
docker compose --env-file .env.develop -f deploy/compose.yaml ps
docker compose --env-file .env.develop -f deploy/compose.yaml logs --tail=100 app worker
\`\`\`

A porta padrão é \`127.0.0.1:58081\`. O proxy do CloudPanel deve encaminhar o hostname para essa porta.

Para bucket S3/MinIO, preencha `STORAGE_BUCKET`, `STORAGE_ENDPOINT_URL`, `STORAGE_REGION`, `STORAGE_ACCESS_KEY` e `STORAGE_SECRET_KEY` no `.env.develop`. Use `STORAGE_USE_SSL=false` somente para um MinIO interno em HTTP; o endpoint não é exposto pelo Compose.

## Production

Na instalação de produção:

\`\`\`bash
python3 scripts/configure.py \
  --channel stable \
  --env-file .env.production \
  --url https://escola.exemplo.com.br

# Revise APP_IMAGE, ALLOWED_HOSTS, SMTP_* e TRUSTED_PROXY_IPS.
docker compose --env-file .env.production -f deploy/compose.yaml pull
docker compose --env-file .env.production -f deploy/compose.yaml up -d --wait
docker compose --env-file .env.production -f deploy/compose.yaml ps
docker compose --env-file .env.production -f deploy/compose.yaml logs --tail=100 app worker
\`\`\`

A porta padrão é \`127.0.0.1:58080\`. Em produção, substitua \`APP_IMAGE\` por uma tag numérica da release aprovada quando o fluxo de release estiver concluído.

O bucket deve ser privado e acessível somente pela aplicação. Em AWS/S3, use uma política limitada ao bucket configurado. Em MinIO, use um bucket dedicado por instalação e credenciais próprias; a aplicação cria o bucket na inicialização quando `STORAGE_AUTO_CREATE_BUCKET=true`.

## Atualização e rollback

1. Faça backup do PostgreSQL, do volume \`documents_data\` (quando o backend for local), do bucket S3/MinIO (quando configurado) e do arquivo \`.env\` correspondente.
2. Preserve \`COMPOSE_PROJECT_NAME\`, volumes e \`INTEGRATION_ENCRYPTION_KEY\`.
3. Baixe a imagem aprovada e execute \`up -d --wait\`.
4. Confira \`/health/live\`, \`/health/ready\`, login, permissões e fila do worker.
5. Para rollback, restaure a tag anterior em \`APP_IMAGE\` e execute novamente \`pull\` e \`up -d --wait\`.

Não use \`docker compose down -v\` em uma atualização. As migrations \`0004_unified_profiles\` e \`0005_secretaria_people_storage\` são evolutivas e preservam os dados existentes; confirme o backup antes de aplicá-las.
