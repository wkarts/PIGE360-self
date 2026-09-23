#!/usr/bin/env python3
"""Verificações locais adicionais, sem Docker ou publicação remota."""
import compileall, hashlib, importlib.metadata, json, os, subprocess, sys, tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='pige-validate-') as folder:
    env={**os.environ,'PYTHONPATH':str(ROOT/'backend'),'DATABASE_URL':'sqlite:///'+folder+'/schema.db','ALLOW_SQLITE':'true','APP_ENV':'test','APP_SECRET_KEY':'local-test-validation-key-00000000000000','SETUP_TOKEN':'local-test-validation-setup-00000','STORAGE_PATH':folder+'/files','FRONTEND_PATH':str(ROOT/'frontend/dist')}
    migration=[]
    for command in [['upgrade','head'],['check'],['downgrade','base'],['upgrade','head']]:
        p=subprocess.run([sys.executable,'-m','alembic',*command],cwd=ROOT/'backend',env=env,text=True,capture_output=True)
        migration.append({'command':'alembic '+' '.join(command),'exit_code':p.returncode,'output':p.stdout+p.stderr})
        if p.returncode:raise RuntimeError(migration[-1])
    code='''import json\nfrom pathlib import Path\nfrom app.main import app\nfrom app.db import Base\nfrom sqlalchemy.schema import CreateTable\nfrom sqlalchemy.dialects.postgresql import dialect\nroot=Path(__import__('sys').argv[1])\n(root/'docs/openapi.json').write_text(json.dumps(app.openapi(),ensure_ascii=False,indent=2))\nddl=[]\nfor table in Base.metadata.sorted_tables:\n    ddl.append('\\n'.join(line.rstrip() for line in str(CreateTable(table).compile(dialect=dialect())).splitlines())+';')\n(root/'evidence/0.3.0/postgresql-schema-preview.sql').write_text('\\n'.join(ddl))\nprint(json.dumps({'tables':len(Base.metadata.tables),'routes':len(app.routes),'openapi_paths':len(app.openapi()['paths'])}))'''
    export=subprocess.run([sys.executable,'-c',code,str(ROOT)],env=env,text=True,capture_output=True,check=True)
    counts=json.loads(export.stdout)
    result={'migrations_sqlite':migration,'schema_counts':counts,'postgresql_ddl':'compilado estaticamente; não executado em PostgreSQL','python_compileall':compileall.compile_dir(ROOT/'backend',quiet=1),'docker_executed':False,'postgresql_runtime_executed':False}
    (ROOT/'evidence/0.3.0/static-validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps(counts))
