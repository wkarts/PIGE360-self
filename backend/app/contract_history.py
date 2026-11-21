"""Acesso a vias substituídas, sem apagar originais nem cruzar escolas."""
from sqlalchemy import select

from . import models as m
from .contract_signatures import IssuedDocumentSignature, is_superseded
from .security import fail


def is_installation_owner(db, user):
    if user.role != 'admin':
        return False
    # Prova positiva do bootstrap original, nunca por ordem, e-mail ou papel isolado.
    install = db.get(m.Installation, 1)
    if not install or not install.configured:
        return False
    actors = db.scalars(select(m.AuditEvent.actor_id).where(
        m.AuditEvent.action == 'installation.configured').distinct().limit(2)).all()
    return actors == [user.id]


def _completed(db, issued):
    enrollment = db.get(m.Enrollment, issued.enrollment_id) if issued.enrollment_id else None
    if enrollment and enrollment.school_id == issued.school_id and enrollment.status not in {'draft', 'cancelled'}:
        return True
    if not enrollment:
        return False
    if db.scalar(select(m.EnrollmentEvent.id).where(
        m.EnrollmentEvent.school_id == issued.school_id,
        m.EnrollmentEvent.enrollment_id == enrollment.id,
        m.EnrollmentEvent.after['status'].as_string() == 'active').limit(1)):
        return True
    return bool(db.scalar(select(m.Admission.id).where(
        m.Admission.school_id == issued.school_id,
        m.Admission.enrollment_id == enrollment.id, m.Admission.status == 'enrolled').limit(1)))


def access_state(db, issued):
    superseded = is_superseded(db, issued)
    if issued.history_removed_at is not None:
        return {'superseded': True, 'downloadable': False}
    if not superseded:
        return {'superseded': False, 'downloadable': True}
    has_signature = bool(db.scalar(select(IssuedDocumentSignature.id).where(
        IssuedDocumentSignature.school_id == issued.school_id,
        IssuedDocumentSignature.issued_document_id == issued.id).limit(1)))
    return {'superseded': True, 'downloadable': has_signature}


def ensure_removable(db, issued):
    from .personal_signing import GovBRSignatureSession
    if not is_superseded(db, issued) or issued.signature_status != 'unsigned' or access_state(db, issued)['downloadable'] or _completed(db, issued):
        fail(409, 'Apenas vias substituídas sem assinatura e sem efetivação podem ser removidas.')
    if db.scalar(select(GovBRSignatureSession.id).where(
        GovBRSignatureSession.issued_document_id == issued.id).limit(1)):
        fail(409, 'A via possui um processo de assinatura vinculado.')
    # Qualquer vínculo adicional conhecido de arquivo conserva a via.
    file = issued.file_id
    for table in m.IssuedDocument.metadata.tables.values():
        for fk in table.foreign_keys:
            field = fk.parent
            if fk.target_fullname not in {'files.id', 'issued_documents.id'}:
                continue
            query = select(field).where(field == (file if fk.target_fullname == 'files.id' else issued.id))
            if table is m.IssuedDocument.__table__:
                query = query.where(table.c.id != issued.id)
            if db.scalar(query.limit(1)):
                fail(409, 'O contrato ou arquivo possui outro vínculo e deve ser preservado.')
