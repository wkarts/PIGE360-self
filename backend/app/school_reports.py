"""Emissão institucional em PDF, sem ativos ou tipografia de marca do fornecedor."""
import io
import threading
from html import escape
from zoneinfo import ZoneInfo
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import A4, landscape
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
    return render_table(school_name, title, [], [],
                        sections=[{'title': 'Dados do documento', 'fields': rows}],
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
                 module='Secretaria', circulation='Uso restrito aos destinatários autorizados', electronic_notice=False, status_summary=None, orientation='portrait', kit=False, layout='', report_color='', reserve_photo=False):
    """Relatório analítico: cabeçalhos repetidos, indicadores, filtros e paginação.

    Não utiliza o formulário de declarações, evitando blocos de assinatura e
    pares chave/valor impróprios para tabelas com centenas de registros.
    """
    from .models import Company, School
    from reportlab.pdfgen.canvas import Canvas
    from reportlab.platypus import CondPageBreak, LongTable, Image as ReportImage
    with _LOCK:
        school = school_name if isinstance(school_name, School) else None
        company = db.get(Company, school.company_id) if school is not None and db is not None else None
        if school is not None:
            school_name = school.name
        identity = identity_data(db) if db is not None else {
            'display_name': school_name, 'short_name': school_name[:30], 'primary_color': '#205D79',
            'secondary_color': '#172b3a', 'font_family': 'system', 'logo_asset_id': ''}
        name = identity['display_name']
        font_choice = (school.report_preferences or {}).get('font_family', 'inherit') if school and kit else 'inherit'
        if font_choice != 'inherit':
            identity = {**identity, 'font_family': font_choice}
        brand_regular, brand_bold = _font(identity, db)
        regular, bold = brand_regular, brand_bold
        color = report_color or ((school.report_preferences or {}).get('color') if kit and school else '') or identity['primary_color']
        primary = colors.HexColor(color)
        ink = colors.HexColor('#172b3a')
        accent = primary if foreground(color) == '#FFFFFF' else ink
        muted, border, pale = colors.HexColor('#475569'), colors.HexColor('#cbd5df'), colors.HexColor('#f4f7fa')
        pagesize = landscape(A4) if orientation == 'landscape' else A4
        page_width, page_height = pagesize
        margin = 13 * mm
        # Platypus mantém seis pontos de respiro em cada lado do frame.
        side = 59 * mm if layout == 'panel' else 0
        width = page_width - 2 * margin - 12 - side
        styles = {
            'body': ParagraphStyle('ReportBody', fontName=regular, fontSize=8.5, leading=10.8, textColor=ink, splitLongWords=True),
            'small': ParagraphStyle('ReportSmall', fontName=regular, fontSize=7.8, leading=10, textColor=muted, splitLongWords=True),
            'heading': ParagraphStyle('ReportHeading', fontName=bold, fontSize=20, leading=23, textColor=ink, spaceAfter=4 * mm),
            'section': ParagraphStyle('ReportSection', fontName=bold, fontSize=11, leading=14, textColor=ink, spaceAfter=3 * mm),
            'thead': ParagraphStyle('ReportTableHeading', fontName=bold, fontSize=8.5, leading=11, textColor=ink, splitLongWords=True),
            'value': ParagraphStyle('ReportMetricValue', fontName=bold, fontSize=11, leading=13, textColor=accent),
            'school': ParagraphStyle('ReportSchool', fontName=brand_bold, fontSize=13, leading=16, textColor=accent),
        }
        styles['caption'] = ParagraphStyle('ReportCaption', parent=styles['small'], alignment=TA_CENTER)
        styles['field'] = ParagraphStyle('ReportField', fontName=bold, fontSize=7.4, leading=9.6, textColor=muted)
        styles['numeric'] = ParagraphStyle('ReportNumeric', parent=styles['body'], alignment=TA_RIGHT)
        def p(value, style='body'):
            return Paragraph(escape(str(value if value is not None and value != '' else '-')).replace('\n', '<br/>'), styles[style])
        def column_widths(cols, records):
            # Reserva espaço para a palavra mais longa do título e uma data completa.
            # O espaço restante acompanha os pesos definidos por cada módulo.
            minimum = []
            for column in cols:
                words = column['label'].split() or ['']
                label_width = max(pdfmetrics.stringWidth(word, bold, styles['thead'].fontSize) for word in words)
                if column.get('type') == 'date':
                    label_width = max(label_width, pdfmetrics.stringWidth('00/00/0000', regular, styles['body'].fontSize))
                elif column['key'] in {'number', 'student_number', 'enrollment_number'}:
                    codes = {str(record.get(column['key']) or '') for record in records}
                    code_width = max((pdfmetrics.stringWidth(code, regular, styles['body'].fontSize)
                                      for code in codes if len(code) <= 20), default=0)
                    label_width = max(label_width, code_width)
                minimum.append(label_width + 15)
            weights = [column.get('width', 1) for column in cols]
            weighted = [width * weight / sum(weights) for weight in weights]
            available = width - sum(minimum)
            if available <= 0:
                return weighted
            surplus = [max(0, assigned - needed) for assigned, needed in zip(weighted, minimum)]
            total_surplus = sum(surplus)
            if not total_surplus:
                return weighted
            return [base + available * extra / total_surplus for base, extra in zip(minimum, surplus)]

        def table(values, widths, header=True):
            item = LongTable(values, colWidths=widths, repeatRows=1 if header else 0, hAlign='LEFT', splitInRow=1)
            commands = [('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 7),
                        ('RIGHTPADDING', (0, 0), (-1, -1), 7), ('TOPPADDING', (0, 0), (-1, -1), 4),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 4), ('LINEBELOW', (0, 0), (-1, -1), .35, border)]
            if header:
                commands += [('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e6ebef')), ('LINEBELOW',(0,0),(-1,0),.8,accent), ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, pale])]
            item.setStyle(TableStyle(commands))
            return item
        def section_heading(label):
            band = Table([[p(label, 'section')]], colWidths=[width], hAlign='LEFT')
            band.setStyle(TableStyle([('LINEBEFORE',(0,0),(0,0),2,accent),
                                      ('BACKGROUND',(0,0),(0,0),pale), ('LEFTPADDING',(0,0),(0,0),7),
                                      ('TOPPADDING',(0,0),(0,0),3), ('BOTTOMPADDING',(0,0),(0,0),3)]))
            return band

        def record_table(cols, records):
            # Tabelas extensas mantêm os campos de identificação em colunas. Os
            # demais atributos ficam identificados na mesma linha do registro.
            main = cols[:3] if len(cols) > 7 and orientation != 'landscape' else cols
            detail = cols[len(main):]
            headings = list(main)
            if detail:
                headings.append({'key': '', 'label': 'Dados complementares', 'width': 3.2})
            values = [[p(col['label'], 'thead') for col in headings]]
            for record in records:
                line = [p(format_value(record.get(col['key']), col.get('type','text')),
                          'numeric' if col.get('type') in {'currency','number','integer','percent'} else 'body')
                        for col in main]
                if detail:
                    line.append([p(col['label'] + ': ' + format_value(record.get(col['key']), col.get('type','text'))) for col in detail])
                values.append(line)
            return table(values, column_widths(headings, records))

        stream = io.BytesIO()
        doc = SimpleDocTemplate(stream, pagesize=pagesize, leftMargin=margin+side, rightMargin=margin,
                                topMargin=43 * mm, bottomMargin=(37 if kit else 23) * mm, title=title, author=name)
        parts = []
        if period:
            parts.append(p('Período: ' + period, 'small'))
        if filters:
            parts.append(p(' | '.join(item['label'] + ': ' + str(item['value']) for item in filters), 'small'))
        elif not sections:
            scope = 'Abrangência: registros da escola no período selecionado.' if period else 'Abrangência: registros da escola na data da emissão.'
            parts.append(p(scope, 'small'))
        if parts:
            parts.append(Spacer(1, 3 * mm))
        if profile and layout != 'panel':
            content = [p(profile.get('name', ''), 'section'), p(profile.get('detail', ''), 'small')]
            banner_cells = [content]
            banner_widths = [width]
            if photo:
                picture = ReportImage(io.BytesIO(photo))
                picture._restrictSize(24 * mm, 28 * mm)
                banner_cells.append(picture)
                banner_widths = [width - 31 * mm, 31 * mm]
            elif reserve_photo:
                banner_cells.append(p('Foto não cadastrada', 'caption'))
                banner_widths = [width - 31 * mm, 31 * mm]
            if kit and len(banner_cells) == 2:
                banner_cells.reverse()
                banner_widths.reverse()
            if layout == 'journey':
                for caption, value in profile.get('facts', []):
                    banner_cells.append([p(caption, 'field'), p(value, 'value')])
                banner_widths = [26*mm, width*.34] + [(width*.66-26*mm)/3]*3
            banner = Table([banner_cells], colWidths=banner_widths)
            banner.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), pale), ('BOX', (0, 0), (-1, -1), .5, border),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'), ('LEFTPADDING', (0, 0), (-1, -1), 12),
                ('TOPPADDING', (0, 0), (-1, -1), 5), ('BOTTOMPADDING', (0, 0), (-1, -1), 5)]))
            if layout == 'journey':
                banner.setStyle(TableStyle([('LINEABOVE', (0, 0), (-1, 0), 1.6, accent)]))
            parts.extend([banner, Spacer(1, 3 * mm)])
        if summary:
            # Índices em uma faixa tabular compacta, com rótulos acima das medidas.
            count = min(4, len(summary))
            for index in range(0, len(summary), count):
                group = summary[index:index + count]
                metric_table = table([
                    [p(item['label'], 'field') for item in group],
                    [p(format_value(item['value'], item.get('type', 'number')), 'value') for item in group],
                ], [width / len(group)] * len(group))
                parts.append(metric_table)
            parts.append(Spacer(1, 3 * mm))
        if columns:
            parts.extend([CondPageBreak(22 * mm), section_heading('Detalhamento - ' + str(len(rows)) + ' registro(s)')])
            if rows:
                parts.append(record_table(columns, rows))
                if status_summary or monthly:
                    parts.append(Spacer(1, 3 * mm))
            else:
                parts.append(p('Nenhum registro encontrado para os filtros selecionados.', 'small'))
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
        def form_cards(group):
            n = 3 if orientation == 'landscape' else 2
            size = width / n
            cells = []
            for section in group:
                content = [p(section['title'], 'section')]
                for label, value in section['fields']:
                    content.extend([p(label, 'field'), p(value if value not in (None, '') else 'Não informado'), Spacer(1, 2)])
                cells.append(content)
            cells.extend([''] * (n - len(cells)))
            card = Table([cells], colWidths=[size] * n, splitInRow=1)
            card.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'), ('BOX',(0,0),(len(group)-1,0),.4,border),
                                      ('INNERGRID',(0,0),(len(group)-1,0),.4,border), ('LINEABOVE',(0,0),(len(group)-1,0),1,accent)]))
            return card

        cards = []
        for index, section in enumerate(sections or []):
            if layout == 'record' and section.get('fields') and not section.get('columns'):
                cards.append(section)
                if len(cards) == (3 if orientation == 'landscape' else 2) or index == len(sections)-1 or not sections[index+1].get('fields') or sections[index+1].get('columns'):
                    parts.extend([form_cards(cards), Spacer(1, 3 * mm)])
                    cards = []
                continue
            parts.extend([CondPageBreak(18 * mm), section_heading(section['title'])])
            if section.get('text'):
                parts.append(p(section['text']))
            fields = section.get('fields', [])
            if fields:
                field_count = min(4, len(fields)) if kit and orientation == 'landscape' else 2
                cells = []
                for index in range(0, len(fields), field_count):
                    row = [[p(key, 'field'), p(value if value not in (None, '') else 'Não informado')] for key, value in fields[index:index + field_count]]
                    row += [''] * (field_count - len(row))
                    cells.append(row)
                parts.append(table(cells, [width / field_count] * field_count, False))
            if section.get('columns'):
                cols = section['columns']
                parts.append(record_table(cols, section['rows']))
            parts.append(Spacer(1, 3 * mm))
        if signatures:
            cell_width = width / len(signatures)
            blocks = []
            for caption in signatures:
                signature = Table([[p(caption, 'caption')]], colWidths=[cell_width * .84])
                signature.setStyle(TableStyle([('LINEABOVE', (0, 0), (-1, 0), .5, muted),
                                               ('TOPPADDING', (0, 0), (-1, 0), 4)]))
                blocks.append(signature)
            signature_table = Table([blocks], colWidths=[cell_width] * len(blocks))
            parts.append(KeepTogether([Spacer(1, 8 * mm), signature_table, Spacer(1, 2 * mm)]))
        if electronic_notice:
            parts.append(p('Documento gerado eletronicamente. Não contém assinatura digital.', 'small'))
        if notes:
            parts.append(Spacer(1, 3 * mm))
            if notes_title: parts.append(p(notes_title, 'section'))
            for note in notes:
                parts.extend([p(note, 'small'), Spacer(1, 1.5 * mm)])
        if issuer and not kit:
            parts.extend([Spacer(1, 4 * mm), p('Emitido por: ' + issuer, 'small')])
        logo = db.get(InstitutionAsset, identity['logo_asset_id']) if db is not None and identity.get('logo_asset_id') else None
        logo_image = ImageReader(io.BytesIO(logo.content)) if logo else None
        if kit and school and school.report_logo:
            logo_image = ImageReader(io.BytesIO(school.report_logo))
        stamp = now().astimezone(ZoneInfo('America/Bahia')).strftime('%d/%m/%Y às %H:%M')
        from .config import settings
        from reportlab.platypus import KeepInFrame
        version = settings().app_version if db is not None else ''
        edition = 'Sistema de gestão escolar' + (' · ' + version if version and version != 'unknown' else '')
        def header(canvas, document):
            canvas.saveState()
            if kit:
                canvas.setFillColor(primary)
                canvas.rect(0, page_height - 2*mm, page_width, 2*mm, stroke=0, fill=1)
            if layout == 'panel' and profile:
                left = margin + 3*mm
                top = page_height-47*mm
                canvas.setFillColor(pale)
                canvas.roundRect(margin,37*mm,side-3*mm,top-35*mm,2*mm,stroke=0,fill=1)
                if photo:
                    canvas.drawImage(ImageReader(io.BytesIO(photo)),left,top-26*mm,width=22*mm,height=26*mm,preserveAspectRatio=True,mask='auto')
                else:
                    canvas.setFont(regular,8)
                    canvas.setFillColor(muted)
                    canvas.drawString(left,top-15*mm,'Foto não cadastrada')
                facts = [p(profile['name'],'value'), p(profile['detail'],'small'), Spacer(1,4*mm)]
                for caption, value in profile['facts']:
                    facts.extend([p(caption,'field'),p(value,'value'),Spacer(1,2*mm)])
                box = KeepInFrame(side-10*mm, top-67*mm, facts, mode='shrink')
                _, h = box.wrapOn(canvas,side-10*mm,top-67*mm)
                box.drawOn(canvas,left,top-29*mm-h)
            canvas.setCreator(school_name if kit else name)
            canvas._doc.info.producer = name
            top = page_height - 8 * mm
            emblem = 22 * mm
            if logo_image:
                canvas.drawImage(logo_image, margin, top-emblem, width=emblem, height=emblem,
                                 preserveAspectRatio=True, anchor='c', mask='auto')
            else:
                initials = ''.join(word[0] for word in school_name.split()[:2]).upper()
                canvas.setFillColor(pale)
                canvas.roundRect(margin, top-emblem, emblem, emblem, 3*mm, fill=1, stroke=0)
                canvas.setFillColor(accent)
                canvas.setFont(bold, 18)
                canvas.drawCentredString(margin+emblem/2, top-emblem/2-6, initials)
            labels = [p(school_name, 'school')]
            if not kit and name.casefold() != school_name.casefold() and identity.get('logo_asset_id'):
                labels.append(p(name, 'small'))
            if company:
                legal = ' · '.join(filter(None, [company.name, 'CNPJ '+company.document if company.document else '']))
                if legal and legal.casefold() != school_name.casefold():
                    labels.append(p(legal, 'small'))
            if school:
                contact = ' · '.join(value for value in (
                    school.address or (company.address if company else ''),
                    school.phone or (company.phone if company else ''),
                    school.email or (company.email if company else '')) if value)
                if contact:
                    labels.append(p(contact, 'small'))
            x = margin + emblem + 5*mm
            available = page_width-margin-x
            heading = KeepInFrame(available, emblem, labels, mode='shrink')
            _, height = heading.wrapOn(canvas, available, emblem)
            heading.drawOn(canvas, x, top-emblem/2-height/2)
            line_y=top-emblem-2*mm
            canvas.setStrokeColor(accent)
            canvas.setLineWidth(1)
            canvas.line(margin, line_y, page_width-margin, line_y)
            # O título é repetido na capa e nas continuações; cabe em títulos longos.
            title_block=KeepInFrame(page_width-2*margin,9*mm,[p(title,'heading')],mode='shrink')
            title_block.wrapOn(canvas,page_width-2*margin,9*mm)
            title_block.drawOn(canvas,margin,page_height-42*mm)
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
                    if kit and self._pageNumber == total:
                        self.setStrokeColor(accent)
                        self.rect(margin, 20*mm, 61*mm, 12*mm, fill=0, stroke=1)
                        label = KeepInFrame(57*mm, 11*mm, [p(school_name,'field'),p('Carimbo de identificação institucional','small')], mode='shrink')
                        label.wrapOn(self,57*mm,11*mm)
                        label.drawOn(self,margin+2*mm,22*mm)
                        self.line(page_width-margin-63*mm,23*mm,page_width-margin,23*mm)
                        self.setFont(regular, 7)
                        self.drawRightString(page_width-margin,20*mm,'Assinatura da instituição')
                    self.setStrokeColor(border)
                    self.line(margin, 19 * mm, page_width - margin, 19 * mm)
                    self.setFillColor(muted)
                    self.setFont(regular, 7.5)
                    issued_label = 'Emitido em ' + stamp + (' · ' + issuer if kit and issuer else '')
                    self.drawString(margin, 14 * mm, issued_label[:110])
                    self.drawRightString(page_width - margin, 14 * mm, f'Página {self._pageNumber} de {total}')
                    self.setFont(regular, 7)
                    self.drawString(margin, 10 * mm, edition + ' · ' + module)
                    self.drawRightString(page_width - margin, 10 * mm, circulation)
                    self.restoreState()
                    super().showPage()
                super().save()
        doc.build(parts, onFirstPage=header, onLaterPages=header, canvasmaker=NumberedCanvas)
        return stream.getvalue()
