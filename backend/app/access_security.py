"""Autorização por instituição; perfis personalizados só restringem o papel base."""
from sqlalchemy.orm import object_session
from .models import SchoolAccess
from .access_models import SchoolAccessProfile


def bind_access(db, user, school_id):
    from .security import fail
    access = db.get(SchoolAccess, (user.id, school_id))
    if not access or not access.active or access.archived_at:
        fail(403, 'Seu acesso a esta instituição está indisponível.')
    if access.access_profile_id:
        profile = db.get(SchoolAccessProfile, access.access_profile_id)
        if not profile or profile.school_id != school_id or not profile.active or profile.base_role != user.role:
            fail(403, 'O perfil de acesso desta instituição está indisponível. Solicite a revisão ao administrador.')
    user._active_school_id = school_id
    return access


def permissions_for(user, db=None, school_id=None):
    from .security import PERMISSIONS
    base = set(PERMISSIONS.get(user.role, set()))
    sid = school_id or getattr(user, '_active_school_id', None)
    db = db or object_session(user)
    if not sid or db is None:
        return base
    access = db.get(SchoolAccess, (user.id, sid))
    if not access or not access.active or access.archived_at:
        return set()
    if not access.access_profile_id:
        return base
    profile = db.get(SchoolAccessProfile, access.access_profile_id)
    if not profile or profile.school_id != sid or not profile.active or profile.base_role != user.role:
        return set()
    # Nunca transformar um perfil personalizado em administrador da instalação.
    if user.role == 'admin':
        return set()
    return base.intersection(profile.permissions)
