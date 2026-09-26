"""Ficha única transacional. Reutiliza pessoas, perfis e GuardianLink históricos.

Uma relação é gravada uma vez e lida a partir de qualquer lado. Tipos de pessoa
não concedem acesso de usuário e parentesco não concede responsabilidades.
"""
from typing import Literal
from fastapi import APIRouter, Query, Request, File, Form, UploadFile
from pydantic import Field, model_validator
from sqlalchemy import or_, select, func
from . import models as m, schemas as s, people
from .common import output
from .security import Actor, DB, Scope, check_version, fail, lock_school, require, scoped
from .registry import validate

router = APIRouter(prefix='/api/v1/schools/{school_id}', tags=['Ficha única e família'])
PROFILES = {'student': (m.Student,s.StudentData,s.StudentInput,people.create_student,people.update_student),
            'teacher': (m.TeacherProfile,s.TeacherData,s.TeacherInput,people.create_teacher,people.update_teacher),
            'employee': (m.EmployeeProfile,s.EmployeeData,s.EmployeeInput,people.create_employee,people.update_employee)}


class ProfileEdit(s.Input):
    version: int | None = Field(default=None, ge=1)
    data: dict = Field(default_factory=dict)


class FamilyEdit(s.Input):
    link_id: str | None = None
    version: int | None = Field(default=None, ge=1)
    direction: Literal['guardian','student']
    person_id: str | None = None
    new_person: s.PersonInput | None = None
    relationship: str = Field(min_length=2, max_length=60)
    legal: bool = False
    financial: bool = False
    pickup: bool = False
    primary_contact: bool = False
    active: bool = True

    @model_validator(mode='after')
    def identity(self):
        if self.link_id:
            if not self.version or self.new_person:
                raise ValueError('Vínculo existente exige versão e não aceita nova identidade.')
        elif bool(self.person_id) == bool(self.new_person):
            raise ValueError('Selecione a pessoa existente ou cadastre uma nova pessoa.')
        return self


class DossierInput(s.Input):
    person_id: str | None = None
    version: int | None = Field(default=None, ge=1)
    person: dict
    profiles: dict[Literal['student','teacher','employee'],ProfileEdit] = Field(default_factory=dict)
    family: list[FamilyEdit] = Field(default_factory=list, max_length=50)


def profile_data(db, person):
    profiles={}
    for kind,(model,_,_,_,_) in PROFILES.items():
        obj=db.scalar(select(model).where(model.person_id==person.id,model.school_id==person.school_id))
        if obj:profiles[kind]=output(obj)
    return profiles


def family_page(db, person, page=1):
    student_id=db.scalar(select(m.Student.id).where(m.Student.person_id==person.id,m.Student.school_id==person.school_id))
    criteria=[m.GuardianLink.school_id==person.school_id,
              or_(m.GuardianLink.person_id==person.id, m.GuardianLink.student_id==student_id if student_id else False)]
    stmt=select(m.GuardianLink).where(*criteria)
    total=db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows=db.scalars(stmt.order_by(m.GuardianLink.created_at,m.GuardianLink.id).offset((page-1)*50).limit(50)).all()
    items=[]
    for link in rows:
        pupil=db.get(m.Student,link.student_id)
        direction='guardian' if pupil.person_id==person.id else 'student'
        peer=db.get(m.Person,link.person_id if direction=='guardian' else pupil.person_id)
        items.append({**output(link),'direction':direction,'peer':{'id':peer.id,'name':peer.name,'phone':peer.phone,'cpf':peer.cpf},'student_number':pupil.number})
    return {'items':items,'total':total,'page':page,'page_size':50}


@router.get('/persons/{person_id}/dossier')
def read_dossier(person_id:str,db:DB,user:Actor,school:Scope):
    require(user,'people.read')
    person=scoped(db,m.Person,person_id,school.id)
    return {'person':people.person_output(db,person),'profiles':profile_data(db,person),'family':family_page(db,person)}


@router.get('/persons/{person_id}/family')
def read_family(person_id:str,db:DB,user:Actor,school:Scope,page:int=Query(default=1,ge=1)):
    require(user,'people.read')
    return family_page(db,scoped(db,m.Person,person_id,school.id),page)


def ensure_student(db, person, user, school, request):
    obj=db.scalar(select(m.Student).where(m.Student.person_id==person.id,m.Student.school_id==school.id))
    if not obj:
        data=people.create_student(s.StudentInput(person_id=person.id),db,user,school,request)
        obj=db.get(m.Student,data['id'])
    return obj


def save_family(db, person, change, user, school, request):
    if person.entity_kind!='individual':fail(422,'Vínculos familiares exigem pessoa física.')
    if change.link_id:
        link=scoped(db,m.GuardianLink,change.link_id,school.id)
        student=scoped(db,m.Student,link.student_id,school.id)
        if (change.direction=='guardian' and student.person_id!=person.id) or (change.direction=='student' and link.person_id!=person.id):
            fail(404,'Este vínculo não pertence à pessoa em edição.')
        if change.person_id and change.person_id!=(link.person_id if change.direction=='guardian' else student.person_id):
            fail(422,'Para trocar a pessoa, desative este vínculo e adicione outro.')
        values=s.GuardianInput(person_id=link.person_id,**change.model_dump(exclude={'link_id','version','direction','person_id','new_person'}))
        people.edit_guardian(student.id,link.id,s.Edit(version=change.version,data=values.model_dump()),db,user,school,request)
        return
    if change.new_person:
        if change.new_person.entity_kind!='individual':fail(422,'Familiar/aluno deve ser pessoa física.')
        created=people.create_person(change.new_person,db,user,school,request)
        peer=db.get(m.Person,created['id'])
    else:peer=scoped(db,m.Person,change.person_id,school.id)
    if not peer.active:fail(422,'A pessoa selecionada está inativa.')
    if change.direction=='guardian':
        student=ensure_student(db,person,user,school,request);guardian=peer
    else:
        # Só uma nova pessoa pode ganhar cadastro de aluno implicitamente neste
        # atalho. Para uma pessoa existente, a seleção é do cadastro de Alunos.
        student=db.scalar(select(m.Student).where(m.Student.person_id==peer.id,m.Student.school_id==school.id))
        if not student and not change.new_person:fail(422,'Selecione um aluno cadastrado ou cadastre um novo aluno.')
        student=student or ensure_student(db,peer,user,school,request);guardian=person
    existing=db.scalar(select(m.GuardianLink).where(m.GuardianLink.student_id==student.id,m.GuardianLink.person_id==guardian.id))
    if existing:fail(409,'O vínculo já existe. Edite ou reative o registro existente.')
    values=s.GuardianInput(person_id=guardian.id,**change.model_dump(exclude={'link_id','version','direction','person_id','new_person'}))
    people.add_guardian(student.id,values,db,user,school,request)


@router.post('/person-dossiers')
def save_dossier(data:DossierInput,db:DB,user:Actor,school:Scope,request:Request):
    require(user,'people.write');lock_school(db,school.id)
    if data.person_id:
        person=scoped(db,m.Person,data.person_id,school.id)
        if not data.version:fail(422,'Informe a versão do cadastro.')
        check_version(person,data.version)
        for change in data.family:
            if change.link_id and not change.active:save_family(db,person,change,user,school,request)
        people.update_person(person.id,s.Edit(version=data.version,data=data.person),db,user,school,request)
    else:
        result=people.create_person(validate(s.PersonInput,data.person),db,user,school,request)
        person=db.get(m.Person,result['id'])
    desired=people.active_person_types(db,person.id)|people.derived_person_types(db,person.id)
    for kind,(model,validator,input_cls,create_fn,update_fn) in PROFILES.items():
        obj=db.scalar(select(model).where(model.person_id==person.id,model.school_id==school.id))
        change=data.profiles.get(kind)
        if not obj and kind in desired:
            profile_values=validate(validator,change.data if change else {}).model_dump()
            create_fn(input_cls(person_id=person.id,**profile_values),db,user,school,request)
        elif change:
            if not obj:fail(422,'Selecione o tipo correspondente aos dados específicos.')
            if change.version is None:fail(409,'Recarregue a ficha específica antes de editar.')
            current={key:getattr(obj,key) for key in validator.model_fields}
            update_fn(obj.id,s.Edit(version=change.version,data={**current,**change.data}),db,user,school,request)
    for change in data.family:
        if data.person_id and change.link_id and not change.active:continue
        save_family(db,person,change,user,school,request)
    db.flush()
    # Mesmo commit do cadastro: rollback integral se qualquer perfil/vínculo falha.
    return {'person':people.person_output(db,person),'profiles':profile_data(db,person),'family':family_page(db,person)}


@router.post('/person-dossiers/with-photo')
def save_with_photo(db:DB,user:Actor,school:Scope,request:Request,
                    payload:str=Form(...),file:UploadFile=File(...)):
    from pydantic import ValidationError
    try:data=DossierInput.model_validate_json(payload)
    except ValidationError:fail(422,'Revise os campos da ficha cadastral e dos vínculos.')
    result=save_dossier(data,db,user,school,request)
    result['person']=people.upload_photo(result['person']['id'],db,user,school,request,file)
    return result
