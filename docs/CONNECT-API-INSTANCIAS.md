# Connect API — instâncias no PIGE360 Self

## Objetivo

A integração Connect API do PIGE360 é operacional. Ela atende notificações, automações, API, webhook e eventos da aplicação escolar. Não implementa caixa de entrada nem interface de conversação.

A conexão bancária/ASAAS permanece independente.

## Fonte da configuração

Por padrão, a instalação usa:

- `CONNECT_API_BASE_URL`
- `CONNECT_API_KEY`

`CONNECT_ALLOWED_HOSTS` é opcional. Quando vazio, somente o hostname exato de `CONNECT_API_BASE_URL` é aceito. Quando preenchido, funciona como allowlist explícita adicional.

`CONNECT_PAIRING_TIMEOUT_SECONDS` controla a espera por QR Code ou código de pareamento (padrão: 75 s; limite: 15–90 s). O provedor pode aguardar até 60 s pela autenticação. Ajuste o timeout de leitura dos proxies HTTPS à frente do PIGE360 e da Connect API acima desse limite, por exemplo 90 s. `INTEGRATION_TIMEOUT_SECONDS` continua independente para as demais chamadas.

## Instâncias

Há dois tipos:

### Criada pelo PIGE360

Nome padronizado com prefixo `PG360`, empresa e CNPJ. O PIGE360 pode:

- criar;
- consultar estado;
- gerar QR/pairing;
- reiniciar;
- logout;
- excluir.

### Preexistente

A tela consulta o inventário da Connect API e permite adotar uma instância já existente. O vínculo não transfere propriedade.

O PIGE360 pode:

- consultar estado;
- definir como preferencial;
- utilizar para seus próprios envios;
- desvincular localmente.

Por segurança, não executa automaticamente reinício, logout ou exclusão remota de uma instância preexistente. Isso evita interromper outros sistemas que também possam utilizá-la.

## Preferência

A seleção segue esta ordem:

1. instância preferencial da unidade, quando configurada;
2. instância preferencial da escola;
3. instância principal legada da empresa;
4. primeira instância ativa disponível.

Cada unidade pode escolher uma instância diferente. Remover a preferência da unidade faz a unidade voltar a herdar a preferência da escola.

## Compatibilidade

A implementação usa o contrato nativo:

- `GET /instance/fetchInstances`
- `POST /instance/create`
- `GET /instance/connectionState/{instance}`
- `GET /instance/connect/{instance}`
- `POST /instance/restart/{instance}`
- `DELETE /instance/logout/{instance}`
- `DELETE /instance/delete/{instance}`
- `POST /message/sendText/{instance}`

A chave global não é enviada ao navegador.

O endpoint de conexão pode devolver `code`, `base64` e `pairingCode` diretamente no corpo JSON. HTTP 200 sem o valor solicitado significa que o código ainda não está disponível; a tela orienta nova tentativa sem anunciar sucesso. O telefone internacional cadastrado é enviado como `number` ao pedir o código de pareamento.

## Atualização da instalação

A correção precisa estar na imagem que a stack executa. Um pacote de distribuição 1.1.2 de arquitetura anterior não substitui a imagem atual do PIGE360 Self. Depois que a alteração for integrada a `develop` e a imagem daquele commit for publicada, faça backup e atualize o `APP_IMAGE` da stack para um digest ou tag imutável correspondente. Recrie `app` e `worker` com `docker compose pull` e `docker compose up -d --wait` usando o mesmo arquivo Compose e `.env` da instalação. Consulte o build exibido no rodapé, `/build-info.json` e os logs da API para confirmar a versão efetiva. Um cache antigo da PWA também pode manter rótulos anteriores até a atualização do service worker/reabertura da aplicação. Não interrompa a stack apenas para renovar o QR Code.

## Segurança

Uma instância criada pelo PIGE360 só pode ser excluída remotamente se não estiver selecionada por outra escola/unidade. Instâncias preexistentes são apenas desvinculadas localmente.

A origem da instância é persistida como `pige360` ou `adopted`, e alterações de preferência são auditadas.
