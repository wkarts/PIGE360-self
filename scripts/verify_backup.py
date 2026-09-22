#!/usr/bin/env python3
import hashlib,json,sys,tarfile
from pathlib import Path,PurePosixPath

def verify(folder):
    p=Path(folder)
    manifest=json.loads((p/'manifest.json').read_text())
    if manifest.get('format')!='pige360-backup-v1' or set(manifest.get('files',{}))!={'database.dump','documents.tar.gz'}:
        raise ValueError('Formato de backup não reconhecido.')
    for name,wanted in manifest['files'].items():
        with (p/name).open('rb') as handle:actual=hashlib.file_digest(handle,'sha256').hexdigest()
        if actual!=wanted:raise ValueError('Hash divergente: '+name)
    with tarfile.open(p/'documents.tar.gz','r:gz') as archive:
        for member in archive:
            name=PurePosixPath(member.name)
            if name.is_absolute() or '..' in name.parts or not name.parts or name.parts[0]!='documents' or not (member.isfile() or member.isdir()):
                raise ValueError('Entrada não segura no backup de documentos.')
    print('Manifesto, hashes e caminhos do backup validados. Isso não comprova restauração do banco.')

if __name__=='__main__':
    if len(sys.argv)!=2:raise SystemExit('Uso: python scripts/verify_backup.py DIRETORIO')
    verify(sys.argv[1])
