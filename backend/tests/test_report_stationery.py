"""Timbre, orientação e conteúdo acadêmico no arquivo entregue ao usuário."""
import io
from pathlib import Path

from pypdf import PdfReader
from test_institution import save
from test_learning_portal import activate, portal_call, portal_session, published_learning


def test_stationery_on_student_and_family_exports(api, client, admin):
    logo = (Path(__file__).resolve().parents[2] / 'frontend/public/branding/pige360/symbol.png').read_bytes()
    assert save(client, admin, files={'logo': ('marca.png', logo, 'image/png')}).is_success
    api.update_school(address='Alameda de Teste, 42', email='secretaria@example.test')
    student, _, enrollment, _, _ = published_learning(api)
    issued = api.post('/students/'+student['id']+'/issued-documents', {'kind':'student_record'})
    fiche = api.get('/files/'+issued['file_id']+'/download')
    cookies, _ = portal_session(api)
    activate(client, cookies, student)
    bulletin = portal_call(client, cookies, 'GET', '/learning/'+student['id']+'/report.pdf')
    for content, portrait in ((fiche.content, True), (bulletin.content, False)):
        pdf = PdfReader(io.BytesIO(content))
        for key in ('/Author', '/Creator', '/Producer'):
            assert pdf.metadata[key] == api.school['name']
        for page in pdf.pages:
            assert (page.mediabox.height > page.mediabox.width) == portrait
            assert page.images and b' Do' in page.get_contents().get_data()
            assert 'secretaria@example.test' in page.extract_text()
    grades = '\n'.join(page.extract_text() for page in PdfReader(io.BytesIO(bulletin.content)).pages)
    for label in (enrollment['number'], '3º Bimestre', 'Matemática', '8,5', '66,67%'):
        assert label in grades
    assert '99.9999' not in grades and 'NOTA_INTERNA' not in grades
    assert 'Consulta de resultados publicados' in grades and 'via sem assinatura digital' in grades
    assert 'PRÉVIA' not in grades and 'Sistema de gestão escolar' not in grades
    assert 'Carimbo de identificação institucional' in grades and 'Assinatura da instituição' in grades


def test_bulletin_matrix_keeps_measures_and_publication_distinct():
    from app.report_bulletins import bulletin_sections

    def term(pid, order, grade, rate, status, **changes):
        return dict(period_id=pid, period_name=f'{order}º trimestre', order_index=order, starts_on=f'2026-0{order}-01',
                    class_group_id='turma', class_label='Turma A', component_name='', grade_display=grade,
                    result_label=status, recovery=[], opinions=[],
                    attendance={'total': 1, 'absent': 0, 'justified_absence': 0, 'unrecorded': int(rate is None),
                                'percentage': rate}, **changes)

    math = term('t1', 1, '0', 0, 'Consolidado')
    art = term('t1', 1, 'Satisfatório', None, 'Conceito consolidado')
    entry = {'enrollment_id':'e', 'number':'MAT-1', 'stage':'Médio', 'grade_name':'3ª série', 'year_name':'2026',
             'class_group_id':'turma', 'class_name':'A', 'unit':'Centro', 'shift':'Vespertino',
             'subjects':[{'diary_id':'d1','component_name':'Matemática','periods':[math]},
                         {'diary_id':'d2','component_name':'Arte','periods':[art]}],
             'class_calendars':{'turma':[{'period_id':'t2','period_name':'2º trimestre','order_index':2,'starts_on':'2026-05-01'}]}}
    for model in ('integrated', 'panel', 'journey'):
        matrices = [section for section in bulletin_sections([entry], model) if section.get('column_groups')]
        cells = {(r['component'], c['metric']):r[c['key']] for section in matrices for c in section['columns']
                 if 'metric' in c for r in section['rows']}
        assert cells['Matemática','grade'] == '0' and cells['Matemática','rate'] == '0%'
        assert cells['Arte','grade'] == 'Satisfatório' and cells['Arte','rate'] == 'Não apurada'
        assert cells['Arte','unrecorded'] == 1 and cells['Arte','unpublished'] == '—'
        assert all(sum(b['span'] for b in table['column_groups']) == len(table['columns']) for table in matrices)



def test_grade_matrix_preserves_class_period_order_and_partial_publication():
    from app.learning_portal import grade_tables

    def term(index, grade, classroom='A'):
        return {'period_id': f'p{index}', 'period_name': f'Etapa {index}', 'order_index': index,
                'starts_on': '2026-01-01', 'class_name': classroom, 'component_name': '',
                'grade_display': grade}

    subjects = [
        {'diary_id': 'mat-a', 'component_name': 'Matemática',
         'periods': [term(n, str(n)) for n in (5, 3, 2, 1, 4)]},
        {'diary_id': 'arte-a', 'component_name': 'Arte', 'periods': [term(1, 'Satisfatório')]},
        {'diary_id': 'mat-b', 'component_name': 'Matemática', 'periods': [term(2, '0', 'B')]},
    ]
    first, continuation, other = grade_tables(subjects, 'B')
    assert [c['label'] for c in first['columns'][1:]] == [f'Etapa {n}' for n in (1, 2, 3, 4)]
    assert first['rows'][0] == {'subject': 'Arte', 'p1': 'Satisfatório', 'p2': '—', 'p3': '—', 'p4': '—'}
    assert continuation['rows'] == [{'subject': 'Matemática', 'p5': '5'}]
    assert other['title'].endswith('B') and other['rows'][0]['p2'] == '0'
    assert grade_tables([], 'A') == []


def test_diary_attendance_and_individual_exports_have_typed_registers(api):
    from app import models as m
    from app.db import SessionLocal
    student, _, enrollment, _, closure_id = published_learning(api)
    with SessionLocal() as db:
        closure = db.get(m.DiaryClosure, closure_id)
        url = '/diaries/' + closure.diary_id + '/reports/'
        scope = '?academic_period_id=' + closure.academic_period_id
    for route, labels in [
        ('attendance.pdf' + scope, ('Frequência por aluno', 'Presenças', 'Justificadas', '66,7%')),
        ('student_record.pdf' + scope + '&enrollment_id=' + enrollment['id'],
         ('Frequência individual', 'Conteúdo ministrado', 'Falta justificada', 'Presente')),
    ]:
        pages = PdfReader(io.BytesIO(api.get(url + route).content)).pages
        text = '\n'.join(page.extract_text() for page in pages)
        assert all(label in text for label in labels)
        assert student['number'] in text and 'NOTA_INTERNA' not in text


def test_school_stationery_and_optional_watermark_on_management_pdf(api, client, admin):
    from base64 import b64decode
    from PIL import Image
    from test_school_report_kit import artwork

    assert save(client, admin, files={'logo': ('rede.png', artwork(True), 'image/png')}).is_success
    image = Image.new('RGB', (60, 40), '#12a850')
    stream = io.BytesIO()
    image.save(stream, 'PNG')
    prefs = api.get('/report-preferences')
    result = client.put(api.base + '/report-preferences/logo', headers=api.headers,
                        files={'file': ('escola.png', stream.getvalue(), 'image/png')},
                        data={'version': str(prefs['version'])})
    assert result.is_success
    stored_logo = b64decode(api.get('/reports/catalog')['report_logo'].split(',', 1)[1])
    assert Image.open(io.BytesIO(stored_logo)).convert('RGB').getpixel((0, 0)) == (18, 168, 80)
    for groups, placements in [([], 1), (['records'], 1), (['management'], 2)]:
        prefs = api.get('/report-preferences')
        api.call('PUT', '/report-preferences', {**prefs, 'watermark_documents': groups})
        content = api.get('/reports/management/enrollments.pdf').content
        reader = PdfReader(io.BytesIO(content))
        assert reader.metadata.author == api.school['name']
        for page in reader.pages:
            assert page.images[0].image.convert('RGB').getpixel((0, 0)) == (18, 168, 80)
            assert page.get_contents().get_data().count(b' Do') == placements
            assert 'PRÉVIA' not in page.extract_text()
    prefs = api.get('/report-preferences')
    assert api.call('PUT', '/report-preferences', {'version': prefs['version'], 'color':'#215a68'})['watermark_documents'] == ['management']
