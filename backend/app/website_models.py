"""Versioned demonstration compositions. Reading the catalog never changes a school."""
from pathlib import Path
from copy import deepcopy

ASSET_NAMES=frozenset({'garden','community','library','theatre','lab','sport','preschool'})
ASSET_ROOT=Path(__file__).with_name('site_model_assets')
ASSET_PREFIX='/api/v1/public/website-model-assets/'


def image(name,caption=''):
    if name=='preschool':
        return {'url':ASSET_PREFIX+name+'.jpg','alt':'Fotografia ilustrativa de infância: criança brincando com tinta. Senjuti Kundu / Unsplash. Não representa alunos desta escola.','caption':caption,'focal_x':50,'focal_y':25 if name=='theatre' else 50}
    return {'url':ASSET_PREFIX+name+'.jpg','alt':caption or 'Ilustração gerada por IA: '+{'garden':'grupo cultivando uma horta','community':'encontro de famílias na escola','library':'estudantes compartilhando uma leitura','theatre':'grupo em apresentação teatral','lab':'estudantes construindo um circuito','sport':'estudantes jogando basquete'}[name],
            'caption':caption,'focal_x':50,'focal_y':25 if name=='theatre' else 50}


def link(label,target='#visita'):return {'label':label,'url':target}
def item(title,text='',photo=None,label='Saiba mais',target='#visita',eyebrow=''):
    return {'title':title,'text':text,'image':image(photo) if photo else None,'action':link(label,target) if label else None,'eyebrow':eyebrow}
def section(id,kind,title,text='',*,layout='default',photo=None,items=None,eyebrow='',action=None):
    return {'id':id,'kind':kind,'title':title,'text':text,'layout':layout,'image':image(photo) if photo else None,
            'items':items or [],'eyebrow':eyebrow,'action':action,'visible':True}

def design(theme,sections,hero=None,gallery=None,direction='standard'):
    return {'composition_version':2,'direction':direction,'demonstration':True,'configured':True,'heading_style':'editorial' if theme in {'horizon','editorial'} else 'inherit',
            'header_sticky':False,'mobile_actions':False,'topline':'Juntos, ampliamos possibilidades.' if theme in {'horizon','editorial'} else '', 'hero_caption':{'horizon':'Educar para a vida, em cada etapa.','editorial':'Pequenos gestos. Grandes descobertas.'}.get(theme,''),
            'eyebrow':{'horizon':'Institucional contemporâneo','editorial':'Infância e descobertas','culture':'Aprendizagem e projetos','campus':'Vida escolar'}[theme],
            'hero_image':image(hero) if hero else None,'hero_gallery':gallery or [],'primary_action':link('Agende uma visita'),
            'secondary_action':None,
            'menu':[link(label,'#'+sid) for label,sid in {'horizon':[('A escola','escola'),('Educação','educacao'),('Vivências','espacos'),('Visita','visita')],'editorial':[('Nossa proposta','jornada'),('Rotina','rotina'),('Famílias','familias'),('Visita','visita')],'culture':[('Projeto em destaque','destaque'),('Experiências','projetos'),('Como aprendemos','aprendizagem'),('Visita','visita')],'campus':[('Histórias','historias'),('Agenda','agenda'),('Notícias','noticias'),('Vivências','vivencias')]}[theme]]+[link('Contato','#contato')],
            'footer_text':'Uma comunidade para aprender, crescer e descobrir o mundo.','sections':sections,'pages':[]}



def family_services_model():
    """Use the school's configured identity and contact channels for a family-facing site."""
    pages = [
        ('escola', 'A escola', 'Conheça a escola e converse com a equipe.',
         section('apresentacao', 'split', 'Uma visita à escola', 'A secretaria pode orientar sua família sobre uma visita e sobre a proposta pedagógica.', photo='library', action=link('Falar com a secretaria', '/contato'))),
        ('ensino', 'Ensino', 'Encontre orientações para escolher a etapa de ensino.',
         section('etapas', 'cards', 'Para planejar o ano letivo', items=[
             item('Etapas e turnos', 'Consulte a equipe sobre as turmas e os horários oferecidos.', label='Consultar a escola', target='/contato'),
             item('Ingresso e continuidade', 'Confira o caminho de inscrição e acompanhe as pendências.', label='Ver matrículas', target='/matriculas')])),
        ('matriculas', 'Matrículas', 'Saiba como iniciar e acompanhar uma inscrição.',
         section('inscricao', 'cards', 'Como funciona a matrícula', items=[
             item('Inicie a inscrição', 'Quando houver processo aberto, acesse a matrícula online e informe os dados da família.', label=''),
             item('Acompanhe a conferência', 'Consulte a inscrição para verificar os documentos e corrigir o que a secretaria solicitar.', label=''),
             item('Guarde o comprovante', 'Após a efetivação pela escola, consulte a situação e baixe o comprovante.', label='')])),
        ('agenda', 'Agenda', 'Consulte os eventos que a escola publicou para a comunidade.',
         section('eventos', 'agenda', 'Agenda escolar')),
        ('noticias', 'Notícias', 'Leia as publicações da escola.',
         section('mural', 'news', 'Notícias da escola')),
        ('contato', 'Contato', 'Consulte os canais de atendimento da secretaria.',
         section('atendimento', 'text', 'Atendimento às famílias', 'Para tratar de uma inscrição, tenha em mãos o número do protocolo.')),
    ]
    home = section('servicos', 'cards', 'O que sua família precisa?', items=[
        item('Matrículas', 'Veja como se inscrever e acompanhar seu pedido.', label='Consultar orientações', target='/matriculas'),
        item('Agenda escolar', 'Encontre os próximos eventos públicos.', label='Ver agenda', target='/agenda'),
        item('Secretaria', 'Consulte os canais da escola.', label='Ver contato', target='/contato')])
    layout = design('horizon', [home], hero='community')
    layout.update(eyebrow='Famílias e comunidade', topline='', hero_caption='', footer_text='',
                  menu=[link(title, '/'+slug) for slug, title, _, _ in pages],
                  primary_action=link('Matrículas', '/matriculas'), secondary_action=None,
                  pages=[{'slug':slug, 'model_origin':'familias:'+slug, 'title':title, 'introduction':intro,
                          'show_contact_details':slug=='contato', 'show_family_links':slug=='matriculas', 'published':True, 'sections':[block]}
                         for slug,title,intro,block in pages])
    return {'id':'familias', 'name':'Central das famílias',
            'description':'Matrículas, ensino, agenda, notícias e contato com a secretaria.',
            'demonstration_notice':'Revise o conteúdo e a fotografia ilustrativa antes de publicar.',
            'website':{'theme':'horizon','headline':'Escola e família','introduction':'Matrículas, agenda e atendimento em um só lugar.',
                       'about':'','notice':'','design':layout}}


def catalog():
    visit=section('visita','cta','Venha sentir a nossa escola.','Conheça os espaços, a equipe e nosso jeito de aprender.',eyebrow='O próximo passo pode ser uma conversa',action=link('Agendar visita','#contato'))
    horizon=[section('pilares','cards','',layout='pillars',items=[item('Aprendizagem com sentido','Projetos conectados ao mundo.',label=''),item('Olhar para cada estudante','Acompanhamento próximo e humano.',label=''),item('Família presente','Diálogo que fortalece a jornada.',label='')]),
        section('educacao','cards','Cada etapa abre novos caminhos.',eyebrow='Uma jornada, muitas conquistas',items=[item('Educação Infantil','Curiosidade, cuidado e primeiros vínculos.','garden','Explore esta etapa'),item('Ensino Fundamental','Conhecer, investigar e ganhar autonomia.','lab','Explore esta etapa'),item('Projetos de aprendizagem','O conhecimento encontra a vida.','library','Explore esta etapa')]),
        section('escola','split','Conhecimento que faz sentido. Relações que fazem diferença.','Um projeto pedagógico vivo, que valoriza perguntas, acolhe singularidades e convida cada estudante a participar da própria aprendizagem.',photo='garden',eyebrow='Nosso jeito de educar',action=link('Descubra nossa história','#contato')),
        section('espacos','gallery','Espaços que convidam a descobrir.','Lugares para ler, criar, conviver e ampliar horizontes.',eyebrow='A vida acontece aqui',items=[item('Leitura e imaginação',photo='library',label=''),item('Ambientes de aprender',photo='lab',label=''),item('Descobertas em grupo',photo='garden',label='')]),visit]
    editorial=[section('jornada','steps','Um novo universo a cada fase.','Uma jornada que valoriza os vínculos, a autonomia e a curiosidade da criança.',eyebrow='Crescer no próprio tempo',items=[item('Primeiros vínculos','Acolhimento, segurança e afeto para conhecer um novo mundo.',label='Conheça essa fase'),item('Explorar e experimentar','Brincadeiras, histórias e materiais que despertam todos os sentidos.',label='Conheça essa fase'),item('Imaginar e criar','Perguntas, projetos e descobertas que ampliam a autonomia.',label='Conheça essa fase')]),
        section('rotina','split','Há muito a aprender em um dia de brincar.',photo='garden',eyebrow='Rotina com intenção',items=[item('Chegar e ser acolhido','Uma escuta atenta para começar bem.',label=''),item('Explorar com todo o corpo','Arte, movimento e experiências sensoriais.',label=''),item('Compartilhar e criar vínculos','Convivência, cuidado e pequenas conquistas.',label='')]),
        section('familias','split','Crescer é melhor quando caminhamos juntos.','Diálogo próximo, troca de experiências e uma equipe que conhece cada criança pelo nome. A parceria com a família faz parte do nosso jeito de cuidar.',layout='quote',photo='community',eyebrow='Família também faz parte',action=link('Conheça nossa proposta','#contato'),items=[item('Escutar. Acolher. Construir juntos.','Uma relação de confiança',label='')]),
        section('visita','cta','Venha viver um pouquinho da nossa rotina.','Traga suas perguntas. Vamos conhecer sua família e apresentar a nossa escola.',action=link('Quero conhecer a escola','#contato'))]
    culture=[section('destaque','split','Do primeiro circuito à próxima descoberta.','E se a solução para um problema cotidiano começasse na sala de aula? Nossos projetos aproximam ideias, experimentação e trabalho em equipe.',layout='feature',photo='lab',eyebrow='Projeto em destaque / Ciência e tecnologia',action=link('Explore o projeto completo','#projetos'),items=[item('O que move este projeto','Investigar → Criar → Testar → Compartilhar',label='')]),
        section('projetos','cards','Conhecimento que sai do papel.','Dentro e fora da sala, cada experiência abre espaço para um novo olhar.',eyebrow='Um aprendizado, muitas conexões',items=[item('Cultivar também é aprender.','Da semente à mesa: observar os ciclos da natureza e cuidar do que é de todos.','garden','Conheça a experiência',eyebrow='Natureza e sustentabilidade'),item('Histórias que ampliam mundos.','Leitura, escuta e criação para descobrir novas formas de se expressar.','library','Conheça a experiência',eyebrow='Linguagens e imaginação'),item('Um palco para muitas vozes.','Corpo, voz e criatividade em experiências que fortalecem a expressão e a parceria.','theatre','Conheça a experiência',eyebrow='Arte e expressão')]),
        section('aprendizagem','steps','A descoberta é só o começo.','Projetos com intenção pedagógica, registros do percurso e espaço para compartilhar.',eyebrow='Como aprendemos',action=link('Conheça nossa abordagem','#contato'),items=[item('Uma pergunta que provoca','Desafios que despertam curiosidade.',label=''),item('Um caminho construído juntos','Pesquisa, tentativas e novas conexões.',label=''),item('Uma descoberta compartilhada','Produções, registros e conversas com as famílias.',label='')]),
        section('visita','cta','Conheça esse jeito de aprender.','Venha conversar com a gente e descobrir a escola de perto.',photo='community',action=link('Agendar uma visita','#contato'))]
    campus=[section('historias','cards','',layout='magazine',items=[item('Uma escola se faz com gente.','Encontros que aproximam famílias, fortalecem vínculos e criam memórias. Conheça os momentos que fazem parte da nossa vida escolar.','community','Veja como foi',eyebrow='Comunidade · história em destaque'),item('O valor de jogar junto, dentro e fora da quadra.','Experiências que conectam talentos e novas descobertas.','sport','Leia a história',eyebrow='Esporte'),item('Quando a imaginação ganha o palco.','Experiências que conectam talentos e novas descobertas.','theatre','Leia a história',eyebrow='Cultura')]),
        section('agenda','cards','Na agenda',layout='dates',eyebrow='Para anotar',items=[item('Encontro com famílias','Conversa, escuta e parceria',eyebrow='12 MAR · EXEMPLO'),item('Mostra de projetos','Descobertas compartilhadas',eyebrow='18 MAR · EXEMPLO'),item('Sábado em movimento','Jogos e integração',eyebrow='25 MAR · EXEMPLO')]),
        section('noticias','cards','Mais histórias, novos olhares.',items=[item('Pequenas atitudes, novas possibilidades.','Conheça esta experiência ilustrativa.','garden','Leia a história',eyebrow='Sustentabilidade'),item('Ideias que encontram um caminho para acontecer.','Conheça esta experiência ilustrativa.','lab','Leia a história',eyebrow='Ciência e tecnologia'),item('Um livro, muitas formas de descobrir o mundo.','Conheça esta experiência ilustrativa.','library','Leia a história',eyebrow='Leitura e imaginação')]),
        section('vivencias','split','Cada talento encontra seu espaço.','Arte, movimento e convivência fazem parte de uma formação que valoriza muitas maneiras de ser.',layout='spotlight',photo='theatre',eyebrow='Cultura que aproxima',action=link('Explore as vivências','#contato')),
        section('visita','cta','Vamos conversar?','Conheça a escola e compartilhe suas perguntas.',action=link('Fale com a escola','#contato'))]
    values=[('horizon','Institucional','Fotografia imersiva, pilares, etapas, espaços e convite.','Um mundo de possibilidades começa aqui.','Uma formação que conecta conhecimento, autonomia e cuidado em cada descoberta.',horizon,'lab',[]),
            ('editorial','Infância','Mosaico de três imagens, jornada, rotina e parceria com famílias.','A infância merece tempo. E um mundo para descobrir.','Acolher cada criança. Respeitar cada ritmo. Aprender brincando.',editorial,None,[image('garden','Criar com liberdade'),image('preschool','Pequenos gestos. Grandes descobertas.'),image('community','Descobrir em companhia')]),
            ('culture','Projetos','Projeto principal, experiências, percurso e convite.','Grandes ideias começam com boas perguntas.','Um jeito de aprender que conecta curiosidade, investigação e experiências do mundo real.',culture,None,[]),
            ('campus','Comunidade','Manchete e histórias secundárias, agenda e vivências.','Nossa escola, em movimento.','Histórias de quem aprende, cria e faz parte.',campus,None,[])]
    result={'items':[{'id':key,'name':name,'description':desc,'demonstration_notice':'Modelo demonstrativo: textos e fotografias ilustrativas (IA e banco de imagens licenciado) são exemplos, não fatos da escola. Revise e substitua antes de publicar.',
        'website':{'theme':key,'headline':headline,'introduction':intro,'about':'','notice':'','design':design(key,sections,hero,gallery)}} for key,name,desc,headline,intro,sections,hero,gallery in values]}

    for entry in result['items']:
        entry['website']=multipage_website(entry['website'])
    result['items'].append(family_services_model())

    # New directions are deliberately opt-in.  They keep the five existing
    # identifiers above untouched and are only applied after the editor shows
    # a complete preview and the operator confirms the draft action.
    direction_values=[
        ('atelier','Ateliê','Editorial em camadas, com fotografia, matéria e chamadas curtas.','Uma escola que se faz em movimento.','Ideias, encontros e experiências que ganham forma no cotidiano.',
         [section('pilares','split','Aprender é fazer, observar e compartilhar.','Uma composição mais tátil para mostrar processos, pessoas e os detalhes que dão identidade à escola.',layout='feature',photo='theatre',eyebrow='Ateliê aberto',action=link('Ver projetos','#educacao')),
          section('educacao','cards','Projetos que ganham forma.',eyebrow='Mãos, ideias e descobertas',items=[item('Experimentar','Perguntas que viram protótipos, histórias e novas tentativas.','lab','Conhecer'),item('Criar em companhia','A escola como espaço para fazer junto e aprender com o processo.','community','Conhecer'),item('Cuidar do entorno','Pequenas ações para observar e transformar o lugar onde vivemos.','garden','Conhecer')]),
          section('escola','split','Uma presença que se percebe nos detalhes.','Escuta, tempo e intenção para acompanhar cada etapa.',layout='quote',photo='library',eyebrow='O jeito de estar junto',items=[item('Observar. Perguntar. Fazer novamente.','Cada percurso merece espaço para acontecer.',label='')]),
          section('espacos','gallery','Espaços para imaginar e construir.', 'Ambientes que convidam à leitura, à criação e à convivência.',eyebrow='A escola por dentro',items=[item('Laboratório de ideias',photo='lab',label=''),item('Biblioteca viva',photo='library',label=''),item('Pátio de encontros',photo='community',label='')]),
          section('visita','cta','Venha conhecer nosso processo.','Uma conversa pode ser o começo de uma boa parceria.',action=link('Agendar conversa','#contato'))],
         'theatre',[image('lab','Investigar'),image('community','Compartilhar')]),
        ('rota','Rota','Uma jornada visual, com passos claros e leitura rápida em qualquer tela.','A escola acontece em muitos caminhos.','Acompanhe as etapas, as experiências e os próximos passos da comunidade.',
         [section('jornada','steps','Uma jornada com começo, percurso e descoberta.','Uma leitura em sequência para apresentar o jeito de aprender da escola.',layout='dates',eyebrow='Por onde começamos?',items=[item('Chegar','Acolher perguntas, vínculos e diferentes histórias.',label=''),item('Explorar','Investigar o mundo com curiosidade e autonomia.',label=''),item('Compartilhar','Registrar, conversar e celebrar o que foi aprendido.',label='')]),
          section('rotina','split','O cotidiano também ensina.','Ritmos, encontros e experiências que tornam cada dia significativo.',layout='spotlight',photo='garden',eyebrow='No dia a dia',items=[item('Tempo para descobrir','Brincadeiras, aulas e projetos em movimento.',label='')]),
          section('familias','cards','Família e escola no mesmo caminho.','Informação clara e conversa próxima para acompanhar cada etapa.',eyebrow='Parceria',items=[item('Acompanhar','Receber orientações e participar das conversas.',label=''),item('Perguntar','Encontrar a equipe e combinar os próximos passos.',label='')]),
          section('visita','cta','Qual é o próximo passo da sua família?','Conheça a escola e converse com a equipe.',action=link('Planejar uma visita','#contato'))],
         'garden',[image('preschool','Tempo para descobrir'),image('community','Aprender junto')]),
        ('nucleo','Núcleo','Uma vitrine compacta para notícias, agenda e o que está acontecendo agora.','A vida escolar em um só lugar.','Histórias, encontros e projetos que aproximam a comunidade.',
         [section('historias','cards','O que está acontecendo na escola.',layout='magazine',eyebrow='Em destaque',items=[item('Uma comunidade em movimento','Histórias e experiências que merecem ser compartilhadas.','community','Ler história'),item('Projetos que aproximam','Ideias que saem da sala e encontram o mundo.','lab','Ler história'),item('Cultura para participar','Arte, esporte e convivência no cotidiano.','theatre','Ler história')]),
          section('agenda','agenda','Próximos encontros.',layout='dates',eyebrow='Para anotar'),
          section('noticias','news','Notícias da escola.',layout='magazine'),
          section('vivencias','split','Uma escola feita de participação.','Descubra como estudantes, famílias e educadores constroem juntos a vida escolar.',layout='feature',photo='sport',eyebrow='Comunidade',action=link('Conhecer a escola','#contato')),
          section('visita','cta','Quer fazer parte?','Fale com a escola e descubra os próximos passos.',action=link('Conversar com a equipe','#contato'))],
         'community',[image('lab','Projetos em movimento'),image('sport','Vida escolar')]),
    ]
    for key,name,desc,headline,intro,sections,hero,gallery in direction_values:
        theme={'atelier':'horizon','rota':'editorial','nucleo':'campus'}[key]
        preset={'id':key,'name':name,'description':desc,'demonstration_notice':'Direção experimental: textos e fotografias ilustrativas. Revise e substitua antes de publicar.',
                'website':{'theme':theme,'headline':headline,'introduction':intro,'about':'','notice':'','design':design(theme,sections,hero,gallery,direction=key)}}
        preset['website']=multipage_website(preset['website'])
        result['items'].append(preset)
    return result


def rewrite_links(value,mapping):
    """Rewrite only exact authored destinations, never strings in editorial text."""
    if isinstance(value,dict):
        return {key:(mapping.get(child,child) if key=='url' and isinstance(child,str) else rewrite_links(child,mapping)) for key,child in value.items()}
    if isinstance(value,list):return [rewrite_links(child,mapping) for child in value]
    return value


def multipage_website(website):
    result=deepcopy(website);d=result['design'];theme=result['theme']
    source={s['id']:s for s in d['sections']}
    school=section('proposta-escola','split','Uma escola feita de relações e descobertas.','Cuidado, conhecimento e participação caminham juntos. A relação entre estudantes, educadores e famílias dá sentido às experiências e abre espaço para novas descobertas.',photo='community',eyebrow='Nossa proposta',action=link('Converse com a equipe','/contato'))
    projects=section('experiencias','cards','Muitas maneiras de aprender.','A curiosidade conecta o que aprendemos com o mundo ao nosso redor.',items=[item('Investigar e experimentar','Perguntas e experiências aproximam ciência e cotidiano.','lab',target='/visita'),item('Ler e imaginar','Histórias ampliam repertórios e maneiras de se expressar.','library',target='/visita'),item('Criar e compartilhar','Arte e convivência fortalecem a expressão de cada estudante.','theatre',target='/visita')])
    if theme=='editorial':
        projects=section('experiencias','cards','Descobrir o mundo brincando.','Pequenos gestos, encontros e experiências que ampliam a curiosidade.',items=[item('Brincar e imaginar','Brincadeiras convidam a criar histórias, explorar materiais e experimentar novas possibilidades.','preschool',label=''),item('Explorar a natureza','Observar plantas, cores e texturas desperta perguntas e o cuidado com o mundo.','garden',label=''),item('Conviver e compartilhar','Encontros, escuta e descobertas em companhia fortalecem os primeiros vínculos.','community',label='')])
    groups={
      'horizon':[('escola','A escola',[source.get('escola',school)]),('educacao','Educação',[source.get('educacao',projects)]),('espacos','Espaços e vivências',[source.get('espacos',projects)]),('projetos','Projetos',[projects])],
      'editorial':[('proposta','Nossa proposta',[source.get('jornada',school)]),('rotina','Nossa rotina',[source.get('rotina',school)]),('familias','Famílias',[source.get('familias',school)]),('descobertas','Descobertas',[projects])],
      'culture':[('projetos','Projetos em destaque',[source.get('destaque',school)]),('experiencias','Experiências',[source.get('projetos',projects)]),('aprendizagem','Como aprendemos',[source.get('aprendizagem',school)]),('escola','A escola',[school])],
      'campus':[('historias','Histórias da escola',[source.get('historias',school)]),('agenda','Agenda',[source.get('agenda',school)]),('noticias','Notícias',[source.get('noticias',projects)]),('vivencias','Vivências',[source.get('vivencias',school)])]}[theme]
    groups.extend([('visita','Conheça a escola',[section('planejar-visita','steps','Uma visita para conhecer e conversar.','Escolher uma escola começa com boas perguntas. Converse com a equipe e conheça a proposta e os espaços.',items=[item('Compartilhe suas perguntas','Conte a etapa escolar e o que sua família deseja conhecer.',label=''),item('Combine o melhor momento','Confirme a disponibilidade e as orientações com a secretaria.',label=''),item('Conheça a escola de perto','Explore os espaços e converse sobre o acompanhamento dos estudantes.',label='')],action=link('Fale com a equipe','/contato'))]),
      ('contato','Contato',[section('atendimento','text','Vamos conversar.','Perguntas sobre a proposta pedagógica, etapas de ensino ou visitas? Entre em contato pelos canais institucionais e conte como podemos ajudar sua família.'),section('duvidas','cards','Como podemos ajudar?',items=[item('Conhecer a proposta','Tire dúvidas sobre o cotidiano e a aprendizagem.',label=''),item('Planejar uma visita','Converse com a equipe sobre disponibilidade.',label=''),item('Falar com a secretaria','Solicite informações institucionais pelos canais oficiais.',label='')])])])
    if theme=='campus':
        groups=[(slug,title,[section('publicacoes-'+slug,'news' if slug=='noticias' else 'agenda','')]) if slug in {'noticias','agenda'} else (slug,title,sections) for slug,title,sections in groups]
    mapping={'#contato':'/contato','#visita':'/visita','#pilares':'/educacao','#jornada':'/proposta','#destaque':'/projetos'}
    for slug,_,sections in groups:
        mapping.update({'#'+s['id']:'/'+slug for s in sections})
    introductions={
        'escola':'Conheça os valores e as relações que dão sentido à nossa proposta de educação.',
        'educacao':'Cada etapa traz novas perguntas, experiências e possibilidades de aprender.',
        'espacos':'Ambientes para explorar, criar e conviver fazem parte da jornada de aprendizagem.',
        'projetos':'Perguntas se transformam em experiências, ideias e descobertas compartilhadas.',
        'proposta':'Cuidado, curiosidade e autonomia: um olhar atento para cada etapa da infância.',
        'rotina':'Entre brincadeiras, encontros e descobertas, o cotidiano ganha significado.',
        'familias':'O diálogo entre família e escola fortalece vínculos e acompanha cada nova conquista.',
        'descobertas':'Arte, leitura e investigação abrem caminhos para conhecer o mundo.',
        'experiencias':'Conhecimento em movimento, dentro e fora da sala de aula.',
        'aprendizagem':'Investigar, experimentar e compartilhar são partes de um mesmo percurso.',
        'historias':'Encontros e experiências que aproximam as pessoas e dão vida à comunidade escolar.',
        'agenda':'Acompanhe os encontros e eventos publicados pela escola.',
        'noticias':'Confira as publicações e novidades da comunidade escolar.',
        'vivencias':'Arte, movimento e convivência ampliam as formas de aprender e se expressar.',
        'visita':'Conheça os espaços, converse sobre a proposta e compartilhe as perguntas da sua família.',
        'contato':'Encontre os canais institucionais e comece uma conversa com a equipe da escola.',
    }
    pages=[{'slug':slug,'model_origin':theme+':'+slug,'show_contact_details':slug=='contato','title':title,'introduction':introductions[slug],'published':True,'image':None,'sections':deepcopy(sections)} for slug,title,sections in groups]
    # The cover carries the identity; the home contains summaries, not entire pages.
    summary_groups=groups[1:4] if theme=='culture' else groups[:3]
    summaries=[item(title,introductions[slug],label='Conheça mais',target='/'+slug) for slug,title,_ in summary_groups]
    first=section('explore','cards','Descubra nossa escola.','Encontre a proposta, as experiências e as informações que você procura.',items=summaries)
    if theme=='horizon':home=[source['pilares'],first]
    elif theme=='culture':
        feature=deepcopy(source['destaque'])
        feature.update(text='Perguntas ganham forma em experiências que conectam investigação, criatividade e trabalho em equipe.',items=[],action=link('Conheça o projeto','/projetos'))
        home=[feature,first]
    elif theme=='campus':
        lead=deepcopy(source['historias'])
        for index,story in enumerate(lead['items']):story['action']=link('Leia a história','/'+('historias' if index==0 else 'vivencias'))
        home=[lead,section('convite','cta','Conheça as histórias e participe.','Explore a vida escolar, consulte a agenda e converse com a equipe.',action=link('Ver agenda','/agenda'))]
    else:home=[first]
    d.update(sections=home,pages=pages,menu=[link(title,'/'+slug) for slug,title,_ in groups],primary_action=link('Agende uma visita','/visita'),secondary_action=None)
    result['design']=rewrite_links(d,mapping)
    for page in result['design']['pages']:
        for block in page['sections']:
            # The page already supplies the detail: do not advertise another
            # detail screen while sending the visitor to scheduling/contact.
            for card in block.get('items',[]):card['action']=None
            action=block.get('action')
            if action and action['url']=='/'+page['slug']:block['action']=None
            elif action and action['url']=='/contato':action['label']='Converse com a equipe'
            elif action and action['label']=='Explore o projeto completo':block['action']=None
    return result
