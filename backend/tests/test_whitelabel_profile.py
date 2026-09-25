"""Regressões de incorporação autorizada, marca, PDFs e perfil privado."""
import io
import json
import re
import uuid
from pathlib import Path
import pytest
from PIL import Image
from pypdf import PdfReader
from app.config import settings, Settings
from app.embedding import origins
from app.db import SessionLocal
from app.institution import InstitutionIdentity
from conftest import PASSWORD
from test_institution import data as identity_input, image, save as save_identity


def account(client, admin, school, role='viewer'):
    email=uuid.uuid4().hex+'@example.com'
    r=client.post('/api/v1/users',headers=admin,json={'name':'Usuário Exemplo','email':email,'password':PASSWORD,'role':role,'school_ids':[school['id']]})
    assert r.status_code==201,r.text
    r=client.post('/api/v1/auth/login',json={'email':email,'password':PASSWORD})
    assert r.status_code==200,r.text
    return {'Authorization':'Bearer '+r.json()['access_token']},r.json()['user']


def profile_input(user, **changes):
    return {'version':user['version'],'name':user['name'],'email':user['email'],**changes}


def save_profile(client, headers, payload, photo=None):
    return client.put('/api/v1/auth/profile',headers=headers,data={'payload':json.dumps(payload)},files=photo)


def test_embedding_disabled_and_explicit(client, monkeypatch):
    assert client.get('/').headers['x-frame-options']=='DENY'
    cfg=settings()
    monkeypatch.setattr(cfg,'embed_allowed_origins','https://hub.example.com')
    monkeypatch.setattr(cfg,'cookie_secure',True)
    monkeypatch.setattr(cfg,'app_url','https://testserver')
    response=client.get('/')
    assert 'x-frame-options' not in response.headers
    assert "frame-ancestors 'self' https://hub.example.com" in response.headers['content-security-policy']
    assert 'unsafe-eval' not in response.headers['content-security-policy']
    assert '*' not in response.headers['content-security-policy']
    payload={'email':'admin@example.com','password':PASSWORD}
    # Parent allowed to frame is NOT allowed to write directly to the API.
    assert client.post('/api/v1/auth/login',json=payload,headers={'Origin':'https://hub.example.com','X-CSRF-Protection':'1'}).status_code==403
    assert client.post('/api/v1/auth/login',json=payload).status_code==403
    response=client.post('/api/v1/auth/login',json=payload,headers={'Origin':'https://testserver','X-CSRF-Protection':'1'})
    assert response.status_code==200,response.text
    cookie=response.headers['set-cookie']
    for flag in ('Secure','HttpOnly','SameSite=none','Partitioned','Path=/api/v1/auth'):
        assert flag in cookie
    response=client.post('/api/v1/auth/logout',headers={'Origin':'https://testserver','X-CSRF-Protection':'1'})
    assert 'Partitioned' in response.headers['set-cookie'] and 'Max-Age=0' in response.headers['set-cookie']


@pytest.mark.parametrize('value',['*','https://*.example.com','https://user:pass@example.com','https://example.com/path','https://example.com?q=x','https://example.com#x','http://example.com',"https://example.com;script-src *",'https://example.com:bad'])
def test_embedding_rejects_unbounded_sources(value):
    with pytest.raises(ValueError):origins(value)


def test_embedding_requires_tls():
    with pytest.raises(ValueError):Settings(embed_allowed_origins='https://hub.example.com',cookie_secure=False)
    assert origins('https://HUB.example.com:443/, https://hub.example.com')==['https://hub.example.com']


def test_bootstrap_school_at_first_byte(client, admin):
    before=identity_input(client)
    name='Colégio <Teste> & Família </script><script>alert(1)</script>'
    try:
        assert save_identity(client,admin,{'display_name':name,'short_name':'Família'}).status_code==200
        for path in ('/','/index.html','/online.html'):
            response=client.get(path); html=response.text
            assert response.status_code==200
            assert '<title>Colégio &lt;Teste&gt;' in html
            assert '<script>alert(1)</script>' not in html
            assert 'PIGE360' not in html and 'Instalação própria' not in html
            raw=re.search(r'id="institution-bootstrap">(.*?)</script>',html).group(1)
            boot=json.loads(raw)
            assert boot['display_name']==name and boot['configured'] is True
            assert boot['app_version']==settings().app_version
            assert not any(x in raw for x in ['password','setup_token','access_token'])
            assert 'institution-splash' in html
            assert re.search(r'app.js\?v=[0-9a-f]+',html) or 'portal.js?v=' in html
    finally:
        assert save_identity(client,admin,{**before,'version':identity_input(client)['version']}).status_code==200


def test_own_profile_persists_photo_and_preserves_access(client,admin,school):
    headers,user=account(client,admin,school)
    assert client.get('/api/v1/auth/profile').status_code==401
    payload=profile_input(user,name='Usuário atualizado',phone='5575999990000',job_title='Secretaria',department='Atendimento',bio='Perfil de teste')
    result=save_profile(client,headers,payload,{'photo':('photo.png',image(),'image/png')})
    assert result.status_code==200,result.text
    value=result.json();assert value['role']=='viewer' and value['has_photo']
    assert value['school_ids']==[school['id']] and 'photo' not in value
    photo=client.get('/api/v1/auth/profile/photo',headers=headers)
    assert photo.status_code==200 and photo.headers['cache-control']=='no-store'
    with Image.open(io.BytesIO(photo.content)) as im:
        assert im.size==(512,512) and not im.getexif()
    assert client.get('/api/v1/auth/profile/photo').status_code==401
    other,_=account(client,admin,school)
    assert client.get('/api/v1/auth/profile/photo',headers=other).status_code==404
    assert client.get('/api/v1/auth/profile',headers=headers).json()['phone']==payload['phone']
    assert save_profile(client,headers,payload).status_code==409
    assert save_profile(client,headers,profile_input(value,role='admin')).status_code==422
    assert save_profile(client,headers,profile_input(value,school_ids=[])).status_code==422
    removed=save_profile(client,headers,profile_input(value,remove_photo=True))
    assert removed.status_code==200 and not removed.json()['has_photo']
    assert client.get('/api/v1/auth/profile/photo',headers=headers).status_code==404


@pytest.mark.parametrize('file',[('bad.svg',b'<svg onload="alert(1)"/>','image/svg+xml'),('bad.png',b'not png','image/png'),('big.png',b'x'*(2*1024*1024+1),'image/png')])
def test_profile_invalid_photo_atomic(client,admin,school,file):
    headers,user=account(client,admin,school)
    assert save_profile(client,headers,profile_input(user,name='Não persistir'),{'photo':file}).status_code==422
    assert client.get('/api/v1/auth/profile',headers=headers).json()['name']==user['name']


def test_profile_email_change_requires_password_revokes_sessions(client,admin,school):
    headers,user=account(client,admin,school)
    payload=profile_input(user,email=uuid.uuid4().hex+'@example.com')
    assert save_profile(client,headers,payload).status_code==422
    result=save_profile(client,headers,{**payload,'current_password':PASSWORD})
    assert result.status_code==200 and result.json()['requires_login']
    assert client.get('/api/v1/auth/me',headers=headers).status_code==401
    assert client.post('/api/v1/auth/login',json={'email':payload['email'],'password':PASSWORD}).status_code==200


def font_bytes():
    # Arquivo do pacote de testes ReportLab; nunca copiado para o repositório/artefatos.
    import reportlab
    return (Path(reportlab.__file__).parent/'fonts/Vera.ttf').read_bytes()


def test_school_pdf_uses_institutional_logo_colors_and_font(client,admin):
    from app.documents import render_pdf
    before=identity_input(client)
    try:
        result=save_identity(client,admin,{'display_name':'Colégio Horizonte','short_name':'Horizonte','font_family':'custom','font_license_confirmed':True}, {'font':('school.ttf',font_bytes(),'font/ttf'),'logo':('school.png',image(),'image/png')})
        assert result.status_code==200,result.text
        with SessionLocal() as db:
            content=render_pdf('Unidade Centro','Relatório de teste',[('Aluno','José da Conceição')],db=db)
        reader=PdfReader(io.BytesIO(content));text=''.join(p.extract_text() for p in reader.pages)
        assert 'Colégio Horizonte' in text and 'PIGE360' not in text and 'José da Conceição' in text
        assert reader.metadata.author=='Colégio Horizonte' and reader.metadata.creator=='Colégio Horizonte'
        assert any('/FontFile2' in obj.get_object().get('/FontDescriptor',{}).get_object() for obj in reader.pages[0]['/Resources']['/Font'].values() if obj.get_object().get('/FontDescriptor'))
        assert reader.pages[0]['/Resources'].get('/XObject')
        assert 'Cache-Control' in client.get(result.json()['logo_url']).headers
    finally:
        assert save_identity(client,admin,{**before,'version':identity_input(client)['version'],'remove_font':True,'remove_logo':True}).status_code==200


def test_woff2_and_embedding_rights():
    from fontTools.ttLib import TTFont
    from app.institution_fonts import truetype
    font=TTFont(io.BytesIO(font_bytes()));font.flavor='woff2';out=io.BytesIO();font.save(out)
    assert truetype(out.getvalue()).startswith(b'\x00\x01\x00\x00')
    font.flavor=None;font['OS/2'].fsType=2;out=io.BytesIO();font.save(out)
    with pytest.raises(Exception) as error:truetype(out.getvalue())
    assert error.value.status_code==422


def test_embedding_area_admin_validation_and_revocation(client,admin,school,monkeypatch):
    from app.models import EmbeddingSettings
    from sqlalchemy import select
    headers,_=account(client,admin,school)
    path='/api/v1/institution/embedding'
    assert client.get(path).status_code==401
    assert client.get(path,headers=headers).status_code==403
    initial=client.get(path,headers=admin).json()
    values={'version':initial['version'],'enabled':True,'allowed_origins':['https://hub.example.com'],'current_password':PASSWORD}
    protected={**admin,'X-CSRF-Protection':'1'}
    assert client.put(path,headers=protected,json=values).status_code==422  # HTTPS prerequisite
    cfg=settings();monkeypatch.setattr(cfg,'cookie_secure',True);monkeypatch.setattr(cfg,'app_url','https://testserver')
    renewed=client.post('/api/v1/auth/login',json={'email':'admin@example.com','password':PASSWORD})
    assert renewed.status_code==200,renewed.text
    admin={'Authorization':'Bearer '+renewed.json()['access_token']}
    protected={**admin,'X-CSRF-Protection':'1'}
    headers,_=account(client,admin,school)
    try:
        assert client.put(path,headers=protected,json={**values,'allowed_origins':['https://*.example.com']}).status_code==422
        assert client.put(path,headers=protected,json={**values,'allowed_origins':[]}).status_code==422
        assert client.put(path,headers=protected,json={**values,'current_password':'wrong'}).status_code==422
        assert client.put(path,headers={**protected,'Origin':'https://hub.example.com'},json=values).status_code==403
        assert client.get(path,headers=admin).json()['version']==initial['version']
        result=client.put(path,headers=protected,json=values)
        assert result.status_code==200,result.text
        assert result.json()['requires_login']
        assert client.get('/api/v1/auth/me',headers=admin).status_code==401
        assert client.get('/api/v1/auth/me',headers=headers).status_code==401
        assert "frame-ancestors 'self' https://hub.example.com" in client.get('/').headers['content-security-policy']
        login=client.post('/api/v1/auth/login',headers={'X-CSRF-Protection':'1','Origin':cfg.app_url},json={'email':'admin@example.com','password':PASSWORD})
        assert login.status_code==200,login.text
        token={'Authorization':'Bearer '+login.json()['access_token'],'X-CSRF-Protection':'1'}
        assert 'Partitioned' in login.headers['set-cookie']
        assert client.put(path,headers=token,json=values).status_code==409
        values.update(version=result.json()['version'],enabled=False)
        result=client.put(path,headers=token,json=values)
        assert result.status_code==200,result.text
        # A saved disabled decision supersedes the deployment environment.
        monkeypatch.setattr(cfg,'embed_allowed_origins','https://environment.example.com')
        assert client.get('/').headers['x-frame-options']=='DENY'
        assert "frame-ancestors 'none'" in client.get('/').headers['content-security-policy']
    finally:
        with SessionLocal() as db:
            row=db.get(EmbeddingSettings,1);row.configured=False;row.enabled=False;row.allowed_origins=[];db.commit()


def test_pdf_without_logo_does_not_fallback_to_supplier(client,admin):
    from app.documents import render_pdf
    previous=identity_input(client)
    try:
        assert save_identity(client,admin,{'remove_logo':True,'font_family':'georgia'}).status_code==200
        with SessionLocal() as db:
            content=render_pdf('Escola','Relação',[('Nome','Pessoa de teste')],db=db)
        reader=PdfReader(io.BytesIO(content))
        assert not reader.pages[0]['/Resources'].get('/XObject')
        assert 'PIGE360' not in ''.join(p.extract_text() for p in reader.pages)
        assert 'Times' in str(reader.pages[0]['/Resources']['/Font'].get_object()) or any('Times' in str(f.get_object()) for f in reader.pages[0]['/Resources']['/Font'].values())
    finally:
        assert save_identity(client,admin,{**previous,'version':identity_input(client)['version']}).status_code==200
