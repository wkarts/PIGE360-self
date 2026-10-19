"""Executado somente na stack Docker descartável, com app e workers parados."""
import hashlib
from pathlib import Path
import os
import sys
sys.path.insert(0,'/app/backend')
from app import models as m
from app.config import settings
from app.schemas import Login
from app.db import SessionLocal, uid
from app.backups import create_bundle, bundle_path, verify_bundle
from app.backup_restore import restore
from app.documents import write_file
from app.storage import read_bytes, ensure_storage, delete_key

if not os.environ.get('DATABASE_URL','').split('@')[-1].startswith('db:5432/'):
    raise SystemExit('Este smoke só aceita o banco interno da stack descartável.')
cfg=settings()
synthetic_login=Login(email='backup@example.com',password='Synthetic-Backup-2026!')
with SessionLocal.begin() as db:
    installation=db.get(m.Installation,1)
    if not installation:
        installation=m.Installation(id=1);db.add(installation)
    installation.configured=True
    if db.query(m.Company).count():raise SystemExit('Smoke exige instalação sem dados anteriores.')
    company=m.Company(name='Mantenedora sintética de backup');db.add(company);db.flush()
    school=m.School(name='Escola sintética de backup',company_id=company.id);db.add(school)
    user=m.User(name='Operador sintético',email=str(synthetic_login.email),password_hash='not-a-login-hash',role='admin');db.add(user);db.flush()
    file=write_file(db,school.id,user.id,'synthetic-local.txt','text/plain',b'synthetic local backup document')
    company_id,school_id,user_id,file_id=company.id,school.id,user.id,file.id

for backend in ('local','s3'):
    if backend=='s3':
        cfg.storage_backend='s3';cfg.storage_endpoint_url='http://minio:9000'
        cfg.storage_use_ssl=False;cfg.storage_force_path_style=True;cfg.storage_auto_create_bucket=True
        ensure_storage()
        with SessionLocal.begin() as db:
            stored=write_file(db,school_id,user_id,'synthetic-minio.txt','text/plain',b'synthetic minio backup document')
            minio_id=stored.id
    ident=uid();digest,size=create_bundle(ident);manifest=verify_bundle(bundle_path(ident))
    assert digest and size>0
    assert any(obj['backend']==backend for obj in manifest['objects'])
    with SessionLocal.begin() as db:db.get(m.Company,company_id).name='Alteração posterior ao snapshot'
    safety=uid();create_bundle(safety)
    # Prova de recuperação: nenhum objeto original pode sobreviver no destino.
    # Este script recusa instalações com dados anteriores e só roda no Compose CI.
    for obj in manifest['objects']:
        delete_key(obj['backend'],obj['key'],obj['bucket'])
    with SessionLocal() as db:
        for record in db.query(m.FileRecord):
            try:read_bytes(record)
            except Exception:pass
            else:raise AssertionError('Objeto original ainda acessível antes do restore')
    with SessionLocal.begin() as db:db.get(m.Company,company_id).name='Alteração posterior ao snapshot'
    restore(bundle_path(ident),previous_id=safety)
    with SessionLocal() as db:
        assert db.get(m.Company,company_id).name=='Mantenedora sintética de backup'
        assert read_bytes(db.get(m.FileRecord,file_id))==b'synthetic local backup document'
        if backend=='s3':
            record=db.get(m.FileRecord,minio_id)
            assert read_bytes(record)==b'synthetic minio backup document'
            from app.storage import _s3_client
            metadata=_s3_client().head_object(Bucket=record.bucket_name,Key=record.storage_key)
            assert metadata['ContentType']==record.mime_type and metadata['Metadata']['pige360-managed']=='true'
        for record in db.query(m.FileRecord):
            data=read_bytes(record)
            assert len(data)==record.size and hashlib.sha256(data).hexdigest()==record.sha256
    # O verificador deve recusar pacote faltante/corrompido antes de alterar o destino.
    import zipfile
    broken=bundle_path(ident).with_suffix('.corrupt.zip')
    with zipfile.ZipFile(bundle_path(ident)) as source,zipfile.ZipFile(broken,'w') as target:
        for name in source.namelist():
            target.writestr(name,b'corrupted' if name==manifest['objects'][0]['path'] else source.read(name))
    try:verify_bundle(broken)
    except ValueError:pass
    else:raise AssertionError('Pacote corrompido foi aceito')
    broken.unlink()
    print('PASS: restauração real PostgreSQL e documentos '+backend+' em stack descartável',flush=True)

# Estado conhecido para a prova visual subsequente em Docker. Nunca usa escola real.
from app.security import hash_password
from app.backups import BackupRun
with SessionLocal.begin() as db:
    db.get(m.User,user_id).password_hash=hash_password(synthetic_login.password)
    if not db.get(m.SchoolAccess,(user_id,school_id)):db.add(m.SchoolAccess(user_id=user_id,school_id=school_id))
    db.get(m.Installation,1).portability_enabled=True
    candidate=BackupRun(created_by=user_id);db.add(candidate);db.flush();candidate_id=candidate.id
# O backup final preserva o estado já recuperado e os vínculos usados pelo smoke UI.
cfg.storage_backend='local'
digest,size=create_bundle(candidate_id)
with SessionLocal.begin() as db:
    candidate=db.get(BackupRun,candidate_id);candidate.status='completed';candidate.stage='completed';candidate.sha256=digest;candidate.size=size
print('PASS: fixture administrativa e pacote compatível para restauração visual',flush=True)
