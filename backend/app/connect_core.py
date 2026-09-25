"""Cliente e fila próprios da ARGWS Connect API.

A chave é global por instalação e fica exclusivamente no ambiente. As
instâncias WhatsApp pertencem à empresa/tenant, não à integração bancária.
"""
import ipaddress
import re
import socket
import unicodedata
from urllib.parse import urlsplit

from sqlalchemy import select

from . import models as m
from .config import settings
from .db import now
from .integration_core import IntegrationFailure, call_json, seal, unseal
from .security import fail


def _normalise_slug(value: str) -> str:
    ascii_value = unicodedata.normalize("NFKD", value or "").encode("ascii", "ignore").decode()
    value = re.sub(r"[^A-Za-z0-9]+", "-", ascii_value).strip("-").upper()
    return value[:48] or "EMPRESA"


def _cnpj_digits(value: str | None) -> str:
    digits = re.sub(r"\D", "", value or "")
    if len(digits) != 14:
        fail(422, "Cadastre um CNPJ válido na empresa antes de criar a instância Connect API.")
    return digits


def build_instance_name(company, label: str = "", sequence: int = 0) -> str:
    cnpj = _cnpj_digits(company.document)
    parts = ["PG360", _normalise_slug(company.name), cnpj]
    if label.strip():
        parts.append(_normalise_slug(label)[:24])
    if sequence > 0:
        parts.append(f"{sequence:02d}")
    return "-".join(parts)[:100].rstrip("-")


def _connect_config() -> tuple[str, str]:
    cfg = settings()
    base = cfg.connect_api_base_url.strip().rstrip("/")
    key = cfg.connect_api_key.strip()
    if not base or not key:
        raise IntegrationFailure("CONNECT_API_NOT_CONFIGURED")
    parsed = urlsplit(base)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise IntegrationFailure("CONNECT_API_BASE_URL_MUST_BE_HTTPS")
    allowed = {item.strip().lower() for item in cfg.connect_allowed_hosts.split(",") if item.strip()}
    if parsed.hostname.lower() not in allowed:
        raise IntegrationFailure("CONNECT_API_HOST_NOT_ALLOWED")
    try:
        addresses = socket.getaddrinfo(parsed.hostname, parsed.port or 443, type=socket.SOCK_STREAM)
    except OSError:
        raise IntegrationFailure("CONNECT_API_DNS_UNAVAILABLE", retryable=True)
    for address in addresses:
        ip = ipaddress.ip_address(address[4][0])
        if (not ip.is_global and not cfg.connect_allow_private) or ip.is_unspecified or ip.is_multicast:
            raise IntegrationFailure("CONNECT_API_PRIVATE_ADDRESS_BLOCKED")
    return base, key


class ConnectApiClient:
    """Contrato nativo da ARGWS Connect API, autenticado pela chave global."""

    def __init__(self):
        self.base, self.key = _connect_config()

    def request(self, path: str, method: str = "GET", data=None, params=None):
        response = call_json(
            "connect_api",
            self.base,
            path,
            method=method,
            api_key=self.key,
            header="apikey",
            data=data,
            params=params,
        )
        if isinstance(response, dict) and response.get("error") is True:
            raise IntegrationFailure("CONNECT_API_REJECTED")
        return response

    def health(self):
        return self.request("/health")

    def create_instance(self, name: str):
        return self.request(
            "/instance/create",
            method="POST",
            data={
                "instanceName": name,
                "integration": "WHATSAPP-BAILEYS",
                "qrcode": True,
            },
        )

    def connection_state(self, name: str):
        return self.request(f"/instance/connectionState/{name}")

    def connect(self, name: str, number: str = ""):
        params = {"number": number} if number else None
        return self.request(f"/instance/connect/{name}", params=params)

    def logout(self, name: str):
        return self.request(f"/instance/logout/{name}", method="DELETE")

    def delete(self, name: str):
        return self.request(f"/instance/delete/{name}", method="DELETE")

    def send_text(self, name: str, number: str, text: str, request_key: str = ""):
        response = call_json(
            "connect_api",
            self.base,
            f"/message/sendText/{name}",
            method="POST",
            api_key=self.key,
            header="apikey",
            data={"number": number, "text": text},
            request_key=request_key,
        )
        if isinstance(response, dict) and response.get("error") is True:
            raise IntegrationFailure("CONNECT_API_REJECTED")
        value = response
        for part in ("key", "id"):
            value = value.get(part) if isinstance(value, dict) else None
        if not isinstance(value, (str, int)) or not str(value):
            value = response.get("message", {}).get("key", {}).get("id") if isinstance(response, dict) else None
        if not isinstance(value, (str, int)) or not str(value):
            value = response.get("id") if isinstance(response, dict) else None
        if not isinstance(value, (str, int)) or not str(value):
            raise IntegrationFailure("CONNECT_MESSAGE_ID_MISSING", uncertain=True)
        return str(value)[:160]


def _qr_output(response):
    qr = response.get("qrcode") if isinstance(response, dict) else None
    if not isinstance(qr, dict):
        return {}
    return {
        key: str(qr[key])[:1_000_000]
        for key in ("code", "base64", "pairingCode")
        if isinstance(qr.get(key), str) and qr[key]
    }


def connect_response(response):
    """Retorna somente estado e QR; nunca devolve hash/token da Connect API."""
    result = {"qrcode": _qr_output(response)}
    remote = response.get("instance") if isinstance(response, dict) else None
    if isinstance(remote, dict):
        result["remote"] = {
            key: str(remote[key])[:160]
            for key in ("instanceName", "instanceId", "integration", "status")
            if remote.get(key) is not None
        }
    if isinstance(response, dict) and response.get("error") is True:
        result["error"] = True
        result["message"] = str(response.get("message", "Connect API rejeitou a operação"))[:300]
    return result


def _remote_status(response) -> tuple[str, str]:
    remote = response.get("instance") if isinstance(response, dict) else None
    if not isinstance(remote, dict):
        return "created", ""
    state = str(remote.get("state") or remote.get("status") or "created").lower()
    status = "open" if state == "open" else "connecting" if state == "connecting" else "close" if state == "close" else "created"
    return status, state


def connect_instance_for_school(db, school_id: str, required: bool = True):
    school = db.get(m.School, school_id)
    if not school:
        if required:
            fail(404, "Escola não encontrada.")
        return None
    query = select(m.ConnectInstance).where(
        m.ConnectInstance.company_id == school.company_id,
        m.ConnectInstance.enabled.is_(True),
        m.ConnectInstance.status != "deleted",
    )
    obj = db.scalar(query.where(m.ConnectInstance.primary.is_(True)).order_by(m.ConnectInstance.created_at))
    if obj is None:
        obj = db.scalar(query.order_by(m.ConnectInstance.created_at))
    if required and obj is None:
        fail(409, "Crie e conecte uma instância Connect API para esta empresa.")
    return obj


def enqueue_connect_message(db, school_id: str, instance_id: str, payload: dict, key: str):
    existing = db.scalar(select(m.ConnectMessageJob).where(m.ConnectMessageJob.dedupe_key == key))
    if existing:
        if (
            existing.school_id != school_id
            or existing.instance_id != instance_id
            or unseal(existing.encrypted_payload) != payload
        ):
            fail(409, "Chave de idempotência reutilizada para outra mensagem.")
        return existing
    task = m.ConnectMessageJob(
        school_id=school_id,
        instance_id=instance_id,
        kind="text",
        dedupe_key=key,
        encrypted_payload=seal(payload),
        available_at=now(),
    )
    db.add(task)
    db.flush()
    return task
