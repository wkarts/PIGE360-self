"""Regressões da rotina docente: chamada, notas, publicação e isolamento."""
from decimal import Decimal

from app import models as m
from app.db import SessionLocal
from app.diary import _report_attendance, _snapshot


def diary_fixture(api):
    catalog = api.catalogs(capacity=10)
    student = api.student("Aluno da rotina docente")
    enrollment = api.enroll(student, catalog["group"])
    with SessionLocal() as db:
        db.get(m.Enrollment, enrollment["id"]).status = "active"
        db.commit()
    period = api.post("/academic-periods", {
        "academic_year_id": catalog["year"]["id"], "name": "3º período",
        "starts_on": "2026-09-01", "ends_on": "2026-12-20", "order_index": 1,
    })
    component = api.post("/curriculum-components", {"name": "Matemática"})
    diary = api.post("/diaries", {"class_group_id": catalog["group"]["id"], "component_id": component["id"]})
    return catalog, enrollment, period, diary


def test_frequency_uses_class_units_and_explicit_justification_policy(api):
    _, enrollment, period, diary = diary_fixture(api)
    path = f"/diaries/{diary['id']}"
    rule = api.call("PUT", path + f"/assessment-rules/{period['id']}", {
        "method": "arithmetic", "scale_max": "10", "decimal_places": 2,
        "minimum_attendance_percent": "70", "justified_absence_counts_as_present": False,
    })
    for day, units, status in ((22, 3, "present"), (23, 1, "absent"), (24, 1, "justified_absence")):
        lesson = api.post(path + "/lessons", {
            "academic_period_id": period["id"], "lesson_date": f"2026-09-{day}",
            "lesson_count": units, "content": "Operações fundamentais",
        })
        api.call("PUT", path + f"/lessons/{lesson['id']}/attendance", {
            "items": [{"enrollment_id": enrollment["id"], "status": status}],
        })
    assessment = api.post(path + "/assessments", {
        "academic_period_id": period["id"], "title": "Avaliação mensal",
        "assessment_date": "2026-09-24", "max_score": "10", "status": "published",
    })
    api.call("PUT", path + f"/assessments/{assessment['id']}/results", {
        "items": [{"enrollment_id": enrollment["id"], "numeric_score": "8"}],
    })
    result = api.post(path + f"/periods/{period['id']}/consolidate", {"version": diary["version"]}, 200)["results"][0]
    assert Decimal(result["calculation"]["attendance_percent"]) == Decimal("60")
    assert result["status"] == "attendance_below_minimum"
    assert result["calculation"]["attendance_basis"] == "lesson_count"
    with SessionLocal() as db:
        snapshot = _snapshot(db, db.get(m.SchoolDiary, diary["id"]), period["id"])
        assert "60,0%" in _report_attendance(db, snapshot)[0][1]
        assert "Presenças: 3 aula(s)" in _report_attendance(db, snapshot)[0][1]
    api.call("PUT", path + f"/assessment-rules/{period['id']}", {
        "method": "arithmetic", "scale_max": "10", "decimal_places": 2,
        "minimum_attendance_percent": "70", "justified_absence_counts_as_present": True,
        "version": rule["version"],
    })
    recalculated = api.post(path + f"/periods/{period['id']}/consolidate", {"version": diary["version"]}, 200)["results"][0]
    assert Decimal(recalculated["calculation"]["attendance_percent"]) == Decimal("80")
    assert recalculated["status"] == "calculated"
    # A atualização da regra atual não altera o snapshot já produzido.
    with SessionLocal() as db:
        assert "60,0%" in _report_attendance(db, snapshot)[0][1]


def test_assessment_can_be_published_and_grades_validate_versions(api):
    _, enrollment, period, diary = diary_fixture(api)
    path = f"/diaries/{diary['id']}"
    payload = {"academic_period_id": period["id"], "title": "Prova de matemática",
               "assessment_date": "2026-09-23", "max_score": "10", "status": "draft"}
    assessment = api.post(path + "/assessments", payload)
    result_path = path + f"/assessments/{assessment['id']}/results"
    api.call("PUT", result_path, {"items": [{"enrollment_id": enrollment["id"], "numeric_score": "-1"}]}, 422)
    api.call("PUT", result_path, {"items": [{"enrollment_id": enrollment["id"], "numeric_score": "0"}]})
    published = api.patch(path + f"/assessments/{assessment['id']}", {**payload, "status": "published", "version": assessment["version"]})
    assert published["status"] == "published"
    result = api.get(result_path)["roster"][0]["result"]
    api.call("PUT", result_path, {"items": [{"enrollment_id": enrollment["id"], "numeric_score": "8", "version": result["version"]}]})
    api.call("PUT", result_path, {"items": [{"enrollment_id": enrollment["id"], "numeric_score": "5", "version": result["version"]}]}, 409)
    assert Decimal(str(api.get(result_path)["roster"][0]["result"]["numeric_score"])) == Decimal("8")
    api.patch(path + f"/assessments/{assessment['id']}", {**payload, "max_score": "5", "version": published["version"]}, 422)
    api.patch(path + f"/assessments/{assessment['id']}", {**payload, "value_type": "concept", "max_score": None, "version": published["version"]}, 409)


def test_teacher_only_reads_and_moves_plans_within_own_assignments(api, client, admin, school):
    from test_profiles import create_user, login

    catalog = api.catalogs(capacity=10)
    other_group = api.post("/class-groups", {
        "name": "Turma de outro docente", "unit_id": catalog["unit"]["id"],
        "academic_year_id": catalog["year"]["id"], "grade_id": catalog["grade"]["id"],
        "shift_id": catalog["shift"]["id"], "capacity": 10,
    })
    person = api.post("/persons", {"name": "Docente com atribuição"})
    user = create_user(client, admin, name="Docente", email=f"docente-{school['id']}@example.com",
                       role="teacher", school_id=school["id"], person_id=person["id"])
    assignment = api.post("/teacher-assignments", {"teacher_user_id": user["id"], "class_group_id": catalog["group"]["id"], "subject_name": "Artes"})
    component = api.post("/curriculum-components", {"name": "Artes"})
    own = api.post("/curriculum-plans", {"class_group_id": catalog["group"]["id"], "component_id": component["id"], "teacher_assignment_id": assignment["id"], "objectives": "Plano próprio"})
    other = api.post("/curriculum-plans", {"class_group_id": other_group["id"], "component_id": component["id"], "objectives": "Plano restrito"})
    headers = login(client, user["email"], "Profile-Test-Password-2026!")
    response = client.get(api.base + "/curriculum-plans", headers=headers)
    assert response.status_code == 200
    assert [row["id"] for row in response.json()] == [own["id"]]
    assert other["id"] not in response.text
    response = client.patch(api.base + f"/curriculum-plans/{own['id']}", headers=headers, json={
        "class_group_id": other_group["id"], "component_id": component["id"],
        "teacher_assignment_id": assignment["id"], "objectives": "Tentativa fora da turma", "version": own["version"],
    })
    assert response.status_code == 422
