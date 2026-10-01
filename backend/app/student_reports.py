"""Fichas escolares em seções, com dados efetivamente cadastrados e vínculo seguro."""
import hashlib
from sqlalchemy import and_, select
from . import models as m
from .common import output
from .institution import public_identity
from .school_reports import render_table
from .security import fail, scoped
from .storage import read_bytes

ENROLLMENT_LABELS = {'draft': 'Pré-matrícula / rascunho', 'active': 'Ativa', 'suspended': 'Suspensa',
                     'transferred': 'Transferida', 'cancelled': 'Cancelada', 'completed': 'Concluída'}
DOCUMENT_LABELS = {'pending': 'Pendente', 'received': 'Aguardando análise', 'validated': 'Validado',
                   'waived': 'Dispensado', 'rejected': 'Rejeitado', 'expired': 'Vencido'}


def date_text(value):
    return value.strftime('%d/%m/%Y') if value else 'Não informado'


def masked_cpf(value):
    return '***.' + value[3:6] + '.' + value[6:9] + '-**' if value else 'Não informado'


def address(person):
    if person.address:
        return person.address
    return ', '.join(str(value) for value in [person.street, person.address_number, person.address_complement,
        person.district, '/'.join(v for v in [person.city, person.state] if v), person.postal_code] if value)


def student_photo(db, school_id, person):
    if not person.photo_file_id:
        return None
    file = scoped(db, m.FileRecord, person.photo_file_id, school_id)
    if file.mime_type not in {'image/png', 'image/jpeg'}:
        return None
    try:
        content = read_bytes(file)
    except (FileNotFoundError, KeyError):
        return None
    if hashlib.sha256(content).hexdigest() != file.sha256:
        fail(409, 'A foto cadastrada não passou na verificação de integridade. Atualize a foto antes de emitir a ficha.')
    return content


def compose_student_document(db, school, student, person, enrollment_id, kind, issuer, title):
    enrollment = None
    if enrollment_id:
        enrollment = scoped(db, m.Enrollment, enrollment_id, school.id)
        if enrollment.student_id != student.id:
            fail(422, 'A matrícula pertence a outro aluno.')
    if kind != 'student_record':
        if not enrollment:
            fail(422, 'Selecione a matrícula para emitir este documento.')
        if kind != 'enrollment_form' and enrollment.status != 'active':
            fail(409, 'Comprovantes e declarações exigem matrícula ativa.')
    identity = public_identity(db)
    snapshot = {'school': output(school), 'person': output(person), 'student': output(student), 'issuer': issuer,
                'template_version': '3', 'layout_version': '4', 'institution_identity': identity, 'brand': identity['display_name']}
    detailed = kind in {'student_record', 'enrollment_form'}
    sections = []
    basic = [('Nome completo', person.name), ('Data de nascimento', date_text(person.birth_date))]
    if detailed:
        basic += [('Nome social', person.social_name), ('CPF', masked_cpf(person.cpf)),
                  ('Naturalidade', '/'.join(value for value in [person.birth_city, person.birth_state] if value)),
                  ('Nacionalidade', person.nationality)]
        if person.rg:
            basic += [('RG / órgão expedidor', ' / '.join(value for value in [person.rg, person.rg_issuer, person.rg_state] if value))]
        if person.birth_certificate:
            basic += [('Certidão de nascimento', person.birth_certificate)]
    sections.append({'title': 'Identificação do aluno', 'fields': basic})
    if detailed:
        sections.extend([
            {'title': 'Filiação', 'fields': [('Mãe', person.mother_name), ('Pai', person.father_name)]},
            {'title': 'Contatos e endereço', 'fields': [('Telefone principal', person.phone), ('Telefone adicional', person.phone_secondary),
                ('E-mail', person.email), ('Endereço residencial', address(person))]},
        ])
        if person.emergency_contact_name or person.emergency_contact_phone:
            sections.append({'title': 'Contato de emergência', 'fields': [('Nome', person.emergency_contact_name), ('Telefone', person.emergency_contact_phone)]})
        guardian_data = db.execute(select(m.GuardianLink, m.Person).join(m.Person, and_(m.Person.id == m.GuardianLink.person_id, m.Person.school_id == school.id)).where(
            m.GuardianLink.school_id == school.id, m.GuardianLink.student_id == student.id, m.GuardianLink.active.is_(True)).order_by(m.GuardianLink.primary_contact.desc(), m.Person.name)).all()
        snapshot['guardians'] = []
        if not guardian_data:
            sections.append({'title': 'Pais e responsáveis', 'text': 'Nenhum responsável vinculado ao cadastro.'})
        for index, (link, guardian) in enumerate(guardian_data, 1):
            roles = [caption for attribute, caption in [('legal', 'Legal'), ('financial', 'Financeiro'), ('pickup', 'Autorizado a retirar'), ('primary_contact', 'Contato principal')] if getattr(link, attribute)]
            sections.append({'title': f'Responsável {index} - {guardian.name}', 'fields': [
                ('Vínculo', link.relationship), ('Atribuições', ', '.join(roles) or 'Não definidas'),
                ('Telefone', guardian.phone), ('E-mail', guardian.email), ('CPF', masked_cpf(guardian.cpf)), ('Endereço', address(guardian))]})
            snapshot['guardians'].append({'link': output(link), 'person': {key: getattr(guardian, key) for key in ('name', 'phone', 'email', 'address', 'cpf')}})
    if enrollment:
        group = scoped(db, m.ClassGroup, enrollment.class_group_id, school.id)
        year = scoped(db, m.AcademicYear, enrollment.academic_year_id, school.id)
        grade = scoped(db, m.Grade, group.grade_id, school.id)
        shift = scoped(db, m.Shift, group.shift_id, school.id)
        unit = scoped(db, m.Unit, group.unit_id, school.id)
        sections.append({'title': 'Dados da matrícula', 'fields': [
            ('Número da matrícula', enrollment.number), ('Situação', ENROLLMENT_LABELS[enrollment.status]),
            ('Ano letivo', year.name), ('Data da matrícula', date_text(enrollment.enrolled_on)),
            ('Série / etapa', grade.name), ('Turma', group.name), ('Turno', shift.name), ('Unidade', unit.name)]})
        snapshot.update({'enrollment': output(enrollment), 'class_group': output(group), 'year': output(year), 'grade': output(grade), 'shift': output(shift), 'unit': output(unit)})
        if detailed and enrollment.notes:
            sections.append({'title': 'Observações da matrícula', 'text': enrollment.notes})
    elif detailed:
        history = db.execute(select(m.Enrollment, m.ClassGroup.name, m.AcademicYear.name).join(m.ClassGroup, and_(m.ClassGroup.id == m.Enrollment.class_group_id, m.ClassGroup.school_id == school.id)).join(
            m.AcademicYear, and_(m.AcademicYear.id == m.Enrollment.academic_year_id, m.AcademicYear.school_id == school.id)).where(
            m.Enrollment.school_id == school.id, m.Enrollment.student_id == student.id).order_by(m.Enrollment.enrolled_on.desc(), m.Enrollment.id.desc())).all()
        if history:
            sections.append({'title': 'Vínculos acadêmicos registrados', 'columns': [
                {'key': 'number', 'label': 'Matrícula'}, {'key': 'year', 'label': 'Ano letivo', 'width': .8},
                {'key': 'class_name', 'label': 'Turma', 'width': 1.4}, {'key': 'date', 'label': 'Data'}, {'key': 'status', 'label': 'Situação', 'width': 1.4}],
                'rows': [{'number': e.number, 'year': year_name, 'class_name': group_name, 'date': date_text(e.enrolled_on), 'status': ENROLLMENT_LABELS[e.status]} for e, group_name, year_name in history]})
            latest_group = scoped(db, m.ClassGroup, history[0][0].class_group_id, school.id)
        else:
            sections.append({'title': 'Vínculos acadêmicos', 'text': 'Não há matrícula registrada para este aluno.'})
            latest_group = None
    if detailed:
        from .documents import checklist
        grade_id = group.grade_id if enrollment else (latest_group.grade_id if latest_group else None)
        checks = checklist(db, school.id, student.id, grade_id)
        if checks:
            sections.append({'title': 'Conferência documental', 'columns': [
                {'key': 'document', 'label': 'Documento', 'width': 2.2}, {'key': 'required', 'label': 'Obrigatório'}, {'key': 'status', 'label': 'Situação', 'width': 1.5}],
                'rows': [{'document': check['name'], 'required': 'Sim' if check['required'] else 'Não', 'status': DOCUMENT_LABELS.get(check['status'], 'A conferir')} for check in checks]})
            snapshot['document_checklist'] = checks
        additional = [('Escola anterior', student.previous_school)]
        if student.inep_code: additional.append(('Código INEP', student.inep_code))
        if student.authorized_transport: additional.append(('Transporte autorizado', student.authorized_transport))
        sections.append({'title': 'Informações escolares complementares', 'fields': additional})
    if kind == 'enrollment_declaration':
        sections.append({'title': 'Declaração', 'text': f'Declaramos que {person.name} possui matrícula ativa nesta instituição no período letivo {year.name}, na turma {group.name}, turno {shift.name}, conforme os registros da Secretaria.'})
    elif kind == 'enrollment_receipt':
        sections.append({'title': 'Comprovação do vínculo', 'text': 'Este documento comprova o registro de matrícula ativa na instituição, conforme os dados acadêmicos apresentados.'})
    notes = ['Documento gerado eletronicamente a partir dos dados cadastrados. Não contém assinatura digital.']
    if kind == 'enrollment_form':
        notes.insert(0, 'Ficha administrativa. A situação acima deve ser observada; este documento não substitui a declaração de matrícula ativa.')
    content = render_table(school.name, title, [], [], sections=sections,
        profile={'name': person.name, 'detail': f'Aluno {student.number} | Situação cadastral: ' + ('Ativo' if student.status == 'active' else 'Inativo')},
        photo=student_photo(db, school.id, person) if detailed else None,
        signatures=['Responsável / aluno maior de idade', 'Secretaria / instituição'] if detailed else ['Secretaria / representante da instituição'],
        notes=notes, notes_title='', issuer=issuer, db=db)
    snapshot['report_sections'] = sections
    return content, snapshot
