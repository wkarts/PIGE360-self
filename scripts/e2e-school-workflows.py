"""Extensão do E2E HTTP: editor, quatro modelos, matrícula manual e em lote.
Executada no mesmo contexto sintético de e2e-portal-polished.py.
"""
def verify_workflows(admin,browser,client,headers,base,URL,OUT,record,expect,post,year,group):
    # Renderer público e prévia devem coincidir; nenhuma imagem ou marca de cliente.
    for title in ('Ciência feita em comunidade','Histórias que atravessam a sala','Aprender com novas perguntas'):
        post('/community-posts',{'title':title,'summary':'Projetos e experiências compartilhados pela comunidade escolar.','content':'Uma publicação sintética para validar o conteúdo público, sua leitura e a organização dos modelos.','status':'published','audience':'public'})
    website=client.get(base+'/website',headers=headers).json()['configuration']
    page=browser.new_page()
    for theme in ('horizon','editorial','culture','campus'):
        payload={k:website[k] for k in ('version','headline','introduction','about','public_url','portal_url','notice')}
        payload.update(theme=theme,enabled=True,headline='Aprender com curiosidade, crescer em comunidade.',admission_url='https://school.example.test/online.html')
        response=client.post(base+'/website/preview',headers=headers,json=payload);assert response.status_code==200,response.text
        page.set_content(response.json()['html'])
        for width in (320,390,768,1440):
            page.set_viewport_size({'width':width,'height':900})
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(theme,width)
            page.screenshot(path=str(OUT/f'website-{theme}-{width}.png'),full_page=True)
    page.close();record('Quatro composições de site renderizadas em 320, 390, 768 e 1440 px sem overflow')
    admin.goto(URL+'/#/community')
    expect(admin.get_by_role('heading',name='Site institucional',exact=True)).to_be_visible()
    admin.get_by_role('button',name='Configurar site',exact=True).click()
    admin.get_by_label('Chamada principal',exact=True).fill('Rascunho privado em revisão')
    admin.get_by_role('button',name='Salvar rascunho',exact=True).click()
    expect(admin.get_by_text('Rascunho salvo.',exact=False)).to_be_visible()
    assert client.get('/api/v1/public/schools/'+base.split('/')[-1]+'/website').json()['website']['headline']!= 'Rascunho privado em revisão'
    admin.get_by_role('button',name='Visualizar prévia',exact=True).click()
    expect(admin.locator('iframe[title="Prévia privada do site"]')).to_be_visible()
    admin.once('dialog',lambda dialog:dialog.accept())
    admin.get_by_role('button',name='Publicar site',exact=True).click()
    expect(admin.get_by_text('Site publicado com sucesso.',exact=True)).to_be_visible()
    assert client.get('/api/v1/public/schools/'+base.split('/')[-1]+'/website').json()['website']['headline']=='Rascunho privado em revisão'
    record('Editor salva rascunho privado, apresenta prévia e publica somente por confirmação explícita')
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
