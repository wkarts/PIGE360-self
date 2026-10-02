"""Assinatura XMLDSig de perfis fiscais explícitos, sem transmissão ao fisco.

SHA-1 é restrito aos perfis que o especificam (MOC 7/NFS-e 1.00); DPS 1.01
usa SHA-256. O algoritmo não é selecionável pelo cliente. Hashes de armazenamento usam SHA-256.
"""
import asyncio
import base64
import hmac
import re
from functools import lru_cache
from pathlib import Path

from asn1crypto import x509 as asn1_x509
from cryptography import x509
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.primitives.serialization import pkcs12
from lxml import etree
from pyhanko_certvalidator import CertificateValidator, ValidationContext

from .db import now

DS = 'http://www.w3.org/2000/09/xmldsig#'
C14N = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315'
NFE = 'http://www.portalfiscal.inf.br/nfe'
NFSE = 'http://www.sped.fazenda.gov.br/nfse'
LIMIT = 2 * 1024 * 1024
PROFILES = {
    'nfe_4': {'label': 'NF-e 4.00', 'namespace': NFE, 'root': 'NFe', 'target': 'infNFe', 'version': '4.00', 'model': '55'},
    'nfce_4': {'label': 'NFC-e 4.00', 'namespace': NFE, 'root': 'NFe', 'target': 'infNFe', 'version': '4.00', 'model': '65'},
    'nfse_dps_101': {'label': 'NFS-e — DPS nacional 1.01', 'namespace': NFSE, 'root': 'DPS', 'target': 'infDPS', 'version': '1.01'},
    'nfse_dps_1': {'label': 'NFS-e — DPS nacional 1.00 (legado)', 'namespace': NFSE, 'root': 'DPS', 'target': 'infDPS', 'version': '1.00'},
}


def _algorithm(profile):
    if profile == 'nfse_dps_101':
        return ('http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
                'http://www.w3.org/2001/04/xmlenc#sha256', hashes.SHA256())
    return DS + 'rsa-sha1', DS + 'sha1', hashes.SHA1()


def _digest_xml(element, profile):
    digest = hashes.Hash(_algorithm(profile)[2])
    digest.update(_canonical(element))
    return base64.b64encode(digest.finalize()).decode()


@lru_cache(maxsize=2)
def _signature_schema(version):
    # Schemas oficiais vendorizados; DTD/entidades externas nunca são resolvidas.
    parser = etree.XMLParser(resolve_entities=False, load_dtd=False, no_network=True)
    return etree.XMLSchema(etree.parse(str(Path(__file__).parent / 'fiscal_schemas' /
                                           f'nfse-{version}-xmldsig.xsd'), parser))


class InvalidFiscalXML(ValueError):
    pass


def _parse(source):
    if not source or len(source) > LIMIT:
        raise InvalidFiscalXML('Envie um XML de até 2 MB.')
    try:
        root = etree.fromstring(source, etree.XMLParser(
            resolve_entities=False, no_network=True, load_dtd=False, huge_tree=False,
            remove_blank_text=False, remove_comments=False, strip_cdata=False))
    except (etree.XMLSyntaxError, ValueError):
        raise InvalidFiscalXML('XML inválido. Confira a codificação e a estrutura.') from None
    if root.getroottree().docinfo.doctype or any(not isinstance(x.tag, str) for x in root.iter()):
        raise InvalidFiscalXML('XML com DTD, entidades, comentários ou instruções não é aceito.')
    if root.getprevious() is not None or root.getnext() is not None:
        raise InvalidFiscalXML('Envie apenas o documento fiscal, sem instruções externas.')
    ids = []
    for node in root.iter():
        for key, value in node.attrib.items():
            if etree.QName(key).localname.lower() == 'id':
                if key != 'Id':
                    raise InvalidFiscalXML('A identificação XML deve usar o atributo Id do leiaute fiscal.')
                ids.append(value)
    if len(ids) != len(set(ids)):
        raise InvalidFiscalXML('O XML contém identificadores duplicados.')
    return root


def _one(root, path, ns):
    matches = root.findall(path, {'n': ns, 'ds': DS})
    if len(matches) != 1:
        raise InvalidFiscalXML('Campo fiscal obrigatório ausente ou repetido.')
    return matches[0]


def _profile(root, profile, *, signed=False):
    spec = PROFILES.get(profile)
    if not spec or root.tag != '{%s}%s' % (spec['namespace'], spec['root']):
        raise InvalidFiscalXML('O XML não corresponde ao perfil fiscal selecionado. Envie um documento unitário.')
    ns = spec['namespace']
    target = _one(root, 'n:' + spec['target'], ns)
    if (target if ns == NFE else root).get('versao') != spec['version']:
        raise InvalidFiscalXML('Versão de XML não suportada por este perfil de assinatura.')
    if len(root.findall('.//{%s}%s' % (ns, spec['target']))) != 1:
        raise InvalidFiscalXML('O XML deve conter exatamente um documento fiscal.')
    signatures = root.findall('.//{%s}Signature' % DS)
    if len(signatures) != int(signed) or (signed and signatures[0].getparent() is not root):
        raise InvalidFiscalXML('Envie XML original sem assinatura. Assinaturas existentes não são substituídas.')
    allowed = {target.tag, '{%s}Signature' % DS}
    if ns == NFE:
        allowed.add('{%s}infNFeSupl' % NFE)
    if any(node.tag not in allowed for node in root):
        raise InvalidFiscalXML('Envelope ou conteúdo adicional fora do perfil fiscal.')
    identifier = target.get('Id', '')
    if ns == NFE:
        if not re.fullmatch(r'NFe[0-9]{44}', identifier):
            raise InvalidFiscalXML('A NF-e deve ter Id NFe seguido da chave de 44 dígitos.')
        model = _one(target, 'n:ide/n:mod', ns).text
        issuer = _one(target, 'n:emit/n:CNPJ', ns).text or ''
        if model != spec['model'] or identifier[23:25] != model or identifier[9:23] != issuer:
            raise InvalidFiscalXML('Modelo ou CNPJ diverge da chave de acesso.')
        digits = identifier[3:]
        checksum = 11 - sum(int(n) * (2 + i % 8) for i, n in enumerate(reversed(digits[:-1]))) % 11
        if int(digits[-1]) != (0 if checksum >= 10 else checksum):
            raise InvalidFiscalXML('Dígito verificador da chave de acesso inválido.')
    else:
        # A DPS 1.00 atualizada usa DPS + município(7) + tipo(1) + inscrição(14)
        # + série(5) + número(15). Não confundir com versões municipais de RPS.
        if not re.fullmatch(r'DPS[0-9]{42}', identifier):
            raise InvalidFiscalXML('A DPS deve ter Id DPS seguido de 42 dígitos.')
        issuer = _one(target, 'n:prest/n:CNPJ', ns).text or ''
        if identifier[10] != '2' or identifier[11:25] != issuer:
            raise InvalidFiscalXML('O CNPJ da DPS diverge de seu identificador.')
    if not re.fullmatch(r'[0-9]{14}', issuer):
        raise InvalidFiscalXML('Este perfil requer CNPJ numérico do emitente. Outros leiautes exigem perfil específico.')
    return target, issuer


def _canonical(element):
    return etree.tostring(element, method='c14n', exclusive=False, with_comments=False)


def load_signer(pfx, password, *, roots):
    try:
        key, cert, chain = pkcs12.load_key_and_certificates(pfx, password.encode())
    except (ValueError, TypeError):
        raise InvalidFiscalXML('Certificado A1 indisponível. Atualize o certificado cadastrado.') from None
    if not isinstance(key, rsa.RSAPrivateKey) or key.key_size < 2048 or cert is None:
        raise InvalidFiscalXML('O perfil fiscal requer certificado RSA com chave privada de ao menos 2048 bits.')
    if not cert.not_valid_before_utc <= now() < cert.not_valid_after_utc:
        raise InvalidFiscalXML('Certificado fora da validade. Atualize-o antes de assinar.')
    try:
        if cert.extensions.get_extension_for_class(x509.BasicConstraints).value.ca:
            raise InvalidFiscalXML('Use certificado de usuário final, não certificado de autoridade certificadora.')
    except x509.ExtensionNotFound:
        pass
    try:
        usage = cert.extensions.get_extension_for_class(x509.KeyUsage).value
        if not usage.digital_signature:
            raise InvalidFiscalXML('O certificado não permite assinatura digital.')
    except x509.ExtensionNotFound:
        raise InvalidFiscalXML('O certificado não informa permissão de assinatura digital.') from None
    if not roots:
        raise InvalidFiscalXML('Configure as âncoras oficiais de confiança antes de assinar.')
    try:
        validator = CertificateValidator(
            asn1_x509.Certificate.load(cert.public_bytes(serialization.Encoding.DER)),
            intermediate_certs=[asn1_x509.Certificate.load(item.public_bytes(serialization.Encoding.DER)) for item in chain or []],
            validation_context=ValidationContext(trust_roots=roots, allow_fetching=False))
        asyncio.run(validator.async_validate_usage({'digital_signature'}))
    except Exception:
        raise InvalidFiscalXML('A cadeia de confiança do certificado não foi validada localmente.') from None
    return key, cert


def sign_fiscal_xml(source, profile, pfx, password, *, issuer_cnpj, roots):
    from .contract_signatures import _certificate_identity
    root = _parse(source)
    target, issuer = _profile(root, profile)
    key, cert = load_signer(pfx, password, roots=roots)
    cert_cnpj = _certificate_identity(cert, '2.16.76.1.3.3')
    if issuer != issuer_cnpj or issuer != cert_cnpj:
        raise InvalidFiscalXML('O emitente do XML, o certificado e a mantenedora devem ter o mesmo CNPJ.')
    signature = etree.SubElement(root, '{%s}Signature' % DS, nsmap={None: DS})
    info = etree.SubElement(signature, '{%s}SignedInfo' % DS)
    def add(parent, name, text=None, **attrs):
        node = etree.SubElement(parent, '{%s}%s' % (DS, name), **attrs)
        node.text = text
        return node
    add(info, 'CanonicalizationMethod', Algorithm=C14N)
    algorithm, digest_algorithm, digest_type = _algorithm(profile)
    add(info, 'SignatureMethod', Algorithm=algorithm)
    ref = add(info, 'Reference', URI='#' + target.get('Id'))
    transforms = add(ref, 'Transforms')
    add(transforms, 'Transform', Algorithm=DS + 'enveloped-signature')
    add(transforms, 'Transform', Algorithm=C14N)
    add(ref, 'DigestMethod', Algorithm=digest_algorithm)
    add(ref, 'DigestValue', _digest_xml(target, profile))
    add(signature, 'SignatureValue', base64.b64encode(key.sign(_canonical(info), padding.PKCS1v15(), digest_type)).decode())
    add(add(add(signature, 'KeyInfo'), 'X509Data'), 'X509Certificate',
        base64.b64encode(cert.public_bytes(serialization.Encoding.DER)).decode())
    result = etree.tostring(root, encoding='UTF-8', xml_declaration=True, pretty_print=False)
    verify_fiscal_xml(result, profile, expected_certificate_sha256=cert.fingerprint(hashes.SHA256()).hex())
    return result


def verify_fiscal_xml(source, profile, *, expected_certificate_sha256):
    """Verifica referência única, digest e assinatura; não afirma autorização fiscal."""
    root = _parse(source)
    target, _ = _profile(root, profile, signed=True)
    signature = root.find('{%s}Signature' % DS)
    ns = PROFILES[profile]['namespace']
    if ns == NFSE:
        try:
            _signature_schema(PROFILES[profile]['version']).assertValid(signature)
        except etree.DocumentInvalid:
            raise InvalidFiscalXML('Estrutura da assinatura incompatível com o esquema nacional.') from None
    algorithm, digest_algorithm, digest_type = _algorithm(profile)
    info = _one(signature, 'ds:SignedInfo', ns)
    ref = _one(info, 'ds:Reference', ns)
    if ref.get('URI') != '#' + target.get('Id'):
        raise InvalidFiscalXML('Referência da assinatura divergente do documento fiscal.')
    if (_one(info, 'ds:CanonicalizationMethod', ns).get('Algorithm') != C14N
            or _one(info, 'ds:SignatureMethod', ns).get('Algorithm') != algorithm
            or _one(ref, 'ds:DigestMethod', ns).get('Algorithm') != digest_algorithm
            or [t.get('Algorithm') for t in _one(ref, 'ds:Transforms', ns)] != [DS + 'enveloped-signature', C14N]):
        raise InvalidFiscalXML('Algoritmos da assinatura fora do perfil fiscal.')
    try:
        cert = x509.load_der_x509_certificate(base64.b64decode(_one(signature, 'ds:KeyInfo/ds:X509Data/ds:X509Certificate', ns).text, validate=True))
        expected = _digest_xml(target, profile)
        if not hmac.compare_digest(expected, _one(ref, 'ds:DigestValue', ns).text or ''):
            raise InvalidFiscalXML('O XML foi alterado após a assinatura.')
        if not hmac.compare_digest(expected_certificate_sha256, cert.fingerprint(hashes.SHA256()).hex()):
            raise InvalidFiscalXML('Certificado da assinatura divergente do registro.')
        public_key = cert.public_key()
        if not isinstance(public_key, rsa.RSAPublicKey):
            raise InvalidFiscalXML('Chave de assinatura incompatível.')
        public_key.verify(base64.b64decode(_one(signature, 'ds:SignatureValue', ns).text, validate=True),
                          _canonical(info), padding.PKCS1v15(), digest_type)
    except (ValueError, TypeError, InvalidSignature) as exc:
        raise InvalidFiscalXML('Assinatura XML inválida.') from exc
    return {'cryptographic_valid': True, 'authorization_status': 'not_submitted', 'revocation_checked': False}
