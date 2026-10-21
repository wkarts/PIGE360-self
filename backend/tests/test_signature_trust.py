"""Âncoras empacotadas e regressões de confiança A1 sem certificado real privado.

Os testes positivos de upload usam exclusivamente uma AC e um PFX sintéticos,
substituindo o provedor de roots oficiais. Não demonstram emissão ICP-Brasil real.
"""

import hashlib
import json
import shutil

import pytest
from cryptography import x509
from cryptography.hazmat.primitives import serialization

from test_fiscal_signing import CNPJ, PASSWORD, fixture_certificate


def _bundle_files(directory):
    return sorted(path for path in directory.iterdir()
                  if path.suffix.lower() in {'.pem', '.crt', '.cer', '.der'})


def test_official_bundle_integrity_and_root_identity():
    from app.signature_trust import BUNDLE_DIR, bundled_trust_roots

    roots = bundled_trust_roots()
    assert roots, 'A instalação limpa precisa incluir âncoras oficiais.'
    assert len({root.dump() for root in roots}) == len(roots)
    manifest = json.dumps(json.loads((BUNDLE_DIR / 'manifest.json').read_text()))
    for root in roots:
        cert = x509.load_der_x509_certificate(root.dump())
        assert cert.subject == cert.issuer
        assert cert.extensions.get_extension_for_class(x509.BasicConstraints).value.ca
        assert 'ICP-Brasil' in cert.subject.rfc4514_string()
        cert.verify_directly_issued_by(cert)
        assert hashlib.sha256(root.dump()).hexdigest() in manifest


@pytest.mark.parametrize('damage', ['missing_bundle', 'missing_manifest', 'bad_manifest',
                                    'missing_certificate', 'bad_certificate', 'replaced_certificate'])
def test_official_bundle_missing_or_corrupt_fails_closed(tmp_path, monkeypatch, damage):
    from app import signature_trust
    from app.pdf_signing import InvalidPdfSignature

    bundle = tmp_path / 'bundle'
    if damage != 'missing_bundle':
        shutil.copytree(signature_trust.BUNDLE_DIR, bundle)
        manifest = bundle / 'manifest.json'
        certificates = _bundle_files(bundle)
        assert certificates
        if damage == 'missing_manifest':
            manifest.unlink()
        elif damage == 'bad_manifest':
            manifest.write_text('{invalid JSON')
        elif damage == 'missing_certificate':
            certificates[0].unlink()
        elif damage == 'bad_certificate':
            certificates[0].write_bytes(b'not a certificate')
        elif damage == 'replaced_certificate':
            # Uma CA válida sintética não pode substituir uma root oficial pinada.
            _, _, roots = fixture_certificate()
            replacement = x509.load_der_x509_certificate(roots[0].dump())
            certificates[0].write_bytes(replacement.public_bytes(serialization.Encoding.PEM))
    monkeypatch.setattr(signature_trust, 'BUNDLE_DIR', bundle)
    with pytest.raises(InvalidPdfSignature):
        signature_trust.bundled_trust_roots()


@pytest.mark.parametrize('directory_state', ['none', 'missing', 'empty'])
def test_bundled_roots_do_not_require_custom_directory(tmp_path, directory_state):
    from app.signature_trust import bundled_trust_roots, signature_trust_roots

    directory = None if directory_state == 'none' else tmp_path / 'custom'
    if directory_state == 'empty':
        directory.mkdir()
    assert {root.dump() for root in signature_trust_roots(directory)} == {
        root.dump() for root in bundled_trust_roots()}


def test_custom_roots_are_added_and_deduplicated(tmp_path):
    from app.signature_trust import bundled_trust_roots, signature_trust_roots

    official = bundled_trust_roots()
    _, _, synthetic = fixture_certificate()
    for filename, root in [('official.pem', official[0]), ('synthetic.pem', synthetic[0]),
                           ('synthetic-again.pem', synthetic[0])]:
        cert = x509.load_der_x509_certificate(root.dump())
        (tmp_path / filename).write_bytes(cert.public_bytes(serialization.Encoding.PEM))
    result = signature_trust_roots(tmp_path)
    expected = {root.dump() for root in official + synthetic}
    assert {root.dump() for root in result} == expected
    assert len(result) == len(expected)


def test_invalid_custom_root_is_not_ignored(tmp_path):
    from app.pdf_signing import InvalidPdfSignature
    from app.signature_trust import signature_trust_roots

    (tmp_path / 'invalid.pem').write_bytes(b'invalid custom root')
    with pytest.raises(InvalidPdfSignature):
        signature_trust_roots(tmp_path)


def test_custom_multi_pem_cannot_bypass_certificate_count_limit(tmp_path):
    from app.pdf_signing import InvalidPdfSignature, trust_roots

    _, _, roots = fixture_certificate()
    cert = x509.load_der_x509_certificate(roots[0].dump())
    pem = cert.public_bytes(serialization.Encoding.PEM)
    path = tmp_path / 'many-roots.pem'
    path.write_bytes(pem * 30)
    assert len(trust_roots(tmp_path)) == 30
    path.write_bytes(pem * 31)
    assert path.stat().st_size < 128 * 1024
    with pytest.raises(InvalidPdfSignature):
        trust_roots(tmp_path)


def test_fiscal_pfx_embedded_root_is_not_an_independent_trust_anchor(tmp_path):
    from app.fiscal_xml import InvalidFiscalXML, load_signer
    from app.signature_trust import signature_trust_roots

    _, pfx, _ = fixture_certificate()
    with pytest.raises(InvalidFiscalXML, match='cadeia de confiança'):
        load_signer(pfx, PASSWORD, roots=signature_trust_roots(tmp_path / 'absent'))


def _set_company_cnpj(api):
    from app import models as m
    from app.db import SessionLocal

    with SessionLocal() as db:
        db.get(m.Company, api.school['company_id']).document = CNPJ
        db.commit()


def _upload_a1(api, pfx):
    return api.client.put(api.base + '/signing-certificate/a1', headers=api.headers,
                          files={'file': ('synthetic.p12', pfx)}, data={'password': PASSWORD})


def test_pfx_embedded_untrusted_root_does_not_authorize_configuration(api, tmp_path, monkeypatch):
    from app.config import settings
    from app.contract_signatures import SchoolSigningCertificate
    from app.db import SessionLocal

    _set_company_cnpj(api)
    monkeypatch.setattr(settings(), 'signature_trust_roots_dir', tmp_path / 'absent')
    _, pfx, _ = fixture_certificate()  # PFX inclui a própria CA, não confiável.
    response = _upload_a1(api, pfx)
    assert response.status_code == 422, response.text
    with SessionLocal() as db:
        assert db.query(SchoolSigningCertificate).filter_by(school_id=api.school['id']).count() == 0


def test_synthetic_bundled_root_allows_configuration_without_custom_directory(api, tmp_path, monkeypatch):
    from app import signature_trust
    from app.config import settings

    _set_company_cnpj(api)
    _, pfx, roots = fixture_certificate()
    monkeypatch.setattr(signature_trust, 'bundled_trust_roots', lambda: roots)
    monkeypatch.setattr(settings(), 'signature_trust_roots_dir', tmp_path / 'absent')
    response = _upload_a1(api, pfx)
    assert response.status_code == 200, response.text
    assert 'encrypted_credentials' not in response.json()
    assert api.get('/signing-certificate/a1')['configured'] is True


def test_institutional_signature_rechecks_trust_before_persisting(api, tmp_path, monkeypatch):
    from app import models as m, signature_trust
    from app.config import settings
    from app.contract_signatures import IssuedDocumentSignature
    from app.db import SessionLocal

    _set_company_cnpj(api)
    _, pfx, synthetic_roots = fixture_certificate()
    official_roots = signature_trust.bundled_trust_roots()
    monkeypatch.setattr(signature_trust, 'bundled_trust_roots', lambda: synthetic_roots)
    monkeypatch.setattr(settings(), 'signature_trust_roots_dir', tmp_path / 'absent')
    response = _upload_a1(api, pfx)
    assert response.status_code == 200, response.text
    catalogs = api.catalogs()
    student = api.student('Aluno teste confiança institucional')
    enrollment = api.enroll(student, catalogs['group'])
    template = api.post('/document-templates', {
        'name': 'Declaração teste de confiança', 'kind': 'declaration',
        'body': 'Declaração de {{aluno.nome}}.', 'require_signature': False})
    issued = api.post('/document-templates/' + template['id'] + '/issue',
                      {'enrollment_id': enrollment['id']})
    assert issued['signature_status'] == 'unsigned'
    with SessionLocal() as db:
        before_files = db.query(m.FileRecord).filter_by(school_id=api.school['id']).count()
    # Retira a confiança sintética após cadastro; PFX continua contendo sua CA.
    monkeypatch.setattr(signature_trust, 'bundled_trust_roots', lambda: official_roots)
    response = api.client.post(api.base + '/issued-documents/' + issued['id'] + '/sign/a1',
                               headers=api.headers, json={})
    assert response.status_code == 422, response.text
    with SessionLocal() as db:
        assert db.query(IssuedDocumentSignature).filter_by(issued_document_id=issued['id']).count() == 0
        assert db.query(m.FileRecord).filter_by(school_id=api.school['id']).count() == before_files
        assert db.get(m.IssuedDocument, issued['id']).signature_status == 'unsigned'
