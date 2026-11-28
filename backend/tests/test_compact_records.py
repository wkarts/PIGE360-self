"""Fichas emitidas pelas rotas da Secretaria, com cadastros fictícios."""
from io import BytesIO

import pytest
from pypdf import PdfReader
from sqlalchemy import select

from app import models as m
from app.db import SessionLocal
from app.documents import write_file
from test_school_report_kit import artwork, assert_document


@pytest.mark.parametrize('orientation', ['portrait', 'landscape'])
def test_compact_school_records(api, tmp_path, orientation):
    school = api.school['id']
    api.update_school(name='Colégio Horizonte · Dados fictícios')
    catalogs = api.catalogs()
    student = api.student('Mariana de Assis e Albuquerque da Costa')
    api.guardian(student, 'Beatriz Alves da Costa')
    api.guardian(student, 'Rafael Augusto de Albuquerque')
    enrollment = api.enroll(student, catalogs['group'])
    api.post('/document-types', {'name': 'Comprovante escolar de ensaio', 'required': True})
    employee = api.post('/person-dossiers', {'person': {'name': 'Gabriel Mendes de Oliveira Lima',
        'person_types':['employee'], 'birth_date':'1991-05-14', 'nationality':'Brasileira',
        'phone':'5575999990100', 'emergency_contact_name':'Clara de Ensaio', 'emergency_contact_phone':'5575999990200',
        'address':'Rua de Ensaio, 120, bloco administrativo, Centro, Cidade de Ensaio - BA',
        'email':'gabriel@example.com', 'education':'Ensino Médio completo'},
        'profiles': {'employee': {'data': {'job_title':'Assistente de secretaria', 'department':'Secretaria escolar',
            'work_schedule':'40 horas por semana', 'supervisor_name':'Coordenação administrativa'}}}}, 200)['person']
    with SessionLocal.begin() as db:
        author = db.scalar(select(m.User.id).where(m.User.email == 'admin@example.com'))
        photo = write_file(db, school, author, 'foto-ficticia.png', 'image/png', artwork())
        # Duas pessoas não compartilham arquivo em produção; o ensaio usa uma imagem gerada.
        pupil = db.get(m.Person, student['person']['id'])
        pupil.photo_file_id = photo.id
        pupil.social_name = 'Mari de Ensaio'
        pupil.mother_name, pupil.father_name = 'Beatriz Alves da Costa', 'Rafael Augusto de Albuquerque'
        pupil.email = 'familia@example.test'
        pupil.address = ('Praça do Saber, Escola Fictícia, bloco residencial de referência, portaria do lado norte, '
                         'conjunto de unidades de ensaio, Bairro da Amostra, Cidade de Ensaio - BA')
        pupil.emergency_contact_name, pupil.emergency_contact_phone = 'Luiza de Ensaio', '5575999990400'
        db.get(m.Student, student['id']).previous_school = 'Escola anterior de ensaio'
        record = db.get(m.Enrollment, enrollment['id'])
        record.notes = 'Confirmar os contatos no retorno da família.'
    for kind, target in [('student_record','aluno'), ('enrollment_form','matricula')]:
        payload = {'kind':kind, 'orientation':orientation}
        if kind == 'enrollment_form':
            payload['enrollment_id'] = enrollment['id']
        issued = api.post(f"/students/{student['id']}/issued-documents", payload)
        content = api.get(f"/files/{issued['file_id']}/download").content
        expected = ['Identificação do aluno', 'Filiação', 'Mari de Ensaio', 'Contato de emergência',
                    'familia@example.test', 'Bairro da Amostra', 'Luiza de Ensaio', 'Comprovante escolar de ensaio',
                    'Escola anterior de ensaio', 'Não contém assinatura digital']
        if kind == 'enrollment_form':
            expected += ['Dados da matrícula', 'Confirmar os contatos', 'Ficha administrativa']
        else:
            expected += ['Vínculos acadêmicos registrados', 'Movimentação escolar']
        assert_document(content, tmp_path / f'{target}-{orientation}.pdf', orientation == 'landscape', *expected)
        pages = PdfReader(BytesIO(content)).pages
        assert len(pages) <= 2 and len(pages[0].images) >= 1
        texts = [page.extract_text() for page in pages]
        for index in (1, 2):
            matched = [text for text in texts if f'Responsável {index}' in text]
            assert len(matched) == 1 and 'Atribuições' in matched[0] and 'Legal, Financeiro' in matched[0]
        assert any(value in texts[-1] for value in ['Escola anterior de ensaio', 'Comprovante escolar de ensaio'])
    content = api.get(f"/persons/{employee['id']}/records/employee.pdf?orientation={orientation}").content
    staff_text = assert_document(content, tmp_path / f'colaborador-{orientation}.pdf', orientation == 'landscape', 'Vínculo funcional', 'Assistente de secretaria', 'Coordenação administrativa',
                    '40 horas por semana', 'Clara de Ensaio', 'Ensino Médio completo', 'Não contém assinatura digital')
    assert 'Foto não cadastrada' in ' '.join(staff_text.split())
    assert len(PdfReader(BytesIO(content)).pages) == 1


def test_long_records_repeat_data_without_orphan_notice(api, tmp_path):
    cat = api.catalogs()
    student = api.student('Estudante com cadastro extenso')
    enrollment = api.enroll(student, cat['group'])
    for index in range(32):
        api.guardian(student, f'Responsável sintético número {index + 1:02}')
    content = api.get('/files/' + api.post(f"/students/{student['id']}/issued-documents",
        {'kind':'enrollment_form', 'orientation':'landscape','enrollment_id':enrollment['id']})['file_id'] + '/download').content
    assert_document(content, tmp_path / 'matricula-continua-paisagem.pdf', True, 'Responsável 32')
    pages = [page.extract_text() for page in PdfReader(BytesIO(content)).pages]
    assert len(pages) > 2
    assert all('Atribuições' in text or 'Dados da matrícula' in text for text in pages)
    assert sum(text.count('Não contém assinatura digital') for text in pages) == 1
    assert sum(text.count('Carimbo de identificação institucional') for text in pages) == 1
