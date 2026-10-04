#!/bin/sh
set -eu
: "${SOGO_DATABASE_URL:?SOGO_DATABASE_URL is required}"
case "${SOGO_SMTP_SERVER:-}" in
    ""|*://*) ;;
    "${SMTP_HOST:-}") SOGO_SMTP_SERVER= ;;
    *) echo 'SOGO_SMTP_SERVER deve ser uma URL smtp:// ou smtps:// (ou vazio para usar SMTP_HOST)' >&2; exit 1 ;;
esac
if [ -z "${SOGO_SMTP_SERVER:-}" ] && [ -n "${SMTP_HOST:-}" ]; then
    case "${SMTP_SECURITY:-starttls}" in
        starttls) SOGO_SMTP_SERVER="smtp://${SMTP_HOST}:${SMTP_PORT:-587}/?tls=YES" ;;
        ssl) SOGO_SMTP_SERVER="smtps://${SMTP_HOST}:${SMTP_PORT:-465}" ;;
        none) SOGO_SMTP_SERVER="smtp://${SMTP_HOST}:${SMTP_PORT:-25}" ;;
        *) echo 'Invalid SMTP_SECURITY for SOGo' >&2; exit 1 ;;
    esac
fi
export SOGO_SMTP_SERVER
if [ -z "${SOGO_IMAP_SERVER:-}" ]; then
    SOGO_IMAP_SERVER="imaps://${SMTP_HOST:-127.0.0.1}:993"
fi
case "$SOGO_IMAP_SERVER" in
    imaps://*|imap://*) ;;
    *) echo 'SOGO_IMAP_SERVER deve ser uma URL imaps:// ou imap://' >&2; exit 1 ;;
esac
case "${SOGO_SIEVE_SERVER:-}" in
    ""|sieve://*) ;;
    *) echo 'SOGO_SIEVE_SERVER deve ser uma URL sieve:// ou estar vazio' >&2; exit 1 ;;
esac
export SOGO_IMAP_SERVER SOGO_SIEVE_SERVER
umask 077
mkdir -p /etc/sogo/sogo.conf.d
envsubst < /opt/pige360/10-pige360-defaults.yaml.template > /etc/sogo/sogo.conf.d/10-pige360-defaults.yaml
if [ -z "${SOGO_SIEVE_SERVER:-}" ]; then
    sed -i '/^SOGoSieveServer:/d; /^    SieveHostFieldName:/d' /etc/sogo/sogo.conf.d/10-pige360-defaults.yaml
fi
chown sogo:sogo /etc/sogo/sogo.conf.d/10-pige360-defaults.yaml
chmod 0640 /etc/sogo/sogo.conf.d/10-pige360-defaults.yaml
exec /opt/entrypoint.sh "$@"
