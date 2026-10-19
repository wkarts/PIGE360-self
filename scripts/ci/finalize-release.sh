#!/usr/bin/env bash
set -Eeuo pipefail
: "${VERSION:?}" "${TARGET_SHA:?}" "${IMAGE:?}" "${DIGEST:?}" "${MAIL_AGENT_IMAGE:?}" "${MAIL_AGENT_DIGEST:?}" "${SOGO_IMAGE:?}" "${SOGO_DIGEST:?}"
[[ "$GITHUB_REF" == refs/heads/main || "$GITHUB_EVENT_NAME" == pull_request ]]
[[ "$VERSION" =~ ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]]
[[ "$TARGET_SHA" =~ ^[0-9a-f]{40}$ ]]
git fetch origin main --tags
[[ "$(git rev-parse FETCH_HEAD)" == "$TARGET_SHA" ]] || { echo "main mudou; aliases estáveis não serão promovidos." >&2; exit 1; }
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
printf '# PIGE360 Self %s\n\nCommit: `%s`\n\nImagem da aplicação: `%s@%s`\nAgente de e-mail: `%s@%s`\nWebmail: `%s@%s`\n\nTestes, builds e smoke da stack concluídos pelo pipeline.\nImplantação Docker self-hosted; nenhum deploy externo executado.\n' "$VERSION" "$TARGET_SHA" "$IMAGE" "$DIGEST" "$MAIL_AGENT_IMAGE" "$MAIL_AGENT_DIGEST" "$SOGO_IMAGE" "$SOGO_DIGEST" > release/NOTES.md
if ! gh release view "$VERSION" >/dev/null 2>&1; then
  gh release create "$VERSION" --verify-tag --draft --title "PIGE360 Self $VERSION" --notes-file release/NOTES.md
fi
DRAFT="$(gh release view "$VERSION" --json isDraft --jq '.isDraft')"
if [[ "$DRAFT" != true ]]; then
  python scripts/ci/release_state.py verify --version "$VERSION" --sha "$TARGET_SHA"
  exit 0
fi
gh release upload "$VERSION" "release/PIGE360-Self-$VERSION.zip" "release/PIGE360-Self-$VERSION.zip.sha256" --clobber
python scripts/ci/stable_set.py
gh release upload "$VERSION" release/images.json --clobber
# A publicação da release só confirma sucesso após conferir novamente o conjunto completo.
python - <<'PYVERIFY'
import os, sys
sys.path.insert(0, "scripts/ci")
from promote import inspect
for image, digest in [('IMAGE', 'DIGEST'), ('MAIL_AGENT_IMAGE', 'MAIL_AGENT_DIGEST'), ('SOGO_IMAGE', 'SOGO_DIGEST'),('WEBSITE_IMAGE','WEBSITE_DIGEST')]:
    for alias in (os.environ['VERSION'], 'production', 'stable', 'latest'):
        if inspect(os.environ[image] + ':' + alias) != os.environ[digest]:
            raise SystemExit('Conjunto estável divergente; release permanece em rascunho')
PYVERIFY
gh release edit "$VERSION" --draft=false --latest --notes-file release/NOTES.md
