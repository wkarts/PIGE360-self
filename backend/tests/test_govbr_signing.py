"""Contrato da API ITI e montagem PAdES com provedor remoto emulado localmente."""

import asyncio
import base64
import io
import secrets
import unittest
from datetime import UTC, datetime, timedelta
from urllib.parse import parse_qs, urlsplit

import httpx
from cryptography import x509 as crypto_x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.serialization import pkcs12
from cryptography.x509.oid import NameOID
from pyhanko.sign import signers
from reportlab.pdfgen.canvas import Canvas

from app.govbr_signing import (
    GovBRConfig, GovBRSigningClient, GovBRSigningError, sign_pdf_with_govbr,
)
from app.pdf_signing import inspect_signatures, sign_pdf_pfx


def config(**overrides):
    params = {
        'enabled': True, 'approved_public_service': True,
        'login_unico_ready': True, 'client_id': 'school-public-service',
        'client_secret': 'server-secret',
        'redirect_uri': 'https://escola.edu.br/api/govbr/callback',
        'oauth_base_url': 'https://cas.staging.iti.br/oauth2.0',
        'signature_api_base_url': 'https://assinatura-api.staging.iti.br',
    }
    params.update(overrides)
    return GovBRConfig(**params)


def certificate():
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    cert = (crypto_x509.CertificateBuilder()
            .subject_name(crypto_x509.Name([crypto_x509.NameAttribute(NameOID.COMMON_NAME, 'Responsavel Teste')]))
            .issuer_name(crypto_x509.Name([crypto_x509.NameAttribute(NameOID.COMMON_NAME, 'Responsavel Teste')]))
            .public_key(key.public_key()).serial_number(crypto_x509.random_serial_number())
            .not_valid_before(datetime.now(UTC) - timedelta(days=1))
            .not_valid_after(datetime.now(UTC) + timedelta(days=7))
            .sign(key, hashes.SHA256()))
    pfx = pkcs12.serialize_key_and_certificates(b'govbr-test', key, cert, None,
                                                  serialization.BestAvailableEncryption(b'test-password'))
    return cert, pfx


class MockGovBRSigner:
    """Emula somente a operação PKCS#7; assinatura vem de uma chave efêmera."""

    def __init__(self, pfx):
        self.signer = signers.SimpleSigner.load_pkcs12_data(pfx, other_certs=(),
                                                            passphrase=b'test-password')
        self.hashes = []

    async def sign_digest(self, _token, digest):
        self.hashes.append(digest)
        return await self.signer.async_sign(digest, 'sha256', use_pades=True)

    def __init_certificate(self):
        return self.signer.signing_cert

    async def public_certificate(self, _token):
        return self.__init_certificate()


class GovBRSigningTests(unittest.TestCase):
    def test_disabled_and_unapproved_fail_closed(self):
        for changes in ({'enabled': False}, {'approved_public_service': False},
                        {'login_unico_ready': False}, {'client_secret': ''},
                        {'signature_api_base_url': 'https://evil.example'}):
            with self.subTest(changes=changes), self.assertRaises(GovBRSigningError):
                GovBRSigningClient(config(**changes), httpx.AsyncClient(transport=httpx.MockTransport(lambda request: httpx.Response(500))))

    def test_oauth_url_requires_login_and_state(self):
        async def run():
            async with httpx.AsyncClient(transport=httpx.MockTransport(lambda request: httpx.Response(500))) as http:
                client = GovBRSigningClient(config(), http)
                with self.assertRaises(GovBRSigningError):
                    client.authorization_url(state='short', nonce='short', login_unico_verified=True)
                with self.assertRaises(GovBRSigningError):
                    client.authorization_url(state=secrets.token_urlsafe(32),
                                             nonce=secrets.token_urlsafe(32), login_unico_verified=False)
                url = client.authorization_url(state='A' * 43, nonce='B' * 43,
                                               login_unico_verified=True)
                parsed = parse_qs(urlsplit(url).query)
                self.assertEqual(parsed['scope'], ['sign govbr'])
                self.assertEqual(parsed['state'], ['A' * 43])
                self.assertEqual(parsed['redirect_uri'], [config().redirect_uri])
        asyncio.run(run())

    def test_token_certificate_and_pkcs7_contract(self):
        cert, _ = certificate()
        requests = []

        def handler(request):
            requests.append(request)
            if request.url.path.endswith('/token'):
                self.assertIn(b'grant_type=authorization_code', request.content)
                return httpx.Response(200, json={'access_token': 'access-token-1234567',
                                                  'token_type': 'Bearer', 'expires_in': 600})
            if request.url.path.endswith('/certificadoPublico'):
                return httpx.Response(200, content=cert.public_bytes(serialization.Encoding.PEM))
            if request.url.path.endswith('/assinarPKCS7'):
                self.assertEqual(request.headers['authorization'], 'Bearer access-token-1234567')
                self.assertIn(base64.b64encode(b'0' * 32), request.content)
                return httpx.Response(403, content=b'Conta Bronze')
            raise AssertionError('rota inesperada')

        async def run():
            async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http:
                client = GovBRSigningClient(config(), http)
                token = await client.exchange_code('one-time-code')
                self.assertEqual(token, 'access-token-1234567')
                public = await client.public_certificate(token)
                self.assertEqual(public.dump(), cert.public_bytes(serialization.Encoding.DER))
                with self.assertRaisesRegex(GovBRSigningError, '403') as caught:
                    await client.sign_digest(token, b'0' * 32)
                self.assertNotIn('Bronze', str(caught.exception))
                with self.assertRaises(GovBRSigningError):
                    await client.sign_digest(token, b'short')
        asyncio.run(run())
        self.assertEqual(len(requests), 3)

    def test_pkcs7_digest_must_match_byte_range(self):
        _, pfx = certificate()
        signer = signers.SimpleSigner.load_pkcs12_data(pfx, other_certs=(),
                                                        passphrase=b'test-password')
        der = asyncio.run(signer.async_sign(b'0' * 32, 'sha256', use_pades=True)).dump()

        def handler(request):
            self.assertIn(b'hashBase64', request.content)
            return httpx.Response(200, content=der)

        async def run():
            async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http:
                client = GovBRSigningClient(config(), http)
                signed = await client.sign_digest('access-token', b'0' * 32)
                self.assertEqual(signed.dump(), der)
                with self.assertRaisesRegex(GovBRSigningError, 'hash'):
                    await client.sign_digest('access-token', b'1' * 32)
        asyncio.run(run())

    def test_remote_pkcs7_is_embedded_and_both_pdf_signatures_verify(self):
        school_cert, school_pfx = certificate()
        responsible_cert, responsible_pfx = certificate()
        pdf = io.BytesIO()
        canvas = Canvas(pdf)
        canvas.drawString(60, 730, 'Contrato escolar - ensaio de assinatura')
        canvas.save()
        company_pdf = sign_pdf_pfx(pdf.getvalue(), school_pfx, 'test-password', 'Escola_2027')
        gov = MockGovBRSigner(responsible_pfx)

        async def run():
            signed = await sign_pdf_with_govbr(company_pdf, gov, 'mock-token', 'Responsavel_2027')
            self.assertTrue(signed.startswith(company_pdf))
            self.assertEqual(len(gov.hashes), 1)
            self.assertEqual(len(gov.hashes[0]), 32)
            result = await asyncio.to_thread(inspect_signatures, signed)
            self.assertTrue(result['cryptographic_valid'])
            self.assertEqual(len(result['signatures']), 2)
            self.assertEqual(result['signatures'][0]['certificate_sha256'],
                             school_cert.fingerprint(hashes.SHA256()).hex())
            self.assertEqual(result['signatures'][1]['certificate_sha256'],
                             responsible_cert.fingerprint(hashes.SHA256()).hex())
        asyncio.run(run())


if __name__ == '__main__':
    unittest.main()
