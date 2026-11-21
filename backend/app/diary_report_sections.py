"""Seções impressas do diário a partir do recorte já autorizado pelo emissor."""
from .learning_portal import RESULT_LABELS
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


def lessons(data):
    sections = []
    plan = data.get('plan')
    if plan:
        sections.append({'title': 'Planejamento do componente', 'fields': [
            ('Objetivos', plan.get('objectives')), ('Unidades temáticas', plan.get('thematic_units')),
            ('Objetos de conhecimento', plan.get('knowledge_objects')), ('Habilidades BNCC', ', '.join(plan.get('bncc_references') or [])),
            ('Metodologia', plan.get('methodology')), ('Recursos', plan.get('resources')),
            ('Estratégia de avaliação', plan.get('assessment_strategy'))]})
    rows = []
    for item in data['lessons']:
        details = [label + ': ' + item[key] for key, label in (
            ('skills', 'Habilidades'), ('methodology', 'Metodologia'), ('activities', 'Atividades'),
            ('homework', 'Tarefa')) if item.get(key)]
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


def individual(data, enrollment_id):
    sections = []
    attendance = {r['lesson_id']: r for r in data['attendance'] if r['enrollment_id'] == enrollment_id}
    sections.append(register('Frequência individual', [('Data', 1), ('Aulas', .6), ('Conteúdo ministrado', 2), ('Chamada', 1.4)],
        [(format_value(i['lesson_date'], 'date'), i['lesson_count'], i['content'],
          ATTENDANCE.get(attendance[i['id']]['status'], attendance[i['id']]['status']))
         for i in data['lessons'] if i['id'] in attendance]))
    by_instrument = {r['instrument_id']: r for r in data.get('assessment_results', []) if r['enrollment_id'] == enrollment_id}
    sections.append(register('Avaliações do aluno', [('Data', 1), ('Avaliação', 2), ('Nota ou conceito', 1)],
        [(format_value(i['assessment_date'], 'date'), i['title'], mark(by_instrument[i['id']], 'numeric_score', 'concept'))
         for i in data.get('assessments', []) if i['id'] in by_instrument]))
    for title, key, fields in [
        ('Pareceres descritivos', 'opinions', [('Situação', 'status', 1), ('Parecer', 'text', 3)]),
        ('Acompanhamento pedagógico', 'pedagogical_records', [('Data', 'record_date', 1), ('Tipo', 'kind', 1), ('Registro', 'text', 3)]),
        ('Ocorrências do aluno', 'occurrences', [('Data', 'occurrence_date', 1), ('Tipo', 'kind', 1), ('Ocorrência', 'title', 1.5), ('Descrição', 'description', 2)])]:
        records = [r for r in data.get(key, []) if r['enrollment_id'] == enrollment_id]
        if records:
            sections.append(register(title, [(label, weight) for label, _, weight in fields],
                [[format_value(r[k], 'date') if k.endswith('_date') else STATES.get(r[k], r[k]) for _, k, _ in fields] for r in records]))
    return sections
