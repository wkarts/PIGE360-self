# Matrícula: preparação do contrato e efetivação

Base: `d5706736087942c890c532f35db9bbda5db774e5` (`develop`, PR 79).

## Operação

1. Em **Documentos → Modelos e contratos**, edite o modelo. Nos parâmetros de cada variável, escolha o componente e marque **Obrigatória** somente quando desejar impedir a geração sem aquele dado. Salvar cria outra revisão.
2. Na inscrição aprovada, use as etapas **Cadastro**, **Documentos**, **Contrato** e **Efetivação**. O painel de pendências direciona para a etapa correspondente.
3. Em **Contrato → Atualizar versão ou trocar modelo**, selecione a revisão/modelo e informe o motivo. A alteração é explícita e não substitui documentos emitidos ou assinados.
4. Gere a prévia. Dados existentes no cadastro prevalecem. Lacunas podem ser preenchidas pelo retrato conferido da inscrição da mesma pessoa, sem combinar identidades ou endereços conflitantes. Corrija dados oficiais na ficha do aluno/responsável e use **Atualizar dados do cadastro** para reler os valores.
5. Preencha os demais campos. Datas oferecem calendário; valores monetários são formatados em reais sem completar valores ausentes; CPF/CEP têm máscara e UF tem seletor. Grupos inteiramente opcionais de segundo contratante/testemunhas ficam recolhidos.
6. **Salvar rascunho** permite retomar os valores na mesma matrícula, modelo e revisão. Alterações não salvas geram aviso ao sair/trocar. Rascunhos de outra revisão não são transplantados silenciosamente.
7. Atualize a prévia, confira o PDF e emita. A família devolve o PDF assinado no fluxo existente; confira sua validação no painel da própria matrícula.
8. Em **Efetivação**, confira os requisitos do servidor e registre o parecer. A conclusão mantém as verificações de documentos, reserva, capacidade, pagamento, assinatura e autoridade. Quando a família assina primeiro, a instituição aplica o A1 por último.

## Regra de impressão

- Uma variável sem marcação de obrigatoriedade é opcional, inclusive em modelos antigos ainda não emitidos. Não há obrigatoriedade inferida pelo nome do campo.
- Opcional vazia: omitir o marcador e seu trecho dependente. A limpeza usa parágrafos e separadores do próprio modelo; os grupos vazios de contratantes/testemunhas também são omitidos. Texto fixo independente permanece. No DOCX, cabeçalhos, rodapés e tabelas seguem a mesma regra, preservando os trechos e mídias não afetados.
- Obrigatória vazia: a prévia textual informa o campo pendente; a prévia PDF e a emissão retornam 422.
- Valores manuais são validados conforme o componente. Não são criados nomes, datas, valores financeiros ou testemunhas para completar lacunas.
- O PDF final é extraído e verificado antes de ser liberado. `{{` ou `}}` remanescentes impedem sua entrega. Arquivos históricos já emitidos permanecem idênticos.
- Ao preparar um modelo com texto livre complexo, confira o PDF antes de ativá-lo. Organize informações opcionais em parágrafos ou trechos delimitados para que a omissão preserve o sentido desejado do contrato.

## API e persistência

`field_options` passa a fazer parte da revisão imutável do modelo. Exemplo: `{"assinatura.data":{"required":true,"input_type":"date"}}`. As opções aceitam `text`, `date`, `money`, `integer`, `cpf`, `cep`, `email`, `uf`, `phone`; chaves ausentes do modelo são recusadas.

`GET/PUT /api/v1/schools/{school_id}/document-templates/{template_id}/preparation` recebe `enrollment_id`, `template_version`, `version` e `values`. Leitura exige `documents.read`; escrita exige `documents.generate`. A escrita usa o bloqueio da escola e controle otimista (409 em conflito). Rascunho admite preenchimento parcial; validação completa ocorre ao preparar/emitir. Auditoria registra chaves, sem copiar os valores pessoais.

`GET /api/v1/schools/{school_id}/admissions/{id}/readiness` exige `admissions.read`, é isolado por escola e devolve requisitos e etapas. É informativo: os endpoints de conclusão continuam verificando as regras na transação final.

Migração `0057_contract_field_options` após `0056_crm_bridge_external`: coluna JSON `document_templates.field_options` com default `{}` e tabela `contract_preparation_drafts`, com FKs, índice por escola e unicidade por escola/matrícula/modelo/revisão. Não regrava revisões antigas nem PDFs. Volume novo é proporcional aos rascunhos salvos, sem conversão em lote de documentos.

## Implantação e retorno

Após revisão/merge e autorização operacional: backup do banco e documentos, aplicar a migração e atualizar backend/frontend juntos. Validar saúde, abertura de matrícula, retomada de rascunho, PDF com variável opcional vazia e bloqueio de obrigatória vazia.

Se houver regressão, retornar ao artefato anterior mantendo o esquema aditivo. O downgrade de 0057 é deliberadamente bloqueado: excluir a tabela perderia preenchimentos ainda não emitidos. Exportar e avaliar esses dados antes de qualquer remoção de esquema. A entrega desta PR não executa merge, release ou deploy.

## Evidências e limites

Testes adicionados cobrem parâmetros por revisão, valores inválidos, PDF extraído sem marcadores/rótulos vazios, omissão em DOCX incluindo cabeçalho/rodapé/tabelas, retomada e conflito de rascunho, isolamento entre escolas e preenchimento de lacunas sem substituir cadastro ou misturar pessoas.

O E2E HTTP/Chromium testa o editor real, calendário, UF, rascunho após recarga, PDF real e larguras 320, 390, 768, 1024, 1440, 1920 e 2560. O E2E de conclusão testa assinatura externa sintética, validação pela Direção, A1 institucional sintético por último e efetivação. Isso não representa homologação de certificado real ICP-Brasil nem entrega WhatsApp real. As evidências usam dados sintéticos e SQLite temporário; PostgreSQL/Docker são verificados no GitHub Actions.

Resultados e hashes locais estão no checkpoint adjacente. Nenhum documento real fornecido pelo usuário foi incorporado ao repositório.
