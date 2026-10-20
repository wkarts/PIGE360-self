#!/bin/sh
# Cliente PostgreSQL da mesma imagem aprovada do servidor, com suas bibliotecas.
set -eu
tool=$(basename "$0")
case "$tool" in pg_dump|pg_restore) ;; *) exit 64 ;; esac
exec /opt/pg-tools/lib/ld-linux-x86-64.so.2 --library-path /opt/pg-tools/lib "/opt/pg-tools/$tool" "$@"
