#!/bin/sh
# DESTRUTIVO somente após confirmação explícita. Não executar automaticamente.
set -eu
cd "$(dirname "$0")/.."
STACK_DIR="${PIGE_STACK_DIR:-deploy/docker}"
ENV_FILE="${PIGE_ENV_FILE:-$STACK_DIR/.env.production}"
COMPOSE_FILE="${PIGE_COMPOSE_FILE:-$STACK_DIR/compose.yaml}"
compose() { docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"; }
if [ "$#" -ne 2 ] || [ "$2" != "--confirm-restore" ]; then
  echo 'Uso: sh scripts/restore.sh DIRETORIO --confirm-restore' >&2
  echo 'ATENÇÃO: substitui os dados desta instalação. Gere um backup antes.' >&2
  exit 1
fi
SOURCE="$1"
python3 scripts/verify_backup.py "$SOURCE"
compose_config=$(compose config --format json)
printf '%s\n' "$compose_config" | python3 -c '
import json,sys
environment=json.load(sys.stdin)["services"]["app"]["environment"]
backend=environment.get("STORAGE_BACKEND","local").lower()
if backend != "local":
    raise SystemExit("Restauração local não cobre STORAGE_BACKEND="+backend+". Restaure o bucket e o banco de forma coordenada.")
if environment.get("STORAGE_PATH") != "/data/documents" or environment.get("SIGNATURE_TRUST_ROOTS_DIR","/data/trust-roots") != "/data/trust-roots":
    raise SystemExit("Restauração local exige STORAGE_PATH=/data/documents e SIGNATURE_TRUST_ROOTS_DIR=/data/trust-roots.")
'
has_trust_roots=$(python3 - "$SOURCE/manifest.json" <<'PY'
import json,sys
from pathlib import Path
print('yes' if json.loads(Path(sys.argv[1]).read_text()).get('trust_roots_included',False) else 'no')
PY
)
# Detecte diretórios ausentes, links e permissões antes de modificar o banco.
compose run --rm -T --no-deps --entrypoint sh app -c '
  set -eu
  [ -d /data/documents ] && [ ! -L /data/documents ] && [ -w /data/documents ]
  [ ! -L /data/trust-roots ]
  if [ "$1" = yes ]; then
    if [ -d /data/trust-roots ]; then
      [ -w /data/trust-roots ]
    else
      [ -w /data ]
    fi
  fi
' sh "$has_trust_roots"
compose stop worker-ocr worker app
# Em falha, a aplicação permanece parada para não operar em estado inconsistente.
compose exec -T db sh -c 'exec pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --single-transaction' < "$SOURCE/database.dump"
compose run --rm -T --no-deps --entrypoint sh app -c '
  set -eu
  find /data/documents -mindepth 1 -delete
  if [ "$1" = yes ]; then
    if [ -d /data/trust-roots ]; then
      find /data/trust-roots -mindepth 1 -delete
    else
      mkdir /data/trust-roots
    fi
  fi
' sh "$has_trust_roots"
compose run --rm -T --no-deps --entrypoint tar app -C /data --no-same-owner -xzf - < "$SOURCE/documents.tar.gz"
# Uma restauração pode recuperar jobs anteriores a efeitos já realizados no banco/provedor.
# Não reenviar essas operações cegamente após restaurar o snapshot.
compose exec -T db sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' <<'SQL'
DO $$ BEGIN
  IF to_regclass('public.integration_jobs') IS NOT NULL THEN
    UPDATE integration_jobs SET status='uncertain',error_code='RESTORE_REQUIRES_RECONCILIATION',lease_until=NULL
      WHERE status IN ('pending','retry','processing');
    UPDATE bank_charges SET status='uncertain' WHERE status='queued';
  END IF;
END $$;
SQL
compose up -d --no-recreate --pull never --wait --wait-timeout 240 app
compose start worker worker-ocr
echo 'Restauração executada. Confira health, autenticação, alunos e download de documentos.'

echo "Confira a chave de integração preservada e concilie operações incertas; não reenvie mensagens sem conferir o provedor."
