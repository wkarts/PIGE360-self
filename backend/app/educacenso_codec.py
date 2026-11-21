"""Codificação em treinamento. O catálogo de leiautes oficiais começa vazio."""
from dataclasses import dataclass
from hashlib import sha256
from typing import Callable, Literal
import codecs
import re

Scope = tuple[str, int, str, Literal["treinamento", "producao"]]

@dataclass(frozen=True)
class Field:
    name: str
    required: bool
    pattern: str | None = None
    max_bytes: int | None = None

@dataclass(frozen=True)
class Layout:
    year: int
    stage: str
    source_hash: str       # SHA-256 do artefato oficial conferido
    revision: str
    encoding: str
    separator: str
    newline: Literal["\n", "\r\n"]
    terminal_newline: bool
    records: dict[str, tuple[Field, ...]]   # inclui coluna de tipo quando exigida

@dataclass(frozen=True)
class Row:
    kind: str
    source_id: str         # ID interno, não exportado no TXT por padrão
    fields: dict[str, str]

@dataclass(frozen=True)
class Batch:
    scope: Scope
    digest: str
    layout_hash: str
    revision: str
    content: bytes
    origins: tuple[tuple[str, str, tuple[str, ...]], ...]

@dataclass(frozen=True)
class Issue:
    message: str
    line: int | None = None    # só preencher se o retorno documentar linha física 1-based
    field: str | None = None   # nome canônico conforme adaptador homologado

def build_txt(scope: Scope, layout: Layout, rows: tuple[Row, ...],
              validate: Callable[[Scope, Layout, tuple[Row, ...]], None]) -> Batch:
    school, year, stage, environment = scope
    if not school or (year, stage) != (layout.year, layout.stage):
        raise ValueError("Escola, ano ou etapa incompatíveis")
    if environment != "treinamento":
        raise ValueError("Exemplo restrito a treinamento; produção bloqueada")
    if not re.fullmatch(r"[0-9a-f]{64}", layout.source_hash) or not layout.revision:
        raise ValueError("Leiaute sem identificação verificável")
    if not layout.separator or any(ord(c) < 32 for c in layout.separator):
        raise ValueError("Separador inválido neste serializador")
    if layout.newline not in {"\n", "\r\n"} or not rows:
        raise ValueError("Quebra de linha inválida ou lote vazio")
    codecs.lookup(layout.encoding)
    # Obrigatório: implementação específica da revisão oficial. Deve lançar
    # ValueError se o lote falhar em cobertura, escopo, ordem ou dependências.
    validate(scope, layout, rows)
    lines, origins = [], []
    for n, row in enumerate(rows, 1):
        specs = layout.records.get(row.kind)
        if not specs or not row.source_id:
            raise ValueError(f"Linha {n}: tipo ou origem inválidos")
        names = tuple(f.name for f in specs)
        if len(set(names)) != len(names) or set(row.fields) - set(names):
            raise ValueError(f"Linha {n}: campos incompatíveis")
        columns = []
        for f in specs:
            value = row.fields.get(f.name, "")
            if (not isinstance(value, str) or layout.separator in value
                or any(ord(c) < 32 or ord(c) == 127 for c in value)):
                raise ValueError(f"Linha {n}, {f.name}: conteúdo inválido")
            if (f.required and not value.strip()) or (
                value and f.pattern is not None and re.fullmatch(f.pattern, value) is None
            ):
                raise ValueError(f"Linha {n}, {f.name}: domínio ou obrigatoriedade")
            try:
                size = len(value.encode(layout.encoding, errors="strict"))
            except UnicodeEncodeError:
                raise ValueError(f"Linha {n}, {f.name}: codificação inválida") from None
            if f.max_bytes is not None and size > f.max_bytes:
                raise ValueError(f"Linha {n}, {f.name}: tamanho excedido")
            columns.append(value)
        lines.append(layout.separator.join(columns))
        origins.append((row.kind, row.source_id, names))
    data = layout.newline.join(lines) + (layout.newline if layout.terminal_newline else "")
    raw = data.encode(layout.encoding, errors="strict")
    return Batch(scope, sha256(raw).hexdigest(), layout.source_hash, layout.revision,
                 raw, tuple(origins))

def reconcile(batch: Batch, scope: Scope, batch_digest: str,
              issues: tuple[Issue, ...]) -> list[dict]:
    """Recebe críticas normalizadas por adaptador conhecido; não interpreta PDF/TXT bruto."""
    if scope != batch.scope or batch_digest != batch.digest:
        raise ValueError("Retorno vinculado a outro lote ou ambiente")
    result = []
    for issue in issues:
        pos = issue.line
        origin = (batch.origins[pos - 1]
                  if type(pos) is int and 1 <= pos <= len(batch.origins) else None)
        match = origin is not None and (issue.field is None or issue.field in origin[2])
        result.append({
            "line": pos, "field": issue.field, "message": issue.message,
            "source_id": origin[1] if match else None,
            "matched": match,
        })
    return result
