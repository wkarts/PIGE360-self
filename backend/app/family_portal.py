"""Superfície privada de alunos e responsáveis; vínculos revalidados a cada acesso."""
import hashlib
from datetime import date
from uuid import UUID

from fastapi import APIRouter, File, Form, Query, Request, UploadFile
from fastapi.responses import Response
from sqlalchemy import func, or_, select

from . import class_materials, models as m
from .common import audit, number
from .config import settings
from .documents import validate_upload, write_file
from .learning_portal import own_profile_students
from .profiles import student_summary
from .reports import collect_pendencies, protocol_event
from .security import Actor, DB, fail, lock_school
from .storage import read_bytes

router=APIRouter(prefix='/api/v1/family',tags=['Portal privado escolar'])


def students(db,user):return own_profile_students(db,user)


def own_student(db,user,ident):
    row=next((s for s in students(db,user) if s.id==ident),None)
    if not row:fail(404,'Aluno não disponível para este acesso.')
    return row


def own_finance_student(db,user,student_id):
    if user.role == 'guardian':
        financial = own_profile_students(db,user,financial=True)
        student = next((item for item in financial if item.id == student_id),None)
        if student:
            return student
    own_student(db,user,student_id)
    fail(403,'Vínculo financeiro não autorizado.')


def may_finance(db,user,student):
    # Dados financeiros seguem o vínculo financeiro explícito. Aluno menor não os herda.
    if user.role!='guardian':return False
    return bool(db.scalar(select(m.GuardianLink.id).where(m.GuardianLink.student_id==student.id,m.GuardianLink.person_id==user.person_id,m.GuardianLink.school_id==student.school_id,m.GuardianLink.active.is_(True),m.GuardianLink.financial.is_(True))))


@router.get('/context')
def context(db:DB,user:Actor):
    linked = students(db, user)
    pending_by_student = {}
    if linked:
        # own_profile_students já resolveu a instituição ativa e os vínculos autorizados.
        ids = [student.id for student in linked]
        pending = collect_pendencies(db, linked[0].school_id, {'_student_ids': ids}, student_limit=len(ids))
        pending_by_student = {row['student_id']: row['documents'] for row in pending['items']}
    result=[]
    for student in linked:
        item=student_summary(db,student,student.school_id,include_documents=True)
        item['document_pendencies'] = pending_by_student.get(student.id, [])
        item['financial_authorized']=may_finance(db,user,student)
        result.append(item)
    if user.role == 'guardian':
        academic_ids = {student.id for student in linked}
        for student in own_profile_students(db,user,financial=True):
            if student.id in academic_ids:
                continue
            person = db.get(m.Person,student.person_id)
            result.append({'id':student.id,'name':person.name,'number':'','enrollments':[],'documents':[],
                           'academic_authorized':False,'financial_authorized':True})
    schools=db.execute(select(m.School.id,m.School.name).join(m.SchoolAccess,m.SchoolAccess.school_id==m.School.id).where(m.SchoolAccess.user_id==user.id,m.SchoolAccess.active.is_(True),m.SchoolAccess.archived_at.is_(None),m.School.active.is_(True)).order_by(m.School.name)).all()
    return {'schools':[{'id':ident,'name':name} for ident,name in schools],'role':user.role,'name':user.name,'students':result,'note':'Inscrição online utiliza a conta de inscrição já existente. Não compartilha automaticamente sua senha de acesso escolar.'}


@router.get('/students/{student_id}/charges')
def charges(student_id: str, db: DB, user: Actor, page: int = Query(1, ge=1), page_size: int = Query(200, ge=1, le=200)):
    from .banking import effective_status_expression
    student = own_finance_student(db, user, student_id)
    charge = m.BankCharge
    ids = select(m.Enrollment.id).where(m.Enrollment.student_id == student.id, m.Enrollment.school_id == student.school_id)
    scope = (charge.school_id == student.school_id, charge.enrollment_id.in_(ids),
             or_(charge.payer_snapshot['private_payer'].as_boolean().is_not(True),
                 charge.payer_snapshot['person_id'].as_string() == user.person_id))
    if not any(item.id == student.id for item in students(db,user)):
        person = db.get(m.Person,user.person_id)
        owner = charge.payer_snapshot['person_id'].as_string()
        scope += (or_(owner == user.person_id, (owner.is_(None) & (charge.payer_snapshot['cpf'].as_string() == person.cpf))) if person.cpf else owner == user.person_id,)
    status = effective_status_expression()
    total, overdue_count = db.execute(select(func.count(charge.id), func.count(charge.id).filter(status == 'overdue')).where(*scope)).one()
    from .asaas_card_models import CardCheckout
    has_checkout=select(CardCheckout.id).where(CardCheckout.school_id==student.school_id,CardCheckout.charge_id==charge.id,CardCheckout.payer_id==user.person_id).exists()
    rows = db.execute(select(charge.id, has_checkout.label('has_card_checkout'), charge.billing_type, charge.description, charge.amount, charge.due_on, status.label('status'), charge.collection_mode)
                      .where(*scope).order_by(charge.due_on.desc(), charge.id.desc())
                      .offset((page - 1) * page_size).limit(page_size))
    return {'items': [dict(row._mapping, amount=format(row.amount, '.2f')) for row in rows],
            'total': total, 'overdue_count': overdue_count, 'page': page, 'page_size': page_size,
            'note': 'Somente cobranças registradas para estas matrículas. O status exibido não executa cobrança ou baixa.'}


@router.get('/students/{student_id}/documents/{document_id}')
def document(student_id:str,document_id:str,db:DB,user:Actor,request:Request):
    student=own_student(db,user,student_id)
    doc=db.scalar(select(m.StudentDocument).where(m.StudentDocument.id==document_id,m.StudentDocument.student_id==student.id,m.StudentDocument.school_id==student.school_id,m.StudentDocument.status!='archived'))
    file=db.get(m.FileRecord,doc.file_id) if doc and doc.file_id else None
    if not file or file.school_id!=student.school_id:fail(404,'Documento indisponível.')
    data=read_bytes(file)
    if hashlib.sha256(data).hexdigest()!=file.sha256:fail(409,'Integridade do documento divergente.')
    audit(db,request,user,'family.document_downloaded',doc,student.school_id)
    return Response(data,media_type=file.mime_type,headers={'Cache-Control':'no-store','Content-Disposition':'attachment; filename="documento-escolar"','X-Content-Type-Options':'nosniff'})


@router.get('/students/{student_id}/materials')
def materials(student_id: str, db: DB, user: Actor):
    return class_materials.listed(db, class_materials.visible_to(own_student(db, user, student_id)))


@router.get('/students/{student_id}/materials/{material_id}/print.pdf')
def print_material(student_id: str, material_id: str, db: DB, user: Actor, request: Request):
    student = own_student(db, user, student_id)
    item = db.scalar(class_materials.visible_to(student).where(m.ClassMaterial.id == material_id))
    return class_materials.printable(db, db.get(m.School, student.school_id), user, request, item)


def guardian_student(db, user, student_id):
    if user.role != 'guardian':
        fail(403, 'A justificativa deve ser enviada pelo responsável.')
    return own_student(db, user, student_id)


@router.get('/students/{student_id}/absences')
def absence_requests(student_id: str, db: DB, user: Actor):
    student = guardian_student(db, user, student_id)
    return [dict(r) for r in db.execute(select(m.Protocol.number, m.Protocol.status, m.AbsenceSubmission.absence_date)
            .join(m.AbsenceSubmission, m.AbsenceSubmission.protocol_id == m.Protocol.id)
            .where(m.Protocol.student_id == student.id, m.Protocol.school_id == student.school_id,
                   m.AbsenceSubmission.author_id == user.id).order_by(m.Protocol.created_at.desc())).mappings()]


@router.post('/students/{student_id}/absences', status_code=201)
def submit_absence(student_id: str, db: DB, user: Actor, request: Request, absence_date: date = Form(),
                   reason: str = Form(min_length=2, max_length=2000), client_key: UUID = Form(),
                   evidence: UploadFile | None = File(None)):
    student = guardian_student(db, user, student_id)
    reason = reason.strip()
    if len(reason) < 2:
        fail(422, 'Informe o motivo da ausência.')
    data = b''
    mime = None
    if evidence:
        maximum = settings().max_upload_mb * 1024 * 1024
        data = evidence.file.read(maximum + 1)
        if len(data) > maximum:
            fail(413, 'O comprovante excede o limite de envio.')
        mime = validate_upload(data, evidence.filename or '')
    digest = hashlib.sha256()
    for field in (student.id, absence_date.isoformat(), reason, hashlib.sha256(data).hexdigest()):
        digest.update(field.encode() + b'\0')
    key = str(client_key)
    lock_school(db, student.school_id)
    previous = db.scalar(select(m.AbsenceSubmission).where(m.AbsenceSubmission.author_id == user.id,
                                                           m.AbsenceSubmission.client_key == key))
    if previous:
        if previous.fingerprint != digest.hexdigest():
            fail(409, 'Esta operação já foi utilizada para outra justificativa.')
        return {'number': db.get(m.Protocol, previous.protocol_id).number}
    attachment = None
    if evidence:
        suffix = {'application/pdf':'pdf','image/png':'png','image/jpeg':'jpg'}[mime]
        attachment = write_file(db, student.school_id, user.id, 'comprovante.' + suffix, mime, data, 'absence_evidence')
    protocol = m.Protocol(school_id=student.school_id, student_id=student.id, kind='Justificativa de ausência',
                          number=number(db, student.school_id, 'protocol', 'PRO-'), status='open',
                          description=f'{absence_date:%d/%m/%Y} — {reason}')
    db.add(protocol)
    db.flush()
    db.add(m.AbsenceSubmission(protocol_id=protocol.id, author_id=user.id, client_key=key,
                               absence_date=absence_date, file_id=attachment.id if attachment else None,
                               fingerprint=digest.hexdigest()))
    protocol_event(db, protocol, user, 'created', 'Justificativa recebida pelo portal da família.')
    audit(db, request, user, 'family.absence_submitted', protocol, student.school_id)
    return {'number': protocol.number}
