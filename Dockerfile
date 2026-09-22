FROM python:3.13-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /app/backend
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt \
    && groupadd -g 10001 pige360 \
    && useradd -u 10001 -g pige360 -m pige360 \
    && mkdir -p /data/documents /app/frontend
COPY --chown=pige360:pige360 backend/ /app/backend/
COPY --chown=pige360:pige360 frontend/dist/ /app/frontend/dist/
COPY --chown=pige360:pige360 scripts/start.sh /app/start.sh
RUN chmod 755 /app/start.sh && chown -R pige360:pige360 /data
USER 10001:10001
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health/ready',timeout=4)"
ENTRYPOINT ["/app/start.sh"]
