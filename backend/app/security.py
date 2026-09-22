import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from typing import Annotated
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerificationError, InvalidHashError
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session
from .config import settings
from .db import get_db
from .models import User, AuthSession, School, SchoolAccess

hasher = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=4)
bearer = HTTPBearer(auto_error=False)
DB = Annotated[Session, Depends(get_db, scope='function')]
PERMISSIONS = {
    'admin': {'read', 'people.write', 'academic.write', 'enrollments.write', 'documents.write', 'documents.validate', 'documents.waive', 'protocols.write', 'reports.read', 'users.manage', 'schools.manage', 'audit.read'},
    'secretary': {'read', 'people.write', 'academic.write', 'enrollments.write', 'documents.write', 'documents.validate', 'protocols.write', 'reports.read', 'audit.read'},
    'viewer': {'read', 'reports.read'},
}

PERMISSIONS['admin'].update({'admissions.read', 'admissions.write', 'admissions.manage', 'banking.read', 'banking.write', 'integrations.manage', 'communications.send'})
PERMISSIONS['secretary'].update({'admissions.read', 'admissions.write', 'banking.read', 'communications.send'})

def fail(status: int, detail: str):
    raise HTTPException(status, detail)

def utc(value: datetime):
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value

def digest(value: str):
    return hashlib.sha256(value.encode()).hexdigest()

def hash_password(password: str):
    if len(password) < 12 or len(password) > 128:
        fail(422, 'A senha deve conter de 12 a 128 caracteres.')
    return hasher.hash(password)

def verify(password: str, password_hash: str):
    try:
        return hasher.verify(password_hash, password)
    except (VerificationError, InvalidHashError):
        return False

def access_token(user: User, session: AuthSession):
    cfg = settings()
    now = datetime.now(UTC)
    return jwt.encode({'sub': user.id, 'sid': session.id, 'typ': 'access', 'aud': 'pige360-self', 'iss': cfg.app_url,
                       'iat': now, 'exp': now + timedelta(minutes=cfg.access_token_minutes)}, cfg.app_secret_key, algorithm='HS256')

def current_user(db: DB, credential: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]) -> User:
    if not credential:
        fail(401, 'Autenticação necessária.')
    cfg = settings()
    try:
        payload = jwt.decode(credential.credentials, cfg.app_secret_key, algorithms=['HS256'], audience='pige360-self', issuer=cfg.app_url,
                             options={'require': ['sub', 'sid', 'exp', 'iat', 'aud', 'iss', 'typ']})
        if payload['typ'] != 'access':
            fail(401, 'Sessão inválida.')
    except jwt.PyJWTError:
        fail(401, 'Sessão expirada ou inválida.')
    session = db.get(AuthSession, payload['sid'])
    user = db.get(User, payload['sub'])
    if not session or session.revoked or session.user_id != payload['sub'] or utc(session.expires_at) <= datetime.now(UTC) or not user or not user.active:
        fail(401, 'Sessão revogada ou usuário inativo.')
    return user

Actor = Annotated[User, Depends(current_user)]

def require(user: User, permission: str):
    if permission not in PERMISSIONS.get(user.role, set()):
        fail(403, 'Seu perfil não possui permissão para esta operação.')

def school_scope(school_id: str, db: DB, user: Actor) -> School:
    school = db.get(School, school_id)
    if not school or not school.active:
        fail(404, 'Escola não encontrada.')
    if user.role != 'admin' and not db.get(SchoolAccess, (user.id, school_id)):
        fail(403, 'Acesso não autorizado a esta escola.')
    return school

Scope = Annotated[School, Depends(school_scope)]

def scoped(db: Session, model, record_id: str, school_id: str):
    obj = db.scalar(select(model).where(model.id == record_id, model.school_id == school_id))
    if obj is None:
        fail(404, 'Registro não encontrado nesta escola.')
    return obj

def lock_school(db: Session, school_id: str):
    # Serializa operações de vaga/numeração por escola no PostgreSQL.
    return db.scalar(select(School).where(School.id == school_id).with_for_update())

def check_version(obj, expected: int):
    if obj.version != expected:
        fail(409, 'O registro foi alterado por outro usuário. Recarregue antes de salvar.')

def request_csrf(request: Request):
    if request.headers.get('X-CSRF-Protection') != '1':
        fail(403, 'Cabeçalho de proteção CSRF ausente.')
    origin = request.headers.get('origin')
    if origin and origin.rstrip('/') != settings().app_url.rstrip('/'):
        fail(403, 'Origem não autorizada.')
