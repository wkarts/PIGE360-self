# Navegação e rolagem da aplicação escolar

## Escopo

Melhoria do layout solicitada na captura de 25/09/2026, construída sobre
`develop` em `340cd16cfc106164e23bf8578e8144363caad956` (PR #14 integrada).
Preserva a identidade da escola, as permissões, rotas, cadastros, integrações,
Compose, portas, volumes e regras de negócio. Nenhuma migration ou dependência nova.
Não reorganiza novamente os formulários ou o relacionamento aluno–responsável:
essa simplificação é um escopo separado, não entregue por esta alteração de layout.

## Comportamento

- Marca da escola fora da área rolável; logo inteira, proporcional, sem distorção.
- Barra superior fora da área rolável do conteúdo, sem sobrepor o título da página.
- Menu e conteúdo com rolagem independente; a janela não mantém outra barra externa.
- Barras finas e de baixo contraste em repouso; realçadas no hover/foco. O teclado,
  a roda, o toque e o arraste do indicador continuam disponíveis. Alto contraste
  restaura as barras nativas. Não é usado `scrollbar-width: none`.
- Ícones SVG locais, em grade 24 × 24 e com traço uniforme, associados ao significado
  de cada item. Sem emojis, fonte de ícones ou CDN. Também usados nos indicadores.
- Grupo Cadastros, links e permissões anteriores preservados; estado ativo tem
  destaque institucional e `aria-current`; botão de expansão mantém `aria-expanded`.
- Menu móvel com botão de fechar, Escape, foco contido e devolução do foco;
  fundo inerte durante abertura. Fechar, navegar ou ampliar a janela libera o fundo.
- Mudança de tela começa no topo do conteúdo; o menu preserva sua própria rolagem.
- Link de pular navegação, áreas focáveis, alvos de toque e movimento reduzido.
- Retirada a versão `v0.3.0` fixa do rodapé, que não acompanhava as releases.

## Arquivos principais

`frontend/public/workspace.css` contém os ajustes isolados do layout e do scroll.
`frontend/public/ui-icons.svg` contém os símbolos vetoriais locais.
`frontend/src/workspace.ts` trata apenas foco e acessibilidade da navegação,
acompanhando as classes/atributos renderizados pelo Vue. Não move nem recria o DOM
controlado pelo framework, não intercepta APIs e não duplica o estado dos cadastros.
O template existente só recebe a separação das áreas, ícones e atributos acessíveis.

O build inclui os novos ativos no fingerprint e no cache estático da PWA.
Não altera a lista de endpoints públicos nem libera dados privados no cache.
A entrada do portal permanece independente; não recebe o layout administrativo.

## Validação reproduzível

```
npm run typecheck --prefix frontend
npm run build --prefix frontend
python -m unittest discover -s tests/ci -v
python scripts/ci/validate.py
python scripts/e2e.py
python scripts/e2e-online.py
python scripts/e2e-cadastres.py
python scripts/e2e-workspace.py
```

O novo E2E verifica por coordenadas a imobilidade da logo e da barra superior,
a independência da rolagem, ícones, abertura de cadastro, foco/teclado/fechamento
no celular, larguras até 320 px, janela baixa, alto contraste e movimento reduzido.
As imagens usam uma marca sintética de teste, nunca substituem a marca do cliente.

O ambiente local possui restrição de navegação HTTP no Chromium. O modo explícito
`PIGE_UI_BRIDGE=1` testa a UI e a API locais, mas não comprova HTTP/cookies/CSP/PWA
nativos. O GitHub Actions executa sem esse modo, além do backend com PostgreSQL
real e build/smoke Docker. Consultar as evidências da revisão final para resultados.

## Atualização

Requer compilar/publicar a nova imagem pelo fluxo habitual. Nenhuma mudança no
Compose ou no `.env` é necessária. Manter os volumes e a personalização atual.
A release estável não muda enquanto não houver promoção autorizada. Na PWA,
aplicar a nova versão quando não houver formulários com alterações pendentes.

Referências técnicas: MDN `scrollbar-width` e WAI-ARIA APG Disclosure Navigation.
