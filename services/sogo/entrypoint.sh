#!/bin/sh
set -eu
: "${SOGO_DATABASE_URL:?SOGO_DATABASE_URL is required}"
umask 077
mkdir -p /etc/sogo/sogo.conf.d
envsubst < /opt/pige360/10-pige360-defaults.yaml.template > /etc/sogo/sogo.conf.d/10-pige360-defaults.yaml
chown sogo:sogo /etc/sogo/sogo.conf.d/10-pige360-defaults.yaml
chmod 0640 /etc/sogo/sogo.conf.d/10-pige360-defaults.yaml
exec /opt/entrypoint.sh "$@"
