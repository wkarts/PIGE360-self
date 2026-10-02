"""Usuários e perfis de acesso com fronteira explícita por instituição."""
from datetime import datetime, UTC
from fastapi import APIRouter, Request
from pydantic import Field
from sqlalchemy import select, func, update, delete
from .db import Base
from .models import SchoolAccess, School, User, AuthSession, UserProfile
from .access_models import SchoolAccessProfile
from .access_security import bind_access, permissions_for
from .schemas import Input, UserInput, UserEdit
from .security import Actor, DB, Scope, PERMISSIONS, ROLE_LABELS, check_version, fail, hash_password, lock_school, require
from .common import output, audit

router = APIRouter(prefix='/schools/{school_id}', tags=['Usuários e perfis'])
PORTAL_ROLES = {'teacher', 'student', 'guardian'}


class ProfileInput(Input):
    name: str = Field(min_length=2, max_length=100)
    description: str = Field(default='', max_length=500)
    base_role: str
    permissions: list[str] = Field(default_factory=list, max_length=100)
    active: bool = True
    version: int | None = Field(default=None, ge=1)
    reason: str = Field(default='', max_length=1000)


class AccessAction(Input):
    action: str
    version: int = Field(ge=1)
    reason: str = Field(min_length=3, max_length=1000)
    confirmation: str = Field(default='', max_length=254)


def select_school(db, user, school_id=None, school_ids=None):
    """Compatibilidade das rotas antigas sem jamais agregar instituições."""
    sid = school_id or getattr(user, '_active_school_id', None)
    requested = set(school_ids or [])
    if len(requested) > 1:
        fail(422, 'Gerencie o acesso de uma instituição por vez.')
    if not sid and requested:
        sid = next(iter(requested))
    if not sid:
        ids = list(db.scalars(select(SchoolAccess.school_id).join(School).where(SchoolAccess.user_id == user.id, SchoolAccess.active.is_(True), SchoolAccess.archived_at.is_(None), School.active.is_(True))))
        if len(ids) != 1:
            fail(422, 'Selecione a instituição ativa para gerenciar acessos.')
        sid = ids[0]
    if requested and requested != {sid}:
        fail(422, 'O acesso deve pertencer somente à instituição ativa.')
    school = db.get(School, sid)
    if not school or not school.active:
        fail(404, 'Instituição não encontrada.')
    bind_access(db, user, sid)
    return school


def manage(user):
    require(user, 'users.manage')
    if user.role not in {'admin', 'direction'}:
        fail(403, 'A gestão de acessos está disponível à administração e à direção.')


def manageable_role(actor, role):
    if role not in PERMISSIONS:
        fail(422, 'Perfil base inválido.')
    if actor.role != 'admin' and role in {'admin', 'direction'}:
        fail(403, 'Somente um administrador pode gerenciar acessos administrativos ou de direção.')


def profile_for(db, sid, profile_id, role):
    if not profile_id:
        return None
    profile = db.get(SchoolAccessProfile, profile_id)
    if not profile or profile.school_id != sid or not profile.active:
        fail(422, 'Selecione um perfil ativo desta instituição.')
    if role == 'admin' or profile.base_role != role:
        fail(422, 'O perfil de permissões deve ser compatível com o perfil base do usuário.')
    return profile


def check_grant(db, actor, sid, role, profile_id):
    profile = profile_for(db, sid, profile_id, role)
    granted = set(profile.permissions) if profile else set(PERMISSIONS.get(role, set()))
    if actor.role != 'admin' and not granted.issubset(permissions_for(actor, db, sid)):
        fail(403, 'Você não pode conceder permissões que seu próprio acesso não possui.')


def account_access(db, sid, user_id, lock=False):
    query = select(SchoolAccess).where(SchoolAccess.school_id == sid, SchoolAccess.user_id == user_id)
    access = db.scalar(query.with_for_update() if lock else query)
    obj = db.get(User, user_id)
    if not obj or not access:
        fail(404, 'Usuário não encontrado nesta instituição.')
    return obj, access


def scoped_output(db, obj, access):
    profile = db.get(SchoolAccessProfile, access.access_profile_id) if access.access_profile_id else None
    return {'id': obj.id, 'name': obj.name, 'email': obj.email, 'role': obj.role,
            'role_label': ROLE_LABELS.get(obj.role, obj.role), 'person_id': obj.person_id,
            'active': obj.active and access.active and not access.archived_at and (not profile or profile.active),
            'account_active': obj.active, 'access_active': access.active,
            'archived_at': access.archived_at.isoformat() if access.archived_at else None,
            'version': access.version, 'school_ids': [access.school_id],
            'access_profile_id': access.access_profile_id,
            'access_profile_name': profile.name if profile else ROLE_LABELS.get(obj.role, obj.role),
            'profile_active': profile.active if profile else True,
            'permissions': sorted(permissions_for(obj, db, access.school_id))}


def list_in_school(db, actor, school):
    manage(actor)
    rows = db.execute(select(User, SchoolAccess).join(SchoolAccess, SchoolAccess.user_id == User.id).where(SchoolAccess.school_id == school.id).order_by(User.name)).all()
    return [scoped_output(db, obj, access) for obj, access in rows]


@router.get('/users')
def users(db: DB, user: Actor, scope: Scope):
    return list_in_school(db, user, scope)


def create_in_school(data, db, user, request, school):
    from .auth import check_profile_link
    manage(user); manageable_role(user, data.role); lock_school(db, school.id)
    if data.school_ids and set(data.school_ids) != {school.id}:
        fail(422, 'Crie o acesso somente na instituição ativa.')
    check_grant(db, user, school.id, data.role, data.access_profile_id)
    check_profile_link(db, data.role, data.person_id, [school.id])
    if data.person_id:
        from .models import Person
        person = db.get(Person, data.person_id)
        if not person or person.school_id != school.id:
            fail(422, 'A pessoa vinculada não pertence à instituição ativa.')
    email = str(data.email).lower()
    if db.scalar(select(User.id).where(User.email == email)):
        fail(409, 'Não foi possível criar este acesso. Confira o e-mail ou solicite a revisão ao administrador.')
    obj = User(name=data.name, email=email, password_hash=hash_password(data.password), role=data.role, person_id=data.person_id)
    db.add(obj); db.flush()
    access = SchoolAccess(user_id=obj.id, school_id=school.id, access_profile_id=data.access_profile_id)
    db.add(access); db.flush()
    mailbox = None
    if data.create_mailbox:
        if user.role != 'admin':
            fail(403, 'Somente o administrador pode criar uma caixa institucional.')
        if data.mailbox_school_id and data.mailbox_school_id != school.id:
            fail(422, 'Selecione a instituição ativa para criar o e-mail.')
        from .mailcow import queue_mailbox, mailbox_output
        mailbox = queue_mailbox(db, school.id, obj, data.mailbox_local_part, data.mailbox_quota_mb)
    audit(db, request, user, 'users.created', obj, school.id, details={'role': obj.role, 'access_profile_id': access.access_profile_id})
    result = scoped_output(db, obj, access)
    if mailbox:
        result['mailbox'] = mailbox_output(db, mailbox)
    return result


@router.post('/users', status_code=201)
def create(data: UserInput, db: DB, user: Actor, request: Request, scope: Scope):
    return create_in_school(data, db, user, request, scope)


def guard_removal(db, actor, obj, access, sid):
    if obj.id == actor.id:
        fail(422, 'Não é permitido retirar ou reduzir seu próprio acesso. Solicite a outro administrador.')
    if obj.role == 'admin' and obj.active and access.active and not access.archived_at:
        other = db.scalar(select(func.count()).select_from(User).join(SchoolAccess, SchoolAccess.user_id == User.id).where(SchoolAccess.school_id == sid, SchoolAccess.active.is_(True), SchoolAccess.archived_at.is_(None), User.active.is_(True), User.role == 'admin', User.id != obj.id))
        if not other:
            fail(422, 'Mantenha pelo menos um administrador ativo nesta instituição.')


def edit_in_school(user_id, data, db, user, request, school):
    from .auth import check_profile_link
    manage(user); lock_school(db, school.id)
    obj, access = account_access(db, school.id, user_id, True)
    manageable_role(user, obj.role); manageable_role(user, data.role)
    check_version(access, data.version)
    if data.school_ids and set(data.school_ids) != {school.id}:
        fail(422, 'Edite somente o acesso da instituição ativa.')
    if access.archived_at:
        fail(422, 'Restaure este acesso antes de editar.')
    check_grant(db, user, school.id, data.role, data.access_profile_id)
    before = {'role': obj.role, 'active': access.active, 'access_profile_id': access.access_profile_id}
    sensitive = data.role != obj.role or not data.active or data.access_profile_id != access.access_profile_id
    if sensitive:
        guard_removal(db, user, obj, access, school.id)
        if len(data.reason.strip()) < 3:
            fail(422, 'Informe o motivo da alteração de acesso.')
    other_access = db.scalar(select(SchoolAccess.user_id).where(SchoolAccess.user_id == obj.id, SchoolAccess.school_id != school.id).limit(1))
    if other_access and (data.role != obj.role or data.person_id != obj.person_id or data.name != obj.name):
        fail(422, 'Esta conta também é utilizada em outra instituição. Altere aqui apenas as permissões e a situação do acesso.')
    check_profile_link(db, data.role, data.person_id, [school.id])
    if data.person_id:
        from .models import Person
        person = db.get(Person, data.person_id)
        if not person or person.school_id != school.id:
            fail(422, 'A pessoa vinculada não pertence à instituição ativa.')
    obj.name, obj.role, obj.person_id = data.name, data.role, data.person_id
    obj.version += 1
    access.active, access.access_profile_id = data.active, data.access_profile_id
    access.version += 1
    # Autorizações são calculadas no servidor a cada chamada, sem revogar sessões
    # utilizadas pela mesma conta em outras instituições.
    audit(db, request, user, 'users.access_updated', obj, school.id, details={'before': before, 'after': {'role': obj.role, 'active': access.active, 'access_profile_id': access.access_profile_id}, 'reason': data.reason.strip()})
    db.flush()
    return scoped_output(db, obj, access)


@router.patch('/users/{user_id}')
def edit(user_id: str, data: UserEdit, db: DB, user: Actor, request: Request, scope: Scope):
    return edit_in_school(user_id, data, db, user, request, scope)


def account_dependencies(db, obj, sid):
    dependencies = []
    # Inspeção das referências reais de todos os módulos registrados; não apenas
    # dos cadastros conhecidos pela tela. Sessões e perfil próprio são descartáveis.
    for table in Base.metadata.tables.values():
        if table.name in {'school_access', 'auth_sessions', 'user_profiles'}:
            continue
        for column in table.columns:
            if any(fk.target_fullname == 'users.id' for fk in column.foreign_keys):
                amount = db.scalar(select(func.count()).select_from(table).where(column == obj.id))
                if amount:
                    dependencies.append({'resource': table.name, 'count': amount})
    other = db.scalar(select(func.count()).select_from(SchoolAccess).where(SchoolAccess.user_id == obj.id, SchoolAccess.school_id != sid))
    if other:
        dependencies.append({'resource': 'outros_acessos', 'count': other})
    return dependencies


@router.get('/users/{user_id}/lifecycle')
def lifecycle_preview(user_id: str, db: DB, user: Actor, scope: Scope):
    manage(user)
    obj, access = account_access(db, scope.id, user_id)
    manageable_role(user, obj.role)
    deps = account_dependencies(db, obj, scope.id)
    return {'id': obj.id, 'name': obj.name, 'email': obj.email, 'version': access.version,
            'can_delete_account': not deps and obj.id != user.id, 'has_history': bool(deps),
            'confirmation': obj.email, 'self': obj.id == user.id}


@router.post('/users/{user_id}/lifecycle')
def lifecycle(user_id: str, data: AccessAction, db: DB, user: Actor, scope: Scope, request: Request):
    manage(user); lock_school(db, scope.id)
    obj, access = account_access(db, scope.id, user_id, True)
    manageable_role(user, obj.role); check_version(access, data.version)
    action = data.action
    if action not in {'deactivate', 'activate', 'archive', 'restore', 'delete_access', 'delete_account'}:
        fail(422, 'Operação de acesso inválida.')
    if action not in {'activate', 'restore'}:
        guard_removal(db, user, obj, access, scope.id)
    if action in {'delete_access', 'delete_account'} and data.confirmation != obj.email:
        fail(422, 'Digite o e-mail do usuário para confirmar a exclusão definitiva.')
    if action in {'activate', 'restore'}:
        if not obj.active:
            other = db.scalar(select(SchoolAccess.user_id).where(SchoolAccess.user_id == obj.id, SchoolAccess.school_id != scope.id).limit(1))
            if other:
                fail(422, 'A conta foi inativada globalmente e possui outros vínculos. Solicite a revisão ao administrador da instalação.')
            obj.active = True
            obj.version += 1
        check_grant(db, user, scope.id, obj.role, access.access_profile_id)
        access.active = True; access.archived_at = None
    elif action == 'deactivate':
        access.active = False
    elif action == 'archive':
        access.active = False; access.archived_at = datetime.now(UTC)
    elif action == 'delete_account':
        if user.role != 'admin':
            fail(403, 'Somente o administrador pode excluir uma conta definitivamente.')
        # Serializa exclusões globais da mesma conta além do lock da instituição.
        db.scalar(select(User).where(User.id == obj.id).with_for_update())
        if account_dependencies(db, obj, scope.id):
            fail(409, 'Há histórico ou outros vínculos associados. Exclua somente o acesso desta instituição ou arquive-o.')
        from .models import MFACredential, MFAChallenge, MFARecovery
        subject = 'user:' + obj.id
        db.execute(delete(MFARecovery).where(MFARecovery.subject == subject))
        db.execute(delete(MFAChallenge).where(MFAChallenge.subject == subject))
        db.execute(delete(MFACredential).where(MFACredential.subject == subject))
        db.execute(delete(AuthSession).where(AuthSession.user_id == obj.id))
        db.execute(delete(UserProfile).where(UserProfile.user_id == obj.id))
        db.delete(access); db.flush()
        db.delete(obj)
    else:
        db.delete(access)
    if action not in {'delete_access', 'delete_account'}:
        access.version += 1
    audit(db, request, user, 'users.' + action, obj, scope.id, details={'reason': data.reason.strip(), 'scope': 'account' if action == 'delete_account' else 'institution_access'})
    db.flush()
    return {'id': user_id, 'action': action, 'message': 'Acesso atualizado.' if action not in {'delete_account', 'delete_access'} else 'Exclusão concluída.'}


PERMISSION_GROUPS = {
    'read': ('Geral', 'Acessar o sistema'), 'dashboard.read': ('Geral', 'Visualizar painel'),
    'users.manage': ('Administração', 'Gerenciar usuários e acessos'), 'schools.manage': ('Administração', 'Gerenciar instituição'),
    'integrations.manage': ('Administração', 'Configurar integrações'), 'connect.manage': ('Administração', 'Gerenciar WhatsApp'),
    'audit.read': ('Administração', 'Consultar auditoria'), 'profile.read': ('Conta', 'Consultar perfil'), 'profile.self': ('Conta', 'Atualizar próprio perfil'),
}
RESOURCE_LABELS = {'people':'Pessoas','students':'Alunos','guardians':'Responsáveis','academic':'Estrutura acadêmica','enrollments':'Matrículas','documents':'Documentos','protocols':'Protocolos','reports':'Relatórios','admissions':'Inscrições online','banking':'Cobranças','communications':'Comunicação','teacher':'Portal do professor','student':'Portal do aluno','guardian':'Portal do responsável','staff':'Equipe escolar','diary':'Diário escolar'}
ACTION_LABELS = {'read':'Consultar','write':'Cadastrar e editar','manage':'Gerenciar','validate':'Validar','waive':'Dispensar pendência','generate':'Gerar documentos','send':'Enviar','attendance':'Lançar presença','assessments':'Lançar avaliações','review':'Revisar','close':'Fechar período','reopen':'Reabrir período','reports':'Emitir relatórios','configure':'Configurar'}


@router.get('/access-profiles/catalog')
def profile_catalog(db: DB, user: Actor, scope: Scope):
    manage(user)
    actor_permissions = permissions_for(user, db, scope.id)
    roles = {role: {'label': label, 'permissions': sorted(PERMISSIONS[role].intersection(actor_permissions))} for role, label in ROLE_LABELS.items() if role != 'admin' and (user.role == 'admin' or role != 'direction')}
    permissions = []
    for permission in sorted(set().union(*(set(v['permissions']) for v in roles.values()))):
        parts = permission.split('.')
        group, label = PERMISSION_GROUPS.get(permission, (RESOURCE_LABELS.get(parts[0], parts[0]), ACTION_LABELS.get(parts[-1], 'Consultar') + (' turmas' if 'classes' in parts else ' alunos' if 'students' in parts else ' atribuições' if 'assignments' in parts else ' próprios dados' if 'self' in parts else '')))
        permissions.append({'id': permission, 'group': group, 'label': label})
    return {'roles': roles, 'permissions': permissions, 'can_manage_admin': user.role == 'admin'}


def profile_output(db, obj):
    return {**output(obj), 'base_role_label': ROLE_LABELS.get(obj.base_role, obj.base_role),
            'users_count': db.scalar(select(func.count()).select_from(SchoolAccess).where(SchoolAccess.access_profile_id == obj.id))}


@router.get('/access-profiles')
def profile_list(db: DB, user: Actor, scope: Scope):
    manage(user)
    return [profile_output(db, p) for p in db.scalars(select(SchoolAccessProfile).where(SchoolAccessProfile.school_id == scope.id).order_by(SchoolAccessProfile.name))]


def validate_profile(data, user):
    if len(data.name.strip()) < 2:
        fail(422, 'Informe um nome de perfil com pelo menos dois caracteres.')
    manageable_role(user, data.base_role)
    if data.base_role == 'admin':
        fail(422, 'O perfil Administrador é protegido e não pode ser personalizado.')
    allowed = PERMISSIONS[data.base_role]
    if not set(data.permissions).issubset(allowed):
        fail(422, 'Selecione apenas permissões disponíveis no perfil base.')
    if user.role != 'admin' and not set(data.permissions).issubset(permissions_for(user)):
        fail(403, 'Você não pode conceder permissões que seu próprio acesso não possui.')
    if not data.permissions:
        fail(422, 'Selecione pelo menos uma permissão.')


@router.post('/access-profiles', status_code=201)
def profile_create(data: ProfileInput, db: DB, user: Actor, scope: Scope, request: Request):
    manage(user); validate_profile(data, user)
    obj = SchoolAccessProfile(school_id=scope.id, name=data.name.strip(), description=data.description.strip(), base_role=data.base_role, permissions=sorted(set(data.permissions)), active=data.active)
    db.add(obj); db.flush()
    audit(db, request, user, 'access_profiles.created', obj, scope.id, details={'permissions': obj.permissions, 'base_role': obj.base_role})
    return profile_output(db, obj)


@router.patch('/access-profiles/{profile_id}')
def profile_edit(profile_id: str, data: ProfileInput, db: DB, user: Actor, scope: Scope, request: Request):
    manage(user); validate_profile(data, user); lock_school(db, scope.id)
    obj = db.scalar(select(SchoolAccessProfile).where(SchoolAccessProfile.id == profile_id, SchoolAccessProfile.school_id == scope.id).with_for_update())
    if not obj:
        fail(404, 'Perfil não encontrado nesta instituição.')
    manageable_role(user, obj.base_role)
    check_version(obj, data.version)
    own = db.get(SchoolAccess, (user.id, scope.id))
    if own and own.access_profile_id == obj.id:
        fail(422, 'Solicite a outro administrador a alteração do seu perfil de acesso.')
    if len(data.reason.strip()) < 3:
        fail(422, 'Informe o motivo da alteração do perfil.')
    assigned = db.scalar(select(func.count()).select_from(SchoolAccess).where(SchoolAccess.access_profile_id == obj.id))
    if assigned and data.base_role != obj.base_role:
        fail(409, 'Remova os vínculos deste perfil antes de mudar seu perfil base.')
    before = {'permissions': obj.permissions, 'active': obj.active, 'base_role': obj.base_role}
    obj.name, obj.description, obj.base_role = data.name.strip(), data.description.strip(), data.base_role
    obj.permissions, obj.active = sorted(set(data.permissions)), data.active
    obj.version += 1
    audit(db, request, user, 'access_profiles.updated', obj, scope.id, details={'before': before, 'after': {'permissions': obj.permissions, 'active': obj.active, 'base_role': obj.base_role}, 'reason': data.reason.strip()})
    db.flush()
    return profile_output(db, obj)


@router.post('/access-profiles/{profile_id}/delete')
def profile_delete(profile_id: str, data: AccessAction, db: DB, user: Actor, scope: Scope, request: Request):
    manage(user); lock_school(db, scope.id)
    obj = db.scalar(select(SchoolAccessProfile).where(SchoolAccessProfile.id == profile_id, SchoolAccessProfile.school_id == scope.id).with_for_update())
    if not obj:
        fail(404, 'Perfil não encontrado nesta instituição.')
    manageable_role(user, obj.base_role); check_version(obj, data.version)
    if data.action != 'delete' or data.confirmation != obj.name:
        fail(422, 'Digite o nome do perfil para confirmar a exclusão.')
    if db.scalar(select(SchoolAccess.user_id).where(SchoolAccess.access_profile_id == obj.id).limit(1)):
        fail(409, 'Este perfil ainda está atribuído a usuários. Troque os perfis vinculados ou desative-o.')
    audit(db, request, user, 'access_profiles.deleted', obj, scope.id, details={'reason': data.reason.strip()})
    db.delete(obj); db.flush()
    return {'deleted': True}
