# Deploy do PIGE360 Self

Todos os artefatos de execução ficam neste diretório. Não há `compose.yaml` nem ambiente de deploy solto na raiz do repositório.

## Matriz de stacks

Cada adaptador possui o mesmo contrato, com `compose.yaml`, `.env.develop.example` e `.env.production.example` próprios:

| Adaptador | Develop | Produção | Porta padrão |
|---|---|---|---:|
| Docker CLI | `deploy/docker` | `deploy/docker` | 58081 / 58080 |
| Dockge | `deploy/dockge` | `deploy/dockge` | 58081 / 58080 |
| Portainer Stack | `deploy/portainer` | `deploy/portainer` | 58081 / 58080 |
| CloudPanel | `deploy/cloudpanel` | `deploy/cloudpanel` | 58081 / 58080 |

Os bancos e arquivos usam bind mounts relativos ao diretório da própria stack: `data-postgres/` e `data-documents/`. Duas configurações `.env` no **mesmo** diretório compartilham esses dados mesmo com projetos Compose diferentes. Para ambientes novos, crie um diretório por stack com o deployer visual; o configurador original continua disponível para uma instalação já existente. Não mova os diretórios de dados de uma instalação ativa sem um procedimento de migração.

O serviço interno `storage-init` prepara `data-documents/` e continua monitorando o volume com UID 10001 e sem capabilities. O app e os workers executam sem root; PostgreSQL mantém o próprio ajuste de permissões do diretório de dados.

## Preparar um ambiente

Execute a partir da raiz do checkout. O configurador cria segredos uma única vez e nunca sobrescreve um `.env` existente:

```bash
python3 scripts/configure.py \
  --channel develop \
  --env-file deploy/docker/.env.develop \
  --url https://dev.escola.exemplo.com.br
```

Para produção, use `--channel stable`, `deploy/docker/.env.production` e a URL pública real. Para outro adaptador, use seu próprio diretório em `--env-file`; o configurador seleciona o modelo correspondente. Depois revise `APP_IMAGE`, `ALLOWED_HOSTS`, `SMTP_*`, `TRUSTED_PROXY_IPS` e as credenciais do bucket privado, quando usado. `LEGACY_IMPORT_MAX_MB` aceita 32–512 MB e controla os arquivos da importação. `SIGNATURE_TRUST_ROOTS_DIR` aponta, por padrão, para `/data/trust-roots`, no mesmo volume persistente dos documentos. Coloque ali apenas certificados de ACs raiz conferidos.

## Deployer visual local

No host Docker, execute `python3 scripts/deployer.py` e abra o endereço e senha temporária mostrados no terminal. A interface escuta apenas em `127.0.0.1:58100`; para administrar remotamente, use um túnel SSH `ssh -L 58100:127.0.0.1:58100 usuario@servidor`. Ela permite criar uma stack isolada em `deploy/instances/NOME/`, revisar o `.env` gerado fora do Git, e depois atualizar/implantar essa stack. Também lista instalações existentes sob `deploy/docker`, `deploy/dockge`, `deploy/portainer` e `deploy/cloudpanel` sem mover seus volumes. Não exibe nem exporta segredos e não expõe o socket Docker ao aplicativo.

O botão **Atualizar** preserva `.env` e dados, acrescenta opções novas com backup protegido, valida a configuração, baixa as imagens do canal e executa `up -d --wait`. `develop` acompanha a imagem GHCR `:develop`; a produção usa `:latest` publicada pelo fluxo `main`/release. Faça backup consistente de banco, documentos e bucket antes de atualizar uma instalação com dados.

## Docker CLI

```bash
cd deploy/docker
docker compose --env-file .env.develop -f compose.yaml pull
docker compose --env-file .env.develop -f compose.yaml up -d --wait
docker compose --env-file .env.develop -f compose.yaml ps
docker compose --env-file .env.develop -f compose.yaml logs --tail=100 app worker
```

Para produção, troque `.env.develop` por `.env.production`. A imagem de produção usa `ghcr.io/wkarts/pige360-self:latest`; o ambiente de desenvolvimento usa `:develop`.

## Dockge

Crie uma stack apontando para `deploy/dockge/compose.yaml`, copie o modelo de ambiente correspondente para `.env.develop` ou `.env.production`, preencha os segredos e faça o deploy. O diretório da stack deve ser `deploy/dockge` para que os bind mounts relativos apontem para `data-postgres/` e `data-documents/` nesse mesmo diretório.

## Portainer

Em **Stacks → Add stack**, prefira uma stack a partir de Git com o diretório de trabalho controlado. Se colar o Compose no editor, substitua os dois bind mounts `./data-postgres` e `./data-documents` por caminhos absolutos persistentes do host antes de publicar. Confira os mounts reais com `docker inspect` antes de colocar dados nessa stack; o caminho relativo do editor pode pertencer ao diretório interno do Portainer. Carregue as variáveis do `.env.develop.example` ou `.env.production.example`, substitua os valores de exemplo e publique. Mantenha o stack name coerente com `COMPOSE_PROJECT_NAME` e não publique portas do `db` ou dos workers.

## CloudPanel

CloudPanel é o proxy HTTPS externo; não é inserido outro Nginx ou Traefik na aplicação. Na instalação de produção, crie o site com TLS e encaminhe:

```text
https://escola.exemplo.com.br  ->  http://127.0.0.1:58080
```

No develop, use `127.0.0.1:58081`. Preserve o header `Host`, configure `APP_URL` com a URL HTTPS pública, `COOKIE_SECURE=true` e restrinja `TRUSTED_PROXY_IPS` aos IPs/CIDRs reais do CloudPanel. O detalhamento está em [cloudpanel/README.md](cloudpanel/README.md).

## Armazenamento de fotos e documentos

Novas instalações `develop`/`stable` criadas pelo configurador usam MinIO privado com `COMPOSE_PROFILES=s3,infra`, `STORAGE_BACKEND=s3` e endpoint interno `http://minio:9000`. A API cria o bucket privado quando necessário; o volume `data-minio/` pertence ao diretório da stack. `data-documents/` continua montado para logs, certificados e leitura de arquivos antigos. Os registros de arquivos guardam seu backend original, portanto não apague esse volume ao ativar S3.

Instalações existentes com `STORAGE_BACKEND=local` permanecem locais. O script de atualização **não** muda esse valor nem habilita perfis novos. Para um S3 externo, configure as credenciais e endpoint próprios, sem ativar o perfil MinIO. Não publique as portas 9000/9001 do bucket.

O perfil `infra` executa Redis e RabbitMQ privados com credenciais próprias. O Redis sinaliza novos jobs de OCR; o RabbitMQ sinaliza jobs de integração. PostgreSQL permanece a fila persistente e os workers continuam consultando o banco se houver indisponibilidade dos sinais. SOGo usa seu próprio serviço `sogo-cache` com protocolo Memcached; Redis não substitui esse cache.

O `MINIO_IMAGE` padrão aponta para a última imagem comunitária distribuída no Quay. O upstream não publicou uma imagem para a correção de segurança seguinte e arquivou o repositório; antes de usar dados reais, avalie uma imagem corrigida sob seu controle ou um S3 compatível mantido. Mantenha MinIO sem porta pública e inclua `data-minio/` no backup. O script `backup.sh` anterior cobre PostgreSQL e `data-documents/`, mas não copia objetos do bucket.

## Atualização, backup e rollback

Antes de atualizar, registre a imagem atual por digest e faça um backup verificado do PostgreSQL e do volume `data-documents/` (inclusive `trust-roots/`) com `PIGE_STACK_DIR=deploy/ADAPTADOR sh scripts/backup.sh`. Guarde uma cópia segura do `.env` e das chaves com o mesmo ponto de recuperação. Para S3/MinIO, obtenha também um snapshot coerente do bucket; o script local não copia o bucket. Não execute `down -v` e não troque `COMPOSE_PROJECT_NAME` ou os bind mounts.

Revise as migrations da imagem nova, atualize as opções do `.env` com `python3 scripts/prepare-upgrade.py --env-file deploy/ADAPTADOR/.env.production`, ajuste `APP_IMAGE` para uma referência imutável e execute `docker compose --env-file deploy/ADAPTADOR/.env.production -f deploy/ADAPTADOR/compose.yaml config --quiet`, `pull` e `up -d --wait`. Confira `ps`, `logs`, `/health/ready`, login, importação, contratos e downloads. O app aplica migrations ao iniciar; voltar apenas a imagem anterior pode deixá-la incompatível com o banco atualizado. Se for necessário retornar, preserve o estado com falha, restaure **juntos** banco, arquivos, `.env`/chaves e a imagem anterior a partir do mesmo ponto de recuperação, em manutenção planejada. O `restore.sh` exige `--confirm-restore` e substitui dados.

Os serviços publicados são somente `app`; PostgreSQL e workers permanecem na rede interna. Confira também a saúde do `worker-ocr` após cada atualização.
