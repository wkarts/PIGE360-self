# Prontidão da configuração do site

## Evidência

No pós-merge PIGE run `40100541986`, job `120891801244`, o E2E
`scripts/e2e-completion.py:139` expirou procurando o campo “Domínio público do
site” depois de clicar em “Configurar site”. O artefato `12562418716` contém
`browser/completion/server.log` e duas capturas anteriores, mas não captura ou
trace do instante da falha. As leituras de community-posts e website retornaram
200. Esses dados não demonstram, isoladamente, uma causa única.

A revisão encontrou uma corrida preexistente reproduzível: `toggleWebsite()`
ignora ações enquanto `s.busy`, mas o botão permanecia habilitado. Um clique
durante as leituras iniciais era descartado e o formulário continuava fechado.
O teste determinístico segura separadamente as respostas de posts e website,
reproduz o clique descartado e verifica a propriedade disabled no VNode real
compilado. Falhou antes da correção e passou depois.

## Correção restrita

- O botão utiliza `:disabled="s.busy"`, refletindo o guard já existente.
- O E2E espera botão habilitado e formulário visível antes de preencher.
- Não há aumento de timeout, retry cego, supressão de asserção ou mudança de API.
- Manifest, registro de service worker e política PWA permanecem intactos.
  O build existente regenera renders.js e o hash dos arquivos de distribuição.
- Nenhum código financeiro, configuração de produção ou arquivo CRM é alterado.

## Validação e limites

O teste Node de carregamento retardado e os smoke tests do build foram executados.
A suíte de políticas possui 257 testes (um skip). Node local24 difere do Node22
usado no CI. O primeiro build local parou por dependência TypeScript ausente no
novo worktree; reutilizar a instalação local já fixada permitiu o build completo.
Chromium/HTTP e PostgreSQL desta correção dependem da CI; não foram executados
localmente. Esta correção requer PR para develop e autorização própria de merge.
