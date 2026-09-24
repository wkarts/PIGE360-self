"""Administração da instância global da ARGWS Connect API."""
import re
from fastapi import APIRouter, Query, Request
from sqlalchemy import func, select

from . import models as m, online_schemas as s
from .common import audit, output
from .config import settings
from .connect_core import (
    ConnectApiClient,
    IntegrationFailure,
    _remote_status,
    build_instance_name,
    connect_instance_for_school,
    connect_response,
    enqueue_connect_message,
)
from .security import Actor, DB, Scope, check_version, fail, lock_school, require, scoped


router = APIRouter(prefix="/api/v1/schools/{school_id}", tags=["Connect API"])


def _company(db, school):
    company = db.get(m.Company, school.company_id)
    if not company:
        fail(404, "Empresa da escola não encontrada.")
    return company


def _remote_call(call):
    try:
        return call()
    except IntegrationFailure as error:
        status = 503 if error.code in {
            "CONNECT_API_NOT_CONFIGURED",
            "CONNECT_API_BASE_URL_MUST_BE_HTTPS",
            "CONNECT_API_HOST_NOT_ALLOWED",
            "CONNECT_API_DNS_UNAVAILABLE",
            "CONNECT_API_PRIVATE_ADDRESS_BLOCKED",
            "CONNECT_API_NETWORK_ERROR",
        } else 502
        fail(status, f"Connect API: {error.code}.")


def _instance(db, school, instance_id):
    company = _company(db, school)
    obj = db.scalar(select(m.ConnectInstance).where(
        m.ConnectInstance.id == instance_id,
        m.ConnectInstance.company_id == company.id,
    ))
    if not obj:
        fail(404, "Instância Connect API não encontrada nesta empresa.")
    return obj


def _instance_output(obj):
    data = output(obj)
    data["remote_configured"] = bool(settings().connect_api_base_url and settings().connect_api_key)
    return data


def _state_from_response(obj, response):
    status, state = _remote_status(response)
    obj.status = status
    obj.connection_state = state
    obj.last_synced_at = __import__("datetime").datetime.now(__import__("datetime").UTC)
    obj.last_error = ""
    obj.version += 1


@router.get("/connect")
def connect_overview(db: DB, user: Actor, school: Scope):
    require(user, "connect.manage")
    company = _company(db, school)
    instances = db.scalars(select(m.ConnectInstance).where(
        m.ConnectInstance.company_id == company.id,
        m.ConnectInstance.status != "deleted",
    ).order_by(m.ConnectInstance.primary.desc(), m.ConnectInstance.created_at)).all()
    return {
        "config": {
            "configured": bool(settings().connect_api_base_url and settings().connect_api_key),
            "base_url": settings().connect_api_base_url.rstrip("/"),
            "api_key_configured": bool(settings().connect_api_key),
            "instance_prefix": "PG360",
        },
        "items": [_instance_output(item) for item in instances],
    }


@router.get("/connect/jobs")
def connect_jobs(
    db: DB,
    user: Actor,
    school: Scope,
    status: str = "",
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
):
    require(user, "connect.manage")
    stmt = select(m.ConnectMessageJob).where(m.ConnectMessageJob.school_id == school.id)
    if status:
        stmt = stmt.where(m.ConnectMessageJob.status == status)
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    items = [
        output(item, ("encrypted_payload",))
        for item in db.scalars(
            stmt.order_by(m.ConnectMessageJob.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ]
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.post("/connect/instances", status_code=201)
def create_connect_instance(
    data: s.ConnectInstanceInput,
    db: DB,
    user: Actor,
    school: Scope,
    request: Request,
):
    require(user, "connect.manage")
    lock_school(db, school.id)
    company = _company(db, school)
    existing = db.scalars(select(m.ConnectInstance).where(
        m.ConnectInstance.company_id == company.id,
        m.ConnectInstance.status != "deleted",
    ).order_by(m.ConnectInstance.created_at)).all()
    primary = data.primary or not existing
    sequence = len(existing) + 1 if existing else 0
    name = build_instance_name(company, data.label, sequence if existing and not data.label.strip() else 0)
    if db.scalar(select(m.ConnectInstance.id).where(m.ConnectInstance.company_id == company.id, m.ConnectInstance.name == name)):
        fail(409, "Já existe uma instância local com este nome.")
    response = _remote_call(lambda: ConnectApiClient().create_instance(name))
    if isinstance(response, dict) and response.get("error") is True:
        fail(502, "A Connect API não criou a instância.")
    status, state = _remote_status(response)
    obj = m.ConnectInstance(
        company_id=company.id,
        name=name,
        display_name=(company.name + (f" — {data.label.strip()}" if data.label.strip() else ""))[:160],
        document=re.sub(r"\D", "", company.document or ""),
        primary=primary,
        enabled=True,
        status=status,
        connection_state=state,
        external_id=str((response.get("instance") or {}).get("instanceId", ""))[:160] if isinstance(response, dict) else "",
        last_synced_at=__import__("datetime").datetime.now(__import__("datetime").UTC),
    )
    if primary:
        for other in existing:
            other.primary = False
    db.add(obj)
    db.flush()
    audit(db, request, user, "connect.instance.created", obj, school.id, {
        "company_id": company.id,
        "name": name,
        "primary": primary,
    })
    return {"instance": _instance_output(obj), **connect_response(response)}


@router.post("/connect/instances/{instance_id}/sync")
def sync_connect_instance(instance_id: str, db: DB, user: Actor, school: Scope, request: Request):
    require(user, "connect.manage")
    obj = _instance(db, school, instance_id)
    response = _remote_call(lambda: ConnectApiClient().connection_state(obj.name))
    _state_from_response(obj, response)
    audit(db, request, user, "connect.instance.synced", obj, school.id, {"state": obj.connection_state})
    return {"instance": _instance_output(obj), **connect_response(response)}


@router.post("/connect/instances/{instance_id}/connect")
def connect_instance(
    instance_id: str,
    data: s.ConnectPairInput | None = None,
    db: DB,
    user: Actor,
    school: Scope,
    request: Request,
):
    require(user, "connect.manage")
    obj = _instance(db, school, instance_id)
    number = data.number if data else ""
    if number and not re.fullmatch(r"\+?\d{8,15}", number):
        fail(422, "Informe o telefone internacional com DDD para gerar o pairing code.")
    response = _remote_call(lambda: ConnectApiClient().connect(obj.name, number))
    status, state = _remote_status(response)
    obj.status, obj.connection_state, obj.last_error = status, state, ""
    obj.last_synced_at = __import__("datetime").datetime.now(__import__("datetime").UTC)
    obj.version += 1
    audit(db, request, user, "connect.instance.connected", obj, school.id, {"state": state, "pairing": bool(number)})
    return {"instance": _instance_output(obj), **connect_response(response)}


@router.post("/connect/instances/{instance_id}/logout")
def logout_connect_instance(instance_id: str, db: DB, user: Actor, school: Scope, request: Request):
    require(user, "connect.manage")
    obj = _instance(db, school, instance_id)
    response = _remote_call(lambda: ConnectApiClient().logout(obj.name))
    obj.status, obj.connection_state, obj.last_error = "close", "close", ""
    obj.last_synced_at = __import__("datetime").datetime.now(__import__("datetime").UTC)
    obj.version += 1
    audit(db, request, user, "connect.instance.logout", obj, school.id)
    return {"instance": _instance_output(obj), **connect_response(response)}


@router.delete("/connect/instances/{instance_id}")
def delete_connect_instance(instance_id: str, db: DB, user: Actor, school: Scope, request: Request):
    require(user, "connect.manage")
    lock_school(db, school.id)
    obj = _instance(db, school, instance_id)
    response = _remote_call(lambda: ConnectApiClient().delete(obj.name))
    obj.enabled = False
    obj.primary = False
    obj.status, obj.connection_state = "deleted", "close"
    obj.last_error = ""
    obj.version += 1
    audit(db, request, user, "connect.instance.deleted", obj, school.id, {"name": obj.name})
    return {"deleted": True, "instance": _instance_output(obj), **connect_response(response)}


@router.post("/connect/test")
def test_connect(db: DB, user: Actor, school: Scope, request: Request):
    require(user, "connect.manage")
    response = _remote_call(lambda: ConnectApiClient().health())
    return {
        "ok": True,
        "code": "CONNECT_API_REACHED",
        "message": "Connect API respondeu.",
        "response": connect_response(response),
    }


@router.post("/connect/messages", status_code=202)
def send_connect_message(data: s.SendMessage, db: DB, user: Actor, school: Scope, request: Request):
    require(user, "communications.send")
    lock_school(db, school.id)
    admission = scoped(db, m.Admission, data.admission_id, school.id)
    account = db.get(m.PortalAccount, admission.account_id)
    if not account.phone_verified or not account.whatsapp_opt_in:
        fail(409, "O responsável precisa verificar o telefone e autorizar os avisos por WhatsApp.")
    instance = connect_instance_for_school(db, school.id)
    task = enqueue_connect_message(
        db,
        school.id,
        instance.id,
        {"number": account.phone, "text": data.text},
        f"manual-message:{school.id}:{data.client_key}",
    )
    audit(db, request, user, "connect.message.queued", admission, school.id, {"job_id": task.id, "instance_id": instance.id})
    return {"job_id": task.id, "status": task.status, "instance_id": instance.id}


@router.post("/connect/jobs/{job_id}/retry")
def retry_connect_job(job_id: str, data: s.Reason, db: DB, user: Actor, school: Scope, request: Request):
    require(user, "connect.manage")
    lock_school(db, school.id)
    job = scoped(db, m.ConnectMessageJob, job_id, school.id)
    if job.status not in ("failed", "retry"):
        fail(409, "Resultado incerto não é reenviado automaticamente. Confira a Connect API antes de tentar novamente.")
    job.status, job.attempts, job.error_code, job.lease_until = "pending", 0, "", None
    job.available_at = __import__("datetime").datetime.now(__import__("datetime").UTC)
    audit(db, request, user, "connect.job.retry", job, school.id, {"reason": data.reason})
    return output(job, ("encrypted_payload",))
