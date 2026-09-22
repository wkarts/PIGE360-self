#!/usr/bin/env python3
"""Verifica os hashes do pacote extraído, sem conexão externa."""
from pathlib import Path
import hashlib
import sys
root=Path(__file__).resolve().parents[1]
errors=[];count=0
for line in (root/'SHA256SUMS').read_text(encoding='utf-8').splitlines():
    expected,name=line.split('  ',1)
    path=(root/name).resolve()
    if not path.is_relative_to(root.resolve()) or not path.is_file():errors.append(name+': ausente/inválido');continue
    if hashlib.sha256(path.read_bytes()).hexdigest()!=expected:errors.append(name+': hash divergente')
    count+=1
if list(root.rglob('template-original.zip')):errors.append('Template original não deve integrar esta versão.')
print('Arquivos verificados:',count)
if errors:print('\n'.join(errors));sys.exit(1)
print('Integridade conferida.')
