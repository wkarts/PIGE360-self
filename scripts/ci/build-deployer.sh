#!/usr/bin/env bash
set -Eeuo pipefail

python -m pip install 'pyinstaller==6.22.3'
python -m PyInstaller --onefile --clean --noconfirm \
  --name pige360-deployer-linux-amd64 scripts/deployer.py
test -x dist/pige360-deployer-linux-amd64
dist/pige360-deployer-linux-amd64 --help
dist/pige360-deployer-linux-amd64 --internal-script configure.py "$PWD" --help
dist/pige360-deployer-linux-amd64 --internal-script prepare-upgrade.py "$PWD" --help
install -m 0755 dist/pige360-deployer-linux-amd64 ./pige360-deployer-linux-amd64

timeout 15 ./pige360-deployer-linux-amd64 --root "$PWD" --port 58109 > /tmp/pige360-deployer-smoke.log 2>&1 &
pid=$!
trap 'kill "$pid" 2>/dev/null || true' EXIT
curl -fsS --retry 10 --retry-delay 1 --retry-connrefused \
  http://127.0.0.1:58109/ -o /tmp/pige360-deployer-smoke.html
grep -q 'PIGE360 · Stacks' /tmp/pige360-deployer-smoke.html
