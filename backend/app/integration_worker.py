"""Fila persistente: efeitos remotos incertos nunca são repetidos automaticamente.

Um advisory lock de sessão serializa os jobs de cada escola no PostgreSQL,
mesmo entre commits de checkpoints. SQLite destina-se somente aos testes.
"""
import argparse
import base64
import hashlib
import hmac
import io
import json
import logging
import smtplib
import ssl
import time
from datetime import datetime, timedelta
from email.message import EmailMessage
from pathlib import Path
from sqlalchemy import select, text
from sqlalchemy.orm import Session
from PIL import Image
from . import models as m
from .db import engine, now
from .config import settings
from .security import utc
from .integration_core import AsaasProvider, ConnectProvider, IntegrationFailure, unseal, enqueue
from .banking import apply_remote

LOG = logging.getLogger('pige360.worker')
HEARTBEAT = Path('/tmp/pige360-worker-heartbeat')
SAFE_KINDS = {'bank_sync'}

def refresh_pix(db, charge, provider):
    if charge.billing_type != 'PIX' or charge.status not in ('pending', 'overdue'):
        return
    result = provider.pix(charge.remote_payment_id)
    payload, encoded = result.get('payload', ''), result.get('encodedImage', '')
    if not isinstance(payload, str) or len(payload) > 15000 or not isinstance(encoded, str) or len(encoded) > 500000:
        raise IntegrationFailure('PIX_INVALID_RESPONSE')
    if encoded:
        try:
            raw = base64.b64decode(encoded, validate=True)
            with Image.open(io.BytesIO(raw)) as image:
                if image.format != 'PNG' or image.width * image.height > 4_000_000:
                    raise ValueError()
                image.verify()
        except Exception:
            raise IntegrationFailure('PIX_INVALID_IMAGE')
    charge.pix_copy_paste = payload
    charge.pix_image = encoded
    charge.pix_expires_at = str(result.get('expirationDate', ''))[:60]
    db.commit()

def customer_reference(charge):
    key = settings().app_secret_key.encode()
    content = f'{charge.school_id}:{charge.payer_snapshot["cpf"]}'.encode()
    return 'pige360-payer:' + hmac.new(key, content, hashlib.sha256).hexdigest()

def bank_job(db, job, payload, conn):
    charge = db.get(m.BankCharge, payload['charge_id'])
    if not charge or charge.school_id != job.school_id or charge.connection_id != conn.id:
        raise IntegrationFailure('CHARGE_SCOPE_MISMATCH')
    provider = AsaasProvider(conn)
    if job.kind == 'bank_issue':
        if charge.status == 'cancelled':
            return ''
        if charge.remote_payment_id:
            payment = provider.get_payment(charge.remote_payment_id)
        else:
            payment = provider.find('payments', charge.external_reference)
            if payment is None:
                if charge.payment_attempted:
                    raise IntegrationFailure('PAYMENT_POST_REQUIRES_RECONCILIATION', uncertain=True)
                if not charge.remote_customer_id:
                    reference = customer_reference(charge)
                    customer = provider.find('customers', reference)
                    if customer is None:
                        if charge.customer_attempted:
                            raise IntegrationFailure('CUSTOMER_POST_REQUIRES_RECONCILIATION', uncertain=True)
                        # Checkpoint durável ANTES do POST: crash/timeout não autoriza outra criação.
                        charge.customer_attempted = True
                        db.commit()
                        customer = provider.customer(charge.payer_snapshot, reference)
                    if not isinstance(customer.get('id'), str) or not customer['id']:
                        raise IntegrationFailure('CUSTOMER_ID_MISSING', uncertain=True)
                    remote_cpf = ''.join(c for c in str(customer.get('cpfCnpj', '')) if c.isdigit())
                    if remote_cpf and remote_cpf != charge.payer_snapshot['cpf']:
                        raise IntegrationFailure('CUSTOMER_DOCUMENT_MISMATCH')
                    charge.remote_customer_id = customer['id']
                    db.commit()
                charge.payment_attempted = True
                db.commit()
                payment = provider.create_payment(charge)
        apply_remote(db, charge, payment, 'issue')
        db.commit()  # Resultado financeiro não depende da chamada secundária de QR Code.
        refresh_pix(db, charge, provider)
        return charge.remote_payment_id or ''
    if job.kind == 'bank_sync':
        payment = provider.get_payment(charge.remote_payment_id) if charge.remote_payment_id else provider.find('payments', charge.external_reference)
        if payment is None:
            raise IntegrationFailure('REMOTE_PAYMENT_NOT_FOUND', uncertain=charge.payment_attempted)
        apply_remote(db, charge, payment, 'reconciliation')
        db.commit()
        refresh_pix(db, charge, provider)
        return charge.remote_payment_id or ''
    if job.kind == 'bank_cancel':
        if not charge.remote_payment_id:
            raise IntegrationFailure('REMOTE_PAYMENT_ID_MISSING')
        payment = provider.get_payment(charge.remote_payment_id)
        apply_remote(db, charge, payment, 'before_cancel')
        db.commit()
        if charge.status == 'cancelled':
            return charge.remote_payment_id
        if charge.status not in ('pending', 'overdue'):
            raise IntegrationFailure('PAYMENT_NOT_CANCELLABLE')
        result = provider.cancel(charge.remote_payment_id)
        if result.get('deleted') is not True or result.get('id', charge.remote_payment_id) != charge.remote_payment_id:
            raise IntegrationFailure('CANCELLATION_NOT_CONFIRMED', uncertain=True)
        payment['deleted'] = True
        apply_remote(db, charge, payment, 'cancel')
        db.commit()
        return charge.remote_payment_id
    raise IntegrationFailure('UNKNOWN_BANK_JOB')

def send_email(payload):
    cfg = settings()
    if not cfg.smtp_host or not cfg.smtp_from:
        raise IntegrationFailure('SMTP_NOT_CONFIGURED')
    message = EmailMessage()
    message['From'] = cfg.smtp_from
    message['To'] = payload['to']
    message['Subject'] = payload.get('subject', 'PIGE360 — confirmação de acesso')
    message.set_content(payload['text'])
    sending = False
    try:
        context = ssl.create_default_context()
        factory = smtplib.SMTP_SSL if cfg.smtp_security == 'ssl' else smtplib.SMTP
        kwargs = {'timeout': cfg.integration_timeout_seconds}
        if cfg.smtp_security == 'ssl': kwargs['context'] = context
        with factory(cfg.smtp_host, cfg.smtp_port, **kwargs) as smtp:
            if cfg.smtp_security == 'starttls': smtp.starttls(context=context)
            if cfg.smtp_username: smtp.login(cfg.smtp_username, cfg.smtp_password)
            sending = True
            smtp.send_message(message)
    except (OSError, smtplib.SMTPException):
        raise IntegrationFailure('SMTP_SEND_FAILED', uncertain=sending)
    return ''

def execute(db, job):
    payload = unseal(job.encrypted_payload)
    if payload.get('expires_at') and utc(datetime.fromisoformat(payload['expires_at'])) <= now():
        raise IntegrationFailure('MESSAGE_EXPIRED')
    conn = db.get(m.IntegrationConnection, job.connection_id) if job.connection_id else None
    if job.connection_id and (not conn or not conn.enabled or conn.school_id != job.school_id):
        raise IntegrationFailure('INTEGRATION_DISABLED')
    if job.kind.startswith('bank_'):
        if not conn or conn.provider != 'asaas': raise IntegrationFailure('BANK_NOT_CONFIGURED')
        return bank_job(db, job, payload, conn)
    if job.kind == 'connect_text':
        if not conn or conn.provider != 'connect_api': raise IntegrationFailure('CONNECT_NOT_CONFIGURED')
        return ConnectProvider(conn).send(payload['number'], payload['text'], job.dedupe_key)
    if job.kind == 'smtp_email': return send_email(payload)
    raise IntegrationFailure('UNKNOWN_JOB_KIND')

def recover_expired(db):
    rows = db.scalars(select(m.IntegrationJob).where(m.IntegrationJob.status == 'processing', m.IntegrationJob.lease_until < now()).with_for_update(skip_locked=True))
    for row in rows:
        row.status = 'retry' if row.kind in SAFE_KINDS else 'uncertain'
        row.error_code = 'WORKER_LEASE_EXPIRED'
        row.available_at = now() + timedelta(seconds=30)
        row.lease_until = None
        if row.kind == 'bank_issue':
            payload = unseal(row.encrypted_payload)
            charge = db.get(m.BankCharge, payload.get('charge_id'))
            if charge and not charge.remote_payment_id and charge.status != 'cancelled': charge.status = 'uncertain'
    db.commit()

def process_one(job_id=None):
    """Executa no máximo um job. Retorna False quando não houver trabalho elegível."""
    # Conexão dedicada mantém o advisory lock entre os checkpoints (commits).
    with engine.connect() as sql_conn, Session(bind=sql_conn, expire_on_commit=False) as db:
        recover_expired(db)
        query = select(m.IntegrationJob).where(m.IntegrationJob.status.in_(['pending', 'retry']), m.IntegrationJob.available_at <= now())
        if job_id: query = query.where(m.IntegrationJob.id == job_id)
        job = db.scalar(query.order_by(m.IntegrationJob.created_at).with_for_update(skip_locked=True).limit(1))
        if not job: return False
        lock_key = int.from_bytes(hashlib.sha256(job.school_id.encode()).digest()[:8], 'big', signed=True)
        locked = False
        try:
            if engine.dialect.name == 'postgresql':
                locked = bool(db.scalar(text('SELECT pg_try_advisory_lock(:key)'), {'key': lock_key}))
                if not locked: db.rollback(); return False
            job.status = 'processing'; job.attempts += 1
            job.lease_until = now() + timedelta(minutes=5); job.error_code = ''
            db.commit()
            try:
                remote_id = execute(db, job)
                job.remote_id = remote_id or job.remote_id
                job.status = 'completed'; job.completed_at = now()
                if job.kind == 'connect_text': job.delivery_status = 'sent'
            except IntegrationFailure as error:
                db.rollback(); db.refresh(job)
                job.error_code = error.code
                job.status = 'uncertain' if error.uncertain else ('retry' if error.retryable and job.attempts < 5 else 'failed')
                if job.status == 'retry': job.available_at = now() + timedelta(seconds=min(900, 15 * 2 ** job.attempts))
                if job.kind == 'bank_issue':
                    payload = unseal(job.encrypted_payload)
                    charge = db.get(m.BankCharge, payload['charge_id'])
                    if charge and not charge.remote_payment_id and charge.status != 'cancelled':
                        charge.status = 'uncertain' if error.uncertain else 'failed'
                LOG.warning('job=%s kind=%s code=%s', job.id, job.kind, job.error_code)
            except Exception:
                # Nunca incluir corpo, credencial, OTP ou traceback com variáveis no log.
                db.rollback(); db.refresh(job)
                job.status = 'failed' if job.kind in SAFE_KINDS else 'uncertain'
                job.error_code = 'UNEXPECTED_WORKER_ERROR'
                LOG.error('job=%s kind=%s code=%s', job.id, job.kind, job.error_code)
            job.lease_until = None; db.commit()
            return True
        finally:
            if locked:
                db.execute(text('SELECT pg_advisory_unlock(:key)'), {'key': lock_key}); db.commit()

def schedule_reconciliations():
    """Recupera webhooks perdidos sem repetir POST de cobrança; volume limitado."""
    interval=settings().bank_reconcile_interval_seconds
    with Session(engine,expire_on_commit=False) as db:
        cutoff=now()-timedelta(seconds=interval)
        rows=list(db.scalars(select(m.BankCharge).join(m.IntegrationConnection).where(
            m.IntegrationConnection.enabled.is_(True),
            m.BankCharge.status.in_(['pending','overdue','confirmed','uncertain','refund_requested','disputed']),
            (m.BankCharge.last_synced_at.is_(None))|(m.BankCharge.last_synced_at<cutoff)
        ).order_by(m.BankCharge.last_synced_at.asc(),m.BankCharge.created_at).limit(25)))
        for charge in rows:
            key=f'bank-periodic:{charge.id}:{int(now().timestamp())//interval}'
            enqueue(db,charge.school_id,'bank_sync',{'charge_id':charge.id},key,charge.connection_id)
        db.commit()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--once', action='store_true')
    parser.add_argument('--limit', type=int, default=100)
    parser.add_argument('--health', action='store_true')
    args = parser.parse_args()
    if args.health:
        raise SystemExit(0 if HEARTBEAT.exists() and time.time() - HEARTBEAT.stat().st_mtime < 360 else 1)
    logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
    done = 0
    next_reconcile = 0.0
    while True:
        HEARTBEAT.touch()
        try:
            if time.monotonic() >= next_reconcile:
                schedule_reconciliations(); next_reconcile=time.monotonic()+60
            worked = process_one()
        except Exception:
            LOG.error('code=WORKER_DATABASE_OR_CONFIGURATION_ERROR'); worked = False
        done += int(worked)
        if args.once and (not worked or done >= args.limit): return
        if not worked: time.sleep(settings().worker_poll_seconds)

if __name__ == '__main__': main()
