"""Renderer safety and composition tests, independent of database fixtures."""
from html.parser import HTMLParser
from app.website_render import render, safe_url, picture


class Nodes(HTMLParser):
    def __init__(self, document):
        super().__init__()
        self.nodes = []
        self.feed(document)

    def handle_starttag(self, tag, attrs):
        self.nodes.append((tag, dict(attrs)))


def fixture(theme='horizon'):
    return {
        'school': {'id':'school-a','name':'Escola de teste','address':'Rua de teste','phone':'','email':''},
        'identity': {'display_name':'Marca da instalação','primary_color':'#245577','secondary_color':'#172f44','font_family':'custom'},
        'website': {'theme':theme,'headline':'Conhecimento e descoberta','introduction':'Uma apresentação.','about':'Texto legado.','portal_url':'https://portal.example.test/family.html','admission_url':'https://example.test/online.html','design':{
            'configured':True,'eyebrow':'Nossa escola',
            'hero_image': {'url':'https://images.example.test/hero.jpg','alt':'Atividade escolar','focal_x':30,'focal_y':70},
            'hero_gallery':[{'url':'https://images.example.test/a.jpg','alt':'Sala A'},{'url':'https://images.example.test/b.jpg','alt':'Sala B'}],
            'menu':[{'label':'Etapas','url':'#etapas'}],
            'sections':[{'id':'etapas','kind':'cards','title':'Nossas etapas','items':[{'title':'Uma etapa','text':'Conheça o percurso.','image':{'url':'https://images.example.test/card.jpg','alt':'Aprendizagem'},'action':{'label':'Saiba mais','url':'#contato'}}]},
                        {'id':'historia','kind':'split','title':'Nossa história','image':{'url':'https://images.example.test/history.jpg','alt':''},'text':'Nossa trajetória.'},
                        {'id':'noticias','kind':'news','title':'Publicações'},
                        {'id':'agenda','kind':'agenda','title':'Encontros'}],
            'header_sticky':False,'mobile_actions':False,
        }},
        'posts':[{'kind':'news','title':'Notícia pública','summary':'Resumo','content':'Texto completo'}, {'kind':'event','title':'Evento público','event_start':'2027-03-12T10:00:00-03:00','location':'Pátio','content':'Encontro'}],
    }


def test_four_distinct_compositions_use_configured_media():
    expected={'horizon':'institutional-cover','editorial':'editorial-cover','culture':'culture-cover','campus':'campus-cover'}
    for theme, marker in expected.items():
        document=render(fixture(theme))
        nodes=Nodes(document).nodes
        assert any(marker in attrs.get('class','').split() for _,attrs in nodes)
        assert '<h1>Conhecimento e descoberta</h1>' in document
        assert 'Marca da instalação' in document
        assert '--brand:#245577' in document
        assert '--font:var(--institution-font,system-ui,sans-serif)' in document
        assert 'Notícia pública' in document and 'Evento público' in document
        assert any(tag=='img' and attrs.get('src')=='https://images.example.test/card.jpg' for tag,attrs in nodes)
        assert not any(tag=='script' for tag,_ in nodes)


def test_order_visibility_and_empty_sections_are_intentional():
    data=fixture()
    data['website']['design']['sections']=[{'id':'second','kind':'text','title':'Second title','text':'Second body'}, {'id':'hidden','kind':'text','visible':False,'title':'Hidden title'}, {'id':'first','kind':'text','title':'First title'}]
    document=render(data)
    assert document.index('Second title')<document.index('First title')
    assert 'Hidden title' not in document
    data['website']['design']['sections']=[]
    document=render(data)
    assert 'Notícia pública' not in document and 'Texto legado.' not in document
    data['website']['design']={}
    document=render(data)
    assert 'Texto legado.' in document and 'Notícia pública' in document


def test_fixed_controls_are_independent_and_footer_stays_in_flow():
    for sticky in [False,True]:
        for mobile in [False,True]:
            data=fixture()
            data['website']['design'].update(header_sticky=sticky,mobile_actions=mobile)
            nodes=Nodes(render(data)).nodes
            header=next(attrs for tag,attrs in nodes if tag=='header')
            assert ('is-sticky' in header['class'].split()) is sticky
            assert any(tag=='nav' and attrs.get('class')=='mobile-actions' for tag,attrs in nodes) is mobile
            assert next(attrs for tag,attrs in nodes if tag=='footer')['class']=='site-footer'
            assert any(tag=='details' and attrs.get('class')=='mobile-menu' for tag,attrs in nodes)


def test_text_urls_and_styles_cannot_inject_markup():
    data=fixture()
    bad='<script>alert(1)</script>'
    data['website']['headline']=bad
    design=data['website']['design']
    design['hero_image']={'url':'javascript:alert(1)','alt':bad,'focal_x':'50; color:red'}
    design['menu']=[{'label':bad,'url':'javascript:alert(1)'},{'label':bad,'url':'#contato'}]
    design['sections'][0]['title']=bad
    design['sections'][0]['items'][0]['action']={'label':'Unsafe','url':'//attacker.example/'}
    data['identity']['primary_color']='red; background:url(https://attacker.example)'
    document=render(data)
    assert bad not in document
    assert '&lt;script&gt;' in document
    assert 'javascript:' not in document and 'attacker.example' not in document
    assert '--brand:#006D77' in document
    assert not any(tag=='script' for tag,_ in Nodes(document).nodes)


def test_url_validation_and_focal_points_are_defensive():
    for url in ['javascript:alert(1)','http://example.test/a','//example.test/a','/\\example.test/a','/%2fexample.test/a','https://u:p@example.test/a','https://example.test:99999/a','https://example.test/a%0ab',' data:image/png;base64,x']:
        assert not safe_url(url)
    for url in ['https://example.test/a?b=1','#etapas','/pagina','mailto:secretaria@example.test','tel:+557100000000']:
        assert safe_url(url)==url
    assert not safe_url('/untrusted.jpg',image=True)
    assert safe_url('/api/v1/institution/assets/a.png',image=True)
    rendered=picture({'url':'https://example.test/a.jpg','focal_x':float('nan'),'focal_y':300,'alt':'" onerror="alert(1)'})
    attrs=Nodes(rendered).nodes[0][1]
    assert attrs['style']=='object-position:50% 100%'
    assert 'onerror' not in attrs


def test_all_section_kinds_and_safe_ids():
    data=fixture()
    data['website']['design']['sections']=[{'id':kind,'kind':kind,'title':kind,'image':{'url':'https://example.test/a.jpg','alt':'imagem'},'items':[{'title':'Item','text':'Texto'}]} for kind in ['cards','split','gallery','steps','cta','news','agenda','text']]
    document=render(data)
    nodes=Nodes(document).nodes
    ids=[attrs['id'] for _,attrs in nodes if 'id' in attrs]
    assert len(ids)==len(set(ids))
    for kind in ['cards','split','gallery','steps','cta','news','agenda','text']:
        assert any(attrs.get('id')==kind and 'section-'+kind in attrs.get('class','') for _,attrs in nodes)


def test_default_design_matches_legacy_and_unconfigured_edits_keep_content():
    data=fixture()
    data['website']['design']={}
    original=render(data)
    data['website']['design']={'configured':False,'sections':[],'menu':[],'header_sticky':False,'mobile_actions':False,'hero_image':None,'hero_gallery':[],'primary_action':None,'secondary_action':None,'footer_text':'','eyebrow':''}
    assert render(data)==original
    data['website']['design']['header_sticky']=True
    assert 'Texto legado.' in render(data)
    data['website']['design']['configured']=True
    assert 'Texto legado.' not in render(data)


def test_community_magazine_uses_uploaded_images_and_all_public_stories():
    data=fixture('campus')
    data['posts']=[{'kind':'news','title':f'Notícia {i}','summary':'Resumo','content':'Texto','image':{'url':f'/api/v1/schools/site-assets/{i}.png','alt':f'Imagem {i}','focal_x':20,'focal_y':40}} for i in range(5)]
    document=render(data)
    nodes=Nodes(document).nodes
    for marker in ['magazine-lead','magazine-secondary','magazine-more']:
        assert any(attrs.get('class')==marker for _,attrs in nodes)
    for i in range(5):
        assert f'Notícia {i}' in document
        assert any(tag=='img' and attrs.get('alt')==f'Imagem {i}' for tag,attrs in nodes)
    assert 'object-position:20% 40%' in document


def test_institution_logo_and_long_content_remain_escaped():
    data=fixture()
    data['identity']['logo_url']='/api/v1/institution/assets/'+'a'*64+'.png'
    data['website']['headline']='Título muito longo ' * 50
    data['website']['design']['sections'][0]['items'][0]['text']='PalavraSemEspaços'*100
    document=render(data)
    assert data['identity']['logo_url'] in document
    assert data['website']['headline'] in document
    assert 'overflow-wrap:anywhere' in document


def test_generated_ids_cannot_collide_with_editorial_ids():
    data=fixture()
    data['website']['design']['sections']=[{'id':'secao-2','kind':'text','title':'A'},{'id':'secao-2','kind':'text','title':'B'}]
    ids=[attrs['id'] for _,attrs in Nodes(render(data)).nodes if 'id' in attrs]
    assert len(ids)==len(set(ids))


def test_agenda_uses_school_timezone_not_utc_date():
    data=fixture()
    data['posts']=[{'kind':'event','title':'Encontro noturno','event_start':'2027-03-13T01:00:00Z'}]
    document=render(data)
    assert '<b>12</b> MAR' in document


def test_internal_page_uses_own_content_and_keeps_shared_identity():
    data=fixture('editorial')
    data['website']['design']['header_sticky']=True
    data['website']['design']['mobile_actions']=True
    data['page']={'slug':'proposta','title':'Nossa proposta','introduction':'Apresentação da página interna.','image':{'url':'https://images.example.test/page.jpg','alt':'Foto da proposta'},'sections':[{'id':'principios','kind':'text','title':'Nossos princípios','text':'Conteúdo exclusivo da página.'}]}
    document=render(data)
    body=document.split('<body',1)[1]
    assert '<title>Nossa proposta · Marca da instalação</title>' in document
    assert '<meta name="description" content="Apresentação da página interna.">' in document
    assert '<h1>Nossa proposta</h1>' in body
    assert 'Conteúdo exclusivo da página.' in body
    assert 'Conhecimento e descoberta' not in body
    assert 'Nossa história' not in body and 'Texto legado.' not in body
    assert 'https://images.example.test/hero.jpg' not in body
    assert 'https://images.example.test/page.jpg' in body
    assert '--brand:#245577' in document and 'Marca da instalação' in body
    assert 'internal-cover' in body and 'editorial-cover' not in body
    nodes=Nodes(document).nodes
    assert next(attrs for tag,attrs in nodes if attrs.get('class')=='wordmark')['href']=='/'
    assert any(tag=='a' and attrs.get('href')=='/#etapas' for tag,attrs in nodes)
    assert any(tag=='header' and 'is-sticky' in attrs.get('class','') for tag,attrs in nodes)
    assert any(tag=='nav' and attrs.get('class')=='mobile-actions' for tag,attrs in nodes)
    # Rendering a page must not mutate the configuration used by a later home request.
    assert data['website']['headline']=='Conhecimento e descoberta'
    assert data['website']['design']['hero_image']['url']=='https://images.example.test/hero.jpg'


def test_internal_page_section_actions_stay_local_and_empty_never_falls_back():
    data=fixture()
    data['page']={'slug':'politica','title':'Política','sections':[{'id':'detalhes','kind':'text','title':'Detalhes','text':'Leia aqui','action':{'label':'Ver detalhes','url':'#detalhes'}}]}
    document=render(data)
    assert 'href="#detalhes"' in document
    assert 'href="/#detalhes"' not in document
    data['page']['sections']=[]
    body=render(data).split('<body',1)[1]
    assert 'Notícia pública' not in body and 'Texto legado.' not in body
    assert 'Nossa história' not in body


def test_default_menu_includes_only_published_pages_and_home_links():
    data=fixture()
    data['website']['design']['menu']=[]
    data['website']['design']['pages']=[{'slug':'a-escola','title':'A escola completa','published':True}, {'slug':'privada','title':'Página privada','published':False}]
    home=render(data)
    assert 'href="/a-escola"' in home
    assert 'href="/privada"' not in home and 'Página privada' not in home
    data['page']={'slug':'a-escola','title':'A escola completa','sections':[]}
    page=render(data)
    assert 'href="/a-escola"' in page
    assert 'href="/#etapas"' in page
    assert 'href="/#contato"' in page
    assert 'href="/privada"' not in page


def test_internal_page_metatags_and_title_escape_html():
    data=fixture()
    data['page']={'slug':'segura','title':'<script>alert(1)</script>','introduction':'"/><img src=x onerror=alert(1)>','sections':[]}
    document=render(data)
    assert '<script>' not in document
    assert '&lt;script&gt;' in document
    nodes=Nodes(document).nodes
    assert not any(tag=='img' and attrs.get('src')=='x' for tag,attrs in nodes)


def test_global_cta_anchors_target_home_but_page_section_actions_stay_local():
    data=fixture()
    design=data['website']['design']
    design['primary_action']={'label':'Agendar visita','url':'#visita'}
    design['secondary_action']={'label':'Fale conosco','url':'#atendimento'}
    design['mobile_actions']=True
    data['page']={'slug':'sobre','title':'Sobre a escola','sections':[{'id':'detalhes','kind':'text','title':'Detalhes','action':{'label':'Saiba mais aqui','url':'#detalhes'}}]}
    document=render(data)
    nodes=Nodes(document).nodes
    links=[attrs.get('href') for tag,attrs in nodes if tag=='a']
    assert '/#visita' in links and '/#atendimento' in links
    assert '#visita' not in links and '#atendimento' not in links
    assert '#detalhes' in links and '/#detalhes' not in links
    # Shared source must remain unchanged for subsequent home renders.
    assert design['primary_action']['url']=='#visita'
    assert design['secondary_action']['url']=='#atendimento'
    del data['page']
    home_links=[attrs.get('href') for tag,attrs in Nodes(render(data)).nodes if tag=='a']
    assert '#visita' in home_links and '#atendimento' in home_links
    assert '/#visita' not in home_links and '/#atendimento' not in home_links


def test_reserved_top_anchor_exists_once():
    data=fixture()
    data['website']['design']['menu']=[{'label':'Topo','url':'#topo'}]
    nodes=Nodes(render(data)).nodes
    assert sum(attrs.get('id')=='topo' for _,attrs in nodes)==1
    assert any(tag=='header' and attrs.get('id')=='topo' for tag,attrs in nodes)
