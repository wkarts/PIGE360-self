# Docker: storage-init ativo e saudável

## O que mudou

O antigo `storage-init` era uma tarefa de preparação: criava `/data/documents`,
corrigia o proprietário e saía. Mesmo quando terminava com código 0, o container
ficava `Exited`, podendo aparecer como parado/vermelho no gerenciador.

O nome do serviço foi preservado para a atualização da stack. Agora ele prepara
o mesmo volume e permanece executando um **monitor de armazenamento real**:
a cada 30 segundos cria um pequeno arquivo temporário, grava, faz `fsync`, lê e
remove somente esse arquivo. O processo não é mantido vivo por `tail -f` nem por
um `sleep infinity`. Sem falhas, o estado é `running/healthy`; a cor exata depende
do gerenciador. Erros reais não são escondidos para forçar uma cor.

O healthcheck exige sucesso recente e processo vivo. Falta de espaço, acesso
somente leitura, permissão inadequada ou heartbeat antigo causam estado não
saudável. Se o armazenamento voltar a funcionar, o monitor registra recuperação.
Falha no bootstrap encerra com erro e é abrangida por `restart: unless-stopped`.
SIGTERM/SIGINT encerram o processo normalmente, sem loop de reinícios em uma
parada deliberada da stack.

## Compatibilidade e segurança

- Mesmos quatro serviços e mesmos diretórios `./data-postgres` e `./data-documents`.
- Nenhuma exclusão/migração de documentos, alteração de cadastros, bancos ou HUB.
- Preparação idempotente: só troca proprietários divergentes; preserva modos e
  conteúdo, não percorre links simbólicos e recusa links no caminho obrigatório.
- Root apenas no preparo. O monitor executa como UID/GID 10001, sem capabilities.
  O healthcheck também abandona root antes de validar a saúde.
- O serviço tem `cap_drop: ALL`, somente capabilities de preparo/drop de usuário,
  `no-new-privileges` e logs limitados. API e worker mantêm sua configuração.
- `app` aguarda `storage-init: service_healthy`, não mais sua finalização.
- Não adiciona porta, imagem de terceiros, dependência Python ou mudança de base.

A mesma configuração foi aplicada aos quatro adaptadores: Docker, Dockge,
Portainer e CloudPanel. Os testes de CI verificam os quatro serviços saudáveis,
UID/capabilities do processo, acesso como 10001 e reinicialização do monitor.

## Atualizar uma instalação existente

É preciso atualizar **o Compose e a imagem da aplicação juntos**, após a release
que contiver esta correção. A imagem antiga não possui `app.storage_guard`.
No Dockge/Portainer, atualize o conteúdo da stack pelo Compose desta entrega,
preserve os valores do `.env` e os caminhos de dados, selecione a imagem da nova
release e faça o redeploy. O serviço antigo é recriado com o mesmo nome; não
é necessário removê-lo manualmente nem criar outro volume.

No diretório da stack Docker, depois de atualizar o Compose e a tag/digest:

```sh
docker compose --env-file .env -f compose.yaml pull
docker compose --env-file .env -f compose.yaml up -d --wait --wait-timeout 240
docker compose --env-file .env -f compose.yaml ps --all
```

Não use `down -v`, não apague as pastas de dados e não substitua o `.env` real
pelo exemplo. Uma atualização do código no GitHub não muda a stack da VPS por si.
Não foi executado deploy na infraestrutura da escola por esta alteração.
