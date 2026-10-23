import pytest
from pydantic import ValidationError
from app.website_design import WebsiteDesign, RESERVED_PAGES
from test_school_website_domains import website, another_school
from test_website_design import image_file
from conftest import API


def page(slug='a-escola',published=True):
    return {'slug':slug,'title':'Nossa história','introduction':'Uma história da escola.','published':published,
        'sections':[{'id':'origem','kind':'text','title':'A origem','text':'Conteúdo desta página.'}]}


@pytest.mark.parametrize('slug',list(RESERVED_PAGES)+['../a','a/b','a.html','A-Escola',''])
def test_reserved_or_invalid_slug_rejected(slug):
    with pytest.raises(ValidationError):WebsiteDesign(pages=[page(slug)])


def test_duplicate_and_aggregate_bounds():
    with pytest.raises(ValidationError):WebsiteDesign(pages=[page(),page()])
    with pytest.raises(ValidationError,match='origem'):
        WebsiteDesign(pages=[{**page('one'),'model_origin':'horizon:escola'},{**page('two'),'model_origin':'horizon:escola'}])
    assert len(WebsiteDesign(pages=[page('pagina-'+str(i)) for i in range(20)]).pages)==20
    with pytest.raises(ValidationError):WebsiteDesign(pages=[page('pagina-'+str(i)) for i in range(21)])
    pages=[{**page('pagina-'+str(i)),'sections':[{'id':'secao-'+str(j),'kind':'text','text':'x'*10000} for j in range(20)]} for i in range(6)]
    with pytest.raises(ValidationError,match='1 MB'):WebsiteDesign(pages=pages)


def test_real_pages_publication_preview_isolation_and_unpublish(api,client):
    config=website('Página inicial','real-pages.example.test')
    design={'configured':True,'pages':[page(),page('privada',False)],'menu':[{'label':'A escola','url':'/a-escola'}]}
    draft=api.call('PUT','/website/draft',{**config,'design':design})
    public='/api/v1/public/schools/'+api.school['id']+'/website'
    assert client.get(public+'?page=a-escola').status_code==404
    preview=api.post('/website/preview?page=privada',{**config,'design':design},200)
    assert 'Nossa história' in preview['html']
    row=api.post('/website/publish',{'version':draft['version']},200)
    response=client.get(public+'?page=a-escola');assert response.status_code==200,response.text
    assert response.json()['page']['slug']=='a-escola'
    assert client.get(public+'?page=privada').status_code==404
    assert client.get(public+'?page=inexistente').status_code==404
    assert 'privada' not in client.get(public).text
    assert client.get('/api/v1/public/website/by-host?page=a-escola',headers={'X-Website-Host':'real-pages.example.test'}).json()['page']['slug']=='a-escola'
    assert client.get('/api/v1/public/website/by-host?page=a-escola',headers={'X-Website-Host':'unknown.example.test'}).status_code==404
    other=API(client,api.headers,another_school(client,api.headers))
    other.call('PUT','/website',{**website('Outra escola','isolated-pages.example.test'),'design':{'configured':True,'pages':[page('outra')]}})
    assert client.get('/api/v1/public/website/by-host?page=a-escola',headers={'X-Website-Host':'isolated-pages.example.test'}).status_code==404
    design['pages'][0]['published']=False;design['menu']=[]
    draft=api.call('PUT','/website/draft',{**config,'version':row['version'],'design':design})
    assert client.get(public+'?page=a-escola').status_code==200
    api.post('/website/publish',{'version':draft['version']},200)
    assert client.get(public+'?page=a-escola').status_code==404


def test_internal_links_must_resolve_on_publish(api):
    config=website('Site','page-links.example.test')
    for target in ['/missing','/admin','/a-escola?x=1','/nested/page']:
        api.call('PUT','/website',{**config,'design':{'menu':[{'label':'Link','url':target}],'pages':[page()]}},expect=422)
    draft=api.call('PUT','/website/draft',{**config,'design':{'pages':[page('privada',False)],'menu':[{'label':'Página','url':'/privada'}]}})
    api.post('/website/publish',{'version':draft['version']},422)
    assert api.get('/website')['configuration']['enabled'] is False
    api.call('PUT','/website',{**config,'version':draft['version'],'design':{'pages':[page()],'menu':[{'label':'A escola','url':'/a-escola#origem'},{'label':'Início','url':'/'}]}})


def test_page_images_and_hidden_content_respect_publication(api,client):
    uploaded=client.post(api.base+'/website/assets',headers=api.headers,files={'image':image_file('orange')}).json()
    image={k:v for k,v in uploaded.items() if k!='id'}
    config=website('Site','page-photos.example.test')
    unpublished={**page('em-revisao',False),'image':image}
    row=api.call('PUT','/website',{**config,'design':{'configured':True,'pages':[unpublished]}})
    assert client.get(image['url']).status_code==404
    public='/api/v1/public/schools/'+api.school['id']+'/website'
    assert image['url'] not in client.get(public).text
    visible={**unpublished,'published':True,'sections':[{'id':'oculto','kind':'text','visible':False,'title':'SEGREDO'}]}
    row=api.call('PUT','/website',{**config,'version':row['version'],'design':{'configured':True,'pages':[visible]}})
    assert client.get(image['url']).status_code==200
    response=client.get(public+'?page=em-revisao')
    assert 'SEGREDO' not in response.text
    assert response.json()['page']['image']['url']==image['url']


def test_hidden_section_links_do_not_block_publication(api,client):
    hidden={'id':'rascunho','kind':'cta','visible':False,'title':'Não publicado','action':{'label':'Escola','url':'/escola'}}
    design={'configured':True,'sections':[hidden],'pages':[page('escola',False),{**page('visivel'),'sections':[hidden]}]}
    api.call('PUT','/website',{**website('Publicado','hidden-page-link.example.test'),'design':design})
    payload=client.get('/api/v1/public/schools/'+api.school['id']+'/website').json()
    assert payload['website']['design']['sections']==[]
    assert payload['website']['design']['pages'][0]['sections']==[]
    assert 'Não publicado' not in str(payload)


def test_configured_menu_anchors_require_visible_home_sections(api):
    config=website('Site','anchor-check.example.test')
    for target in ['#inexistente','#oculto']:
        api.call('PUT','/website',{**config,'design':{'configured':True,'menu':[{'label':'Menu','url':target}],'sections':[{'id':'oculto','kind':'text','visible':False}]}},expect=422)
    design={'configured':True,'menu':[{'label':'Seção','url':'#proposta'},{'label':'Contato','url':'#contato'},{'label':'Topo','url':'#topo'}],'sections':[{'id':'proposta','kind':'text'}]}
    row=api.call('PUT','/website',{**config,'design':design})
    api.call('PUT','/website',{**config,'version':row['version'],'design':{'configured':False,'menu':[{'label':'Legado','url':'#escola'}]}})
