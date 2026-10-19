#!/usr/bin/env python3
"""Avaliação reproduzível exclusivamente com documentos sintéticos locais."""
import io
import json
from pathlib import Path
import sys
import tempfile
import time

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'backend'))
from PIL import Image, ImageDraw, ImageFont
from reportlab.pdfgen import canvas
from app.ocr_engine import extract


def main():
    expected={'name':'PESSOA EXEMPLO','cpf':'52998224725','birth_date':'2000-05-15'}
    lines=['DOCUMENTO FICTICIO PARA AVALIACAO','NOME: PESSOA EXEMPLO','CPF: 529.982.247-25',
        'DATA DE NASCIMENTO: 15/05/2000','CEP: 40020-000']
    with tempfile.TemporaryDirectory(prefix='pige-ocr-evaluation-') as folder:
        root=Path(folder);image=Image.new('RGB',(1400,800),'white');draw=ImageDraw.Draw(image)
        font=ImageFont.truetype('DejaVuSans.ttf',40)
        for index,line in enumerate(lines):draw.text((70,70+index*110),line,font=font,fill='black')
        cases=[]
        for name,angle in [('scan',0),('rotation90',90),('rotation180',180),('rotation270',270)]:
            path=root/(name+'.png');image.rotate(angle,expand=True).save(path);cases.append((name,path,'image/png'))
        path=root/'digital.pdf';pdf=canvas.Canvas(str(path));pdf.setFont('Helvetica',15)
        for index,line in enumerate(lines):pdf.drawString(35,780-index*55,line)
        pdf.save();cases.append(('digital_pdf',path,'application/pdf'))
        results=[]
        for name,path,mime in cases:
            temp=root/(name+'-work');temp.mkdir();start=time.monotonic()
            result=extract(path,mime,'identity',temp)
            actual={row['field']:row['value'] for row in result['suggestions']}
            matches=sum(actual.get(key)==value for key,value in expected.items())
            results.append({'case':name,'expected_fields':len(expected),'correct_fields':matches,
                'seconds':round(time.monotonic()-start,3),'warnings':result['warnings'],
                'fields':actual,'all_fields_require_review':all(x['requires_review'] for x in result['suggestions'])})
        total=sum(row['expected_fields'] for row in results);correct=sum(row['correct_fields'] for row in results)
        print(json.dumps({'dataset':'synthetic-only-v1','engine_schema':3,'cases':results,
            'correct_fields':correct,'expected_fields':total,'recall_on_expected_fields':round(correct/total,4),
            'real_document_accuracy_established':False},ensure_ascii=False,indent=2))


if __name__=='__main__':main()
