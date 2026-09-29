"""Modelos de documentos da escola: DOCX local editável, prévia e emissão PDF."""
import hashlib
import io
import json
import re
import zipfile
from datetime import date
from html import escape as html_escape
from pathlib import Path
from types import SimpleNamespace
from threading import RLock
from xml.etree import ElementTree as ET

from fastapi import APIRouter, File, Request, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator
from sqlalchemy import select
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

from . import models as m
from .common import audit, output
from .documents import validate_upload, write_file
from .institution import InstitutionAsset, identity_data
from .security import Actor, DB, Scope, check_version, fail, lock_school, require, scoped
from .storage import read_bytes

router = APIRouter(prefix='/api/v1/schools/{school_id}', tags=['Modelos de documentos'])
PLACEHOLDER = re.compile(r'\{\{\s*([a-z][a-z0-9_.]{0,79})\s*\}\}')
ANY_PLACEHOLDER = re.compile(r'\{\{([^{}]*)\}\}')
KIND = re.compile(r'^[a-z][a-z0-9_]{1,39}$')
NS = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
FIELDS = [
    ('escola.nome', 'Nome da escola', 'cadastro'),
    ('escola.razao_social', 'Razão social da mantenedora', 'cadastro'),
    ('escola.cnpj', 'CNPJ da mantenedora', 'cadastro'),
    ('escola.endereco', 'Endereço da escola', 'cadastro'),
    ('escola.cep', 'CEP', 'cadastro'), ('escola.bairro', 'Bairro', 'cadastro'),
    ('escola.cidade', 'Cidade', 'cadastro'), ('escola.uf', 'UF', 'cadastro'),
    ('escola.telefone', 'Telefone', 'cadastro'), ('escola.email', 'E-mail', 'cadastro'),
    ('aluno.nome', 'Nome do aluno', 'cadastro'), ('aluno.nascimento', 'Nascimento do aluno', 'cadastro'),
    ('aluno.cpf', 'CPF do aluno', 'cadastro'),
    ('matricula.numero', 'Número da matrícula', 'cadastro'),
    ('matricula.data', 'Data da matrícula', 'cadastro'),
    ('matricula.ano_letivo', 'Ano letivo', 'cadastro'),
    ('matricula.serie', 'Série ou etapa', 'cadastro'),
    ('matricula.turma', 'Turma', 'cadastro'),
    ('matricula.turno', 'Turno', 'cadastro'),
    ('matricula.unidade', 'Unidade', 'cadastro'),
    ('contratante1.nome', 'Contratante I', 'cadastro'),
    ('contratante1.nascimento', 'Nascimento do contratante I', 'cadastro'),
    ('contratante1.cpf', 'CPF do contratante I', 'cadastro'),
    ('contratante1.cep', 'CEP do contratante I', 'cadastro'),
    ('contratante1.endereco', 'Endereço do contratante I', 'cadastro'),
    ('contratante1.bairro', 'Bairro do contratante I', 'cadastro'),
    ('contratante1.cidade', 'Cidade do contratante I', 'cadastro'),
    ('contratante1.uf', 'UF do contratante I', 'cadastro'),
    ('contratante1.email', 'E-mail do contratante I', 'cadastro'),
    ('contratante2.nome', 'Contratante II', 'cadastro'),
    ('contratante2.nascimento', 'Nascimento do contratante II', 'cadastro'),
    ('contratante2.cpf', 'CPF do contratante II', 'cadastro'),
    ('contratante2.cep', 'CEP do contratante II', 'cadastro'),
    ('contratante2.endereco', 'Endereço do contratante II', 'cadastro'),
    ('contratante2.bairro', 'Bairro do contratante II', 'cadastro'),
    ('contratante2.cidade', 'Cidade do contratante II', 'cadastro'),
    ('contratante2.uf', 'UF do contratante II', 'cadastro'),
    ('contratante2.email', 'E-mail do contratante II', 'cadastro'),
    ('financeiro.anuidade', 'Valor da anuidade', 'manual'),
    ('financeiro.parcelas', 'Número de parcelas', 'manual'),
    ('financeiro.valor_parcela', 'Valor da parcela', 'manual'),
    ('financeiro.dia_vencimento', 'Dia de vencimento', 'manual'),
    ('financeiro.desconto_pontualidade', 'Desconto de pontualidade', 'manual'),
    ('financeiro.desconto_especial', 'Benefício especial', 'manual'),
    ('assinatura.cidade', 'Cidade da assinatura', 'manual'),
    ('assinatura.uf', 'UF da assinatura', 'manual'),
    ('assinatura.data', 'Data da assinatura', 'manual'),
    ('testemunha1.nome', 'Nome da testemunha I', 'manual'),
    ('testemunha1.cpf', 'CPF da testemunha I', 'manual'),
    ('testemunha2.nome', 'Nome da testemunha II', 'manual'),
    ('testemunha2.cpf', 'CPF da testemunha II', 'manual'),
]
AUTOMATIC_FIELDS = {key for key, _, source in FIELDS if source == 'cadastro'}
PDF_LOCK = RLock()


def _is_contract_kind(kind: str) -> bool:
    """Contratos em inglês ou português exigem assinatura A1 da escola."""
    return bool({'contract', 'contracts', 'contrato', 'contratos'} & set(kind.split('_')))


class TemplateInput(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    name: str = Field(min_length=2, max_length=160)
    kind: str = Field(default='educational_contract', pattern=r'^[a-z][a-z0-9_]{1,39}$')
    header: str = Field(default='', max_length=500)
    body: str = Field(min_length=10, max_length=100000)
    footer: str = Field(default='', max_length=500)
    academic_year_id: str | None = None
    valid_from: date | None = None
    valid_until: date | None = None
    active: bool = True
    require_signature: bool = False

    @model_validator(mode='after')
    def validate_period(self):
        if self.valid_from and self.valid_until and self.valid_until < self.valid_from:
            raise ValueError('O término da vigência deve ser posterior ao início.')
        if _is_contract_kind(self.kind) and not self.require_signature:
            raise ValueError('Modelos de contrato exigem assinatura A1 da escola.')
        _placeholders(self.header + '\n' + self.body + '\n' + self.footer)
        return self


class TemplatePatch(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    version: int = Field(ge=1)
    name: str | None = None
    kind: str | None = None
    header: str | None = None
    body: str | None = None
    footer: str | None = None
    academic_year_id: str | None = None
    valid_from: date | None = None
    valid_until: date | None = None
    active: bool | None = None
    require_signature: bool | None = None


class RenderInput(BaseModel):
    model_config = ConfigDict(extra='forbid')
    enrollment_id: str | None = None
    template_version: int | None = Field(default=None, ge=1)
    values: dict[str, str] = Field(default_factory=dict)

    @model_validator(mode='after')
    def validate_values(self):
        if len(self.values) > 160:
            raise ValueError('Limite de 160 campos excedido.')
        if any(not PLACEHOLDER.fullmatch('{{' + key + '}}') or len(value) > 2000 for key, value in self.values.items()):
            raise ValueError('Chave ou valor de campo inválido.')
        return self


class IssueInput(RenderInput):
    enrollment_id: str
    idempotency_key: str | None = Field(default=None, min_length=8, max_length=120, pattern=r'^[A-Za-z0-9._:-]+$')


def _placeholders(content: str) -> list[str]:
    names = list(dict.fromkeys(PLACEHOLDER.findall(content)))
    if len(names) > 160 or any(not PLACEHOLDER.fullmatch('{{' + key + '}}') for key in ANY_PLACEHOLDER.findall(content)):
        fail(422, 'Modelo com campos inválidos ou mais de 160 campos distintos.')
    return names


def _save_revision(db, template: m.DocumentTemplate, actor_id: str):
    payload = {key: getattr(template, key) for key in TemplateInput.model_fields}
    for key in ('valid_from', 'valid_until'):
        payload[key] = payload[key].isoformat() if payload[key] else None
    payload['letterhead_file_id'] = template.letterhead_file_id
    payload['letterhead_sha256'] = (
        scoped(db, m.FileRecord, template.letterhead_file_id, template.school_id).sha256
        if template.letterhead_file_id else None
    )
    digest = hashlib.sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
    revision = m.DocumentTemplateRevision(school_id=template.school_id, template_id=template.id,
                                          version_number=template.version, content=payload,
                                          sha256=digest, created_by=actor_id)
    db.add(revision)
    db.flush()
    return revision


def _versioned_template(db, template: m.DocumentTemplate, version_number: int | None):
    revision = db.scalar(select(m.DocumentTemplateRevision).where(
        m.DocumentTemplateRevision.school_id == template.school_id,
        m.DocumentTemplateRevision.template_id == template.id,
        m.DocumentTemplateRevision.version_number == (version_number or template.version),
    ))
    if not revision:
        fail(404, 'Versão do modelo não encontrada nesta escola.')
    values = dict(revision.content)
    for key in ('valid_from', 'valid_until'):
        values[key] = date.fromisoformat(values[key]) if values.get(key) else None
    return SimpleNamespace(id=template.id, version=revision.version_number,
                           revision_sha256=revision.sha256, **values)


def _format_date(value) -> str:
    return value.strftime('%d/%m/%Y') if value else ''


def _person_values(person, prefix: str) -> dict[str, str]:
    if not person:
        return {}
    return {
        f'{prefix}.nome': person.name or '',
        f'{prefix}.nascimento': _format_date(person.birth_date),
        f'{prefix}.cpf': person.cpf or '',
        f'{prefix}.cep': person.postal_code or '',
        f'{prefix}.endereco': person.address or (f'{person.street}, {person.address_number}'.strip(', ') if person.street else ''),
        f'{prefix}.bairro': person.district or '',
        f'{prefix}.cidade': person.city or '',
        f'{prefix}.uf': person.state or '',
        f'{prefix}.email': person.email or '',
    }


def _context(db, school: m.School, enrollment: m.Enrollment | None) -> dict[str, str]:
    company = db.get(m.Company, school.company_id)
    school_name = identity_data(db)['display_name']
    result = {
        'escola.nome': school_name,
        'escola.razao_social': company.name if company else '',
        'escola.cnpj': (company.document or '') if company else '',
        'escola.endereco': school.address or ((company.address or '') if company else ''),
        'escola.cep': (company.postal_code or '') if company else '',
        'escola.bairro': (company.district or '') if company else '',
        'escola.cidade': (company.city or '') if company else '',
        'escola.uf': (company.state or '') if company else '',
        'escola.telefone': school.phone or '',
        'escola.email': school.email or '',
    }
    if not enrollment:
        return result
    student = scoped(db, m.Student, enrollment.student_id, school.id)
    pupil = scoped(db, m.Person, student.person_id, school.id)
    group = scoped(db, m.ClassGroup, enrollment.class_group_id, school.id)
    year = scoped(db, m.AcademicYear, enrollment.academic_year_id, school.id)
    grade = scoped(db, m.Grade, group.grade_id, school.id)
    shift = scoped(db, m.Shift, group.shift_id, school.id)
    unit = scoped(db, m.Unit, group.unit_id, school.id)
    result.update(_person_values(pupil, 'aluno'))
    result.update({
        'matricula.numero': enrollment.number or '',
        'matricula.data': _format_date(enrollment.enrolled_on),
        'matricula.ano_letivo': year.name,
        'matricula.serie': grade.name,
        'matricula.turma': group.name,
        'matricula.turno': shift.name,
        'matricula.unidade': unit.name,
    })
    guardian_links = db.scalars(select(m.GuardianLink).where(
        m.GuardianLink.school_id == school.id, m.GuardianLink.student_id == student.id,
        m.GuardianLink.active.is_(True),
    ).order_by(m.GuardianLink.created_at, m.GuardianLink.id)).all()
    persons = {link.person_id: scoped(db, m.Person, link.person_id, school.id) for link in guardian_links}
    ordered = sorted(guardian_links, key=lambda link: (
        link.person_id != enrollment.financial_person_id,
        not link.legal,
        not link.primary_contact,
        link.created_at,
        link.id,
    ))
    for index, link in enumerate(ordered[:2], start=1):
        result.update(_person_values(persons[link.person_id], f'contratante{index}'))
    return result


def _applicable(template: m.DocumentTemplate, enrollment: m.Enrollment) -> bool:
    return (not template.academic_year_id or template.academic_year_id == enrollment.academic_year_id) and (
        not template.valid_from or date.today() >= template.valid_from
    ) and (not template.valid_until or date.today() <= template.valid_until)


def _render(template, values: dict[str, str]):
    fields = _placeholders('\n'.join((template.header, template.body, template.footer)))
    selected = {key: str(values.get(key, '') or '').strip() for key in fields}
    missing = [key for key, value in selected.items() if not value]
    def replace(content):
        return PLACEHOLDER.sub(lambda match: selected[match.group(1)] or match.group(0), content)
    return { 'header': replace(template.header), 'content': replace(template.body),
             'footer': replace(template.footer), 'variables': selected,
             'missing_fields': missing, 'template_version': template.version }


def _render_with_context(db, school, template, enrollment, supplied):
    available = set(_placeholders('\n'.join((template.header, template.body, template.footer))))
    if set(supplied) - available:
        fail(422, 'A requisição contém campos que não existem neste modelo.')
    official = _context(db, school, enrollment)
    for key, value in supplied.items():
        if key in AUTOMATIC_FIELDS and official.get(key) and str(value).strip() != official[key]:
            fail(409, f'O campo {key} já possui valor cadastrado. Corrija o cadastro de origem antes de emitir.')
    return _render(template, {**official, **supplied})


def _pdf_font(db, brand):
    if brand.get('font_family') == 'custom':
        from .school_reports import _font
        return _font(brand, db)
    serif = brand.get('font_family') in {'times', 'georgia'}
    family = 'DejaVuSerif' if serif else 'DejaVuSans'
    regular_path = f'/usr/share/fonts/truetype/dejavu/{family}.ttf'
    bold_path = f'/usr/share/fonts/truetype/dejavu/{family}-Bold.ttf'
    if not Path(regular_path).is_file() or not Path(bold_path).is_file():
        fail(503, 'Fontes PDF da instalação indisponíveis. Instale fonts-dejavu-core.')
    if family not in pdfmetrics.getRegisteredFontNames():
        pdfmetrics.registerFont(TTFont(family, regular_path))
        pdfmetrics.registerFont(TTFont(family+'-Bold', bold_path))
        pdfmetrics.registerFontFamily(family, normal=family, bold=family+'-Bold')
    return family, family+'-Bold'


def _pdf(db, school: m.School, name: str, preview: dict) -> bytes:
    with PDF_LOCK:
        return _render_pdf(db, school, name, preview)


def _render_pdf(db, school: m.School, name: str, preview: dict) -> bytes:
    """Papel timbrado local; entrada é texto, nunca HTML ativo."""
    brand = identity_data(db)
    regular_name, bold_name = _pdf_font(db, brand)
    primary = brand.get('primary_color', '#006D77')
    try:
        accent = colors.HexColor(primary)
    except ValueError:
        accent = colors.black
    buffer = io.BytesIO()
    page_width, page_height = A4
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=22*mm, rightMargin=22*mm,
                            topMargin=43*mm, bottomMargin=32*mm,
                            title=name, author=brand['display_name'])
    regular = ParagraphStyle('Contract', fontName=regular_name, fontSize=10, leading=15, spaceAfter=5*mm)
    heading = ParagraphStyle('ContractHeading', parent=regular, fontName=bold_name, fontSize=10.5, leading=15, spaceBefore=4*mm, spaceAfter=2*mm, textColor=accent)
    flow = []
    for raw in preview['content'].splitlines():
        line = raw.strip()
        if not line:
            flow.append(Spacer(1, 3*mm))
        else:
            line = ''.join(ch for ch in line if ch == '\t' or ord(ch) >= 32).replace('\t', '    ')
            style = heading if line.upper().startswith(('CLÁUSULA ', 'CLAUSULA ', 'CONTRATO DE ')) else regular
            flow.append(Paragraph(html_escape(line), style))
    if not flow:
        fail(422, 'O corpo do modelo não pode ficar vazio.')
    logo_id = brand.get('logo_asset_id')
    logo = db.get(InstitutionAsset, logo_id) if logo_id else None
    letterhead = preview.get('letterhead_file')
    background = ImageReader(io.BytesIO(read_bytes(letterhead))) if letterhead else None
    logo_reader = None
    if logo:
        try:
            logo_reader = ImageReader(io.BytesIO(logo.content))
        except Exception:
            logo_reader = None
    text_style = ParagraphStyle('Letterhead', fontName=regular_name, fontSize=8.5, leading=11, textColor=colors.black)
    footer_style = ParagraphStyle('Letterfooter', parent=text_style, fontSize=7.5, leading=9)
    def page(canvas, pdf_doc):
        canvas.saveState()
        if background:
            canvas.drawImage(background, 0, 0, width=page_width, height=page_height, mask='auto')
        if logo_reader and not background:
            w, h = logo_reader.getSize()
            width = min(38*mm, w * 13*mm/h)
            canvas.drawImage(logo_reader, 22*mm, page_height - 22*mm, width=width,
                             height=width*h/w, preserveAspectRatio=True, mask='auto')
        header = preview['header'] or ('' if background else brand['display_name'])
        header_paragraph = Paragraph(html_escape(header).replace('\n', '<br/>'), text_style)
        _, height = header_paragraph.wrap(page_width - 85*mm, 23*mm)
        if height > 23*mm:
            fail(422, 'Cabeçalho do modelo excede a área do papel timbrado.')
        header_paragraph.drawOn(canvas, 64*mm, page_height - 11*mm - height)
        if not background:
            canvas.setStrokeColor(accent)
            canvas.line(22*mm, page_height - 36*mm, page_width - 22*mm, page_height - 36*mm)
        footer = preview['footer']
        if footer:
            footer_paragraph = Paragraph(html_escape(footer).replace('\n', '<br/>'), footer_style)
            _, height = footer_paragraph.wrap(page_width-44*mm, 17*mm)
            if height > 17*mm:
                fail(422, 'Rodapé do modelo excede a área reservada.')
            footer_paragraph.drawOn(canvas, 22*mm, 12*mm)
        canvas.setFont(regular_name, 7)
        canvas.drawRightString(page_width - 22*mm, 8*mm, f'Página {pdf_doc.page}')
        canvas.restoreState()
    doc.build(flow, onFirstPage=page, onLaterPages=page)
    return buffer.getvalue()


def _paragraph_text(element) -> str:
    parts = []
    for node in element.iter():
        tag = node.tag.rsplit('}', 1)[-1]
        if tag == 't':
            parts.append(node.text or '')
        elif tag == 'tab':
            parts.append('\t')
        elif tag in ('br', 'cr'):
            parts.append('\n')
    return ''.join(parts)


def _docx_part(data: bytes, part: str) -> str:
    root = ET.fromstring(data)
    blocks = []
    parent = root.find('w:body', NS) if part == 'word/document.xml' else root
    if parent is None:
        return ''
    for block in parent:
        tag = block.tag.rsplit('}', 1)[-1]
        if tag == 'p':
            blocks.append(_paragraph_text(block))
        elif tag == 'tbl':
            for row in block.findall('w:tr', NS):
                cells = []
                for cell in row.findall('w:tc', NS):
                    cells.append(' / '.join(filter(None, (_paragraph_text(p).strip() for p in cell.findall('.//w:p', NS)))))
                blocks.append(' | '.join(cells))
    return '\n'.join(blocks).strip()


@router.get('/document-templates/fields')
def fields(db: DB, user: Actor, school: Scope):
    require(user, 'documents.read')
    return {'fields': [{'key': key, 'label': label, 'source': source} for key, label, source in FIELDS]}


@router.post('/document-templates/import-docx')
def import_docx(db: DB, user: Actor, school: Scope, file: UploadFile = File(...)):
    require(user, 'academic.write')
    if not (file.filename or '').lower().endswith('.docx'):
        fail(422, 'Envie um arquivo DOCX válido.')
    data = file.file.read(2*1024*1024 + 1)
    if not data or len(data) > 2*1024*1024:
        fail(413, 'O DOCX deve ter até 2 MB.')
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as z:
            info = z.infolist()
            if len(info) > 500 or sum(member.file_size for member in info) > 12*1024*1024 or 'word/document.xml' not in z.namelist():
                fail(422, 'Arquivo DOCX inválido ou demasiado grande após descompactação.')
            body = _docx_part(z.read('word/document.xml'), 'word/document.xml')
            headers = [_docx_part(z.read(name), name) for name in sorted(z.namelist()) if re.fullmatch(r'word/header\d+\.xml', name)]
            footers = [_docx_part(z.read(name), name) for name in sorted(z.namelist()) if re.fullmatch(r'word/footer\d+\.xml', name)]
    except (zipfile.BadZipFile, ET.ParseError, KeyError, RuntimeError, ValueError):
        fail(422, 'DOCX inválido ou com XML danificado.')
    if len(body) < 10 or len(body) > 100000:
        fail(422, 'DOCX sem texto editável ou acima de 100 mil caracteres.')
    header, footer = '\n'.join(filter(None, headers))[:500], '\n'.join(filter(None, footers))[:500]
    return {'name': Path(file.filename).stem[:160], 'header': header, 'body': body, 'footer': footer,
            'placeholders': _placeholders('\n'.join((header, body, footer))),
            'warnings': ['Imagens, assinaturas, tabelas com mesclagem e formatação avançada precisam ser conferidas no editor e no PDF.',
                         'Substitua campos em branco ou XXXXXX por {{variavel}} antes da emissão.']}


@router.get('/document-templates')
def list_templates(db: DB, user: Actor, school: Scope, enrollment_id: str | None = None, include_inactive: bool = False):
    require(user, 'documents.read')
    enrollment = scoped(db, m.Enrollment, enrollment_id, school.id) if enrollment_id else None
    templates = db.scalars(select(m.DocumentTemplate).where(m.DocumentTemplate.school_id == school.id).order_by(m.DocumentTemplate.name, m.DocumentTemplate.id)).all()
    return {'items': [output(template) for template in templates if (include_inactive or template.active) and (enrollment is None or _applicable(template, enrollment))]}


@router.post('/document-templates', status_code=201)
def create_template(data: TemplateInput, db: DB, user: Actor, school: Scope, request: Request):
    require(user, 'academic.write')
    if data.academic_year_id:
        scoped(db, m.AcademicYear, data.academic_year_id, school.id)
    obj = m.DocumentTemplate(school_id=school.id, **data.model_dump())
    db.add(obj); db.flush()
    _save_revision(db, obj, user.id)
    audit(db, request, user, 'document_template.created', obj, school.id, {'kind': obj.kind})
    return output(obj)


@router.get('/document-templates/{template_id}')
def get_template(template_id: str, db: DB, user: Actor, school: Scope):
    require(user, 'documents.read')
    return output(scoped(db, m.DocumentTemplate, template_id, school.id))


@router.get('/document-templates/{template_id}/revisions')
def list_revisions(template_id: str, db: DB, user: Actor, school: Scope):
    require(user, 'documents.read')
    scoped(db, m.DocumentTemplate, template_id, school.id)
    rows = db.scalars(select(m.DocumentTemplateRevision).where(
        m.DocumentTemplateRevision.school_id == school.id,
        m.DocumentTemplateRevision.template_id == template_id,
    ).order_by(m.DocumentTemplateRevision.version_number.desc())).all()
    return {'items': [output(row, ('content',)) for row in rows]}


@router.get('/document-templates/{template_id}/revisions/{version_number}')
def get_revision(template_id: str, version_number: int, db: DB, user: Actor, school: Scope):
    require(user, 'documents.read')
    template = scoped(db, m.DocumentTemplate, template_id, school.id)
    revision = _versioned_template(db, template, version_number)
    return {'version_number': version_number, 'sha256': revision.revision_sha256,
            'content': {key: value.isoformat() if isinstance(value, date) else value
                        for key, value in vars(revision).items() if key not in {'id', 'version', 'revision_sha256'}}}


@router.patch('/document-templates/{template_id}')
def edit_template(template_id: str, data: TemplatePatch, db: DB, user: Actor, school: Scope, request: Request):
    require(user, 'academic.write')
    lock_school(db, school.id)
    obj = scoped(db, m.DocumentTemplate, template_id, school.id)
    check_version(obj, data.version)
    current = {key: getattr(obj, key) for key in TemplateInput.model_fields}
    try:
        validated = TemplateInput.model_validate({**current, **data.model_dump(exclude={'version'}, exclude_unset=True)})
    except ValidationError:
        fail(422, 'Revise os campos e a assinatura A1 obrigatória do modelo.')
    if validated.academic_year_id:
        scoped(db, m.AcademicYear, validated.academic_year_id, school.id)
    for key, value in validated.model_dump().items():
        setattr(obj, key, value)
    obj.version += 1
    db.flush()
    _save_revision(db, obj, user.id)
    audit(db, request, user, 'document_template.updated', obj, school.id, {'version': obj.version})
    return output(obj)


@router.post('/document-templates/{template_id}/letterhead')
def upload_letterhead(template_id: str, db: DB, user: Actor, school: Scope, request: Request, file: UploadFile = File(...)):
    require(user, 'academic.write')
    lock_school(db, school.id)
    obj = scoped(db, m.DocumentTemplate, template_id, school.id)
    data = file.file.read(2*1024*1024 + 1)
    if len(data) > 2*1024*1024:
        fail(413, 'O papel timbrado deve ter até 2 MB.')
    mime = validate_upload(data, file.filename or '')
    if mime not in ('image/png', 'image/jpeg'):
        fail(422, 'Papel timbrado deve ser PNG ou JPEG.')
    stored = write_file(db, school.id, user.id, file.filename or 'papel-timbrado.png', mime, data, file_kind='letterhead')
    obj.letterhead_file_id = stored.id
    obj.version += 1
    db.flush()
    _save_revision(db, obj, user.id)
    audit(db, request, user, 'document_template.letterhead_uploaded', obj, school.id, {'sha256': stored.sha256})
    return output(obj)


@router.delete('/document-templates/{template_id}/letterhead')
def remove_letterhead(template_id: str, db: DB, user: Actor, school: Scope, request: Request):
    require(user, 'academic.write')
    lock_school(db, school.id)
    obj = scoped(db, m.DocumentTemplate, template_id, school.id)
    if obj.letterhead_file_id:
        obj.letterhead_file_id = None
        obj.version += 1
        db.flush()
        _save_revision(db, obj, user.id)
        audit(db, request, user, 'document_template.letterhead_removed', obj, school.id)
    return output(obj)


@router.post('/document-templates/{template_id}/preview')
def preview_template(template_id: str, data: RenderInput, db: DB, user: Actor, school: Scope):
    require(user, 'documents.read')
    obj = _versioned_template(db, scoped(db, m.DocumentTemplate, template_id, school.id), data.template_version)
    enrollment = scoped(db, m.Enrollment, data.enrollment_id, school.id) if data.enrollment_id else None
    return _render_with_context(db, school, obj, enrollment, data.values)


@router.post('/document-templates/{template_id}/preview.pdf')
def preview_pdf(template_id: str, data: RenderInput, db: DB, user: Actor, school: Scope):
    require(user, 'documents.read')
    obj = _versioned_template(db, scoped(db, m.DocumentTemplate, template_id, school.id), data.template_version)
    enrollment = scoped(db, m.Enrollment, data.enrollment_id, school.id) if data.enrollment_id else None
    preview = _render_with_context(db, school, obj, enrollment, data.values)
    if obj.letterhead_file_id:
        preview['letterhead_file'] = scoped(db, m.FileRecord, obj.letterhead_file_id, school.id)
    return Response(_pdf(db, school, obj.name, preview), media_type='application/pdf',
                    headers={'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'})


@router.post('/document-templates/{template_id}/issue', status_code=201)
def issue_template(template_id: str, data: IssueInput, db: DB, user: Actor, school: Scope, request: Request):
    require(user, 'documents.generate')
    lock_school(db, school.id)
    obj = _versioned_template(db, scoped(db, m.DocumentTemplate, template_id, school.id), data.template_version)
    enrollment = scoped(db, m.Enrollment, data.enrollment_id, school.id)
    input_hash = hashlib.sha256(json.dumps({'template': obj.id, 'version': obj.version,
         'revision_sha256': obj.revision_sha256,
         'enrollment': enrollment.id, 'values': data.values}, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
    key = data.idempotency_key or input_hash
    existing = db.scalar(select(m.IssuedDocument).where(m.IssuedDocument.school_id == school.id,
         m.IssuedDocument.idempotency_key == key))
    if existing:
        if existing.snapshot.get('input_hash') != input_hash:
            fail(409, 'A chave de idempotência já foi usada para outro conteúdo.')
        if _is_contract_kind(obj.kind) and existing.signature_status == 'unsigned':
            from .contract_signatures import auto_sign_issued_document
            auto_sign_issued_document(db, existing, user.id, request)
        result = output(existing, ('snapshot',))
        return {**result, 'template_name': existing.snapshot.get('template_name', ''), 'replayed': True}
    issued_for_version = db.scalar(select(m.IssuedDocument).where(
        m.IssuedDocument.school_id == school.id,
        m.IssuedDocument.enrollment_id == enrollment.id,
        m.IssuedDocument.template_id == obj.id,
        m.IssuedDocument.template_version == str(obj.version),
    ).limit(1))
    if issued_for_version:
        if issued_for_version.snapshot.get('input_hash') == input_hash:
            if _is_contract_kind(obj.kind) and issued_for_version.signature_status == 'unsigned':
                from .contract_signatures import auto_sign_issued_document
                auto_sign_issued_document(db, issued_for_version, user.id, request)
            return {**output(issued_for_version, ('snapshot',)),
                    'template_name': issued_for_version.snapshot.get('template_name', ''), 'replayed': True}
        fail(409, 'Esta versão já foi emitida com outros dados para a matrícula. Crie uma nova versão do modelo para reemitir.')
    if not obj.active or not _applicable(obj, enrollment):
        fail(409, 'Modelo inativo ou fora da vigência/ano letivo desta matrícula.')
    preview = _render_with_context(db, school, obj, enrollment, data.values)
    if preview['missing_fields']:
        fail(422, 'Preencha os campos pendentes: ' + ', '.join(preview['missing_fields']))
    if obj.letterhead_file_id:
        preview['letterhead_file'] = scoped(db, m.FileRecord, obj.letterhead_file_id, school.id)
    request_hash = hashlib.sha256(json.dumps({'template': obj.id, 'version': obj.version,
         'revision_sha256': obj.revision_sha256, 'enrollment': enrollment.id,
         'variables': preview['variables']}, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
    pdf = _pdf(db, school, obj.name, preview)
    stored = write_file(db, school.id, user.id, f'modelo-{obj.id}-matricula-{enrollment.number}.pdf', 'application/pdf', pdf)
    issued = m.IssuedDocument(school_id=school.id, student_id=enrollment.student_id,
                              enrollment_id=enrollment.id, kind='template', file_id=stored.id,
                              template_id=obj.id, template_version=str(obj.version), idempotency_key=key,
                              signature_status='unsigned',
                              snapshot={'template_name': obj.name, 'template_kind': obj.kind,
                                        'template_revision_sha256': obj.revision_sha256,
                                        'template_version': obj.version, 'header': obj.header,
                                        'body': obj.body, 'footer': obj.footer,
                                        'variables': preview['variables'], 'request_hash': request_hash,
                                        'input_hash': input_hash,
                                        'pdf_sha256': stored.sha256, 'academic_year_id': enrollment.academic_year_id,
                                        'letterhead_file_id': obj.letterhead_file_id,
                                        'letterhead_sha256': preview['letterhead_file'].sha256 if obj.letterhead_file_id else None,
                                        'require_signature': obj.require_signature or _is_contract_kind(obj.kind)},
                              created_by=user.id)
    db.add(issued); db.flush()
    if obj.require_signature or _is_contract_kind(obj.kind):
        from .contract_signatures import auto_sign_issued_document
        auto_sign_issued_document(db, issued, user.id, request)
    audit(db, request, user, 'document_template.issued', issued, school.id,
          {'template_id': obj.id, 'template_version': obj.version, 'sha256': stored.sha256})
    return {**output(issued, ('snapshot',)), 'template_name': obj.name, 'replayed': False}


@router.get('/issued-documents/{document_id}/verification')
def verify_document(document_id: str, db: DB, user: Actor, school: Scope):
    require(user, 'documents.read')
    document = scoped(db, m.IssuedDocument, document_id, school.id)
    stored = scoped(db, m.FileRecord, document.file_id, school.id)
    try:
        current_hash = hashlib.sha256(read_bytes(stored)).hexdigest()
    except (FileNotFoundError, KeyError):
        current_hash = ''
    result = {'document_id': document.id, 'signature_status': document.signature_status,
              'sha256': stored.sha256, 'integrity_valid': bool(current_hash and current_hash == stored.sha256),
              'signature_valid': False}
    if document.signature_status != 'unsigned':
        from .contract_signatures import verify_document_signatures
        signed = verify_document_signatures(db, document)
        result.update({key: value for key, value in signed.items() if key != 'integrity_valid'})
        result['signed_integrity_valid'] = signed.get('integrity_valid')
    return result
