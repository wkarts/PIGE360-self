# Aceite integrado da rede de ensino

A revisão parte da release [0.12.27](https://github.com/wkarts/PIGE360-self/releases/tag/0.12.27), commit `8656e9c82b8203b32ba9143574859ff71c81123b`. O ZIP da release tem SHA-256 `1d8e10914966597cfaad263c9fd13c96a724e356264889b9f9588d5be92c6ce8`. A [validação dessa release](https://github.com/wkarts/PIGE360-self/actions/runs/45232866269/job/137897454890) registrou 903 testes PostgreSQL e nove subtestes aprovados. A PR executa sua própria validação sobre o código modificado.

## Conferência pelos perfis da escola

| Equipe | Percurso de homologação | Resultado esperado |
|---|---|---|
| Coordenação e professor | Fechar o primeiro período; continuar os lançamentos, fazer chamada e lançar avaliação no seguinte. Alterar nota, regra ou chamada antes de publicar; consolidar novamente. | O boletim anterior conserva seu fechamento ativo. Dados alterados exigem nova consolidação. Uma recuperação ignorada mantém a nota regular. |
| Secretaria | Renovar reserva vencida após alteração da campanha. Aprovar inscrição com vínculo familiar preexistente, revisar o modelo de contrato e depois transferir o aluno efetivado. | Situação da reserva reflete a política e as taxas aplicáveis. Papéis previamente definidos são respeitados. A tela distingue o comprovante de ingresso da situação atual. |
| Tesouraria | Receber taxa obrigatória A, cancelar taxa B; consultar mensalidade manual vencida ontem no gestor e na família. Repetir consulta do instrumento de cobrança. | A reserva acompanha o conjunto de taxas exigíveis. O atraso coincide nas duas consultas. Uma parcela conserva uma única origem de emissão. |
| Responsável e aluno | Conferir exigência sem envio, documento vencido, recusa histórica com substituição validada e erro ao carregar atividades. Trocar o aluno durante a navegação. | Pendências atuais coincidem com a Secretaria e o histórico segue consultável. Falha de consulta permite tentar novamente. Um aluno não recebe conteúdo de outro. |
| Secretaria e direção | Configurar timbres e marcas distintos em duas escolas. Emitir boletins para 2, 3 e 4 períodos, ficha docente e fichas com responsáveis extensos. | A unidade correta assina a autoria visual. Prévia identificada; revisão assinada preservada. Cabeçalhos, carga horária zero e assinaturas permanecem legíveis. |
| Operação | Descompactar o ZIP candidato e conferir o manifesto, as raízes públicas e o atendimento. Em clone isolado, restaurar dados e documentos e verificar sessões e filas. | O ZIP contém o frontend da versão informada e as raízes com fingerprints esperados. Há reconciliação antes de despachar operações pendentes. |

## Ampliação após o aceite

- O Educacenso atualmente disponibiliza preparação, prévia e retorno por arquivo. A exportação oficial depende do leiaute, das tabelas e da homologação da edição e da etapa pelo operador.
- A emissão e a baixa pelo CRM Finance precisam de carteira de teste e de uma versão do receptor que implemente as rotas correspondentes. O contrato local e os testes sintéticos não comprovam efeitos bancários.
- Registrar as decisões da rede sobre bolsas, terceiro pagador, retificação após fechamento e regimento acadêmico antes de ampliar automações. Medir consultas e bloqueio de escrita com volume representativo antes de fixar metas de escala.
- Preservar digest, versão e SHA da imagem testada. Para a restauração de backup, usar uma stack descartável com documentos fictícios e conferir os hashes antes de liberar os workers.
