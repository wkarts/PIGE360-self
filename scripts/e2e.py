#!/usr/bin/env python3
"""E2E real em Chromium. Usa banco e documentos descartáveis; nunca usa a instalação real."""
from pathlib import Path
import json, os, shutil, socket, subprocess, sys, tempfile, time
import httpx
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'evidence/0.3.0';OUT.mkdir(parents=True,exist_ok=True)
TEMP=Path(tempfile.mkdtemp(prefix='pige360-e2e-'))
with socket.socket() as s:s.bind(('127.0.0.1',0));PORT=s.getsockname()[1]
URL=f'http://127.0.0.1:{PORT}'
env={**os.environ,'PYTHONPATH':str(ROOT/'backend'),'DATABASE_URL':'sqlite:///'+str(TEMP/'e2e.db'),'ALLOW_SQLITE':'true','APP_ENV':'test','APP_URL':URL,'ALLOWED_HOSTS':'127.0.0.1,localhost','APP_SECRET_KEY':'e2e-test-only-secret-key-01234567890123456789','SETUP_TOKEN':'e2e-test-only-setup-token-0123456789','STORAGE_PATH':str(TEMP/'files'),'FRONTEND_PATH':str(ROOT/'frontend/dist'),'COOKIE_SECURE':'false'}
subprocess.run([sys.executable,'-m','alembic','upgrade','head'],cwd=ROOT/'backend',env=env,check=True,stdout=subprocess.DEVNULL)
log=(OUT/'e2e-server.log').open('w')
process=subprocess.Popen([sys.executable,'-m','uvicorn','app.main:app','--host','127.0.0.1','--port',str(PORT)],cwd=ROOT/'backend',env=env,stdout=log,stderr=log)
checks=[];errors=[];BRIDGE=os.getenv('PIGE_UI_BRIDGE')=='1'
try:
    for _ in range(60):
        try:
            if httpx.get(URL+'/health/ready').status_code==200:break
        except httpx.HTTPError:pass
        time.sleep(.1)
    else:raise RuntimeError('Servidor não iniciou.')
    with sync_playwright() as pw:
        chromium=os.getenv('CHROMIUM_PATH') or (None if Path(pw.chromium.executable_path).exists() else shutil.which('chromium'))
        browser=pw.chromium.launch(headless=True,**({'executable_path':chromium} if chromium else {}),args=['--no-sandbox'])
        context=browser.new_context(viewport={'width':1440,'height':1000},locale='pt-BR',accept_downloads=True)
        page=context.new_page();page.set_default_timeout(6000)
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('console',lambda e:errors.append('console:'+e.text) if e.type=='error' and '401' not in e.text else None)
        if BRIDGE:
            from ui_bridge import install
            bridge_client=install(page,ROOT,URL,OUT)
        else:page.goto(URL)
        expect(page.get_by_text('Configure sua instituição',exact=True)).to_be_visible()
        for label,value in [('Chave de instalação',env['SETUP_TOKEN']),('Empresa / mantenedora','Mantenedora Exemplo — Teste'),('Nome da escola','Escola Exemplo — Dados de Teste'),('Administrador','Secretaria de Teste'),('E-mail do administrador','secretaria@example.com'),('Senha inicial','Test-Only-Secretaria-2026!')]:page.get_by_label(label,exact=True).fill(value)
        page.get_by_label('Ano letivo',exact=True).fill('2026')
        page.get_by_role('button',name='Concluir instalação').click()
        expect(page.get_by_role('heading',name='Acesse sua instituição')).to_be_visible()
        page.wait_for_function("[...document.images].every(i=>i.complete&&i.naturalWidth>0)")
        assert page.locator('.official-brand img').get_attribute('alt')=='PIGE360 School Platform'
        checks.append('Logo oficial carregada com bytes locais originais')
        page.screenshot(path=str(OUT/'01-login.png'),full_page=True)
        page.get_by_label('Senha',exact=True).fill('Test-Only-Secretaria-2026!');page.get_by_role('button',name='Entrar na aplicação').click()
        expect(page.get_by_role('heading',name='Visão geral',exact=True)).to_be_visible();checks.append('Instalação inicial e login pela interface')
        def nav(name):
            expect(page.locator('.app-root')).to_have_attribute('aria-busy','false')
            page.locator('aside').get_by_role('link',name=name).click()
        def dialog():return page.get_by_role('dialog')
        def save():
            dialog().get_by_role('button',name='Salvar',exact=True).click();expect(dialog()).to_have_count(0);expect(page.locator('.app-root')).to_have_attribute('aria-busy','false');expect(page.locator('.app-root')).to_have_attribute('aria-busy','false')
        nav('Estrutura acadêmica')
        for tab,fields in [('Séries e etapas',{'Nome da série / etapa':'3º Ano'}),('Turnos',{'Nome':'Matutino'})]:
            page.get_by_role('button',name=tab,exact=True).click();page.get_by_role('button',name='+ Cadastrar',exact=True).click()
            for k,v in fields.items():dialog().get_by_label(k,exact=False).fill(v)
            save()
        page.get_by_role('button',name='Turmas',exact=True).click();page.get_by_role('button',name='+ Cadastrar',exact=True).click()
        dialog().get_by_label('Nome da turma').fill('3º Ano A')
        for label in ['Unidade','Ano letivo','Série / etapa','Turno']:dialog().get_by_label(label,exact=False).select_option(index=1)
        dialog().get_by_label('Capacidade').fill('30');save();checks.append('Série, turno e turma criados pela interface')
        page.get_by_role('button',name='Tipos de documento',exact=True).click();page.get_by_role('button',name='+ Cadastrar',exact=True).click()
        dialog().get_by_label('Nome do documento').fill('Certidão de nascimento');dialog().get_by_label('Obrigatório para matrícula').check();save()
        nav('Responsáveis');page.get_by_role('button',name='+ Novo responsável').click()
        dialog().get_by_label('Nome completo').fill('Mariana Almeida — Teste');dialog().get_by_label('Telefone / WhatsApp').fill('5575999990000');save()
        nav('Professores');page.get_by_role('button',name='+ Novo professor').click()
        dialog().get_by_label('Nome completo').fill('Professor Rafael — Teste');dialog().get_by_label('Data de nascimento').fill('1982-04-12')
        dialog().get_by_label('Matrícula funcional').fill('DOC-001');dialog().get_by_label('Curso / licenciatura').fill('Pedagogia');dialog().get_by_label('Carga horária semanal').fill('40');save()
        expect(page.get_by_text('Professor Rafael — Teste',exact=True)).to_be_visible();checks.append('Professor cadastrado na visão operacional com dados profissionais')
        nav('Funcionários');page.get_by_role('button',name='+ Novo funcionário').click()
        dialog().get_by_label('Nome completo').fill('Funcionária Beatriz — Teste');dialog().get_by_label('Data de nascimento').fill('1988-09-08')
        dialog().get_by_label('Matrícula funcional').fill('FUNC-001');dialog().get_by_label('Setor / departamento').fill('Secretaria escolar');dialog().get_by_label('Cargo / função').fill('Assistente');save()
        expect(page.get_by_text('Funcionária Beatriz — Teste',exact=True)).to_be_visible();checks.append('Funcionário cadastrado na visão operacional com dados funcionais')
        nav('Alunos');page.get_by_role('button',name='+ Novo aluno').click()
        dialog().get_by_label('Nome completo').fill('Lucas Almeida — Teste');dialog().get_by_label('Data de nascimento').fill('2018-05-15');dialog().get_by_label('Endereço').fill('Endereço fictício para validação');save()
        expect(page.get_by_role('heading',name='Lucas Almeida — Teste',exact=True).first).to_be_visible()
        page.get_by_role('button',name='Responsáveis',exact=True).click();page.get_by_role('button',name='+ Vincular responsável').click()
        dialog().locator('select').first.select_option(label='Mariana Almeida — Teste · Não informado')
        dialog().get_by_label('Responsável financeiro',exact=True).check();save();checks.append('Responsável e aluno cadastrados, vínculo legal/financeiro persistido')
        page.get_by_role('button',name='Documentos',exact=True).click();page.get_by_role('button',name='+ Receber documento').click()
        dialog().get_by_label('Tipo de documento').select_option(index=1)
        # Upload de imagem sintética conhecida, não de documento de pessoa real.
        dialog().locator('input[type=file]').set_input_files(str(ROOT/'frontend/public/icons/icon-192.png'));save()
        page.get_by_role('button',name='Validar',exact=True).click();dialog().get_by_label('Justificativa da análise').fill('Arquivo sintético validado no teste E2E');save()
        expect(page.get_by_text('Validado',exact=True).first).to_be_visible();checks.append('Upload e validação documental pela interface')
        page.screenshot(path=str(OUT/'03-documentos.png'),full_page=True)
        nav('Matrículas');page.get_by_role('button',name='+ Nova matrícula').click()
        dialog().locator('select').first.select_option(index=1)
        dialog().get_by_label('Turma de destino').select_option(index=1);save()
        page.get_by_role('button',name='Detalhes →').first.click()
        dialog().get_by_role('button',name='Editar pré-matrícula',exact=True).click()
        dialog().get_by_label('Observações',exact=False).fill('Cadastro revisado antes de ativar.')
        dialog().get_by_label('Motivo da alteração',exact=False).fill('Revisão de pré-matrícula no teste.')
        dialog().get_by_role('button',name='Salvar',exact=True).click()
        expect(dialog().get_by_role('button',name='Editar pré-matrícula',exact=True)).to_be_visible()
        expect(dialog().get_by_text('Cadastro revisado antes de ativar.',exact=True)).to_be_visible()
        checks.append('Edição da pré-matrícula com justificativa e histórico')
        expect(page.locator('.app-root')).to_have_attribute('aria-busy','false')
        dialog().get_by_role('button',name='Ficha de matrícula PDF',exact=True).click()
        if BRIDGE:
            dialog().get_by_role('button',name='Gerar e baixar PDF',exact=True).click();page.wait_for_function("window.__downloads.includes('enrollment_form.pdf')")
        else:
            with page.expect_download() as down:dialog().get_by_role('button',name='Gerar e baixar PDF',exact=True).click()
            down.value.save_as(str(OUT/'enrollment_form.pdf'))
        expect(dialog()).to_have_count(0)
        checks.append('Ficha da pré-matrícula emitida antes da ativação')
        expect(page.locator('.app-root')).to_have_attribute('aria-busy','false')
        page.get_by_role('button',name='Detalhes →').first.click();dialog().get_by_role('button',name='Ativar matrícula',exact=True).click()
        dialog().get_by_label('Motivo / justificativa').fill('Conferência documental e vaga confirmadas');save()
        expect(page.locator('td .badge.active').first).to_be_visible();checks.append('Matrícula criada e ativada pela interface')
        page.get_by_role('button',name='Detalhes →').first.click();dialog().get_by_role('button',name='Comprovante PDF').click()
        if BRIDGE:
            dialog().get_by_role('button',name='Gerar e baixar PDF',exact=True).click();page.wait_for_function("window.__downloads.includes('enrollment_receipt.pdf')");shutil.copyfile(OUT/'enrollment_receipt.pdf',OUT/'comprovante-exemplo.pdf')
        else:
            with page.expect_download() as downloaded:dialog().get_by_role('button',name='Gerar e baixar PDF',exact=True).click()
            downloaded.value.save_as(str(OUT/'comprovante-exemplo.pdf'))
        expect(dialog()).to_have_count(0);checks.append('PDF emitido pela UI e bytes conferidos no harness' if BRIDGE else 'PDF emitido e baixado pelo navegador')
        nav('Relatórios');page.get_by_label('Turma do relatório').select_option(index=1)
        expect(page.get_by_text('Lucas Almeida — Teste',exact=True)).to_be_visible()
        if BRIDGE:
            page.get_by_role('button',name='Gerar PDF da turma').click();page.wait_for_function("window.__downloads.includes('alunos-da-turma.pdf')");shutil.copyfile(OUT/'alunos-da-turma.pdf',OUT/'turma-exemplo.pdf')
        else:
            with page.expect_download() as down:page.get_by_role('button',name='Gerar PDF da turma').click()
            down.value.save_as(str(OUT/'turma-exemplo.pdf'))
        checks.append('Relatório por turma com PDF')
        nav('Visão geral');page.screenshot(path=str(OUT/'02-dashboard.png'),full_page=True)
        if not BRIDGE:
            page.reload();expect(page.get_by_role('heading',name='Visão geral',exact=True)).to_be_visible();checks.append('Sessão restaurada por refresh após reload')
        nav('Alunos');page.get_by_role('button',name='Abrir ficha →').first.click();page.screenshot(path=str(OUT/'04-aluno.png'),full_page=True)
        page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(400);page.screenshot(path=str(OUT/'05-aluno-mobile.png'),full_page=True)
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'Overflow horizontal no smartphone'
        checks.append('Responsividade 390px sem overflow horizontal')
        page.get_by_role('button',name='Abrir menu').click();page.locator('aside').get_by_role('link',name='Visão geral').click()
        expect(page.get_by_role('heading',name='Visão geral',exact=True)).to_be_visible();checks.append('Menu e navegação mobile')
        page.set_viewport_size({'width':1440,'height':1000})
        nav('Matrículas')
        page.get_by_label('Situação',exact=True).select_option('draft');page.get_by_role('button',name='Aplicar filtros').click()
        expect(page.get_by_text('Nenhum registro encontrado',exact=True)).to_be_visible()
        page.get_by_label('Situação',exact=True).select_option('active');page.get_by_role('button',name='Aplicar filtros').click()
        expect(page.get_by_text('Lucas Almeida — Teste',exact=True)).to_be_visible()
        page.screenshot(path=str(OUT/'06-matriculas.png'),full_page=True)
        checks.append('Filtros de matrícula com resultado persistido')
        nav('Protocolos');page.get_by_role('button',name='+ Abrir protocolo',exact=True).click()
        dialog().get_by_label('Tipo de solicitação').fill('Solicitação de declaração escolar')
        dialog().get_by_label('Aluno (opcional)').select_option(index=1)
        dialog().get_by_label('Descrição / observações').fill('Pedido registrado para validação funcional.')
        dialog().get_by_label('Prazo',exact=True).fill('2026-01-10');save()
        page.get_by_role('button',name='Ver atendimento →').first.click()
        dialog().get_by_role('button',name='Registrar atendimento').click()
        dialog().get_by_label('Registro do atendimento').fill('Conferência concluída; aguardando emissão da declaração.')
        dialog().get_by_role('button',name='Salvar',exact=True).click()
        expect(dialog().get_by_text('Conferência concluída; aguardando emissão da declaração.',exact=True)).to_be_visible()
        page.screenshot(path=str(OUT/'07-protocolo.png'),full_page=True)
        checks.append('Protocolo com atendimento acrescentado ao histórico')
        if BRIDGE:
            dialog().get_by_role('button',name='Comprovante PDF',exact=True).click();page.wait_for_function("window.__downloads.includes('comprovante-protocolo.pdf')")
        else:
            with page.expect_download() as down:dialog().get_by_role('button',name='Comprovante PDF',exact=True).click()
            down.value.save_as(str(OUT/'comprovante-protocolo.pdf'))
        dialog().get_by_role('button',name='Fechar janela').click()
        page.get_by_label('Somente prazos vencidos').check();page.get_by_role('button',name='Aplicar filtros').click()
        expect(page.get_by_text('Solicitação de declaração escolar',exact=False).first).to_be_visible()
        checks.append('Filtro de protocolo vencido e comprovante PDF')
        nav('Alunos');page.get_by_role('button',name='Abrir ficha →').first.click()
        page.get_by_role('button',name='Protocolos',exact=True).click()
        expect(page.get_by_text('Protocolos deste aluno',exact=True)).to_be_visible()
        expect(page.get_by_text('Solicitação de declaração escolar',exact=False)).to_be_visible()
        checks.append('Protocolos acessíveis dentro da ficha do aluno')
        nav('Estrutura acadêmica');page.get_by_role('button',name='Tipos de documento',exact=True).click();page.get_by_role('button',name='+ Cadastrar',exact=True).click()
        dialog().get_by_label('Nome do documento').fill('Comprovante de residência');dialog().get_by_label('Obrigatório para matrícula').check();save()
        nav('Documentação');page.get_by_label('Pesquisar na lista').fill('Lucas');page.get_by_role('button',name='Aplicar filtros').click()
        expect(page.get_by_text('1 pendência documental',exact=True)).to_be_visible()
        if BRIDGE:
            page.get_by_role('button',name='Exportar CSV',exact=True).click();page.wait_for_function("window.__downloads.includes('pendencias-documentais.csv')")
            page.get_by_role('button',name='Gerar PDF',exact=True).click();page.wait_for_function("window.__downloads.includes('pendencias-documentais.pdf')")
        else:
            for name,filename in [('Exportar CSV','pendencias-documentais.csv'),('Gerar PDF','pendencias-documentais.pdf')]:
                with page.expect_download() as down:page.get_by_role('button',name=name,exact=True).click()
                down.value.save_as(str(OUT/filename))
        page.screenshot(path=str(OUT/'08-pendencias.png'),full_page=True)
        checks.append('Pendências filtradas e exportadas em CSV/PDF pela interface')
        page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(250)
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
        page.screenshot(path=str(OUT/'09-documentos-mobile.png'),full_page=True)
        checks.append('Novos filtros documentais responsivos em 390px')
        if not BRIDGE:
            page.evaluate('navigator.serviceWorker.ready');page.wait_for_timeout(200)
            cached=page.evaluate('caches.keys().then(async keys=>(await Promise.all(keys.map(k=>caches.open(k).then(c=>c.keys()).then(rs=>rs.map(r=>r.url))))).flat())')
            assert cached and not any('/api/' in u for u in cached);checks.append('Service worker ativo; cache somente de arquivos estáticos')
        context.set_offline(True);expect(page.get_by_text('Sem conexão.',exact=False).first).to_be_visible();checks.append('Queda de rede sinalizada sem confirmar operações offline')
        context.set_offline(False)
        assert not errors,errors
        checks.append('Nenhum erro de JavaScript observado nas telas exercitadas')
        (OUT/('ui-integration-results.json' if BRIDGE else 'e2e-results.json')).write_text(json.dumps({'status':'passed','mode':'ui_api_bridge' if BRIDGE else 'http_e2e','not_validated':['Navegação HTTP nativa','Cookies do navegador','CSP em navegação','Instalação PWA','Download nativo'] if BRIDGE else [],'checks':checks,'browser':browser.version,'database':'SQLite (validação local)','errors':errors},ensure_ascii=False,indent=2))
        print(json.dumps({'status':'passed','checks':len(checks)},ensure_ascii=False));browser.close()
except Exception:
    (OUT/('ui-integration-results.json' if BRIDGE else 'e2e-results.json')).write_text(json.dumps({'status':'failed','checks':checks,'errors':errors},ensure_ascii=False,indent=2))
    try:page.screenshot(path=str(OUT/'e2e-failure.png'),full_page=True);print(page.locator('body').inner_text()[-6000:])
    except Exception:pass
    raise
finally:
    process.terminate();process.wait(timeout=10);log.close();shutil.rmtree(TEMP,ignore_errors=True)
