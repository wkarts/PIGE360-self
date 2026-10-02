#!/usr/bin/env python3
"""Mobile HTTP real: login, guia, cartões de cadastro e formulário com janela baixa.

Usa somente identidade, fonte e pessoas sintéticas em SQLite descartável. Nenhum
serviço externo, ponte de UI ou relaxamento da CSP é necessário.
"""
import io
import json
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import httpx
import reportlab
from PIL import Image, ImageDraw
from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "evidence/0.10.0/mobile"
OUT.mkdir(parents=True, exist_ok=True)
(OUT / "failure.png").unlink(missing_ok=True)
TEMP = Path(tempfile.mkdtemp(prefix="pige-mobile-"))
with socket.socket() as sock:
    sock.bind(("127.0.0.1", 0))
    PORT = sock.getsockname()[1]
URL = f"http://127.0.0.1:{PORT}"
EMAIL = "mobile@example.com"
PASSWORD = "Synthetic-Mobile-Password-2026!"
env = {
    **os.environ,
    "PYTHONPATH": str(ROOT / "backend"),
    "DATABASE_URL": "sqlite:///" + str(TEMP / "e2e.db"),
    "ALLOW_SQLITE": "true",
    "APP_ENV": "test",
    "APP_URL": URL,
    "ALLOWED_HOSTS": "127.0.0.1,localhost",
    "APP_SECRET_KEY": "test-only-mobile-secret-01234567890123456789",
    "SETUP_TOKEN": "test-only-mobile-setup-01234567890123456789",
    "STORAGE_PATH": str(TEMP / "files"),
    "FRONTEND_PATH": str(ROOT / "frontend/dist"),
    "COOKIE_SECURE": "false",
}
subprocess.run(
    [sys.executable, "-m", "alembic", "upgrade", "head"],
    cwd=ROOT / "backend", env=env, check=True,
)
log = (OUT / "server.log").open("w")
proc = subprocess.Popen(
    [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", str(PORT)],
    cwd=ROOT / "backend", env=env, stdout=log, stderr=log,
)
checks = []
errors = []
metrics = {}


def record(message):
    checks.append(message)
    print("PASS:", message, flush=True)


def no_page_overflow(page):
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), "Página transborda horizontalmente"


def touch_target(locator):
    box = locator.bounding_box()
    assert box and box["width"] >= 43.5 and box["height"] >= 43.5, box


def in_view(locator, viewport):
    box = locator.bounding_box()
    assert box and box["x"] >= -1 and box["y"] >= -1, box
    assert box["x"] + box["width"] <= viewport["width"] + 1, box
    assert box["y"] + box["height"] <= viewport["height"] + 1, box


try:
    client = httpx.Client(base_url=URL, timeout=30, trust_env=False)
    for _ in range(100):
        try:
            if client.get("/health/ready").status_code == 200:
                break
        except httpx.HTTPError:
            pass
        time.sleep(.1)
    else:
        raise RuntimeError("Servidor de teste não iniciou")
    response = client.post("/api/v1/setup", headers={"X-Setup-Token": env["SETUP_TOKEN"]}, json={
        "admin_name": "Secretaria Exemplo", "admin_email": EMAIL, "admin_password": PASSWORD,
        "company_name": "Mantenedora Exemplo", "school_name": "Colégio Horizonte · Educação e Formação",
        "academic_year": 2026,
    })
    assert response.status_code == 201, response.text
    school_id = response.json()["school_id"]
    auth = client.post("/api/v1/auth/login", json={"email": EMAIL, "password": PASSWORD}).json()
    headers = {"Authorization": "Bearer " + auth["access_token"]}
    base = f"/api/v1/schools/{school_id}"

    # A proporção vertical e a fonte enviada exercitam os mesmos contratos reais
    # de personalização que causaram a regressão; nenhum ativo da escola é usado.
    logo = Image.new("RGB", (220, 320), "white")
    drawing = ImageDraw.Draw(logo)
    drawing.rounded_rectangle((30, 15, 190, 235), radius=24, outline="#84754f", width=7)
    drawing.line([(55, 130), (110, 75), (165, 130), (165, 205), (55, 205), (55, 130)], fill="#172a45", width=7)
    drawing.rectangle((95, 150, 125, 205), outline="#172a45", width=6)
    drawing.text((60, 262), "HORIZONTE", fill="#172a45")
    stream = io.BytesIO()
    logo.save(stream, format="PNG")
    identity = client.get("/api/v1/institution/identity").json()
    payload = {key: identity[key] for key in ("version", "display_name", "short_name", "primary_color", "secondary_color", "font_family")}
    payload.update(primary_color="#84754f", secondary_color="#172a45", font_family="custom", font_license_confirmed=True, show_preenrollment_button=False)
    response = client.put("/api/v1/institution/identity", headers=headers, data={"payload": json.dumps(payload)}, files={
        "logo": ("synthetic-school.png", stream.getvalue(), "image/png"),
        "font": ("synthetic-school.ttf", (Path(reportlab.__file__).parent / "fonts/Vera.ttf").read_bytes(), "font/ttf"),
    })
    assert response.status_code == 200, response.text
    response = client.post(base + "/students", headers=headers, json={"person": {
        "name": "Aluno Exemplo com Nome Completo Extenso para Conferência do Cadastro",
        "birth_date": "2015-05-15", "phone": "5575999990000",
    }})
    assert response.status_code == 201, response.text

    with sync_playwright() as pw:
        binary = os.getenv("CHROMIUM_PATH") or (None if Path(pw.chromium.executable_path).exists() else shutil.which("chromium"))
        browser = pw.chromium.launch(headless=True, **({"executable_path": binary} if binary else {}), args=["--no-sandbox"])
        context = browser.new_context(viewport={"width": 390, "height": 844}, locale="pt-BR", is_mobile=True, has_touch=True)
        page = context.new_page()
        page.set_default_timeout(12000)
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(URL)
        expect(page.get_by_role("heading", name="Acesse sua instituição")).to_be_visible()
        page.evaluate("document.fonts.ready")
        assert page.locator(".official-brand img").evaluate("el => el.complete && el.naturalHeight > el.naturalWidth")
        assert page.locator(".auth-form").evaluate("el => getComputedStyle(el).fontFamily.includes('Institution')"), "Fonte personalizada não aplicada"
        assert page.evaluate("[...document.fonts].some(font => font.family.includes('Institution') && font.status === 'loaded')"), "Arquivo da fonte personalizada não carregou"
        assert not page.get_by_label("E-mail", exact=True).evaluate("el => el === document.activeElement"), "Login abre teclado sem ação do usuário"
        password = page.get_by_label("Senha", exact=True)
        password.fill("Senha temporária para conferência")
        page.get_by_role("button", name="Mostrar senha", exact=True).click()
        expect(password).to_have_attribute("type", "text")
        expect(page.get_by_role("button", name="Ocultar senha", exact=True)).to_have_attribute("aria-pressed", "true")
        page.get_by_role("button", name="Ocultar senha", exact=True).click()
        expect(password).to_have_attribute("type", "password")
        expect(password).to_have_value("Senha temporária para conferência")
        password.fill("")
        record("Senha pode ser conferida e ocultada sem perder o valor; login não aciona teclado automaticamente")
        for width, height in [(390, 844), (360, 800), (320, 568)]:
            viewport = {"width": width, "height": height}
            page.set_viewport_size(viewport)
            page.evaluate("scrollTo(0, 0)")
            no_page_overflow(page)
            intro = page.locator(".auth-intro").bounding_box()
            crest = page.locator(".official-brand img").bounding_box()
            cta = page.get_by_role("button", name="Entrar na aplicação")
            in_view(cta, viewport)
            assert intro and crest, {"intro": intro, "crest": crest}
            assert crest["height"] >= (160 if width >= 360 else 96), crest
            assert abs(crest["x"] + crest["width"] / 2 - width / 2) <= 2, crest
            assert crest["y"] >= 0 and crest["y"] + crest["height"] <= intro["y"] + intro["height"], crest
            assert page.locator(".auth-form").bounding_box()["y"] >= crest["y"] + crest["height"], crest
            for caption in ("E-mail", "Senha"):
                field = page.get_by_label(caption, exact=True)
                touch_target(field)
                assert field.evaluate("el => parseFloat(getComputedStyle(el).fontSize) >= 16"), caption
            touch_target(cta)
            metrics[f"login_{width}"] = {"brand_height": intro["height"], "crest": crest, "button": cta.bounding_box()}
            page.screenshot(path=str(OUT / f"01-login-{width}.png"), full_page=True)
        record("Brasão centralizado tem ao menos 160px em 390×844 e 360×800 e 96px em 320×568; Entrar permanece visível, com campos de 16px e alvos de toque")

        for width, height in [(1440, 960), (1024, 768)]:
            viewport = {"width": width, "height": height}
            page.set_viewport_size(viewport)
            page.evaluate("scrollTo(0, 0)")
            no_page_overflow(page)
            intro = page.locator(".auth-intro").bounding_box()
            crest = page.locator(".official-brand img").bounding_box()
            copy = page.locator(".auth-copy").bounding_box()
            panel = page.locator(".auth-panel").bounding_box()
            assert intro and crest and copy and panel
            assert crest["height"] >= 220, crest
            assert abs(crest["x"] + crest["width"] / 2 - intro["x"] - intro["width"] / 2) <= 2, {"intro": intro, "crest": crest}
            assert crest["y"] <= height * .2, crest
            assert crest["y"] + crest["height"] < copy["y"], {"crest": crest, "copy": copy}
            assert panel["x"] >= intro["x"] + intro["width"] - 1, {"intro": intro, "panel": panel}
            in_view(page.get_by_role("button", name="Entrar na aplicação"), viewport)
            metrics[f"login_{width}"] = {"intro": intro, "crest": crest, "copy": copy, "panel": panel}
            page.screenshot(path=str(OUT / f"01-login-{width}.png"), full_page=True)
        record("Login desktop mantém brasão ampliado e centralizado no alto do painel de apresentação, acima do texto, com acesso visível ao lado")

        # Janela baixa não pode prender o formulário atrás de altura fixa.
        page.set_viewport_size({"width": 640, "height": 360})
        page.get_by_label("Senha", exact=True).fill(PASSWORD)
        cta.scroll_into_view_if_needed()
        in_view(cta, {"width": 640, "height": 360})
        no_page_overflow(page)
        page.screenshot(path=str(OUT / "01-login-640x360.png"), full_page=True)
        record("Login em paisagem permite rolar até senha e botão sem recortar controles")

        # O atalho opcional não pode recriar o bloco vazio nem encobrir o acesso.
        current = client.get("/api/v1/institution/identity").json()
        payload.update(version=current["version"], show_preenrollment_button=True)
        response = client.put("/api/v1/institution/identity", headers=headers, data={"payload": json.dumps(payload)})
        assert response.status_code == 200, response.text
        page.set_viewport_size({"width": 390, "height": 844})
        page.reload()
        expect(page.get_by_role("link", name="Sou responsável · Pré-matrícula online")).to_be_visible()
        in_view(page.get_by_role("button", name="Entrar na aplicação"), {"width": 390, "height": 844})
        record("Pré-matrícula opcional aparece sem deslocar o botão de acesso para fora da tela")

        page.get_by_label("E-mail", exact=True).fill(EMAIL)
        page.get_by_label("Senha", exact=True).fill("Senha incorreta somente para teste")
        page.get_by_role("button", name="Mostrar senha", exact=True).click()
        page.get_by_role("button", name="Entrar na aplicação").click()
        expect(page.get_by_role("alert")).to_be_visible()
        expect(page.get_by_label("Senha", exact=True)).to_have_attribute("type", "password")
        expect(page.get_by_label("E-mail", exact=True)).to_have_value(EMAIL)
        no_page_overflow(page)
        record("Erro de credenciais é visível, preserva e-mail e volta a ocultar a senha para permitir correção")
        page.get_by_label("Senha", exact=True).fill(PASSWORD)
        page.get_by_role("button", name="Entrar na aplicação").click()
        expect(page.get_by_role("heading", name="Visão geral", exact=True)).to_be_visible()
        expect(page.locator(".app-root")).to_have_attribute("aria-busy", "false")
        opener = page.get_by_role("button", name="Abrir menu", exact=True)
        touch_target(opener)
        touch_target(page.get_by_role("button", name="Meu perfil", exact=True))
        touch_target(page.get_by_label("Selecionar escola", exact=True))
        for width, height in [(390, 844), (320, 568)]:
            page.set_viewport_size({"width": width, "height": height})
            no_page_overflow(page)
            guide = page.get_by_role("button", name="Guia de uso", exact=True)
            in_view(guide, {"width": width, "height": height})
            touch_target(guide)
            assert guide.evaluate("el => parseFloat(getComputedStyle(el).borderTopWidth) >= 1"), "Guia precisa da borda do botão"
            page.screenshot(path=str(OUT / f"02-dashboard-{width}.png"), full_page=True)
        page.set_viewport_size({"width": 390, "height": 844})
        page.get_by_role("button", name="Guia de uso", exact=True).click()
        expect(page.get_by_role("heading", name="Guia de uso", exact=True)).to_be_visible()
        for width, height in [(390, 844), (320, 640), (768, 900), (1440, 960)]:
            page.set_viewport_size({"width": width, "height": height})
            no_page_overflow(page)
            expect(page.locator(".guide-card").first).to_be_visible()
            cards = page.locator(".guide-card").evaluate_all("""els => els.map(el => {
                const s = getComputedStyle(el), r = el.getBoundingClientRect();
                return {padding: [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft].map(parseFloat),
                    width: r.width, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth};
            })""")
            assert len(cards) >= 4, cards
            assert all(min(card["padding"]) >= 16 for card in cards), cards
            assert all(card["scrollWidth"] <= card["clientWidth"] + 1 for card in cards), cards
            if width <= 600:
                for action in page.locator(".guide-card button").all():
                    if action.is_visible():
                        touch_target(action)
            metrics[f"guide_{width}"] = cards
            page.locator("#main-content").evaluate("el => el.scrollTop = 0")
            page.screenshot(path=str(OUT / f"02-guide-{width}.png"), full_page=True)
        record("Guia tem cartões com respiro mínimo de 16px e ações tocáveis, sem cortes de 320px ao desktop")

        page.set_viewport_size({"width": 390, "height": 844})
        opener.click()
        close_menu = page.get_by_role("button", name="Fechar menu", exact=True)
        expect(close_menu).to_be_focused()
        touch_target(close_menu)
        assert page.locator(".main-column").evaluate("el => el.inert")
        menu = page.get_by_role("button", name="Cadastros", exact=True)
        if menu.get_attribute("aria-expanded") == "false":
            menu.click()
        nav_link = page.locator("aside").get_by_role("link", name="Cadastro único", exact=True)
        touch_target(nav_link)
        page.keyboard.press("Escape")
        expect(opener).to_be_focused()
        expect(opener).to_have_attribute("aria-expanded", "false")
        opener.click()
        nav_link.click()
        expect(page.get_by_role("heading", name="Cadastro único", exact=True)).to_be_visible()
        expect(opener).to_have_attribute("aria-expanded", "false")
        assert not page.locator(".main-column").evaluate("el => el.inert")
        record("Menu móvel tem alvos de 44px, contém foco, fecha por Escape e devolve a navegação ao conteúdo")

        expect(page.locator(".record-list tbody tr")).to_have_count(1)
        filter_toggle = page.locator(".registry-filter-toggle")
        expect(filter_toggle).to_have_attribute("aria-expanded", "false")
        expect(page.get_by_label("Natureza", exact=True)).not_to_be_visible()
        touch_target(filter_toggle)
        filter_toggle.click()
        page.get_by_label("Natureza", exact=True).select_option("individual")
        expect(filter_toggle).to_contain_text("1 ativos")
        filter_toggle.click()
        expect(page.get_by_label("Natureza", exact=True)).not_to_be_visible()
        expect(filter_toggle).to_contain_text("1 ativos")
        expect(page.locator(".record-list tbody tr")).to_have_count(1)
        filter_toggle.click()
        expect(page.get_by_label("Natureza", exact=True)).to_have_value("individual")
        page.get_by_label("Natureza", exact=True).select_option("")
        filter_toggle.click()
        expect(filter_toggle).not_to_contain_text("ativos")
        record("Filtros móveis começam recolhidos e preservam a seleção e o contador ativo ao fechar e reabrir")
        for width, height in [(390, 844), (320, 640)]:
            page.set_viewport_size({"width": width, "height": height})
            no_page_overflow(page)
            row = page.locator(".record-list tbody tr").first
            assert row.evaluate("el => el.scrollWidth <= el.clientWidth + 1")
            assert row.evaluate("el => getComputedStyle(el).display != 'table-row'"), "Tabela não se reorganizou em cartão"
            edit = row.get_by_role("button", name="Editar →", exact=True)
            edit.scroll_into_view_if_needed()
            in_view(edit, {"width": width, "height": height})
            touch_target(edit)
            page.locator("#main-content").evaluate("el => el.scrollTop = 0")
            page.screenshot(path=str(OUT / f"03-cadastro-lista-{width}.png"), full_page=True)
        record("Cadastro com nome longo vira cartão em 320/390px; dados e ação Editar cabem sem rolagem horizontal")

        page.get_by_role("button", name="+ Nova pessoa", exact=True).click()
        dialog = page.get_by_role("dialog")
        expect(dialog).to_be_visible()
        name = dialog.get_by_label("Nome completo", exact=False)
        name.fill("Pessoa cadastrada pelo celular")
        for width, height in [(320, 640), (390, 400)]:
            page.set_viewport_size({"width": width, "height": height})
            # VisualViewport é aplicado no próximo frame. Aguarde a geometria
            # observável antes de medir; o limite do botão continua estrito.
            expect(page.locator(".modal-backdrop")).to_have_css("height", f"{height}px")
            no_page_overflow(page)
            assert dialog.evaluate("el => el.scrollWidth <= el.clientWidth + 1")
            save = dialog.get_by_role("button", name="Salvar", exact=True)
            in_view(save, {"width": width, "height": height})
            touch_target(save)
            touch_target(dialog.get_by_role("button", name="Fechar janela", exact=True))
            name.scroll_into_view_if_needed()
            in_view(name, {"width": width, "height": height})
            assert name.evaluate("el => parseFloat(getComputedStyle(el).fontSize) >= 16")
            body = dialog.locator(".modal-body")
            assert body.evaluate("el => el.clientHeight > 60 && ['auto', 'scroll'].includes(getComputedStyle(el).overflowY)")
            geometry = page.evaluate("({viewport: innerHeight, document: document.documentElement.scrollHeight, body: document.body.scrollHeight})")
            assert geometry["document"] <= geometry["viewport"] + 1, geometry
            page.screenshot(path=str(OUT / f"04-formulario-{width}x{height}.png"), full_page=True)

        # Regressão específica de iOS: o viewport visual pode diminuir sem alterar
        # o viewport de layout. Esta simulação exercita o listener real, sem
        # afirmar execução de teclado nativo ou de Safari.
        page.set_viewport_size({"width": 390, "height": 844})
        page.evaluate("""() => {
            for (const [key, value] of Object.entries({height: 360, offsetTop: 24, scale: 1}))
                Object.defineProperty(visualViewport, key, {value, configurable: true});
            visualViewport.dispatchEvent(new Event('resize'));
        }""")
        expect(page.locator(".modal-backdrop")).to_have_css("height", "360px")
        expect(page.locator(".modal-backdrop")).to_have_css("top", "24px")
        save = dialog.get_by_role("button", name="Salvar", exact=True)
        in_view(save, {"width": 390, "height": 384})
        touch_target(save)
        assert dialog.locator(".modal-body").bounding_box()["height"] > 60
        dialog.screenshot(path=str(OUT / "05-formulario-visual-viewport.png"))
        page.evaluate("""() => {
            for (const key of ['height', 'offsetTop', 'scale']) delete visualViewport[key];
            visualViewport.dispatchEvent(new Event('resize'));
        }""")
        expect(page.locator(".modal-backdrop")).to_have_css("height", "844px")
        session = context.new_cdp_session(page)
        session.send("Emulation.setPageScaleFactor", {"pageScaleFactor": 2})
        assert page.evaluate("visualViewport.scale >= 1.99")
        expect(page.locator(".modal-backdrop")).to_have_css("height", "844px")
        expect(page.locator(".modal-backdrop")).to_have_css("top", "0px")
        session.send("Emulation.setPageScaleFactor", {"pageScaleFactor": 1})
        expect(page.locator(".modal-backdrop")).to_have_css("height", "844px")
        record("Modal acompanha altura e deslocamento do VisualViewport; simulação de ampliação por gesto em 200% não força reposicionamento")
        save.click()
        expect(dialog).to_have_count(0)
        expect(page.locator(".modal-backdrop")).to_have_count(0)
        response = client.get(base + "/persons?q=Pessoa cadastrada pelo celular", headers=headers)
        assert response.status_code == 200 and response.json()["total"] == 1, response.text
        record("Formulário em 320×640 e 390×400 mantém campo editável e Salvar acessíveis; cadastro persiste pela API real")
        for route, heading in [("dashboard", "Visão geral"), ("students", "Alunos"), ("enrollments", "Matrículas"),
                               ("diary", "Diário Escolar"), ("reports", "Relatórios"), ("banking", "Cobranças"),
                               ("online", "Inscrições online"), ("community", "Notícias e eventos")]:
            page.get_by_role("button", name="Abrir menu", exact=True).click()
            page.locator(f'aside nav a[href="#/{route}"]').click()
            expect(page.get_by_role("heading", name=heading, exact=True).first).to_be_visible()
            expect(page.locator(".app-root")).to_have_attribute("aria-busy", "false")
            # A navegação SPA não reinicia o load-state do documento. Aguarde
            # os indicadores dos componentes, não o networkidle de outra rota.
            expect(page.locator(".loading-strip:visible")).to_have_count(0)
            if route == "diary":
                expect(page.locator(".diary-workspace").get_by_role("button", name="Atualizar", exact=True)).to_be_enabled()
            if route == "community":
                expect(page.get_by_role("button", name="+ Nova publicação", exact=True)).to_be_enabled()
            no_page_overflow(page)
            assert page.locator("#main-content").evaluate("el => el.scrollWidth <= el.clientWidth + 1"), route
            page.locator("#main-content").evaluate("el => el.scrollTop = 0")
            page.screenshot(path=str(OUT / f"06-modulo-{route}.png"), full_page=True)
        record("Navegação real em oito módulos mantém conteúdo dentro da tela móvel e produz capturas para revisão visual")
        page.get_by_role("button", name="+ Nova publicação", exact=True).click()
        publication = page.get_by_role("dialog")
        expect(publication).to_be_visible()
        for caption in ("Tipo", "Público", "Título", "Conteúdo"):
            control = publication.get_by_label(caption, exact=True)
            touch_target(control)
            assert control.evaluate("el => parseFloat(getComputedStyle(el).fontSize) >= 16"), caption
            assert control.evaluate("el => parseFloat(getComputedStyle(el).paddingLeft) >= 10"), "Campo sem espaçamento interno: " + caption
        publication.get_by_label("Título", exact=True).fill("Notícia sintética no celular")
        publication.get_by_label("Conteúdo", exact=True).fill("Conteúdo de teste local para conferir o formulário móvel da escola.")
        page.evaluate("""() => {
            for (const [key, value] of Object.entries({height: 360, offsetTop: 24, scale: 1}))
                Object.defineProperty(visualViewport, key, {value, configurable: true});
            visualViewport.dispatchEvent(new Event('resize'));
        }""")
        expect(page.locator(".modal-backdrop")).to_have_css("height", "360px")
        expect(page.locator(".modal-backdrop")).to_have_css("top", "24px")
        publish_save = publication.get_by_role("button", name="Salvar publicação", exact=True)
        in_view(publish_save, {"width": 390, "height": 384})
        touch_target(publish_save)
        publication.screenshot(path=str(OUT / "07-publicacao-visual-viewport.png"))
        page.evaluate("""() => {
            for (const key of ['height', 'offsetTop', 'scale']) delete visualViewport[key];
            visualViewport.dispatchEvent(new Event('resize'));
        }""")
        expect(page.locator(".modal-backdrop")).to_have_css("height", "844px")
        publish_save.click()
        expect(publication).to_have_count(0)
        expect(page.get_by_role("heading", name="Notícia sintética no celular", exact=True)).to_be_visible()
        record("Editor de notícias fora do shell também acompanha VisualViewport reduzido e salva rascunho local com ações acessíveis")
        assert not errors, errors
        browser.close()
    (OUT / "results.json").write_text(json.dumps({"status": "passed", "checks": checks, "metrics": metrics, "errors": errors,
        "frontend": json.loads((ROOT / "frontend/dist/build-info.json").read_text()),
        "mode": "http_e2e", "database": "SQLite descartável", "remote_providers": False,
        "limitations": ["Chromium com emulação de toque; Safari/iOS e teclado nativo não executados", "Janela de 390×400 e VisualViewport representam altura reduzida, sem emular teclado do sistema", "CDP PageScaleFactor simula ampliação por gesto; não representa o zoom de desktop com reflow"]}, ensure_ascii=False, indent=2))
except Exception:
    (OUT / "results.json").write_text(json.dumps({"status": "failed", "checks": checks, "metrics": metrics, "errors": errors}, ensure_ascii=False, indent=2))
    try:
        page.screenshot(path=str(OUT / "failure.png"), full_page=True)
    except Exception:
        pass
    raise
finally:
    proc.terminate()
    proc.wait(timeout=10)
    log.close()
    shutil.rmtree(TEMP, ignore_errors=True)
