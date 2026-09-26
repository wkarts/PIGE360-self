"""Limites compartilhados entre processos e configuração institucional."""
from datetime import timedelta
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from .assisted_models import AssistedQuota, IntakeSettings
from .db import now
from .security import digest, fail


def ensure(db, model, ident, **values):
    row = db.get(model, ident)
    if row is None:
        try:
            with db.begin_nested():
                row = model(**values)
                db.add(row)
                db.flush()
        except IntegrityError:
            row = db.get(model, ident, populate_existing=True)
    return row


def quota(db, subject: str, limit: int, seconds: int = 3600):
    key = digest('assisted:' + subject)
    ensure(db, AssistedQuota, key, key=key, count=0, window_started=now())
    db.execute(update(AssistedQuota).execution_options(synchronize_session=False).where(AssistedQuota.key == key,
        AssistedQuota.window_started <= now() - timedelta(seconds=seconds)).values(count=0, window_started=now()))
    changed = db.execute(update(AssistedQuota).execution_options(synchronize_session=False).where(AssistedQuota.key == key,
        AssistedQuota.count < limit).values(count=AssistedQuota.count + 1)).rowcount
    db.commit()  # o limite sobrevive à falha da consulta/upload; não há dados da ficha aqui
    if not changed:
        fail(429, 'Limite de solicitações atingido. Aguarde ou continue preenchendo manualmente.')


def enabled(db, name: str):
    row = db.get(IntakeSettings, 1)
    if row is not None and not getattr(row, name):
        fail(409, 'Este recurso foi desativado pela instituição. O preenchimento manual continua disponível.')
