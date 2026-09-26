# Incorporação autorizada, identidade da escola e perfil do usuário

## Escopo

Uma instalação pertencente à escola. Não cria SaaS, cliente compartilhado, SSO, acesso sem senha, painel de atendimento dentro da escola ou integração bancária nova. As PRs anteriores de cadastros e navegação são preservadas.

## Autorizar a origem do HUB

Após atualizar a imagem e executar as migrations, abra a escola diretamente no navegador e entre como administrador.

**Instituição → Segurança → Incorporação no HUB → Autorizar origens de iframe**

Marque a permissão e informe uma origem completa por linha. Para o endereço mostrado na solicitação:

```text
https://hub-dev.argws.com.br
```

Não inclua `/app/accounts/...`, credenciais, parâmetros, fragmentos ou `*`. Subdomínios e portas diferentes são origens diferentes. Até 12 origens são aceitas. A lista começa vazia, sem aplicações ou domínios pré-autorizados. Confirme a senha atual para salvar.

A configuração é persistida no banco, versionada e auditada. A alteração da ativação/lista revoga as sessões administrativas e do portal: todos precisam entrar novamente; páginas já renderizadas não podem ser apagadas remotamente, mas suas próximas chamadas autenticadas são recusadas. A nova CSP vale no próximo carregamento.

Desativar a opção bloqueia toda incorporação, preservando a lista para revisão. Salvar pela interface substitui o valor inicial do ambiente, inclusive quando a escolha salva é desativar. Não há reinício por troca de origens.

Pré-requisitos no ambiente, mantidos no `.env` existente:

```dotenv
APP_URL=https://pige360.colegionavegantessaj.com.br
COOKIE_SECURE=true
```

`EMBED_ALLOWED_ORIGINS` continua disponível como bootstrap opcional para implantação automatizada. Os Compose têm o passthrough, mas a configuração pela tela não depende de modificar o Compose para inserir origens. Se usar a variável, atualize o Compose correspondente. Nunca substitua as demais senhas ou caminhos de armazenamento.

## Segurança e sessão no iframe

Sem autorização: `X-Frame-Options: DENY` e `frame-ancestors 'none'`.

Com autorização: a aplicação envia CSP com `'self'` e as origens exatas, sem X-Frame-Options conflitante. Não amplia CORS nem autoriza chamadas diretas do HUB à API. O login continua local à escola e os perfis de acesso permanecem intactos. Cookies de renovação/portal usam `HttpOnly; Secure; SameSite=None; Partitioned`; os tokens de acesso permanecem em memória. Não são gravadas senhas em URL, localStorage ou postMessage.

A sessão particionada do HUB pode exigir um login separado da janela direta. Isso não é SSO. Login e operações de sessão preservam proteção CSRF. O navegador e o contêiner do HUB precisam permitir scripts/formulários e origem do iframe; para arquivos, também downloads e abertura autorizada de janela. Browsers com políticas empresariais/bloqueio de armazenamento mais estritas podem impedir persistência; a tela oferece abertura direta.

O servidor/proxy pode acrescentar outra CSP ou X-Frame-Options. A lista no banco não consegue apagar esses cabeçalhos de uma camada externa. Não remova proteções de todos os sites: ajuste somente o virtual host da escola e o `frame-ancestors` conflitante, preservando as outras diretivas. O erro antigo do *widget do HUB dentro da escola* é uma direção diferente e não é confundido com *escola dentro do HUB*.

Verificação sem credenciais:

```bash
curl -sS -D - -o /dev/null 'https://pige360.colegionavegantessaj.com.br/'
```

Verifique todas as ocorrências de `Content-Security-Policy` e `X-Frame-Options`, inclusive as duplicadas pelo proxy. O iframe não deve ser liberado com wildcard.

## Identidade desde o primeiro HTML

O servidor injeta apenas a identidade pública e a versão em JSON não executável. Título e tela inicial já têm nome/logotipo da escola antes do Vue iniciar. Não existe fallback visual para logotipo ou nome do fornecedor. Antes da instalação, aparece um texto neutro.

O cliente reaproveita esse bootstrap, eliminando as buscas sequenciais iniciais de identidade e status de instalação. Recursos próprios permanecem locais; gzip, URLs de build e cache limitado de ativos públicos reduzem transferências. Os ativos históricos de marca/fontes do fornecedor deixam de ser precacheados. A sessão, a foto pessoal, os cadastros e o financeiro não entram nesse cache.

O rodapé técnico tem **PIGE360 · versão efetivamente informada pela aplicação**, sem “Instalação própria” e sem versão antiga fixa. O restante da interface/portal e os novos PDFs usam a escola. Nomes internos de pacotes, rotas legadas, imagens Docker e auditoria técnica não são renomeados.

Não é uma promessa de tempo de carregamento na VPS: latência, proxy e serviços externos não foram medidos na instalação real. Ao atualizar de uma PWA antiga, aplique a atualização oferecida e recarregue a página para substituir o service worker anterior.

## Relatórios e documentos

A nova emissão usa nome, logotipo, cores e fonte da identidade institucional. Metadados autor/criador/produtor também identificam a escola. Sem logotipo cadastrado, há apenas identificação textual, nunca a marca do fornecedor. Permanecem as informações do documento, permissões, registros de emissão, identificação do operador, assinatura e paginação.

Para a **mesma fonte na tela e no PDF**, envie TTF/WOFF2 estático com contornos TrueType e licença de uso web e incorporação em PDF. A validação recusa arquivo inválido, fonte variável/CFF ou restrições de incorporação/subconjuntos. Arquivos existentes não são removidos silenciosamente: uma fonte antiga incompatível precisa ser substituída para emitir com ela. Sem fonte própria, a opção serifada/sem serifa usa equivalente PDF padrão; não é prometida identidade exata entre fontes instaladas em computadores diferentes.

O template de emissão passa a versão 3. PDFs já emitidos, hashes e snapshots históricos **não são regravados**: para obter a nova apresentação, emita outro documento. Cálculos e operações bancárias não foram modificados.

## Meu perfil

Clique na foto/iniciais no cabeçalho. O usuário pode editar nome de exibição, telefone, cargo, setor, apresentação e foto. O e-mail de acesso só muda após confirmar a senha atual, com revogação de sessões e novo login. Há acesso ao fluxo existente de troca de senha.

Foto: PNG/JPEG/WebP de até 2 MB e 16 megapixels, normalizada em quadrado 512 px, sem metadados EXIF/GPS. Pode ser substituída ou removida; é privada, servida apenas ao próprio usuário autenticado, fora do cache público. Não altera a foto do cadastro acadêmico automaticamente. Perfil de acesso e unidades permanecem sob administração; enviar `role`, `school_ids` ou outro campo não permitido no perfil é rejeitado.

## Atualização e validação

Migrations aditivas: `0012_user_profile` e `0013_embedding_security`, após `0011_person_cadastres`. Preserve `.env`, dados e volumes e faça backup antes do upgrade. Não usar `down -v`.

```bash
npm run typecheck --prefix frontend
npm run build --prefix frontend
python -m unittest discover -s tests/ci -v
(cd backend && python -m pytest -q)
python scripts/e2e-whitelabel.py
```

O E2E novo usa dois sites HTTPS locais distintos, certificado de teste descartável, Chromium nativo com CSP ativa e cookie particionado. Verifica origem negada, origem permitida, login/reload/logout, perfil/foto, primeira carga e PDF. Não desabilita a CSP para fazer o teste passar. O CI mantém as regressões anteriores, PostgreSQL real e smoke Docker. O Chromium do ambiente local pode impedir navegação por política administrativa; isso não é contado como teste de iframe aprovado. Consulte o resultado da revisão no GitHub.

Documentação primária: [CSP frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors), [CHIPS](https://privacysandbox.google.com/cookies/chips), [proteção CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html), [fontTools WOFF2](https://fonttools.readthedocs.io/en/stable/_modules/fontTools/ttLib/woff2.html).
