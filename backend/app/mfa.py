"""2FA TOTP da instituição: desafios sem sessão, confirmação e recuperação de uso único.

TOTP segue RFC 6238 (HMAC-SHA1, 30 segundos, 6 dígitos). Não há fallback
por e-mail/SMS nem sessão autenticada emitida antes do segundo fator.
"""
import base64
import hashlib
import hmac
import io
import re
import secrets
import struct
import time
from datetime import timedelta
from urllib.parse import quote

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from fastapi import APIRouter, Request, Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import delete, select, update
from . import models as m
from .common import audit
from .config import settings
from .db import now
from .security import Actor, DB, check_version, digest, fail, request_csrf, utc, verify

router = APIRouter(prefix='/api/v1', tags=['Autenticação em duas etapas'])


class Input(BaseModel):
    model_config = ConfigDict(extra='forbid')


class PasswordInput(Input):
    current_password: str = Field(min_length=1, max_length=128)


class ProofInput(PasswordInput):
    code: str = Field(min_length=6, max_length=40)


class ChallengeInput(Input):
    token: str = Field(min_length=40, max_length=200)


class VerifyInput(ChallengeInput):
    code: str = Field(min_length=6, max_length=40)


class PolicyInput(ProofInput):
    version: int = Field(ge=1)
    required: bool


class ResetInput(ProofInput):
    subject_kind: str = Field(pattern=r'^(user|portal)$')
    subject_id: str = Field(min_length=36, max_length=36)
    reason: str = Field(min_length=12, max_length=500)


def subject_key(kind, account):
    return kind + ':' + account.id


def policy(db):
    row = db.get(m.MFAPolicy, 1)
    if row is None:
        fail(503, 'Execute as migrations de segurança antes de autenticar.')
    return row


def cipher():
    key = HKDF(algorithm=hashes.SHA256(), length=32, salt=b'pige360-mfa-v1',
               info=b'totp-secrets').derive(settings().app_secret_key.encode())
    return Fernet(base64.urlsafe_b64encode(key))


def otp(secret, counter, digits=6):
    """RFC 4226, seção 5.3; entradas conhecidas verificadas pelos vetores RFC 6238."""
    raw = hmac.new(base64.b32decode(secret), struct.pack('>Q', counter), hashlib.sha1).digest()
    offset = raw[-1] & 15
    return str((struct.unpack('>I', raw[offset:offset+4])[0] & 0x7fffffff) % (10**digits)).zfill(digits)


def matching_counter(secret, code, previous=-1):
    if not re.fullmatch(r'[0-9]{6}', code):
        return None
    counter = int(time.time()) // 30
    for candidate in (counter, counter-1, counter+1):
        if candidate > previous and hmac.compare_digest(otp(secret, candidate), code):
            return candidate
    return None


def throttle(db, request, key, limit=10):
    # Contador compartilhado entre workers. O commit antecede qualquer mutação
    # sensível e conserva tentativas mesmo em respostas 401/422.
    peer = request.client.host if request.client else 'unknown'
    for suffix, ceiling in [(key, limit), ('ip:' + peer, 120)]:
        ident = digest('mfa:' + suffix)
        values = {'key': ident, 'count': 0, 'window_started': now()}
        if db.bind.dialect.name == 'postgresql':
            from sqlalchemy.dialects.postgresql import insert
        else:
            from sqlalchemy.dialects.sqlite import insert
        db.execute(insert(m.LoginAttempt).values(**values).on_conflict_do_nothing(index_elements=['key']))
        row = db.scalar(select(m.LoginAttempt).where(m.LoginAttempt.key == ident).with_for_update())
        if utc(row.window_started) + timedelta(minutes=5) < now():
            row.count = 0; row.window_started = now()
        if row.count >= ceiling:
            fail(429, 'Muitas tentativas de 2FA. Aguarde cinco minutos.')
        row.count += 1
    db.commit()


def credential(db, kind, account):
    return db.get(m.MFACredential, subject_key(kind, account))


def status(db, kind, account):
    cred = credential(db, kind, account)
    from sqlalchemy import func
    return {'enabled': bool(cred and cred.enabled), 'required': policy(db).required,
            'recovery_remaining': db.scalar(select(func.count()).select_from(m.MFARecovery).where(m.MFARecovery.subject == subject_key(kind, account))) or 0}


def enforce_session(db, kind, account, session):
    cred = credential(db, kind, account)
    if (policy(db).required or (cred and cred.enabled)) and not session.mfa_verified:
        fail(401, 'A instituição exige autenticação em duas etapas. Entre novamente.')


def revoke(db, kind, account):
    if kind == 'user':
        db.execute(update(m.AuthSession).where(m.AuthSession.user_id == account.id).values(revoked=True))
    else:
        db.execute(update(m.PortalSession).where(m.PortalSession.account_id == account.id).values(revoked=True))
    db.execute(update(m.MFAChallenge).where(m.MFAChallenge.subject == subject_key(kind, account)).values(consumed=True))


def log(db, request, kind, account, action, details=None):
    audit(db, request, account if kind == 'user' else None, 'mfa.'+action, account,
          getattr(account, 'school_id', None), {'subject_kind': kind, **(details or {})})


def issue_challenge(db, request, kind, account, enroll=False):
    subject = subject_key(kind, account)
    throttle(db, request, 'issue:'+subject, 10)
    db.execute(delete(m.MFAChallenge).where(m.MFAChallenge.expires_at < now()))
    # Um desafio de login não invalida outro dispositivo; ativação é serializada
    # pelo credential e códigos/consumo são atômicos.
    raw = secrets.token_urlsafe(48)
    secret = base64.b32encode(secrets.token_bytes(20)).decode() if enroll else ''
    row = m.MFAChallenge(subject=subject, token_hash=digest(raw),
        password_revision=digest(account.password_hash), policy_version=policy(db).version,
        purpose='enroll' if enroll else 'login', encrypted_secret=cipher().encrypt(secret.encode()).decode() if secret else '',
        expires_at=now()+timedelta(minutes=5))
    db.add(row); db.flush()
    return {'mfa_required': True, 'enrollment_required': enroll, 'mfa_token': raw, 'expires_in': 300}


def before_login(db, request, kind, account):
    cred = credential(db, kind, account)
    enabled = bool(cred and cred.enabled)
    return issue_challenge(db, request, kind, account, enroll=not enabled) if enabled or policy(db).required else None


def get_challenge(db, raw):
    row = db.scalar(select(m.MFAChallenge).where(m.MFAChallenge.token_hash == digest(raw)))
    if not row:
        fail(401, 'Etapa de autenticação expirada. Informe seu e-mail e senha novamente.')
    kind, ident = row.subject.split(':', 1)
    cls = m.User if kind == 'user' else m.PortalAccount
    # Ordem única: conta, depois desafio. Evita deadlock entre duas ativações
    # quando a primeira revoga todos os demais desafios da mesma conta.
    account = db.scalar(select(cls).where(cls.id == ident).with_for_update())
    row = db.scalar(select(m.MFAChallenge).where(m.MFAChallenge.id == row.id)
                    .execution_options(populate_existing=True).with_for_update())
    if not row or row.consumed or utc(row.expires_at) <= now() or row.failures >= 5:
        fail(401, 'Etapa de autenticação expirada. Informe seu e-mail e senha novamente.')
    if not account or not account.active or row.password_revision != digest(account.password_hash) or row.policy_version != policy(db).version:
        fail(401, 'Etapa de autenticação expirada. Entre novamente.')
    if kind == 'portal':
        school = db.get(m.School, account.school_id)
        if not school or not school.active:
            fail(401, 'Acesso ao portal indisponível.')
    return row, kind, account


def backup_hash(subject, code):
    normalized = re.sub(r'[\s-]', '', code).upper()
    return hmac.new(settings().app_secret_key.encode(), (subject+':'+normalized).encode(), hashlib.sha256).hexdigest()


def make_recovery(db, subject):
    db.execute(delete(m.MFARecovery).where(m.MFARecovery.subject == subject))
    codes = []
    for _ in range(10):
        raw = secrets.token_hex(10).upper()
        code = '-'.join(raw[i:i+5] for i in range(0, 20, 5))
        db.add(m.MFARecovery(subject=subject, code_hash=backup_hash(subject, code)))
        codes.append(code)
    return codes


def check_code(db, cred, code):
    if not cred or not cred.enabled:
        return False
    code = code.strip()
    counter = matching_counter(cipher().decrypt(cred.encrypted_secret.encode()).decode(), code, cred.last_counter)
    if counter is not None:
        # CAS protege replay mesmo em SQLite e em dois desafios simultâneos.
        changed = db.execute(update(m.MFACredential).where(m.MFACredential.subject == cred.subject,
                   m.MFACredential.last_counter < counter, m.MFACredential.enabled.is_(True))
                   .values(last_counter=counter))
        return changed.rowcount == 1
    if not re.fullmatch(r'[0-9A-Fa-f\s-]{20,30}', code):
        return False
    removed = db.execute(delete(m.MFARecovery).where(m.MFARecovery.subject == cred.subject,
                         m.MFARecovery.code_hash == backup_hash(cred.subject, code)))
    return removed.rowcount == 1


@router.post('/auth/mfa/challenge')
def challenge_details(payload: ChallengeInput, request: Request, db: DB):
    request_csrf(request)
    row, kind, account = get_challenge(db, payload.token)
    if row.purpose != 'enroll':
        return {'enrollment_required': False}
    from .institution import identity_data
    import qrcode
    from qrcode.image.svg import SvgPathImage
    name = identity_data(db).get('display_name') or 'Instituição'
    secret = cipher().decrypt(row.encrypted_secret.encode()).decode()
    uri = 'otpauth://totp/' + quote(name+':'+account.email, safe='') + '?secret='+secret+'&issuer='+quote(name, safe='')+'&algorithm=SHA1&digits=6&period=30'
    image = qrcode.make(uri, image_factory=SvgPathImage)
    target = io.BytesIO(); image.save(target)
    return {'enrollment_required': True, 'secret': secret, 'uri': uri,
            'qr': 'data:image/svg+xml;base64,'+base64.b64encode(target.getvalue()).decode()}


@router.post('/auth/mfa/verify')
def finish_challenge(payload: VerifyInput, request: Request, response: Response, db: DB):
    request_csrf(request)
    # Limite por token/IP e, abaixo, cinco falhas por desafio.
    throttle(db, request, 'verify:'+digest(payload.token), 15)
    row, kind, account = get_challenge(db, payload.token)
    cred = db.scalar(select(m.MFACredential).where(m.MFACredential.subject == row.subject).with_for_update())
    codes = []
    if row.purpose == 'enroll':
        if cred and cred.enabled:
            fail(409, 'O 2FA já foi ativado. Entre novamente com o código do autenticador.')
        secret = cipher().decrypt(row.encrypted_secret.encode()).decode()
        counter = matching_counter(secret, payload.code.strip())
        valid = counter is not None
    else:
        valid = check_code(db, cred, payload.code)
    if not valid:
        row.failures += 1
        log(db, request, kind, account, 'challenge.failed')
        db.commit()
        fail(401, 'Código inválido, já utilizado ou expirado.')
    if row.purpose == 'enroll':
        if not cred:
            cred = m.MFACredential(subject=row.subject); db.add(cred)
        cred.enabled = True; cred.encrypted_secret = row.encrypted_secret; cred.last_counter = counter
        db.flush()
        codes = make_recovery(db, row.subject)
        revoke(db, kind, account)
    row.consumed = True
    row.encrypted_secret = ''
    # Fatores nunca são retornados nos endpoints normais de perfil/listagem.
    if kind == 'user':
        from .auth import new_session
    else:
        from .portal import new_session
    result = new_session(db, account, response, mfa_verified=True)
    log(db, request, kind, account, 'enrolled' if codes else 'login')
    if codes:
        result['recovery_codes'] = codes
    return result


def managed_subject(request, db, user=None):
    if user is not None:
        return 'user', user
    from .portal import portal_account
    return 'portal', portal_account(request, db)


def enroll_start(payload, request, db, kind, account):
    request_csrf(request); throttle(db, request, 'manage:'+subject_key(kind, account))
    if not verify(payload.current_password, account.password_hash):
        fail(422, 'Senha atual inválida.')
    if status(db, kind, account)['enabled']:
        fail(409, '2FA já ativado nesta conta.')
    return issue_challenge(db, request, kind, account, enroll=True)


def manage_proof(payload, request, db, kind, account):
    request_csrf(request); throttle(db, request, 'manage:'+subject_key(kind, account))
    cred = db.scalar(select(m.MFACredential).where(m.MFACredential.subject == subject_key(kind, account)).with_for_update())
    if not verify(payload.current_password, account.password_hash) or not check_code(db, cred, payload.code):
        fail(422, 'Confirme a senha e um código de 2FA válido e ainda não utilizado.')
    return cred


def disable(payload, request, db, kind, account):
    cred = manage_proof(payload, request, db, kind, account)
    if policy(db).required:
        fail(409, 'A instituição exige 2FA; não é permitido desativá-lo individualmente.')
    cred.enabled = False; cred.encrypted_secret = ''; cred.last_counter = -1
    db.execute(delete(m.MFARecovery).where(m.MFARecovery.subject == cred.subject))
    revoke(db, kind, account); log(db, request, kind, account, 'disabled')
    return {'requires_login': True}


@router.get('/auth/mfa')
def my_status(db: DB, user: Actor):
    return status(db, 'user', user)


@router.post('/auth/mfa/enroll')
def my_enroll(payload: PasswordInput, request: Request, db: DB, user: Actor):
    return enroll_start(payload, request, db, 'user', user)


@router.post('/auth/mfa/disable')
def my_disable(payload: ProofInput, request: Request, db: DB, user: Actor):
    return disable(payload, request, db, 'user', user)


@router.post('/auth/mfa/recovery')
def my_recovery(payload: ProofInput, request: Request, db: DB, user: Actor):
    cred = manage_proof(payload, request, db, 'user', user)
    codes = make_recovery(db, cred.subject); log(db, request, 'user', user, 'recovery.regenerated')
    return {'recovery_codes': codes}


@router.get('/portal/mfa')
def parent_status(request: Request, db: DB):
    kind, account = managed_subject(request, db)
    return status(db, kind, account)


@router.post('/portal/mfa/enroll')
def parent_enroll(payload: PasswordInput, request: Request, db: DB):
    kind, account = managed_subject(request, db)
    return enroll_start(payload, request, db, kind, account)


@router.post('/portal/mfa/disable')
def parent_disable(payload: ProofInput, request: Request, db: DB):
    kind, account = managed_subject(request, db)
    return disable(payload, request, db, kind, account)


@router.post('/portal/mfa/recovery')
def parent_recovery(payload: ProofInput, request: Request, db: DB):
    kind, account = managed_subject(request, db)
    cred = manage_proof(payload, request, db, kind, account)
    codes = make_recovery(db, cred.subject); log(db, request, kind, account, 'recovery.regenerated')
    return {'recovery_codes': codes}


@router.get('/institution/mfa')
def get_policy(db: DB, user: Actor):
    if user.role != 'admin':
        fail(403, 'Somente o administrador altera a política de 2FA.')
    row = policy(db)
    return {'required': row.required, 'version': row.version, 'scope': 'all_users_and_portal',
            'own_enabled': status(db, 'user', user)['enabled']}


@router.put('/institution/mfa')
def save_policy(payload: PolicyInput, request: Request, db: DB, user: Actor):
    if user.role != 'admin':
        fail(403, 'Somente o administrador altera a política de 2FA.')
    manage_proof(payload, request, db, 'user', user)
    row = db.scalar(select(m.MFAPolicy).where(m.MFAPolicy.id == 1).with_for_update())
    check_version(row, payload.version)
    changed = row.required != payload.required
    row.required = payload.required; row.version += 1
    if changed:
        db.execute(update(m.AuthSession).values(revoked=True))
        db.execute(update(m.PortalSession).values(revoked=True))
        db.execute(update(m.MFAChallenge).values(consumed=True))
    audit(db, request, user, 'institution.mfa.updated', row, details={'required': row.required, 'sessions_revoked': changed})
    return {'required': row.required, 'version': row.version, 'requires_login': changed}


@router.post('/institution/mfa/reset')
def reset_user(payload: ResetInput, request: Request, db: DB, user: Actor):
    if user.role != 'admin':
        fail(403, 'Somente o administrador pode recuperar o segundo fator de outra conta.')
    manage_proof(payload, request, db, 'user', user)
    cls = m.User if payload.subject_kind == 'user' else m.PortalAccount
    account = db.scalar(select(cls).where(cls.id == payload.subject_id).with_for_update())
    if not account or (payload.subject_kind == 'user' and account.id == user.id):
        fail(422, 'Selecione outra conta e confirme sua identidade antes da recuperação.')
    reset_factor(db, payload.subject_kind, account)
    audit(db, request, user, 'mfa.administrative_reset', account, details={'subject_kind':payload.subject_kind,'reason':payload.reason})
    return {'requires_enrollment': policy(db).required, 'sessions_revoked': True}


def reset_factor(db, kind, account):
    cred = credential(db, kind, account)
    if cred:
        cred.enabled = False; cred.encrypted_secret = ''; cred.last_counter = -1
    db.execute(delete(m.MFARecovery).where(m.MFARecovery.subject == subject_key(kind, account)))
    revoke(db, kind, account)


@router.post('/auth/mfa/cancel')
def cancel_challenge(payload: ChallengeInput, request: Request, db: DB):
    request_csrf(request)
    db.execute(update(m.MFAChallenge).where(m.MFAChallenge.token_hash == digest(payload.token)).values(consumed=True, encrypted_secret=''))
    return {'cancelled': True}
