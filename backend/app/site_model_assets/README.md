# Fotografias demonstrativas dos modelos V2

Os seis JPEGs são ilustrações geradas por IA, extraídas dos mockups aprovados de Projetos e Comunidade. Não são fotografias de clientes nem evidência de atividades de uma escola real.

São usados somente pelo catálogo demonstrativo solicitado explicitamente no editor. A leitura do catálogo não altera configurações, publicações nem banco de dados. Cada instância inclui `design.demonstration=true`; a publicação exige `confirm_demonstration=true` em cada operação de publicação. A presença de uma URL deste catálogo mantém o marcador demonstrativo, mesmo que um cliente tente removê-lo. Para publicar sem a identificação demonstrativa, substitua todas estas fotos e revise os textos/datas antes de desmarcar a opção.

Arquivos públicos permitidos: `garden.jpg`, `community.jpg`, `library.jpg`, `theatre.jpg`, `lab.jpg` e `sport.jpg`. A rota aceita apenas esses nomes, entrega `image/jpeg` com `nosniff` e cache de 24 horas. Prévia administrativa embute esses arquivos como dados JPEG para funcionar entre domínios sem dependência de cookies.

Não substituir silenciosamente estas imagens por fotos reais. Fotos enviadas pela escola continuam usando o armazenamento e as verificações de propriedade/publicação do site escolar.

## Aplicação e recuperação

`POST /schools/{id}/website/apply-model` recebe `{model_id, website}`. O objeto `website` contém o estado atual do editor, inclusive alterações ainda não salvas, e a versão esperada. Sob o mesmo lock/transação, a primeira aplicação guarda esse estado em `model_checkpoint` e grava o modelo somente em `draft`. Aplicações seguintes conservam o primeiro checkpoint. Páginas institucionais, domínios, identidade, topo fixo e barra mobile são preservados na composição aplicada. O site publicado não muda.

Após recarregar, a configuração privada informa `has_checkpoint`; o conteúdo da cópia não é enviado nas respostas. `POST /schools/{id}/website/restore-model` recebe `{version}`, restaura a cópia no rascunho e limpa o checkpoint atomicamente. A restauração inclui URLs e identidade do estado anterior; continua sem publicar. Versões obsoletas retornam 409. Fotos privadas usadas pela cópia não podem ser excluídas e não se tornam públicas por estarem no checkpoint.

A migração `0055_website_model_checkpoint` adiciona uma coluna JSON nullable. Upgrade preserva configurações e rascunhos existentes. Downgrade remove exclusivamente a cópia de recuperação: os conteúdos publicados e rascunhos permanecem, mas o checkpoint será perdido. Antes de um rollback que remova a coluna, restaurar a cópia necessária ou manter backup do banco.
