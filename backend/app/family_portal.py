"""Superfície privada de alunos e responsáveis; vínculos revalidados a cada acesso."""
import hashlib
from fastapi import APIRouter, Request
from fastapi.responses import Response
from sqlalchemy import select
from . import models as m
from .common import audit
from .learning_portal import own_profile_students
from .profiles import student_summary
from .security import Actor, DB, fail
from .storage import read_bytes

router=APIRouter(prefix='/api/v1/family',tags=['Portal privado escolar'])


def students(db,user):return own_profile_students(db,user)


def own_student(db,user,ident):
    row=next((s for s in students(db,user) if s.id==ident),None)
    if not row:fail(404,'Aluno não disponível para este acesso.')
    return row


def may_finance(db,user,student):
    # Dados financeiros seguem o vínculo financeiro explícito. Aluno menor não os herda.
    if user.role!='guardian':return False
    return bool(db.scalar(select(m.GuardianLink.id).where(m.GuardianLink.student_id==student.id,m.GuardianLink.person_id==user.person_id,m.GuardianLink.school_id==student.school_id,m.GuardianLink.active.is_(True),m.GuardianLink.financial.is_(True))))


@router.get('/context')
def context(db:DB,user:Actor):
    result=[]
    for student in students(db,user):
        item=student_summary(db,student,student.school_id,include_documents=True)
        item['financial_authorized']=may_finance(db,user,student)
        result.append(item)
    schools=db.execute(select(m.School.id,m.School.name).join(m.SchoolAccess,m.SchoolAccess.school_id==m.School.id).where(m.SchoolAccess.user_id==user.id,m.SchoolAccess.active.is_(True),m.SchoolAccess.archived_at.is_(None),m.School.active.is_(True)).order_by(m.School.name)).all()
    return {'schools':[{'id':ident,'name':name} for ident,name in schools],'role':user.role,'name':user.name,'students':result,'note':'Inscrição online utiliza a conta de inscrição já existente. Não compartilha automaticamente sua senha de acesso escolar.'}


@router.get('/students/{student_id}/charges')
def charges(student_id:str,db:DB,user:Actor):
    student=own_student(db,user,student_id)
    if not may_finance(db,user,student):fail(403,'Vínculo financeiro não autorizado.')
    ids=select(m.Enrollment.id).where(m.Enrollment.student_id==student.id,m.Enrollment.school_id==student.school_id)
    rows=db.scalars(select(m.BankCharge).where(m.BankCharge.school_id==student.school_id,m.BankCharge.enrollment_id.in_(ids)).order_by(m.BankCharge.due_on.desc()).limit(200))
    return {'items':[{'id':r.id,'description':r.description,'amount':str(r.amount),'due_on':r.due_on,'status':r.status,'collection_mode':r.collection_mode} for r in rows], 'note':'Somente cobranças registradas para estas matrículas. O status exibido não executa cobrança ou baixa.'}


@router.get('/students/{student_id}/documents/{document_id}')
def document(student_id:str,document_id:str,db:DB,user:Actor,request:Request):
    student=own_student(db,user,student_id)
    doc=db.scalar(select(m.StudentDocument).where(m.StudentDocument.id==document_id,m.StudentDocument.student_id==student.id,m.StudentDocument.school_id==student.school_id,m.StudentDocument.status!='archived'))
    file=db.get(m.FileRecord,doc.file_id) if doc and doc.file_id else None
    if not file or file.school_id!=student.school_id:fail(404,'Documento indisponível.')
    data=read_bytes(file)
    if hashlib.sha256(data).hexdigest()!=file.sha256:fail(409,'Integridade do documento divergente.')
    audit(db,request,user,'family.document_downloaded',doc,student.school_id)
    return Response(data,media_type=file.mime_type,headers={'Cache-Control':'no-store','Content-Disposition':'attachment; filename="documento-escolar"','X-Content-Type-Options':'nosniff'})
