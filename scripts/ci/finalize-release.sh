#!/usr/bin/env bash
set -Eeuo pipefail
: "${VERSION:?}" "${TARGET_SHA:?}" "${IMAGE:?}" "${DIGEST:?}"
[[ "$GITHUB_REF" == refs/heads/main || "$GITHUB_EVENT_NAME" == pull_request ]]
[[ "$VERSION" =~ ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]]
[[ "$TARGET_SHA" =~ ^[0-9a-f]{40}$ ]]
git fetch origin main --tags
# Nenhuma release antiga pode rebaixar aliases móveis.
python - <<'PY'
import os,sys,subprocess
sys.path.insert(0,'scripts/ci')
from version import parse, STABLE
tags=subprocess.check_output(['git','tag'],text=True).splitlines()
new=parse(os.environ['VERSION'])
if any(parse(t)>new for t in tags if STABLE.fullmatch(t)):
    raise SystemExit('Já existe release mais recente. Promoção de aliases abortada.')
PY
if git rev-parse --verify "refs/tags/$VERSION" >/dev/null 2>&1; then
  [[ "$(git rev-list -n 1 "$VERSION")" == "$TARGET_SHA" ]]
else
  git config user.name 'github-actions[bot]'
  git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
  git tag -a "$VERSION" "$TARGET_SHA" -m "PIGE360 Self $VERSION"
  git push origin "refs/tags/$VERSION"
fi
mkdir -p release
python scripts/ci/package.py --version "$VERSION" --commit "$TARGET_SHA" --image "$IMAGE@$DIGEST" --output "release/PIGE360-Self-$VERSION.zip"
printf '# PIGE360 Self %s\n\nCommit: `%s`\n\nImagem: `%s@%s`\n\nTestes, build e smoke do candidato concluídos pelo pipeline.\nImplantação Docker self-hosted; nenhum deploy externo executado.\n' "$VERSION" "$TARGET_SHA" "$IMAGE" "$DIGEST" > release/NOTES.md
if ! gh release view "$VERSION" >/dev/null 2>&1; then
  gh release create "$VERSION" --verify-tag --draft --title "PIGE360 Self $VERSION" --notes-file release/NOTES.md
fi
DRAFT="$(gh release view "$VERSION" --json isDraft --jq '.isDraft')"
[[ "$DRAFT" == true ]] || { echo 'Release já publicada; sem alterações.'; exit 0; }
gh release upload "$VERSION" "release/PIGE360-Self-$VERSION.zip" "release/PIGE360-Self-$VERSION.zip.sha256" --clobber
python scripts/ci/promote.py release
gh release edit "$VERSION" --draft=false --latest --notes-file release/NOTES.md
