"""OOXML local: original privado, âncoras revisáveis e substituição sem achatar runs."""
import io
import re
import shutil
import subprocess
import tempfile
import zipfile
from pathlib import Path
from lxml import etree as ET
from .security import fail

MAX_UPLOAD=8*1024*1024
NS={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
TOKEN=re.compile(r'\{\{\s*([a-z][a-z0-9_.]{0,79})\s*\}\}|X{3,}|_{3,}',re.I)


def archive(data):
    if not data or len(data)>MAX_UPLOAD:fail(413,'O DOCX deve ter até 8 MB.')
    try:
        z=zipfile.ZipFile(io.BytesIO(data));info=z.infolist();names=z.namelist()
        if len(info)>1500 or len(names)!=len(set(names)) or sum(i.file_size for i in info)>40*1024*1024 or 'word/document.xml' not in names:raise ValueError()
        for item in info:
            name=item.filename
            if item.flag_bits&1 or name.startswith('/') or '..' in Path(name).parts or '\\' in name:raise ValueError()
            if any(token in name.lower() for token in ('vbaproject','activex/','embeddings/')):raise ValueError()
            if name.endswith(('.xml','.rels')):
                content=z.read(name)
                if b'<!DOCTYPE' in content or b'<!ENTITY' in content:raise ValueError()
                root=ET.fromstring(content,ET.XMLParser(resolve_entities=False,no_network=True))
                if name.endswith('.rels'):
                    for rel in root:
                        if any(part in rel.get('Type','').lower() for part in ('vbaproject','activex','oleobject','afchunk')):raise ValueError()
                        if rel.get('TargetMode')=='External' and not rel.get('Type','').endswith('/hyperlink'):raise ValueError()
                if name.startswith('word/'):
                    instructions=[''.join(n.text or '' for n in root.findall('.//w:instrText',NS))]+[n.get('{'+NS['w']+'}instr','') for n in root.findall('.//w:fldSimple',NS)]
                    if root.find('.//w:altChunk',NS) is not None or any(re.search(r'\b(?:INCLUDETEXT|INCLUDEPICTURE|DDEAUTO|DDE)\b',value,re.I) for value in instructions):raise ValueError()
        return z
    except (zipfile.BadZipFile,ET.XMLSyntaxError,ValueError,RuntimeError,KeyError):fail(422,'DOCX inválido, ativo, com referência externa não permitida ou acima do limite descompactado.')


def parts(z):return sorted(n for n in z.namelist() if re.fullmatch(r'word/(document|header\d+|footer\d+)\.xml',n))


def suggest(data):
    suggestions=[]
    with archive(data) as z:
        for part in parts(z):
            root=ET.fromstring(z.read(part));context=''
            for index,p in enumerate(root.findall('.//w:p',NS)):
                text=''.join(n.text or '' for n in p.findall('.//w:t',NS))
                upper=text.upper()
                if 'CONTRATANTE II' in upper:context='contratante2'
                elif 'CONTRATANTE I' in upper:context='contratante1'
                elif 'DADOS DO ALUNO' in upper:context='aluno'
                for match in TOKEN.finditer(text):
                    key=(match.group(1) or '').strip();before=text[:match.start()].lower()
                    if not key:
                        labels=[('data de nascimento','nascimento'),('nascimento','nascimento'),('e-mail','email'),('email','email'),('cpf','cpf'),('nome','nome')]
                        candidates=[(before.rfind(label),suffix) for label,suffix in labels if label in before]
                        if candidates and context:key=context+'.'+max(candidates)[1]
                    suggestions.append({'id':len(suggestions),'part':part,'paragraph':index,'start':match.start(),'end':match.end(),'original':match.group(),'context':text[max(0,match.start()-70):min(len(text),match.end()+50)],'field':key,'confidence':'explicit' if match.group(1) else 'review','required':True,'accepted':bool(match.group(1))})
    return suggestions


def replace_ranges(p,replacements):
    nodes=p.findall('.//w:t',NS)
    text=''.join(n.text or '' for n in nodes)
    for start,end,value in sorted(replacements,reverse=True):
        cursor=0;inserted=False
        for n in nodes:
            original=n.text or '';left=cursor;right=left+len(original);cursor=right
            if right<=start or left>=end:continue
            begin=max(0,start-left);finish=min(len(original),end-left)
            n.text=original[:begin]+(value if not inserted else '')+original[finish:]
            n.set('{http://www.w3.org/XML/1998/namespace}space','preserve');inserted=True
        if not inserted:fail(409,'A posição do campo não corresponde ao documento original.')
    return text


def mapped(data,mapping):
    by_part={}
    for item in mapping:
        if not isinstance(item,dict):fail(422,'Mapeamento inválido.')
        if not item.get('accepted'):continue
        if not all(key in item for key in ('field','part','paragraph','start','end','original')):fail(422,'Mapeamento incompleto.')
        if not isinstance(item['field'],str) or not isinstance(item['part'],str) or not isinstance(item['paragraph'],int) or not isinstance(item['start'],int) or not isinstance(item['end'],int) or not isinstance(item['original'],str):fail(422,'Tipos de mapeamento inválidos.')
        if not re.fullmatch(r'[a-z][a-z0-9_.]{0,79}',item.get('field','')):fail(422,'Escolha um campo válido para cada região aceita.')
        by_part.setdefault(item['part'],{}).setdefault(item['paragraph'],[]).append(item)
    output=io.BytesIO()
    with archive(data) as z,zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as out:
        if set(by_part)-set(parts(z)):fail(422,'Parte do documento não reconhecida.')
        for member in z.infolist():
            content=z.read(member.filename)
            if member.filename in by_part:
                root=ET.fromstring(content);paragraphs=root.findall('.//w:p',NS)
                for index,items in by_part[member.filename].items():
                    if not isinstance(index,int) or index<0 or index>=len(paragraphs):fail(422,'Parágrafo inválido.')
                    p=paragraphs[index];text=''.join(n.text or '' for n in p.findall('.//w:t',NS));ranges=[];last=-1
                    for item in sorted(items,key=lambda i:i['start']):
                        start,end=item['start'],item['end']
                        if not isinstance(start,int) or not isinstance(end,int) or start<last or start<0 or end<=start or text[start:end]!=item['original']:fail(409,'Mapeamento desatualizado ou com regiões sobrepostas.')
                        last=end;ranges.append((start,end,'{{'+item['field']+'}}'))
                    replace_ranges(p,ranges)
                content=ET.tostring(root,xml_declaration=True,encoding='UTF-8',standalone=True)
            out.writestr(member,content)
    return output.getvalue()


def fill(data,values):
    output=io.BytesIO()
    with archive(data) as z,zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as out:
        selected=parts(z)
        for item in z.infolist():
            content=z.read(item.filename)
            if item.filename in selected:
                root=ET.fromstring(content)
                for p in root.findall('.//w:p',NS):
                    text=''.join(n.text or '' for n in p.findall('.//w:t',NS))
                    ranges=[(m.start(),m.end(),str(values.get(m.group(1),'['+m.group(1)+']'))) for m in TOKEN.finditer(text) if m.group(1)]
                    replace_ranges(p,ranges)
                content=ET.tostring(root,xml_declaration=True,encoding='UTF-8',standalone=True)
            out.writestr(item,content)
    return output.getvalue()


def pdf(data):
    executable=shutil.which('soffice') or shutil.which('libreoffice')
    if not executable:fail(503,'Conversor de documentos indisponível. O original permanece preservado; instale o componente LibreOffice para conferir o layout.')
    with tempfile.TemporaryDirectory(prefix='pige-docx-') as folder:
        root=Path(folder);source=root/'document.docx';source.write_bytes(data)
        profile=root/'profile';profile.mkdir()
        # Perfil isolado, macros proibidas e atualizações externas desabilitadas.
        (profile/'user').mkdir()
        (profile/'user/registrymodifications.xcu').write_text('''<?xml version="1.0"?><oor:items xmlns:oor="http://openoffice.org/2001/registry"><item oor:path="/org.openoffice.Office.Common/Security/Scripting"><prop oor:name="MacroSecurityLevel" oor:op="fuse"><value>3</value></prop></item><item oor:path="/org.openoffice.Office.Writer/Content/Update"><prop oor:name="Link" oor:op="fuse"><value>2</value></prop></item></oor:items>''')
        try:
            result=subprocess.run([executable,'-env:UserInstallation='+profile.as_uri(),'--headless','--nologo','--nodefault','--nofirststartwizard','--convert-to','pdf','--outdir',str(root),str(source)],capture_output=True,timeout=60)
        except (OSError,subprocess.TimeoutExpired):fail(422,'Não foi possível renderizar o documento dentro do limite. Original preservado.')
        target=root/'document.pdf'
        if result.returncode or not target.exists():fail(422,'Falha de renderização. Confira o documento original antes de publicar.')
        content=target.read_bytes()
        if not content.startswith(b'%PDF') or len(content)>40*1024*1024:fail(422,'PDF de saída inválido ou acima do limite.')
        return content
