"""Prepara os campos do contrato antes da primeira assinatura."""
from io import BytesIO

from pypdf import PdfReader, PdfWriter
from pyhanko.pdf_utils.incremental_writer import IncrementalPdfFileWriter
from pyhanko.sign.fields import SigFieldSpec, append_signature_field
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen.canvas import Canvas


SCHOOL_FIELD = 'Assinatura_da_escola'


def prepare_contract(pdf: bytes, number: str, revision: int, footer: bool) -> bytes:
    writer = PdfWriter()
    writer.append(PdfReader(BytesIO(pdf)))
    sheet = BytesIO()
    canvas = Canvas(sheet, pagesize=A4)
    canvas.setFont('Helvetica-Bold', 14)
    canvas.drawString(48, 770, 'Assinaturas do contrato ' + number)
    canvas.setFont('Helvetica', 11)
    canvas.drawString(48, 710, 'Responsável pela matrícula')
    canvas.drawString(48, 550, 'Escola / mantenedora')
    canvas.save()
    writer.add_page(PdfReader(sheet).pages[0])
    if footer:
        total = len(writer.pages)
        for index, page in enumerate(writer.pages, start=1):
            page.transfer_rotation_to_content()
            bounds = page.cropbox
            left, bottom = float(bounds.left), float(bounds.bottom)
            width = float(bounds.width)
            page.mediabox.bottom = min(float(page.mediabox.bottom), bottom - 22)
            page.cropbox.bottom = bottom - 22
            strip = BytesIO()
            canvas = Canvas(strip, pagesize=(width, 22))
            canvas.setFont('Helvetica', 8)
            canvas.drawCentredString(width / 2, 7,
                f'Contrato {number} | Revisão {revision} | Página {index} de {total}')
            canvas.save()
            page.merge_translated_page(PdfReader(strip).pages[0], left, bottom - 22)
    unsigned = BytesIO()
    writer.write(unsigned)
    signer = IncrementalPdfFileWriter(unsigned)
    last = len(writer.pages) - 1
    for name, box in [('Responsavel', (48, 616, 540, 693)), (SCHOOL_FIELD, (48, 456, 540, 533))]:
        append_signature_field(signer, SigFieldSpec(name, on_page=last, box=box))
    ready = BytesIO()
    signer.write(ready)
    return ready.getvalue()
