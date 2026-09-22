#!/usr/bin/env python3
"""Checkpoint/release local a partir dos arquivos rastreados; sem credenciais."""
import argparse
from hashlib import sha256
import json
from pathlib import Path
import re
import subprocess
import zipfile

def package(root, output, version, commit, image=''):
    names=subprocess.check_output(['git','ls-files','-z'],cwd=root).decode().split('\0')
    files={}
    for name in filter(None,names):
        p=Path(name)
        if any(part in ('.git','node_modules','.venv','__pycache__','reference','ci-evidence','checkpoints','release') for part in p.parts):continue
        if p.name.startswith('.env') and p.name!='.env.example':continue
        if p.suffix.lower() in ('.ttf','.otf','.woff','.woff2','.pem','.key','.p12','.pfx','.db'):continue
        if name in ('SHA256SUMS','TREE.txt','MANIFEST.json'):continue
        source=root/p
        if source.is_symlink():raise ValueError('Link simbólico não permitido no checkpoint: '+name)
        if not source.is_file():continue
        files[name]=source.read_bytes()
    lock_path=root/'ci-evidence/base-images.lock.json'
    if image and lock_path.is_file():
        lock=json.loads(lock_path.read_text())
        if lock.get('schema_version')!=1:raise ValueError('Versao de lock desconhecida')
        for key in ('node','python','postgres'):
            ref=lock['images'][key]['ref']
            if not re.fullmatch(r'ghcr\.io/wkarts/pige360-self-[a-z-]+@sha256:[0-9a-f]{64}',ref):
                raise ValueError('Referencia de base invalida no lock: '+key)
        files['deploy/images.lock.json']=lock_path.read_bytes()
        files['deploy/images.env']=(f'APP_IMAGE={image}\nPOSTGRES_IMAGE={lock["images"]["postgres"]["ref"]}\nAPP_PULL_POLICY=always\n').encode()
    manifest={'product':'PIGE360 Self','release_version':version,'repository':'wkarts/PIGE360-self',
              'source_commit':commit,'image':image,'contains_credentials':False,
              'original_template_included':False,'source_version':(root/'VERSION').read_text().strip()}
    files['MANIFEST.json']=(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n').encode()
    files['TREE.txt']=('\n'.join(sorted(files))+'\n').encode()
    files['SHA256SUMS']=(''.join(f'{sha256(b).hexdigest()}  {n}\n' for n,b in sorted(files.items()))).encode()
    output.parent.mkdir(parents=True,exist_ok=True)
    with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        for name,data in sorted(files.items()):
            info=zipfile.ZipInfo('pige360-self/'+name,(2026,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED
            info.external_attr=(0o100755 if name.endswith('.sh') else 0o100644)<<16
            z.writestr(info,data)
    with zipfile.ZipFile(output) as z:
        assert z.testzip() is None
        for line in files['SHA256SUMS'].decode().splitlines():
            digest,name=line.split('  ',1);assert sha256(z.read('pige360-self/'+name)).hexdigest()==digest
    output.with_suffix(output.suffix+'.sha256').write_text(sha256(output.read_bytes()).hexdigest()+'  '+output.name+'\n')
    print(json.dumps({'file':str(output),'count':len(files),'bytes':output.stat().st_size,'sha256':sha256(output.read_bytes()).hexdigest()},indent=2))

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--version',required=True);p.add_argument('--commit',required=True);p.add_argument('--image',default='');p.add_argument('--output',required=True)
    a=p.parse_args();package(Path(__file__).resolve().parents[2],Path(a.output),a.version,a.commit,a.image)
