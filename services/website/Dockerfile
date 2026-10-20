ARG PYTHON_BASE_IMAGE=ghcr.io/wkarts/pige360-self-base-python:3.13-slim
FROM ${PYTHON_BASE_IMAGE}
ARG APP_VERSION=0.12.1
ARG SOURCE_REVISION=local
LABEL org.opencontainers.image.title="PIGE360 Self — site institucional" \
      org.opencontainers.image.source="https://github.com/wkarts/PIGE360-self" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.revision="${SOURCE_REVISION}"
WORKDIR /site
COPY server.py site.css ./
USER 10001:10001
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/health/ready',timeout=3)"
CMD ["python","server.py"]
