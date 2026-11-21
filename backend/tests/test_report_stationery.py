"""Timbre, orientação e conteúdo acadêmico no arquivo entregue ao usuário."""
import io
from pathlib import Path

from pypdf import PdfReader
from test_institution import save
from test_learning_portal import activate, portal_call, portal_session, published_learning


def test_stationery_on_student_and_family_exports(api, client, admin):
    logo = (Path(__file__).resolve().parents[2] / 'frontend/public/branding/pige360/symbol.png').read_bytes()
    assert save(client, admin, files={'logo': ('marca.png', logo, 'image/png')}).is_success
    api.update_school(address='Alameda de Teste, 42', email='secretaria@example.test')
    student, _, enrollment, _, _ = published_learning(api)
    issued = api.post('/students/'+student['id']+'/issued-documents', {'kind':'student_record'})
    fiche = api.get('/files/'+issued['file_id']+'/download')
    cookies, _ = portal_session(api)
    activate(client, cookies, student)
    bulletin = portal_call(client, cookies, 'GET', '/learning/'+student['id']+'/report.pdf')
    for content in (fiche.content, bulletin.content):
        for page in PdfReader(io.BytesIO(content)).pages:
            assert page.mediabox.height > page.mediabox.width
            assert page.images and b' Do' in page.get_contents().get_data()
            assert 'secretaria@example.test' in page.extract_text()
    grades = '\n'.join(page.extract_text() for page in PdfReader(io.BytesIO(bulletin.content)).pages)
    for label in (enrollment['number'], '3º Bimestre', 'Matemática', '8,5', '66,67%'):
        assert label in grades
    assert '99.9999' not in grades and 'NOTA_INTERNA' not in grades
