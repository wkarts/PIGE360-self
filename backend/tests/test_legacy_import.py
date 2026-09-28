import base64
import io
import json
import sqlite3
import zipfile

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


def test_legacy_import_preview_apply_archive_photos_and_idempotency(client, admin, school):
    backup, media, original_photo_base64 = _sample_archives()
    base = f"/api/v1/schools/{school['id']}/legacy-import"
    files = {
        "backup": ("school-backup.zip", backup, "application/zip"),
        "container_media": ("container-media.zip", media, "application/zip"),
    }

    preview = client.post(base + "/preview", headers=admin, files=files)
    assert preview.status_code == 200, preview.text
    manifest = preview.json()
    assert manifest["source_record_count"] == 14
    assert manifest["media"]["inline_photos_convertible"] == 3
    assert manifest["media"]["container_files_candidate_count"] == 4
    assert manifest["media"]["container_magento_paths_ignored"] == 1
    assert manifest["tables"]
    assert any(row["name"] == "aluno_responsaveis" and row["rows"] == 1 for row in manifest["tables"])

    applied = client.post(base + "/apply", headers=admin,
                          data={"fingerprint": manifest["fingerprint"], "confirmation": "IMPORTAR"}, files=files)
    assert applied.status_code == 200, applied.text
    result = applied.json()
    assert result["summary"]["counts"]["students_created"] == 1
    assert result["summary"]["counts"]["guardian_links_created"] == 1
    assert result["summary"]["counts"]["class_groups_created"] == 1
    assert result["summary"]["counts"]["enrollments_created"] == 1
    assert result["summary"]["counts"]["student_documents_created"] == 1
    assert result["summary"]["counts"]["photos_base64_converted"] == 3
    assert result["summary"]["counts"]["users_created_inactive"] == 1
    assert result["summary"]["counts"]["media_imported"] == 4

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
    assert any(row["source_table"] == "alunos" and row["mapped_entity_type"] == "Student" for row in lines)
    assert any(row["source_table"] == "container_media" for row in lines)

    duplicate = client.post(base + "/apply", headers=admin,
                            data={"fingerprint": manifest["fingerprint"], "confirmation": "IMPORTAR"}, files=files)
    assert duplicate.status_code == 409
