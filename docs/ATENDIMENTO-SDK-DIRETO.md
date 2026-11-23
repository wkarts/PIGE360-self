# Atendimento por SDK direto

O carregador `frontend/src/support-widget.ts` instala `/packs/js/sdk.js` no documento da página, usando `window.hubSettings` e `window.hubSDK.run`. A bolha e o painel são criados pelo HUB; o portal não cria iframe externo, não recorta a área com `clip-path` e não modifica as sombras do widget.

Continuam valendo as configurações por instituição/área, o token público da caixa, o tratamento de Retry-After e a preservação da conversa ao navegar entre áreas habilitadas da mesma escola e conta. As respostas atrasadas não montam um widget de um contexto anterior.

O SDK deve oferecer `hubSDK.destroy({ clearSession })`. A desmontagem em uma área desabilitada preserva a sessão; saída e troca de escola/conta solicitam sua limpeza. Downloads de SDK são serializados e reutilizados para evitar instâncias concorrentes. Nenhum token privado ou credencial deve ser colocado no snippet.

## Implantação

1. Publicar primeiro o SDK atualizado do HUB com o método `destroy` e invalidar o cache de `/packs/js/sdk.js`.
2. Publicar o frontend PIGE360 recompilado e atualizar o cache/PWA.
3. Conferir bolha, abertura/fechamento, sombra sem recorte, digitação e cliques no formulário, em desktop e celular.
4. Trocar de escola, sair/entrar em outra conta e navegar entre áreas habilitadas e desabilitadas.

Se o HUB ainda não oferecer o descarte, o portal apresenta a falha de inicialização com nova tentativa. Não monta um contexto que não possa encerrar na troca de conta. Nenhuma migration, alteração de configuração de caixa ou variável de ambiente é necessária.

Rollback: restaurar a imagem anterior do portal. A API adicional do SDK pode permanecer publicada; se também for revertida, reverter o portal primeiro.

## Validação

`npm run build --prefix frontend` inclui smoke tests da montagem direta, reutilização, recuperação e descarte. `python scripts/e2e-support.py` cobre o fluxo visual com SDK sintético e somente dados de teste. Homologação contra a versão publicada do HUB continua necessária após implantar os dois componentes.
