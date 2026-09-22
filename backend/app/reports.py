import csv
import io
from datetime import date
from typing import Annotated
from fastapi import Depends
from fastapi import APIRouter, Query, Request
from fastapi.responses import Response
from sqlalchemy import func, select, or_
from . import models as m, schemas as s
from .common import audit, number, output
from .db import now
from .documents import checklist, render_pdf
from .registry import occupancy, validate
from .security import Actor, DB, Scope, check_version, fail, lock_school, require, scoped

router = APIRouter(prefix='/api/v1/schools/{school_id}', tags=['Secretaria, protocolos e relatórios'])

DOCUMENT_STATES = {'pending', 'received', 'rejected', 'expired'}
PROTOCOL_STATES = {'open', 'in_progress', 'waiting', 'completed', 'cancelled'}
STATE_LABELS = {'pending':'Pendente', 'received':'Aguardando análise', 'rejected':'Rejeitado', 'expired':'Vencido',
                'open':'Aberto', 'in_progress':'Em atendimento', 'waiting':'Aguardando', 'completed':'Concluído', 'cancelled':'Cancelado'}


def pendency_filters(q: str = Query('', max_length=160), academic_year_id: str = '', class_group_id: str = '',
                     document_type_id: str = '', document_status: str = ''):
    if document_status and document_status not in DOCUMENT_STATES:
        fail(422, 'Situação documental inválida para o relatório de pendências.')
    return dict(q=q.strip(), academic_year_id=academic_year_id, class_group_id=class_group_id,
                document_type_id=document_type_id, document_status=document_status)


PendencyFilters = Annotated[dict, Depends(pendency_filters)]


def collect_pendencies(db, school_id, filters=None, student_limit=5000):
    """Leitura em lote; nunca oculta o limite de varredura ao operador."""
    filters = filters or {}
    for key, model in [('academic_year_id', m.AcademicYear), ('class_group_id', m.ClassGroup), ('document_type_id', m.DocumentType)]:
        if filters.get(key): scoped(db, model, filters[key], school_id)
    enrollment_conditions = [m.Enrollment.school_id == school_id, m.Enrollment.status.in_(['draft','active','suspended'])]
    for key in ('academic_year_id', 'class_group_id'):
        if filters.get(key): enrollment_conditions.append(getattr(m.Enrollment, key) == filters[key])
    stmt = select(m.Student, m.Person).join(m.Person, m.Person.id == m.Student.person_id).where(
        m.Student.school_id == school_id, m.Student.status == 'active')
    if filters.get('academic_year_id') or filters.get('class_group_id'):
        stmt = stmt.where(m.Student.id.in_(select(m.Enrollment.student_id).where(*enrollment_conditions)))
    if filters.get('q'):
        q = filters['q']
        stmt = stmt.where(or_(m.Person.name.icontains(q, autoescape=True), m.Student.number.icontains(q, autoescape=True)))
    total_students = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    candidates = db.execute(stmt.order_by(m.Person.name, m.Student.id).limit(student_limit)).all()
    ids = [student.id for student, _ in candidates]
    types = db.scalars(select(m.DocumentType).where(m.DocumentType.school_id == school_id, m.DocumentType.active.is_(True), m.DocumentType.required.is_(True)).order_by(m.DocumentType.name)).all()
    if filters.get('document_type_id'):
        types = [t for t in types if t.id == filters['document_type_id']]
    groups = {g.id:g for g in db.scalars(select(m.ClassGroup).where(m.ClassGroup.school_id == school_id))}
    years = {y.id:y.name for y in db.scalars(select(m.AcademicYear).where(m.AcademicYear.school_id == school_id))}
    latest_enrollments, latest_docs = {}, {}
    if ids:
        for enrollment in db.scalars(select(m.Enrollment).where(*enrollment_conditions, m.Enrollment.student_id.in_(ids)).order_by(m.Enrollment.created_at.desc(), m.Enrollment.id.desc())):
            latest_enrollments.setdefault(enrollment.student_id, enrollment)
        for document in db.scalars(select(m.StudentDocument).where(m.StudentDocument.school_id == school_id, m.StudentDocument.student_id.in_(ids), m.StudentDocument.status != 'archived').order_by(m.StudentDocument.created_at.desc(), m.StudentDocument.id.desc())):
            latest_docs.setdefault((document.student_id, document.document_type_id), document)
    results = []
    for student, person in candidates:
        enrollment = latest_enrollments.get(student.id)
        group = groups.get(enrollment.class_group_id) if enrollment else None
        missing = []
        for kind in types:
            if kind.grade_id and (not group or kind.grade_id != group.grade_id): continue
            document = latest_docs.get((student.id, kind.id))
            state = document.status if document else 'pending'
            if document and document.expires_on and document.expires_on < date.today(): state = 'expired'
            if state in ('validated','waived'): continue
            if filters.get('document_status') and state != filters['document_status']: continue
            missing.append({'document_type_id':kind.id, 'name':kind.name, 'required':True, 'status':state,
                            'complete':False, 'document_id':document.id if document else None})
        if missing:
            results.append({'student_id':student.id, 'student_number':student.number, 'student_name':person.name,
                            'class_name':group.name if group else 'Sem turma',
                            'year_name':years.get(enrollment.academic_year_id, '') if enrollment else '',
                            'count':len(missing), 'documents':missing})
    return {'items':results, 'total':len(results), 'total_documents':sum(r['count'] for r in results),
            'scanned_students':len(candidates), 'total_students':total_students,
            'student_limit':student_limit, 'truncated':total_students > len(candidates)}


def pendencies(db, school_id, student_limit=5000):
    return collect_pendencies(db, school_id, student_limit=student_limit)['items']


@router.get('/dashboard')
def dashboard(db: DB, user: Actor, school: Scope):
    require(user, 'dashboard.read')
    def count(model, *filters):
        return db.scalar(select(func.count()).select_from(model).where(model.school_id == school.id, *filters)) or 0
    groups = db.scalars(select(m.ClassGroup).join(m.AcademicYear, m.AcademicYear.id == m.ClassGroup.academic_year_id).where(m.ClassGroup.school_id == school.id, m.ClassGroup.active.is_(True), m.AcademicYear.status == 'active')).all()
    from .enrollments import enrollment_output
    recent = db.scalars(select(m.Enrollment).where(m.Enrollment.school_id == school.id).order_by(m.Enrollment.created_at.desc()).limit(6)).all()
    return {'students': count(m.Student, m.Student.status == 'active'), 'enrollments': count(m.Enrollment, m.Enrollment.status == 'active'),
            'drafts': count(m.Enrollment, m.Enrollment.status == 'draft'), 'classes': len(groups),
            'available': sum(max(0, g.capacity - occupancy(db, g.id)) for g in groups),
            'open_protocols':count(m.Protocol, m.Protocol.status.in_(['open','in_progress','waiting'])),
            'overdue_protocols':count(m.Protocol, m.Protocol.status.in_(['open','in_progress','waiting']), m.Protocol.due_on < date.today()),
            'received_documents':count(m.StudentDocument, m.StudentDocument.status == 'received'),
            'recent_enrollments':[enrollment_output(db,e) for e in recent]}

@router.get('/document-pendencies')
def document_pendencies(db: DB, user: Actor, school: Scope, filters: PendencyFilters,
                       page: int = Query(1, ge=1), page_size: int = Query(30, ge=1, le=100)):
    data = collect_pendencies(db, school.id, filters)
    return {**data, 'items':data['items'][(page-1)*page_size:page*page_size], 'page':page, 'page_size':page_size}


def protocol_output(db, obj):
    student = db.get(m.Student, obj.student_id) if obj.student_id else None
    person = db.get(m.Person, student.person_id) if student else None
    return {**output(obj), 'student_name':person.name if person else '',
            'overdue':bool(obj.due_on and obj.due_on < date.today() and obj.status not in ('completed','cancelled'))}


def protocol_event(db, obj, user, action, message, before=None):
    db.add(m.ProtocolEvent(school_id=obj.school_id, protocol_id=obj.id, actor_id=user.id, action=action,
                           message=message, before=before or {}, after=output(obj)))


@router.get('/protocols')
def protocols(db: DB, user: Actor, school: Scope, q: str = Query('', max_length=160), status: str = '',
              student_id: str = '', overdue: bool = False,
              page: int = Query(1, ge=1), page_size: int = Query(30, ge=1, le=100)):
    stmt = select(m.Protocol).where(m.Protocol.school_id == school.id)
    if status:
        if status not in PROTOCOL_STATES: fail(422, 'Situação de protocolo inválida.')
        stmt = stmt.where(m.Protocol.status == status)
    if student_id:
        scoped(db, m.Student, student_id, school.id)
        stmt = stmt.where(m.Protocol.student_id == student_id)
    if overdue:
        stmt = stmt.where(m.Protocol.due_on < date.today(), m.Protocol.status.not_in(['completed','cancelled']))
    if q.strip():
        stmt = stmt.where(or_(m.Protocol.number.icontains(q.strip(), autoescape=True), m.Protocol.kind.icontains(q.strip(), autoescape=True), m.Protocol.description.icontains(q.strip(), autoescape=True)))
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    return {'items':[protocol_output(db, p) for p in db.scalars(stmt.order_by(m.Protocol.created_at.desc(), m.Protocol.id.desc()).offset((page-1)*page_size).limit(page_size))], 'total':total, 'page':page, 'page_size':page_size}


@router.post('/protocols', status_code=201)
def create_protocol(data: s.ProtocolInput, db: DB, user: Actor, school: Scope, request: Request):
    require(user, 'protocols.write'); lock_school(db, school.id)
    if data.student_id: scoped(db, m.Student, data.student_id, school.id)
    obj = m.Protocol(school_id=school.id, number=number(db, school.id, 'protocol', 'PRO-'), **data.model_dump())
    if data.status == 'completed': obj.completed_at = now()
    db.add(obj); db.flush()
    protocol_event(db, obj, user, 'created', 'Protocolo aberto.')
    audit(db, request, user, 'protocol.created', obj, school.id)
    return protocol_output(db, obj)


@router.get('/protocols/{protocol_id}')
def protocol_detail(protocol_id: str, db: DB, user: Actor, school: Scope):
    obj = scoped(db, m.Protocol, protocol_id, school.id)
    history = db.execute(select(m.ProtocolEvent, m.User.name).join(m.User, m.User.id == m.ProtocolEvent.actor_id).where(
        m.ProtocolEvent.school_id == school.id, m.ProtocolEvent.protocol_id == obj.id).order_by(m.ProtocolEvent.created_at, m.ProtocolEvent.id)).all()
    return {**protocol_output(db, obj), 'history':[{**output(e), 'actor_name':name} for e,name in history]}


@router.patch('/protocols/{protocol_id}')
def edit_protocol(protocol_id: str, data: s.Edit, db: DB, user: Actor, school: Scope, request: Request):
    require(user, 'protocols.write'); lock_school(db, school.id)
    obj = scoped(db, m.Protocol, protocol_id, school.id); check_version(obj, data.version)
    values = validate(s.ProtocolInput, data.data).model_dump()
    if values['student_id']: scoped(db, m.Student, values['student_id'], school.id)
    before = output(obj)
    for key, value in values.items(): setattr(obj, key, value)
    obj.completed_at = (obj.completed_at or now()) if obj.status == 'completed' else None
    obj.version += 1
    db.flush()
    changed = [key for key in values if str(before.get(key) or '') != str(values[key] or '')]
    message = 'Situação: ' + STATE_LABELS.get(before['status'], before['status']) + ' → ' + STATE_LABELS[obj.status] if before['status'] != obj.status else 'Dados do protocolo atualizados.'
    protocol_event(db, obj, user, 'updated', message, before)
    audit(db, request, user, 'protocol.updated', obj, school.id, {'before':before, 'after':output(obj), 'fields':changed})
    return protocol_output(db, obj)


@router.post('/protocols/{protocol_id}/notes', status_code=201)
def add_protocol_note(protocol_id: str, data: s.ProtocolNote, db: DB, user: Actor, school: Scope, request: Request):
    require(user, 'protocols.write'); lock_school(db, school.id)
    obj = scoped(db, m.Protocol, protocol_id, school.id); check_version(obj, data.version)
    if obj.status in ('completed','cancelled'):
        fail(409, 'Reabra o protocolo antes de registrar novo atendimento.')
    before = output(obj)
    obj.version += 1
    db.flush()
    protocol_event(db, obj, user, 'note', data.message, before)
    audit(db, request, user, 'protocol.note_added', obj, school.id)
    return protocol_output(db, obj)


@router.get('/protocols/{protocol_id}/pdf')
def protocol_pdf(protocol_id: str, db: DB, user: Actor, school: Scope, request: Request):
    require(user, 'reports.read')
    obj = scoped(db, m.Protocol, protocol_id, school.id)
    data = protocol_output(db, obj)
    content = render_pdf(school.name, 'Comprovante de protocolo', [
        ('Protocolo', obj.number), ('Solicitação', obj.kind), ('Aluno', data['student_name'] or 'Não vinculado'),
        ('Situação', STATE_LABELS[obj.status]), ('Prazo', obj.due_on.strftime('%d/%m/%Y') if obj.due_on else 'Não definido'),
        ('Descrição', obj.description)], note='Comprovante de registro de solicitação. Não comprova conclusão ou deferimento.', issuer=user.name)
    audit(db, request, user, 'protocol.receipt_exported', obj, school.id)
    return Response(content, media_type='application/pdf', headers={'Content-Disposition':'attachment; filename="protocolo.pdf"', 'Cache-Control':'no-store'})


@router.get('/audit')
def audit_list(db: DB, user: Actor, school: Scope, page: int = Query(1, ge=1), page_size: int = Query(30, ge=1, le=100)):
    require(user, 'audit.read')
    stmt = select(m.AuditEvent).where(m.AuditEvent.school_id == school.id)
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    return {'items':[output(x) for x in db.scalars(stmt.order_by(m.AuditEvent.created_at.desc()).offset((page-1)*page_size).limit(page_size))], 'total':total, 'page':page, 'page_size':page_size}

@router.get('/reports/class/{class_id}')
def class_report(class_id: str, db: DB, user: Actor, school: Scope):
    require(user, 'reports.read'); group = scoped(db, m.ClassGroup, class_id, school.id)
    rows = db.execute(select(m.Enrollment, m.Student, m.Person).join(m.Student, m.Student.id == m.Enrollment.student_id).join(m.Person, m.Person.id == m.Student.person_id).where(m.Enrollment.class_group_id == group.id, m.Enrollment.school_id == school.id, m.Enrollment.status.in_(['active','suspended'])).order_by(m.Person.name)).all()
    return {'class_group':output(group), 'items':[{'number':e.number, 'student_number':s.number, 'name':p.name, 'birth_date':p.birth_date.isoformat(), 'status':e.status} for e,s,p in rows]}

def csv_safe(value):
    text = str(value if value is not None else '')
    return "'" + text if text.lstrip().startswith(('=', '+', '-', '@', '\t', '\r')) else text

@router.get('/reports/students.csv')
def export_students(db: DB, user: Actor, school: Scope, request: Request):
    require(user, 'reports.read')
    stream = io.StringIO(); writer = csv.writer(stream, delimiter=';', quoting=csv.QUOTE_ALL)
    writer.writerow(['Código','Nome','Nascimento','Contato','Situação'])
    for student, person in db.execute(select(m.Student,m.Person).join(m.Person,m.Person.id == m.Student.person_id).where(m.Student.school_id == school.id).order_by(m.Person.name)):
        writer.writerow([csv_safe(x) for x in [student.number,person.name,person.birth_date.isoformat(),person.phone,student.status]])
    audit(db, request, user, 'report.students_exported', school, school.id)
    return Response('\ufeff' + stream.getvalue(), media_type='text/csv; charset=utf-8', headers={'Content-Disposition':'attachment; filename="alunos.csv"', 'Cache-Control':'no-store'})

@router.get('/reports/class/{class_id}/pdf')
def class_pdf(class_id: str, db: DB, user: Actor, school: Scope, request: Request):
    data = class_report(class_id, db, user, school)
    payload = render_pdf(school.name, 'Relação de alunos - ' + data['class_group']['name'], [(str(i+1).zfill(2), r['name'] + ' | ' + r['number']) for i,r in enumerate(data['items'])], note=f'Total de alunos: {len(data["items"])}. Matrículas ativas e suspensas.')
    audit(db, request, user, 'report.class_exported', school, school.id, {'class_group_id':class_id})
    return Response(payload, media_type='application/pdf', headers={'Content-Disposition':'attachment; filename="alunos-da-turma.pdf"', 'Cache-Control':'no-store'})


def exportable_pendencies(db, school_id, filters):
    data = collect_pendencies(db, school_id, filters)
    if data['truncated']:
        fail(422, 'O filtro excede 5.000 alunos. Restrinja por ano, turma ou nome antes de exportar; nenhum relatório parcial foi gerado.')
    return data


@router.get('/reports/document-pendencies.csv')
def pending_csv(db: DB, user: Actor, school: Scope, request: Request, filters: PendencyFilters):
    require(user, 'reports.read')
    data = exportable_pendencies(db, school.id, filters)
    stream = io.StringIO(); writer = csv.writer(stream, delimiter=';', quoting=csv.QUOTE_ALL)
    writer.writerow(['Código', 'Aluno', 'Ano letivo', 'Turma', 'Documento obrigatório', 'Situação'])
    for row in data['items']:
        for document in row['documents']:
            writer.writerow([csv_safe(v) for v in [row['student_number'], row['student_name'], row['year_name'], row['class_name'], document['name'], STATE_LABELS[document['status']]]])
    audit(db, request, user, 'report.document_pendencies_exported', school, school.id, {'format':'csv','count':data['total_documents']})
    return Response('\ufeff'+stream.getvalue(), media_type='text/csv; charset=utf-8', headers={'Content-Disposition':'attachment; filename="pendencias-documentais.csv"', 'Cache-Control':'no-store'})


@router.get('/reports/document-pendencies.pdf')
def pending_pdf(db: DB, user: Actor, school: Scope, request: Request, filters: PendencyFilters):
    require(user, 'reports.read')
    data = exportable_pendencies(db, school.id, filters)
    if data['total_documents'] > 1000:
        fail(422, 'Este relatório contém mais de 1.000 pendências. Refine o filtro ou exporte em CSV.')
    rows = [(row['student_name']+' | '+row['student_number'], row['class_name']+' / '+row['year_name']+' — '+ '; '.join(d['name']+' ('+STATE_LABELS[d['status']]+')' for d in row['documents'])) for row in data['items']]
    content = render_pdf(school.name, 'Pendências documentais', rows, note=f"{data['total']} aluno(s) com pendências; {data['total_documents']} documento(s). Respeita os filtros selecionados na emissão.", issuer=user.name)
    audit(db, request, user, 'report.document_pendencies_exported', school, school.id, {'format':'pdf','count':data['total_documents']})
    return Response(content, media_type='application/pdf', headers={'Content-Disposition':'attachment; filename="pendencias-documentais.pdf"', 'Cache-Control':'no-store'})
