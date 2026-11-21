# Direções opt-in do Site da Escola

Esta entrega mantém os cinco modelos publicados no catálogo (`horizon`, `editorial`, `culture`, `campus` e `familias`). As direções abaixo são novas composições opt-in, exibidas no mesmo catálogo e aplicadas somente depois de prévia e confirmação no rascunho. Não alteram URLs, páginas ou conteúdo já publicado.

## Prévia sintética

| ID | Estrutura | Uso sugerido | Elemento de leitura rápida |
| --- | --- | --- | --- |
| `atelier` | Capa assimétrica em duas colunas, fotografia vertical com moldura e blocos de processo | Escola que quer mostrar projetos, espaços e detalhes do cotidiano | `Ateliê aberto`, projetos e convite à conversa |
| `rota` | Capa em duas colunas com percurso numerado e fotografia ao lado | Escola que quer orientar famílias por etapas | `Chegar`, `Explorar` e `Compartilhar` |
| `nucleo` | Capa compacta de alto contraste, imagem circular e vitrine editorial | Escola que prioriza vida escolar, agenda e notícias | Histórias, agenda e notícias em um único núcleo |

As fotografias e textos são sintéticos/demonstrativos e continuam identificados para revisão antes da publicação.

## Fluxo protegido

1. O gestor escolhe uma direção e usa **Ver modelo completo sem alterar**.
2. A prévia mostra a capa, o mapa do menu e as páginas internas sem gravar.
3. **Aplicar páginas e menu ao rascunho** preserva páginas existentes, registra o checkpoint e não publica.
4. O endereço de matrícula continua sendo um único campo (`admission_url`). O CTA `Matrículas` só é acrescentado quando nenhuma ação já usa esse mesmo endereço.
5. O rail **Publicação e matrícula** aponta para o endereço existente e, quando a permissão `admissions.read` estiver disponível, permite conferir processos abertos ou fechados sem criar campanha duplicada.

O editor de Notícias usa as etapas **Conteúdo**, **Imagem** e **Publicação** para reduzir rolagem. A prévia e a ação **Publicar site** continuam separadas do salvamento do rascunho.
