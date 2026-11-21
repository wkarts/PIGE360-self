"""Emissão institucional em PDF, sem ativos ou tipografia de marca do fornecedor."""
import io
import threading
from html import escape
from zoneinfo import ZoneInfo
from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Table, TableStyle, Spacer, KeepTogether
from .db import now
from .institution import foreground, identity_data, InstitutionAsset
from .security import fail

# ReportLab compartilha o registro de fontes e o estado de subconjuntos.
_LOCK = threading.RLock()


def _readable_fonts():
    # Fontes redistribuíveis incluídas no ReportLab: incorporação evita depender
    # das fontes instaladas no computador que abre ou imprime o documento.
    from importlib.resources import files
    names = ('SchoolText', 'SchoolText-Bold')
    for name, file in zip(names, ('Vera.ttf', 'VeraBd.ttf')):
        if name not in pdfmetrics.getRegisteredFontNames():
            pdfmetrics.registerFont(TTFont(name, io.BytesIO(files('reportlab').joinpath('fonts', file).read_bytes())))
    pdfmetrics.registerFontFamily(names[0], normal=names[0], bold=names[1], italic=names[0], boldItalic=names[1])
    return names


def _font(data, db):
    if data['font_family'] == 'custom' and data.get('font_asset_id') and db is not None:
        from .institution_fonts import truetype
        asset = db.get(InstitutionAsset, data['font_asset_id'])
        if not asset:
            fail(422, 'A fonte institucional não está disponível. Revise a identidade antes de emitir.')
        name = 'SchoolFont-' + asset.id.split('.')[0]
        if name not in pdfmetrics.getRegisteredFontNames():
            pdfmetrics.registerFont(TTFont(name, io.BytesIO(truetype(asset.content))))
            pdfmetrics.registerFontFamily(name, normal=name, bold=name, italic=name, boldItalic=name)
        return name, name
    # Sem arquivo licenciado próprio, usa equivalentes PDF serif/sans-serif.
    return ('Times-Roman', 'Times-Bold') if data['font_family'] in ('georgia', 'times') else _readable_fonts()


def render(school_name, title, rows, note='', issuer='', db=None, *, module='Secretaria'):
    columns = [{'key': 'field', 'label': 'Identificação', 'width': 1},
               {'key': 'value', 'label': 'Informação registrada', 'width': 2.5}]
    return render_table(school_name, title, columns,
                        [{'field': field, 'value': value} for field, value in rows],
                        module=module, notes=[note] if note else [], issuer=issuer, db=db,
                        signatures=['Secretaria / representante da instituição'],
                        electronic_notice=True)


def format_value(value, kind='text'):
    """Formato comum da prévia exportável, sem floats para valores monetários."""
    from datetime import date, datetime
    from decimal import Decimal, InvalidOperation
    if value is None or value == '':
        return '-'
    if kind == 'date':
        try:
            return date.fromisoformat(str(value)[:10]).strftime('%d/%m/%Y')
        except ValueError:
            return str(value)
    if kind in {'currency', 'percent'}:
        try:
            rendered = format(Decimal(str(value)), ',.2f').replace(',', '_').replace('.', ',').replace('_', '.')
            return ('R$ ' + rendered) if kind == 'currency' else rendered + '%'
        except InvalidOperation:
            return str(value)
    return str(value)


def render_table(school_name, title, columns, rows, *, summary=None, period='', filters=None,
                 notes=None, monthly=None, issuer='', db=None, sections=None, profile=None, photo=None, signatures=None, notes_title='Critérios de leitura',
                 module='Secretaria', circulation='Uso restrito aos destinatários autorizados', electronic_notice=False, status_summary=None):
    """Relatório analítico: cabeçalhos repetidos, indicadores, filtros e paginação.

    Não utiliza o formulário de declarações, evitando blocos de assinatura e
    pares chave/valor impróprios para tabelas com centenas de registros.
    """
    from reportlab.lib.pagesizes import landscape
    from reportlab.pdfgen.canvas import Canvas
    from reportlab.platypus import CondPageBreak, LongTable, Image as ReportImage
    with _LOCK:
        identity = identity_data(db) if db is not None else {
            'display_name': school_name, 'short_name': school_name[:30], 'primary_color': '#205D79',
            'secondary_color': '#172b3a', 'font_family': 'system', 'logo_asset_id': ''}
        name = identity['display_name']
        brand_regular, brand_bold = _font(identity, db)
        regular, bold = brand_regular, brand_bold
        primary = colors.HexColor(identity['primary_color'])
        ink = colors.HexColor('#172b3a')
        accent = primary if foreground(identity['primary_color']) == '#FFFFFF' else ink
        on_primary = colors.HexColor(foreground(identity['primary_color']))
        muted, border, pale = colors.HexColor('#475569'), colors.HexColor('#cbd5df'), colors.HexColor('#f4f7fa')
        column_sets = [columns, *(section.get('columns', []) for section in sections or [])]
        pagesize = landscape(A4) if any(len(items) >= 7 for items in column_sets) else A4
        page_width, page_height = pagesize
        margin = 16 * mm
        # Platypus mantém seis pontos de respiro em cada lado do frame.
        width = page_width - 2 * margin - 12
        styles = {
            'body': ParagraphStyle('ReportBody', fontName=regular, fontSize=8, leading=10.5, textColor=ink, splitLongWords=True),
            'small': ParagraphStyle('ReportSmall', fontName=regular, fontSize=8, leading=10.8, textColor=muted, splitLongWords=True),
            'heading': ParagraphStyle('ReportHeading', fontName=bold, fontSize=17, leading=21, textColor=ink, spaceAfter=4 * mm),
            'section': ParagraphStyle('ReportSection', fontName=bold, fontSize=10.5, leading=14, textColor=ink, spaceAfter=3 * mm),
            'thead': ParagraphStyle('ReportTableHeading', fontName=bold, fontSize=8, leading=10.5, textColor=on_primary, splitLongWords=True),
            'value': ParagraphStyle('ReportMetricValue', fontName=bold, fontSize=14, leading=18, textColor=accent),
            'school': ParagraphStyle('ReportSchool', fontName=brand_bold, fontSize=10, leading=12.5, textColor=accent),
        }
        styles['numeric'] = ParagraphStyle('ReportNumeric', parent=styles['body'], alignment=TA_RIGHT)
        def p(value, style='body'):
            return Paragraph(escape(str(value if value is not None and value != '' else '-')).replace('\n', '<br/>'), styles[style])
        def column_widths(cols):
            # Reserva espaço para a palavra mais longa do título e uma data completa.
            # O espaço restante acompanha os pesos definidos por cada módulo.
            minimum = []
            for column in cols:
                words = column['label'].split() or ['']
                label_width = max(pdfmetrics.stringWidth(word, bold, 8) for word in words)
                if column.get('type') == 'date':
                    label_width = max(label_width, pdfmetrics.stringWidth('00/00/0000', regular, 8))
                minimum.append(label_width + 15)
            weights = [column.get('width', 1) for column in cols]
            weighted = [width * weight / sum(weights) for weight in weights]
            available = width - sum(minimum)
            if available <= 0:
                return weighted
            surplus = [max(0, assigned - needed) for assigned, needed in zip(weighted, minimum)]
            total_surplus = sum(surplus)
            return [base + available * extra / total_surplus for base, extra in zip(minimum, surplus)]

        def table(values, widths, header=True):
            item = LongTable(values, colWidths=widths, repeatRows=1 if header else 0, hAlign='LEFT', splitInRow=1)
            commands = [('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 7),
                        ('RIGHTPADDING', (0, 0), (-1, -1), 7), ('TOPPADDING', (0, 0), (-1, -1), 4),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 4), ('LINEBELOW', (0, 0), (-1, -1), .35, border)]
            if header:
                commands += [('BACKGROUND', (0, 0), (-1, 0), primary), ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, pale])]
            item.setStyle(TableStyle(commands))
            return item
        stream = io.BytesIO()
        doc = SimpleDocTemplate(stream, pagesize=pagesize, leftMargin=margin, rightMargin=margin,
                                topMargin=35 * mm, bottomMargin=23 * mm, title=title, author=name)
        parts = [p(module, 'school'), p(title, 'heading')]
        if period:
            parts.append(p('Período: ' + period, 'small'))
        if filters:
            parts.append(p(' | '.join(item['label'] + ': ' + str(item['value']) for item in filters), 'small'))
        elif not sections:
            scope = 'Abrangência: registros da escola no período selecionado.' if period else 'Abrangência: registros da escola na data da emissão.'
            parts.append(p(scope, 'small'))
        parts.append(Spacer(1, 5 * mm))
        if profile:
            content = [p(profile.get('name', ''), 'section'), p(profile.get('detail', ''), 'small')]
            banner_cells = [content]
            banner_widths = [width]
            if photo:
                picture = ReportImage(io.BytesIO(photo))
                picture._restrictSize(24 * mm, 28 * mm)
                banner_cells.append(picture)
                banner_widths = [width - 31 * mm, 31 * mm]
            banner = Table([banner_cells], colWidths=banner_widths)
            banner.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), pale), ('BOX', (0, 0), (-1, -1), .5, border),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'), ('LEFTPADDING', (0, 0), (-1, -1), 12),
                ('TOPPADDING', (0, 0), (-1, -1), 10), ('BOTTOMPADDING', (0, 0), (-1, -1), 10)]))
            parts.extend([banner, Spacer(1, 5 * mm)])
        if summary:
            metric_rows = []
            cards_per_row = 4 if page_width > A4[0] else 3
            for index in range(0, len(summary), cards_per_row):
                current = summary[index:index + cards_per_row]
                cells = [[p(item['label'], 'small'), Spacer(1, 1.5 * mm), p(format_value(item['value'], item.get('type', 'number')), 'value')] for item in current]
                cells += [''] * (cards_per_row - len(cells))
                metric_rows.append(cells)
            cards = Table(metric_rows, colWidths=[width / cards_per_row] * cards_per_row, hAlign='LEFT')
            cards.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('BACKGROUND', (0, 0), (-1, -1), pale),
                ('BOX', (0, 0), (-1, -1), .5, border), ('INNERGRID', (0, 0), (-1, -1), .5, border),
                ('LEFTPADDING', (0, 0), (-1, -1), 10), ('RIGHTPADDING', (0, 0), (-1, -1), 10),
                ('TOPPADDING', (0, 0), (-1, -1), 9), ('BOTTOMPADDING', (0, 0), (-1, -1), 9)]))
            parts.extend([cards, Spacer(1, 6 * mm)])
        if status_summary:
            parts.extend([CondPageBreak(25 * mm), p('Distribuição por situação', 'section')])
            values = [[p('Situação', 'thead'), p('Registros', 'thead')]]
            values.extend([p(item['label']), p(item['count'], 'numeric')] for item in status_summary)
            parts.extend([table(values, [width * .7, width * .3]), Spacer(1, 4 * mm)])
        if monthly:
            parts.extend([CondPageBreak(30 * mm), p('Consolidação mensal', 'section')])
            monetary = 'amount' in monthly[0]
            headings = ['Mês', 'Registros'] + (['Valor nominal'] if monetary else [])
            values = [[p(value, 'thead') for value in headings]]
            values += [[p(item['label']), p(item['count'])] + ([p(format_value(item['amount'], 'currency'))] if monetary else []) for item in monthly]
            parts.extend([table(values, [width / len(headings)] * len(headings)), Spacer(1, 6 * mm)])
        if columns:
            parts.extend([CondPageBreak(30 * mm), p('Detalhamento - ' + str(len(rows)) + ' registro(s)', 'section')])
            if rows:
                values = [[p(column['label'], 'thead') for column in columns]]
                values += [[p(format_value(row.get(column['key']), column.get('type', 'text')),
                             'numeric' if column.get('type') in {'currency', 'number', 'integer', 'percent'} else 'body') for column in columns] for row in rows]
                parts.append(table(values, column_widths(columns)))
            else:
                parts.append(p('Nenhum registro encontrado para os filtros selecionados.', 'small'))
        for section in sections or []:
            parts.extend([CondPageBreak(30 * mm), p(section['title'], 'section')])
            if section.get('text'):
                parts.append(p(section['text']))
            fields = section.get('fields', [])
            if fields:
                cells = []
                for index in range(0, len(fields), 2):
                    row = [[p(key, 'small'), p(value or 'Não informado')] for key, value in fields[index:index + 2]]
                    row += [''] * (2 - len(row))
                    cells.append(row)
                parts.append(table(cells, [width / 2, width / 2], False))
            if section.get('columns'):
                cols = section['columns']
                values = [[p(column['label'], 'thead') for column in cols]]
                values += [[p(format_value(row.get(column['key']), column.get('type', 'text'))) for column in cols] for row in section['rows']]
                parts.append(table(values, column_widths(cols)))
            parts.append(Spacer(1, 5 * mm))
        if signatures:
            blocks = []
            for caption in signatures:
                blocks.append([Spacer(1, 11 * mm), p('________________________________'), p(caption, 'small')])
            signature_table = Table([blocks], colWidths=[width / len(blocks)] * len(blocks))
            signature_table.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP')]))
            parts.append(KeepTogether([signature_table, Spacer(1, 4 * mm)]))
        if electronic_notice:
            parts.append(p('Documento gerado eletronicamente. Não contém assinatura digital.', 'small'))
        if notes:
            parts.append(Spacer(1, 5 * mm))
            if notes_title: parts.append(p(notes_title, 'section'))
            for note in notes:
                parts.extend([p(note, 'small'), Spacer(1, 1.5 * mm)])
        if issuer:
            parts.extend([Spacer(1, 4 * mm), p('Emitido por: ' + issuer, 'small')])
        logo = db.get(InstitutionAsset, identity['logo_asset_id']) if db is not None and identity.get('logo_asset_id') else None
        logo_image = ImageReader(io.BytesIO(logo.content)) if logo else None
        stamp = now().astimezone(ZoneInfo('America/Bahia')).strftime('%d/%m/%Y às %H:%M')
        from .config import settings
        from reportlab.platypus import KeepInFrame
        version = settings().app_version if db is not None else ''
        edition = 'Sistema de gestão escolar' + (' · ' + version if version and version != 'unknown' else '')
        def header(canvas, document):
            canvas.saveState()
            canvas.setCreator(name)
            canvas._doc.info.producer = name
            x = margin
            if logo_image:
                canvas.drawImage(logo_image, x, page_height - 29 * mm, width=22 * mm, height=19 * mm,
                                 preserveAspectRatio=True, anchor='c', mask='auto')
                x += 27 * mm
            labels = [p(name, 'school')]
            if name != school_name:
                labels.append(p(school_name, 'small'))
            if document.page > 1:
                labels.append(p(module + ' · ' + title, 'small'))
            heading = KeepInFrame(page_width - margin - x, 22 * mm, labels, mode='shrink')
            _, height = heading.wrapOn(canvas, page_width - margin - x, 22 * mm)
            heading.drawOn(canvas, x, page_height - 17 * mm - height / 2)
            canvas.setStrokeColor(primary)
            canvas.setLineWidth(1.5)
            canvas.line(margin, page_height - 31 * mm, page_width - margin, page_height - 31 * mm)
            canvas.restoreState()
        class NumberedCanvas(Canvas):
            def __init__(self, *args, **kwargs):
                super().__init__(*args, **kwargs)
                self._report_pages = []
            def showPage(self):
                self._report_pages.append(dict(self.__dict__))
                self._startPage()
            def save(self):
                total = len(self._report_pages)
                for state in self._report_pages:
                    self.__dict__.update(state)
                    self.saveState()
                    self.setStrokeColor(border)
                    self.line(margin, 19 * mm, page_width - margin, 19 * mm)
                    self.setFillColor(muted)
                    self.setFont(regular, 7.5)
                    self.drawString(margin, 14 * mm, 'Emitido em ' + stamp)
                    self.drawRightString(page_width - margin, 14 * mm, f'Página {self._pageNumber} de {total}')
                    self.setFont(regular, 7)
                    self.drawString(margin, 10 * mm, edition)
                    self.drawRightString(page_width - margin, 10 * mm, circulation)
                    self.restoreState()
                    super().showPage()
                super().save()
        doc.build(parts, onFirstPage=header, onLaterPages=header, canvasmaker=NumberedCanvas)
        return stream.getvalue()
