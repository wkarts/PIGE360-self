ARG NODE_BASE_IMAGE=ghcr.io/wkarts/pige360-self-base-node:22-alpine
ARG PYTHON_BASE_IMAGE=ghcr.io/wkarts/pige360-self-base-python:3.13-slim
FROM ${NODE_BASE_IMAGE} AS frontend
WORKDIR /build
ARG APP_VERSION
ENV APP_VERSION=${APP_VERSION}
COPY frontend/package*.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY VERSION /VERSION
COPY frontend/ ./
RUN npm run build
FROM ${PYTHON_BASE_IMAGE}
ARG APP_VERSION=0.12.1
ARG SOURCE_REVISION=local
LABEL org.opencontainers.image.title="PIGE360 Self — portal privado" \
      org.opencontainers.image.source="https://github.com/wkarts/PIGE360-self" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.revision="${SOURCE_REVISION}"
WORKDIR /portal
COPY services/portal/server.py services/portal/sw.js ./
COPY --from=frontend /build/dist ./public
USER 10001:10001
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/health/ready',timeout=3)"
CMD ["python","server.py"]
