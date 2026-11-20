# Instalação e atualização da candidata no Dockge

Use uma stack privada de homologação, com diretórios de dados próprios e acesso restrito à equipe. O gestor e o portal precisam de origens distintas quando se usa o serviço de portal separado. O gestor serve a pré-matrícula em `/online.html`. Antes de publicar um processo, confira o domínio e faça uma inscrição fictícia dentro da rede de teste.

## Referências e pré-requisitos

- Host Linux com Docker Engine, Compose v2 com suporte a `up --wait`, Python 3 e acesso de leitura aos pacotes privados GHCR do projeto.
- Checkout do SHA da PR, ou pasta de código do pacote de aceite com o SHA registrado em `REVISAO.txt`. Os caminhos relativos abaixo partem dessa pasta. Logs, credenciais e backups ficam fora do Git.
- A PR não publica imagem candidata. Para a revisão local, construa a imagem da aplicação e a do portal a partir da mesma revisão. A referência estável publicada em 0.12.12 é `ghcr.io/wkarts/pige360-self@sha256:003abea84a19c2ab898cbdb427ed1aa3d033390f9d66c0541f4875a36fb52e67`. Ela identifica a versão anterior. No rollback use o digest realmente instalado antes da mudança.
- Separe armazenamento para PostgreSQL, documentos, backups e serviços opcionais. No Dockge, o diretório de trabalho da stack determina os bind mounts `./data-*`. Um diretório diferente pode abrir uma instalação vazia.

## Construção e primeiro uso em uma cópia isolada

Na raiz do checkout limpo, obtenha o SHA com `git rev-parse HEAD`. No pacote sem Git, use o arquivo entregue. Exemplo em Bash para a pasta de código extraída:

```bash
set -eu
REV=$(cat REVISAO.txt)
docker build --build-arg SOURCE_REVISION="$REV" --build-arg APP_VERSION="$(cat VERSION)" -t "pige360-aceite:$REV" .
docker build -f services/portal/Dockerfile --build-arg SOURCE_REVISION="$REV" --build-arg APP_VERSION="$(cat VERSION)" -t "pige360-portal-aceite:$REV" .
python3 scripts/configure.py --channel develop --port 48081 --url https://gestao.hml.example.test --env-file deploy/dockge/.env
```

No checkout, substitua a atribuição de `REV` por `REV=$(git rev-parse HEAD)`. O gerador cria os segredos localmente. Para atualização, parta da configuração protegida já em uso. Preserve chaves e senhas existentes.

Edite `deploy/dockge/.env`. Substitua os exemplos de origem pelos nomes da rede de teste e os marcadores de SHA pelo valor literal de `REV`.

| Variável | Valor para o ensaio |
|---|---|
| APP_IMAGE / PORTAL_IMAGE | `pige360-aceite:<SHA>` / `pige360-portal-aceite:<SHA>` |
| APP_PULL_POLICY | `never` para a aplicação construída localmente |
| APP_URL / PORTAL_PUBLIC_URL | Origens HTTPS do gestor e do portal de teste |
| APP_BIND / PORTAL_BIND | `127.0.0.1` atrás do proxy do host |
| APP_PORT / PORTAL_PORT | `48081` / `48083`, se disponíveis |
| ALLOWED_HOSTS | Host do gestor, localhost e 127.0.0.1 |
| COMPOSE_PROFILES | `portal` para o ensaio com documentos locais. Use `s3,infra,portal` se estiver homologando MinIO, Redis e RabbitMQ |
| STORAGE_BACKEND | `local` no primeiro ensaio. Para MinIO mantenha os parâmetros S3 gerados |
| REDIS_URL / RABBITMQ_URL | Vazios no ensaio sem o perfil infra |
| PORTAL_INTERNAL_TOKEN | Mesmo segredo gerado para o portal e a aplicação |
| COMPOSE_PROJECT_NAME | Nome exclusivo da cópia, com diretório novo de dados |
| SMTP_HOST / CONNECT_API_BASE_URL / CRM_BRIDGE_ENABLED | Vazios para os dois hosts externos e `false` para a ponte no ensaio local |

Use proxy HTTPS também para o portal e confira seu encaminhamento à porta do portal. Restrinja o acesso da homologação antes de abrir um processo. Dentro da aplicação, deixe os provedores desativados até ter uma conta de teste e destinatários controlados.

Na pasta da stack Dockge, coloque o `compose.yaml` e o `.env` correspondente. Para a receita a seguir, mantenha a cópia em `deploy/dockge`. O portal já deve estar construído localmente. As imagens auxiliares precisam estar disponíveis no GHCR ou no cache do host.

```bash
dc() { docker compose --env-file deploy/dockge/.env -f deploy/dockge/compose.yaml "$@"; }
dc config --quiet
dc up -d --no-build --wait --wait-timeout 300
dc ps
dc exec -T app python -m alembic current
curl --fail --silent --show-error https://gestao.hml.example.test/health/ready
curl --fail --silent --show-error https://portal.hml.example.test/health/ready
```

O processo de entrada da aplicação executa `alembic upgrade head` antes de receber tráfego. A revisão candidata é `0058_finance_role`. Ela amplia a restrição de papéis em `users`. Os perfis atuais continuam válidos. O Financeiro recebe acesso às cobranças e à leitura da matrícula necessária para localizar o pagador. Direção ou Administração provisiona o operador uma vez em Usuários.

## Atualização e recuperação

1. Registre o SHA, os digests ou IDs locais de todas as imagens em uso, o projeto Compose, os bind mounts e a revisão de Alembic. Guarde uma cópia protegida do `.env`, da chave de criptografia de integrações e das credenciais de armazenamento. Agende a janela de manutenção.
2. Gere backup consistente de banco, arquivos e raízes de confiança. Para armazenamento local, a partir da raiz, use o comando abaixo. O script interrompe as gravações durante a cópia e restabelece os serviços que estavam rodando. Para S3/MinIO, use o pacote v2 de backup da aplicação, que inclui os objetos referenciados, ou snapshot coordenado do banco e do bucket. Confira o pacote em um destino isolado.
3. Feche o acesso à stack, pare app e workers e troque as referências das imagens. Suba com a configuração existente e confira a revisão. Verifique página de login, saúde, leitura de PDF antigo, relatório da turma e portal com uma conta vinculada. Repita os dois casos do treinamento. Só depois reabra o acesso.
4. Para recuar após migração ou gravação incompatível, mantenha tráfego e workers parados, preserve o estado atual e restaure **banco e arquivos do mesmo ponto**, com as chaves e imagens anteriores. A volta direta da revisão de papel financeiro é recusada enquanto houver contas ou perfis com esse papel. Analise gravações feitas depois do backup antes da troca.

```bash
export PIGE_STACK_DIR=deploy/dockge PIGE_ENV_FILE=deploy/dockge/.env
sh scripts/backup.sh /caminho/privado/backup-pre-atualizacao
python3 scripts/verify_backup.py /caminho/privado/backup-pre-atualizacao
```

Para restaurar um backup local v1, confirme primeiro que a stack selecionada é a cópia de recuperação e que as referências das imagens já correspondem ao snapshot. Execute `sh scripts/restore.sh /caminho/privado/backup-pre-atualizacao --confirm-restore`. Para um pacote v2 use o procedimento offline `python -m app.backup_restore /caminho/no-container/pacote.zip --confirm-offline-restore` em container de manutenção da aplicação com os volumes, bucket e ambiente do destino. O serviço de banco e o armazenamento precisam estar disponíveis. Preserve o pacote e a proteção pré-restauração. As sessões são revogadas e as operações externas incertas precisam de conciliação antes de reativar workers. Revalide login, números de matrículas, arquivos e boletins.

O ensaio entregue cobre restauração com PostgreSQL em banco independente e PDF em armazenamento local. A subida desta candidata em Docker/Dockge e a recuperação do bucket específico do colégio dependem do ambiente de infraestrutura.

### Revisão com vigência curricular e prévia do Educacenso

Construa a aplicação, o site e os portais a partir do mesmo commit da PR e configure as imagens privadas da stack. Identifique a candidata pelo SHA de origem e pelo ID ou digest efetivamente obtido na construção. A abertura de uma PR em rascunho não fornece digest de candidata no GHCR.

As migrations Alembic `0060_component_validity` e `0061_census_preview` acrescentam a primeira data sem oferta do componente e a habilitação da prévia por escola. Na atualização, preserve as chaves, os volumes de documentos e o banco. Antes de subir, guarde as referências das imagens em uso, a configuração protegida e a cópia consistente. Para storage local, na raiz do checkout, ajuste os caminhos da stack:

```sh
export PIGE_STACK_DIR=deploy/dockge
export PIGE_ENV_FILE=deploy/dockge/.env
sh scripts/backup.sh /caminho/privado/backup-pre-atualizacao
```

Para S3/MinIO use o procedimento de portabilidade de banco e objetos da instalação. Em uma segunda stack com dados próprios e comunicações externas bloqueadas, valide prontidão e autenticação por perfil, a mesma matrícula ativa, a turma, o PDF e o histórico. Confirme a revisão do banco com `alembic current` no serviço da aplicação. A Direção pode pausar a prévia em Integrações → Educacenso.

Se a candidata precisar ser retirada, pause as gravações, os consumidores de filas e as emissões externas. Volte às imagens anteriores registradas. Se a compatibilidade com o esquema anterior ou os dados gravados depois da atualização exigir restaurar o banco, reconcilie essas gravações e recupere banco e documentos do mesmo ponto. Para storage local, `sh scripts/restore.sh /caminho/privado/backup-pre-atualizacao --confirm-restore` substitui os dados da stack selecionada. Faça o ensaio primeiro na cópia isolada. Confira o histórico, o PDF e as ordens financeiras pendentes antes de liberar os trabalhadores de fila.
