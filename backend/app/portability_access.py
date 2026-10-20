"""Habilitação visual em produção e delegação explícita por escola."""
from fastapi import APIRouter, Request
from pydantic import Field
from sqlalchemy import select
from . import models as m
from .admin_tools import portability_enabled, require_admin, require_portability
from .common import audit
from .schemas import Input
from .security import Actor, DB, Scope, check_version, fail, lock_school

router=APIRouter(prefix='/api/v1/schools/{school_id}/portability-access',tags=['Portabilidade'])


class Policy(Input):
    enabled: bool
    version: int=Field(ge=1)


class Grant(Input):
    enabled: bool
    version: int=Field(ge=1)


@router.get('')
def policy(db:DB,user:Actor,school:Scope):
    if user.role!='admin':require_portability(user)
    installation=db.get(m.Installation,1)
    rows=db.execute(select(m.User,m.SchoolAccess).join(m.SchoolAccess,m.SchoolAccess.user_id==m.User.id).where(
        m.SchoolAccess.school_id==school.id,m.SchoolAccess.active.is_(True),m.SchoolAccess.archived_at.is_(None),
        m.User.active.is_(True),m.User.role.in_(['direction','coordination','secretary']))).all() if user.role=='admin' else []
    return {'enabled':portability_enabled(db),'version':installation.portability_version,'can_manage':user.role=='admin',
        'grants':[{'user_id':u.id,'name':u.name,'role':u.role,'enabled':a.portability_granted,'version':a.version} for u,a in rows]}


@router.put('')
def configure(data:Policy,db:DB,user:Actor,school:Scope,request:Request):
    require_admin(user)
    obj=db.scalar(select(m.Installation).where(m.Installation.id==1).with_for_update())
    if obj.portability_version!=data.version:fail(409,'A configuração foi alterada. Recarregue antes de salvar.')
    obj.portability_enabled=data.enabled;obj.portability_version+=1
    audit(db,request,user,'portability.policy_changed',school,school.id,{'enabled':data.enabled})
    return {'enabled':data.enabled,'version':obj.portability_version}


@router.put('/users/{user_id}')
def delegate(user_id:str,data:Grant,db:DB,user:Actor,school:Scope,request:Request):
    require_admin(user);lock_school(db,school.id)
    target=db.get(m.User,user_id);access=db.get(m.SchoolAccess,(user_id,school.id))
    if not target or not target.active or target.role not in {'direction','coordination','secretary'} or not access or not access.active or access.archived_at:
        fail(422,'Selecione um usuário administrativo com vínculo ativo nesta escola.')
    check_version(access,data.version)
    access.portability_granted=data.enabled;access.version+=1
    audit(db,request,user,'portability.grant_changed',target,school.id,{'enabled':data.enabled})
    return {'user_id':target.id,'enabled':access.portability_granted,'version':access.version}
