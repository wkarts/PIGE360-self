#!/usr/bin/env python3
"""Avaliação reproduzível exclusivamente com documentos sintéticos locais."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'backend'))
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont
from reportlab.pdfgen import canvas
from app import ocr_engine


def build_cases(root):
    """Deterministic, non-personal inputs shared by evaluation and worker tests."""
    expected={'name':'PESSOA EXEMPLO','cpf':'52998224725','birth_date':'2000-05-15'}
    lines=['DOCUMENTO FICTICIO PARA AVALIACAO','NOME: PESSOA EXEMPLO','CPF: 529.982.247-25',
        'DATA DE NASCIMENTO: 15/05/2000','CEP: 40020-000']
    image=Image.new('RGB',(1400,800),'white');draw=ImageDraw.Draw(image)
    font=ImageFont.truetype('DejaVuSans.ttf',40)
    for index,line in enumerate(lines):draw.text((70,70+index*110),line,font=font,fill='black')
    cases=[]
    def add(name,path,mime,*,rejection=''):
        cases.append({'name':name,'path':path,'mime':mime,'expected':{} if rejection else expected,
                      'expected_rejection':rejection})
    for name,angle in [('scan',0),('rotation90',90),('rotation180',180),('rotation270',270)]:
        path=root/(name+'.png');image.rotate(angle,expand=True).save(path);add(name,path,'image/png')
    # Fixed blur, contrast and downsampling make errors measurable, rather than
    # claiming all real-world photographs have the same quality as a clean scan.
    path=root/'degraded-photo.jpg'
    degraded=ImageEnhance.Contrast(image.resize((700,400)).filter(ImageFilter.GaussianBlur(2.5))).enhance(.35)
    degraded.save(path,quality=35);add('degraded_photo',path,'image/jpeg')
    for name,pages in [('digital_pdf',1),('multipage_pdf',3),('over_page_limit',6)]:
        path=root/(name+'.pdf');pdf=canvas.Canvas(str(path),invariant=1)
        for _ in range(pages):
            pdf.setFont('Helvetica',15)
            for index,line in enumerate(lines):pdf.drawString(35,780-index*55,line)
            pdf.showPage()
        pdf.save();add(name,path,'application/pdf',rejection='pdf_page_limit' if pages>5 else '')
    path=root/'active.pdf';path.write_bytes((root/'digital_pdf.pdf').read_bytes()+b'\n/JavaScript\n')
    add('active_pdf',path,'application/pdf',rejection='active_pdf')
    path=root/'malformed.pdf';path.write_bytes(b'%PDF-1.7\nSYNTHETIC INVALID DOCUMENT\n%%EOF\n')
    add('malformed_pdf',path,'application/pdf',rejection='invalid_pdf')
    return cases


def main():
    with tempfile.TemporaryDirectory(prefix='pige-ocr-evaluation-') as folder:
        root=Path(folder);cases=build_cases(root)
        results=[]
        for case in cases:
            name,path,mime,expected=(case[key] for key in ('name','path','mime','expected'))
            source_sha=hashlib.sha256(path.read_bytes()).hexdigest()
            temp=root/(name+'-work');temp.mkdir();start=time.monotonic()
            code=''
            try:
                # Same isolated entrypoint/resource limits used by ocr_worker;
                # also works through stdin in the published runtime container.
                process=subprocess.run([sys.executable,'-m','app.ocr_engine',str(path),mime,'identity',str(temp)],
                    capture_output=True,timeout=120,env={**os.environ,
                        'PYTHONPATH':str(Path(ocr_engine.__file__).resolve().parents[1]),
                        'OMP_THREAD_LIMIT':'1','OPENBLAS_NUM_THREADS':'1'})
                result=json.loads(process.stdout)
                if process.returncode:code=result.get('error_code','processing_failed')
            except Exception as exc:
                code=type(exc).__name__
            if code:
                expected_error=case['expected_rejection']
                results.append({'case':name,'expected_fields':len(expected),'correct_fields':0,
                    'input_sha256':source_sha,
                    'seconds':round(time.monotonic()-start,3),'status':'rejected','error_code':code,
                    'rejected_as_expected':bool(expected_error and (
                        (expected_error=='invalid_pdf' and code in {'PdfReadError','PdfStreamError'}) or code==expected_error))})
                continue
            actual={row['field']:row['value'] for row in result['suggestions']}
            matches=sum(actual.get(key)==value for key,value in expected.items())
            results.append({'case':name,'expected_fields':len(expected),'correct_fields':matches,
                'input_sha256':source_sha,
                'status':'succeeded','expected_rejection':case['expected_rejection'],
                'pages':len(result['pages']),'quality':result['quality'],
                'seconds':round(time.monotonic()-start,3),'warnings':result['warnings'],
                'fields':actual,'all_fields_require_review':all(x['requires_review'] for x in result['suggestions'])})
        total=sum(row['expected_fields'] for row in results);correct=sum(row['correct_fields'] for row in results)
        safe=all(row.get('rejected_as_expected',False) if row['status']=='rejected' else
                 not row['expected_rejection'] and row['all_fields_require_review'] for row in results)
        print(json.dumps({'dataset':'synthetic-only-v2','engine_schema':3,
            'execution_mode':'isolated_engine_subprocess','python_version':sys.version.split()[0],'cases':results,
            'correct_fields':correct,'expected_fields':total,'recall_on_expected_fields':round(correct/total,4),
            'safety_checks_passed':safe,'real_document_accuracy_established':False},ensure_ascii=False,indent=2))
        if not safe:raise SystemExit(1)


if __name__=='__main__':main()
