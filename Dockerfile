# syntax=docker/dockerfile:1
ARG NODE_BASE_IMAGE=ghcr.io/wkarts/pige360-self-base-node:22-alpine
ARG PYTHON_BASE_IMAGE=ghcr.io/wkarts/pige360-self-base-python:3.13-slim
ARG POSTGRES_IMAGE=ghcr.io/wkarts/pige360-self-postgres:17-bookworm
FROM ${NODE_BASE_IMAGE} AS frontend
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./frontend/
# PRs podem alterar dependencias antes da publicacao de uma nova base.
# No fluxo normal o lock coincide e npm ci nao e repetido.
RUN if cmp -s frontend/package.json /opt/pige360/frontend/package.json \
    && cmp -s frontend/package-lock.json /opt/pige360/frontend/package-lock.json; then \
      cp -a /opt/pige360/frontend/node_modules frontend/node_modules; \
    else npm ci --prefix frontend --ignore-scripts --no-audit --no-fund; fi
COPY VERSION ./VERSION
COPY frontend/ ./frontend/
ARG APP_VERSION=0.12.1
RUN APP_VERSION="$APP_VERSION" node frontend/build.mjs

FROM ${POSTGRES_IMAGE} AS postgres_tools
USER root
RUN mkdir -p /opt/pg-tools/lib && for tool in pg_dump pg_restore; do \
      cp "/usr/lib/postgresql/17/bin/$tool" "/opt/pg-tools/$tool"; \
      ldd "/usr/lib/postgresql/17/bin/$tool" | awk '$3 ~ /^\// {print $3} $1 ~ /^\// {print $1}' | \
        while IFS= read -r library; do cp -L "$library" /opt/pg-tools/lib/; done; \
    done

FROM ${PYTHON_BASE_IMAGE} AS runtime
ARG APP_VERSION=0.12.1
ARG SOURCE_REVISION=local
ARG PYTHON_BASE_IMAGE
ARG NODE_BASE_IMAGE
ARG POSTGRES_IMAGE=ghcr.io/wkarts/pige360-self-postgres:17-bookworm
LABEL org.opencontainers.image.title="PIGE360 Self" \
      org.opencontainers.image.source="https://github.com/wkarts/PIGE360-self" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.revision="${SOURCE_REVISION}" \
      br.com.argws.pige360.base.python="${PYTHON_BASE_IMAGE}" \
      br.com.argws.pige360.base.node="${NODE_BASE_IMAGE}" \
      br.com.argws.pige360.service.postgres="${POSTGRES_IMAGE}"
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_DISABLE_PIP_VERSION_CHECK=1 APP_VERSION=${APP_VERSION}
WORKDIR /app/backend
COPY --from=postgres_tools /opt/pg-tools/ /opt/pg-tools/
COPY scripts/pg-tools.sh /usr/local/bin/pg_dump
COPY scripts/pg-tools.sh /usr/local/bin/pg_restore
RUN chmod 755 /usr/local/bin/pg_dump /usr/local/bin/pg_restore && pg_dump --version && pg_restore --version
COPY backend/requirements.txt ./requirements.txt
RUN if ! command -v tesseract >/dev/null || ! command -v pdftoppm >/dev/null || ! tesseract --list-langs 2>/dev/null | grep -qx por; then apt-get update && apt-get install -y --no-install-recommends tesseract-ocr tesseract-ocr-por tesseract-ocr-eng poppler-utils && rm -rf /var/lib/apt/lists/*; fi
RUN if [ ! -f /usr/share/fonts/truetype/dejavu/DejaVuSans.ttf ]; then apt-get update && apt-get install -y --no-install-recommends fonts-dejavu-core && rm -rf /var/lib/apt/lists/*; fi
RUN if ! cmp -s requirements.txt /opt/pige360/requirements.txt; then \
      pip install --no-cache-dir -r requirements.txt && pip check; fi \
    && (getent group pige360 >/dev/null || groupadd -g 10001 pige360) \
    && (id pige360 >/dev/null 2>&1 || useradd -u 10001 -g pige360 -m pige360) \
    && mkdir -p /data/documents /app/frontend
COPY --chown=pige360:pige360 backend/ /app/backend/
COPY --from=frontend --chown=pige360:pige360 /build/frontend/dist/ /app/frontend/dist/
COPY --chown=pige360:pige360 scripts/start.sh /app/start.sh
RUN chmod 755 /app/start.sh && chown -R pige360:pige360 /data
USER 10001:10001
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health/ready',timeout=4)"
ENTRYPOINT ["/app/start.sh"]
