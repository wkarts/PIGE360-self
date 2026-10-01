"""Revisões imutáveis de contratos assinados e certificado A1 por escola."""

import base64
import hashlib
import io
import re
from datetime import UTC, datetime
from pathlib import Path

from cryptography import x509 as cryptography_x509
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.serialization import pkcs12
from fastapi import APIRouter, File, Form, Header, Request, UploadFile
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func, select
from sqlalchemy.orm import Mapped, mapped_column

from . import models as m
from .common import audit, output
from .config import settings
from .db import Base, Record, now
from .documents import validate_upload, write_file
from .integration_core import IntegrationFailure, seal, unseal
from .pdf_signing import InvalidPdfSignature, inspect_signatures, sign_pdf_pfx, trust_roots
from .security import Actor, DB, Scope, fail, lock_school, require, scoped
from .storage import read_bytes

router = APIRouter(prefix='/api/v1/schools/{school_id}', tags=['Assinaturas de contratos'])


class SchoolSigningCertificate(Record, m.Scoped, Base):
    __tablename__ = 'school_signing_certificates'
    encrypted_credentials: Mapped[str] = mapped_column(Text)
    certificate_sha256: Mapped[str] = mapped_column(String(64))
    subject: Mapped[str] = mapped_column(String(240))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    configured_by: Mapped[str] = mapped_column(ForeignKey('users.id'))
    __table_args__ = (UniqueConstraint('school_id', name='uq_school_signing_certificate_school'),)


class IssuedDocumentSignature(Record, m.Scoped, Base):
    __tablename__ = 'issued_document_signatures'
    issued_document_id: Mapped[str] = mapped_column(ForeignKey('issued_documents.id'), index=True)
    file_id: Mapped[str] = mapped_column(ForeignKey('files.id'))
    previous_sha256: Mapped[str] = mapped_column(String(64))
    sha256: Mapped[str] = mapped_column(String(64))
    source: Mapped[str] = mapped_column(String(24))  # company_a1 ou external_portal
    signature_count: Mapped[int] = mapped_column(Integer)
    trust_status: Mapped[str] = mapped_column(String(48))
    signer: Mapped[str] = mapped_column(String(240))
    certificate_sha256: Mapped[str] = mapped_column(String(64))
    idempotency_key: Mapped[str] = mapped_column(String(128))
    created_by: Mapped[str] = mapped_column(ForeignKey('users.id'))
    validated_by: Mapped[str | None] = mapped_column(ForeignKey('users.id'))
    validated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    signer_cpf: Mapped[str] = mapped_column(String(11), default='')
    validation_reference: Mapped[str] = mapped_column(String(120), default='')
    validation_evidence_file_id: Mapped[str | None] = mapped_column(ForeignKey('files.id'))
    rejection_reason: Mapped[str] = mapped_column(Text, default='')
    __table_args__ = (
        UniqueConstraint('issued_document_id', 'sha256', name='uq_issued_signature_pdf_hash'),
        UniqueConstraint('issued_document_id', 'idempotency_key', name='uq_issued_signature_operation'),
    )


def _digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _digits(value: str | None) -> str:
    return re.sub(r'\D', '', value or '')


def _certificate_identity(cert: cryptography_x509.Certificate, oid: str) -> str:
    """Extrai identidade do SAN ICP-Brasil; texto visual CN não é prova de CPF/CNPJ."""
    try:
        names = cert.extensions.get_extension_for_class(
            cryptography_x509.SubjectAlternativeName
        ).value.get_values_for_type(cryptography_x509.OtherName)
    except cryptography_x509.ExtensionNotFound:
        return ''
    for item in names:
        if item.type_id.dotted_string == oid:
            # O valor DER contém uma string ASN.1; usa apenas dígitos do conteúdo.
            from asn1crypto.core import Any
            raw = Any.load(item.value).native
            if isinstance(raw, bytes):
                raw = raw.decode('latin-1', errors='ignore')
            return _digits(str(raw))
    return ''


def _signer_cpf(cert: cryptography_x509.Certificate) -> str:
    """Lê CPF na posição ICP-Brasil do SAN, ou no DN serialNumber moderno."""
    identity = _certificate_identity(cert, '2.16.76.1.3.1')
    if len(identity) >= 19:
        return identity[8:19]
    values = cert.subject.get_attributes_for_oid(cryptography_x509.NameOID.SERIAL_NUMBER)
    if values:
        candidate = _digits(values[0].value)
        if len(candidate) == 11:
            return candidate
    return ''


def _roots():
    directory = settings().signature_trust_roots_dir
    try:
        return trust_roots(directory)
    except InvalidPdfSignature:
        fail(503, 'Âncoras de confiança da assinatura inválidas. Consulte o administrador.')


def _certificate(db, school_id):
    return db.scalar(select(SchoolSigningCertificate).where(SchoolSigningCertificate.school_id == school_id))


def _latest(db, issued):
    return db.scalar(select(IssuedDocumentSignature).where(
        IssuedDocumentSignature.school_id == issued.school_id,
        IssuedDocumentSignature.issued_document_id == issued.id,
    ).order_by(IssuedDocumentSignature.created_at.desc(), IssuedDocumentSignature.id.desc()).limit(1))


def _company_revision(db, issued):
    return db.scalar(select(IssuedDocumentSignature).where(
        IssuedDocumentSignature.school_id == issued.school_id,
        IssuedDocumentSignature.issued_document_id == issued.id,
        IssuedDocumentSignature.source == 'company_a1',
    ).limit(1))


def latest_signed_file(db, issued):
    row = _company_revision(db, issued) if issued.signature_status == 'rejected' else _latest(db, issued)
    return db.get(m.FileRecord, row.file_id) if row else db.get(m.FileRecord, issued.file_id)


def _read_verified(file_record):
    if not file_record:
        fail(404, 'PDF do contrato indisponível.')
    try:
        data = read_bytes(file_record)
    except (FileNotFoundError, KeyError):
        fail(404, 'PDF não localizado no armazenamento.')
    if _digest(data) != file_record.sha256:
        fail(409, 'A integridade do PDF armazenado falhou.')
    return data


def _store_revision(db, issued, pdf, actor_id, request, *, source, operation_key, signer_cpf=''):
    previous = _latest(db, issued)
    base = (_company_revision(db, issued) if source == 'external_portal' and
            issued.signature_status == 'rejected' else previous)
    parent = db.get(m.FileRecord, base.file_id if base else issued.file_id)
    original = _read_verified(parent)
    if not pdf.startswith(original) or len(pdf) <= len(original):
        fail(422, 'O PDF assinado não preserva a versão enviada pela escola.')
    validate_upload(pdf, 'contrato.pdf')
    try:
        result = inspect_signatures(pdf, roots=_roots())
    except InvalidPdfSignature as exc:
        fail(422, str(exc))
    required = (base.signature_count if base else 0) + 1
    if len(result['signatures']) != required:
        fail(422, 'Envie o PDF com exatamente uma nova assinatura, preservando as anteriores.')
    if previous:
        if source == 'company_a1':
            fail(409, 'O contrato já foi assinado pela escola.')
        if previous.source != 'company_a1' and issued.signature_status != 'rejected':
            fail(409, 'O contrato já recebeu assinatura externa.')
    elif source != 'company_a1':
        fail(409, 'A escola deve assinar o contrato antes do responsável.')
    signer = result['signatures'][-1]
    user = db.get(m.User, actor_id)
    file = write_file(db, issued.school_id, user.id if user else issued.created_by,
                      f'contrato-{issued.id}-assinado-{required}.pdf',
                      'application/pdf', pdf, file_kind='signed_contract')
    revision = IssuedDocumentSignature(
        school_id=issued.school_id, issued_document_id=issued.id, file_id=file.id,
        previous_sha256=parent.sha256, sha256=file.sha256, source=source,
        signature_count=required, trust_status=result['trust_status'],
        signer=signer['signer'], certificate_sha256=signer['certificate_sha256'],
        idempotency_key=operation_key, created_by=user.id if user else issued.created_by,
        signer_cpf=signer_cpf,
    )
    db.add(revision)
    issued.signature_status = 'company_signed' if source == 'company_a1' else 'pending_validation'
    issued.version += 1
    db.flush()
    if request is not None:
        audit(db, request, user, 'contract.signature_added', revision, issued.school_id,
              {'source': source, 'sha256': file.sha256,
               'portal_account_id': actor_id if not user else None,
               'trust_status': revision.trust_status})
    return revision


def auto_sign_issued_document(db, issued, actor_id, request):
    """Emite assinatura A1 antes de entregar o contrato ao responsável."""
    if _latest(db, issued):
        fail(409, 'O contrato já tem uma revisão assinada.')
    configured = _certificate(db, issued.school_id)
    if configured is None:
        fail(409, 'Configure o certificado A1 da escola antes de emitir este contrato.')
    try:
        secret = unseal(configured.encrypted_credentials)
        pfx = base64.b64decode(secret['pfx_base64'], validate=True)
        password = secret['password']
    except (IntegrationFailure, KeyError, ValueError, TypeError):
        fail(503, 'Certificado A1 indisponível. Faça sua rotação na configuração da escola.')
    expiry = configured.expires_at.replace(tzinfo=UTC) if configured.expires_at.tzinfo is None else configured.expires_at
    if expiry <= now():
        fail(409, 'O certificado A1 da escola expirou. Atualize-o antes da emissão.')
    source = _read_verified(db.get(m.FileRecord, issued.file_id))
    try:
        signed = sign_pdf_pfx(source, pfx, password, f'Escola_{issued.id.replace("-", "")[:16]}')
    except InvalidPdfSignature as exc:
        fail(409, f'Não foi possível assinar com A1: {exc}')
    return _store_revision(db, issued, signed, actor_id, request, source='company_a1',
                           operation_key=f'company:{issued.id}')


def submit_external_signature(db, issued, signed_pdf, actor_id, request,
                              expected_signer_cpf=None, idempotency_key=None):
    """Só aceita uma nova assinatura sobre os bytes exatos do PDF da escola."""
    document = scoped(db, m.IssuedDocument, issued.id, issued.school_id)
    if idempotency_key and not re.fullmatch(r'[A-Za-z0-9._:-]{8,128}', idempotency_key):
        fail(422, 'Chave de idempotência inválida.')
    digest = _digest(signed_pdf)
    existing = db.scalar(select(IssuedDocumentSignature).where(
        IssuedDocumentSignature.issued_document_id == document.id,
        IssuedDocumentSignature.sha256 == digest))
    if existing:
        if existing.id == getattr(_latest(db, document), 'id', None) and document.signature_status in {'pending_validation', 'verified'}:
            return existing
        fail(409, 'Esta via já está no histórico e não pode ser reenviada após rejeição.')
    if idempotency_key:
        reused = db.scalar(select(IssuedDocumentSignature).where(
            IssuedDocumentSignature.issued_document_id == document.id,
            IssuedDocumentSignature.idempotency_key == idempotency_key))
        if reused:
            fail(409, 'Esta chave de idempotência foi usada com outro PDF.')
    previous = _latest(db, document)
    if not previous or not _company_revision(db, document):
        fail(409, 'A escola deve assinar o PDF antes do responsável.')
    if previous.source != 'company_a1' and document.signature_status != 'rejected':
        fail(409, 'A assinatura enviada já está em análise ou validada.')
    if len(signed_pdf) > settings().max_upload_mb * 1024 * 1024:
        fail(413, 'PDF assinado acima do limite configurado.')
    # Identidade do signatário somente poderá liberar matrícula se constar do
    # próprio certificado e tiver sido conferida com o CPF do responsável.
    try:
        from pyhanko.pdf_utils.reader import PdfFileReader
        reader = PdfFileReader(io.BytesIO(signed_pdf))
        cert = reader.embedded_regular_signatures[-1].signer_cert
        cpf = _signer_cpf(cryptography_x509.load_der_x509_certificate(cert.dump()))
    except Exception:
        cpf = ''
    if expected_signer_cpf and cpf and _digits(expected_signer_cpf) != cpf:
        fail(422, 'CPF do certificado não corresponde ao responsável pela matrícula.')
    # Certificado sem CPF verificável exige comparação humana no VALIDAR/ITI.
    row = _store_revision(db, document, signed_pdf, actor_id, request,
                          source='external_portal', operation_key=idempotency_key or f'pdf:{digest}',
                          signer_cpf=cpf)
    return row


def verify_document_signatures(db, issued):
    file = latest_signed_file(db, issued)
    row = _company_revision(db, issued) if issued.signature_status == 'rejected' else _latest(db, issued)
    if not row:
        return {'file_id': issued.file_id, 'signature_valid': None,
                'cryptographic_valid': None, 'trust_status': 'unsigned', 'signatures': []}
    parent = _company_revision(db, issued) if row.source == 'external_portal' else None
    parent_file = db.get(m.FileRecord, parent.file_id if parent else issued.file_id)
    if not file or not parent_file or row.sha256 != file.sha256 or row.previous_sha256 != parent_file.sha256:
        return {'file_id': row.file_id, 'signature_valid': False,
                'cryptographic_valid': False, 'trust_status': 'revision_chain_invalid', 'signatures': []}
    try:
        source = _read_verified(parent_file)
        data = _read_verified(file)
    except Exception:
        return {'file_id': row.file_id, 'signature_valid': False,
                'cryptographic_valid': False, 'trust_status': 'revision_chain_invalid', 'signatures': []}
    if not data.startswith(source):
        return {'file_id': row.file_id, 'signature_valid': False,
                'cryptographic_valid': False, 'trust_status': 'revision_chain_invalid', 'signatures': []}
    try:
        result = inspect_signatures(data, roots=_roots())
    except InvalidPdfSignature:
        return {'file_id': file.id, 'signature_valid': False,
                'cryptographic_valid': False, 'trust_status': 'invalid', 'signatures': []}
    return {'file_id': file.id, 'signature_valid': True,
            'cryptographic_valid': True, 'trust_status': result['trust_status'],
            'revocation_checked': result['revocation_checked'],
            'signatures': result['signatures'], 'reviewed_by': row.validated_by}


def contract_signature_ready(db, issued, expected_signer_cpf) -> bool:
    """Gate da matrícula: PDF atual íntegro e conferência externa documentada."""
    row = _latest(db, issued)
    if (
        row is None or row.source != 'external_portal'
        or issued.signature_status != 'verified' or not row.validated_by
        or not row.validation_evidence_file_id
        or row.signer_cpf != _digits(expected_signer_cpf)
    ):
        return False
    try:
        proof = db.get(m.FileRecord, row.validation_evidence_file_id)
        _read_verified(proof)
        checked = verify_document_signatures(db, issued)
        return bool(checked['signature_valid'] and len(checked['signatures']) == row.signature_count == 2)
    except Exception:
        return False


@router.put('/signing-certificate/a1')
def configure_a1(db: DB, user: Actor, school: Scope, request: Request,
                 file: UploadFile = File(...), password: str = Form(...)):
    require(user, 'schools.manage')
    if user.role not in {'admin', 'direction'}:
        fail(403, 'Somente direção ou administração pode configurar o certificado.')
    if Path(file.filename or '').suffix.lower() not in {'.pfx', '.p12'}:
        fail(422, 'Envie um certificado A1 .pfx ou .p12.')
    pfx = file.file.read(1024 * 1024 + 1)
    if not pfx or len(pfx) > 1024 * 1024 or not password or len(password) > 256:
        fail(422, 'Certificado ou senha inválidos/acima do limite.')
    try:
        private_key, cert, _ = pkcs12.load_key_and_certificates(pfx, password.encode('utf-8'))
    except (ValueError, TypeError):
        fail(422, 'Certificado A1 inválido ou senha incorreta.')
    if private_key is None or cert is None or cert.not_valid_before_utc > now() or cert.not_valid_after_utc <= now():
        fail(422, 'Certificado A1 sem chave privada válida ou fora da vigência.')
    company = db.get(m.Company, school.company_id)
    school_cnpj = _digits(company.document if company else '')
    cert_cnpj = _certificate_identity(cert, '2.16.76.1.3.3')
    if len(cert_cnpj) != 14:
        fail(422, 'O A1 da mantenedora deve conter CNPJ ICP-Brasil no certificado.')
    if school_cnpj and cert_cnpj and school_cnpj != cert_cnpj:
        fail(422, 'CNPJ do certificado não corresponde à mantenedora.')
    roots = _roots()
    if not roots:
        fail(503, 'Instale as âncoras de confiança oficiais da ICP-Brasil antes de configurar o A1.')
    from reportlab.pdfgen import canvas
    probe = io.BytesIO()
    page = canvas.Canvas(probe)
    page.drawString(30, 800, 'Teste de certificado para assinatura escolar')
    page.save()
    try:
        signed_probe = sign_pdf_pfx(probe.getvalue(), pfx, password, 'TesteCertificado')
        verified_probe = inspect_signatures(signed_probe, roots=roots)
    except InvalidPdfSignature as exc:
        fail(422, f'Certificado não verificável: {exc}')
    if not verified_probe['chain_trusted']:
        fail(422, 'O certificado não pertence à cadeia de confiança configurada.')
    lock_school(db, school.id)
    row = _certificate(db, school.id)
    if row is None:
        row = SchoolSigningCertificate(school_id=school.id, configured_by=user.id)
        db.add(row)
    row.encrypted_credentials = seal({'pfx_base64': base64.b64encode(pfx).decode('ascii'), 'password': password})
    row.certificate_sha256 = cert.fingerprint(hashes.SHA256()).hex()
    row.subject = cert.subject.rfc4514_string()[:240]
    row.expires_at = cert.not_valid_after_utc
    row.configured_by = user.id
    if row.id is not None:
        row.version += 1
    db.flush()
    audit(db, request, user, 'signing_certificate.rotated', row, school.id,
          {'fingerprint': row.certificate_sha256, 'expires_at': row.expires_at.isoformat()})
    return output(row, ('encrypted_credentials',))


@router.get('/signing-certificate/a1')
def signing_certificate(db: DB, user: Actor, school: Scope):
    require(user, 'schools.manage')
    row = _certificate(db, school.id)
    return {'configured': row is not None,
            'certificate': output(row, ('encrypted_credentials',)) if row else None}


@router.delete('/signing-certificate/a1')
def disable_a1(db: DB, user: Actor, school: Scope, request: Request):
    require(user, 'schools.manage')
    if user.role not in {'admin', 'direction'}:
        fail(403, 'Somente direção ou administração pode desativar o certificado.')
    lock_school(db, school.id)
    row = _certificate(db, school.id)
    if row is None:
        return {'configured': False}
    audit(db, request, user, 'signing_certificate.disabled', row, school.id,
          {'fingerprint': row.certificate_sha256})
    db.delete(row)
    db.flush()
    return {'configured': False}


@router.get('/issued-documents/signatures/pending')
def pending_signatures(db: DB, user: Actor, school: Scope,
                       limit: int = 30, offset: int = 0):
    require(user, 'documents.validate')
    if not 1 <= limit <= 100 or not 0 <= offset <= 10000:
        fail(422, 'Paginação inválida.')
    filters = (m.IssuedDocument.school_id == school.id,
               m.IssuedDocument.signature_status == 'pending_validation')
    total = db.scalar(select(func.count()).select_from(m.IssuedDocument).where(*filters))
    rows = db.execute(select(m.IssuedDocument, m.Person.name).join(
        m.Student, m.Student.id == m.IssuedDocument.student_id
    ).join(m.Person, m.Person.id == m.Student.person_id).where(*filters).order_by(
        m.IssuedDocument.created_at.desc(), m.IssuedDocument.id.desc()
    ).limit(limit).offset(offset)).all()
    return {'items': [{
        'document_id': doc.id, 'student_id': doc.student_id, 'student_name': name,
        'enrollment_id': doc.enrollment_id, 'kind': doc.kind,
        'signature_status': doc.signature_status,
        'file_id': _latest(db, doc).file_id,
        'created_at': doc.created_at.isoformat(),
    } for doc, name in rows], 'total': total, 'limit': limit, 'offset': offset}


@router.get('/issued-documents/signatures/unsigned')
def unsigned_documents(db: DB, user: Actor, school: Scope, limit: int = 30, offset: int = 0):
    require(user, 'documents.read')
    if not 1 <= limit <= 100 or not 0 <= offset <= 10000:
        fail(422, 'Paginação inválida.')
    filters = (m.IssuedDocument.school_id == school.id,
               m.IssuedDocument.signature_status == 'unsigned')
    total = db.scalar(select(func.count()).select_from(m.IssuedDocument).where(*filters))
    rows = db.execute(select(m.IssuedDocument, m.Person.name).join(
        m.Student, m.Student.id == m.IssuedDocument.student_id).join(
        m.Person, m.Person.id == m.Student.person_id).where(*filters).order_by(
        m.IssuedDocument.created_at.desc(), m.IssuedDocument.id.desc()).limit(limit).offset(offset)).all()
    return {'items': [{'document_id': doc.id, 'student_name': name, 'kind': doc.kind,
                      'enrollment_id': doc.enrollment_id, 'student_id': doc.student_id,
                      'file_id': doc.file_id, 'signature_status': doc.signature_status,
                      'created_at': doc.created_at.isoformat()} for doc, name in rows],
            'total': total, 'limit': limit, 'offset': offset}


@router.post('/issued-documents/{document_id}/sign/a1')
def sign_school_document(document_id: str, db: DB, user: Actor, school: Scope, request: Request):
    require(user, 'documents.generate')
    if user.role not in {'admin', 'direction'}:
        fail(403, 'Somente direção ou administração pode assinar em nome da escola.')
    lock_school(db, school.id)
    issued = scoped(db, m.IssuedDocument, document_id, school.id)
    previous = _company_revision(db, issued)
    if previous:
        return {'document_id': issued.id, 'signature_status': issued.signature_status,
                'file_id': latest_signed_file(db, issued).id}
    revision = auto_sign_issued_document(db, issued, user.id, request)
    return {'document_id': issued.id, 'signature_status': issued.signature_status,
            'file_id': revision.file_id}


@router.get('/issued-documents/{document_id}/signatures')
def signatures(document_id: str, db: DB, user: Actor, school: Scope):
    require(user, 'documents.read')
    issued = scoped(db, m.IssuedDocument, document_id, school.id)
    current = verify_document_signatures(db, issued)
    revisions = db.scalars(select(IssuedDocumentSignature).where(
        IssuedDocumentSignature.school_id == school.id,
        IssuedDocumentSignature.issued_document_id == issued.id,
    ).order_by(IssuedDocumentSignature.created_at, IssuedDocumentSignature.id)).all()
    return {'document_id': issued.id, 'status': issued.signature_status, **current,
            'revisions': [output(row) for row in revisions]}


@router.post('/issued-documents/{document_id}/signed-external', status_code=201)
def upload_signed_external(document_id: str, db: DB, user: Actor, school: Scope,
                           request: Request, file: UploadFile = File(...),
                           idempotency_key: str | None = Header(None, alias='Idempotency-Key')):
    require(user, 'documents.validate')
    lock_school(db, school.id)
    issued = scoped(db, m.IssuedDocument, document_id, school.id)
    data = file.file.read(settings().max_upload_mb * 1024 * 1024 + 1)
    if len(data) > settings().max_upload_mb * 1024 * 1024:
        fail(413, 'PDF acima do limite.')
    validate_upload(data, file.filename or '')
    row = submit_external_signature(db, issued, data, user.id, request,
                                    idempotency_key=idempotency_key)
    return {'document_id': issued.id, 'revision': output(row),
            'verification': verify_document_signatures(db, issued)}


@router.post('/issued-documents/{document_id}/validate-signature')
def validate_external_signature(document_id: str, db: DB, user: Actor, school: Scope,
                                request: Request, signer_cpf: str = Form(...),
                                validation_reference: str = Form(...),
                                report: UploadFile = File(...)):
    """Registra a conferência humana no VALIDAR/ITI, ligada ao PDF exato."""
    require(user, 'documents.validate')
    if user.role not in {'admin', 'direction'}:
        fail(403, 'A validação final exige direção ou administração.')
    lock_school(db, school.id)
    issued = scoped(db, m.IssuedDocument, document_id, school.id)
    row = _latest(db, issued)
    if issued.signature_status != 'pending_validation' or not row or row.source != 'external_portal':
        fail(409, 'Somente uma assinatura pendente pode ser validada. Solicite novo envio se ela foi devolvida.')
    cpf = _digits(signer_cpf)
    if len(cpf) != 11 or not re.fullmatch(r'[A-Za-z0-9._/-]{6,120}', validation_reference):
        fail(422, 'Informe CPF do responsável e referência do relatório de validação.')
    if row.signer_cpf and row.signer_cpf != cpf:
        fail(422, 'O CPF informado difere do CPF presente no certificado.')
    if not verify_document_signatures(db, issued)['cryptographic_valid']:
        fail(422, 'O PDF assinado não passou na validação criptográfica.')
    report_bytes = report.file.read(settings().max_upload_mb * 1024 * 1024 + 1)
    if len(report_bytes) > settings().max_upload_mb * 1024 * 1024:
        fail(413, 'Relatório de validação acima do limite.')
    validate_upload(report_bytes, report.filename or '')
    if Path(report.filename or '').suffix.lower() != '.pdf':
        fail(422, 'Anexe o relatório PDF do VALIDAR/ITI.')
    if row.validated_at:
        fail(409, 'Assinatura já conferida. O histórico não pode ser sobrescrito.')
    proof = write_file(db, school.id, user.id, f'validar-{document_id}.pdf',
                       'application/pdf', report_bytes, file_kind='signature_proof')
    row.signer_cpf, row.validation_reference = cpf, validation_reference
    row.validation_evidence_file_id = proof.id
    row.validated_by, row.validated_at = user.id, now()
    issued.signature_status = 'verified'
    issued.version += 1
    db.flush()
    audit(db, request, user, 'contract.signature_validated', row, school.id,
          {'pdf_sha256': row.sha256, 'proof_sha256': proof.sha256,
           'validation_reference': validation_reference})
    return {'document_id': issued.id, 'signature_status': issued.signature_status,
            'pdf_sha256': row.sha256, 'proof_sha256': proof.sha256,
            'validated_at': row.validated_at.isoformat()}


@router.post('/issued-documents/{document_id}/reject-signature')
def reject_external_signature(document_id: str, db: DB, user: Actor, school: Scope,
                              request: Request, reason: str = Form(...)):
    require(user, 'documents.validate')
    if user.role not in {'admin', 'direction'}:
        fail(403, 'A rejeição final exige direção ou administração.')
    if len(reason.strip()) < 10 or len(reason) > 2000:
        fail(422, 'Informe motivo entre 10 e 2000 caracteres.')
    lock_school(db, school.id)
    issued = scoped(db, m.IssuedDocument, document_id, school.id)
    revision = _latest(db, issued)
    if issued.signature_status != 'pending_validation' or not revision or revision.source != 'external_portal':
        fail(409, 'Não há assinatura externa pendente para rejeitar.')
    revision.rejection_reason = reason.strip()
    issued.signature_status = 'rejected'
    issued.version += 1
    db.flush()
    audit(db, request, user, 'contract.signature_rejected', revision, school.id,
          {'pdf_sha256': revision.sha256, 'reason': revision.rejection_reason})
    return {'document_id': issued.id, 'signature_status': 'rejected',
            'download_file_id': _company_revision(db, issued).file_id}
