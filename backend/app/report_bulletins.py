"""Apresentação dos resultados publicados. Nenhuma regra de cálculo pertence ao modelo."""
from . import models as m
from .learning_portal import grade_tables, NOTE
from .report_preferences import preferences
from .school_reports import render_table
from .security import fail
from .student_reports import student_photo

MODEL_TITLES = {'integrated': 'Boletim escolar · Grade integrada', 'panel': 'Boletim escolar · Painel do aluno',
                'journey': 'Boletim escolar · Percurso acadêmico'}


def bulletin_sections(enrollments, model):
    sections = []
    for e in enrollments:
        if not e['subjects']:
            continue
        sections.append({'title': 'Matrícula ' + e['number'], 'fields': [
            ('Ano letivo e etapa', e['year_name'] + ' · ' + e['stage']), ('Série / turma', e['grade_name'] + ' · ' + e['class_name']),
            ('Unidade / turno', e['unit'] + ' · ' + e['shift'])]})
        outcomes, comments, recovery = [], [], []
        for subject in e['subjects']:
            for term in subject['periods']:
                label = ' · '.join([term['component_name'] or subject['component_name'], term['class_label'], term['period_name']])
                outcomes.append((label, term['result_label']))
                comments.extend({'title': 'Parecer · ' + label, 'text': note} for note in term['opinions'])
                if term['recovery']:
                    recovery.append((label, ', '.join(term['recovery'])))
        labels = {value for _, value in outcomes}
        result = ({'title': 'Situação dos resultados publicados', 'text': outcomes[0][1] + ' em todos os registros do recorte.'}
                  if len(labels) == 1 else {'title': 'Situação por componente e período', 'fields': outcomes})
        if model == 'panel':
            sections.extend([result, *comments, *e['grade_tables'], *grade_tables(e['subjects'], e['class_name'], attendance=True, calendars=e['class_calendars'])])
        else:
            sections.extend(grade_tables(e['subjects'], e['class_name'], style=model, calendars=e['class_calendars']))
            sections.extend([result, *comments])
        if recovery and model != 'journey':
            sections.append({'title': 'Resultados registrados em recuperação', 'fields': recovery})
    return sections


def render_bulletin(db, student, info, enrollments, issuer, *, preview=None, signing=False):
    school = db.get(m.School, student.school_id)
    pref = preview or preferences(school)
    model = pref['bulletin']
    sections = bulletin_sections(enrollments, model)
    if not sections:
        fail(409, 'O boletim ficará disponível após a escola publicar o fechamento do período.')
    person = db.get(m.Person, student.person_id)
    note = 'Confira a assinatura institucional no PDF digital original.' if signing else 'Consulta de resultados publicados · via sem assinatura digital.'
    terms = [t for e in enrollments for s in e['subjects'] for t in s['periods']]
    profile = {'name': info['student_name'], 'detail': 'Registro escolar ' + info['student_number'] + ' · ' + note,
               'facts': [('Aulas no recorte', str(sum(t['attendance']['total'] for t in terms))),
                         ('Faltas sem justificativa', str(sum(t['attendance']['absent'] for t in terms))),
                         ('Faltas justificadas', str(sum(t['attendance']['justified_absence'] for t in terms)))]}
    return render_table(school, MODEL_TITLES[model], [], [], sections=sections,
        module='Escrituração escolar', profile=profile, report_family='bulletins', preview_copy=not signing,
        notes=['A = aulas · F = faltas sem justificativa · J = faltas justificadas · S = aulas sem chamada. O traço indica ausência de publicação para o componente.', NOTE],
        circulation='Uso restrito ao aluno e aos responsáveis autorizados', issuer=issuer, db=db, kit=True,
        layout=model, report_color=pref['color'], reserve_photo=True, photo=student_photo(db, school.id, person), orientation='landscape')


def publication_ids(enrollment):
    return sorted({p['publication_id'] for subject in enrollment['subjects'] for p in subject['periods']})


def published_editions(db, student, enrollments, active_sources=None):
    from sqlalchemy import select
    valid = active_sources if active_sources is not None else {e['enrollment_id']: set(publication_ids(e)) for e in enrollments}
    result = {eid: [] for eid in valid}
    docs = db.scalars(select(m.IssuedDocument).where(m.IssuedDocument.school_id == student.school_id,
        m.IssuedDocument.student_id == student.id, m.IssuedDocument.enrollment_id.in_(valid),
        m.IssuedDocument.kind == 'official_bulletin', m.IssuedDocument.signature_status == 'company_signed')
        .order_by(m.IssuedDocument.created_at.desc(), m.IssuedDocument.id.desc()))
    for doc in docs:
        sources = doc.snapshot.get('publication_ids')
        if sources and set(sources) <= valid[doc.enrollment_id]:
            result[doc.enrollment_id].append({'id': doc.id, 'revision': doc.snapshot['revision'],
                                             'date': doc.created_at.isoformat(), 'model': doc.snapshot['model']})
    return result


def official_content(db, student, enrollments, document_id):
    from .contract_signatures import _company_revision, _read_verified
    if not any(row['id'] == document_id for e in enrollments for row in e.get('official_editions', [])):
        fail(404, 'Via oficial indisponível para esta matrícula e publicação.')
    doc = db.get(m.IssuedDocument, document_id)
    revision = _company_revision(db, doc)
    if not revision:
        fail(409, 'A assinatura institucional está pendente.')
    file = db.get(m.FileRecord, revision.file_id)
    return _read_verified(file)


def prepare_signature(pdf):
    from io import BytesIO
    from pypdf import PdfReader
    from pyhanko.pdf_utils.incremental_writer import IncrementalPdfFileWriter
    from pyhanko.sign.fields import SigFieldSpec, append_signature_field
    from reportlab.lib.units import mm
    from .contract_presentation import SCHOOL_FIELD
    pages = PdfReader(BytesIO(pdf)).pages
    width = float(pages[-1].mediabox.width)
    box = tuple(round(x) for x in (width - 76*mm, 23*mm, width - 13*mm, 33*mm))
    writer = IncrementalPdfFileWriter(BytesIO(pdf))
    append_signature_field(writer, SigFieldSpec(SCHOOL_FIELD, on_page=len(pages)-1, box=box))
    stream = BytesIO()
    writer.write(stream)
    return stream.getvalue()
