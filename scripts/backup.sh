#!/bin/sh
# Cópia consistente: interrompe gravações pelo app durante o dump e os arquivos.
set -eu
umask 077
cd "$(dirname "$0")/.."
STACK_DIR="${PIGE_STACK_DIR:-deploy/docker}"
ENV_FILE="${PIGE_ENV_FILE:-$STACK_DIR/.env.production}"
COMPOSE_FILE="${PIGE_COMPOSE_FILE:-$STACK_DIR/compose.yaml}"
compose() { docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"; }
DEST="${1:-$STACK_DIR/backups/$(date -u +%Y%m%dT%H%M%SZ)}"
if [ -e "$DEST" ]; then echo "Destino já existe; nada foi sobrescrito." >&2; exit 1; fi
mkdir -p "$DEST"
was_running=$(compose ps --status running --services | grep -E '^(app|worker)$' || true)
resume() { if [ -n "$was_running" ]; then compose start $was_running >/dev/null; fi; }
trap resume EXIT HUP INT TERM
compose stop worker app
compose exec -T db sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$DEST/database.dump"
compose run --rm -T --no-deps --entrypoint tar app -C /data -czf - documents > "$DEST/documents.tar.gz"
python3 - "$DEST" <<'PY'
from pathlib import Path
import hashlib,json,sys
p=Path(sys.argv[1]);manifest={'format':'pige360-backup-v1','files':{}}
for name in ['database.dump','documents.tar.gz']:
    with (p/name).open('rb') as f:manifest['files'][name]=hashlib.file_digest(f,'sha256').hexdigest()
(p/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
PY
printf 'Backup concluído em %s\n' "$DEST"
printf '%s\n' 'Armazene .env e INTEGRATION_ENCRYPTION_KEY separadamente e proteja/criptografe o backup: contém dados pessoais.'
