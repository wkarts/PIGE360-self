"""Seções impressas do diário a partir do recorte já autorizado pelo emissor."""
from .learning_portal import RESULT_LABELS, _grade
from .school_reports import format_value

ATTENDANCE = {'present': 'Presente', 'absent': 'Ausente', 'justified_absence': 'Falta justificada'}
STATES = {'draft': 'Rascunho', 'published': 'Publicado', 'closed': 'Fechado', 'open': 'Aberto',
          'archived': 'Arquivado', 'numeric': 'Nota', 'concept': 'Conceito', **RESULT_LABELS}


def register(title, labels, records):
    """Campos ordenados e larguras relativas, específicos da escrituração."""
    columns = [{'key': str(i), 'label': label, 'width': weight} for i, (label, weight) in enumerate(labels)]
    rows = [dict(zip((col['key'] for col in columns), record, strict=True)) for record in records]
    if not rows:
        return {'title': title, 'text': 'Nenhum registro no recorte selecionado.'}
    return {'title': title, 'columns': columns, 'rows': rows}


def mark(record, numeric, concept):
    value = record.get(numeric)
    return str(value).replace('.', ',') if value is not None else record.get(concept) or 'Pendente'


def entry_details(item, scope):
    from .diary_entry_fields import STANDARD
    rows = []
    saved_columns = set()
    for field in item.get('extra_fields') or []:
        column = field.get('column')
        value = item.get(column) if column else field.get('value')
        if column:
            saved_columns.add(column)
        if value:
            rows.append((field['label'], ', '.join(value) if isinstance(value, list) else str(value)))
    for column, label in STANDARD[scope].items():
        value = item.get(column)
        if value and column not in saved_columns:
            rows.append((label, ', '.join(value) if isinstance(value, list) else str(value)))
    return rows


def lessons(data):
    sections = []
    plan = data.get('plan')
    if plan:
        sections.append({'title': 'Planejamento do componente', 'fields': entry_details(plan, 'plan')})
    rows = []
    for item in data['lessons']:
        details = [label + ': ' + value for label, value in entry_details(item, 'lesson')]
        rows.append((format_value(item['lesson_date'], 'date'), item['lesson_count'], item['content'], '\n'.join(details)))
    sections.append(register('Registro cronológico de aulas', [('Data', 1), ('Aulas', .6), ('Conteúdo ministrado', 2.4),
                                                                ('Desenvolvimento e tarefas', 2.4)], rows))
    return sections


def assessments(data, names):
    sections = []
    results = {(r['instrument_id'], r['enrollment_id']): r for r in data.get('assessment_results', [])}
    for instrument in data.get('assessments', []):
        rows = [(name, mark(results.get((instrument['id'], eid), {}), 'numeric_score', 'concept'))
                for eid, name in sorted(names.items(), key=lambda item: item[1])]
        section = register(instrument['title'], [('Aluno e registro escolar', 3), ('Nota ou conceito', 1)], rows)
        section['fields'] = [('Data da avaliação', format_value(instrument['assessment_date'], 'date')),
                             ('Tipo de resultado', STATES.get(instrument['value_type'], instrument['value_type'])),
                             ('Situação', STATES.get(instrument['status'], instrument['status']))]
        sections.append(section)
    return sections


def individual_period(snapshot, period):
    # A ficha individual consultada por período deve usar a mesma publicação anual do boletim.
    data = dict(snapshot)
    for key in ('lessons', 'assessments', 'opinions', 'occurrences', 'period_results', 'assessment_rules'):
        data[key] = [row for row in snapshot.get(key, []) if row.get('academic_period_id') == period.id]
    lesson_ids = {row['id'] for row in data['lessons']}
    instrument_ids = {row['id'] for row in data['assessments']}
    data['attendance'] = [row for row in snapshot.get('attendance', []) if row['lesson_id'] in lesson_ids]
    data['assessment_results'] = [row for row in snapshot.get('assessment_results', []) if row['instrument_id'] in instrument_ids]
    data['pedagogical_records'] = [row for row in snapshot.get('pedagogical_records', [])
                                  if period.starts_on.isoformat() <= row['record_date'] <= period.ends_on.isoformat()]
    return data


def individual(data, enrollment_id, eligible, period_names):
    sections = []
    attendance = {r['lesson_id']: r for r in data['attendance'] if r['enrollment_id'] == enrollment_id}
    rows = []
    for lesson in data['lessons']:
        if eligible(lesson, 'lesson_date'):
            mark_status = (attendance.get(lesson['id']) or {}).get('status')
            rows.append((format_value(lesson['lesson_date'], 'date'), lesson['lesson_count'], lesson['content'],
                         ATTENDANCE.get(mark_status, 'Sem chamada')))
    sections.append(register('Frequência individual', [('Data', 1), ('Aulas', .6), ('Conteúdo ministrado', 2), ('Chamada', 1.4)], rows))
    by_instrument = {r['instrument_id']: r for r in data.get('assessment_results', []) if r['enrollment_id'] == enrollment_id}
    sections.append(register('Avaliações do aluno', [('Data', 1), ('Avaliação', 2), ('Situação do instrumento', 1), ('Nota ou conceito', 1)],
        [(format_value(i['assessment_date'], 'date'), i['title'], STATES.get(i['status'], i['status']),
          mark(by_instrument.get(i['id'], {}), 'numeric_score', 'concept'))
         for i in data.get('assessments', []) if eligible(i, 'assessment_date')]))
    sections.append(register('Resultado consolidado por período', [('Período', 1.5), ('Nota ou conceito', 1), ('Situação do resultado', 1.5)],
        [(period_names.get(r.get('academic_period_id'), 'Período sem identificação'), _grade(r),
          RESULT_LABELS.get(r.get('status'), 'Consolidado'))
         for r in data.get('period_results', []) if r['enrollment_id'] == enrollment_id]))
    for title, key, fields in [
        ('Pareceres descritivos', 'opinions', [('Situação', 'status', 1), ('Parecer', 'text', 3)]),
        ('Acompanhamento pedagógico', 'pedagogical_records', [('Data', 'record_date', 1), ('Tipo', 'kind', 1), ('Registro', 'text', 3)]),
        ('Ocorrências do aluno', 'occurrences', [('Data', 'occurrence_date', 1), ('Tipo', 'kind', 1), ('Ocorrência', 'title', 1.5), ('Descrição', 'description', 2)])]:
        records = [r for r in data.get(key, []) if r['enrollment_id'] == enrollment_id]
        if records:
            sections.append(register(title, [(label, weight) for label, _, weight in fields],
                [[format_value(r[k], 'date') if k.endswith('_date') else STATES.get(r[k], r[k]) for _, k, _ in fields] for r in records]))
    return sections
