"""Identidade de rede assinada pelo portal. Nenhum header público concede confiança."""
import hashlib
import hmac
import ipaddress
import re
import time
from .config import settings


class PortalClientMiddleware:
    def __init__(self,app):self.app=app

    async def __call__(self,scope,receive,send):
        if scope['type']=='http':
            headers=scope.get('headers',[])
            names=(b'x-pige-portal-ip',b'x-pige-portal-time',b'x-pige-portal-signature')
            values=[[value for key,value in headers if key.lower()==name] for name in names]
            secret=settings().portal_internal_token
            # Somente a origem dedicada, rotas da superfície e um valor por header.
            path=scope.get('path','')
            surface=path.startswith(('/api/v1/portal/','/api/v1/family/','/api/v1/auth/','/api/v1/profile/learning','/api/v1/invitations/'))
            if secret and surface and all(len(items)==1 for items in values):
                try:
                    address,stamp,signature=(items[0].decode('ascii') for items in values)
                    address=str(ipaddress.ip_address(address))
                    if not re.fullmatch(r'[0-9]{1,12}',stamp) or abs(time.time()-int(stamp))>30:raise ValueError()
                    if not re.fullmatch(r'[0-9a-f]{64}',signature):raise ValueError()
                    raw_path=scope.get('raw_path',path.encode()).decode('ascii')
                    query=scope.get('query_string',b'').decode('ascii')
                    target=raw_path+('?' + query if query else '')
                    message='\n'.join((stamp,scope['method'],target,address)).encode()
                    expected=hmac.new(secret.encode(),message,hashlib.sha256).hexdigest()
                    if hmac.compare_digest(signature,expected):
                        scope['client']=(address,0)
                except (ValueError,UnicodeError):pass
            # Não deixar assinatura/identidade alegada disponível a outros consumidores.
            # O escopo é por requisição. Preservá-lo mantém route/state visíveis à telemetria externa.
            scope['headers']=[(k,v) for k,v in headers if k.lower() not in names]
        await self.app(scope,receive,send)
