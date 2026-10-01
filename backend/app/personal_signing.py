"""Assinatura do responsável: A1 efêmero e retorno oficial GOV.BR em sessão única."""
import asyncio
import hashlib
import secrets
from datetime import datetime, timedelta
from pathlib import Path
from urllib.parse import urlencode

import httpx
from cryptography.hazmat.primitives.serialization import pkcs12
from fastapi import APIRouter, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse, Response
from sqlalchemy import DateTime, ForeignKey, String, Text, select, update
from sqlalchemy.orm import Mapped, mapped_column

from . import models as m
from .config import settings
from .contract_signatures import (_read_verified, _signer_cpf, latest_signed_file,
                                  submit_external_signature)
from .db import Base, Record, now
from .govbr_login import GovBRLoginClient, GovBRLoginConfig
from .govbr_signing import GovBRConfig, GovBRSigningClient, GovBRSigningError, sign_pdf_with_govbr
from .integration_core import IntegrationFailure, cipher, seal, unseal
from .pdf_signing import InvalidPdfSignature, sign_pdf_pfx
from .portal import Parent, own_admission, parent_audit, rate_limit
from .security import DB, fail, lock_school, utc

router = APIRouter(prefix='/api/v1/portal', tags=['Assinatura do responsável'])


class GovBRSignatureSession(Record, m.Scoped, Base):
    __tablename__ = 'govbr_signature_sessions'
    account_id: Mapped[str] = mapped_column(ForeignKey('portal_accounts.id'), index=True)
    portal_session_id: Mapped[str] = mapped_column(ForeignKey('portal_sessions.id'))
    admission_id: Mapped[str] = mapped_column(ForeignKey('admissions.id'))
    issued_document_id: Mapped[str] = mapped_column(ForeignKey('issued_documents.id'))
    state_hash: Mapped[str] = mapped_column(String(64), unique=True)
    browser_token_hash: Mapped[str] = mapped_column(String(64))
    nonce: Mapped[str] = mapped_column(String(128))
    encrypted_pkce: Mapped[str] = mapped_column(Text)
    source_sha256: Mapped[str] = mapped_column(String(64))
    expected_cpf: Mapped[str] = mapped_column(String(11))
    phase: Mapped[str] = mapped_column(String(24), default='login')
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    message: Mapped[str] = mapped_column(String(240), default='')


def configuration():
    signing, login = GovBRConfig.from_environment(), GovBRLoginConfig.from_environment()
    try:
        signing.require_available()
        login.require_available()
    except ValueError as exc:
        raise GovBRSigningError('Integração GOV.BR não configurada para esta instalação.') from exc
    expected = settings().app_url.rstrip('/') + '/api/v1/portal/signing/govbr/callback'
    if signing.redirect_uri != expected:
        raise GovBRSigningError('O retorno da assinatura GOV.BR deve apontar para esta instalação.')
    if len({'.staging.' in url for url in (signing.oauth_base_url, signing.signature_api_base_url, login.base_url)}) != 1:
        raise GovBRSigningError('Os ambientes do Login Único e da assinatura devem coincidir.')
    try:
        cipher()
    except HTTPException as exc:
        raise GovBRSigningError('Proteção de credenciais GOV.BR não configurada.') from exc
    return signing, login


def signature_context(db, account, admission_id, issued_id):
    admission = own_admission(db, account, admission_id)
    if admission.status != 'approved' or not admission.enrollment_id or not admission.contract_template_id:
        fail(409, 'Aguarde a aprovação da inscrição e a emissão do contrato pela escola.')
    record = db.scalar(select(m.IssuedDocument).where(
        m.IssuedDocument.id == issued_id, m.IssuedDocument.school_id == account.school_id,
        m.IssuedDocument.enrollment_id == admission.enrollment_id,
        m.IssuedDocument.template_id == admission.contract_template_id,
        m.IssuedDocument.template_version == str(admission.contract_template_version)))
    if not record or (record.snapshot or {}).get('template_revision_sha256') != admission.contract_template_revision_sha256:
        fail(404, 'Contrato da revisão aprovada não encontrado.')
    if record.signature_status not in {'company_signed', 'rejected'}:
        fail(409, 'O contrato não está disponível para uma nova assinatura.')
    enrollment = db.get(m.Enrollment, admission.enrollment_id)
    guardian = db.get(m.Person, enrollment.financial_person_id) if enrollment.financial_person_id else None
    if not guardian or not guardian.cpf or guardian.cpf != account.cpf:
        fail(409, 'O CPF da conta precisa corresponder ao responsável da matrícula.')
    return record, _read_verified(latest_signed_file(db, record))


def callback_account(request, db, row):
    """Cookie limitado ao retorno OAuth; não relaxa o SameSite estrito do portal."""
    raw = request.cookies.get('pige_signing_return', '').split('.', 1)
    if (not row or len(raw) != 2 or raw[0] != row.id
            or not secrets.compare_digest(hashlib.sha256(raw[1].encode()).hexdigest(), row.browser_token_hash)
            or utc(row.expires_at) <= now()):
        fail(401, 'Retorne à matrícula e inicie uma nova assinatura neste navegador.')
    session = db.get(m.PortalSession, row.portal_session_id)
    account = db.get(m.PortalAccount, row.account_id)
    school = db.get(m.School, row.school_id)
    if (not session or session.account_id != row.account_id or session.revoked or utc(session.expires_at) <= now()
            or not account or not account.active or account.school_id != row.school_id
            or not school or not school.active):
        fail(401, 'A sessão do portal expirou. Entre novamente antes de assinar.')
    from .mfa import enforce_session
    enforce_session(db, 'portal', account, session)
    request.state.portal_account_id = account.id
    request.state.portal_session_id = session.id
    return account


@router.get('/signing/methods')
def methods(account: Parent):
    try:
        configuration()
        available = True
    except GovBRSigningError:
        available = False
    return {'a1': True, 'govbr_integrated': available, 'a3': 'external_pdf',
            'govbr_external_url': 'https://assinador.iti.br/'}


@router.post('/admissions/{admission_id}/issued/{issued_id}/sign-a1')
def sign_a1(admission_id: str, issued_id: str, request: Request, db: DB, account: Parent,
            file: UploadFile = File(...), password: str = Form(...), consent: bool = Form(False)):
    if not consent:
        fail(422, 'Autorize a assinatura deste contrato com seu certificado.')
    rate_limit(db, request, 'personal-a1', account.id, 6, 900)
    lock_school(db, account.school_id)
    record, source = signature_context(db, account, admission_id, issued_id)
    raw = file.file.read(1024 * 1024 + 1)
    if (Path(file.filename or '').suffix.lower() not in {'.pfx', '.p12'}
            or not raw or len(raw) > 1024 * 1024 or not password or len(password) > 256):
        fail(422, 'Selecione um certificado A1 PFX/P12 de até 1 MB e informe sua senha.')
    try:
        key, cert, _ = pkcs12.load_key_and_certificates(raw, password.encode())
        if key is None or cert is None or not cert.not_valid_before_utc <= now() < cert.not_valid_after_utc:
            fail(422, 'Certificado sem chave privada válida ou fora da validade.')
        if _signer_cpf(cert) != account.cpf:
            fail(422, 'O CPF do certificado deve corresponder ao responsável da matrícula.')
        signed = sign_pdf_pfx(source, raw, password, 'Responsavel_' + secrets.token_hex(8))
    except (ValueError, TypeError, InvalidPdfSignature):
        fail(422, 'Não foi possível assinar. Confira o certificado e a senha informados.')
    finally:
        file.file.close()
        raw = b''
        password = ''
    submit_external_signature(db, record, signed, account.id, request, expected_signer_cpf=account.cpf)
    parent_audit(db, request, account, 'contract.signed_a1', record,
                 {'sha256': hashlib.sha256(signed).hexdigest()})
    return {'document_id': record.id, 'signature_status': record.signature_status}


@router.post('/admissions/{admission_id}/issued/{issued_id}/sign-govbr')
async def start_govbr(admission_id: str, issued_id: str, request: Request, db: DB,
                      account: Parent, consent: bool = Form(False)):
    if not consent:
        fail(422, 'Confirme a leitura do contrato antes de iniciar a assinatura.')
    try:
        _, login = configuration()
    except GovBRSigningError as exc:
        fail(503, str(exc))
    rate_limit(db, request, 'govbr-start', account.id, 6, 900)
    lock_school(db, account.school_id)
    record, source = signature_context(db, account, admission_id, issued_id)
    state, nonce, verifier, browser_token = (secrets.token_urlsafe(32) for _ in range(4))
    row = GovBRSignatureSession(school_id=account.school_id, account_id=account.id,
        portal_session_id=request.state.portal_session_id, admission_id=admission_id,
        issued_document_id=record.id, state_hash=hashlib.sha256(state.encode()).hexdigest(),
        browser_token_hash=hashlib.sha256(browser_token.encode()).hexdigest(),
        nonce=nonce, encrypted_pkce=seal({'verifier': verifier}),
        source_sha256=hashlib.sha256(source).hexdigest(), expected_cpf=account.cpf,
        phase='login', expires_at=now() + timedelta(minutes=10))
    db.add(row)
    db.flush()
    async with httpx.AsyncClient() as http:
        url = GovBRLoginClient(login, http).authorization_url(state, nonce, verifier)
    parent_audit(db, request, account, 'contract.govbr_started', record, {'session_id': row.id})
    response = JSONResponse({'session_id': row.id, 'authorization_url': url, 'expires_at': row.expires_at.isoformat()})
    response.set_cookie('pige_signing_return', row.id + '.' + browser_token,
                        path='/api/v1/portal/signing', max_age=600, httponly=True,
                        secure=settings().cookie_secure, samesite='lax')
    return response


@router.get('/signing/sessions/{session_id}')
def session_status(session_id: str, db: DB, account: Parent):
    row = db.get(GovBRSignatureSession, session_id)
    if not row or row.account_id != account.id or row.school_id != account.school_id:
        fail(404, 'Solicitação de assinatura não encontrada.')
    phase = 'expired' if utc(row.expires_at) <= now() and row.phase not in {'completed', 'failed'} else row.phase
    return {'status': phase, 'document_id': row.issued_document_id, 'message': row.message}


def return_page(session_id):
    # Sem código/token no URL de destino ou no HTML; o resultado requer a sessão do portal.
    return RedirectResponse('/api/v1/portal/signing/result?' + urlencode({'session': session_id}),
                            status_code=303, headers={'Cache-Control': 'no-store'})


@router.get('/signing/govbr/callback')
async def govbr_callback(request: Request, db: DB,
                         state: str = Query('', max_length=128), code: str = Query('', max_length=4096),
                         error: str = Query('', max_length=128)):
    row = db.scalar(select(GovBRSignatureSession).where(
        GovBRSignatureSession.state_hash == hashlib.sha256(state.encode()).hexdigest()))
    if not row or row.phase not in {'login', 'signature'} or utc(row.expires_at) <= now():
        fail(409, 'Solicitação de assinatura expirada, já utilizada ou inválida.')
    account = callback_account(request, db, row)
    phase = row.phase
    changed = db.execute(update(GovBRSignatureSession).where(
        GovBRSignatureSession.id == row.id, GovBRSignatureSession.phase == phase,
        GovBRSignatureSession.state_hash == row.state_hash).values(phase='processing'))
    if changed.rowcount != 1:
        fail(409, 'Esta autorização já foi utilizada.')
    db.commit()  # Consome state antes de qualquer chamada externa; também em caso de falha.
    try:
        if error:
            raise GovBRSigningError('A assinatura foi cancelada no GOV.BR. Você pode tentar novamente.')
        signing, login = configuration()
        record, source = signature_context(db, account, row.admission_id, row.issued_document_id)
        if row.expected_cpf != account.cpf or not secrets.compare_digest(
                row.source_sha256, hashlib.sha256(source).hexdigest()):
            raise GovBRSigningError('O contrato ou responsável mudou. Inicie uma nova assinatura.')
        async with httpx.AsyncClient() as http:
            if phase == 'login':
                verifier = unseal(row.encrypted_pkce)['verifier']
                cpf = await GovBRLoginClient(login, http).identity(code, row.nonce, verifier)
                if cpf != row.expected_cpf:
                    raise GovBRSigningError('Entre no GOV.BR com o CPF do responsável pela matrícula.')
                state, nonce = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
                row.state_hash, row.nonce = hashlib.sha256(state.encode()).hexdigest(), nonce
                row.encrypted_pkce, row.phase = '', 'signature'
                url = GovBRSigningClient(signing, http).authorization_url(
                    state=state, nonce=nonce, login_unico_verified=True)
                db.flush()
                return RedirectResponse(url, status_code=303)
            client = GovBRSigningClient(signing, http)
            token = await client.exchange_code(code)
            signed = await sign_pdf_with_govbr(source, client, token, 'Responsavel_' + secrets.token_hex(8))
            token = ''
        lock_school(db, account.school_id)
        db.expire(record)
        record, current = signature_context(db, account, row.admission_id, row.issued_document_id)
        if not secrets.compare_digest(row.source_sha256, hashlib.sha256(current).hexdigest()):
            raise GovBRSigningError('O contrato mudou durante a assinatura. Inicie novamente.')
        # A verificação pyHanko usa seu próprio loop; não executá-la no loop HTTP.
        await asyncio.to_thread(submit_external_signature, db, record, signed, account.id, request,
                                expected_signer_cpf=row.expected_cpf, idempotency_key='govbr:' + row.id)
        row.phase, row.message, row.encrypted_pkce = 'completed', 'Contrato assinado e enviado à escola.', ''
        parent_audit(db, request, account, 'contract.signed_govbr', record,
                     {'sha256': hashlib.sha256(signed).hexdigest(), 'session_id': row.id})
        db.flush()
        return return_page(row.id)
    except (GovBRSigningError, IntegrationFailure, HTTPException, ValueError, KeyError):
        db.rollback()
        row = db.get(GovBRSignatureSession, row.id)
        row.phase, row.encrypted_pkce = 'failed', ''
        row.message = 'A assinatura não foi concluída. Confira seu CPF, a conta prata/ouro e tente novamente.'
        db.flush()
        return return_page(row.id)


@router.get('/signing/result')
def result_page(request: Request, db: DB, session: str = Query('', max_length=36)):
    row = db.get(GovBRSignatureSession, session)
    callback_account(request, db, row)
    title = 'Contrato assinado' if row.phase == 'completed' else 'Assinatura não concluída'
    return HTMLResponse('<!doctype html><html lang="pt-BR"><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1">'
        '<title>' + title + '</title><body style="font:16px system-ui;padding:32px">'
        '<h1>' + title + '</h1><p>Retorne à matrícula para acompanhar o documento.</p>'
        '<p><a href="/api/v1/portal/signing/govbr/logout">Sair da conta GOV.BR</a></p>'
        '<button id="return-to-school">Voltar para a matrícula</button>'
        '<script src="/api/v1/portal/signing/result.js"></script></body></html>')


@router.get('/signing/result.js')
def result_script():
    return Response("const done=()=>{if(window.opener){window.opener.postMessage({type:'pige-signature-return'},location.origin);window.close();}else{location.replace('/online.html');}};document.getElementById('return-to-school')?.addEventListener('click',done);if(window.opener)window.opener.postMessage({type:'pige-signature-return'},location.origin);",
                    media_type='application/javascript')


@router.get('/signing/govbr/logout')
def logout():
    try:
        _, login = configuration()
    except GovBRSigningError:
        fail(503, 'Integração GOV.BR indisponível.')
    return RedirectResponse(login.base_url.rstrip('/') + '/logout?' + urlencode({
        'post_logout_redirect_uri': settings().app_url.rstrip('/') + '/online.html'}), status_code=303)
