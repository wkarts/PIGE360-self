# Correção do Cadastro Único e identidade da escola

PIGE360 Self é a aplicação da escola, instalada na infraestrutura da instituição.
Unidades são unidades dessa escola. Esta entrega não cria um SaaS, painel de
clientes, assinatura, provisionamento de terceiros ou nova camada de tenancy.
Cadastros históricos, identificadores, vínculos, permissões e bancos permanecem.

## Mudanças

- `newPerson` passa a ser exposta pelo `setup()` que o template já utiliza.
- O build renderiza o shell compilado e abre o formulário de pessoa em teste,
  além do typecheck. Uma nova falta desse vínculo faz o build falhar.
- O E2E cria e edita uma pessoa com múltiplos tipos pela interface e consulta o
  registro persistido. No CI, também recarrega a página pelo navegador HTTP.
- Login, navegação, cabeçalhos dos formulários, portal dos responsáveis, título,
  favicon e manifesto PWA usam a identidade da escola. A referência discreta ao
  PIGE360 permanece no rodapé técnico; ativos antigos não foram destruídos.
- A tela Instituição oferece identidade, dados da mantenedora e as unidades
  acadêmicas já existentes. Não apresenta botões para criar clientes independentes.
- A mantenedora pode ter seu documento corrigido sem criar outra empresa/escola.
  Credenciais e operações bancárias continuam separadas da Connect API.
- Um teste da Connect API foi corrigido para considerar as instâncias anteriores
  da mesma mantenedora na fixture de banco compartilhada. A comparação continua
  exata e verifica que apenas a instância escolhida permanece como primária.

## Atualização e persistência

A migration aditiva `0010_institution_identity`, posterior a
`0009_connect_instances`, acrescenta uma tabela de identidade versionada e
uma tabela de ativos institucionais. Não altera documentos, pessoas ou matrículas.
Faça backup antes da atualização e execute as migrations pelo fluxo existente.
O downgrade remove somente essa personalização nova: restaure o backup para
recuperá-la após um downgrade. Não há migração destrutiva dos cadastros escolares.

O nome inicial é obtido da escola cadastrada primeiro, de forma determinística,
sem alternar a marca conforme o seletor de contexto. Depois do primeiro login,
um administrador acessa **Instituição → Personalizar identidade visual**.
Logo e fonte opcionais, de até 2 MB por arquivo, ficam no banco da instalação e
são incluídos no backup PostgreSQL. Não ficam na camada descartável da imagem.
O formulário salva metadados e ativos na mesma transação; uma versão desatualizada
é rejeitada com 409. Somente o administrador da instalação altera essa identidade.
Os demais perfis continuam sujeitos às permissões existentes.

O logotipo aceita PNG, JPEG e WebP; é normalizado para PNG sem metadados EXIF,
com transparência quando houver. SVG enviado pelo usuário não é aceito para
não publicar conteúdo ativo. Os ícones PWA 32/180/192/512 usam o mesmo logotipo;
sem logotipo usam iniciais da escola, não a marca do fornecedor. O manifesto
mantém `id` e `scope` para não criar outro aplicativo instalado.
A atualização do nome/ícone de uma PWA já instalada depende do navegador/SO.

Tipografias locais predefinidas: sistema, Arial, Verdana, Georgia e Times New
Roman. A fonte própria usa WOFF2, com confirmação da licença de uso web.
A aplicação verifica formato/cabeçalho e tamanho; a validação completa da fonte
é feita pelo navegador. Nenhum arquivo de fonte é distribuído neste checkpoint.
O tema principal não usa Google Fonts nem CDN.

Endpoints públicos mínimos: `/api/v1/institution/identity`, `/theme.css`,
`/icon.png` e `/assets/{hash}` sob o mesmo prefixo; e `/manifest.webmanifest`.
A escrita de identidade usa PUT multipart autenticado com `payload`, `logo`
e `font`. Somente ativos atualmente referenciados ficam acessíveis. O cache
PWA pode guardar somente esses recursos públicos; autenticação, cadastros,
boletos e outras rotas da API não entram nesse cache.

## HUB: o que é local e o que exige configuração do servidor externo

O carregador agora isola exceções do SDK e respostas antigas de configuração.
Uma falha do atendimento não pode impedir que a tela de pessoas seja renderizada.
Com HUB ativo, a CSP autoriza somente os hosts exatos `fonts.googleapis.com`
e `fonts.gstatic.com` utilizados pelos estilos do widget. Sem HUB ativo, as
fontes continuam restritas à própria origem. Nenhuma autorização com `*`,
`unsafe-eval` ou liberação de enquadramento da aplicação foi adicionada.

**`X-Frame-Options: SAMEORIGIN` recebido do HUB não pode ser removido pelo
JavaScript nem pelos cabeçalhos da aplicação escolar.** É preciso verificar
no navegador a URL exata do iframe e seus redirecionamentos. Pode ser um
redirecionamento incorreto para `/` ou um cabeçalho global do proxy no HUB.
Use a resposta final desse endereço para o diagnóstico, não apenas o SDK:

```sh
curl --silent --show-error --location --dump-header - --output /dev/null "$WIDGET_URL"
```

No servidor do HUB, ajuste somente a rota destinada ao widget para permitir
`frame-ancestors` com a origem HTTPS exata da aplicação escolar. Não remova
X-Frame-Options ou CSP de todo o painel administrativo do HUB. Se CloudPanel,
Cloudflare ou outro proxy acrescentar uma segunda CSP restritiva, essa política
também precisa ser examinada pelo administrador. Os cabeçalhos são cumulativos.
A URL real do widget e a configuração do proxy não foram alteradas por esta entrega.

Referências técnicas:
- https://vuejs.org/api/composition-api-setup
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Frame-Options
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors

## Validação e entrega

```sh
npm ci --prefix frontend --ignore-scripts
npm run typecheck --prefix frontend
npm run build --prefix frontend
python -m unittest discover -s tests/ci -v
python scripts/ci/validate.py
cd backend && PYTHONPATH=. python -m pytest -q
```

O CI existente executa PostgreSQL real, E2E HTTP, build Docker e smoke. Os
artefatos `frontend/dist` são regenerados pelo build, também no Dockerfile;
não edite `renders.js` manualmente. O identificador do service worker muda com
a nova entrega. Após atualizar a instalação, use o aviso **Atualizar aplicação**
para ativar o novo shell quando existir uma PWA anterior em execução.

O harness `PIGE_UI_BRIDGE=1` continua exclusivamente para inspeção local quando
o Chromium bloqueia URLs. Ele não substitui HTTP, cookies nativos, CSP,
download nativo ou instalação PWA. O CI permanece sem bridge.

Nenhum merge em main, publicação de latest ou deploy em VPS está implícito
neste checkpoint. Produção segue `develop → main` pelo fluxo de release existente.
