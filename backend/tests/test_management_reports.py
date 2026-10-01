"""Regressões de período, totalização, privacidade e documentos escolares."""
import io
import uuid
from datetime import UTC, date, datetime
from decimal import Decimal
from pypdf import PdfReader
from sqlalchemy import select
from app import models as m
from app.db import SessionLocal
from app.management_reports import default_period
from conftest import API, PASSWORD

PERIOD = '?date_from=2026-07-01&date_to=2026-09-30'


def text_pdf(response):
    return '\n'.join(page.extract_text() for page in PdfReader(io.BytesIO(response.content)).pages)


def test_period_validation_and_catalog(api):
    assert default_period(date(2026, 1, 15)) == (date(2025, 10, 1), date(2025, 12, 31))
    assert default_period(date(2024, 3, 31)) == (date(2023, 12, 1), date(2024, 2, 29))
    assert {'enrollments', 'students', 'financial', 'attendance'} <= {r['id'] for r in api.get('/reports/catalog')['items']}
    for query in ['?date_from=2026-07-01', '?date_from=2026-10-01&date_to=2026-09-01', '?date_from=2020-01-01&date_to=2026-10-01', PERIOD + '&status=invalid']:
        api.call('GET', '/reports/management/enrollments' + query, expect=422)
    api.call('GET', '/reports/management/missing' + PERIOD, expect=404)


def test_enrollment_dates_months_and_full_summary(api):
    cat = api.catalogs(capacity=10)
    for index, day in enumerate(['2026-06-30', '2026-07-01', '2026-09-30', '2026-10-01']):
        student = api.student('Aluno período ' + str(index), adult=True)
        api.post('/enrollments', {'student_id': student['id'], 'class_group_id': cat['group']['id'], 'enrolled_on': day})
    report = api.get('/reports/management/enrollments' + PERIOD + '&page_size=1')
    assert report['total'] == 2 and len(report['items']) == 1
    assert [month['count'] for month in report['monthly']] == [1, 0, 1]
    assert report['summary'][0]['value'] == 2 and report['items'][0]['enrolled_on'] == '2026-07-01'
    next_page = api.get('/reports/management/enrollments' + PERIOD + '&page_size=1&page=2')
    assert next_page['items'][0]['enrolled_on'] == '2026-09-30' and next_page['summary'] == report['summary']
    assert 'Aluno período 3' not in api.get('/reports/management/enrollments.csv' + PERIOD).text


def test_timestamp_range_uses_bahia_midnight(api):
    moments = [datetime(2026, 7, 1, 2, 59, 59, tzinfo=UTC), datetime(2026, 7, 1, 3, 0, tzinfo=UTC), datetime(2026, 10, 1, 2, 59, 59, tzinfo=UTC), datetime(2026, 10, 1, 3, 0, tzinfo=UTC)]
    for index, moment in enumerate(moments):
        student = api.student('Fuso horário ' + str(index), adult=True)
        with SessionLocal() as db:
            db.get(m.Student, student['id']).created_at = moment
            db.commit()
    report = api.get('/reports/management/students' + PERIOD)
    assert report['total'] == 2
    assert {row['created_on'] for row in report['items']} == {'2026-07-01', '2026-09-30'}


def test_isolation_and_domain_permissions(api):
    other = api.client.post('/api/v1/schools', headers=api.headers, json={'company_id': api.school['company_id'], 'name': 'Escola isolada relatório'}).json()
    other_api = API(api.client, api.headers, other)
    foreign = other_api.catalogs()
    other_api.enroll(other_api.student('SEGREDO ESCOLA EXTERNA', adult=True), foreign['group'])
    assert api.get('/reports/management/enrollments' + PERIOD)['total'] == 0
    api.call('GET', '/reports/management/enrollments' + PERIOD + '&class_group_id=' + foreign['group']['id'], expect=404)
    email = 'report-' + uuid.uuid4().hex + '@example.com'
    api.client.post('/api/v1/users', headers=api.headers, json={'name': 'Coordenação sem banco', 'email': email, 'password': PASSWORD, 'role': 'coordination', 'school_ids': [api.school['id']]}).raise_for_status()
    login = api.client.post('/api/v1/auth/login', json={'email': email, 'password': PASSWORD}).json()
    restricted = API(api.client, {'Authorization': 'Bearer ' + login['access_token']}, api.school)
    assert 'financial' not in [entry['id'] for entry in restricted.get('/reports/catalog')['items']]
    restricted.call('GET', '/reports/management/financial' + PERIOD, expect=403)
    restricted.call('GET', '/reports/management/financial.csv' + PERIOD, expect=403)


def test_financial_decimal_totals_and_no_secrets(api):
    with SessionLocal() as db:
        user = db.scalar(select(m.User).where(m.User.email == 'admin@example.com'))
        conn = m.IntegrationConnection(school_id=api.school['id'], provider='asaas')
        db.add(conn); db.flush()
        for state, value, due in [('received', '100.10', '2026-07-01'), ('confirmed', '200.20', '2026-08-10'), ('pending', '300.30', '2026-09-30'), ('cancelled', '40.40', '2026-09-20'), ('received', '500.00', '2026-10-01')]:
            ident = str(uuid.uuid4())
            db.add(m.BankCharge(school_id=api.school['id'], connection_id=conn.id, description='Mensalidade ' + state, amount=Decimal(value), due_on=date.fromisoformat(due), billing_type='PIX', status=state, payer_snapshot={'name': 'Pagador de exemplo', 'cpf': 'SEGREDO-CPF', 'email': 'privado@example.test'}, external_reference='test:' + ident, client_key=ident, created_by=user.id))
        db.commit()
    report = api.get('/reports/management/financial' + PERIOD)
    totals = {item['key']: item['value'] for item in report['summary']}
    assert report['total'] == 4 and totals['nominal'] == '641.00'
    assert totals['received'] == '100.10' and totals['confirmed'] == '200.20'
    assert totals['open'] == '300.30' and totals['cancelled'] == '40.40'
    assert [month['amount'] for month in report['monthly']] == ['100.10', '200.20', '340.70']
    csv_data = api.get('/reports/management/financial.csv' + PERIOD).text
    assert 'SEGREDO-CPF' not in str(report) + csv_data and 'privado@example.test' not in str(report) + csv_data
    assert 'R$ 641,00' in csv_data
    assert 'Valores nominais' in text_pdf(api.get('/reports/management/financial.pdf' + PERIOD))


def test_csv_formula_guard_and_pdf_headers(api):
    cat = api.catalogs(capacity=100)
    student = api.student('=FORMULA(1)', adult=True)
    api.enroll(student, cat['group'])
    response = api.get('/reports/management/enrollments.csv' + PERIOD)
    assert response.content.startswith(b'\xef\xbb\xbf') and "'=FORMULA(1)" in response.text
    assert response.headers['cache-control'] == 'no-store'
    pdf_response = api.get('/reports/management/enrollments.pdf' + PERIOD)
    fonts = PdfReader(io.BytesIO(pdf_response.content)).pages[0]['/Resources']['/Font'].get_object().values()
    embedded = [font.get_object().get('/FontDescriptor') for font in fonts]
    assert sum(bool(descriptor and descriptor.get_object().get('/FontFile2')) for descriptor in embedded) >= 2
    text = text_pdf(pdf_response)
    assert 'Consolidação mensal' in text and '07/2026' in text and '09/2026' in text
    assert 'Página 1 de' in text and 'Secretaria / representante' not in text
    assert api.get('/reports/management/enrollments' + PERIOD + '&q=%25')['total'] == 0


def test_document_pendencies_use_enrollment_cohort(api):
    cat = api.catalogs(capacity=3)
    old = api.student('Aluno matrícula antiga', adult=True)
    api.post('/enrollments', {'student_id': old['id'], 'class_group_id': cat['group']['id'], 'enrolled_on': '2026-06-30'})
    current = api.student('Aluno matrícula período', adult=True)
    api.enroll(current, cat['group'])
    api.post('/document-types', {'name': 'Certidão obrigatória', 'required': True})
    report = api.get('/reports/management/document-pendencies' + PERIOD)
    assert report['total'] == 1 and report['items'][0]['name'] == 'Aluno matrícula período'
    assert report['monthly'] == [] and 'sem retrospectiva' in report['date_basis']
    text = text_pdf(api.get('/reports/document-pendencies.pdf'))
    assert 'Documentos pendentes' in text and 'Aluno matrícula antiga' in text


def test_attendance_weights_and_justification(api):
    cat = api.catalogs(capacity=3)
    student = api.student('Frequência ponderada', adult=True)
    enrollment = api.enroll(student, cat['group'])
    with SessionLocal() as db:
        user = db.scalar(select(m.User).where(m.User.email == 'admin@example.com'))
        component = m.CurriculumComponent(school_id=api.school['id'], name='Português')
        db.add(component); db.flush()
        diary = m.SchoolDiary(school_id=api.school['id'], class_group_id=cat['group']['id'], academic_year_id=cat['year']['id'], component_id=component.id)
        db.add(diary); db.flush()
        for index, state in enumerate(['present', 'absent', 'justified_absence']):
            lesson = m.DiaryLesson(school_id=api.school['id'], diary_id=diary.id, lesson_date=date(2026, 9, 21 + index), lesson_count=index + 1, content='Aula de teste', recorded_by=user.id)
            db.add(lesson); db.flush()
            db.add(m.DiaryAttendance(school_id=api.school['id'], lesson_id=lesson.id, enrollment_id=enrollment['id'], student_id=student['id'], status=state, recorded_by=user.id))
        db.commit()
    report = api.get('/reports/management/attendance' + PERIOD)
    row = report['items'][0]
    assert row['total_lessons'] == 6 and row['present'] == 1 and row['absent'] == 2 and row['justified_absence'] == 3
    assert row['attendance_percent'] == '16.67' and report['monthly'][2]['count'] == 6


def test_complete_student_documents(api):
    cat = api.catalogs()
    student = api.student('Ficha completa aluno')
    guardian = api.guardian(student, 'Responsável da ficha')
    enrollment = api.enroll(student, cat['group'])
    api.post('/document-types', {'name': 'Identificação para ficha', 'required': True})
    for kind in ['student_record', 'enrollment_form']:
        issued = api.post('/students/' + student['id'] + '/issued-documents', {'kind': kind, 'enrollment_id': enrollment['id']})
        text = text_pdf(api.get('/files/' + issued['file_id'] + '/download'))
        assert 'Filiação' in text and 'Contatos e endereço' in text
        assert 'Responsável da ficha' in text and 'Legal, Financeiro' in text
        assert 'Dados da matrícula' in text and 'Conferência documental' in text
        assert 'Não contém assinatura digital' in text and 'Página 1 de' in text
    with SessionLocal() as db:
        emitted = db.get(m.IssuedDocument, issued['id'])
        assert emitted.snapshot['layout_version'] == '4' and emitted.snapshot['guardians'][0]['person']['name'] == guardian['name']


def test_academic_results_use_consolidated_value_and_flag_rule_change(api):
    cat = api.catalogs()
    student = api.student('Aluno boletim consolidado', adult=True)
    enrollment = api.enroll(student, cat['group'])
    with SessionLocal() as db:
        user = db.scalar(select(m.User).where(m.User.email == 'admin@example.com'))
        component = m.CurriculumComponent(school_id=api.school['id'], name='Matemática')
        period = m.AcademicPeriod(school_id=api.school['id'], academic_year_id=cat['year']['id'], name='3º trimestre', starts_on=date(2026,7,1), ends_on=date(2026,9,30))
        db.add_all([component, period]); db.flush()
        diary = m.SchoolDiary(school_id=api.school['id'], class_group_id=cat['group']['id'], academic_year_id=cat['year']['id'], component_id=component.id)
        db.add(diary); db.flush()
        rule = m.PeriodAssessmentRule(school_id=api.school['id'], diary_id=diary.id, academic_period_id=period.id, method='weighted', configured_by=user.id, version=2)
        db.add(rule); db.flush()
        db.add(m.PeriodResult(school_id=api.school['id'], diary_id=diary.id, academic_period_id=period.id, enrollment_id=enrollment['id'], student_id=student['id'], rule_id=rule.id,
            numeric_value=Decimal('8.1250'), status='calculated', source_hash='test-only', rule_version=1, calculated_by=user.id, calculated_at=datetime(2026,9,30,tzinfo=UTC),
            calculation={'rule':{'method':'weighted'}, 'attendance_percent':'82.50'}))
        db.commit()
    report = api.get('/reports/management/academic-results' + PERIOD)
    assert report['total'] == 1
    row = report['items'][0]
    assert row['result'] == '8,125' and row['method'] == 'Média ponderada'
    assert row['status'] == 'Regra alterada: reprocessar' and row['attendance_percent'] == '82.50'
    assert 'Aprovado' not in str(report)
    assert report['monthly'][2]['count'] == 1
    assert api.get('/reports/management/academic-results?date_from=2026-07-01&date_to=2026-09-29')['total'] == 0
    assert 'Matemática' in text_pdf(api.get('/reports/management/academic-results.pdf' + PERIOD))
