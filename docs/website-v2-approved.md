# Sites V2 e publicação administrável

## Modelos

Os identificadores existentes são conservados para não invalidar configurações: `horizon` é Institucional, `editorial` é Infância, `culture` é Projetos e `campus` é Comunidade. As quatro composições usam fotografias e conteúdo fornecidos pela escola; não incluem fotografias de clientes, nomes fixos ou notícias fictícias em produção.

A identidade visual vem da instalação PIGE. O editor não cria uma segunda marca. Personalizações antigas permanecem compatíveis, com ação explícita para restaurar a identidade herdada. A troca do modelo não apaga conteúdo.

## Administração

Em Notícias e agenda > Configurar site:

1. Escolher o modelo e preencher domínio, chamada e apresentação.
2. Preparar a estrutura do modelo, quando não existirem blocos, ou acrescentar seções individualmente.
3. Editar cartões, texto/fotografia, galeria, jornada, convite, notícias, agenda e conteúdo longo. Ordenar, ocultar ou remover seções e itens.
4. Enviar fotografias próprias ou reutilizar a biblioteca; preencher descrição acessível e foco horizontal/vertical. Escolher links/CTAs e menu.
5. Configurar, independentemente, cabeçalho fixo e barra de ações móvel. O rodapé nunca é fixado.
6. Salvar rascunho, visualizar em diferentes larguras e publicar explicitamente. Rascunho não altera versão pública. Retirada preserva o conteúdo.

O editor administra até 12 páginas internas com slug, título, introdução, fotografia, blocos e inclusão na publicação. Elas têm rotas próprias (`/sobre`, `/educacao-infantil`), compartilham identidade/menu/rodapé e são publicadas atomicamente com o site. Rascunhos não ficam acessíveis por URL; uma página retirada retorna 404 depois da publicação. Slugs duplicados, reservados ou inválidos são recusados. Links locais do menu e dos botões são conferidos no momento de publicar, para não apontar silenciosamente a páginas inexistentes ou retiradas. As seções também possuem âncoras locais. A página inicial mantém sua composição; páginas internas usam apresentação compacta sem repetir os conteúdos da home. O conjunto editorial é limitado a 1 MB de JSON para preservar limites de transporte.

Sem seções administradas, os conteúdos anteriores continuam disponíveis. Depois de administrar as seções, remover todas é uma decisão explícita e não ressuscita automaticamente os blocos legados.

## Fotografias e privacidade

Uploads autenticados exigem `schools.manage`, são isolados por escola e aceitam bytes reais PNG/JPEG/WebP. São reorientados, convertidos e reencodados, sem metadados originais. A interface limita arquivos a 3 MB; o backend admite até 4 MB de entrada, 16 megapixels e 3 MB normalizados. Há até 100 imagens por escola, deduplicadas por hash, em tabela privada. A biblioteca possui miniaturas autenticadas e permite apagar somente imagens não referenciadas por nenhum rascunho, publicação ou post.

A URL pública só responde quando a foto está referenciada numa seção visível do site publicado ou numa notícia/evento público dentro da janela de publicação. Referência de outra escola é rejeitada. Remover a publicação revoga o acesso quando não houver outra referência pública. URLs não são credenciais, e não são emitidos tokens permanentes. A prévia autenticada incorpora bytes verificados de fotos próprias; fotos externas HTTPS podem ser bloqueadas na prévia pela política de segurança do gestor. Prefira uploads próprios.

A capa pode ser salva em um post privado, mas não fica pública por isso. Esta entrega não adiciona um transporte de fotografias privadas ao portal familiar.

## Banco e recuperação

- 0053: botão Portal do Aluno por campanha de matrícula, preservando layout da inscrição.
- 0054: design JSON do site, fotos opcionais dos posts e tabela de ativos privados. Upgrade preserva conteúdos existentes.

Nenhuma migration foi executada em produção. Antes de eventual implantação autorizada, obter backup consistente de banco/arquivos e testar restauração. Downgrade 0054 remove dados novos de design e imagens; não é recuperação sem perda. Restaurar backup é a forma de recuperar esses dados após downgrade.

## Validação e limites

Testes cobrem persistência de rascunho/publicação, concorrência/versionamento existente, clientes antigos, isolamento escolar, URLs, escaping, MIME real, visibilidade de fotos, reutilização/exclusão protegida e migration com dados preexistentes. O teste executável do editor cobre quatro modelos, páginas independentes e ordenação, foco de foto, salvar/reabrir, prévia, cancelamento e ausência de publicação implícita.

O E2E `e2e-school-workflows.py` exercita fotos sintéticas, quatro modelos em 320/390/768/1440 px, menu móvel, cabeçalho e rodapé, além de criação/publicação da página `/sobre` pelo editor e resposta do proxy à rota própria. Evidências são geradas pelo CI na política de upload existente (`CI_UPLOAD_EVIDENCE`). O Chromium local permaneceu bloqueado pelo ambiente (socket EPERM); não atribuir validação visual real aos testes unitários ou de DOM. O resultado do CI é específico ao SHA publicado e deve ser conferido antes de aprovar uma implantação. Homologação institucional e conteúdo real continuam separados da implementação.
