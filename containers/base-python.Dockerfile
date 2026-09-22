ARG UPSTREAM_IMAGE
FROM ${UPSTREAM_IMAGE}
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /opt/pige360
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt \
    && pip check \
    && pip freeze > python-freeze.txt \
    && groupadd -g 10001 pige360 \
    && useradd -u 10001 -g pige360 -m pige360 \
    && mkdir -p /data/documents /app/frontend \
    && chown -R pige360:pige360 /data
