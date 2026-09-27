"""Driver OCR local. Executado somente em subprocesso limitado do worker.

Saída: texto, páginas, tokens com caixas/confiança e sugestões conservadoras.
Nenhuma inferência sobre autenticidade, biometria ou responsabilidades familiares.
"""
from __future__ import annotations
import csv
import io
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import unicodedata
from datetime import date, datetime
from PIL import Image, ImageOps, ImageStat, ImageFilter

MAX_PAGES = 5
MAX_TEXT = 50_000
MAX_TOKENS = 8_000


def normalized(value: str):
    return ''.join(c for c in unicodedata.normalize('NFKD',value).upper() if not unicodedata.combining(c))


def valid_cpf(value: str):
    digits=re.sub(r'\D','',value)
    if len(digits)!=11 or len(set(digits))==1:
        return ''
    for n in (9,10):
        v=(sum(int(x)*w for x,w in zip(digits[:n],range(n+1,1,-1)))*10)%11
        if str(0 if v==10 else v)!=digits[n]:return ''
    return digits


def suggestions(text: str, purpose: str, confidence: float | None):
    """Somente campos com rótulo explícito ou identificador validado.

    Valor ambíguo (p.ex. dois CPFs distintos) não escolhe silenciosamente o primeiro.
    A confiança é a qualidade média de leitura, NÃO certeza semântica do campo.
    """
    result=[]; lines=[x.strip() for x in text.splitlines() if x.strip()]
    def add(field, value, evidence, validated=False):
        if value and not any(r['field']==field for r in result):
            result.append({'field':field,'value':value,'evidence':evidence[:240],
                'confidence':confidence,'validated_format':validated,'requires_review':True})
    cpfs={valid_cpf(x) for x in re.findall(r'(?<!\d)\d{3}[.\s]?\d{3}[.\s]?\d{3}[-\s]?\d{2}(?!\d)',text)}-{''}
    if len(cpfs)==1 and purpose!='company':add('cpf',cpfs.pop(),'CPF com dígitos verificadores válidos',True)
    labels={
        'name':r'(?:NOME(?: COMPLETO)?|NOME CIVIL)',
        'mother_name':r'(?:NOME DA MAE|MAE)',
        'father_name':r'(?:NOME DO PAI|PAI)',
        'birth_city':r'(?:NATURALIDADE|CIDADE DE NASCIMENTO)',
        'nationality':r'NACIONALIDADE',
        'rg':r'(?:REGISTRO GERAL|RG)',
        'rg_issuer':r'(?:ORGAO EXPEDIDOR|ORGAO EMISSOR)',
        'birth_certificate':r'(?:MATRICULA DA CERTIDAO|REGISTRO DE NASCIMENTO)',
    }
    if purpose=='company':labels={'name':r'(?:RAZAO SOCIAL|NOME EMPRESARIAL)','trade_name':r'(?:NOME FANTASIA|TITULO DO ESTABELECIMENTO)'}
    if purpose=='address':labels={'street':r'(?:LOGRADOURO|ENDERECO)','district':r'BAIRRO','city':r'(?:CIDADE|MUNICIPIO)','state':r'UF'}
    for field,pattern in labels.items():
        values=[]
        for i,line in enumerate(lines):
            n=normalized(line);match=re.match('^'+pattern+r'\s*[:\-]?\s*(.*)$',n)
            if not match:continue
            tail=line[len(line)-len(match.group(1)):].strip() if match.group(1) else ''
            if not tail and i+1<len(lines):tail=lines[i+1]
            # Não absorver rótulo seguinte como valor.
            if not tail or len(tail)>180 or re.match(r'^(CPF|RG|FILIACAO|NASCIMENTO|VALIDADE|SEXO|NOME|MAE|PAI|DOCUMENTO)\b',normalized(tail)):continue
            if field in ('name','mother_name','father_name') and (any(c.isdigit() for c in tail) or len(tail.split())<2):continue
            values.append((tail,line))
        unique={v for v,_ in values}
        if len(unique)==1:add(field,values[0][0],values[0][1])
    births=[]
    for i,line in enumerate(lines):
        if re.match(r'^(?:DATA DE NASCIMENTO|NASCIMENTO|DATA NASC\.?|NASC\.?)(?:\s|:|$)',normalized(line)):
            scope=line+' '+(lines[i+1] if i+1<len(lines) else '')
            dates=re.findall(r'(?<!\d)(\d{2}/\d{2}/\d{4})(?!\d)',scope)
            if dates:
                try:
                    d=datetime.strptime(dates[0],'%d/%m/%Y').date()
                    if date(1900,1,1)<=d<=date.today():births.append((d.isoformat(),line))
                except ValueError:pass
    if purpose not in ('company','address') and len({v for v,_ in births})==1:add('birth_date',births[0][0],births[0][1],True)
    ceps=set(re.findall(r'(?im)\bCEP\s*[:\-]?\s*([0-9]{5}[-\s]?[0-9]{3})\b',text))
    if len(ceps)==1:add('postal_code',re.sub(r'\D','',ceps.pop()),'CEP identificado no documento',True)
    if purpose=='company':
        from .schemas import PersonInput
        cnpjs=set()
        for value in re.findall(r'\b[A-Z0-9]{2}\.?[A-Z0-9]{3}\.?[A-Z0-9]{3}/?[A-Z0-9]{4}-?[0-9]{2}\b',normalized(text)):
            try:
                v=PersonInput.cnpj_valid(value)
                if v:cnpjs.add(v)
            except ValueError:pass
        if len(cnpjs)==1:add('cnpj',cnpjs.pop(),'CNPJ com dígitos verificadores válidos',True)
    return result


def command(args: list[str], timeout: int=35):
    return subprocess.run(args,check=True,capture_output=True,timeout=timeout,
        env={**os.environ,'OMP_THREAD_LIMIT':'1','OPENBLAS_NUM_THREADS':'1'})


def read_image(path: Path, page: int, directory: Path):
    with Image.open(path) as image:
        if image.width*image.height>30_000_000:raise ValueError('image_too_large')
        image=ImageOps.exif_transpose(image).convert('RGB')
        if image.width<240 or image.height<150:raise ValueError('image_too_small')
        image.thumbnail((3000,3000))
        gray=ImageOps.autocontrast(ImageOps.grayscale(image))
        edge=gray.resize((512,max(1,int(gray.height*512/gray.width)))).filter(ImageFilter.FIND_EDGES)
        warnings=['Possível desfoque: confira a imagem ou fotografe novamente.'] if ImageStat.Stat(edge).var[0]<90 else []
        normal=directory/f'normalized-{page}.png';gray.save(normal)
        width,height=gray.size
    output=command(['tesseract',str(normal),'stdout','-l','por+eng','--psm','6','tsv']).stdout.decode('utf-8',errors='replace')
    rows=[];groups={}
    for row in csv.DictReader(io.StringIO(output),delimiter='\t',quoting=csv.QUOTE_NONE):
        value=(row.get('text') or '').strip()
        if row.get('level')!='5' or not value:continue
        try:
            conf=float(row['conf'])
            token={'text':value[:200],'confidence':max(0,min(100,conf)),
                'box':[int(row[k]) for k in ('left','top','width','height')]}
        except (KeyError,ValueError):continue
        rows.append(token);groups.setdefault((row['block_num'],row['par_num'],row['line_num']),[]).append(value)
        if len(rows)>=MAX_TOKENS:break
    text='\n'.join(' '.join(line) for line in groups.values())[:MAX_TEXT]
    return {'number':page,'width':width,'height':height,'source':'tesseract','text':text,'tokens':rows,'warnings':warnings}


def extract(path: Path, mime: str, purpose: str, directory: Path):
    pages=[]
    if mime=='application/pdf':
        # Todo parsing de PDF ocorre no processo filho, limitado em tempo/memória.
        from pypdf import PdfReader
        reader=PdfReader(path,strict=True)
        if reader.is_encrypted or not 1<=len(reader.pages)<=MAX_PAGES:raise ValueError('pdf_page_limit')
        raw=path.read_bytes()
        if any(x in raw for x in (b'/JavaScript',b'/JS',b'/Launch',b'/EmbeddedFile',b'/OpenAction')):raise ValueError('active_pdf')
        for index,page in enumerate(reader.pages,1):
            text=(page.extract_text() or '')[:MAX_TEXT]
            if len(re.findall(r'[A-Za-zÀ-ÿ]',text))>=40:
                pages.append({'number':index,'source':'pdf_text','text':text,'tokens':[],'warnings':[]})
            else:
                prefix=directory/f'page-{index}'
                command(['pdftoppm','-f',str(index),'-l',str(index),'-singlefile','-scale-to','3000','-png',str(path),str(prefix)])
                pages.append(read_image(prefix.with_suffix('.png'),index,directory))
    else:
        pages.append(read_image(path,1,directory))
    text='\n\n'.join(p['text'] for p in pages)[:MAX_TEXT]
    tokens=[t for page in pages for t in page['tokens']]
    confidence=round(sum(t['confidence'] for t in tokens)/len(tokens),1) if tokens else None
    warnings=list(dict.fromkeys(w for p in pages for w in p['warnings']))
    if confidence is not None and confidence<70:warnings.append('Leitura com baixa confiança. Prefira uma foto nítida e sem reflexos.')
    if not text.strip():warnings.append('Nenhum texto legível. Fotografe novamente ou preencha manualmente.')
    return {'engine':'tesseract-5/poppler','schema_version':1,'purpose':purpose,'text':text,'pages':pages,
        'confidence':confidence,'suggestions':suggestions(text,purpose,confidence),'warnings':warnings,
        'requires_review':True,'document_authenticity_verified':False}


if __name__=='__main__':
    # Os limites são herdados por Tesseract/Poppler. Sem shell e sem URL remota.
    import resource
    resource.setrlimit(resource.RLIMIT_AS,(768*1024*1024,768*1024*1024))
    resource.setrlimit(resource.RLIMIT_CPU,(90,90))
    resource.setrlimit(resource.RLIMIT_FSIZE,(32*1024*1024,32*1024*1024))
    resource.setrlimit(resource.RLIMIT_NOFILE,(64,64))
    try:
        result=extract(Path(sys.argv[1]),sys.argv[2],sys.argv[3],Path(sys.argv[4]))
        print(json.dumps(result,ensure_ascii=False))
    except Exception as error:
        # Nunca enviar texto/documento/traceback para logs do worker.
        print(json.dumps({'error_code':str(error) if isinstance(error,ValueError) else type(error).__name__}))
        raise SystemExit(1)
