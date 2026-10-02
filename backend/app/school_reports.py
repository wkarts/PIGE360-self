"""Emissão institucional em PDF, sem ativos ou tipografia de marca do fornecedor."""
import io
import threading
from html import escape
from zoneinfo import ZoneInfo
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Table, TableStyle, Spacer, KeepTogether
from .db import now
from .institution import identity_data, InstitutionAsset
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


def render(school_name, title, rows, note='', issuer='', db=None):
    with _LOCK:
        data = identity_data(db) if db is not None else {'display_name':school_name, 'short_name':school_name[:30], 'primary_color':'#334155', 'secondary_color':'#172b3a', 'font_family':'system', 'logo_asset_id':''}
        name = data['display_name']
        brand_regular, brand_bold = _font(data, db)
        regular, bold = _readable_fonts()
        primary, ink = colors.HexColor(data['primary_color']), colors.HexColor('#172b3a')
        body = ParagraphStyle('Body', fontName=regular, fontSize=10, leading=15, textColor=ink, splitLongWords=True)
        caption = ParagraphStyle('Caption', parent=body, fontSize=8.5, leading=12)
        heading = ParagraphStyle('Heading', parent=body, fontName=bold, fontSize=18, leading=24, spaceAfter=8)
        small = ParagraphStyle('School', parent=body, fontName=brand_bold, fontSize=10, leading=13, textColor=primary)
        def para(value, style=body):
            return Paragraph(escape(str(value if value is not None and value != '' else '-')).replace('\n', '<br/>'), style)
        stream = io.BytesIO()
        doc = SimpleDocTemplate(stream, pagesize=A4, rightMargin=20*mm, leftMargin=20*mm,
                                topMargin=38*mm, bottomMargin=24*mm, title=title, author=name)
        parts = [para(title, heading), Spacer(1, 4*mm)]
        if school_name != name:
            parts.extend([para(school_name, caption), Spacer(1, 3*mm)])
        table_rows = [[para(k, caption), para(v)] for k, v in rows]
        if table_rows:
            table = Table(table_rows, colWidths=[49*mm, 121*mm], hAlign='LEFT', splitInRow=1)
            table.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LINEBELOW',(0,0),(-1,-1),.4,colors.HexColor('#e2e8f0')),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7)]))
            parts.append(table)
        if note:
            parts.extend([Spacer(1, 5*mm), para(note)])
        if issuer:
            parts.extend([Spacer(1, 5*mm), para('Operador responsável: '+issuer, caption)])
        parts.append(KeepTogether([Spacer(1, 8*mm), para('________________________________________'),
            para('Secretaria / representante da instituição', caption), Spacer(1, 4*mm),
            para('Documento gerado eletronicamente. Não contém assinatura digital.', caption)]))
        logo = db.get(InstitutionAsset, data['logo_asset_id']) if db is not None and data.get('logo_asset_id') else None
        # Prepara uma vez por emissão, sem busca HTTP de logotipo ou fonte.
        image = ImageReader(io.BytesIO(logo.content)) if logo else None
        stamp = now().astimezone(ZoneInfo('America/Bahia')).strftime('%d/%m/%Y %H:%M %z')
        def page(canvas, document):
            canvas.saveState(); canvas.setCreator(name); canvas._doc.info.producer = name
            left = 20*mm
            if image:
                canvas.drawImage(image, left, A4[1]-29*mm, width=24*mm, height=22*mm, preserveAspectRatio=True, anchor='c', mask='auto')
                left += 30*mm
            school = para(name, small)
            _, height = school.wrap(A4[0]-20*mm-left, 24*mm)
            school.drawOn(canvas, left, A4[1]-17*mm-height/2)
            canvas.setStrokeColor(primary); canvas.setLineWidth(.8)
            canvas.line(20*mm, A4[1]-32*mm, A4[0]-20*mm, A4[1]-32*mm)
            canvas.setFont(regular, 8); canvas.setFillColor(ink)
            canvas.drawString(20*mm, 15*mm, 'Emitido em '+stamp)
            canvas.drawRightString(A4[0]-20*mm, 15*mm, 'Página '+str(document.page))
            canvas.restoreState()
        doc.build(parts, onFirstPage=page, onLaterPages=page)
        return stream.getvalue()


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
                 notes=None, monthly=None, issuer='', db=None, sections=None, profile=None, photo=None, signatures=None, notes_title='Critérios de leitura'):
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
        # A identidade permanece no cabeçalho. Fontes decorativas ou variáveis
        # configuradas na marca não comprometem a leitura dos dados escolares.
        regular, bold = _readable_fonts()
        primary, ink = colors.HexColor(identity['primary_color']), colors.HexColor('#172b3a')
        muted, border, pale = colors.HexColor('#546779'), colors.HexColor('#dce5ec'), colors.HexColor('#f3f7fa')
        pagesize = landscape(A4) if len(columns) >= 7 else A4
        page_width, page_height = pagesize
        margin = 16 * mm
        width = page_width - 2 * margin
        styles = {
            'body': ParagraphStyle('ReportBody', fontName=regular, fontSize=8.2, leading=11.2, textColor=ink, splitLongWords=True),
            'small': ParagraphStyle('ReportSmall', fontName=regular, fontSize=8, leading=10.8, textColor=muted, splitLongWords=True),
            'heading': ParagraphStyle('ReportHeading', fontName=bold, fontSize=20, leading=25, textColor=ink, spaceAfter=4 * mm),
            'section': ParagraphStyle('ReportSection', fontName=bold, fontSize=10.5, leading=14, textColor=ink, spaceAfter=3 * mm),
            'thead': ParagraphStyle('ReportTableHeading', fontName=bold, fontSize=8, leading=10.5, textColor=colors.white, splitLongWords=True),
            'value': ParagraphStyle('ReportMetricValue', fontName=bold, fontSize=14, leading=18, textColor=primary),
            'school': ParagraphStyle('ReportSchool', fontName=brand_bold, fontSize=10, leading=12.5, textColor=primary),
        }
        def p(value, style='body'):
            return Paragraph(escape(str(value if value is not None and value != '' else '-')).replace('\n', '<br/>'), styles[style])
        def table(values, widths, header=True):
            item = LongTable(values, colWidths=widths, repeatRows=1 if header else 0, hAlign='LEFT', splitInRow=1)
            commands = [('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 7),
                        ('RIGHTPADDING', (0, 0), (-1, -1), 7), ('TOPPADDING', (0, 0), (-1, -1), 7),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 7), ('LINEBELOW', (0, 0), (-1, -1), .35, border)]
            if header:
                commands += [('BACKGROUND', (0, 0), (-1, 0), primary), ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, pale])]
            item.setStyle(TableStyle(commands))
            return item
        stream = io.BytesIO()
        doc = SimpleDocTemplate(stream, pagesize=pagesize, leftMargin=margin, rightMargin=margin,
                                topMargin=35 * mm, bottomMargin=23 * mm, title=title, author=name)
        parts = [p(title, 'heading')]
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
                weights = [column.get('width', 1) for column in columns]
                widths = [width * weight / sum(weights) for weight in weights]
                values = [[p(column['label'], 'thead') for column in columns]]
                values += [[p(format_value(row.get(column['key']), column.get('type', 'text'))) for column in columns] for row in rows]
                parts.append(table(values, widths))
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
                weights = [column.get('width', 1) for column in cols]
                values = [[p(column['label'], 'thead') for column in cols]]
                values += [[p(format_value(row.get(column['key']), column.get('type', 'text'))) for column in cols] for row in section['rows']]
                parts.append(table(values, [width * weight / sum(weights) for weight in weights]))
            parts.append(Spacer(1, 5 * mm))
        if signatures:
            blocks = []
            for caption in signatures:
                blocks.append([Spacer(1, 11 * mm), p('________________________________'), p(caption, 'small')])
            signature_table = Table([blocks], colWidths=[width / len(blocks)] * len(blocks))
            signature_table.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP')]))
            parts.append(KeepTogether([signature_table, Spacer(1, 4 * mm)]))
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
        def header(canvas, document):
            canvas.saveState()
            canvas.setCreator(name)
            canvas._doc.info.producer = name
            x = margin
            if logo_image:
                canvas.drawImage(logo_image, x, page_height - 29 * mm, width=22 * mm, height=19 * mm,
                                 preserveAspectRatio=True, anchor='c', mask='auto')
                x += 27 * mm
            heading = p(name, 'school')
            _, height = heading.wrap(page_width - margin - x, 18 * mm)
            heading.drawOn(canvas, x, page_height - 12 * mm - height)
            if name != school_name:
                school_heading = p(school_name, 'small')
                _, subheight = school_heading.wrap(page_width - margin - x, 10 * mm)
                school_heading.drawOn(canvas, x, page_height - 13 * mm - height - subheight)
            canvas.setStrokeColor(primary)
            canvas.setLineWidth(.9)
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
                    self.drawString(margin, 10 * mm, 'Documento emitido pela instituição')
                    self.restoreState()
                    super().showPage()
                super().save()
        doc.build(parts, onFirstPage=header, onLaterPages=header, canvasmaker=NumberedCanvas)
        return stream.getvalue()
