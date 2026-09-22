# syntax=docker/dockerfile:1
ARG UPSTREAM_IMAGE=node:22-alpine
FROM ${UPSTREAM_IMAGE}
LABEL org.opencontainers.image.source="https://github.com/wkarts/PIGE360-self" \
      org.opencontainers.image.title="PIGE360 Self — node"
