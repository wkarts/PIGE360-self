# PIGE360 Self — arquitetura modular unificada

## Decisão de produto

O PIGE360 Self é uma aplicação educacional self-hosted única, acessada pelo navegador e instalável como PWA. Os módulos não são aplicações separadas e não possuem bancos independentes por perfil.

A separação acontece por:

- permissões granulares;
- perfil do usuário;
- vínculo do usuário com a escola;
- vínculo opcional do usuário com uma pessoa, aluno ou atribuição docente;
- escopo de dados conferido no backend.

## Perfis

| Perfil | Espaço inicial | Dados permitidos |
|---|---|---|
| Administrador | Administração geral | Operação completa da instalação |
| Direção | Gestão institucional | Gestão ampla, sem administração de integrações por padrão |
| Coordenação | Coordenação pedagógica | Estrutura acadêmica, matrículas, documentos e atribuições docentes |
| Secretaria | Secretaria escolar | Cadastros, matrículas, documentos, protocolos e relatórios |
| Professor | Espaço do professor | Turmas e alunos efetivamente atribuídos |
| Aluno | Espaço do aluno | Próprio cadastro, matrículas e documentos próprios |
| Responsável | Espaço da família | Alunos vinculados por relação ativa |
| Consulta | Leitura | Painel e relatórios permitidos |

O backend nunca deve confiar apenas no rótulo do perfil. Cada operação deve exigir uma permissão.

## Estado desta evolução

Entregue nesta branch:

- catálogo de perfis educacionais;
- permissões explícitas e compatíveis com as permissões existentes;
- vínculo seguro de usuário com pessoa;
- atribuição real de Professor a turma;
- contexto real de Professor, Aluno e Responsável;
- bloqueio dos endpoints administrativos para perfis de autoatendimento;
- migration compatível com instalações existentes;
- modelos de ambiente develop e production.

Ainda não são declarados como concluídos:

- notas, frequência, diário e boletim;
- financeiro escolar completo;
- fiscal, cantina, estoque, biblioteca, transporte, RH e folha;
- integrações externas adicionais;
- aplicativo nativo Android/iOS/desktop.

Esses domínios devem entrar como módulos do mesmo produto, com seus próprios contratos, migrations, permissões e testes ponta a ponta. Não devem ser criados menus vazios ou endpoints simulados para aparentar abrangência.

## Secretaria: cadastro único e matrícula

A tela **Cadastro único** é a fonte administrativa da Pessoa. O mesmo registro pode possuir simultaneamente vários tipos funcionais — aluno, professor, responsável, pai, mãe, colaborador, funcionário e outros — sem duplicação. Tipos são dados de negócio e vêm somente do cadastro e dos vínculos acadêmicos/familiares. Login, usuário e perfil de acesso são domínios separados e nunca definem o tipo da Pessoa.

A ficha civil inclui identificação, nascimento, filiação, contatos, endereço estruturado, emergência, escolaridade, ocupação, observações e foto. A ficha do aluno acrescenta identificadores educacionais, saúde, transporte e observações escolares. A matrícula registra tipo de entrada, escola/cidade de origem, referência externa, responsável financeiro e histórico de movimentações.

Fotos e anexos são privados: a API verifica sessão, escola e SHA-256 antes do download. `STORAGE_BACKEND=local` usa o volume persistente existente; `STORAGE_BACKEND=s3` usa AWS S3, MinIO ou outro endpoint compatível, sem URL pública no navegador.

## Fluxo de evolução

1. Concluir e homologar o núcleo Secretaria.
2. Implementar estrutura pedagógica real: disciplinas, professores, diário, frequência, avaliações e boletim.
3. Ampliar os espaços do Professor, Aluno e Responsável somente quando cada operação tiver persistência, autorização e testes.
4. Adicionar financeiro e demais domínios sem alterar o modelo de instalação única.
