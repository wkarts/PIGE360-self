# syntax=docker/dockerfile:1
ARG UPSTREAM_IMAGE=python:3.13-slim
FROM ${UPSTREAM_IMAGE}
LABEL org.opencontainers.image.source="https://github.com/wkarts/PIGE360-self" \
      org.opencontainers.image.title="PIGE360 Self — python"
