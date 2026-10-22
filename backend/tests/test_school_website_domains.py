"""Resolução pública do site por domínio cadastrado, sem school_id no deploy."""
from app.config import settings
from conftest import API


def website(headline,domain):
    return {'enabled':True,'theme':'horizon','headline':headline,
        'introduction':'Conteúdo sintético para teste de domínio.',
        'about':'Esta publicação usa somente dados fictícios.',
        'public_url':'https://'+domain,'portal_url':'https://portal.example.test'}


def another_school(client,headers):
    companies=client.get('/api/v1/companies',headers=headers)
    assert companies.status_code==200,companies.text
    items=companies.json()
    if isinstance(items,dict):items=items.get('items',[])
    assert items
    response=client.post('/api/v1/schools',headers=headers,json={
        'company_id':items[0]['id'],'name':'Unidade domínio sintética'})
    assert response.status_code==201,response.text
    return response.json()


def test_public_website_selects_each_school_by_exact_host(api,client):
    first=website('Site da primeira escola','primeira.example.test')
    api.call('PUT','/website',first)
    second_school=another_school(client,api.headers)
    second=API(client,api.headers,second_school)
    second.call('PUT','/website',website('Site da segunda escola','segunda.example.test'))

    first_response=client.get('/api/v1/public/website/by-host',headers={'X-Website-Host':'PRIMEIRA.example.test:443'})
    second_response=client.get('/api/v1/public/website/by-host',headers={'X-Website-Host':'segunda.example.test'})
    assert first_response.status_code==200,first_response.text
    assert second_response.status_code==200,second_response.text
    assert first_response.json()['website']['headline']=='Site da primeira escola'
    assert second_response.json()['website']['headline']=='Site da segunda escola'

    unknown=client.get('/api/v1/public/website/by-host',headers={'X-Website-Host':'nao-publicado.example.test'})
    assert unknown.status_code==404,unknown.text
    for value in ('primeira.example.test,outra.example.test','primeira.example.test:0','primeira.example.test:65536','primeira.example.test:'):
        malformed=client.get('/api/v1/public/website/by-host',headers={'X-Website-Host':value})
        assert malformed.status_code==400,(value,malformed.text)

    # O endpoint legado continua sem escolher arbitrariamente quando há mais de uma publicação.
    assert client.get('/api/v1/public/website').status_code==404


def test_public_website_rejects_duplicate_domain_before_publishing(api,client):
    api.call('PUT','/website',website('Site principal','compartilhado.example.test'))
    second_school=another_school(client,api.headers)
    second=API(client,api.headers,second_school)
    response=client.put(second.base+'/website',headers=second.headers,json=website('Site duplicado','COMPARTILHADO.example.test:443'))
    assert response.status_code==409,response.text


def test_public_website_requires_origin_without_path_or_query(api,client):
    for url in ('https://site.example.test/not-the-origin','https://site.example.test/?school=other','https://site.example.test:0'):
        response=api.client.put(api.base+'/website',headers=api.headers,json=website('Site inválido','site.example.test')|{'public_url':url})
        assert response.status_code==422,(url,response.text)


def test_disabled_website_is_not_resolved_by_host(api,client):
    api.call('PUT','/website',website('Site desativado','desativado.example.test'))
    current=api.get('/website')['configuration']
    disabled={**website('Site desativado','desativado.example.test'),'version':current['version'],'enabled':False}
    api.call('PUT','/website',disabled)
    response=client.get('/api/v1/public/website/by-host',headers={'X-Website-Host':'desativado.example.test'})
    assert response.status_code==404,response.text


def test_internal_website_by_host_requires_the_dedicated_service_token(api,client,monkeypatch):
    api.call('PUT','/website',website('Site interno','interno.example.test'))
    token='synthetic-website-service-token-with-more-than-32-bytes'
    monkeypatch.setattr(settings(),'website_internal_token',token)
    url='/api/v1/internal/website/by-host'
    headers={'X-Website-Host':'interno.example.test'}
    assert client.get(url,headers=headers).status_code==403
    assert client.get(url,headers={**headers,'X-Website-Key':'wrong-synthetic-token'}).status_code==403
    authorized=client.get(url,headers={**headers,'X-Website-Key':token})
    assert authorized.status_code==200,authorized.text
    assert authorized.json()['website']['headline']=='Site interno'
