"""Âncoras públicas versionadas, independentes de certificados enviados pelo usuário."""
import hashlib
import json
from pathlib import Path

from asn1crypto import x509 as asn1_x509
from cryptography import x509
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import serialization

from .pdf_signing import InvalidPdfSignature, trust_roots

BUNDLE_DIR = Path(__file__).parent / 'trust' / 'icp-brasil'


def bundled_trust_roots() -> list[asn1_x509.Certificate]:
    """Confere o pacote revisado na release; nunca baixa nem confia em raiz do PFX."""
    try:
        manifest = json.loads((BUNDLE_DIR / 'manifest.json').read_text(encoding='utf-8'))
        entries = manifest['certificates']
        if manifest['schema_version'] != 1 or not 1 <= len(entries) <= 30:
            raise ValueError('Manifesto inválido')
        result = []
        fingerprints = set()
        for entry in entries:
            name = entry['file']
            if Path(name).name != name or not name.endswith('.pem'):
                raise ValueError('Nome de certificado inválido')
            data = (BUNDLE_DIR / name).read_bytes()
            if len(data) > 128 * 1024:
                raise ValueError('Certificado acima do limite')
            cert = x509.load_pem_x509_certificate(data)
            der = cert.public_bytes(serialization.Encoding.DER)
            digest = hashlib.sha256(der).hexdigest()
            if digest != entry['sha256_der'] or digest in fingerprints:
                raise ValueError('Fingerprint divergente ou repetido')
            if cert.subject != cert.issuer or not cert.extensions.get_extension_for_class(x509.BasicConstraints).value.ca:
                raise ValueError('O pacote deve conter apenas raízes')
            if not cert.extensions.get_extension_for_class(x509.KeyUsage).value.key_cert_sign:
                raise ValueError('Raiz sem uso de certificação')
            cert.verify_directly_issued_by(cert)
            fingerprints.add(digest)
            result.append(asn1_x509.Certificate.load(der))
        return result
    except (OSError, ValueError, TypeError, KeyError, InvalidSignature, x509.ExtensionNotFound) as exc:
        raise InvalidPdfSignature('Pacote de confiança ICP-Brasil ausente ou inválido. Atualize a aplicação.') from exc


def signature_trust_roots(directory: Path | None) -> list[asn1_x509.Certificate]:
    """Preserva âncoras administradas e backups, sem escrever em /data/trust-roots."""
    result = {}
    for cert in [*bundled_trust_roots(), *trust_roots(directory)]:
        result.setdefault(hashlib.sha256(cert.dump()).digest(), cert)
    return list(result.values())
