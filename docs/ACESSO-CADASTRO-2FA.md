# Acesso no HUB, login institucional, 2FA e ficha única

Base de integração: `develop` / `1102da3d632b228f73faed221e9435989c85285d`.
Esta mudança preserva a aplicação self-hosted da escola, unidades, identidade,
perfil com foto, relatórios institucionais, integrações e os quatro serviços Docker.
Não transforma a instalação em SaaS nem adiciona clientes pré-cadastrados.

## O diagnóstico do HUB

O probe informado executa **HEAD anônimo**, não um login e não um GET dentro do
navegador. A rota de entrada agora aceita GET e HEAD, devolvendo 200 e nenhum corpo
no HEAD. Ambos recebem a mesma CSP e a política efetiva de incorporação. Uma
requisição HEAD não precisa trazer Origin/Referer para receber a allowlist.

`frame-ancestors 'none'` e `X-Frame-Options: DENY` continuam corretos **quando não
existe uma autorização ativa**. Não se deve liberar qualquer pai do iframe só
porque seu endereço veio em uma requisição. O cadastro é explícito:

1. Atualize a imagem contendo esta revisão e aplique as migrations.
2. Confirme APP_URL com a origem HTTPS real e COOKIE_SECURE=true.
3. Em **Instituição → Segurança da instituição → Autorizar origens de iframe**,
   ative a incorporação e cadastre a origem exata `https://hub-dev.argws.com.br`.
   Não inclua `/app/...`; subdomínios e portas diferentes são origens diferentes.
4. Confirme sua senha, salve e autentique novamente. A alteração revoga sessões
   e desafios de autenticação pendentes. Recarregue o aplicativo no HUB.
5. Use **Verificar resposta pública de iframe** na mesma janela para conferir o
   status HEAD, a versão respondida e os cabeçalhos efetivos vistos pelo navegador.

Com autorização ativa, a aplicação não emite X-Frame-Options e inclui a origem
exata em frame-ancestors. Fora dessa condição, bloqueia por padrão. Não abre CORS,
não compartilha senhas, não cria SSO e não remove CSRF. A sessão incorporada
continua usando cookies seguros, HttpOnly e particionados.

A configuração salva pela interface prevalece sobre o bootstrap opcional
EMBED_ALLOWED_ORIGINS. Alterar apenas o .env não sobrepõe uma decisão já salva.
O Compose antigo ainda pode ser utilizado se a configuração for pela interface;
o passthrough dessa variável já fazia parte da PR16.

Se CloudPanel/Nginx/Cloudflare acrescentarem outra CSP ou X-Frame-Options, revise
**somente o virtual host da aplicação escolar**. Não remova proteções globalmente
nem troque as diretivas por curingas. Todas as políticas recebidas precisam permitir
a origem, e todos os ancestrais de frames aninhados devem estar autorizados. O
HUB também deve permitir o destino em sua própria CSP/sandbox. Um teste de headers
não substitui o teste de login e navegação pelo navegador.

Nenhuma autorização foi gravada na VPS por esta PR. Não se executou deploy remoto.
A versão estável anterior não recebe o novo código apenas por reiniciar o container.

## Login: remoções pontuais

Removidos somente os elementos marcados: selo Gestão escolar, trecho WEB / PWA,
parágrafo secundário, lista numerada de recursos e texto inferior sobre instalação.
Logotipo, slogan principal, duas colunas, tipografia, cores e campos de acesso
permanecem. Os estilos adicionais de MFA não redesenham a tela de login.

**Instituição → Personalizar identidade visual → Exibir botão de pré-matrícula
na tela de login** controla a exibição do atalho. O padrão anterior é preservado.
Ocultar o atalho não desativa o portal nem apaga inscrições; a decisão persiste
na identidade institucional e já chega no primeiro HTML.

## 2FA por usuário ou obrigatório pela instituição

**Meu perfil → Segurança · 2FA** permite configurar um aplicativo autenticador
compatível com TOTP: QR local ou chave manual, senha atual e confirmação do código.
A foto e os dados do perfil existente foram preservados. Dez códigos de recuperação
são mostrados uma vez; cada um é consumido atomicamente. Regenerar invalida os antigos.

**Instituição → Segurança da instituição → Política de 2FA** permite exigir o fator
para todas as contas interativas da instalação, **incluindo usuários do portal**.
O administrador precisa proteger sua própria conta e confirmar senha + segundo
fator antes de mudar essa política. A migração deixa a obrigatoriedade desativada.

Quando obrigatório, usuários ainda não configurados passam por ativação após a
senha e não recebem sessão plena antes da confirmação. A exigência também é
verificada na renovação de sessão e nos acessos autenticados. Alterar a política
revoga sessões e desafios; desmarcar a obrigatoriedade não desliga fatores individuais.
No modo obrigatório, não é possível desligar o fator individualmente.

Desafios opacos duram cinco minutos e admitem cinco erros, com limites adicionais
compartilhados no banco por conta/token/IP. TOTP: RFC6238, SHA1, seis dígitos, 30s,
tolerância de um passo para relógios. Um passo já usado é rejeitado inclusive em
requisições simultâneas. Relógios do servidor e do celular devem estar sincronizados.
TOTP não é resistente a phishing; não se apresenta como passkey/WebAuthn.

Segredos ficam criptografados via chave derivada do APP_SECRET_KEY; tokens de
desafio e códigos de recuperação persistem apenas como hash. Chave, QR e códigos
não entram nos endpoints normais de perfil, logs ou armazenamento local do browser.
**Faça backup do APP_SECRET_KEY junto com o banco**; não o substitua arbitrariamente.

Perda do aparelho: utilize um código de recuperação. Existe reset administrativo
protegido por senha+2FA em `/api/v1/institution/mfa/reset` para outra conta, com
justificativa e auditoria. Para recuperação presencial pelo operador autorizado da
instalação, sem códigos disponíveis, existe a CLI local:

```sh
python -m app.cli reset-mfa administrador@escola.example --reason "Identidade conferida presencialmente pela administração"
# Conta do portal: acrescentar --subject portal --school-id <UUID-da-escola>
```

A CLI pede confirmação interativa do e-mail, registra auditoria e revoga sessões,
desafios e códigos anteriores. Não altera a obrigatoriedade, não redefine senha
nem oferece uma rota pública alternativa de autenticação.

## Ficha única simplificada e família

Os tipos são chips no topo com seletor pesquisável. Não há mais o multiselect longo
nem a seção Tipos e vínculos. Apenas Dados gerais, Contatos e endereço, Dados
específicos e Vínculos (quando aplicável). Campos complementares ficam recolhíveis.
Os formulários específicos continuam abrindo com o tipo do contexto selecionado.

Pai/mãe/responsabilidades são representados no relacionamento com cada aluno.
Tipos legados continuam preservados; a apresentação agrupa seus aliases sem apagar
a informação. Campos de filiação textual também não são apagados nem convertidos
por suposição. Tipos não concedem login ou permissões.

A mesma tabela GuardianLink é lida em ambos os lados. É possível buscar uma pessoa
existente ou cadastrar a contraparte na própria ficha. Parentesco não marca legal,
financeiro, retirada ou contato principal automaticamente. Não há matrícula escolar
implícita: criar perfil de aluno e efetivar matrícula são operações diferentes.

Alterações da pessoa, perfis, vínculos e foto são enviadas pelo Salvar principal em
uma transação. Adicionar à ficha só prepara a mudança; Cancelar descarta o rascunho.
Uma falha reverte o conjunto. Vínculos antigos são desativados/reativados, não
apagados. Versões concorrentes, duplicações, autorrelacionamento e acesso a pessoas
de outra escola são rejeitados. Relações extensas têm paginação e não são apagadas
por não estarem na primeira página.

## GHCR e atualização

O publicador deixava de construir uma base ausente porque confundia `502`/`503`
dentro do hash com status HTTP. Agora a referência exata é retirada da mensagem
antes da classificação dos diagnósticos. Erros reais de autorização, rede e serviço
continuam falhando; hashes, aliases estáveis e regras de retenção não foram mudados.
Há regressão com o hash exato informado e cenário de construção/reutilização.

Nova migration aditiva: `0014_mfa`, após `0013_embedding_security`. Sem remoção de
pessoas, vínculos, documentos ou imagens estáveis. Dependência adicionada: qrcode
8.2 para gerar QR no próprio servidor, sem serviço externo. Bases devem mudar pelo
fingerprint de dependências, não a cada alteração visual.

Faça backup antes de atualizar. Preserve .env, banco, documentos e chaves. Não use
`down -v`. As regras de cálculo/emissão, integrações e volumes não foram alteradas.
A abertura automática de PR não significa merge, release ou deploy automático.

## Validação

Os testes de backend cobrem perfis, HEAD, autorização, MFA, replay, recuperação,
revogação, obrigatoriedade no portal e transação familiar. Os E2E existentes são
mantidos e foi incluído e2e-access.py. O teste HTTPS cross-site exercita login com
2FA dentro de iframe autorizado e rejeita origem não permitida, sem remover CSP.
O resultado conclusivo é o CI da revisão publicada; inspeção local via harness
não comprova cookies, TLS, CSP ou iframe nativos. Provedores externos e a VPS real
não são homologados por dados sintéticos do CI.
