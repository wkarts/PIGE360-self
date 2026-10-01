"""Relatórios gerenciais com filtros compartilhados entre tela, PDF e CSV.

As datas referem-se ao fato informado em cada catálogo. Situações cadastrais e
financeiras são atuais: não se simula retrospectiva que o banco não conserva.
"""
import csv
import io
from collections import Counter
from datetime import UTC, date, datetime, time, timedelta
from decimal import Decimal
from typing import Annotated
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import Response
from sqlalchemy import and_, case, func, or_, select

from . import models as m
from .common import audit
from .db import now
from .security import Actor, DB, PERMISSIONS, Scope, fail, require, scoped, utc

router = APIRouter()
TZ = ZoneInfo('America/Bahia')
MAX_ROWS = 20000
MAX_PDF_ROWS = 2000
LABELS = {
    'active': 'Ativo', 'inactive': 'Inativo', 'archived': 'Arquivado', 'draft': 'Rascunho', 'suspended': 'Suspenso',
    'transferred': 'Transferido', 'cancelled': 'Cancelado', 'completed': 'Concluído',
    'new': 'Nova matrícula', 'reenrollment': 'Rematrícula', 'transfer': 'Transferência',
    'queued': 'Aguardando emissão', 'pending': 'Pendente', 'confirmed': 'Confirmado',
    'received': 'Recebido', 'received_external': 'Recebido externamente', 'overdue': 'Vencido',
    'refunded': 'Estornado', 'refund_requested': 'Estorno solicitado',
    'partially_refunded': 'Estorno parcial', 'disputed': 'Em contestação',
    'awaiting_review': 'Aguardando conferência', 'uncertain': 'Emissão inconclusiva', 'failed': 'Falha na emissão',
    'submitted': 'Enviada', 'under_review': 'Em análise', 'changes_requested': 'Correção solicitada',
    'waitlisted': 'Lista de espera', 'approved': 'Aprovada', 'enrolled': 'Matriculado',
    'rejected': 'Rejeitado', 'withdrawn': 'Desistência', 'expired': 'Vencido',
    'open': 'Aberto', 'in_progress': 'Em atendimento', 'waiting': 'Aguardando',
    'calculated': 'Calculado', 'below_minimum': 'Nota abaixo do mínimo', 'attendance_below_minimum': 'Frequência abaixo do mínimo',
    'opinion_pending': 'Parecer pendente', 'concept': 'Conceito registrado',
    'present': 'Presente', 'absent': 'Falta', 'justified_absence': 'Falta justificada',
}
ACADEMIC_FILTERS = ['academic_year_id', 'class_group_id', 'unit_id']
CATALOG = {
    'enrollments': dict(title='Matrículas', description='Matrículas por turma, situação e mês.',
                        date_basis='Data de matrícula. A situação apresentada é a atual.', permission='enrollments.read',
                        filters=ACADEMIC_FILTERS, statuses=['draft', 'active', 'suspended', 'transferred', 'cancelled', 'completed']),
    'students': dict(title='Alunos cadastrados', description='Cadastros de alunos criados no período.',
                     date_basis='Data de criação do cadastro. Turma e situação são as atuais.', permission='students.read',
                     filters=ACADEMIC_FILTERS, statuses=['active', 'archived']),
    'financial': dict(title='Cobranças e recebimentos', description='Valores por vencimento, situação e competência mensal.',
                      date_basis='Data de vencimento. Valores nominais e situações atuais das cobranças.', permission='banking.read',
                      filters=ACADEMIC_FILTERS, statuses=['queued', 'pending', 'overdue', 'confirmed', 'received', 'received_external', 'cancelled', 'refunded', 'refund_requested', 'partially_refunded', 'disputed', 'awaiting_review', 'uncertain', 'failed']),
    'admissions': dict(title='Inscrições online', description='Inscrições recebidas, aprovadas e convertidas em matrícula.',
                       date_basis='Data de criação da inscrição. A situação apresentada é a atual.', permission='admissions.read',
                       filters=ACADEMIC_FILTERS, statuses=['draft', 'submitted', 'under_review', 'changes_requested', 'waitlisted', 'approved', 'enrolled', 'rejected', 'withdrawn']),
    'document-pendencies': dict(title='Pendências documentais', description='Documentos obrigatórios pendentes dos alunos matriculados no período.',
                                date_basis='Data da matrícula; pendências verificadas na data da emissão, sem retrospectiva documental.', permission='documents.read',
                                filters=ACADEMIC_FILTERS, statuses=['pending', 'received', 'rejected', 'expired']),
    'attendance': dict(title='Frequência escolar', description='Presenças e faltas por aluno, turma e componente curricular.',
                       date_basis='Data da aula. Apenas chamadas registradas entram no cálculo.', permission='diary.reports',
                       filters=ACADEMIC_FILTERS, statuses=[]),
    'academic-results': dict(title='Notas e resultados por período', description='Resultados já consolidados, por aluno, turma, componente e período letivo.',
                             date_basis='Data final do período letivo. Exibe a última consolidação registrada; não calcula aprovação automaticamente.', permission='diary.reports',
                             filters=ACADEMIC_FILTERS, statuses=['pending', 'calculated', 'below_minimum', 'attendance_below_minimum', 'opinion_pending', 'concept']),
    'protocols': dict(title='Atendimentos e protocolos', description='Solicitações, prazos e situação do atendimento.',
                      date_basis='Data de abertura. Situação e atraso verificados na data da emissão.', permission='protocols.read',
                      filters=[], statuses=['open', 'in_progress', 'waiting', 'completed', 'cancelled']),
}


def default_period(today=None):
    today = today or now().astimezone(TZ).date()
    end = today.replace(day=1) - timedelta(days=1)
    month_index = end.year * 12 + end.month - 1 - 2
    return date(month_index // 12, month_index % 12 + 1, 1), end


def report_filters(date_from: date | None = None, date_to: date | None = None,
                   academic_year_id: str = '', class_group_id: str = '', unit_id: str = '',
                   status: str = '', q: str = Query('', max_length=160)):
    if (date_from is None) != (date_to is None):
        fail(422, 'Informe a data inicial e a data final do relatório.')
    if date_from is None:
        date_from, date_to = default_period()
    if date_from > date_to:
        fail(422, 'A data inicial não pode ser posterior à data final.')
    if (date_to - date_from).days > 1096:
        fail(422, 'Selecione um período de até três anos por relatório.')
    return dict(date_from=date_from, date_to=date_to, academic_year_id=academic_year_id,
                class_group_id=class_group_id, unit_id=unit_id, status=status, q=q.strip())


Filters = Annotated[dict, Depends(report_filters)]


def col(key, label, kind='text', width=1):
    return {'key': key, 'label': label, 'type': kind, 'width': width}


def metric(key, label, value, kind='number'):
    return {'key': key, 'label': label, 'value': value, 'type': kind}


def local_date(value):
    if isinstance(value, datetime):
        return utc(value).astimezone(TZ).date()
    return value


def iso(value):
    return local_date(value).isoformat() if value else ''


def amount(value):
    return format(Decimal(value or 0), '.2f')


def label(value):
    return LABELS.get(value, 'Não classificado')


def in_period(column, filters, timestamp=False):
    if timestamp:
        start = datetime.combine(filters['date_from'], time.min, TZ).astimezone(UTC)
        end = datetime.combine(filters['date_to'] + timedelta(days=1), time.min, TZ).astimezone(UTC)
        return and_(column >= start, column < end)
    return and_(column >= filters['date_from'], column <= filters['date_to'])


def limited(db, stmt):
    values = db.execute(stmt.limit(MAX_ROWS + 1)).all()
    if len(values) > MAX_ROWS:
        fail(422, 'O filtro excede 20.000 registros. Restrinja o período, a turma ou a busca; nenhum relatório parcial foi gerado.')
    return values


def academic_conditions(filters, model=m.Enrollment):
    conditions = []
    for key in ('academic_year_id', 'class_group_id'):
        if filters.get(key):
            conditions.append(getattr(model, key) == filters[key])
    if filters.get('unit_id'):
        conditions.append(m.ClassGroup.unit_id == filters['unit_id'])
    return conditions


def scoped_groups(db, school_id, filters):
    stmt = select(m.ClassGroup.id).where(m.ClassGroup.school_id == school_id)
    if filters['academic_year_id']:
        stmt = stmt.where(m.ClassGroup.academic_year_id == filters['academic_year_id'])
    if filters['class_group_id']:
        stmt = stmt.where(m.ClassGroup.id == filters['class_group_id'])
    if filters['unit_id']:
        stmt = stmt.where(m.ClassGroup.unit_id == filters['unit_id'])
    return stmt


def enrollments(db, school_id, f):
    stmt = select(m.Enrollment, m.Student.number, m.Person.name, m.ClassGroup.name, m.AcademicYear.name).join(
        m.Student, and_(m.Student.id == m.Enrollment.student_id, m.Student.school_id == school_id)).join(
        m.Person, and_(m.Person.id == m.Student.person_id, m.Person.school_id == school_id)).join(
        m.ClassGroup, and_(m.ClassGroup.id == m.Enrollment.class_group_id, m.ClassGroup.school_id == school_id)).join(
        m.AcademicYear, and_(m.AcademicYear.id == m.Enrollment.academic_year_id, m.AcademicYear.school_id == school_id)).where(
        m.Enrollment.school_id == school_id, in_period(m.Enrollment.enrolled_on, f), *academic_conditions(f))
    if f['status']: stmt = stmt.where(m.Enrollment.status == f['status'])
    if f['q']: stmt = stmt.where(or_(m.Person.name.icontains(f['q'], autoescape=True), m.Enrollment.number.icontains(f['q'], autoescape=True), m.Student.number.icontains(f['q'], autoescape=True)))
    data = limited(db, stmt.order_by(m.Enrollment.enrolled_on, m.Person.name, m.Enrollment.id))
    rows = [dict(number=e.number, student_number=number, name=name, class_name=group, year=year,
                 enrolled_on=iso(e.enrolled_on), status=label(e.status), enrollment_type=label(e.enrollment_type), _date=iso(e.enrolled_on))
            for e, number, name, group, year in data]
    summary = [metric('total', 'Matrículas', len(rows)), metric('active', 'Ativas', sum(e.status == 'active' for e, *_ in data)),
               metric('draft', 'Rascunhos', sum(e.status == 'draft' for e, *_ in data)), metric('students', 'Alunos distintos', len({e.student_id for e, *_ in data}))]
    columns = [col('number', 'Matrícula'), col('name', 'Aluno', width=2.2), col('class_name', 'Turma', width=1.4), col('year', 'Ano letivo'), col('enrolled_on', 'Data', 'date'), col('enrollment_type', 'Ingresso'), col('status', 'Situação')]
    return rows, columns, summary, []


def students(db, school_id, f):
    stmt = select(m.Student, m.Person).join(m.Person, and_(m.Person.id == m.Student.person_id, m.Person.school_id == school_id)).where(
        m.Student.school_id == school_id, in_period(m.Student.created_at, f, True))
    if f['status']: stmt = stmt.where(m.Student.status == f['status'])
    if any(f[key] for key in ACADEMIC_FILTERS):
        stmt = stmt.where(m.Student.id.in_(select(m.Enrollment.student_id).where(m.Enrollment.school_id == school_id,
            m.Enrollment.class_group_id.in_(scoped_groups(db, school_id, f)), m.Enrollment.status.in_(['draft', 'active', 'suspended']))))
    if f['q']: stmt = stmt.where(or_(m.Person.name.icontains(f['q'], autoescape=True), m.Student.number.icontains(f['q'], autoescape=True)))
    data = limited(db, stmt.order_by(m.Person.name, m.Student.id))
    ids = [student.id for student, _ in data]
    current = {}
    # Busca por subconsulta evita limite de bind parameters e N+1 para escolas grandes.
    matched_ids = stmt.with_only_columns(m.Student.id).order_by(None)
    for enrollment, group in db.execute(select(m.Enrollment, m.ClassGroup.name).join(m.ClassGroup,
        and_(m.ClassGroup.id == m.Enrollment.class_group_id, m.ClassGroup.school_id == school_id)).where(
        m.Enrollment.school_id == school_id, m.Enrollment.student_id.in_(matched_ids),
        m.Enrollment.class_group_id.in_(scoped_groups(db, school_id, f)),
        m.Enrollment.status.in_(['draft', 'active', 'suspended'])).order_by(m.Enrollment.enrolled_on.desc(), m.Enrollment.created_at.desc(), m.Enrollment.id.desc())):
        current.setdefault(enrollment.student_id, group)
    rows = [dict(number=student.number, name=person.name, birth_date=iso(person.birth_date),
                 class_name=current.get(student.id, 'Sem matrícula vigente'), created_on=iso(student.created_at),
                 status=label(student.status), _date=iso(student.created_at)) for student, person in data]
    summary = [metric('total', 'Alunos cadastrados', len(rows)), metric('active', 'Ativos', sum(s.status == 'active' for s, _ in data)),
               metric('enrolled', 'Com matrícula vigente', sum(ident in current for ident in ids))]
    columns = [col('number', 'Código'), col('name', 'Aluno', width=2.5), col('birth_date', 'Nascimento', 'date'), col('class_name', 'Turma', width=1.7), col('created_on', 'Cadastro', 'date'), col('status', 'Situação')]
    return rows, columns, summary, ['Quando há mais de uma matrícula vigente, a turma exibida é a da matrícula mais recente dentro dos filtros.']


def financial(db, school_id, f):
    stmt = select(m.BankCharge).where(m.BankCharge.school_id == school_id, in_period(m.BankCharge.due_on, f))
    if any(f[key] for key in ACADEMIC_FILTERS):
        groups = scoped_groups(db, school_id, f)
        stmt = stmt.where(or_(m.BankCharge.enrollment_id.in_(select(m.Enrollment.id).where(m.Enrollment.school_id == school_id, m.Enrollment.class_group_id.in_(groups))),
                             m.BankCharge.admission_id.in_(select(m.Admission.id).where(m.Admission.school_id == school_id, m.Admission.class_group_id.in_(groups)))))
    if f['status']: stmt = stmt.where(m.BankCharge.status == f['status'])
    if f['q']: stmt = stmt.where(or_(m.BankCharge.description.icontains(f['q'], autoescape=True), m.BankCharge.payer_snapshot['name'].as_string().icontains(f['q'], autoescape=True)))
    data = [entry[0] for entry in limited(db, stmt.order_by(m.BankCharge.due_on, m.BankCharge.created_at, m.BankCharge.id))]
    today = now().astimezone(TZ).date()
    open_states = {'pending', 'overdue'}
    sums = {key: Decimal('0.00') for key in ['nominal', 'received', 'external', 'confirmed', 'open', 'overdue', 'cancelled', 'review', 'queued']}
    rows = []
    for charge in data:
        sums['nominal'] += charge.amount
        key = ('received' if charge.status == 'received' else 'external' if charge.status == 'received_external' else
               'confirmed' if charge.status == 'confirmed' else 'open' if charge.status in open_states else
               'cancelled' if charge.status in {'cancelled', 'refunded'} else 'queued' if charge.status == 'queued' else 'review')
        sums[key] += charge.amount
        is_overdue = charge.status in open_states and charge.due_on < today
        if is_overdue: sums['overdue'] += charge.amount
        rows.append(dict(payer=(charge.payer_snapshot or {}).get('name', ''), description=charge.description,
                         due_on=iso(charge.due_on), amount=amount(charge.amount), billing_type={'PIX': 'Pix', 'BOLETO': 'Boleto'}.get(charge.billing_type, charge.billing_type),
                         status=label(charge.status), overdue_days=(today - charge.due_on).days if is_overdue else 0,
                         _date=iso(charge.due_on), _amount=charge.amount))
    summary = [metric('total', 'Cobranças', len(rows)), metric('nominal', 'Valor nominal', amount(sums['nominal']), 'currency'),
               metric('received', 'Recebidas', amount(sums['received']), 'currency'), metric('external', 'Recebidas externamente', amount(sums['external']), 'currency'),
               metric('confirmed', 'Confirmadas', amount(sums['confirmed']), 'currency'), metric('open', 'Em aberto', amount(sums['open']), 'currency'),
               metric('overdue', 'Vencidas em aberto', amount(sums['overdue']), 'currency'), metric('cancelled', 'Canceladas / estornadas', amount(sums['cancelled']), 'currency'),
               metric('queued', 'Aguardando emissão', amount(sums['queued']), 'currency'), metric('review', 'Conferência / falha', amount(sums['review']), 'currency')]
    columns = [col('payer', 'Pagador', width=1.8), col('description', 'Cobrança', width=2), col('due_on', 'Vencimento', 'date'), col('amount', 'Valor', 'currency'), col('billing_type', 'Meio'), col('status', 'Situação', width=1.3), col('overdue_days', 'Dias em atraso', 'number', .8)]
    notes = ['As cobranças são selecionadas pelo vencimento, e não pela data de pagamento. Este relatório não é fluxo de caixa nem extrato bancário.',
             'Confirmado não é somado a recebido. Valores são nominais, sem dedução de tarifas; estornos parciais e contestações ficam em conferência.',
             'Em aberto inclui cobranças pendentes e vencidas já emitidas. Atraso é calculado até a data de emissão deste relatório.']
    return rows, columns, summary, notes


def admissions(db, school_id, f):
    stmt = select(m.Admission, m.ClassGroup.name).join(m.ClassGroup, and_(m.ClassGroup.id == m.Admission.class_group_id, m.ClassGroup.school_id == school_id)).where(
        m.Admission.school_id == school_id, in_period(m.Admission.created_at, f, True), m.Admission.class_group_id.in_(scoped_groups(db, school_id, f)))
    if f['status']: stmt = stmt.where(m.Admission.status == f['status'])
    if f['q']: stmt = stmt.where(or_(m.Admission.number.icontains(f['q'], autoescape=True), m.Admission.student_data['name'].as_string().icontains(f['q'], autoescape=True)))
    data = limited(db, stmt.order_by(m.Admission.created_at, m.Admission.id))
    rows = [dict(number=a.number, name=(a.student_data or {}).get('name', ''), class_name=group,
                 created_on=iso(a.created_at), submitted_on=iso(a.submitted_at), status=label(a.status), _date=iso(a.created_at)) for a, group in data]
    summary = [metric('total', 'Inscrições', len(rows)), metric('enrolled', 'Matriculados', sum(a.status == 'enrolled' for a, _ in data)),
               metric('review', 'Em análise / correção', sum(a.status in {'submitted', 'under_review', 'changes_requested'} for a, _ in data)),
               metric('waitlisted', 'Lista de espera', sum(a.status == 'waitlisted' for a, _ in data))]
    columns = [col('number', 'Inscrição'), col('name', 'Aluno', width=2.4), col('class_name', 'Turma', width=1.5), col('created_on', 'Cadastro', 'date'), col('submitted_on', 'Envio', 'date'), col('status', 'Situação', width=1.4)]
    return rows, columns, summary, []


def document_pendencies(db, school_id, f):
    from .reports import collect_pendencies, STATE_LABELS
    matched = select(m.Enrollment.student_id).where(m.Enrollment.school_id == school_id,
        m.Enrollment.class_group_id.in_(scoped_groups(db, school_id, f)), in_period(m.Enrollment.enrolled_on, f),
        m.Enrollment.status.in_(['draft', 'active', 'suspended']))
    data = collect_pendencies(db, school_id, {**f, 'document_status': f['status'], '_student_ids': matched,
        '_enrolled_from': f['date_from'], '_enrolled_to': f['date_to'], '_group_ids': scoped_groups(db, school_id, f)})
    if data['truncated']:
        fail(422, 'O filtro excede 5.000 alunos. Restrinja o período, a turma ou a busca; nenhum relatório parcial foi gerado.')
    rows = [dict(number=row['student_number'], name=row['student_name'], class_name=row['class_name'], year=row['year_name'],
                 document=document['name'], status=STATE_LABELS[document['status']]) for row in data['items'] for document in row['documents']]
    summary = [metric('students', 'Alunos com pendências', data['total']), metric('total', 'Documentos pendentes', len(rows)), metric('scanned', 'Alunos verificados', data['scanned_students'])]
    columns = [col('number', 'Código'), col('name', 'Aluno', width=2), col('class_name', 'Turma', width=1.3), col('year', 'Ano letivo'), col('document', 'Documento', width=1.8), col('status', 'Situação', width=1.3)]
    return rows, columns, summary, ['Posição atual dos documentos obrigatórios de matrículas realizadas no período. Não representa a situação documental existente em meses anteriores.']


def attendance(db, school_id, f):
    weighted = [func.sum(case((m.DiaryAttendance.status == state, m.DiaryLesson.lesson_count), else_=0)) for state in ('present', 'absent', 'justified_absence')]
    stmt = select(m.DiaryAttendance.enrollment_id, m.DiaryLesson.diary_id, m.Student.number, m.Person.name,
                  m.ClassGroup.name, m.CurriculumComponent.name, *weighted, func.sum(m.DiaryLesson.lesson_count)).join(
        m.DiaryLesson, and_(m.DiaryLesson.id == m.DiaryAttendance.lesson_id, m.DiaryLesson.school_id == school_id)).join(
        m.SchoolDiary, and_(m.SchoolDiary.id == m.DiaryLesson.diary_id, m.SchoolDiary.school_id == school_id)).join(
        m.Enrollment, and_(m.Enrollment.id == m.DiaryAttendance.enrollment_id, m.Enrollment.school_id == school_id)).join(
        m.Student, and_(m.Student.id == m.DiaryAttendance.student_id, m.Student.school_id == school_id)).join(
        m.Person, and_(m.Person.id == m.Student.person_id, m.Person.school_id == school_id)).join(
        m.ClassGroup, and_(m.ClassGroup.id == m.SchoolDiary.class_group_id, m.ClassGroup.school_id == school_id)).join(
        m.CurriculumComponent, and_(m.CurriculumComponent.id == m.SchoolDiary.component_id, m.CurriculumComponent.school_id == school_id)).where(
        m.DiaryAttendance.school_id == school_id, in_period(m.DiaryLesson.lesson_date, f),
        m.SchoolDiary.class_group_id.in_(scoped_groups(db, school_id, f)))
    if f['q']: stmt = stmt.where(or_(m.Person.name.icontains(f['q'], autoescape=True), m.Student.number.icontains(f['q'], autoescape=True)))
    # Agrega no banco: dezenas de milhares de chamadas não viram objetos Python.
    grouped = stmt.group_by(m.DiaryAttendance.enrollment_id, m.DiaryLesson.diary_id, m.Student.number,
                            m.Person.name, m.ClassGroup.name, m.CurriculumComponent.name)
    data = limited(db, grouped.order_by(m.Person.name, m.ClassGroup.name, m.CurriculumComponent.name))
    rows = [dict(number=number, name=name, class_name=group, component=component, present=present,
                 absent=absent, justified_absence=justified, total_lessons=total,
                 attendance_percent=format(Decimal(present) * 100 / total, '.2f'))
            for _, _, number, name, group, component, present, absent, justified, total in data]
    months = Counter()
    by_day = stmt.with_only_columns(m.DiaryLesson.lesson_date, func.sum(m.DiaryLesson.lesson_count)).group_by(m.DiaryLesson.lesson_date)
    for day, total in db.execute(by_day):
        months[iso(day)[:7]] += total
    summary = [metric('students', 'Alunos distintos', len({row['number'] for row in rows})),
               metric('present', 'Presenças', sum(row['present'] for row in rows)), metric('absent', 'Faltas', sum(row['absent'] for row in rows)),
               metric('justified', 'Faltas justificadas', sum(row['justified_absence'] for row in rows))]
    columns = [col('name', 'Aluno', width=2), col('class_name', 'Turma', width=1.2), col('component', 'Componente', width=1.5), col('total_lessons', 'Aulas', 'number', .6), col('present', 'Presenças', 'number', .8), col('absent', 'Faltas', 'number', .6), col('justified_absence', 'Justificadas', 'number', .8), col('attendance_percent', 'Presença %', 'percent', .8)]
    notes = ['Cada registro é ponderado pela quantidade de aulas do dia. A consolidação mensal conta aulas-aluno com chamada registrada.',
             'A porcentagem considera presenças divididas por aulas com chamada. Faltas justificadas são exibidas separadamente; regras de aprovação são avaliadas no Diário Escolar.',
             'Aulas sem chamada não são tratadas como presença nem falta. Este relatório não substitui o fechamento oficial do diário.']
    return rows, columns, summary, notes, months


def protocols(db, school_id, f):
    stmt = select(m.Protocol, m.Person.name).outerjoin(m.Student, and_(m.Student.id == m.Protocol.student_id, m.Student.school_id == school_id)).outerjoin(
        m.Person, and_(m.Person.id == m.Student.person_id, m.Person.school_id == school_id)).where(m.Protocol.school_id == school_id, in_period(m.Protocol.created_at, f, True))
    if f['status']: stmt = stmt.where(m.Protocol.status == f['status'])
    if f['q']: stmt = stmt.where(or_(m.Protocol.number.icontains(f['q'], autoescape=True), m.Protocol.kind.icontains(f['q'], autoescape=True), m.Person.name.icontains(f['q'], autoescape=True)))
    data = limited(db, stmt.order_by(m.Protocol.created_at, m.Protocol.id))
    today = now().astimezone(TZ).date()
    rows = [dict(number=p.number, name=name or 'Não vinculado', kind=p.kind, created_on=iso(p.created_at),
                 due_on=iso(p.due_on), status=label(p.status), overdue='Sim' if p.due_on and p.due_on < today and p.status not in {'completed', 'cancelled'} else 'Não',
                 _date=iso(p.created_at)) for p, name in data]
    summary = [metric('total', 'Protocolos', len(rows)), metric('completed', 'Concluídos', sum(p.status == 'completed' for p, _ in data)),
               metric('open', 'Em atendimento', sum(p.status in {'open', 'in_progress', 'waiting'} for p, _ in data)), metric('overdue', 'Fora do prazo', sum(row['overdue'] == 'Sim' for row in rows))]
    columns = [col('number', 'Protocolo'), col('name', 'Aluno', width=2), col('kind', 'Solicitação', width=1.8), col('created_on', 'Abertura', 'date'), col('due_on', 'Prazo', 'date'), col('status', 'Situação', width=1.3), col('overdue', 'Atrasado', width=.7)]
    return rows, columns, summary, []


def academic_results(db, school_id, f):
    stmt = select(m.PeriodResult, m.Person.name, m.Student.number, m.ClassGroup.name, m.CurriculumComponent.name,
                  m.AcademicPeriod, m.PeriodAssessmentRule.version).join(
        m.Student, and_(m.Student.id == m.PeriodResult.student_id, m.Student.school_id == school_id)).join(
        m.Person, and_(m.Person.id == m.Student.person_id, m.Person.school_id == school_id)).join(
        m.SchoolDiary, and_(m.SchoolDiary.id == m.PeriodResult.diary_id, m.SchoolDiary.school_id == school_id)).join(
        m.ClassGroup, and_(m.ClassGroup.id == m.SchoolDiary.class_group_id, m.ClassGroup.school_id == school_id)).join(
        m.CurriculumComponent, and_(m.CurriculumComponent.id == m.SchoolDiary.component_id, m.CurriculumComponent.school_id == school_id)).join(
        m.AcademicPeriod, and_(m.AcademicPeriod.id == m.PeriodResult.academic_period_id, m.AcademicPeriod.school_id == school_id)).join(
        m.PeriodAssessmentRule, and_(m.PeriodAssessmentRule.id == m.PeriodResult.rule_id, m.PeriodAssessmentRule.school_id == school_id)).where(
        m.PeriodResult.school_id == school_id, in_period(m.AcademicPeriod.ends_on, f),
        m.SchoolDiary.class_group_id.in_(scoped_groups(db, school_id, f)))
    if f['status']: stmt = stmt.where(m.PeriodResult.status == f['status'])
    if f['q']: stmt = stmt.where(or_(m.Person.name.icontains(f['q'], autoescape=True), m.Student.number.icontains(f['q'], autoescape=True)))
    data = limited(db, stmt.order_by(m.Person.name, m.AcademicPeriod.ends_on, m.CurriculumComponent.name, m.PeriodResult.id))
    rows = []
    stale = 0
    for result, name, number, group, component, period, version in data:
        calculation = result.calculation or {}
        rule = calculation.get('rule') or {}
        outdated = result.rule_version != version
        stale += int(outdated)
        score = str(result.numeric_value).rstrip('0').rstrip('.').replace('.', ',') if result.numeric_value is not None else result.concept_value or 'Pendente'
        rows.append(dict(name=name, number=number, class_name=group, component=component, period=period.name,
                         result=score, attendance_percent=calculation.get('attendance_percent'),
                         method={'arithmetic':'Média aritmética','weighted':'Média ponderada','concept':'Conceito'}.get(rule.get('method'), 'Regra registrada'),
                         status='Regra alterada: reprocessar' if outdated else label(result.status), _date=iso(period.ends_on)))
    summary = [metric('total', 'Resultados consolidados', len(rows)), metric('students', 'Alunos distintos', len({result.student_id for result, *_ in data})),
               metric('attention', 'Com pendências / atenção', sum(result.status not in {'calculated', 'concept'} for result, *_ in data)),
               metric('outdated', 'Regras alteradas', stale)]
    columns = [col('name','Aluno',width=2), col('class_name','Turma',width=1.2), col('component','Componente',width=1.4),
               col('period','Período',width=1.1), col('result','Nota / conceito',width=.8), col('attendance_percent','Frequência','percent',.9),
               col('method','Regra',width=1.1), col('status','Situação',width=1.5)]
    notes = ['Exibe resultados efetivamente consolidados no Diário Escolar, sem calcular médias ou presumir aprovação. Alunos sem consolidação não constam deste relatório.',
             'A frequência segue a regra salva junto à consolidação, inclusive o tratamento de faltas justificadas. Regras alteradas exigem nova consolidação.',
             'A data usada no filtro é o término do período letivo. Consulte o fechamento do diário para a versão oficial preservada.']
    return rows, columns, summary, notes


COLLECTORS = {'enrollments': enrollments, 'students': students, 'financial': financial, 'admissions': admissions,
              'document-pendencies': document_pendencies, 'attendance': attendance, 'academic-results': academic_results, 'protocols': protocols}


def monthly_rows(rows, f, financial_report=False, counts=None):
    buckets = {}
    cursor = f['date_from'].replace(day=1)
    while cursor <= f['date_to']:
        key = cursor.strftime('%Y-%m')
        buckets[key] = {'month': key, 'label': cursor.strftime('%m/%Y'), 'count': (counts or {}).get(key, 0)}
        if financial_report: buckets[key]['amount'] = Decimal('0.00')
        cursor = date(cursor.year + (cursor.month == 12), 1 if cursor.month == 12 else cursor.month + 1, 1)
    for row in rows:
        key = row.get('_date', '')[:7]
        if key in buckets:
            buckets[key]['count'] += 1
            if financial_report: buckets[key]['amount'] += row.get('_amount', Decimal('0.00'))
    for bucket in buckets.values():
        if financial_report: bucket['amount'] = amount(bucket['amount'])
    return list(buckets.values())


def collect_report(kind, db, user, school, f):
    require(user, 'reports.read')
    if kind not in CATALOG: fail(404, 'Relatório não encontrado.')
    catalog = CATALOG[kind]
    require(user, catalog['permission'])
    if f['status'] and f['status'] not in catalog['statuses']:
        fail(422, 'Situação inválida para este relatório.')
    filters = []
    for key, model, caption in [('academic_year_id', m.AcademicYear, 'Ano letivo'), ('class_group_id', m.ClassGroup, 'Turma'), ('unit_id', m.Unit, 'Unidade')]:
        if f[key]:
            if key not in catalog['filters']: fail(422, 'Este relatório não utiliza filtro por ' + caption.lower() + '.')
            obj = scoped(db, model, f[key], school.id)
            filters.append({'label': caption, 'value': obj.name})
    if f['status']:
        state_label = 'Aguardando análise' if kind == 'document-pendencies' and f['status'] == 'received' else label(f['status'])
        filters.append({'label': 'Situação', 'value': state_label})
    if f['q']: filters.append({'label': 'Busca', 'value': f['q']})
    collected = COLLECTORS[kind](db, school.id, f)
    rows, columns, summary, notes = collected[:4]
    monthly = [] if kind == 'document-pendencies' else monthly_rows(rows, f, kind == 'financial', collected[4] if len(collected) > 4 else None)
    period = {'date_from': str(f['date_from']), 'date_to': str(f['date_to']), 'label': f['date_from'].strftime('%d/%m/%Y') + ' a ' + f['date_to'].strftime('%d/%m/%Y')}
    return {'kind': kind, 'title': catalog['title'], 'description': catalog['description'], 'date_basis': catalog['date_basis'],
            'school_name': school.name, 'generated_at': now().astimezone(TZ).isoformat(), 'period': period,
            'filters': filters, 'columns': columns, 'summary': summary, 'monthly': monthly, 'notes': notes,
            'items': [{k: v for k, v in row.items() if not k.startswith('_')} for row in rows], 'total': len(rows)}


@router.get('/reports/catalog')
def report_catalog(db: DB, user: Actor, school: Scope):
    require(user, 'reports.read')
    start, end = default_period()
    permissions = PERMISSIONS.get(user.role, set())
    items = []
    for ident, data in CATALOG.items():
        if data['permission'] not in permissions: continue
        items.append({'id': ident, **{k: v for k, v in data.items() if k not in {'permission', 'statuses'}},
                      'statuses': [{'value': state, 'label': 'Aguardando análise' if ident == 'document-pendencies' and state == 'received' else label(state)} for state in data['statuses']]})
    return {'items': items, 'default_period': {'date_from': str(start), 'date_to': str(end)}}


def csv_safe(value):
    value = str(value if value is not None else '')
    return "'" + value if value.lstrip().startswith(('=', '+', '-', '@', '\t', '\r')) else value


def export_csv(report):
    from .school_reports import format_value
    stream = io.StringIO()
    writer = csv.writer(stream, delimiter=';', quoting=csv.QUOTE_ALL)
    def write(values): writer.writerow([csv_safe(value) for value in values])
    write([report['school_name']]); write([report['title']]); write(['Período', report['period']['label']])
    write(['Critério', report['date_basis']]); write(['Emissão', report['generated_at']])
    for item in report['filters']: write([item['label'], item['value']])
    write([]); write(['Indicador', 'Valor'])
    for item in report['summary']: write([item['label'], format_value(item['value'], item['type'])])
    if report['monthly']:
        write([]); write(['Mês', 'Registros'] + (['Valor nominal'] if report['kind'] == 'financial' else []))
        for item in report['monthly']: write([item['label'], item['count']] + ([format_value(item['amount'], 'currency')] if 'amount' in item else []))
    write([]); write([column['label'] for column in report['columns']])
    for row in report['items']: write([format_value(row.get(column['key']), column['type']) for column in report['columns']])
    write([]); write(['Total de registros', report['total']])
    for note in report['notes']: write(['Observação', note])
    return '\ufeff' + stream.getvalue()


# Extensões registradas antes da rota dinâmica para evitar kind='matriculas.pdf'.
@router.get('/reports/management/{kind}.pdf')
def management_pdf(kind: str, db: DB, user: Actor, school: Scope, request: Request, filters: Filters):
    from .school_reports import render_table
    report = collect_report(kind, db, user, school, filters)
    if report['total'] > MAX_PDF_ROWS:
        fail(422, 'O relatório excede 2.000 registros para PDF. Refine os filtros ou exporte o relatório completo em CSV.')
    payload = render_table(school.name, report['title'], report['columns'], report['items'],
                           summary=report['summary'], period=report['period']['label'], filters=report['filters'],
                           notes=[report['date_basis'], *report['notes']], monthly=report['monthly'], issuer=user.name, db=db)
    audit(db, request, user, 'report.management_exported', school, school.id, {'kind': kind, 'format': 'pdf', 'count': report['total'], 'period': report['period']})
    return Response(payload, media_type='application/pdf', headers={'Content-Disposition': f'attachment; filename="relatorio-{kind}-{filters["date_from"]}-{filters["date_to"]}.pdf"', 'Cache-Control': 'no-store'})


@router.get('/reports/management/{kind}.csv')
def management_csv(kind: str, db: DB, user: Actor, school: Scope, request: Request, filters: Filters):
    report = collect_report(kind, db, user, school, filters)
    audit(db, request, user, 'report.management_exported', school, school.id, {'kind': kind, 'format': 'csv', 'count': report['total'], 'period': report['period']})
    return Response(export_csv(report), media_type='text/csv; charset=utf-8', headers={'Content-Disposition': f'attachment; filename="relatorio-{kind}-{filters["date_from"]}-{filters["date_to"]}.csv"', 'Cache-Control': 'no-store'})


@router.get('/reports/management/{kind}')
def management_report(kind: str, db: DB, user: Actor, school: Scope, filters: Filters,
                      page: int = Query(1, ge=1), page_size: int = Query(30, ge=1, le=100)):
    report = collect_report(kind, db, user, school, filters)
    return {**report, 'items': report['items'][(page - 1) * page_size:page * page_size], 'page': page, 'page_size': page_size}
