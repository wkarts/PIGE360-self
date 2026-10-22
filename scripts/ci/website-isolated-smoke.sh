#!/usr/bin/env bash
# Same contract in PR CI and publisher: live without API, never ready without it.
set -Eeuo pipefail
IMAGE="${1:?Informe a imagem do website}"
NAME="pige360-website-isolated-${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}-${RANDOM}"
CONTAINER=''
cleanup() {
  code=$?
  if [[ -n "$CONTAINER" ]]; then
    docker logs "$CONTAINER" || true
    docker rm -f "$CONTAINER" || true
  fi
  exit "$code"
}
trap cleanup EXIT
# Port 1 on the container's own loopback has no listener; no DNS/external dependency.
CONTAINER="$(docker run -d --name "$NAME" -p 127.0.0.1:58082:8080 \
  -e PIGE_INTERNAL_URL=http://127.0.0.1:1 "$IMAGE")"
live="$(curl -fsS -o /dev/null -w '%{http_code}' --connect-timeout 3 --max-time 10 --retry 20 --retry-all-errors --retry-delay 1 \
  http://127.0.0.1:58082/health/live)"
[[ "$live" == 200 ]] || { echo "Liveness inesperada: $live" >&2; exit 1; }
status="$(curl -sS --connect-timeout 3 --max-time 10 -o /dev/null -w '%{http_code}' \
  http://127.0.0.1:58082/health/ready)"
if [[ "$status" != 503 ]]; then
  echo "Readiness isolada deveria ser 503 sem API; recebido: $status" >&2
  exit 1
fi
printf '\nPASS: website isolado live=200; readiness=503 sem API (contrato preservado)\n'
