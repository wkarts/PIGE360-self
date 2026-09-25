"""Fontes fornecidas pela escola. Não distribui fontes do fornecedor."""
import io
import struct
from functools import lru_cache
from fontTools.ttLib import TTFont as OpenTypeFont
from reportlab.pdfbase.ttfonts import TTFont
from .security import fail

MAX_FONT = 2 * 1024 * 1024

@lru_cache(maxsize=4)
def truetype(content: bytes) -> bytes:
    if not content or len(content) > MAX_FONT:
        fail(422, 'Fonte acima do limite de 2 MB.')
    if content[:4] == b'wOF2':
        if len(content) < 48 or struct.unpack('>I', content[16:20])[0] > 8*MAX_FONT:
            fail(422, 'Fonte WOFF2 expandida acima do limite.')
    elif content[:4] not in (b'\x00\x01\x00\x00', b'true'):
        fail(422, 'Envie TTF ou WOFF2 com contornos TrueType.')
    try:
        with OpenTypeFont(io.BytesIO(content), recalcTimestamp=False) as font:
            if 'glyf' not in font or 'fvar' in font or 'OS/2' not in font:
                fail(422, 'Use uma fonte TrueType estática, compatível com tela e PDF.')
            if font['OS/2'].fsType & (0x0002 | 0x0100 | 0x0200):
                fail(422, 'A fonte restringe incorporação ou subconjuntos em PDF. Use uma licença compatível.')
            font.flavor = None
            target = io.BytesIO(); font.save(target)
            data = target.getvalue()
            if len(data) > 8*MAX_FONT:
                fail(422, 'Fonte expandida acima do limite.')
            TTFont('SchoolFontValidation', io.BytesIO(data), validate=1)
            return data
    except Exception as exc:
        from fastapi import HTTPException
        if isinstance(exc, HTTPException):
            raise
        fail(422, 'Fonte inválida ou incompatível. Envie um arquivo TTF/WOFF2 estático válido.')
