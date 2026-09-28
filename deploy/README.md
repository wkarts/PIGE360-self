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

Os bancos e arquivos usam bind mounts relativos ao diretório da própria stack: `data-postgres/` e `data-documents/`. Assim, cada adaptador e ambiente mantém seus dados no diretório que foi instalado. Não existem volumes nomeados ocultos para o operador.

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

O padrão local grava os dados privados em `data-documents/`. Para S3 ou MinIO, defina `STORAGE_BACKEND=s3`, `STORAGE_BUCKET`, `STORAGE_ENDPOINT_URL`, `STORAGE_REGION`, `STORAGE_ACCESS_KEY` e `STORAGE_SECRET_KEY`. O bucket deve ser privado; a API só entrega arquivos após autenticação e confere o SHA-256.

## Atualização, backup e rollback

Antes de atualizar, registre a imagem atual por digest e faça um backup verificado do PostgreSQL e do volume `data-documents/` (inclusive `trust-roots/`) com `PIGE_STACK_DIR=deploy/ADAPTADOR sh scripts/backup.sh`. Guarde uma cópia segura do `.env` e das chaves com o mesmo ponto de recuperação. Para S3/MinIO, obtenha também um snapshot coerente do bucket; o script local não copia o bucket. Não execute `down -v` e não troque `COMPOSE_PROJECT_NAME` ou os bind mounts.

Revise as migrations da imagem nova, atualize as opções do `.env` com `python3 scripts/prepare-upgrade.py --env-file deploy/ADAPTADOR/.env.production`, ajuste `APP_IMAGE` para uma referência imutável e execute `docker compose --env-file deploy/ADAPTADOR/.env.production -f deploy/ADAPTADOR/compose.yaml config --quiet`, `pull` e `up -d --wait`. Confira `ps`, `logs`, `/health/ready`, login, importação, contratos e downloads. O app aplica migrations ao iniciar; voltar apenas a imagem anterior pode deixá-la incompatível com o banco atualizado. Se for necessário retornar, preserve o estado com falha, restaure **juntos** banco, arquivos, `.env`/chaves e a imagem anterior a partir do mesmo ponto de recuperação, em manutenção planejada. O `restore.sh` exige `--confirm-restore` e substitui dados.

Os serviços publicados são somente `app`; PostgreSQL e workers permanecem na rede interna. Confira também a saúde do `worker-ocr` após cada atualização.
