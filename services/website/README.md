# Serviço do site institucional

O serviço atende o domínio recebido pelo reverse proxy e carrega somente a publicação pública daquela escola. Cadastre a origem HTTPS do site em **Gestão → Comunidade → Site institucional**, com a unidade escolar correta selecionada no sistema. `public_url` deve conter apenas a origem, por exemplo `https://escola.exemplo.com.br`; caminhos, parâmetros e fragmentos não são aceitos. A API impede publicar o mesmo domínio em duas escolas ativas.

Quando `WEBSITE_SCHOOL_ID` estiver vazio, o serviço envia o `Host` recebido à API interna e resolve a escola pela origem configurada. Domínio desconhecido recebe 404; conflito de configuração recebe 409. A seleção não escolhe uma escola arbitrariamente. `WEBSITE_SCHOOL_ID` continua disponível como substituição legada para uma instalação de escola única; enquanto estiver preenchido, o domínio não seleciona a publicação.

`WEBSITE_INTERNAL_TOKEN` é opcional para compatibilidade. Quando configurado, o site usa a rota interna autenticada; mantenha o valor correspondente no app e no serviço, sem expô-lo ao navegador. A seleção por domínio retorna apenas conteúdo já publicado como público.

`/health/live` confirma que o processo está ativo. `/health/ready` confirma que a API e o banco passaram pela readiness do app; ela não confirma que exista uma publicação para o domínio atual. Falhas do site incluem um código de atendimento. Os logs registram categoria, status HTTP do upstream, rota lógica, código de atendimento e impressão digital do Host, sem guardar o Host completo, corpo da API ou tokens.

## Transição de instalação legada

1. Pelo sistema, confirme qual unidade controla o domínio e publique nela a origem HTTPS exata.
2. Em implantação autorizada, deixe `WEBSITE_SCHOOL_ID` vazio e atualize somente a imagem/serviço `website`, preservando o projeto Compose, volumes, demais variáveis e segredos.
3. Valide o domínio, um domínio desconhecido (404), `/health/ready` e o portal; mantenha a configuração anterior para rollback.

Não é necessária migração de banco. A resolução usa a configuração existente por escola; nenhum dado de produção é movido ou recriado.
