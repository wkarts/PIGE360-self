# Asaas nativo e taxa de inscrição online

A implementação usa a conexão Asaas de cada escola, os títulos, o worker, a autenticação do portal e as permissões do PIGE360. A referência funcional é a [revisão do módulo Perfex comparada com esta implementação](https://github.com/wkarts/asaas-payment-module-perfex-crm/tree/5e79f61625a90ea66273b0ce1a854144214b88ee).

| Recurso | Onde conferir | Critério de aceite |
|---|---|---|
| Taxa opcional | Matrícula online → editar processo | Começa desligada. Ao habilitar, a escola escolhe conta, meio (Pix ou boleto), valor e prazo. |
| Solicitação da família | Portal da inscrição → protocolo enviado | Criar, abrir e enviar a inscrição preserva a opção de seguir sem cobrança. A emissão exige ação explícita com o preço consultado. Recarregar, trocar a configuração ou repetir o pedido conserva o título já emitido. |
| Recebimento | Financeiro → cobranças | A taxa usa a fila e os eventos do mesmo título. A confirmação do banco não efetiva matrícula nem reserva vaga automaticamente. O parâmetro de pagamento obrigatório da campanha tem fluxo próprio. |
| Extrato e consultas | Financeiro → Extrato e relatórios | Conferir saldo por lançamento, valores negativos e positivos, filtros e página. O catálogo contém 20 consultas. PDF identifica a página. CSV busca o conjunto filtrado e informa se não puder completá-lo. |
| Monitor | Financeiro → Monitoramento e conciliação | Consultar títulos, eventos e operações da escola. Comparar referência, pagador, meio e valor com o Asaas. Webhook repetido é deduplicado. Reconciliar consulta a origem do pagamento. |
| Política financeira | Configuração da conta Asaas | Conferir meios disponíveis, multa, juros, desconto, valor mínimo por parcela, antecipação, simulação e repasse de tarifas antes de emitir. |
| Cartão | Financeiro e portal da família | Conferir checkout à vista, parcelado e recorrente, parcelas recebidas e revogação. A cobrança em cartão por novo título exige adesão explícita do pagador e token disponível para a conta. |
| Pix Automático | Financeiro e portal da família | Conferir elegibilidade, consentimento, QR inicial, ativação no banco, ciclo seguinte e cancelamento. A adesão e o recebimento têm confirmações independentes. |
| Estorno e ciclo de cobrança | Detalhe do título ou da transação | Conferir saldo estornável e permissões. Repetir a mesma solicitação deve conservar uma única operação. Um resultado remoto incerto exige conferência antes de nova tentativa. |

## Validação com conta da escola

Em homologação, utilizar um processo isolado, titular de teste e uma conexão Asaas de sandbox. Publicar um processo com o recurso desligado, completar uma inscrição e confirmar ausência de título. Ativar a taxa em um segundo processo e repetir com os dois meios, conferindo a cobrança única, a troca de valor antes da emissão, o retorno autenticado do provedor e o estado do protocolo após a liquidação. A conta e o ambiente bancário são selecionados pela escola.

Para cartão e Pix Automático, confirmar também os recursos habilitados pelo provedor para a conta, testar um consentimento, uma revogação e o comportamento da próxima fatura. No extrato, confrontar referência, pagamento, tarifa, eventual estorno e saldo com o painel do provedor no mesmo período. Nas contas da rede, os valores e a política comercial dependem de decisão da Tesouraria.

## Atualização

As migrações são aditivas. A taxa permanece desligada nos processos anteriores e os campos personalizados do diário começam vazios. Na reversão de uma implantação, preservar o banco e a trilha dos pedidos já enviados ao provedor. Conferir essas operações antes de retomar os workers sobre uma restauração.
