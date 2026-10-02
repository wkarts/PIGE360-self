"""XML fiscal sintético: criptografia, isolamento e avisos sem envios reais."""
import base64
import hashlib
import uuid
from datetime import UTC, datetime, timedelta

import pytest
from asn1crypto.x509 import Certificate
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.primitives.serialization import pkcs12
from lxml import etree

CNPJ = '12345678000190'
PASSWORD = 'certificado-sintetico'


def fixture_certificate(*, expired=False, usage=True):
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    name = x509.Name([x509.NameAttribute(x509.NameOID.COMMON_NAME, 'Certificado fiscal sintético')])
    ca_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    ca_name = x509.Name([x509.NameAttribute(x509.NameOID.COMMON_NAME, 'AC fiscal sintética')])
    ca = (x509.CertificateBuilder().subject_name(ca_name).issuer_name(ca_name).public_key(ca_key.public_key())
          .serial_number(x509.random_serial_number()).not_valid_before(datetime.now(UTC) - timedelta(days=90))
          .not_valid_after(datetime.now(UTC) + timedelta(days=365))
          .add_extension(x509.BasicConstraints(ca=True, path_length=0), critical=True)
          .sign(ca_key, hashes.SHA256()))
    cert = (x509.CertificateBuilder().subject_name(name).issuer_name(ca_name).public_key(key.public_key())
            .serial_number(x509.random_serial_number()).not_valid_before(datetime.now(UTC) - timedelta(days=60))
            .not_valid_after(datetime.now(UTC) + timedelta(days=-1 if expired else 29))
            .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
            .add_extension(x509.KeyUsage(digital_signature=usage, content_commitment=True,
                key_encipherment=False, data_encipherment=False, key_agreement=False,
                key_cert_sign=False, crl_sign=False, encipher_only=False, decipher_only=False), critical=True)
            .add_extension(x509.SubjectAlternativeName([x509.OtherName(
                x509.ObjectIdentifier('2.16.76.1.3.3'), bytes([0x16, 14]) + CNPJ.encode())]), critical=False)
            .sign(ca_key, hashes.SHA256()))
    pfx = pkcs12.serialize_key_and_certificates(b'fiscal-test', key, cert, [ca],
        serialization.BestAvailableEncryption(PASSWORD.encode()))
    roots = [Certificate.load(ca.public_bytes(serialization.Encoding.DER))]
    return cert, pfx, roots


def fiscal_xml(model='55'):
    key = '292610' + CNPJ + model + '001' + '000000001' + '1' + '12345678'
    checksum = 11 - sum(int(n) * (2 + i % 8) for i, n in enumerate(reversed(key))) % 11
    key += str(0 if checksum >= 10 else checksum)
    return (f'<NFe xmlns="http://www.portalfiscal.inf.br/nfe"><infNFe Id="NFe{key}" versao="4.00">'
            f'<ide><mod>{model}</mod></ide><emit><CNPJ>{CNPJ}</CNPJ></emit>'
            '<det nItem="1"><prod><xProd>DOCUMENTO SINTETICO</xProd></prod></det>'
            '</infNFe></NFe>').encode()


def dps_xml(version='1.00'):
    identifier = 'DPS' + '2928703' + '2' + CNPJ + '00001' + '000000000000001'
    return (f'<DPS xmlns="http://www.sped.fazenda.gov.br/nfse" versao="{version}"><infDPS Id="{identifier}">'
            f'<prest><CNPJ>{CNPJ}</CNPJ></prest><serv><cServ><xDescServ>SERVICO SINTETICO</xDescServ></cServ></serv>'
            '</infDPS></DPS>').encode()


@pytest.mark.parametrize(('profile', 'source'), [('nfe_4', fiscal_xml()), ('nfce_4', fiscal_xml('65')), ('nfse_dps_1', dps_xml()), ('nfse_dps_101', dps_xml('1.01'))])
def test_sign_and_verify_fiscal_xml_and_tampering(profile, source):
    from app.fiscal_xml import DS, InvalidFiscalXML, sign_fiscal_xml, verify_fiscal_xml
    cert, pfx, roots = fixture_certificate()
    signed = sign_fiscal_xml(source, profile, pfx, PASSWORD, issuer_cnpj=CNPJ, roots=roots)
    digest = cert.fingerprint(hashes.SHA256()).hex()
    assert verify_fiscal_xml(signed, profile, expected_certificate_sha256=digest)['cryptographic_valid']
    # Verificação independente dos bytes SignedInfo com a chave pública conhecida.
    root = etree.fromstring(signed)
    info = root.find('.//{%s}SignedInfo' % DS)
    signature = base64.b64decode(root.find('.//{%s}SignatureValue' % DS).text)
    cert.public_key().verify(signature, etree.tostring(info, method='c14n'), padding.PKCS1v15(), hashes.SHA256() if profile == 'nfse_dps_101' else hashes.SHA1())
    tampered = signed.replace(b'SINTETICO', b'ADULTERADO')
    with pytest.raises(InvalidFiscalXML):
        verify_fiscal_xml(tampered, profile, expected_certificate_sha256=digest)
    with pytest.raises(InvalidFiscalXML):
        verify_fiscal_xml(signed, profile, expected_certificate_sha256='0' * 64)
    with pytest.raises(InvalidFiscalXML):
        sign_fiscal_xml(signed, profile, pfx, PASSWORD, issuer_cnpj=CNPJ, roots=roots)


@pytest.mark.parametrize('case', ['expired', 'usage', 'roots', 'issuer', 'model', 'version', 'duplicate', 'dtd', 'external', 'nfse_version', 'unicode_id'])
def test_signing_refuses_invalid_certificate_scope_and_unsafe_xml(case):
    from app.fiscal_xml import InvalidFiscalXML, sign_fiscal_xml
    cert, pfx, roots = fixture_certificate(expired=case == 'expired', usage=case != 'usage')
    source, profile = fiscal_xml(), 'nfe_4'
    if case == 'unicode_id': source = source.replace(b'Id="NFe29', 'Id="NFe٢٩'.encode())
    if case == 'model': profile = 'nfce_4'
    if case == 'version': source = source.replace(b'4.00', b'3.10')
    if case == 'duplicate': source = source.replace(b'</infNFe>', b'<extra Id="' + etree.fromstring(source)[0].get('Id').encode() + b'"/></infNFe>')
    if case == 'dtd': source = b'<!DOCTYPE NFe [<!ENTITY leak SYSTEM "file:///etc/passwd">]>' + source
    if case == 'external': source = b'<?xml-stylesheet href="https://example.test/leak"?>' + source
    if case == 'nfse_version': source, profile = dps_xml().replace(b'1.00', b'1.01'), 'nfse_dps_1'
    with pytest.raises(InvalidFiscalXML):
        sign_fiscal_xml(source, profile, pfx, PASSWORD, issuer_cnpj='00000000000000' if case == 'issuer' else CNPJ,
                        roots=[] if case == 'roots' else roots)


def configure(api, tmp_path, monkeypatch):
    from app.config import settings
    from app.db import SessionLocal
    from app import models as m
    cert, pfx, roots = fixture_certificate()
    root_dir = tmp_path / 'fiscal-roots'
    root_dir.mkdir()
    (root_dir / 'synthetic.pem').write_bytes(x509.load_der_x509_certificate(roots[0].dump()).public_bytes(serialization.Encoding.PEM))
    monkeypatch.setattr(settings(), 'signature_trust_roots_dir', root_dir)
    with SessionLocal() as db:
        db.get(m.Company, api.school['company_id']).document = CNPJ
        db.commit()
    response = api.client.put(api.base + '/signing-certificate/a1', headers=api.headers,
        files={'file': ('test.p12', pfx)}, data={'password': PASSWORD})
    assert response.status_code == 200, response.text
    return cert


def test_fiscal_api_idempotency_download_authorization_and_scope(api, tmp_path, monkeypatch):
    configure(api, tmp_path, monkeypatch)
    assert len(api.get('/fiscal-signatures')['profiles']) == 4
    path = api.base + '/fiscal-signatures'
    params = {'profile': 'nfe_4', 'consent': 'true'}
    assert api.client.post(path, headers=api.headers, files={'file': ('test.xml', fiscal_xml())},
        data={'profile': 'nfe_4'}).status_code == 422
    response = api.client.post(path, headers=api.headers, files={'file': ('test.xml', fiscal_xml())}, data=params)
    assert response.status_code == 201, response.text
    item = response.json()
    again = api.client.post(path, headers=api.headers, files={'file': ('test.xml', fiscal_xml())}, data=params)
    assert again.status_code == 201 and again.json()['id'] == item['id']
    assert item['authorization_status'] == 'not_submitted'
    assert item['schema_validation'] == 'signing_profile_only'
    download = api.client.get(api.base + '/files/' + item['signed_file_id'] + '/download', headers=api.headers)
    assert download.status_code == 200 and hashlib.sha256(download.content).hexdigest() == item['signed_sha256']
    from conftest import PASSWORD as LOGIN_PASSWORD
    email = 'fiscal-secretary-' + uuid.uuid4().hex + '@example.com'
    response = api.client.post('/api/v1/users', headers=api.headers, json={
        'name': 'Secretaria fiscal de teste', 'email': email, 'password': LOGIN_PASSWORD,
        'role': 'secretary', 'school_ids': [api.school['id']]})
    assert response.status_code == 201, response.text
    token = api.client.post('/api/v1/auth/login', json={'email': email, 'password': LOGIN_PASSWORD}).json()['access_token']
    headers = {'Authorization': 'Bearer ' + token}
    assert api.client.get(path, headers=headers).status_code == 403
    assert api.client.get(api.base + '/signing-certificate/alerts', headers=headers).status_code == 403
    assert api.client.get(api.base + '/signing-certificate/alert-preferences', headers=headers).status_code == 403
    assert api.client.post(path, headers=headers, files={'file': ('test.xml', fiscal_xml())}, data=params).status_code == 403
    assert api.client.get(api.base + '/files/' + item['signed_file_id'] + '/download', headers=headers).status_code == 403
    other = api.client.post('/api/v1/schools', headers=api.headers,
        json={'name': 'Escola fiscal isolada', 'company_id': api.school['company_id']}).json()
    assert api.client.get('/api/v1/schools/' + other['id'] + '/files/' + item['signed_file_id'] + '/download', headers=api.headers).status_code == 404


def test_expiry_alerts_opt_in_dedupe_and_recheck(api, tmp_path, monkeypatch):
    configure(api, tmp_path, monkeypatch)
    from app import certificate_alerts as alerts, models as m
    from app.contract_signatures import _certificate
    from app.db import SessionLocal
    from app.integration_core import unseal
    notice = api.get('/signing-certificate/alerts')['items'][0]
    assert notice['kind'] == 'certificate_expiry' and notice['days_remaining'] == 29
    assert notice['route'] == 'certificate'
    pref = api.get('/signing-certificate/alert-preferences')
    assert not pref['email_enabled'] and not pref['whatsapp_enabled']
    bad = api.client.put(api.base + '/signing-certificate/alert-preferences', headers=api.headers,
                         json={'whatsapp_enabled': True})
    assert bad.status_code == 422
    saved = api.client.put(api.base + '/signing-certificate/alert-preferences', headers=api.headers,
                           json={'email_enabled': True})
    assert saved.status_code == 200
    sent = []
    with SessionLocal() as db:
        alerts.schedule_certificate_alerts(db)
        db.commit()
        jobs = db.query(m.IntegrationJob).filter_by(school_id=api.school['id'], kind='certificate_expiry_alert').all()
        assert len(jobs) == 1
        alerts.schedule_certificate_alerts(db)
        db.commit()
        assert db.query(m.IntegrationJob).filter_by(school_id=api.school['id'], kind='certificate_expiry_alert').count() == 1
        payload = unseal(jobs[0].encrypted_payload)
        alerts.execute_certificate_alert(db, jobs[0], payload, sent.append)
        assert len(sent) == 1 and sent[0]['to'] == pref['email']
        assert 'Configurações > Certificados A1' in sent[0]['text']
        admin_user = db.query(m.User).filter_by(email='admin@example.com').one()
        membership = db.get(m.SchoolAccess, (admin_user.id, api.school['id']))
        assert membership is not None
        # Mesmo um administrador não recebe dados de uma entidade sem vínculo ativo.
        membership.active = False
        db.flush()
        assert not alerts._access(db, admin_user, api.school['id'])
        assert alerts.execute_certificate_alert(db, jobs[0], payload, sent.append) == 'cancelled-precondition'
        membership.active = True
        membership.archived_at = datetime.now(UTC)
        db.flush()
        assert alerts.execute_certificate_alert(db, jobs[0], payload, sent.append) == 'cancelled-precondition'
        membership.archived_at = None
        db.flush()
        assert len(sent) == 1
        current = db.query(alerts.CertificateAlertPreference).filter_by(school_id=api.school['id']).one()
        current.email_enabled = False
        db.flush()
        assert alerts.execute_certificate_alert(db, jobs[0], payload, sent.append) == 'cancelled-precondition'
        assert len(sent) == 1
        current.email_enabled = True
        cert = _certificate(db, api.school['id'])
        cert.certificate_sha256 = '0' * 64
        db.flush()
        assert alerts.execute_certificate_alert(db, jobs[0], payload, sent.append) == 'cancelled-precondition'
        db.rollback()


def test_expiry_thresholds_are_unique_and_expired_is_discrete():
    from types import SimpleNamespace
    from app.certificate_alerts import expiry_notice
    for days, bucket in [(31, None), (29, '30'), (14, '15'), (6, '7'), (.8, '1'), (-1, 'expired')]:
        cert = SimpleNamespace(certificate_sha256='a' * 64, expires_at=datetime.now(UTC) + timedelta(days=days))
        result = expiry_notice(cert)
        assert (result['bucket'] if result else None) == bucket


def test_worker_dispatches_opted_in_channels_with_existing_transports(api, tmp_path, monkeypatch):
    configure(api, tmp_path, monkeypatch)
    from types import SimpleNamespace
    from app import certificate_alerts as alerts, connect_core, integration_worker, models as m
    from app.db import SessionLocal
    delivered = []
    monkeypatch.setattr(integration_worker, 'send_email', lambda payload: delivered.append(('email', payload['to'])) or 'email-test')
    monkeypatch.setattr(connect_core, 'connect_instance_for_school', lambda *a, **kw: SimpleNamespace(name='test-school'))
    monkeypatch.setattr(connect_core, 'ConnectApiClient', lambda: SimpleNamespace(
        send_text=lambda instance, number, text, key: delivered.append(('whatsapp', number)) or 'wa-test'))
    with SessionLocal() as db:
        user = db.query(m.User).filter_by(email='admin@example.com').one()
        profile = db.get(m.UserProfile, user.id)
        if profile is None:
            profile = m.UserProfile(user_id=user.id)
            db.add(profile)
        profile.phone = '55 75 99999-0000'
        db.commit()
    result = api.client.put(api.base + '/signing-certificate/alert-preferences', headers=api.headers,
        json={'email_enabled': True, 'whatsapp_enabled': True})
    assert result.status_code == 200, result.text
    with SessionLocal() as db:
        alerts.schedule_certificate_alerts(db)
        db.commit()
        jobs = db.query(m.IntegrationJob).filter_by(school_id=api.school['id'], kind='certificate_expiry_alert').all()
        assert len(jobs) == 2
        for job in jobs:
            assert integration_worker.execute(db, job) in {'email-test', 'wa-test'}
        assert set(delivered) == {('email', 'admin@example.com'), ('whatsapp', '5575999990000')}
        # Uma preferência não concede acesso quando o perfil administrativo foi revogado.
        user = db.query(m.User).filter_by(email='admin@example.com').one()
        user.role = 'secretary'
        db.flush()
        for job in jobs:
            assert integration_worker.execute(db, job) == 'cancelled-precondition'
        assert len(delivered) == 2
        db.rollback()
