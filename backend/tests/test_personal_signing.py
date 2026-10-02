"""A1 pessoal efêmero, assinatura escolar e sessão OAuth vinculada ao PDF."""
import asyncio
import hashlib
import secrets
from datetime import timedelta
from urllib.parse import parse_qs, urlsplit

import httpx
import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

from app.db import SessionLocal, now
from app.govbr_login import GovBRLoginClient, GovBRLoginConfig
from app.govbr_signing import GovBRSigningError
from app.personal_signing import GovBRSignatureSession
from test_contract_signatures import certificate
from test_online import online, draft, submit, approve, pc, CPF, CSRF


def form_post(o, path, data, *, files=None, status=200):
    response = o['parent'].post('/api/v1/portal' + path, headers=CSRF, data=data, files=files)
    assert response.status_code == status, response.text
    return response.json()


@pytest.fixture
def signing_case(online, tmp_path, monkeypatch):
    from app.config import settings
    o, api = online, online['api']
    template = api.post('/document-templates', {
        'name': 'Contrato assinatura integrada', 'kind': 'educational_contract',
        'academic_year_id': o['cat']['year']['id'],
        'body': 'Contrato de {{aluno.nome}} com {{escola.nome}}.', 'require_signature': True})
    campaign = o['campaign']
    campaign_data = {key: campaign[key] for key in ('slug', 'title', 'instructions', 'privacy_notice',
        'terms_version', 'class_group_ids', 'opens_on', 'closes_on', 'active',
        'require_verified_contact', 'require_documents', 'require_payment_before_enrollment')}
    api.patch('/admission-campaigns/' + campaign['id'], {
        **campaign_data, 'version': campaign['version'], 'contract_template_id': template['id']})
    admission = approve(o, submit(o, draft(o)))
    from app import models as m
    with SessionLocal() as db:
        company = db.get(m.Company, api.school['company_id'])
        cnpj = ''.join(x for x in (company.document or '') if x.isdigit()) or '12345678000190'
    school_cert, school_pfx = certificate('Escola assinatura', '2.16.76.1.3.3', cnpj)
    guardian_cert, guardian_pfx = certificate('Responsável assinatura', '2.16.76.1.3.1', '01011990' + CPF)
    roots = tmp_path / 'roots'
    roots.mkdir()
    for index, cert in enumerate((school_cert, guardian_cert)):
        (roots / f'root-{index}.pem').write_bytes(cert.public_bytes(serialization.Encoding.PEM))
    monkeypatch.setattr(settings(), 'signature_trust_roots_dir', roots)
    response = api.client.put(api.base + '/signing-certificate/a1', headers=api.headers,
        files={'file': ('escola.p12', school_pfx)}, data={'password': 'senha-teste'})
    assert response.status_code == 200, response.text
    issued = api.post('/document-templates/' + template['id'] + '/issue', {
        'enrollment_id': admission['enrollment_id'], 'template_version': admission['contract_template_version']})
    return {**o, 'admission': admission, 'issued': issued, 'pfx': guardian_pfx,
            'path': f"/admissions/{admission['id']}/issued/{issued['id']}"}


def test_personal_a1_consent_identity_and_no_credential_persistence(signing_case):
    o = signing_case
    files = {'file': ('responsavel.pfx', o['pfx'])}
    for data in ({'password': 'senha-teste'}, {'password': 'errada', 'consent': 'true'}):
        form_post(o, o['path'] + '/sign-a1', files=files, data=data, status=422)
    _, another = certificate('Outra pessoa', '2.16.76.1.3.1', '0101199011111111111')
    form_post(o, o['path'] + '/sign-a1', files={'file': ('outra.pfx', another)},
       data={'password': 'senha-teste', 'consent': 'true'}, status=422)
    result = form_post(o, o['path'] + '/sign-a1', files=files,
                data={'password': 'senha-teste', 'consent': 'true'})
    assert result['signature_status'] == 'pending_validation'
    review = o['api'].get('/issued-documents/' + o['issued']['id'] + '/signatures')
    assert review['cryptographic_valid'] and len(review['signatures']) == 2
    assert review['revisions'][-1]['signer_cpf'] == CPF
    assert 'senha-teste' not in str(review)
    from app import models as m
    with SessionLocal() as db:
        assert db.query(m.FileRecord).filter(m.FileRecord.school_id == o['api'].school['id'],
                                             m.FileRecord.original_name.like('%.pfx')).count() == 0


def test_signing_unavailable_does_not_advertise_integration(online, monkeypatch):
    monkeypatch.delenv('GOVBR_SIGNATURE_ENABLED', raising=False)
    result = pc(online, 'GET', '/signing/methods')
    assert result == {'a1': True, 'govbr_integrated': False, 'a3': 'external_pdf',
                      'govbr_external_url': 'https://assinador.iti.br/'}
    assert online['api'].client.get('/api/v1/portal/signing/methods', headers={'Cookie': ''}).status_code == 401


def test_school_signs_general_document_once(signing_case):
    o, api = signing_case, signing_case['api']
    from app import models as m
    with SessionLocal() as db:
        original = db.get(m.IssuedDocument, o['issued']['id'])
        # Um documento genérico emitido usa o mesmo registro e preserva o original.
        doc = m.IssuedDocument(school_id=original.school_id, student_id=original.student_id,
            enrollment_id=original.enrollment_id, file_id=original.file_id, kind='declaration',
            created_by=original.created_by, snapshot={}, signature_status='unsigned')
        db.add(doc); db.commit(); document_id = doc.id
    listing = api.get('/issued-documents/signatures/unsigned')
    assert document_id in [row['document_id'] for row in listing['items']]
    signed = api.post('/issued-documents/' + document_id + '/sign/a1', {}, 200)
    repeated = api.post('/issued-documents/' + document_id + '/sign/a1', {}, 200)
    assert signed['file_id'] == repeated['file_id']
    assert api.get('/issued-documents/' + document_id + '/signatures')['cryptographic_valid']


def test_govbr_callback_single_use_and_pdf_revision(signing_case, monkeypatch):
    from app import personal_signing as module
    from app.govbr_signing import GovBRConfig
    from app.pdf_signing import sign_pdf_pfx
    o = signing_case
    login = GovBRLoginConfig('login-client', 'login-secret', 'https://sso.staging.acesso.gov.br',
                            'https://escola.edu.br/api/v1/portal/signing/govbr/callback')
    config = GovBRConfig(True, True, True, 'sign-client', 'sign-secret', login.redirect_uri,
                        'https://cas.staging.iti.br/oauth2.0', 'https://assinatura-api.staging.iti.br')
    monkeypatch.setattr(module, 'configuration', lambda: (config, login))
    async def identity(*args): return CPF
    async def exchange(*args): return 'server-only-token'
    async def sign(source, *args):
        return await asyncio.to_thread(sign_pdf_pfx, source, o['pfx'], 'senha-teste', 'GovBr_Ensaio')
    monkeypatch.setattr(module.GovBRLoginClient, 'identity', identity)
    monkeypatch.setattr(module.GovBRSigningClient, 'exchange_code', exchange)
    monkeypatch.setattr(module, 'sign_pdf_with_govbr', sign)
    started = form_post(o, o['path'] + '/sign-govbr', data={'consent': 'true'})
    query = parse_qs(urlsplit(started['authorization_url']).query)
    assert query['code_challenge_method'] == ['S256']
    old_state = query['state'][0]
    callback = '/api/v1/portal/signing/govbr/callback'
    # Navegador não envia cookie SameSite=Strict ao retornar do GOV.BR.
    portal_cookie = o['parent'].cookies.get('pige_portal')
    o['parent'].cookies.delete('pige_portal', domain='testserver.local', path='/api/v1/portal')
    response = o['parent'].get(callback, params={'state': old_state, 'code': 'login-code'}, follow_redirects=False)
    assert response.status_code == 303, response.text
    new_state = parse_qs(urlsplit(response.headers['location']).query)['state'][0]
    assert new_state != old_state
    assert o['parent'].get(callback, params={'state': old_state, 'code': 'replay'}).status_code == 409
    response = o['parent'].get(callback, params={'state': new_state, 'code': 'sign-code'}, follow_redirects=False)
    assert response.status_code == 303, response.text
    returned = o['parent'].get(response.headers['location'])
    assert returned.status_code == 200 and 'Contrato assinado' in returned.text
    o['parent'].cookies.set('pige_portal', portal_cookie, domain='testserver.local', path='/api/v1/portal')
    status = pc(o, 'GET', '/signing/sessions/' + started['session_id'])
    assert status['status'] == 'completed', status
    assert o['parent'].get(callback, params={'state': new_state, 'code': 'replay'}).status_code == 409
    review = o['api'].get('/issued-documents/' + o['issued']['id'] + '/signatures')
    assert review['cryptographic_valid'] and len(review['signatures']) == 2
    with SessionLocal() as db:
        row = db.get(GovBRSignatureSession, started['session_id'])
        assert row.encrypted_pkce == '' and row.phase == 'completed'


def test_login_unico_validates_signature_nonce_audience_and_level():
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    import json
    public = json.loads(jwt.algorithms.RSAAlgorithm.to_jwk(key.public_key()))
    public.update({'kid': 'official-test', 'use': 'sig'})
    config = GovBRLoginConfig('client', 'secret', 'https://sso.staging.acesso.gov.br', 'https://escola.edu.br/callback')
    nonce, verifier = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
    claims = {'sub': CPF, 'aud': config.client_id, 'iss': config.base_url + '/',
              'exp': now() + timedelta(seconds=60), 'iat': now(), 'nonce': nonce,
              'reliability_info': {'level': 'silver'}}
    async def scenario(overrides, valid):
        token = jwt.encode({**claims, **overrides}, key, algorithm='RS256', headers={'kid': 'official-test'})
        def handler(request):
            if request.url.path == '/jwk': return httpx.Response(200, json={'keys': [public]})
            assert b'code_verifier=' in request.content
            assert request.headers['authorization'].startswith('Basic ')
            return httpx.Response(200, json={'id_token': token})
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http:
            client = GovBRLoginClient(config, http)
            if valid: assert await client.identity('code', nonce, verifier) == CPF
            else:
                with pytest.raises(GovBRSigningError): await client.identity('code', nonce, verifier)
    asyncio.run(scenario({}, True))
    for overrides in ({'nonce': 'wrong'}, {'aud': 'other'}, {'reliability_info': {'level': 'bronze'}},
                      {'iss': 'https://evil.example/'}, {'exp': now() - timedelta(minutes=1)}):
        asyncio.run(scenario(overrides, False))


def test_expired_and_foreign_browser_session_cannot_reuse_oauth(signing_case):
    from app import models as m
    o = signing_case
    state = secrets.token_urlsafe(32)
    with SessionLocal() as db:
        session = db.query(m.PortalSession).filter_by(account_id=o['account']['id']).first()
        row = GovBRSignatureSession(school_id=o['api'].school['id'], account_id=o['account']['id'],
            portal_session_id=session.id, admission_id=o['admission']['id'],
            issued_document_id=o['issued']['id'], state_hash=hashlib.sha256(state.encode()).hexdigest(),
            browser_token_hash=hashlib.sha256(b'test-browser-only').hexdigest(),
            nonce=secrets.token_urlsafe(32), encrypted_pkce='', source_sha256='0' * 64,
            expected_cpf=CPF, phase='login', expires_at=now() - timedelta(seconds=1), message='')
        db.add(row); db.commit(); row_id = row.id
    callback = '/api/v1/portal/signing/govbr/callback'
    response = o['parent'].get(callback, params={'state': state, 'code': 'expired'})
    assert response.status_code == 409
    assert pc(o, 'GET', '/signing/sessions/' + row_id)['status'] == 'expired'
    with SessionLocal() as db:
        row = db.get(GovBRSignatureSession, row_id)
        row.expires_at = now() + timedelta(minutes=1)
        db.commit()
    assert o['api'].client.get(callback, params={'state': state, 'code': 'other-browser'},
                                headers={'Cookie': ''}).status_code == 401
