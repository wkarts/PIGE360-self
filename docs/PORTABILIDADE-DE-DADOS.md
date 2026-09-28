# Portabilidade de dados legados

## Fluxo na aplicação

1. Entre como administrador e selecione a escola de destino.
2. Abra **Administração → Portabilidade de dados**.
3. Envie o ZIP de backup com o banco SQLite preenchido (`school_desktop_suite/app.db`) ou o arquivo SQLite diretamente.
4. Se as fotos/documentos estiverem fora do banco, envie também um ZIP somente com os arquivos persistidos do container antigo. Preserve no ZIP os caminhos relativos usados nas referências do banco.
5. Gere a prévia. Confira quantidade de tabelas, linhas, fotos Base64, arquivos encontrados e avisos de vínculos sem correspondência.
6. Digite `IMPORTAR` e confirme. O botão não altera dados antes dessa confirmação.
7. Baixe o JSONL no histórico para reconciliar linhas da origem com cadastros e arquivos PIGE360.

O fingerprint combina o conteúdo dos dois arquivos. O mesmo fingerprint só pode ser aplicado uma vez por escola. Uma nova cópia do backup produz outra prévia e outro fingerprint.

## Mapeamento aplicado

| Origem | Destino PIGE360 | Regra |
|---|---|---|
| `alunos` | `persons` + `students` | CPF válido exato pode reutilizar Pessoa existente; dados já cadastrados não são sobrescritos. |
| `professores` | `persons` + `teacher_profiles` | Reutiliza Pessoa por CPF válido exato. |
| `colaboradores` | `persons` + `employee_profiles` | Reutiliza Pessoa por CPF válido exato. |
| `responsaveis` | `persons` + tipo de Pessoa | Não presume um vínculo com aluno. |
| `aluno_responsaveis` | `student_guardians` | Só cria vínculos cujos dois identificadores de origem foram resolvidos. |
| `unidades_escolares` | `units` | Unidade com mesmo nome na escola é reutilizada. |
| `periodos_letivos` | `academic_years` | Datas inválidas ficam apenas no arquivo de portabilidade. |
| `cursos` | `grades` | Nome de curso é usado como série/etapa; modalidade vira nível. O registro original fica arquivado. |
| `disciplinas` | `curriculum_components` | Componentes com mesmo nome são reutilizados. |
| `turmas` | `class_groups` | Só materializa turma quando série, ano, turno e unidade puderem ser resolvidos. |
| `matriculas` | `enrollments` | Matrículas de origem ativa entram como rascunho para revisão e ativação pelas regras atuais. |
| `documentos_alunos` | `document_types`, `student_documents` e `files` | Arquivo fica sem anexo se não for encontrado no ZIP de mídia; referência é mantida no arquivo JSONL. |
| `documentos_colaboradores` | arquivo JSONL + `files` | O arquivo referenciado é copiado para o armazenamento privado; o JSONL liga o registro de origem ao arquivo porque o PIGE360 ainda não tem cadastro de documento de colaborador. |
| `usuarios` | `users` | Novo usuário, quando e-mail não colide, inicia inativo com perfil Consulta e senha aleatória desconhecida. |
| demais tabelas | `legacy_import_records` | Linhas são preservadas para reconciliação, sem execução de fila ou reprodução de histórico. |

Todas as linhas presentes no SQLite são arquivadas por tabela e chave de origem. O arquivo JSONL começa com um manifesto que preserva o nome, hash, tamanho, colunas e chaves estrangeiras das tabelas, inclusive tabelas vazias. Fotos Base64 com ou sem prefixo `data:image` reconhecidas como PNG, JPEG, WebP ou GIF são validadas, normalizadas para PNG e gravadas no armazenamento privado do PIGE360. Arquivos PNG/JPEG/WebP/GIF, PDF, Office/OpenDocument (`doc`, `docx`, `xls`, `xlsx`, `ppt`, `pptx`, `odt`, `ods`), RTF, CSV, TXT, XML, JSON e Markdown do ZIP do container passam por validação de tipo e limites antes de serem copiados ao armazenamento privado; o JSONL registra caminho, hash e `file_id` sem embutir os binários.

## Exclusões e segurança

- Qualquer caminho que contenha `Magento`, sem diferenciar maiúsculas/minúsculas, é excluído. Cache, WebView/EBWebView, logs temporários, `.git` e `node_modules` também não são mídia importável.
- A importação não acessa URLs, não busca referências HTTP e não extrai arquivos usando caminhos do ZIP.
- Hashes de senha, senhas, tokens, cookies, sessões, chaves e segredos são removidos do arquivo JSONL. Referências de caminho do Magento são substituídas por marcadores. Usuários e permissões antigas não são habilitados.
- `sync_queue`, `app_logs` e `audit_logs` são arquivados; nada é reexecutado ou inserido como evento operacional do PIGE360.
- Apenas o papel global `admin` pode gerar prévia, importar, consultar lotes e baixar o arquivo de reconciliação.
- A importação grava entidades, arquivos, lote, linhas de arquivo e auditoria em uma transação. Falha de banco reverte as linhas e remove os objetos de armazenamento criados pelo lote.

## Limites operacionais

- `LEGACY_IMPORT_MAX_MB` controla o tamanho máximo de cada arquivo e aceita valores de 32 a 512 MB; o padrão é 128 MB. Quando banco e mídia são enviados juntos, o proxy/reverse proxy que antecede a aplicação deve aceitar ao menos duas vezes esse limite mais 1 MB de cabeçalhos multipart.
- Um lote aceita até 100.000 linhas SQLite, 512 MB de banco descompactado, 512 MB de mídia descompactada, 10.000 arquivos e 20 MB por arquivo de mídia.
- A importação fica limitada à escola selecionada. Antes da confirmação, faça backup do banco e do volume de armazenamento da instalação destino.
- Para desfazer após confirmação, restaure banco e armazenamento do PIGE360 ao mesmo ponto de backup. Excluir apenas o lote não remove automaticamente os cadastros já materializados.

## API

- `POST /api/v1/schools/{school_id}/legacy-import/preview` — multipart `backup` obrigatório e `container_media` opcional; não persiste o pacote.
- `POST /api/v1/schools/{school_id}/legacy-import/apply` — mesmos arquivos, `fingerprint` retornado pela prévia e `confirmation=IMPORTAR`.
- `GET /api/v1/schools/{school_id}/legacy-import/runs` — histórico resumido.
- `GET /api/v1/schools/{school_id}/legacy-import/runs/{run_id}/archive` — JSONL privado para reconciliação.

Os arquivos enviados são processados temporariamente pelo request; o lote persistido contém cadastros PIGE360, arquivos convertidos e linhas de origem sanitizadas, não o ZIP original.
