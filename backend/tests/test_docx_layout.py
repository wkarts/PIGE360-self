"""Originais sintéticos: OOXML, revisão, isolamento e PDF real."""
import hashlib
import io
import zipfile
from lxml import etree
from pypdf import PdfReader
from app.docx_layout import suggest,mapped,fill,NS


def document():
    data=io.BytesIO()
    with zipfile.ZipFile(data,'w') as z:
        z.writestr('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
        z.writestr('_rels/.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')
        z.writestr('word/document.xml','<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>DADOS DO ALUNO — Nome: XXX</w:t></w:r><w:r><w:t>XXX</w:t></w:r></w:p><w:tbl><w:tblPr><w:tblW w:w="5000" w:type="dxa"/></w:tblPr><w:tr><w:tc><w:p><w:r><w:t>Cláusula que permanece intacta.</w:t></w:r></w:p></w:tc></w:tr></w:tbl><w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr></w:body></w:document>')
        z.writestr('word/media/preserved.bin',b'unchanged-artwork')
    return data.getvalue()


def test_multirun_mapping_preserves_table_style_and_media():
    original=document();mapping=suggest(original)
    assert mapping[0]['field']=='aluno.nome' and not mapping[0]['accepted']
    mapping[0]['accepted']=True
    content=fill(mapped(original,mapping),{'aluno.nome':'Aluno Sintético'})
    with zipfile.ZipFile(io.BytesIO(content)) as z:
        assert z.read('word/media/preserved.bin')==b'unchanged-artwork'
        root=etree.fromstring(z.read('word/document.xml'))
        assert root.find('.//w:b',NS) is not None and root.find('.//w:tbl',NS) is not None
        text=''.join(root.itertext());assert 'Aluno Sintético' in text and 'XXXXXX' not in text


def test_preserved_source_review_pdf_and_immutable_issue(api):
    original=document()
    imported=api.client.post(api.base+'/document-sources/inspect',headers=api.headers,files={'file':('synthetic.docx',original)})
    assert imported.status_code==201,imported.text
    source=imported.json();assert source['sha256']==hashlib.sha256(original).hexdigest()
    mapping=source['suggestions'];mapping[0]['accepted']=True
    request={'source_file_id':source['source_file_id'],'mapping':mapping}
    prepared=api.post('/document-sources/prepare',request,200)
    payload={**{k:prepared[k] for k in ('body','header','footer')},'name':'Ficha sintética','kind':'declaration','source_docx_file_id':source['source_file_id'],'docx_mapping':mapping,'active':True}
    api.post('/document-templates',payload,422)
    template=api.post('/document-templates',{**payload,'docx_reviewed':True})
    catalog=api.catalogs();student=api.student('Aluno Documento Sintético',adult=True);enrollment=api.enroll(student,catalog['group'])
    generated=api.post('/document-templates/'+template['id']+'/issue',{'enrollment_id':enrollment['id']})
    downloaded=api.client.get(api.base+'/files/'+generated['file_id']+'/download',headers=api.headers)
    assert 'Aluno Documento Sintético' in PdfReader(io.BytesIO(downloaded.content)).pages[0].extract_text()
    assert api.client.get(api.base+'/files/'+source['source_file_id']+'/download',headers=api.headers).content==original
    changed=api.patch('/document-templates/'+template['id'],{'version':template['version'],'name':'Ficha revisada'})
    assert changed['version']>template['version']
    assert api.client.get(api.base+'/files/'+generated['file_id']+'/download',headers=api.headers).content==downloaded.content
    assert api.get('/document-templates/'+template['id']+'/revisions/1')['content']['source_docx_sha256']==source['sha256']
    other=api.client.post('/api/v1/schools',headers=api.headers,json={'company_id':api.school['company_id'],'name':'Outra escola de documento'}).json()
    assert api.client.post('/api/v1/schools/'+other['id']+'/document-sources/prepare',headers=api.headers,json=request).status_code==404


def test_malformed_mapping_and_unsafe_archive_rejected(api):
    result=api.client.post(api.base+'/document-sources/inspect',headers=api.headers,files={'file':('synthetic.docx',document())}).json()
    for item in ({'accepted':True},{'accepted':True,'field':[]},{'accepted':True,'field':'aluno.nome','part':'word/document.xml','paragraph':0,'start':-2,'end':9,'original':'invalid'}):
        assert api.client.post(api.base+'/document-sources/prepare',headers=api.headers,json={'source_file_id':result['source_file_id'],'mapping':[item]}).status_code in (409,422)
    data=io.BytesIO()
    with zipfile.ZipFile(data,'w') as z:
        z.writestr('word/document.xml','<xml/>');z.writestr('word/vbaProject.bin',b'macro')
    assert api.client.post(api.base+'/document-sources/inspect',headers=api.headers,files={'file':('macro.docx',data.getvalue())}).status_code==422
