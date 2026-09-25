# Cadastros individualizados e modais

## Escopo

Aplicação self-hosted de uma instituição e suas unidades. Esta alteração não cria
SaaS, control plane, clientes de hospedagem ou um novo deploy. Preserva a identidade
visual da escola, os dados históricos e as permissões existentes.

## Navegação e identidade única

O grupo expansível **Cadastros** reúne Cadastro único, Alunos, Professores,
Funcionários, Pais e responsáveis, Fornecedores, Prestadores de serviços, Clientes
e Sócios. As URLs antigas continuam válidas. As listagens comerciais são filtradas
no servidor por tipo; busca, paginação, natureza PF/PJ e situação são suportadas.
A pessoa é a mesma: fornecedores, clientes, prestadores e sócios adicionam vínculos,
não copiam nome/CPF/CNPJ/contatos/endereço para outras tabelas de pessoas.

**Vincular pessoa existente** procura uma identidade antes de acrescentar seu novo
vínculo. O servidor valida instituição, versão, tipo e duplicidade. Um vínculo
comercial já ativo é editado, não criado outra vez. As funções de aluno, professor
e funcionário conservam suas fichas profissionais/acadêmicas existentes. Marcar um
tipo no Cadastro Único é uma classificação; a ficha específica é completada na tela
correspondente ou pelo botão Adicionar. Os botões agora verificam a existência da
ficha efetiva, não somente a classificação, evitando impedir essa conclusão.

Parentesco, responsabilidade legal, financeira e autorização de retirada continuam
vínculos explícitos com cada aluno. Tipos cadastrais não criam usuários nem alteram
perfis de acesso. Pessoas jurídicas não podem ser aluno/professor/funcionário ou
responsável de aluno. O campo CNPJ é distinto do CPF; admite formatos numérico e
alfanumérico com validação dos dígitos. Isso não consulta existência na Receita.

## Formulários

Ficha ampla com navegação lateral por identificação, tipos, documentos, contatos,
endereço, filiação, dados profissionais, dados escolares/saúde e observações, conforme
o contexto. As seções relevantes mantêm os controles montados: mudar de seção não
perde o preenchimento. Fornecedores, prestadores, clientes e sócios não recebem
campos escolares; têm pessoa de contato, categoria/especialidade/vínculo societário,
referência interna e observações próprias. Estes são cadastros administrativos,
não um novo módulo de compras, contratos societários ou contas a pagar.

Cabeçalho e ações ficam fora da área de rolagem. Em celular as seções ficam em uma
barra horizontal, com campos em uma coluna. Existe confirmação interna de descarte,
foco contido com Tab/Shift+Tab, Escape, restauração do foco e fundo inerte. Validação
seleciona a seção do campo inválido antes de enviar. Erros do servidor permanecem
no formulário; dados de seções não enviadas por edições contextuais são preservados.

Cobranças passam a abrir em modal, com cabeçalho/ações fixos, vínculo dentro do
formulário, resumo de parcelas/total nominal e confirmação de descarte. Os detalhes
financeiros também usam o diálogo. Nenhum endpoint de emissão, cálculo monetário,
idempotência, webhook, worker ou regra de matrícula foi substituído. O resumo é
visual; o backend continua sendo responsável por validar e calcular a cobrança.

## Atualização

Migration aditiva: `0011_person_cadastres`, depois de `0010_institution_identity`.
Acrescenta campos PF/PJ em persons e JSON de detalhes em person_type_links, além de
índice único (school_id, cnpj). Não recria pessoas nem muda IDs. Os novos campos têm
defaults compatíveis para registros antigos. Faça backup antes de aplicar migrations.
O downgrade remove os novos campos/detalhes: para recuperá-los, restaure o backup.

Não há dependência nova de runtime, serviço adicional nem mudança de Compose.
A imagem precisa ser reconstruída pelo fluxo existente. Não editar apenas renders.js.
Não sobrescrever `.env`, não remover volumes e não executar `down -v`.

## Testes

- Backend: criação/edição dos quatro tipos, identidade compartilhada, preservação
  de dados ocultos, conflitos de versão/duplicidade, filtros, CPF/CNPJ e escopo.
- `scripts/e2e.py`: mantém os fluxos históricos, navegando até cada seção de campo.
- `scripts/e2e-cadastres.py`: casos PF/PJ, vínculo sem duplicação, filtros, modal,
  validação, descarte, foco, responsividade e resumo financeiro, com dados fictícios.
- `scripts/e2e-online.py`: emissão enfileirada pelo novo modal, sem executar banco real.
- CI mantém PostgreSQL, Chromium HTTP sem bridge e build/smoke Docker.

O harness `PIGE_UI_BRIDGE=1` serve somente para inspeção local em ambientes que
bloqueiam navegação HTTP do Chromium. Seu resultado não substitui os checks nativos.
Provedores bancários, HUB e Connect API de produção não são acessados pelos testes.

Referências técnicas: W3C APG Dialog (Modal) Pattern e portal CNPJ Alfanumérico da
Receita Federal. Sem distribuição de arquivos de fonte ou ativos privados da escola.
