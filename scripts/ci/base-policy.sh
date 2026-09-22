#!/usr/bin/env bash
set -Eeuo pipefail
IMAGE="ghcr.io/${GITHUB_REPOSITORY_OWNER,,}/${BASE_PACKAGE}"
UPSTREAM_DIGEST="$(docker buildx imagetools inspect "$BASE_UPSTREAM" --format '{{.Manifest.Digest}}')"
[[ "$UPSTREAM_DIGEST" =~ ^sha256:[0-9a-f]{64}$ ]]
UPSTREAM="${BASE_UPSTREAM}@${UPSTREAM_DIGEST}"
FINGERPRINT="$(printf '%s\n%s\n%s\n' "$UPSTREAM" "$(sha256sum "$BASE_FILE")" "$BASE_ALIASES" | sha256sum | cut -d' ' -f1)"
CURRENT=''
if docker pull "$IMAGE:$BASE_TAG" >/dev/null 2>&1; then
  CURRENT="$(docker image inspect --format '{{ index .Config.Labels "br.com.argws.pige360.base.fingerprint" }}' "$IMAGE:$BASE_TAG")"
fi
REBUILD=false
if [[ "${FORCE_REBUILD:-false}" == true || "$CURRENT" != "$FINGERPRINT" ]]; then REBUILD=true; fi
if [[ "$REBUILD" == false ]]; then
  EXPECTED="$(docker buildx imagetools inspect "$IMAGE:$BASE_TAG" --format '{{.Manifest.Digest}}')"
  for tag in $BASE_ALIASES; do
    ACTUAL="$(docker buildx imagetools inspect "$IMAGE:$tag" --format '{{.Manifest.Digest}}' 2>/dev/null || true)"
    if [[ "$ACTUAL" != "$EXPECTED" ]]; then REBUILD=true; break; fi
  done
fi
{
  echo "rebuild=$REBUILD"
  echo "upstream=$UPSTREAM"
  echo "fingerprint=$FINGERPRINT"
  echo 'tags<<TAGS'
  for tag in $BASE_ALIASES; do echo "$IMAGE:$tag"; done
  echo 'TAGS'
} >> "$GITHUB_OUTPUT"
printf 'Base %s; rebuild=%s; upstream=%s\n' "$IMAGE" "$REBUILD" "$UPSTREAM"
