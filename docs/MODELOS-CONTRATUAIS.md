# Modelos de contratos e documentos por matrícula

Cada escola administra seus próprios modelos. O sistema não inclui dados de alunos,
responsáveis, clientes ou texto jurídico de uma escola no repositório. O administrador
pode importar um DOCX local, revisar o conteúdo editável e configurar sua vigência.

## Fluxo operacional

1. Em **Modelos de documentos**, use `POST /api/v1/schools/{school_id}/document-templates/import-docx`
   com o campo multipart `file` para extrair corpo, cabeçalho e rodapé. Esse passo
   apenas devolve texto editável; não salva o documento original.
2. Troque as lacunas do documento por campos como `{{aluno.nome}}`,
   `{{contratante1.cpf}}`, `{{matricula.serie}}` e `{{financeiro.anuidade}}`.
   Cadastre o modelo com `POST /document-templates`, associando-o a um ano letivo
   quando aplicável. Use `active: false` durante a revisão.
   Modelos com categoria `contract`, `*_contract`, `contract_*` (e equivalentes
   `contrato` em português) exigem `require_signature: true` e A1 configurado;
   o backend impede desativar essa exigência. Outros documentos podem optar
   pela assinatura.
3. Se houver papel timbrado A4, envie PNG ou JPEG pelo endpoint
   `POST /document-templates/{id}/letterhead` (multipart `file`, até 2 MB).
   A imagem é armazenada em arquivos privados e usada como fundo de cada página
   do PDF. Sem imagem, o PDF usa logotipo, nome e cor da identidade institucional.
4. Liste os modelos aplicáveis com `GET /document-templates?enrollment_id={id}`.
   A vigência de calendário é inclusiva; o ano letivo depende da matrícula.
   Assim, uma matrícula do ano seguinte pode ser contratada no ano atual com
   `valid_from`/`valid_until` omitidos.
5. Consulte os campos automáticos e manuais em `GET /document-templates/fields`.
   Faça prévia pura com `POST /document-templates/{id}/preview` e confira o layout
   com `POST /document-templates/{id}/preview.pdf`. Ambas aceitam
   `{ "enrollment_id": "...", "values": { "financeiro.anuidade": "R$ ..." } }`.
6. Quando `missing_fields` estiver vazio, emita pelo endpoint
   `POST /document-templates/{id}/issue`, com `enrollment_id`, `values` e,
   opcionalmente, `idempotency_key`. O PDF fica disponível pelo endpoint
   `/files/{file_id}/download`. Os emitidos aparecem em
   `/students/{student_id}/documents`.

## Integridade e versões

- O backend preenche dados de escola, aluno, matrícula e responsáveis com os
  cadastros reais da escola. Contratante I prioriza o responsável financeiro;
  depois são considerados os vínculos legais e o contato principal.
- Valores automáticos não podem ser trocados por outro valor no pedido de emissão;
  é preciso corrigir o cadastro de origem. Campos financeiros, testemunhas e
  outros campos definidos no modelo são preenchidos manualmente na prévia.
- Campo vazio deixa o marcador pendente e impede a emissão. Para apenas um
  contratante, use um modelo sem o bloco do segundo contratante.
- A primeira emissão por modelo, versão e matrícula fica preservada. Uma nova
  requisição com o mesmo conteúdo retorna o documento existente. Para alterar
  dados depois da emissão, edite o modelo, criando a próxima versão, e emita
  novamente. O PDF anterior e seu snapshot não mudam.
- Cada salvamento conserva uma revisão imutável, com hash SHA-256. Uma inscrição
  aprovada pode congelar `template_id`, `template_version` e esse hash, e emitir
  exatamente aquela revisão mesmo após alterações no editor.
- O banco mantém hash SHA-256 do PDF, modelo, versão, campos e hash do papel
  timbrado em cada emissão. `GET /issued-documents/{id}/verification` confere
  a integridade do arquivo, sem afirmar assinatura eletrônica quando não existe.

## Formato do DOCX

A importação extrai texto, quebras de parágrafo e células de tabelas em linhas
separadas por ` | `. Não executa macros nem reproduz automaticamente marcas
d'água, imagens, tabelas com mesclagem ou formatação avançada do Word. Confira
e ajuste o texto, associe o papel timbrado separadamente e examine o PDF de
prévia antes de ativar e emitir. O formato final dos emitidos é PDF.
