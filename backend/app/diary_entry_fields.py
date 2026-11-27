"""Composição por escola e valores com o rótulo vigente quando foram registrados."""
from typing import Annotated, Literal
from pydantic import Field, model_validator
from .schemas import Input
from .security import fail

EntryScope = Literal["lesson", "plan"]
Identifier = Annotated[str, Field(pattern=r"^[A-Za-z0-9-]{8,64}$")]


# Campos existentes continuam nas suas colunas originais, inclusive nos registros anteriores à composição.
STANDARD = {
    "lesson": {"skills": "Habilidades / referências", "methodology": "Metodologia", "activities": "Atividades",
               "homework": "Tarefa / orientação", "notes": "Observações"},
    "plan": {"objectives": "Objetivos", "thematic_units": "Unidades temáticas", "knowledge_objects": "Objetos de conhecimento",
             "bncc_references": "Referências BNCC / habilidades", "methodology": "Metodologia", "resources": "Recursos",
             "assessment_strategy": "Estratégia de avaliação", "notes": "Observações"},
}
DEFAULT_FIELDS = [
    {"id": f"standard-{scope}-{column.replace('_', '-')}", "label": label, "scope": scope, "column": column}
    for scope, columns in STANDARD.items() for column, label in columns.items()
]
STANDARD_BY_ID = {item["id"]: item for item in DEFAULT_FIELDS}
STANDARD_COLUMNS = {item["id"]: item["column"] for item in DEFAULT_FIELDS}


class EntryField(Input):
    id: Identifier
    label: str = Field(min_length=2, max_length=100)
    scope: EntryScope


class EntrySettings(Input):
    version: int = Field(ge=0)
    fields: list[EntryField] = Field(max_length=40)

    @model_validator(mode="after")
    def unique_fields(self):
        if len({f.id for f in self.fields}) != len(self.fields):
            raise ValueError("Os identificadores dos campos precisam ser únicos.")
        if len({(f.scope, f.label.casefold()) for f in self.fields}) != len(self.fields):
            raise ValueError("Use um nome diferente para cada campo da mesma ficha.")
        return self


FieldValues = Annotated[dict[Identifier, Annotated[str, Field(max_length=4000)]], Field(max_length=40)]


def public_settings(school):
    settings = school.diary_entry_settings or {}
    defaults = [{k: v for k, v in field.items() if k != "column"} for field in DEFAULT_FIELDS]
    return {"version": settings.get("version", 0), "fields": settings.get("fields", defaults), "standard_columns": STANDARD_COLUMNS,
            "standard_labels": {field["id"]: field["label"] for field in DEFAULT_FIELDS}}


def replace_settings(school, data):
    current = public_settings(school)
    if data.version != current["version"]:
        fail(409, "A composição foi alterada. Recarregue os campos antes de salvar.")
    before = {field["id"]: field for field in current["fields"]}
    reserved = set((school.diary_entry_settings or {}).get("retired", []))
    fields = [field.model_dump() for field in data.fields]
    for field in fields:
        old = before.get(field["id"])
        standard = STANDARD_BY_ID.get(field["id"])
        invalid_standard = field["id"].startswith("standard-") and (not standard or standard["scope"] != field["scope"])
        if field["id"] in reserved or (old and old["scope"] != field["scope"]) or invalid_standard:
            fail(422, "Crie um novo campo para mudar a ficha de destino.")
    reserved.update(before.keys() - {field["id"] for field in fields} - STANDARD_COLUMNS.keys())
    school.diary_entry_settings = {"version": data.version + 1, "fields": fields, "retired": sorted(reserved)}
    return public_settings(school)


def entry_values(school, scope, submitted, previous=None, *, standard_values=None):
    saved = {item["id"]: item for item in previous or []}
    submitted = submitted or {}
    current = {field["id"]: field for field in public_settings(school)["fields"] if field["scope"] == scope}
    if submitted.keys() - current.keys() or submitted.keys() & STANDARD_COLUMNS.keys():
        fail(409, "Um campo da ficha foi removido ou pertence a outro tipo de registro. Recarregue a composição.")
    for field_id, value in submitted.items():
        if value:
            saved[field_id] = {"id": field_id, "label": saved.get(field_id, current[field_id])["label"], "value": value}
        else:
            saved.pop(field_id, None)
    # Registra só o rótulo dos componentes nativos. Os valores permanecem nas colunas tipadas.
    for field_id, definition in STANDARD_BY_ID.items():
        if definition["scope"] != scope or standard_values is None:
            continue
        column = definition["column"]
        if standard_values.get(column):
            label = saved.get(field_id, current.get(field_id, definition))["label"]
            saved[field_id] = {"id": field_id, "label": label, "column": column}
        else:
            saved.pop(field_id, None)
    ordered_ids = dict.fromkeys([*current, *saved])
    return [saved[field_id] for field_id in ordered_ids if field_id in saved]


def entry_payload(db, school, scope, data, obj=None):
    db.refresh(school, ["diary_entry_settings"])
    values = data.model_dump(exclude={"field_values", "version"})
    active = {field["id"] for field in public_settings(school)["fields"]}
    for field_id, definition in STANDARD_BY_ID.items():
        if definition["scope"] != scope or field_id in active:
            continue
        column = definition["column"]
        old = getattr(obj, column) if obj is not None else ([] if column == "bncc_references" else "")
        if column in data.model_fields_set and values[column] != old:
            fail(409, "Um campo padrão da ficha foi retirado. Recarregue a composição antes de alterar o valor.")
        values[column] = old
    values["extra_fields"] = entry_values(school, scope, data.field_values,
                                           obj.extra_fields if obj else None, standard_values=values)
    return values
