#!/bin/sh
# Cópia consistente: interrompe gravações pelo app durante o dump e os arquivos.
set -eu
umask 077
cd "$(dirname "$0")/.."
STACK_DIR="${PIGE_STACK_DIR:-deploy/docker}"
ENV_FILE="${PIGE_ENV_FILE:-$STACK_DIR/.env.production}"
COMPOSE_FILE="${PIGE_COMPOSE_FILE:-$STACK_DIR/compose.yaml}"
compose() { docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"; }
# O arquivo local não representa objetos no bucket S3/MinIO. Falhe antes de parar serviços.
compose_config=$(compose config --format json)
printf '%s\n' "$compose_config" | python3 -c '
import json,sys
environment=json.load(sys.stdin)["services"]["app"]["environment"]
backend=environment.get("STORAGE_BACKEND","local").lower()
if backend != "local":
    raise SystemExit("Backup local não cobre STORAGE_BACKEND="+backend+". Use backup consistente do bucket e do banco.")
if environment.get("STORAGE_PATH") != "/data/documents" or environment.get("SIGNATURE_TRUST_ROOTS_DIR","/data/trust-roots") != "/data/trust-roots":
    raise SystemExit("Backup local exige STORAGE_PATH=/data/documents e SIGNATURE_TRUST_ROOTS_DIR=/data/trust-roots.")
'
DEST="${1:-$STACK_DIR/backups/$(date -u +%Y%m%dT%H%M%SZ)}"
if [ -e "$DEST" ]; then echo "Destino já existe; nada foi sobrescrito." >&2; exit 1; fi
mkdir -p "$DEST"
was_running=$(compose ps --status running --services | grep -E '^(app|worker|worker-ocr)$' || true)
resume() {
  if printf '%s\n' "$was_running" | grep -qx app; then
    compose up -d --no-recreate --pull never --wait --wait-timeout 240 app >/dev/null
  fi
  for service in worker worker-ocr; do
    if printf '%s\n' "$was_running" | grep -qx "$service"; then
      compose start "$service" >/dev/null
    fi
  done
}
trap resume EXIT HUP INT TERM
compose stop worker-ocr worker app
compose exec -T db sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$DEST/database.dump"
compose run --rm -T --no-deps --entrypoint sh app -c '
  set -eu
  cd /data
  if [ ! -d documents ] || [ -L documents ] || [ -L trust-roots ]; then
    echo "Diretório de documentos ou raízes de confiança inválido." >&2; exit 1
  fi
  if [ -d trust-roots ]; then
    exec tar -czf - documents trust-roots
  fi
  exec tar -czf - documents
' > "$DEST/documents.tar.gz"
python3 - "$DEST" <<'PY'
from pathlib import Path
import hashlib,json,sys,tarfile
p=Path(sys.argv[1]);manifest={'format':'pige360-backup-v1','files':{}}
for name in ['database.dump','documents.tar.gz']:
    with (p/name).open('rb') as f:manifest['files'][name]=hashlib.file_digest(f,'sha256').hexdigest()
with tarfile.open(p/'documents.tar.gz','r:gz') as archive:
    manifest['trust_roots_included']=any(member.name.rstrip('/')=='trust-roots' for member in archive)
(p/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
PY
python3 scripts/verify_backup.py "$DEST"
printf 'Backup concluído em %s\n' "$DEST"
printf '%s\n' 'Armazene .env e INTEGRATION_ENCRYPTION_KEY separadamente e proteja/criptografe o backup: contém dados pessoais.'
