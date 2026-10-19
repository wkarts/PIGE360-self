"""Persisted progress and atomic restart on a synthetic multi-batch import."""
import json
import sqlite3
from datetime import timedelta
from sqlalchemy import select,func
from app import models as m
from app.config import settings
from app.db import SessionLocal,now
from app import import_operations
from app.integration_worker import process_one


def test_multibatch_import_progress_survives_failure_and_resume(api,client,admin,monkeypatch):
    monkeypatch.setattr(settings(),'portability_enabled',True)
    with SessionLocal.begin() as db:db.get(m.Installation,1).portability_enabled=True
    source=sqlite3.connect(':memory:')
    source.execute('CREATE TABLE alunos(id TEXT,nome TEXT,data_nascimento TEXT,ativo INTEGER)')
    source.executemany('INSERT INTO alunos VALUES(?,?,?,1)',[(str(n),f'Aluno sintético {n}','2015-02-10') for n in range(600)])
    source.commit();payload=source.serialize();source.close()
    files={'backup':('synthetic.sqlite',payload,'application/octet-stream')}
    selection=json.dumps({'tables':['alunos'],'include_photos':False,'include_media':False})
    base=api.base+'/legacy-import'
    preview=client.post(base+'/preview',headers=admin,files=files,data={'selection':selection});assert preview.status_code==200,preview.text
    data={'selection':selection,'fingerprint':preview.json()['fingerprint'],'confirmation':'IMPORTAR'}
    queued=client.post(base+'/operations',headers=admin,files=files,data=data);assert queued.status_code==202,queued.text
    ident=queued.json()['id']
    with SessionLocal() as db:job_id=db.get(import_operations.ImportOperation,ident).job_id
    original=import_operations.write_progress;observed=[]
    def interrupt_after_batch(operation,value):
        original(operation,value)
        if value['stage']=='archive' and value['progress'].get('archived_records',0)>0:
            observed.append(import_operations.read_progress(operation))
            raise RuntimeError('synthetic interruption after durable batch progress')
    monkeypatch.setattr(import_operations,'write_progress',interrupt_after_batch)
    assert process_one(job_id)
    assert observed and 0<observed[0]['progress']['archived_records']<600
    history=client.get(base+'/operations',headers=admin).json()[0]
    assert history['status']=='failed' and history['progress']['selected_records']==600
    with SessionLocal.begin() as db:
        assert db.scalar(select(func.count()).select_from(m.Student).where(m.Student.school_id==api.school['id']))==0
        db.get(m.IntegrationJob,job_id).updated_at=now()-timedelta(minutes=1)
    monkeypatch.setattr(import_operations,'write_progress',original)
    resumed=client.post(base+'/operations/'+ident+'/resume',headers=admin);assert resumed.status_code==200,resumed.text
    assert process_one(job_id)
    final=client.get(base+'/operations',headers=admin).json()[0]
    assert final['status']=='completed' and final['progress']['archived_records']==600
    assert final['attempts']==2 and not process_one(job_id)
    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(m.Student).where(m.Student.school_id==api.school['id']))==600
