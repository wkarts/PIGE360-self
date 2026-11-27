"""Relatórios de consulta da conta Asaas vinculada à escola."""
import csv
import io
import json
import re
import time
import unicodedata
from dataclasses import dataclass
from datetime import date
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from pathlib import Path
from tempfile import TemporaryFile
from zoneinfo import ZoneInfo

from fastapi import Request
from fastapi.responses import JSONResponse, Response, StreamingResponse
from starlette.background import BackgroundTask

from .access_security import permissions_for
from .asaas_native import asaas_connection, asaas_read, router
from .common import audit
from .db import now
from .school_reports import render_table
from .security import Actor, DB, Scope, fail, require

CATALOG = json.loads(Path(__file__).with_name('asaas_report_catalog.json').read_text(encoding='utf-8'))
MAX_EXPORT_ROWS = 100_000
MAX_EXPORT_BYTES = 64 * 1024 * 1024
MAX_EXPORT_SECONDS = 45
IDENTIFIER = re.compile(r'[A-Za-z0-9][A-Za-z0-9_-]{0,119}')
PRIVATE = {'Cache-Control': 'no-store'}
BAHIA = ZoneInfo('America/Bahia')


def _access(user, *, exporting=False):
    require(user, 'asaas.reports.read')
    if exporting:
        require(user, 'asaas.reports.export')


def _invalid():
    fail(502, 'O Asaas retornou dados ou paginação inconsistentes. Atualize a consulta.')


def _limit():
    fail(422, 'A exportação excedeu o limite de tempo ou volume. Refine os filtros.')


def _clean(value):
    value = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', str(value))
    return re.sub(r'\$aact_[\w+=./-]+', '[credencial oculta]', value)[:1500]


def _integer(value, low, high):
    if not re.fullmatch(r'[0-9]{1,8}', str(value)) or not low <= int(value) <= high:
        fail(422, 'Paginação inválida. Informe uma posição válida e até 100 registros por página.')
    return int(value)


@dataclass
class Query:
    path: str
    params: dict
    filters: dict
    description: str
    offset: int
    limit: int


def _query(definition, incoming):
    fields = definition['filters']
    dates = definition.get('dates', {})
    allowed = {'offset', 'per_page'} | {field['key'] for field in fields}
    if dates:
        allowed.update(('date_field', 'date_from', 'date_to'))
    if incoming.keys() - allowed:
        fail(422, 'Há filtros incompatíveis com este relatório.')
    offset = _integer(incoming.get('offset', 0), 0, 10_000_000)
    limit = _integer(incoming.get('per_page', 25), 1, 100)
    params, normalized, labels = {}, {}, []
    path = definition['endpoint']
    for field in fields:
        key = field['key']
        value = str(incoming.get(key, definition.get('defaults', {}).get(key, ''))).strip()
        if not value:
            if field.get('required'):
                fail(422, 'Preencha o campo ' + field['label'] + '.')
            continue
        if len(value) > 200 or any(ord(c) < 32 or ord(c) == 127 for c in value):
            fail(422, 'Valor de filtro inválido.')
        if field['type'] == 'identifier' and not IDENTIFIER.fullmatch(value):
            fail(422, 'Identificador inválido.')
        if field['type'] == 'select' and value not in field['options']:
            fail(422, 'Opção de filtro inválida.')
        normalized[key] = value
        labels.append(field['label'] + ': ' + field.get('options', {}).get(value, value))
        if key == definition.get('path_filter'):
            path = path.replace('{id}', value)
        else:
            params[key] = value == 'true' if key in definition.get('booleans', []) else value
    if dates:
        basis = incoming.get('date_field') or next(iter(dates))
        if basis not in dates:
            fail(422, 'Campo de data indisponível para este relatório.')
        start, end = incoming.get('date_from', ''), incoming.get('date_to', '')
        boundaries = definition.get('range', [basis + '[ge]', basis + '[le]'])
        for key, value, remote in zip(('date_from', 'date_to'), (start, end), boundaries):
            if value:
                try:
                    if date.fromisoformat(value).isoformat() != value:
                        raise ValueError()
                except ValueError:
                    fail(422, 'Informe uma data válida no formato AAAA-MM-DD.')
                params[remote] = normalized[key] = value
        if start and end and start > end:
            fail(422, 'A data final deve ser igual ou posterior à inicial.')
        if start or end:
            normalized['date_field'] = basis
            labels.append(dates[basis] + ': ' + (start or 'início do histórico') + ' até ' + (end or 'fim do histórico'))
    return Query(path, params, normalized, _clean(' | '.join(labels)) or 'Sem filtros adicionais', offset, limit)


def _projection(row, definition):
    if not isinstance(row, dict):
        _invalid()
    result = {}
    for column in definition['columns']:
        key, kind = column['key'], column['type']
        value = row
        for segment in key.split('.'):
            value = value.get(segment) if isinstance(value, dict) else None
        if value is None:
            if definition['kind'] == 'summary':
                _invalid()
        elif isinstance(value, (dict, list)):
            _invalid()
        elif kind in ('number', 'money'):
            try:
                if len(str(value)) > 40:
                    raise InvalidOperation()
                number = Decimal(str(value))
                if not number.is_finite() or abs(number) > Decimal('999999999999.99'):
                    raise InvalidOperation()
                value = format(number.quantize(Decimal('.01'), rounding=ROUND_HALF_UP), 'f') if kind == 'money' else str(number)
            except (InvalidOperation, ValueError, OverflowError):
                _invalid()
        elif kind == 'integer':
            if not re.fullmatch(r'-?[0-9]{1,15}', str(value)):
                _invalid()
            value = int(value)
        elif kind == 'boolean':
            if not isinstance(value, bool):
                _invalid()
        elif kind == 'date':
            value = value[:35] if isinstance(value, str) and re.fullmatch(r'[0-9]{4}-[0-9]{2}-[0-9]{2}(?:[ T][0-9:.+Z-]+)?', value) else None
        else:
            value = _clean(value)
        result[key] = value
    return result


def _page(connection, definition, query, offset, limit, *, whole_collection=False):
    kind = definition['kind']
    params = dict(query.params)
    if kind == 'list':
        params.update(offset=offset, limit=limit)
    payload = asaas_read(connection, query.path, params=params)
    if not isinstance(payload, dict):
        _invalid()
    if kind == 'summary':
        return [_projection(payload, definition)], 1, False
    rows, total, more = payload.get('data'), payload.get('totalCount'), payload.get('hasMore')
    if not isinstance(rows, list) or type(more) is not bool or (total is not None and (type(total) is not int or total < 0)):
        _invalid()
    if kind == 'collection':
        if more or len(rows) > MAX_EXPORT_ROWS or (total is not None and total != len(rows)):
            _invalid()
        if any(not isinstance(row, dict) for row in rows):
            _invalid()
        total = len(rows)
        if not whole_collection:
            rows = rows[offset:offset + limit]
            more = offset + len(rows) < total
    else:
        count = len(rows)
        end = offset + count
        if len(rows) > limit or (more and not rows) or ('offset' in payload and (type(payload['offset']) is not int or payload['offset'] != offset)):
            _invalid()
        if total is not None and ((count and total < end) or (more and total <= end) or (not more and total > end)):
            _invalid()
        identifiers = set()
        for row in rows:
            identifier = row.get('id') if isinstance(row, dict) else None
            if not isinstance(identifier, str) or not IDENTIFIER.fullmatch(identifier) or identifier in identifiers:
                _invalid()
            identifiers.add(identifier)
    return [_projection(row, definition) for row in rows], total, more


def _csv_text(value):
    value = _clean(value)
    first = next((c for c in value if not c.isspace() and not unicodedata.category(c).startswith('C')), '')
    return "'" + value if first in {'=', '+', '-', '@'} else value


def _csv_val(value, kind):
    if value is None:
        return ''
    if kind == 'boolean':
        return 'Sim' if value else 'Não'
    if kind in {'number', 'money', 'integer'}:
        return str(value).replace('.', ',')
    return _csv_text(value)


def _export(connection, definition, query, started):
    deadline = time.monotonic() + MAX_EXPORT_SECONDS
    file = TemporaryFile(mode='w+b')
    row_buffer = io.StringIO(newline='')
    writer = csv.writer(row_buffer, delimiter=';', quoting=csv.QUOTE_ALL)
    def write(values):
        row_buffer.seek(0)
        row_buffer.truncate()
        writer.writerow(values)
        file.write(row_buffer.getvalue().encode('utf-8'))
    columns = definition['columns']
    prefix = ['Produção' if connection.environment == 'production' else 'Homologação',
              definition['title'], started, _csv_text(query.description)]
    offset, expected_total, seen = 0, None, set()
    try:
        file.write(b'\xef\xbb\xbf')
        write(['Ambiente', 'Relatório', 'Consulta iniciada em', 'Filtros'] +
              [c['label'] + (' (R$)' if c['type'] == 'money' else '') for c in columns])
        while True:
            if time.monotonic() > deadline:
                _limit()
            rows, total, more = _page(connection, definition, query, offset, 100, whole_collection=True)
            if total is not None:
                if total > MAX_EXPORT_ROWS:
                    _limit()
                if expected_total is not None and total != expected_total:
                    fail(409, 'A lista mudou durante a exportação. Atualize os filtros e tente novamente.')
                expected_total = total
            for row in rows:
                if definition['kind'] == 'list':
                    identifier = row['id']
                    if identifier in seen:
                        fail(409, 'A API repetiu lançamentos entre as páginas. Atualize a consulta.')
                    seen.add(identifier)
                write(prefix + [_csv_val(row[c['key']], c['type']) for c in columns])
                offset += 1
                if offset > MAX_EXPORT_ROWS or file.tell() > MAX_EXPORT_BYTES:
                    _limit()
            if time.monotonic() > deadline:
                _limit()
            if not more:
                break
        if expected_total is not None and offset != expected_total:
            _invalid()
        size = file.tell()
        file.seek(0)
        return file, size, offset
    except BaseException:
        file.close()
        raise


@router.get('/reports/catalog')
def report_catalog(db: DB, user: Actor, school: Scope):
    _access(user)
    public = []
    for key, item in CATALOG.items():
        public.append({'id': key, **{name: item[name] for name in ('title', 'group', 'description', 'kind', 'filters', 'columns')},
                       'dates': item.get('dates', {}), 'defaults': item.get('defaults', {})})
    return JSONResponse({'items': public, 'can_export': 'asaas.reports.export' in permissions_for(user, db, school.id)}, headers=PRIVATE)


def _context(report_id, request, db, user, school, exporting=False):
    _access(user, exporting=exporting)
    definition = CATALOG.get(report_id)
    if not definition:
        fail(404, 'Relatório Asaas não encontrado.')
    if len(request.query_params) != len(request.query_params.multi_items()):
        fail(422, 'Informe cada filtro uma única vez.')
    query = _query(definition, dict(request.query_params))
    return definition, query, asaas_connection(db, school)


@router.get('/reports/{report_id}.csv')
def export_csv(report_id: str, request: Request, db: DB, user: Actor, school: Scope):
    definition, query, connection = _context(report_id, request, db, user, school, exporting=True)
    stamp = now().astimezone(BAHIA)
    file, size, count = _export(connection, definition, query, stamp.isoformat())
    try:
        audit(db, request, user, 'banking.asaas_report_exported', connection, school.id, {'report': report_id, 'rows': count, 'format': 'csv', 'environment': connection.environment})
        name = f'asaas-{report_id}-{connection.environment}-{stamp:%Y%m%d-%H%M%S}.csv'
        return StreamingResponse(iter(lambda: file.read(65536), b''), media_type='text/csv; charset=utf-8',
                                 background=BackgroundTask(file.close), headers={**PRIVATE, 'Content-Length': str(size),
                                 'Content-Disposition': f'attachment; filename="{name}"'})
    except BaseException:
        file.close()
        raise


def _read_report(report_id, request, db, user, school, exporting=False):
    definition, query, connection = _context(report_id, request, db, user, school, exporting)
    offset = 0 if definition['kind'] == 'summary' else query.offset
    started_at = now().astimezone(BAHIA).isoformat()
    rows, total, more = _page(connection, definition, query, offset, query.limit)
    audit(db, request, user, 'banking.asaas_report_exported' if exporting else 'banking.asaas_report_viewed', connection, school.id,
          {'report': report_id, 'rows': len(rows), 'environment': connection.environment, 'format': 'pdf' if exporting else 'json'})
    return {'id': report_id, 'title': definition['title'], 'description': definition['description'], 'kind': definition['kind'],
            'columns': definition['columns'], 'items': rows, 'total': total, 'offset': offset, 'per_page': query.limit,
            'returned': len(rows), 'has_more': more, 'next_offset': offset + len(rows) if more else None,
            'environment': connection.environment, 'environment_label': 'Produção' if connection.environment == 'production' else 'Homologação',
            'started_at': started_at, 'generated_at': now().astimezone(BAHIA).isoformat(), 'filters': query.filters, 'filter_description': query.description}


@router.get('/reports/{report_id}.pdf')
def export_pdf(report_id: str, request: Request, db: DB, user: Actor, school: Scope):
    page = _read_report(report_id, request, db, user, school, exporting=True)
    columns = [{**col, 'type': 'currency' if col['type'] == 'money' else col['type']} for col in page['columns'] if col['visible']]
    items = [{key: ('Sim' if value else 'Não') if isinstance(value, bool) else value for key, value in row.items()} for row in page['items']]
    start = page['offset'] + 1 if items else 0
    end = page['offset'] + len(items) if items else 0
    interval = f"{start}–{end} de {page['total'] if page['total'] is not None else 'total não informado'}"
    content = render_table(school, page['title'], columns, items, db=db, issuer=user.name, report_family='management',
        module='Financeiro · Asaas', orientation='landscape', filters=[
            {'label': 'Ambiente', 'value': 'Produção' if page['environment'] == 'production' else 'Homologação'},
            {'label': 'Registros desta página', 'value': interval}, {'label': 'Filtros', 'value': page['filter_description']}])
    return Response(content, media_type='application/pdf', headers={**PRIVATE,
        'Content-Disposition': f'attachment; filename="asaas-{report_id}-pagina.pdf"'})


@router.get('/reports/{report_id}')
def consult(report_id: str, request: Request, db: DB, user: Actor, school: Scope):
    return JSONResponse(_read_report(report_id, request, db, user, school), headers=PRIVATE)
