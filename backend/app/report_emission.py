"""Emissão institucional e prévia administrativa, com escopo de escola e matrícula."""
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Query, Request
from fastapi.responses import Response
from sqlalchemy import select, func, or_
from . import models as m
from .common import audit
from .contract_presentation import SCHOOL_FIELD
from .contract_signatures import auto_sign_issued_document
from .documents import write_file
from .learning_portal import learning_data
from .report_bulletins import render_bulletin, prepare_signature, publication_ids
from .report_preferences import Orientation, preferences
from .school_reports import render_table
from .security import Actor, DB, Scope, fail, lock_school, require, scoped
from .student_reports import address, date_text, masked_cpf, student_photo

router = APIRouter(prefix='/api/v1/schools/{school_id}', tags=['Emissão de relatórios'])


def office_access(user):
    require(user, 'documents.generate')
    if user.role not in {'admin', 'direction', 'secretary', 'coordination'}:
        fail(403, 'A emissão coletiva exige acesso à secretaria escolar.')


@router.get('/reports/bulletins/enrollments')
def recipients(db: DB, user: Actor, school: Scope, academic_year_id: str, class_group_id: str = '',
               grade_id: str = '', offset: int = Query(default=0, ge=0)):
    office_access(user)
    stmt = select(m.Enrollment.id, m.Enrollment.number, m.Person.name, m.ClassGroup.name.label('class_name')).join(
        m.ClassGroup, m.Enrollment.class_group_id == m.ClassGroup.id).join(m.Student, m.Student.id == m.Enrollment.student_id).join(
        m.Person, m.Person.id == m.Student.person_id).where(m.Enrollment.school_id == school.id, m.ClassGroup.school_id == school.id,
        m.Student.school_id == school.id, m.Person.school_id == school.id, m.Enrollment.academic_year_id == academic_year_id,
        m.Enrollment.status != 'draft')
    if class_group_id:
        stmt = stmt.where(m.ClassGroup.id == class_group_id)
    if grade_id:
        stmt = stmt.where(m.ClassGroup.grade_id == grade_id)
    rows = db.execute(stmt.order_by(m.Person.name, m.Enrollment.id).offset(offset).limit(26)).mappings().all()
    return {'items': rows[:25], 'more': len(rows) > 25}


def bulletin_data(db, school, eid):
    enrollment = scoped(db, m.Enrollment, eid, school.id)
    student = scoped(db, m.Student, enrollment.student_id, school.id)
    info = learning_data(db, [student])['students'][0]
    entry = next((e for e in info['enrollments'] if e['enrollment_id'] == eid), None)
    if not entry or not entry['subjects']:
        fail(409, 'Nenhum fechamento publicado para esta matrícula.')
    return student, info, entry


@router.get('/reports/bulletins/{enrollment_id}/preview.pdf')
def preview(enrollment_id: str, db: DB, user: Actor, school: Scope,
            model: Literal['integrated', 'panel', 'journey'] | None = None, color: str = Query(default='', pattern=r'^(#[0-9a-fA-F]{6})?$')):
    office_access(user)
    student, info, entry = bulletin_data(db, school, enrollment_id)
    prefs = preferences(school)
    if model:
        prefs['bulletin'] = model
    if color:
        prefs['color'] = color
    return Response(render_bulletin(db, student, info, [entry], user.name, preview=prefs), media_type='application/pdf',
                    headers={'Cache-Control': 'no-store', 'Content-Disposition': 'inline; filename="previa-boletim.pdf"'})


@router.post('/reports/bulletins/{enrollment_id}/issue')
def issue_official(enrollment_id: str, operation: UUID, request: Request, db: DB, user: Actor, school: Scope):
    office_access(user)
    if user.role not in {'admin', 'direction'}:
        fail(403, 'Somente direção ou administração pode assinar em nome da escola.')
    lock_school(db, school.id)
    key = f'bulletin:{enrollment_id}:{operation}'
    existing = db.scalar(select(m.IssuedDocument).where(m.IssuedDocument.school_id == school.id, m.IssuedDocument.idempotency_key == key))
    if existing:
        return {'id': existing.id, 'revision': existing.snapshot['revision'], 'status': existing.signature_status}
    student, info, entry = bulletin_data(db, school, enrollment_id)
    count = db.scalar(select(func.count()).select_from(m.IssuedDocument).where(m.IssuedDocument.school_id == school.id,
                      m.IssuedDocument.enrollment_id == enrollment_id, m.IssuedDocument.kind == 'official_bulletin'))
    stamp = {**preferences(school), 'model': entry['bulletin_model'], 'revision': count + 1,
             'class_group_id': entry['class_group_id'], 'academic_year_id': entry['academic_year_id'],
             'publication_ids': publication_ids(entry), 'institutional_signature_field': SCHOOL_FIELD}
    pdf = prepare_signature(render_bulletin(db, student, info, [entry], user.name, signing=True))
    source = write_file(db, school.id, user.id, f'boletim-{student.number}-r{count+1}.pdf', 'application/pdf', pdf, 'bulletin_source')
    doc = m.IssuedDocument(school_id=school.id, student_id=student.id, enrollment_id=enrollment_id, kind='official_bulletin',
                           idempotency_key=key, created_by=user.id, file_id=source.id, snapshot=stamp)
    db.add(doc)
    db.flush()
    signed = auto_sign_issued_document(db, doc, user.id, request)
    audit(db, request, user, 'bulletin.signed', doc, school.id, {'revision': count+1, 'model': stamp['model'],
          'enrollment_id': enrollment_id, 'publication_ids': stamp['publication_ids'], 'sha256': signed.sha256})
    return {'id': doc.id, 'revision': count + 1, 'status': doc.signature_status}


@router.get('/persons/{person_id}/records/{kind}.pdf')
def staff_record(person_id: str, kind: Literal['employee', 'teacher'], request: Request, db: DB, user: Actor, school: Scope,
                orientation: Orientation | None = None, academic_year_id: str = ''):
    require(user, 'people.read')
    require(user, 'documents.generate')
    person = scoped(db, m.Person, person_id, school.id)
    model = m.EmployeeProfile if kind == 'employee' else m.TeacherProfile
    profile = db.scalar(select(model).where(model.school_id == school.id, model.person_id == person.id))
    if not profile:
        fail(404, 'Perfil não cadastrado nesta escola.')
    direction = orientation or preferences(school)[kind]
    contracts = {'clt':'CLT', 'public':'Serviço público', 'temporary':'Temporário', 'substitute':'Substituição',
                 'intern':'Estágio', 'outsourced':'Terceirizado', 'other':'Outro vínculo'}
    states = {'active':'Ativo', 'leave':'Afastado', 'inactive':'Inativo'}
    fields = [('Matrícula funcional', getattr(profile, 'employee_number', '') or getattr(profile, 'registration_number', '')),
              ('Vínculo', contracts.get(profile.employment_type, profile.employment_type)), ('Situação', states.get(profile.employment_status, profile.employment_status)),
              ('Admissão', date_text(profile.admission_date)), ('Desligamento', date_text(profile.termination_date))]
    sections = [{'title': 'Identificação civil', 'fields': [('Nome completo', person.name), ('Nome social', person.social_name),
                 ('Nascimento', date_text(person.birth_date)), ('Nacionalidade', person.nationality)]},
                {'title': 'Endereço e contato', 'fields': [('Endereço', address(person)), ('Telefone', person.phone),
                 ('E-mail', person.email), ('Contato de emergência', person.emergency_contact_name), ('Telefone de emergência', person.emergency_contact_phone)]},
                {'title': 'Vínculo funcional', 'fields': fields}]
    documents = [('CPF', masked_cpf(person.cpf))]
    if person.rg:
        documents.append(('RG / órgão emissor', ' · '.join(filter(None, ['***' + person.rg[-2:], person.rg_issuer, person.rg_state]))))
    if person.birth_certificate:
        documents.append(('Certidão de nascimento', 'Cadastrada'))
    sections.append({'title':'Documentação cadastral', 'fields':documents})
    if kind == 'employee':
        sections.append({'title': 'Organização do trabalho', 'fields': [('Função', profile.job_title), ('Lotação', profile.department),
                         ('Jornada', profile.work_schedule), ('Supervisão', profile.supervisor_name), ('Escolaridade', person.education)]})
    else:
        sections.append({'title': 'Formação e habilitação', 'fields': [('Instituição de ensino', profile.education_institution),
                     ('Curso', profile.degree_course), ('Especialização', profile.specialization), ('Áreas de ensino', profile.teaching_areas),
                     ('Registro profissional', profile.professional_registration), ('Carga horária cadastrada', profile.workload_hours)]})
        linked = select(m.User.id).where(m.User.person_id == person.id)
        stmt = select(m.AcademicYear.name, m.ClassGroup.name, m.Unit.name, m.TeacherAssignment.subject_name, m.TeacherAssignment.active).select_from(
            m.TeacherAssignment).join(m.ClassGroup, m.ClassGroup.id == m.TeacherAssignment.class_group_id).join(
            m.Unit, m.Unit.id == m.ClassGroup.unit_id).join(m.AcademicYear, m.AcademicYear.id == m.TeacherAssignment.academic_year_id).where(
            m.TeacherAssignment.school_id == school.id, or_(m.TeacherAssignment.teacher_person_id == person.id,
            m.TeacherAssignment.teacher_user_id.in_(linked)))
        if academic_year_id:
            stmt = stmt.where(m.AcademicYear.id == academic_year_id)
        from .diary_report_sections import register
        sections.append(register('Atribuições docentes', [('Ano letivo', 1), ('Turma', 1.5), ('Unidade', 1.5), ('Componente', 2), ('Situação', 1)],
            [(year, group, unit, subject, 'Ativa' if active else 'Inativa') for year, group, unit, subject, active in db.execute(stmt.order_by(
                m.AcademicYear.name, m.Unit.name, m.ClassGroup.name, m.TeacherAssignment.subject_name))]))
    title = 'Ficha cadastral do ' + ('colaborador' if kind == 'employee' else 'professor')
    pdf = render_table(school, title, [], [], sections=sections, profile={'name': person.name, 'detail': title},
            photo=student_photo(db, school.id, person), reserve_photo=True, kit=True, layout='compact_record' if kind == 'employee' else 'record',
            signatures=['Colaborador', 'Assinatura da instituição'] if kind == 'employee' else None,
            orientation=direction, module='Cadastro funcional', issuer=user.name, electronic_notice=True, db=db)
    audit(db, request, user, 'person.record.exported', person, school.id, {'kind': kind, 'orientation': direction})
    return Response(pdf, media_type='application/pdf', headers={'Cache-Control': 'no-store'})
