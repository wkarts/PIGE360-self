# Novidades — 0.4.0

## Chat de suporte Hub por empresa/tenant

- Integrado o widget de suporte do Hub ao shell Web/PWA.
- URL base, website token, posição, tipo e título do launcher configuráveis por empresa/tenant.
- Configuração administrativa separada de Pessoa, usuário, login, perfil e permissões cadastrais.
- Website token cifrado em repouso e nunca devolvido pela API administrativa.
- Carregamento contextual por escola ativa, com configuração pública mínima necessária ao SDK.
- CSP dinâmica limitada às origens habilitadas do Hub, incluindo WebSocket.
- Validação de URL e exigência de HTTPS em produção.
- Migration `0008_company_support_hub`.
- Testes FastAPI/PostgreSQL, E2E Chromium e smoke Docker Compose aprovados.

A release mantém a distribuição self-hosted Web/PWA e não executa deploy externo.
