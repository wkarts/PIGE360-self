from test_school_website_domains import website, another_school
from conftest import API


def test_draft_publication_preview_and_conflict_preserve_public(api,client):
    config=website('Título publicado','editor.example.test')
    published=api.call('PUT','/website',config)
    draft=api.call('PUT','/website/draft',{**config,'version':published['version'],'headline':'Título em revisão','theme':'culture'})
    public=client.get('/api/v1/public/schools/'+api.school['id']+'/website').json()
    assert public['website']['headline']=='Título publicado'
    assert 'Título em revisão' not in public['html']
    private=api.post('/website/preview',{**config,'headline':'Título em revisão','theme':'culture'},200)
    assert 'Título em revisão' in private['html']
    assert 'culture-cover' in private['html']
    api.post('/website/publish',{'version':published['version']},409)
    result=api.post('/website/publish',{'version':draft['version']},200)
    assert result['draft'] is None
    public=client.get('/api/v1/public/schools/'+api.school['id']+'/website').json()
    assert public['html']==private['html']


def test_invalid_headline_stays_in_draft_without_breaking_site(api):
    config=website('https://wrong.example.test','invalid-editor.example.test')
    row=api.call('PUT','/website/draft',config)
    api.post('/website/publish',{'version':row['version']},422)
    assert api.get('/website')['configuration']['draft']['headline']==config['headline']
    assert api.get('/website')['configuration']['enabled'] is False


def test_brand_inheritance_reset_and_isolation(api,client):
    first=api.call('PUT','/website',{**website('Escola A','brand-a.example.test'),'brand':{'display_name':'Marca A','primary_color':'#335577'}})
    other=API(client,api.headers,another_school(client,api.headers))
    other.call('PUT','/website',{**website('Escola B','brand-b.example.test'),'brand':{'display_name':'Marca B'}})
    a=client.get('/api/v1/public/schools/'+api.school['id']+'/website').json()
    b=client.get('/api/v1/public/schools/'+other.school['id']+'/website').json()
    assert a['identity']['display_name']=='Marca A'
    assert b['identity']['display_name']=='Marca B'
    assert a['identity']['primary_color']!=b['identity']['primary_color']
    api.call('PUT','/website',{**website('Escola A','brand-a.example.test'),'version':first['version'],'brand':{}})
    reset=client.get('/api/v1/public/schools/'+api.school['id']+'/website').json()
    assert reset['identity']['primary_color']==b['identity']['primary_color']


def test_renderer_escapes_long_content_and_separates_actions(api):
    for theme,marker in [('horizon','institutional-cover'),('editorial','editorial-cover'),('culture','culture-cover'),('campus','campus-cover')]:
        preview=api.post('/website/preview',{**website('<script>alert(1)</script>','safe.example.test'),'theme':theme,'admission_url':'https://school.example.test/online.html','about':''},200)
        assert marker in preview['html'].split('<body', 1)[1]
        assert '<script>alert(1)</script>' not in preview['html']
        assert 'Inscrição e matrícula' in preview['html'] and 'Portal da família' in preview['html']
        assert 'class="about"' not in preview['html']


def test_unpublish_preserves_unsaved_draft_atomically(api,client):
    config=website('Publicação preservada','unpublish.example.test')
    row=api.call('PUT','/website',config)
    result=api.post('/website/unpublish',{**config,'version':row['version'],'headline':'Alteração não publicada'},200)
    assert not result['enabled'] and result['draft']['headline']=='Alteração não publicada'
    assert result['headline']=='Publicação preservada'
    assert client.get('/api/v1/public/schools/'+api.school['id']+'/website').status_code==404
    api.post('/website/publish',{'version':result['version']},200)
    assert client.get('/api/v1/public/schools/'+api.school['id']+'/website').json()['website']['headline']=='Alteração não publicada'
