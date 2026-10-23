# Composições V2 completas — correção da entrega

## Problema comprovado

A versão 0.12.6 oferecia quatro estilos, mas trocar `theme` não instanciava a
composição aprovada. A ação “Preparar estrutura” criava títulos e blocos vazios.
Sem imagens e itens, o renderer omitia as áreas e a página ficava muito diferente
dos mockups. Não era falha de configuração do usuário nem download de fotos.

## Contrato corrigido

- Catálogo autenticado com quatro composições preenchidas: Institucional,
  Infância, Projetos e Comunidade. Abrir catálogo e prévia não escreve dados.
- Aplicar é ação explícita e confirmada, salva somente o rascunho. Preserva identidade,
  domínios e páginas internas; mantém uma cópia durável do conteúdo anterior na plataforma, por escola.
  A cópia pode ser restaurada depois, somente na mesma escola. Seu conteúdo
  permanece privado no backend; a interface recebe apenas a existência da cópia.
- Salvar rascunho não publica. A aplicação de outro modelo pode substituir os
  textos, imagens, menus e blocos da página inicial: a interface explica isso.
  A cópia permanece após recarregar. Aplicações consecutivas preservam a primeira
  cópia até restauração; restaurar salva o rascunho e limpa o checkpoint atomicamente.
- Os exemplos usam seis fotografias fictícias geradas por IA e uma foto infantil
  licenciada de Senjuti Kundu/Unsplash, já presente no mockup aprovado e creditada
  em site_model_assets/README.md. Não são fotos nem dados de uma escola cliente. As datas também são exemplos. São editáveis.
- `design.demonstration` identifica exemplos. Publicá-los exige confirmação
  explícita e mantém faixa demonstrativa; imagens do catálogo impedem retirar
  silenciosamente essa identificação. Publicação via PUT legado tem o mesmo guard.
- `composition_version=2` ativa o novo layout, preservando configurações antigas.
  O estilo editorial dos títulos respeita fonte personalizada da identidade PIGE.
- Todos os blocos, fotografias/foco/legendas, textos, CTAs e ordem são editáveis.
  Cabeçalho fixo e barra móvel continuam opções independentes; rodapé em fluxo.

## Composições

| Modelo | Estrutura |
|---|---|
| Institucional | Home: foto imersiva, pilares e síntese. Páginas: escola, educação, espaços, projetos, visita e contato |
| Infância | Home: título editorial, mosaico e síntese. Páginas: proposta, rotina, famílias, descobertas, visita e contato |
| Projetos | Home: apresentação e síntese. Páginas: projetos, experiências, aprendizagem, escola, visita e contato |
| Comunidade | Home: manchete + duas histórias e convite. Páginas: histórias, agenda, notícias, vivências, visita e contato |

Os modelos não criam notícias reais na escola. Cartões de exemplo podem ser
substituídos manualmente. Seções de notícias/agenda continuam usando apenas
publicações públicas elegíveis da plataforma, nunca rascunhos privados.

## Segurança e compatibilidade

Migração 0055 adiciona checkpoint editorial nullable, sem seeds, alteração de branding
ou conteúdo automático em escolas existentes. Assets demonstrativos
limitados a sete nomes JPG; servidor não aceita caminhos arbitrários. Prévia
incorpora imagens em data URI. Portal/login e matrícula não são alterados;
rebuild atualiza somente hashes compartilhados desses HTMLs.

## Verificação visual

`scripts/qa/render-site-models.py <diretório-fora-do-repositório>` gera
quatro homes e suas 24 páginas internas autocontidas com o renderer real e uma identidade fictícia equivalente.
Use capturas desktop e mobile desses arquivos para comparar os PNGs V2 aprovados.
A faixa demo e fotografias genéricas são diferenças intencionais.

Na validação local inicial, Chromium foi impedido pelo sandbox (`socket EPERM`)
e o browser cloud recusou protocolo `file:`. Testes de DOM e schema não comprovam
fidelidade visual; screenshots e inspeção de pixels permanecem requisito antes
de afirmar equivalência aos mockups. Nenhuma alteração foi publicada nessa fase.

O CI prepara capturas reais com `scripts/qa/capture-site-models.py` em quatro
larguras (320/390/768/1440), incluindo menu aberto no celular. Upload permanece
subordinado à guarda existente `CI_UPLOAD_EVIDENCE`; nenhum upload incondicional.

## Validação local antes da PR

Build Node 22.23.4 e fixture do editor passaram; 244 testes de CI (1 skip) e 94
backend relacionados passaram. Suíte completa local: 782 passaram, 3 skips,
5 subtests e 2 falhas: dependência opcional `socksio` ausente no ambiente e teste
CRM na borda temporal de 301 segundos. Após instalar a dependência local, os dois
testes passaram isoladamente; nenhum código CRM ou de assinatura foi alterado.
O CI PostgreSQL/Chromium permanece a confirmação integrada necessária.

Downgrade 0055 remove apenas o checkpoint; site publicado e rascunho sobrevivem.
Restauração do checkpoint deve ser feita antes do downgrade se for necessária.

## Primeira revisão de pixels da PR70

A rodada39866530385 passou todos os testes, mas as capturas revelaram grids aninhados que comprimiam cartões em uma coluna, duplicação da legenda central e endereço duplicado no rodapé. Foram corrigidos os wrappers HTML, a composição explícita do rodapé e a legenda sem mutar dados. Descrições de split/CTA agora precedem os links. O Chromium passa a registrar e exigir largura útil dos grids/cards, além de não haver overflow. Nova rodada e inspeção das imagens corrigidas continuam necessárias; CI verde anterior não é aprovação visual.

## Revisão de arquitetura após feedback do usuário

A primeira entrega visual continuava longa e desorganizada como landing page. A revisão
passa a usar home de síntese (até dois blocos) e seis páginas reais por modelo,
com menu e cartões principais em `/slug`, sem apenas deslocar a página por âncoras.
Internas têm título e conteúdo próprios, não repetem o hero/mosaico da home.
Rodapé V2 é compacto, em fluxo; imagens internas usam proporções consistentes.

`preview-model` resolve o mesmo merge de `apply-model`, sem gravar. O editor mostra
mapa, colisões e seletor das páginas antes de permitir aplicação; links locais na
prévia permanecem no iframe privado. Páginas anteriores são preservadas integralmente.
Colisões ganham sufixos e todos os links novos são ajustados. `model_origin` torna
reaplicação idempotente: conteúdo anteriormente editado é reutilizado, não substituído.
Se uma página dessa origem estiver desativada ou o total exceder 20 páginas, a
operação falha antes de alterar versão/checkpoint. A inclusão de uma página no
rascunho não publica o site; continua necessária confirmação explícita.

Notícias e Agenda usam publicações elegíveis reais e estado vazio quando não existem;
não são convertidas em notícias fictícias no banco. Contato pode exibir os dados
institucionais herdados por `show_contact_details`, editável por página.

A captura de CI navega pelos seis menus de cada modelo, recarrega cada página,
valida destinos de links e registra todas as internas em 390/1440 px, além das
homes em 320/390/768/1440 e menus móveis: 72 PNGs. Registra altura do rodapé e
geometria de cards/grids. A guarda de upload e retenção existentes não mudam.
Essas capturas ainda exigem inspeção humana antes de qualquer afirmação visual.

## Revisão das 72 capturas multipágina

A rodada `39871604934` gerou as 72 imagens e passou navegação/reload das páginas,
mas o E2E do editor encontrou nome acessível instável no seletor de prévia. O label
agora é explícito, separado das opções; a asserção exata foi preservada.

A inspeção real dos quatro modelos e 48 capturas internas levou a estes ajustes:
- sínteses textuais sem repetir as mesmas fotografias da capa;
- Infância sem CTA inferior repetido e com fotos apropriadas em Descobertas;
- Projetos recupera o destaque foto/painel da composição V2, ligando à página própria;
- foco vertical da foto teatral para preservar rostos;
- Contato prioriza canais institucionais antes do conteúdo de apoio;
- títulos de Agenda/Notícias não são duplicados no bloco de publicações;
- rodapé permanece em fluxo, sem faixa vazia abaixo em páginas curtas.

O artefato dessa rodada tinha 40.654.493 bytes (conjunto completo, não só imagens).
A próxima rodada deve confirmar os ajustes de pixels e concluir os E2Es do editor.
A variável temporária de upload deve voltar ao estado anterior somente após baixar
as evidências finais. Nenhum merge, release ou deploy faz parte desta correção.

A revisão independente também cobriu o limite agregado: entrada individual válida
que excederia 1 MB após compor o modelo retorna 422 sem expor conteúdo, preservando
rascunho, publicação, versão e checkpoint. O limite não é reduzido nem ignorado.
