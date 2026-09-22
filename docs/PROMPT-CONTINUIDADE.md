# Continuidade técnica

A base canônica desta entrega é PIGE360 Self 0.3.0. Não recriar o template original nem reintroduzir control plane/apps nativos. Trabalhar na aplicação FastAPI + Vue 3 entregue, preservando os cadastros, dados, migrations existentes, padrões de permissões e branding.

Antes de alterar, executar os testes e ler README, ESCOPO-0.3.0 e RELATORIO-ENTREGA. A integração ASAAS possui contrato baseado na documentação v3; exige homologação. A Connect API necessita conferência da OpenAPI real: não presumir rotas Evolution, não declarar endpoints configuráveis como contrato confirmado.

Alterações de estado financeiro só devem resultar de consulta autenticada ao provedor. Não remover checkpoints/idempotência para fazer uma fila parecer saudável. Após timeout ou restauração, conciliar antes de repetir efeitos externos.

Não substituir a entrega por um novo prompt/roadmap. Implementar fluxos completos e comprovar com API, banco e navegador, identificando explicitamente quaisquer limitações de homologação. Nenhum envio, cobrança real, push de repositório ou deploy remoto foi executado na criação desta versão.
