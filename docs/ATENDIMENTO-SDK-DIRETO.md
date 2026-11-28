# Atendimento por SDK direto

O carregador `frontend/src/support-widget.ts` instala `/packs/js/sdk.js` no documento da página, usando `window.hubSettings` e `window.hubSDK.run`. A bolha e o painel são criados pelo HUB; o portal não cria iframe externo, não recorta a área com `clip-path` e não modifica as sombras do widget.

### Referência do protocolo escolar

Em **Atendimento**, **Abrir chat da escola** abre a conversa pelo método público `window.$hub.toggle('open')` quando o canal está pronto. No detalhe, o solicitante pode copiar o número **PRO-** e enviá-lo ao atendente. A equipe pesquisa esse número em **Protocolos** no gestor. A conversa da central pode abranger vários assuntos da mesma conta.

A versão `b13ce0f` do HUB aplica `setConversationCustomAttributes` à última conversa do contato e substitui todo o conjunto de atributos dessa conversa. O SDK envia a operação sem confirmar o resultado ao portal. Para preservar os atributos de pré-atendimento da escola, a identificação no chat usa a referência comunicada pelo solicitante. Um vínculo automático exigiria uma operação do HUB que atualizasse uma única chave da conversa indicada e confirmasse a gravação. [Métodos públicos do SDK](https://github.com/wkarts/argws-connect-hub/blob/b13ce0f10eff17f038b40491f60a19f46e533b58/app/javascript/packs/sdk.js#L93) · [Gravação de atributos da conversa no HUB](https://github.com/wkarts/argws-connect-hub/blob/b13ce0f10eff17f038b40491f60a19f46e533b58/app/controllers/api/v1/widget/conversations_controller.rb#L66-L68)

O histórico público do PIGE360 recebe as mensagens enviadas pelo próprio portal ou pelo gestor. Para registrar um retorno tratado no chat, WhatsApp ou e-mail, a equipe usa **Responder ao solicitante**. As preferências de aviso por e-mail e WhatsApp são aplicadas aos envios da escola.

Continuam valendo as configurações por instituição/área, o token público da caixa, o tratamento de Retry-After e a preservação da conversa ao navegar entre áreas habilitadas da mesma escola e conta. As respostas atrasadas não montam um widget de um contexto anterior.

O SDK deve oferecer `hubSDK.destroy({ clearSession })`. A desmontagem em uma área desabilitada preserva a sessão; saída e troca de escola/conta solicitam sua limpeza. Downloads de SDK são serializados e reutilizados para evitar instâncias concorrentes. Nenhum token privado ou credencial deve ser colocado no snippet.

## Implantação

1. Publicar primeiro o SDK atualizado do HUB com o método `destroy` e invalidar o cache de `/packs/js/sdk.js`.
2. Publicar o frontend PIGE360 recompilado e atualizar o cache/PWA.
3. Conferir bolha, abertura/fechamento, sombra sem recorte, digitação e cliques no formulário, em desktop e celular.
4. Trocar de escola, sair/entrar em outra conta e navegar entre áreas habilitadas e desabilitadas.

Se o HUB ainda não oferecer o descarte, o portal apresenta a falha de inicialização com nova tentativa. Não monta um contexto que não possa encerrar na troca de conta. Nenhuma migration, alteração de configuração de caixa ou variável de ambiente é necessária.

### Cache do SDK após atualização

O carregador usa `/packs/js/sdk.js?pige_sdk=launcher-tooltip-1` para não reutilizar a URL sem versão, que pode ter sido armazenada pelo navegador com validade de um ano. Após o download, verifica `run` e `destroy`. Se faltar um desses métodos, baixa uma única cópia adicional com `pige_reload` exclusivo. Ao receber um SDK compatível, reutiliza-o nas áreas da mesma sessão, sem novos downloads.

Se o servidor continuar entregando um SDK antigo, informa essa causa no botão de recuperação; falhas de download e ausência do SDK têm mensagens próprias. A atualização automática não usa polling, não remove proteções e não monta o widget sem descarte seguro. O botão de nova tentativa permite repetir a busca após corrigir a publicação.

Rollback: restaurar a imagem anterior do portal. A API adicional do SDK pode permanecer publicada; se também for revertida, reverter o portal primeiro.

## Validação

`npm run build --prefix frontend` inclui smoke tests da montagem direta, reutilização, recuperação e descarte. `python scripts/e2e-support.py` cobre o fluxo visual com SDK sintético e somente dados de teste. Homologação contra a versão publicada do HUB continua necessária após implantar os dois componentes.


### Título da bolha

O campo **Título do botão ao passar o mouse**, no atendimento da escola, usa `Abrir Conversa` por padrão. É independente do **Texto do botão** (`launcher_title`), que continua controlando o texto do botão expandido. O novo campo `launcher_tooltip` aceita até 120 caracteres; vazio restaura o padrão, e clientes antigos que omitem o campo preservam o valor salvo.

A configuração pública entrega `launcherTooltip`, encaminhado a `window.hubSettings.launcherTooltip`. O SDK do HUB deve estar atualizado com suporte a essa opção. Publique primeiro o HUB com sua migração e depois o PIGE com a migração `0065_support_launcher_tooltip`. A revisão da URL do SDK foi incrementada para evitar reutilizar o script anterior em cache. O chat continua usando o SDK direto, sem iframe envolvendo a bolha.
