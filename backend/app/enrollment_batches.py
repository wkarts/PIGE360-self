"""Lotes auditados de matrículas existentes, com simulação sem escrita e retomada por item."""
import hashlib
import json
from datetime import date
from fastapi import APIRouter, HTTPException, Request
from pydantic import Field
from sqlalchemy import ForeignKey, JSON, String, UniqueConstraint, select
from sqlalchemy.orm import Mapped, mapped_column
from . import models as m, schemas as s
from .db import Base, Record
from .common import audit, output
from .security import Actor, DB, Scope, fail, lock_school, require, scoped
from .enrollments import create_record, check_group, activation_validation, movement
from .lifecycle_models import require_available

router=APIRouter(prefix='/api/v1/schools/{school_id}/enrollment-batches',tags=['Matrículas em lote'])


class EnrollmentBatch(Record,Base):
    __tablename__='enrollment_batches'
    school_id:Mapped[str]=mapped_column(ForeignKey('schools.id'),index=True)
    created_by:Mapped[str]=mapped_column(ForeignKey('users.id'))
    client_key:Mapped[str]=mapped_column(String(80))
    input_hash:Mapped[str]=mapped_column(String(64))
    payload:Mapped[dict]=mapped_column(JSON)
    results:Mapped[list]=mapped_column(JSON,default=list)
    status:Mapped[str]=mapped_column(String(24),default='pending')
    __table_args__=(UniqueConstraint('school_id','client_key'),)


class BatchItem(s.Input):
    student_id:str=Field(min_length=1,max_length=36)
    class_group_id:str=Field(min_length=1,max_length=36)
    financial_person_id:str|None=None


class PlanInput(s.Input):
    academic_year_id:str=Field(min_length=1,max_length=36)
    enrolled_on:date
    items:list[BatchItem]=Field(min_length=1,max_length=100)
    activate:bool=False


class ConfirmInput(PlanInput):
    preview_hash:str=Field(pattern=r'^[0-9a-f]{64}$')
    client_key:str=Field(min_length=12,max_length=80)


def fingerprint(data):
    return hashlib.sha256(json.dumps(data,sort_keys=True,ensure_ascii=True,default=str).encode()).hexdigest()


def plan(db,school,data):
    year=scoped(db,m.AcademicYear,data.academic_year_id,school.id);require_available(db,year)
    if year.status!='active':fail(409,'Selecione um período aberto.')
    rows=[];seen=set();versions=[];reserved={}
    for index,item in enumerate(data.items):
        row={'index':index,'student_id':item.student_id,'class_group_id':item.class_group_id,'status':'eligible','reason':'','student_name':'','warnings':[]}
        try:
            student=scoped(db,m.Student,item.student_id,school.id);require_available(db,student)
            person=scoped(db,m.Person,student.person_id,school.id);require_available(db,person)
            group=scoped(db,m.ClassGroup,item.class_group_id,school.id);check_group(db,group,school.id)
            row['student_name']=person.name;row['class_name']=group.name
            if student.status!='active':fail(409,'Cadastro do aluno arquivado.')
            if group.academic_year_id!=year.id:fail(422,'Turma de outro período letivo.')
            if item.student_id in seen:fail(409,'Aluno repetido na seleção.')
            seen.add(item.student_id)
            existing=db.scalar(select(m.Enrollment).where(m.Enrollment.activation_key==f'{school.id}:{student.id}:{year.id}'))
            if existing:fail(409,'Já existe matrícula neste período. Retome a matrícula existente.')
            links=list(db.scalars(select(m.GuardianLink).where(m.GuardianLink.student_id==student.id,m.GuardianLink.school_id==school.id,m.GuardianLink.active.is_(True)).order_by(m.GuardianLink.id)))
            if item.financial_person_id:
                scoped(db,m.Person,item.financial_person_id,school.id)
                if item.financial_person_id!=student.person_id and not any(g.person_id==item.financial_person_id and g.financial for g in links):fail(422,'Responsável financeiro sem vínculo ativo.')
            if not any(g.legal for g in links):row['warnings'].append('Confira o responsável legal antes da efetivação.')
            if not item.financial_person_id:row['warnings'].append('Responsável financeiro não definido; cobrança depende de vínculo válido.')
            from .registry import occupancy
            occupied=occupancy(db,group.id)
            if occupied>=group.capacity:row['warnings'].append('Turma sem vaga para efetivação; esta simulação não reserva lugar.')
            if data.activate:
                candidate=m.Enrollment(id='preview-only',school_id=school.id,student_id=student.id,class_group_id=group.id,academic_year_id=year.id,status='draft')
                activation_validation(db,school,candidate,group)
                if occupied+reserved.get(group.id,0)>=group.capacity:fail(409,'Capacidade insuficiente para os alunos selecionados.')
                reserved[group.id]=reserved.get(group.id,0)+1
            versions.append([student.id,student.version,person.version,group.version,year.version,occupied,[(g.id,g.version) for g in links]])
        except HTTPException as error:
            row['status']='blocked';row['reason']=str(error.detail)
        rows.append(row)
    snapshot={'payload':data.model_dump(mode='json'),'rows':rows,'versions':versions}
    return {'rows':rows,'preview_hash':fingerprint(snapshot),'eligible':sum(r['status']=='eligible' for r in rows),'blocked':sum(r['status']=='blocked' for r in rows),'academic_year':year.name,'effect':'Matrículas efetivadas após validar requisitos.' if data.activate else 'Matrículas em preparação. Nenhuma cobrança, assinatura ou comunicação será enviada.'}


@router.post('/preview')
def preview(data:PlanInput,db:DB,user:Actor,school:Scope):
    require(user,'enrollments.write')
    return plan(db,school,data)


@router.post('',status_code=201)
def confirm(data:ConfirmInput,db:DB,user:Actor,school:Scope,request:Request):
    require(user,'enrollments.write');lock_school(db,school.id)
    payload=data.model_dump(mode='json',exclude={'preview_hash','client_key'});digest=fingerprint(payload)
    existing=db.scalar(select(EnrollmentBatch).where(EnrollmentBatch.school_id==school.id,EnrollmentBatch.client_key==data.client_key))
    if existing:
        if existing.input_hash!=digest:fail(409,'A chave já foi usada com outra seleção.')
        return output(existing)
    checked=plan(db,school,PlanInput(**payload))
    if checked['preview_hash']!=data.preview_hash:fail(409,'Os dados mudaram. Faça nova simulação antes de confirmar.')
    if checked['blocked']:fail(409,'Remova ou corrija os itens bloqueados antes de confirmar.')
    row=EnrollmentBatch(school_id=school.id,created_by=user.id,client_key=data.client_key,input_hash=digest,payload=payload,results=[])
    db.add(row);db.flush();audit(db,request,user,'enrollment_batch.confirmed',row,school.id,{'count':len(data.items)})
    return output(row)


@router.get('')
def history(db:DB,user:Actor,school:Scope):
    require(user,'enrollments.read')
    return {'items':[output(row) for row in db.scalars(select(EnrollmentBatch).where(EnrollmentBatch.school_id==school.id).order_by(EnrollmentBatch.created_at.desc()).limit(50))]}


@router.get('/{id}')
def detail(id:str,db:DB,user:Actor,school:Scope):
    require(user,'enrollments.read');return output(scoped(db,EnrollmentBatch,id,school.id))


@router.post('/{id}/process')
def process(id:str,db:DB,user:Actor,school:Scope,request:Request):
    require(user,'enrollments.write');lock_school(db,school.id)
    row=scoped(db,EnrollmentBatch,id,school.id)
    if row.status=='cancelled':fail(409,'Lote cancelado. Matrículas já concluídas permanecem preservadas.')
    if row.status=='completed':return output(row)
    data=PlanInput(**row.payload);results=list(row.results)
    done={r['index'] for r in results if r['status']=='completed'}
    for index,item in [(i,item) for i,item in enumerate(data.items) if i not in done][:20]:
        result={'index':index,'student_id':item.student_id,'status':'failed','reason':''}
        try:
            with db.begin_nested():
                checked=plan(db,school,PlanInput(academic_year_id=data.academic_year_id,enrolled_on=data.enrolled_on,items=[item],activate=data.activate))
                if checked['blocked']:fail(409,checked['rows'][0]['reason'])
                enrollment=create_record(s.EnrollmentInput(**item.model_dump(),enrolled_on=data.enrolled_on),school,db,user,request)
                if data.activate:
                    movement(enrollment.id,s.MovementInput(version=enrollment.version,action='activate',reason='Efetivação em lote explicitamente confirmada.'),db,user,school,request)
                result.update(status='completed',enrollment_id=enrollment.id,academic_status=enrollment.status)
        except HTTPException as error:result['reason']=str(error.detail)
        results=[r for r in results if r['index']!=index]+[result]
    row.results=sorted(results,key=lambda r:r['index'])
    completed=sum(r['status']=='completed' for r in results)
    row.status='completed' if completed==len(data.items) else 'partial' if completed else 'failed'
    row.version+=1;db.flush();audit(db,request,user,'enrollment_batch.processed',row,school.id,{'completed':completed,'total':len(data.items)})
    return output(row)


@router.post('/{id}/cancel')
def cancel(id:str,db:DB,user:Actor,school:Scope,request:Request):
    require(user,'enrollments.write');lock_school(db,school.id)
    row=scoped(db,EnrollmentBatch,id,school.id)
    if row.status=='completed':fail(409,'Lote concluído. Movimentações devem ser feitas nas matrículas individuais.')
    if row.status!='cancelled':
        previous={item['index']:item for item in row.results}
        row.results=[previous[index] if previous.get(index,{}).get('status')=='completed' else {'index':index,'student_id':item['student_id'],'status':'cancelled','reason':'Item cancelado pelo operador; nenhuma matrícula criada por este item.','previous_reason':previous.get(index,{}).get('reason','')} for index,item in enumerate(row.payload['items'])]
        row.status='cancelled';row.version+=1;db.flush()
        audit(db,request,user,'enrollment_batch.cancelled',row,school.id,{'preserved':len([r for r in row.results if r['status']=='completed'])})
    return output(row)


@router.get('/{id}/result.csv')
def export_result(id:str,db:DB,user:Actor,school:Scope):
    require(user,'enrollments.read')
    from fastapi.responses import Response
    import csv,io
    row=scoped(db,EnrollmentBatch,id,school.id);out=io.StringIO();writer=csv.writer(out,delimiter=';')
    writer.writerow(['Item','Aluno','Matrícula','Resultado','Motivo'])
    def cell(value):
        text=str(value or '')
        return "'"+text if text.lstrip().startswith(('=','+','-','@')) else text
    for item in row.results:
        student=scoped(db,m.Student,item['student_id'],school.id);person=scoped(db,m.Person,student.person_id,school.id)
        enrollment=scoped(db,m.Enrollment,item['enrollment_id'],school.id) if item.get('enrollment_id') else None
        writer.writerow([item['index']+1,cell(person.name),enrollment.number if enrollment else '',{'completed':'Concluído','failed':'Pendente','cancelled':'Cancelado'}.get(item['status'],item['status']),cell(item.get('reason',''))])
    return Response('\ufeff'+out.getvalue(),media_type='text/csv',headers={'Content-Disposition':'attachment; filename="resultado-matriculas.csv"','Cache-Control':'no-store'})
