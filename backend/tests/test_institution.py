"""Identidade institucional persistente, validação de arquivos e autorização."""
import io
import json
import uuid
from PIL import Image
from app.db import SessionLocal
from app import models as m
from app.institution import InstitutionAsset, InstitutionIdentity
from conftest import PASSWORD


def data(client, **changes):
    current = client.get('/api/v1/institution/identity').json()
    value = {k: current[k] for k in ('version','display_name','short_name','primary_color','secondary_color','font_family')}
    return {**value, **changes}


def save(client, admin, changes=None, files=None):
    return client.put('/api/v1/institution/identity', headers=admin,
        data={'payload':json.dumps(data(client, **(changes or {})))}, files=files)


def image():
    buffer=io.BytesIO();Image.new('RGBA',(80,40),(30,60,90,128)).save(buffer,'PNG');return buffer.getvalue()


def test_identity_is_school_not_supplier(client):
    value=client.get('/api/v1/institution/identity').json()
    assert value['display_name']=='Escola de Teste'
    assert not any(k in value for k in ('company_id','setup_token','api_key','smtp_password','identity'))
    assert 'PIGE360' not in value['display_name']


def test_identity_requires_admin(client,admin,school):
    assert save(client,{}, {'display_name':'Ataque'}).status_code==401
    email=uuid.uuid4().hex+'@example.com'
    result=client.post('/api/v1/users',headers=admin,json={'name':'Consulta','email':email,'password':PASSWORD,'role':'viewer','school_ids':[school['id']]})
    assert result.status_code==201,result.text
    session=client.post('/api/v1/auth/login',json={'email':email,'password':PASSWORD}).json()
    assert save(client,{'Authorization':'Bearer '+session['access_token']}).status_code==403


def test_identity_persists_and_updates_manifest_theme_icons(client,admin):
    before=data(client)
    result=save(client,admin, {'display_name':'Colégio Exemplo','short_name':'Exemplo','primary_color':'#5A1623','font_family':'georgia'},
        files={'logo':('marca.png',image(),'image/png')})
    assert result.status_code==200,result.text
    value=result.json()
    assert value['version']==before['version']+1
    with SessionLocal() as db:
        install=db.get(InstitutionIdentity,1)
        assert install.identity['display_name']=='Colégio Exemplo'
        assert db.get(InstitutionAsset,install.identity['logo_asset_id']).media_type=='image/png'
    assert client.get(value['logo_url']).content.startswith(b'\x89PNG')
    manifest=client.get('/manifest.webmanifest').json()
    assert manifest['name']=='Colégio Exemplo' and manifest['short_name']=='Exemplo'
    assert manifest['theme_color']=='#5A1623'
    for icon in manifest['icons']:
        with Image.open(io.BytesIO(client.get(icon['src']).content)) as im:
            assert f'{im.width}x{im.height}'==icon['sizes']
    css=client.get('/api/v1/institution/theme.css').text
    assert 'Georgia' in css and '#5A1623' in css
    assert 'googleapis' not in css and '@import' not in css
    stale=client.put('/api/v1/institution/identity',headers=admin,data={'payload':json.dumps(before)})
    assert stale.status_code==409
    # Restaurar os valores públicos para não acoplar os demais testes ao tema usado aqui.
    assert save(client,admin,{**before,'version':value['version'],'remove_logo':True}).status_code==200
    assert client.get(value['logo_url']).status_code==404


def test_identity_rejects_invalid_files_and_css(client,admin):
    before=client.get('/api/v1/institution/identity').json()
    assert save(client,admin,{'primary_color':'red; background:url(https://evil.test)'}).status_code==422
    assert save(client,admin,{'font_family':'custom'}).status_code==422
    assert save(client,admin,files={'logo':('logo.svg',b'<svg onload="alert(1)"/>','image/svg+xml')}).status_code==422
    assert save(client,admin,files={'logo':('large.png',b'x'*(2*1024*1024+1),'image/png')}).status_code==422
    assert save(client,admin,{'font_family':'custom','font_license_confirmed':True},
                {'font':('font.woff2',b'wOF2'+b'\0'*60,'font/woff2')}).status_code==422
    assert client.get('/api/v1/institution/identity').json()==before
    assert client.get('/api/v1/institution/assets/not-a-logo').status_code==404
    assert client.get('/api/v1/institution/icon.png?size=999999').status_code==422


def test_maintainer_document_can_be_edited_without_recreating_school(client,admin):
    company=client.get('/api/v1/companies',headers=admin).json()[0]
    count=len(client.get('/api/v1/companies',headers=admin).json())
    before_schools=client.get('/api/v1/schools',headers=admin).json()
    result=client.patch('/api/v1/companies/'+company['id'],headers=admin,
        json={'version':company['version'],'data':{'name':company['name'],'document':'11222333000181'}})
    assert result.status_code==200,result.text
    assert result.json()['id']==company['id'] and result.json()['document']=='11222333000181'
    assert len(client.get('/api/v1/companies',headers=admin).json())==count
    assert client.get('/api/v1/schools',headers=admin).json()==before_schools
