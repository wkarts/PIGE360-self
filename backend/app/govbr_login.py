"""Login Único oficial: PKCE, ID token verificado e nível prata/ouro."""
import base64
import hashlib
import os
import secrets
from dataclasses import dataclass
from urllib.parse import urlencode, urlsplit

import httpx
import jwt

from .govbr_signing import GovBRSigningError


@dataclass(frozen=True)
class GovBRLoginConfig:
    client_id: str
    client_secret: str
    base_url: str
    redirect_uri: str

    @classmethod
    def from_environment(cls):
        return cls(os.getenv('GOVBR_LOGIN_CLIENT_ID', ''),
                   os.getenv('GOVBR_LOGIN_CLIENT_SECRET', ''),
                   os.getenv('GOVBR_LOGIN_BASE_URL', ''),
                   os.getenv('GOVBR_SIGNATURE_REDIRECT_URI', ''))

    def require_available(self):
        parsed = urlsplit(self.redirect_uri)
        if (not self.client_id or not self.client_secret or not self.redirect_uri
                or self.base_url.rstrip('/') not in {'https://sso.acesso.gov.br', 'https://sso.staging.acesso.gov.br'}
                or parsed.scheme != 'https' or not parsed.hostname
                or parsed.username or parsed.password or parsed.query or parsed.fragment):
            raise GovBRSigningError('Login Único GOV.BR não configurado nesta instalação.')


class GovBRLoginClient:
    def __init__(self, config: GovBRLoginConfig, http: httpx.AsyncClient):
        config.require_available()
        self.config, self.http = config, http

    def authorization_url(self, state, nonce, verifier):
        challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b'=').decode()
        return self.config.base_url.rstrip('/') + '/authorize?' + urlencode({
            'response_type': 'code', 'client_id': self.config.client_id,
            'scope': 'openid email profile govbr_confiabilidades_idtoken',
            'redirect_uri': self.config.redirect_uri, 'state': state, 'nonce': nonce,
            'code_challenge': challenge, 'code_challenge_method': 'S256',
        })

    async def identity(self, code, nonce, verifier):
        if not code or len(code) > 4096:
            raise GovBRSigningError('Autorização GOV.BR inválida.')
        try:
            result = await self.http.post(self.config.base_url.rstrip('/') + '/token',
                auth=httpx.BasicAuth(self.config.client_id, self.config.client_secret),
                data={'grant_type': 'authorization_code', 'code': code,
                      'redirect_uri': self.config.redirect_uri, 'code_verifier': verifier},
                follow_redirects=False, timeout=15)
            result.raise_for_status()
            if len(result.content) > 32768:
                raise ValueError('response limit')
            token = result.json()['id_token']
            header = jwt.get_unverified_header(token)
            if header.get('alg') != 'RS256' or not header.get('kid'):
                raise ValueError('algorithm')
            response = await self.http.get(self.config.base_url.rstrip('/') + '/jwk',
                                          follow_redirects=False, timeout=15)
            response.raise_for_status()
            if len(response.content) > 131072:
                raise ValueError('key limit')
            keys = response.json()['keys']
            matching = [key for key in keys if isinstance(key, dict) and key.get('kid') == header['kid']
                        and key.get('kty') == 'RSA' and key.get('use', 'sig') == 'sig'
                        and key.get('alg', 'RS256') == 'RS256']
            if len(matching) != 1:
                raise ValueError('key')
            claims = jwt.decode(token, jwt.PyJWK.from_dict(matching[0]).key,
                algorithms=['RS256'], audience=self.config.client_id,
                issuer=self.config.base_url.rstrip('/') + '/', leeway=10,
                options={'require': ['sub', 'aud', 'iss', 'exp', 'iat', 'nonce']})
            if not secrets.compare_digest(str(claims['nonce']), nonce):
                raise ValueError('nonce')
            reliability = claims.get('reliability_info')
            if not isinstance(reliability, dict) or reliability.get('level') not in {'silver', 'gold'}:
                raise GovBRSigningError('Use uma conta GOV.BR de nível prata ou ouro.')
            cpf = ''.join(c for c in str(claims['sub']) if c.isdigit())
            if len(cpf) != 11:
                raise ValueError('subject')
            return cpf
        except GovBRSigningError:
            raise
        except (httpx.HTTPError, ValueError, TypeError, KeyError, jwt.PyJWTError) as exc:
            # Nunca devolver os tokens, códigos, credenciais ou conteúdo do provedor.
            raise GovBRSigningError('Não foi possível confirmar sua identidade no GOV.BR.') from exc
