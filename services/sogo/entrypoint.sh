#!/bin/sh
set -eu
: "${SOGO_DATABASE_URL:?SOGO_DATABASE_URL is required}"
if [ -z "${SOGO_SMTP_SERVER:-}" ] && [ -n "${SMTP_HOST:-}" ]; then
    case "${SMTP_SECURITY:-starttls}" in
        starttls) SOGO_SMTP_SERVER="smtp://${SMTP_HOST}:${SMTP_PORT:-587}/?tls=YES" ;;
        ssl) SOGO_SMTP_SERVER="smtps://${SMTP_HOST}:${SMTP_PORT:-465}" ;;
        none) SOGO_SMTP_SERVER="smtp://${SMTP_HOST}:${SMTP_PORT:-25}" ;;
        *) echo 'Invalid SMTP_SECURITY for SOGo' >&2; exit 1 ;;
    esac
fi
export SOGO_SMTP_SERVER
umask 077
mkdir -p /etc/sogo/sogo.conf.d
envsubst < /opt/pige360/10-pige360-defaults.yaml.template > /etc/sogo/sogo.conf.d/10-pige360-defaults.yaml
chown sogo:sogo /etc/sogo/sogo.conf.d/10-pige360-defaults.yaml
chmod 0640 /etc/sogo/sogo.conf.d/10-pige360-defaults.yaml
exec /opt/entrypoint.sh "$@"
