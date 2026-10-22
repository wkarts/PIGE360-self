"""Complete model renderers are opt-in and retain institution-owned identity."""
import importlib.util
from html.parser import HTMLParser
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('website_v2_renderer',ROOT/'backend/app/website_render.py')
renderer=importlib.util.module_from_spec(spec);spec.loader.exec_module(renderer)

def data(theme='horizon', **design):
    return {'school':{'name':'Escola de teste','address':'Rua de teste','phone':'','email':''},'identity':{'primary_color':'#123456','secondary_color':'#234567'},'website':{'theme':theme,'headline':'Aprender juntos','introduction':'Uma escola aberta','design':design},'posts':[]}

class CompleteModelRendererTests(unittest.TestCase):
    def test_opt_in_and_contact_not_duplicated(self):
        old=renderer.render(data())
        new=renderer.render(data(composition_version=2,configured=True))
        self.assertNotIn('class="horizon composition-v2',old)
        self.assertIn('class="horizon composition-v2',new)
        self.assertIn('<section id="contato"',old)
        self.assertNotIn('<section id="contato"',new)
        self.assertIn('<footer id="contato"',new)
        self.assertIn('Rua de teste',new)

    def test_card_grids_are_single_level_with_three_direct_items(self):
        # A nested three-column grid shrinks all cards into the first third of the
        # intended row. Actual geometric coverage is also asserted in Chromium QA.
        class GridStructure(HTMLParser):
            def __init__(self):
                super().__init__();self.divs=[];self.grids=[]
            def handle_starttag(self, tag, attrs):
                attrs=dict(attrs)
                if tag=='div':
                    is_grid='items-grid' in attrs.get('class','').split()
                    if is_grid:
                        assert not any(frame is not None for frame in self.divs), 'Nested editorial grid'
                        self.grids.append(0)
                    self.divs.append(len(self.grids)-1 if is_grid else None)
                if tag=='article' and 'content-item' in attrs.get('class','').split():
                    assert self.divs and self.divs[-1] is not None, 'Item is not a direct grid child'
                    self.grids[self.divs[-1]]+=1
            def handle_endtag(self,tag):
                if tag=='div':self.divs.pop()
        for theme,kind,layout in [('horizon','cards','pillars'),('horizon','cards','default'),
                                  ('horizon','gallery','default'),('editorial','steps','default'),
                                  ('culture','steps','default'),('campus','cards','dates'),
                                  ('editorial','split','default')]:
            with self.subTest(theme=theme,kind=kind,layout=layout):
                section={'id':'row','kind':kind,'layout':layout,'items':[{'title':str(i)} for i in range(3)]}
                parser=GridStructure();parser.feed(renderer.render(data(theme,composition_version=2,sections=[section])))
                self.assertEqual(parser.grids,[3])

    def test_footer_contact_is_single_even_without_secondary_action(self):
        for secondary in [None, {'label':'Portal','url':'https://example.com/portal'}]:
            doc=renderer.render(data(composition_version=2,secondary_action=secondary))
            self.assertEqual(doc.count('Rua de teste'),1)
            self.assertEqual(doc.count('<address>'),1)

    def test_split_and_cta_keep_description_before_action(self):
        for theme,kind,layout in [('horizon','split','default'),('editorial','split','quote'),
                                  ('campus','split','spotlight'),('editorial','cta','default'),
                                  ('culture','steps','default')]:
            with self.subTest(theme=theme,kind=kind,layout=layout):
                section={'id':'ordered','kind':kind,'layout':layout,'title':'Título do bloco',
                         'text':'Leia primeiro esta descrição.','action':{'label':'Depois avance','url':'#contato'}}
                doc=renderer.render(data(theme,composition_version=2,sections=[section]))
                self.assertLess(doc.index('Leia primeiro esta descrição.'),doc.index('Depois avance'))
                self.assertEqual(doc.count('Depois avance'),1)

    def test_editorial_mosaic_does_not_duplicate_overall_caption(self):
        caption='Pequenos gestos. Grandes descobertas.'
        gallery=[{'url':'https://example.com/a.jpg','caption':'Legenda própria'},
                 {'url':'https://example.com/b.jpg','caption':caption}]
        doc=renderer.render(data('editorial',composition_version=2,hero_caption=caption,hero_gallery=gallery))
        self.assertEqual(doc.count(caption),1)
        self.assertIn('<p class="hero-caption">'+caption+'</p>',doc)
        self.assertIn('<figcaption>Legenda própria</figcaption>',doc)
        self.assertEqual(gallery[1]['caption'],caption,'Rendering must not mutate persisted design')

    def test_demo_banner_escaped_captions_and_brand(self):
        doc=renderer.render(data('editorial',composition_version=2,demonstration=True,heading_style='editorial',hero_caption='<script>x</script>',hero_gallery=[{'url':'https://example.com/a.jpg','caption':'<b>Foto</b>'}]))
        self.assertIn('Modelo demonstrativo — substitua textos e imagens antes de publicar.',doc)
        self.assertIn('&lt;script&gt;x&lt;/script&gt;',doc)
        self.assertIn('<figcaption>&lt;b&gt;Foto&lt;/b&gt;</figcaption>',doc)
        self.assertIn('--brand:#123456',doc)
        self.assertIn('--heading-font:Georgia,serif',doc)
        payload=data(composition_version=2,heading_style='editorial')
        payload['identity']['font_family']='custom'
        self.assertNotIn('--heading-font:Georgia,serif',renderer.render(payload))

    def test_magazine_has_lead_and_secondary_and_escapes_eyebrow(self):
        items=[{'title':str(i),'eyebrow':'<test>','image':{'url':'https://example.com/a.jpg'}} for i in range(4)]
        doc=renderer.render(data('campus',composition_version=2,sections=[{'id':'stories','kind':'cards','layout':'magazine','items':items}]))
        self.assertIn('<div class="composition-lead">',doc)
        self.assertIn('<div class="composition-secondary">',doc)
        self.assertIn('<div class="composition-more">',doc)
        self.assertIn('&lt;test&gt;',doc)

    def test_layout_whitelist_and_legacy_safety(self):
        section={'id':'safe','kind':'cards','layout':'x" onclick="alert(1)','items':[]}
        self.assertIn('section-cards layout-default',renderer.render(data(composition_version=2,sections=[section])))
        section['layout']='pillars'
        self.assertIn('section-cards layout-default',renderer.render(data(sections=[section])))
        self.assertIn('section-cards layout-pillars',renderer.render(data(composition_version=2,sections=[section])))

    def test_real_published_feed_keeps_magazine_and_date_compositions(self):
        payload=data('campus',composition_version=2,sections=[
            {'id':'stories','kind':'news','layout':'magazine','items':[{'title':'DEMO MUST NOT LEAK'}]},
            {'id':'dates','kind':'agenda','layout':'dates','items':[{'title':'DEMO EVENT MUST NOT LEAK'}]}])
        payload['posts']=[{'kind':'news','title':'Published '+str(i),'image':{'url':'https://example.com/'+str(i)+'.jpg'}} for i in range(4)]
        payload['posts'] += [{'kind':'event','title':'Event '+str(i),'event_start':'2027-03-12T10:00:00-03:00','location':'Local público'} for i in range(3)]
        doc=renderer.render(payload)
        for css in ['magazine-lead','magazine-secondary','magazine-more']:
            self.assertIn('<div class="'+css+'">',doc)
        self.assertIn('section-agenda layout-dates',doc)
        self.assertEqual(doc.count('<time datetime="2027-03-12T10:00:00-03:00">'),3)
        self.assertIn('src="https://example.com/0.jpg"',doc)
        self.assertNotIn('DEMO MUST NOT LEAK',doc)
        self.assertNotIn('DEMO EVENT MUST NOT LEAK',doc)
        for i in range(4):self.assertIn('Published '+str(i),doc)

    def test_feature_replaces_redundant_culture_hero_photo(self):
        image={'url':'https://example.com/project.jpg'}
        doc=renderer.render(data('culture',composition_version=2,hero_image=image,sections=[{'id':'project','kind':'split','layout':'feature','image':image,'title':'Projeto'}]))
        self.assertEqual(doc.count('src="https://example.com/project.jpg"'),1)
        self.assertIn('layout-feature',doc)

if __name__=='__main__':unittest.main()
