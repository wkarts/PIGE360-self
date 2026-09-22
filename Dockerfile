# syntax=docker/dockerfile:1
ARG NODE_BASE_IMAGE=node:22-alpine
ARG PYTHON_BASE_IMAGE=python:3.13-slim
FROM ${NODE_BASE_IMAGE} AS frontend
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN npm ci --prefix frontend --ignore-scripts --no-audit --no-fund
COPY VERSION ./VERSION
COPY frontend/ ./frontend/
ARG APP_VERSION=0.3.0
RUN APP_VERSION="$APP_VERSION" node frontend/build.mjs

FROM ${PYTHON_BASE_IMAGE} AS runtime
ARG APP_VERSION=0.3.0
ARG SOURCE_REVISION=local
LABEL org.opencontainers.image.title="PIGE360 Self" \
      org.opencontainers.image.source="https://github.com/wkarts/PIGE360-self" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.revision="${SOURCE_REVISION}"
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_DISABLE_PIP_VERSION_CHECK=1 APP_VERSION=${APP_VERSION}
WORKDIR /app/backend
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt \
    && groupadd -g 10001 pige360 \
    && useradd -u 10001 -g pige360 -m pige360 \
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
