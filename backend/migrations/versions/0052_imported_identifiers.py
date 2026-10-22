"""Códigos operacionais com alias original preservado somente para registros mapeados."""
from alembic import op
import sqlalchemy as sa
import hashlib
import json
import re
revision='0052_imported_identifiers'
down_revision='0051_docx_layout'
branch_labels=None
depends_on=None
SPECS=(('students','Student','number','student','AL-','LEG-'),('enrollments','Enrollment','number','enrollment','MAT-','LEG-MAT-'),('teacher_profiles','TeacherProfile','registration_number','teacher','DOC-','LEG-DOC-'),('employee_profiles','EmployeeProfile','employee_number','employee','FUNC-','LEG-FUNC-'))


def upgrade():
    db=op.get_bind()
    for table,*_ in SPECS:
        op.add_column(table,sa.Column('imported_number',sa.String(40),nullable=False,server_default=''))
    normalize(db)


def generated_code_matches(old,prefix,source_key,data,maximum):
    if isinstance(data,str):
        try:data=json.loads(data)
        except (ValueError,TypeError):return False
    if not isinstance(data,dict):return False
    value=(data.get('numero_matricula') or data.get('id',source_key)) if prefix=='LEG-MAT-' else data.get('id',source_key)
    raw='' if value is None or isinstance(value,bytes) else str(value).replace('\x00','').strip()[:500]
    compact=re.sub(r'[^A-Za-z0-9_-]+','-',raw).strip('-_')
    base=prefix+(compact or hashlib.sha256(raw.encode()).hexdigest()[:12])
    if len(base)>maximum:base=prefix+hashlib.sha256(raw.encode()).hexdigest()[:16]
    if old==base:return True
    suffix=re.search(r'-(\d+)$',old)
    return bool(suffix and int(suffix[1])>=2 and old==base[:maximum-len(suffix[0])]+suffix[0])


def normalize(db):
    for table,entity,field,kind,prefix,oldprefix in SPECS:
        rows=db.execute(sa.text(f'SELECT t.id,t.school_id,t.{field} FROM {table} t WHERE EXISTS (SELECT 1 FROM legacy_import_records r JOIN legacy_import_runs u ON u.id=r.run_id WHERE r.mapped_entity_id=t.id AND r.mapped_entity_type=:entity AND u.school_id=t.school_id) ORDER BY t.school_id,t.id'),{'entity':entity}).all()
        for ident,school,old in rows:
            if not old.startswith(oldprefix):continue
            origins=db.execute(sa.text('SELECT r.source_key,r.record_data FROM legacy_import_records r JOIN legacy_import_runs u ON u.id=r.run_id WHERE r.mapped_entity_id=:id AND r.mapped_entity_type=:entity AND u.school_id=:school'),{'id':ident,'entity':entity,'school':school}).all()
            if not any(generated_code_matches(old,oldprefix,source_key,data,32 if table=='students' else 40) for source_key,data in origins):continue
            key=school+':'+kind
            value=db.execute(sa.text('SELECT value FROM number_sequences WHERE key=:key'),{'key':key}).scalar()
            existed=value is not None;value=value or 0
            while True:
                value+=1;new=f'{prefix}{value:06d}'
                if not db.execute(sa.text(f'SELECT id FROM {table} WHERE school_id=:school AND {field}=:new'),{'school':school,'new':new}).first():break
            if existed:db.execute(sa.text('UPDATE number_sequences SET value=:value WHERE key=:key'),{'key':key,'value':value})
            else:db.execute(sa.text('INSERT INTO number_sequences (key,value) VALUES (:key,:value)'),{'key':key,'value':value})
            db.execute(sa.text(f'UPDATE {table} SET {field}=:new,imported_number=:old WHERE id=:id'),{'id':ident,'new':new,'old':old})


def downgrade():
    # Não renumerar registros já usados em documentos ou integrações após upgrade.
    # O alias permanece no arquivo original e nos mapas. Backup é obrigatório para reversão de dados.
    for table,*_ in SPECS:op.drop_column(table,'imported_number')
