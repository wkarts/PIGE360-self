"""Apresentação dos resultados publicados. Nenhuma regra de cálculo pertence ao modelo."""
from . import models as m
from .report_preferences import preferences
from .school_reports import format_value, render_table
from .security import fail
from .student_reports import student_photo

MODEL_TITLES = {'integrated': 'Boletim escolar · Grade integrada', 'panel': 'Boletim escolar · Painel do aluno',
                'journey': 'Boletim escolar · Percurso acadêmico'}


METRICS = {
    'grade': ('Nota / conceito', 'Nota¹', 2.15), 'total': ('Aulas', 'Aulas', .8),
    'absent': ('Faltas sem justificativa', 'Faltas', .8), 'justified_absence': ('Faltas justificadas', 'Justif.', .85),
    'unrecorded': ('Aulas sem chamada', 'S/ chamada', 1), 'rate': ('Frequência', 'Freq.', 1.1),
    'recovery': ('Recuperação', 'Recup.', 1.2), 'unpublished': ('Não publicado', 'Não publicado', 1.6),
}


def _class_publications(entry):
    groups = {}
    for subject in entry['subjects']:
        for term in subject['periods']:
            group_id = term['class_group_id']
            group = groups.setdefault(group_id, {'name': term['class_label'], 'terms': {}, 'components': {}})
            group['terms'][term['period_id']] = term
            key = (term['component_name'] or subject['component_name'], subject['diary_id'])
            group['components'].setdefault(key, {})[term['period_id']] = term
    return groups


def _matrix(title, periods, components, metrics, *, limit, include_status=False, max_columns=16):
    # Reparte pelos períodos inteiros. O cabeçalho de cada continuação identifica novamente a turma e a medida.
    published_ids = {pid for terms in components.values() for pid in terms}
    start = 0
    while start < len(periods):
        window = []
        count = 0
        for period in periods[start:start + limit]:
            size = len(metrics) if period['period_id'] in published_ids else 1
            if window and count + size > max_columns:
                break
            window.append(period)
            count += size
        start += len(window)
        columns = [{'key': 'component', 'label': 'Componente curricular', 'short_label': 'Componente curricular', 'width': 2.9}]
        bands = [{'label': '', 'span': 1}]
        period_metrics = [metrics if period['period_id'] in published_ids else ['unpublished'] for period in window]
        for position, (period, measures) in enumerate(zip(window, period_metrics)):
            bands.append({'label': period['period_name'], 'span': len(measures)})
            for metric in measures:
                label, short_label, weight = METRICS[metric]
                columns.append({'key': f'{position}_{metric}', 'label': period['period_name'] + ' · ' + label,
                                'short_label': short_label, 'width': weight, 'metric': metric})
        if include_status:
            bands.append({'label': 'Situação', 'span': 1})
            columns.append({'key': 'status', 'label': 'Situação dos períodos publicados', 'short_label': 'Publicada', 'width': 2.25})
        rows = []
        for (name, _), terms in sorted(components.items(), key=lambda item: item[0][0].casefold()):
            row = {'component': name}
            if include_status:
                states = {term['result_label'] for term in terms.values()}
                row['status'] = next(iter(states)) if len(states) == 1 else 'Varia por período'
            for position, (period, measures) in enumerate(zip(window, period_metrics)):
                term = terms.get(period['period_id'])
                for metric in measures:
                    if term is None:
                        value = '—'
                    elif metric == 'grade':
                        value = term['grade_display']
                    elif metric == 'recovery':
                        value = ', '.join(term['recovery']) or '—'
                    elif metric == 'rate':
                        rate = term['attendance']['percentage']
                        value = format_value(rate, 'percent').replace(',00%', '%') if rate is not None else 'Não apurada'
                    else:
                        value = term['attendance'][metric]
                    row[f'{position}_{metric}'] = value
            rows.append(row)
        yield {'title': title, 'columns': columns, 'column_groups': bands, 'rows': rows}


def bulletin_sections(enrollments, model):
    sections = []
    for entry in enrollments:
        if not entry['subjects']:
            continue
        sections.append({'title': 'Matrícula ' + entry['number'], 'fields': [
            ('Ano letivo', entry['year_name']), ('Etapa e série', ' · '.join(filter(None, [entry['stage'], entry['grade_name']]))),
            ('Turma', entry['class_name']), ('Unidade e turno', ' · '.join(filter(None, [entry['unit'], entry['shift']])))]})
        groups = _class_publications(entry)
        for group_id, group in groups.items():
            periods = {p['period_id']: p for p in entry['class_calendars'].get(group_id, [])}
            periods.update(group['terms'])
            ordered = sorted(periods.values(), key=lambda p: (p['order_index'], p['starts_on'], p['period_id']))
            components = group['components']
            terms = [term for by_period in components.values() for term in by_period.values()]
            suffix = ' · ' + group['name'] if len(groups) > 1 or group_id != entry['class_group_id'] else ''
            attendance = ['total', 'absent']
            attendance.extend(key for key in ('justified_absence', 'unrecorded') if any(t['attendance'][key] for t in terms))
            attendance.append('rate')
            if model == 'panel':
                sections.extend(_matrix('Rendimento por componente' + suffix, ordered, components, ['grade'], limit=4, include_status=True))
                sections.extend(_matrix('Aulas, faltas e frequência' + suffix, ordered, components, attendance, limit=4, max_columns=13))
            else:
                # As medidas mais longas ficam em quadro próprio quando o calendário exige muitas colunas.
                # O componente e o período continuam identificados em cada quadro, inclusive após uma troca de turma.
                title = 'Rendimento e frequência por componente' if model == 'integrated' else 'Percurso por componente'
                metrics = ['grade', 'total', 'absent']
                if model == 'journey' and any(t['recovery'] for t in terms):
                    metrics.insert(1, 'recovery')
                additional = [key for key in attendance if key not in metrics]
                compact_calendar = sum(len(metrics) + len(additional) if p['period_id'] in group['terms'] else 1 for p in ordered) <= 13
                if compact_calendar:
                    metrics.extend(additional)
                sections.extend(_matrix(title + suffix, ordered, components, metrics, limit=4, include_status=True, max_columns=14))
                if not compact_calendar:
                    sections.extend(_matrix('Frequência por período' + suffix, ordered, components, additional, limit=4))

            for (name, _), terms_by_id in components.items():
                states = {term['result_label'] for term in terms_by_id.values()}
                if len(states) > 1:
                    fields = [(period['period_name'], terms_by_id[period['period_id']]['result_label'])
                              for period in ordered if period['period_id'] in terms_by_id]
                    sections.append({'title': 'Situação · ' + name + suffix, 'fields': fields})
            for (name, _), terms_by_id in components.items():
                for period in ordered:
                    term = terms_by_id.get(period['period_id'])
                    if not term:
                        continue
                    reference = name + ' · ' + term['period_name'] + suffix
                    if model != 'journey' and term['recovery']:
                        sections.append({'title': 'Recuperação · ' + reference, 'text': ', '.join(term['recovery'])})
                    for opinion in term['opinions']:
                        sections.append({'title': 'Parecer · ' + reference, 'text': opinion})
    return sections


def render_bulletin(db, student, info, enrollments, issuer, *, preview=None, signing=False):
    school = db.get(m.School, student.school_id)
    pref = preview or preferences(school)
    model = pref['bulletin']
    sections = []
    for entry in enrollments:
        if entry.get('bulletin_model') == model and 'display_sections' in entry:
            sections.extend(entry['display_sections'])
        else:
            sections.extend(bulletin_sections([entry], model))
    if not sections:
        fail(409, 'O boletim ficará disponível após a escola publicar o fechamento do período.')
    person = db.get(m.Person, student.person_id)
    note = 'Boletim com assinatura digital institucional' if signing else 'Prévia da Secretaria' if preview is not None else 'Boletim de consulta'
    terms = [t for e in enrollments for s in e['subjects'] for t in s['periods']]
    profile = {'name': info['student_name'], 'registration': info['student_number'], 'detail': 'Registro escolar ' + info['student_number'] + ' · ' + note,
               'facts': [('Aulas publicadas', str(sum(t['attendance']['total'] for t in terms))),
                         ('Faltas sem justificativa', str(sum(t['attendance']['absent'] for t in terms))),
                         ('Faltas justificadas', str(sum(t['attendance']['justified_absence'] for t in terms)))]}
    if len([e for e in enrollments if e['subjects']]) == 1:
        identity = sections.pop(0)
        profile['enrollment_label'] = identity['title']
        profile['details'] = identity['fields']
    return render_table(school, MODEL_TITLES[model], [], [], sections=sections,
        module='Escrituração escolar', profile=profile, report_family='bulletins', preview_copy=preview is not None,
        signed_bulletin=signing,
        notes_title='', notes=['¹ Nota ou conceito. Faltas = sem justificativa. Justif. = faltas justificadas. S/ chamada = aulas sem registro. O traço indica ausência de resultado publicado.'],
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
