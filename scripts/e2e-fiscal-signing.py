#!/usr/bin/env python3
"""Certificados A1, pendências escolares e avisos em áreas distintas, via HTTP real."""
import json
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import time
from datetime import UTC, datetime, timedelta
from pathlib import Path

import httpx
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.serialization import pkcs12
from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'evidence/0.10.0/fiscal-signing'
OUT.mkdir(parents=True, exist_ok=True)
TEMP = Path(tempfile.mkdtemp(prefix='pige-fiscal-'))
EMAIL, LOGIN_PASSWORD = 'fiscal@example.com', 'Synthetic-Fiscal-Login-2026!'
A1_PASSWORD, CNPJ = 'Synthetic-A1-Secret-2026!', '12345678000190'
shutil.copytree(ROOT / 'frontend/dist', TEMP / 'frontend')
with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0))
    PORT = sock.getsockname()[1]
URL = f'http://127.0.0.1:{PORT}'

# AC e certificado de usuário final descartáveis, com CNPJ SAN e usos reais.
ca_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
ca_name = x509.Name([x509.NameAttribute(x509.NameOID.COMMON_NAME, 'AC Sintética E2E')])
ca = (x509.CertificateBuilder().subject_name(ca_name).issuer_name(ca_name)
      .public_key(ca_key.public_key()).serial_number(x509.random_serial_number())
      .not_valid_before(datetime.now(UTC) - timedelta(days=1))
      .not_valid_after(datetime.now(UTC) + timedelta(days=365))
      .add_extension(x509.BasicConstraints(ca=True, path_length=0), critical=True)
      .sign(ca_key, hashes.SHA256()))
key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
cert = (x509.CertificateBuilder().subject_name(x509.Name([
        x509.NameAttribute(x509.NameOID.COMMON_NAME, 'Mantenedora Horizonte - Certificado Sintético')]))
        .issuer_name(ca_name).public_key(key.public_key()).serial_number(x509.random_serial_number())
        .not_valid_before(datetime.now(UTC) - timedelta(days=1))
        .not_valid_after(datetime.now(UTC) + timedelta(days=20))
        .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
        .add_extension(x509.KeyUsage(digital_signature=True, content_commitment=True,
            key_encipherment=False, data_encipherment=False, key_agreement=False,
            key_cert_sign=False, crl_sign=False, encipher_only=False, decipher_only=False), critical=True)
        .add_extension(x509.SubjectAlternativeName([x509.OtherName(
            x509.ObjectIdentifier('2.16.76.1.3.3'), bytes([0x16, 14]) + CNPJ.encode())]), critical=False)
        .sign(ca_key, hashes.SHA256()))
(TEMP / 'roots').mkdir()
(TEMP / 'roots/ca.pem').write_bytes(ca.public_bytes(serialization.Encoding.PEM))
pfx = pkcs12.serialize_key_and_certificates(b'E2E', key, cert, [ca],
    serialization.BestAvailableEncryption(A1_PASSWORD.encode()))
(TEMP / 'synthetic.p12').write_bytes(pfx)
env = {**os.environ, 'PYTHONPATH': str(ROOT / 'backend'), 'DATABASE_URL': 'sqlite:///' + str(TEMP / 'test.db'),
       'ALLOW_SQLITE': 'true', 'APP_ENV': 'test', 'APP_URL': URL, 'ALLOWED_HOSTS': '127.0.0.1,localhost',
       'APP_SECRET_KEY': 'synthetic-fiscal-app-secret-01234567890123456789',
       'SETUP_TOKEN': 'synthetic-fiscal-setup-01234567890123456789',
       'INTEGRATION_ENCRYPTION_KEY': 'MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA=',
       'SIGNATURE_TRUST_ROOTS_DIR': str(TEMP / 'roots'), 'STORAGE_PATH': str(TEMP / 'files'),
       'FRONTEND_PATH': str(TEMP / 'frontend'), 'COOKIE_SECURE': 'false',
       'SMTP_HOST': '', 'SMTP_FROM': '', 'CONNECT_API_BASE_URL': '', 'CONNECT_API_KEY': ''}
subprocess.run([sys.executable, '-m', 'alembic', 'upgrade', 'head'], cwd=ROOT / 'backend', env=env, check=True)
log = (OUT / 'server.log').open('w')
proc = subprocess.Popen([sys.executable, '-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', str(PORT)],
                         cwd=ROOT / 'backend', env=env, stdout=log, stderr=log)
checks, errors = [], []


def record(message):
    checks.append(message)
    print('PASS:', message, flush=True)


def layout(page):
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), 'Transbordamento horizontal'
    assert page.locator('.contract-signatures').evaluate('el=>el.scrollWidth <= el.clientWidth + 1')
    mobile = page.viewport_size['width'] <= 600
    for box in page.locator('.contract-signatures nav button:visible').all():
        size = box.bounding_box()
        minimum = 43.5 if mobile else 23.5
        assert size and size['height'] >= minimum and size['width'] >= minimum
    for field in page.locator('.contract-signatures input:visible,.contract-signatures select:visible').all():
        if field.get_attribute('type') == 'checkbox':
            continue
        assert field.evaluate('el=>parseFloat(getComputedStyle(el).fontSize)') >= (16 if mobile else 14)


try:
    client = httpx.Client(base_url=URL, timeout=30, trust_env=False)
    for _ in range(100):
        try:
            if client.get('/health/ready').status_code == 200:
                break
        except httpx.HTTPError:
            pass
        time.sleep(.1)
    else:
        raise RuntimeError('Servidor não iniciou')
    setup = client.post('/api/v1/setup', headers={'X-Setup-Token': env['SETUP_TOKEN']}, json={
        'admin_name': 'Direção Exemplo', 'admin_email': EMAIL, 'admin_password': LOGIN_PASSWORD,
        'company_name': 'Mantenedora Horizonte', 'company_document': CNPJ,
        'school_name': 'Colégio Horizonte', 'academic_year': 2026})
    assert setup.status_code == 201, setup.text
    base = '/api/v1/schools/' + setup.json()['school_id']
    token = client.post('/api/v1/auth/login', json={'email': EMAIL, 'password': LOGIN_PASSWORD}).json()['access_token']
    headers = {'Authorization': 'Bearer ' + token}
    student_response = client.post(base + '/students', headers=headers, json={
        'person': {'name': 'Aluno da assinatura escolar', 'birth_date': '2018-05-15'},
    })
    assert student_response.status_code == 201, student_response.text
    issued_response = client.post(base + '/students/' + student_response.json()['id'] + '/issued-documents',
                                  headers=headers, json={'kind': 'student_record'})
    assert issued_response.status_code == 201, issued_response.text
    issued_id = issued_response.json()['id']
    with sync_playwright() as pw:
        binary = os.getenv('CHROMIUM_PATH') or (None if Path(pw.chromium.executable_path).exists() else shutil.which('chromium'))
        browser = pw.chromium.launch(headless=True, **({'executable_path': binary} if binary else {}), args=['--no-sandbox'])
        context = browser.new_context(viewport={'width': 390, 'height': 844}, locale='pt-BR', is_mobile=True, has_touch=True)
        page = context.new_page()
        page.set_default_timeout(15000)
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(URL)
        page.get_by_label('E-mail', exact=True).fill(EMAIL)
        page.get_by_label('Senha', exact=True).fill(LOGIN_PASSWORD)
        page.get_by_role('button', name='Entrar na aplicação').click()
        expect(page.locator('.app-root')).to_be_visible()
        page.get_by_role('button', name='Abrir menu', exact=True).click()
        page.get_by_role('button', name='Configurações', exact=True).click()
        page.locator('aside nav a[href="#/certificate"]').click()
        expect(page.locator('.contract-signatures')).to_be_visible()
        expect(page.locator('.contract-signatures .loading-strip')).to_have_count(0)
        workspace = page.locator('.contract-signatures')
        page.locator('#a1-certificate-file').set_input_files(str(TEMP / 'synthetic.p12'))
        secret = page.get_by_label('Senha do arquivo A1', exact=True)
        secret.fill(A1_PASSWORD)
        workspace.get_by_role('button', name='Salvar certificado', exact=True).click()
        expect(workspace.get_by_text('Certificado A1 da instituição configurado.', exact=True)).to_be_visible()
        expect(secret).to_have_value('')
        expect(page.locator('#a1-certificate-file')).to_have_value('')
        browser_storage = page.evaluate('JSON.stringify([Object.entries(localStorage),Object.entries(sessionStorage)])')
        assert A1_PASSWORD not in browser_storage
        assert client.get(base + '/signing-certificate/a1', headers=headers).json()['configured']
        record('Upload A1 real valida cadeia sintética e apaga senha/arquivo do formulário')
        workspace.get_by_label('Receber no meu e-mail', exact=True).check()
        expect(workspace.get_by_label('Receber no meu WhatsApp', exact=True)).to_be_disabled()
        workspace.get_by_role('button', name='Salvar preferências', exact=True).click()
        expect(workspace.get_by_text('Preferências de aviso atualizadas.', exact=True)).to_be_visible()
        assert client.get(base + '/signing-certificate/alert-preferences', headers=headers).json()['email_enabled']
        assert client.get(base + '/signing-certificate/alerts', headers=headers).json()['items'][0]['days_remaining'] == 20
        record('Preferência própria de e-mail persiste; WhatsApp sem telefone fica indisponível; alerta de validade aparece na API')
        def navigate_area(route, group):
            expect(page.locator('.app-root')).to_have_attribute('aria-busy', 'false')
            opener = page.get_by_role('button', name='Abrir menu', exact=True)
            if opener.is_visible() and opener.get_attribute('aria-expanded') == 'false':
                opener.click()
            toggle = page.locator('aside').get_by_role('button', name=group, exact=True)
            if toggle.get_attribute('aria-expanded') == 'false':
                toggle.click()
            page.locator('aside nav a[href="#/' + route + '"]').click()
            expect(page.locator('.contract-signatures')).to_be_visible()
            expect(page.locator('.contract-signatures .loading-strip')).to_have_count(0)

        expect(workspace.get_by_role('heading', name='Assinaturas pendentes', exact=True)).to_have_count(0)
        expect(workspace.get_by_role('heading', name='Conferência de assinaturas', exact=True)).to_have_count(0)
        expect(page.get_by_role('button', name='Documentos fiscais', exact=True)).to_have_count(0)
        expect(page.locator('aside a[href="#/signatures"]')).to_have_count(0)
        navigate_area('pending-signatures', 'Documentos')
        expect(workspace.get_by_role('heading', name='Assinaturas pendentes', exact=True)).to_be_visible()
        expect(workspace.get_by_text('Aluno da assinatura escolar', exact=True)).to_be_visible()
        expect(workspace.locator('#a1-certificate-file')).to_have_count(0)
        workspace.get_by_role('button', name='Assinar com A1', exact=True).click()
        expect(workspace.get_by_text('Documento assinado pela escola. O PDF original foi preservado.', exact=True)).to_be_visible()
        expect(workspace.get_by_text('Nenhum documento aguardando assinatura.', exact=True)).to_be_visible()
        with page.expect_download() as downloaded:
            workspace.get_by_role('button', name='Baixar PDF atual', exact=True).click()
        saved = TEMP / 'school-signed.pdf'
        downloaded.value.save_as(saved)
        assert saved.read_bytes().startswith(b'%PDF') and b'/ByteRange' in saved.read_bytes()
        signature = client.get(base + '/issued-documents/' + issued_id + '/signatures', headers=headers).json()
        assert signature['status'] == 'company_signed' and signature['cryptographic_valid'] is True
        record('Documento escolar sai da fila de assinaturas após A1; PDF original preservado e assinado disponível para download')
        navigate_area('signature-review', 'Documentos')
        expect(workspace.get_by_role('heading', name='Conferência de assinaturas', exact=True)).to_be_visible()
        expect(workspace.get_by_text('Nenhuma assinatura externa pendente de revisão nesta escola.', exact=True)).to_be_visible()
        expect(workspace.get_by_role('heading', name='Assinaturas pendentes', exact=True)).to_have_count(0)
        expect(workspace.locator('#a1-certificate-file')).to_have_count(0)
        record('Configurações, assinaturas pendentes e conferência são telas distintas, sem interface fiscal')
        # Atualização do shell também busca o aviso de validade sem disparar o worker.
        page.reload()
        expect(page.locator('.contract-signatures')).to_be_visible()
        expect(page.locator('.contract-signatures .loading-strip')).to_have_count(0)
        expect(page.locator('.notice-menu')).to_be_visible()
        for width, height in [(390, 844), (320, 640), (1440, 960)]:
            page.set_viewport_size({'width': width, 'height': height})
            for route, group, slug in [('pending-signatures', 'Documentos', 'pendencias'), ('signature-review', 'Documentos', 'conferencia'), ('certificate', 'Configurações', 'certificado')]:
                navigate_area(route, group)
                page.locator('#main-content').evaluate('el=>el.scrollTop=0')
                layout(page)
                page.screenshot(path=str(OUT / f'{slug}-{width}.png'), full_page=True)
                if width <= 600 and slug == 'certificado':
                    workspace.get_by_role('button', name='Salvar preferências', exact=True).scroll_into_view_if_needed()
                    page.screenshot(path=str(OUT / f'{slug}-form-{width}.png'), full_page=True)
            record(f'Três áreas independentes em {width}px sem transbordamento, com campos legíveis' + (' e alvos de toque de 44px' if width <= 600 else ''))
        page.locator('.notice-menu summary').click()
        expect(page.locator('.notice-popover').get_by_text('Renovação do certificado', exact=True)).to_be_visible()
        page.screenshot(path=str(OUT / 'aviso-topo-1440.png'), full_page=True)
        assert not errors, errors
        browser.close()
    (OUT / 'results.json').write_text(json.dumps({'status': 'passed', 'checks': checks, 'errors': errors,
        'frontend': json.loads((TEMP / 'frontend/build-info.json').read_text()), 'remote_providers': False,
        'limitations': ['Chromium com emulação de toque; não executado Safari/iOS', 'Certificado e PDF sintéticos; nenhum provedor externo foi contatado']}, ensure_ascii=False, indent=2))
except Exception:
    try:
        page.screenshot(path=str(OUT / 'failure.png'), full_page=True)
    except Exception:
        pass
    (OUT / 'results.json').write_text(json.dumps({'status': 'failed', 'checks': checks, 'errors': errors}, ensure_ascii=False, indent=2))
    raise
finally:
    proc.terminate()
    proc.wait(timeout=10)
    log.close()
    shutil.rmtree(TEMP, ignore_errors=True)
