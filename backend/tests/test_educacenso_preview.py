from datetime import UTC, datetime

from app import models as m
from app.db import SessionLocal
from test_active_school_isolation import school_api
from test_profiles import create_user, login


def test_census_uses_school_year_and_historical_enrollment_without_exposing_people(api, admin, client):
    cat = api.catalogs()
    student = api.student("Pessoa sintética do Censo", adult=True)
    enrollment = api.enroll(student, cat["group"])
    future = api.enroll(api.student("Estudante posterior", adult=True), cat["group"])
    with SessionLocal() as db:
        db.get(m.Enrollment, future["id"]).enrolled_on = datetime(2026, 12, 20).date()
        obj = db.get(m.Enrollment, enrollment["id"])
        obj.status = "cancelled"
        db.add(m.EnrollmentEvent(school_id=api.school["id"], enrollment_id=obj.id,
                                 action="cancel", actor_id=db.query(m.User).filter_by(role="admin").first().id,
                                 reason="Cancelamento de teste", before={"status":"active"},
                                 after={"status":"cancelled"}, created_at=datetime(2026, 11, 5, tzinfo=UTC)))
        db.commit()
    path = "/educacenso/preview?academic_year_id=" + cat["year"]["id"] + "&reference_date="
    api.call("GET", path + "2026-10-31", expect=409)
    config = api.get("/educacenso/configuration")
    assert not config["enabled"]
    api.call("PUT", "/educacenso/configuration", {"enabled": True, "version": config["version"]})
    assert api.get("/educacenso/years")
    report = api.get(path + "2026-10-31")
    assert report["groups"] == [{"name":cat["group"]["name"], "enrollments":1}]
    assert report["students_without_local_inep_id"] == 1
    assert not report["official_export_available"]
    assert student["id"] not in str(report) and student["person"]["name"] not in str(report)
    assert api.get(path + "2026-12-01")["students"] == 0
    api.call("GET", path + "2027-01-01", expect=422)
    other = school_api(client, admin, api.school["company_id"], "Unidade externa")
    assert not other.get("/educacenso/configuration")["enabled"]
    other.call("PUT", "/educacenso/configuration", {"enabled": True, "version": other.get("/educacenso/configuration")["version"]})
    other.call("GET", path + "2026-10-31", expect=404)
    user = create_user(client, admin, name="Docente do censo", email="docente.censo@example.com",
                       role="teacher", school_id=api.school["id"], person_id=api.post("/persons", {"name":"Docente do censo"})["id"])
    headers = login(client, user["email"], "Profile-Test-Password-2026!")
    assert client.get(api.base + path + "2026-10-31", headers=headers).status_code == 403
