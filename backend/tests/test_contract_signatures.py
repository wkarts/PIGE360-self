"""Assinatura automática A1, cadeia incremental e conferência do responsável."""

import io
from datetime import UTC, datetime, timedelta

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.serialization import pkcs12
from reportlab.pdfgen import canvas


def certificate(name, oid, identifier):
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    subject = x509.Name([x509.NameAttribute(x509.NameOID.COMMON_NAME, name)])
    encoded = identifier.encode('ascii')
    cert = (x509.CertificateBuilder().subject_name(subject).issuer_name(subject)
            .public_key(key.public_key()).serial_number(x509.random_serial_number())
            .not_valid_before(datetime.now(UTC) - timedelta(days=1))
            .not_valid_after(datetime.now(UTC) + timedelta(days=30))
            .add_extension(x509.BasicConstraints(ca=True, path_length=None), critical=True)
            .add_extension(x509.SubjectAlternativeName([
                x509.OtherName(x509.ObjectIdentifier(oid), bytes([0x16, len(encoded)]) + encoded)
            ]), critical=False)
            .sign(key, hashes.SHA256()))
    pfx = pkcs12.serialize_key_and_certificates(
        name.encode('utf-8'), key, cert, None,
        serialization.BestAvailableEncryption(b'senha-teste')
    )
    return cert, pfx


def blank_pdf():
    output = io.BytesIO()
    page = canvas.Canvas(output)
    page.drawString(30, 800, 'Relatorio de validacao de assinatura - TESTE')
    page.save()
    return output.getvalue()


def test_incremental_signatures_reject_rewrites_and_tamper():
    from app.pdf_signing import InvalidPdfSignature, inspect_signatures, sign_pdf_pfx
    from asn1crypto.x509 import Certificate
    first_cert, first_pfx = certificate('Escola Teste', '2.16.76.1.3.3', '12345678000190')
    second_cert, second_pfx = certificate('Responsavel Teste', '2.16.76.1.3.1', '0101199012345678901')
    original = blank_pdf()
    school_pdf = sign_pdf_pfx(original, first_pfx, 'senha-teste', 'Escola')
    signed = sign_pdf_pfx(school_pdf, second_pfx, 'senha-teste', 'Responsavel')
    roots = [Certificate.load(cert.public_bytes(serialization.Encoding.DER))
             for cert in (first_cert, second_cert)]
    verified = inspect_signatures(signed, roots=roots)
    assert signed.startswith(school_pdf) and school_pdf.startswith(original)
    assert verified['cryptographic_valid'] and verified['chain_trusted']
    assert len(verified['signatures']) == 2
    unconfigured = inspect_signatures(signed, roots=[])
    assert unconfigured['cryptographic_valid'] and not unconfigured['chain_trusted']
    tampered = bytearray(signed)
    tampered[200] ^= 1
    import pytest
    with pytest.raises(InvalidPdfSignature):
        inspect_signatures(bytes(tampered), roots=roots)


def test_a1_automatic_issuance_portal_reimport_and_review(api, tmp_path, monkeypatch):
    from app.config import settings
    from app.contract_signatures import contract_signature_ready, SchoolSigningCertificate
    from app.db import SessionLocal
    from app import models as m
    from app.pdf_signing import sign_pdf_pfx
    with SessionLocal() as db:
        company = db.get(m.Company, api.school['company_id'])
        school_cnpj = ''.join(char for char in (company.document or '') if char.isdigit()) or '12345678000190'
    school_cert, school_pfx = certificate('Escola Teste', '2.16.76.1.3.3', school_cnpj)
    guardian_cert, guardian_pfx = certificate('Responsavel Teste', '2.16.76.1.3.1',
                                               '010119901234567890100000000000')
    root_dir = tmp_path / 'roots'
    root_dir.mkdir()
    for index, cert in enumerate((school_cert, guardian_cert)):
        (root_dir / f'root-{index}.pem').write_bytes(cert.public_bytes(serialization.Encoding.PEM))
    monkeypatch.setattr(settings(), 'signature_trust_roots_dir', root_dir)
    year = api.catalogs(year='2027')
    student = api.student('Aluno do Contrato Assinado')
    guardian = api.guardian(student, 'Responsavel Teste')
    enrollment = api.enroll(student, year['group'])
    template = api.post('/document-templates', {
        'name': 'Contrato para assinaturas', 'kind': 'educational_contract',
        'body': 'Contrato de {{aluno.nome}} com {{escola.nome}}.',
        'academic_year_id': year['year']['id'], 'require_signature': True,
    })
    path = f"/document-templates/{template['id']}/issue"
    assert api.post(path, {'enrollment_id': enrollment['id']}, 409)
    bad = api.client.put(api.base + '/signing-certificate/a1', headers=api.headers,
                         files={'file': ('escola.p12', school_pfx)},
                         data={'password': 'senha-incorreta'})
    assert bad.status_code == 422
    person_cert = api.client.put(api.base + '/signing-certificate/a1', headers=api.headers,
                                 files={'file': ('pessoa.p12', guardian_pfx)},
                                 data={'password': 'senha-teste'})
    assert person_cert.status_code == 422
    configured = api.client.put(api.base + '/signing-certificate/a1', headers=api.headers,
                                files={'file': ('escola.p12', school_pfx)},
                                data={'password': 'senha-teste'})
    assert configured.status_code == 200, configured.text
    assert 'encrypted_credentials' not in configured.json()
    assert api.get('/signing-certificate/a1')['configured'] is True
    with SessionLocal() as db:
        secret = db.query(SchoolSigningCertificate).filter_by(school_id=api.school['id']).one()
        assert 'senha-teste' not in secret.encrypted_credentials
    issued = api.post(path, {'enrollment_id': enrollment['id'],
                             'idempotency_key': 'contrato-assinado-2027'})
    assert issued['signature_status'] == 'company_signed'
    status = api.get(f"/issued-documents/{issued['id']}/signatures")
    assert status['signature_valid'] and len(status['signatures']) == 1
    listed = api.get('/students/' + student['id'] + '/documents')['issued'][0]
    assert listed['current_file_id'] == status['file_id'] != listed['file_id']
    first = api.client.get(api.base + f"/files/{status['file_id']}/download", headers=api.headers)
    assert first.status_code == 200
    with SessionLocal() as db:
        row = db.get(m.IssuedDocument, issued['id'])
        assert not contract_signature_ready(db, row, '12345678901')
    guardian_pdf = sign_pdf_pfx(first.content, guardian_pfx, 'senha-teste', 'Responsavel')
    upload_path = f"/issued-documents/{issued['id']}/signed-external"
    rewritten = api.client.post(api.base + upload_path, headers=api.headers,
                                files={'file': ('documento.pdf', guardian_pdf[20:])})
    assert rewritten.status_code == 422
    uploaded = api.client.post(api.base + upload_path, headers=api.headers,
                               files={'file': ('documento.pdf', guardian_pdf)})
    assert uploaded.status_code == 201, uploaded.text
    assert uploaded.json()['revision']['signature_count'] == 2
    assert uploaded.json()['revision']['signer_cpf'] == '12345678901'
    assert uploaded.json()['verification']['cryptographic_valid']
    again = api.client.post(api.base + upload_path, headers=api.headers,
                            files={'file': ('documento.pdf', guardian_pdf)})
    assert again.status_code == 201 and again.json()['revision']['id'] == uploaded.json()['revision']['id']
    with SessionLocal() as db:
        row = db.get(m.IssuedDocument, issued['id'])
        assert not contract_signature_ready(db, row, '12345678901')
    report = blank_pdf()
    reviewed = api.client.post(api.base + f"/issued-documents/{issued['id']}/validate-signature",
                               headers=api.headers, data={
                                   'signer_cpf': '12345678901',
                                   'validation_reference': 'ITI-TEST-001',
                               }, files={'report': ('validar.pdf', report)})
    assert reviewed.status_code == 200, reviewed.text
    assert reviewed.json()['signature_status'] == 'verified'
    listed = api.get('/students/' + student['id'] + '/documents')['issued'][0]
    assert listed['current_file_id'] == uploaded.json()['revision']['file_id']
    with SessionLocal() as db:
        row = db.get(m.IssuedDocument, issued['id'])
        assert contract_signature_ready(db, row, '12345678901')
        assert not contract_signature_ready(db, row, '00000000000')
        from app.contract_signatures import IssuedDocumentSignature
        current = db.query(IssuedDocumentSignature).filter_by(
            issued_document_id=issued['id'], source='external_portal').one()
        current.sha256 = '0' * 64
        db.flush()
        assert not contract_signature_ready(db, row, '12345678901')
        db.rollback()
    second_student = api.student('Outro Aluno do Contrato')
    second_enrollment = api.enroll(second_student, year['group'])
    second = api.post(path, {'enrollment_id': second_enrollment['id']})
    second_status = api.get(f"/issued-documents/{second['id']}/signatures")
    school_pdf = api.client.get(api.base + f"/files/{second_status['file_id']}/download",
                                headers=api.headers).content
    first_try = sign_pdf_pfx(school_pdf, guardian_pfx, 'senha-teste', 'ResponsavelPrimeiraVia')
    uploaded = api.client.post(api.base + f"/issued-documents/{second['id']}/signed-external",
                               headers=api.headers, files={'file': ('documento.pdf', first_try)})
    assert uploaded.status_code == 201
    rejected = api.client.post(api.base + f"/issued-documents/{second['id']}/reject-signature",
                               headers=api.headers, data={'reason': 'Relatório externo rejeitou esta via.'})
    assert rejected.status_code == 200, rejected.text
    assert rejected.json()['download_file_id'] == second_status['file_id']
    second_status = api.get(f"/issued-documents/{second['id']}/signatures")
    assert second_status['status'] == 'rejected' and second_status['file_id'] == rejected.json()['download_file_id']
    rejected_repeat = api.client.post(api.base + f"/issued-documents/{second['id']}/signed-external",
                                      headers=api.headers, files={'file': ('documento.pdf', first_try)})
    assert rejected_repeat.status_code == 409
    second_try = sign_pdf_pfx(school_pdf, guardian_pfx, 'senha-teste', 'ResponsavelViaCorrigida')
    retried = api.client.post(api.base + f"/issued-documents/{second['id']}/signed-external",
                              headers=api.headers, files={'file': ('documento.pdf', second_try)})
    assert retried.status_code == 201, retried.text
    assert retried.json()['revision']['signature_count'] == 2
    assert retried.json()['revision']['previous_sha256'] == second_status['revisions'][0]['sha256']
    assert guardian['id']
