"""Assinatura PDF incremental e verificação local, sem reter chaves privadas.

Validação criptográfica e confiança na cadeia são resultados distintos. A
verificação local não substitui o VALIDAR/ITI para uma decisão jurídica final.
"""

import hashlib
import io
from pathlib import Path

from asn1crypto import pem, x509
from pyhanko.pdf_utils.incremental_writer import IncrementalPdfFileWriter
from pyhanko.pdf_utils.reader import PdfFileReader
from pyhanko.sign import signers, validation
from pyhanko.sign.diff_analysis.policy_api import ModificationLevel
from pyhanko.sign.fields import SigSeedSubFilter
from pyhanko.sign.validation.status import SignatureCoverageLevel
from pyhanko_certvalidator import ValidationContext


class InvalidPdfSignature(ValueError):
    pass


def trust_roots(directory: Path | None) -> list[x509.Certificate]:
    """Carrega somente âncoras instaladas pelo administrador da escola."""
    if directory is None or not directory.is_dir():
        return []
    result = []
    for path in sorted(directory.iterdir()):
        if not path.is_file() or path.suffix.lower() not in {'.pem', '.crt', '.cer', '.der'}:
            continue
        if len(result) >= 30 or path.stat().st_size > 128 * 1024:
            raise InvalidPdfSignature('Repositório de certificados de confiança acima do limite.')
        data = path.read_bytes()
        try:
            if pem.detect(data):
                for _, _, cert_data in pem.unarmor(data, multiple=True):
                    result.append(x509.Certificate.load(cert_data))
            else:
                result.append(x509.Certificate.load(data))
        except (ValueError, TypeError) as exc:
            raise InvalidPdfSignature('Certificado de confiança inválido.') from exc
    return result


def sign_pdf_pfx(source: bytes, pfx: bytes, password: str, field_name: str) -> bytes:
    """Assina por atualização incremental. PFX e senha permanecem só na memória da requisição."""
    if len(pfx) > 1024 * 1024 or not pfx or len(password) > 256:
        raise InvalidPdfSignature('Certificado ou senha acima do limite.')
    try:
        signer = signers.SimpleSigner.load_pkcs12_data(
            pfx, other_certs=(), passphrase=password.encode('utf-8')
        )
        if signer is None:
            raise InvalidPdfSignature('Não foi possível abrir o certificado com essa senha.')
        output = signers.sign_pdf(
            IncrementalPdfFileWriter(io.BytesIO(source)),
            signers.PdfSignatureMetadata(
                field_name=field_name, md_algorithm='sha256',
                subfilter=SigSeedSubFilter.PADES,
                certify=False, reason='Assinatura de documento escolar',
            ),
            signer=signer,
        )
        signed = output.getvalue()
    except InvalidPdfSignature:
        raise
    except (ValueError, TypeError, KeyError) as exc:
        raise InvalidPdfSignature('Certificado inválido ou PDF não pode ser assinado.') from exc
    if not signed.startswith(source):
        raise InvalidPdfSignature('A assinatura não preservou o PDF original.')
    return signed


def inspect_signatures(data: bytes, *, roots: list[x509.Certificate] | None = None) -> dict:
    """Rejeita alteração do conteúdo após assinatura; avalia todas as assinaturas."""
    try:
        reader = PdfFileReader(io.BytesIO(data), strict=True)
        signatures = reader.embedded_regular_signatures
        if not signatures or len(signatures) > 16:
            raise InvalidPdfSignature('PDF sem assinatura verificável ou acima do limite.')
        known_fields = {item.field_name for item in signatures}
        context = ValidationContext(trust_roots=roots or [], allow_fetching=False)
        results = []
        for index, item in enumerate(signatures):
            status = validation.validate_pdf_signature(item, signer_validation_context=context)
            expected_coverage = (
                SignatureCoverageLevel.ENTIRE_FILE if index == len(signatures) - 1
                else SignatureCoverageLevel.ENTIRE_REVISION
            )
            diff = status.diff_result
            changed_fields = set(getattr(diff, 'changed_form_fields', set()) or ())
            safe_changes = changed_fields.issubset(known_fields)
            if (
                not status.intact or not status.valid or not status.docmdp_ok
                or status.coverage != expected_coverage
                or status.modification_level is None
                or status.modification_level > ModificationLevel.FORM_FILLING
                or not safe_changes
            ):
                raise InvalidPdfSignature('PDF alterado ou assinatura criptográfica inválida.')
            cert = item.signer_cert
            results.append({
                'field': item.field_name,
                'signer': cert.subject.human_friendly[:240],
                'certificate_sha256': hashlib.sha256(cert.dump()).hexdigest(),
                'cryptographic_valid': True,
                'chain_trusted': bool(roots and status.trusted),
            })
        return {
            'cryptographic_valid': True,
            'chain_trusted': bool(roots) and all(x['chain_trusted'] for x in results),
            'trust_status': 'chain_trusted_offline' if roots and all(x['chain_trusted'] for x in results) else 'pending_authoritative_validation',
            'revocation_checked': False,
            'signatures': results,
        }
    except InvalidPdfSignature:
        raise
    except Exception as exc:
        raise InvalidPdfSignature('Não foi possível verificar as assinaturas do PDF.') from exc
