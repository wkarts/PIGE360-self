#!/usr/bin/env bash
# Apenas um projeto descartável pige360-ci-*. Nunca usa os volumes da instalação.
set -Eeuo pipefail
cd "$(dirname "$0")/../.."
STACK_DIR="deploy/docker"
IMAGE="${1:?Informe a imagem}"
MODE="${2:-remote}"
[[ "$MODE" == remote || "$MODE" == local ]]
mkdir -p ci-evidence
ENVFILE="$(mktemp)"
PROJECT="pige360-ci-${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}-${RANDOM}"
export APP_IMAGE="$IMAGE" APP_PULL_POLICY=never COMPOSE_PROJECT_NAME="$PROJECT"
export POSTGRES_IMAGE="${POSTGRES_IMAGE:-ghcr.io/wkarts/pige360-self-postgres:17-bookworm}"
python - "$ENVFILE" <<'PYCONF'
import base64, os, secrets, sys
values={'APP_SECRET_KEY':secrets.token_urlsafe(48),'SETUP_TOKEN':secrets.token_urlsafe(32),
        'POSTGRES_PASSWORD':secrets.token_urlsafe(36), 'APP_ENV':'production',
        'APP_URL':'http://localhost','APP_PORT':'0','APP_BIND':'127.0.0.1',
        'COOKIE_SECURE':'false','ALLOWED_HOSTS':'localhost,127.0.0.1',
        'INTEGRATION_ENCRYPTION_KEY':base64.urlsafe_b64encode(secrets.token_bytes(32)).decode()}
with open(sys.argv[1],'w') as f:f.writelines(f'{k}={v}\n' for k,v in values.items())
os.chmod(sys.argv[1],0o600)
PYCONF
compose() { docker compose --env-file "$ENVFILE" -p "$PROJECT" -f "$STACK_DIR/compose.yaml" "$@"; }
cleanup() {
  code=$?
  compose ps --all > ci-evidence/docker-ps.txt 2>&1 || true
  compose logs --no-color --tail=150 > ci-evidence/docker-smoke.log 2>&1 || true
  # Secrets gerados nunca são publicados junto aos logs.
  if [[ "$PROJECT" == pige360-ci-* ]]; then
    compose down --remove-orphans >/dev/null 2>&1 || true
    if command -v sudo >/dev/null 2>&1; then
      sudo rm -rf -- "$STACK_DIR/data-postgres" "$STACK_DIR/data-documents"
    else
      rm -rf -- "$STACK_DIR/data-postgres" "$STACK_DIR/data-documents" || true
    fi
  fi
  rm -f "$ENVFILE"
  exit "$code"
}
trap cleanup EXIT
if [[ "$MODE" == remote ]]; then docker pull "$IMAGE"; fi
docker pull "$POSTGRES_IMAGE"
compose config --quiet
compose up -d --wait --wait-timeout 240
# Nenhum serviço de longa duração pode permanecer Exited (inclui storage-init).
assert_healthy_services() {
  local service container
  for service in db storage-init app worker; do
    container="$(compose ps -q "$service")"
    [[ -n "$container" ]] || { echo "Serviço ausente: $service"; return 1; }
    [[ "$(docker inspect --format '{{.State.Status}}/{{.State.Health.Status}}' "$container")" == running/healthy ]] \
      || { echo "Serviço não saudável: $service"; return 1; }
  done
}
assert_healthy_services
# O processo do monitor deve ter abandonado root e suas capabilities.
compose exec -T storage-init python - <<'PYSTORAGE'
import json
from pathlib import Path
from app.storage_guard import drop_privileges, healthy, probe, STATE
payload = json.loads(STATE.read_text())
status = dict(line.split(':', 1) for line in Path(f"/proc/{payload['pid']}/status").read_text().splitlines() if ':' in line)
assert all(int(uid) == 10001 for uid in status['Uid'].split()), status['Uid']
assert all(int(gid) == 10001 for gid in status['Gid'].split()), status['Gid']
assert int(status['CapEff'].strip(), 16) == 0, status['CapEff']
assert status['NoNewPrivs'].strip() == '1', status['NoNewPrivs']
drop_privileges()
assert healthy(), 'Heartbeat do monitor deve estar saudável'
probe()
print('storage-init: running/healthy, UID/GID 10001, sem capabilities; escrita/leitura OK')
PYSTORAGE
# Restart precisa executar novamente o preparo e recuperar um heartbeat novo.
compose restart storage-init
compose up -d --wait --wait-timeout 240
assert_healthy_services
printf '{"services":["db","storage-init","app","worker"],"all_running_healthy":true,"storage_restart":true,"monitor_uid":10001,"monitor_capabilities":0}\n' > ci-evidence/docker-storage-health.json
ADDRESS="$(compose port app 8000)"
python - "$ADDRESS" "$IMAGE" <<'PYHTTP'
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
PYHTTP
