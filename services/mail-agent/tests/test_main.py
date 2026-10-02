from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
TOKEN = {'Authorization': 'Bearer test-token'}


def test_health_does_not_expose_provider_configuration():
    result = client.get('/health/ready')
    assert result.status_code == 200
    assert result.json() == {'status': 'ok', 'service': 'mail-agent'}


def test_capabilities_requires_internal_token(monkeypatch):
    monkeypatch.setattr('app.main.TOKEN', 'test-token')
    assert client.get('/v1/capabilities').status_code == 401
    result = client.get('/v1/capabilities', headers=TOKEN)
    assert result.status_code == 200
    assert result.json()['providers']['mailcow']['provisioning'] is True
    assert result.json()['providers']['generic']['provisioning'] is False
    assert result.json()['sso']['enabled'] is False


def test_provider_path_allowlist_blocks_arbitrary_routes(monkeypatch):
    monkeypatch.setattr('app.main.TOKEN', 'test-token')
    result = client.post('/v1/providers/mailcow/request', headers=TOKEN, json={
        'domain':'escola.example.com', 'base_url':'https://mail.example.com',
        'api_key':'x'*24, 'path':'/api/v1/delete/domain', 'method':'DELETE'
    })
    assert result.status_code == 422


def test_provider_endpoint_does_not_accept_redirect_target(monkeypatch):
    monkeypatch.setattr('app.main.TOKEN', 'test-token')
    result = client.post('/v1/providers/mailcow/request', headers=TOKEN, json={
        'domain':'escola.example.com', 'base_url':'https://mail.example.com',
        'api_key':'x'*24, 'path':'/api/v1/get/domain/escola.example.com',
        'method':'GET', 'payload':None, 'redirects':True
    })
    assert result.status_code == 422


def test_mailcow_target_pins_validated_dns_and_preserves_tls_hostname(monkeypatch):
    import socket
    from app.main import MailcowCall, _api_target
    monkeypatch.setattr('app.main.socket.getaddrinfo', lambda *args, **kwargs: [
        (socket.AF_INET, socket.SOCK_STREAM, 6, '', ('8.8.8.8', 443))])
    data=MailcowCall(domain='escola.example.com',host='escola.example.com',base_url='https://mail.example.com',
        api_key='x'*24,path='/api/v1/get/domain/escola.example.com')
    target,authority,hostname=_api_target(data)
    assert target=='https://8.8.8.8:443'
    assert authority=='mail.example.com' and hostname=='mail.example.com'


def test_generic_mail_test_uses_explicit_password_field(monkeypatch):
    from app import main
    monkeypatch.setattr(main,'TOKEN','test-token')
    result=client.post('/v1/providers/test',headers=TOKEN,json={
        'provider':'generic','host':'user@other.example.net','domain':'escola.example.com',
        'imap_host':'imap.example.com','smtp_host':'smtp.example.com','password':'not-a-log-value'})
    assert result.status_code==422
    assert 'not-a-log-value' not in result.text
