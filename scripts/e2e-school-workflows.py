"""Extensão do E2E HTTP: editor, quatro modelos, matrícula manual e em lote.
Executada no mesmo contexto sintético de e2e-portal-polished.py.
"""
def verify_workflows(admin,browser,client,headers,base,URL,OUT,record,expect,post,year,group,WEBSITE_URL):
    # Renderer público e prévia devem coincidir; nenhuma imagem ou marca de cliente.
    for title in ('Ciência feita em comunidade','Histórias que atravessam a sala','Aprender com novas perguntas'):
        post('/community-posts',{'title':title,'summary':'Projetos e experiências compartilhados pela comunidade escolar.','content':'Uma publicação sintética para validar o conteúdo público, sua leitura e a organização dos modelos.','status':'published','audience':'public'})
    website=client.get(base+'/website',headers=headers).json()['configuration']
    # Synthetic uploaded asset exercises private preview and public image lifecycle.
    import io
    from PIL import Image
    photo=io.BytesIO();Image.new('RGB',(900,600),'#527a82').save(photo,format='PNG')
    uploaded=client.post(base+'/website/assets',headers=headers,files={'image':('synthetic.png',photo.getvalue(),'image/png')})
    assert uploaded.status_code==201,uploaded.text
    image={k:uploaded.json()[k] for k in ('url','alt','focal_x','focal_y')};image['alt']='Fotografia sintética de teste'
    assert client.get(image['url']).status_code==404
    post('/community-posts',{'title':'Aprender também é compartilhar','summary':'Uma história ilustrada para validar o modelo Comunidade.','content':'Fotografia sintética sem pessoas ou dados reais.','status':'published','audience':'public','image':image})
    assert client.get(image['url']).status_code==200
    design={'configured':True,'header_sticky':True,'mobile_actions':True,'hero_image':image,'hero_gallery':[image,image,image],
        'menu':[{'label':'Educação','url':'#educacao'},{'label':'Contato','url':'#contato'}],
        'sections':[{'id':'educacao','kind':'cards','title':'Etapas de ensino','items':[{'title':'Primeiras descobertas','text':'Conteúdo sintético para validação.','image':image}]},
        {'id':'escola','kind':'split','title':'Nossa escola','text':'Uma apresentação editorial para validar o layout.','image':image},
        {'id':'noticias','kind':'news','title':'Histórias da escola'}, {'id':'agenda','kind':'agenda','title':'Na agenda'}]}
    page=browser.new_page()
    for theme in ('horizon','editorial','culture','campus'):
        payload={k:website[k] for k in ('version','headline','introduction','about','public_url','portal_url','notice')}
        payload.update(design=design,theme=theme,enabled=True,headline='Aprender com curiosidade, crescer em comunidade.',admission_url='https://school.example.test/online.html')
        response=client.post(base+'/website/preview',headers=headers,json=payload);assert response.status_code==200,response.text
        page.set_content(response.json()['html'])
        for width in (320,390,768,1440):
            page.set_viewport_size({'width':width,'height':900})
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(theme,width)
            assert page.locator('.site-header').evaluate("node=>getComputedStyle(node).position")=='sticky'
            if width<=768:
                menu=page.get_by_label('Abrir ou fechar menu',exact=True)
                if menu.is_visible():
                    menu.click();expect(page.get_by_role('navigation',name='Navegação móvel')).to_be_visible();menu.click()
            assert page.locator('footer').evaluate("node=>!['fixed','sticky'].includes(getComputedStyle(node).position)")
            page.screenshot(path=str(OUT/f'website-{theme}-{width}.png'),full_page=True)
    page.close();record('Quatro composições de site renderizadas em 320, 390, 768 e 1440 px sem overflow')
    admin.goto(URL+'/#/community')
    expect(admin.get_by_role('heading',name='Site institucional',exact=True)).to_be_visible()
    admin.get_by_role('button',name='Configurar site',exact=True).click()
    public_path='/api/v1/public/schools/'+base.split('/')[-1]+'/website'
    original_public=client.get(public_path).json()
    admin.get_by_role('button',name='Carregar modelos completos',exact=True).click()
    admin.get_by_label('Composição para experimentar',exact=True).select_option('editorial')
    before_model_preview=client.get(base+'/website',headers=headers).json()['configuration']
    with admin.expect_response(lambda response:response.url.endswith('/website/preview-model') and response.request.method=='POST') as model_response:
        admin.get_by_role('button',name='Ver modelo completo sem alterar',exact=True).click()
    assert model_response.value.status==200
    resolved_model=model_response.value.json()['website']
    model_pages=[item for item in resolved_model['design']['pages'] if item.get('model_origin','').startswith('editorial:')]
    assert len(model_pages)==6 and len(resolved_model['design']['sections'])<=2
    preview=admin.frame_locator('iframe[title="Prévia privada do site"]')
    expect(preview.locator('.demonstration-banner')).to_be_visible()
    expect(preview.locator('h1')).to_have_text(resolved_model['headline'])
    model_map=admin.locator('section[aria-labelledby="model-map-title"]')
    expect(model_map).to_be_visible()
    assert len(resolved_model['design']['menu'])==6
    for link in resolved_model['design']['menu']:
        expect(model_map.get_by_text(link['label']+' → '+link['url'],exact=True)).to_be_visible()
        assert link['url'] in {'/'+item['slug'] for item in model_pages}
    # Clicking a local menu link inside srcdoc must remain in private preview,
    # rather than navigate the application domain to a nonexistent public route.
    first_page=model_pages[0]
    with admin.expect_response(lambda response:response.url.endswith('/website/preview?page='+first_page['slug']) and response.request.method=='POST') as menu_response:
        preview.locator('nav a[href="/'+first_page['slug']+'"]:visible').first.click()
    assert menu_response.value.status==200
    expect(preview.locator('h1')).to_have_text(first_page['title'])
    assert client.get(base+'/website',headers=headers).json()['configuration']==before_model_preview
    assert client.get(public_path).json()==original_public
    # Return home so the subsequent selector loop changes each option, including
    # the first internal page, and therefore triggers its change handler.
    with admin.expect_response(lambda response:response.url.endswith('/website/preview') and response.request.method=='POST') as menu_home_response:
        preview.locator('a[href="/"]:visible').first.click()
    assert menu_home_response.value.status==200
    expect(preview.locator('h1')).to_have_text(resolved_model['headline'])
    # The model selector renders every real internal page without applying or saving.
    preview_selector=admin.get_by_label('Página da prévia do modelo',exact=True)
    for item in model_pages:
        with admin.expect_response(lambda response,slug=item['slug']:response.url.endswith('/website/preview?page='+slug) and response.request.method=='POST') as page_response:
            preview_selector.select_option(item['slug'])
        assert page_response.value.status==200
        expect(preview.locator('h1')).to_have_text(item['title'])
        assert client.get(base+'/website',headers=headers).json()['configuration']==before_model_preview
        assert client.get(public_path).json()==original_public
    with admin.expect_response(lambda response:response.url.endswith('/website/preview') and response.request.method=='POST') as home_response:
        preview_selector.select_option('')
    assert home_response.value.status==200
    expect(preview.locator('h1')).to_have_text(resolved_model['headline'])
    assert client.get(base+'/website',headers=headers).json()['configuration']==before_model_preview
    assert client.get(public_path).json()==original_public
    admin.once('dialog',lambda dialog:dialog.accept())
    admin.get_by_role('button',name='Aplicar páginas e menu ao rascunho',exact=True).click()
    expect(admin.get_by_text('Página inicial, novas páginas e menu salvos somente em rascunho.',exact=False)).to_be_visible()
    stored=client.get(base+'/website',headers=headers).json()['configuration']
    assert stored['has_checkpoint'] is True and stored['draft']['design']['composition_version']==2
    assert 'model_checkpoint' not in stored
    assert client.get(public_path).json()==original_public
    admin.screenshot(path=str(OUT/'website-model-editor-applied.png'),full_page=True)
    admin.reload()
    admin.get_by_role('button',name='Configurar site',exact=True).click()
    expect(admin.get_by_role('button',name='Restaurar cópia original',exact=True)).to_be_visible()
    admin.once('dialog',lambda dialog:dialog.accept())
    admin.get_by_role('button',name='Restaurar cópia original',exact=True).click()
    expect(admin.get_by_text('Cópia original restaurada e salva no rascunho.',exact=True)).to_be_visible()
    assert client.get(base+'/website',headers=headers).json()['configuration']['has_checkpoint'] is False
    assert client.get(public_path).json()==original_public
    record('Catálogo completo: mapa de seis páginas, prévia privada da home curta e das seis páginas sem gravar, aplicação em rascunho, checkpoint durável após reload e restauração sem publicar')
    admin.get_by_label('Manter cabeçalho no topo durante a rolagem',exact=True).check()
    admin.get_by_label('Exibir barra de ações no celular',exact=True).uncheck()
    admin.get_by_label('Chamada principal',exact=True).fill('Rascunho privado em revisão')
    admin.get_by_role('button',name='Adicionar página',exact=True).click()
    admin.get_by_label('Título da página',exact=True).fill('Nossa história em comunidade')
    admin.get_by_label('Endereço da página (slug)',exact=True).fill('sobre')
    admin.get_by_label('Apresentação da página',exact=True).fill('Uma página institucional sintética com endereço próprio.')
    admin.get_by_role('button',name='Adicionar seção',exact=True).click()
    admin.locator('details').filter(has=admin.get_by_label('Identificador do link',exact=True)).locator('summary').first.click()
    admin.get_by_label('Título',exact=True).fill('Nossa trajetória')
    admin.get_by_role('button',name='Adicionar página ao menu',exact=True).click()
    admin.get_by_role('button',name='Salvar rascunho',exact=True).click()
    expect(admin.get_by_text('Rascunho salvo.',exact=False)).to_be_visible()
    assert client.get('/api/v1/public/schools/'+base.split('/')[-1]+'/website').json()['website']['headline']!= 'Rascunho privado em revisão'
    assert client.get('/api/v1/public/schools/'+base.split('/')[-1]+'/website?page=sobre').status_code==404
    admin.get_by_role('button',name='Visualizar prévia',exact=True).click()
    expect(admin.locator('iframe[title="Prévia privada do site"]')).to_be_visible()
    admin.once('dialog',lambda dialog:dialog.accept())
    admin.get_by_role('button',name='Publicar site',exact=True).click()
    expect(admin.get_by_text('Site publicado com sucesso.',exact=True)).to_be_visible()
    assert client.get('/api/v1/public/schools/'+base.split('/')[-1]+'/website').json()['website']['headline']=='Rascunho privado em revisão'
    assert client.get('/api/v1/public/schools/'+base.split('/')[-1]+'/website?page=sobre').status_code==200
    import httpx
    published_page=httpx.get(WEBSITE_URL+'/sobre',headers={'Host':'site.example.test'},timeout=20)
    assert published_page.status_code==200,published_page.text
    assert 'Nossa história em comunidade' in published_page.text and 'Nossa trajetória' in published_page.text
    assert httpx.get(WEBSITE_URL+'/pagina-inexistente',headers={'Host':'site.example.test'},timeout=20).status_code==404
    page=browser.new_page();page.set_content(published_page.text)
    for width in (390,1440):
        page.set_viewport_size({'width':width,'height':900})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        page.screenshot(path=str(OUT/f'website-internal-page-{width}.png'),full_page=True)
    page.close()
    record('Editor salva página com rota própria, mantém rascunho privado e publica por confirmação; proxy serve /sobre e rejeita página inexistente')
    for name in ('Pessoa Sintética Lote A','Pessoa Sintética Lote B','Pessoa Sintética Manual'):
        post('/students',{'person':{'name':name,'birth_date':'2000-01-15'}})
    admin.goto(URL+'/#/enrollments')
    workflow=admin.get_by_role('region',name='Assistentes de matrícula')
    expect(workflow.get_by_role('button',name='Matricular selecionados',exact=True)).to_be_visible()
    workflow.get_by_role('button',name='Matricular selecionados',exact=True).click()
    workflow.get_by_label('Período destino',exact=True).select_option(year['id'])
    workflow.get_by_label('Turma para a seleção',exact=True).select_option(group['id'])
    workflow.get_by_label('Data da matrícula',exact=True).fill('2027-02-01')
    workflow.get_by_label('Buscar aluno existente',exact=True).fill('Pessoa Sintética Lote')
    workflow.get_by_role('button',name='Pesquisar',exact=True).click()
    for name in ('Pessoa Sintética Lote A','Pessoa Sintética Lote B'):
        workflow.get_by_role('row').filter(has_text=name).get_by_role('button',name='Selecionar',exact=True).click()
    workflow.get_by_role('button',name='Simular matrículas',exact=True).click()
    expect(workflow.get_by_text('2 elegível(is) · 0 bloqueado(s)',exact=True)).to_be_visible()
    workflow.get_by_label('Conferi a seleção',exact=False).check()
    workflow.get_by_role('button',name='Confirmar matrículas',exact=True).click()
    expect(workflow.get_by_text('Matrícula criada em preparação',exact=False)).to_have_count(2)
    workflow.screenshot(path=str(OUT/'enrollment-batch-result.png'))
    record('Wizard em lote busca pessoas existentes, simula e cria duas matrículas com resultado persistido')
    workflow.get_by_role('button',name='Assistente manual',exact=True).click()
    workflow.get_by_label('Período destino',exact=True).select_option(year['id'])
    workflow.get_by_label('Turma para a seleção',exact=True).select_option(group['id'])
    workflow.get_by_label('Data da matrícula',exact=True).fill('2027-02-01')
    workflow.get_by_label('Buscar aluno existente',exact=True).fill('Pessoa Sintética Manual')
    workflow.get_by_role('button',name='Pesquisar',exact=True).click()
    workflow.get_by_role('row').filter(has_text='Pessoa Sintética Manual').get_by_role('button',name='Selecionar',exact=True).click()
    workflow.get_by_role('combobox',name='Responsável financeiro',exact=True).select_option(label='O próprio aluno')
    workflow.get_by_role('button',name='Simular matrículas',exact=True).click()
    workflow.get_by_label('Conferi a seleção',exact=False).check()
    workflow.get_by_role('button',name='Confirmar matrículas',exact=True).click()
    expect(workflow.get_by_role('button',name='4. Financeiro',exact=True)).to_be_visible()
    workflow.get_by_role('button',name='4. Financeiro',exact=True).click()
    workflow.get_by_label('Valor por parcela',exact=True).fill('123.45')
    workflow.get_by_label('Quantidade de parcelas',exact=True).fill('1.5')
    expect(workflow.get_by_text('Total: —',exact=False)).to_be_visible()
    workflow.get_by_label('Quantidade de parcelas',exact=True).fill('2')
    workflow.get_by_label('Primeiro vencimento',exact=True).fill('2027-02-10')
    workflow.get_by_label('Descrição',exact=True).fill('Mensalidade sintética')
    workflow.get_by_role('button',name='Registrar parcelas pendentes',exact=True).click()
    expect(workflow.get_by_text('Obrigações internas registradas como pendentes.',exact=False)).to_be_visible()
    expect(workflow.get_by_text('Financeiro: 2 obrigação(ões), 2 pendente(s)',exact=True)).to_be_visible()
    record('Financeiro manual registra duas parcelas reais pendentes sem baixa automática')
    workflow.get_by_role('button',name='5. Contratos e fichas',exact=True).click()
    expect(workflow.get_by_text('Modelos e contratos',exact=True)).to_be_visible()
    record('Assistente manual cria matrícula retomável e abre contratos no contexto da matrícula')
    # Documento sintético criado durante o teste; nenhum anexo real entra no repositório.
    import zipfile,tempfile
    from pathlib import Path
    with tempfile.TemporaryDirectory() as folder:
        source=Path(folder)/'ficha-sintetica.docx'
        with zipfile.ZipFile(source,'w') as z:
            z.writestr('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
            z.writestr('_rels/.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')
            z.writestr('word/document.xml','<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>DADOS DO ALUNO — Nome: XXXXXX</w:t></w:r></w:p></w:body></w:document>')
        admin.goto(URL+'/#/contracts')
        admin.get_by_role('button',name='+ Novo modelo',exact=True).click()
        admin.get_by_label('Nome do modelo',exact=True).fill('Ficha sintética com layout')
        admin.get_by_label('Categoria (código)',exact=True).fill('declaration')
        admin.get_by_label('Exigir assinatura A1 automática da escola no PDF',exact=True).uncheck()
        admin.get_by_label('Selecionar DOCX de até 8 MB',exact=True).set_input_files(source)
        review=admin.get_by_role('region',name='Revisão do original DOCX')
        expect(review.get_by_label('Campo para esta região',exact=True)).to_have_value('aluno.nome')
        review.get_by_label('Aprovar substituição desta região',exact=True).check()
        with admin.expect_download() as pending:
            review.get_by_role('button',name='Conferir PDF mapeado',exact=True).click()
        download=pending.value
        assert Path(download.path()).read_bytes().startswith(b'%PDF')
        review.get_by_label('Conferi todas as páginas',exact=False).check()
        admin.get_by_label('Modelo ativo para novas emissões',exact=True).check()
        admin.get_by_role('button',name='Salvar modelo',exact=True).click()
        expect(admin.get_by_text('Modelo salvo. A versão anterior',exact=False)).to_be_visible()
        review.screenshot(path=str(OUT/'docx-mapping-review.png'))
    record('DOCX importado pela interface, campo revisado, PDF real baixado e modelo ativado após conferência')
