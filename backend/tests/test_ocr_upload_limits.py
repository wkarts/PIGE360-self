"""HTTP limits with the distributed Compose defaults: documents 10, OCR 16 MiB."""
import io

import pytest
from fastapi.testclient import TestClient
from PIL import Image, PngImagePlugin

from app.config import settings
from app.main import BodyLimitMiddleware, app
from test_assisted_intake import clean_assistance  # noqa: F401: isolated OCR jobs
from test_online import online  # noqa: F401

MIB = 1024 * 1024


def png_of_size(size):
    """Valid PNG with an inert ancillary chunk, not a decompression bomb."""
    image = Image.new('RGB', (600, 300), 'white')
    base = io.BytesIO()
    image.save(base, format='PNG')
    metadata = PngImagePlugin.PngInfo()
    metadata.add(b'npAD', b'0' * (size - len(base.getvalue()) - 12))
    out = io.BytesIO()
    image.save(out, format='PNG', pnginfo=metadata)
    assert len(out.getvalue()) == size
    return out.getvalue()


@pytest.fixture
def compose_client(client, monkeypatch):
    monkeypatch.setattr(settings(), 'max_upload_mb', 10)
    monkeypatch.setattr(settings(), 'ocr_max_upload_mb', 16)
    # Run the real authenticated endpoints through the production middleware
    # with exactly the Compose 10/16 configuration, without rebuilding shared app.
    wrapped = BodyLimitMiddleware(app, maximum=11*MIB, legacy_maximum=65*MIB,
                                  ocr_maximum=17*MIB)
    return TestClient(wrapped, base_url='http://testserver')


@pytest.mark.parametrize('size', [12*MIB, 16*MIB])
@pytest.mark.parametrize('surface', ['staff', 'portal'])
def test_ocr_accepts_large_valid_multipart_without_raising_document_limit(online, compose_client, size, surface):
    o = online
    headers = o['api'].headers if surface == 'staff' else {'X-CSRF-Protection': '1'}
    path = o['api'].base+'/ocr/jobs' if surface == 'staff' else '/api/v1/portal/ocr/jobs'
    if surface == 'portal':
        compose_client.cookies.update(o['parent'].cookies)
    response = compose_client.post(path, headers=headers, data={'purpose': 'identity'},
                                   files={'file': ('synthetic.png', png_of_size(size), 'image/png')})
    assert response.status_code == 202, response.text
    assert response.json()['status'] == 'queued'
    assert settings().max_upload_mb == 10


def test_ocr_rejects_file_above_own_limit_even_within_multipart_envelope(api, compose_client):
    response = compose_client.post(api.base+'/ocr/jobs', headers=api.headers,
        files={'file': ('too-large.png', png_of_size(16*MIB+1), 'image/png')})
    assert response.status_code == 413
    assert response.json()['detail'] == 'Documento acima do limite do OCR.'


def test_ordinary_document_keeps_its_10_mib_file_limit(api, compose_client):
    student = api.student()
    kind = api.post('/document-types', {'name': 'Limite documental preservado'})
    response = compose_client.post(api.base+'/students/'+student['id']+'/documents', headers=api.headers,
        data={'document_type_id': kind['id']},
        files={'file': ('document.png', png_of_size(10*MIB+1), 'image/png')})
    assert response.status_code == 413, response.text


def test_large_ocr_upload_still_requires_authentication(api, compose_client):
    response = compose_client.post(api.base+'/ocr/jobs',
        files={'file': ('synthetic.png', png_of_size(12*MIB), 'image/png')})
    assert response.status_code == 401


@pytest.mark.parametrize('suffix', ['/files/upload', '/ocr/jobs/other', '/ocr/jobs-extra'])
def test_ocr_allowance_does_not_expand_other_routes(api, compose_client, suffix):
    response = compose_client.post(api.base+suffix, headers=api.headers, content=b'0'*(12*MIB))
    assert response.status_code == 413
    assert response.json()['detail'] == 'Requisição acima do limite permitido.'


def test_ocr_streaming_multipart_without_content_length_respects_file_limit(api, compose_client):
    boundary = 'pige-synthetic-boundary'
    prefix = (f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="synthetic.png"\r\n'
              'Content-Type: image/png\r\n\r\n').encode()
    body = prefix+png_of_size(16*MIB)+f'\r\n--{boundary}--\r\n'.encode()
    chunks = (body[offset:offset+MIB] for offset in range(0, len(body), MIB))
    response = compose_client.post(api.base+'/ocr/jobs', headers={**api.headers,
        'Content-Type': 'multipart/form-data; boundary='+boundary}, content=chunks)
    assert 'content-length' not in response.request.headers
    assert response.status_code == 202, response.text


@pytest.mark.parametrize('streaming', [False, True])
def test_ocr_envelope_remains_bounded(api, compose_client, streaming):
    body = (b'--synthetic\r\nContent-Disposition: form-data; name="file"; filename="large.png"\r\n'
            b'Content-Type: image/png\r\n\r\n'+b'0'*(17*MIB+1)+b'\r\n--synthetic--\r\n')
    content = (body[n:n+MIB] for n in range(0, len(body), MIB)) if streaming else body
    response = compose_client.post(api.base+'/ocr/jobs', headers={**api.headers,
        'Content-Type': 'multipart/form-data; boundary=synthetic'}, content=content)
    assert response.status_code == 413, response.text

