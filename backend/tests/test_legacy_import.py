import base64
import io
import json
import sqlite3
import zipfile
from concurrent.futures import ThreadPoolExecutor

from PIL import Image


def _sample_archives():
    image = io.BytesIO()
    Image.effect_noise((64, 64), 100).convert("RGB").save(image, format="PNG")
    image_bytes = image.getvalue()
    data_uri = "data:image/png;base64," + base64.b64encode(image_bytes).decode("ascii")

    connection = sqlite3.connect(":memory:")
    connection.executescript("""
        CREATE TABLE alunos(id TEXT, nome TEXT, cpf TEXT, data_nascimento TEXT, telefone TEXT,
                            email TEXT, endereco TEXT, ativo INTEGER, foto_ref TEXT, alergias TEXT);
        CREATE TABLE responsaveis(id TEXT, nome TEXT, parentesco TEXT, telefone TEXT, whatsapp TEXT,
                                  email TEXT, ativo INTEGER);
        CREATE TABLE aluno_responsaveis(id TEXT, aluno_id TEXT, responsavel_id TEXT,
                                        responsavel_financeiro INTEGER, responsavel_pedagogico INTEGER,
                                        ativo INTEGER);
        CREATE TABLE professores(id TEXT, nome TEXT, ativo INTEGER, foto_ref TEXT);
        CREATE TABLE colaboradores(id TEXT, nome TEXT, ativo INTEGER, foto_ref TEXT);
        CREATE TABLE usuarios(id TEXT, nome TEXT, email TEXT, photo_url TEXT, senha_hash TEXT,
                              ativo INTEGER, administrador INTEGER);
        CREATE TABLE user_sessions(id TEXT, usuario_id TEXT, session_token TEXT);
        CREATE TABLE app_logs(id INTEGER, message TEXT, details_json TEXT);
        CREATE TABLE unidades_escolares(id TEXT, nome TEXT, ativo INTEGER);
        CREATE TABLE periodos_letivos(id TEXT, descricao TEXT, ano INTEGER, data_inicio TEXT,
                                      data_fim TEXT, ativo INTEGER);
        CREATE TABLE cursos(id TEXT, nome TEXT, modalidade TEXT, ativo INTEGER);
        CREATE TABLE disciplinas(id TEXT, nome TEXT, codigo TEXT, carga_horaria INTEGER, ativo INTEGER);
        CREATE TABLE turmas(id TEXT, nome TEXT, curso_id TEXT, periodo_letivo_id TEXT,
                            turno TEXT, capacidade INTEGER, ativo INTEGER);
        CREATE TABLE matriculas(id TEXT, aluno_id TEXT, turma_id TEXT, numero_matricula TEXT,
                                data_matricula TEXT, status TEXT, ativo INTEGER);
        CREATE TABLE documentos_alunos(id TEXT, aluno_id TEXT, tipo TEXT, arquivo_ref TEXT,
                                       status TEXT, observacoes TEXT);
        CREATE TABLE documentos_colaboradores(id TEXT, pessoa_id TEXT, tipo TEXT, arquivo_ref TEXT);
    """)
    connection.execute("INSERT INTO alunos VALUES(?,?,?,?,?,?,?,?,?,?)", (
        "student-source-1", "Aluno legado de teste", "529.982.247-25", "2015-01-02", "71999990000",
        "student@example.test", "Rua de teste, 12", 1, data_uri, "Alergia sintética"))
    connection.execute("INSERT INTO responsaveis VALUES(?,?,?,?,?,?,?)", (
        "guardian-source-1", "Responsável legado de teste", "Mãe", "71999990001", "71999990001",
        "guardian@example.test", 1))
    connection.execute("INSERT INTO aluno_responsaveis VALUES(?,?,?,?,?,?)", (
        "guardian-link-source-1", "student-source-1", "guardian-source-1", 1, 1, 1))
    connection.execute("INSERT INTO professores VALUES(?,?,?,?)", (
        "teacher-source-1", "Professor legado de teste", 1, base64.b64encode(image_bytes).decode("ascii")))
    connection.execute("INSERT INTO unidades_escolares VALUES(?,?,?)", ("unit-source-1", "Unidade legada", 1))
    connection.execute("INSERT INTO periodos_letivos VALUES(?,?,?,?,?,?)", (
        "year-source-1", "2026", 2026, "2026-01-01", "2026-12-31", 1))
    connection.execute("INSERT INTO cursos VALUES(?,?,?,?)", ("grade-source-1", "1º ano", "Fundamental", 1))
    connection.execute("INSERT INTO disciplinas VALUES(?,?,?,?,?)", (
        "component-source-1", "MAT", "Matemática", 120, 1))
    connection.execute("INSERT INTO turmas VALUES(?,?,?,?,?,?,?)", (
        "class-source-1", "1º ano A", "grade-source-1", "year-source-1", "Matutino", 30, 1))
    connection.execute("INSERT INTO matriculas VALUES(?,?,?,?,?,?,?)", (
        "enrollment-source-1", "student-source-1", "class-source-1", "M-001", "2026-01-12", "ativa", 1))
    connection.execute("INSERT INTO documentos_alunos VALUES(?,?,?,?,?,?)", (
        "document-source-1", "student-source-1", "Identidade", "uploads/container-photo.png", "validado", "Documento recebido"))
    connection.execute("INSERT INTO usuarios VALUES(?,?,?,?,?,?,?)", (
        "user-source-1", "Usuário legado inativo", "legacy-import@example.test", data_uri,
        "old-password-hash-must-not-survive", 1, 1))
    connection.execute("INSERT INTO user_sessions VALUES(?,?,?)", (
        "session-source-1", "user-source-1", "old-session-token-must-not-survive"))
    connection.execute("INSERT INTO app_logs VALUES(?,?,?)", (
        1, "Authorization: Bearer old-bearer-token-must-not-survive", '{"api_key":"old-key-must-not-survive"}'))
    connection.commit()
    db_bytes = connection.serialize()
    connection.close()

    backup = io.BytesIO()
    with zipfile.ZipFile(backup, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("school_desktop_suite/app.db", db_bytes)
        archive.writestr("school_desktop_suite_novo_vazio/app.db", b"not a source database")
        archive.writestr("school_desktop_suite/Magento/photo.jpg", image_bytes)

    media = io.BytesIO()
    presentation = io.BytesIO()
    with zipfile.ZipFile(presentation, "w", zipfile.ZIP_DEFLATED) as document:
        document.writestr("[Content_Types].xml", '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>')
        document.writestr("ppt/presentation.xml", '<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>')
    with zipfile.ZipFile(media, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("uploads/container-photo.png", image_bytes)
        archive.writestr("documents/roteiro.pptx", presentation.getvalue())
        archive.writestr("documents/declaracao.rtf", "{\\rtf1 Documento legado}")
        archive.writestr("documents/manifesto.json", '{"origem":"container"}')
        archive.writestr("Magento/do-not-import.png", image_bytes)
    return backup.getvalue(), media.getvalue(), base64.b64encode(image_bytes).decode("ascii")


def _full_selection(backup):
    with zipfile.ZipFile(io.BytesIO(backup)) as archive:
        connection = sqlite3.connect(":memory:")
        connection.deserialize(archive.read("school_desktop_suite/app.db"))
    tables = [row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type='table'")]
    connection.close()
    return json.dumps({"tables": tables, "include_photos": True, "include_media": True})


def test_legacy_import_preview_apply_archive_photos_and_idempotency(client, admin, school):
    backup, media, original_photo_base64 = _sample_archives()
    base = f"/api/v1/schools/{school['id']}/legacy-import"
    files = {
        "backup": ("school-backup.zip", backup, "application/zip"),
        "container_media": ("container-media.zip", media, "application/zip"),
    }

    selection = _full_selection(backup)
    preview = client.post(base + "/preview", headers=admin, files=files, data={"selection": selection})
    assert preview.status_code == 200, preview.text
    manifest = preview.json()
    assert manifest["source_record_count"] == 14
    assert manifest["media"]["inline_photos_convertible"] == 3
    assert manifest["media"]["container_files_candidate_count"] == 4
    assert manifest["media"]["container_magento_paths_ignored"] == 1
    assert manifest["tables"]
    assert any(row["name"] == "aluno_responsaveis" and row["rows"] == 1 for row in manifest["tables"])

    applied = client.post(base + "/apply", headers=admin,
                          data={"fingerprint": manifest["fingerprint"], "confirmation": "IMPORTAR", "selection": selection}, files=files)
    assert applied.status_code == 200, applied.text
    result = applied.json()
    assert result["summary"]["counts"]["students_created"] == 1
    assert result["summary"]["counts"]["guardian_links_created"] == 1
    assert result["summary"]["counts"]["class_groups_created"] == 1
    assert result["summary"]["counts"]["enrollments_created"] == 1
    assert result["summary"]["counts"]["student_documents_created"] == 1
    assert result["summary"]["counts"]["photos_base64_converted"] == 3
    assert result["summary"]["counts"]["users_created_inactive"] == 1
    assert result["summary"]["counts"]["media_imported"] == 1

    students = client.get(f"/api/v1/schools/{school['id']}/students?q=Aluno legado de teste", headers=admin)
    assert students.status_code == 200, students.text
    student = students.json()["items"][0]
    photo_id = student["person"]["photo_file_id"]
    detail = client.get(f"/api/v1/schools/{school['id']}/students/{student['id']}", headers=admin)
    assert detail.status_code == 200, detail.text
    assert detail.json()["guardians"][0]["person"]["name"] == "Responsável legado de teste"
    assert detail.json()["guardians"][0]["relationship"] == "Mãe"
    assert detail.json()["enrollments"][0]["status"] == "draft"
    documents = client.get(f"/api/v1/schools/{school['id']}/students/{student['id']}/documents", headers=admin)
    assert documents.status_code == 200, documents.text
    assert documents.json()["items"][0]["file"]["mime_type"] == "image/png"
    photo = client.get(f"/api/v1/schools/{school['id']}/files/{photo_id}/download", headers=admin)
    assert photo.status_code == 200
    assert photo.headers["content-type"] == "image/png"
    assert photo.content.startswith(b"\x89PNG\r\n\x1a\n")

    users = client.get("/api/v1/users", headers=admin)
    imported_user = next(row for row in users.json() if row["email"] == "legacy-import@example.test")
    assert imported_user["active"] is False
    assert imported_user["role"] == "viewer"

    archived = client.get(base + f"/runs/{result['run_id']}/archive", headers=admin)
    assert archived.status_code == 200, archived.text
    assert b"old-password-hash-must-not-survive" not in archived.content
    assert b"old-session-token-must-not-survive" not in archived.content
    assert b"old-bearer-token-must-not-survive" not in archived.content
    assert b"old-key-must-not-survive" not in archived.content
    assert original_photo_base64.encode() not in archived.content
    assert b"Magento/do-not-import.png" not in archived.content
    lines = [json.loads(line) for line in archived.content.decode("utf-8").splitlines()]
    assert lines[0]["_record_type"] == "manifest"
    assert "cpf" in [column["name"] for column in lines[0]["summary"]["source_table_schema"]["alunos"]["columns"]]
    assert any(row.get("source_table") == "alunos" and row.get("mapped_entity_type") == "Student" for row in lines)
    assert any(row.get("source_table") == "container_media" for row in lines)

    duplicate = client.post(base + "/apply", headers=admin,
                            data={"fingerprint": manifest["fingerprint"], "confirmation": "IMPORTAR", "selection": selection}, files=files)
    assert duplicate.status_code == 409


def test_large_archive_remains_complete_and_student_navigation_works(client, admin, school):
    backup, _, _ = _sample_archives()
    with zipfile.ZipFile(io.BytesIO(backup)) as original:
        source = sqlite3.connect(":memory:")
        source.deserialize(original.read("school_desktop_suite/app.db"))
    source.executemany("INSERT INTO app_logs(id, message, details_json) VALUES(?, ?, ?)",
                       ((index, "Evento sintético", "{}") for index in range(2, 1008)))
    source.commit()
    with io.BytesIO() as archive_bytes:
        with zipfile.ZipFile(archive_bytes, "w", zipfile.ZIP_DEFLATED) as archive:
            archive.writestr("school_desktop_suite/app.db", source.serialize())
        backup = archive_bytes.getvalue()
    source.close()

    base = f"/api/v1/schools/{school['id']}"
    files = {"backup": ("backup.db.zip", backup, "application/zip")}
    selection = _full_selection(backup)
    preview = client.post(base + "/legacy-import/preview", headers=admin, files=files, data={"selection": selection})
    assert preview.status_code == 200, preview.text
    manifest = preview.json()
    applied = client.post(base + "/legacy-import/apply", headers=admin,
                          data={"fingerprint": manifest["fingerprint"], "confirmation": "IMPORTAR", "selection": selection}, files=files)
    assert applied.status_code == 200, applied.text
    result = applied.json()
    assert result["summary"]["counts"]["source_records_archived"] == manifest["source_record_count"]

    archive = client.get(base + f"/legacy-import/runs/{result['run_id']}/archive", headers=admin)
    assert archive.status_code == 200, archive.text
    assert len(archive.content.splitlines()) == manifest["source_record_count"] + 1
    assert client.get(base + "/legacy-import/runs", headers=admin).status_code == 200

    listed = client.get(base + "/students", headers=admin)
    assert listed.status_code == 200, listed.text
    student_id = listed.json()["items"][0]["id"]
    paths = [f"/students/{student_id}", f"/students/{student_id}/documents",
             f"/students/{student_id}/history", f"/protocols?student_id={student_id}"]
    with ThreadPoolExecutor(max_workers=4) as pool:
        responses = list(pool.map(lambda path: client.get(base + path, headers=admin), paths))
    assert all(response.status_code == 200 for response in responses), [response.text for response in responses]
    duplicate = client.post(base + "/legacy-import/apply", headers=admin,
                            data={"fingerprint": manifest["fingerprint"], "confirmation": "IMPORTAR", "selection": selection}, files=files)
    assert duplicate.status_code == 409
    assert client.get("/health/ready").status_code == 200


def _selective_backup():
    backup, media, _ = _sample_archives()
    with zipfile.ZipFile(io.BytesIO(backup)) as archive:
        connection = sqlite3.connect(":memory:")
        connection.deserialize(archive.read("school_desktop_suite/app.db"))
    connection.execute("UPDATE alunos SET cpf = NULL")
    connection.execute("INSERT INTO alunos(id,nome,ativo) VALUES('student-source-2','Outro aluno não selecionado',1)")
    connection.execute("INSERT INTO responsaveis(id,nome,ativo) VALUES('guardian-source-2','Outra família não selecionada',1)")
    connection.execute("INSERT INTO aluno_responsaveis(id,aluno_id,responsavel_id,ativo) VALUES('link-source-2','student-source-2','guardian-source-2',1)")
    connection.commit()
    result = connection.serialize()
    connection.close()
    return result, media


def _preview_selection(client, admin, base, files, selection):
    response = client.post(base + "/preview", headers=admin, files=files,
                           data={"selection": json.dumps(selection)})
    assert response.status_code == 200, response.text
    return response.json()


def _apply_selection(client, admin, base, files, selection, preview):
    return client.post(base + "/apply", headers=admin, files=files,
                       data={"selection": json.dumps(selection), "fingerprint": preview["fingerprint"],
                             "confirmation": "IMPORTAR"})


def test_selective_import_keeps_destination_and_excludes_unselected_families_and_media(client, admin, school):
    from app.db import SessionLocal
    from app import models as m
    from sqlalchemy import select, func
    backup, media = _selective_backup()
    files = {"backup": ("backup.sqlite", backup), "container_media": ("midias.zip", media)}
    base = f"/api/v1/schools/{school['id']}/legacy-import"
    with SessionLocal() as db:
        schools_before = db.scalar(select(func.count()).select_from(m.School))
        companies_before = db.scalar(select(func.count()).select_from(m.Company))
    selection = {"tables": ["alunos", "responsaveis", "aluno_responsaveis"],
                 "record_ids": {"alunos": ["student-source-1"]}}
    preview = _preview_selection(client, admin, base, files, selection)
    assert preview["selected_record_count"] == 3
    assert preview["destination"]["school_id"] == school["id"]
    assert preview["destination"]["creates_institution"] is False
    assert preview["can_apply"] is True
    assert preview["media"]["selected_container_files"] == 0
    response = _apply_selection(client, admin, base, files, selection, preview)
    assert response.status_code == 200, response.text
    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(m.School)) == schools_before
        assert db.scalar(select(func.count()).select_from(m.Company)) == companies_before
        assert db.scalar(select(func.count()).select_from(m.Unit).where(m.Unit.school_id == school["id"])) == 0
        assert db.scalar(select(func.count()).select_from(m.Student).where(m.Student.school_id == school["id"])) == 1
        assert db.scalar(select(func.count()).select_from(m.Person).where(m.Person.school_id == school["id"])) == 2
        assert db.scalar(select(func.count()).select_from(m.FileRecord).where(m.FileRecord.school_id == school["id"])) == 0
    archive = client.get(base + f"/runs/{response.json()['run_id']}/archive", headers=admin)
    assert archive.status_code == 200
    assert b"student-source-2" not in archive.content
    assert b"guardian-source-2" not in archive.content
    assert b"teacher-source-1" not in archive.content
    assert len(archive.content.splitlines()) == 4


def test_partial_imports_reuse_students_without_cpf_and_accept_remaining_records(client, admin, school):
    from app.db import SessionLocal
    from app import models as m
    from sqlalchemy import select, func
    backup, media = _selective_backup()
    files = {"backup": ("backup.sqlite", backup), "container_media": ("midias.zip", media)}
    base = f"/api/v1/schools/{school['id']}/legacy-import"
    first = {"tables": ["alunos"], "record_ids": {"alunos": ["student-source-1"]}}
    preview = _preview_selection(client, admin, base, files, first)
    response = _apply_selection(client, admin, base, files, first, preview)
    assert response.status_code == 200, response.text
    second = {"tables": ["alunos", "responsaveis", "aluno_responsaveis", "documentos_alunos"],
              "include_photos": True, "include_media": True}
    preview = _preview_selection(client, admin, base, files, second)
    response = _apply_selection(client, admin, base, files, second, preview)
    assert response.status_code == 200, response.text
    assert response.json()["summary"]["counts"]["previous_records_reused"] == 1
    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(m.Student).where(m.Student.school_id == school["id"])) == 2
        assert db.scalar(select(func.count()).select_from(m.GuardianLink).where(m.GuardianLink.school_id == school["id"])) == 2
        person = db.scalar(select(m.Person).where(m.Person.school_id == school["id"], m.Person.name == "Aluno legado de teste"))
        assert person.photo_file_id is not None
        assert db.scalar(select(func.count()).select_from(m.StudentDocument).where(m.StudentDocument.school_id == school["id"])) == 1
    assert _apply_selection(client, admin, base, files, second, preview).status_code == 409
    # A different valid selection containing the same document reuses it too.
    third = {"tables": ["documentos_alunos"], "include_media": True}
    preview = _preview_selection(client, admin, base, files, third)
    response = _apply_selection(client, admin, base, files, third, preview)
    assert response.status_code == 200, response.text
    assert response.json()["summary"]["counts"]["student_documents_matched"] == 1


def test_preview_binds_selection_school_and_options_and_requires_explicit_choice(client, admin, school):
    backup, _ = _selective_backup()
    files = {"backup": ("backup.sqlite", backup)}
    base = f"/api/v1/schools/{school['id']}/legacy-import"
    initial = client.post(base + "/preview", headers=admin, files=files)
    assert initial.status_code == 200
    assert initial.json()["selected_record_count"] == 0
    assert initial.json()["can_apply"] is False
    missing = client.post(base + "/apply", headers=admin, files=files,
                          data={"fingerprint": initial.json()["fingerprint"], "confirmation": "IMPORTAR"})
    assert missing.status_code == 422
    selection = {"tables": ["alunos"], "record_ids": {"alunos": ["student-source-1"]}}
    preview = _preview_selection(client, admin, base, files, selection)
    changed = {"tables": ["alunos"], "include_photos": True}
    assert _apply_selection(client, admin, base, files, changed, preview).status_code == 409
    another = client.post("/api/v1/schools", headers=admin,
                          json={"company_id": school["company_id"], "name": "Outra escola destino"}).json()
    other_base = f"/api/v1/schools/{another['id']}/legacy-import"
    assert _apply_selection(client, admin, other_base, files, selection, preview).status_code == 409
    assert client.get(f"/api/v1/schools/{school['id']}/students", headers=admin).json()["total"] == 0


def test_import_academic_data_into_selected_existing_unit(client, admin, school):
    backup, _ = _selective_backup()
    files = {"backup": ("backup.sqlite", backup)}
    school_base = f"/api/v1/schools/{school['id']}"
    unit = client.post(school_base + "/units", headers=admin, json={"name": "Unidade real da escola"}).json()
    base = school_base + "/legacy-import"
    selection = {"tables": ["periodos_letivos", "cursos", "turmas"], "unit_id": unit["id"]}
    preview = _preview_selection(client, admin, base, files, selection)
    assert preview["can_apply"] is True, preview["issues"]
    response = _apply_selection(client, admin, base, files, selection, preview)
    assert response.status_code == 200, response.text
    units = client.get(school_base + "/units", headers=admin).json()
    assert len(units) == 1
    groups = client.get(school_base + "/class-groups", headers=admin).json()
    assert groups[0]["unit_id"] == unit["id"]
    selection["tables"].append("unidades_escolares")
    invalid = client.post(base + "/preview", headers=admin, files=files, data={"selection": json.dumps(selection)})
    assert invalid.status_code == 422


def test_missing_dependencies_are_reported_before_import(client, admin, school):
    backup, _ = _selective_backup()
    files = {"backup": ("backup.sqlite", backup)}
    base = f"/api/v1/schools/{school['id']}/legacy-import"
    selection = {"tables": ["aluno_responsaveis", "matriculas"]}
    preview = _preview_selection(client, admin, base, files, selection)
    assert preview["can_apply"] is False
    assert len(preview["issues"]) == 2
    assert _apply_selection(client, admin, base, files, selection, preview).status_code == 422
    assert client.get(base + "/runs", headers=admin).json() == []


def test_record_selector_search_pagination_and_invalid_ids(client, admin, school):
    backup, _ = _selective_backup()
    files = {"backup": ("backup.sqlite", backup)}
    base = f"/api/v1/schools/{school['id']}/legacy-import"
    response = client.post(base + "/records", headers=admin, files=files,
                           data={"table": "alunos", "query": "outro", "page_size": 1})
    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["items"][0]["id"] == "student-source-2"
    invalid = client.post(base + "/preview", headers=admin, files=files,
                          data={"selection": json.dumps({"tables": ["alunos"], "record_ids": {"alunos": ["inexistente"]}})})
    assert invalid.status_code == 422


def test_import_failure_rolls_back_database_and_uploaded_files(client, admin, school, monkeypatch):
    from pathlib import Path
    from fastapi import HTTPException
    from sqlalchemy import select, func
    from app import legacy_import, models as m
    from app.db import SessionLocal
    from app.config import settings
    backup, media = _selective_backup()
    files = {"backup": ("backup.sqlite", backup), "container_media": ("midias.zip", media)}
    base = f"/api/v1/schools/{school['id']}/legacy-import"
    selection = {"tables": ["alunos"], "include_photos": True}
    preview = _preview_selection(client, admin, base, files, selection)
    def fail_after_people(*args, **kwargs):
        raise HTTPException(422, "Falha simulada após gravar fotos e pessoas")
    monkeypatch.setattr(legacy_import, "_import_academic", fail_after_people)
    response = _apply_selection(client, admin, base, files, selection, preview)
    assert response.status_code == 422
    with SessionLocal() as db:
        for model in (m.Person, m.Student, m.FileRecord, m.LegacyImportRun):
            assert db.scalar(select(func.count()).select_from(model).where(model.school_id == school["id"])) == 0
    assert not list((Path(settings().storage_path) / school["id"]).glob("*"))
