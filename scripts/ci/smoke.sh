#!/usr/bin/env bash
# Apenas um projeto descartável pige360-ci-*. Nunca usa os volumes da instalação.
set -Eeuo pipefail
cd "$(dirname "$0")/../.."
IMAGE="${1:?Informe a imagem}"
MODE="${2:-remote}"
[[ "$MODE" == remote || "$MODE" == local ]]
mkdir -p ci-evidence
# Bind mounts relativos pertencem ao diretorio do compose. Nunca use os
# data-postgres/data-documents de uma instalacao real para o smoke test.
STACK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/pige360-smoke.XXXXXXXX")"
cp deploy/docker/compose.yaml "$STACK_DIR/compose.yaml"
mkdir -p "$STACK_DIR/services"
cp -a services/mail-agent services/sogo "$STACK_DIR/services/"
sed -i 's#../../services/#./services/#g' "$STACK_DIR/compose.yaml"
touch "$STACK_DIR/.pige360-smoke-owned"
ENVFILE="$STACK_DIR/.env.ci"
PROJECT="pige360-ci-${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}-${RANDOM}"
export APP_IMAGE="$IMAGE" APP_PULL_POLICY=never COMPOSE_PROJECT_NAME="$PROJECT"
if [[ "$MODE" == local ]]; then
  export MAIL_AGENT_IMAGE=pige360-mail-agent:ci SOGO_IMAGE=pige360-sogo:ci
fi
export POSTGRES_IMAGE="${POSTGRES_IMAGE:-ghcr.io/wkarts/pige360-self-postgres:17-bookworm}"
python - "$ENVFILE" <<'PYCONF'
import base64, os, secrets, sys
values={'APP_SECRET_KEY':secrets.token_urlsafe(48),'SETUP_TOKEN':secrets.token_urlsafe(32),
        'POSTGRES_PASSWORD':secrets.token_urlsafe(36), 'APP_ENV':'production',
        'APP_URL':'http://localhost','APP_PORT':'0','APP_BIND':'127.0.0.1',
        'COOKIE_SECURE':'false','ALLOWED_HOSTS':'localhost,127.0.0.1',
        'INTEGRATION_ENCRYPTION_KEY':base64.urlsafe_b64encode(secrets.token_bytes(32)).decode(),
        'MAIL_AGENT_SHARED_KEY':secrets.token_urlsafe(48),'SOGO_DB_PASSWORD':secrets.token_urlsafe(36),
        'SOGO_UPSTREAM_URL':'http://sogo','SOGO_SMTP_SERVER':'smtp://smtp.example.invalid'}
with open(sys.argv[1],'w') as f:f.writelines(f'{k}={v}\n' for k,v in values.items())
os.chmod(sys.argv[1],0o600)
PYCONF
compose() { docker compose --env-file "$ENVFILE" -p "$PROJECT" -f "$STACK_DIR/compose.yaml" "$@"; }
cleanup() {
  code=$?
  compose ps --all > ci-evidence/docker-ps.txt 2>&1 || true
  compose logs --no-color --tail=150 > ci-evidence/docker-smoke.log 2>&1 || true
  if [[ "$code" -ne 0 ]]; then
    echo "Falha no smoke Docker; diagnóstico sanitizado do SOGo:"
    compose ps --all sogo || true
    python - "$ENVFILE" ci-evidence/docker-smoke.log <<'PYREDACT'
import pathlib, sys
env_path, log_path = map(pathlib.Path, sys.argv[1:])
content = log_path.read_text(errors="replace")
for line in env_path.read_text().splitlines():
    key, sep, value = line.partition("=")
    if sep and value:
        content = content.replace(value, "[REDACTED]")
print("\\n".join(line for line in content.splitlines() if "sogo" in line.lower())[-12000:])
PYREDACT
    container="$(compose ps -q sogo)"
    if [[ -n "$container" ]]; then
      docker inspect --format '{{json .State.Health}}' "$container" | python -c 'import json,sys; d=json.load(sys.stdin); [print(json.dumps(x)) for x in d.get("Log", [])[-5:]]' || true
    fi
  fi
  # Secrets gerados nunca são publicados junto aos logs. O marker foi criado
  # no mesmo diretorio temporario retornado pelo mktemp desta execucao.
  if [[ "$PROJECT" == pige360-ci-* ]]; then
    compose down --remove-orphans >/dev/null 2>&1 || true
    if [[ -f "$STACK_DIR/.pige360-smoke-owned" ]]; then
      if ! rm -rf -- "$STACK_DIR" 2>/dev/null; then
        if command -v sudo >/dev/null 2>&1; then
          sudo -n rm -rf -- "$STACK_DIR" || echo "Aviso: remova manualmente a stack temporária $STACK_DIR" >&2
        else
          echo "Aviso: remova manualmente a stack temporária $STACK_DIR" >&2
        fi
      fi
    fi
  fi
  exit "$code"
}
trap cleanup EXIT
if [[ "$MODE" == remote ]]; then
  : "${MAIL_AGENT_IMAGE:?Informe a imagem do agente pelo digest}" "${SOGO_IMAGE:?Informe a imagem SOGo pelo digest}"
  docker pull "$IMAGE"
  docker pull "$MAIL_AGENT_IMAGE"
  docker pull "$SOGO_IMAGE"
fi
docker pull "$POSTGRES_IMAGE"
compose config --quiet
compose up -d --wait --wait-timeout 240
# Nenhum serviço de longa duração pode permanecer Exited (inclui storage-init).
assert_healthy_services() {
  local service container
  for service in db storage-init app mail-agent sogo worker worker-ocr; do
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
# Parada deve ser normal (exit 0), não morte forçada de um init sem CAP_KILL.
STORAGE_CONTAINER="$(compose ps -q storage-init)"
compose stop --timeout 10 storage-init
[[ "$(docker inspect --format '{{.State.ExitCode}}' "$STORAGE_CONTAINER")" == 0 ]]
# Novo start executa novamente o preparo e produz um heartbeat novo.
compose start storage-init
compose up -d --wait --wait-timeout 240
assert_healthy_services
printf '{"services":["db","storage-init","app","mail-agent","sogo","worker","worker-ocr"],"all_running_healthy":true,"storage_restart":true,"storage_stop_exit_code":0,"monitor_uid":10001,"monitor_capabilities":0}\n' > ci-evidence/docker-storage-health.json
# O mesmo runtime publicado deve reconhecer uma imagem sintética como usuário sem root.
compose exec -T worker-ocr python - <<'PYOCR'
import json, os, subprocess, sys, tempfile
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
assert os.getuid()==10001
with tempfile.TemporaryDirectory(prefix='ocr-smoke-') as tmp:
    p=Path(tmp)/'test.png';im=Image.new('RGB',(1200,650),'white');d=ImageDraw.Draw(im);f=ImageFont.load_default(size=36)
    for i,t in enumerate(['DOCUMENTO SINTETICO DE TESTE','NOME: PESSOA EXEMPLO','CPF: 529.982.247-25','DATA DE NASCIMENTO: 15/05/2000']):d.text((50,50+i*100),t,font=f,fill='black')
    im.save(p)
    r=subprocess.run([sys.executable,'-m','app.ocr_engine',str(p),'image/png','identity',tmp],check=True,capture_output=True,timeout=120)
    data=json.loads(r.stdout)
    assert any(s['field']=='cpf' and s['value']=='52998224725' for s in data['suggestions'])
    assert data['requires_review'] and not data['document_authenticity_verified']
print('OCR: imagem sintética reconhecida localmente; UID 10001 e conferência obrigatória')
PYOCR
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
