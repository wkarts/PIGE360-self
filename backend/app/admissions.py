"""Operação interna das inscrições: análise, conciliação cadastral e efetivação auditada."""
from datetime import date
from fastapi import APIRouter, Query, Request
from sqlalchemy import func, select
from . import models as m, schemas, online_schemas as s
from .common import audit, output, number
from .security import DB, Actor, Scope, scoped, require, fail, check_version, lock_school
from .portal import (campaign_output, admission_output, valid_group, add_message, attachment_response,
                     STATUS_LABELS)
from .integration_core import admission_notification

router=APIRouter(prefix='/api/v1/schools/{school_id}',tags=['Secretaria — inscrições online'])

@router.get('/admission-campaigns')
def campaigns(db:DB,user:Actor,school:Scope):
    require(user,'admissions.read')
    return [campaign_output(db,x) for x in db.scalars(select(m.AdmissionCampaign).where(m.AdmissionCampaign.school_id==school.id).order_by(m.AdmissionCampaign.created_at.desc()))]

def validate_campaign(db,school,data):
    from .enrollments import check_group
    years=set()
    for id in data.class_group_ids:
        group=scoped(db,m.ClassGroup,id,school.id);check_group(db,group,school.id);years.add(group.academic_year_id)
    if len(years)>1:fail(422,'Crie um processo separado para cada ano letivo.')

@router.post('/admission-campaigns',status_code=201)
def create_campaign(data:s.CampaignInput,db:DB,user:Actor,school:Scope,request:Request):
    require(user,'admissions.manage');validate_campaign(db,school,data)
    obj=m.AdmissionCampaign(school_id=school.id,**data.model_dump());db.add(obj);db.flush()
    audit(db,request,user,'admission_campaign.created',obj,school.id)
    return campaign_output(db,obj)

@router.patch('/admission-campaigns/{id}')
def edit_campaign(id:str,data:s.CampaignEdit,db:DB,user:Actor,school:Scope,request:Request):
    require(user,'admissions.manage');lock_school(db,school.id);obj=scoped(db,m.AdmissionCampaign,id,school.id);check_version(obj,data.version);validate_campaign(db,school,data)
    if obj.slug!=data.slug:fail(409,'O endereço público é estável; crie outro processo para trocar o endereço.')
    if obj.privacy_notice!=data.privacy_notice and obj.terms_version==data.terms_version:fail(422,'Incremente a versão dos termos ao alterar o aviso de privacidade.')
    for key,value in data.model_dump(exclude={'version'}).items():setattr(obj,key,value)
    obj.version+=1;audit(db,request,user,'admission_campaign.updated',obj,school.id)
    return campaign_output(db,obj)

@router.get('/admissions-summary')
def summary(db:DB,user:Actor,school:Scope):
    require(user,'admissions.read')
    counts=dict(db.execute(select(m.Admission.status,func.count()).where(m.Admission.school_id==school.id).group_by(m.Admission.status)).all())
    return {'counts':counts,'total':sum(counts.values()),'awaiting_review':sum(counts.get(x,0) for x in ('submitted','under_review','changes_requested')),'waitlisted':counts.get('waitlisted',0),'enrolled':counts.get('enrolled',0)}

@router.get('/admissions')
def list_admissions(db:DB,user:Actor,school:Scope,q:str=Query('',max_length=160),status:str='',campaign_id:str='',page:int=Query(1,ge=1),page_size:int=Query(30,ge=1,le=100)):
    require(user,'admissions.read')
    stmt=select(m.Admission).where(m.Admission.school_id==school.id)
    if status:
        if status not in STATUS_LABELS:fail(422,'Situação inválida.')
        stmt=stmt.where(m.Admission.status==status)
    if campaign_id:stmt=stmt.where(m.Admission.campaign_id==campaign_id)
    if q.strip():stmt=stmt.where(m.Admission.student_data['name'].as_string().icontains(q.strip(),autoescape=True)|m.Admission.number.icontains(q.strip(),autoescape=True))
    total=db.scalar(select(func.count()).select_from(stmt.subquery()))
    return {'items':[admission_output(db,x,False) for x in db.scalars(stmt.order_by(m.Admission.submitted_at.asc(),m.Admission.created_at.asc()).offset((page-1)*page_size).limit(page_size))],'total':total,'page':page,'page_size':page_size}

@router.get('/admissions/{id}')
def detail(id:str,db:DB,user:Actor,school:Scope,request:Request):
    require(user,'admissions.read');obj=scoped(db,m.Admission,id,school.id)
    audit(db,request,user,'admission.viewed',obj,school.id)
    return admission_output(db,obj,False)

@router.post('/admissions/{id}/actions')
def action(id:str,data:s.AdmissionAction,db:DB,user:Actor,school:Scope,request:Request):
    require(user,'admissions.write');lock_school(db,school.id);obj=scoped(db,m.Admission,id,school.id);check_version(obj,data.version)
    transitions={'review':({'submitted','waitlisted'},'under_review'),'request_changes':({'submitted','under_review','waitlisted'},'changes_requested'),'waitlist':({'submitted','under_review'},'waitlisted'),'reject':({'submitted','under_review','waitlisted','changes_requested'},'rejected'),'withdraw':({'draft','submitted','under_review','waitlisted','changes_requested'},'withdrawn')}
    sources,target=transitions[data.action]
    if obj.status not in sources:fail(409,'Ação não permitida para a situação atual.')
    before=obj.status;obj.status=target;obj.reviewed_by=user.id;obj.version+=1
    add_message(db,obj,data.reason,target,user=user)
    audit(db,request,user,'admission.'+data.action,obj,school.id,{'before':before,'after':target,'reason':data.reason})
    admission_notification(db,obj,f'Inscrição {obj.number}: {STATUS_LABELS[target]}.',target)
    db.flush();return admission_output(db,obj,False)

@router.post('/admissions/{id}/messages',status_code=201)
def message(id:str,data:s.MessageInput,db:DB,user:Actor,school:Scope,request:Request):
    require(user,'admissions.write');obj=scoped(db,m.Admission,id,school.id)
    add_message(db,obj,data.text,user=user,internal=data.internal)
    audit(db,request,user,'admission.message',obj,school.id,{'internal':data.internal})
    if not data.internal:
        # Cada mensagem recebe identificador próprio para deduplicação de notificação.
        from .db import uid
        admission_notification(db,obj,f'Uma mensagem da Secretaria está disponível na inscrição {obj.number}.','message-'+uid())
    db.flush();return admission_output(db,obj,False)

@router.get('/admissions/{id}/attachments/{attachment_id}')
def attachment(id:str,attachment_id:str,db:DB,user:Actor,school:Scope,request:Request):
    require(user,'admissions.read');obj=scoped(db,m.Admission,id,school.id)
    item=scoped(db,m.AdmissionAttachment,attachment_id,school.id)
    if item.admission_id!=obj.id:fail(404,'Anexo não encontrado.')
    audit(db,request,user,'admission.attachment.downloaded',item,school.id)
    return attachment_response(item)

@router.post('/admissions/{id}/attachments/{attachment_id}/review')
def attachment_review(id:str,attachment_id:str,data:s.AttachmentReview,db:DB,user:Actor,school:Scope,request:Request):
    require(user,'documents.validate');lock_school(db,school.id);obj=scoped(db,m.Admission,id,school.id)
    if obj.status not in ('submitted','under_review','waitlisted','changes_requested'):fail(409,'Revise antes da aprovação; depois, use Documentação do aluno.')
    item=scoped(db,m.AdmissionAttachment,attachment_id,school.id);check_version(item,data.version)
    if item.admission_id!=obj.id or not item.active:fail(404,'Anexo não encontrado.')
    item.review_status=data.status;item.review_note=data.note;item.version+=1
    audit(db,request,user,'admission.attachment.reviewed',item,school.id,{'status':data.status,'note':data.note})
    return output(item,('storage_key',))

@router.post('/admissions/{id}/approve')
def approve(id:str,data:s.Approval,db:DB,user:Actor,school:Scope,request:Request):
    require(user,'admissions.write');require(user,'enrollments.write');lock_school(db,school.id)
    obj=scoped(db,m.Admission,id,school.id)
    if obj.status in ('approved','enrolled') and obj.enrollment_id:return admission_output(db,obj,False)
    check_version(obj,data.version)
    if obj.status not in ('submitted','under_review','waitlisted'):fail(409,'Inscrição não está pronta para aprovação.')
    campaign=db.get(m.AdmissionCampaign,obj.campaign_id)
    group=valid_group(db,campaign,data.class_group_id or obj.class_group_id)
    from .registry import occupancy
    if occupancy(db,group.id)>=group.capacity:fail(409,'Turma sem vagas. Utilize a lista de espera ou escolha outra turma oferecida.')
    parent=db.get(m.PortalAccount,obj.account_id)
    guardian_data=obj.guardian_snapshot
    if not guardian_data or not obj.consent.get('legal_responsibility'):fail(409,'Inscrição ainda não possui declarações de responsabilidade.')
    # Uma coincidência de CPF exige conciliação explícita pela Secretaria.
    if data.existing_guardian_id:
        guardian=scoped(db,m.Person,data.existing_guardian_id,school.id)
        if guardian_data.get('cpf') and guardian.cpf!=guardian_data['cpf']:fail(422,'CPF do responsável selecionado diverge da inscrição.')
        guardian.is_guardian=True
    else:
        if guardian_data.get('cpf') and db.scalar(select(m.Person.id).where(m.Person.school_id==school.id,m.Person.cpf==guardian_data['cpf'])):
            fail(409,'CPF de responsável já cadastrado. Confira a identidade e informe o ID do responsável existente.')
        guardian=m.Person(school_id=school.id,is_guardian=True,**{k:guardian_data.get(k) or (None if k=='cpf' else '') for k in ('name','cpf','email','phone','address')})
        db.add(guardian);db.flush()
    from .people import ensure_person_type
    ensure_person_type(db, guardian, 'guardian')
    child=dict(obj.student_data);previous_school=child.pop('previous_school','')
    validated=schemas.PersonInput.model_validate(child)
    if data.existing_student_id:
        student=scoped(db,m.Student,data.existing_student_id,school.id)
        person=db.get(m.Person,student.person_id)
        if validated.cpf and person.cpf!=validated.cpf:fail(422,'CPF do aluno selecionado diverge da inscrição.')
        if person.birth_date!=validated.birth_date:fail(422,'Nascimento do aluno selecionado diverge da inscrição.')
        if student.status!='active':fail(409,'Cadastro do aluno está arquivado.')
    else:
        if validated.cpf and db.scalar(select(m.Person.id).where(m.Person.school_id==school.id,m.Person.cpf==validated.cpf)):
            fail(409,'CPF de aluno já cadastrado. Confira o cadastro e informe o ID do aluno existente.')
        person_values=validated.model_dump(exclude={'person_types'})
        person_values['is_guardian']=False
        person=m.Person(school_id=school.id,**person_values);db.add(person);db.flush()
        student=m.Student(school_id=school.id,person_id=person.id,number=number(db,school.id,'student','ALU-'),previous_school=previous_school)
        db.add(student);db.flush()
    ensure_person_type(db, person, 'student')
    if guardian.id==student.person_id:fail(422,'Responsável e aluno devem ser pessoas distintas neste fluxo.')
    link=db.scalar(select(m.GuardianLink).where(m.GuardianLink.student_id==student.id,m.GuardianLink.person_id==guardian.id))
    if not link:
        link=m.GuardianLink(school_id=school.id,student_id=student.id,person_id=guardian.id,relationship=obj.relationship,legal=True,financial=True,primary_contact=True)
        db.add(link)
    else:link.active=True;link.legal=True;link.financial=True;link.version+=1
    db.flush()
    from .enrollments import create_record
    enrollment=create_record(schemas.EnrollmentInput(student_id=student.id,class_group_id=group.id,enrolled_on=date.today(),financial_person_id=guardian.id,notes='Origem online: '+obj.number),school,db,user,request)
    from .documents import write_file
    from .config import settings
    import hashlib
    for item in db.scalars(select(m.AdmissionAttachment).where(m.AdmissionAttachment.admission_id==obj.id,m.AdmissionAttachment.active.is_(True),m.AdmissionAttachment.review_status!='rejected')):
        root=settings().storage_path.resolve();path=(root/item.storage_key).resolve()
        if not path.is_relative_to(root) or not path.is_file():fail(409,'Anexo indisponível: '+item.original_name)
        raw=path.read_bytes()
        if hashlib.sha256(raw).hexdigest()!=item.sha256:fail(409,'Anexo com integridade inválida.')
        stored=write_file(db,school.id,user.id,item.original_name,item.mime_type,raw)
        doc=m.StudentDocument(school_id=school.id,student_id=student.id,document_type_id=item.document_type_id,file_id=stored.id,status=item.review_status,validated_by=user.id if item.review_status=='validated' else None,notes='Importado da inscrição '+obj.number+'; '+item.review_note)
        db.add(doc);db.flush();item.student_document_id=doc.id
    obj.status='approved';obj.student_id=student.id;obj.enrollment_id=enrollment.id;obj.class_group_id=group.id;obj.reviewed_by=user.id;obj.version+=1
    # Vincula apenas cobranças deste processo, nunca as de outros alunos da família.
    for charge in db.scalars(select(m.BankCharge).where(m.BankCharge.admission_id==obj.id,m.BankCharge.school_id==school.id)):charge.enrollment_id=enrollment.id
    add_message(db,obj,'Inscrição aprovada. A Secretaria está concluindo a matrícula.','approved',user=user)
    audit(db,request,user,'admission.approved',obj,school.id,{'reason':data.reason,'identity_confirmed':True,'student_id':student.id,'guardian_id':guardian.id,'enrollment_id':enrollment.id})
    admission_notification(db,obj,f'Inscrição {obj.number} aprovada. A matrícula está em preparação.','approved')
    db.flush();return admission_output(db,obj,False)

@router.post('/admissions/{id}/finalize')
def finalize(id:str,data:s.FinalizeAdmission,db:DB,user:Actor,school:Scope,request:Request):
    require(user,'admissions.write');require(user,'enrollments.write');lock_school(db,school.id)
    obj=scoped(db,m.Admission,id,school.id)
    if obj.status=='enrolled':return admission_output(db,obj,False)
    check_version(obj,data.version)
    if obj.status!='approved' or not obj.enrollment_id:fail(409,'Aprove a inscrição antes da efetivação.')
    payment_gate(db,school.id,obj.enrollment_id)
    from .enrollments import movement
    enrollment=scoped(db,m.Enrollment,obj.enrollment_id,school.id)
    if enrollment.status!='active':
        movement(enrollment.id,schemas.MovementInput(version=enrollment.version,action='activate',reason=data.reason),db,user,school,request)
    # Comprovante persistido: a família recebe exatamente o documento emitido.
    from .documents import issue
    issue(obj.student_id,schemas.IssueInput(kind='enrollment_receipt',enrollment_id=enrollment.id),db,user,school,request)
    obj.status='enrolled';obj.version+=1;obj.reviewed_by=user.id
    add_message(db,obj,'Matrícula efetivada. O comprovante está disponível no portal.','enrolled',user=user)
    audit(db,request,user,'admission.enrolled',obj,school.id,{'reason':data.reason,'enrollment_id':enrollment.id})
    admission_notification(db,obj,f'Matrícula referente à inscrição {obj.number} efetivada.','enrolled')
    db.flush();return admission_output(db,obj,False)


def payment_gate(db,school_id,enrollment_id):
    obj=db.scalar(select(m.Admission).where(m.Admission.school_id==school_id,m.Admission.enrollment_id==enrollment_id))
    query=select(m.BankCharge).where(m.BankCharge.school_id==school_id,m.BankCharge.required_for_enrollment.is_(True),m.BankCharge.status!='cancelled')
    query=query.where((m.BankCharge.enrollment_id==enrollment_id)|(m.BankCharge.admission_id==obj.id)) if obj else query.where(m.BankCharge.enrollment_id==enrollment_id)
    charges=list(db.scalars(query))
    campaign=db.get(m.AdmissionCampaign,obj.campaign_id) if obj else None
    if campaign and campaign.require_payment_before_enrollment and not charges:
        fail(409,'Cadastre a cobrança obrigatória antes de efetivar a matrícula.')
    if any(x.status!='received' for x in charges):
        fail(409,'Pagamento obrigatório ainda não recebido/conciliado. Confirmado não equivale a recebido.')
