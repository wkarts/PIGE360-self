"""Typed contract variables and omission of unfilled fields; never invent values."""
import re
from datetime import datetime
from decimal import Decimal, InvalidOperation
from difflib import SequenceMatcher

from pydantic import BaseModel, ConfigDict
from typing import Literal

TOKEN = re.compile(r'\{\{\s*([a-z][a-z0-9_.]{0,79})\s*\}\}')
STATES = set('AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split())
INPUT_TYPES = Literal['text', 'date', 'money', 'integer', 'cpf', 'cep', 'email', 'uf', 'phone']


class FieldOptions(BaseModel):
    model_config = ConfigDict(extra='forbid')
    required: bool = False
    input_type: INPUT_TYPES | None = None


def input_type(key, options=None):
    configured = (options or {}).get(key, {})
    if configured.get('input_type'):
        return configured['input_type']
    suffix = key.rsplit('.', 1)[-1]
    if suffix in {'nascimento', 'data'}: return 'date'
    if suffix in {'cpf', 'cep', 'email', 'uf', 'phone', 'telefone'}:
        return {'telefone': 'phone'}.get(suffix, suffix)
    if key in {'financeiro.anuidade', 'financeiro.valor_parcela'}: return 'money'
    if key in {'financeiro.parcelas', 'financeiro.dia_vencimento'}: return 'integer'
    return 'text'


def normalize_value(key, value, options=None):
    value = str(value or '').strip()
    if not value: return ''
    if '{{' in value or '}}' in value:
        raise ValueError('Informe o valor do campo, sem marcadores de variável.')
    kind = input_type(key, options)
    if kind == 'date':
        for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%d%m%Y'):
            try: return datetime.strptime(value, fmt).strftime('%d/%m/%Y')
            except ValueError: pass
        raise ValueError('Informe uma data válida em dd/mm/aaaa.')
    if kind == 'money':
        original = value
        value = value.replace('R$', '').replace(' ', '')
        if ',' in value: value = value.replace('.', '').replace(',', '.')
        if not re.fullmatch(r'\d+(?:\.\d{1,2})?', value):
            raise ValueError('Informe um valor monetário válido, com até duas casas decimais.')
        try: number = Decimal(value)
        except InvalidOperation: raise ValueError('Valor monetário inválido.')
        if not number.is_finite() or number < 0 or number > Decimal('999999999999.99'):
            raise ValueError('Valor monetário fora do limite.')
        formatted = f'{number:,.2f}'.translate(str.maketrans(',.', '.,'))
        return ('R$ ' if original.startswith('R$') else '') + formatted
    if kind == 'integer':
        if not value.isdecimal(): raise ValueError('Informe um número inteiro válido.')
        number = int(value)
        if key == 'financeiro.dia_vencimento' and not 1 <= number <= 31:
            raise ValueError('O dia de vencimento deve estar entre 1 e 31.')
        if key == 'financeiro.parcelas' and not 1 <= number <= 120:
            raise ValueError('Informe de 1 a 120 parcelas.')
        if number > 1000000000: raise ValueError('Número fora do limite.')
        return str(number)
    if kind == 'uf':
        value = value.upper()
        if value not in STATES: raise ValueError('Selecione uma UF válida.')
    if kind == 'cpf':
        from .schemas import PersonInput
        value = PersonInput.cpf_valid(value)
    if kind == 'cep':
        digits = re.sub(r'\D', '', value)
        if len(digits) != 8: raise ValueError('Informe um CEP com oito dígitos.')
        value = digits[:5] + '-' + digits[5:]
    if kind == 'email':
        from pydantic import TypeAdapter, EmailStr
        value = str(TypeAdapter(EmailStr).validate_python(value))
    if kind == 'phone':
        digits = re.sub(r'\D', '', value)
        if not 10 <= len(digits) <= 15: raise ValueError('Informe um telefone com DDD.')
    return value


def input_value(key, value, options=None):
    if input_type(key, options) == 'date' and value:
        try: return datetime.strptime(value, '%d/%m/%Y').date().isoformat()
        except ValueError: pass
    return value or ''


def empty_heading(text, values, available):
    """A heading belongs to a block only when that block has template variables."""
    stripped = text.strip().rstrip(':').casefold()
    for label, prefixes in [('contratante i', ('contratante1.',)),
                            ('contratante ii', ('contratante2.',)),
                            ('testemunhas', ('testemunha1.', 'testemunha2.'))]:
        keys = [key for key in available if key.startswith(prefixes)]
        if stripped == label and keys and not any(values.get(key) for key in keys): return True
    return False


def clean_paragraph(text, values):
    matches = list(TOKEN.finditer(text))
    if not matches: return text
    # Field/sentence boundaries are taken from the template, not from personal values.
    boundaries = list(re.finditer(r'\s+[·|]\s+|;\s*|,\s*|(?<=\.)\s+(?=[A-ZÀ-Ý])', text))
    boundaries = [b for b in boundaries if not any(m.start() <= b.start() < m.end() for m in matches)]
    starts = [0] + [b.end() for b in boundaries]
    ends = [b.start() for b in boundaries] + [len(text)]
    pieces = []
    for index, (start, end) in enumerate(zip(starts, ends)):
        piece = text[start:end]
        tokens = list(TOKEN.finditer(piece))
        if tokens and not any(values.get(m.group(1)) for m in tokens): continue
        for match in reversed(tokens):
            replacement = str(values.get(match.group(1), '') or '').strip()
            left, right = match.start(), match.end()
            if replacement.startswith('R$') and re.search(r'R\$\s*$', piece[:left]):
                replacement = replacement[2:].strip()
            if not replacement:
                # Remove the adjacent label, currency marker or separator as well.
                label = re.search(r'(?:^|(?<=[\s,]))(?:[\wÀ-ÿ /()-]+:\s*(?:R\$\s*)?|(?:CPF|CEP|E-mail|Nome|UF|Cidade|Bairro|Nascimento|Endereço)\s+|R\$\s*|[-,]\s*)$', piece[:left], re.I)
                if label: left = label.start()
                elif left == 0:
                    following = re.match(r'\s*[-,]\s*', piece[right:])
                    if following: right += following.end()
            piece = piece[:left] + replacement + piece[right:]
        piece = re.sub(r'\s+([,.])', r'\1', piece).strip(' \t·|;,')
        if not piece.strip(' .:-'): continue
        separator = text[boundaries[index - 1].start():boundaries[index - 1].end()] if pieces and index else ''
        pieces.append(separator + piece)
    result = ''.join(pieces).strip()
    if '{{' in result or '}}' in result:
        raise ValueError('O conteúdo ainda contém um marcador não resolvido.')
    return result


def render_text(content, values, available=None):
    available = set(available or TOKEN.findall(content))
    rendered = []
    for line in content.split('\n'):
        if empty_heading(line, values, available): continue
        result = clean_paragraph(line, values)
        if result.strip() or not line.strip(): rendered.append(result)
    result = re.sub(r'\n{3,}', '\n\n', '\n'.join(rendered)).strip()
    if '{{' in result or '}}' in result:
        raise ValueError('Revise os marcadores do modelo antes de gerar o documento.')
    return result


def paragraph_edits(original, rendered):
    """Minimal edits keep unaffected OOXML runs and their formatting intact."""
    return [(a, b, rendered[c:d]) for op, a, b, c, d in
            SequenceMatcher(None, original, rendered).get_opcodes() if op != 'equal']
