ARG UPSTREAM_IMAGE
FROM ${UPSTREAM_IMAGE}
WORKDIR /opt/pige360
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN npm ci --prefix frontend --ignore-scripts --no-audit --no-fund \
    && node frontend/node_modules/typescript/bin/tsc --version \
    && npm cache clean --force
WORKDIR /build
