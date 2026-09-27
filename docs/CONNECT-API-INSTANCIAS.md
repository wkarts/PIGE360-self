# Connect API — instâncias no PIGE360 Self

## Objetivo

A integração Connect API do PIGE360 é operacional. Ela atende notificações, automações, API, webhook e eventos da aplicação escolar. Não implementa caixa de entrada nem interface de conversação.

A conexão bancária/ASAAS permanece independente.

## Fonte da configuração

Por padrão, a instalação usa:

- `CONNECT_API_BASE_URL`
- `CONNECT_API_KEY`

`CONNECT_ALLOWED_HOSTS` é opcional. Quando vazio, somente o hostname exato de `CONNECT_API_BASE_URL` é aceito. Quando preenchido, funciona como allowlist explícita adicional.

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

## Segurança

Uma instância criada pelo PIGE360 só pode ser excluída remotamente se não estiver selecionada por outra escola/unidade. Instâncias preexistentes são apenas desvinculadas localmente.

A origem da instância é persistida como `pige360` ou `adopted`, e alterações de preferência são auditadas.
