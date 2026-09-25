import pytest
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
