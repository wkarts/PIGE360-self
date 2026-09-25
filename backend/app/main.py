import logging
import secrets
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from starlette.middleware.trustedhost import TrustedHostMiddleware
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from .config import settings
from .db import engine
from .storage import ensure_storage
from . import auth, people, registry, enrollments, documents, reports, portal, admissions, integrations, connect, banking, profiles, support, institution

cfg = settings()
logger = logging.getLogger('pige360')

@asynccontextmanager
async def lifespan(app):
    ensure_storage()
    yield
    engine.dispose()

app = FastAPI(title='PIGE360 Self — Gestão Educacional', version=cfg.app_version, lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url='/api/v1/openapi.json')
for router in [auth.router, registry.router, people.router, enrollments.router, documents.router, reports.router, portal.router, admissions.router, integrations.router, integrations.hooks, connect.router, banking.router, profiles.router, support.router, institution.router]:
    app.include_router(router)

@app.exception_handler(HTTPException)
async def http_error(request, exc):
    return JSONResponse({'detail':exc.detail, 'request_id':getattr(request.state,'request_id','')}, status_code=exc.status_code, headers=exc.headers)

@app.exception_handler(RequestValidationError)
async def validation_error(request, exc):
    errors = [{'field':'.'.join(str(p) for p in e['loc']), 'message':e['msg']} for e in exc.errors()]
    return JSONResponse({'detail':'Revise os campos informados.', 'errors':errors, 'request_id':getattr(request.state,'request_id','')}, status_code=422)

@app.exception_handler(IntegrityError)
async def integrity_error(request, exc):
    return JSONResponse({'detail':'Conflito de integridade: já existe CPF, cadastro, vínculo ou matrícula equivalente, ou um registro relacionado impede esta alteração.', 'request_id':getattr(request.state,'request_id','')}, status_code=409)

@app.exception_handler(Exception)
async def internal_error(request, exc):
    ref = getattr(request.state, 'request_id', '')
    logger.error('request_id=%s exception_type=%s', ref, type(exc).__name__)
    return JSONResponse({'detail':'Não foi possível concluir a operação. Consulte o administrador com o código de referência.', 'request_id':ref}, status_code=500)

@app.middleware('http')
async def security_headers(request: Request, call_next):
    request.state.request_id = secrets.token_hex(12)
    origin = request.headers.get('origin')
    if request.method not in ('GET','HEAD','OPTIONS') and origin and origin.rstrip('/') != cfg.app_url.rstrip('/'):
        return JSONResponse({'detail':'Origem não autorizada.'}, status_code=403)
    response = await call_next(request)
    response.headers['X-Request-ID'] = request.state.request_id
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['Referrer-Policy'] = 'same-origin'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
    hub_origins, hub_sockets = support.csp_sources()
    hub_script_sources = ' '.join(hub_origins)
    # O SDK opcional do HUB injeta estilos Inter. Permissão restrita aos dois
    # hosts de fontes somente quando há um HUB ativo; a identidade da escola é local.
    hub_style_sources = 'https://fonts.googleapis.com' if hub_origins else ''
    hub_font_sources = 'https://fonts.gstatic.com' if hub_origins else ''
    hub_connect_sources = ' '.join(hub_origins + hub_sockets)
    response.headers['Content-Security-Policy'] = (
        "default-src 'self'; "
        f"script-src 'self' {hub_script_sources}; "
        f"style-src 'self' 'unsafe-inline' {hub_style_sources}; "
        f"style-src-elem 'self' 'unsafe-inline' {hub_style_sources}; "
        "img-src 'self' data: blob:; "
        f"font-src 'self' {hub_font_sources}; "
        f"connect-src 'self' {hub_connect_sources}; "
        f"frame-src 'self' {hub_script_sources}; "
        "object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
    )
    if request.url.path.startswith('/api') or request.url.path in ('/','/index.html','/online.html','/sw.js','/manifest.webmanifest'):
        response.headers['Cache-Control'] = 'no-store'
    if cfg.cookie_secure:
        response.headers['Strict-Transport-Security'] = 'max-age=31536000'
    return response

class BodyTooLarge(Exception):
    pass

@app.exception_handler(BodyTooLarge)
async def body_too_large(request, exc):
    return JSONResponse({'detail':'Requisição acima do limite permitido.'}, status_code=413)

class BodyLimitMiddleware:
    def __init__(self, app, maximum):
        self.app, self.maximum = app, maximum
    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http':
            return await self.app(scope, receive, send)
        headers = dict(scope.get('headers', []))
        try:
            length = int(headers.get(b'content-length', b'0'))
        except ValueError:
            return await JSONResponse({'detail':'Content-Length inválido.'}, status_code=400)(scope,receive,send)
        if length > self.maximum:
            return await JSONResponse({'detail':'Requisição acima do limite permitido.'}, status_code=413)(scope,receive,send)
        consumed, started = 0, False
        async def limited_receive():
            nonlocal consumed
            message = await receive()
            consumed += len(message.get('body', b''))
            if consumed > self.maximum:
                raise BodyTooLarge()
            return message
        async def track_send(message):
            nonlocal started
            if message['type'] == 'http.response.start': started = True
            await send(message)
        try:
            await self.app(scope, limited_receive, track_send)
        except BodyTooLarge:
            if not started:
                await JSONResponse({'detail':'Requisição acima do limite permitido.'}, status_code=413)(scope, receive, send)

app.add_middleware(BodyLimitMiddleware, maximum=(cfg.max_upload_mb+1)*1024*1024)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=cfg.hosts)

@app.get('/health/live', include_in_schema=False)
def live():
    return {'status':'ok', 'version':cfg.app_version}

@app.get('/health/ready', include_in_schema=False)
def ready():
    try:
        with engine.connect() as connection:
            connection.execute(text('SELECT configured FROM installation WHERE id=1')).first()
        return {'status':'ready'}
    except Exception:
        return JSONResponse({'status':'not_ready'}, status_code=503)

@app.get('/{path:path}', include_in_schema=False)
def frontend(path: str):
    if path.startswith(('api/', 'health/')):
        raise HTTPException(404, 'Rota não encontrada.')
    root = cfg.frontend_path.resolve()
    requested = (root / path).resolve()
    if not requested.is_relative_to(root):
        raise HTTPException(404, 'Arquivo não encontrado.')
    if not requested.is_file():
        if Path(path).suffix:
            raise HTTPException(404, 'Arquivo não encontrado.')
        requested = root / 'index.html'
    if not requested.is_file():
        raise HTTPException(503, 'Frontend ainda não compilado. Execute node frontend/build.mjs.')
    return FileResponse(requested)
