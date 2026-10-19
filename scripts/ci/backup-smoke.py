"""Executado somente na stack Docker descartável, com app e workers parados."""
import hashlib
from pathlib import Path
import os
import sys
sys.path.insert(0,'/app/backend')
from app import models as m
from app.config import settings
from app.db import SessionLocal, uid
from app.backups import create_bundle, bundle_path, verify_bundle
from app.backup_restore import restore
from app.documents import write_file
from app.storage import read_bytes, ensure_storage

if not os.environ.get('DATABASE_URL','').split('@')[-1].startswith('db:5432/'):
    raise SystemExit('Este smoke só aceita o banco interno da stack descartável.')
cfg=settings()
with SessionLocal.begin() as db:
    installation=db.get(m.Installation,1)
    if not installation:db.add(m.Installation(id=1,configured=True))
    if db.query(m.Company).count():raise SystemExit('Smoke exige instalação sem dados anteriores.')
    company=m.Company(name='Mantenedora sintética de backup');db.add(company);db.flush()
    school=m.School(name='Escola sintética de backup',company_id=company.id);db.add(school)
    user=m.User(name='Operador sintético',email='backup@example.test',password_hash='not-a-login-hash',role='admin');db.add(user);db.flush()
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
    restore(bundle_path(ident))
    with SessionLocal() as db:
        assert db.get(m.Company,company_id).name=='Mantenedora sintética de backup'
        assert read_bytes(db.get(m.FileRecord,file_id))==b'synthetic local backup document'
        if backend=='s3':assert read_bytes(db.get(m.FileRecord,minio_id))==b'synthetic minio backup document'
    print('PASS: restauração real PostgreSQL e documentos '+backend+' em stack descartável',flush=True)
