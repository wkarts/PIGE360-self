from app import models as m
from app.db import SessionLocal


def test_diary_lesson_attendance_close_and_reopen(api):
    catalog = api.catalogs(capacity=30)
    student = api.student("Aluno Diário")
    enrollment = api.enroll(student, catalog["group"])
    with SessionLocal() as db:
        row = db.get(m.Enrollment, enrollment["id"])
        row.status = "active"
        db.commit()

    period = api.post("/academic-periods", {
        "academic_year_id": catalog["year"]["id"],
        "name": "1º Bimestre",
        "starts_on": "2026-09-01",
        "ends_on": "2026-12-20",
        "order_index": 1,
        "active": True,
    })
    component = api.post("/curriculum-components", {
        "name": "Língua Portuguesa",
        "code": "LP",
        "workload_hours": 160,
        "active": True,
    })
    diary = api.post("/diaries", {
        "class_group_id": catalog["group"]["id"],
        "component_id": component["id"],
        "teacher_assignment_id": None,
        "notes": "Diário de teste",
    })
    lesson = api.post("/diaries/"+diary["id"]+"/lessons", {
        "academic_period_id": period["id"],
        "lesson_date": "2026-09-22",
        "lesson_count": 2,
        "content": "Leitura e interpretação de texto",
        "skills": "EF00TESTE",
        "methodology": "Leitura orientada",
        "activities": "Atividade em sala",
        "homework": "",
        "notes": "",
    })
    attendance = api.get("/diaries/"+diary["id"]+"/lessons/"+lesson["id"]+"/attendance")
    assert len(attendance["roster"]) == 1
    saved = api.call("PUT", "/diaries/"+diary["id"]+"/lessons/"+lesson["id"]+"/attendance", {
        "items": [{
            "enrollment_id": attendance["roster"][0]["enrollment_id"],
            "status": "present",
            "note": "",
        }]
    })
    assert saved["saved"] == 1

    assessment = api.post("/diaries/"+diary["id"]+"/assessments", {
        "academic_period_id": period["id"],
        "title": "Atividade de leitura",
        "kind": "activity",
        "assessment_date": "2026-09-22",
        "value_type": "numeric",
        "max_score": "10.00",
        "weight": "1.0",
        "description": "Compreensão do texto",
        "skills": "EF00TESTE",
        "status": "published",
    })
    result_roster = api.get("/diaries/"+diary["id"]+"/assessments/"+assessment["id"]+"/results")
    assert len(result_roster["roster"]) == 1
    api.call("PUT", "/diaries/"+diary["id"]+"/assessments/"+assessment["id"]+"/results", {
        "items": [{
            "enrollment_id": result_roster["roster"][0]["enrollment_id"],
            "numeric_score": "9.50",
            "concept": "",
            "note": "Bom desempenho",
        }]
    })
    opinion = api.post("/diaries/"+diary["id"]+"/opinions", {
        "academic_period_id": period["id"],
        "enrollment_id": enrollment["id"],
        "text": "Apresentou evolução consistente no período.",
        "status": "final",
    })
    assert opinion["status"] == "final"
    record = api.post("/diaries/"+diary["id"]+"/pedagogical-records", {
        "enrollment_id": enrollment["id"],
        "record_date": "2026-09-22",
        "kind": "follow_up",
        "text": "Acompanhamento individual registrado.",
    })
    assert record["kind"] == "follow_up"

    period_close = api.post("/diaries/"+diary["id"]+"/close", {
        "academic_period_id": period["id"],
        "reason": "Período conferido",
    }, 200)
    assert period_close["scope"] == "period"
    assert period_close["diary"]["status"] == "open"
    assert len(period_close["closure"]["snapshot_hash"]) == 64

    full_close = api.post("/diaries/"+diary["id"]+"/close", {
        "academic_period_id": None,
        "reason": "Diário anual conferido",
    }, 200)
    assert full_close["scope"] == "diary"
    assert full_close["diary"]["status"] == "closed"
    assert len(full_close["closure"]["snapshot_hash"]) == 64
    with SessionLocal() as db:
        closure = db.get(m.DiaryClosure, full_close["closure"]["id"])
        assert len(closure.snapshot["assessments"]) == 1
        assert len(closure.snapshot["assessment_results"]) == 1
        assert len(closure.snapshot["opinions"]) == 1
        assert len(closure.snapshot["pedagogical_records"]) == 1

    api.post("/diaries/"+diary["id"]+"/lessons", {
        "academic_period_id": period["id"],
        "lesson_date": "2026-09-23",
        "lesson_count": 1,
        "content": "Não deve gravar",
    }, 409)

    report = api.call("GET", "/diaries/"+diary["id"]+"/report.pdf", expect=200)
    assert report.headers["content-type"].startswith("application/pdf")

    reopened = api.post("/diaries/"+diary["id"]+"/reopen", {
        "reason": "Correção formal após conferência pedagógica",
    }, 200)
    assert reopened["diary"]["status"] == "open"
    history = api.get("/diaries/"+diary["id"]+"/history")
    assert len(history["closures"]) == 2
    assert len(history["revisions"]) == 1


def test_period_must_be_inside_academic_year(api):
    catalog = api.catalogs(capacity=10, year="2027")
    api.post("/academic-periods", {
        "academic_year_id": catalog["year"]["id"],
        "name": "Inválido",
        "starts_on": "2026-12-01",
        "ends_on": "2027-02-01",
        "order_index": 1,
        "active": True,
    }, 422)
