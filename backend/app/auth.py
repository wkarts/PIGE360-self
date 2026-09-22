import secrets
from datetime import UTC, date, datetime, timedelta
from fastapi import APIRouter, Header, Request, Response
from sqlalchemy import delete, select, update
from .config import settings
from .db import now
from .models import Installation, Company, School, Unit, AcademicYear, User, Person, Student, GuardianLink, SchoolAccess, AuthSession, LoginAttempt
from .schemas import Login, Setup, UserInput, UserEdit, PasswordChange
from .security import Actor, DB, PERMISSIONS, ROLE_LABELS, access_token, check_version, digest, fail, hash_password, require, request_csrf, utc, verify
from .common import audit, output

router = APIRouter(prefix='/api/v1', tags=['Autenticação e instalação'])
DUMMY_PASSWORD_HASH = hash_password('not-an-account-password-93401980')

def user_output(db, user):
    return {**output(user, ('password_hash',)),
            'role_label': ROLE_LABELS.get(user.role, user.role),
            'permissions': sorted(PERMISSIONS.get(user.role, set())),
            'school_ids': list(db.scalars(select(SchoolAccess.school_id).where(SchoolAccess.user_id == user.id)))}

def set_refresh(response, session, secret):
    cfg = settings()
    response.set_cookie('pige_refresh', f'{session.id}.{secret}', httponly=True, secure=cfg.cookie_secure,
                        samesite='strict', path='/api/v1/auth', max_age=cfg.refresh_token_days * 86400)

def new_session(db, user, response):
    secret = secrets.token_urlsafe(48)
    session = AuthSession(user_id=user.id, token_hash=digest(secret), expires_at=now() + timedelta(days=settings().refresh_token_days))
    db.add(session)
    db.flush()
    set_refresh(response, session, secret)
    return {'access_token': access_token(user, session), 'token_type': 'bearer', 'user': user_output(db, user)}

@router.get('/setup/status')
def setup_status(db: DB):
    install = db.get(Installation, 1)
    return {'configured': bool(install and install.configured), 'product': settings().app_name, 'version': settings().app_version}

@router.post('/setup', status_code=201)
def setup(data: Setup, db: DB, request: Request, x_setup_token: str = Header(default='')):
    if not secrets.compare_digest(x_setup_token, settings().setup_token):
        fail(403, 'Chave de instalação inválida. Consulte seu arquivo .env.')
    install = db.scalar(select(Installation).where(Installation.id == 1).with_for_update())
    if not install:
        fail(503, 'Execute as migrations antes da instalação.')
    if install.configured:
        fail(409, 'A instalação já foi configurada.')
    company = Company(name=data.company_name, document=data.company_document)
    db.add(company); db.flush()
    school = School(company_id=company.id, name=data.school_name)
    db.add(school); db.flush()
    db.add(Unit(school_id=school.id, name=data.unit_name))
    db.add(AcademicYear(school_id=school.id, name=str(data.academic_year), starts_on=date(data.academic_year, 1, 1), ends_on=date(data.academic_year, 12, 31)))
    user = User(name=data.admin_name, email=str(data.admin_email).lower(), password_hash=hash_password(data.admin_password), role='admin')
    db.add(user); db.flush()
    install.configured = True; install.configured_at = now()
    audit(db, request, user, 'installation.configured', school, school.id)
    db.flush()
    return {'configured': True, 'school_id': school.id, 'message': 'Instalação concluída. Entre com seu usuário.'}

@router.post('/auth/login')
def login(data: Login, request: Request, response: Response, db: DB):
    email = str(data.email).lower()
    peer = request.client.host if request.client else 'unknown'
    counters = []
    for key, limit in [(digest('account:' + email), 10), (digest('ip:' + peer), 80)]:
        counter = db.scalar(select(LoginAttempt).where(LoginAttempt.key == key).with_for_update())
        if counter is None:
            counter = LoginAttempt(key=key, count=0, window_started=now()); db.add(counter); db.flush()
        if utc(counter.window_started) + timedelta(minutes=15) < now():
            counter.count = 0; counter.window_started = now()
        if counter.count >= limit:
            fail(429, 'Muitas tentativas. Aguarde 15 minutos antes de tentar novamente.')
        counters.append(counter)
    user = db.scalar(select(User).where(User.email == email))
    valid = verify(data.password, user.password_hash if user else DUMMY_PASSWORD_HASH)
    if not user or not user.active or not valid:
        for counter in counters:
            counter.count += 1
        db.commit()  # Persistir limite mesmo quando a resposta é 401.
        fail(401, 'E-mail ou senha inválidos.')
    counters[0].count = 0
    result = new_session(db, user, response)
    audit(db, request, user, 'auth.login', user)
    return result

@router.post('/auth/refresh')
def refresh(request: Request, response: Response, db: DB):
    request_csrf(request)
    raw = request.cookies.get('pige_refresh', '')
    parts = raw.split('.', 1)
    if len(parts) != 2:
        fail(401, 'Sessão não encontrada.')
    session = db.scalar(select(AuthSession).where(AuthSession.id == parts[0]).with_for_update())
    if not session or session.revoked or utc(session.expires_at) <= now():
        fail(401, 'Sessão expirada.')
    token_hash = digest(parts[1])
    if not secrets.compare_digest(session.token_hash, token_hash):
        if session.previous_hash and secrets.compare_digest(session.previous_hash, token_hash):
            session.revoked = True; db.commit()
        fail(401, 'Token de renovação já utilizado ou inválido.')
    user = db.get(User, session.user_id)
    if not user or not user.active:
        fail(401, 'Usuário inativo.')
    secret = secrets.token_urlsafe(48)
    session.previous_hash = session.token_hash
    session.token_hash = digest(secret)
    # Expiração absoluta: a rotação não estende indefinidamente a sessão.
    set_refresh(response, session, secret)
    return {'access_token': access_token(user, session), 'token_type': 'bearer', 'user': user_output(db, user)}

@router.post('/auth/logout')
def logout(request: Request, response: Response, db: DB):
    request_csrf(request)
    parts = request.cookies.get('pige_refresh', '').split('.', 1)
    if len(parts) == 2:
        session = db.get(AuthSession, parts[0])
        if session and digest(parts[1]) in (session.token_hash, session.previous_hash):
            session.revoked = True
    response.delete_cookie('pige_refresh', path='/api/v1/auth', secure=settings().cookie_secure, httponly=True, samesite='strict')
    return {'logged_out': True}

@router.get('/auth/me')
def me(db: DB, user: Actor):
    return user_output(db, user)

@router.post('/auth/change-password')
def change_password(data: PasswordChange, db: DB, user: Actor, request: Request):
    if not verify(data.current_password, user.password_hash):
        fail(422, 'Senha atual inválida.')
    user.password_hash = hash_password(data.new_password)
    db.execute(update(AuthSession).where(AuthSession.user_id == user.id).values(revoked=True))
    audit(db, request, user, 'auth.password_changed', user)
    return {'message': 'Senha alterada. Entre novamente.'}

@router.get('/users')
def list_users(db: DB, user: Actor):
    require(user, 'users.manage')
    return [user_output(db, u) for u in db.scalars(select(User).order_by(User.name)).all()]

def check_schools(db, ids):
    for school_id in set(ids):
        if db.get(School, school_id) is None:
            fail(422, 'Escola inválida na lista de acesso.')


def check_profile_link(db, role, person_id, school_ids):
    individual_roles = {'teacher', 'student', 'guardian'}
    if role not in individual_roles:
        return
    if not person_id:
        fail(422, 'Este perfil precisa estar vinculado a uma pessoa cadastrada.')
    if len(set(school_ids)) != 1:
        fail(422, 'Perfis de Professor, Aluno e Responsável devem estar vinculados a uma única escola.')
    person = db.get(Person, person_id)
    if not person or person.school_id != school_ids[0]:
        fail(422, 'A pessoa vinculada não pertence à escola informada.')
    if role == 'student' and not db.scalar(select(Student.id).where(Student.person_id == person.id, Student.school_id == person.school_id)):
        fail(422, 'O perfil Aluno exige um cadastro de aluno vinculado à pessoa.')
    if role == 'guardian' and not db.scalar(select(GuardianLink.id).where(GuardianLink.person_id == person.id, GuardianLink.school_id == person.school_id, GuardianLink.active.is_(True))):
        fail(422, 'O perfil Responsável exige um vínculo ativo com pelo menos um aluno.')


@router.post('/users', status_code=201)
def create_user(data: UserInput, db: DB, user: Actor, request: Request):
    require(user, 'users.manage')
    check_schools(db, data.school_ids)
    if data.role != 'admin' and not data.school_ids:
        fail(422, 'Vincule ao menos uma escola ao usuário.')
    check_profile_link(db, data.role, data.person_id, data.school_ids)
    obj = User(name=data.name, email=str(data.email).lower(), password_hash=hash_password(data.password), role=data.role, person_id=data.person_id)
    db.add(obj); db.flush()
    for sid in set(data.school_ids):
        db.add(SchoolAccess(user_id=obj.id, school_id=sid))
    audit(db, request, user, 'users.created', obj, details={'role': obj.role})
    db.flush()
    return user_output(db, obj)

@router.patch('/users/{user_id}')
def edit_user(user_id: str, data: UserEdit, db: DB, user: Actor, request: Request):
    require(user, 'users.manage')
    obj = db.scalar(select(User).where(User.id == user_id).with_for_update())
    if not obj:
        fail(404, 'Usuário não encontrado.')
    if obj.id == user.id and (not data.active or data.role != 'admin'):
        fail(422, 'Não é permitido remover seu próprio acesso administrativo.')
    check_version(obj, data.version); check_schools(db, data.school_ids)
    if data.role != 'admin' and not data.school_ids:
        fail(422, 'Vincule ao menos uma escola ao usuário.')
    check_profile_link(db, data.role, data.person_id, data.school_ids)
    obj.name, obj.role, obj.active, obj.person_id = data.name, data.role, data.active, data.person_id
    obj.version += 1
    db.execute(delete(SchoolAccess).where(SchoolAccess.user_id == obj.id))
    for sid in set(data.school_ids):
        db.add(SchoolAccess(user_id=obj.id, school_id=sid))
    db.execute(update(AuthSession).where(AuthSession.user_id == obj.id).values(revoked=True))
    audit(db, request, user, 'users.updated', obj, details={'role': obj.role, 'active': obj.active})
    db.flush()
    return user_output(db, obj)
