import pytest
from app.website_models import catalog, ASSET_NAMES, ASSET_ROOT
from app.website_design import WebsiteDesign, validate_page_links
from app.school_website import WebsiteInput, website_values
from test_school_website_domains import website


def test_catalog_complete_editable_safe_and_fresh():
    entries=catalog()['items']
    assert {x['id'] for x in entries}=={'horizon','editorial','culture','campus'}
    for entry in entries:
        value=WebsiteInput(**entry['website'])
        d=value.design
        assert d.composition_version==2 and d.demonstration and d.configured
        assert 1<=len(d.sections)<=2 and len(d.pages)==6 and len(d.menu)==6 and d.primary_action
        assert all(link.url.startswith('/') for link in d.menu)
        assert all(page.sections and page.published for page in d.pages)
        validate_page_links(d.model_dump())
        assert 'brand' not in entry['website'] and 'public_url' not in entry['website']
        assert 'Navegantes' not in str(entry)
    entries[0]['website']['design']['sections'].clear()
    assert catalog()['items'][0]['website']['design']['sections']
    assert WebsiteDesign().composition_version==1 and not WebsiteDesign().demonstration
    for name in ASSET_NAMES:assert (ASSET_ROOT/(name+'.jpg')).stat().st_size<250000


def test_catalog_read_does_not_write_and_needs_auth(api,client):
    before=api.get('/website')
    assert len(api.get('/website/models')['items'])==4
    assert api.get('/website')==before
    response=client.get(api.base+'/website/models')
    assert response.status_code in (401,403)


def test_demo_assets_allowlist_and_mime(client):
    for name in ASSET_NAMES:
        r=client.get('/api/v1/public/website-model-assets/'+name+'.jpg')
        assert r.status_code==200 and r.headers['content-type']=='image/jpeg'
        assert r.headers['x-content-type-options']=='nosniff' and r.content.startswith(b'\xff\xd8')
    for name in ['secret.jpg','garden.png','garden.jpg.bak','..%2Fschool_website.py']:
        assert client.get('/api/v1/public/website-model-assets/'+name).status_code in (404,400)


def test_demo_guard_preview_publish_and_legacy_put(api,client):
    config={**website('Escola real','models.example.test'),**catalog()['items'][1]['website']}
    original=api.call('PUT','/website',website('Original','models.example.test'))
    draft=api.call('PUT','/website/draft',{**config,'version':original['version']})
    preview=api.post('/website/preview',config,200)
    assert 'data:image/jpeg;base64,' in preview['html']
    api.post('/website/publish',{'version':draft['version']},422)
    assert api.get('/website')['configuration']['headline']=='Original'
    api.call('PUT','/website',{**config,'version':draft['version'],'enabled':True},expect=422)
    result=api.post('/website/publish',{'version':draft['version'],'confirm_demonstration':True},200)
    assert result['design']['demonstration'] and result['draft'] is None
    assert 'confirm_demonstration' not in result


def test_bundled_photos_cannot_silently_remove_demo_label():
    value=catalog()['items'][0]['website']
    value['design']['demonstration']=False
    values=website_values(WebsiteInput(**value,confirm_demonstration=True))
    assert values['design']['demonstration']
    assert 'confirm_demonstration' not in values


def test_catalog_permission_and_school_scope(api):
    from test_school_community import role_api
    teacher=role_api(api,'teacher')
    teacher.call('GET','/website/models',expect=403)
    outsider=role_api(api,'teacher',linked=False)
    outsider.call('GET','/website/models',expect=403)


def test_unknown_demo_asset_is_rejected_in_draft(api):
    config=catalog()['items'][0]['website']
    config['design']['hero_image']['url']='/api/v1/public/website-model-assets/secret.jpg'
    api.call('PUT','/website/draft',config,expect=422)


def test_apply_checkpoint_reload_repeated_restore_preserves_published(api,client):
    config=website('Publicado original','checkpoint.example.test')
    row=api.call('PUT','/website',config)
    editor={**config,'version':row['version'],'headline':'Edição ainda não salva',
        'design':{'header_sticky':True,'mobile_actions':True,'pages':[{'slug':'historia','title':'Nossa história','sections':[]}]}}
    applied=api.post('/website/apply-model',{'model_id':'editorial','website':editor},200)
    assert applied['has_checkpoint'] and 'model_checkpoint' not in applied
    assert applied['enabled'] and applied['headline']=='Publicado original'
    assert applied['draft']['headline']!=editor['headline']
    assert applied['draft']['design']['pages'][:1]==WebsiteDesign(**editor['design']).model_dump()['pages']
    assert len(applied['draft']['design']['pages'])==7
    assert applied['draft']['public_url']==editor['public_url']
    assert applied['draft']['design']['header_sticky'] and applied['draft']['design']['mobile_actions']
    assert api.get('/website')['configuration']['has_checkpoint']
    api.post('/website/apply-model',{'model_id':'culture','website':editor},409)
    repeated=api.post('/website/apply-model',{'model_id':'culture','website':{**applied['draft'],'version':applied['version']}},200)
    api.post('/website/restore-model',{'version':applied['version']},409)
    restored=api.post('/website/restore-model',{'version':repeated['version']},200)
    assert restored['draft']['headline']=='Edição ainda não salva'
    assert not restored['has_checkpoint']
    public=client.get('/api/v1/public/schools/'+api.school['id']+'/website').json()
    assert public['website']['headline']=='Publicado original'
    assert 'model_checkpoint' not in str(public)
    assert api.get('/website')['configuration']['draft']['headline']=='Edição ainda não salva'
    api.post('/website/restore-model',{'version':restored['version']},409)


def test_checkpoint_first_application_and_rollback_scope(api,client):
    from test_school_community import role_api
    teacher=role_api(api,'teacher')
    payload={'model_id':'horizon','website':{'headline':'Antes do primeiro modelo'}}
    teacher.post('/website/apply-model',payload,403)
    teacher.post('/website/restore-model',{'version':1},403)
    outsider=role_api(api,'teacher',linked=False)
    outsider.post('/website/apply-model',payload,403)
    assert api.get('/website')['configuration'] is None
    row=api.post('/website/apply-model',payload,200)
    assert not row['enabled'] and row['has_checkpoint']
    from conftest import API
    from test_school_website_domains import another_school
    other=API(client,api.headers,another_school(client,api.headers))
    other.post('/website/restore-model',{'version':row['version']},409)
    bad={**row['draft'],'version':row['version']}
    bad['design']['hero_image']['url']='/api/v1/public/website-model-assets/secret.jpg'
    api.post('/website/apply-model',{'model_id':'culture','website':bad},422)
    assert api.get('/website')['configuration']['version']==row['version']
    restored=api.post('/website/restore-model',{'version':row['version']},200)
    assert restored['draft']['headline']=='Antes do primeiro modelo'


def test_checkpoint_references_protect_private_asset(api,client):
    from test_website_design import image_file
    uploaded=client.post(api.base+'/website/assets',headers=api.headers,files={'image':image_file('blue')}).json()
    photo={key:value for key,value in uploaded.items() if key!='id'}
    row=api.post('/website/apply-model',{'model_id':'horizon','website':{'design':{'hero_image':photo}}},200)
    api.call('DELETE','/website/assets/'+uploaded['id'],expect=409)
    assert client.get(photo['url']).status_code==404
    restored=api.post('/website/restore-model',{'version':row['version']},200)
    assert restored['draft']['design']['hero_image']==photo


def test_checkpoint_migration_upgrade_downgrade_preserves_existing_content(tmp_path):
    import json
    import os
    import subprocess
    import sys
    from pathlib import Path
    root=Path(__file__).resolve().parents[1]
    script=r'''
import json, sqlite3, os
from alembic import command
from alembic.config import Config
path=os.environ['MIGRATION_TEST_DB']
con=sqlite3.connect(path)
con.execute('CREATE TABLE school_websites (id TEXT PRIMARY KEY, enabled BOOLEAN, design JSON, draft JSON)')
con.execute('INSERT INTO school_websites VALUES (?,?,?,?)',('school-site',1,json.dumps({'sections':[{'id':'real','title':'Conteúdo real'}]}),json.dumps({'headline':'Rascunho anterior'})))
con.commit();con.close()
cfg=Config('alembic.ini')
command.stamp(cfg,'0054_website_design')
command.upgrade(cfg,'0055_website_model_checkpoint')
con=sqlite3.connect(path)
row=con.execute('SELECT enabled,design,draft,model_checkpoint FROM school_websites').fetchone()
assert row[0]==1 and json.loads(row[1])['sections'][0]['title']=='Conteúdo real'
assert json.loads(row[2])['headline']=='Rascunho anterior' and row[3] is None
con.execute('UPDATE school_websites SET model_checkpoint=?',(json.dumps({'headline':'Cópia anterior'}),));con.commit();con.close()
command.downgrade(cfg,'0054_website_design')
con=sqlite3.connect(path)
assert con.execute('SELECT enabled,design,draft FROM school_websites').fetchone()==row[:3]
assert 'model_checkpoint' not in [x[1] for x in con.execute('PRAGMA table_info(school_websites)')]
con.close()
'''
    db=tmp_path/'migration.db'
    result=subprocess.run([sys.executable,'-c',script],cwd=root,env={**os.environ,'DATABASE_URL':'sqlite:///'+str(db),'MIGRATION_TEST_DB':str(db)},capture_output=True,text=True)
    assert result.returncode==0,result.stdout+result.stderr


def test_model_page_merge_preview_apply_routes_and_restore(api,client):
    current=website('Página pública anterior','multipage-model.example.test')
    original_page={'slug':'escola','title':'Minha escola original','published':False,'sections':[{'id':'original','kind':'text','text':'Texto confidencial do rascunho'}]}
    current['design']={'pages':[original_page]}
    row=api.call('PUT','/website',current)
    editor={**current,'version':row['version']}
    preview=api.post('/website/preview-model',{'model_id':'horizon','website':editor},200)
    resolved=preview['website'];pages=resolved['design']['pages']
    assert pages[0]==WebsiteDesign(pages=[original_page]).model_dump()['pages'][0]
    assert pages[1]['slug']=='escola-2' and resolved['design']['menu'][0]['url']=='/escola-2'
    assert api.get('/website')['configuration']['version']==row['version']
    assert not api.get('/website')['configuration']['has_checkpoint']
    base='/api/v1/public/schools/'+api.school['id']+'/website'
    assert client.get(base,params={'page':'escola-2'}).status_code==404
    applied=api.post('/website/apply-model',{'model_id':'horizon','website':editor},200)
    assert applied['draft']==resolved
    assert client.get(base,params={'page':'escola-2'}).status_code==404
    api.post('/website/publish',{'version':applied['version']},422)
    published=api.post('/website/publish',{'version':applied['version'],'confirm_demonstration':True},200)
    for page in pages[1:]:
        response=client.get(base,params={'page':page['slug']})
        assert response.status_code==200 and response.json()['page']['title']==page['title']
    assert client.get(base,params={'page':'escola'}).status_code==404
    restored=api.post('/website/restore-model',{'version':published['version']},200)
    assert restored['draft']['design']['pages']==WebsiteDesign(pages=[original_page]).model_dump()['pages']
    assert client.get(base,params={'page':'escola-2'}).status_code==200 # restore is draft-only


def test_model_page_limit_and_collisions_are_atomic(api):
    pages=[{'slug':'escola' if i==0 else 'escola-'+str(i+1),'title':'Página '+str(i),'published':bool(i%2),'sections':[]} for i in range(15)]
    row=api.call('PUT','/website/draft',{'headline':'Antes','design':{'pages':pages}})
    payload={'model_id':'horizon','website':{**row['draft'],'version':row['version']}}
    api.post('/website/preview-model',payload,422)
    api.post('/website/apply-model',payload,422)
    after=api.get('/website')['configuration']
    assert after['version']==row['version'] and after['draft']==row['draft'] and not after['has_checkpoint']
    payload['website']['design']['pages']=pages[:14]
    preview=api.post('/website/preview-model',payload,200)['website']
    assert len(preview['design']['pages'])==20
    assert preview['design']['pages'][14]['slug']=='escola-15'
    assert preview['design']['menu'][0]['url']=='/escola-15'
    assert preview['design']['pages'][:14]==WebsiteDesign(pages=pages[:14]).model_dump()['pages']


def test_model_reapplication_is_idempotent_preserves_edits_and_draft_flag(api):
    row=api.post('/website/apply-model',{'model_id':'horizon','website':{}},200)
    editor={**row['draft'],'version':row['version']}
    page=editor['design']['pages'][0]
    page.update(slug='minha-escola',title='Título editado')
    page['sections'][0]['text']='Texto que não pode ser substituído'
    preview=api.post('/website/preview-model',{'model_id':'horizon','website':editor},200)['website']
    assert len(preview['design']['pages'])==6
    assert preview['design']['pages'][0]==page
    assert preview['design']['menu'][0]['url']=='/minha-escola'
    applied=api.post('/website/apply-model',{'model_id':'horizon','website':editor},200)
    assert applied['draft']==preview
    editor={**applied['draft'],'version':applied['version']}
    editor['design']['pages'][0]['published']=False
    api.post('/website/preview-model',{'model_id':'horizon','website':editor},422)
    api.post('/website/apply-model',{'model_id':'horizon','website':editor},422)
    assert api.get('/website')['configuration']['version']==applied['version']


def test_community_news_and_agenda_are_real_feed_sections():
    model=next(m['website'] for m in catalog()['items'] if m['id']=='campus')
    pages={p['slug']:p for p in model['design']['pages']}
    assert pages['noticias']['sections'][0]['kind']=='news'
    assert pages['agenda']['sections'][0]['kind']=='agenda'
    assert not pages['agenda']['sections'][0]['items']
    assert pages['contato']['show_contact_details'] is True
