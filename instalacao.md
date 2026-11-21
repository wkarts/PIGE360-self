# Instalar e atualizar o PIGE360 Self

[Voltar à apresentação da aplicação](README.md) · [Releases](https://github.com/wkarts/PIGE360-self/releases) · [Referência dos adaptadores](deploy/README.md)

## Escolha o caminho da sua instalação

| Ambiente | Caminho |
| --- | --- |
| Servidor Linux com Docker Compose | Siga o procedimento abaixo com o [Compose do Docker](deploy/docker/compose.yaml). |
| Dockge | Use o [Compose do Dockge](deploy/dockge/compose.yaml), carregue os valores gerados para a stack e mantenha um diretório persistente exclusivo. |
| Portainer | Use o [Compose do Portainer](deploy/portainer/compose.yaml). Confira para quais pastas do host apontam todos os volumes antes de iniciar a stack. |
| CloudPanel | Use o [adaptador CloudPanel](deploy/cloudpanel/README.md) e configure o proxy HTTPS para os serviços habilitados. |
| Operação visual a partir do Windows | O [deployer e seu fluxo SSH](deploy/README.md#deployer-visual-local) permitem preparar e atualizar a stack no servidor. |

## Instalação nova com Docker Compose

1. Baixe o **Source code** da [release estável](https://github.com/wkarts/PIGE360-self/releases/latest) e extraia-o em um diretório próprio no servidor. Abra o terminal na pasta que contém `deploy/` e `scripts/`. Separe homologação e produção em diretórios diferentes, pois os volumes usam caminhos relativos.
2. Confira os pré-requisitos com `docker compose version` e `python3 --version`. O host precisa de acesso às imagens do GHCR. Reserve armazenamento para PostgreSQL e documentos. Para acesso público, prepare o domínio do gestor, certificado TLS e proxy reverso.
3. Substitua o domínio do exemplo pela origem HTTPS do gestor e gere o arquivo local de configuração. Em Dockge, Portainer ou CloudPanel, use a pasta do adaptador escolhido no caminho de `--env-file`. O configurador gera segredos para a instalação nova e recusa sobrescrever um arquivo existente.

```bash
python3 scripts/configure.py --channel stable \
  --env-file deploy/docker/.env.production \
  --url https://gestor.escola.exemplo.com.br
```

4. O canal estável gerado acompanha a imagem `latest`. Para reproduzir uma release específica, confira nas notas as imagens do produto e fixe as referências publicadas correspondentes no arquivo da stack antes do pull. Preserve as referências próprias das dependências, como PostgreSQL e MinIO. Na raiz do checkout, execute o bloco abaixo. O caminho relativo dos dados pertence à pasta do Compose.

```bash
docker compose --env-file deploy/docker/.env.production -f deploy/docker/compose.yaml config --quiet
docker compose --env-file deploy/docker/.env.production -f deploy/docker/compose.yaml pull
docker compose --env-file deploy/docker/.env.production -f deploy/docker/compose.yaml up -d --wait
docker compose --env-file deploy/docker/.env.production -f deploy/docker/compose.yaml ps
```

5. Encaminhe o domínio do gestor para `127.0.0.1:58080` no proxy do host, preservando o cabeçalho `Host`. Verifique pelo domínio HTTPS as rotas `/health/live` (versão da aplicação) e `/health/ready` (prontidão com acesso ao banco). No primeiro acesso, use o `SETUP_TOKEN` do arquivo gerado para cadastrar a instituição e o administrador. Guarde esse arquivo com acesso restrito.
6. Entre no gestor, confira a escola ativa, prepare a estrutura acadêmica e teste o login com uma conta de homologação. Para investigar uma falha de inicialização, consulte os logs da stack.

```bash
docker compose --env-file deploy/docker/.env.production -f deploy/docker/compose.yaml logs --tail=100 app worker worker-ocr
```

## Site público e portais

Confira os perfis que a **sua tag** entrega. Execute na mesma pasta usada nos comandos anteriores.

```bash
docker compose --env-file deploy/docker/.env.production -f deploy/docker/compose.yaml config --profiles
```

| Serviço | Perfil Compose | Porta local padrão em produção | Destino do domínio |
| --- | --- | --- | --- |
| Gestor | Serviço principal | 58080 | Gestão e inscrição online |
| Site institucional | `website` | 58082 | Site publicado da escola |
| Portal do aluno e responsável | `portal` | 58083 | Acesso da família |
| Portal do professor | `teacher`, nas releases que o incluem | 58084 | Acesso docente |

Para ativar uma superfície, acrescente seu perfil à seleção da stack, preservando os já habilitados. Em instalações novas, o configurador usa `s3,infra` para MinIO e serviços internos. No modelo de produção do adaptador, confira os campos de origem pública e portas para cada serviço escolhido. Configure DNS, TLS e o proxy de cada domínio para a porta correspondente, reaplique o Compose e verifique `ps`. Para o site, associe o domínio à escola e publique o rascunho pelo gestor. [Modelo de configuração](deploy/docker/.env.production.example) · [Diagnóstico de site e portal](docs/site-portal-incident.md)

## Atualizar uma instalação existente

1. Registre a versão em `/health/live`, as imagens e digests em uso, o nome do projeto Compose e os caminhos reais dos dados. Leia as notas da release de destino.
2. Faça uma cópia recuperável e teste a restauração em ambiente isolado. Com armazenamento local, o [utilitário de backup](scripts/backup.sh) atende ao layout suportado. Com S3/MinIO, ele recusa a execução. Nesse caso, coordene a cópia do PostgreSQL, dos objetos e dos arquivos locais da stack no mesmo ponto de recuperação. Proteja separadamente a configuração e as chaves.
3. Use o deployer ou a [sequência de atualização do adaptador](deploy/README.md#atualização-backup-e-rollback). Preserve o ambiente existente, diretórios e credenciais. Revise o Compose e as referências de imagem da release antes de validar a configuração, baixar as imagens e subir os serviços.
4. Confira versão e prontidão, login no gestor e nos portais habilitados e leitura de um anexo já existente. Se precisar retornar após uma migração de banco, recupere a imagem, o banco, os arquivos e as chaves do mesmo ponto verificado.

Para homologação contínua, use uma stack separada com o canal `develop`. O [guia de desenvolvimento e releases](docs/ci-cd/FLUXO-GITHUB-GHCR.md) explica como cada imagem chega ao GHCR.
