# syntax=docker/dockerfile:1
# The public MinIO registries no longer serve this image. Build the patched
# upstream release from its source tag, and keep the runtime self-contained.
ARG UPSTREAM_IMAGE
FROM ${UPSTREAM_IMAGE} AS builder
ARG MINIO_RELEASE=RELEASE.2025-10-15T17-29-55Z
ARG MINIO_COMMIT=9e49d5e7a648f00e26f2246f4dc28e6b07f8c84a
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN git clone --quiet --depth 1 --branch "$MINIO_RELEASE" https://github.com/minio/minio.git /src/minio \
    && test "$(git -C /src/minio rev-parse HEAD)" = "$MINIO_COMMIT"
WORKDIR /src/minio
RUN mkdir -p /out \
    && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w -X github.com/minio/minio/cmd.ReleaseTag=$MINIO_RELEASE -X github.com/minio/minio/cmd.CommitID=$MINIO_COMMIT" -o /out/minio . \
    && /out/minio --version
COPY containers/minio-healthcheck.go /tmp/minio-healthcheck.go
RUN CGO_ENABLED=0 go build -trimpath -o /out/minio-healthcheck /tmp/minio-healthcheck.go

FROM scratch
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /out/minio /usr/local/bin/minio
COPY --from=builder /out/minio-healthcheck /usr/local/bin/minio-healthcheck
EXPOSE 9000 9001
VOLUME ["/data"]
ENTRYPOINT ["/usr/local/bin/minio"]
