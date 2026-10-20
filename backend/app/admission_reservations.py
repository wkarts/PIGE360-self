"""Vagas aprovadas: prazo financeiro independente da conferência documental.

Todas as mutações devem manter lock_school até o commit. Leituras descontam
reservas vencidas imediatamente, sem depender da disponibilidade do worker.
"""
from datetime import timedelta
from sqlalchemy import and_, func, or_, select
from . import models as m
from .db import now
from .security import fail, utc


def state(admission):
    if (admission.reservation_status == 'held' and admission.reserved_until
            and utc(admission.reserved_until) <= now()):
        return 'expired'
    return admission.reservation_status


def reserved_count(db, class_id, exclude_enrollment_id=None):
    query = select(func.count()).select_from(m.Admission).join(
        m.Enrollment, m.Enrollment.id == m.Admission.enrollment_id).where(
        m.Admission.class_group_id == class_id, m.Admission.status == 'approved',
        m.Enrollment.status.in_(['draft','cancelled']),
        or_(m.Admission.reservation_status == 'paid', and_(
            m.Admission.reservation_status == 'held', m.Admission.reserved_until > now())))
    if exclude_enrollment_id:
        query = query.where(m.Admission.enrollment_id != exclude_enrollment_id)
    return db.scalar(query) or 0


def required_charges(db, admission):
    return list(db.scalars(select(m.BankCharge).where(
        m.BankCharge.school_id == admission.school_id,
        or_(m.BankCharge.admission_id == admission.id,
            *([m.BankCharge.enrollment_id == admission.enrollment_id] if admission.enrollment_id else [])),
        m.BankCharge.required_for_enrollment.is_(True), m.BankCharge.status != 'cancelled')))


def received(charge):
    return bool(charge.status == 'received' or (
        charge.collection_mode == 'manual' and charge.status == 'received_external'
        and charge.manual_paid_on and charge.manual_paid_amount == charge.amount
        and charge.manual_received_by))


def start(db, admission, campaign, *, reviewed=False):
    """A aprovação reserva antes da cobrança; renovação exige revisão explícita."""
    if not campaign.require_payment_before_enrollment:
        return
    if not campaign.payment_reservation_hours:
        fail(409, 'Defina no processo o prazo de reserva para pagamento antes de aprovar.')
    charges = required_charges(db, admission)
    paid = bool(charges) and all(received(c) for c in charges)
    admission.reserved_until = now() + timedelta(hours=campaign.payment_reservation_hours)
    admission.reservation_status = 'paid' if paid else 'held'
    admission.reservation_paid_at = now() if paid else None


def payment_changed(db, charge):
    if not charge.required_for_enrollment:
        return
    admission = db.scalar(select(m.Admission).where(
        m.Admission.school_id == charge.school_id,
        or_(*([m.Admission.id == charge.admission_id] if charge.admission_id else []),
            *([m.Admission.enrollment_id == charge.enrollment_id] if charge.enrollment_id else [])))) if (charge.admission_id or charge.enrollment_id) else None
    if not admission or admission.status != 'approved' or admission.reservation_status == 'none':
        return
    db.flush()
    charges = required_charges(db, admission)
    paid = bool(charges) and all(received(c) for c in charges)
    # Recebimento observado após liberar a vaga nunca recupera a vaga sozinho.
    # Até pagamento retroativo comprovado passa pela análise da Secretaria.
    if paid and state(admission) == 'held':
        admission.reservation_status = 'paid'
        admission.reservation_paid_at = now()
        admission.version += 1
    elif (paid and state(admission) == 'expired') or (not paid and state(admission) == 'paid'):
        admission.reservation_status = 'review'
        admission.version += 1


def gate(db, enrollment_id):
    admission = db.scalar(select(m.Admission).where(m.Admission.enrollment_id == enrollment_id))
    if admission and admission.status=='approved' and state(admission) in {'expired', 'review', 'released'}:
        fail(409, 'Reserva vencida ou pagamento em análise. A Secretaria deve conferir as vagas e renovar a reserva explicitamente.')
