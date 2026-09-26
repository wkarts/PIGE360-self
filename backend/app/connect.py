"""Administração da instância global da ARGWS Connect API."""
import re
from datetime import UTC, datetime
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


def _instance_output(obj, preferred_id: str = ""):
    data = output(obj)
    data["remote_configured"] = bool(settings().connect_api_base_url and settings().connect_api_key)
    data["preferred_for_school"] = bool(preferred_id and obj.id == preferred_id)
    data["managed_by_pige360"] = obj.source == "pige360"
    return data


def _remote_rows(response):
    if isinstance(response, list):
        rows = response
    elif isinstance(response, dict):
        value = response.get("instances")
        if not isinstance(value, list):
            value = response.get("instance")
        if isinstance(value, list):
            rows = value
        elif isinstance(value, dict):
            rows = [value]
        elif any(key in response for key in ("instanceName", "name")):
            rows = [response]
        else:
            rows = []
    else:
        rows = []
    result = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        nested = row.get("instance") if isinstance(row.get("instance"), dict) else {}
        name = str(row.get("instanceName") or row.get("name") or nested.get("instanceName") or nested.get("name") or "").strip()
        if not name:
            continue
        state = str(row.get("connectionStatus") or row.get("state") or row.get("status") or nested.get("state") or nested.get("status") or "")
        integration = str(row.get("integration") or nested.get("integration") or "")
        number = str(row.get("number") or row.get("ownerJid") or nested.get("number") or nested.get("ownerJid") or "")
        external_id = str(row.get("instanceId") or nested.get("instanceId") or "")
        result.append({
            "name": name[:100],
            "state": state[:40],
            "integration": integration[:60],
            "number": re.sub(r"\D", "", number)[:24],
            "external_id": external_id[:160],
        })
    return result


def _set_preferred(db, school, obj):
    if obj.company_id != school.company_id or not obj.enabled or obj.status == "deleted":
        fail(409, "A instância não está disponível para esta escola.")
    binding = db.get(m.ConnectSchoolBinding, school.id)
    if binding:
        binding.instance_id = obj.id
        binding.version += 1
        binding.updated_at = datetime.now(UTC)
    else:
        db.add(m.ConnectSchoolBinding(
            school_id=school.id,
            instance_id=obj.id,
            version=1,
            updated_at=datetime.now(UTC),
        ))


def _set_unit_preferred(db, school, unit, obj):
    if unit.school_id != school.id or not unit.active:
        fail(422, "Unidade inválida ou inativa.")
    if obj.company_id != school.company_id or not obj.enabled or obj.status == "deleted":
        fail(409, "A instância não está disponível para esta unidade.")
    binding = db.get(m.ConnectUnitBinding, unit.id)
    if binding:
        binding.instance_id = obj.id
        binding.version += 1
        binding.updated_at = datetime.now(UTC)
    else:
        db.add(m.ConnectUnitBinding(
            unit_id=unit.id,
            instance_id=obj.id,
            version=1,
            updated_at=datetime.now(UTC),
        ))


def _state_from_response(obj, response):
    status, state = _remote_status(response)
    obj.status = status
    obj.connection_state = state
    obj.last_synced_at = datetime.now(UTC)
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
    binding = db.get(m.ConnectSchoolBinding, school.id)
    preferred_id = binding.instance_id if binding else ""
    cfg = settings()
    base_host = ""
    if cfg.connect_api_base_url:
        from urllib.parse import urlsplit
        base_host = (urlsplit(cfg.connect_api_base_url).hostname or "").lower()
    explicit_hosts = [x.strip().lower() for x in cfg.connect_allowed_hosts.split(",") if x.strip()]
    return {
        "config": {
            "configured": bool(cfg.connect_api_base_url and cfg.connect_api_key),
            "base_url": cfg.connect_api_base_url.rstrip("/"),
            "api_key_configured": bool(cfg.connect_api_key),
            "instance_prefix": "PG360",
            "host_policy": "explicit" if explicit_hosts else "base_url",
            "effective_host": base_host,
        },
        "preferred_instance_id": preferred_id,
        "items": [_instance_output(item, preferred_id) for item in instances],
        "units": [
            {
                "id": unit.id,
                "name": unit.name,
                "preferred_instance_id": (db.get(m.ConnectUnitBinding, unit.id).instance_id if db.get(m.ConnectUnitBinding, unit.id) else ""),
            }
            for unit in db.scalars(select(m.Unit).where(m.Unit.school_id == school.id, m.Unit.active.is_(True)).order_by(m.Unit.name))
        ],
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


@router.get("/connect/remote-instances")
def remote_connect_instances(db: DB, user: Actor, school: Scope):
    require(user, "connect.manage")
    company = _company(db, school)
    response = _remote_call(lambda: ConnectApiClient().fetch_instances())
    local = {
        item.name: item
        for item in db.scalars(select(m.ConnectInstance).where(
            m.ConnectInstance.company_id == company.id,
            m.ConnectInstance.status != "deleted",
        ))
    }
    items = []
    for row in _remote_rows(response):
        current = local.get(row["name"])
        items.append({
            **row,
            "registered": bool(current),
            "local_id": current.id if current else "",
            "source": current.source if current else "",
        })
    return {"items": items}


@router.post("/connect/instances/adopt", status_code=201)
def adopt_connect_instance(
    data: s.ConnectAdoptInput,
    db: DB,
    user: Actor,
    school: Scope,
    request: Request,
):
    require(user, "connect.manage")
    lock_school(db, school.id)
    company = _company(db, school)
    response = _remote_call(lambda: ConnectApiClient().fetch_instance(data.instance_name))
    rows = [row for row in _remote_rows(response) if row["name"] == data.instance_name]
    if not rows:
        fail(404, "Instância não encontrada na Connect API configurada.")
    row = rows[0]
    obj = db.scalar(select(m.ConnectInstance).where(
        m.ConnectInstance.company_id == company.id,
        m.ConnectInstance.name == row["name"],
    ))
    if obj and obj.status != "deleted":
        if data.primary:
            _set_preferred(db, school, obj)
        return {"instance": _instance_output(obj, obj.id if data.primary else "")}
    status_value = row["state"].lower()
    status = "open" if status_value == "open" else "connecting" if status_value == "connecting" else "close" if status_value == "close" else "created"
    if obj:
        obj.enabled = True
        obj.status = status
        obj.connection_state = row["state"]
        obj.external_id = row["external_id"]
        obj.source = "adopted"
        obj.last_synced_at = datetime.now(UTC)
        obj.version += 1
    else:
        obj = m.ConnectInstance(
            company_id=company.id,
            name=row["name"],
            display_name=row["name"],
            document=re.sub(r"\D", "", company.document or ""),
            primary=False,
            enabled=True,
            status=status,
            connection_state=row["state"],
            external_id=row["external_id"],
            source="adopted",
            last_synced_at=datetime.now(UTC),
        )
        db.add(obj)
        db.flush()
    if data.primary or db.get(m.ConnectSchoolBinding, school.id) is None:
        _set_preferred(db, school, obj)
    audit(db, request, user, "connect.instance.adopted", obj, school.id, {
        "name": obj.name,
        "preferred": bool(data.primary),
    })
    return {"instance": _instance_output(obj, obj.id if data.primary else "")}


@router.post("/connect/instances/{instance_id}/prefer")
def prefer_connect_instance(instance_id: str, db: DB, user: Actor, school: Scope, request: Request):
    require(user, "connect.manage")
    lock_school(db, school.id)
    obj = _instance(db, school, instance_id)
    _set_preferred(db, school, obj)
    audit(db, request, user, "connect.instance.preferred", obj, school.id)
    return {"instance": _instance_output(obj, obj.id)}


@router.post("/connect/unit-preference")
def set_connect_unit_preference(data: s.ConnectUnitPreferenceInput, db: DB, user: Actor, school: Scope, request: Request):
    require(user, "connect.manage")
    lock_school(db, school.id)
    unit = scoped(db, m.Unit, data.unit_id, school.id)
    if not data.instance_id:
        binding = db.get(m.ConnectUnitBinding, unit.id)
        if binding:
            db.delete(binding)
        audit(db, request, user, "connect.instance.unit_inherit", unit, school.id)
        return {"unit_id": unit.id, "instance_id": ""}
    obj = _instance(db, school, data.instance_id)
    _set_unit_preferred(db, school, unit, obj)
    audit(db, request, user, "connect.instance.unit_preferred", obj, school.id, {"unit_id": unit.id})
    return {"unit_id": unit.id, "instance_id": obj.id}


@router.post("/connect/instances/{instance_id}/restart")
def restart_connect_instance(instance_id: str, db: DB, user: Actor, school: Scope, request: Request):
    require(user, "connect.manage")
    obj = _instance(db, school, instance_id)
    if obj.source != "pige360":
        fail(409, "Instância preexistente: reinício remoto não é administrado pelo PIGE360.")
    response = _remote_call(lambda: ConnectApiClient().restart(obj.name))
    _state_from_response(obj, response)
    audit(db, request, user, "connect.instance.restarted", obj, school.id)
    return {"instance": _instance_output(obj), **connect_response(response)}


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
        source="pige360",
        last_synced_at=datetime.now(UTC),
    )
    if primary:
        for other in existing:
            other.primary = False
    db.add(obj)
    db.flush()
    if primary or db.get(m.ConnectSchoolBinding, school.id) is None:
        _set_preferred(db, school, obj)
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
    db: DB,
    user: Actor,
    school: Scope,
    request: Request,
    data: s.ConnectPairInput | None = None,
):
    require(user, "connect.manage")
    obj = _instance(db, school, instance_id)
    number = data.number if data else ""
    if number and not re.fullmatch(r"\+?\d{8,15}", number):
        fail(422, "Informe o telefone internacional com DDD para gerar o pairing code.")
    response = _remote_call(lambda: ConnectApiClient().connect(obj.name, number))
    status, state = _remote_status(response)
    obj.status, obj.connection_state, obj.last_error = status, state, ""
    obj.last_synced_at = datetime.now(UTC)
    obj.version += 1
    audit(db, request, user, "connect.instance.connected", obj, school.id, {"state": state, "pairing": bool(number)})
    return {"instance": _instance_output(obj), **connect_response(response)}


@router.post("/connect/instances/{instance_id}/logout")
def logout_connect_instance(instance_id: str, db: DB, user: Actor, school: Scope, request: Request):
    require(user, "connect.manage")
    obj = _instance(db, school, instance_id)
    if obj.source != "pige360":
        fail(409, "Instância preexistente: logout remoto não é administrado pelo PIGE360.")
    response = _remote_call(lambda: ConnectApiClient().logout(obj.name))
    obj.status, obj.connection_state, obj.last_error = "close", "close", ""
    obj.last_synced_at = datetime.now(UTC)
    obj.version += 1
    audit(db, request, user, "connect.instance.logout", obj, school.id)
    return {"instance": _instance_output(obj), **connect_response(response)}


@router.delete("/connect/instances/{instance_id}")
def delete_connect_instance(instance_id: str, db: DB, user: Actor, school: Scope, request: Request):
    require(user, "connect.manage")
    lock_school(db, school.id)
    obj = _instance(db, school, instance_id)
    bindings = list(db.scalars(select(m.ConnectSchoolBinding).where(m.ConnectSchoolBinding.instance_id == obj.id)))
    other_bindings = [item for item in bindings if item.school_id != school.id]
    if other_bindings:
        fail(409, "Esta instância é preferencial de outra escola da instalação. Troque o vínculo antes de removê-la.")
    current = db.get(m.ConnectSchoolBinding, school.id)
    if current and current.instance_id == obj.id:
        db.delete(current)
    response = {}
    if obj.source == "pige360":
        response = _remote_call(lambda: ConnectApiClient().delete(obj.name))
    obj.enabled = False
    obj.primary = False
    obj.status, obj.connection_state = "deleted", "close"
    obj.last_error = ""
    obj.version += 1
    action = "connect.instance.deleted" if obj.source == "pige360" else "connect.instance.unlinked"
    audit(db, request, user, action, obj, school.id, {"name": obj.name, "remote_deleted": obj.source == "pige360"})
    return {"deleted": True, "remote_deleted": obj.source == "pige360", "instance": _instance_output(obj), **connect_response(response)}


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
    group = db.get(m.ClassGroup, admission.class_group_id) if admission.class_group_id else None
    instance = connect_instance_for_school(db, school.id, True, group.unit_id if group else None)
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
    job.available_at = datetime.now(UTC)
    audit(db, request, user, "connect.job.retry", job, school.id, {"reason": data.reason})
    return output(job, ("encrypted_payload",))
