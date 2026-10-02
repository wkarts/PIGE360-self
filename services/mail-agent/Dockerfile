# syntax=docker/dockerfile:1
FROM python:3.13-slim
ARG APP_VERSION=0.10.0
ARG SOURCE_REVISION=local
LABEL org.opencontainers.image.title="PIGE360 Mail Agent" \
      org.opencontainers.image.source="https://github.com/wkarts/PIGE360-self" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.revision="${SOURCE_REVISION}"
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /opt/mail-agent
COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt && \
    (getent group pige360 >/dev/null || groupadd -g 10001 pige360) && \
    (id pige360 >/dev/null 2>&1 || useradd -u 10001 -g pige360 -M -s /usr/sbin/nologin pige360)
COPY --chown=pige360:pige360 app/ ./app/
USER 10001:10001
EXPOSE 8090
HEALTHCHECK --interval=15s --timeout=4s --retries=3 CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8090/health/ready',timeout=3)"
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8090", "--no-access-log"]
