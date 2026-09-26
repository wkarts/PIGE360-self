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
    return ('Times-Roman', 'Times-Bold') if data['font_family'] in ('georgia', 'times') else ('Helvetica', 'Helvetica-Bold')


def render(school_name, title, rows, note='', issuer='', db=None):
    with _LOCK:
        data = identity_data(db) if db is not None else {'display_name':school_name, 'short_name':school_name[:30], 'primary_color':'#334155', 'secondary_color':'#172b3a', 'font_family':'system', 'logo_asset_id':''}
        name = data['display_name']
        regular, bold = _font(data, db)
        primary, ink = colors.HexColor(data['primary_color']), colors.HexColor(data['secondary_color'])
        body = ParagraphStyle('Body', fontName=regular, fontSize=10, leading=15, textColor=ink, splitLongWords=True)
        caption = ParagraphStyle('Caption', parent=body, fontSize=8.5, leading=12)
        heading = ParagraphStyle('Heading', parent=body, fontName=bold, fontSize=18, leading=24, spaceAfter=8)
        small = ParagraphStyle('School', parent=body, fontName=bold, fontSize=10, leading=13, textColor=primary)
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
