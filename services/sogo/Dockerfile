# syntax=docker/dockerfile:1
# Build our own registry artifact while inheriting the upstream source-built SOGo runtime.
ARG SOGO_UPSTREAM_IMAGE=sonroyaalmerol/docker-sogo:5.12.11-1-vanilla
FROM ${SOGO_UPSTREAM_IMAGE}
USER root
ARG APP_VERSION=0.10.0
ARG SOURCE_REVISION=local
LABEL org.opencontainers.image.title="PIGE360 Webmail" \
      org.opencontainers.image.source="https://github.com/wkarts/PIGE360-self" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.revision="${SOURCE_REVISION}" \
      org.opencontainers.image.licenses="AGPL-3.0-or-later"
RUN apt-get update && apt-get install -y --no-install-recommends gettext-base && rm -rf /var/lib/apt/lists/*
COPY 10-pige360-defaults.yaml /opt/pige360/10-pige360-defaults.yaml.template
COPY entrypoint.sh /opt/pige360/entrypoint.sh
RUN chmod 0755 /opt/pige360/entrypoint.sh
ENTRYPOINT ["/opt/pige360/entrypoint.sh"]
