import pytest
import time
from fastapi.responses import StreamingResponse
from sqlalchemy import create_engine, text
from sqlalchemy.exc import TimeoutError as PoolTimeout
from sqlalchemy.pool import QueuePool
from app.db import SessionLocal
from app import models as m
from app.config import settings

@pytest.mark.parametrize('path',['/','/index.html','/online.html'])
def test_head_uses_same_policy_as_get_and_has_no_body(client,path):
    r=client.head(path,headers={'Accept-Encoding':'identity'})
    g=client.get(path,headers={'Accept-Encoding':'identity'})
    assert r.status_code==200 and r.content==b''
    assert r.headers['content-security-policy']==g.headers['content-security-policy']
    assert r.headers.get('x-frame-options')==g.headers.get('x-frame-options')
    assert r.headers['cache-control']=='no-store'
    assert r.headers['content-length']==g.headers['content-length']


def test_saved_origin_applies_to_anonymous_head_without_referer(client):
    cfg=settings();old=(cfg.cookie_secure,cfg.app_url)
    with SessionLocal.begin() as db:
        row=db.get(m.EmbeddingSettings,1);previous=(row.configured,row.enabled,row.allowed_origins)
        row.configured=True;row.enabled=True;row.allowed_origins=['https://hub.example.test']
    cfg.cookie_secure=True;cfg.app_url='https://testserver'
    try:
        r=client.head('/')
        assert r.status_code==200
        assert "frame-ancestors 'self' https://hub.example.test" in r.headers['content-security-policy']
        assert 'x-frame-options' not in r.headers
        assert 'access-control-allow-origin' not in r.headers
        assert r.content==b''
    finally:
        cfg.cookie_secure,cfg.app_url=old
        with SessionLocal.begin() as db:
            row=db.get(m.EmbeddingSettings,1);row.configured,row.enabled,row.allowed_origins=previous


def test_response_policy_does_not_need_a_second_connection_while_streaming(client, monkeypatch):
    """Um endpoint pode manter a conexão durante a resposta sem bloquear o CSP."""
    from app import main
    from app.db import engine
    isolated = create_engine('sqlite://', poolclass=QueuePool, pool_size=1, max_overflow=0, pool_timeout=0.05,
                             connect_args={'check_same_thread': False})
    SessionLocal.configure(bind=isolated)

    def frame_sources():
        try:
            with SessionLocal() as db:
                db.execute(text('SELECT 1'))
                return ['https://hub.example.test']
        except PoolTimeout:
            return []

    def stream():
        db = SessionLocal()
        db.execute(text('SELECT 1'))

        def body():
            try:
                time.sleep(0.2)
                yield b'ok'
            finally:
                db.close()

        return StreamingResponse(body(), media_type='text/plain')

    monkeypatch.setattr(main.embedding, 'frame_sources', frame_sources)
    monkeypatch.setattr(main.support, 'csp_sources', lambda: ([], []))
    main.app.add_api_route('/_test/pool-stream', stream, methods=['GET'])
    route = main.app.router.routes.pop()
    fallback = next(index for index, current in enumerate(main.app.router.routes)
                    if getattr(current, 'path', '') == '/{path:path}')
    main.app.router.routes.insert(fallback, route)
    try:
        response = client.get('/_test/pool-stream')
        assert response.status_code == 200
        assert response.content == b'ok'
        assert "frame-ancestors 'self' https://hub.example.test" in response.headers['content-security-policy']
    finally:
        main.app.router.routes = [route for route in main.app.router.routes if getattr(route, 'path', '') != '/_test/pool-stream']
        SessionLocal.configure(bind=engine)
        isolated.dispose()
