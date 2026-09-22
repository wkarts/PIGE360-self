#!/usr/bin/env bash
# Apenas um projeto descartável pige360-ci-*. Nunca usa os volumes da instalação.
set -Eeuo pipefail
cd "$(dirname "$0")/../.."
IMAGE="${1:?Informe a imagem}"
MODE="${2:-remote}"
[[ "$MODE" == remote || "$MODE" == local ]]
mkdir -p ci-evidence
ENVFILE="$(mktemp)"
PROJECT="pige360-ci-${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}-${RANDOM}"
export APP_IMAGE="$IMAGE" APP_PULL_POLICY=never COMPOSE_PROJECT_NAME="$PROJECT"
python - "$ENVFILE" <<'PY'
import base64, os, secrets, sys
values={'APP_SECRET_KEY':secrets.token_urlsafe(48),'SETUP_TOKEN':secrets.token_urlsafe(32),
        'POSTGRES_PASSWORD':secrets.token_urlsafe(36), 'APP_ENV':'production',
        'APP_URL':'http://localhost','APP_PORT':'0','APP_BIND':'127.0.0.1',
        'COOKIE_SECURE':'false','ALLOWED_HOSTS':'localhost,127.0.0.1',
        'INTEGRATION_ENCRYPTION_KEY':base64.urlsafe_b64encode(secrets.token_bytes(32)).decode()}
with open(sys.argv[1],'w') as f:f.writelines(f'{k}={v}\n' for k,v in values.items())
os.chmod(sys.argv[1],0o600)
PY
compose() { docker compose --env-file "$ENVFILE" -p "$PROJECT" -f deploy/compose.yaml "$@"; }
cleanup() {
  code=$?
  compose ps --all > ci-evidence/docker-ps.txt 2>&1 || true
  compose logs --no-color --tail=150 > ci-evidence/docker-smoke.log 2>&1 || true
  # Secrets gerados nunca são publicados junto aos logs.
  if [[ "$PROJECT" == pige360-ci-* ]]; then compose down --volumes --remove-orphans >/dev/null 2>&1 || true; fi
  rm -f "$ENVFILE"
  exit "$code"
}
trap cleanup EXIT
if [[ "$MODE" == remote ]]; then docker pull "$IMAGE"; fi
docker pull "${POSTGRES_IMAGE:-postgres:17-bookworm}"
compose config --quiet
compose up -d --wait --wait-timeout 240
ADDRESS="$(compose port app 8000)"
python - "$ADDRESS" "$IMAGE" <<'PY'
import json,sys,urllib.request
url='http://'+sys.argv[1]
result={}
for path in ['/health/live','/health/ready','/','/online.html','/manifest.webmanifest','/build-info.json']:
    with urllib.request.urlopen(url+path,timeout=15) as r:
        body=r.read();assert r.status==200
        result[path]=r.status
        if path=='/build-info.json':result['frontend']=json.loads(body)
result['image']=sys.argv[2]
with open('ci-evidence/docker-smoke.json','w') as f:json.dump(result,f,indent=2)
print(json.dumps(result,indent=2))
PY
