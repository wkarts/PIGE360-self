#!/usr/bin/env bash
# Same contract in PR CI and publisher: live without API, never ready without it.
set -Eeuo pipefail
IMAGE="${1:?Informe a imagem do website}"
NAME="pige360-website-isolated-${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}-${RANDOM}"
STATE_DIR="$(mktemp -d "${TMPDIR:-/tmp}/pige360-website-smoke.XXXXXXXX")"
cleanup() {
  code=$?
  # Docker writes the ID before networking; also clean up a failed start.
  if [[ -s "$STATE_DIR/cid" ]]; then
    container="$(cat "$STATE_DIR/cid")"
    docker logs "$container" || true
    docker rm -f "$container" || true
  fi
  rm -rf -- "$STATE_DIR"
  exit "$code"
}
trap cleanup EXIT
# Port 1 on the container's own loopback has no listener; no DNS/external dependency.
docker run -d --cidfile "$STATE_DIR/cid" --name "$NAME" -p 127.0.0.1::8080 \
  -e PIGE_INTERNAL_URL=http://127.0.0.1:1 "$IMAGE" >/dev/null
CONTAINER="$(cat "$STATE_DIR/cid")"
ADDRESS="$(docker port "$CONTAINER" 8080/tcp)"
[[ "$ADDRESS" =~ ^127\.0\.0\.1:([0-9]+)$ ]] && (( BASH_REMATCH[1] > 0 )) \
  || { echo "Publicação loopback ausente ou inválida: $ADDRESS" >&2; exit 1; }
live="$(curl -fsS -o /dev/null -w '%{http_code}' --connect-timeout 3 --max-time 10 --retry 20 --retry-all-errors --retry-delay 1 \
  "http://$ADDRESS/health/live")"
[[ "$live" == 200 ]] || { echo "Liveness inesperada: $live" >&2; exit 1; }
status="$(curl -sS --connect-timeout 3 --max-time 10 -o /dev/null -w '%{http_code}' \
  "http://$ADDRESS/health/ready")"
if [[ "$status" != 503 ]]; then
  echo "Readiness isolada deveria ser 503 sem API; recebido: $status" >&2
  exit 1
fi
printf '\nPASS: website isolado live=200; readiness=503 sem API (contrato preservado)\n'
