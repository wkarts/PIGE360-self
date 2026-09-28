from datetime import timedelta

from sqlalchemy import select

from app import models as m
from app.db import SessionLocal, now
from app.security import digest

CSRF = {"X-CSRF-Protection": "1"}
CPF = "52998224725"
EMAIL = "familia.diario@example.test"
PHONE = "5575999990000"


def portal_session(api):
    with SessionLocal.begin() as db:
        account = m.PortalAccount(
            school_id=api.school["id"], email=EMAIL, name="Responsável do Diário",
            password_hash="not-used-in-this-test", cpf=CPF, phone=PHONE,
            email_verified=True, phone_verified=False, active=True,
        )
        db.add(account)
        db.flush()
        secret = "diary-portal-session-secret-for-test-" + account.id
        session = m.PortalSession(
            account_id=account.id, token_hash=digest(secret),
            expires_at=now() + timedelta(hours=4), mfa_verified=True,
        )
        db.add(session)
        db.flush()
        return {"pige_portal": session.id + "." + secret}, account.id


def portal_call(client, cookies, method, path, data=None, expected=200):
    response = client.request(
        method, "/api/v1/portal" + path, cookies=cookies,
        headers=CSRF if method != "GET" else {}, json=data,
    )
    assert response.status_code == expected, (method, path, response.status_code, response.text)
    return response.json() if response.headers.get("content-type", "").startswith("application/json") else response


def active_student_and_guardian(api):
    catalog = api.catalogs(capacity=20)
    student = api.student("Estudante com acesso ao Diário")
    guardian = api.guardian(student, "Responsável com acesso ao Diário")
    enrollment = api.enroll(student, catalog["group"])
    with SessionLocal.begin() as db:
        db.get(m.Enrollment, enrollment["id"]).status = "active"
        person = db.get(m.Person, guardian["id"])
        person.cpf = CPF
        person.email = EMAIL
        person.phone = PHONE
    return catalog, student, guardian, enrollment


def test_diary_communications_require_consent_and_are_scoped_to_portal_access(api, client):
    catalog, student, guardian, enrollment = active_student_and_guardian(api)
    cookies, _account_id = portal_session(api)
    consent = portal_call(client, cookies, "GET", "/diary/access-consent")
    assert len(consent["version"]) == 40
    initial = portal_call(client, cookies, "GET", "/diary/access")
    assert initial["eligible_student_count"] == 1
    assert initial["consent_required"] is True
    assert initial["eligible_students"][0]["student_name"] == "Estudante com acesso ao Diário"
    assert initial["eligible_students"][0]["access_active"] is False
    assert initial["students"] == []

    period = api.post("/academic-periods", {
        "academic_year_id": catalog["year"]["id"], "name": "1º Bimestre",
        "starts_on": "2026-09-01", "ends_on": "2026-12-20", "order_index": 1, "active": True,
    })
    component = api.post("/curriculum-components", {"name": "Língua Portuguesa", "active": True})
    diary = api.post("/diaries", {
        "class_group_id": catalog["group"]["id"], "component_id": component["id"],
        "teacher_assignment_id": None, "notes": "Comunicados familiares",
    })
    lesson = api.post("/diaries/" + diary["id"] + "/lessons", {
        "academic_period_id": period["id"], "lesson_date": "2026-09-22",
        "lesson_count": 1, "content": "Leitura compartilhada",
    })
    attendance = api.get("/diaries/" + diary["id"] + "/lessons/" + lesson["id"] + "/attendance")
    api.call("PUT", "/diaries/" + diary["id"] + "/lessons/" + lesson["id"] + "/attendance", {
        "items": [{"enrollment_id": enrollment["id"], "status": "present", "note": ""}],
    })
    assert attendance["roster"][0]["student_id"] == student["id"]
    occurrence = api.post("/diaries/" + diary["id"] + "/occurrences", {
        "academic_period_id": period["id"], "enrollment_id": enrollment["id"],
        "occurrence_date": "2026-09-22", "kind": "pedagogical", "title": "Leitura orientada",
        "description": "Registro pedagógico revisado para comunicação.", "status": "reviewed",
    })

    granted = portal_call(client, cookies, "POST", "/diary/access", {
        "accepted": True, "consent_version": consent["version"],
        "student_ids": [student["id"]],
    })
    assert granted["consent_required"] is False
    assert granted["students"][0]["student_id"] == student["id"]
    assert portal_call(client, cookies, "GET", "/diary/communications") == []

    recipients = api.get("/diaries/" + diary["id"] + "/communication-recipients?enrollment_id=" + enrollment["id"])
    assert len(recipients) == 1
    assert recipients[0]["name"] == guardian["name"]
    body = {
        "enrollment_id": enrollment["id"], "academic_period_id": period["id"],
        "occurrence_id": occurrence["id"], "recipient_guardian_link_ids": [recipients[0]["guardian_link_id"]],
        "title": "Acompanhamento de leitura", "message": "Converse com o estudante sobre a leitura desta semana.",
        "client_key": "diary-communication-idempotency-0001",
    }
    created = api.post("/diaries/" + diary["id"] + "/communications", body)
    assert created["created"] == 1
    assert created["channel"] == "portal"
    duplicate = api.post("/diaries/" + diary["id"] + "/communications", body)
    assert duplicate["created"] == 0
    assert len(api.get("/diaries/" + diary["id"] + "/communications")) == 1

    notices = portal_call(client, cookies, "GET", "/diary/communications")
    assert len(notices) == 1
    assert notices[0]["message"] == body["message"]
    assert notices[0]["occurrence_title"] == occurrence["title"]
    portal_call(client, cookies, "POST", "/diary/communications/" + notices[0]["id"] + "/read", {})
    staff_rows = api.get("/diaries/" + diary["id"] + "/communications")
    assert staff_rows[0]["read_at"]
    assert staff_rows[0]["academic_period_id"] == period["id"]
    submitted = api.post("/diaries/" + diary["id"] + "/submit", {"version": diary["version"]})
    reviewed = api.post("/diaries/" + diary["id"] + "/review", {"version": submitted["version"]})
    closed = api.post("/diaries/" + diary["id"] + "/close", {
        "academic_period_id": period["id"], "reason": "Conferência do período", "version": reviewed["version"],
    })
    with SessionLocal() as db:
        snapshot = db.get(m.DiaryClosure, closed["closure"]["id"]).snapshot
        assert len(snapshot["communications"]) == 1
        assert snapshot["communications"][0]["read_at"]
    report = api.get("/diaries/" + diary["id"] + "/reports/communications.pdf?academic_period_id=" + period["id"])
    assert report.status_code == 200 and report.content.startswith(b"%PDF")

    portal_call(client, cookies, "POST", "/diary/access/" + student["id"] + "/revoke", {})
    revoked = portal_call(client, cookies, "GET", "/diary/access")
    assert revoked["consent_required"] is True
    assert revoked["students"] == []
    assert portal_call(client, cookies, "GET", "/diary/communications") == []
    portal_call(client, cookies, "POST", "/diary/communications/" + notices[0]["id"] + "/read", {}, expected=404)


def test_diary_access_rejects_unlinked_unverified_or_mismatched_guardian(api, client):
    _catalog, student, guardian, _enrollment = active_student_and_guardian(api)
    cookies, account_id = portal_session(api)
    with SessionLocal.begin() as db:
        person = db.get(m.Person, guardian["id"])
        link = db.scalar(
            select(m.GuardianLink).where(
                m.GuardianLink.student_id == student["id"], m.GuardianLink.person_id == person.id,
            )
        )
        link.legal = False
    consent = portal_call(client, cookies, "GET", "/diary/access-consent")
    no_legal_link = portal_call(client, cookies, "GET", "/diary/access")
    assert no_legal_link["eligible_student_count"] == 0
    assert no_legal_link["eligible_students"] == []
    portal_call(client, cookies, "POST", "/diary/access", {
        "accepted": True, "consent_version": consent["version"],
        "student_ids": [student["id"]],
    }, expected=409)

    with SessionLocal.begin() as db:
        db.get(m.GuardianLink, link.id).legal = True
        account = db.get(m.PortalAccount, account_id)
        account.email_verified = False
        account.phone_verified = False
    unverified = portal_call(client, cookies, "GET", "/diary/access")
    assert unverified["eligible_student_count"] == 0
    assert unverified["eligible_students"] == []

    with SessionLocal.begin() as db:
        account = db.get(m.PortalAccount, account_id)
        account.email_verified = True
        account.cpf = "11111111111"
    mismatched_identity = portal_call(client, cookies, "GET", "/diary/access")
    assert mismatched_identity["eligible_student_count"] == 0
    assert mismatched_identity["eligible_students"] == []
    assert portal_call(client, cookies, "GET", "/diary/communications") == []


def test_diary_consent_cannot_expand_to_students_added_after_review(api, client):
    catalog, _student, guardian, _enrollment = active_student_and_guardian(api)
    second_student = api.student("Segundo estudante elegível para o Diário")
    api.post("/students/" + second_student["id"] + "/guardians", {
        "person_id": guardian["id"], "legal": True, "financial": True,
    })
    second_enrollment = api.enroll(second_student, catalog["group"])
    with SessionLocal.begin() as db:
        db.get(m.Enrollment, second_enrollment["id"]).status = "active"

    cookies, _account_id = portal_session(api)
    consent = portal_call(client, cookies, "GET", "/diary/access-consent")
    before = portal_call(client, cookies, "GET", "/diary/access")
    assert before["eligible_student_count"] == 2
    stale_acceptance = {
        "accepted": True,
        "consent_version": consent["version"],
        "student_ids": [item["student_id"] for item in before["eligible_students"]],
    }

    third_student = api.student("Terceiro estudante vinculado depois da confirmação")
    api.post("/students/" + third_student["id"] + "/guardians", {
        "person_id": guardian["id"], "legal": True, "financial": True,
    })
    third_enrollment = api.enroll(third_student, catalog["group"])
    with SessionLocal.begin() as db:
        db.get(m.Enrollment, third_enrollment["id"]).status = "active"

    portal_call(client, cookies, "POST", "/diary/access", stale_acceptance, expected=409)
    current = portal_call(client, cookies, "GET", "/diary/access")
    assert current["eligible_student_count"] == 3
    updated_acceptance = {
        "accepted": True,
        "consent_version": consent["version"],
        "student_ids": [item["student_id"] for item in current["eligible_students"]],
    }
    granted = portal_call(client, cookies, "POST", "/diary/access", updated_acceptance)
    assert len(granted["students"]) == 3


def test_existing_families_can_create_portal_account_without_open_admission(client, api):
    terms = portal_call(client, {}, "GET", "/registration-terms?school_id=" + api.school["id"])
    payload = {
        "school_id": api.school["id"], "name": "Responsável sem inscrição nova",
        "email": "conta.familiar.nova@example.com", "password": "Strong-Test-Password-2026!",
        "cpf": CPF, "phone": PHONE, "address": "", "whatsapp_opt_in": False,
        "accept_privacy": True, "terms_version": terms["version"],
    }
    registered = portal_call(client, {}, "POST", "/account/register", payload)
    assert isinstance(registered, dict)
    with SessionLocal.begin() as db:
        account = db.scalar(select(m.PortalAccount).where(
            m.PortalAccount.school_id == api.school["id"],
            m.PortalAccount.email == payload["email"],
        ))
        assert account is not None
        assert account.registration_consent["source"] == "standalone_portal"
        assert account.registration_consent["terms_version"] == terms["version"]
        assert account.registration_consent["source_terms_version"] == terms["source_version"]
    payload["terms_version"] = "stale-policy"
    portal_call(client, {}, "POST", "/account/register", payload, expected=409)
