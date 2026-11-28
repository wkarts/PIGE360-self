"""Fichas individuais de conferência das revisões salvas pela escola."""
from fastapi import APIRouter, Query, Response

from . import educacenso
from .management_reports import LABELS
from .school_reports import format_value, render_table
from .security import Actor, DB, Scope, fail

router = APIRouter(prefix='/api/v1/schools/{school_id}/educacenso', tags=['Educacenso'])
STAGES = {'matricula_inicial': 'Matrícula inicial', 'situacao_aluno': 'Situação do aluno'}
ABSENT = 'Não registrado nesta revisão'


@router.get('/drafts/{draft_id}/enrollments/{enrollment_id}/ficha.pdf')
def student_sheet(draft_id: str, enrollment_id: str, db: DB, user: Actor, school: Scope,
                  environment: educacenso.Environment = 'treinamento',
                  version: int | None = Query(default=None, ge=1)):
    educacenso.authorize(user, school)
    draft = educacenso.scoped_draft(db, school.id, draft_id, environment)
    revision = draft.version if version is None else version
    snapshot = educacenso.draft_snapshot(db, draft, revision)
    row = next((entry for entry in snapshot['rows'] if entry['enrollment_id'] == enrollment_id), None)
    if row is None:
        fail(404, 'Matrícula não encontrada nesta revisão do rascunho.')

    declaration = row.get('declaration') or {}
    declared_name = declaration.get('student_name') or row.get('student_name') or ABSENT
    identity_fields = [
        ('Número do aluno', row.get('student_number') or ABSENT),
        ('Número da matrícula', row.get('enrollment_number') or ABSENT),
        ('Turma', row.get('class_name') or ABSENT),
        ('Série / etapa escolar', row.get('grade_name') or ABSENT),
        ('Nível de ensino', row.get('grade_level') or ABSENT),
        ('Turno', row.get('shift_name') or ABSENT),
    ]
    if not row.get('enrollment_number'):
        identity_fields.append(('Identificador da matrícula no rascunho', enrollment_id))
    if not row.get('class_name') and row.get('class_group_id'):
        identity_fields.append(('Identificador da turma no rascunho', row['class_group_id']))

    stage = snapshot.get('stage') or draft.stage
    local_status = row.get('local_status')
    collection_fields = [
        ('Etapa do Educacenso', STAGES[stage]),
        ('Ano da coleta', snapshot.get('collection_year') or ABSENT),
        ('Data de referência', format_value(snapshot.get('reference_date') or draft.reference_date, 'date')),
        ('Ambiente da coleta', 'Treinamento' if environment == 'treinamento' else 'Produção'),
        ('Revisão do rascunho', revision),
        ('Situação da matrícula na escola', LABELS.get(local_status, local_status) or ABSENT),
    ]
    origins = []
    if stage == 'matricula_inicial':
        for key, label in [('student_name', 'Nome do aluno'), ('student_inep_code', 'Código Inep'), ('birth_date', 'Data de nascimento')]:
            original = row.get(key) or None
            effective = declaration.get(key, original) or None
            kind = 'date' if key == 'birth_date' else 'text'
            if key != 'student_name':
                if effective:
                    value = format_value(effective, kind)
                elif key in declaration:
                    value = 'Não informado na declaração'
                else:
                    value = ABSENT
                identity_fields.append((label+' (declaração)', value))
            if effective != original:
                origins.append({'field': label, 'source': format_value(original, kind) if original else ABSENT})
    if stage == 'situacao_aluno':
        collection_fields.append(('Situação do aluno informada pela escola', declaration.get('status') or ABSENT))

    sections = [{'title': 'Vínculo escolar', 'fields': identity_fields},
                {'title': 'Conferência da coleta', 'fields': collection_fields}]
    if origins:
        sections.append({'title': 'Origem dos campos ajustados', 'columns': [
            {'key': 'field', 'label': 'Campo', 'width': 1}, {'key': 'source', 'label': 'Valor de origem na coleta', 'width': 2}
        ], 'rows': origins})

    content = render_table(
        school, 'Educacenso · Ficha individual de conferência', [], [], module='Educacenso', db=db,
        report_family='records', preview_copy=True, layout='record',
        profile={'name': declared_name, 'detail': 'Dados declaratórios do aluno no rascunho escolar'},
        sections=sections,
        notes_title='Identificação do rascunho',
        notes=[f'Rascunho {draft.id} · Revisão {revision}.',
               'Esta ficha reproduz a revisão salva pela escola para conferência interna. A emissão não transmite dados ao Inep.'],
        issuer=user.name, circulation='Conferência interna da escola',
    )
    return Response(content, media_type='application/pdf', headers={
        'Content-Disposition': f'attachment; filename="ficha-educacenso-{enrollment_id}-r{revision}.pdf"',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
    })
