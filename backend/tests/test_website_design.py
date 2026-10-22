import pytest
from pydantic import ValidationError
from app.website_design import WebsiteDesign, WebsiteImage, WebsiteLink
from test_school_website_domains import website


def design(title='Nossa proposta'):
    return {'header_sticky':True,'mobile_actions':False,'eyebrow':'Conheça a escola',
        'hero_image':{'url':'https://images.example.test/school.jpg','alt':'Sala de aula','focal_x':25},
        'menu':[{'label':'Proposta','url':'#proposta'}],
        'sections':[{'id':'proposta','kind':'split','title':title,'visible':True}]}


@pytest.mark.parametrize('url',['javascript:alert(1)','data:image/svg+xml,<svg/>','//evil.test/x','/\\evil.test/x','/api/v1/%2e%2e/private','/api/v1/%0ax','https://u:p@evil.test/a','http://example.test/a','https://example.test:99999/a'])
def test_image_rejects_unsafe_urls(url):
    with pytest.raises(ValidationError):WebsiteImage(url=url)


@pytest.mark.parametrize('url',['javascript:alert(1)','//evil.test/a','/%2fexample.test','https://a.test/%0d%0aX:evil','/a/../b','mailto:person@example.test?body=secret'])
def test_links_reject_unsafe_urls(url):
    with pytest.raises(ValidationError):WebsiteLink(url=url)


@pytest.mark.parametrize('url',['https://example.test/a?x=1','#proposta','/pagina','mailto:secretaria@example.test','tel:+5575999999999',''])
def test_links_accept_supported_destinations(url):
    assert WebsiteLink(url=url).url==url


def test_bounds_ids_and_partial_draft():
    WebsiteDesign(hero_image={},primary_action={},sections=[{'id':'proposta','kind':'text','image':{},'action':{}}])
    with pytest.raises(ValidationError):WebsiteImage(focal_x=101)
    with pytest.raises(ValidationError):WebsiteImage(focal_x=float('nan'))
    with pytest.raises(ValidationError):WebsiteDesign(sections=[{'id':'same','kind':'text'}]*2)
    with pytest.raises(ValidationError):WebsiteDesign(sections=[{'id':'contato','kind':'text'}])
    with pytest.raises(ValidationError):WebsiteDesign(menu=[{'url':'#a'}]*9)
    with pytest.raises(ValidationError):WebsiteDesign(arbitrary_script='alert(1)')


def test_design_draft_publication_and_legacy_preservation(api,client):
    config=website('Título público','design.example.test')
    published=api.call('PUT','/website',{**config,'design':design('Proposta pública')})
    draft=api.call('PUT','/website/draft',{**config,'version':published['version'],'design':design('Proposta privada')})
    pub=client.get('/api/v1/public/schools/'+api.school['id']+'/website').json()
    assert pub['website']['design']['sections'][0]['title']=='Proposta pública'
    assert 'Proposta privada' not in pub['html']
    updated=api.call('PUT','/website/draft',{**config,'version':draft['version'],'headline':'Novo título'})
    assert updated['draft']['design']['sections'][0]['title']=='Proposta privada'
    api.post('/website/publish',{'version':updated['version']},200)
    pub=client.get('/api/v1/public/schools/'+api.school['id']+'/website').json()
    assert pub['website']['design']['sections'][0]['title']=='Proposta privada'
    current=api.get('/website')['configuration']
    direct=api.call('PUT','/website',{**config,'version':current['version']})
    assert direct['design']['sections'][0]['title']=='Proposta privada'
    withdrawn=api.post('/website/unpublish',{**config,'version':direct['version']},200)
    assert withdrawn['draft']['design']['sections'][0]['title']=='Proposta privada'
    reset=api.call('PUT','/website/draft',{**config,'version':withdrawn['version'],'design':{}})
    assert reset['draft']['design']['sections']==[]


def test_invalid_design_not_written(api):
    config=website('Valid title','invalid-design.example.test')
    api.call('PUT','/website/draft',{**config,'design':{'menu':[{'url':'javascript:alert(1)'}]}},expect=422)
    assert api.get('/website')['configuration'] is None


def image_file(color='red'):
    import io
    from PIL import Image
    buffer=io.BytesIO();Image.new('RGB',(30,20),color).save(buffer,'JPEG')
    return ('photo.jpg',buffer.getvalue(),'image/jpeg')


def test_uploaded_images_private_until_publish_and_withdrawn(api,client):
    response=client.post(api.base+'/website/assets',headers=api.headers,files={'image':image_file()})
    assert response.status_code==201,response.text
    image=response.json();assert image['url'].startswith('/api/v1/public/schools/')
    assert client.get(image['url']).status_code==404
    config=website('Nossa escola','assets.example.test')
    data=design();data['hero_image']={k:v for k,v in image.items() if k!='id'}
    row=api.call('PUT','/website/draft',{**config,'design':data})
    assert client.get(image['url']).status_code==404
    preview=api.post('/website/preview',{**config,'design':data},200)
    assert 'data:image/png;base64,' in preview['html']
    row=api.post('/website/publish',{'version':row['version']},200)
    public=client.get(image['url']);assert public.status_code==200
    assert public.content.startswith(b'\x89PNG')
    assert public.headers['cache-control']=='no-store'
    api.post('/website/unpublish',{**config,'version':row['version']},200)
    assert client.get(image['url']).status_code==404
    duplicate=client.post(api.base+'/website/assets',headers=api.headers,files={'image':image_file()})
    assert duplicate.json()['id']==image['id']


def test_upload_rejects_invalid_bytes_and_cross_school_reference(api,client):
    from test_school_website_domains import another_school
    from conftest import API
    bad=client.post(api.base+'/website/assets',headers=api.headers,files={'image':('evil.svg',b'<svg/>','image/png')})
    assert bad.status_code==422
    assert client.post(api.base+'/website/assets',files={'image':image_file()}).status_code in (401,403)
    image=client.post(api.base+'/website/assets',headers=api.headers,files={'image':image_file('blue')}).json()
    other=API(client,api.headers,another_school(client,api.headers))
    data=design();data['hero_image']={k:v for k,v in image.items() if k!='id'}
    other.call('PUT','/website/draft',{**website('Outra escola','other-assets.example.test'),'design':data},expect=422)


def test_post_images_follow_publication_window_and_audience(api,client):
    uploaded=client.post(api.base+'/website/assets',headers=api.headers,files={'image':image_file('green')}).json()
    image={k:v for k,v in uploaded.items() if k!='id'}
    post={'title':'História da escola','content':'Conteúdo público de teste.','image':image,'status':'published','audience':'authenticated'}
    row=api.post('/community-posts',post)
    assert client.get(image['url']).status_code==404
    row=api.patch('/community-posts/'+row['id'],{**post,'audience':'public','version':row['version']})
    assert client.get(image['url']).status_code==200
    assert client.get('/api/v1/public/schools/'+api.school['id']+'/community-feed').json()['items'][0]['image']==image
    old={k:v for k,v in post.items() if k!='image'}
    row=api.patch('/community-posts/'+row['id'],{**old,'audience':'public','version':row['version']})
    assert row['image']==image
    row=api.patch('/community-posts/'+row['id'],{**post,'audience':'public','status':'archived','version':row['version']})
    assert client.get(image['url']).status_code==404
    future={**post,'audience':'public','status':'published','publish_at':'2099-01-01T00:00:00Z','version':row['version']}
    api.patch('/community-posts/'+row['id'],future)
    assert client.get(image['url']).status_code==404


def test_hidden_sections_are_not_public_assets_or_payload(api,client):
    uploaded=client.post(api.base+'/website/assets',headers=api.headers,files={'image':image_file('yellow')}).json()
    image={k:v for k,v in uploaded.items() if k!='id'}
    config=website('Escola','hidden-sections.example.test')
    data={'configured':True,'sections':[{'id':'hidden','kind':'split','visible':False,'image':image,'title':'Não divulgar'}]}
    api.call('PUT','/website',{**config,'design':data})
    response=client.get('/api/v1/public/schools/'+api.school['id']+'/website')
    assert 'Não divulgar' not in response.text
    assert client.get(image['url']).status_code==404


def test_migration_preserves_existing_content():
    import importlib.util
    from pathlib import Path
    import sqlalchemy as sa
    from alembic.migration import MigrationContext
    from alembic.operations import Operations
    path=Path(__file__).parents[1]/'migrations/versions/0054_website_design.py'
    spec=importlib.util.spec_from_file_location('website_design_migration',path)
    migration=importlib.util.module_from_spec(spec);spec.loader.exec_module(migration)
    with sa.create_engine('sqlite://').begin() as connection:
        connection.execute(sa.text('CREATE TABLE schools (id VARCHAR(36) PRIMARY KEY)'))
        connection.execute(sa.text('CREATE TABLE school_websites (id TEXT PRIMARY KEY, headline TEXT)'))
        connection.execute(sa.text('CREATE TABLE school_community_posts (id TEXT PRIMARY KEY, content TEXT)'))
        connection.execute(sa.text("INSERT INTO school_websites VALUES ('existing','Original')"))
        connection.execute(sa.text("INSERT INTO school_community_posts VALUES ('post','Texto original')"))
        with Operations.context(MigrationContext.configure(connection)):
            migration.upgrade()
            assert connection.execute(sa.text('SELECT design FROM school_websites')).scalar_one()=='{}'
            assert connection.execute(sa.text('SELECT image FROM school_community_posts')).scalar_one() is None
            migration.downgrade()
        assert connection.execute(sa.text('SELECT headline FROM school_websites')).scalar_one()=='Original'
        assert connection.execute(sa.text('SELECT content FROM school_community_posts')).scalar_one()=='Texto original'


def test_asset_library_list_delete_protects_all_references(api,client):
    uploaded=client.post(api.base+'/website/assets',headers=api.headers,files={'image':image_file('purple')}).json()
    image={k:v for k,v in uploaded.items() if k!='id'}
    items=api.get('/website/assets')['items']
    assert items[0]['id']==uploaded['id'] and len(items[0]['sha256'])==64
    assert 'content' not in items[0]
    assert items[0]['thumbnail'].startswith('data:image/png;base64,')
    assert len(items[0]['thumbnail'])<30*1024
    config=website('Escola','library.example.test')
    row=api.call('PUT','/website/draft',{**config,'design':{'hero_image':image}})
    api.call('DELETE','/website/assets/'+uploaded['id'],expect=409)
    api.call('PUT','/website/draft',{**config,'version':row['version'],'design':{}})
    post=api.post('/community-posts',{'title':'Rascunho com foto','content':'Conteúdo em rascunho.','image':image})
    api.call('DELETE','/website/assets/'+uploaded['id'],expect=409)
    api.call('DELETE','/community-posts/'+post['id']+'?version='+str(post['version']))
    assert api.call('DELETE','/website/assets/'+uploaded['id'])=={'deleted':True}
    assert api.get('/website/assets')['items']==[]
