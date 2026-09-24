# CloudPanel — PIGE360 Self

O arquivo `compose.yaml` desta pasta é a stack da aplicação. O CloudPanel fica somente na frente dela como reverse proxy HTTPS.

## Develop

- Use `.env.develop` a partir de `.env.develop.example`.
- Publique o site em `https://dev.escola.exemplo.com.br`.
- Encaminhe para `http://127.0.0.1:58081`.
- Defina `APP_URL=https://dev.escola.exemplo.com.br` e `ALLOWED_HOSTS=dev.escola.exemplo.com.br,localhost,127.0.0.1`.

## Production

- Use `.env.production` a partir de `.env.production.example`.
- Publique o site em `https://escola.exemplo.com.br`.
- Encaminhe para `http://127.0.0.1:58080`.
- Defina `APP_URL=https://escola.exemplo.com.br`, `COOKIE_SECURE=true` e `ALLOWED_HOSTS` com o hostname real.

Preserve `Host`, `X-Forwarded-Proto` e `X-Forwarded-For`. Preencha `TRUSTED_PROXY_IPS` somente com os IPs/CIDRs usados pelo proxy. Não abra PostgreSQL, worker ou os diretórios `data-*` na Internet.
