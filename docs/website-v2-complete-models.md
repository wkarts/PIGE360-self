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
| Institucional | Foto imersiva, faixa de pilares, etapas, história, galeria e visita |
| Infância | Título editorial, mosaico assimétrico, jornada, rotina e famílias |
| Projetos | Introdução, foto/painel de destaque, experiências e percurso |
| Comunidade | Manchete + duas histórias, agenda, mais histórias e vivências |

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
quatro HTMLs autocontidos com o renderer real e uma identidade fictícia equivalente.
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
