#!/bin/sh
set -eu
cd /app/backend
if [ "${1:-}" = "worker" ]; then
  exec python -m app.integration_worker
fi
python -m alembic upgrade head
if [ -n "${TRUSTED_PROXY_IPS:-}" ]; then
  exec python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips "$TRUSTED_PROXY_IPS"
fi
exec python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --no-proxy-headers
