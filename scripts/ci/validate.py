#!/usr/bin/env python3
"""Verificações estruturais sem executar integrações de terceiros."""
import json
from pathlib import Path
import re
import subprocess

root=Path(__file__).resolve().parents[2]
for name in ('Dockerfile','deploy/compose.yaml','frontend/build.mjs'):
    assert (root/name).is_file(),name
for f in (root/'.github/workflows').glob('*.yml'):
    text=f.read_text()
    assert 'vercel' not in text.lower(),f'Componente de hospedagem não permitido: {f}'
    assert 'pull_request_target' not in text or (f.name=='pr-cache-cleanup.yml' and 'ref: main' in text),f
for path in ('vercel.json','frontend/vercel.json','.vercel','reference/template-original.zip'):
    assert not (root/path).exists(),path
manifest=json.loads((root/'frontend/dist/manifest.webmanifest').read_text())
for icon in manifest['icons']:
    assert (root/'frontend/dist'/icon['src'].lstrip('/')).is_file(),icon
info=json.loads((root/'frontend/dist/build-info.json').read_text())
assert re.fullmatch(r'\d+\.\d+\.\d+(?:-[\w.-]+)?',info['version'])
for f in (root/'scripts/ci').glob('*.sh'):subprocess.run(['bash','-n',str(f)],check=True)
assert 'build:' not in (root/'deploy/compose.yaml').read_text()
assert (root/'deploy/compose.yaml').read_text().count('ports:')==1
print('Workflows sem hospedagem externa; PWA, scripts e Compose image-only conferidos.')
