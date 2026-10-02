import hashlib
import io
from datetime import date
from pathlib import Path
from xml.sax.saxutils import escape
from fastapi import APIRouter, File, Form, Request, UploadFile
from fastapi.responses import Response
from sqlalchemy import select, or_
from PIL import Image
from pypdf import PdfReader
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
from . import models as m, schemas as s
from .config import settings
from .db import uid, now
from .storage import put_bytes, read_bytes
from .common import audit, output
from .security import Actor, DB, Scope, check_version, fail, lock_school, require, scoped
from .lifecycle_models import require_available

router = APIRouter(prefix='/api/v1/schools/{school_id}', tags=['Documentos e arquivos'])

def checklist(db, school_id, student_id, grade_id=None):
    criteria = [m.DocumentType.school_id == school_id, m.DocumentType.active.is_(True)]
    criteria.append(or_(m.DocumentType.grade_id.is_(None), m.DocumentType.grade_id == grade_id) if grade_id else m.DocumentType.grade_id.is_(None))
    types = db.scalars(select(m.DocumentType).where(*criteria).order_by(m.DocumentType.name)).all()
    docs = db.scalars(select(m.StudentDocument).where(m.StudentDocument.student_id == student_id, m.StudentDocument.school_id == school_id, m.StudentDocument.status != 'archived').order_by(m.StudentDocument.created_at.desc(), m.StudentDocument.id.desc())).all()
    latest = {}
    for doc in docs:
        latest.setdefault(doc.document_type_id, doc)
    result = []
    for doc_type in types:
        doc = latest.get(doc_type.id)
        state = doc.status if doc else 'pending'
        if doc and doc.expires_on and doc.expires_on < date.today():
            state = 'expired'
        result.append({'document_type_id': doc_type.id, 'name': doc_type.name, 'required': doc_type.required,
                       'status': state, 'complete': state in ('validated', 'waived'), 'document_id': doc.id if doc else None})
    return result

def write_file(db, school_id, user_id, name, mime, data, file_kind='document'):
    cfg = settings()
    key = f'{school_id}/{uid()}'
    put_bytes(key, data, mime)
    backend = cfg.storage_backend.lower()
    bucket = cfg.storage_bucket if backend == 's3' else ''
    db.info.setdefault('new_storage_objects', []).append((backend, bucket, key))
    obj = m.FileRecord(
        school_id=school_id,
        original_name=Path(name.replace('\\', '/')).name[:240],
        storage_key=key,
        mime_type=mime,
        size=len(data),
        sha256=hashlib.sha256(data).hexdigest(),
        storage_backend=backend,
        bucket_name=bucket,
        file_kind=file_kind,
        created_by=user_id,
    )
    db.add(obj)
    db.flush()
    return obj

def validate_upload(data, filename):
    suffix = Path(filename).suffix.lower()
    if not data:
        fail(422, 'O arquivo está vazio.')
    if suffix == '.pdf' and data.startswith(b'%PDF-'):
        try:
            pdf = PdfReader(io.BytesIO(data), strict=True)
            if pdf.is_encrypted or len(pdf.pages) > 100:
                fail(422, 'PDF criptografado ou com mais de 100 páginas não é aceito.')
            root = pdf.trailer['/Root']
            if '/OpenAction' in root or '/AA' in root or any(x in data for x in [b'/JavaScript', b'/JS', b'/Launch', b'/EmbeddedFile']):
                fail(422, 'PDF com conteúdo ativo ou anexos embutidos não é permitido.')
        except Exception as exc:
            from fastapi import HTTPException
            if isinstance(exc, HTTPException): raise
            fail(422, 'O arquivo não é um PDF íntegro.')
        return 'application/pdf'
    if suffix in ('.png', '.jpg', '.jpeg'):
        try:
            with Image.open(io.BytesIO(data)) as image:
                if image.format not in ('PNG','JPEG') or image.width * image.height > 30_000_000:
                    fail(422, 'Imagem não suportada ou com dimensão excessiva.')
                image.verify()
                return 'image/png' if image.format == 'PNG' else 'image/jpeg'
        except Exception as exc:
            from fastapi import HTTPException
            if isinstance(exc, HTTPException): raise
            fail(422, 'Imagem inválida.')
    fail(422, 'Envie PDF, PNG ou JPEG válido. SVG e arquivos executáveis não são aceitos.')

def doc_output(db, doc):
    kind = db.get(m.DocumentType, doc.document_type_id)
    file = db.get(m.FileRecord, doc.file_id) if doc.file_id else None
    return {**output(doc), 'type_name': kind.name, 'file': output(file, ('storage_key', 'storage_backend', 'bucket_name', 'file_kind')) if file else None,
            'effective_status': 'expired' if doc.expires_on and doc.expires_on < date.today() else doc.status}

@router.get('/students/{student_id}/documents')
def documents(student_id: str, db: DB, user: Actor, school: Scope):
    require(user, 'documents.read')
    scoped(db, m.Student, student_id, school.id)
    enrollment = db.scalar(select(m.Enrollment).where(m.Enrollment.student_id == student_id, m.Enrollment.school_id == school.id).order_by(m.Enrollment.created_at.desc()).limit(1))
    grade_id = db.get(m.ClassGroup, enrollment.class_group_id).grade_id if enrollment else None
    docs = [doc_output(db, doc) for doc in db.scalars(select(m.StudentDocument).where(m.StudentDocument.student_id == student_id, m.StudentDocument.school_id == school.id).order_by(m.StudentDocument.created_at.desc()))]
    issued = []
    for x in db.scalars(select(m.IssuedDocument).where(
            m.IssuedDocument.student_id == student_id, m.IssuedDocument.school_id == school.id
    ).order_by(m.IssuedDocument.created_at.desc())):
        current_file_id = x.file_id
        if x.kind == 'template' and x.signature_status != 'unsigned':
            from .contract_signatures import latest_signed_file
            current = latest_signed_file(db, x)
            if current:
                current_file_id = current.id
        issued.append({**output(x), 'current_file_id': current_file_id,
                       'template_name': x.snapshot.get('template_name', '') if x.kind == 'template' else ''})
    return {'items': docs, 'checklist': checklist(db, school.id, student_id, grade_id), 'issued': issued}

@router.post('/students/{student_id}/documents', status_code=201)
def upload(student_id: str, db: DB, user: Actor, school: Scope, request: Request, document_type_id: str = Form(...), expires_on: date | None = Form(None), notes: str = Form(''), file: UploadFile = File(...)):
    require(user, 'documents.write')
    lock_school(db, school.id)
    require_available(db, scoped(db, m.Student, student_id, school.id))
    kind = scoped(db, m.DocumentType, document_type_id, school.id)
    require_available(db, kind)
    if not kind.active: fail(422, 'Tipo de documento inativo.')
    if len(notes) > 4000: fail(422, 'Observação muito extensa.')
    maximum = settings().max_upload_mb * 1024 * 1024
    data = file.file.read(maximum + 1)
    if len(data) > maximum: fail(413, 'Arquivo acima do limite configurado.')
    mime = validate_upload(data, file.filename or '')
    stored = write_file(db, school.id, user.id, file.filename or 'documento', mime, data)
    doc = m.StudentDocument(school_id=school.id, student_id=student_id, document_type_id=kind.id, file_id=stored.id, expires_on=expires_on, notes=notes)
    db.add(doc); db.flush(); audit(db, request, user, 'document.received', doc, school.id, {'sha256': stored.sha256})
    return doc_output(db, doc)

@router.patch('/student-documents/{document_id}')
def review(document_id: str, data: s.DocumentReview, db: DB, user: Actor, school: Scope, request: Request):
    require(user, 'documents.validate'); lock_school(db, school.id)
    obj = scoped(db, m.StudentDocument, document_id, school.id); check_version(obj, data.version)
    if obj.status == 'waived': fail(409, 'A dispensa não pode ser convertida em arquivo validado.')
    if obj.status == 'archived': fail(409, 'Documento arquivado não aceita alteração.')
    before = output(obj)
    obj.status, obj.notes, obj.validated_by = data.status, data.notes, user.id
    obj.version += 1
    audit(db, request, user, 'document.reviewed', obj, school.id, {'before': before, 'after': output(obj)})
    db.flush(); return doc_output(db, obj)

@router.post('/students/{student_id}/document-waivers', status_code=201)
def waive(student_id: str, data: s.WaiverInput, db: DB, user: Actor, school: Scope, request: Request):
    require(user, 'documents.waive')
    lock_school(db, school.id)
    require_available(db, scoped(db, m.Student, student_id, school.id))
    require_available(db, scoped(db, m.DocumentType, data.document_type_id, school.id))
    obj = m.StudentDocument(school_id=school.id, student_id=student_id, document_type_id=data.document_type_id, status='waived', notes=data.reason, validated_by=user.id)
    db.add(obj); db.flush(); audit(db, request, user, 'document.waived', obj, school.id, {'reason': data.reason})
    return doc_output(db, obj)

@router.get('/files/{file_id}/download')
def download(file_id: str, db: DB, user: Actor, school: Scope, request: Request):
    require(user, 'documents.read')
    obj = scoped(db, m.FileRecord, file_id, school.id)
    if obj.file_kind == 'fiscal_xml':
        from .fiscal_signing import authorize_fiscal
        authorize_fiscal(user)
    try:
        data = read_bytes(obj)
    except (FileNotFoundError, KeyError):
        fail(404, 'Arquivo não disponível no armazenamento.')
    actual = hashlib.sha256(data).hexdigest()
    if actual != obj.sha256:
        fail(409, 'A verificação de integridade do arquivo falhou.')
    audit(db, request, user, 'file.downloaded', obj, school.id)
    filename = Path(obj.original_name.replace('\\', '/')).name.replace('"', '')
    return Response(
        content=data,
        media_type=obj.mime_type,
        headers={
            'Content-Disposition': f'attachment; filename="{filename}"',
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff',
        },
    )

PDF_TITLES = {'student_record':'Ficha cadastral do aluno', 'enrollment_receipt':'Comprovante de matrícula', 'enrollment_declaration':'Declaração de matrícula', 'enrollment_form':'Ficha de matrícula'}

def render_pdf(school_name, title, rows, note='', issuer='', db=None):
    """Somente identidade da escola em texto, logotipo, cores e tipografia.

    A renderização não regrava PDFs históricos emitidos, seus hashes ou snapshots.
    """
    from .school_reports import render
    return render(school_name, title, rows, note, issuer, db)

@router.post('/students/{student_id}/issued-documents', status_code=201)
def issue(student_id: str, data: s.IssueInput, db: DB, user: Actor, school: Scope, request: Request):
    require(user, 'documents.write')
    student = scoped(db, m.Student, student_id, school.id); person = scoped(db, m.Person, student.person_id, school.id)
    from .student_reports import compose_student_document
    content, snapshot = compose_student_document(db, school, student, person, data.enrollment_id, data.kind, user.name, PDF_TITLES[data.kind])
    stored = write_file(db, school.id, user.id, f'{data.kind}-{student.number}.pdf', 'application/pdf', content)
    obj = m.IssuedDocument(school_id=school.id, student_id=student.id, enrollment_id=data.enrollment_id, kind=data.kind, file_id=stored.id, snapshot=snapshot, created_by=user.id, template_version='3')
    db.add(obj); db.flush(); audit(db, request, user, 'document.issued', obj, school.id, {'sha256': stored.sha256, 'kind': data.kind})
    return {**output(obj, ('snapshot',)), 'file': output(stored, ('storage_key',))}
