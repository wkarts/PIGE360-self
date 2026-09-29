import base64
import io
from types import SimpleNamespace

import httpx
import pytest
from fastapi import HTTPException
from PIL import Image

from app import connect, connect_core
from app import integration_core
from app.online_schemas import ConnectInstanceInput
from app.integration_core import IntegrationFailure


def cfg(hosts=""):
    return SimpleNamespace(
        connect_api_base_url="https://api.connect.example.com",
        connect_api_key="secret",
        connect_allowed_hosts=hosts,
        connect_allow_private=False,
        connect_pairing_timeout_seconds=75,
    )


def test_connect_base_host_is_allowed_when_explicit_allowlist_is_empty(monkeypatch):
    monkeypatch.setattr(connect_core, "settings", lambda: cfg(""))
    monkeypatch.setattr(connect_core.socket, "getaddrinfo", lambda *a, **k: [(2, 1, 6, "", ("8.8.8.8", 443))])
    base, key = connect_core._connect_config()
    assert base == "https://api.connect.example.com"
    assert key == "secret"


def test_explicit_connect_allowlist_still_restricts_host(monkeypatch):
    monkeypatch.setattr(connect_core, "settings", lambda: cfg("other.example.com"))
    with pytest.raises(IntegrationFailure) as error:
        connect_core._connect_config()
    assert error.value.code == "CONNECT_API_HOST_NOT_ALLOWED"


def test_remote_inventory_normalizes_common_connect_api_shapes():
    response = {
        "instances": [
            {
                "instance": {
                    "instanceName": "EXISTENTE-01",
                    "instanceId": "remote-1",
                    "integration": "WHATSAPP-BAILEYS",
                    "state": "open",
                    "ownerJid": "5575999990000@s.whatsapp.net",
                }
            }
        ]
    }
    rows = connect._remote_rows(response)
    assert rows == [{
        "name": "EXISTENTE-01",
        "state": "open",
        "integration": "WHATSAPP-BAILEYS",
        "number": "5575999990000",
        "external_id": "remote-1",
    }]


def test_transport_uses_base_url_host_when_allowlist_is_empty(monkeypatch):
    monkeypatch.setattr(connect_core, "settings", lambda: cfg(""))
    import app.integration_core as integration_core
    monkeypatch.setattr(integration_core, "settings", lambda: cfg(""))
    monkeypatch.setattr(integration_core.socket, "getaddrinfo", lambda *a, **k: [(2, 1, 6, "", ("8.8.8.8", 443))])
    integration_core.validate_target("https://api.connect.example.com", "connect_api")


def test_transport_rejects_host_outside_explicit_allowlist(monkeypatch):
    import app.integration_core as integration_core
    monkeypatch.setattr(integration_core, "settings", lambda: cfg("other.example.com"))
    with pytest.raises(IntegrationFailure) as error:
        integration_core.validate_target("https://api.connect.example.com", "connect_api")
    assert error.value.code == "CONNECT_HOST_NOT_ALLOWED"


def test_connect_instance_creation_requires_and_normalizes_phone():
    data = ConnectInstanceInput.model_validate({
        "label": "Secretaria",
        "phone": "(75) 99999-0000",
        "primary": True,
    })
    assert data.phone == "5575999990000"
    with pytest.raises(Exception):
        ConnectInstanceInput.model_validate({"label": "Sem telefone", "primary": False})


def test_current_connect_contract_returns_top_level_qr_and_pairing_without_secrets():
    response = {
        "code": "qr-payload-test",
        "base64": "data:image/png;base64,VALID-PROVIDER-IMAGE",
        "pairingCode": "ABCD-1234",
        "hash": "never-expose-this",
        "apikey": "never-expose-this-either",
    }
    qr = connect_core.connect_response(response, "qr")
    pairing = connect_core.connect_response(response, "pairing")
    assert qr["qrcode"] == {"code": "qr-payload-test", "base64": response["base64"]}
    assert pairing["qrcode"] == {"pairingCode": "ABCD-1234"}
    assert "never-expose" not in str(qr) + str(pairing)


def test_code_only_qr_becomes_scannable_png():
    result = connect_core.connect_response({"code": "qr-test-payload"}, "qr")["qrcode"]
    prefix = "data:image/png;base64,"
    assert result["code"] == "qr-test-payload"
    assert result["base64"].startswith(prefix)
    with Image.open(io.BytesIO(base64.b64decode(result["base64"][len(prefix):]))) as image:
        assert image.format == "PNG" and image.width > 20


def test_empty_response_is_pending_and_does_not_clear_open_instance():
    instance = SimpleNamespace(status="open", connection_state="open", version=2, last_error="previous")
    connect._state_from_response(instance, {})
    assert instance.status == "open" and instance.connection_state == "open"
    assert instance.last_error == "" and instance.version == 3
    assert connect_core._remote_status({"instance": {"state": ""}}) == ("created", "")
    assert connect_core.connect_response({}, "pairing") == {"qrcode": {}, "pending": True}
    connected = connect_core.connect_response({"instance": {"state": "open"}}, "qr")
    assert connected["connected"] is True and "pending" not in connected


def test_inventory_array_only_allowed_for_explicit_calls(monkeypatch):
    original_client = httpx.Client
    captured = []
    def handler(request):
        captured.append(str(request.url))
        return httpx.Response(200, json=[{"instance": {"instanceName": "TESTE", "state": "open"}}])
    monkeypatch.setattr(integration_core, "validate_target", lambda *args: None)
    monkeypatch.setattr(integration_core.httpx, "Client", lambda **kwargs: original_client(transport=httpx.MockTransport(handler), **kwargs))
    monkeypatch.setattr(connect_core, "_connect_config", lambda: ("https://api.connect.example.com", "secret"))
    client = connect_core.ConnectApiClient()
    rows = client.fetch_instances()
    assert connect._remote_rows(rows)[0]["name"] == "TESTE"
    assert client.fetch_instance("TESTE") == rows
    assert captured[1].endswith("?instanceName=TESTE")
    with pytest.raises(IntegrationFailure) as error:
        client.health()
    assert error.value.code == "PROVIDER_INVALID_RESPONSE"


def test_connect_uses_75_seconds_and_reports_timeouts_without_provider_detail(monkeypatch):
    original_client = httpx.Client
    captured = []
    def client_factory(**kwargs):
        captured.append(kwargs["timeout"].read)
        def handler(_request):
            raise httpx.ReadTimeout("secret-upstream-error")
        return original_client(transport=httpx.MockTransport(handler), **kwargs)
    monkeypatch.setattr(integration_core, "validate_target", lambda *args: None)
    monkeypatch.setattr(integration_core.httpx, "Client", client_factory)
    monkeypatch.setattr(connect_core, "_connect_config", lambda: ("https://api.connect.example.com", "secret"))
    monkeypatch.setattr(connect_core, "settings", lambda: cfg())
    client = connect_core.ConnectApiClient()
    with pytest.raises(IntegrationFailure) as error:
        client.connect("TESTE", "5575999990000")
    assert captured == [75]
    assert error.value.code == "PROVIDER_TIMEOUT"
    assert "secret" not in str(error.value)
    assert error.value.retryable is True


@pytest.mark.parametrize("code", ["PROVIDER_TIMEOUT", "PROVIDER_NETWORK_ERROR", "CONNECT_HOST_NOT_ALLOWED", "CONNECT_ADDRESS_BLOCKED", "DNS_UNAVAILABLE"])
def test_connect_transport_errors_are_service_unavailable_without_provider_body(code):
    def remote_call():
        raise IntegrationFailure(code)
    with pytest.raises(HTTPException) as error:
        connect._remote_call(remote_call)
    assert error.value.status_code == 503
    assert code in error.value.detail
    assert "secret-upstream-error" not in error.value.detail
