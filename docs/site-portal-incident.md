# Site institucional e portal: diagnóstico e validação

## Origem do 503

Na consulta pública somente de leitura em 21/10/2026, o domínio do portal respondeu HTTP 200 e a página do site respondeu HTTP 503. A API do site estava saudável, mas `GET /api/v1/public/website` respondeu HTTP 404. No código de `develop` consultado, a seleção padrão exige exatamente uma publicação habilitada de escola ativa; o serviço do site convertia qualquer 404 upstream em “temporariamente indisponível” (503). Portanto, a falha observada não demonstra sobrecarga: a requisição pública da API que reproduz a seleção padrão falhou com 404, e o handler mascarava a falha de configuração como 503.

Não houve acesso ao banco, ambiente CloudPanel, logs do container ou digest implantado. A consulta não permite determinar se o registro está ausente/desabilitado, se há mais de uma publicação ou se o processo em produção usa uma configuração legada de `WEBSITE_SCHOOL_ID`. Também não permite afirmar que produção executa o mesmo commit de `develop`. A alteração resolve a seleção por domínio quando a origem correta está cadastrada; confirmar ou ajustar essa origem e a variável legada é uma etapa de implantação autorizada.

## Correção preparada

- Resolução exata por `Host` contra a origem HTTPS de `public_url` em cada escola ativa e publicada; origem repetida retorna conflito, host desconhecido retorna 404 e nenhuma escola é escolhida implicitamente.
- Rota interna por domínio autenticada com `WEBSITE_INTERNAL_TOKEN`, além da rota pública que retorna somente conteúdo já aprovado como público.
- A origem HTTPS do Host é sempre consultada primeiro, mesmo se houver `WEBSITE_SCHOOL_ID` antigo. Esse ID fica como fallback de compatibilidade para instalação de escola única sem domínio cadastrado; assim ele não pode sobrepor a escola associada ao domínio público correto.
- Readiness do site verifica a readiness da API. Erros HTTP têm mensagem pública segura e log sanitizado com categoria, status upstream, rota lógica e ID de atendimento.
- CSS do portal da família reforça encolhimento, quebra de nomes e links longos, alvos de toque, formulários e navegação em telas estreitas.

Não há migração nem mudança de esquema. O E2E usa SQLite descartável e dados fictícios; produção, volumes, contas, documentos, segredos e configuração não são tocados.

## Testes

O conjunto cobre seleção de duas escolas por host, normalização de host, domínio desconhecido e duplicado, compatibilidade da rota padrão, autorização da rota interna, operação HTTP do serviço do site e readiness. O E2E de Chromium autentica aluno e responsável no serviço independente do portal, verifica renovação da sessão, navegação, vínculo com o aluno e limite de acesso financeiro. Também verifica 320, 360, 390, 768, 1024, 1440 e 844×390, além de uma largura CSS de 720 px equivalente ao espaço de layout de uma tela de 1440 px em zoom de 200%. Capturas e `results.json` são gerados no diretório de evidências definido pelo CI.

O runner local não tem Firefox ou WebKit instalados; o workflow do repositório também configura Chromium apenas. Portanto a validação de navegador desta alteração cobre Chromium, sem afirmar cobertura de outro motor.

## Implantação e rollback

Esta PR não faz merge nem deploy. Após aprovação e merge, a implantação depende de autorização específica. Antes dela, confirme que `public_url` contém a origem `https://ww2.colegionavegantessaj.com.br` na escola correta, que a instância ainda usa `WEBSITE_SCHOOL_ID` compatível ou vazio, e que tokens correspondem sem copiá-los para evidência. Preserve o projeto Compose e os volumes atuais. Para rollback, restaure a imagem/tag anterior e a variável de seleção que estava efetiva; nenhuma operação destrutiva de banco é necessária.
