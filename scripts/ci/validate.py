#!/usr/bin/env python3
"""Verificações estruturais sem executar integrações de terceiros."""
import json
from pathlib import Path
import re
import subprocess

root=Path(__file__).resolve().parents[2]
for name in ('Dockerfile','deploy/docker/compose.yaml','frontend/build.mjs'):
    assert (root/name).is_file(),name
assert not (root/'compose.yaml').exists(),'compose.yaml deve ficar em deploy/'
for name in ('.env.example','.env.develop.example','.env.production.example'):
    assert not (root/name).exists(),f'{name} deve ficar em deploy/'
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
adapters=('docker','dockge','portainer','cloudpanel')
for adapter in adapters:
    compose=(root/'deploy'/adapter/'compose.yaml')
    assert compose.is_file(),compose
    compose_text=compose.read_text()
    assert 'build:' not in compose_text,compose
    assert compose_text.count('ports:')==1,compose
    assert './data-postgres:/var/lib/postgresql/data' in compose_text,compose
    assert './data-documents:/data' in compose_text,compose
    assert 'postgres_data:' not in compose_text and 'documents_data:' not in compose_text,compose
    assert 'storage-init:' in compose_text and 'service_completed_successfully' in compose_text,compose
    assert 'health/ready' in compose_text,compose
    for channel in ('develop','production'):
        env=root/'deploy'/adapter/f'.env.{channel}.example'
        assert env.is_file(),env
        env_text=env.read_text()
        assert 'APP_SECRET_KEY=' in env_text and 'POSTGRES_PASSWORD=' in env_text,env
        assert f'APP_PORT={"58081" if channel=="develop" else "58080"}' in env_text,env
print('Workflows sem hospedagem externa; PWA, scripts e quatro adaptadores image-only conferidos.')
