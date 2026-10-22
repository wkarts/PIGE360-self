#!/usr/bin/env python3
"""Prévia somente leitura de 0052; não imprime nomes ou documentos pessoais."""
import argparse
import json
import sys
from pathlib import Path
from sqlalchemy import text
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'backend'))
from app.db import SessionLocal

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--school-id',required=True)
args=parser.parse_args()
specs=(('students','Student','number','LEG-%'),('enrollments','Enrollment','number','LEG-MAT-%'),('teacher_profiles','TeacherProfile','registration_number','LEG-DOC-%'),('employee_profiles','EmployeeProfile','employee_number','LEG-FUNC-%'))
with SessionLocal() as db:
    counts={table:db.execute(text(f'SELECT COUNT(*) FROM {table} t WHERE t.school_id=:school AND t.{field} LIKE :prefix AND EXISTS (SELECT 1 FROM legacy_import_records r JOIN legacy_import_runs u ON u.id=r.run_id WHERE r.mapped_entity_id=t.id AND r.mapped_entity_type=:entity AND u.school_id=t.school_id)'),{'school':args.school_id,'entity':entity,'prefix':prefix}).scalar() for table,entity,field,prefix in specs}
print(json.dumps({'mode':'read_only','school_id':args.school_id,'candidate_counts':counts,'preserves':['ids','relationships','import_runs','original_records','historical_documents'],'note':'Contagens candidatas; a migration confere o prefixo e guarda o código anterior como alias interno.'},ensure_ascii=False,indent=2))
