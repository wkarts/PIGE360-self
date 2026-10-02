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
from PIL import Image, ImageOps

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
        'name':r'(?:NOME (?:COMPLETO|CIVIL|E SOBRENOME)|NOME)(?!\s+(?:DA MAE|DO PAI)\b)',
        'mother_name':r'(?:NOME DA MAE|MAE)',
        'father_name':r'(?:NOME DO PAI|PAI)',
        'birth_city':r'(?:NATURALIDADE|CIDADE DE NASCIMENTO)',
        'nationality':r'NACIONALIDADE',
        'rg':r'(?:REGISTRO GERAL|RG|DOC\.?\s*IDENTIDADE(?:\s*/?\s*[ÓO]RG\.?\s*EMISSOR\s*/?\s*UF)?)',
        'rg_issuer':r'(?:ORGAO EXPEDIDOR|ORGAO EMISSOR)',
        'birth_certificate':r'(?:MATRICULA DA CERTIDAO|REGISTRO DE NASCIMENTO)',
    }
    if purpose=='company':labels={'name':r'(?:RAZAO SOCIAL|NOME EMPRESARIAL)','trade_name':r'(?:NOME FANTASIA|TITULO DO ESTABELECIMENTO)'}
    if purpose=='address':labels={'street':r'(?:LOGRADOURO|ENDERECO)','district':r'BAIRRO','city':r'(?:CIDADE|MUNICIPIO)','state':r'UF'}
    for field,pattern in labels.items():
        values=[];issuers=[]
        for i,line in enumerate(lines):
            n=normalized(line);match=re.match(r'^[\[|\s]*(?:\d[A-Z]?(?:\s+E\s+\d[A-Z]?)?[.\-]?\s+)?'+pattern+r'\s*[:\-]?\s*(.*)$',n)
            if not match:continue
            tail=line[len(line)-len(match.group(1)):].strip() if match.group(1) else ''
            if not tail and i+1<len(lines):tail=lines[i+1]
            # Não absorver rótulo seguinte como valor.
            if not tail or len(tail)>180 or re.match(r'^(CPF|RG|FILIACAO|NASCIMENTO|VALIDADE|SEXO|NOME|MAE|PAI|DOCUMENTO)\b',normalized(tail)):continue
            if field in ('name','mother_name','father_name') and (len(tail.split())<2 or not re.fullmatch(r"[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ '\-.]+",tail)):continue
            if field=='rg':
                identity=re.fullmatch(r'[\[| ]*([0-9][0-9.\-]{3,17})\s+([A-Za-z/.-]{2,16})\s+([A-Za-z]{2})[\]| ]*',tail)
                if identity:
                    issuers.append((identity.group(2).upper()+'/'+identity.group(3).upper(),line))
                    tail=identity.group(1)
                elif not re.fullmatch(r'[0-9][0-9.\-]{3,17}',tail):continue
            values.append((tail,line))
        unique={v for v,_ in values}
        if len(unique)==1:
            add(field,values[0][0],values[0][1])
            if len({issuer for issuer,_ in issuers})==1:add('rg_issuer',issuers[0][0],issuers[0][1])
    births=[]
    for i,line in enumerate(lines):
        if re.search(r'\b(?:DATA\s+(?:DE\s+)?NASCIMENTO|NASCIMENTO|DATA NASC\.?|NASC\.?)(?:\s|:|$)',normalized(line)):
            following=[]
            for next_line in lines[i+1:i+4]:
                if re.search(r'\b(FILIACAO|VALIDADE|EMISSAO|HABILITACAO|NACIONALIDADE)\b',normalized(next_line)):break
                following.append(next_line)
                if re.search(r'\d{2}/\d{2}/\d{4}',next_line):break
            scope=line+' '+' '.join(following)
            dates=re.findall(r'(?<!\d)(\d{2}/\d{2}/\d{4})(?!\d)',scope)
            if len(set(dates))==1:
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


def command(args: list[str], timeout: int=30):
    return subprocess.run(args,check=True,capture_output=True,timeout=timeout,
        env={**os.environ,'OMP_THREAD_LIMIT':'1','OPENBLAS_NUM_THREADS':'1'})


def _recognize(image: Image.Image, page: int, directory: Path, label: str, mode: int):
    path=directory/f'normalized-{page}-{label}.png';image.save(path)
    output=command(['tesseract',str(path),'stdout','-l','por+eng','--psm',str(mode),'tsv']).stdout.decode('utf-8',errors='replace')
    tokens=[];groups={}
    for row in csv.DictReader(io.StringIO(output),delimiter='\t',quoting=csv.QUOTE_NONE):
        value=(row.get('text') or '').strip()
        if row.get('level')!='5' or not value:continue
        try:
            token={'text':value[:200],'confidence':max(0,min(100,float(row['conf']))),
                'box':[int(row[k]) for k in ('left','top','width','height')]}
        except (KeyError,ValueError):continue
        tokens.append(token)
        groups.setdefault((row['block_num'],row['par_num'],row['line_num']),[]).append(token)
        if len(tokens)>=MAX_TOKENS:break
    lines=list(groups.values())
    text='\n'.join(' '.join(t['text'] for t in line) for line in lines)[:MAX_TEXT]
    confidence=round(sum(t['confidence'] for t in tokens)/len(tokens),1) if tokens else 0
    return {'text':text,'tokens':tokens,'lines':lines,'confidence':confidence}


def _name_below_label(candidates):
    """Rótulo de uma passagem e linha completa de outra, nas mesmas coordenadas.

    A CNH impressa tem bordas que confundem a segmentação automática, enquanto
    o modo esparso encontra NOME mas fragmenta seu valor. Não presume filiação.
    """
    anchors=[]
    for candidate in candidates:
        for line in candidate['lines']:
            label=normalized(' '.join(t['text'] for t in line)).strip(' |:.-_[]')
            # "NOME DA MÃE" e "NOME DO PAI" pertencem a outras pessoas.
            if not re.fullmatch(r'(?:\d[A-Z]?(?:\s+E\s+\d[A-Z]?)?[.\-]?\s+)?NOME(?: COMPLETO| CIVIL| E SOBRENOME)?',label):continue
            anchors.extend(t for t in line if normalized(t['text']).strip(' |:.-_[]')=='NOME' and t['confidence']>=70)
    choices=[]
    for anchor in anchors:
        ax,ay,aw,ah=anchor['box']
        for candidate in candidates:
            for line in candidate['lines']:
                x=min(t['box'][0] for t in line);y=min(t['box'][1] for t in line)
                if not ay+ah<=y<=ay+ah*5 or abs(x-ax)>max(aw,ah*3):continue
                value=' '.join(t['text'] for t in line).strip(' |:[]')
                conf=sum(t['confidence'] for t in line)/len(line)
                if conf<70 or len(value)>180 or len(value.split())<2:continue
                if not re.fullmatch(r"[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ '\-.]+",value):continue
                if re.search(r'\b(NOME|DOCUMENTO|IDENTIDADE|EMISSOR|FILIACAO|NASCIMENTO|REPUBLICA|VALIDADE|ASSINATURA)\b',normalized(value)):continue
                choices.append((round(conf,1),value))
    return max(choices,default=None)


def _proposals(candidates,purpose):
    """Mantém divergências explícitas; CPF e datas conflitantes não são escolhidos."""
    by_field={}
    for candidate in candidates:
        for row in suggestions(candidate['text'],purpose,candidate['confidence']):
            by_field.setdefault(row['field'],[]).append(row)
    if purpose not in ('company','address'):
        name=_name_below_label(candidates)
        if name:
            by_field['name']=[{'field':'name','value':name[1],'evidence':'Nome abaixo do rótulo do documento',
                'confidence':name[0],'validated_format':False,'requires_review':True}]
    result=[]
    for field,rows in by_field.items():
        values={normalized(r['value']) for r in rows}
        if len(values)==1:result.append(max(rows,key=lambda r:r['confidence'] or 0))
    return result


def read_image(path: Path, page: int, directory: Path, purpose: str='identity'):
    with Image.open(path) as original:
        if original.width*original.height>30_000_000:raise ValueError('image_too_large')
        original=ImageOps.exif_transpose(original).convert('RGB')
        if original.width<240 or original.height<150:raise ValueError('image_too_small')
        source_size=original.size
        # Preserva detalhes de PDFs digitalizados e amplia texto pequeno antes
        # da segmentação; nunca processa mais de 13 megapixels por passagem.
        factor=min(4,3600/max(original.size))
        gray=ImageOps.autocontrast(ImageOps.grayscale(original))
        if factor!=1:gray=gray.resize((round(gray.width*factor),round(gray.height*factor)),Image.Resampling.LANCZOS)
        warnings=[]
        if min(source_size)<700:warnings.append('Imagem pequena: use o PDF original ou uma foto mais próxima para melhorar a leitura.')
    candidates=[]
    # Não trata um documento com retrato, duas colunas e QR como um parágrafo.
    candidates.append(_recognize(gray,page,directory,'auto',3))
    fields={s['field'] for s in _proposals(candidates,purpose)}
    expected={'name','cpf','birth_date'} if purpose in ('identity','birth','generic') else {'name','cnpj'} if purpose=='company' else {'street','postal_code'}
    if not expected.issubset(fields):
        binary=gray.point(lambda value:0 if value<190 else 255)
        candidates.append(_recognize(binary,page,directory,'contrast',3))
        candidates.append(_recognize(gray,page,directory,'sparse',11))
    proposals=_proposals(candidates,purpose)
    # Fotografias sem EXIF e páginas giradas: uma passagem por orientação,
    # escolhida pelo conteúdo reconhecido, dentro do mesmo limite do worker.
    if not proposals and max(c['confidence'] for c in candidates)<60:
        rotations=[]
        for angle in (90,270,180):
            rotated=gray.rotate(angle,expand=True)
            candidate=_recognize(rotated,page,directory,f'rotation-{angle}',3)
            rows=_proposals([candidate],purpose)
            if rows:rotations.append((len(rows),candidate['confidence'],rotated,candidate,rows))
        if rotations:
            _,_,gray,candidate,proposals=max(rotations,key=lambda item:(item[0],item[1]))
            candidates=[candidate]
    best=max(candidates,key=lambda c:(len(suggestions(c['text'],purpose,c['confidence'])),c['confidence']))
    return {'number':page,'width':gray.width,'height':gray.height,'source':'tesseract',
        'text':best['text'],'tokens':best['tokens'],'warnings':warnings,'suggestions':proposals,
        'confidence':best['confidence']}


def _merge_proposals(rows):
    by_field={}
    for row in rows:by_field.setdefault(row['field'],[]).append(row)
    return [max(values,key=lambda r:r['confidence'] or 0) for values in by_field.values()
        if len({normalized(r['value']) for r in values})==1]


def extract(path: Path, mime: str, purpose: str, directory: Path):
    pages=[]
    if mime=='application/pdf':
        from pypdf import PdfReader
        reader=PdfReader(path,strict=True)
        if reader.is_encrypted or not 1<=len(reader.pages)<=MAX_PAGES:raise ValueError('pdf_page_limit')
        raw=path.read_bytes()
        if any(x in raw for x in (b'/JavaScript',b'/JS',b'/Launch',b'/EmbeddedFile',b'/OpenAction')):raise ValueError('active_pdf')
        for index,page in enumerate(reader.pages,1):
            text=(page.extract_text() or '')[:MAX_TEXT]
            digital=suggestions(text,purpose,None)
            readable=len(re.findall(r'[A-Za-zÀ-ÿ]',text))>=40
            # PDFs híbridos (incluindo CNH-e) contêm avisos legais digitais e
            # dados pessoais em imagens. A quantidade de letras não basta.
            images=[]
            if len(digital)<2:
                for item in page.images:
                    image=item.image
                    if image.width>=240 and image.height>=150:
                        if image.width*image.height>30_000_000:raise ValueError('image_too_large')
                        images.append(image)
                    if len(images)>=4:break
            if readable and not images:
                pages.append({'number':index,'source':'pdf_text','text':text,'tokens':[],
                    'warnings':[],'suggestions':digital,'confidence':None})
                continue
            scans=[]
            if images:
                for n,image in enumerate(images):
                    target=directory/f'embedded-{index}-{n}.png';image.save(target)
                    scanned=read_image(target,index*10+n,directory,purpose)
                    # Não confunde um QR, brasão ou bloco legal com ficha pessoal.
                    if scanned['suggestions'] or scanned['confidence']>=70:scans.append(scanned)
            if not scans:
                prefix=directory/f'page-{index}'
                command(['pdftoppm','-f',str(index),'-l',str(index),'-singlefile','-scale-to','3500','-png',str(path),str(prefix)])
                scans=[read_image(prefix.with_suffix('.png'),index,directory,purpose)]
            page_text='\n\n'.join(scan['text'] for scan in scans)
            page_suggestions=_merge_proposals([*digital,*(row for scan in scans for row in scan['suggestions'])])
            pages.append({'number':index,'source':'pdf_hybrid' if readable else 'tesseract',
                'text':page_text[:MAX_TEXT],'tokens':[t for s in scans for t in s['tokens']][:MAX_TOKENS],
                'warnings':list(dict.fromkeys(w for s in scans for w in s['warnings'])),
                'suggestions':page_suggestions,'confidence':None})
    else:pages.append(read_image(path,1,directory,purpose))
    text='\n\n'.join(p['text'] for p in pages)[:MAX_TEXT]
    tokens=[t for page in pages for t in page['tokens']]
    confidence=round(sum(t['confidence'] for t in tokens)/len(tokens),1) if tokens else None
    warnings=list(dict.fromkeys(w for p in pages for w in p['warnings']))
    fields=_merge_proposals([row for page in pages for row in page['suggestions']])
    if confidence is not None and confidence<70:warnings.append('Leitura com baixa confiança. Prefira o arquivo original ou uma foto nítida e sem reflexos.')
    if not fields:warnings.append('Não foi possível identificar campos com segurança. Envie o documento original ou preencha manualmente.')
    if not text.strip():warnings.append('Nenhum texto legível. Fotografe novamente ou preencha manualmente.')
    # Um resultado sem sugestões é uma tentativa concluída, não uma falha muda.
    return {'engine':'tesseract-5/poppler','schema_version':2,'purpose':purpose,'text':text,'pages':pages,
        'confidence':confidence,'suggestions':fields,'warnings':warnings,
        'quality':'fields_found' if fields else 'needs_better_source',
        'requires_review':True,'document_authenticity_verified':False}


if __name__=='__main__':
    import resource
    resource.setrlimit(resource.RLIMIT_AS,(768*1024*1024,768*1024*1024))
    resource.setrlimit(resource.RLIMIT_CPU,(90,90))
    resource.setrlimit(resource.RLIMIT_FSIZE,(32*1024*1024,32*1024*1024))
    resource.setrlimit(resource.RLIMIT_NOFILE,(64,64))
    try:
        result=extract(Path(sys.argv[1]),sys.argv[2],sys.argv[3],Path(sys.argv[4]))
        print(json.dumps(result,ensure_ascii=False))
    except Exception as error:
        print(json.dumps({'error_code':str(error) if isinstance(error,ValueError) else type(error).__name__}))
        raise SystemExit(1)
