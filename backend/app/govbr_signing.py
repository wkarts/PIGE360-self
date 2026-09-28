"""Cliente opcional da API oficial de Assinatura Eletrônica GOV.BR.

Este módulo não registra rotas públicas. A instituição precisa ter a integração
do Login Único homologada, elegibilidade e credenciais próprias liberadas pelo
ITI antes de ligar o fluxo. Nunca considere um retorno OAuth ou um PDF como
assinatura concluída antes da verificação criptográfica e persistência da revisão.
"""

import asyncio
import base64
import hashlib
import io
import os
import re
from dataclasses import dataclass
from urllib.parse import urlencode, urlsplit

import httpx
from asn1crypto import cms, pem, x509
from pyhanko.pdf_utils.incremental_writer import IncrementalPdfFileWriter
from pyhanko.pdf_utils.reader import PdfFileReader
from pyhanko.sign import signers
from pyhanko.sign.fields import SigSeedSubFilter

from .pdf_signing import InvalidPdfSignature, inspect_signatures


class GovBRSigningError(ValueError):
    """A integração está indisponível ou a operação não gerou assinatura válida."""


@dataclass(frozen=True)
class GovBRConfig:
    enabled: bool
    approved_public_service: bool
    login_unico_ready: bool
    client_id: str
    client_secret: str
    redirect_uri: str
    oauth_base_url: str
    signature_api_base_url: str

    @classmethod
    def from_environment(cls):
        """Produção exige URLs e credenciais oficiais fornecidas ao órgão.

        URLs de staging são usadas apenas quando explicitamente configuradas.
        Não existe credencial pública de produção nem URL de retorno genérica.
        """
        return cls(
            enabled=os.getenv('GOVBR_SIGNATURE_ENABLED') == 'true',
            approved_public_service=os.getenv('GOVBR_PUBLIC_SERVICE_APPROVED') == 'true',
            login_unico_ready=os.getenv('GOVBR_LOGIN_UNICO_READY') == 'true',
            client_id=os.getenv('GOVBR_SIGNATURE_CLIENT_ID', ''),
            client_secret=os.getenv('GOVBR_SIGNATURE_CLIENT_SECRET', ''),
            redirect_uri=os.getenv('GOVBR_SIGNATURE_REDIRECT_URI', ''),
            oauth_base_url=os.getenv('GOVBR_SIGNATURE_OAUTH_BASE_URL', ''),
            signature_api_base_url=os.getenv('GOVBR_SIGNATURE_API_BASE_URL', ''),
        )

    def require_available(self):
        if not all((self.enabled, self.approved_public_service,
                    self.login_unico_ready, self.client_id, self.client_secret,
                    self.redirect_uri, self.oauth_base_url,
                    self.signature_api_base_url)):
            raise GovBRSigningError('Assinatura GOV.BR não habilitada para esta instalação.')
        for url in (self.oauth_base_url, self.signature_api_base_url):
            parsed = urlsplit(url)
            if (parsed.scheme != 'https' or not parsed.hostname or
                    not (parsed.hostname == 'iti.br' or parsed.hostname.endswith('.iti.br')) or
                    parsed.username or parsed.password or parsed.port or
                    parsed.query or parsed.fragment):
                raise GovBRSigningError('Endpoint da assinatura GOV.BR inválido.')
        redirect = urlsplit(self.redirect_uri)
        if (redirect.scheme != 'https' or not redirect.hostname or
                redirect.username or redirect.password or redirect.fragment):
            raise GovBRSigningError('URL de retorno GOV.BR deve usar HTTPS.')


class GovBRSigningClient:
    def __init__(self, config: GovBRConfig, http: httpx.AsyncClient):
        config.require_available()
        self.config = config
        self.http = http

    def authorization_url(self, *, state: str, nonce: str, login_unico_verified: bool) -> str:
        """state/nonce devem ser gerados e persistidos pelo fluxo autenticado.

        O callback deve conferir state em tempo constante e consumi-lo uma vez,
        vinculado ao responsável, CPF, matrícula, PDF exato e prazo de 10 min.
        """
        if not login_unico_verified:
            raise GovBRSigningError('É preciso validar previamente o Login Único GOV.BR.')
        if not (re.fullmatch(r'[A-Za-z0-9_-]{32,128}', state) and
                re.fullmatch(r'[A-Za-z0-9_-]{32,128}', nonce)):
            raise GovBRSigningError('Estado OAuth inválido.')
        query = urlencode({
            'response_type': 'code', 'client_id': self.config.client_id,
            'redirect_uri': self.config.redirect_uri, 'scope': 'sign govbr',
            'state': state, 'nonce': nonce,
        })
        return self.config.oauth_base_url.rstrip('/') + '/authorize?' + query

    async def _request(self, method: str, url: str, *, limit: int, **kwargs) -> httpx.Response:
        try:
            response = await self.http.request(method, url, follow_redirects=False,
                                               timeout=15, **kwargs)
            response.raise_for_status()
            if len(response.content) > limit:
                raise GovBRSigningError('Resposta GOV.BR acima do limite.')
            return response
        except httpx.HTTPStatusError as exc:
            # Nunca incluir body, code OAuth ou Authorization em logs/erros.
            raise GovBRSigningError(f'API GOV.BR recusou a operação ({exc.response.status_code}).') from exc
        except httpx.RequestError as exc:
            raise GovBRSigningError('Serviço de assinatura GOV.BR indisponível.') from exc

    async def exchange_code(self, code: str) -> str:
        if not code or len(code) > 2048:
            raise GovBRSigningError('Código OAuth inválido.')
        result = await self._request('POST', self.config.oauth_base_url.rstrip('/') + '/token',
                                     limit=4096, data={
            'grant_type': 'authorization_code', 'client_id': self.config.client_id,
            'client_secret': self.config.client_secret,
            'redirect_uri': self.config.redirect_uri, 'code': code,
        }, headers={'Content-Type': 'application/x-www-form-urlencoded'})
        try:
            payload = result.json()
            token = payload['access_token']
            if (not isinstance(token, str) or not 10 <= len(token) <= 4096 or
                    str(payload.get('token_type', 'bearer')).lower() != 'bearer'):
                raise ValueError('token')
            return token
        except (ValueError, TypeError, KeyError) as exc:
            raise GovBRSigningError('Resposta OAuth inválida.') from exc

    async def public_certificate(self, token: str) -> x509.Certificate:
        result = await self._request(
            'GET', self.config.signature_api_base_url.rstrip('/') + '/externo/v2/certificadoPublico',
            limit=64 * 1024, headers={'Authorization': f'Bearer {token}'},
        )
        try:
            _, _, cert_der = pem.unarmor(result.content)
            return x509.Certificate.load(cert_der)
        except (ValueError, TypeError) as exc:
            raise GovBRSigningError('Certificado GOV.BR inválido.') from exc

    async def sign_digest(self, token: str, digest: bytes) -> cms.ContentInfo:
        if len(digest) != 32:
            raise GovBRSigningError('Hash SHA-256 inválido.')
        result = await self._request(
            'POST', self.config.signature_api_base_url.rstrip('/') + '/externo/v2/assinarPKCS7',
            limit=64 * 1024,
            headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
            json={'hashBase64': base64.b64encode(digest).decode('ascii')},
        )
        try:
            signed = cms.ContentInfo.load(result.content, strict=True)
            if signed['content_type'].native != 'signed_data':
                raise ValueError('not signed_data')
            data = signed['content']
            if data['encap_content_info']['content'].native is not None:
                raise ValueError('not detached')
            signers_info = data['signer_infos']
            if len(signers_info) != 1:
                raise ValueError('signer_count')
            attrs = signers_info[0]['signed_attrs']
            signed_digest = [a['values'][0].native for a in attrs
                             if a['type'].native == 'message_digest']
            if signed_digest != [digest]:
                raise ValueError('hash mismatch')
            return signed
        except (ValueError, TypeError, KeyError, IndexError) as exc:
            raise GovBRSigningError('PKCS#7 não corresponde ao hash enviado.') from exc


async def sign_pdf_with_govbr(source: bytes, client: GovBRSigningClient,
                              access_token: str, field_name: str) -> bytes:
    """Produz PAdES com ByteRange; verifica assinatura antes de devolver bytes.

    O access token de escopo sign é consumido uma única vez pelo serviço remoto.
    Quem chama deve persistir a revisão atomicamente e nunca tentar reutilizá-lo.
    """
    if not source.startswith(b'%PDF-') or len(source) > 50 * 1024 * 1024:
        raise GovBRSigningError('PDF de entrada inválido ou acima do limite.')
    if not re.fullmatch(r'[A-Za-z][A-Za-z0-9_]{2,63}', field_name):
        raise GovBRSigningError('Campo de assinatura inválido.')
    cert = await client.public_certificate(access_token)
    try:
        placeholder = signers.ExternalSigner(signing_cert=cert, cert_registry=None,
                                             signature_value=bytes(256))
        signer = signers.PdfSigner(
            signers.PdfSignatureMetadata(field_name=field_name, md_algorithm='sha256',
                                         subfilter=SigSeedSubFilter.PADES, certify=False,
                                         reason='Assinatura de contrato escolar'),
            signer=placeholder,
        )
        prepared, _, stream = await signer.async_digest_doc_for_signing(
            IncrementalPdfFileWriter(io.BytesIO(source)), bytes_reserved=128 * 1024,
        )
    except Exception as exc:
        raise GovBRSigningError('PDF não pode ser preparado para assinatura.') from exc
    signed = await client.sign_digest(access_token, prepared.document_digest)
    try:
        prepared.fill_with_cms(stream, signed)
        data = stream.getvalue()
        if not data.startswith(source):
            raise InvalidPdfSignature('A revisão não preserva o PDF da escola.')
        result = await asyncio.to_thread(inspect_signatures, data)
        if not result['cryptographic_valid']:
            raise InvalidPdfSignature('Assinatura inválida.')
        actual = PdfFileReader(io.BytesIO(data)).embedded_regular_signatures[-1].signer_cert
        if hashlib.sha256(actual.dump()).digest() != hashlib.sha256(cert.dump()).digest():
            raise InvalidPdfSignature('Certificado de assinatura não corresponde ao autorizado.')
        return data
    except (InvalidPdfSignature, ValueError, TypeError) as exc:
        raise GovBRSigningError('A API não produziu um PDF assinado verificável.') from exc
