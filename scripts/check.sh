#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
node frontend/build.mjs
python -m compileall -q backend/app backend/migrations scripts
(cd backend && PYTHONPATH=. python -m pytest -q --junitxml=../evidence/backend-tests.xml)
# Docker/PostgreSQL e navegação real exigem ambiente de homologação próprio.
