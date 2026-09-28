#!/usr/bin/env python3
import hashlib,json,sys,tarfile
from pathlib import Path,PurePosixPath

def verify(folder):
    p=Path(folder)
    manifest=json.loads((p/'manifest.json').read_text())
    if manifest.get('format')!='pige360-backup-v1' or set(manifest.get('files',{}))!={'database.dump','documents.tar.gz'}:
        raise ValueError('Formato de backup não reconhecido.')
    has_roots=manifest.get('trust_roots_included',False)
    if not isinstance(has_roots,bool):raise ValueError('Indicador de raízes de confiança inválido.')
    for name,wanted in manifest['files'].items():
        with (p/name).open('rb') as handle:actual=hashlib.file_digest(handle,'sha256').hexdigest()
        if actual!=wanted:raise ValueError('Hash divergente: '+name)
    entries={}
    with tarfile.open(p/'documents.tar.gz','r:gz') as archive:
        for member in archive:
            raw=member.name.rstrip('/')
            parts=raw.split('/')
            name=PurePosixPath(raw)
            if (not raw or raw.startswith('/') or '\\' in raw or
                    any(part in ('','.','..') for part in parts) or
                    parts[0] not in ('documents','trust-roots') or
                    (len(parts)==1 and not member.isdir()) or
                    name.as_posix() in entries or
                    not (member.isfile() or member.isdir())):
                raise ValueError('Entrada não segura no backup de documentos.')
            entries[name.as_posix()]=member.isdir()
    if entries.get('documents') is not True:
        raise ValueError('Diretório de documentos ausente no backup.')
    if has_roots != (entries.get('trust-roots') is True):
        raise ValueError('Raízes de confiança divergentes do manifesto.')
    for name in entries:
        parts=name.split('/')
        if any(entries.get('/'.join(parts[:index])) is not True for index in range(1,len(parts))):
            raise ValueError('Entrada sem diretório pai seguro no backup.')
    print('Manifesto, hashes e caminhos do backup validados. Isso não comprova restauração do banco.')
    return has_roots

if __name__=='__main__':
    if len(sys.argv)!=2:raise SystemExit('Uso: python scripts/verify_backup.py DIRETORIO')
    verify(sys.argv[1])
