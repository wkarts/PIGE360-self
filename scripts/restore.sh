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
compose stop worker app
# Em falha, a aplicação permanece parada para não operar em estado inconsistente.
compose exec -T db sh -c 'exec pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --single-transaction' < "$SOURCE/database.dump"
compose run --rm -T --no-deps --entrypoint sh app -c 'find /data/documents -mindepth 1 -delete'
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
compose start app worker
echo 'Restauração executada. Confira health, autenticação, alunos e download de documentos.'

echo "Confira a chave de integração preservada e concilie operações incertas; não reenvie mensagens sem conferir o provedor."
