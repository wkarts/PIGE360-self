import hashlib
import io
import os
from datetime import date
from pathlib import Path
from xml.sax.saxutils import escape
from fastapi import APIRouter, File, Form, Request, UploadFile
from fastapi.responses import FileResponse
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
from .common import audit, output
from .security import Actor, DB, Scope, check_version, fail, lock_school, require, scoped

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

def write_file(db, school_id, user_id, name, mime, data):
    root = settings().storage_path.resolve()
    key = f'{school_id}/{uid()}'
    path = (root / key).resolve()
    if not path.is_relative_to(root):
        fail(400, 'Caminho de armazenamento inválido.')
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix('.part')
    try:
        with open(temporary, 'xb') as handle:
            handle.write(data); handle.flush(); os.fsync(handle.fileno())
        temporary.chmod(0o600)
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)
    db.info.setdefault('new_files', []).append(path)
    obj = m.FileRecord(school_id=school_id, original_name=Path(name.replace('\\', '/')).name[:240], storage_key=key,
                       mime_type=mime, size=len(data), sha256=hashlib.sha256(data).hexdigest(), created_by=user_id)
    db.add(obj); db.flush()
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
    return {**output(doc), 'type_name': kind.name, 'file': output(file, ('storage_key',)) if file else None,
            'effective_status': 'expired' if doc.expires_on and doc.expires_on < date.today() else doc.status}

@router.get('/students/{student_id}/documents')
def documents(student_id: str, db: DB, user: Actor, school: Scope):
    scoped(db, m.Student, student_id, school.id)
    enrollment = db.scalar(select(m.Enrollment).where(m.Enrollment.student_id == student_id, m.Enrollment.school_id == school.id).order_by(m.Enrollment.created_at.desc()).limit(1))
    grade_id = db.get(m.ClassGroup, enrollment.class_group_id).grade_id if enrollment else None
    docs = [doc_output(db, doc) for doc in db.scalars(select(m.StudentDocument).where(m.StudentDocument.student_id == student_id, m.StudentDocument.school_id == school.id).order_by(m.StudentDocument.created_at.desc()))]
    issued = [output(x) for x in db.scalars(select(m.IssuedDocument).where(m.IssuedDocument.student_id == student_id, m.IssuedDocument.school_id == school.id).order_by(m.IssuedDocument.created_at.desc()))]
    return {'items': docs, 'checklist': checklist(db, school.id, student_id, grade_id), 'issued': issued}

@router.post('/students/{student_id}/documents', status_code=201)
def upload(student_id: str, db: DB, user: Actor, school: Scope, request: Request, document_type_id: str = Form(...), expires_on: date | None = Form(None), notes: str = Form(''), file: UploadFile = File(...)):
    require(user, 'documents.write')
    scoped(db, m.Student, student_id, school.id)
    kind = scoped(db, m.DocumentType, document_type_id, school.id)
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
    scoped(db, m.Student, student_id, school.id); scoped(db, m.DocumentType, data.document_type_id, school.id)
    obj = m.StudentDocument(school_id=school.id, student_id=student_id, document_type_id=data.document_type_id, status='waived', notes=data.reason, validated_by=user.id)
    db.add(obj); db.flush(); audit(db, request, user, 'document.waived', obj, school.id, {'reason': data.reason})
    return doc_output(db, obj)

@router.get('/files/{file_id}/download')
def download(file_id: str, db: DB, user: Actor, school: Scope, request: Request):
    obj = scoped(db, m.FileRecord, file_id, school.id)
    root = settings().storage_path.resolve(); path = (root / obj.storage_key).resolve()
    if not path.is_relative_to(root) or not path.is_file():
        fail(404, 'Arquivo não disponível no armazenamento.')
    with path.open('rb') as handle:
        actual = hashlib.file_digest(handle, 'sha256').hexdigest()
    if actual != obj.sha256: fail(409, 'A verificação de integridade do arquivo falhou.')
    audit(db, request, user, 'file.downloaded', obj, school.id)
    return FileResponse(path, media_type=obj.mime_type, filename=obj.original_name, headers={'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff'})

PDF_TITLES = {'student_record':'Ficha cadastral do aluno', 'enrollment_receipt':'Comprovante de matrícula', 'enrollment_declaration':'Declaração de matrícula', 'enrollment_form':'Ficha de matrícula'}

def render_pdf(school_name, title, rows, note='', issuer=''):
    stream = io.BytesIO(); styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='School', fontName='Helvetica-Bold', fontSize=16, leading=21, spaceAfter=8, textColor=colors.HexColor('#006D77')))
    styles.add(ParagraphStyle(name='Caption', fontName='Helvetica', fontSize=9, leading=13, textColor=colors.HexColor('#475569')))
    styles['BodyText'].leading = 14
    doc = SimpleDocTemplate(stream, pagesize=A4, rightMargin=20*mm, leftMargin=20*mm, topMargin=38*mm, bottomMargin=24*mm, title=title, author=school_name)
    parts = [Paragraph(escape(school_name), styles['School']), Paragraph(escape(title), styles['Heading1']), Spacer(1, 5*mm)]
    table_rows = [[Paragraph(escape(str(k)), styles['Caption']), Paragraph(escape(str(v or '-')), styles['BodyText'])] for k,v in rows]
    if table_rows:
        table = Table(table_rows, colWidths=[49*mm, 121*mm], hAlign='LEFT', splitInRow=1)
        table.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LINEBELOW',(0,0),(-1,-1),0.4,colors.HexColor('#e2e8f0')),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7)]))
        parts.append(table)
    if note: parts.extend([Spacer(1, 6*mm), Paragraph(escape(note), styles['BodyText'])])
    if issuer: parts.extend([Spacer(1, 5*mm), Paragraph('Operador responsável: '+escape(issuer), styles['Caption'])])
    parts.append(KeepTogether([Spacer(1, 8*mm), Paragraph('________________________________________', styles['BodyText']), Paragraph('Secretaria / representante da instituição', styles['Caption']), Spacer(1, 5*mm), Paragraph('Documento gerado eletronicamente. Não contém assinatura digital.', styles['Caption'])]))
    def footer(canvas, document):
        canvas.saveState()
        logo = settings().frontend_path / 'branding/pige360/logo-horizontal.png'
        if logo.is_file():
            canvas.drawImage(str(logo), 20*mm, A4[1]-27*mm, width=55*mm, height=17*mm, preserveAspectRatio=True, mask='auto')
        canvas.setFont('Helvetica-Bold', 8)
        canvas.setFillColor(colors.HexColor('#006D77'))
        canvas.drawRightString(A4[0]-20*mm, A4[1]-18*mm, 'SECRETARIA ESCOLAR')
        canvas.setStrokeColor(colors.HexColor('#14B8A6'))
        canvas.line(20*mm, A4[1]-31*mm, A4[0]-20*mm, A4[1]-31*mm)
        canvas.setFont('Helvetica', 8); canvas.setFillColor(colors.HexColor('#6B7280'))
        canvas.drawString(20*mm, 15*mm, f'Emitido em {now().strftime("%d/%m/%Y %H:%M UTC")} | Página {document.page}')
        canvas.restoreState()
    doc.build(parts, onFirstPage=footer, onLaterPages=footer)
    return stream.getvalue()

@router.post('/students/{student_id}/issued-documents', status_code=201)
def issue(student_id: str, data: s.IssueInput, db: DB, user: Actor, school: Scope, request: Request):
    require(user, 'documents.write')
    student = scoped(db, m.Student, student_id, school.id); person = db.get(m.Person, student.person_id)
    rows = [('Aluno', person.name), ('Número do aluno', student.number), ('Data de nascimento', person.birth_date.strftime('%d/%m/%Y'))]
    snapshot = {'school': output(school), 'person': output(person), 'student': output(student), 'issuer': user.name, 'template_version':'2', 'brand':'PIGE360'}
    if data.enrollment_id:
        selected_enrollment = scoped(db, m.Enrollment, data.enrollment_id, school.id)
        if selected_enrollment.student_id != student.id: fail(422, 'A matrícula pertence a outro aluno.')
    note = ''
    if data.kind != 'student_record':
        if not data.enrollment_id: fail(422, 'Selecione a matrícula para emitir este documento.')
        enrollment = scoped(db, m.Enrollment, data.enrollment_id, school.id)
        if enrollment.student_id != student.id: fail(422, 'A matrícula pertence a outro aluno.')
        if data.kind != 'enrollment_form' and enrollment.status != 'active': fail(409, 'Comprovantes e declarações exigem matrícula ativa.')
        group = db.get(m.ClassGroup, enrollment.class_group_id)
        year = db.get(m.AcademicYear, enrollment.academic_year_id)
        grade = db.get(m.Grade, group.grade_id); shift = db.get(m.Shift, group.shift_id); unit = db.get(m.Unit, group.unit_id)
        rows += [('Matrícula', enrollment.number), ('Ano letivo', year.name), ('Série / etapa', grade.name), ('Turma', group.name), ('Turno', shift.name), ('Unidade', unit.name), ('Data da matrícula', enrollment.enrolled_on.strftime('%d/%m/%Y'))]
        if data.kind == 'enrollment_form':
            labels = {'draft':'Pré-matrícula / rascunho', 'active':'Ativa', 'suspended':'Suspensa', 'transferred':'Transferida', 'cancelled':'Cancelada', 'completed':'Concluída'}
            rows += [('Situação', labels[enrollment.status]), ('Observações', enrollment.notes)]
            note = 'Ficha administrativa. A situação acima deve ser observada; este documento não substitui a declaração de matrícula ativa.'
        snapshot.update({'enrollment': output(enrollment), 'class_group': output(group), 'year': output(year), 'grade': output(grade), 'shift': output(shift), 'unit': output(unit)})
        if data.kind == 'enrollment_declaration':
            note = f'Declaramos que {person.name} possui matrícula ativa nesta instituição no período letivo {year.name}, conforme os dados acima registrados.'
    else:
        rows += [('CPF', ('***.' + person.cpf[3:6] + '.' + person.cpf[6:9] + '-**') if person.cpf else 'Não informado'), ('Contato', person.phone), ('Endereço', person.address), ('Escola anterior', student.previous_school)]
    content = render_pdf(school.name, PDF_TITLES[data.kind], rows, note, user.name)
    stored = write_file(db, school.id, user.id, f'{data.kind}-{student.number}.pdf', 'application/pdf', content)
    obj = m.IssuedDocument(school_id=school.id, student_id=student.id, enrollment_id=data.enrollment_id, kind=data.kind, file_id=stored.id, snapshot=snapshot, created_by=user.id, template_version='2')
    db.add(obj); db.flush(); audit(db, request, user, 'document.issued', obj, school.id, {'sha256': stored.sha256, 'kind': data.kind})
    return {**output(obj, ('snapshot',)), 'file': output(stored, ('storage_key',))}
