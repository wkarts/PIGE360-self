import importlib.util
from pathlib import Path
from sqlalchemy import select
from app import models as m
from app.db import SessionLocal


def test_normalization_preserves_origin_ids_and_search_and_is_repeatable(api):
    student=api.student('LEG é texto legítimo no nome')
    untouched=api.student('Outra pessoa')
    c=api.catalogs();enrollment=api.enroll(student,c['group'])
    with SessionLocal.begin() as db:
        actor=db.scalar(select(m.User).where(m.User.email=='admin@example.com'))
        run=m.LegacyImportRun(school_id=api.school['id'],fingerprint='a'*64,imported_by=actor.id,summary={});db.add(run);db.flush()
        for cls,ident,code in ((m.Student,student['id'],'LEG-42'),(m.Enrollment,enrollment['id'],'LEG-MAT-42')):
            db.get(cls,ident).number=code
            db.add(m.LegacyImportRecord(run_id=run.id,source_table='alunos' if cls==m.Student else 'matriculas',source_key='42',mapped_entity_type=cls.__name__,mapped_entity_id=ident,record_data={'id':42,'origin':'unchanged'}))
        db.get(m.Student,untouched['id']).number='LEG-user-code'
    spec=importlib.util.spec_from_file_location('migration',Path(__file__).parents[1]/'migrations/versions/0052_imported_identifiers.py');migration=importlib.util.module_from_spec(spec);spec.loader.exec_module(migration)
    with SessionLocal.begin() as db:migration.normalize(db.connection())
    first=api.get('/students/'+student['id'])
    assert [r['id'] for r in api.get('/students?imported_only=true')['items']]==[student['id']]
    assert first['number'].startswith('AL-') and first['person']['name']==student['person']['name']
    assert 'imported_number' not in first
    assert api.get('/students?q=LEG-42')['items'][0]['id']==student['id']
    assert api.get('/enrollments?q=LEG-MAT-42')['items'][0]['id']==enrollment['id']
    assert api.get('/students/'+untouched['id'])['number']=='LEG-user-code'
    with SessionLocal.begin() as db:
        migration.normalize(db.connection())
        assert db.get(m.Student,student['id']).imported_number=='LEG-42'
        assert db.scalar(select(m.LegacyImportRecord).where(m.LegacyImportRecord.mapped_entity_id==student['id'])).record_data=={'id':42,'origin':'unchanged'}
    assert api.get('/students/'+student['id'])['number']==first['number']
