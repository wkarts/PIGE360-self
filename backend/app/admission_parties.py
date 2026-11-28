"""Titular declarante identificado na aprovação e pagador da matrícula."""
from sqlalchemy import select
from . import models as m


def signer(db, admission, enrollment):
    snapshot = admission.guardian_snapshot or {}
    ident = snapshot.get('signer_person_id')
    if not ident:
        return db.get(m.Person, enrollment.financial_person_id) if enrollment.financial_person_id else None
    person = db.scalar(select(m.Person).join(m.GuardianLink, m.GuardianLink.person_id == m.Person.id).where(
        m.Person.id == ident, m.Person.school_id == enrollment.school_id, m.Person.active.is_(True),
        m.GuardianLink.school_id == enrollment.school_id, m.GuardianLink.student_id == enrollment.student_id,
        m.GuardianLink.legal.is_(True), m.GuardianLink.active.is_(True)))
    return person if person and snapshot.get('cpf') and person.cpf == snapshot['cpf'] else None
