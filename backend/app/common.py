from datetime import date, datetime
from fastapi import Request
from sqlalchemy import select
from sqlalchemy.orm import Session
from .models import AuditEvent, Sequence, User

def output(obj, exclude=()):
    result = {}
    for column in obj.__table__.columns:
        if column.name in exclude:
            continue
        value = getattr(obj, column.name)
        result[column.name] = value.isoformat() if isinstance(value, (date, datetime)) else value
    return result

def audit(db: Session, request: Request, user: User | None, action: str, obj, school_id: str | None = None, details=None):
    db.add(AuditEvent(school_id=school_id, actor_id=user.id if user else None, action=action,
                      entity_type=obj.__tablename__, entity_id=str(obj.id), details=details or {},
                      request_id=getattr(request.state, 'request_id', ''), ip=request.client.host if request.client else ''))

def number(db: Session, school_id: str, kind: str, prefix: str):
    # O chamador deve deter lock_school para a criação atômica de sequências novas.
    key = f'{school_id}:{kind}'
    seq = db.scalar(select(Sequence).where(Sequence.key == key).with_for_update())
    if seq is None:
        seq = Sequence(key=key, value=0)
        db.add(seq)
    seq.value += 1
    db.flush()
    return f'{prefix}{seq.value:06d}'
