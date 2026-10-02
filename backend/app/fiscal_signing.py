"""Documentos XML assinados, isolados por escola e sem emissão fiscal implícita."""
import base64
import hashlib
from pathlib import Path

from fastapi import APIRouter, File, Form, Request, UploadFile
from sqlalchemy import ForeignKey, String, UniqueConstraint, func, select
from sqlalchemy.orm import Mapped, mapped_column

from . import models as m
from .common import audit, output
from .contract_signatures import _certificate, _digits, _roots
from .db import Base, Record
from .documents import write_file
from .fiscal_xml import InvalidFiscalXML, LIMIT, PROFILES, sign_fiscal_xml, verify_fiscal_xml
from .integration_core import IntegrationFailure, unseal
from .security import Actor, DB, Scope, fail, lock_school, require

router = APIRouter(prefix='/api/v1/schools/{school_id}', tags=['Documentos fiscais'])


class SignedFiscalDocument(Record, m.Scoped, Base):
    __tablename__ = 'signed_fiscal_documents'
    profile: Mapped[str] = mapped_column(String(32))
    original_sha256: Mapped[str] = mapped_column(String(64))
    signed_sha256: Mapped[str] = mapped_column(String(64))
    certificate_sha256: Mapped[str] = mapped_column(String(64))
    original_file_id: Mapped[str] = mapped_column(ForeignKey('files.id'))
    signed_file_id: Mapped[str] = mapped_column(ForeignKey('files.id'))
    created_by: Mapped[str] = mapped_column(ForeignKey('users.id'))
    __table_args__ = (UniqueConstraint('school_id', 'profile', 'original_sha256', 'certificate_sha256', name='uq_fiscal_signature_source'),)


def authorize_fiscal(user):
    require(user, 'schools.manage')
    if user.role not in {'admin', 'direction'}:
        fail(403, 'Somente direção ou administração pode assinar documentos fiscais.')


def fiscal_output(row):
    return {**output(row), 'profile_label': PROFILES[row.profile]['label'],
            'authorization_status': 'not_submitted', 'cryptographic_valid': True,
            'revocation_checked': False, 'schema_validation': 'signing_profile_only'}


@router.get('/fiscal-signatures')
def list_signatures(db: DB, user: Actor, school: Scope, limit: int = 20, offset: int = 0):
    authorize_fiscal(user)
    if not 1 <= limit <= 100 or not 0 <= offset <= 10000:
        fail(422, 'Paginação inválida.')
    where = SignedFiscalDocument.school_id == school.id
    rows = db.scalars(select(SignedFiscalDocument).where(where).order_by(
        SignedFiscalDocument.created_at.desc(), SignedFiscalDocument.id.desc()).limit(limit).offset(offset))
    return {'items': [fiscal_output(row) for row in rows],
            'total': db.scalar(select(func.count()).select_from(SignedFiscalDocument).where(where)),
            'profiles': [{'id': key, 'label': value['label']} for key, value in PROFILES.items()]}


@router.post('/fiscal-signatures', status_code=201)
def sign_xml(db: DB, user: Actor, school: Scope, request: Request,
             profile: str = Form(...), file: UploadFile = File(...), consent: bool = Form(False)):
    authorize_fiscal(user)
    if not consent:
        fail(422, 'Confirme a assinatura do XML fiscal com o certificado da mantenedora.')
    if profile not in PROFILES or Path(file.filename or '').suffix.lower() != '.xml':
        fail(422, 'Selecione um XML e um perfil fiscal suportado.')
    try:
        source = file.file.read(LIMIT + 1)
    finally:
        file.file.close()
    if not source or len(source) > LIMIT:
        fail(422, 'Envie um XML de até 2 MB.')
    lock_school(db, school.id)
    certificate = _certificate(db, school.id)
    if certificate is None:
        fail(409, 'Cadastre o certificado A1 da mantenedora antes de assinar.')
    company = db.get(m.Company, school.company_id)
    issuer = _digits(company.document if company else '')
    if len(issuer) != 14:
        fail(409, 'Preencha o CNPJ da mantenedora antes de assinar documentos fiscais.')
    try:
        secret = unseal(certificate.encrypted_credentials)
        signed = sign_fiscal_xml(source, profile, base64.b64decode(secret['pfx_base64'], validate=True),
                                 secret['password'], issuer_cnpj=issuer, roots=_roots())
        verify_fiscal_xml(signed, profile, expected_certificate_sha256=certificate.certificate_sha256)
    except InvalidFiscalXML as exc:
        fail(422, str(exc))
    except (IntegrationFailure, ValueError, TypeError, KeyError):
        fail(503, 'Certificado indisponível. Atualize o A1 cadastrado.')
    finally:
        secret = None
    digest = hashlib.sha256(source).hexdigest()
    existing = db.scalar(select(SignedFiscalDocument).where(
        SignedFiscalDocument.school_id == school.id, SignedFiscalDocument.profile == profile,
        SignedFiscalDocument.original_sha256 == digest,
        SignedFiscalDocument.certificate_sha256 == certificate.certificate_sha256))
    if existing:
        return fiscal_output(existing)
    original_file = write_file(db, school.id, user.id, f'{profile}-{digest[:16]}-original.xml',
                               'application/xml', source, file_kind='fiscal_xml')
    signed_file = write_file(db, school.id, user.id, f'{profile}-{digest[:16]}-assinado.xml',
                             'application/xml', signed, file_kind='fiscal_xml')
    row = SignedFiscalDocument(school_id=school.id, profile=profile, original_sha256=digest,
        signed_sha256=signed_file.sha256, certificate_sha256=certificate.certificate_sha256,
        original_file_id=original_file.id, signed_file_id=signed_file.id, created_by=user.id)
    db.add(row)
    db.flush()
    audit(db, request, user, 'fiscal_document.signed', row, school.id,
          {'profile': profile, 'source_sha256': digest, 'signed_sha256': row.signed_sha256,
           'certificate_sha256': row.certificate_sha256, 'authorization_status': 'not_submitted'})
    return fiscal_output(row)
