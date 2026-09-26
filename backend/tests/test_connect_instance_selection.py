from types import SimpleNamespace

import pytest

from app import connect, connect_core
from app.online_schemas import ConnectInstanceInput
from app.integration_core import IntegrationFailure


def cfg(hosts=""):
    return SimpleNamespace(
        connect_api_base_url="https://api.connect.example.com",
        connect_api_key="secret",
        connect_allowed_hosts=hosts,
        connect_allow_private=False,
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
