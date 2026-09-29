"""Importação segura e auditável do School Desktop Suite para o PIGE360 Self."""
from __future__ import annotations

import base64
import hashlib
import io
import json
import os
import re
import secrets
import shutil
import sqlite3
import stat
import tempfile
import unicodedata
import zipfile
from collections import Counter, defaultdict
from contextlib import contextmanager
from datetime import date, datetime
from pathlib import Path, PurePosixPath
from typing import Any, Iterator

from fastapi import APIRouter, File, Form, Request, UploadFile
from fastapi.responses import FileResponse
from PIL import Image, ImageOps, UnidentifiedImageError
from sqlalchemy import func, insert, select
from sqlalchemy.orm import Session
from starlette.background import BackgroundTask

from . import diary_models as dm
from . import models as m
from .common import audit
from .config import settings
from .documents import write_file
from .security import Actor, DB, Scope, fail, lock_school


router = APIRouter(prefix="/api/v1/schools/{school_id}/legacy-import", tags=["Portabilidade de dados"])
MAX_SOURCE_DB_BYTES = 512 * 1024 * 1024
MAX_MEDIA_TOTAL_BYTES = 512 * 1024 * 1024
MAX_MEDIA_FILE_BYTES = 20 * 1024 * 1024
MAX_SOURCE_ROWS = 100_000
MAX_MEDIA_FILES = 10_000
MAX_ZIP_MEMBERS = 100_000
ARCHIVE_BATCH_SIZE = 500
PHOTO_FIELD = re.compile(r"(?:foto|photo|avatar|portrait|imagem|image|profile_picture)", re.I)
SECRET_FIELD = re.compile(r"(?:senha|password|token|secret|authorization|cookie|csrf|mfa|private.?key|api.?key|refresh)", re.I)
SUPPORTED_MEDIA = {".pdf", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".odt", ".ods", ".rtf", ".csv", ".txt", ".xml", ".json", ".md"}
REFERENCE_FIELD = re.compile(r"(?:^|[_-])(?:foto|photo|image|imagem|picture|file|arquivo|documento|path|caminho|url|ref)(?:[_-]|$)", re.I)
MAPPED_TABLES = {
    "alunos": "alunos e pessoas",
    "responsaveis": "responsáveis sem vínculo presumido",
    "aluno_responsaveis": "vínculos de responsáveis",
    "professores": "professores e pessoas",
    "colaboradores": "colaboradores e pessoas",
    "usuarios": "usuários inativos, sem credenciais antigas",
    "unidades_escolares": "unidades",
    "periodos_letivos": "anos letivos",
    "cursos": "séries e etapas",
    "disciplinas": "componentes curriculares",
    "turmas": "turmas",
    "matriculas": "matrículas em rascunho para revisão",
    "documentos_alunos": "documentos dos alunos",
    "documentos_colaboradores": "arquivo de portabilidade + arquivos privados referenciados",
    "empresas": "arquivo histórico; empresa destino não é alterada sem correspondência confirmada",
    "centro_custos": "arquivo histórico de portabilidade",
    "departamentos": "arquivo histórico de portabilidade",
    "funcoes": "arquivo histórico de portabilidade",
    "planos_pagamento": "arquivo histórico de portabilidade",
    "perfis_acesso": "arquivo histórico; permissões antigas não são ativadas",
    "perfis_permissoes": "arquivo histórico; permissões antigas não são ativadas",
    "usuarios_empresas": "arquivo histórico; vínculos não são inferidos",
    "usuarios_perfis": "arquivo histórico; perfis antigos não são ativados",
}
KNOWN_LINK_TABLES = {"aluno_responsaveis"}


def _admin(user: m.User) -> None:
    if user.role != "admin":
        fail(403, "Somente o administrador da instalação pode importar dados legados.")


def _safe_member(name: str) -> str | None:
    normalized = name.replace("\\", "/")
    if not normalized or normalized.startswith("/") or re.match(r"^[a-zA-Z]:", normalized):
        return None
    parts = [part for part in normalized.split("/") if part not in ("", ".")]
    if not parts or any(part == ".." for part in parts):
        return None
    return "/".join(parts)


def _blocked_path(path: str) -> bool:
    lowered = path.casefold()
    if "magento" in lowered:
        return True
    parts = lowered.replace("\\", "/").split("/")
    blocked = {"cache", "caches", "webview", "ebwebview", "node_modules", ".git", "logs", "log",
               "tmp", "temp", "config", "configs", "configuration", "settings", ".config",
               ".env", "secrets", "credentials", "vendor", "venv", "env"}
    if any(part in blocked or part.endswith(".env") or part.startswith(".env.") for part in parts):
        return True
    return any(part in {"config.json", "settings.json", "secrets.json", "credentials.json"} for part in parts)


def _upload_hash(upload: UploadFile | None, limit: int) -> tuple[str, int]:
    if upload is None:
        return "", 0
    upload.file.seek(0)
    digest = hashlib.sha256()
    size = 0
    while True:
        chunk = upload.file.read(1024 * 1024)
        if not chunk:
            break
        size += len(chunk)
        if size > limit:
            fail(413, "Arquivo de portabilidade acima do limite configurado.")
        digest.update(chunk)
    upload.file.seek(0)
    if size == 0:
        fail(422, "O arquivo enviado está vazio.")
    return digest.hexdigest(), size


def _combined_fingerprint(backup: UploadFile, media: UploadFile | None) -> tuple[str, dict[str, Any]]:
    limit = settings().legacy_import_max_mb * 1024 * 1024
    backup_hash, backup_size = _upload_hash(backup, limit)
    media_hash, media_size = _upload_hash(media, limit)
    combined = hashlib.sha256(f"db-package:{backup_hash}\ncontainer-media:{media_hash}".encode()).hexdigest()
    return combined, {"backup_sha256": backup_hash, "backup_size": backup_size,
                      "media_sha256": media_hash, "media_size": media_size}


def _copy_limited(source, destination: Path, maximum: int) -> int:
    size = 0
    with destination.open("wb") as target:
        while True:
            chunk = source.read(1024 * 1024)
            if not chunk:
                break
            size += len(chunk)
            if size > maximum:
                fail(413, "Banco legado acima do limite permitido.")
            target.write(chunk)
        target.flush()
        os.fsync(target.fileno())
    return size


def _sqlite_path(backup: UploadFile, directory: Path) -> tuple[Path, str, int]:
    backup.file.seek(0)
    header = backup.file.read(16)
    backup.file.seek(0)
    target = directory / "legacy-source.db"
    if header.startswith(b"SQLite format 3\x00"):
        size = _copy_limited(backup.file, target, MAX_SOURCE_DB_BYTES)
        return target, Path(backup.filename or "source.db").name[:80], size
    try:
        archive = zipfile.ZipFile(backup.file)
    except (zipfile.BadZipFile, OSError):
        fail(422, "Envie um arquivo SQLite ou um ZIP de backup válido.")
    with archive:
        if len(archive.infolist()) > MAX_ZIP_MEMBERS:
            fail(413, "O ZIP de backup contém mais arquivos que o limite seguro de leitura.")
        candidates: list[tuple[zipfile.ZipInfo, str]] = []
        fallback: list[tuple[zipfile.ZipInfo, str]] = []
        for info in archive.infolist():
            safe = _safe_member(info.filename)
            if not safe or info.is_dir() or _blocked_path(safe):
                continue
            parts = safe.casefold().split("/")
            if len(parts) >= 2 and parts[-2:] == ["school_desktop_suite", "app.db"] and "novo_vazio" not in safe.casefold():
                candidates.append((info, safe))
            elif PurePosixPath(safe).suffix.casefold() in {".db", ".sqlite", ".sqlite3"} and "novo_vazio" not in safe.casefold():
                fallback.append((info, safe))
        selected = candidates if candidates else fallback
        if len(selected) != 1:
            fail(422, "O ZIP deve conter exatamente um banco app.db da instalação preenchida; a instalação vazia é ignorada.")
        info, path = selected[0]
        if info.flag_bits & 0x1:
            fail(422, "Banco legado criptografado não é aceito.")
        if info.file_size > MAX_SOURCE_DB_BYTES or info.file_size < 100:
            fail(413, "Tamanho do banco legado inválido ou acima do limite.")
        if info.file_size / max(info.compress_size, 1) > 250:
            fail(422, "O banco legado excede a taxa segura de descompactação.")
        try:
            with archive.open(info) as source:
                size = _copy_limited(source, target, MAX_SOURCE_DB_BYTES)
        except (zipfile.BadZipFile, RuntimeError, OSError):
            fail(422, "Não foi possível extrair o banco do ZIP de backup.")
        if size != info.file_size:
            fail(422, "Tamanho extraído do banco não confere com o manifesto ZIP.")
        return target, Path(path).name[:80], size


class MediaArchive:
    def __init__(self, upload: UploadFile | None):
        self.zip: zipfile.ZipFile | None = None
        self.entries: list[tuple[zipfile.ZipInfo, str]] = []
        self.ignored_magento = 0
        self.ignored_paths = 0
        self.unsupported = 0
        self.total_uncompressed = 0
        self.by_path: dict[str, tuple[zipfile.ZipInfo, str]] = {}
        self.by_basename: dict[str, list[tuple[zipfile.ZipInfo, str]]] = defaultdict(list)
        if upload is None:
            return
        try:
            upload.file.seek(0)
            self.zip = zipfile.ZipFile(upload.file)
        except (zipfile.BadZipFile, OSError):
            fail(422, "O ZIP de arquivos do container está inválido.")
        infos = self.zip.infolist()
        if len(infos) > MAX_ZIP_MEMBERS:
            self.close()
            fail(413, "O ZIP de mídias contém mais arquivos que o limite seguro de leitura.")
        seen_paths: set[str] = set()
        for info in infos:
            safe = _safe_member(info.filename)
            if not safe or info.is_dir():
                self.ignored_paths += 1
                continue
            normalized_path = safe.casefold()
            if normalized_path in seen_paths:
                self.ignored_paths += 1
                continue
            seen_paths.add(normalized_path)
            if "magento" in safe.casefold():
                self.ignored_magento += 1
                continue
            if _blocked_path(safe):
                self.ignored_paths += 1
                continue
            mode = info.external_attr >> 16
            if stat.S_ISLNK(mode) or info.flag_bits & 0x1:
                self.ignored_paths += 1
                continue
            suffix = PurePosixPath(safe).suffix.casefold()
            if suffix not in SUPPORTED_MEDIA:
                self.unsupported += 1
                continue
            if info.file_size > MAX_MEDIA_FILE_BYTES:
                self.unsupported += 1
                continue
            self.total_uncompressed += info.file_size
            if self.total_uncompressed > MAX_MEDIA_TOTAL_BYTES or len(self.entries) >= MAX_MEDIA_FILES:
                self.close()
                fail(413, "O ZIP de mídias excede os limites de portabilidade.")
            if info.file_size / max(info.compress_size, 1) > 250:
                self.unsupported += 1
                continue
            item = (info, safe)
            self.entries.append(item)
            self.by_path[normalized_path] = item
            self.by_basename[PurePosixPath(safe).name.casefold()].append(item)

    def close(self) -> None:
        if self.zip is not None:
            self.zip.close()
            self.zip = None

    def read(self, item: tuple[zipfile.ZipInfo, str]) -> bytes:
        if self.zip is None:
            return b""
        info, _ = item
        try:
            with self.zip.open(info) as source:
                data = source.read(MAX_MEDIA_FILE_BYTES + 1)
        except (zipfile.BadZipFile, RuntimeError, OSError):
            return b""
        if len(data) != info.file_size or len(data) > MAX_MEDIA_FILE_BYTES:
            return b""
        return data

    def match(self, reference: str) -> tuple[zipfile.ZipInfo, str] | None:
        text = reference.strip().replace("\\", "/")
        if not text or _blocked_path(text):
            return None
        if text.casefold().startswith(("http://", "https://", "//")):
            return None
        if text.casefold().startswith("file://"):
            text = text[7:]
        text = re.sub(r"^[a-zA-Z]:", "", text).lstrip("/")
        text = "/".join(part for part in text.split("/") if part not in ("", ".", ".."))
        key = text.casefold()
        if key in self.by_path:
            return self.by_path[key]
        parts = key.split("/")
        for start in range(1, len(parts)):
            candidate = "/".join(parts[start:])
            if candidate in self.by_path:
                return self.by_path[candidate]
        basename = PurePosixPath(text).name.casefold()
        items = self.by_basename.get(basename, [])
        return items[0] if len(items) == 1 else None


class SourcePackage:
    def __init__(self, connection: sqlite3.Connection, source_name: str, db_size: int, media: MediaArchive,
                 db_hash: str, input_hashes: dict[str, Any]):
        self.connection = connection
        self.source_name = source_name
        self.db_size = db_size
        self.media = media
        self.db_hash = db_hash
        self.input_hashes = input_hashes
        self.tables = sorted(row[0] for row in connection.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"))
        self.table_schema: dict[str, dict[str, Any]] = {}
        self.table_counts: dict[str, int] = {}
        total = 0
        for table in self.tables:
            quoted = table.replace('"', '""')
            count = int(connection.execute(f'SELECT COUNT(*) FROM "{quoted}"').fetchone()[0])
            self.table_counts[table] = count
            columns = connection.execute(f'PRAGMA table_info("{quoted}")').fetchall()
            foreign_keys = connection.execute(f'PRAGMA foreign_key_list("{quoted}")').fetchall()
            self.table_schema[table] = {
                "columns": [{"name": column[1], "type": column[2], "nullable": not bool(column[3]),
                             "primary_key_position": column[5]} for column in columns],
                "foreign_keys": [{"column": key[3], "references_table": key[2],
                                  "references_column": key[4], "on_update": key[5], "on_delete": key[6]}
                                 for key in foreign_keys],
            }
            total += count
            if total > MAX_SOURCE_ROWS:
                fail(413, "O banco contém mais linhas que o limite por lote (100.000).")
        if "alunos" not in self.tables:
            fail(422, "O banco não contém o cadastro esperado de alunos.")
        check = connection.execute("PRAGMA quick_check").fetchone()
        if not check or check[0] != "ok":
            fail(422, "O banco legado não passou na verificação de integridade SQLite.")

    def rows(self, table: str) -> Iterator[dict[str, Any]]:
        if table not in self.table_counts:
            return iter(())
        quoted = table.replace('"', '""')
        cursor = self.connection.execute(f'SELECT * FROM "{quoted}"')
        names = [column[0] for column in cursor.description or ()]
        return (dict(zip(names, row)) for row in cursor)


@contextmanager
def _source(backup: UploadFile, media_upload: UploadFile | None) -> Iterator[SourcePackage]:
    fingerprint, input_hashes = _combined_fingerprint(backup, media_upload)
    temp = tempfile.TemporaryDirectory(prefix="pige360-legacy-")
    connection = None
    media = MediaArchive(media_upload)
    try:
        db_path, source_name, size = _sqlite_path(backup, Path(temp.name))
        digest = hashlib.sha256()
        with db_path.open("rb") as source_file:
            for chunk in iter(lambda: source_file.read(1024 * 1024), b""):
                digest.update(chunk)
        db_hash = digest.hexdigest()
        connection = sqlite3.connect(f"file:{db_path.as_posix()}?mode=ro", uri=True)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA query_only=ON")
        package = SourcePackage(connection, source_name, size, media, db_hash, input_hashes)
        package.fingerprint = fingerprint
        yield package
    finally:
        if connection is not None:
            connection.close()
        media.close()
        temp.cleanup()


def _text(value: Any, maximum: int = 4000) -> str:
    if value is None:
        return ""
    if isinstance(value, bytes):
        return ""
    result = str(value).replace("\x00", "").strip()
    return result[:maximum]


def _bool(value: Any, default: bool = True) -> bool:
    if value is None or value == "":
        return default
    if isinstance(value, (int, float)):
        return bool(value)
    normalized = unicodedata.normalize("NFKD", str(value)).encode("ascii", "ignore").decode().strip().casefold()
    return normalized not in {"0", "false", "nao", "n", "inativo", "inactive", "cancelado", "off"}


def _parse_date(value: Any) -> date | None:
    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    text = str(value).strip()
    if not text:
        return None
    try:
        return date.fromisoformat(text[:10])
    except ValueError:
        pass
    for fmt in ("%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(text[:10], fmt).date()
        except ValueError:
            continue
    return None


def _digits(value: Any) -> str:
    return re.sub(r"\D", "", _text(value, 80))


def _valid_cpf(value: Any) -> str | None:
    digits = _digits(value)
    if len(digits) != 11 or len(set(digits)) == 1:
        return None
    for size in (9, 10):
        check = (sum(int(digits[i]) * (size + 1 - i) for i in range(size)) * 10) % 11
        if (0 if check == 10 else check) != int(digits[size]):
            return None
    return digits


def _normalize(value: Any) -> str:
    normalized = unicodedata.normalize("NFKD", _text(value, 400)).encode("ascii", "ignore").decode()
    return " ".join(normalized.casefold().split())


def _is_photo_data_candidate(value: Any) -> bool:
    if not isinstance(value, str):
        return False
    candidate = value.strip()
    if candidate.lower().startswith("data:image/"):
        return True
    return len(candidate) >= 32 and bool(re.fullmatch(r"[A-Za-z0-9+/=\s]+", candidate))


def _photo_data(value: Any) -> tuple[bytes, str] | None:
    if not isinstance(value, str):
        return None
    candidate = value.strip()
    matched = re.fullmatch(r"data:image/[A-Za-z0-9.+-]+;base64,([A-Za-z0-9+/=\s]+)", candidate, re.I)
    if matched:
        encoded = matched.group(1)
    else:
        encoded = candidate
        if len(encoded) < 32 or not re.fullmatch(r"[A-Za-z0-9+/=\s]+", encoded):
            return None
    if len(encoded) > ((settings().max_photo_mb * 1024 * 1024 * 4 + 2) // 3 + 16):
        return None
    try:
        raw = base64.b64decode(re.sub(r"\s+", "", encoded), validate=True)
        if not raw or len(raw) > settings().max_photo_mb * 1024 * 1024:
            return None
        with Image.open(io.BytesIO(raw)) as source:
            if source.format not in {"PNG", "JPEG", "WEBP", "GIF"} or source.width * source.height > 30_000_000:
                return None
            source.seek(0)
            image = ImageOps.exif_transpose(source.copy())
            if image.mode not in {"RGB", "RGBA"}:
                image = image.convert("RGBA" if "transparency" in image.info else "RGB")
            output = io.BytesIO()
            image.save(output, format="PNG", optimize=True)
            normalized = output.getvalue()
            if not normalized or len(normalized) > settings().max_upload_mb * 1024 * 1024:
                return None
            return normalized, "image/png"
    except (ValueError, OSError, UnidentifiedImageError, Image.DecompressionBombError, Image.DecompressionBombWarning):
        return None


def _safe_media_data(data: bytes, filename: str) -> tuple[bytes, str, str] | None:
    if not data or len(data) > MAX_MEDIA_FILE_BYTES:
        return None
    suffix = PurePosixPath(filename).suffix.casefold()
    if suffix in {".png", ".jpg", ".jpeg", ".webp", ".gif"}:
        if len(data) > settings().max_photo_mb * 1024 * 1024:
            return None
        try:
            with Image.open(io.BytesIO(data)) as source:
                if source.format not in {"PNG", "JPEG", "WEBP", "GIF"} or source.width * source.height > 30_000_000:
                    return None
                source.seek(0)
                image = ImageOps.exif_transpose(source.copy())
                if image.mode not in {"RGB", "RGBA"}:
                    image = image.convert("RGBA" if "transparency" in image.info else "RGB")
                output = io.BytesIO()
                image.save(output, format="PNG", optimize=True)
                result = output.getvalue()
                if len(result) > settings().max_upload_mb * 1024 * 1024:
                    return None
                return result, "image/png", ".png"
        except (ValueError, OSError, UnidentifiedImageError, Image.DecompressionBombError, Image.DecompressionBombWarning):
            return None
    if suffix == ".pdf":
        from .documents import validate_upload
        try:
            return data, validate_upload(data, "source.pdf"), suffix
        except Exception:
            return None
    if suffix in {".docx", ".xlsx", ".pptx", ".odt", ".ods"}:
        try:
            with zipfile.ZipFile(io.BytesIO(data)) as document_zip:
                infos = document_zip.infolist()
                total = sum(item.file_size for item in infos)
                if len(infos) > 10_000 or total > 100 * 1024 * 1024:
                    return None
                names = [_safe_member(item.filename) for item in infos]
                if any(name is None for name in names) or any("vbaproject.bin" in (name or "").casefold() for name in names):
                    return None
                if "[Content_Types].xml" not in names:
                    return None
                required = {".docx": "word/document.xml", ".xlsx": "xl/workbook.xml",
                            ".pptx": "ppt/presentation.xml", ".odt": "content.xml", ".ods": "content.xml"}[suffix]
                if required not in names:
                    return None
        except (zipfile.BadZipFile, OSError):
            return None
        mime = {".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                ".odt": "application/vnd.oasis.opendocument.text", ".ods": "application/vnd.oasis.opendocument.spreadsheet"}[suffix]
        return data, mime, suffix
    if suffix in {".doc", ".xls", ".ppt"} and data.startswith(bytes.fromhex("d0cf11e0a1b11ae1")):
        lowered_data = data.lower()
        if any(marker in lowered_data for marker in (b"vbaproject", b"_vba_project_cur", "vbaproject".encode("utf-16le"))):
            return None
        mime = {".doc": "application/msword", ".xls": "application/vnd.ms-excel",
                ".ppt": "application/vnd.ms-powerpoint"}[suffix]
        return data, mime, suffix
    if suffix == ".rtf":
        if data.lstrip(b"\xef\xbb\xbf \t\r\n").lower().startswith(b"{\\rtf"):
            return data, "application/rtf", suffix
        return None
    if suffix in {".csv", ".txt", ".xml", ".json", ".md"}:
        try:
            text = data.decode("utf-8-sig")
        except UnicodeDecodeError:
            return None
        if suffix == ".json":
            try:
                json.loads(text)
            except (ValueError, TypeError):
                return None
        mime = {".csv": "text/csv", ".txt": "text/plain", ".xml": "application/xml",
                ".json": "application/json", ".md": "text/markdown"}[suffix]
        return data, mime, suffix
    return None


def _media_ref(source: SourcePackage, reference: Any, imported_media: dict[str, m.FileRecord], basenames: dict[str, list[m.FileRecord]]) -> m.FileRecord | None:
    if not isinstance(reference, str) or not reference.strip() or reference.strip().lower().startswith("data:"):
        return None
    item = source.media.match(reference)
    if item is None:
        return None
    _, path = item
    found = imported_media.get(path.casefold())
    if found:
        return found
    basename = PurePosixPath(path).name.casefold()
    matches = basenames.get(basename, [])
    return matches[0] if len(matches) == 1 else None


def _asset_name(path: str, suffix: str | None = None) -> str:
    name = PurePosixPath(path.replace("\\", "/")).name
    stem = re.sub(r"[^A-Za-z0-9_-]+", "-", PurePosixPath(name).stem).strip("-_")[:90] or "arquivo"
    extension = suffix or PurePosixPath(name).suffix.lower()
    return f"{stem}{extension}"[:240]


def _import_media(source: SourcePackage, db: Session, school_id: str, actor: m.User, run: m.LegacyImportRun,
                  counts: Counter[str], entity_map: dict) -> tuple[dict[str, m.FileRecord], dict[str, list[m.FileRecord]]]:
    by_path: dict[str, m.FileRecord] = {}
    by_basename: dict[str, list[m.FileRecord]] = defaultdict(list)
    content_cache: dict[str, m.FileRecord] = {}
    for item in source.media.entries:
        info, path = item
        raw = source.media.read(item)
        if not raw:
            counts["media_invalid"] += 1
            continue
        safe = _safe_media_data(raw, path)
        if safe is None:
            counts["media_unsupported"] += 1
            continue
        data, mime, suffix = safe
        checksum = hashlib.sha256(data).hexdigest()
        file_record = content_cache.get(checksum)
        if file_record is None:
            file_record = write_file(db, school_id, actor.id, _asset_name(path, suffix), mime, data,
                                     file_kind="photo" if mime.startswith("image/") else "document")
            content_cache[checksum] = file_record
        by_path[path.casefold()] = file_record
        by_basename[PurePosixPath(path).name.casefold()].append(file_record)
        key = _archive_key(path)
        db.add(m.LegacyImportRecord(run_id=run.id, source_table="container_media", source_key=key,
                                    mapped_entity_type="FileRecord", mapped_entity_id=file_record.id,
                                    file_id=file_record.id, record_data={"path": path, "mime_type": mime,
                                                                       "size": len(data), "sha256": checksum}))
        entity_map[("container_media", key)] = ("FileRecord", file_record.id, file_record.id)
        counts["media_imported"] += 1
    return by_path, by_basename


def _archive_key(value: Any, fallback: int | None = None) -> str:
    raw = _text(value, 1000) or (f"row-{fallback}" if fallback is not None else "row")
    if len(raw) <= 140:
        return raw
    return raw[:120] + "-" + hashlib.sha256(raw.encode()).hexdigest()[:32]


def _photo_for(source: SourcePackage, db: Session, school_id: str, actor: m.User, value: Any,
               imported_media: dict[str, m.FileRecord], basenames: dict[str, list[m.FileRecord]],
               photo_cache: dict[str, m.FileRecord], counts: Counter[str]) -> m.FileRecord | None:
    if isinstance(value, str) and value.strip().lower().startswith("data:image/"):
        result = _photo_data(value)
        if result is None:
            counts["photos_invalid"] += 1
            return None
        data, mime = result
        checksum = hashlib.sha256(data).hexdigest()
        if checksum not in photo_cache:
            photo_cache[checksum] = write_file(db, school_id, actor.id, f"foto-legada-{checksum[:12]}.png", mime, data, file_kind="photo")
        counts["photos_base64_converted"] += 1
        return photo_cache[checksum]
    file_record = _media_ref(source, value, imported_media, basenames)
    if file_record:
        file_record.file_kind = "photo"
        counts["photos_from_container"] += 1
    elif _is_photo_data_candidate(value):
        result = _photo_data(value)
        if result is None:
            counts["photos_invalid"] += 1
            return None
        data, mime = result
        checksum = hashlib.sha256(data).hexdigest()
        if checksum not in photo_cache:
            photo_cache[checksum] = write_file(db, school_id, actor.id, f"foto-legada-{checksum[:12]}.png", mime, data, file_kind="photo")
        counts["photos_base64_converted"] += 1
        return photo_cache[checksum]
    elif isinstance(value, str) and value.strip():
        counts["media_references_unresolved"] += 1
    return file_record


def _ensure_type(db: Session, school_id: str, person_id: str, code: str) -> None:
    found = db.scalar(select(m.PersonTypeLink.id).where(m.PersonTypeLink.school_id == school_id,
                                                        m.PersonTypeLink.person_id == person_id,
                                                        m.PersonTypeLink.type_code == code))
    if not found:
        db.add(m.PersonTypeLink(school_id=school_id, person_id=person_id, type_code=code, active=True))


def _person_values(row: dict[str, Any]) -> dict[str, Any]:
    cpf = _valid_cpf(row.get("cpf") or row.get("documento"))
    name = _text(row.get("nome"), 180) or "Pessoa sem nome"
    address_parts = []
    street = _text(row.get("endereco"), 180)
    number = _text(row.get("numero"), 24)
    district = _text(row.get("bairro"), 120)
    city = _text(row.get("cidade"), 120)
    state = _text(row.get("estado"), 2).upper()
    postal = _text(row.get("cep"), 16)
    if street:
        address_parts.append(f"{street}{', ' + number if number else ''}")
    if district:
        address_parts.append(district)
    if city:
        address_parts.append(f"{city}{'/' + state if state else ''}")
    if postal:
        address_parts.append(f"CEP {postal}")
    address = " · ".join(address_parts) or _text(row.get("endereco"), 400)
    return {
        "name": name, "cpf": cpf, "birth_date": _parse_date(row.get("data_nascimento")),
        "email": _text(row.get("email"), 254).lower(), "phone": _text(row.get("telefone") or row.get("whatsapp"), 32),
        "address": address[:400], "notes": _text(row.get("observacoes"), 4000),
        "is_guardian": False, "rg": _text(row.get("rg"), 40), "rg_issuer": _text(row.get("orgao_emissor"), 80),
        "rg_state": "", "nationality": _text(row.get("nacionalidade"), 80),
        "birth_city": _text(row.get("naturalidade"), 120), "sex": _text(row.get("sexo"), 32),
        "mother_name": _text(row.get("nome_mae"), 180),
        "father_name": _text(row.get("nome_pai"), 180), "postal_code": postal,
        "street": street, "address_number": number, "address_complement": _text(row.get("complemento"), 120),
        "district": district, "city": city, "state": state,
        "country": "Brasil", "emergency_contact_name": _text(row.get("contato_emergencia_nome"), 180),
        "emergency_contact_phone": _text(row.get("contato_emergencia_telefone"), 32),
        "active": _bool(row.get("ativo"), True),
    }


def _person_for(db: Session, school_id: str, row: dict[str, Any], person_index: dict[str, m.Person],
                source: SourcePackage, actor: m.User, imported_media: dict[str, m.FileRecord],
                basenames: dict[str, list[m.FileRecord]], photo_cache: dict[str, m.FileRecord],
                counts: Counter[str], role: str) -> tuple[m.Person, m.FileRecord | None, bool]:
    values = _person_values(row)
    cpf = values["cpf"]
    person = person_index.get(cpf) if cpf else None
    photo_ref = next((value for key, value in row.items() if PHOTO_FIELD.search(key) and value not in (None, "")), None)
    photo = _photo_for(source, db, school_id, actor, photo_ref, imported_media, basenames, photo_cache, counts) if photo_ref else None
    created = person is None
    if person is None:
        person = m.Person(school_id=school_id, **values, photo_file_id=photo.id if photo else None)
        db.add(person)
        db.flush()
        if cpf:
            person_index[cpf] = person
        counts["persons_created"] += 1
    else:
        counts["persons_matched_by_cpf"] += 1
        if photo and not person.photo_file_id:
            person.photo_file_id = photo.id
            person.version += 1
    if role == "guardian":
        person.is_guardian = True
    _ensure_type(db, school_id, person.id, role)
    return person, photo, created


def _employment_type(value: Any) -> str:
    key = _normalize(value)
    return {"clt": "clt", "estatutario": "public", "publico": "public", "servico publico": "public",
            "temporario": "temporary", "substituto": "substitute", "estagio": "intern",
            "terceirizado": "outsourced"}.get(key, "other")


def _safe_number(prefix: str, source_id: Any, used: set[str], maximum: int = 40) -> str:
    raw = _text(source_id, 500)
    compact = re.sub(r"[^A-Za-z0-9_-]+", "-", raw).strip("-_")
    candidate = f"{prefix}-{compact}" if compact else f"{prefix}-{hashlib.sha256(raw.encode()).hexdigest()[:12]}"
    if len(candidate) > maximum:
        candidate = f"{prefix}-{hashlib.sha256(raw.encode()).hexdigest()[:16]}"
    initial = candidate
    suffix = 2
    while candidate in used:
        ending = f"-{suffix}"
        candidate = initial[:maximum-len(ending)] + ending
        suffix += 1
    used.add(candidate)
    return candidate


def _import_person_tables(source: SourcePackage, db: Session, school_id: str, actor: m.User,
                          imported_media: dict[str, m.FileRecord],
                          basenames: dict[str, list[m.FileRecord]], counts: Counter[str], entity_map: dict) -> tuple[dict, dict]:
    person_index = {person.cpf: person for person in db.scalars(select(m.Person).where(m.Person.school_id == school_id, m.Person.cpf.is_not(None))) if person.cpf}
    source_person: dict[tuple[str, str], m.Person] = {}
    source_student: dict[tuple[str, str], m.Student] = {}
    photo_cache: dict[str, m.FileRecord] = {}
    used_student_numbers = set(db.scalars(select(m.Student.number).where(m.Student.school_id == school_id)))

    for table, role in (("alunos", "student"), ("responsaveis", "guardian"),
                        ("professores", "teacher"), ("colaboradores", "employee")):
        for index, row in enumerate(source.rows(table)):
            source_key = _archive_key(row.get("id"), index)
            person, photo, created = _person_for(db, school_id, row, person_index, source, actor,
                                                  imported_media, basenames, photo_cache, counts, role)
            source_person[(table, source_key)] = person
            target_type = "Person"
            target_id = person.id
            if table == "alunos":
                existing = db.scalar(select(m.Student).where(m.Student.school_id == school_id, m.Student.person_id == person.id))
                if existing:
                    student = existing
                    counts["students_matched"] += 1
                else:
                    number = _safe_number("LEG", row.get("id", source_key), used_student_numbers, 32)
                    student = m.Student(
                        school_id=school_id, person_id=person.id, number=number,
                        status="active" if _bool(row.get("ativo"), True) else "archived",
                        health_plan=_text(row.get("plano_saude"), 120),
                        allergies=_text(row.get("alergias"), 4000),
                        medications=_text(row.get("medicacoes_continuas"), 4000),
                        health_notes=_text(" · ".join(filter(None, [_text(row.get("hospital_preferencia"), 120),
                                                                    _text(row.get("restricoes_alimentares"), 2000),
                                                                    "Medicação autorizada na escola: " + _text(row.get("medicacao_autorizada_escola"), 1000) if row.get("medicacao_autorizada_escola") else ""])), 4000),
                        authorized_transport="",
                        student_notes=_text(" · ".join(filter(None, [_text(row.get("observacoes"), 3000),
                                                                      "Autorizados a buscar: " + _text(row.get("autorizados_buscar"), 1000) if row.get("autorizados_buscar") else ""])), 4000),
                    )
                    db.add(student)
                    db.flush()
                    counts["students_created"] += 1
                source_student[(table, source_key)] = student
                target_type, target_id = "Student", student.id
            elif table == "professores":
                profile = db.scalar(select(m.TeacherProfile).where(m.TeacherProfile.school_id == school_id, m.TeacherProfile.person_id == person.id))
                if not profile:
                    profile = m.TeacherProfile(
                        school_id=school_id, person_id=person.id,
                        registration_number=_safe_number("LEG-DOC", row.get("id", source_key), set(), 40),
                        employment_type=_employment_type(row.get("tipo_vinculo")),
                        employment_status="active" if _bool(row.get("ativo"), True) else "inactive",
                        admission_date=_parse_date(row.get("data_admissao")),
                        degree_course=_text(row.get("formacao"), 180),
                        teaching_areas="",
                        profile_notes=_text(" · ".join(filter(None, [_text(row.get("observacoes"), 3000),
                                                                     "Cargo na origem: " + _text(row.get("cargo"), 300) if row.get("cargo") else ""])), 4000),
                    )
                    db.add(profile)
                    db.flush()
                    counts["teachers_created"] += 1
                else:
                    counts["teachers_matched"] += 1
                target_type, target_id = "TeacherProfile", profile.id
            elif table == "colaboradores":
                profile = db.scalar(select(m.EmployeeProfile).where(m.EmployeeProfile.school_id == school_id, m.EmployeeProfile.person_id == person.id))
                if not profile:
                    profile = m.EmployeeProfile(
                        school_id=school_id, person_id=person.id,
                        employee_number=_safe_number("LEG-FUNC", row.get("id", source_key), set(), 40),
                        employment_type=_employment_type(row.get("tipo_vinculo")),
                        employment_status="active" if _bool(row.get("ativo"), True) else "inactive",
                        admission_date=_parse_date(row.get("data_admissao")),
                        department="", job_title=_text(row.get("cargo"), 160),
                        profile_notes=_text(row.get("observacoes"), 4000),
                    )
                    db.add(profile)
                    db.flush()
                    counts["employees_created"] += 1
                else:
                    counts["employees_matched"] += 1
                target_type, target_id = "EmployeeProfile", profile.id
            entity_map[(table, source_key)] = (target_type, target_id, photo.id if photo else person.photo_file_id)
    return source_person, source_student


def _lookup_source(mapping: dict, table: str, identifier: Any) -> Any:
    return mapping.get((table, _archive_key(identifier))) if identifier not in (None, "") else None


def _import_guardian_links(source: SourcePackage, db: Session, school_id: str, source_person: dict,
                           source_student: dict, counts: Counter[str], entity_map: dict) -> None:
    guardian_relationships = {
        _archive_key(row.get("id"), index): _text(row.get("parentesco") or row.get("relacao"), 60)
        for index, row in enumerate(source.rows("responsaveis"))
    }
    for index, row in enumerate(source.rows("aluno_responsaveis")):
        source_key = _archive_key(row.get("id"), index)
        student = _lookup_source(source_student, "alunos", row.get("aluno_id"))
        guardian = _lookup_source(source_person, "responsaveis", row.get("responsavel_id"))
        if not student or not guardian:
            counts["guardian_links_unresolved"] += 1
            continue
        existing = db.scalar(select(m.GuardianLink).where(m.GuardianLink.school_id == school_id,
                                                           m.GuardianLink.student_id == student.id,
                                                           m.GuardianLink.person_id == guardian.id))
        if existing:
            link = existing
            counts["guardian_links_matched"] += 1
        else:
            link = m.GuardianLink(
                school_id=school_id, student_id=student.id, person_id=guardian.id,
                relationship=_text(row.get("parentesco") or row.get("relacao"), 60)
                or guardian_relationships.get(_archive_key(row.get("responsavel_id")), "") or "Responsável",
                legal=_bool(row.get("responsavel_legal") or row.get("responsavel_pedagogico"), False),
                financial=_bool(row.get("responsavel_financeiro"), False),
                pickup=_bool(row.get("autorizado_buscar"), False),
                primary_contact=_bool(row.get("contato_principal"), False), active=_bool(row.get("ativo"), True),
            )
            db.add(link)
            db.flush()
            counts["guardian_links_created"] += 1
        entity_map[("aluno_responsaveis", source_key)] = ("GuardianLink", link.id, None)


def _get_or_create_named(db: Session, model, school_id: str, name: str, values: dict[str, Any], counts: Counter[str], metric: str):
    limit = {m.Unit: 160, m.Grade: 100, m.Shift: 80, m.DocumentType: 120}.get(model, 160)
    name = _text(name, limit)
    if not name:
        return None
    existing = next((item for item in db.scalars(select(model).where(model.school_id == school_id))
                     if _normalize(item.name) == _normalize(name)), None)
    if existing:
        counts[metric + "_matched"] += 1
        return existing
    obj = model(school_id=school_id, name=name, **values)
    db.add(obj)
    db.flush()
    counts[metric + "_created"] += 1
    return obj


def _import_academic(source: SourcePackage, db: Session, school_id: str, counts: Counter[str], entity_map: dict) -> dict:
    result: dict[tuple[str, str], Any] = {}
    unit_rows = list(source.rows("unidades_escolares"))
    if unit_rows:
        for index, row in enumerate(unit_rows):
            key = _archive_key(row.get("id"), index)
            obj = _get_or_create_named(db, m.Unit, school_id, row.get("nome"),
                                       {"active": _bool(row.get("ativo"), True)}, counts, "units")
            if obj:
                result[("unidades_escolares", key)] = obj
                entity_map[("unidades_escolares", key)] = ("Unit", obj.id, None)
    default_unit = next(iter(result.values()), None)
    if default_unit is None:
        default_unit = db.scalar(select(m.Unit).where(m.Unit.school_id == school_id).order_by(m.Unit.created_at))

    for index, row in enumerate(source.rows("periodos_letivos")):
        key = _archive_key(row.get("id"), index)
        label = _text(row.get("descricao"), 40) or _text(row.get("ano"), 40)
        start = _parse_date(row.get("data_inicio"))
        end = _parse_date(row.get("data_fim"))
        if not start or not end:
            year_text = _text(row.get("ano"), 4)
            year = int(year_text) if year_text.isdigit() and 2000 <= int(year_text) <= 2200 else None
            if year:
                start, end = date(year, 1, 1), date(year, 12, 31)
        if not label or not start or not end or end < start:
            counts["academic_years_unmapped"] += 1
            continue
        existing = next((obj for obj in db.scalars(select(m.AcademicYear).where(m.AcademicYear.school_id == school_id))
                         if _normalize(obj.name) == _normalize(label)), None)
        obj = existing or m.AcademicYear(school_id=school_id, name=label[:40], starts_on=start, ends_on=end,
                                         status="active" if _bool(row.get("ativo"), True) else "closed")
        if existing:
            counts["academic_years_matched"] += 1
        else:
            db.add(obj); db.flush(); counts["academic_years_created"] += 1
        result[("periodos_letivos", key)] = obj
        entity_map[("periodos_letivos", key)] = ("AcademicYear", obj.id, None)

    for index, row in enumerate(source.rows("cursos")):
        key = _archive_key(row.get("id"), index)
        obj = _get_or_create_named(db, m.Grade, school_id, row.get("nome"),
                                   {"level": _text(row.get("modalidade"), 100) or "Educação básica",
                                    "active": _bool(row.get("ativo"), True)}, counts, "grades")
        if obj:
            result[("cursos", key)] = obj
            entity_map[("cursos", key)] = ("Grade", obj.id, None)

    for index, row in enumerate(source.rows("disciplinas")):
        key = _archive_key(row.get("id"), index)
        name = _text(row.get("nome"), 120)
        existing = next((obj for obj in db.scalars(select(dm.CurriculumComponent).where(dm.CurriculumComponent.school_id == school_id))
                         if _normalize(obj.name) == _normalize(name)), None)
        try:
            workload = max(0, min(100_000, int(row.get("carga_horaria") or 0)))
        except (TypeError, ValueError):
            workload = 0
        if existing:
            obj = existing; counts["components_matched"] += 1
        elif name:
            obj = dm.CurriculumComponent(school_id=school_id, name=name, code=_text(row.get("codigo"), 40),
                                         workload_hours=workload, active=_bool(row.get("ativo"), True))
            db.add(obj); db.flush(); counts["components_created"] += 1
        else:
            continue
        result[("disciplinas", key)] = obj
        entity_map[("disciplinas", key)] = ("CurriculumComponent", obj.id, None)

    shifts: dict[str, m.Shift] = {}
    for row in source.rows("turmas"):
        name = _text(row.get("turno"), 80)
        if name and _normalize(name) not in shifts:
            obj = _get_or_create_named(db, m.Shift, school_id, name, {"active": True}, counts, "shifts")
            if obj:
                shifts[_normalize(name)] = obj

    for index, row in enumerate(source.rows("turmas")):
        key = _archive_key(row.get("id"), index)
        course = _lookup_source(result, "cursos", row.get("curso_id"))
        year = _lookup_source(result, "periodos_letivos", row.get("periodo_letivo_id"))
        shift = shifts.get(_normalize(row.get("turno")))
        unit = _lookup_source(result, "unidades_escolares", row.get("unidade_id")) if row.get("unidade_id") else default_unit
        if not course or not year or not shift or not unit:
            counts["class_groups_unmapped"] += 1
            continue
        name = _text(row.get("nome"), 120)
        if not name:
            counts["class_groups_unmapped"] += 1
            continue
        existing = next((obj for obj in db.scalars(select(m.ClassGroup).where(
            m.ClassGroup.school_id == school_id, m.ClassGroup.academic_year_id == year.id,
            m.ClassGroup.unit_id == unit.id)) if _normalize(obj.name) == _normalize(name)), None)
        try:
            capacity = max(1, min(2000, int(row.get("capacidade") or 30)))
        except (TypeError, ValueError):
            capacity = 30
        if existing:
            group = existing; counts["class_groups_matched"] += 1
        else:
            group = m.ClassGroup(school_id=school_id, name=name, unit_id=unit.id,
                                 academic_year_id=year.id, grade_id=course.id, shift_id=shift.id,
                                 capacity=capacity, active=_bool(row.get("ativo"), True))
            db.add(group); db.flush(); counts["class_groups_created"] += 1
        result[("turmas", key)] = group
        entity_map[("turmas", key)] = ("ClassGroup", group.id, None)
    return result


def _import_enrollments(source: SourcePackage, db: Session, school_id: str, actor: m.User, source_student: dict,
                        academic: dict, counts: Counter[str], entity_map: dict) -> None:
    used_numbers = set(db.scalars(select(m.Enrollment.number).where(m.Enrollment.school_id == school_id)))
    for index, row in enumerate(source.rows("matriculas")):
        key = _archive_key(row.get("id"), index)
        student = _lookup_source(source_student, "alunos", row.get("aluno_id"))
        group = _lookup_source(academic, "turmas", row.get("turma_id"))
        enrolled_on = _parse_date(row.get("data_matricula")) or _parse_date(row.get("created_at"))
        if not student or not group or not enrolled_on:
            counts["enrollments_unmapped"] += 1
            continue
        original_status = _normalize(row.get("status"))
        status = {"suspensa": "suspended", "suspenso": "suspended", "transferida": "transferred",
                  "transferido": "transferred", "cancelada": "cancelled", "cancelado": "cancelled",
                  "concluida": "completed", "concluido": "completed"}.get(original_status, "draft")
        number = _safe_number("LEG-MAT", row.get("numero_matricula") or row.get("id", key), used_numbers, 40)
        enrollment = m.Enrollment(
            school_id=school_id, student_id=student.id, academic_year_id=group.academic_year_id,
            class_group_id=group.id, number=number, enrolled_on=enrolled_on, status=status,
            enrollment_type={"renovacao": "renewal", "transferencia": "transfer_in", "retorno": "returning"}.get(original_status, "new"),
            origin_school="", notes=_text(row.get("observacoes"), 4000),
            external_reference=_text(row.get("numero_matricula"), 120),
        )
        db.add(enrollment); db.flush()
        db.add(m.EnrollmentEvent(school_id=school_id, enrollment_id=enrollment.id,
                                 action="legacy_import", reason=f"Importação legada; situação original: {_text(row.get('status'), 80) or 'não informada'}",
                                 before={}, after={"status": status}, actor_id=actor.id))
        entity_map[("matriculas", key)] = ("Enrollment", enrollment.id, None)
        counts["enrollments_created"] += 1
        if status == "draft" and original_status in {"ativa", "ativo", "matriculada", "matriculado"}:
            counts["enrollments_review_before_activation"] += 1


def _document_status(value: Any) -> str:
    return {"validado": "validated", "validated": "validated", "rejeitado": "rejected", "rejected": "rejected",
            "dispensado": "waived", "waived": "waived", "arquivado": "archived", "archived": "archived"}.get(_normalize(value), "received")


def _import_student_documents(source: SourcePackage, db: Session, school_id: str, source_student: dict,
                              imported_media: dict[str, m.FileRecord], basenames: dict[str, list[m.FileRecord]],
                              counts: Counter[str], entity_map: dict) -> None:
    for index, row in enumerate(source.rows("documentos_alunos")):
        key = _archive_key(row.get("id"), index)
        student = _lookup_source(source_student, "alunos", row.get("aluno_id"))
        if not student:
            counts["student_documents_unmapped"] += 1
            continue
        name = _text(row.get("tipo"), 120) or "Documento legado"
        kind = _get_or_create_named(db, m.DocumentType, school_id, name, {"required": False, "active": True, "grade_id": None}, counts, "document_types")
        reference = row.get("arquivo_ref")
        file_record = _media_ref(source, reference, imported_media, basenames)
        status = _document_status(row.get("status"))
        notes = _text(row.get("observacoes") or row.get("descricao"), 4000)
        if reference and not file_record:
            counts["document_files_unresolved"] += 1
            notes = (notes + " · Arquivo da origem não veio no ZIP de mídias; referência preservada no arquivo de portabilidade.")[:4000]
        document = m.StudentDocument(school_id=school_id, student_id=student.id, document_type_id=kind.id,
                                     file_id=file_record.id if file_record else None, status=status, notes=notes)
        db.add(document); db.flush()
        entity_map[("documentos_alunos", key)] = ("StudentDocument", document.id, file_record.id if file_record else None)
        counts["student_documents_created"] += 1


def _import_inactive_users(source: SourcePackage, db: Session, school_id: str, actor: m.User,
                           imported_media: dict[str, m.FileRecord], basenames: dict[str, list[m.FileRecord]],
                           counts: Counter[str], entity_map: dict) -> None:
    from .security import hash_password
    photo_cache: dict[str, m.FileRecord] = {}
    for index, row in enumerate(source.rows("usuarios")):
        key = _archive_key(row.get("id"), index)
        email = _text(row.get("email"), 254).casefold()
        source_photo = next((value for field, value in row.items() if PHOTO_FIELD.search(field) and value not in (None, "")), None)
        photo = _photo_for(source, db, school_id, actor, source_photo, imported_media,
                           basenames, photo_cache, counts)
        if not email or "@" not in email or db.scalar(select(m.User.id).where(func.lower(m.User.email) == email)):
            counts["users_not_created_email_missing_or_conflict"] += 1
            entity_map[("usuarios", key)] = ("", "", photo.id if photo else None)
            continue
        name = _text(row.get("nome"), 160) or email[:160]
        # Senhas legadas não são reutilizadas. O registro nasce inativo, com perfil mínimo e novo hash aleatório.
        user = m.User(name=name, email=email, password_hash=hash_password(secrets.token_urlsafe(32)), role="viewer", active=False)
        db.add(user); db.flush()
        db.add(m.SchoolAccess(user_id=user.id, school_id=school_id))
        from .storage import read_bytes
        profile = m.UserProfile(user_id=user.id, phone=_text(row.get("telefone"), 32),
                                job_title=_text(row.get("cargo"), 120),
                                bio=_secret_scrub_text(_text(row.get("observacoes"), 1000)))
        db.add(profile)
        db.flush()
        if photo:
            try:
                profile.photo = read_bytes(photo)
                profile.photo_hash = hashlib.sha256(profile.photo).hexdigest()
            except (FileNotFoundError, OSError):
                profile.photo = None
                counts["user_photos_unresolved"] += 1
        entity_map[("usuarios", key)] = ("User", user.id, photo.id if photo else None)
        counts["users_created_inactive"] += 1


def _secret_scrub_text(value: str) -> str:
    value = re.sub(r"(?i)\bBearer\s+[A-Za-z0-9._~-]+", "Bearer [REDACTED]", value)
    value = re.sub(r"(?i)(senha|password|token|secret|authorization|cookie|api[_-]?key)(\s*[:=]\s*)([^\s,;]+)", r"\1\2[REDACTED]", value)
    value = re.sub(r"data:image/[A-Za-z0-9.+-]+;base64,[A-Za-z0-9+/=_\-\s]+", "[IMAGE_CONVERTED_OR_EXCLUDED]", value, flags=re.I)
    return value


def _json_safe(value: Any, field: str = "") -> Any:
    if SECRET_FIELD.search(field):
        return "[REDACTED]"
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if isinstance(value, bytes):
        if len(value) <= 256 * 1024:
            return {"encoding": "base64", "data": base64.b64encode(value).decode("ascii")}
        return {"encoding": "omitted_large_binary", "size": len(value), "sha256": hashlib.sha256(value).hexdigest()}
    if isinstance(value, str):
        if REFERENCE_FIELD.search(field) and _blocked_path(value):
            return "[EXCLUDED_PATH]"
        return _secret_scrub_text(value)
    if isinstance(value, list):
        return [_json_safe(item, field) for item in value]
    if isinstance(value, dict):
        return {str(key): _json_safe(item, str(key)) for key, item in value.items()}
    if isinstance(value, (int, float, bool)) or value is None:
        return value
    return _secret_scrub_text(str(value))


def _sanitized_row(table: str, row: dict[str, Any], file_id: str | None) -> dict[str, Any]:
    output: dict[str, Any] = {}
    secret_setting = False
    if table in {"app_settings", "configuracoes"}:
        setting_key = _normalize(row.get("chave") or row.get("nome"))
        secret_setting = bool(SECRET_FIELD.search(setting_key))
    for key, value in row.items():
        if PHOTO_FIELD.search(key):
            if _is_photo_data_candidate(value):
                output[key] = "[IMAGE_CONVERTED]" if file_id else "[IMAGE_NOT_IMPORTED]"
            elif isinstance(value, str) and _blocked_path(value):
                output[key] = "[EXCLUDED_PATH]"
            else:
                output[key] = _json_safe(value, key)
        elif table in {"app_settings", "configuracoes"} and secret_setting and key.casefold() == "valor":
            output[key] = "[REDACTED]"
        elif key.casefold() in {"payload_json", "details_json"} and isinstance(value, str):
            try:
                output[key] = _json_safe(json.loads(value))
            except (ValueError, TypeError):
                output[key] = _secret_scrub_text(value)
        else:
            output[key] = _json_safe(value, key)
    if table == "sync_queue":
        output["_portability"] = "archived_without_replay"
    elif table in {"audit_logs", "app_logs"}:
        output["_portability"] = "archived_without_replaying_history"
    if file_id:
        output["_pige360_file_id"] = file_id
    return output


def _preview(source: SourcePackage) -> dict[str, Any]:
    total = sum(source.table_counts.values())
    inline_photos = 0
    valid_inline_photos = 0
    invalid_inline_photos = 0
    unresolved_paths = 0
    for table in ("alunos", "professores", "colaboradores", "usuarios"):
        for row in source.rows(table):
            refs = [value for field, value in row.items() if PHOTO_FIELD.search(field) and isinstance(value, str) and value.strip()]
            for ref in refs:
                if ref.strip().lower().startswith("data:image/"):
                    inline_photos += 1
                    if _photo_data(ref):
                        valid_inline_photos += 1
                    else:
                        invalid_inline_photos += 1
                else:
                    item = source.media.match(ref)
                    if item is None and _is_photo_data_candidate(ref):
                        inline_photos += 1
                        if _photo_data(ref):
                            valid_inline_photos += 1
                        else:
                            invalid_inline_photos += 1
                    elif item is None:
                        unresolved_paths += 1
    destination = {table: MAPPED_TABLES.get(table, "arquivo histórico de portabilidade")
                   for table in source.tables if source.table_counts[table]}
    warnings = [
        "Senhas, hashes de senha, tokens, sessões e permissões antigas não serão usados para autenticação. Usuários compatíveis serão criados inativos, como consulta, para redefinição posterior.",
        "Logs e filas serão preservados no histórico, mas a fila de sincronização não será reexecutada.",
        "Cadastros serão associados por CPF válido exato. Campos existentes não serão sobrescritos; vínculos sem chave explícita ficarão para revisão.",
    ]
    if source.table_counts.get("responsaveis", 0) and not source.table_counts.get("aluno_responsaveis", 0):
        warnings.append("Há responsáveis sem linhas em aluno_responsaveis; eles serão cadastrados, mas nenhum vínculo com aluno será presumido.")
    if source.table_counts.get("documentos_alunos", 0) + source.table_counts.get("documentos_colaboradores", 0) and not source.media.entries:
        warnings.append("O banco referencia documentação, mas o ZIP de arquivos do container não foi enviado; metadados serão preservados e arquivos ausentes ficarão indicados.")
    if not source.media.entries:
        warnings.append("Este backup não contém arquivos de mídia separados. Para documentos ou fotos por caminho local, anexe o ZIP da pasta de mídia do container.")
    if source.media.ignored_magento:
        warnings.append(f"{source.media.ignored_magento} caminho(s) contendo Magento foram excluídos da análise e da importação.")
    if source.media.unsupported:
        warnings.append(f"{source.media.unsupported} arquivo(s) do ZIP não serão importados por formato não suportado, tamanho excessivo ou estrutura inválida.")
    if invalid_inline_photos:
        warnings.append(f"{invalid_inline_photos} foto(s) Base64 inválida(s) serão preservadas como referência sanitizada e não convertidas.")
    return {
        "source_system": "School Desktop Suite",
        "source_database": source.source_name,
        "max_package_mb": settings().legacy_import_max_mb,
        "fingerprint": source.fingerprint,
        "source_database_sha256": source.db_hash,
        "database_size_bytes": source.db_size,
        "table_count": len(source.tables),
        "source_record_count": total,
        "archive_record_count": total + len(source.media.entries),
        "tables": [{"name": table, "rows": source.table_counts[table], "destination": destination.get(table, "sem registros"),
                    "columns": len(source.table_schema[table]["columns"])}
                   for table in source.tables],
        "media": {"container_files_candidate_count": len(source.media.entries),
                  "container_files_uncompressed_bytes": source.media.total_uncompressed,
                  "container_magento_paths_ignored": source.media.ignored_magento,
                  "container_unsafe_or_cache_paths_ignored": source.media.ignored_paths,
                  "container_unsupported_files_ignored": source.media.unsupported,
                  "inline_photos_found": inline_photos, "inline_photos_convertible": valid_inline_photos,
                  "inline_photos_invalid": invalid_inline_photos, "unresolved_media_references": unresolved_paths},
        "warnings": warnings,
    }


@router.post("/preview")
def preview(db: DB, user: Actor, school: Scope, request: Request,
            backup: UploadFile = File(...), container_media: UploadFile | None = File(None)):
    _admin(user)
    with _source(backup, container_media) as source:
        result = _preview(source)
        audit(db, request, user, "legacy_import.previewed", school, school.id,
              {"fingerprint": source.fingerprint[:16], "source_rows": result["source_record_count"],
               "tables": result["table_count"]})
        return result


@router.post("/apply")
def apply_import(db: DB, user: Actor, school: Scope, request: Request,
                 fingerprint: str = Form(...), confirmation: str = Form(...),
                 backup: UploadFile = File(...), container_media: UploadFile | None = File(None)):
    _admin(user)
    with _source(backup, container_media) as source:
        if not re.fullmatch(r"[0-9a-f]{64}", fingerprint) or not secrets.compare_digest(fingerprint, source.fingerprint):
            fail(409, "Os arquivos mudaram desde a prévia. Gere uma nova prévia antes de importar.")
        if confirmation.strip().upper() != "IMPORTAR":
            fail(422, "Digite IMPORTAR para confirmar a gravação dos dados.")
        lock_school(db, school.id)
        existing = db.scalar(select(m.LegacyImportRun).where(m.LegacyImportRun.school_id == school.id,
                                                              m.LegacyImportRun.fingerprint == source.fingerprint))
        if existing:
            fail(409, "Este pacote já foi importado nesta escola. Consulte o histórico para baixar o arquivo de portabilidade.")
        preview_result = _preview(source)
        run = m.LegacyImportRun(school_id=school.id, fingerprint=source.fingerprint,
                                source_system="school_desktop_suite", imported_by=user.id,
                                summary={"status": "processing", "source_record_count": preview_result["source_record_count"]})
        db.add(run); db.flush()
        counts: Counter[str] = Counter()
        entity_map: dict[tuple[str, str], tuple[str, str, str | None]] = {}
        imported_media, basenames = _import_media(source, db, school.id, user, run, counts, entity_map)
        source_person, source_student = _import_person_tables(source, db, school.id, user,
                                                              imported_media, basenames, counts, entity_map)
        _import_guardian_links(source, db, school.id, source_person, source_student, counts, entity_map)
        academic = _import_academic(source, db, school.id, counts, entity_map)
        _import_enrollments(source, db, school.id, user, source_student, academic, counts, entity_map)
        _import_student_documents(source, db, school.id, source_student, imported_media, basenames, counts, entity_map)
        _import_inactive_users(source, db, school.id, user, imported_media, basenames, counts, entity_map)
        archive_batch: list[dict[str, Any]] = []
        for table in source.tables:
            for index, row in enumerate(source.rows(table)):
                key = _archive_key(row.get("id"), index)
                mapped = entity_map.get((table, key), ("", "", None))
                related_file_ids = {mapped[2]} if mapped[2] else set()
                for field, value in row.items():
                    if REFERENCE_FIELD.search(field) and isinstance(value, str) and value.strip():
                        file_record = _media_ref(source, value, imported_media, basenames)
                        if file_record:
                            related_file_ids.add(file_record.id)
                data = _sanitized_row(table, row, mapped[2])
                if related_file_ids:
                    data["_pige360_related_file_ids"] = sorted(related_file_ids)
                archive_batch.append({"run_id": run.id, "source_table": table, "source_key": key,
                                      "mapped_entity_type": mapped[0], "mapped_entity_id": mapped[1] or None,
                                      "file_id": mapped[2], "record_data": data})
                if len(archive_batch) >= ARCHIVE_BATCH_SIZE:
                    db.execute(insert(m.LegacyImportRecord), archive_batch)
                    archive_batch.clear()
                counts["source_records_archived"] += 1
        if archive_batch:
            db.execute(insert(m.LegacyImportRecord), archive_batch)
        summary = {
            "source_system": "School Desktop Suite", "source_record_count": preview_result["source_record_count"],
            "source_table_count": preview_result["table_count"], "archive_record_count": counts["source_records_archived"] + counts["media_imported"],
            "source_database": source.source_name, "source_database_sha256": source.db_hash,
            "source_database_size_bytes": source.db_size, "source_package_fingerprint": source.fingerprint,
            "source_table_schema": source.table_schema,
            "table_rows": {name: count for name, count in source.table_counts.items()},
            "counts": dict(counts), "media": preview_result["media"],
            "warnings": preview_result["warnings"],
            "security_policy": {"legacy_users": "inactive_viewer", "legacy_passwords_sessions_permissions": "not_imported",
                                "sync_queue": "archived_not_replayed", "logs": "archived_not_replayed",
                                "magento_assets": "excluded"},
        }
        run.summary = summary
        db.flush()
        audit(db, request, user, "legacy_import.applied", run, school.id,
              {"fingerprint": run.fingerprint[:16], "source_rows": summary["source_record_count"],
               "archive_records": summary["archive_record_count"],
               "students_created": counts["students_created"], "photos_converted": counts["photos_base64_converted"]})
        return {"run_id": run.id, "fingerprint": run.fingerprint, "summary": summary}


@router.get("/runs")
def list_runs(db: DB, user: Actor, school: Scope):
    _admin(user)
    runs = db.scalars(select(m.LegacyImportRun).where(m.LegacyImportRun.school_id == school.id)
                      .order_by(m.LegacyImportRun.created_at.desc()).limit(100)).all()
    return [{"id": run.id, "source_system": run.source_system, "created_at": run.created_at.isoformat(),
             "fingerprint": run.fingerprint,
             "summary": {key: value for key, value in run.summary.items() if key != "source_table_schema"}}
            for run in runs]


def _cleanup_export(path: str) -> None:
    Path(path).unlink(missing_ok=True)


@router.get("/runs/{run_id}/archive")
def download_archive(run_id: str, db: DB, user: Actor, school: Scope, request: Request):
    _admin(user)
    run = db.scalar(select(m.LegacyImportRun).where(m.LegacyImportRun.id == run_id,
                                                    m.LegacyImportRun.school_id == school.id))
    if not run:
        fail(404, "Lote de importação não encontrado.")
    count = db.scalar(select(func.count()).select_from(m.LegacyImportRecord).where(m.LegacyImportRecord.run_id == run.id)) or 0
    handle = tempfile.NamedTemporaryFile(prefix="pige360-portabilidade-", suffix=".jsonl", delete=False)
    path = handle.name
    try:
        with handle:
            manifest = {"_record_type": "manifest", "source_system": run.source_system,
                        "run_id": run.id, "fingerprint": run.fingerprint, "summary": run.summary}
            handle.write((json.dumps(manifest, ensure_ascii=False, separators=(",", ":"), default=str) + "\n").encode("utf-8"))
            query = db.scalars(select(m.LegacyImportRecord).where(m.LegacyImportRecord.run_id == run.id)
                               .order_by(m.LegacyImportRecord.source_table, m.LegacyImportRecord.source_key).execution_options(yield_per=500))
            for record in query:
                line = {"source_table": record.source_table, "source_key": record.source_key,
                        "mapped_entity_type": record.mapped_entity_type, "mapped_entity_id": record.mapped_entity_id,
                        "file_id": record.file_id, "record": record.record_data}
                handle.write((json.dumps(line, ensure_ascii=False, separators=(",", ":"), default=str) + "\n").encode("utf-8"))
        audit(db, request, user, "legacy_import.archive_downloaded", run, school.id, {"records": count})
        filename = f"pige360-portabilidade-{run.id[:8]}.jsonl"
        return FileResponse(path, media_type="application/x-ndjson", filename=filename,
                            headers={"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"},
                            background=BackgroundTask(_cleanup_export, path))
    except BaseException:
        _cleanup_export(path)
        raise
